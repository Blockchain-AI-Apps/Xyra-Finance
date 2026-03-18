import 'dotenv/config';
import {
  Account,
  ProgramManager,
  AleoKeyProvider,
  NetworkRecordProvider,
  AleoNetworkClient,
  BlockHeightSearch,
  initializeWasm,
} from '@provablehq/sdk';
import fs from 'fs/promises';
import { logTestnetStatus } from './checkTestnet.js';
import { USDC_TOKEN_PROGRAM } from './config.js';

const VAULT_ADDRESS = process.env.VAULT_ADDRESS;
const VAULT_PRIVATE_KEY = process.env.VAULT_PRIVATE_KEY;
const ALEO_RPC_URL = process.env.ALEO_RPC_URL || 'https://testnetbeta.aleorpc.com';
const WITHDRAW_FEE_CREDITS = Number(process.env.WITHDRAW_FEE_CREDITS || '0.2');

if (!VAULT_ADDRESS || !VAULT_PRIVATE_KEY) {
  console.error(
    '[backend] VAULT_ADDRESS or VAULT_PRIVATE_KEY is not set. Fill backend/.env before running.',
  );
  process.exit(1);
}

// Initialize WASM once for all withdrawals
const wasmReady = initializeWasm();

export function parseCliArgs() {
  const [, , toAddress, amountStr] = process.argv;
  if (!toAddress || !amountStr) {
    console.error(
      'Usage: node src/processWithdrawal.js <user_address> <amount_in_credits>\n' +
        'Example: node src/processWithdrawal.js aleo1user... 1',
    );
    process.exit(1);
  }
  const amountCredits = Number(amountStr);
  if (!Number.isFinite(amountCredits) || amountCredits <= 0) {
    console.error('Amount must be a positive number (whole credits).');
    process.exit(1);
  }
  return { toAddress, amountCredits };
}

export async function runWithdrawal(toAddress, amountCredits) {
  await wasmReady;

  await logTestnetStatus();

  const amount = Number(amountCredits);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number (whole credits).');
  }

  console.log('========================================');
  console.log('🏦 Processing withdrawal from vault');
  console.log('========================================');
  console.log('Vault address:', VAULT_ADDRESS);
  console.log('User address :', toAddress);
  console.log('Amount       :', amount, 'credits');
  console.log('Fee (credits):', WITHDRAW_FEE_CREDITS);

  // Create vault account from private key
  const account = new Account({ privateKey: VAULT_PRIVATE_KEY });

  // Network / key / record providers for credits.aleo transfers
  const networkClient = new AleoNetworkClient(ALEO_RPC_URL);
  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);
  const recordProvider = new NetworkRecordProvider(account, networkClient);

  const programManager = new ProgramManager(ALEO_RPC_URL, keyProvider, recordProvider);
  programManager.setAccount(account);

  // Log current public balance for vault (in microcredits) before attempting transfer
  try {
    const publicBalanceRaw = await programManager.networkClient.getMappingValue(
      'credits.aleo',
      VAULT_ADDRESS,
    );
    console.log('Vault public balance (raw mapping value from credits.aleo/account):', publicBalanceRaw);
  } catch (e) {
    console.warn('⚠️ Could not fetch vault public balance from credits.aleo/account:', e);
  }

  console.log('\n🚀 Submitting credits.aleo transfer_public_to_private (vault public -> user private record)...');
  // Uses vault's public balance; user receives a private credits.aleo/credits record
  const txId = await programManager.transfer(
    amount,
    toAddress,
    'transfer_public_to_private',
    WITHDRAW_FEE_CREDITS,
  );

  console.log('✅ Withdrawal transaction submitted:', txId);
  return txId;
}

// Same as runWithdrawal: vault sends credits to user (used for borrow payout).
const BORROW_FEE_CREDITS = Number(process.env.BORROW_FEE_CREDITS || process.env.WITHDRAW_FEE_CREDITS || '0.2');

// --- USDC pool: withdraw & borrow (vault sends USDCx via test_usdcx_stablecoin.aleo/transfer_public_to_private; no token record needed) ---
const USDC_DECIMALS = 6;
const USDC_SCALE = 10 ** USDC_DECIMALS; // 1_000_000 — convert u64 (human) to 6-decimal amount for transfer
const USDC_WITHDRAW_FEE_CREDITS = Number(process.env.USDC_WITHDRAW_FEE_CREDITS || process.env.WITHDRAW_FEE_CREDITS || '0.2');
const USDC_BORROW_FEE_CREDITS = Number(process.env.USDC_BORROW_FEE_CREDITS || process.env.BORROW_FEE_CREDITS || '0.2');
const DEFAULT_USDC_MERKLE_PROOFS =
  '[{ siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 1u32 }, { siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 1u32 }]';

const USDC_RECORD_FETCH_RETRIES = Number(process.env.USDC_RECORD_FETCH_RETRIES || '3');
const USDC_RECORD_FETCH_DELAY_MS = Number(process.env.USDC_RECORD_FETCH_DELAY_MS || '5000');
// Only search this many blocks back from latest (avoids scanning whole chain = fast). Increase in .env if record not found.
const USDC_BLOCK_RANGE = Number(process.env.USDC_BLOCK_RANGE || '50');
// Optional: fix range to specific blocks (e.g. USDC_START_BLOCK=14399003 USDC_END_BLOCK=14399004 for block 14399003 and next).
const USDC_START_BLOCK = process.env.USDC_START_BLOCK ? Number(process.env.USDC_START_BLOCK) : null;
const USDC_END_BLOCK = process.env.USDC_END_BLOCK ? Number(process.env.USDC_END_BLOCK) : null;
// Persisted state: where to start next time (stored after a successful search/transfer)
const USDC_STATE_PATH = new URL('./usdc_record_state.json', import.meta.url).pathname;

/**
 * Find vault's unspent USDC record using the same method as Aleo credits:
 * recordProvider.findRecord(searchParameters) with { unspent: true, nonces: [], program, ...BlockHeightSearch }.
 * BlockHeightSearch limits to a small range (fixed blocks or latest N blocks) so the search is fast.
 */
async function findUsdcRecordsWithRetry(recordProvider, networkClient) {
  let startHeight;
  let endHeight;

  // 1) Highest priority: explicit fixed range from .env
  if (
    USDC_START_BLOCK != null &&
    USDC_END_BLOCK != null &&
    Number.isFinite(USDC_START_BLOCK) &&
    Number.isFinite(USDC_END_BLOCK)
  ) {
    startHeight = Math.max(0, USDC_START_BLOCK);
    endHeight = USDC_END_BLOCK;
    console.log(`[USDC] Searching fixed block range (from .env): ${startHeight}..${endHeight}.`);
  } else {
    // 2) Next: try to resume from last successful search (persisted JSON)
    let persistedStart = null;
    try {
      const raw = await fs.readFile(USDC_STATE_PATH, 'utf8');
      const state = JSON.parse(raw);
      if (Number.isFinite(state?.nextStartHeight)) {
        persistedStart = state.nextStartHeight;
        console.log(`[USDC] Using persisted start height from ${USDC_STATE_PATH}: ${persistedStart}.`);
      }
    } catch (e) {
      if (e && e.code !== 'ENOENT') {
        console.warn('[USDC] Failed to read usdc_record_state.json:', e.message || e);
      }
    }

    let latestHeight = 0;
    try {
      latestHeight = await networkClient.getLatestHeight();
      if (typeof latestHeight !== 'number' || latestHeight <= 0) latestHeight = 0;
    } catch (e) {
      console.warn('[USDC] getLatestHeight failed:', e?.message || e);
    }
    if (latestHeight <= 0) {
      throw new Error(
        '[USDC] Could not get latest block height. Set USDC_START_BLOCK and USDC_END_BLOCK in .env to use a fixed range, or check ALEO_RPC_URL.',
      );
    }
    endHeight = latestHeight;
    // If we have a persisted start height, continue from there; otherwise start from latest - range.
    if (persistedStart != null && persistedStart < endHeight) {
      startHeight = Math.max(0, persistedStart);
      console.log(
        `[USDC] Searching from persisted start height to latest: ${startHeight}..${endHeight} (no fixed end).`,
      );
    } else {
      startHeight = Math.max(0, latestHeight - USDC_BLOCK_RANGE);
      console.log(`[USDC] Searching latest ${USDC_BLOCK_RANGE} blocks (${startHeight}..${endHeight}).`);
    }
  }

  if (startHeight >= endHeight) {
    throw new Error(`[USDC] Invalid block range: startHeight (${startHeight}) must be less than endHeight (${endHeight}).`);
  }

  // BlockHeightSearch is required: without it the SDK would scan 0..latest = entire chain = very slow.
  const searchParams = {
    unspent: true,
    nonces: [],
    program: USDC_TOKEN_PROGRAM,
    ...new BlockHeightSearch(startHeight, endHeight, true),
  };

  let lastError;
  for (let attempt = 1; attempt <= USDC_RECORD_FETCH_RETRIES; attempt++) {
    try {
      const record = await recordProvider.findRecord(searchParams);
      if (record) {
        // Log the record and the block range we searched in (we don't get exact block height from NetworkRecordProvider).
        console.log(
          `[USDC] Found unspent record in range ${startHeight}..${endHeight}. Record plaintext:`,
          record.record_plaintext ?? record.recordPlaintext ?? record,
        );
        // Persist next start height so future searches resume from here (effectively “no end block”, always up to latest).
        try {
          await fs.writeFile(
            USDC_STATE_PATH,
            JSON.stringify({ nextStartHeight: endHeight }, null, 2),
            'utf8',
          );
          console.log(`[USDC] Saved nextStartHeight=${endHeight} to ${USDC_STATE_PATH}.`);
        } catch (e) {
          console.warn('[USDC] Failed to write usdc_record_state.json:', e.message || e);
        }
        console.log('[USDC] Found unspent record (same method as credits). Executing transaction.');
        return [record];
      }
    } catch (err) {
      lastError = err;
      const msg = (err && err.message) ? String(err.message) : String(err);
      console.warn(
        `[USDC] findRecord attempt ${attempt}/${USDC_RECORD_FETCH_RETRIES} failed: ${msg.slice(0, 120)}...`,
      );
      if (attempt < USDC_RECORD_FETCH_RETRIES) {
        console.log(`[USDC] Retrying in ${USDC_RECORD_FETCH_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, USDC_RECORD_FETCH_DELAY_MS));
      }
    }
  }
  throw lastError;
}

/**
 * USDC withdraw: vault sends USDCx via transfer_public_to_private (vault public balance -> user private record; no record lookup).
 * Amount from request is u64 (human USDC, e.g. 1 = 1 USDC). We convert to 6 decimals for transfer (1 -> 1_000_000).
 */
export async function runWithdrawalUsdc(toAddress, amountUsdcU64) {
  await wasmReady;
  await logTestnetStatus();

  const amount = Number(amountUsdcU64);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('USDC amount must be a positive number (u64 human, e.g. 1 = 1 USDC).');
  }

  const amountForTransfer = Math.round(amount * USDC_SCALE); // 6 decimals for token transfer
  if (amountForTransfer <= 0) {
    throw new Error('USDC amount too small after 6-decimal scaling.');
  }

  console.log('========================================');
  console.log('🏦 Processing USDC withdrawal from vault');
  console.log('========================================');
  console.log('Vault address:', VAULT_ADDRESS);
  console.log('User address :', toAddress);
  console.log('Amount (u64) :', amount, '-> transfer amount (6 decimals):', amountForTransfer);
  console.log('Fee (credits):', USDC_WITHDRAW_FEE_CREDITS);

  const account = new Account({ privateKey: VAULT_PRIVATE_KEY });
  const networkClient = new AleoNetworkClient(ALEO_RPC_URL);
  networkClient.setAccount(account);
  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);
  const recordProvider = new NetworkRecordProvider(account, networkClient);
  const programManager = new ProgramManager(ALEO_RPC_URL, keyProvider, recordProvider);
  programManager.setAccount(account);

  // transfer_public_to_private: no token record. Transition inputs: r0 = address.private (recipient), r1 = u128.public (amount). Sender = signer (vault).
  const inputs = [toAddress, `${amountForTransfer}u128`];

  console.log('\n🚀 Submitting test_usdcx_stablecoin.aleo/transfer_public_to_private (vault public balance -> user private record)...');
  const txId = await programManager.execute({
    programName: USDC_TOKEN_PROGRAM,
    functionName: 'transfer_public_to_private',
    priorityFee: USDC_WITHDRAW_FEE_CREDITS,
    privateFee: false,
    inputs,
  });

  console.log('✅ USDC withdrawal transaction submitted:', txId);
  return txId;
}

/**
 * USDC borrow: vault sends USDCx to user (same as withdraw; amount in u64, convert to 6 decimals for transfer).
 */
export async function runBorrowUsdc(toAddress, amountUsdcU64) {
  await wasmReady;
  await logTestnetStatus();

  const amount = Number(amountUsdcU64);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('USDC amount must be a positive number (u64 human, e.g. 1 = 1 USDC).');
  }

  const amountForTransfer = Math.round(amount * USDC_SCALE);
  if (amountForTransfer <= 0) {
    throw new Error('USDC amount too small after 6-decimal scaling.');
  }

  console.log('========================================');
  console.log('🏦 Processing USDC borrow from vault');
  console.log('========================================');
  console.log('Vault address:', VAULT_ADDRESS);
  console.log('User address :', toAddress);
  console.log('Amount (u64) :', amount, '-> transfer amount (6 decimals):', amountForTransfer);
  console.log('Fee (credits):', USDC_BORROW_FEE_CREDITS);

  const account = new Account({ privateKey: VAULT_PRIVATE_KEY });
  const networkClient = new AleoNetworkClient(ALEO_RPC_URL);
  networkClient.setAccount(account);
  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);
  const recordProvider = new NetworkRecordProvider(account, networkClient);
  const programManager = new ProgramManager(ALEO_RPC_URL, keyProvider, recordProvider);
  programManager.setAccount(account);

  // transfer_public_to_private: no token record. Inputs: r0 = address.private (recipient), r1 = u128.public (amount).
  const inputs = [toAddress, `${amountForTransfer}u128`];

  console.log('\n🚀 Submitting test_usdcx_stablecoin.aleo/transfer_public_to_private (vault -> user for USDC borrow)...');
  const txId = await programManager.execute({
    programName: USDC_TOKEN_PROGRAM,
    functionName: 'transfer_public_to_private',
    priorityFee: USDC_BORROW_FEE_CREDITS,
    privateFee: false,
    inputs,
  });

  console.log('✅ USDC borrow (vault transfer) transaction submitted:', txId);
  return txId;
}

export async function runBorrow(toAddress, amountCredits) {
  await wasmReady;

  await logTestnetStatus();

  const amount = Number(amountCredits);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number (whole credits).');
  }

  console.log('========================================');
  console.log('🏦 Processing borrow from vault');
  console.log('========================================');
  console.log('Vault address:', VAULT_ADDRESS);
  console.log('User address :', toAddress);
  console.log('Amount       :', amount, 'credits');
  console.log('Fee (credits):', BORROW_FEE_CREDITS);

  const account = new Account({ privateKey: VAULT_PRIVATE_KEY });
  const networkClient = new AleoNetworkClient(ALEO_RPC_URL);
  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);
  const recordProvider = new NetworkRecordProvider(account, networkClient);
  const programManager = new ProgramManager(ALEO_RPC_URL, keyProvider, recordProvider);
  programManager.setAccount(account);

  console.log('\n🚀 Submitting credits.aleo transfer_public_to_private (vault -> user for borrow)...');
  const txId = await programManager.transfer(
    amount,
    toAddress,
    'transfer_public_to_private',
    BORROW_FEE_CREDITS,
  );

  console.log('✅ Borrow (vault transfer) transaction submitted:', txId);
  return txId;
}

// If called directly via `node src/processWithdrawal.js ...`, run once with CLI args.
if (process.argv[1] && process.argv[1].includes('processWithdrawal.js')) {
  (async () => {
    const { toAddress, amountCredits } = parseCliArgs();
    try {
      await runWithdrawal(toAddress, amountCredits);
    } catch (err) {
      console.error('❌ Withdrawal processing failed:', err);
      process.exit(1);
    }
  })();
}


