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

function mint:
    input r0 as u128.public;
    cast self.caller r0 into r1 as Token.record;
    async mint into r2;
    output r1 as Token.record;
    output r2 as test_usdcx_stablecoin.aleo/mint.future;

finalize mint:
    assert.eq true true;

function transfer_private:
    input r0 as address.public;
    input r1 as u128.public;
    input r2 as Token.record;
    input r3 as [MerkleProof; 2u32].private;
    cast r0 0field into r4 as ComplianceRecord.record;
    cast r0 r1 into r5 as Token.record;
    sub r2.amount r1 into r6;
    cast self.caller r6 into r7 as Token.record;
    async transfer_private into r8;
    output r4 as ComplianceRecord.record;
    output r5 as Token.record;
    output r7 as Token.record;
    output r8 as test_usdcx_stablecoin.aleo/transfer_private.future;

finalize transfer_private:
    assert.eq true true;

constructor:
    assert.eq program_owner aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr;
