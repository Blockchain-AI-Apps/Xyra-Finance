import merkle_tree.aleo;
import test_usdcx_multisig_core.aleo;
import test_usdcx_freezelist.aleo;
import test_usdcx_stablecoin.aleo;
program lending_pool_usdcx_v1.aleo;

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

mapping supply_index:
    key as field.public;
    value as u64.public;

mapping user_scaled_supply:
    key as field.public;
    value as u64.public;

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
    call test_usdcx_stablecoin.aleo/transfer_private_to_public aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr r5 r0 r2 into r8 r9 r10;
    cast self.caller 1field r1 0u64 0u64 0u64 into r11 as UserActivity.record;
    async deposit r1 r7 r10 into r12;
    output r8 as test_usdcx_stablecoin.aleo/ComplianceRecord.record;
    output r11 as UserActivity.record;
    output r9 as test_usdcx_stablecoin.aleo/Token.record;
    output r12 as lending_pool_usdcx_v1.aleo/deposit.future;

finalize deposit:
    input r0 as u64.public;
    input r1 as field.public;
    input r2 as test_usdcx_stablecoin.aleo/transfer_private_to_public.future;
    await r2;
    get.or_use supply_index[0field] 1000000000000u64 into r3;
    mul r0 1000000000000u64 into r4;
    div r4 r3 into r5;
    get.or_use user_scaled_supply[r1] 0u64 into r6;
    add r6 r5 into r7;
    set r7 into user_scaled_supply[r1];
    get.or_use total_deposited[0field] 0u64 into r8;
    add r8 r0 into r9;
    set r9 into total_deposited[0field];

constructor:
    assert.eq program_owner aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr;
