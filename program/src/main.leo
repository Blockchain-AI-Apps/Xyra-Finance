// Core single-asset lending pool program - Version 8
// Lending pool with real interest and APY (Aave-style indices).
//  - liquidity_index / borrow_index accrue per block from utilization
//  - User supply balance = scaled_supply * liquidity_index / INDEX_SCALE
//  - User borrow debt = scaled_borrow * borrow_index / INDEX_SCALE

import credits.aleo;

program lending_pool_v86_v2.aleo {
    // ---- Constants ----
    const SCALE: u64 = 1_000_000u64;
    const GLOBAL_KEY: u8 = 0u8;
    const POOL_VAULT_ADDRESS: address = aleo1cw4zdgfgxr064yp43nf2n5d0k0cmrpafua0xqhlsr8w2kx0jsy8s6rcmuw; //account 5

    // ---- Interest / APY (fixed-point; INDEX_SCALE = 1e12) ----
    const INDEX_SCALE: u64 = 1_000_000_000_000u64;
    const BASE_RATE_PER_BLOCK: u64 = 1000u64;
    const SLOPE_PER_UTIL: u64 = 6667u64;
    const RESERVE_FACTOR_BPS: u64 = 1000u64;
    // Cap accrual delta per tx to avoid u64 overflow in (index * rate * delta) / INDEX_SCALE
    const MAX_ACCRUAL_DELTA: u64 = 1_000u64;

    // ---- Public Aggregates (Pool State) ----
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

    // ---- Private User Mappings (with hashed keys for privacy) ----
    mapping user_total_deposits: field => u64;
    mapping user_total_withdrawals: field => u64;
    mapping user_total_borrows: field => u64;
    mapping user_total_repayments: field => u64;
    mapping user_scaled_supply: field => u64;
    mapping user_scaled_borrow: field => u64;

    // For authorization of liquidators
    mapping authorized_liquidator: address => bool;

    // ---- Constructor (Upgradable via Admin) ----
    // Only the specified admin address can upgrade this program.
    @admin(address = "aleo1n4ws5s7vlt4cff9rk5vwuwza4vjja03my4p9j8d45fxy0ady6uzq9jjujy")
    async constructor() {}

    // ==================== TRANSITIONS ====================

  

    // 1b) DEPOSIT with private ALEO credits -> vault public balance (transfer_private_to_public)
    //     NOTE: `amount` is in micro-ALEO (1 ALEO = 1_000_000 micro-ALEO).
    async transition deposit_with_credits(
        pay_record: credits.aleo/credits,
        public amount: u64,
        public current_block: u64
    ) -> (UserActivity, credits.aleo/credits, Future) {
        assert(amount > 0u64);

        let caller: address = self.caller;
        assert(caller == pay_record.owner);

        let user_hash: field = BHP256::hash_to_field(caller);

        // `amount` is already in micro-ALEO; send that from user to pool vault.
        let amount_micro: u64 = amount;

        let (change_to_user, f_transfer): (credits.aleo/credits, Future) =
            credits.aleo/transfer_private_to_public(pay_record, POOL_VAULT_ADDRESS, amount_micro);

        let updated: UserActivity = UserActivity {
            owner: caller,
            total_deposits: amount,
            total_withdrawals: 0u64,
            total_borrows: 0u64,
            total_repayments: 0u64,
        };

        let f: Future = finalize_deposit_after_transfer(f_transfer, amount, user_hash, current_block);
        return (updated, change_to_user, f);
    }

    // 2) BORROW: User borrows amount (state tracking only)
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

    

    // 3b) REPAY with private ALEO credits -> vault public balance (transfer_private_to_public)
    //     NOTE: `amount` is in micro-ALEO (1 ALEO = 1_000_000 micro-ALEO).
    async transition repay_with_credits(
        pay_record: credits.aleo/credits,
        public amount: u64,
        public current_block: u64
    ) -> (UserActivity, credits.aleo/credits, Future) {
        assert(amount > 0u64);

        let caller: address = self.caller;
        assert(caller == pay_record.owner);

        let user_hash: field = BHP256::hash_to_field(caller);

        // `amount` is already in micro-ALEO; send that from user to pool vault.
        let amount_micro: u64 = amount;

        let (change_to_user, f_transfer): (credits.aleo/credits, Future) =
            credits.aleo/transfer_private_to_public(pay_record, POOL_VAULT_ADDRESS, amount_micro);

        let updated: UserActivity = UserActivity {
            owner: caller,
            total_deposits: 0u64,
            total_withdrawals: 0u64,
            total_borrows: 0u64,
            total_repayments: amount,
        };

        let f: Future = finalize_repay_after_transfer(f_transfer, amount, user_hash, current_block);
        return (updated, change_to_user, f);
    }

    // 4) WITHDRAW: User withdraws amount (state tracking only)
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

    // 5) Accrue interest: updates liquidity_index and borrow_index up to current_block.
    //    Optional: any wallet can call it to sync indices without depositing/borrowing/repaying/withdrawing.
    //    Indices are also updated automatically on every deposit, borrow, repay, and withdraw.
    async transition accrue_interest(public current_block: u64) -> Future {
        let f: Future = finalize_accrue(current_block);
        return f;
    }

    // 6) Helper: Get address hash
    transition get_address_hash() -> field {
        let caller: address = self.caller;
        let user_hash: field = BHP256::hash_to_field(caller);
        return user_hash;
    }

    // 7) Helper: Get user activity (returns placeholder, actual values in mappings)
    async transition get_user_activity() -> (UserActivity, Future) {
        let caller: address = self.caller;
        let user_hash: field = BHP256::hash_to_field(caller);
        
        let placeholder: UserActivity = UserActivity {
            owner: caller,
            total_deposits: 0u64,
            total_withdrawals: 0u64,
            total_borrows: 0u64,
            total_repayments: 0u64,
        };

        let f: Future = finalize_get_user_activity(user_hash);
        return (placeholder, f);
    }
    
    // 8) Admin function to set authorized liquidator
    async transition set_authorized_liquidator(public liquidator: address) -> Future {
        assert(self.caller == aleo1n4ws5s7vlt4cff9rk5vwuwza4vjja03my4p9j8d45fxy0ady6uzq9jjujy);
        return finalize_set_liquidator(liquidator);
    }

    // 9) PROCESS LIQUIDATION — called only by authorized liquidation program.
    async transition process_liquidation(
        public borrower: address,
        public debt_asset: field,
        public collateral_asset: field,
        public repay_amount: u64,
        public seize_amount: u64,
        public current_block: u64
    ) -> Future {
        let caller: address = self.caller;
        return finalize_process_liquidation(
            caller,
            borrower,
            repay_amount,
            seize_amount,
            current_block
        );
    }
    // ==================== FINALIZE FUNCTIONS ====================

    async function finalize_deposit_after_transfer(f_transfer: Future, amount: u64, user_hash: field, current_block: u64) {
        f_transfer.await();
        let lub: u64 = Mapping::get_or_use(last_update_block, GLOBAL_KEY, 0u64);
        if current_block > lub {
            let delta: u64 = current_block - lub;
            let effective_delta: u64 = (delta > MAX_ACCRUAL_DELTA) ? MAX_ACCRUAL_DELTA : delta;
            last_update_block.set(GLOBAL_KEY, lub + effective_delta);
            let ts: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
            if ts > 0u64 {
                let tb: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
                let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
                let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
                let util: u64 = (tb * SCALE) / ts;
                let br: u64 = BASE_RATE_PER_BLOCK + (SLOPE_PER_UTIL * util) / SCALE;
                let sr: u64 = (br * util * (10000u64 - RESERVE_FACTOR_BPS)) / (SCALE * 10000u64);
                let li_new: u64 = li + (li * sr * effective_delta) / INDEX_SCALE;
                let bi_new: u64 = bi + (bi * br * effective_delta) / INDEX_SCALE;
                liquidity_index.set(GLOBAL_KEY, li_new);
                borrow_index.set(GLOBAL_KEY, bi_new);
            }
        }
        let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
        let scaled_delta: u64 = (amount * INDEX_SCALE) / li;
        let prev_scaled: u64 = Mapping::get_or_use(user_scaled_supply, user_hash, 0u64);
        Mapping::set(user_scaled_supply, user_hash, prev_scaled + scaled_delta);

        let current_deposits: u64 = Mapping::get_or_use(user_total_deposits, user_hash, 0u64);
        let new_total_deposits: u64 = current_deposits + amount;
        Mapping::set(user_total_deposits, user_hash, new_total_deposits);

        if total_supplied.contains(GLOBAL_KEY) && total_borrowed.contains(GLOBAL_KEY) {
            let prev_supplied: u64 = total_supplied.get(GLOBAL_KEY);
            let prev_borrowed: u64 = total_borrowed.get(GLOBAL_KEY);
            let new_supplied: u64 = prev_supplied + amount;
            total_supplied.set(GLOBAL_KEY, new_supplied);
            if new_supplied == 0u64 {
                utilization_index.set(GLOBAL_KEY, 0u64);
            } else {
                let util: u64 = (prev_borrowed * SCALE) / new_supplied;
                utilization_index.set(GLOBAL_KEY, util);
            }
        } else if total_supplied.contains(GLOBAL_KEY) {
            let prev_supplied: u64 = total_supplied.get(GLOBAL_KEY);
            let new_supplied: u64 = prev_supplied + amount;
            total_supplied.set(GLOBAL_KEY, new_supplied);
            if new_supplied == 0u64 {
                utilization_index.set(GLOBAL_KEY, 0u64);
            } else {
                let util: u64 = (0u64 * SCALE) / new_supplied;
                utilization_index.set(GLOBAL_KEY, util);
            }
        } else if total_borrowed.contains(GLOBAL_KEY) {
            let prev_borrowed: u64 = total_borrowed.get(GLOBAL_KEY);
            let new_supplied: u64 = 0u64 + amount;
            total_supplied.set(GLOBAL_KEY, new_supplied);
            if new_supplied == 0u64 {
                utilization_index.set(GLOBAL_KEY, 0u64);
            } else {
                let util: u64 = (prev_borrowed * SCALE) / new_supplied;
                utilization_index.set(GLOBAL_KEY, util);
            }
        } else {
            total_supplied.set(GLOBAL_KEY, amount);
            utilization_index.set(GLOBAL_KEY, 0u64);
        }
    }

    async function finalize_borrow(amount: u64, user_hash: field, current_block: u64) {
        let lub: u64 = Mapping::get_or_use(last_update_block, GLOBAL_KEY, 0u64);
        if current_block > lub {
            let delta: u64 = current_block - lub;
            let effective_delta: u64 = (delta > MAX_ACCRUAL_DELTA) ? MAX_ACCRUAL_DELTA : delta;
            last_update_block.set(GLOBAL_KEY, lub + effective_delta);
            let ts: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
            if ts > 0u64 {
                let tb: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
                let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
                let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
                let util: u64 = (tb * SCALE) / ts;
                let br: u64 = BASE_RATE_PER_BLOCK + (SLOPE_PER_UTIL * util) / SCALE;
                let sr: u64 = (br * util * (10000u64 - RESERVE_FACTOR_BPS)) / (SCALE * 10000u64);
                let li_new: u64 = li + (li * sr * effective_delta) / INDEX_SCALE;
                let bi_new: u64 = bi + (bi * br * effective_delta) / INDEX_SCALE;
                liquidity_index.set(GLOBAL_KEY, li_new);
                borrow_index.set(GLOBAL_KEY, bi_new);
            }
        }
        let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
        let scaled_delta: u64 = (amount * INDEX_SCALE) / bi;
        let prev_scaled: u64 = Mapping::get_or_use(user_scaled_borrow, user_hash, 0u64);
        Mapping::set(user_scaled_borrow, user_hash, prev_scaled + scaled_delta);

        let current_borrows: u64 = Mapping::get_or_use(user_total_borrows, user_hash, 0u64);
        let new_total_borrows: u64 = current_borrows + amount;
        Mapping::set(user_total_borrows, user_hash, new_total_borrows);

        if total_supplied.contains(GLOBAL_KEY) && total_borrowed.contains(GLOBAL_KEY) {
            let prev_supplied: u64 = total_supplied.get(GLOBAL_KEY);
            let prev_borrowed: u64 = total_borrowed.get(GLOBAL_KEY);
            assert(prev_borrowed + amount <= prev_supplied);
            let new_borrowed: u64 = prev_borrowed + amount;
            total_borrowed.set(GLOBAL_KEY, new_borrowed);
            if prev_supplied == 0u64 {
                utilization_index.set(GLOBAL_KEY, 0u64);
            } else {
                let util: u64 = (new_borrowed * SCALE) / prev_supplied;
                utilization_index.set(GLOBAL_KEY, util);
            }
        } else if total_supplied.contains(GLOBAL_KEY) {
            let prev_supplied: u64 = total_supplied.get(GLOBAL_KEY);
            assert(amount <= prev_supplied);
            total_borrowed.set(GLOBAL_KEY, amount);
            if prev_supplied == 0u64 {
                utilization_index.set(GLOBAL_KEY, 0u64);
            } else {
                let util: u64 = (amount * SCALE) / prev_supplied;
                utilization_index.set(GLOBAL_KEY, util);
            }
        } else {
            assert(false);
        }
    }

   

    async function finalize_repay_after_transfer(f_transfer: Future, amount: u64, user_hash: field, current_block: u64) {
        f_transfer.await();
        let lub: u64 = Mapping::get_or_use(last_update_block, GLOBAL_KEY, 0u64);
        if current_block > lub {
            let delta: u64 = current_block - lub;
            let effective_delta: u64 = (delta > MAX_ACCRUAL_DELTA) ? MAX_ACCRUAL_DELTA : delta;
            last_update_block.set(GLOBAL_KEY, lub + effective_delta);
            let ts: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
            if ts > 0u64 {
                let tb: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
                let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
                let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
                let util: u64 = (tb * SCALE) / ts;
                let br: u64 = BASE_RATE_PER_BLOCK + (SLOPE_PER_UTIL * util) / SCALE;
                let sr: u64 = (br * util * (10000u64 - RESERVE_FACTOR_BPS)) / (SCALE * 10000u64);
                let li_new: u64 = li + (li * sr * effective_delta) / INDEX_SCALE;
                let bi_new: u64 = bi + (bi * br * effective_delta) / INDEX_SCALE;
                liquidity_index.set(GLOBAL_KEY, li_new);
                borrow_index.set(GLOBAL_KEY, bi_new);
            }
        }
        let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
        let scaled_borrow: u64 = Mapping::get_or_use(user_scaled_borrow, user_hash, 0u64);
        let real_debt: u64 = (scaled_borrow * bi) / INDEX_SCALE;
        assert(amount <= real_debt);

        let scaled_delta: u64 = (amount * INDEX_SCALE) / bi;
        Mapping::set(user_scaled_borrow, user_hash, scaled_borrow - scaled_delta);

        let current_repayments: u64 = Mapping::get_or_use(user_total_repayments, user_hash, 0u64);
        Mapping::set(user_total_repayments, user_hash, current_repayments + amount);

        if total_supplied.contains(GLOBAL_KEY) && total_borrowed.contains(GLOBAL_KEY) {
            let prev_supplied: u64 = total_supplied.get(GLOBAL_KEY);
            let prev_borrowed: u64 = total_borrowed.get(GLOBAL_KEY);
            assert(amount <= prev_borrowed);
            let new_borrowed: u64 = prev_borrowed - amount;
            total_borrowed.set(GLOBAL_KEY, new_borrowed);
            if prev_supplied == 0u64 {
                utilization_index.set(GLOBAL_KEY, 0u64);
            } else {
                let util: u64 = (new_borrowed * SCALE) / prev_supplied;
                utilization_index.set(GLOBAL_KEY, util);
            }
        } else {
            assert(false);
        }
    }

    async function finalize_withdraw(amount: u64, user_hash: field, current_block: u64) {
        let lub: u64 = Mapping::get_or_use(last_update_block, GLOBAL_KEY, 0u64);
        if current_block > lub {
            let delta: u64 = current_block - lub;
            let effective_delta: u64 = (delta > MAX_ACCRUAL_DELTA) ? MAX_ACCRUAL_DELTA : delta;
            last_update_block.set(GLOBAL_KEY, lub + effective_delta);
            let ts: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
            if ts > 0u64 {
                let tb: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
                let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
                let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
                let util: u64 = (tb * SCALE) / ts;
                let br: u64 = BASE_RATE_PER_BLOCK + (SLOPE_PER_UTIL * util) / SCALE;
                let sr: u64 = (br * util * (10000u64 - RESERVE_FACTOR_BPS)) / (SCALE * 10000u64);
                let li_new: u64 = li + (li * sr * effective_delta) / INDEX_SCALE;
                let bi_new: u64 = bi + (bi * br * effective_delta) / INDEX_SCALE;
                liquidity_index.set(GLOBAL_KEY, li_new);
                borrow_index.set(GLOBAL_KEY, bi_new);
            }
        }
        let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
        let scaled_supply: u64 = Mapping::get_or_use(user_scaled_supply, user_hash, 0u64);
        let real_balance: u64 = (scaled_supply * li) / INDEX_SCALE;
        assert(amount <= real_balance);

        let scaled_delta: u64 = (amount * INDEX_SCALE) / li;
        Mapping::set(user_scaled_supply, user_hash, scaled_supply - scaled_delta);

        let current_withdrawals: u64 = Mapping::get_or_use(user_total_withdrawals, user_hash, 0u64);
        Mapping::set(user_total_withdrawals, user_hash, current_withdrawals + amount);

        if total_supplied.contains(GLOBAL_KEY) && total_borrowed.contains(GLOBAL_KEY) {
            let prev_supplied: u64 = total_supplied.get(GLOBAL_KEY);
            let prev_borrowed: u64 = total_borrowed.get(GLOBAL_KEY);
            assert(prev_supplied >= amount);
            assert((prev_supplied - amount) >= prev_borrowed);
            let new_supplied: u64 = prev_supplied - amount;
            total_supplied.set(GLOBAL_KEY, new_supplied);
            if new_supplied == 0u64 {
                utilization_index.set(GLOBAL_KEY, 0u64);
            } else {
                let util: u64 = (prev_borrowed * SCALE) / new_supplied;
                utilization_index.set(GLOBAL_KEY, util);
            }
        } else if total_supplied.contains(GLOBAL_KEY) {
            let prev_supplied: u64 = total_supplied.get(GLOBAL_KEY);
            assert(prev_supplied >= amount);
            let new_supplied: u64 = prev_supplied - amount;
            total_supplied.set(GLOBAL_KEY, new_supplied);
            if new_supplied == 0u64 {
                utilization_index.set(GLOBAL_KEY, 0u64);
            } else {
                let util: u64 = (0u64 * SCALE) / new_supplied;
                utilization_index.set(GLOBAL_KEY, util);
            }
        } else {
            assert(false);
        }
    }

    async function finalize_accrue(current_block: u64) {
        let lub: u64 = Mapping::get_or_use(last_update_block, GLOBAL_KEY, 0u64);
        if current_block > lub {
            let delta: u64 = current_block - lub;
            let effective_delta: u64 = (delta > MAX_ACCRUAL_DELTA) ? MAX_ACCRUAL_DELTA : delta;
            last_update_block.set(GLOBAL_KEY, lub + effective_delta);
            let ts: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
            if ts > 0u64 {
                let tb: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
                let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
                let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
                let util: u64 = (tb * SCALE) / ts;
                let br: u64 = BASE_RATE_PER_BLOCK + (SLOPE_PER_UTIL * util) / SCALE;
                let sr: u64 = (br * util * (10000u64 - RESERVE_FACTOR_BPS)) / (SCALE * 10000u64);
                let li_new: u64 = li + (li * sr * effective_delta) / INDEX_SCALE;
                let bi_new: u64 = bi + (bi * br * effective_delta) / INDEX_SCALE;
                liquidity_index.set(GLOBAL_KEY, li_new);
                borrow_index.set(GLOBAL_KEY, bi_new);
            }
        }
    }

    async function finalize_get_user_activity(user_hash: field) {
        // This function reads from mappings but cannot return values
        // The actual values are stored in mappings and can be read via RPC
        let total_deposits: u64 = Mapping::get_or_use(user_total_deposits, user_hash, 0u64);
        let total_withdrawals: u64 = Mapping::get_or_use(user_total_withdrawals, user_hash, 0u64);
        let total_borrows: u64 = Mapping::get_or_use(user_total_borrows, user_hash, 0u64);
        let total_repayments: u64 = Mapping::get_or_use(user_total_repayments, user_hash, 0u64);
        // Values are in mappings, cannot return from finalize function
    }

    async function finalize_set_liquidator(liquidator: address) {
        Mapping::set(authorized_liquidator, liquidator, true);
    }

    async function finalize_process_liquidation(
        caller: address,
        borrower: address,
        repay_amount: u64,
        seize_amount: u64,
        current_block: u64
        ) {
        // Guard: only authorized liquidator may call
        let ok: bool = Mapping::get_or_use(authorized_liquidator, caller, false);
        assert(ok);

        let borrower_hash: field = BHP256::hash_to_field(borrower);

        // ---- Inlined interest accrual (same pattern as other finalize functions) ----
        let lub: u64 = Mapping::get_or_use(last_update_block, GLOBAL_KEY, 0u64);
        if current_block > lub {
            let delta: u64 = current_block - lub;
            let effective_delta: u64 = (delta > MAX_ACCRUAL_DELTA) ? MAX_ACCRUAL_DELTA : delta;
            last_update_block.set(GLOBAL_KEY, lub + effective_delta);
            let ts: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
            if ts > 0u64 {
                let tb: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);
                let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
                let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);
                let util: u64 = (tb * SCALE) / ts;
                let br: u64 = BASE_RATE_PER_BLOCK + (SLOPE_PER_UTIL * util) / SCALE;
                let sr: u64 = (br * util * (10000u64 - RESERVE_FACTOR_BPS)) / (SCALE * 10000u64);
                let li_new: u64 = li + (li * sr * effective_delta) / INDEX_SCALE;
                let bi_new: u64 = bi + (bi * br * effective_delta) / INDEX_SCALE;
                liquidity_index.set(GLOBAL_KEY, li_new);
                borrow_index.set(GLOBAL_KEY, bi_new);
            }
        }
        // ---- End accrual ----

        let li: u64 = Mapping::get_or_use(liquidity_index, GLOBAL_KEY, INDEX_SCALE);
        let bi: u64 = Mapping::get_or_use(borrow_index, GLOBAL_KEY, INDEX_SCALE);

        // ---- Repay borrow side ----
        let scaled_bor: u64 = Mapping::get_or_use(user_scaled_borrow, borrower_hash, 0u64);
        let real_debt:  u64 = (scaled_bor * bi) / INDEX_SCALE;
        let repay:      u64 = repay_amount > real_debt ? real_debt : repay_amount;
        let scaled_rep: u64 = (repay * INDEX_SCALE) / bi;
        let new_s_bor:  u64 = scaled_bor > scaled_rep ? scaled_bor - scaled_rep : 0u64;
        Mapping::set(user_scaled_borrow, borrower_hash, new_s_bor);

        // ---- Seize collateral side ----
        let scaled_sup: u64 = Mapping::get_or_use(user_scaled_supply, borrower_hash, 0u64);
        let real_coll:  u64 = (scaled_sup * li) / INDEX_SCALE;
        let seize:      u64 = seize_amount > real_coll ? real_coll : seize_amount;
        let scaled_sez: u64 = (seize * INDEX_SCALE) / li;
        let new_s_sup:  u64 = scaled_sup > scaled_sez ? scaled_sup - scaled_sez : 0u64;
        Mapping::set(user_scaled_supply, borrower_hash, new_s_sup);

        // ---- Pool accounting ----
        let prev_supplied: u64 = Mapping::get_or_use(total_supplied, GLOBAL_KEY, 0u64);
        let prev_borrowed: u64 = Mapping::get_or_use(total_borrowed, GLOBAL_KEY, 0u64);

        let new_borrowed:  u64 = prev_borrowed > repay ? prev_borrowed - repay : 0u64;
        let new_supplied:  u64 = prev_supplied > seize ? prev_supplied - seize : 0u64;

        Mapping::set(total_borrowed, GLOBAL_KEY, new_borrowed);
        Mapping::set(total_supplied, GLOBAL_KEY, new_supplied);

        // Update utilization index
        let new_util: u64 = new_supplied == 0u64 ? 0u64 : (new_borrowed * SCALE) / new_supplied;
        Mapping::set(utilization_index, GLOBAL_KEY, new_util);

        // ---- Update user total deposits (collateral seized) ----
        let current_deposits: u64 = Mapping::get_or_use(user_total_deposits, borrower_hash, 0u64);
        let new_deposits: u64 = current_deposits > seize ? current_deposits - seize : 0u64;
        Mapping::set(user_total_deposits, borrower_hash, new_deposits);

        // ---- Update user total borrows (debt repaid) ----
        let current_borrows: u64 = Mapping::get_or_use(user_total_borrows, borrower_hash, 0u64);
        let new_borrows: u64 = current_borrows > repay ? current_borrows - repay : 0u64;
        Mapping::set(user_total_borrows, borrower_hash, new_borrows);
    }
}
