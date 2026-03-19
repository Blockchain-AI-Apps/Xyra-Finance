program test_usdcx_stablecoin.aleo;

record Token:
    owner as address.private;
    amount as u128.private;

record ComplianceRecord:
    owner as address.private;
    amount as u128.private;
    sender as address.private;
    recipient as address.private;

struct MerkleProof:
    siblings as [field; 16u32];
    leaf_index as u32;

function transfer_private:
    input r0 as address.private;
    input r1 as u128.private;
    input r2 as Token.record;
    input r3 as [MerkleProof; 2u32].private;
    async transfer_private r0 r1 into r4;
    cast aleo1mnldqsfrwayzfep3t9zusu4y7yknsdhfwx76v5pajla35mrqn5xsvvurhy r1 r2.owner r0 into r5 as ComplianceRecord.record;
    sub r2.amount r1 into r6;
    cast r2.owner r6 into r7 as Token.record;
    cast r0 r1 into r8 as Token.record;
    output r5 as ComplianceRecord.record;
    output r7 as Token.record;
    output r8 as Token.record;
    output r4 as test_usdcx_stablecoin.aleo/transfer_private.future;

finalize transfer_private:
    input r0 as address.public;
    input r1 as u128.public;
    assert.eq true true;
