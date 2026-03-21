program test_usdcx_stablecoin.aleo {
    record Token {
        owner: address,
        amount: u128
    }

    record ComplianceRecord {
        owner: address,
        amount: u128,
        sender: address,
        recipient: address,
    }

    struct MerkleProof {
        siblings: [field; 16],
        leaf_index: u32
    }

    // transfer_private_to_public: user's private token → vault's public balance
    // Real program checks freeze list, merkle proofs, pause status
    async transition transfer_private_to_public(
        public recipient: address,
        public amount: u128,
        input_record: Token,
        proofs: [MerkleProof; 2]
    ) -> (ComplianceRecord, Token, Future) {
        let f: Future = finalize_transfer_private_to_public(recipient, amount);
        return (
            ComplianceRecord {
                owner: aleo1mnldqsfrwayzfep3t9zusu4y7yknsdhfwx76v5pajla35mrqn5xsvvurhy,
                amount: amount,
                sender: input_record.owner,
                recipient: recipient,
            },
            Token { owner: input_record.owner, amount: input_record.amount - amount },
            f
        );
    }

    async function finalize_transfer_private_to_public(recipient: address, amount: u128) {
        // Stub: real program adds to balances[recipient] and checks freeze list
    }

    // transfer_private: fully private transfer (kept for reference)
    async transition transfer_private(
        recipient: address,
        amount: u128,
        input_record: Token,
        proofs: [MerkleProof; 2]
    ) -> (ComplianceRecord, Token, Token, Future) {
        let f: Future = finalize_transfer_private(recipient, amount);
        return (
            ComplianceRecord {
                owner: aleo1mnldqsfrwayzfep3t9zusu4y7yknsdhfwx76v5pajla35mrqn5xsvvurhy,
                amount: amount,
                sender: input_record.owner,
                recipient: recipient,
            },
            Token { owner: input_record.owner, amount: input_record.amount - amount },
            Token { owner: recipient, amount: amount },
            f
        );
    }

    async function finalize_transfer_private(recipient: address, amount: u128) {
        // Stub: real program checks freeze list root
    }
}
