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

Admin-only (POOL_VAULT_ADDRESS). Sets all indices to `INDEX_SCALE`, all totals to 0, APYs to 200 (2%). Guarded by `initialized` mapping — can only run once.

### 2. `deposit(token, amount, proofs)`

```
Inputs:
  - token: test_usdcx_stablecoin.aleo/Token
  - amount: u64 (public)
  - proofs: [MerkleProof; 2]

Outputs:
  - UserActivity record (asset_id=1field, total_deposits=amount)
  - Token (change back to user)
  - Token (sent to pool vault)
  - Future

Transition logic:
  1. Assert amount > 0, caller == token.owner
  2. Cast amount to u128, assert token.amount >= amount_u128
  3. Call test_usdcx_stablecoin.aleo/transfer_private(POOL_VAULT, amount_u128, token, proofs)
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

Outputs:
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

Admin-only. Deducts `amount` from `protocol_fees` mapping. Admin check via `assert(self.caller == ADMIN_ADDRESS)` in finalize.

## Interest Accrual Block (shared by all finalize functions)

This is the exact v91 algorithm:

```
current_block = block.height (cast to u64)
lub = last_accrual_block (default 0)
delta = current_block > lub ? current_block - lub : 0
effective_delta = delta > 1000 ? 1000 : delta

if effective_delta > 0 AND total_deposited > 0:
    safe_deposited = total_deposited == 0 ? 1 : total_deposited
    util_bps = (total_borrowed * 10000) / safe_deposited  // 0 if deposited==0
    util_bps = total_deposited == 0 ? 0 : util_bps

    // Borrow rate (annual, in BPS): 200 + 400 * util_bps / 10000
    borrow_rate_annual = 200 + (400 * util_bps) / 10000

    // Per-block rate: annual * 1e12 / (2,102,400 * 10,000)
    borrow_rate_pb = borrow_rate_annual * INDEX_SCALE / 21,024,000,000

    // Supply rate per block
    supply_rate_pb = borrow_rate_pb * util_bps * 9000 / 100,000,000

    // Update indices
    supply_index += supply_index * supply_rate_pb * effective_delta / INDEX_SCALE
    borrow_index += borrow_index * borrow_rate_pb * effective_delta / INDEX_SCALE

    // Protocol fees (10% of borrow interest)
    interest_amount = total_borrowed * borrow_rate_pb / INDEX_SCALE
    fee_delta = interest_amount * effective_delta * 1000 / 10000
    protocol_fees += fee_delta

    // APY (annualized, in BPS * 100 for precision)
    supply_apy = supply_rate_pb * 2,102,400 * 10000 / INDEX_SCALE
    borrow_apy = borrow_rate_pb * 2,102,400 * 10000 / INDEX_SCALE

    last_accrual_block += effective_delta
```

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
// ComplianceRecord is discarded (not returned from transition)
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
| Deposit outputs | `(UserActivity, credits, Future)` | `(UserActivity, Token, Token, Future)` |
| Repay outputs | `(UserActivity, credits, Future)` | `(UserActivity, Token, Token, Future)` |
| Constructor | `program_owner` based | `@admin` attribute based |

## Non-Goals

- No multi-asset support (single USDCx pool)
- No liquidation logic (handled off-chain)
- No oracle integration
- No governance
