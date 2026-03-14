import test_usdcx_stablecoin.aleo;
program lending_pool_usdce_v2.aleo;

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
    is.eq self.caller aleo1v0ufeajsjwr3lnyq8qay54x3sg7e4ld0287hdt72glr3lhjmn5zqzwnexq into r0;
    assert.eq r0 true;
    async initialize into r1;
    output r1 as lending_pool_usdce_v2.aleo/initialize.future;

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
    input r2 as u64.public;
    input r3 as [test_usdcx_stablecoin.aleo/MerkleProof; 2u32].private;
    gt r1 0u64 into r4;
    assert.eq r4 true;
    is.eq self.caller r0.owner into r5;
    assert.eq r5 true;
    cast r1 into r6 as u128;
    gte r0.amount r6 into r7;
    assert.eq r7 true;
    hash.bhp256 self.caller into r8 as field;
    call test_usdcx_stablecoin.aleo/transfer_private aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr r6 r0 r3 into r9 r10 r11 r12;
    cast self.caller 1field r1 0u64 0u64 0u64 into r13 as UserActivity.record;
    async deposit r12 r1 r8 r2 into r14;
    output r13 as UserActivity.record;
    output r10 as test_usdcx_stablecoin.aleo/Token.record;
    output r11 as test_usdcx_stablecoin.aleo/Token.record;
    output r14 as lending_pool_usdce_v2.aleo/deposit.future;

finalize deposit:
    input r0 as test_usdcx_stablecoin.aleo/transfer_private.future;
    input r1 as u64.public;
    input r2 as field.public;
    input r3 as u64.public;
    await r0;
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
    mul r8 10000u64 into r19;
    div r19 r7 into r20;
    ternary r18 0u64 r20 into r21;
    mul 400u64 r21 into r22;
    div r22 10000u64 into r23;
    add 200u64 r23 into r24;
    mul r24 1000000000000u64 into r25;
    div r25 21024000000u64 into r26;
    mul r26 r21 into r27;
    mul r27 9000u64 into r28;
    div r28 100000000u64 into r29;
    mul r5 r29 into r30;
    mul r30 r14 into r31;
    div r31 1000000000000u64 into r32;
    add r5 r32 into r33;
    ternary r17 r33 r5 into r34;
    mul r6 r26 into r35;
    mul r35 r14 into r36;
    div r36 1000000000000u64 into r37;
    add r6 r37 into r38;
    ternary r17 r38 r6 into r39;
    mul r8 r26 into r40;
    mul r40 r14 into r41;
    mul r41 1000u64 into r42;
    div r42 10000000000000000u64 into r43;
    ternary r17 r43 0u64 into r44;
    mul r29 2102400u64 into r45;
    mul r45 10000u64 into r46;
    div r46 1000000000000u64 into r47;
    mul r26 2102400u64 into r48;
    mul r48 10000u64 into r49;
    div r49 1000000000000u64 into r50;
    add r4 r14 into r51;
    ternary r17 r51 r4 into r52;
    set r34 into supply_index[0field];
    set r39 into borrow_index[0field];
    set r52 into last_accrual_block[0field];
    add r9 r44 into r53;
    set r53 into protocol_fees[0field];
    set r47 into supply_apy[0field];
    set r50 into borrow_apy[0field];
    mul r1 1000000000000u64 into r54;
    div r54 r34 into r55;
    get.or_use user_scaled_supply[r2] 0u64 into r56;
    add r56 r55 into r57;
    set r57 into user_scaled_supply[r2];
    add r7 r1 into r58;
    set r58 into total_deposited[0field];
    get.or_use available_liquidity[0field] 0u64 into r59;
    add r59 r1 into r60;
    set r60 into available_liquidity[0field];

function repay:
    input r0 as test_usdcx_stablecoin.aleo/Token.record;
    input r1 as u64.public;
    input r2 as u64.public;
    input r3 as [test_usdcx_stablecoin.aleo/MerkleProof; 2u32].private;
    gt r1 0u64 into r4;
    assert.eq r4 true;
    is.eq self.caller r0.owner into r5;
    assert.eq r5 true;
    cast r1 into r6 as u128;
    gte r0.amount r6 into r7;
    assert.eq r7 true;
    hash.bhp256 self.caller into r8 as field;
    call test_usdcx_stablecoin.aleo/transfer_private aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr r6 r0 r3 into r9 r10 r11 r12;
    cast self.caller 1field 0u64 0u64 0u64 r1 into r13 as UserActivity.record;
    async repay r12 r1 r8 r2 into r14;
    output r13 as UserActivity.record;
    output r10 as test_usdcx_stablecoin.aleo/Token.record;
    output r11 as test_usdcx_stablecoin.aleo/Token.record;
    output r14 as lending_pool_usdce_v2.aleo/repay.future;

finalize repay:
    input r0 as test_usdcx_stablecoin.aleo/transfer_private.future;
    input r1 as u64.public;
    input r2 as field.public;
    input r3 as u64.public;
    await r0;
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
    mul r8 10000u64 into r19;
    div r19 r7 into r20;
    ternary r18 0u64 r20 into r21;
    mul 400u64 r21 into r22;
    div r22 10000u64 into r23;
    add 200u64 r23 into r24;
    mul r24 1000000000000u64 into r25;
    div r25 21024000000u64 into r26;
    mul r26 r21 into r27;
    mul r27 9000u64 into r28;
    div r28 100000000u64 into r29;
    mul r5 r29 into r30;
    mul r30 r14 into r31;
    div r31 1000000000000u64 into r32;
    add r5 r32 into r33;
    ternary r17 r33 r5 into r34;
    mul r6 r26 into r35;
    mul r35 r14 into r36;
    div r36 1000000000000u64 into r37;
    add r6 r37 into r38;
    ternary r17 r38 r6 into r39;
    mul r8 r26 into r40;
    mul r40 r14 into r41;
    mul r41 1000u64 into r42;
    div r42 10000000000000000u64 into r43;
    ternary r17 r43 0u64 into r44;
    mul r29 2102400u64 into r45;
    mul r45 10000u64 into r46;
    div r46 1000000000000u64 into r47;
    mul r26 2102400u64 into r48;
    mul r48 10000u64 into r49;
    div r49 1000000000000u64 into r50;
    add r4 r14 into r51;
    ternary r17 r51 r4 into r52;
    set r34 into supply_index[0field];
    set r39 into borrow_index[0field];
    set r52 into last_accrual_block[0field];
    add r9 r44 into r53;
    set r53 into protocol_fees[0field];
    set r47 into supply_apy[0field];
    set r50 into borrow_apy[0field];
    get.or_use user_scaled_borrow[r2] 0u64 into r54;
    mul r54 r39 into r55;
    div r55 1000000000000u64 into r56;
    lte r1 r56 into r57;
    assert.eq r57 true;
    mul r1 1000000000000u64 into r58;
    div r58 r39 into r59;
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

function withdraw:
    input r0 as u64.public;
    input r1 as u64.public;
    gt r0 0u64 into r2;
    assert.eq r2 true;
    hash.bhp256 self.caller into r3 as field;
    cast self.caller 1field 0u64 r0 0u64 0u64 into r4 as UserActivity.record;
    async withdraw r0 r3 r1 into r5;
    output r4 as UserActivity.record;
    output r5 as lending_pool_usdce_v2.aleo/withdraw.future;

finalize withdraw:
    input r0 as u64.public;
    input r1 as field.public;
    input r2 as u64.public;
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
    mul r7 10000u64 into r18;
    div r18 r6 into r19;
    ternary r17 0u64 r19 into r20;
    mul 400u64 r20 into r21;
    div r21 10000u64 into r22;
    add 200u64 r22 into r23;
    mul r23 1000000000000u64 into r24;
    div r24 21024000000u64 into r25;
    mul r25 r20 into r26;
    mul r26 9000u64 into r27;
    div r27 100000000u64 into r28;
    mul r4 r28 into r29;
    mul r29 r13 into r30;
    div r30 1000000000000u64 into r31;
    add r4 r31 into r32;
    ternary r16 r32 r4 into r33;
    mul r5 r25 into r34;
    mul r34 r13 into r35;
    div r35 1000000000000u64 into r36;
    add r5 r36 into r37;
    ternary r16 r37 r5 into r38;
    mul r7 r25 into r39;
    mul r39 r13 into r40;
    mul r40 1000u64 into r41;
    div r41 10000000000000000u64 into r42;
    ternary r16 r42 0u64 into r43;
    mul r28 2102400u64 into r44;
    mul r44 10000u64 into r45;
    div r45 1000000000000u64 into r46;
    mul r25 2102400u64 into r47;
    mul r47 10000u64 into r48;
    div r48 1000000000000u64 into r49;
    add r3 r13 into r50;
    ternary r16 r50 r3 into r51;
    set r33 into supply_index[0field];
    set r38 into borrow_index[0field];
    set r51 into last_accrual_block[0field];
    add r8 r43 into r52;
    set r52 into protocol_fees[0field];
    set r46 into supply_apy[0field];
    set r49 into borrow_apy[0field];
    get.or_use user_scaled_supply[r1] 0u64 into r53;
    mul r53 r33 into r54;
    div r54 1000000000000u64 into r55;
    lte r0 r55 into r56;
    assert.eq r56 true;
    get.or_use user_scaled_borrow[r1] 0u64 into r57;
    mul r57 r38 into r58;
    div r58 1000000000000u64 into r59;
    sub r55 r0 into r60;
    mul r60 7500u64 into r61;
    div r61 10000u64 into r62;
    is.eq r59 0u64 into r63;
    lte r59 r62 into r64;
    or r63 r64 into r65;
    assert.eq r65 true;
    mul r0 1000000000000u64 into r66;
    div r66 r33 into r67;
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
    input r1 as u64.public;
    gt r0 0u64 into r2;
    assert.eq r2 true;
    hash.bhp256 self.caller into r3 as field;
    cast self.caller 1field 0u64 0u64 r0 0u64 into r4 as UserActivity.record;
    async borrow r0 r3 r1 into r5;
    output r4 as UserActivity.record;
    output r5 as lending_pool_usdce_v2.aleo/borrow.future;

finalize borrow:
    input r0 as u64.public;
    input r1 as field.public;
    input r2 as u64.public;
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
    mul r7 10000u64 into r18;
    div r18 r6 into r19;
    ternary r17 0u64 r19 into r20;
    mul 400u64 r20 into r21;
    div r21 10000u64 into r22;
    add 200u64 r22 into r23;
    mul r23 1000000000000u64 into r24;
    div r24 21024000000u64 into r25;
    mul r25 r20 into r26;
    mul r26 9000u64 into r27;
    div r27 100000000u64 into r28;
    mul r4 r28 into r29;
    mul r29 r13 into r30;
    div r30 1000000000000u64 into r31;
    add r4 r31 into r32;
    ternary r16 r32 r4 into r33;
    mul r5 r25 into r34;
    mul r34 r13 into r35;
    div r35 1000000000000u64 into r36;
    add r5 r36 into r37;
    ternary r16 r37 r5 into r38;
    mul r7 r25 into r39;
    mul r39 r13 into r40;
    mul r40 1000u64 into r41;
    div r41 10000000000000000u64 into r42;
    ternary r16 r42 0u64 into r43;
    mul r28 2102400u64 into r44;
    mul r44 10000u64 into r45;
    div r45 1000000000000u64 into r46;
    mul r25 2102400u64 into r47;
    mul r47 10000u64 into r48;
    div r48 1000000000000u64 into r49;
    add r3 r13 into r50;
    ternary r16 r50 r3 into r51;
    set r33 into supply_index[0field];
    set r38 into borrow_index[0field];
    set r51 into last_accrual_block[0field];
    add r8 r43 into r52;
    set r52 into protocol_fees[0field];
    set r46 into supply_apy[0field];
    set r49 into borrow_apy[0field];
    get.or_use user_scaled_supply[r1] 0u64 into r53;
    mul r53 r33 into r54;
    div r54 1000000000000u64 into r55;
    mul r55 7500u64 into r56;
    div r56 10000u64 into r57;
    get.or_use user_scaled_borrow[r1] 0u64 into r58;
    mul r58 r38 into r59;
    div r59 1000000000000u64 into r60;
    add r60 r0 into r61;
    lte r61 r57 into r62;
    assert.eq r62 true;
    get.or_use available_liquidity[0field] 0u64 into r63;
    lte r0 r63 into r64;
    assert.eq r64 true;
    mul r0 1000000000000u64 into r65;
    div r65 r38 into r66;
    add r58 r66 into r67;
    set r67 into user_scaled_borrow[r1];
    add r7 r0 into r68;
    set r68 into total_borrowed[0field];
    gt r63 r0 into r69;
    sub r63 r0 into r70;
    ternary r69 r70 0u64 into r71;
    set r71 into available_liquidity[0field];

function accrue_interest:
    input r0 as u64.public;
    async accrue_interest r0 into r1;
    output r1 as lending_pool_usdce_v2.aleo/accrue_interest.future;

finalize accrue_interest:
    input r0 as u64.public;
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
    mul r5 10000u64 into r16;
    div r16 r4 into r17;
    ternary r15 0u64 r17 into r18;
    mul 400u64 r18 into r19;
    div r19 10000u64 into r20;
    add 200u64 r20 into r21;
    mul r21 1000000000000u64 into r22;
    div r22 21024000000u64 into r23;
    mul r23 r18 into r24;
    mul r24 9000u64 into r25;
    div r25 100000000u64 into r26;
    mul r2 r26 into r27;
    mul r27 r11 into r28;
    div r28 1000000000000u64 into r29;
    add r2 r29 into r30;
    ternary r14 r30 r2 into r31;
    mul r3 r23 into r32;
    mul r32 r11 into r33;
    div r33 1000000000000u64 into r34;
    add r3 r34 into r35;
    ternary r14 r35 r3 into r36;
    mul r5 r23 into r37;
    mul r37 r11 into r38;
    mul r38 1000u64 into r39;
    div r39 10000000000000000u64 into r40;
    ternary r14 r40 0u64 into r41;
    mul r26 2102400u64 into r42;
    mul r42 10000u64 into r43;
    div r43 1000000000000u64 into r44;
    mul r23 2102400u64 into r45;
    mul r45 10000u64 into r46;
    div r46 1000000000000u64 into r47;
    add r1 r11 into r48;
    ternary r14 r48 r1 into r49;
    set r31 into supply_index[0field];
    set r36 into borrow_index[0field];
    set r49 into last_accrual_block[0field];
    add r6 r41 into r50;
    set r50 into protocol_fees[0field];
    set r44 into supply_apy[0field];
    set r47 into borrow_apy[0field];

function withdraw_fees:
    input r0 as u64.public;
    gt r0 0u64 into r1;
    assert.eq r1 true;
    async withdraw_fees r0 self.caller into r2;
    output r2 as lending_pool_usdce_v2.aleo/withdraw_fees.future;

finalize withdraw_fees:
    input r0 as u64.public;
    input r1 as address.public;
    is.eq r1 aleo1v0ufeajsjwr3lnyq8qay54x3sg7e4ld0287hdt72glr3lhjmn5zqzwnexq into r2;
    assert.eq r2 true;
    get.or_use protocol_fees[0field] 0u64 into r3;
    lte r0 r3 into r4;
    assert.eq r4 true;
    sub r3 r0 into r5;
    set r5 into protocol_fees[0field];

constructor:
    assert.eq program_owner aleo1v0ufeajsjwr3lnyq8qay54x3sg7e4ld0287hdt72glr3lhjmn5zqzwnexq;
