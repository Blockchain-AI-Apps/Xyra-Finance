program test_usdcx_stablecoin.aleo;

record Token:
    owner as address.private;
    amount as u128.private;

record ComplianceRecord:
    owner as address.private;
    compliance_hash as field.private;

struct MerkleProof:
    siblings as [field; 16u32];
    leaf_index as u32;

function transfer_private:
    input r0 as address.public;
    input r1 as u128.public;
    input r2 as Token.record;
    input r3 as [MerkleProof; 2u32].private;
    cast r0 0field into r4 as ComplianceRecord.record;
    cast r0 r1 into r5 as Token.record;
    cast self.caller 0u128 into r6 as Token.record;
    async transfer_private into r7;
    output r4 as ComplianceRecord.record;
    output r5 as Token.record;
    output r6 as Token.record;
    output r7 as test_usdcx_stablecoin.aleo/transfer_private.future;

finalize transfer_private:
    assert.eq true true;
