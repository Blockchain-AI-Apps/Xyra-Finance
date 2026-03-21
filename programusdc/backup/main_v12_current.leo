// USDC lending pool v12 — local MerkleProof struct mirrors v86 approach.
// Root cause of v8-v11 failures: AVM used fully-qualified [test_usdcx_stablecoin.aleo/MerkleProof; 2u32]
// which Shield wallet cannot parse. v86 worked because it defined MerkleProof as a local struct,
// producing unqualified [MerkleProof; 2u32] in the AVM which Shield wallet parses fine.
// Fix: define local MerkleProof struct (identical fields) and take proofs as explicit input param.

import test_usdcx_stablecoin.aleo;

program lending_pool_usdce_v12.aleo {
    // ---- Local MerkleProof struct (mirrors test_usdcx_stablecoin.aleo/MerkleProof) ----
    struct MerkleProof {
        siblings: [field; 16],
        leaf_index: u32,
    }
    // ---- Constants ----
    const SCALE: u64 = 1_000_000u64;
    const GLOBAL_KEY: u8 = 0u8;
    const POOL_VAULT_ADDRESS: address = aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr;

    // ---- Interest / APY ----
    const INDEX_SCALE: u64 = 1_000_000_000_000u64;
    const BASE_RATE_PER_BLOCK: u64 = 1000u64;
    const SLOPE_PER_UTIL: u64 = 6667u64;
    const RESERVE_FACTOR_BPS: u64 = 1000u64;
    const MAX_ACCRUAL_DELTA: u64 = 1_000u64;

    // ---- Pool State Mappings ----
    mapping total_supplied: u8 => u64;
    mapping total_borrowed: u8 => u64;
    mapping utilization_index: u8 => u64;
    mapping liquidity_index: u8 => u64;
    mapping borrow_index: u8 => u64;
    mapping last_update_block: u8 => u64;

    // ---- Private User Records ----
    record UserActivity {
        owner: address,
        total_deposits: u64,
        total_withdrawals: u64,
        total_borrows: u64,
        total_repayments: u64,
    }

    // ---- Private User Mappings (hashed keys for privacy) ----
    mapping user_total_deposits: field => u64;
    mapping user_total_withdrawals: field => u64;
    mapping user_total_borrows: field => u64;
    mapping user_total_repayments: field => u64;
    mapping user_scaled_supply: field => u64;
    mapping user_scaled_borrow: field => u64;

    // ---- Constructor ----
    @admin(address = "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px")
    async constructor() {}

    // ==================== TRANSITIONS ====================

    // 1) DEPOSIT: proofs passed as input (local MerkleProof → unqualified AVM type, Shield-compatible).
    async transition deposit(
        token: test_usdcx_stablecoin.aleo/Token,
        public amount: u64,
        public current_block: u64,
        proofs: [MerkleProof; 2]
    ) -> (UserActivity, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) {
        let caller: address = self.caller;
        assert(amount > 0u64);
        assert(caller == token.owner);

        let amount_u128: u128 = (amount as u128);
        assert(token.amount >= amount_u128);

        let user_hash: field = BHP256::hash_to_field(caller);

        let (compliance_out, to_user, to_pool, token_future): (
            test_usdcx_stablecoin.aleo/ComplianceRecord,
            test_usdcx_stablecoin.aleo/Token,
            test_usdcx_stablecoin.aleo/Token,
            Future
        ) = test_usdcx_stablecoin.aleo/transfer_private(POOL_VAULT_ADDRESS, amount_u128, token, proofs);

        let updated: UserActivity = UserActivity {
            owner: caller,
            total_deposits: amount,
            total_withdrawals: 0u64,
            total_borrows: 0u64,
            total_repayments: 0u64,
        };

        let f: Future = finalize_deposit(amount, user_hash, current_block, token_future);
        return (updated, to_pool, to_user, f);
    }

    // 2) REPAY: proofs passed as input — same pattern as deposit.
    async transition repay(
        token: test_usdcx_stablecoin.aleo/Token,
        public amount: u64,
        public current_block: u64,
        proofs: [MerkleProof; 2]
    ) -> (UserActivity, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) {
        let caller: address = self.caller;
        assert(amount > 0u64);
        assert(caller == token.owner);
        let amount_u128: u128 = (amount as u128);
        assert(token.amount >= amount_u128);

        let user_hash: field = BHP256::hash_to_field(caller);

        let (compliance_out, to_user, to_pool, token_future): (
            test_usdcx_stablecoin.aleo/ComplianceRecord,
            test_usdcx_stablecoin.aleo/Token,
            test_usdcx_stablecoin.aleo/Token,
            Future
        ) = test_usdcx_stablecoin.aleo/transfer_private(POOL_VAULT_ADDRESS, amount_u128, token, proofs);

        let updated: UserActivity = UserActivity {
            owner: caller,
            total_deposits: 0u64,
            total_withdrawals: 0u64,
            total_borrows: 0u64,
            total_repayments: amount,
        };

        let f: Future = finalize_repay(amount, user_hash, current_block, token_future);
        return (updated, to_pool, to_user, f);
    }

    // 3) WITHDRAW: State only.
    async transition withdraw(public amount: u64, public current_block: u64) -> (UserActivity, Future) {
        assert(amount > 0u64);
        let caller: address = self.caller;
        let user_hash: field = BHP256::hash_to_field(caller);

        let updated: UserActivity = UserActivity {
            owner: caller,
            total_deposits: 0u64,
            total_withdrawals: amount,
            total_borrows: 0u64,
            total_repayments: 0u64,
        };

        let f: Future = finalize_withdraw(amount, user_hash, current_block);
        return (updated, f);
    }

    // 4) BORROW: State only.
    async transition borrow(public amount: u64, public current_block: u64) -> (UserActivity, Future) {
        assert(amount > 0u64);
        let caller: address = self.caller;
        let user_hash: field = BHP256::hash_to_field(caller);

        let updated: UserActivity = UserActivity {
            owner: caller,
            total_deposits: 0u64,
            total_withdrawals: 0u64,
            total_borrows: amount,
            total_repayments: 0u64,
        };

        let f: Future = finalize_borrow(amount, user_hash, current_block);
        return (updated, f);
    }

    // 5) Accrue interest
    async transition accrue_interest(public current_block: u64) -> Future {
        let f: Future = finalize_accrue(current_block);
        return f;
    }

    transition get_address_hash() -> field {
        let caller: address = self.caller;
        let user_hash: field = BHP256::hash_to_field(caller);
        return user_hash;
    }

    // ==================== FINALIZE FUNCTIONS ====================

    async function finalize_deposit(amount: u64, user_hash: field, current_block: u64, token_future: Future) {
        token_future.await();
        let lub: u64 = Mapping::get_or_use(last_update_block, GLOBAL_KEY, 0u64);
        if current_block > lub {
            let delta: u64 = current_block - lub;
            let eff_delta: u64 = (delta > MAX_ACCRUAL_DELTA) ? MAX_ACCRUAL_DELTA : delta;
            last_update_block.set(GLOBAL_KEY, lub + eff_delta);
            let ts: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
            let tb: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
            let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
            let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
            let safe_ts: u64 = ts == 0u64 ? 1u64 : ts;
            let accrual_util: u64 = (tb * SCALE) / safe_ts;
            let br: u64 = BASE_RATE_PER_BLOCK + (SLOPE_PER_UTIL * accrual_util) / SCALE;
            let sr: u64 = (br * accrual_util * (10000u64 - RESERVE_FACTOR_BPS)) / (SCALE * 10000u64);
            liquidity_index.set(GLOBAL_KEY, li + (li * sr * eff_delta) / INDEX_SCALE);
            borrow_index.set(GLOBAL_KEY, bi + (bi * br * eff_delta) / INDEX_SCALE);
        }
        let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
        let scaled_delta: u64 = (amount * INDEX_SCALE) / li;
        let prev_scaled: u64 = Mapping::get_or_use(user_scaled_supply, user_hash, 0u64);
        Mapping::set(user_scaled_supply, user_hash, prev_scaled + scaled_delta);

        let current_deposits: u64 = Mapping::get_or_use(user_total_deposits, user_hash, 0u64);
        Mapping::set(user_total_deposits, user_hash, current_deposits + amount);

        let prev_supplied: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
        let prev_borrowed: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
        let new_supplied: u64 = prev_supplied + amount;
        total_supplied.set(GLOBAL_KEY, new_supplied);
        let safe_new_s: u64 = new_supplied == 0u64 ? 1u64 : new_supplied;
        let pool_util: u64 = new_supplied == 0u64 ? 0u64 : (prev_borrowed * SCALE) / safe_new_s;
        utilization_index.set(GLOBAL_KEY, pool_util);
    }

    async function finalize_repay(amount: u64, user_hash: field, current_block: u64, token_future: Future) {
        token_future.await();
        let lub: u64 = Mapping::get_or_use(last_update_block, GLOBAL_KEY, 0u64);
        if current_block > lub {
            let delta: u64 = current_block - lub;
            let eff_delta: u64 = (delta > MAX_ACCRUAL_DELTA) ? MAX_ACCRUAL_DELTA : delta;
            last_update_block.set(GLOBAL_KEY, lub + eff_delta);
            let ts: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
            let tb: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
            let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
            let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
            let safe_ts: u64 = ts == 0u64 ? 1u64 : ts;
            let accrual_util: u64 = (tb * SCALE) / safe_ts;
            let br: u64 = BASE_RATE_PER_BLOCK + (SLOPE_PER_UTIL * accrual_util) / SCALE;
            let sr: u64 = (br * accrual_util * (10000u64 - RESERVE_FACTOR_BPS)) / (SCALE * 10000u64);
            liquidity_index.set(GLOBAL_KEY, li + (li * sr * eff_delta) / INDEX_SCALE);
            borrow_index.set(GLOBAL_KEY, bi + (bi * br * eff_delta) / INDEX_SCALE);
        }
        let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
        let scaled_borrow: u64 = Mapping::get_or_use(user_scaled_borrow, user_hash, 0u64);
        let real_debt: u64 = (scaled_borrow * bi) / INDEX_SCALE;
        assert(amount <= real_debt);

        let scaled_delta: u64 = (amount * INDEX_SCALE) / bi;
        Mapping::set(user_scaled_borrow, user_hash, scaled_borrow - scaled_delta);

        let current_repayments: u64 = Mapping::get_or_use(user_total_repayments, user_hash, 0u64);
        Mapping::set(user_total_repayments, user_hash, current_repayments + amount);

        let prev_supplied: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
        let prev_borrowed: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
        assert(amount <= prev_borrowed);
        let new_borrowed: u64 = prev_borrowed - amount;
        total_borrowed.set(GLOBAL_KEY, new_borrowed);
        let safe_s: u64 = prev_supplied == 0u64 ? 1u64 : prev_supplied;
        let pool_util: u64 = prev_supplied == 0u64 ? 0u64 : (new_borrowed * SCALE) / safe_s;
        utilization_index.set(GLOBAL_KEY, pool_util);
    }

    async function finalize_withdraw(amount: u64, user_hash: field, current_block: u64) {
        let lub: u64 = Mapping::get_or_use(last_update_block, GLOBAL_KEY, 0u64);
        if current_block > lub {
            let delta: u64 = current_block - lub;
            let eff_delta: u64 = (delta > MAX_ACCRUAL_DELTA) ? MAX_ACCRUAL_DELTA : delta;
            last_update_block.set(GLOBAL_KEY, lub + eff_delta);
            let ts: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
            let tb: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
            let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
            let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
            let safe_ts: u64 = ts == 0u64 ? 1u64 : ts;
            let accrual_util: u64 = (tb * SCALE) / safe_ts;
            let br: u64 = BASE_RATE_PER_BLOCK + (SLOPE_PER_UTIL * accrual_util) / SCALE;
            let sr: u64 = (br * accrual_util * (10000u64 - RESERVE_FACTOR_BPS)) / (SCALE * 10000u64);
            liquidity_index.set(GLOBAL_KEY, li + (li * sr * eff_delta) / INDEX_SCALE);
            borrow_index.set(GLOBAL_KEY, bi + (bi * br * eff_delta) / INDEX_SCALE);
        }
        let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
        let scaled_supply: u64 = Mapping::get_or_use(user_scaled_supply, user_hash, 0u64);
        let real_balance: u64 = (scaled_supply * li) / INDEX_SCALE;
        assert(amount <= real_balance);

        let scaled_delta: u64 = (amount * INDEX_SCALE) / li;
        Mapping::set(user_scaled_supply, user_hash, scaled_supply - scaled_delta);

        let current_withdrawals: u64 = Mapping::get_or_use(user_total_withdrawals, user_hash, 0u64);
        Mapping::set(user_total_withdrawals, user_hash, current_withdrawals + amount);

        let prev_supplied: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
        let prev_borrowed: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
        assert(prev_supplied >= amount);
        assert(prev_supplied - amount >= prev_borrowed);
        let new_supplied: u64 = prev_supplied - amount;
        total_supplied.set(GLOBAL_KEY, new_supplied);
        let safe_new_s: u64 = new_supplied == 0u64 ? 1u64 : new_supplied;
        let pool_util: u64 = new_supplied == 0u64 ? 0u64 : (prev_borrowed * SCALE) / safe_new_s;
        utilization_index.set(GLOBAL_KEY, pool_util);
    }

    async function finalize_borrow(amount: u64, user_hash: field, current_block: u64) {
        let lub: u64 = Mapping::get_or_use(last_update_block, GLOBAL_KEY, 0u64);
        if current_block > lub {
            let delta: u64 = current_block - lub;
            let eff_delta: u64 = (delta > MAX_ACCRUAL_DELTA) ? MAX_ACCRUAL_DELTA : delta;
            last_update_block.set(GLOBAL_KEY, lub + eff_delta);
            let ts: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
            let tb: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
            let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
            let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
            let safe_ts: u64 = ts == 0u64 ? 1u64 : ts;
            let accrual_util: u64 = (tb * SCALE) / safe_ts;
            let br: u64 = BASE_RATE_PER_BLOCK + (SLOPE_PER_UTIL * accrual_util) / SCALE;
            let sr: u64 = (br * accrual_util * (10000u64 - RESERVE_FACTOR_BPS)) / (SCALE * 10000u64);
            liquidity_index.set(GLOBAL_KEY, li + (li * sr * eff_delta) / INDEX_SCALE);
            borrow_index.set(GLOBAL_KEY, bi + (bi * br * eff_delta) / INDEX_SCALE);
        }
        let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
        let scaled_delta: u64 = (amount * INDEX_SCALE) / bi;
        let prev_scaled: u64 = Mapping::get_or_use(user_scaled_borrow, user_hash, 0u64);
        Mapping::set(user_scaled_borrow, user_hash, prev_scaled + scaled_delta);

        let current_borrows: u64 = Mapping::get_or_use(user_total_borrows, user_hash, 0u64);
        Mapping::set(user_total_borrows, user_hash, current_borrows + amount);

        let prev_supplied: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
        let prev_borrowed: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
        assert(prev_borrowed + amount <= prev_supplied);
        let new_borrowed: u64 = prev_borrowed + amount;
        total_borrowed.set(GLOBAL_KEY, new_borrowed);
        let safe_s: u64 = prev_supplied == 0u64 ? 1u64 : prev_supplied;
        let pool_util: u64 = prev_supplied == 0u64 ? 0u64 : (new_borrowed * SCALE) / safe_s;
        utilization_index.set(GLOBAL_KEY, pool_util);
    }

    async function finalize_accrue(current_block: u64) {
        let lub: u64 = Mapping::get_or_use(last_update_block, GLOBAL_KEY, 0u64);
        if current_block > lub {
            let delta: u64 = current_block - lub;
            let eff_delta: u64 = (delta > MAX_ACCRUAL_DELTA) ? MAX_ACCRUAL_DELTA : delta;
            last_update_block.set(GLOBAL_KEY, lub + eff_delta);
            let ts: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
            let tb: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
            let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
            let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
            let safe_ts: u64 = ts == 0u64 ? 1u64 : ts;
            let accrual_util: u64 = (tb * SCALE) / safe_ts;
            let br: u64 = BASE_RATE_PER_BLOCK + (SLOPE_PER_UTIL * accrual_util) / SCALE;
            let sr: u64 = (br * accrual_util * (10000u64 - RESERVE_FACTOR_BPS)) / (SCALE * 10000u64);
            liquidity_index.set(GLOBAL_KEY, li + (li * sr * eff_delta) / INDEX_SCALE);
            borrow_index.set(GLOBAL_KEY, bi + (bi * br * eff_delta) / INDEX_SCALE);
        }
    }
}
