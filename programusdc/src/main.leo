// USDCx Lending Pool v2 — Direct port of v91 interest model.
// Built with Leo 3.4.0 to produce unqualified [MerkleProof; 2u32] in AVM (Shield wallet compatible).
// Uses test_usdcx_stablecoin.aleo/transfer_private for deposit & repay.
// Withdraw & borrow are state-only (backend vault sends USDCx off-chain).

import test_usdcx_stablecoin.aleo;

program lending_pool_usdcx_v4.aleo {
    // ---- Constants (matching v91 exactly) ----
    const INDEX_SCALE: u64 = 1_000_000_000_000u64;
    const BASE_RATE: u64 = 200u64;
    const SLOPE: u64 = 400u64;
    const UTIL_SCALE: u64 = 10_000u64;
    const ANNUALIZER: u64 = 21_024_000_000u64;
    const RESERVE_FACTOR_BPS: u64 = 1_000u64;
    const SUPPLY_FEE_FACTOR: u64 = 9_000u64;
    const SUPPLY_FEE_DENOM: u64 = 100_000_000u64;
    const MAX_ACCRUAL_DELTA: u64 = 1_000u64;
    const LTV_BPS: u64 = 7_500u64;
    const APY_MULTIPLIER: u64 = 21_024_000_000u64;

    const POOL_VAULT_ADDRESS: address = aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr;
    const ADMIN_ADDRESS: address = aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px;
    const ASSET_ID: field = 1field;

    // ---- Mappings ----
    mapping total_deposited: field => u64;
    mapping total_borrowed: field => u64;
    mapping available_liquidity: field => u64;
    mapping supply_index: field => u64;
    mapping borrow_index: field => u64;
    mapping last_accrual_block: field => u64;
    mapping protocol_fees: field => u64;
    mapping supply_apy: field => u64;
    mapping borrow_apy: field => u64;
    mapping initialized: field => bool;
    mapping user_scaled_supply: field => u64;
    mapping user_scaled_borrow: field => u64;

    // ---- Record ----
    record UserActivity {
        owner: address,
        asset_id: field,
        total_deposits: u64,
        total_withdrawals: u64,
        total_borrows: u64,
        total_repayments: u64,
    }

    // ---- Constructor ----
    @admin(address = "aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr")
    async constructor() {}

    // ==================== 1. INITIALIZE ====================
    async transition initialize() -> Future {
        assert(self.caller == POOL_VAULT_ADDRESS);
        let f: Future = finalize_initialize();
        return f;
    }

    async function finalize_initialize() {
        let already: bool = Mapping::get_or_use(initialized, 0field, false);
        assert(!already);
        Mapping::set(supply_index, 0field, INDEX_SCALE);
        Mapping::set(borrow_index, 0field, INDEX_SCALE);
        Mapping::set(last_accrual_block, 0field, 0u64);
        Mapping::set(total_deposited, 0field, 0u64);
        Mapping::set(total_borrowed, 0field, 0u64);
        Mapping::set(available_liquidity, 0field, 0u64);
        Mapping::set(protocol_fees, 0field, 0u64);
        Mapping::set(supply_apy, 0field, 200u64);
        Mapping::set(borrow_apy, 0field, 200u64);
        Mapping::set(initialized, 0field, true);
    }

    // ==================== 2. DEPOSIT ====================
    // Bare MerkleProof (Leo 3.4.0 resolves from import → unqualified in AVM)
    async transition deposit(
        token: test_usdcx_stablecoin.aleo/Token,
        public amount: u64,
        proofs: [test_usdcx_stablecoin.aleo/MerkleProof; 2]
    ) -> (test_usdcx_stablecoin.aleo/ComplianceRecord, UserActivity, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) {
        let caller: address = self.caller;
        assert(amount > 0u64);
        assert(caller == token.owner);

        let amount_u128: u128 = (amount as u128);
        assert(token.amount >= amount_u128);

        let user_hash: field = BHP256::hash_to_field(caller);

        let (compliance_out, change_token, pool_token, token_future): (
            test_usdcx_stablecoin.aleo/ComplianceRecord,
            test_usdcx_stablecoin.aleo/Token,
            test_usdcx_stablecoin.aleo/Token,
            Future
        ) = test_usdcx_stablecoin.aleo/transfer_private(POOL_VAULT_ADDRESS, amount_u128, token, proofs);

        let updated: UserActivity = UserActivity {
            owner: caller,
            asset_id: ASSET_ID,
            total_deposits: amount,
            total_withdrawals: 0u64,
            total_borrows: 0u64,
            total_repayments: 0u64,
        };

        let f: Future = finalize_deposit(token_future, amount, user_hash);
        return (compliance_out, updated, change_token, pool_token, f);
    }

    async function finalize_deposit(token_future: Future, amount: u64, user_hash: field) {
        token_future.await();

        let current_block: u64 = (block.height as u64);
        let lub: u64 = Mapping::get_or_use(last_accrual_block, 0field, 0u64);
        let si: u64 = Mapping::get_or_use(supply_index, 0field, INDEX_SCALE);
        let bi: u64 = Mapping::get_or_use(borrow_index, 0field, INDEX_SCALE);
        let td: u64 = Mapping::get_or_use(total_deposited, 0field, 0u64);
        let tb: u64 = Mapping::get_or_use(total_borrowed, 0field, 0u64);
        let pf: u64 = Mapping::get_or_use(protocol_fees, 0field, 0u64);

        let raw_delta: u64 = current_block > lub ? current_block - lub : 0u64;
        let effective_delta: u64 = raw_delta > MAX_ACCRUAL_DELTA ? MAX_ACCRUAL_DELTA : raw_delta;
        let should_accrue: bool = effective_delta > 0u64;
        let has_deposits: bool = td > 0u64;
        let should_update: bool = should_accrue && has_deposits;
        let safe_td: u64 = td == 0u64 ? 1u64 : td;
        let raw_util: u64 = (tb * UTIL_SCALE) / safe_td;
        let util_bps: u64 = td == 0u64 ? 0u64 : raw_util;
        let borrow_rate_annual: u64 = BASE_RATE + (SLOPE * util_bps) / UTIL_SCALE;
        let borrow_rate_pb: u64 = (borrow_rate_annual * INDEX_SCALE) / ANNUALIZER;
        let supply_rate_pb: u64 = (borrow_rate_pb * util_bps * SUPPLY_FEE_FACTOR) / SUPPLY_FEE_DENOM;
        let new_si: u64 = si + (si * supply_rate_pb * effective_delta) / INDEX_SCALE;
        let final_si: u64 = should_update ? new_si : si;
        let new_bi: u64 = bi + (bi * borrow_rate_pb * effective_delta) / INDEX_SCALE;
        let final_bi: u64 = should_update ? new_bi : bi;
        let interest_amt: u64 = (tb * borrow_rate_pb) / INDEX_SCALE;
        let fee_delta: u64 = (interest_amt * effective_delta * RESERVE_FACTOR_BPS) / UTIL_SCALE;
        let final_pf: u64 = pf + (should_update ? fee_delta : 0u64);
        let s_apy: u64 = (supply_rate_pb * APY_MULTIPLIER) / INDEX_SCALE;
        let b_apy: u64 = (borrow_rate_pb * APY_MULTIPLIER) / INDEX_SCALE;
        let final_lub: u64 = should_accrue ? lub + effective_delta : lub;

        Mapping::set(supply_index, 0field, final_si);
        Mapping::set(borrow_index, 0field, final_bi);
        Mapping::set(last_accrual_block, 0field, final_lub);
        Mapping::set(protocol_fees, 0field, final_pf);
        Mapping::set(supply_apy, 0field, s_apy);
        Mapping::set(borrow_apy, 0field, b_apy);

        let scaled_delta: u64 = (amount * INDEX_SCALE) / final_si;
        let prev_scaled: u64 = Mapping::get_or_use(user_scaled_supply, user_hash, 0u64);
        Mapping::set(user_scaled_supply, user_hash, prev_scaled + scaled_delta);
        Mapping::set(total_deposited, 0field, td + amount);
        let prev_liq: u64 = Mapping::get_or_use(available_liquidity, 0field, 0u64);
        Mapping::set(available_liquidity, 0field, prev_liq + amount);
    }

    // ==================== 3. WITHDRAW ====================
    async transition withdraw(public amount: u64) -> (UserActivity, Future) {
        assert(amount > 0u64);
        let caller: address = self.caller;
        let user_hash: field = BHP256::hash_to_field(caller);
        let updated: UserActivity = UserActivity {
            owner: caller, asset_id: ASSET_ID,
            total_deposits: 0u64, total_withdrawals: amount, total_borrows: 0u64, total_repayments: 0u64,
        };
        let f: Future = finalize_withdraw(amount, user_hash);
        return (updated, f);
    }

    async function finalize_withdraw(amount: u64, user_hash: field) {
        let current_block: u64 = (block.height as u64);
        let lub: u64 = Mapping::get_or_use(last_accrual_block, 0field, 0u64);
        let si: u64 = Mapping::get_or_use(supply_index, 0field, INDEX_SCALE);
        let bi: u64 = Mapping::get_or_use(borrow_index, 0field, INDEX_SCALE);
        let td: u64 = Mapping::get_or_use(total_deposited, 0field, 0u64);
        let tb: u64 = Mapping::get_or_use(total_borrowed, 0field, 0u64);
        let pf: u64 = Mapping::get_or_use(protocol_fees, 0field, 0u64);

        let raw_delta: u64 = current_block > lub ? current_block - lub : 0u64;
        let effective_delta: u64 = raw_delta > MAX_ACCRUAL_DELTA ? MAX_ACCRUAL_DELTA : raw_delta;
        let should_accrue: bool = effective_delta > 0u64;
        let has_deposits: bool = td > 0u64;
        let should_update: bool = should_accrue && has_deposits;
        let safe_td: u64 = td == 0u64 ? 1u64 : td;
        let raw_util: u64 = (tb * UTIL_SCALE) / safe_td;
        let util_bps: u64 = td == 0u64 ? 0u64 : raw_util;
        let borrow_rate_annual: u64 = BASE_RATE + (SLOPE * util_bps) / UTIL_SCALE;
        let borrow_rate_pb: u64 = (borrow_rate_annual * INDEX_SCALE) / ANNUALIZER;
        let supply_rate_pb: u64 = (borrow_rate_pb * util_bps * SUPPLY_FEE_FACTOR) / SUPPLY_FEE_DENOM;
        let new_si: u64 = si + (si * supply_rate_pb * effective_delta) / INDEX_SCALE;
        let final_si: u64 = should_update ? new_si : si;
        let new_bi: u64 = bi + (bi * borrow_rate_pb * effective_delta) / INDEX_SCALE;
        let final_bi: u64 = should_update ? new_bi : bi;
        let interest_amt: u64 = (tb * borrow_rate_pb) / INDEX_SCALE;
        let fee_delta: u64 = (interest_amt * effective_delta * RESERVE_FACTOR_BPS) / UTIL_SCALE;
        let final_pf: u64 = pf + (should_update ? fee_delta : 0u64);
        let s_apy: u64 = (supply_rate_pb * APY_MULTIPLIER) / INDEX_SCALE;
        let b_apy: u64 = (borrow_rate_pb * APY_MULTIPLIER) / INDEX_SCALE;
        let final_lub: u64 = should_accrue ? lub + effective_delta : lub;

        Mapping::set(supply_index, 0field, final_si);
        Mapping::set(borrow_index, 0field, final_bi);
        Mapping::set(last_accrual_block, 0field, final_lub);
        Mapping::set(protocol_fees, 0field, final_pf);
        Mapping::set(supply_apy, 0field, s_apy);
        Mapping::set(borrow_apy, 0field, b_apy);

        let scaled_supply: u64 = Mapping::get_or_use(user_scaled_supply, user_hash, 0u64);
        let real_balance: u64 = (scaled_supply * final_si) / INDEX_SCALE;
        assert(amount <= real_balance);
        let remaining: u64 = real_balance - amount;
        let debt: u64 = Mapping::get_or_use(user_scaled_borrow, user_hash, 0u64);
        let real_debt: u64 = (debt * final_bi) / INDEX_SCALE;
        let max_debt: u64 = (remaining * LTV_BPS) / UTIL_SCALE;
        let no_debt: bool = real_debt == 0u64;
        let debt_ok: bool = real_debt <= max_debt;
        assert(no_debt || debt_ok);

        let scaled_delta: u64 = (amount * INDEX_SCALE) / final_si;
        let new_scaled: u64 = scaled_supply > scaled_delta ? scaled_supply - scaled_delta : 0u64;
        Mapping::set(user_scaled_supply, user_hash, new_scaled);
        let new_td: u64 = td > amount ? td - amount : 0u64;
        Mapping::set(total_deposited, 0field, new_td);
        let prev_liq: u64 = Mapping::get_or_use(available_liquidity, 0field, 0u64);
        let new_liq: u64 = prev_liq > amount ? prev_liq - amount : 0u64;
        Mapping::set(available_liquidity, 0field, new_liq);
    }

    // ==================== 4. BORROW ====================
    async transition borrow(public amount: u64) -> (UserActivity, Future) {
        assert(amount > 0u64);
        let caller: address = self.caller;
        let user_hash: field = BHP256::hash_to_field(caller);
        let updated: UserActivity = UserActivity {
            owner: caller, asset_id: ASSET_ID,
            total_deposits: 0u64, total_withdrawals: 0u64, total_borrows: amount, total_repayments: 0u64,
        };
        let f: Future = finalize_borrow(amount, user_hash);
        return (updated, f);
    }

    async function finalize_borrow(amount: u64, user_hash: field) {
        let current_block: u64 = (block.height as u64);
        let lub: u64 = Mapping::get_or_use(last_accrual_block, 0field, 0u64);
        let si: u64 = Mapping::get_or_use(supply_index, 0field, INDEX_SCALE);
        let bi: u64 = Mapping::get_or_use(borrow_index, 0field, INDEX_SCALE);
        let td: u64 = Mapping::get_or_use(total_deposited, 0field, 0u64);
        let tb: u64 = Mapping::get_or_use(total_borrowed, 0field, 0u64);
        let pf: u64 = Mapping::get_or_use(protocol_fees, 0field, 0u64);

        let raw_delta: u64 = current_block > lub ? current_block - lub : 0u64;
        let effective_delta: u64 = raw_delta > MAX_ACCRUAL_DELTA ? MAX_ACCRUAL_DELTA : raw_delta;
        let should_accrue: bool = effective_delta > 0u64;
        let has_deposits: bool = td > 0u64;
        let should_update: bool = should_accrue && has_deposits;
        let safe_td: u64 = td == 0u64 ? 1u64 : td;
        let raw_util: u64 = (tb * UTIL_SCALE) / safe_td;
        let util_bps: u64 = td == 0u64 ? 0u64 : raw_util;
        let borrow_rate_annual: u64 = BASE_RATE + (SLOPE * util_bps) / UTIL_SCALE;
        let borrow_rate_pb: u64 = (borrow_rate_annual * INDEX_SCALE) / ANNUALIZER;
        let supply_rate_pb: u64 = (borrow_rate_pb * util_bps * SUPPLY_FEE_FACTOR) / SUPPLY_FEE_DENOM;
        let new_si: u64 = si + (si * supply_rate_pb * effective_delta) / INDEX_SCALE;
        let final_si: u64 = should_update ? new_si : si;
        let new_bi: u64 = bi + (bi * borrow_rate_pb * effective_delta) / INDEX_SCALE;
        let final_bi: u64 = should_update ? new_bi : bi;
        let interest_amt: u64 = (tb * borrow_rate_pb) / INDEX_SCALE;
        let fee_delta: u64 = (interest_amt * effective_delta * RESERVE_FACTOR_BPS) / UTIL_SCALE;
        let final_pf: u64 = pf + (should_update ? fee_delta : 0u64);
        let s_apy: u64 = (supply_rate_pb * APY_MULTIPLIER) / INDEX_SCALE;
        let b_apy: u64 = (borrow_rate_pb * APY_MULTIPLIER) / INDEX_SCALE;
        let final_lub: u64 = should_accrue ? lub + effective_delta : lub;

        Mapping::set(supply_index, 0field, final_si);
        Mapping::set(borrow_index, 0field, final_bi);
        Mapping::set(last_accrual_block, 0field, final_lub);
        Mapping::set(protocol_fees, 0field, final_pf);
        Mapping::set(supply_apy, 0field, s_apy);
        Mapping::set(borrow_apy, 0field, b_apy);

        let scaled_supply: u64 = Mapping::get_or_use(user_scaled_supply, user_hash, 0u64);
        let real_supply: u64 = (scaled_supply * final_si) / INDEX_SCALE;
        let max_borrow: u64 = (real_supply * LTV_BPS) / UTIL_SCALE;
        let scaled_borrow: u64 = Mapping::get_or_use(user_scaled_borrow, user_hash, 0u64);
        let existing_debt: u64 = (scaled_borrow * final_bi) / INDEX_SCALE;
        assert(existing_debt + amount <= max_borrow);
        let liq: u64 = Mapping::get_or_use(available_liquidity, 0field, 0u64);
        assert(amount <= liq);

        let borrow_scaled_delta: u64 = (amount * INDEX_SCALE) / final_bi;
        Mapping::set(user_scaled_borrow, user_hash, scaled_borrow + borrow_scaled_delta);
        Mapping::set(total_borrowed, 0field, tb + amount);
        let new_liq: u64 = liq > amount ? liq - amount : 0u64;
        Mapping::set(available_liquidity, 0field, new_liq);
    }

    // ==================== 5. REPAY ====================
    async transition repay(
        token: test_usdcx_stablecoin.aleo/Token,
        public amount: u64,
        proofs: [test_usdcx_stablecoin.aleo/MerkleProof; 2]
    ) -> (test_usdcx_stablecoin.aleo/ComplianceRecord, UserActivity, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) {
        let caller: address = self.caller;
        assert(amount > 0u64);
        assert(caller == token.owner);
        let amount_u128: u128 = (amount as u128);
        assert(token.amount >= amount_u128);
        let user_hash: field = BHP256::hash_to_field(caller);

        let (compliance_out, change_token, pool_token, token_future): (
            test_usdcx_stablecoin.aleo/ComplianceRecord,
            test_usdcx_stablecoin.aleo/Token,
            test_usdcx_stablecoin.aleo/Token,
            Future
        ) = test_usdcx_stablecoin.aleo/transfer_private(POOL_VAULT_ADDRESS, amount_u128, token, proofs);

        let updated: UserActivity = UserActivity {
            owner: caller, asset_id: ASSET_ID,
            total_deposits: 0u64, total_withdrawals: 0u64, total_borrows: 0u64, total_repayments: amount,
        };
        let f: Future = finalize_repay(token_future, amount, user_hash);
        return (compliance_out, updated, change_token, pool_token, f);
    }

    async function finalize_repay(token_future: Future, amount: u64, user_hash: field) {
        token_future.await();

        let current_block: u64 = (block.height as u64);
        let lub: u64 = Mapping::get_or_use(last_accrual_block, 0field, 0u64);
        let si: u64 = Mapping::get_or_use(supply_index, 0field, INDEX_SCALE);
        let bi: u64 = Mapping::get_or_use(borrow_index, 0field, INDEX_SCALE);
        let td: u64 = Mapping::get_or_use(total_deposited, 0field, 0u64);
        let tb: u64 = Mapping::get_or_use(total_borrowed, 0field, 0u64);
        let pf: u64 = Mapping::get_or_use(protocol_fees, 0field, 0u64);

        let raw_delta: u64 = current_block > lub ? current_block - lub : 0u64;
        let effective_delta: u64 = raw_delta > MAX_ACCRUAL_DELTA ? MAX_ACCRUAL_DELTA : raw_delta;
        let should_accrue: bool = effective_delta > 0u64;
        let has_deposits: bool = td > 0u64;
        let should_update: bool = should_accrue && has_deposits;
        let safe_td: u64 = td == 0u64 ? 1u64 : td;
        let raw_util: u64 = (tb * UTIL_SCALE) / safe_td;
        let util_bps: u64 = td == 0u64 ? 0u64 : raw_util;
        let borrow_rate_annual: u64 = BASE_RATE + (SLOPE * util_bps) / UTIL_SCALE;
        let borrow_rate_pb: u64 = (borrow_rate_annual * INDEX_SCALE) / ANNUALIZER;
        let supply_rate_pb: u64 = (borrow_rate_pb * util_bps * SUPPLY_FEE_FACTOR) / SUPPLY_FEE_DENOM;
        let new_si: u64 = si + (si * supply_rate_pb * effective_delta) / INDEX_SCALE;
        let final_si: u64 = should_update ? new_si : si;
        let new_bi: u64 = bi + (bi * borrow_rate_pb * effective_delta) / INDEX_SCALE;
        let final_bi: u64 = should_update ? new_bi : bi;
        let interest_amt: u64 = (tb * borrow_rate_pb) / INDEX_SCALE;
        let fee_delta: u64 = (interest_amt * effective_delta * RESERVE_FACTOR_BPS) / UTIL_SCALE;
        let final_pf: u64 = pf + (should_update ? fee_delta : 0u64);
        let s_apy: u64 = (supply_rate_pb * APY_MULTIPLIER) / INDEX_SCALE;
        let b_apy: u64 = (borrow_rate_pb * APY_MULTIPLIER) / INDEX_SCALE;
        let final_lub: u64 = should_accrue ? lub + effective_delta : lub;

        Mapping::set(supply_index, 0field, final_si);
        Mapping::set(borrow_index, 0field, final_bi);
        Mapping::set(last_accrual_block, 0field, final_lub);
        Mapping::set(protocol_fees, 0field, final_pf);
        Mapping::set(supply_apy, 0field, s_apy);
        Mapping::set(borrow_apy, 0field, b_apy);

        let scaled_borrow: u64 = Mapping::get_or_use(user_scaled_borrow, user_hash, 0u64);
        let real_debt: u64 = (scaled_borrow * final_bi) / INDEX_SCALE;
        assert(amount <= real_debt);
        let repay_scaled_delta: u64 = (amount * INDEX_SCALE) / final_bi;
        let new_scaled_borrow: u64 = scaled_borrow > repay_scaled_delta ? scaled_borrow - repay_scaled_delta : 0u64;
        Mapping::set(user_scaled_borrow, user_hash, new_scaled_borrow);
        let new_tb: u64 = tb > amount ? tb - amount : 0u64;
        Mapping::set(total_borrowed, 0field, new_tb);
        let prev_liq: u64 = Mapping::get_or_use(available_liquidity, 0field, 0u64);
        Mapping::set(available_liquidity, 0field, prev_liq + amount);
    }

    // ==================== 6. ACCRUE INTEREST ====================
    async transition accrue_interest() -> Future {
        let f: Future = finalize_accrue();
        return f;
    }

    async function finalize_accrue() {
        let current_block: u64 = (block.height as u64);
        let lub: u64 = Mapping::get_or_use(last_accrual_block, 0field, 0u64);
        let si: u64 = Mapping::get_or_use(supply_index, 0field, INDEX_SCALE);
        let bi: u64 = Mapping::get_or_use(borrow_index, 0field, INDEX_SCALE);
        let td: u64 = Mapping::get_or_use(total_deposited, 0field, 0u64);
        let tb: u64 = Mapping::get_or_use(total_borrowed, 0field, 0u64);
        let pf: u64 = Mapping::get_or_use(protocol_fees, 0field, 0u64);

        let raw_delta: u64 = current_block > lub ? current_block - lub : 0u64;
        let effective_delta: u64 = raw_delta > MAX_ACCRUAL_DELTA ? MAX_ACCRUAL_DELTA : raw_delta;
        let should_accrue: bool = effective_delta > 0u64;
        let has_deposits: bool = td > 0u64;
        let should_update: bool = should_accrue && has_deposits;
        let safe_td: u64 = td == 0u64 ? 1u64 : td;
        let raw_util: u64 = (tb * UTIL_SCALE) / safe_td;
        let util_bps: u64 = td == 0u64 ? 0u64 : raw_util;
        let borrow_rate_annual: u64 = BASE_RATE + (SLOPE * util_bps) / UTIL_SCALE;
        let borrow_rate_pb: u64 = (borrow_rate_annual * INDEX_SCALE) / ANNUALIZER;
        let supply_rate_pb: u64 = (borrow_rate_pb * util_bps * SUPPLY_FEE_FACTOR) / SUPPLY_FEE_DENOM;
        let new_si: u64 = si + (si * supply_rate_pb * effective_delta) / INDEX_SCALE;
        let final_si: u64 = should_update ? new_si : si;
        let new_bi: u64 = bi + (bi * borrow_rate_pb * effective_delta) / INDEX_SCALE;
        let final_bi: u64 = should_update ? new_bi : bi;
        let interest_amt: u64 = (tb * borrow_rate_pb) / INDEX_SCALE;
        let fee_delta: u64 = (interest_amt * effective_delta * RESERVE_FACTOR_BPS) / UTIL_SCALE;
        let final_pf: u64 = pf + (should_update ? fee_delta : 0u64);
        let s_apy: u64 = (supply_rate_pb * APY_MULTIPLIER) / INDEX_SCALE;
        let b_apy: u64 = (borrow_rate_pb * APY_MULTIPLIER) / INDEX_SCALE;
        let final_lub: u64 = should_accrue ? lub + effective_delta : lub;

        Mapping::set(supply_index, 0field, final_si);
        Mapping::set(borrow_index, 0field, final_bi);
        Mapping::set(last_accrual_block, 0field, final_lub);
        Mapping::set(protocol_fees, 0field, final_pf);
        Mapping::set(supply_apy, 0field, s_apy);
        Mapping::set(borrow_apy, 0field, b_apy);
    }

    // ==================== 7. WITHDRAW FEES ====================
    async transition withdraw_fees(public amount: u64) -> Future {
        assert(amount > 0u64);
        let f: Future = finalize_withdraw_fees(amount, self.caller);
        return f;
    }

    async function finalize_withdraw_fees(amount: u64, caller: address) {
        assert(caller == ADMIN_ADDRESS);
        let pf: u64 = Mapping::get_or_use(protocol_fees, 0field, 0u64);
        assert(amount <= pf);
        Mapping::set(protocol_fees, 0field, pf - amount);
    }
}
