import merkle_tree.aleo;
import test_usdcx_multisig_core.aleo;
import test_usdcx_freezelist.aleo;
import test_usdcx_stablecoin.aleo;
program lending_pool_usdcx_v4.aleo;

record UserActivity:
    owner as address.private;
    asset_id as field.private;
    total_deposits as u64.private;
    total_withdrawals as u64.private;
    total_borrows as u64.private;
    total_repayments as u64.private;

mapping total_deposited:
    key as field.public;
    value as u64.public;

mapping total_borrowed:
    key as field.public;
    value as u64.public;

mapping available_liquidity:
    key as field.public;
    value as u64.public;

mapping supply_index:
    key as field.public;
    value as u64.public;

mapping borrow_index:
    key as field.public;
    value as u64.public;

mapping last_accrual_block:
    key as field.public;
    value as u64.public;

mapping protocol_fees:
    key as field.public;
    value as u64.public;

mapping supply_apy:
    key as field.public;
    value as u64.public;

mapping borrow_apy:
    key as field.public;
    value as u64.public;

mapping initialized:
    key as field.public;
    value as boolean.public;

mapping user_scaled_supply:
    key as field.public;
    value as u64.public;

mapping user_scaled_borrow:
    key as field.public;
    value as u64.public;

function initialize:
    is.eq self.caller aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr into r0;
    assert.eq r0 true;
    async initialize into r1;
    output r1 as lending_pool_usdcx_v4.aleo/initialize.future;

finalize initialize:
    get.or_use initialized[0field] false into r0;
    not r0 into r1;
    assert.eq r1 true;
    set 1000000000000u64 into supply_index[0field];
    set 1000000000000u64 into borrow_index[0field];
    set 0u64 into last_accrual_block[0field];
    set 0u64 into total_deposited[0field];
    set 0u64 into total_borrowed[0field];
    set 0u64 into available_liquidity[0field];
    set 0u64 into protocol_fees[0field];
    set 200u64 into supply_apy[0field];
    set 200u64 into borrow_apy[0field];
    set true into initialized[0field];

function deposit:
    input r0 as test_usdcx_stablecoin.aleo/Token.record;
    input r1 as u64.public;
    input r2 as [test_usdcx_stablecoin.aleo/MerkleProof; 2u32].private;
    gt r1 0u64 into r3;
    assert.eq r3 true;
    is.eq self.caller r0.owner into r4;
    assert.eq r4 true;
    cast r1 into r5 as u128;
    gte r0.amount r5 into r6;
    assert.eq r6 true;
    hash.bhp256 self.caller into r7 as field;
    call test_usdcx_stablecoin.aleo/transfer_private aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr r5 r0 r2 into r8 r9 r10 r11;
    cast self.caller 1field r1 0u64 0u64 0u64 into r12 as UserActivity.record;
    async deposit r11 r1 r7 into r13;
    output r8 as test_usdcx_stablecoin.aleo/ComplianceRecord.record;
    output r12 as UserActivity.record;
    output r9 as test_usdcx_stablecoin.aleo/Token.record;
    output r10 as test_usdcx_stablecoin.aleo/Token.record;
    output r13 as lending_pool_usdcx_v4.aleo/deposit.future;

finalize deposit:
    input r0 as test_usdcx_stablecoin.aleo/transfer_private.future;
    input r1 as u64.public;
    input r2 as field.public;
    await r0;
    cast block.height into r3 as u64;
    get.or_use last_accrual_block[0field] 0u64 into r4;
    get.or_use supply_index[0field] 1000000000000u64 into r5;
    get.or_use borrow_index[0field] 1000000000000u64 into r6;
    get.or_use total_deposited[0field] 0u64 into r7;
    get.or_use total_borrowed[0field] 0u64 into r8;
    get.or_use protocol_fees[0field] 0u64 into r9;
    gt r3 r4 into r10;
    sub r3 r4 into r11;
    ternary r10 r11 0u64 into r12;
    gt r12 1000u64 into r13;
    ternary r13 1000u64 r12 into r14;
    gt r14 0u64 into r15;
    gt r7 0u64 into r16;
    and r15 r16 into r17;
    is.eq r7 0u64 into r18;
    ternary r18 1u64 r7 into r19;
    mul r8 10000u64 into r20;
    div r20 r19 into r21;
    ternary r18 0u64 r21 into r22;
    mul 400u64 r22 into r23;
    div r23 10000u64 into r24;
    add 200u64 r24 into r25;
    mul r25 1000000000000u64 into r26;
    div r26 21024000000u64 into r27;
    mul r27 r22 into r28;
    mul r28 9000u64 into r29;
    div r29 100000000u64 into r30;
    mul r5 r30 into r31;
    mul r31 r14 into r32;
    div r32 1000000000000u64 into r33;
    add r5 r33 into r34;
    ternary r17 r34 r5 into r35;
    mul r6 r27 into r36;
    mul r36 r14 into r37;
    div r37 1000000000000u64 into r38;
    add r6 r38 into r39;
    ternary r17 r39 r6 into r40;
    mul r8 r27 into r41;
    div r41 1000000000000u64 into r42;
    mul r42 r14 into r43;
    mul r43 1000u64 into r44;
    div r44 10000u64 into r45;
    ternary r17 r45 0u64 into r46;
    add r9 r46 into r47;
    mul r30 21024000000u64 into r48;
    div r48 1000000000000u64 into r49;
    mul r27 21024000000u64 into r50;
    div r50 1000000000000u64 into r51;
    add r4 r14 into r52;
    ternary r15 r52 r4 into r53;
    set r35 into supply_index[0field];
    set r40 into borrow_index[0field];
    set r53 into last_accrual_block[0field];
    set r47 into protocol_fees[0field];
    set r49 into supply_apy[0field];
    set r51 into borrow_apy[0field];
    mul r1 1000000000000u64 into r54;
    div r54 r35 into r55;
    get.or_use user_scaled_supply[r2] 0u64 into r56;
    add r56 r55 into r57;
    set r57 into user_scaled_supply[r2];
    add r7 r1 into r58;
    set r58 into total_deposited[0field];
    get.or_use available_liquidity[0field] 0u64 into r59;
    add r59 r1 into r60;
    set r60 into available_liquidity[0field];

function withdraw:
    input r0 as u64.public;
    gt r0 0u64 into r1;
    assert.eq r1 true;
    hash.bhp256 self.caller into r2 as field;
    cast self.caller 1field 0u64 r0 0u64 0u64 into r3 as UserActivity.record;
    async withdraw r0 r2 into r4;
    output r3 as UserActivity.record;
    output r4 as lending_pool_usdcx_v4.aleo/withdraw.future;

finalize withdraw:
    input r0 as u64.public;
    input r1 as field.public;
    cast block.height into r2 as u64;
    get.or_use last_accrual_block[0field] 0u64 into r3;
    get.or_use supply_index[0field] 1000000000000u64 into r4;
    get.or_use borrow_index[0field] 1000000000000u64 into r5;
    get.or_use total_deposited[0field] 0u64 into r6;
    get.or_use total_borrowed[0field] 0u64 into r7;
    get.or_use protocol_fees[0field] 0u64 into r8;
    gt r2 r3 into r9;
    sub r2 r3 into r10;
    ternary r9 r10 0u64 into r11;
    gt r11 1000u64 into r12;
    ternary r12 1000u64 r11 into r13;
    gt r13 0u64 into r14;
    gt r6 0u64 into r15;
    and r14 r15 into r16;
    is.eq r6 0u64 into r17;
    ternary r17 1u64 r6 into r18;
    mul r7 10000u64 into r19;
    div r19 r18 into r20;
    ternary r17 0u64 r20 into r21;
    mul 400u64 r21 into r22;
    div r22 10000u64 into r23;
    add 200u64 r23 into r24;
    mul r24 1000000000000u64 into r25;
    div r25 21024000000u64 into r26;
    mul r26 r21 into r27;
    mul r27 9000u64 into r28;
    div r28 100000000u64 into r29;
    mul r4 r29 into r30;
    mul r30 r13 into r31;
    div r31 1000000000000u64 into r32;
    add r4 r32 into r33;
    ternary r16 r33 r4 into r34;
    mul r5 r26 into r35;
    mul r35 r13 into r36;
    div r36 1000000000000u64 into r37;
    add r5 r37 into r38;
    ternary r16 r38 r5 into r39;
    mul r7 r26 into r40;
    div r40 1000000000000u64 into r41;
    mul r41 r13 into r42;
    mul r42 1000u64 into r43;
    div r43 10000u64 into r44;
    ternary r16 r44 0u64 into r45;
    add r8 r45 into r46;
    mul r29 21024000000u64 into r47;
    div r47 1000000000000u64 into r48;
    mul r26 21024000000u64 into r49;
    div r49 1000000000000u64 into r50;
    add r3 r13 into r51;
    ternary r14 r51 r3 into r52;
    set r34 into supply_index[0field];
    set r39 into borrow_index[0field];
    set r52 into last_accrual_block[0field];
    set r46 into protocol_fees[0field];
    set r48 into supply_apy[0field];
    set r50 into borrow_apy[0field];
    get.or_use user_scaled_supply[r1] 0u64 into r53;
    mul r53 r34 into r54;
    div r54 1000000000000u64 into r55;
    lte r0 r55 into r56;
    assert.eq r56 true;
    sub r55 r0 into r57;
    get.or_use user_scaled_borrow[r1] 0u64 into r58;
    mul r58 r39 into r59;
    div r59 1000000000000u64 into r60;
    mul r57 7500u64 into r61;
    div r61 10000u64 into r62;
    is.eq r60 0u64 into r63;
    lte r60 r62 into r64;
    or r63 r64 into r65;
    assert.eq r65 true;
    mul r0 1000000000000u64 into r66;
    div r66 r34 into r67;
    gt r53 r67 into r68;
    sub r53 r67 into r69;
    ternary r68 r69 0u64 into r70;
    set r70 into user_scaled_supply[r1];
    gt r6 r0 into r71;
    sub r6 r0 into r72;
    ternary r71 r72 0u64 into r73;
    set r73 into total_deposited[0field];
    get.or_use available_liquidity[0field] 0u64 into r74;
    gt r74 r0 into r75;
    sub r74 r0 into r76;
    ternary r75 r76 0u64 into r77;
    set r77 into available_liquidity[0field];

function borrow:
    input r0 as u64.public;
    gt r0 0u64 into r1;
    assert.eq r1 true;
    hash.bhp256 self.caller into r2 as field;
    cast self.caller 1field 0u64 0u64 r0 0u64 into r3 as UserActivity.record;
    async borrow r0 r2 into r4;
    output r3 as UserActivity.record;
    output r4 as lending_pool_usdcx_v4.aleo/borrow.future;

finalize borrow:
    input r0 as u64.public;
    input r1 as field.public;
    cast block.height into r2 as u64;
    get.or_use last_accrual_block[0field] 0u64 into r3;
    get.or_use supply_index[0field] 1000000000000u64 into r4;
    get.or_use borrow_index[0field] 1000000000000u64 into r5;
    get.or_use total_deposited[0field] 0u64 into r6;
    get.or_use total_borrowed[0field] 0u64 into r7;
    get.or_use protocol_fees[0field] 0u64 into r8;
    gt r2 r3 into r9;
    sub r2 r3 into r10;
    ternary r9 r10 0u64 into r11;
    gt r11 1000u64 into r12;
    ternary r12 1000u64 r11 into r13;
    gt r13 0u64 into r14;
    gt r6 0u64 into r15;
    and r14 r15 into r16;
    is.eq r6 0u64 into r17;
    ternary r17 1u64 r6 into r18;
    mul r7 10000u64 into r19;
    div r19 r18 into r20;
    ternary r17 0u64 r20 into r21;
    mul 400u64 r21 into r22;
    div r22 10000u64 into r23;
    add 200u64 r23 into r24;
    mul r24 1000000000000u64 into r25;
    div r25 21024000000u64 into r26;
    mul r26 r21 into r27;
    mul r27 9000u64 into r28;
    div r28 100000000u64 into r29;
    mul r4 r29 into r30;
    mul r30 r13 into r31;
    div r31 1000000000000u64 into r32;
    add r4 r32 into r33;
    ternary r16 r33 r4 into r34;
    mul r5 r26 into r35;
    mul r35 r13 into r36;
    div r36 1000000000000u64 into r37;
    add r5 r37 into r38;
    ternary r16 r38 r5 into r39;
    mul r7 r26 into r40;
    div r40 1000000000000u64 into r41;
    mul r41 r13 into r42;
    mul r42 1000u64 into r43;
    div r43 10000u64 into r44;
    ternary r16 r44 0u64 into r45;
    add r8 r45 into r46;
    mul r29 21024000000u64 into r47;
    div r47 1000000000000u64 into r48;
    mul r26 21024000000u64 into r49;
    div r49 1000000000000u64 into r50;
    add r3 r13 into r51;
    ternary r14 r51 r3 into r52;
    set r34 into supply_index[0field];
    set r39 into borrow_index[0field];
    set r52 into last_accrual_block[0field];
    set r46 into protocol_fees[0field];
    set r48 into supply_apy[0field];
    set r50 into borrow_apy[0field];
    get.or_use user_scaled_supply[r1] 0u64 into r53;
    mul r53 r34 into r54;
    div r54 1000000000000u64 into r55;
    mul r55 7500u64 into r56;
    div r56 10000u64 into r57;
    get.or_use user_scaled_borrow[r1] 0u64 into r58;
    mul r58 r39 into r59;
    div r59 1000000000000u64 into r60;
    add r60 r0 into r61;
    lte r61 r57 into r62;
    assert.eq r62 true;
    get.or_use available_liquidity[0field] 0u64 into r63;
    lte r0 r63 into r64;
    assert.eq r64 true;
    mul r0 1000000000000u64 into r65;
    div r65 r39 into r66;
    add r58 r66 into r67;
    set r67 into user_scaled_borrow[r1];
    add r7 r0 into r68;
    set r68 into total_borrowed[0field];
    gt r63 r0 into r69;
    sub r63 r0 into r70;
    ternary r69 r70 0u64 into r71;
    set r71 into available_liquidity[0field];

function repay:
    input r0 as test_usdcx_stablecoin.aleo/Token.record;
    input r1 as u64.public;
    input r2 as [test_usdcx_stablecoin.aleo/MerkleProof; 2u32].private;
    gt r1 0u64 into r3;
    assert.eq r3 true;
    is.eq self.caller r0.owner into r4;
    assert.eq r4 true;
    cast r1 into r5 as u128;
    gte r0.amount r5 into r6;
    assert.eq r6 true;
    hash.bhp256 self.caller into r7 as field;
    call test_usdcx_stablecoin.aleo/transfer_private aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr r5 r0 r2 into r8 r9 r10 r11;
    cast self.caller 1field 0u64 0u64 0u64 r1 into r12 as UserActivity.record;
    async repay r11 r1 r7 into r13;
    output r8 as test_usdcx_stablecoin.aleo/ComplianceRecord.record;
    output r12 as UserActivity.record;
    output r9 as test_usdcx_stablecoin.aleo/Token.record;
    output r10 as test_usdcx_stablecoin.aleo/Token.record;
    output r13 as lending_pool_usdcx_v4.aleo/repay.future;

finalize repay:
    input r0 as test_usdcx_stablecoin.aleo/transfer_private.future;
    input r1 as u64.public;
    input r2 as field.public;
    await r0;
    cast block.height into r3 as u64;
    get.or_use last_accrual_block[0field] 0u64 into r4;
    get.or_use supply_index[0field] 1000000000000u64 into r5;
    get.or_use borrow_index[0field] 1000000000000u64 into r6;
    get.or_use total_deposited[0field] 0u64 into r7;
    get.or_use total_borrowed[0field] 0u64 into r8;
    get.or_use protocol_fees[0field] 0u64 into r9;
    gt r3 r4 into r10;
    sub r3 r4 into r11;
    ternary r10 r11 0u64 into r12;
    gt r12 1000u64 into r13;
    ternary r13 1000u64 r12 into r14;
    gt r14 0u64 into r15;
    gt r7 0u64 into r16;
    and r15 r16 into r17;
    is.eq r7 0u64 into r18;
    ternary r18 1u64 r7 into r19;
    mul r8 10000u64 into r20;
    div r20 r19 into r21;
    ternary r18 0u64 r21 into r22;
    mul 400u64 r22 into r23;
    div r23 10000u64 into r24;
    add 200u64 r24 into r25;
    mul r25 1000000000000u64 into r26;
    div r26 21024000000u64 into r27;
    mul r27 r22 into r28;
    mul r28 9000u64 into r29;
    div r29 100000000u64 into r30;
    mul r5 r30 into r31;
    mul r31 r14 into r32;
    div r32 1000000000000u64 into r33;
    add r5 r33 into r34;
    ternary r17 r34 r5 into r35;
    mul r6 r27 into r36;
    mul r36 r14 into r37;
    div r37 1000000000000u64 into r38;
    add r6 r38 into r39;
    ternary r17 r39 r6 into r40;
    mul r8 r27 into r41;
    div r41 1000000000000u64 into r42;
    mul r42 r14 into r43;
    mul r43 1000u64 into r44;
    div r44 10000u64 into r45;
    ternary r17 r45 0u64 into r46;
    add r9 r46 into r47;
    mul r30 21024000000u64 into r48;
    div r48 1000000000000u64 into r49;
    mul r27 21024000000u64 into r50;
    div r50 1000000000000u64 into r51;
    add r4 r14 into r52;
    ternary r15 r52 r4 into r53;
    set r35 into supply_index[0field];
    set r40 into borrow_index[0field];
    set r53 into last_accrual_block[0field];
    set r47 into protocol_fees[0field];
    set r49 into supply_apy[0field];
    set r51 into borrow_apy[0field];
    get.or_use user_scaled_borrow[r2] 0u64 into r54;
    mul r54 r40 into r55;
    div r55 1000000000000u64 into r56;
    lte r1 r56 into r57;
    assert.eq r57 true;
    mul r1 1000000000000u64 into r58;
    div r58 r40 into r59;
    gt r54 r59 into r60;
    sub r54 r59 into r61;
    ternary r60 r61 0u64 into r62;
    set r62 into user_scaled_borrow[r2];
    gt r8 r1 into r63;
    sub r8 r1 into r64;
    ternary r63 r64 0u64 into r65;
    set r65 into total_borrowed[0field];
    get.or_use available_liquidity[0field] 0u64 into r66;
    add r66 r1 into r67;
    set r67 into available_liquidity[0field];

function accrue_interest:
    async accrue_interest into r0;
    output r0 as lending_pool_usdcx_v4.aleo/accrue_interest.future;

finalize accrue_interest:
    cast block.height into r0 as u64;
    get.or_use last_accrual_block[0field] 0u64 into r1;
    get.or_use supply_index[0field] 1000000000000u64 into r2;
    get.or_use borrow_index[0field] 1000000000000u64 into r3;
    get.or_use total_deposited[0field] 0u64 into r4;
    get.or_use total_borrowed[0field] 0u64 into r5;
    get.or_use protocol_fees[0field] 0u64 into r6;
    gt r0 r1 into r7;
    sub r0 r1 into r8;
    ternary r7 r8 0u64 into r9;
    gt r9 1000u64 into r10;
    ternary r10 1000u64 r9 into r11;
    gt r11 0u64 into r12;
    gt r4 0u64 into r13;
    and r12 r13 into r14;
    is.eq r4 0u64 into r15;
    ternary r15 1u64 r4 into r16;
    mul r5 10000u64 into r17;
    div r17 r16 into r18;
    ternary r15 0u64 r18 into r19;
    mul 400u64 r19 into r20;
    div r20 10000u64 into r21;
    add 200u64 r21 into r22;
    mul r22 1000000000000u64 into r23;
    div r23 21024000000u64 into r24;
    mul r24 r19 into r25;
    mul r25 9000u64 into r26;
    div r26 100000000u64 into r27;
    mul r2 r27 into r28;
    mul r28 r11 into r29;
    div r29 1000000000000u64 into r30;
    add r2 r30 into r31;
    ternary r14 r31 r2 into r32;
    mul r3 r24 into r33;
    mul r33 r11 into r34;
    div r34 1000000000000u64 into r35;
    add r3 r35 into r36;
    ternary r14 r36 r3 into r37;
    mul r5 r24 into r38;
    div r38 1000000000000u64 into r39;
    mul r39 r11 into r40;
    mul r40 1000u64 into r41;
    div r41 10000u64 into r42;
    ternary r14 r42 0u64 into r43;
    add r6 r43 into r44;
    mul r27 21024000000u64 into r45;
    div r45 1000000000000u64 into r46;
    mul r24 21024000000u64 into r47;
    div r47 1000000000000u64 into r48;
    add r1 r11 into r49;
    ternary r12 r49 r1 into r50;
    set r32 into supply_index[0field];
    set r37 into borrow_index[0field];
    set r50 into last_accrual_block[0field];
    set r44 into protocol_fees[0field];
    set r46 into supply_apy[0field];
    set r48 into borrow_apy[0field];

function withdraw_fees:
    input r0 as u64.public;
    gt r0 0u64 into r1;
    assert.eq r1 true;
    async withdraw_fees r0 self.caller into r2;
    output r2 as lending_pool_usdcx_v4.aleo/withdraw_fees.future;

finalize withdraw_fees:
    input r0 as u64.public;
    input r1 as address.public;
    is.eq r1 aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px into r2;
    assert.eq r2 true;
    get.or_use protocol_fees[0field] 0u64 into r3;
    lte r0 r3 into r4;
    assert.eq r4 true;
    sub r3 r0 into r5;
    set r5 into protocol_fees[0field];

constructor:
    assert.eq program_owner aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr;
