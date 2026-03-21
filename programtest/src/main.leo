// Test v2: State-only deposit (no token transfer, no MerkleProof)
// This tests if Shield wallet can connect and execute when there's no MerkleProof

import test_usdcx_stablecoin.aleo;

program test_transfer_usdcx_v2.aleo {

    record UserActivity {
        owner: address,
        asset_id: field,
        total_deposits: u64,
        total_withdrawals: u64,
        total_borrows: u64,
        total_repayments: u64,
    }

    mapping total_deposited: field => u64;

    @admin(address = "aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr")
    async constructor() {}

    // State-only deposit — no token, no MerkleProof
    async transition deposit(public amount: u64) -> (UserActivity, Future) {
        assert(amount > 0u64);
        let caller: address = self.caller;
        let user_hash: field = BHP256::hash_to_field(caller);

        let receipt: UserActivity = UserActivity {
            owner:             caller,
            asset_id:          1field,
            total_deposits:    amount,
            total_withdrawals: 0u64,
            total_borrows:     0u64,
            total_repayments:  0u64,
        };

        let f: Future = finalize_deposit(amount, user_hash);
        return (receipt, f);
    }

    async function finalize_deposit(amount: u64, user_hash: field) {
        let prev: u64 = Mapping::get_or_use(total_deposited, 0field, 0u64);
        Mapping::set(total_deposited, 0field, prev + amount);
    }
}
