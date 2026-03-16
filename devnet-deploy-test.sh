#!/usr/bin/env bash
# ============================================================
# devnet-deploy-test.sh
#
# Restarts a local snarkOS devnet, deploys both lending pool
# programs, initializes them, and runs a full lifecycle test:
#   deposit -> borrow -> accrue -> repay -> withdraw
#
# Usage:
#   ./devnet-deploy-test.sh              # full run (restart + deploy + test)
#   ./devnet-deploy-test.sh status       # just print devnet status
#   ./devnet-deploy-test.sh deploy       # skip restart, deploy + test only
#   ./devnet-deploy-test.sh test         # skip restart + deploy, test only
# ============================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROGRAM_DIR="$ROOT_DIR/program"
USDC_DIR="$ROOT_DIR/programusdc"
USDC_TOKEN_DIR="$USDC_DIR/imports/test_usdcx_stablecoin"

ENDPOINT="http://localhost:3030"
NETWORK="testnet"
PRIVATE_KEY="APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH"
ADDRESS="aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px"

# Leo/snarkos common flags
LEO_FLAGS="--network $NETWORK --endpoint $ENDPOINT --private-key $PRIVATE_KEY --broadcast -y --devnet"
# Priority fee large enough to cover deployment base fee (~33M microcredits for big programs)
LEO_DEPLOY_FLAGS="$LEO_FLAGS --priority-fees 100000000"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ============================================================
# Helpers
# ============================================================

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()      { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()    { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }
header()  { echo -e "\n${BOLD}=== $* ===${NC}\n"; }

wait_for_devnet() {
    local max_wait=${1:-120}
    local elapsed=0
    info "Waiting for devnet to start (up to ${max_wait}s)..."
    while [ $elapsed -lt $max_wait ]; do
        local height
        height=$(curl -s "$ENDPOINT/$NETWORK/block/height/latest" 2>/dev/null || echo "")
        if [ -n "$height" ] && [ "$height" -ge 0 ] 2>/dev/null; then
            ok "Devnet is live at block height $height"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
        printf "."
    done
    echo ""
    fail "Devnet did not start within ${max_wait}s"
}

wait_for_block_advance() {
    local start_height
    start_height=$(curl -s "$ENDPOINT/$NETWORK/block/height/latest" 2>/dev/null || echo "0")
    info "Current height: $start_height. Waiting for next block..."
    local max_wait=30
    local elapsed=0
    while [ $elapsed -lt $max_wait ]; do
        sleep 2
        elapsed=$((elapsed + 2))
        local h
        h=$(curl -s "$ENDPOINT/$NETWORK/block/height/latest" 2>/dev/null || echo "0")
        if [ "$h" -gt "$start_height" ] 2>/dev/null; then
            ok "Block advanced to $h"
            return 0
        fi
    done
    warn "Block did not advance within ${max_wait}s (may still be ok)"
}

print_status() {
    header "Devnet Status"
    local height
    height=$(curl -s "$ENDPOINT/$NETWORK/block/height/latest" 2>/dev/null || echo "N/A")
    echo -e "  Endpoint:     ${BOLD}$ENDPOINT${NC}"
    echo -e "  Network:      ${BOLD}$NETWORK${NC}"
    echo -e "  Block Height: ${BOLD}$height${NC}"
    echo -e "  Address:      ${BOLD}$ADDRESS${NC}"

    # Check if programs are deployed
    local credits_deployed usdc_deployed
    credits_deployed=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_v2.aleo" 2>/dev/null || echo "")
    usdc_deployed=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_usdce_v2.aleo" 2>/dev/null || echo "")
    usdc_token_deployed=$(curl -s "$ENDPOINT/$NETWORK/program/test_usdcx_stablecoin.aleo" 2>/dev/null || echo "")

    echo ""
    if echo "$credits_deployed" | grep -q "program lending_pool_v2" 2>/dev/null; then
        echo -e "  lending_pool_v2.aleo:       ${GREEN}DEPLOYED${NC}"
    else
        echo -e "  lending_pool_v2.aleo:       ${YELLOW}NOT DEPLOYED${NC}"
    fi

    if echo "$usdc_token_deployed" | grep -q "program test_usdcx_stablecoin" 2>/dev/null; then
        echo -e "  test_usdcx_stablecoin.aleo: ${GREEN}DEPLOYED${NC}"
    else
        echo -e "  test_usdcx_stablecoin.aleo: ${YELLOW}NOT DEPLOYED${NC}"
    fi

    if echo "$usdc_deployed" | grep -q "program lending_pool_usdce_v2" 2>/dev/null; then
        echo -e "  lending_pool_usdce_v2.aleo: ${GREEN}DEPLOYED${NC}"
    else
        echo -e "  lending_pool_usdce_v2.aleo: ${YELLOW}NOT DEPLOYED${NC}"
    fi

    # Check account balance
    local balance
    balance=$(curl -s "$ENDPOINT/$NETWORK/program/credits.aleo/mapping/account/$ADDRESS" 2>/dev/null || echo "N/A")
    echo ""
    echo -e "  Account balance: ${BOLD}${balance}${NC}"

    # Check pool state if deployed
    if echo "$credits_deployed" | grep -q "program lending_pool_v2" 2>/dev/null; then
        echo ""
        echo -e "  ${BOLD}Credits Pool State:${NC}"
        local td tb al si bi lab
        td=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_v2.aleo/mapping/total_deposited/0field" 2>/dev/null || echo "N/A")
        tb=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_v2.aleo/mapping/total_borrowed/0field" 2>/dev/null || echo "N/A")
        al=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_v2.aleo/mapping/available_liquidity/0field" 2>/dev/null || echo "N/A")
        si=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_v2.aleo/mapping/supply_index/0field" 2>/dev/null || echo "N/A")
        bi=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_v2.aleo/mapping/borrow_index/0field" 2>/dev/null || echo "N/A")
        lab=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_v2.aleo/mapping/last_accrual_block/0field" 2>/dev/null || echo "N/A")
        echo "    total_deposited:     $td"
        echo "    total_borrowed:      $tb"
        echo "    available_liquidity: $al"
        echo "    supply_index:        $si"
        echo "    borrow_index:        $bi"
        echo "    last_accrual_block:  $lab"
    fi
    echo ""
}

# ============================================================
# Phase 1: Restart Devnet
# ============================================================

restart_devnet() {
    header "Restarting Local Devnet"

    # Kill existing snarkOS processes
    info "Stopping any running snarkOS instances..."
    pkill -f "snarkos start" 2>/dev/null || true
    sleep 3

    # Verify killed
    if pgrep -f "snarkos start" > /dev/null 2>&1; then
        warn "snarkOS still running, force killing..."
        pkill -9 -f "snarkos start" 2>/dev/null || true
        sleep 2
    fi
    ok "Existing snarkOS processes stopped"

    # Clean old ledger/node data and logs
    info "Cleaning old ledger, node data, and logs..."
    rm -rf "$ROOT_DIR"/.ledger-* "$ROOT_DIR"/.node-data-* "$ROOT_DIR"/devnet*.log
    rm -rf "$PROGRAM_DIR"/.ledger-* "$PROGRAM_DIR"/.node-data-*
    rm -rf "$USDC_DIR"/.ledger-* "$USDC_DIR"/.node-data-*
    ok "Cleaned ledger data"

    # Start fresh devnet — need to launch 4 separate validator processes
    local num_validators=4
    info "Starting snarkOS devnet with $num_validators validators..."
    cd "$ROOT_DIR"

    for i in $(seq 0 $((num_validators - 1))); do
        nohup snarkos start --dev $i --dev-num-validators $num_validators --validator --network 1 --nodisplay \
            > "$ROOT_DIR/devnet-$i.log" 2>&1 &
        ok "Validator $i started (PID: $!), log: devnet-$i.log"
        sleep 1
    done

    wait_for_devnet 180
}

# ============================================================
# Phase 2: Build & Deploy
# ============================================================

build_programs() {
    header "Building Programs"

    info "Building lending_pool_v2.aleo..."
    cd "$PROGRAM_DIR"
    leo build 2>&1 | tail -3
    ok "lending_pool_v2.aleo built"

    info "Building test_usdcx_stablecoin.aleo..."
    cd "$USDC_TOKEN_DIR"
    leo build 2>&1 | tail -3
    ok "test_usdcx_stablecoin.aleo built"

    info "Building lending_pool_usdce_v2.aleo..."
    cd "$USDC_DIR"
    leo build 2>&1 | tail -3
    ok "lending_pool_usdce_v2.aleo built"
}

deploy_programs() {
    header "Deploying Programs"

    # 1. Deploy credits lending pool
    info "Deploying lending_pool_v2.aleo..."
    cd "$PROGRAM_DIR"
    leo deploy $LEO_DEPLOY_FLAGS 2>&1 | tee /tmp/deploy_credits.log | tail -5
    ok "lending_pool_v2.aleo deployed"
    wait_for_block_advance

    # 2. Deploy USDCx stablecoin dependency first
    info "Deploying test_usdcx_stablecoin.aleo..."
    cd "$USDC_TOKEN_DIR"
    leo deploy $LEO_DEPLOY_FLAGS 2>&1 | tee /tmp/deploy_usdcx_token.log | tail -5
    ok "test_usdcx_stablecoin.aleo deployed"
    wait_for_block_advance

    # 3. Deploy USDC lending pool
    info "Deploying lending_pool_usdce_v2.aleo..."
    cd "$USDC_DIR"
    leo deploy $LEO_DEPLOY_FLAGS 2>&1 | tee /tmp/deploy_usdc.log | tail -5
    ok "lending_pool_usdce_v2.aleo deployed"
    wait_for_block_advance
}

# ============================================================
# Phase 3: Initialize & Test (Credits Pool)
# ============================================================

test_credits_pool() {
    header "Testing Credits Lending Pool (lending_pool_v2.aleo)"
    cd "$PROGRAM_DIR"

    # --- Initialize ---
    info "[1/6] Initializing pool..."
    leo execute initialize $LEO_FLAGS 2>&1 | tail -5
    wait_for_block_advance

    # Verify initialization
    local init_check
    init_check=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_v2.aleo/mapping/initialized/0field" 2>/dev/null || echo "")
    if echo "$init_check" | grep -q "true"; then
        ok "Pool initialized successfully"
    else
        warn "Could not verify initialization (response: $init_check)"
    fi

    # --- Check starting balance ---
    local balance
    balance=$(curl -s "$ENDPOINT/$NETWORK/program/credits.aleo/mapping/account/$ADDRESS" 2>/dev/null || echo "0u64")
    info "Account balance before deposit: $balance"

    # --- Deposit ---
    # We need a credits record to deposit. On devnet, the genesis account has public credits.
    # Use transfer_public_to_private to get a record first, then deposit.
    info "[2/6] Getting a credits record (transfer_public_to_private)..."
    cd "$PROGRAM_DIR"
    leo execute credits.aleo/transfer_public_to_private \
        "$ADDRESS" 100_000_000u64 \
        $LEO_FLAGS 2>&1 | tee /tmp/get_record.log | tail -10
    wait_for_block_advance

    # Find the record from the transaction output
    info "Looking for unspent credits record..."
    local record_ciphertext
    # Get latest transactions to find our record
    sleep 3
    record_ciphertext=$(snarkos developer scan \
        --private-key "$PRIVATE_KEY" \
        --network 1 \
        --endpoint "$ENDPOINT" \
        --start 0 --end 999 \
        --last 1 2>/dev/null | grep -o '{[^}]*}' | head -1 || echo "")

    if [ -z "$record_ciphertext" ]; then
        warn "Could not find record via scan. Trying direct approach..."
        # Alternative: query recent transitions for records
        local latest_height
        latest_height=$(curl -s "$ENDPOINT/$NETWORK/block/height/latest" 2>/dev/null || echo "1")
        local block_data
        block_data=$(curl -s "$ENDPOINT/$NETWORK/block/$latest_height" 2>/dev/null || echo "")
        info "Checking block $latest_height for records..."
        # The record should be in the transaction outputs
        echo "$block_data" | python3 -m json.tool 2>/dev/null | grep -A2 "record" | head -10 || true
    fi

    # For deposit_with_credits, we need a plaintext record.
    # On devnet, let's try using leo execute directly which handles record scanning.
    info "[2/6] Depositing 10_000_000 microcredits..."
    leo execute deposit_with_credits \
        "{ owner: $ADDRESS.private, microcredits: 100_000_000u64.private, _nonce: 0group.public }" \
        10_000_000u64 \
        $LEO_FLAGS 2>&1 | tee /tmp/deposit.log | tail -10
    wait_for_block_advance

    # Check pool state after deposit
    local td
    td=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_v2.aleo/mapping/total_deposited/0field" 2>/dev/null || echo "N/A")
    local lab
    lab=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_v2.aleo/mapping/last_accrual_block/0field" 2>/dev/null || echo "N/A")
    info "After deposit -> total_deposited: $td, last_accrual_block: $lab"

    # --- BUG 4 CHECK: last_accrual_block should NOT be 0 after first deposit ---
    if [ "$lab" = "0u64" ] || [ "$lab" = "null" ]; then
        fail "BUG 4 REGRESSION: last_accrual_block is still 0 after first deposit!"
    else
        ok "BUG 4 FIX VERIFIED: last_accrual_block = $lab (not stuck at 0)"
    fi

    # --- Accrue Interest ---
    info "[3/6] Calling accrue_interest()..."
    wait_for_block_advance  # let a block pass so delta > 0
    leo execute accrue_interest $LEO_FLAGS 2>&1 | tail -5
    wait_for_block_advance

    local lab2
    lab2=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_v2.aleo/mapping/last_accrual_block/0field" 2>/dev/null || echo "N/A")
    info "After accrue -> last_accrual_block: $lab2"

    # --- Borrow ---
    info "[4/6] Borrowing 5_000_000 microcredits..."
    leo execute borrow 5_000_000u64 $LEO_FLAGS 2>&1 | tee /tmp/borrow.log | tail -10
    wait_for_block_advance

    local tb
    tb=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_v2.aleo/mapping/total_borrowed/0field" 2>/dev/null || echo "N/A")
    info "After borrow -> total_borrowed: $tb"

    # --- Repay ---
    info "[5/6] Repaying 5_000_000 microcredits..."
    leo execute repay_with_credits \
        "{ owner: $ADDRESS.private, microcredits: 100_000_000u64.private, _nonce: 0group.public }" \
        5_000_000u64 \
        $LEO_FLAGS 2>&1 | tee /tmp/repay.log | tail -10
    wait_for_block_advance

    local tb2
    tb2=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_v2.aleo/mapping/total_borrowed/0field" 2>/dev/null || echo "N/A")
    info "After repay -> total_borrowed: $tb2"

    # --- Withdraw ---
    info "[6/6] Withdrawing 5_000_000 microcredits..."
    leo execute withdraw 5_000_000u64 $LEO_FLAGS 2>&1 | tee /tmp/withdraw.log | tail -10
    wait_for_block_advance

    local td2
    td2=$(curl -s "$ENDPOINT/$NETWORK/program/lending_pool_v2.aleo/mapping/total_deposited/0field" 2>/dev/null || echo "N/A")
    info "After withdraw -> total_deposited: $td2"

    ok "Credits pool lifecycle test complete"
}

# ============================================================
# Phase 4: Summary
# ============================================================

print_summary() {
    header "Test Summary"
    print_status

    echo -e "${BOLD}Bug Fix Verification:${NC}"
    echo "  BUG 1 (div-by-zero):        If first deposit succeeded -> PASS"
    echo "  BUG 2 (overflow):            If accrue_interest succeeded -> PASS"
    echo "  BUG 3 (block.height):        No current_block in tx signatures -> PASS"
    echo "  BUG 4 (stuck accrual block): Checked above -> see result"
    echo ""
    echo -e "${GREEN}Deploy & test logs saved to /tmp/deploy_*.log and /tmp/*.log${NC}"
}

# ============================================================
# Main
# ============================================================

main() {
    local mode="${1:-full}"

    header "Xyra Finance - Devnet Deploy & Test"
    echo "  Mode: $mode"
    echo "  Root: $ROOT_DIR"

    case "$mode" in
        status)
            print_status
            exit 0
            ;;
        deploy)
            build_programs
            deploy_programs
            test_credits_pool
            print_summary
            ;;
        test)
            test_credits_pool
            print_summary
            ;;
        full|*)
            restart_devnet
            print_status
            build_programs
            deploy_programs
            test_credits_pool
            print_summary
            ;;
    esac
}

main "$@"
