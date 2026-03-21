import merkle_tree.aleo;
import test_usdcx_multisig_core.aleo;
import test_usdcx_freezelist.aleo;
import test_usdcx_stablecoin.aleo;
program test_transfer_usdcx_v2.aleo;

record UserActivity:
    owner as address.private;
    asset_id as field.private;
    total_deposits as u64.private;
    total_withdrawals as u64.private;
    total_borrows as u64.private;
    total_repayments as u64.private;

struct MerkleProof:
    siblings as [field; 16u32];
    leaf_index as u32;

mapping total_deposited:
    key as field.public;
    value as u64.public;

function deposit:
    input r0 as test_usdcx_stablecoin.aleo/Token.record;
    input r1 as u64.public;
    input r2 as [MerkleProof; 2u32].private;
    cast r1 into r3 as u128;
    call test_usdcx_stablecoin.aleo/transfer_private aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr r3 r0 r2 into r4 r5 r6 r7;
    cast self.caller 1field r1 0u64 0u64 0u64 into r8 as UserActivity.record;
    async deposit r1 r7 into r9;
    output r8 as UserActivity.record;
    output r5 as test_usdcx_stablecoin.aleo/Token.record;
    output r6 as test_usdcx_stablecoin.aleo/Token.record;
    output r9 as test_transfer_usdcx_v2.aleo/deposit.future;

finalize deposit:
    input r0 as u64.public;
    input r1 as test_usdcx_stablecoin.aleo/transfer_private.future;
    await r1;
    get.or_use total_deposited[0field] 0u64 into r2;
    add r2 r0 into r3;
    set r3 into total_deposited[0field];

constructor:
    assert.eq program_owner aleo1a2ehlgqhvs3p7d4hqhs0tvgk954dr8gafu9kxse2mzu9a5sqxvpsrn98pr;
