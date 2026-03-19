program test_usdcx_stablecoin.aleo {
    // Record for the token
    record Token {
        owner: address,
        amount: u128
    }

    // Record for compliance/audit — matches real deployed test_usdcx_stablecoin.aleo
    record ComplianceRecord {
        owner: address,
        amount: u128,
        sender: address,
        recipient: address,
    }
    
    // Struct for Merkle Path (Mocking the standard MerkleProof if needed, or just relying on built-in if it's a native type, but usually it's a struct in imports)
    // The main.leo expects `[test_usdcx_stablecoin.aleo/MerkleProof; 2]`. 
    // We need to define MerkleProof here.
    struct MerkleProof {
        siblings: [field; 16],
        leaf_index: u32
    }

    // Signature matches real deployed test_usdcx_stablecoin.aleo.
    // Real program: recipient and amount are private; proofs are verified on-chain.
    // Stub: accepts proofs but ignores them (for local leo run only).
    async transition transfer_private(
        recipient: address,
        amount: u128,
        input_record: Token,
        proofs: [MerkleProof; 2]
    ) -> (ComplianceRecord, Token, Token, Future) {
        let f: Future = finalize_transfer_private(recipient, amount);
        // Output order matches real program:
        //   1. ComplianceRecord (owner = compliance officer, not used by caller)
        //   2. Token for sender (change: input_record.amount - amount)
        //   3. Token for recipient (the transferred amount)
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
        // Stub: no on-chain state (real program checks freeze list root)
    }
}