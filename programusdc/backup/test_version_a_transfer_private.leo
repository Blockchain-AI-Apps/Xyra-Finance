// TEST VERSION A: Uses transfer_private (fully private transfer)
// Minimal deposit-only program to test MerkleProof AVM output.

import test_usdcx_stablecoin.aleo;

program lending_pool_usdcx_v1.aleo {
    // ---- Local MerkleProof struct (Shield wallet fix: produces unqualified AVM type) ----
    struct MerkleProof {
        siblings: [field; 16],
        leaf_index: u32,
    }

    // ---- Constants ----
    const INDEX_SCALE: u64 = 1_000_000_000_000u64;
    const POOL_VAULT_ADDRESS: address = aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr;

    // ---- Mappings ----
    mapping total_deposited: field => u64;
    mapping supply_index: field => u64;
    mapping user_scaled_supply: field => u64;

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

    // ---- DEPOSIT using transfer_private ----
    // transfer_private signature (from AVM):
    //   input r0: address.private (recipient)
    //   input r1: u128.private (amount)
    //   input r2: Token.record
    //   input r3: [MerkleProof; 2].private
    //   output: ComplianceRecord, Token (change), Token (to recipient), Future
    async transition deposit(
        token: test_usdcx_stablecoin.aleo/Token,
        public amount: u64,
        proofs: [MerkleProof; 2]
    ) -> (test_usdcx_stablecoin.aleo/ComplianceRecord, UserActivity, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) {
        let caller: address = self.caller;
        assert(amount > 0u64);
        assert(caller == token.owner);

        let amount_u128: u128 = (amount as u128);
        assert(token.amount >= amount_u128);

        let user_hash: field = BHP256::hash_to_field(caller);

        // Call transfer_private: recipient=VAULT, amount, token, proofs
        let (compliance_out, to_user, to_pool, token_future): (
            test_usdcx_stablecoin.aleo/ComplianceRecord,
            test_usdcx_stablecoin.aleo/Token,
            test_usdcx_stablecoin.aleo/Token,
            Future
        ) = test_usdcx_stablecoin.aleo/transfer_private(POOL_VAULT_ADDRESS, amount_u128, token, proofs);

        let updated: UserActivity = UserActivity {
            owner: caller,
            asset_id: 1field,
            total_deposits: amount,
            total_withdrawals: 0u64,
            total_borrows: 0u64,
            total_repayments: 0u64,
        };

        let f: Future = finalize_deposit(amount, user_hash, token_future);
        return (compliance_out, updated, to_user, to_pool, f);
    }

    async function finalize_deposit(amount: u64, user_hash: field, token_future: Future) {
        token_future.await();

        let si: u64 = Mapping::get_or_use(supply_index, 0field, INDEX_SCALE);
        let scaled_delta: u64 = (amount * INDEX_SCALE) / si;
        let prev_scaled: u64 = Mapping::get_or_use(user_scaled_supply, user_hash, 0u64);
        Mapping::set(user_scaled_supply, user_hash, prev_scaled + scaled_delta);

        let prev_deposited: u64 = Mapping::get_or_use(total_deposited, 0field, 0u64);
        Mapping::set(total_deposited, 0field, prev_deposited + amount);
    }
}
