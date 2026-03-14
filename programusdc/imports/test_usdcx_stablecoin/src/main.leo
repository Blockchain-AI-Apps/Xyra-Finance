program test_usdcx_stablecoin.aleo {
    // Record for the token
    record Token {
        owner: address,
        amount: u128
    }

    // Record for compliance/audit
    record ComplianceRecord {
        owner: address,
        compliance_hash: field
    }

    // Struct for Merkle Path
    struct MerkleProof {
        siblings: [field; 16],
        leaf_index: u32
    }

    // Leo 3.x: fn + Final return + final { } block
    fn transfer_private(
        public recipient: address,
        public amount: u128,
        input_record: Token,
        proofs: [MerkleProof; 2]
    ) -> (ComplianceRecord, Token, Token, Final) {
        return (
            ComplianceRecord { owner: recipient, compliance_hash: 0field },
            Token { owner: recipient, amount: amount },
            Token { owner: self.caller, amount: 0u128 },
            final { finalize_transfer_private(); }
        );
    }
}

final fn finalize_transfer_private() {}
