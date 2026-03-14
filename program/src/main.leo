// ============================================================
// lending_pool_v_final.aleo
// Production-Ready Aave-Style Lending Pool on Aleo
//
// Architecture: lending_pool_simple.aleo base +
//               lending_pool_v86.aleo mechanics merged.
//
// Features:
//   - Aave-style cumulative liquidity/borrow indices
//   - Utilization-based interest rate model
//   - Supply rate with protocol reserve factor
//   - APY exposure (supply_apy, borrow_apy)
//   - Overcollateralized lending (75% LTV)
//   - Withdraw collateral safety check
//   - Pool accounting (total_deposited, total_borrowed, available_liquidity)
//   - Protocol fee accumulation
//   - Vault-based credit transfers (credits.aleo)
//   - Privacy via BHP256::hash_to_field(address)
//   - Permissionless accrue_interest() transition
//
// Leo 3.x syntax:
//   - fn + final { } blocks replace async transition + async function
//   - Final type replaces Future
//   - f.run() replaces f.await()
//   - self.caller available in fn, passed to final fn as param
//   - @admin constructor body must be empty
// ============================================================

import credits.aleo;

program lending_pool_v2.aleo {

    // ================================================================
    // CONSTANTS
    // ================================================================

    /// Fixed-point scale for cumulative indices (1e12).
    const INDEX_SCALE: u64       = 1_000_000_000_000u64;

    /// Basis-point denominator (10 000 bps = 100%).
    const SCALE: u64             = 10_000u64;

    /// Estimated Aleo blocks per year (~4s block time).
    const BLOCKS_PER_YEAR: u64   = 2_102_400u64;

    /// Cap per-tx accrual delta to prevent u64 overflow in
    /// (index * rate * delta) / INDEX_SCALE.
    const MAX_ACCRUAL_DELTA: u64 = 1_000u64;

    /// Pool vault — holds all public credit balances on behalf of the pool.
    const POOL_VAULT_ADDRESS: address =
        aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr;

    // ---- Interest Rate Model ----
    /// 2% annual base borrow rate in basis points.
    const BASE_RATE: u64         = 200u64;

    /// Slope: +4% borrow rate per 100% utilization, in basis points.
    const SLOPE_RATE: u64        = 400u64;

    /// Reserve factor: 10% of interest accrued goes to protocol treasury.
    const RESERVE_FACTOR: u64    = 1_000u64;

    /// LTV: borrowers may borrow up to 75% of their collateral value.
    const LTV_FACTOR: u64        = 7_500u64;

    // ================================================================
    // POOL STATE MAPPINGS  (key = 0field for single-asset pool)
    // ================================================================

    /// Total principal deposited (grows on deposit, shrinks on withdraw).
    mapping total_deposited:     field => u64;

    /// Total outstanding borrows (principal-equivalent).
    mapping total_borrowed:      field => u64;

    /// Available liquidity = total_deposited - total_borrowed.
    mapping available_liquidity: field => u64;

    /// Cumulative supply (liquidity) index; initialised to INDEX_SCALE.
    mapping supply_index:        field => u64;

    /// Cumulative borrow index; initialised to INDEX_SCALE.
    mapping borrow_index:        field => u64;

    /// Last block at which indices were accrued.
    mapping last_accrual_block:  field => u64;

    /// Accumulated protocol reserve fees.
    mapping protocol_fees:       field => u64;

    /// Annualised supply APY in basis points (read-only for UIs).
    mapping supply_apy:          field => u64;

    /// Annualised borrow APY in basis points (read-only for UIs).
    mapping borrow_apy:          field => u64;

    /// Guard: pool can only be initialized once.
    mapping initialized:         field => bool;

    // ================================================================
    // USER STATE MAPPINGS  (keys = BHP256::hash_to_field(address))
    // ================================================================

    /// real_balance = user_scaled_supply * supply_index / INDEX_SCALE
    mapping user_scaled_supply:  field => u64;

    /// real_debt = user_scaled_borrow * borrow_index / INDEX_SCALE
    mapping user_scaled_borrow:  field => u64;

    // ================================================================
    // RECORDS
    // ================================================================

    record UserActivity {
        owner:             address,
        asset_id:          field,
        total_deposits:    u64,
        total_withdrawals: u64,
        total_borrows:     u64,
        total_repayments:  u64,
    }

    // ================================================================
    // CONSTRUCTOR
    // @admin body must be empty — Leo inserts the admin guard automatically.
    // Call initialize() once after deployment to seed mapping values.
    // ================================================================

    @admin(address = "aleo1v0ufeajsjwr3lnyq8qay54x3sg7e4ld0287hdt72glr3lhjmn5zqzwnexq")
    constructor() {}

    /// One-time initialisation — must be called by the admin after deploy.
    fn initialize() -> Final {
        assert(self.caller == aleo1v0ufeajsjwr3lnyq8qay54x3sg7e4ld0287hdt72glr3lhjmn5zqzwnexq);
        return final { finalize_initialize(); };
    }

    // ================================================================
    // TRANSITIONS (user-facing — signatures preserved for frontend)
    // ================================================================

    // ----------------------------------------------------------------
    // 1) DEPOSIT — user sends private credits to the pool vault.
    // ----------------------------------------------------------------
    fn deposit_with_credits(
        pay_record:           credits.aleo/credits,
        public amount:        u64,
        public current_block: u64
    ) -> (UserActivity, credits.aleo/credits, Final) {
        assert(amount > 0u64);
        let caller: address = self.caller;
        assert(caller == pay_record.owner);

        let user_key: field = BHP256::hash_to_field(caller);

        let (change, f_transfer): (credits.aleo/credits, Final) =
            credits.aleo/transfer_private_to_public(pay_record, POOL_VAULT_ADDRESS, amount);

        let receipt: UserActivity = UserActivity {
            owner:             caller,
            asset_id:          0field,
            total_deposits:    amount,
            total_withdrawals: 0u64,
            total_borrows:     0u64,
            total_repayments:  0u64,
        };

        return (receipt, change, final { finalize_deposit(f_transfer, amount, user_key, current_block); });
    }

    // ----------------------------------------------------------------
    // 2) WITHDRAW — pool vault sends public credits back to caller.
    // ----------------------------------------------------------------
    fn withdraw(
        public amount:        u64,
        public current_block: u64
    ) -> (UserActivity, Final) {
        assert(amount > 0u64);
        let caller: address = self.caller;
        let user_key: field = BHP256::hash_to_field(caller);

        let f_transfer: Final = credits.aleo/transfer_public(caller, amount);

        let receipt: UserActivity = UserActivity {
            owner:             caller,
            asset_id:          0field,
            total_deposits:    0u64,
            total_withdrawals: amount,
            total_borrows:     0u64,
            total_repayments:  0u64,
        };

        return (receipt, final { finalize_withdraw(f_transfer, amount, user_key, current_block); });
    }

    // ----------------------------------------------------------------
    // 3) BORROW — pool vault sends public credits to caller.
    // ----------------------------------------------------------------
    fn borrow(
        public amount:        u64,
        public current_block: u64
    ) -> (UserActivity, Final) {
        assert(amount > 0u64);
        let caller: address = self.caller;
        let user_key: field = BHP256::hash_to_field(caller);

        let f_transfer: Final = credits.aleo/transfer_public(caller, amount);

        let receipt: UserActivity = UserActivity {
            owner:             caller,
            asset_id:          0field,
            total_deposits:    0u64,
            total_withdrawals: 0u64,
            total_borrows:     amount,
            total_repayments:  0u64,
        };

        return (receipt, final { finalize_borrow(f_transfer, amount, user_key, current_block); });
    }

    // ----------------------------------------------------------------
    // 4) REPAY — user sends private credits to the pool vault.
    // ----------------------------------------------------------------
    fn repay_with_credits(
        pay_record:           credits.aleo/credits,
        public amount:        u64,
        public current_block: u64
    ) -> (UserActivity, credits.aleo/credits, Final) {
        assert(amount > 0u64);
        let caller: address = self.caller;
        assert(caller == pay_record.owner);

        let user_key: field = BHP256::hash_to_field(caller);

        let (change, f_transfer): (credits.aleo/credits, Final) =
            credits.aleo/transfer_private_to_public(pay_record, POOL_VAULT_ADDRESS, amount);

        let receipt: UserActivity = UserActivity {
            owner:             caller,
            asset_id:          0field,
            total_deposits:    0u64,
            total_withdrawals: 0u64,
            total_borrows:     0u64,
            total_repayments:  amount,
        };

        return (receipt, change, final { finalize_repay(f_transfer, amount, user_key, current_block); });
    }

    // ----------------------------------------------------------------
    // 5) ACCRUE INTEREST — permissionless; syncs indices without a
    //    deposit/withdraw/borrow/repay. Useful for keepers / UIs.
    // ----------------------------------------------------------------
    fn accrue_interest(public current_block: u64) -> Final {
        return final { finalize_accrue(current_block); };
    }

    // ----------------------------------------------------------------
    // 6) WITHDRAW FEES — admin withdraws accumulated protocol fees.
    // ----------------------------------------------------------------
    fn withdraw_fees(public amount: u64) -> Final {
        assert(amount > 0u64);
        let caller: address = self.caller;
        let f_transfer: Final = credits.aleo/transfer_public(caller, amount);
        return final { finalize_withdraw_fees(f_transfer, amount, caller); };
    }
}

// ================================================================
// FINAL FUNCTIONS (on-chain finalize logic)
//
// Restrictions:
//   - No variable re-assignment across if-block scope boundaries —
//     every variable is declared exactly once via ternary expressions.
//   - External program Finals executed via .run()
//   - Interest accrual fully inlined (no helper chaining).
// ================================================================

// ----------------------------------------------------------------
// FINALIZE INITIALIZE
// ----------------------------------------------------------------
final fn finalize_initialize() {
    let already: bool = Mapping::get_or_use(initialized, 0field, false);
    assert(!already);

    let id: field = 0field;
    Mapping::set(supply_index,        id, INDEX_SCALE);
    Mapping::set(borrow_index,        id, INDEX_SCALE);
    Mapping::set(last_accrual_block,  id, 0u64);
    Mapping::set(total_deposited,     id, 0u64);
    Mapping::set(total_borrowed,      id, 0u64);
    Mapping::set(available_liquidity, id, 0u64);
    Mapping::set(protocol_fees,       id, 0u64);
    Mapping::set(supply_apy,          id, BASE_RATE);
    Mapping::set(borrow_apy,          id, BASE_RATE);

    Mapping::set(initialized, 0field, true);
}

// ----------------------------------------------------------------
// FINALIZE DEPOSIT
// ----------------------------------------------------------------
final fn finalize_deposit(
    f_transfer:    Final,
    amount:        u64,
    user_key:      field,
    current_block: u64
) {
    // 1. Confirm vault received the funds.
    f_transfer.run();

    let id: field = 0field;

    // 2. ---- Inlined interest accrual (ternary-only, no if re-assignment) ----
    let last_block:  u64 = Mapping::get_or_use(last_accrual_block,  id, 0u64);
    let sup_idx:     u64 = Mapping::get_or_use(supply_index,        id, INDEX_SCALE);
    let bor_idx:     u64 = Mapping::get_or_use(borrow_index,        id, INDEX_SCALE);
    let deposited:   u64 = Mapping::get_or_use(total_deposited,     id, 0u64);
    let borrowed:    u64 = Mapping::get_or_use(total_borrowed,      id, 0u64);
    let fees:        u64 = Mapping::get_or_use(protocol_fees,       id, 0u64);

    let raw_delta:   u64 = current_block > last_block ? current_block - last_block : 0u64;
    let delta:       u64 = raw_delta > MAX_ACCRUAL_DELTA ? MAX_ACCRUAL_DELTA : raw_delta;
    let do_accrue:  bool = delta > 0u64 && deposited > 0u64;

    // utilization = borrowed / deposited  (SCALE = 10_000)
    let util:        u64 = deposited == 0u64 ? 0u64 : (borrowed * SCALE) / deposited;

    // borrow_rate_per_block  = (base + slope*util) * INDEX_SCALE / (BLOCKS_PER_YEAR * SCALE)
    let borrow_rate: u64 = (BASE_RATE + (SLOPE_RATE * util) / SCALE)
                           * INDEX_SCALE / (BLOCKS_PER_YEAR * SCALE);

    // supply_rate_per_block  = borrow_rate * util * (1 - reserve_factor) / SCALE^2
    let supply_rate: u64 = (borrow_rate * util * (SCALE - RESERVE_FACTOR))
                           / (SCALE * SCALE);

    let new_sup_idx: u64 = do_accrue
        ? sup_idx + (sup_idx * supply_rate * delta) / INDEX_SCALE
        : sup_idx;
    let new_bor_idx: u64 = do_accrue
        ? bor_idx + (bor_idx * borrow_rate * delta) / INDEX_SCALE
        : bor_idx;

    // protocol_fee_delta = borrowed * borrow_rate * delta * reserve_factor / (INDEX_SCALE*SCALE)
    let fee_delta:   u64 = do_accrue
        ? (borrowed * borrow_rate * delta * RESERVE_FACTOR) / (INDEX_SCALE * SCALE)
        : 0u64;

    // apy_bps = rate_per_block * BLOCKS_PER_YEAR * SCALE / INDEX_SCALE
    let new_s_apy:   u64 = (supply_rate * BLOCKS_PER_YEAR * SCALE) / INDEX_SCALE;
    let new_b_apy:   u64 = (borrow_rate * BLOCKS_PER_YEAR * SCALE) / INDEX_SCALE;
    let new_block:   u64 = do_accrue ? last_block + delta : last_block;

    Mapping::set(supply_index,        id, new_sup_idx);
    Mapping::set(borrow_index,        id, new_bor_idx);
    Mapping::set(last_accrual_block,  id, new_block);
    Mapping::set(protocol_fees,       id, fees + fee_delta);
    Mapping::set(supply_apy,          id, new_s_apy);
    Mapping::set(borrow_apy,          id, new_b_apy);
    // ---- End accrual ----

    // 3. Scale deposit by the updated supply index and credit the user.
    let scaled_in:    u64 = (amount * INDEX_SCALE) / new_sup_idx;
    let prev_scaled:  u64 = Mapping::get_or_use(user_scaled_supply, user_key, 0u64);
    Mapping::set(user_scaled_supply, user_key, prev_scaled + scaled_in);

    // 4. Update pool accounting.
    Mapping::set(total_deposited,     id, deposited + amount);
    let prev_avail:   u64 = Mapping::get_or_use(available_liquidity, id, 0u64);
    Mapping::set(available_liquidity, id, prev_avail + amount);
}

// ----------------------------------------------------------------
// FINALIZE WITHDRAW
// ----------------------------------------------------------------
final fn finalize_withdraw(
    f_transfer:    Final,
    amount:        u64,
    user_key:      field,
    current_block: u64
) {
    // 1. Run transfer. Tx reverts atomically if any assert below fails.
    f_transfer.run();

    let id: field = 0field;

    // 2. ---- Inlined interest accrual ----
    let last_block:  u64 = Mapping::get_or_use(last_accrual_block,  id, 0u64);
    let sup_idx:     u64 = Mapping::get_or_use(supply_index,        id, INDEX_SCALE);
    let bor_idx:     u64 = Mapping::get_or_use(borrow_index,        id, INDEX_SCALE);
    let deposited:   u64 = Mapping::get_or_use(total_deposited,     id, 0u64);
    let borrowed:    u64 = Mapping::get_or_use(total_borrowed,      id, 0u64);
    let fees:        u64 = Mapping::get_or_use(protocol_fees,       id, 0u64);

    let raw_delta:   u64 = current_block > last_block ? current_block - last_block : 0u64;
    let delta:       u64 = raw_delta > MAX_ACCRUAL_DELTA ? MAX_ACCRUAL_DELTA : raw_delta;
    let do_accrue:  bool = delta > 0u64 && deposited > 0u64;

    let util:        u64 = deposited == 0u64 ? 0u64 : (borrowed * SCALE) / deposited;
    let borrow_rate: u64 = (BASE_RATE + (SLOPE_RATE * util) / SCALE)
                           * INDEX_SCALE / (BLOCKS_PER_YEAR * SCALE);
    let supply_rate: u64 = (borrow_rate * util * (SCALE - RESERVE_FACTOR))
                           / (SCALE * SCALE);

    let new_sup_idx: u64 = do_accrue
        ? sup_idx + (sup_idx * supply_rate * delta) / INDEX_SCALE
        : sup_idx;
    let new_bor_idx: u64 = do_accrue
        ? bor_idx + (bor_idx * borrow_rate * delta) / INDEX_SCALE
        : bor_idx;
    let fee_delta:   u64 = do_accrue
        ? (borrowed * borrow_rate * delta * RESERVE_FACTOR) / (INDEX_SCALE * SCALE)
        : 0u64;
    let new_s_apy:   u64 = (supply_rate * BLOCKS_PER_YEAR * SCALE) / INDEX_SCALE;
    let new_b_apy:   u64 = (borrow_rate * BLOCKS_PER_YEAR * SCALE) / INDEX_SCALE;
    let new_block:   u64 = do_accrue ? last_block + delta : last_block;

    Mapping::set(supply_index,        id, new_sup_idx);
    Mapping::set(borrow_index,        id, new_bor_idx);
    Mapping::set(last_accrual_block,  id, new_block);
    Mapping::set(protocol_fees,       id, fees + fee_delta);
    Mapping::set(supply_apy,          id, new_s_apy);
    Mapping::set(borrow_apy,          id, new_b_apy);
    // ---- End accrual ----

    // 3. Balance check.
    let scaled_sup:   u64 = Mapping::get_or_use(user_scaled_supply, user_key, 0u64);
    let real_balance: u64 = (scaled_sup * new_sup_idx) / INDEX_SCALE;
    assert(amount <= real_balance);

    // 4. Collateral safety: remaining collateral must still cover open debt.
    let scaled_bor:   u64 = Mapping::get_or_use(user_scaled_borrow, user_key, 0u64);
    let real_debt:    u64 = (scaled_bor * new_bor_idx) / INDEX_SCALE;
    let remaining:    u64 = real_balance - amount;
    let max_debt:     u64 = (remaining * LTV_FACTOR) / SCALE;
    assert(real_debt == 0u64 || real_debt <= max_debt);

    // 5. Debit user's scaled supply.
    let scaled_out:   u64 = (amount * INDEX_SCALE) / new_sup_idx;
    let new_scaled:   u64 = scaled_sup > scaled_out ? scaled_sup - scaled_out : 0u64;
    Mapping::set(user_scaled_supply, user_key, new_scaled);

    // 6. Update pool accounting.
    let new_deposited: u64 = deposited > amount ? deposited - amount : 0u64;
    Mapping::set(total_deposited,     id, new_deposited);
    let prev_avail:    u64 = Mapping::get_or_use(available_liquidity, id, 0u64);
    let new_avail:     u64 = prev_avail > amount ? prev_avail - amount : 0u64;
    Mapping::set(available_liquidity, id, new_avail);
}

// ----------------------------------------------------------------
// FINALIZE BORROW
// ----------------------------------------------------------------
final fn finalize_borrow(
    f_transfer:    Final,
    amount:        u64,
    user_key:      field,
    current_block: u64
) {
    // 1. Run transfer. Reverts atomically if LTV/liquidity asserts fail.
    f_transfer.run();

    let id: field = 0field;

    // 2. ---- Inlined interest accrual ----
    let last_block:  u64 = Mapping::get_or_use(last_accrual_block,  id, 0u64);
    let sup_idx:     u64 = Mapping::get_or_use(supply_index,        id, INDEX_SCALE);
    let bor_idx:     u64 = Mapping::get_or_use(borrow_index,        id, INDEX_SCALE);
    let deposited:   u64 = Mapping::get_or_use(total_deposited,     id, 0u64);
    let borrowed:    u64 = Mapping::get_or_use(total_borrowed,      id, 0u64);
    let fees:        u64 = Mapping::get_or_use(protocol_fees,       id, 0u64);

    let raw_delta:   u64 = current_block > last_block ? current_block - last_block : 0u64;
    let delta:       u64 = raw_delta > MAX_ACCRUAL_DELTA ? MAX_ACCRUAL_DELTA : raw_delta;
    let do_accrue:  bool = delta > 0u64 && deposited > 0u64;

    let util:        u64 = deposited == 0u64 ? 0u64 : (borrowed * SCALE) / deposited;
    let borrow_rate: u64 = (BASE_RATE + (SLOPE_RATE * util) / SCALE)
                           * INDEX_SCALE / (BLOCKS_PER_YEAR * SCALE);
    let supply_rate: u64 = (borrow_rate * util * (SCALE - RESERVE_FACTOR))
                           / (SCALE * SCALE);

    let new_sup_idx: u64 = do_accrue
        ? sup_idx + (sup_idx * supply_rate * delta) / INDEX_SCALE
        : sup_idx;
    let new_bor_idx: u64 = do_accrue
        ? bor_idx + (bor_idx * borrow_rate * delta) / INDEX_SCALE
        : bor_idx;
    let fee_delta:   u64 = do_accrue
        ? (borrowed * borrow_rate * delta * RESERVE_FACTOR) / (INDEX_SCALE * SCALE)
        : 0u64;
    let new_s_apy:   u64 = (supply_rate * BLOCKS_PER_YEAR * SCALE) / INDEX_SCALE;
    let new_b_apy:   u64 = (borrow_rate * BLOCKS_PER_YEAR * SCALE) / INDEX_SCALE;
    let new_block:   u64 = do_accrue ? last_block + delta : last_block;

    Mapping::set(supply_index,        id, new_sup_idx);
    Mapping::set(borrow_index,        id, new_bor_idx);
    Mapping::set(last_accrual_block,  id, new_block);
    Mapping::set(protocol_fees,       id, fees + fee_delta);
    Mapping::set(supply_apy,          id, new_s_apy);
    Mapping::set(borrow_apy,          id, new_b_apy);
    // ---- End accrual ----

    // 3. LTV check: (existing_debt + new_borrow) <= 75% of collateral.
    let scaled_sup:       u64 = Mapping::get_or_use(user_scaled_supply, user_key, 0u64);
    let collateral_value: u64 = (scaled_sup * new_sup_idx) / INDEX_SCALE;
    let max_borrow:       u64 = (collateral_value * LTV_FACTOR) / SCALE;
    let scaled_bor:       u64 = Mapping::get_or_use(user_scaled_borrow, user_key, 0u64);
    let existing_debt:    u64 = (scaled_bor * new_bor_idx) / INDEX_SCALE;
    assert(existing_debt + amount <= max_borrow);

    // 4. Pool liquidity check.
    let avail:            u64 = Mapping::get_or_use(available_liquidity, id, 0u64);
    assert(amount <= avail);

    // 5. Record scaled borrow.
    let scaled_in:        u64 = (amount * INDEX_SCALE) / new_bor_idx;
    Mapping::set(user_scaled_borrow, user_key, scaled_bor + scaled_in);

    // 6. Update pool accounting.
    Mapping::set(total_borrowed,      id, borrowed + amount);
    let new_avail:        u64 = avail > amount ? avail - amount : 0u64;
    Mapping::set(available_liquidity, id, new_avail);
}

// ----------------------------------------------------------------
// FINALIZE REPAY
// ----------------------------------------------------------------
final fn finalize_repay(
    f_transfer:    Final,
    amount:        u64,
    user_key:      field,
    current_block: u64
) {
    // 1. Confirm vault received the repaid funds.
    f_transfer.run();

    let id: field = 0field;

    // 2. ---- Inlined interest accrual ----
    let last_block:  u64 = Mapping::get_or_use(last_accrual_block,  id, 0u64);
    let sup_idx:     u64 = Mapping::get_or_use(supply_index,        id, INDEX_SCALE);
    let bor_idx:     u64 = Mapping::get_or_use(borrow_index,        id, INDEX_SCALE);
    let deposited:   u64 = Mapping::get_or_use(total_deposited,     id, 0u64);
    let borrowed:    u64 = Mapping::get_or_use(total_borrowed,      id, 0u64);
    let fees:        u64 = Mapping::get_or_use(protocol_fees,       id, 0u64);

    let raw_delta:   u64 = current_block > last_block ? current_block - last_block : 0u64;
    let delta:       u64 = raw_delta > MAX_ACCRUAL_DELTA ? MAX_ACCRUAL_DELTA : raw_delta;
    let do_accrue:  bool = delta > 0u64 && deposited > 0u64;

    let util:        u64 = deposited == 0u64 ? 0u64 : (borrowed * SCALE) / deposited;
    let borrow_rate: u64 = (BASE_RATE + (SLOPE_RATE * util) / SCALE)
                           * INDEX_SCALE / (BLOCKS_PER_YEAR * SCALE);
    let supply_rate: u64 = (borrow_rate * util * (SCALE - RESERVE_FACTOR))
                           / (SCALE * SCALE);

    let new_sup_idx: u64 = do_accrue
        ? sup_idx + (sup_idx * supply_rate * delta) / INDEX_SCALE
        : sup_idx;
    let new_bor_idx: u64 = do_accrue
        ? bor_idx + (bor_idx * borrow_rate * delta) / INDEX_SCALE
        : bor_idx;
    let fee_delta:   u64 = do_accrue
        ? (borrowed * borrow_rate * delta * RESERVE_FACTOR) / (INDEX_SCALE * SCALE)
        : 0u64;
    let new_s_apy:   u64 = (supply_rate * BLOCKS_PER_YEAR * SCALE) / INDEX_SCALE;
    let new_b_apy:   u64 = (borrow_rate * BLOCKS_PER_YEAR * SCALE) / INDEX_SCALE;
    let new_block:   u64 = do_accrue ? last_block + delta : last_block;

    Mapping::set(supply_index,        id, new_sup_idx);
    Mapping::set(borrow_index,        id, new_bor_idx);
    Mapping::set(last_accrual_block,  id, new_block);
    Mapping::set(protocol_fees,       id, fees + fee_delta);
    Mapping::set(supply_apy,          id, new_s_apy);
    Mapping::set(borrow_apy,          id, new_b_apy);
    // ---- End accrual ----

    // 3. Revert if repayment exceeds actual outstanding debt.
    let scaled_bor:   u64 = Mapping::get_or_use(user_scaled_borrow, user_key, 0u64);
    let real_debt:    u64 = (scaled_bor * new_bor_idx) / INDEX_SCALE;
    assert(amount <= real_debt);
    let repay_amt:    u64 = amount;

    // 4. Reduce user's scaled borrow position.
    let scaled_out:   u64 = (repay_amt * INDEX_SCALE) / new_bor_idx;
    let new_scaled:   u64 = scaled_bor > scaled_out ? scaled_bor - scaled_out : 0u64;
    Mapping::set(user_scaled_borrow, user_key, new_scaled);

    // 5. Update pool accounting.
    let new_borrowed: u64 = borrowed > repay_amt ? borrowed - repay_amt : 0u64;
    Mapping::set(total_borrowed,      id, new_borrowed);
    let prev_avail:   u64 = Mapping::get_or_use(available_liquidity, id, 0u64);
    Mapping::set(available_liquidity, id, prev_avail + repay_amt);
}

// ----------------------------------------------------------------
// FINALIZE ACCRUE — standalone index sync, no user state changes.
// ----------------------------------------------------------------
final fn finalize_accrue(current_block: u64) {
    let id: field = 0field;

    // ---- Inlined interest accrual ----
    let last_block:  u64 = Mapping::get_or_use(last_accrual_block,  id, 0u64);
    let sup_idx:     u64 = Mapping::get_or_use(supply_index,        id, INDEX_SCALE);
    let bor_idx:     u64 = Mapping::get_or_use(borrow_index,        id, INDEX_SCALE);
    let deposited:   u64 = Mapping::get_or_use(total_deposited,     id, 0u64);
    let borrowed:    u64 = Mapping::get_or_use(total_borrowed,      id, 0u64);
    let fees:        u64 = Mapping::get_or_use(protocol_fees,       id, 0u64);

    let raw_delta:   u64 = current_block > last_block ? current_block - last_block : 0u64;
    let delta:       u64 = raw_delta > MAX_ACCRUAL_DELTA ? MAX_ACCRUAL_DELTA : raw_delta;
    let do_accrue:  bool = delta > 0u64 && deposited > 0u64;

    let util:        u64 = deposited == 0u64 ? 0u64 : (borrowed * SCALE) / deposited;
    let borrow_rate: u64 = (BASE_RATE + (SLOPE_RATE * util) / SCALE)
                           * INDEX_SCALE / (BLOCKS_PER_YEAR * SCALE);
    let supply_rate: u64 = (borrow_rate * util * (SCALE - RESERVE_FACTOR))
                           / (SCALE * SCALE);

    let new_sup_idx: u64 = do_accrue
        ? sup_idx + (sup_idx * supply_rate * delta) / INDEX_SCALE
        : sup_idx;
    let new_bor_idx: u64 = do_accrue
        ? bor_idx + (bor_idx * borrow_rate * delta) / INDEX_SCALE
        : bor_idx;
    let fee_delta:   u64 = do_accrue
        ? (borrowed * borrow_rate * delta * RESERVE_FACTOR) / (INDEX_SCALE * SCALE)
        : 0u64;
    let new_s_apy:   u64 = (supply_rate * BLOCKS_PER_YEAR * SCALE) / INDEX_SCALE;
    let new_b_apy:   u64 = (borrow_rate * BLOCKS_PER_YEAR * SCALE) / INDEX_SCALE;
    let new_block:   u64 = do_accrue ? last_block + delta : last_block;

    Mapping::set(supply_index,        id, new_sup_idx);
    Mapping::set(borrow_index,        id, new_bor_idx);
    Mapping::set(last_accrual_block,  id, new_block);
    Mapping::set(protocol_fees,       id, fees + fee_delta);
    Mapping::set(supply_apy,          id, new_s_apy);
    Mapping::set(borrow_apy,          id, new_b_apy);
    // ---- End accrual ----
}

// ----------------------------------------------------------------
// FINALIZE WITHDRAW FEES
// ----------------------------------------------------------------
final fn finalize_withdraw_fees(
    f_transfer: Final,
    amount:     u64,
    caller:     address
) {
    f_transfer.run();
    assert(caller == aleo1v0ufeajsjwr3lnyq8qay54x3sg7e4ld0287hdt72glr3lhjmn5zqzwnexq);
    let id: field = 0field;
    let fees: u64 = Mapping::get_or_use(protocol_fees, id, 0u64);
    assert(amount <= fees);
    Mapping::set(protocol_fees, id, fees - amount);
}
