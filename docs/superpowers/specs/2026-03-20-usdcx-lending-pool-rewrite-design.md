# USDCx Lending Pool Rewrite — Direct Port of v91

## Summary

Complete rewrite of `programusdc/src/main.leo` to mirror the deployed `lending_pool_v91.aleo` (credits-based lending pool), replacing `credits.aleo` with `test_usdcx_stablecoin.aleo` for USDCx token transfers. The interest model, LTV checks, protocol fees, APY tracking, and all finalize logic are ported 1:1 from v91.

## Motivation

The current USDC program (`lending_pool_usdce_v12.aleo`) uses an older, simpler interest model (v86-era) that diverges significantly from the deployed main program:

- Missing LTV collateral checks (75% on withdraw & borrow)
- Missing protocol fee tracking and `withdraw_fees` admin function
- Missing `available_liquidity` tracking
- Missing on-chain `supply_apy` / `borrow_apy` mappings
- Missing `initialize` transition for clean pool bootstrapping
- Different interest rate model (raw per-block vs annualized)
- Uses `current_block` parameter instead of `block.height`

After 6+ failed deployments trying to patch the old model, a clean rewrite using the proven v91 logic is the right path.

## Program Identity

```
program lending_pool_usdcx_v1.aleo
import test_usdcx_stablecoin.aleo
```

## Architecture

### Local Struct (Shield Wallet Compatibility)

The `MerkleProof` struct must be defined locally in the program to produce unqualified `[MerkleProof; 2u32]` in the AVM output. Using the imported `test_usdcx_stablecoin.aleo/MerkleProof` produces fully-qualified names that Shield wallet cannot parse.

```leo
struct MerkleProof {
    siblings: [field; 16],
    leaf_index: u32,
}
```

### Constants

All constants match v91 exactly:

| Constant | Value | Purpose |
|---|---|---|
| `INDEX_SCALE` | `1_000_000_000_000` | Fixed-point scale (1e12) |
| `BASE_RATE` | `200` | 2% annual base borrow rate |
| `SLOPE` | `400` | 4% utilization slope |
| `UTIL_SCALE` | `10_000` | Basis points scale |
| `BLOCKS_PER_YEAR` | `2_102_400` | ~15s block time |
| `ANNUALIZER` | `21_024_000_000` | BLOCKS_PER_YEAR * UTIL_SCALE |
| `RESERVE_FACTOR_BPS` | `1_000` | 10% protocol reserve |
| `SUPPLY_FEE_FACTOR` | `9_000` | 90% to suppliers |
| `MAX_ACCRUAL_DELTA` | `1_000` | Cap block delta per tx |
| `LTV_BPS` | `7_500` | 75% loan-to-value |
| `POOL_VAULT_ADDRESS` | `aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr` | Vault address |
| `ADMIN_ADDRESS` | `aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px` | Admin address |
| `ASSET_ID` | `1field` | USDCx asset identifier (v91 uses `0field` for credits) |

### Mappings

All keyed by `field` (matching v91):

| Mapping | Type | Purpose |
|---|---|---|
| `total_deposited` | `field => u64` | Total pool deposits |
| `total_borrowed` | `field => u64` | Total pool borrows |
| `available_liquidity` | `field => u64` | Liquid USDCx available |
| `supply_index` | `field => u64` | Aave-style supply index |
| `borrow_index` | `field => u64` | Aave-style borrow index |
| `last_accrual_block` | `field => u64` | Last accrual block height |
| `protocol_fees` | `field => u64` | Accumulated protocol fees |
| `supply_apy` | `field => u64` | On-chain supply APY (BPS) |
| `borrow_apy` | `field => u64` | On-chain borrow APY (BPS) |
| `initialized` | `field => bool` | One-time init guard |
| `user_scaled_supply` | `field => u64` | User scaled deposit balance |
| `user_scaled_borrow` | `field => u64` | User scaled borrow balance |

### Record

```leo
record UserActivity {
    owner: address,
    asset_id: field,         // 1field for USDCx
    total_deposits: u64,
    total_withdrawals: u64,
    total_borrows: u64,
    total_repayments: u64,
}
```

## Transitions

### 1. `initialize()`

Vault-address-only (caller must be `POOL_VAULT_ADDRESS`). Sets all indices to `INDEX_SCALE`, all totals to 0, APYs to 200 (2%). Guarded by `initialized` mapping — can only run once.

```
Transition logic:
  1. Assert self.caller == POOL_VAULT_ADDRESS
Finalize logic:
  1. Assert initialized[0field] == false
  2. Set supply_index = INDEX_SCALE, borrow_index = INDEX_SCALE
  3. Set all totals to 0, APYs to 200
  4. Set initialized = true
```

### 2. `deposit(token, amount, proofs)`

```
Inputs:
  - token: test_usdcx_stablecoin.aleo/Token
  - amount: u64 (public)
  - proofs: [MerkleProof; 2]

Outputs (5 values):
  - ComplianceRecord (from transfer_private — must be output, records cannot be dropped in Leo)
  - UserActivity record (asset_id=1field, total_deposits=amount)
  - Token (change back to user)
  - Token (sent to pool vault)
  - Future

Transition logic:
  1. Assert amount > 0, caller == token.owner
  2. Cast amount to u128, assert token.amount >= amount_u128
  3. Call test_usdcx_stablecoin.aleo/transfer_private(POOL_VAULT, amount_u128, token, proofs)
     → returns (ComplianceRecord, Token to_user, Token to_pool, Future)
     NOTE: transfer_private takes amount as PRIVATE; the pool's public amount param is separate
  4. Hash caller to user_hash

Finalize logic:
  1. Await token transfer future
  2. Run accrual block (see Interest Accrual below)
  3. scaled_delta = amount * INDEX_SCALE / supply_index
  4. user_scaled_supply[user_hash] += scaled_delta
  5. total_deposited += amount
  6. available_liquidity += amount
```

### 3. `withdraw(amount)`

State-only transition. The user's withdrawal is recorded on-chain; the backend/vault service watches the mapping changes and sends USDCx from the vault to the user off-chain (same pattern as v91 for credits).

```
Inputs:
  - amount: u64 (public)

Outputs:
  - UserActivity record (asset_id=1field, total_withdrawals=amount)
  - Future

Finalize logic:
  1. Run accrual block
  2. real_balance = user_scaled_supply * supply_index / INDEX_SCALE
  3. Assert amount <= real_balance
  4. LTV CHECK: remaining = real_balance - amount
     debt = user_scaled_borrow * borrow_index / INDEX_SCALE
     Assert debt == 0 OR debt <= remaining * 7500 / 10000
  5. scaled_delta = amount * INDEX_SCALE / supply_index
     user_scaled_supply = max(prev - scaled_delta, 0)
  6. total_deposited = max(prev - amount, 0)
  7. available_liquidity = max(prev - amount, 0)
```

### 4. `borrow(amount)`

State-only transition. The user's borrow is recorded on-chain; the backend/vault service watches the mapping changes and sends USDCx from the vault to the user off-chain (same pattern as v91 for credits).

```
Inputs:
  - amount: u64 (public)

Outputs:
  - UserActivity record (asset_id=1field, total_borrows=amount)
  - Future

Finalize logic:
  1. Run accrual block
  2. real_supply = user_scaled_supply * supply_index / INDEX_SCALE
  3. max_borrow = real_supply * 7500 / 10000
  4. existing_debt = user_scaled_borrow * borrow_index / INDEX_SCALE
  5. LTV CHECK: Assert existing_debt + amount <= max_borrow
  6. LIQUIDITY CHECK: Assert amount <= available_liquidity
  7. scaled_delta = amount * INDEX_SCALE / borrow_index
     user_scaled_borrow += scaled_delta
  8. total_borrowed += amount
  9. available_liquidity = max(prev - amount, 0)
```

### 5. `repay(token, amount, proofs)`

```
Inputs:
  - token: test_usdcx_stablecoin.aleo/Token
  - amount: u64 (public)
  - proofs: [MerkleProof; 2]

Outputs (5 values):
  - ComplianceRecord (from transfer_private — must be output, records cannot be dropped in Leo)
  - UserActivity record (asset_id=1field, total_repayments=amount)
  - Token (change back to user)
  - Token (sent to pool vault)
  - Future

Finalize logic:
  1. Await token transfer future
  2. Run accrual block
  3. real_debt = user_scaled_borrow * borrow_index / INDEX_SCALE
  4. Assert amount <= real_debt
  5. scaled_delta = amount * INDEX_SCALE / borrow_index
     user_scaled_borrow = max(prev - scaled_delta, 0)
  6. total_borrowed = max(prev - amount, 0)
  7. available_liquidity += amount
```

### 6. `accrue_interest()`

No inputs. Runs the accrual block only. Any wallet can call to sync indices.

### 7. `withdraw_fees(amount)`

Admin-only. Deducts `amount` from `protocol_fees` mapping. The transition passes `self.caller` as an async parameter to finalize, where `assert(caller == ADMIN_ADDRESS)` is enforced on-chain (matching v91 pattern — `self.caller` is not available in finalize, so it must be forwarded).

## Interest Accrual Block (shared by all finalize functions)

This is the exact v91 algorithm:

```
current_block = block.height (cast to u64)
lub = last_accrual_block (default 0)
delta = current_block > lub ? current_block - lub : 0
effective_delta = delta > 1000 ? 1000 : delta

// IMPORTANT: These values are ALWAYS computed (even when pool is empty).
// v91 uses ternary to conditionally apply them, not if/else blocks.
should_accrue = effective_delta > 0            // r15 in v91
has_deposits = total_deposited > 0             // r16 in v91
should_update_indices = should_accrue AND has_deposits  // r17 in v91

// Utilization (safe division)
safe_deposited = total_deposited == 0 ? 1 : total_deposited
util_bps = (total_borrowed * 10000) / safe_deposited
util_bps = total_deposited == 0 ? 0 : util_bps      // force 0 when empty

// Borrow rate (annual, in BPS): 200 + 400 * util_bps / 10000
borrow_rate_annual = 200 + (400 * util_bps) / 10000

// Per-block rate: annual * 1e12 / (2,102,400 * 10,000)
borrow_rate_pb = borrow_rate_annual * INDEX_SCALE / 21,024,000,000

// Supply rate per block
supply_rate_pb = borrow_rate_pb * util_bps * 9000 / 100,000,000

// Index updates — conditional on BOTH delta > 0 AND deposits > 0
new_supply_index = supply_index + supply_index * supply_rate_pb * effective_delta / INDEX_SCALE
supply_index = should_update_indices ? new_supply_index : supply_index

new_borrow_index = borrow_index + borrow_index * borrow_rate_pb * effective_delta / INDEX_SCALE
borrow_index = should_update_indices ? new_borrow_index : borrow_index

// Protocol fees — conditional on should_update_indices
interest_amount = total_borrowed * borrow_rate_pb / INDEX_SCALE
fee_delta = interest_amount * effective_delta * 1000 / 10000
protocol_fees += should_update_indices ? fee_delta : 0

// APY writes — UNCONDITIONAL (always written, matching v91 lines 158-159)
supply_apy = supply_rate_pb * 2,102,400 * 10000 / INDEX_SCALE
borrow_apy = borrow_rate_pb * 2,102,400 * 10000 / INDEX_SCALE

// last_accrual_block — conditional on delta > 0 ONLY (NOT on deposits > 0)
// This is critical: block advances even when pool is empty, preventing
// retroactive interest accrual when deposits resume.
last_accrual_block = should_accrue ? (lub + effective_delta) : lub
```

**Important v91 behavior notes:**
1. `last_accrual_block` advances whenever `effective_delta > 0`, regardless of whether the pool has deposits. This prevents interest from being retroactively calculated over the empty period.
2. Index updates and protocol fees only apply when `effective_delta > 0 AND total_deposited > 0`.
3. APY values are always written (unconditionally), even when delta is 0 or pool is empty.
4. All arithmetic uses `u64`. Operational bounds: pool size should stay below ~1.8e15 micro-units (~1.8 billion USDC) to avoid overflow in `total_borrowed * 10000`.

## USDCx Transfer Mechanism

The key difference from v91. For `deposit` and `repay`:

```leo
// v91 (credits):
let (change, f_transfer) = credits.aleo/transfer_private_to_public(record, VAULT, amount);
// Returns: (credits record, Future)

// USDCx:
let (compliance, to_user, to_pool, f_transfer) =
    test_usdcx_stablecoin.aleo/transfer_private(VAULT, amount_u128, token, proofs);
// Returns: (ComplianceRecord, Token, Token, Future)
// ComplianceRecord MUST be output from the transition (Leo records cannot be silently dropped)
// to_user = change token back to user
// to_pool = token sent to vault
```

The `amount` parameter is `u64` in pool logic but must be cast to `u128` for the token transfer call. Assert `token.amount >= amount as u128` before calling.

## Differences from v91 Summary

| Aspect | v91 | USDCx version |
|---|---|---|
| Program name | `lending_pool_v91.aleo` | `lending_pool_usdcx_v1.aleo` |
| Import | `credits.aleo` | `test_usdcx_stablecoin.aleo` |
| Asset ID | `0field` | `1field` |
| Transfer fn | `transfer_private_to_public` | `transfer_private` |
| Amount type | `u64` | `u64` (cast to `u128` for token call) |
| MerkleProof | Not needed | Local struct + `[MerkleProof; 2]` param |
| Deposit outputs | `(UserActivity, credits, Future)` | `(ComplianceRecord, UserActivity, Token, Token, Future)` |
| Repay outputs | `(UserActivity, credits, Future)` | `(ComplianceRecord, UserActivity, Token, Token, Future)` |
| Constructor | `program_owner` based | `program_owner` based (same pattern as v91) |

## Non-Goals

- No multi-asset support (single USDCx pool)
- No liquidation logic (handled off-chain)
- No oracle integration
- No governance
