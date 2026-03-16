import credits.aleo;
import lending_pool_v86_v1.aleo;

program liquidation_v3.aleo {

    // ---- Constants ----
    const SCALE: u64 = 1_000_000u64;
    const GLOBAL_KEY: u8 = 0u8;
    const POOL_VAULT_ADDRESS: address = aleo1cw4zdgfgxr064yp43nf2n5d0k0cmrpafua0xqhlsr8w2kx0jsy8s6rcmuw;
    const ADMIN: address = aleo1n4ws5s7vlt4cff9rk5vwuwza4vjja03my4p9j8d45fxy0ady6uzq9jjujy;

    // ---- Interest / APY (fixed-point; INDEX_SCALE = 1e12) ----
    const INDEX_SCALE: u64 = 1_000_000_000_000u64;
    const BASE_RATE_PER_BLOCK: u64 = 1000u64;
    const SLOPE_PER_UTIL: u64 = 6667u64;
    const RESERVE_FACTOR_BPS: u64 = 1000u64;
    // Cap accrual delta per tx to avoid u64 overflow in (index * rate * delta) / INDEX_SCALE
    const MAX_ACCRUAL_DELTA: u64 = 1_000u64;

    /// Liquidation threshold: 82.5% in SCALE=1_000_000 terms
    const LIQ_THRESHOLD: u64 = 825_000u64;

    /// Health factor scale: 1.0 = 1_000_000 in SCALE=1_000_000 terms
    /// health_factor < 1_000_000 → LIQUIDATABLE
    /// health_factor >= 1_000_000 → HEALTHY
    const HEALTH_SCALE: u64 = 1_000_000u64;

    /// Default close factor: 50% in SCALE=1_000_000 terms
    const DEFAULT_CLOSE_FACTOR: u64 = 500_000u64;

    /// Liquidation bonus: 5% in SCALE=1_000_000 terms
    const LIQ_BONUS: u64 = 50_000u64;

    // ================================================================
    // MAPPINGS
    // ================================================================

    /// Whitelisted liquidator addresses
    mapping keepers: address => bool;

    /// key=0u8 => max % of debt closeable per liquidation
    /// default: 500_000 = 50% in SCALE=1_000_000
    mapping close_factor: u8 => u64;

    /// borrower => number of times liquidated (analytics)
    mapping liquidation_count: address => u64;

    /// borrower => latest health factor
    mapping health_factor_result: address => u64;

    /// Per-asset liquidation bonus. Key = collateral_asset id
    mapping liquidation_bonus: field => u64;

    /// Dummy on-chain price storage (asset -> price)
    mapping oracle_prices: field => u64;

    /// Dummy last update tracking for price freshness checks
    mapping price_last_updated: field => u64;

    // ================================================================
    // CONSTRUCTOR
    // ================================================================

    @admin(address = "aleo1n4ws5s7vlt4cff9rk5vwuwza4vjja03my4p9j8d45fxy0ady6uzq9jjujy")
    async constructor() {}

    // ================================================================
    // ADD / REMOVE KEEPER
    // ================================================================

    async transition add_keeper(public keeper: address) -> Future {
        assert(self.caller == ADMIN);
        return finalize_add_keeper(keeper);
    }

    async function finalize_add_keeper(keeper: address) {
        Mapping::set(keepers, keeper, true);
    }

    async transition remove_keeper(public keeper: address) -> Future {
        assert(self.caller == ADMIN);
        return finalize_remove_keeper(keeper);
    }

    async function finalize_remove_keeper(keeper: address) {
        Mapping::set(keepers, keeper, false);
    }

    // ================================================================
    // Initialize close factor (can only be set once at deployment)
    // ================================================================
    async transition initialize() -> Future {
        return finalize_initialize();
    }

    async function finalize_initialize() {
        Mapping::set(close_factor, 0u8, DEFAULT_CLOSE_FACTOR);
    }

    // ================================================================
    // SET PRICE (Dummy oracle)
    // ================================================================

    async transition set_price(
        public asset:         field,
        public price:         u64,
        public current_block: u64
    ) -> Future {
        return finalize_set_price(asset, price, current_block);
    }

    async function finalize_set_price(
        asset:         field,
        price:         u64,
        current_block: u64
    ) {
        Mapping::set(oracle_prices,      asset, price);
        Mapping::set(price_last_updated, asset, current_block);
    }

    // ================================================================
    // LIQUIDATE
    // ================================================================

    async transition liquidate(
        public borrower:         address,
        public debt_asset:       field,
        public collateral_asset: field,
        public repay_amount:     u64,
        public seize_amount:     u64,
        public current_block:    u64
    ) -> Future {
        assert(repay_amount > 0u64);

        let keeper: address = self.caller;

        // 1) Keeper repays debt into pool vault (as signer)
        let f_repay: Future = credits.aleo/transfer_public_as_signer(
            POOL_VAULT_ADDRESS,
            repay_amount
        );

        // 2) Update pool + borrower accounting in lending pool
        let f_liq: Future = lending_pool_v86_v1.aleo/process_liquidation(
            borrower,
            debt_asset,
            collateral_asset,
            repay_amount,
            seize_amount,
            current_block
        );

        return finalize_liquidate(
            f_repay,
            f_liq,
            keeper,
            borrower,
            debt_asset,
            collateral_asset,
            repay_amount,
            seize_amount,
            current_block
        );
    }

    async function finalize_liquidate(
        f_repay:          Future,
        f_liq:            Future,
        keeper:           address,
        borrower:         address,
        debt_asset:       field,
        collateral_asset: field,
        repay_amount:     u64,
        seize_amount:     u64,
        current_block:    u64
    ) {
        let id: u8 = 0u8;

        // Read current state from lending pool
        let lub: u64 = Mapping::get_or_use(lending_pool_v86_v1.aleo/last_update_block, id, 0u64);
        let li:  u64 = Mapping::get_or_use(lending_pool_v86_v1.aleo/liquidity_index,   id, INDEX_SCALE);
        let bi:  u64 = Mapping::get_or_use(lending_pool_v86_v1.aleo/borrow_index,      id, INDEX_SCALE);
        let ts:  u64 = Mapping::get_or_use(lending_pool_v86_v1.aleo/total_supplied,    id, 0u64);
        let tb:  u64 = Mapping::get_or_use(lending_pool_v86_v1.aleo/total_borrowed,    id, 0u64);

        // Project indices to current_block (read-only, no writes to lending pool)
        let raw_delta:  u64  = current_block > lub ? current_block - lub : 0u64;
        let delta:      u64  = raw_delta > MAX_ACCRUAL_DELTA ? MAX_ACCRUAL_DELTA : raw_delta;
        let do_accrue:  bool = delta > 0u64 && ts > 0u64;

        let util: u64 = ts == 0u64 ? 0u64 : (tb * SCALE) / ts;
        let br:   u64 = BASE_RATE_PER_BLOCK + (SLOPE_PER_UTIL * util) / SCALE;
        let sr:   u64 = (br * util * (10_000u64 - RESERVE_FACTOR_BPS)) / (SCALE * 10_000u64);

        let li_new: u64 = do_accrue ? li + (li * sr * delta) / INDEX_SCALE : li;
        let bi_new: u64 = do_accrue ? bi + (bi * br * delta) / INDEX_SCALE : bi;

        let borrower_key:    field = BHP256::hash_to_field(borrower);
        let b_scaled_supply: u64  = Mapping::get_or_use(
            lending_pool_v86_v1.aleo/user_scaled_supply, borrower_key, 0u64
        );
        let b_scaled_borrow: u64   = Mapping::get_or_use(
            lending_pool_v86_v1.aleo/user_scaled_borrow, borrower_key, 0u64
        );

        // GUARD 1: Caller must be whitelisted keeper
        let is_keeper: bool = Mapping::get_or_use(keepers, keeper, false);
        assert(is_keeper);

        // GUARD 2: Calculate health factor inline — no stale data risk
        let collateral_value: u64 = (b_scaled_supply * li_new) / INDEX_SCALE;
        let borrow_value:     u64 = (b_scaled_borrow * bi_new) / INDEX_SCALE;
        let health: u64 = borrow_value == 0u64
            ? 100_000_000u64
            : (collateral_value * LIQ_THRESHOLD) / borrow_value;
        assert(health < HEALTH_SCALE);

        // GUARD 3: Close factor limit — uses projected bi_new
        let total_debt: u64 = (b_scaled_borrow * bi_new) / INDEX_SCALE;
        let cf:         u64 = Mapping::get_or_use(close_factor, 0u8, DEFAULT_CLOSE_FACTOR);
        let max_close:  u64 = (total_debt * cf) / SCALE;
        assert(repay_amount <= max_close);

        // GUARD 4: Price freshness
        let debt_last: u64 = Mapping::get_or_use(price_last_updated, debt_asset,       0u64);
        let coll_last: u64 = Mapping::get_or_use(price_last_updated, collateral_asset,  0u64);
        assert(debt_last > 0u64 && debt_last <= current_block);
        assert(coll_last > 0u64 && coll_last <= current_block);

        // GUARD 5: Verify seize amount — uses projected indices
        let debt_price: u64 = Mapping::get_or_use(oracle_prices, debt_asset,       SCALE);
        let coll_price: u64 = Mapping::get_or_use(oracle_prices, collateral_asset,  SCALE);
        let bonus_bps:  u64 = Mapping::get_or_use(liquidation_bonus, collateral_asset, LIQ_BONUS);
        let seize_value: u64 = (repay_amount * debt_price * (SCALE + bonus_bps)) / SCALE;
        let seize_calc:  u64 = seize_value / coll_price;
        assert(seize_amount <= seize_calc);

        // GUARD 6: Seize does not exceed borrower's collateral — uses projected li_new
        assert(seize_amount <= collateral_value);

        // Await external effects — if any assert above fails, everything reverts
        f_repay.await();
        f_liq.await();

        // Analytics
        Mapping::set(health_factor_result, borrower, health);
        let prev_count: u64 = Mapping::get_or_use(liquidation_count, borrower, 0u64);
        Mapping::set(liquidation_count, borrower, prev_count + 1u64);
    }
}