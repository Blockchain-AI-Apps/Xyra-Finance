import { JSONRPCClient } from 'json-rpc-2.0';
import { CURRENT_NETWORK, CURRENT_RPC_URL } from '@/types';
import { PROGRAMS } from '@/config/programs';
import { Network } from '@provablehq/aleo-types';
import { frontendLogger } from '@/utils/logger';
import { TREASURY_ADDRESS, getTreasuryRequestMessage } from '@/config/treasury';

// Note: @aleohq/wasm is not imported directly due to WASM build issues in Next.js
// We'll use dynamic import when needed, or fall back to contract call method

// For clarity, alias the lending pool program IDs.
export const LENDING_POOL_PROGRAM_ID = PROGRAMS.LENDING_POOL;
export const USDC_LENDING_POOL_PROGRAM_ID = PROGRAMS.USDC_POOL;
export const CREDITS_PROGRAM_ID = PROGRAMS.CREDITS;

/**
 * Debug function to diagnose what records are available in the wallet
 * Call this from the browser console: window.debugRecords(requestRecords)
 */
export async function debugAllRecords(
  requestRecords?: (program: string, includeSpent?: boolean) => Promise<any[]>,
  publicKey?: string
): Promise<any> {
  if (!requestRecords) {
    return { error: 'requestRecords not available. Make sure wallet is connected.' };
  }

  console.log('🔍 === WALLET RECORDS DIAGNOSIS ===');
  
  const results: any = {
    timestamp: new Date().toISOString(),
    publicKey: publicKey?.substring(0, 20) + '...',
    approaches: {},
  };

  let creditsRecordsResult: any = [];
  let lendingPoolRecordsResult: any = [];
  let allRecordsResult: any = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Approach 1: Get all records (empty string)
  try {
    console.log('📋 Fetching ALL records (empty string)...');
    const allRecords = await requestRecords('', false);
    allRecordsResult = allRecords || [];
    results.approaches.allRecords = {
      success: true,
      count: allRecords?.length || 0,
      records: allRecords || [],
    };
    console.log('✅ All records:', allRecords?.length || 0);
    if (allRecords && Array.isArray(allRecords)) {
      allRecords.forEach((r: any, i: number) => {
        console.log(`  [${i}] Program: ${r.program_id || r.programId || 'unknown'}, Keys: ${Object.keys(r).join(', ')}`);
      });
    }
  } catch (e: any) {
    const errMsg = `Failed to fetch all records: ${e.message}`;
    console.warn('⚠️', errMsg);
    errors.push(errMsg);
    results.approaches.allRecords = { success: false, error: e.message };
  }

  // Approach 3: Get lending pool records
  try {
    console.log('📋 Fetching LENDING POOL records...');
    const lendingRecords = await requestRecords(LENDING_POOL_PROGRAM_ID, false);
    lendingPoolRecordsResult = lendingRecords || [];
    results.approaches.lendingRecords = {
      success: true,
      count: lendingRecords?.length || 0,
      records: lendingRecords || [],
    };
    console.log('✅ Lending pool records:', lendingRecords?.length || 0);
    if (lendingRecords && Array.isArray(lendingRecords)) {
      lendingRecords.forEach((r: any, i: number) => {
        console.log(`  [${i}]:`, JSON.stringify(r, null, 2).substring(0, 300));
      });
    }
  } catch (e: any) {
    const errMsg = `Failed to fetch lending pool records: ${e.message}`;
    console.warn('⚠️', errMsg);
    errors.push(errMsg);
    results.approaches.lendingRecords = { success: false, error: e.message };
  }

  console.log('🔍 === DIAGNOSIS COMPLETE ===');
  console.log('📊 Summary:', results);
  
  // Store diagnostic in logger
  frontendLogger.storeRecordDiagnostic(
    publicKey,
    creditsRecordsResult,
    lendingPoolRecordsResult,
    allRecordsResult,
    errors,
    warnings
  );
  
  return results;
}

// Default fee for lending pool functions (in credits, will be converted to microcredits).
// If you see fee-related errors in Leo Wallet, you can increase this.
const DEFAULT_LENDING_FEE = 0.2; // 0.2 credits = 200,000 microcredits

// Flag to disable credits record check (for testing purposes)
// When true, skips validation and creates a mock record if none found
const DISABLE_CREDITS_CHECK = false; // Set to false to re-enable checks

// Create the JSON-RPC client
export const client = getClient(CURRENT_RPC_URL);


// returns a string for address-based mappings
export async function fetchMappingValueString(
  mappingName: string,
  key: number
): Promise<string> {
  try {
    const result = await client.request('getMappingValue', {
      programId: LENDING_POOL_PROGRAM_ID,
      mappingName,
      key: `${key}.public`,
    });
    return result.value; // The address is stored as string in 'result.value'
  } catch (error) {
    console.error(`Failed to fetch mapping ${mappingName} with key ${key}:`, error);
    throw error;
  }
}

export async function fetchMappingValueRaw(
  mappingName: string,
  key: string
): Promise<string> {
  try {

    const keyString = `${key}u64`;

    const result = await client.request("getMappingValue", {
      program_id: LENDING_POOL_PROGRAM_ID,
      mapping_name: mappingName,
      key: keyString,
    });

    if (!result) {
      throw new Error(
        `No result returned for mapping "${mappingName}" and key "${keyString}"`
      );
    }

    return result;
  } catch (error) {
    console.error(`Failed to fetch mapping "${mappingName}" with key "${key}":`, error);
    throw error;
  }
}


export async function fetchBountyStatusAndReward(bountyId: string) {
  try {
 
    const keyU64 = `${bountyId}u64`;


    const statusResult = await client.request('getMappingValue', {
      program_id: LENDING_POOL_PROGRAM_ID,
      mapping_name: 'bounty_status',
      key: keyU64,
    });

    const rewardResult = await client.request('getMappingValue', {
      program_id: LENDING_POOL_PROGRAM_ID,
      // In the Leo program this is stored as `bounty_payment`
      mapping_name: 'bounty_payment',
      key: keyU64,
    });

    return {
      status: statusResult?.value ?? statusResult ?? null,
      reward: rewardResult?.value ?? rewardResult ?? null,
    };
  } catch (error) {
    console.error('Error fetching bounty status/reward from chain:', error);
    throw new Error('Failed to fetch chain data');
  }
}

export async function readBountyMappings(bountyId: string) {
  // Fetch raw strings for all mappings
  const creator = await fetchMappingValueRaw('bounty_creator', bountyId);
  const payment = await fetchMappingValueRaw('bounty_payment', bountyId);
  const status = await fetchMappingValueRaw('bounty_status', bountyId);

  return {
    creator,  
    payment,  
    status,   
  };
}

export async function readProposalMappings(bountyId: number, proposalId: number) {
  // Ensure safe arithmetic using BigInt
  const compositeProposalId = (BigInt(bountyId) * BigInt(1_000_000) + BigInt(proposalId)).toString();

  console.log("Fetching data for Composite Proposal ID:", compositeProposalId);

  try {
    // Fetch all mappings related to the proposal
    const proposalBountyId = await fetchMappingValueRaw("proposal_bounty_id", compositeProposalId);
    const proposalProposer = await fetchMappingValueRaw("proposal_proposer", compositeProposalId);
    const proposalStatus = await fetchMappingValueRaw("proposal_status", compositeProposalId);

    return {
      proposalBountyId,
      proposalProposer,
      proposalStatus,
    };
  } catch (error) {
    console.error("Error fetching proposal mappings:", error);
    throw error;
  }
}



/**
 * Utility to fetch program transactions
 */
export async function getProgramTransactions(
  functionName: string,
  page = 0,
  maxTransactions = 100
) {
  return client.request('aleoTransactionsForProgram', {
    programId: LENDING_POOL_PROGRAM_ID,
    functionName,
    page,
    maxTransactions,
  });
}

/**
 * Transfer credits publicly between two accounts.
 */
export async function transferPublic(
  recipient: string,
  amount: string
): Promise<string> {
  const inputs = [
    `${recipient}.public`, // Recipient's public address
    `${amount}u64`,    // Amount to transfer
  ];

  const result = await client.request('executeTransition', {
    programId: CREDITS_PROGRAM_ID,
    functionName: 'transfer_public',
    inputs,
  });

  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }
  return result.transactionId;
}

/**
 * Transfer credits privately between two accounts.
 *
 * This function calls the on-chain "transfer_private" transition,
 * which exactly expects three inputs in the following order:
 *  - r0: Sender's credits record (credits.record)
 *  - r1: Recipient's address with a ".private" suffix (address.private)
 *  - r2: Transfer amount with a "u64.private" suffix (u64.private)
 *
 * It returns two credits records:
 *  - The first output is the recipient's updated credits record.
 *  - The second output is the sender's updated credits record.
 */
export async function transferPrivate(
  senderRecord: string,
  recipient: string,
  amount: string
): Promise<{ recipientRecord: string; senderRecord: string }> {
  // Exactly matching the expected input types:
  const inputs = [
    `${senderRecord}`,         // r0: credits.record
    `${recipient}.private`,    // r1: address.private
    `${amount}u64.private`,     // r2: u64.private
  ];

  const result = await client.request('executeTransition', {
    programId: CREDITS_PROGRAM_ID,
    functionName: 'transfer_private',
    inputs,
  });

  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }

  // The Aleo program returns:
  //   result.outputs[0] -> recipient's updated credits record (r4)
  //   result.outputs[1] -> sender's updated credits record (r5)
  return {
    recipientRecord: result.outputs[0],
    senderRecord: result.outputs[1],
  };
}

/**
 * Call the `main` transition of the `sample.aleo` program.
 *
 * Leo:
 *   transition main(public a: u32, b: u32) -> u32
 */
// ----------------- Lending Pool helpers -----------------

/**
 * Helper: Get the latest UserPosition record or create a new one
 * Returns the record in the format expected by Aleo transitions (as a string)
 */
/**
 * Get the latest UserActivity record from wallet records, or return a zero activity for first-time users.
 * IMPORTANT: Always fetch from wallet records (requestRecords), never use activity from transaction result.
 * This ensures we always have the most up-to-date activity from the contract.
 * 
 * UserActivity contains 4 counters: total_deposits, total_withdrawals, total_borrows, total_repayments
 * Frontend calculates: net_supplied = total_deposits - total_withdrawals
 *                      net_borrowed = total_borrows - total_repayments
 * 
 * For first-time users (no record found), returns a zero activity object that the contract will accept.
 * The contract automatically handles first-time users when all counters are 0.
 * 
 * @param requestRecords - Function to fetch records from wallet
 * @param publicKey - User's public key (for validation and creating zero activity)
 * @returns The latest UserActivity record, or a zero activity object for first-time users
 */
async function getOrCreateActivity(
  requestRecords: (program: string, includeSpent?: boolean) => Promise<any[]>,
  publicKey: string
): Promise<any> {
  try {
    console.log('getOrCreateActivity: Fetching latest records from wallet for program:', LENDING_POOL_PROGRAM_ID);
    // requestRecords takes two parameters: (programId: string, includeSpent?: boolean)
    const records = await requestRecords(LENDING_POOL_PROGRAM_ID, false);
    console.log('getOrCreateActivity: Found records:', records?.length || 0);
    
    if (records && records.length > 0) {
      // Find the most recent UserActivity record
      // Records are typically returned with the newest last, so iterate in reverse
      // IMPORTANT: Always use the LATEST record from wallet, not from transaction result
      for (let i = records.length - 1; i >= 0; i--) {
        const record = records[i];
        console.log('getOrCreateActivity: Checking record', i, ':', typeof record);
        
        // Records from the wallet are typically already in the correct format
        if (typeof record === 'string') {
          // If it's already a string, check if it looks like a UserActivity record
          if (record.includes('owner') || record.includes('total_deposits') || record.includes('total_withdrawals') || 
              record.includes('total_borrows') || record.includes('total_repayments')) {
            console.log('getOrCreateActivity: Found UserActivity record (string format) - using latest from wallet');
            return record;
          }
        } else if (record && typeof record === 'object') {
          // If it's an object, check if it has UserActivity fields
          const recordData = record;
          const hasUserActivityFields = 
            recordData.program_id === LENDING_POOL_PROGRAM_ID || 
            recordData.programId === LENDING_POOL_PROGRAM_ID ||
            recordData.recordName === 'UserActivity' ||
            recordData.type === 'UserActivity' ||
            recordData.recordType === 'UserActivity' ||
            (recordData.data && (
              recordData.data.total_deposits !== undefined || 
              recordData.data.total_withdrawals !== undefined ||
              recordData.data.total_borrows !== undefined ||
              recordData.data.total_repayments !== undefined
            )) ||
            (recordData.total_deposits !== undefined || 
             recordData.total_withdrawals !== undefined ||
             recordData.total_borrows !== undefined ||
             recordData.total_repayments !== undefined);
          
          if (hasUserActivityFields) {
            console.log('getOrCreateActivity: Found UserActivity record (object format) - using latest from wallet');
            // Verify the owner matches (if we can extract it)
            // This ensures we're using the correct user's activity
            if (publicKey && recordData.owner && recordData.owner !== publicKey) {
              console.warn('getOrCreateActivity: Record owner does not match publicKey, continuing search...');
              continue;
            }
            return record; // Return the record object - wallet adapter handles serialization
          }
        }
      }
    }
    
    // No record found - return a zero activity for first-time users
    // The contract will accept this and automatically create the activity
    // The wallet adapter expects records as objects with a specific structure
    console.log('getOrCreateActivity: No existing record found, creating zero activity for first-time user');
    
    // Create a zero activity record object that matches the wallet adapter's expected format
    // The wallet adapter expects records to have a structure similar to what requestRecords returns
    // Format: { program_id, data: { owner, total_deposits, total_withdrawals, total_borrows, total_repayments } }
    const zeroActivityObject = {
      program_id: LENDING_POOL_PROGRAM_ID,
      recordName: 'UserActivity',
      data: {
        owner: `${publicKey}.private`,
        total_deposits: `0u64.private`,
        total_withdrawals: `0u64.private`,
        total_borrows: `0u64.private`,
        total_repayments: `0u64.private`,
      },
    };
    
    console.log('getOrCreateActivity: Created zero activity record object:', zeroActivityObject);
    return zeroActivityObject;
  } catch (error) {
    console.error('getOrCreateActivity: Failed to get activity record from wallet:', error);
    // Return zero activity for first-time users even on error
    // Format it as a proper object structure that matches wallet adapter expectations
    const zeroActivityObject = {
      program_id: LENDING_POOL_PROGRAM_ID,
      recordName: 'UserActivity',
      data: {
        owner: `${publicKey}.private`,
        total_deposits: `0u64.private`,
        total_withdrawals: `0u64.private`,
        total_borrows: `0u64.private`,
        total_repayments: `0u64.private`,
      },
    };
    console.log('getOrCreateActivity: Created zero activity record object (error fallback):', zeroActivityObject);
    return zeroActivityObject;
  }
}

/**
 * Get total spendable private Aleo balance (credits.aleo records) in credits.
 * Sums microcredits from all unspent credits.aleo records; uses decrypt for private records.
 * Returns 0 if no records or on error.
 */
export async function getPrivateCreditsBalance(
  requestRecords: (program: string, includeSpent?: boolean) => Promise<any[]>,
  decrypt?: (cipherText: string) => Promise<string>
): Promise<number> {
  try {
    const records = await requestRecords(CREDITS_PROGRAM_ID, false);
    if (!records || !Array.isArray(records)) return 0;
    const getMicrocredits = (r: any): number => {
      try {
        if (r.data?.microcredits) {
          return parseInt(String(r.data.microcredits).replace(/\D/g, ''), 10) || 0;
        }
        if (r.plaintext) {
          const m = String(r.plaintext).match(/microcredits:\s*([\d_]+)u64/);
          return m ? parseInt(m[1].replace(/_/g, ''), 10) : 0;
        }
      } catch {
        return 0;
      }
      return 0;
    };
    let totalMicro = 0;
    for (const r of records as any[]) {
      if (r.spent) continue;
      let micro = getMicrocredits(r);
      if (micro === 0 && (r.recordCiphertext || r.ciphertext) && decrypt) {
        try {
          const plain = await decrypt(r.recordCiphertext || r.ciphertext);
          if (plain) {
            const m = plain.match(/microcredits:\s*([\d_]+)u64/);
            micro = m ? parseInt(m[1].replace(/_/g, ''), 10) : 0;
          }
        } catch {
          // skip
        }
      }
      totalMicro += micro;
    }
    return totalMicro / 1_000_000;
  } catch {
    return 0;
  }
}

/**
 * Get public Aleo balance for an address from the credits.aleo/account mapping.
 * Returns balance in credits (not microcredits). Returns 0 if no public balance or on error.
 */
export async function getPublicCreditsBalance(address: string): Promise<number> {
  try {
    const result = await client.request('getMappingValue', {
      programId: CREDITS_PROGRAM_ID,
      mappingName: 'account',
      key: address,
    });
    // Value is returned as a string like "20000000u64" (microcredits)
    const raw = String(result?.value ?? result ?? '0');
    const micro = parseInt(raw.replace(/\D/g, ''), 10) || 0;
    return micro / 1_000_000;
  } catch {
    // No entry in mapping means 0 public balance
    return 0;
  }
}

/**
 * Deposit into the lending pool using a real `credits.aleo/credits` record.
 *
 * Contract: lending_pool_v91.aleo
 *   async transition deposit_with_credits(
 *     pay_record: credits.aleo/credits,
 *     public amount: u64
 *   ) -> (UserActivity, credits.aleo/credits, Future)
 */
export async function lendingDeposit(
  executeTransaction: ((tx: any) => Promise<any>) | undefined,
  amount: number,
  publicKey?: string,
  requestRecords?: (program: string, includeSpent?: boolean) => Promise<any[]>,
  decrypt?: (cipherText: string) => Promise<string>,
): Promise<string> {
  console.log('========================================');
  console.log('💰 LENDING DEPOSIT (credits) CALLED');
  console.log('========================================');
  console.log('📥 Input Parameters:', {
    amount,
    network: CURRENT_NETWORK,
    programId: LENDING_POOL_PROGRAM_ID,
  });

  if (!executeTransaction) {
    throw new Error('executeTransaction is not available from the connected wallet.');
  }
  if (!publicKey || !requestRecords) {
    throw new Error('Wallet not connected or record access (requestRecords) unavailable.');
  }
  if (amount <= 0) {
    throw new Error('Deposit amount must be greater than 0');
  }

  try {
    // Convert amount (credits) to microcredits. We allow decimals (up to 6 places),
    // rounding to the nearest micro credit. Pool expects micro-ALEO as its `amount`.
    const amountMicro = Math.round(amount * 1_000_000);
    const requiredMicro = amountMicro;

    console.log('🔍 Fetching credits.aleo records for deposit...', {
      CREDITS_PROGRAM_ID,
      requiredMicro,
    });

    let records = await requestRecords(CREDITS_PROGRAM_ID, false);
    if (!records || !Array.isArray(records)) records = [];

    console.log(`📋 Found ${records.length} credits.aleo records`);

    // Helper similar to NullPay: extract microcredits from data or plaintext
    const getMicrocredits = (record: any): number => {
      try {
        if (record.data && record.data.microcredits) {
          return parseInt(String(record.data.microcredits).replace('u64', ''), 10);
        }
        if (record.plaintext) {
          const match = String(record.plaintext).match(/microcredits:\s*([\d_]+)u64/);
          if (match && match[1]) {
            return parseInt(match[1].replace(/_/g, ''), 10);
          }
        }
      } catch {
        // ignore
      }
      return 0;
    };

    const processRecord = async (r: any): Promise<number> => {
      let val = getMicrocredits(r);
      if (val === 0 && r.recordCiphertext && !r.plaintext && decrypt) {
        try {
          const decrypted = await decrypt(r.recordCiphertext);
          if (decrypted) {
            r.plaintext = decrypted;
            val = getMicrocredits(r);
          }
        } catch (e) {
          console.warn('⚠️ Failed to decrypt credits record for deposit:', e);
        }
      }
      return val;
    };

    let payRecord: any | null = null;
    for (const r of records as any[]) {
      if (r.spent) continue;
      const val = await processRecord(r);
      const isSpendable = !!(r.plaintext || r.nonce || r._nonce || r.data?._nonce || r.ciphertext);
      if (isSpendable && val >= requiredMicro) {
        payRecord = r;
        break;
      }
    }

    if (!payRecord) {
      throw new Error(
        `No credits.aleo record found with enough microcredits for amount ${amount}. ` +
          `Make sure you have at least ${amount} private credits in one record.`,
      );
    }

    console.log('✅ Selected credits.aleo record for deposit:', {
      preview: JSON.stringify(payRecord).slice(0, 200),
    });

    // Build Leo-compatible record input (plaintext or ciphertext), like NullPay.
    let recordInput: string | any = payRecord.plaintext;

    if (!recordInput) {
      console.warn('⚠️ Credits record missing plaintext. Attempting to reconstruct...');
      const nonce = payRecord.nonce || payRecord._nonce || payRecord.data?._nonce;
      const micro = getMicrocredits(payRecord);
      const owner = payRecord.owner;

      if (nonce && micro > 0 && owner) {
        recordInput = `{ owner: ${owner}.private, microcredits: ${micro}u64.private, _nonce: ${nonce}.public }`;
        console.log('✅ Reconstructed credits plaintext for deposit:', recordInput);
      } else if (payRecord.ciphertext || payRecord.recordCiphertext) {
        recordInput = payRecord.ciphertext || payRecord.recordCiphertext;
        console.log('✅ Using credits ciphertext for deposit input.');
      } else {
        console.warn('⚠️ Could not reconstruct credits record; passing raw object (last resort).');
        recordInput = payRecord;
      }
    }

    const amountInput = `${amountMicro}u64`;
    const inputs: any[] = [recordInput, amountInput];

    console.log('🔍 Calling executeTransaction for deposit_with_credits...', {
      program: LENDING_POOL_PROGRAM_ID,
      function: 'deposit_with_credits',
      inputsPreview: {
        input0_len: recordInput.length,
        input1: amountInput,
      },
    });

    const result = await executeTransaction({
      program: LENDING_POOL_PROGRAM_ID,
      function: 'deposit_with_credits',
      inputs,
      fee: DEFAULT_LENDING_FEE * 1_000_000,
      privateFee: false,
      recordIndices: [0],
    });

    const tempId: string | undefined = result?.transactionId;
    if (!tempId) {
      throw new Error('Deposit failed: No temporary transactionId returned from wallet.');
    }

    console.log('Temporary Transaction ID (deposit_with_credits):', tempId);
    return tempId;
  } catch (error: any) {
    console.error('❌ LENDING DEPOSIT (credits) FAILED:', error);

    const rawMsg = String(error?.message || error || '').toLowerCase();
    const isCancelled =
      rawMsg.includes('operation was cancelled by the user') ||
      rawMsg.includes('operation was canceled by the user') ||
      rawMsg.includes('user cancelled') ||
      rawMsg.includes('user canceled') ||
      rawMsg.includes('user rejected') ||
      rawMsg.includes('rejected by user') ||
      rawMsg.includes('transaction cancelled by user');

    if (isCancelled) {
      console.warn('💡 Deposit transaction cancelled by user (handled gracefully).');
      return '__CANCELLED__';
    }

    throw new Error(`Deposit transaction failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Borrow from the lending pool using wallet adapter (v8 - simplified API).
 * v8 API: borrow(public amount: u64) -> (UserActivity, Future)
 * - Updates public pool state (total_borrowed, utilization_index)
 * - Updates private user mappings (increments total_borrows counter)
 * - No Credits record needed - just amount
 */
export async function lendingBorrow(
  executeTransaction: ((tx: any) => Promise<any>) | undefined,
  amount: number,
): Promise<string> {
  if (!executeTransaction) {
    throw new Error('executeTransaction is not available from the connected wallet.');
  }

  if (amount <= 0) {
    throw new Error('Borrow amount must be greater than 0');
  }

  try {
    const amountMicro = Math.round(amount * 1_000_000);
    const inputs = [`${amountMicro}u64`];

    // Check pool liquidity (same logic as before)
    try {
      const poolState = await getLendingPoolState();
      const totalSuppliedMicro = poolState.totalSupplied ? Number(poolState.totalSupplied) : 0;
      const totalBorrowedMicro = poolState.totalBorrowed ? Number(poolState.totalBorrowed) : 0;
      const availableLiquidityCredits = Math.max(
        0,
        (totalSuppliedMicro - totalBorrowedMicro) / 1_000_000,
      );

      if (totalSuppliedMicro === 0) {
        throw new Error('Cannot borrow: No liquidity in the pool. Please deposit first.');
      }

      if (amount > availableLiquidityCredits) {
        throw new Error(
          `Cannot borrow: Insufficient liquidity. Available: ${availableLiquidityCredits}, Requested: ${amount}`,
        );
      }
    } catch (error: any) {
      if (error.message.includes('Cannot borrow')) {
        throw error;
      }
      console.warn('Pool state check failed:', error);
    }

    console.log('🔍 Calling executeTransaction for borrow (public fee)...');
    const result = await executeTransaction({
      program: LENDING_POOL_PROGRAM_ID,
      function: 'borrow',
      inputs,
      fee: DEFAULT_LENDING_FEE * 1_000_000,
      privateFee: false,
    });

    const tempId: string | undefined = result?.transactionId;
    if (!tempId) {
      throw new Error('Borrow failed: No temporary transactionId returned from wallet.');
    }

    console.log('Temporary Transaction ID (borrow):', tempId);
    return tempId;
  } catch (error: any) {
    console.error('❌ LENDING BORROW FUNCTION FAILED:', error);

    const rawMsg = String(error?.message || error || '').toLowerCase();
    const isCancelled =
      rawMsg.includes('operation was cancelled by the user') ||
      rawMsg.includes('operation was canceled by the user') ||
      rawMsg.includes('user cancelled') ||
      rawMsg.includes('user canceled') ||
      rawMsg.includes('user rejected') ||
      rawMsg.includes('rejected by user') ||
      rawMsg.includes('transaction cancelled by user');

    if (isCancelled) {
      console.warn('💡 Borrow transaction cancelled by user (handled gracefully).');
      return '__CANCELLED__';
    }

    throw new Error(`Borrow transaction failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Repay to the lending pool using a real `credits.aleo/credits` record.
 *
 * Contract: lending_pool_v91.aleo
 *   async transition repay_with_credits(
 *     pay_record: credits.aleo/credits,
 *     public amount: u64
 *   ) -> (UserActivity, credits.aleo/credits, Future)
 *
 * This mirrors `lendingDeposit` but calls `repay_with_credits` instead of `deposit_with_credits`.
 */
export async function lendingRepay(
  executeTransaction: ((tx: any) => Promise<any>) | undefined,
  amount: number,
  publicKey?: string,
  requestRecords?: (program: string, includeSpent?: boolean) => Promise<any[]>,
  decrypt?: (cipherText: string) => Promise<string>,
): Promise<string> {
  if (!executeTransaction) {
    throw new Error('executeTransaction is not available from the connected wallet.');
  }
  if (!publicKey || !requestRecords) {
    throw new Error('Wallet not connected or record access (requestRecords) unavailable for repay.');
  }
  if (amount <= 0) {
    throw new Error('Repay amount must be greater than 0');
  }

  try {
    // Convert amount (credits) to microcredits. We allow decimals (up to 6 places),
    // rounding to the nearest micro credit. Pool expects micro-ALEO as its `amount`.
    const amountMicro = Math.round(amount * 1_000_000);
    const requiredMicro = amountMicro;

    console.log('🔍 Fetching credits.aleo records for repay...', {
      CREDITS_PROGRAM_ID,
      requiredMicro,
    });

    let records = await requestRecords(CREDITS_PROGRAM_ID, false);
    if (!records || !Array.isArray(records)) records = [];

    console.log(`📋 Found ${records.length} credits.aleo records (for repay)`);

    const getMicrocredits = (record: any): number => {
      try {
        if (record.data && record.data.microcredits) {
          return parseInt(String(record.data.microcredits).replace('u64', ''), 10);
        }
        if (record.plaintext) {
          const match = String(record.plaintext).match(/microcredits:\s*([\d_]+)u64/);
          if (match && match[1]) {
            return parseInt(match[1].replace(/_/g, ''), 10);
          }
        }
      } catch {
        // ignore
      }
      return 0;
    };

    const processRecord = async (r: any): Promise<number> => {
      let val = getMicrocredits(r);
      if (val === 0 && r.recordCiphertext && !r.plaintext && decrypt) {
        try {
          const decrypted = await decrypt(r.recordCiphertext);
          if (decrypted) {
            r.plaintext = decrypted;
            val = getMicrocredits(r);
          }
        } catch (e) {
          console.warn('⚠️ Failed to decrypt credits record for repay:', e);
        }
      }
      return val;
    };

    let payRecord: any | null = null;
    for (const r of records as any[]) {
      if (r.spent) continue;
      const val = await processRecord(r);
      const isSpendable = !!(r.plaintext || r.nonce || r._nonce || r.data?._nonce || r.ciphertext);
      if (isSpendable && val >= requiredMicro) {
        payRecord = r;
        break;
      }
    }

    if (!payRecord) {
      throw new Error(
        `No credits.aleo record found with enough microcredits for repay amount ${amount}. ` +
          `Make sure you have at least ${amount} private credits in one record.`,
      );
    }

    console.log('✅ Selected credits.aleo record for repay:', {
      preview: JSON.stringify(payRecord).slice(0, 200),
    });

    // Build Leo-compatible record input (plaintext or ciphertext), like NullPay / deposit.
    let recordInput: string | any = payRecord.plaintext;

    if (!recordInput) {
      console.warn('⚠️ Credits record missing plaintext (repay). Attempting to reconstruct...');
      const nonce = payRecord.nonce || payRecord._nonce || payRecord.data?._nonce;
      const micro = getMicrocredits(payRecord);
      const owner = payRecord.owner;

      if (nonce && micro > 0 && owner) {
        recordInput = `{ owner: ${owner}.private, microcredits: ${micro}u64.private, _nonce: ${nonce}.public }`;
        console.log('✅ Reconstructed credits plaintext for repay:', recordInput);
      } else if (payRecord.ciphertext || payRecord.recordCiphertext) {
        recordInput = payRecord.ciphertext || payRecord.recordCiphertext;
        console.log('✅ Using credits ciphertext for repay input.');
      } else {
        console.warn('⚠️ Could not reconstruct credits record; passing raw object (last resort).');
        recordInput = payRecord;
      }
    }

    const amountInput = `${amountMicro}u64`;
    const inputs: any[] = [recordInput, amountInput];

    console.log('🔍 Calling executeTransaction for repay_with_credits...', {
      program: LENDING_POOL_PROGRAM_ID,
      function: 'repay_with_credits',
      inputsPreview: {
        input0_len: typeof recordInput === 'string' ? recordInput.length : 'object',
        input1: amountInput,
      },
    });

    const result = await executeTransaction({
      program: LENDING_POOL_PROGRAM_ID,
      function: 'repay_with_credits',
      inputs,
      fee: DEFAULT_LENDING_FEE * 1_000_000,
      privateFee: false,
      recordIndices: [0],
    });

    const tempId: string | undefined = result?.transactionId;
    if (!tempId) {
      throw new Error('Repay failed: No temporary transactionId returned from wallet.');
    }

    console.log('Temporary Transaction ID (repay_with_credits):', tempId);
    return tempId;
  } catch (error: any) {
    console.error('❌ LENDING REPAY (credits) FAILED:', error);

    const rawMsg = String(error?.message || error || '').toLowerCase();
    const isCancelled =
      rawMsg.includes('operation was cancelled by the user') ||
      rawMsg.includes('operation was canceled by the user') ||
      rawMsg.includes('user cancelled') ||
      rawMsg.includes('user canceled') ||
      rawMsg.includes('user rejected') ||
      rawMsg.includes('rejected by user') ||
      rawMsg.includes('transaction cancelled by user');

    if (isCancelled) {
      console.warn('💡 Repay transaction cancelled by user (handled gracefully).');
      return '__CANCELLED__';
    }

    throw new Error(`Repay transaction failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Withdraw from the lending pool using wallet adapter (v8 - simplified API).
 * v8 API: withdraw(public amount: u64) -> (UserActivity, Future)
 * - Updates public pool state (total_supplied, utilization_index)
 * - Updates private user mappings (increments total_withdrawals counter)
 * - No Credits record needed - just amount
 */
export async function lendingWithdraw(
  executeTransaction: ((tx: any) => Promise<any>) | undefined,
  amount: number,
): Promise<string> {
  if (!executeTransaction) {
    throw new Error('executeTransaction is not available from the connected wallet.');
  }

  if (amount <= 0) {
    throw new Error('Withdraw amount must be greater than 0');
  }

  try {
    const amountMicro = Math.round(amount * 1_000_000);
    const inputs = [`${amountMicro}u64`];

    console.log('🔍 Calling executeTransaction for withdraw (public fee)...');
    const result = await executeTransaction({
      program: LENDING_POOL_PROGRAM_ID,
      function: 'withdraw',
      inputs,
      fee: DEFAULT_LENDING_FEE * 1_000_000,
      privateFee: false,
    });

    const tempId: string | undefined = result?.transactionId;
    if (!tempId) {
      throw new Error('Withdraw failed: No temporary transactionId returned from wallet.');
    }

    console.log('Temporary Transaction ID (withdraw):', tempId);
    return tempId;
  } catch (error: any) {
    console.error('❌ LENDING WITHDRAW FUNCTION FAILED:', error);

    const rawMsg = String(error?.message || error || '').toLowerCase();
    const isCancelled =
      rawMsg.includes('operation was cancelled by the user') ||
      rawMsg.includes('operation was canceled by the user') ||
      rawMsg.includes('user cancelled') ||
      rawMsg.includes('user canceled') ||
      rawMsg.includes('user rejected') ||
      rawMsg.includes('rejected by user') ||
      rawMsg.includes('transaction cancelled by user');

    if (isCancelled) {
      console.warn('💡 Withdraw transaction cancelled by user (handled gracefully).');
      return '__CANCELLED__';
    }

    throw new Error(`Withdraw transaction failed: ${error?.message || 'Unknown error'}`);
  }
}

// --- USDC Pool (lending_pool_usdce_v86.aleo) ---
// Contract: deposit(token, amount, proofs), repay(token, amount, proofs),
//           withdraw(public amount), borrow(public amount).
// - deposit/repay: 3 inputs — token, amount (micro-USDC), proofs. Block height is read on-chain.
// - withdraw/borrow: 1 input — amount (micro-USDC). Backend sends USDCx from vault to user.
// Amount in program is micro-USDC (1 USDC = 1_000_000). RPC accepts human USDC and converts to micro for transitions.
const USDC_TOKEN_PROGRAM = PROGRAMS.USDC_TOKEN;

/**
 * Placeholder [MerkleProof; 2] matching wallet format: leaf_index 1u32, 16 siblings per proof.
 * Same shape as wallet: "[{ siblings: [0field,...], leaf_index: 1u32 }, { ... }]".
 * Placeholder (all zeros) still causes "proving failed" on-chain; use wallet/API proofs when available.
 */
const DEFAULT_USDC_MERKLE_PROOFS =
  '[{ siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 1u32 }, { siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 1u32 }]';

/**
 * USDCx private record format (from chain/wallet):
 * { programName, recordName: "Token", recordCiphertext, spent, owner, commitment, tag, ... }
 * Amount is inside recordCiphertext (encrypted); we accept unspent Token records and pass to program.
 */
function isUsdcTokenRecord(rec: any): boolean {
  const programId = (rec?.program_id ?? rec?.programId ?? rec?.programName ?? '').toString();
  const recordName = (rec?.recordName ?? rec?.record_name ?? rec?.data?.recordName ?? '').toString();
  const isToken = recordName === 'Token' || (!recordName && (rec?.recordCiphertext ?? rec?.record_ciphertext));
  return (programId === USDC_TOKEN_PROGRAM || programId.includes('test_usdcx_stablecoin')) && (isToken || !!rec?.recordCiphertext);
}

/**
 * Returns the raw record ciphertext for use as transition input.
 * Wallets typically expect the canonical Aleo record form (ciphertext string, e.g. "record1q..."),
 * not JSON. Use this for deposit/repay input #0 to avoid "Failed to parse input #0 (Token.record)".
 */
export function getUsdcRecordCipher(record: any): string {
  if (record == null) return '';
  if (typeof record === 'string') {
    const t = record.trim();
    if (t.startsWith('record1')) return t;
    if (t.startsWith('{')) {
      try {
        const o = JSON.parse(t);
        return getUsdcRecordCipher(o);
      } catch {
        return '';
      }
    }
    return t;
  }
  const ciphertext = record.recordCiphertext ?? record.record_ciphertext ?? record.ciphertext;
  return typeof ciphertext === 'string' ? ciphertext.trim() : '';
}

/**
 * Build the token record value for transition input #0 (deposit/repay).
 * Prefer plaintext so the wallet can parse it as test_usdcx_stablecoin.aleo/Token.record (NullPay pattern).
 * Ciphertext often fails with "Failed to parse input #0 (Token.record)".
 */
function getUsdcTokenInputForTransition(record: any): string | any {
  if (record?.plaintext && typeof record.plaintext === 'string') {
    const pt = record.plaintext.trim();
    if (pt) return pt;
  }
  const cipher = getUsdcRecordCipher(record);
  if (cipher) return cipher;
  if (record && typeof record === 'object') return record;
  return '';
}

/**
 * Format USDC Token record for transition input #0.
 * Prefer getUsdcRecordCipher(record) so the wallet receives raw ciphertext (canonical Token.record form).
 * This helper can return JSON for wallets that expect it; currently we use ciphertext-only to fix parse errors.
 */
export function formatUsdcRecordForInput(record: any): string {
  return getUsdcRecordCipher(record);
}

/**
 * Parse amount from a record field (string like "100u128.private" or number).
 */
function parseUsdcAmount(amt: unknown): bigint | null {
  if (amt === undefined || amt === null) return null;
  if (typeof amt === 'number') return BigInt(amt);
  if (typeof amt === 'string') {
    const match = amt.match(/^(\d+)/);
    return match ? BigInt(match[1]) : null;
  }
  return null;
}

/** Parse amount from Token record plaintext string (e.g. "amount: 0u128.private" or "amount: 100u128"). */
export function parseUsdcAmountFromPlaintext(plaintext: string): bigint | null {
  if (typeof plaintext !== 'string' || !plaintext) return null;
  const match = plaintext.match(/amount:\s*(\d+)u128/);
  return match ? BigInt(match[1]) : null;
}

/**
 * Get total private USDC balance (test_usdcx_stablecoin.aleo Token records) in human USDC.
 * Sums amount from all unspent Token records; uses decrypt for encrypted records.
 * Returns 0 if no records or on error.
 */
export async function getPrivateUsdcBalance(
  requestRecords: (program: string, includeSpent?: boolean) => Promise<any[]>,
  decrypt?: (cipherText: string) => Promise<string>
): Promise<number> {
  try {
    const records = await requestRecords(USDC_TOKEN_PROGRAM, false);
    if (!records || !Array.isArray(records)) return 0;
    let totalMicro = BigInt(0);
    for (const rec of records as any[]) {
      if (rec?.spent === true || rec?.data?.spent === true) continue;
      if (!isUsdcTokenRecord(rec)) continue;
      let val: bigint | null = parseUsdcAmount(
        rec?.data?.amount ?? rec?.amount ?? (rec?.data && (rec.data as any).amount)
      );
      if (val === null && (rec.plaintext || (rec.recordCiphertext ?? rec.record_ciphertext)) && decrypt) {
        try {
          const plain = rec.plaintext || await decrypt(rec.recordCiphertext || rec.record_ciphertext);
          if (plain) val = parseUsdcAmountFromPlaintext(plain);
        } catch {
          // skip
        }
      }
      if (val != null && val > BigInt(0)) totalMicro += val;
    }
    return Number(totalMicro) / 1_000_000;
  } catch {
    return 0;
  }
}

/** Get latest block height from chain (for USDC pool: prefer records from latest block). */
export async function getLatestBlockHeight(): Promise<number> {
  const toNum = (v: any): number => {
    if (v === undefined || v === null) return 0;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'object' && v !== null) {
      const n = v.result ?? v.height ?? v.block_height ?? v.value;
      return toNum(n);
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  try {
    const h = await client.request('latest/height', {});
    return toNum(h);
  } catch (e) {
    try {
      const h = await client.request('getLatestBlockHeight', {});
      return toNum(h);
    } catch {
      return 0;
    }
  }
}

/** Extract block height from a record if present (wallet/chain may provide height, block_height, etc.). */
function getUsdcRecordBlockHeight(rec: any): number | null {
  if (rec == null) return null;
  const v =
    rec.height ??
    rec.block_height ??
    rec.blockHeight ??
    rec.block ??
    (rec.data && typeof rec.data === 'object' && (rec.data as any).height) ??
    (rec.data && typeof rec.data === 'object' && (rec.data as any).block_height);
  if (v === undefined || v === null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Fetch a USDCx Token record from the wallet with balance >= amount.
 * Supports chain format: { programName, recordName: "Token", recordCiphertext, spent, ... } (amount in ciphertext).
 * Returns the record object; use formatUsdcRecordForInput(record) for the transition input if needed.
 */
export async function getSuitableUsdcTokenRecord(
  requestRecords: (program: string, includeSpent?: boolean) => Promise<any[]>,
  amount: number,
  _publicKey: string
): Promise<any | null> {
  const amountU128 = BigInt(amount);
  const logPrefix = '[getSuitableUsdcTokenRecord]';

  console.log(`${logPrefix} Requesting records for program: ${USDC_TOKEN_PROGRAM}, amount required: ${amount} (u64, record uses 6 decimals)`);

  let records: any[];
  try {
    records = await requestRecords(USDC_TOKEN_PROGRAM, false);
  } catch (e: any) {
    console.error(`${logPrefix} requestRecords threw:`, e?.message ?? e);
    throw e;
  }

  console.log(`${logPrefix} requestRecords("${USDC_TOKEN_PROGRAM}", false) returned:`, {
    isArray: Array.isArray(records),
    length: records?.length ?? 0,
    raw: records,
  });

  if (!records || !Array.isArray(records)) {
    console.warn(`${logPrefix} No records array (got ${records})`);
    return null;
  }

  if (records.length === 0) {
    console.warn(`${logPrefix} Zero records for "${USDC_TOKEN_PROGRAM}". Trying requestRecords("", false) to see all programs...`);
    try {
      const allRecords = await requestRecords('', false);
      const allArr = Array.isArray(allRecords) ? allRecords : [];
      const programKey = (r: any) => r?.program_id ?? r?.programId ?? r?.programName ?? '?';
      console.log(`${logPrefix} requestRecords("") returned ${allArr.length} total records. Program IDs:`, allArr.map(programKey));
      const usdcFromAll = allArr.filter((r: any) => {
        const id = (r?.program_id ?? r?.programId ?? r?.programName ?? '').toString();
        return id === USDC_TOKEN_PROGRAM || id.includes('test_usdcx_stablecoin');
      });
      console.log(`${logPrefix} Of those, ${usdcFromAll.length} are ${USDC_TOKEN_PROGRAM}`);
      if (usdcFromAll.length > 0) {
        console.log(`${logPrefix} Use program "${USDC_TOKEN_PROGRAM}" in wallet record permissions / reconnect with that program.`);
      }
    } catch (e2: any) {
      console.warn(`${logPrefix} requestRecords("") failed:`, e2?.message ?? e2);
    }
    return null;
  }

  // USDC pool: prefer unspent records from the latest block — fetch latest height and sort by block height (latest first)
  let latestBlockHeight = 0;
  try {
    latestBlockHeight = await getLatestBlockHeight();
    if (latestBlockHeight > 0) {
      console.log(`${logPrefix} Latest block height: ${latestBlockHeight}; sorting records by block height (latest first).`);
    }
  } catch (e: any) {
    console.warn(`${logPrefix} Could not fetch latest block height:`, e?.message ?? e);
  }
  const sortedRecords = [...records].sort((a, b) => {
    const ha = getUsdcRecordBlockHeight(a) ?? 0;
    const hb = getUsdcRecordBlockHeight(b) ?? 0;
    return hb - ha; // descending: latest block first
  });
  if (latestBlockHeight > 0 && sortedRecords.length > 0) {
    const firstHeight = getUsdcRecordBlockHeight(sortedRecords[0]);
    if (firstHeight != null) {
      console.log(`${logPrefix} First record after sort has block height: ${firstHeight}`);
    }
  }

  console.log(`${logPrefix} Inspecting ${sortedRecords.length} record(s)...`);

  const unspentTokenRecords: any[] = [];

  for (let i = 0; i < sortedRecords.length; i++) {
    const rec = sortedRecords[i];
    const spent = rec?.spent === true || rec?.data?.spent === true;
    const isToken = isUsdcTokenRecord(rec);
    const recHeight = getUsdcRecordBlockHeight(rec);
    console.log(`${logPrefix} Record[${i}]:`, {
      keys: rec ? Object.keys(rec) : [],
      program_id: rec?.program_id ?? rec?.programId ?? rec?.programName,
      recordName: rec?.recordName ?? rec?.record_name,
      block_height: recHeight,
      spent,
      isUsdcToken: isToken,
      hasRecordCiphertext: !!(rec?.recordCiphertext ?? rec?.record_ciphertext),
      dataKeys: rec?.data ? Object.keys(rec.data) : [],
      amount: rec?.data?.amount ?? rec?.amount,
      owner: rec?.data?.owner ?? rec?.owner,
    });

    if (spent) {
      console.log(`${logPrefix} Record[${i}] skipped (spent)`);
      continue;
    }

    if (!isToken) {
      console.log(`${logPrefix} Record[${i}] skipped (not a USDCx Token record)`);
      continue;
    }

    // If we have plaintext amount, require sufficient balance and reject 0-balance records
    const amt =
      rec?.data?.amount ??
      rec?.amount ??
      rec?.data?.amount_ ??
      (rec?.data && typeof rec.data === 'object' && (rec.data as any).amount);
    const val = parseUsdcAmount(amt);

    if (val !== null) {
      if (val === BigInt(0)) {
        console.log(`${logPrefix} Record[${i}] skipped (amount is 0; cannot use for deposit/repay)`);
        continue;
      }
      console.log(`${logPrefix} Record[${i}] amount parsed: ${String(val)} (required >= ${amountU128}), sufficient: ${val >= amountU128}`);
      if (val >= amountU128) {
        console.log(`${logPrefix} Using record[${i}] for deposit/repay (has sufficient amount)`);
        return rec;
      }
      // Has plaintext but insufficient; don't use as fallback
      continue;
    }

    // No plaintext amount (encrypted); can use as fallback if we have no better option
    unspentTokenRecords.push(rec);
    console.log(`${logPrefix} Record[${i}] has no plaintext amount (encrypted). Added to fallback list.`);
  }

  if (unspentTokenRecords.length > 0) {
    console.log(`${logPrefix} No record with plaintext amount >= ${amount}. Using first unspent Token record with encrypted amount; program will assert balance.`);
    return unspentTokenRecords[0];
  }

  console.warn(`${logPrefix} No unspent USDCx Token record. Check that you have private USDCx (transfer_public_to_private) and record access.`);
  return null;
}

function handleUsdcTxError(error: any, action: string): string {
  const rawMsg = String(error?.message || error || '').toLowerCase();
  const isCancelled =
    rawMsg.includes('operation was cancelled by the user') ||
    rawMsg.includes('operation was canceled by the user') ||
    rawMsg.includes('user cancelled') ||
    rawMsg.includes('user canceled') ||
    rawMsg.includes('user rejected') ||
    rawMsg.includes('rejected by user') ||
    rawMsg.includes('transaction cancelled by user');
  if (isCancelled) return '__CANCELLED__';
  if (rawMsg.includes('proving failed') || rawMsg.includes('proving error')) {
    throw new Error(
      `${action} failed: Proving failed. The USDCx token program requires valid Merkle proofs for your record. ` +
        'Placeholder proofs cannot be used on-chain. Obtain valid proofs from your wallet (if it supports USDCx private transfer) or from Provable/token issuer. ' +
        'See programusdc/inputs/README_DEPOSIT_EXAMPLE.md for details.'
    );
  }
  throw new Error(`${action} failed: ${error?.message || 'Unknown error'}`);
}

/**
 * USDC deposit: lending_pool_usdce_v86.aleo/deposit(token, amount, proofs) — 3 inputs.
 * Amount in human USDC; converted to micro-USDC for the program.
 */
export async function lendingDepositUsdc(
  executeTransaction: ((tx: any) => Promise<any>) | undefined,
  amount: number,
  tokenRecord: any,
  proofs?: [string, string] | string
): Promise<string> {
  if (!executeTransaction) throw new Error('executeTransaction is not available.');
  if (amount <= 0) throw new Error('Deposit amount must be greater than 0');
  if (tokenRecord == null) throw new Error('A USDC Token record is required. Please ensure you have USDCx in your wallet.');
  try {
    const tokenInput = getUsdcTokenInputForTransition(tokenRecord);
    if (tokenInput === '' || (typeof tokenInput === 'string' && !String(tokenInput).trim())) {
      throw new Error('USDC Token record has no ciphertext or plaintext. Ensure the record is from test_usdcx_stablecoin.aleo and try again.');
    }
    const amountMicro = Math.round(amount * 1_000_000);
    const amountStr = `${amountMicro}u64`;
    let proofsEncoded: string;
    if (typeof proofs === 'string' && proofs.trim().startsWith('[') && proofs.includes('siblings')) {
      proofsEncoded = proofs.trim();
    } else {
      const proofsInput = Array.isArray(proofs) && proofs.length >= 2
        ? [String(proofs[0]).trim(), String(proofs[1]).trim()]
        : ['', ''];
      proofsEncoded =
        proofsInput.every(Boolean) && proofsInput[0] && proofsInput[1]
          ? (proofsInput[0].startsWith('{') ? `[${proofsInput[0]}, ${proofsInput[1]}]` : proofsInput.join(','))
          : DEFAULT_USDC_MERKLE_PROOFS;
    }

    const inputs: (string | any)[] = [tokenInput, amountStr, proofsEncoded];

    console.log('[USDC deposit] All 3 inputs:', {
      input0_token: tokenInput,
      input1_amount: amountStr,
      input2_proofs: proofsEncoded,
    });

    const result = await executeTransaction({
      program: USDC_LENDING_POOL_PROGRAM_ID,
      function: 'deposit',
      inputs,
      fee: DEFAULT_LENDING_FEE * 1_000_000,
      privateFee: false,
    });
    const tempId = result?.transactionId;
    if (!tempId) throw new Error('Deposit failed: No transactionId returned.');
    return tempId;
  } catch (error: any) {
    return handleUsdcTxError(error, 'USDC deposit');
  }
}

/**
 * USDC repay: lending_pool_usdce_v86.aleo/repay(token, amount, proofs) — 3 inputs.
 * Amount in human USDC; converted to micro-USDC for the program.
 */
export async function lendingRepayUsdc(
  executeTransaction: ((tx: any) => Promise<any>) | undefined,
  amount: number,
  tokenRecord: any,
  proofs?: [string, string] | string
): Promise<string> {
  if (!executeTransaction) throw new Error('executeTransaction is not available.');
  if (amount <= 0) throw new Error('Repay amount must be greater than 0');
  if (tokenRecord == null) throw new Error('A USDC Token record is required for repay.');
  try {
    const tokenInput = getUsdcTokenInputForTransition(tokenRecord);
    if (tokenInput === '' || (typeof tokenInput === 'string' && !String(tokenInput).trim())) {
      throw new Error('USDC Token record has no ciphertext or plaintext. Ensure the record is from test_usdcx_stablecoin.aleo and try again.');
    }
    const amountMicro = Math.round(amount * 1_000_000);
    const amountStr = `${amountMicro}u64`;
    let proofsEncoded: string;
    if (typeof proofs === 'string' && proofs.trim().startsWith('[') && proofs.includes('siblings')) {
      proofsEncoded = proofs.trim();
    } else {
      const proofsInput = Array.isArray(proofs) && proofs.length >= 2
        ? [String(proofs[0]).trim(), String(proofs[1]).trim()]
        : ['', ''];
      proofsEncoded =
        proofsInput.every(Boolean) && proofsInput[0] && proofsInput[1]
          ? (proofsInput[0].startsWith('{') ? `[${proofsInput[0]}, ${proofsInput[1]}]` : proofsInput.join(','))
          : DEFAULT_USDC_MERKLE_PROOFS;
    }
    const inputs: (string | any)[] = [tokenInput, amountStr, proofsEncoded];

    console.log('[USDC repay] All 3 inputs:', {
      input0_token: tokenInput,
      input1_amount: amountStr,
      input2_proofs: proofsEncoded,
    });

    const result = await executeTransaction({
      program: USDC_LENDING_POOL_PROGRAM_ID,
      function: 'repay',
      inputs,
      fee: DEFAULT_LENDING_FEE * 1_000_000,
      privateFee: false,
    });
    const tempId = result?.transactionId;
    if (!tempId) throw new Error('Repay failed: No transactionId returned.');
    return tempId;
  } catch (error: any) {
    return handleUsdcTxError(error, 'USDC repay');
  }
}

export async function lendingWithdrawUsdc(
  executeTransaction: ((tx: any) => Promise<any>) | undefined,
  amount: number,
): Promise<string> {
  if (!executeTransaction) throw new Error('executeTransaction is not available.');
  if (amount <= 0) throw new Error('Withdraw amount must be greater than 0');
  try {
    const amountMicro = Math.round(amount * 1_000_000);
    const inputs = [`${amountMicro}u64`];
    const result = await executeTransaction({
      program: USDC_LENDING_POOL_PROGRAM_ID,
      function: 'withdraw',
      inputs,
      fee: DEFAULT_LENDING_FEE * 1_000_000,
      privateFee: false,
    });
    const tempId = result?.transactionId;
    if (!tempId) throw new Error('Withdraw failed: No transactionId returned.');
    return tempId;
  } catch (error: any) {
    return handleUsdcTxError(error, 'USDC withdraw');
  }
}

export async function lendingBorrowUsdc(
  executeTransaction: ((tx: any) => Promise<any>) | undefined,
  amount: number,
): Promise<string> {
  if (!executeTransaction) throw new Error('executeTransaction is not available.');
  if (amount <= 0) throw new Error('Borrow amount must be greater than 0');
  try {
    const amountMicro = Math.round(amount * 1_000_000);
    const inputs = [`${amountMicro}u64`];
    const result = await executeTransaction({
      program: USDC_LENDING_POOL_PROGRAM_ID,
      function: 'borrow',
      inputs,
      fee: DEFAULT_LENDING_FEE * 1_000_000,
      privateFee: false,
    });
    const tempId = result?.transactionId;
    if (!tempId) throw new Error('Borrow failed: No transactionId returned.');
    return tempId;
  } catch (error: any) {
    return handleUsdcTxError(error, 'USDC borrow');
  }
}

/**
 * Accrue interest on the Aleo pool (v86) using wallet adapter.
 * accrue_interest() — updates liquidity_index and borrow_index using on-chain block.height.
 * Anyone can call; indices are also updated automatically on every deposit, borrow, repay, withdraw.
 */
export async function lendingAccrueInterest(
  executeTransaction: ((tx: any) => Promise<any>) | undefined,
): Promise<string> {
  console.log('========================================');
  console.log('📈 LENDING ACCRUE INTEREST FUNCTION CALLED (Aleo pool)');
  console.log('========================================');
  console.log('📥 Input Parameters:', {
    network: CURRENT_NETWORK,
    programId: LENDING_POOL_PROGRAM_ID,
  });

  if (!executeTransaction) {
    throw new Error('executeTransaction is not available from the connected wallet.');
  }
  const fee = DEFAULT_LENDING_FEE * 1_000_000;

  try {
    const inputs: string[] = [];
    console.log('💰 Transaction Configuration:', {
      inputs,
      fee: `${fee} microcredits`,
    });

    console.log('🔍 Calling executeTransaction for accrue_interest (public fee)...');
    const result = await executeTransaction({
      program: LENDING_POOL_PROGRAM_ID,
      function: 'accrue_interest',
      inputs,
      fee,
      privateFee: false,
    });

    const tempId: string | undefined = result?.transactionId;
    if (!tempId) {
      throw new Error('Accrue interest failed: No temporary transactionId returned from wallet.');
    }

    console.log('Temporary Transaction ID (accrue_interest):', tempId);
    console.log('========================================\n');
    return tempId;
  } catch (error: any) {
    console.error('========================================');
    console.error('❌ LENDING ACCRUE INTEREST FUNCTION FAILED');
    console.error('========================================');
    console.error('📋 Error Details:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      error: error,
    });
    console.error('========================================\n');

    const rawMsg = String(error?.message || error || '').toLowerCase();
    const isCancelled =
      rawMsg.includes('operation was cancelled by the user') ||
      rawMsg.includes('operation was canceled by the user') ||
      rawMsg.includes('user cancelled') ||
      rawMsg.includes('user canceled') ||
      rawMsg.includes('user rejected') ||
      rawMsg.includes('rejected by user') ||
      rawMsg.includes('transaction cancelled by user');

    if (isCancelled) {
      console.warn('💡 Accrue interest transaction cancelled by user (handled gracefully).');
      return '__CANCELLED__';
    }

    throw new Error(`Accrue interest transaction failed: ${error?.message || 'Unknown wallet error'}`);
  }
}

/**
 * Accrue interest on the USDC pool (lending_pool_usdce_v86.aleo). Same signature as Aleo pool.
 */
export async function lendingAccrueInterestUsdc(
  executeTransaction: ((tx: any) => Promise<any>) | undefined,
): Promise<string> {
  if (!executeTransaction) throw new Error('executeTransaction is not available.');
  const fee = DEFAULT_LENDING_FEE * 1_000_000;
  try {
    const result = await executeTransaction({
      program: USDC_LENDING_POOL_PROGRAM_ID,
      function: 'accrue_interest',
      inputs: [],
      fee,
      privateFee: false,
    });
    const tempId = result?.transactionId;
    if (!tempId) throw new Error('USDC accrue interest failed: No transactionId returned.');
    return tempId;
  } catch (error: any) {
    const rawMsg = String(error?.message || error || '').toLowerCase();
    const isCancelled =
      rawMsg.includes('operation was cancelled by the user') ||
      rawMsg.includes('user cancelled') || rawMsg.includes('user rejected');
    if (isCancelled) return '__CANCELLED__';
    throw new Error(`USDC accrue interest failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Read global pool state from mappings for a given program.
 * Keys are always GLOBAL_KEY = 0u8 in the Leo program.
 * v85 (lending_pool_v85.aleo) also has liquidity_index and borrow_index for interest/APY.
 */
export async function getLendingPoolStateForProgram(programId: string): Promise<{
  totalSupplied: string | null;
  totalBorrowed: string | null;
  utilizationIndex: string | null;
  interestIndex: string | null;
  liquidityIndex: string | null;
  borrowIndex: string | null;
}> {
  const key = '0field';

  try {
    const requestWithErrorHandling = async (mappingName: string) => {
      try {
        return await Promise.resolve(client.request('getMappingValue', {
          program_id: programId,
          mapping_name: mappingName,
          key,
        }));
      } catch (err: any) {
        console.warn(`getLendingPoolStateForProgram(${programId}): Failed to fetch ${mappingName}:`, err?.message);
        return null;
      }
    };

    const [supplied, borrowed, utilization, interest, liquidityIdx, borrowIdx] = await Promise.all([
      requestWithErrorHandling('total_deposited'),
      requestWithErrorHandling('total_borrowed'),
      requestWithErrorHandling('available_liquidity'),
      requestWithErrorHandling('last_accrual_block'),
      requestWithErrorHandling('supply_index'),
      requestWithErrorHandling('borrow_index'),
    ]);

    const extract = (res: any): string | null => {
      if (res == null) return null;
      const raw = res.value ?? res ?? null;
      if (raw == null) return null;
      const str = String(raw);
      return str.replace(/u64$/i, '');
    };

    return {
      totalSupplied: extract(supplied),
      totalBorrowed: extract(borrowed),
      utilizationIndex: extract(utilization),
      interestIndex: extract(interest),
      liquidityIndex: extract(liquidityIdx),
      borrowIndex: extract(borrowIdx),
    };
  } catch (error: any) {
    console.error('getLendingPoolStateForProgram: Error fetching pool state:', error);
    return {
      totalSupplied: null,
      totalBorrowed: null,
      utilizationIndex: null,
      interestIndex: null,
      liquidityIndex: null,
      borrowIndex: null,
    };
  }
}

/**
 * Read global pool state for the Aleo pool (lending_pool_v91.aleo).
 */
export async function getLendingPoolState(): Promise<{
  totalSupplied: string | null;
  totalBorrowed: string | null;
  utilizationIndex: string | null;
  interestIndex: string | null;
  liquidityIndex: string | null;
  borrowIndex: string | null;
}> {
  return getLendingPoolStateForProgram(LENDING_POOL_PROGRAM_ID);
}

/**
 * Read global pool state for the USDC pool (lending_pool_usdce_v86.aleo).
 */
export async function getUsdcLendingPoolState(): Promise<{
  totalSupplied: string | null;
  totalBorrowed: string | null;
  utilizationIndex: string | null;
  interestIndex: string | null;
  liquidityIndex: string | null;
  borrowIndex: string | null;
}> {
  return getLendingPoolStateForProgram(USDC_LENDING_POOL_PROGRAM_ID);
}

// --- v86 interest/APY constants (match program lending_pool_v91.aleo) ---
const INDEX_SCALE_ALEO = 1_000_000_000_000; // 1e12
const SCALE_ALEO = 1_000_000; // 1e6
const BASE_RATE_PER_BLOCK_ALEO = 1000;
const SLOPE_PER_UTIL_ALEO = 6667;
const RESERVE_FACTOR_BPS_ALEO = 1000;
/** Approximate blocks per year (e.g. 15s block time => 2_102_400). */
export const BLOCKS_PER_YEAR_ALEO = 365 * 24 * 60 * 4; // 4 blocks/min => 2_102_400

/**
 * Compute supply and borrow APY from pool state (v85 rate model).
 * Program accrual: bi_new = bi + (bi * br * delta) / INDEX_SCALE, so rate per block = br/INDEX_SCALE (not br/SCALE).
 * br = BASE_RATE_PER_BLOCK + (SLOPE_PER_UTIL * util) / SCALE  [in SCALE units]
 * sr = (br * util * (10000 - RESERVE_FACTOR_BPS)) / (SCALE * 10000)  [in SCALE units]
 * APY = rate_per_block * blocks_per_year (simple-interest; matches program accrual scale).
 */
export function computeAleoPoolAPY(
  totalSupplied: number | string,
  totalBorrowed: number | string,
  blocksPerYear: number = BLOCKS_PER_YEAR_ALEO
): { supplyAPY: number; borrowAPY: number } {
  const ts = Number(totalSupplied) || 0;
  const tb = Number(totalBorrowed) || 0;
  if (ts <= 0) {
    return { supplyAPY: 0, borrowAPY: 0 };
  }
  const util = tb / ts; // 0..1
  const utilScaled = Math.floor(util * SCALE_ALEO); // u64-style in JS
  const br =
    BASE_RATE_PER_BLOCK_ALEO + (SLOPE_PER_UTIL_ALEO * utilScaled) / SCALE_ALEO;
  const sr =
    (br * util * (10000 - RESERVE_FACTOR_BPS_ALEO)) / 10000;
  // Program uses INDEX_SCALE in accrual: (index * rate * delta) / INDEX_SCALE => rate_per_block = rate/INDEX_SCALE
  const borrowRatePerBlock = br / INDEX_SCALE_ALEO;
  const supplyRatePerBlock = sr / INDEX_SCALE_ALEO;
  const borrowAPY = borrowRatePerBlock * blocksPerYear;
  const supplyAPY = supplyRatePerBlock * blocksPerYear;
  return { supplyAPY, borrowAPY };
}

/** Same rate model as Aleo pool (v86); USDC pool uses identical constants. */
export const computeUsdcPoolAPY = computeAleoPoolAPY;

/**
 * Effective supply balance = (user_scaled_supply * liquidity_index) / INDEX_SCALE.
 * Effective borrow debt = (user_scaled_borrow * borrow_index) / INDEX_SCALE.
 * Returns null if user hash cannot be computed (frontend falls back to record-based position).
 */
export async function getAleoPoolUserEffectivePosition(
  programId: string,
  userAddress: string
): Promise<{ effectiveSupplyBalance: number; effectiveBorrowDebt: number } | null> {
  const userHash = computeAddressHash(userAddress);
  if (!userHash) return null;
  try {
    const requestWithErrorHandling = async (mappingName: string, key: string) => {
      try {
        const res = await client.request('getMappingValue', {
          program_id: programId,
          mapping_name: mappingName,
          key,
        });
        const raw = res?.value ?? res ?? null;
        if (raw == null) return null;
        const str = String(raw).replace(/u64$/i, '');
        return str ? BigInt(str) : null;
      } catch {
        return null;
      }
    };
    const globalKey = '0field';
    const [scaledSupply, scaledBorrow, liquidityIndex, borrowIndex] = await Promise.all([
      requestWithErrorHandling('user_scaled_supply', userHash),
      requestWithErrorHandling('user_scaled_borrow', userHash),
      requestWithErrorHandling('supply_index', globalKey),
      requestWithErrorHandling('borrow_index', globalKey),
    ]);
    const li = liquidityIndex ?? BigInt(INDEX_SCALE_ALEO);
    const bi = borrowIndex ?? BigInt(INDEX_SCALE_ALEO);
    const ss = scaledSupply ?? BigInt(0);
    const sb = scaledBorrow ?? BigInt(0);
    const effectiveSupplyBalance = Number((ss * li) / BigInt(INDEX_SCALE_ALEO));
    const effectiveBorrowDebt = Number((sb * bi) / BigInt(INDEX_SCALE_ALEO));
    return { effectiveSupplyBalance, effectiveBorrowDebt };
  } catch {
    return null;
  }
}

/**
 * Get address hash from contract (helper function for v8).
 * Calls: lending_pool_v8.aleo/get_address_hash() -> field
 */
export async function getAddressHashFromContract(
  requestTransaction: ((transaction: any) => Promise<string>) | undefined,
  publicKey: string,
  requestTransactionHistory?: (program: string) => Promise<any[]>
): Promise<string | null> {
  if (!requestTransaction || !publicKey) {
    throw new Error('Wallet not connected or requestTransaction unavailable');
  }

  try {
    const inputs: string[] = [];
    const fee = DEFAULT_LENDING_FEE * 1_000_000;
    const chainId = CURRENT_NETWORK === Network.TESTNET 
      ? Network.TESTNET 
      : String(CURRENT_NETWORK);
    
    const transaction = {
      programId: LENDING_POOL_PROGRAM_ID,
      functionName: 'get_address_hash',
      inputs,
      fee,
      chainId,
    };
    
    const txId = await requestTransaction(transaction);
    console.log('✅ get_address_hash transaction submitted:', txId);
    
    // Wait for transaction to finalize and extract hash from output
    // Note: This is a simplified version - you may need to adjust based on actual transaction output format
    return txId;
  } catch (error: any) {
    console.error('getAddressHashFromContract failed:', error);
    return null;
  }
}

/**
 * Get user activity from contract (helper function for v8).
 * Calls: lending_pool_v8.aleo/get_user_activity() -> (UserActivity, Future)
 */
export async function getUserActivityFromContract(
  requestTransaction: ((transaction: any) => Promise<string>) | undefined,
  publicKey: string
): Promise<string | null> {
  if (!requestTransaction || !publicKey) {
    throw new Error('Wallet not connected or requestTransaction unavailable');
  }

  try {
    const inputs: string[] = [];
    const fee = DEFAULT_LENDING_FEE * 1_000_000;
    const chainId = CURRENT_NETWORK === Network.TESTNET 
      ? Network.TESTNET 
      : String(CURRENT_NETWORK);
    
    const transaction = {
      programId: LENDING_POOL_PROGRAM_ID,
      functionName: 'get_user_activity',
      inputs,
      fee,
      chainId,
    };
    
    const txId = await requestTransaction(transaction);
    console.log('✅ get_user_activity transaction submitted:', txId);
    
    return txId;
  } catch (error: any) {
    console.error('getUserActivityFromContract failed:', error);
    return null;
  }
}

/**
 * Create test credits (for testing only - v8 does not have this function).
 * Note: v8 does not have create_test_credits function
 */
export async function createTestCredits(
  requestTransaction: ((transaction: any) => Promise<string>) | undefined,
  publicKey: string,
  amount: number
): Promise<string> {
  // Note: v8 does not have create_test_credits function
  // This function is kept for backward compatibility but will throw an error
  throw new Error('v8 does not support create_test_credits. Use actual credits.aleo records from your wallet.');
}

/**
 * Deposit test with real credits (for testing only - v8 does not have this function).
 * Note: v8 does not have deposit_test function
 */
export async function depositTestReal(
  requestTransaction: ((transaction: any) => Promise<string>) | undefined,
  publicKey: string,
  amount: number,
  requestRecords?: (program: string, includeSpent?: boolean) => Promise<any[]>
): Promise<string> {
  // Note: v8 does not have deposit_test function
  // This function is kept for backward compatibility but will throw an error
  throw new Error('v8 does not support deposit_test. Use the regular deposit function instead.');
}

/**
 * Repay borrowed amount to the pool using wallet adapter.
export async function lendingRepay(
  requestTransaction: ((transaction: any) => Promise<string>) | undefined,
  publicKey: string,
  amount: number,
  requestRecords?: (program: string, includeSpent?: boolean) => Promise<any[]>
): Promise<string> {
  console.log('========================================');
  console.log('💰 LENDING REPAY FUNCTION CALLED (Option 1 - Real Tokens)');
  console.log('========================================');
  
  if (!requestTransaction || !publicKey) {
    throw new Error('Wallet not connected or requestTransaction unavailable');
  }

  if (!requestRecords) {
    throw new Error('requestRecords is not available. Please ensure your wallet is connected.');
  }

  const chainId = CURRENT_NETWORK === Network.TESTNET 
    ? Network.TESTNET 
    : String(CURRENT_NETWORK);
  
  const fee = DEFAULT_LENDING_FEE * 1_000_000;

  try {
    // Option 1: Fetch credits record from wallet (real Aleo tokens)
    console.log('🔍 Step 1: Fetching credits records from wallet...');
    console.log('📋 Credits Program ID:', CREDITS_PROGRAM_ID);
    console.log('📋 requestRecords function:', typeof requestRecords);
    
    // Convert amount (in credits) to microcredits (1 credit = 1_000_000 microcredits)
    const requiredMicrocredits = amount * 1_000_000;
    
    // Fetch all credits records from wallet
    let allCreditsRecords: any[] = [];
    try {
      // requestRecords takes two parameters: (programId: string, includeSpent?: boolean)
      // includeSpent: false = only unspent records, true = include spent records
      allCreditsRecords = await requestRecords(CREDITS_PROGRAM_ID, false);
      console.log(`📋 requestRecords returned:`, {
        isArray: Array.isArray(allCreditsRecords),
        length: allCreditsRecords?.length || 0,
        type: typeof allCreditsRecords,
        firstRecord: allCreditsRecords?.[0] ? JSON.stringify(allCreditsRecords[0]).substring(0, 200) : 'none',
      });
    } catch (recordsError: any) {
      console.error('❌ Error fetching credits records:', {
        message: recordsError?.message,
        error: recordsError,
      });
      // PHASE 3: Provide helpful error message with test credits option
      console.log('💡 PHASE 3: No credits records found for repay. For testing:');
        console.log('   Get Aleo credits from: https://faucet.aleo.org/ (testnet)');
        console.log('   Wait 10-30 seconds after receiving credits for wallet to index them');
        throw new Error(
          `No credits.aleo records found in wallet. ` +
          `Please: 1) Get Aleo credits from the testnet faucet (https://faucet.aleo.org/), ` +
          `2) Wait 10-30 seconds for wallet to index the new records, ` +
          `3) Then try repay again. ` +
          `Required: ${requiredMicrocredits} microcredits (${amount} credits) + ${fee / 1_000_000} credits fee. ` +
          `Error: ${recordsError?.message || 'Unknown error'}`
        );
    }
    
    if (!allCreditsRecords || !Array.isArray(allCreditsRecords) || allCreditsRecords.length === 0) {
      if (DISABLE_CREDITS_CHECK) {
        console.warn('⚠️ CREDITS CHECK DISABLED: No credits records found, but check is disabled. Creating mock record for testing.');
        // Create a mock credits record structure for testing
        allCreditsRecords = [{
          data: {
            owner: publicKey,
            microcredits: `${requiredMicrocredits + fee}u64.private`,
          },
          spent: false,
          program_id: CREDITS_PROGRAM_ID,
        }];
        console.log('📋 Created mock credits record:', allCreditsRecords[0]);
      } else {
        console.error('❌ No credits records found:', {
          allCreditsRecords,
          isArray: Array.isArray(allCreditsRecords),
          length: allCreditsRecords?.length,
        });
        throw new Error(
          'No credits records found in wallet. ' +
          'Please ensure: 1) You have Aleo credits in your wallet, 2) Your wallet is connected, ' +
          '3) You have granted record access permissions to the app.'
        );
      }
    }
    
    console.log(`📋 Found ${allCreditsRecords.length} total credits records`);
    
    // Log record structure for debugging
    if (allCreditsRecords.length > 0) {
      console.log('📋 Sample record structure:', {
        record: allCreditsRecords[0],
        hasData: !!allCreditsRecords[0]?.data,
        hasMicrocredits: !!allCreditsRecords[0]?.data?.microcredits,
        microcreditsValue: allCreditsRecords[0]?.data?.microcredits,
        spent: allCreditsRecords[0]?.spent,
        keys: Object.keys(allCreditsRecords[0] || {}),
      });
    }
    
    // Filter for private, unspent records
    // Try multiple record formats
    const privateRecords = allCreditsRecords.filter((record: any) => {
      // Check if record has microcredits field (could be in data or directly on record)
      const microcredits = record.data?.microcredits || record.microcredits;
      const isPrivate = microcredits && (
        typeof microcredits === 'string' && microcredits.endsWith('u64.private')
      );
      return isPrivate;
    });
    
    console.log(`📋 Found ${privateRecords.length} private credits records`);
    
    const unspentRecords = privateRecords.filter((record: any) => {
      const spent = record.spent === false || record.spent === undefined || record.data?.spent === false;
      return spent;
    });
    
    console.log(`📋 Found ${unspentRecords.length} unspent private credits records`);
    
    if (unspentRecords.length === 0) {
      // Provide more helpful error message
      const allSpent = privateRecords.length > 0 && privateRecords.every((r: any) => r.spent === true);
      if (DISABLE_CREDITS_CHECK) {
        console.warn('⚠️ CREDITS CHECK DISABLED: No unspent records, but check is disabled. Creating mock record for testing.');
        // Create a mock unspent record
        unspentRecords.push({
          data: {
            owner: publicKey,
            microcredits: `${requiredMicrocredits + fee}u64.private`,
          },
          spent: false,
          program_id: CREDITS_PROGRAM_ID,
        });
        console.log('📋 Created mock unspent credits record');
      } else {
        if (allSpent) {
          throw new Error('All credits records are already spent. Please wait for new records or receive more credits.');
        } else {
          throw new Error(
            'No unspent credits records available. ' +
            `Found ${privateRecords.length} private records but all are marked as spent. ` +
            'Please ensure you have available Aleo credits in your wallet.'
          );
        }
      }
    }
    
    // Helper to extract microcredits value
    const extractMicrocredits = (valueStr: string | undefined): number => {
      if (!valueStr || typeof valueStr !== 'string') return 0;
      const match = valueStr.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };
    
    // Find a record with enough microcredits (including fee)
    const totalNeeded = requiredMicrocredits + fee;
    console.log('💰 Credit requirements:', {
      amount: `${amount} credits`,
      requiredMicrocredits: `${requiredMicrocredits} microcredits`,
      fee: `${fee} microcredits`,
      totalNeeded: `${totalNeeded} microcredits (${totalNeeded / 1_000_000} credits)`,
    });
    
    let suitableRecord = unspentRecords.find((record: any) => {
      // Try both record.data.microcredits and record.microcredits
      const microcreditsStr = record.data?.microcredits || record.microcredits;
      const recordMicrocredits = extractMicrocredits(microcreditsStr);
      console.log('🔍 Checking record:', {
        microcreditsStr,
        recordMicrocredits,
        totalNeeded,
        sufficient: recordMicrocredits >= totalNeeded,
      });
      return recordMicrocredits >= totalNeeded;
    });
    
    if (!suitableRecord) {
      const recordAmounts = unspentRecords.map((r: any) => {
        const microcreditsStr = r.data?.microcredits || r.microcredits;
        return extractMicrocredits(microcreditsStr);
      });
      const maxAvailable = recordAmounts.length > 0 ? Math.max(...recordAmounts) : 0;
      const totalAvailable = recordAmounts.reduce((sum, amt) => sum + amt, 0);
      
      console.error('❌ No suitable record found:', {
        totalNeeded: `${totalNeeded} microcredits`,
        maxAvailable: `${maxAvailable} microcredits`,
        totalAvailable: `${totalAvailable} microcredits`,
        recordAmounts,
      });
      
      throw new Error(
        `Insufficient credits. Need ${totalNeeded / 1_000_000} credits (${amount} repay + ${fee / 1_000_000} fee), ` +
        `but largest available record has ${maxAvailable / 1_000_000} credits. ` +
        `Total available: ${totalAvailable / 1_000_000} credits across ${unspentRecords.length} records.`
      );
    }
    
    console.log('✅ Found suitable credits record:', {
      microcredits: suitableRecord.data?.microcredits || suitableRecord.microcredits,
      owner: suitableRecord.data?.owner || suitableRecord.owner,
      recordStructure: Object.keys(suitableRecord),
    });
    
    // Prepare the credits record for the transaction
    // The record format should match what the contract expects
    // Contract expects: { owner: address, microcredits: u64 }
    // When fetched from wallet, records have owner at top level and data fields nested
    // IMPORTANT: Pass as Leo record literal STRING with .private visibility modifiers
    // PHASE 3: Pass the record object directly to wallet adapter
    // The wallet adapter expects the actual record object from requestRecords, not a string
    console.log('✅ Using Credits Record Object for Transaction:', {
      recordId: suitableRecord.id,
      owner: suitableRecord.owner || suitableRecord.data?.owner,
      microcredits: suitableRecord.data?.microcredits || suitableRecord.microcredits,
      programId: suitableRecord.program_id,
      recordName: suitableRecord.recordName,
      spent: suitableRecord.spent,
    });
    
    // Call repay transition with amount and credits record object
    // Contract validates record owner and amount, then consumes the record
    // Pass record object directly (wallet adapter handles serialization)
    const repayInputs = [`${amount}u64`, suitableRecord];
    
    console.log('lendingRepay: Transaction inputs:', {
      amount: `${amount} credits`,
      requiredMicrocredits: `${requiredMicrocredits} microcredits`,
      fee: `${fee} microcredits`,
      creditsRecord: '[Record Object]',
      recordId: suitableRecord.id,
      programId: LENDING_POOL_PROGRAM_ID,
      chainId,
    });
    
    console.log('🔍 Step 2: Creating transaction object...');
    const repayTransaction = Transaction.createTransaction(
      publicKey,
      chainId,
      LENDING_POOL_PROGRAM_ID,
      'repay',
      repayInputs,
      fee,
      false
    );

    console.log('✅ Transaction object created');
    console.log('🔍 Step 3: Requesting transaction signature from wallet...');
    const repayTxId = await requestTransaction(repayTransaction);
    console.log('✅ Transaction submitted successfully!');
    console.log('📤 Transaction ID:', repayTxId);
    
    return repayTxId;
  } catch (error: any) {
    console.error('========================================');
    console.error('❌ LENDING REPAY FUNCTION FAILED');
    console.error('========================================');
    console.error('📋 Error Details:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      error: error,
    });
    console.error('========================================\n');
    throw new Error(`Repay transaction failed: ${error?.message || 'Unknown wallet error'}`);
  }
}

/**
 * Withdraw supplied liquidity from the pool using wallet adapter.
 * Following basic_bank.aleo pattern - contract reads user data from mappings automatically.
 * - Updates public pool state (total_supplied, utilization_index)
 * - Updates private user mappings (increments total_withdrawals counter)
 * Returns: (UserActivity, Future) - both updated in one transaction
 * No need to pass old_activity - contract reads from mappings using hashed address
 */

/**
 * Accrue interest on the pool using wallet adapter.
 * Calls: lending_pool_v8.aleo/accrue_interest(public delta_index: u64) -> Future
 */

// Cache for address hashes to avoid recomputing
const addressHashCache = new Map<string, string>();

/**
 * Compute BHP256 hash of an Aleo address directly in JavaScript (no transaction needed!).
 * 
 * This computes BHP256::hash_to_field(address) which is used as the key
 * for reading user activity from public mappings.
 * 
 * Uses @aleohq/wasm library to compute the hash client-side.
 * The hash is cached to avoid recomputing.
 * 
 * @param address - Aleo address (aleo1...)
 * @returns Hash as field value (string representation), or null if failed
 */
function computeAddressHash(address: string): string | null {
  try {
    // Check cache first
    if (addressHashCache.has(address)) {
      const cachedHash = addressHashCache.get(address);
      console.log('computeAddressHash: Using cached hash for:', address);
      return cachedHash || null;
    }
    
    console.log('computeAddressHash: BHP256 hash computation via @aleohq/wasm is currently disabled');
    console.log('computeAddressHash: Reason: WASM build issues in Next.js (wbg module resolution)');
    console.log('computeAddressHash: Falling back to contract call method or records method');
    
    // TODO: Once @aleohq/wasm is properly configured with Next.js, implement BHP256 hashing here
    // The implementation would be:
    // 1. Dynamically import @aleohq/wasm (to avoid build-time issues)
    // 2. Use Address.from_string(address)
    // 3. Call BHP256::hash_to_field() equivalent
    // 4. Return the hash as a field string
    
    return null;
  } catch (error) {
    console.error('computeAddressHash: Failed to compute hash:', error);
    return null;
  }
}

/**
 * Read user's activity from UserActivity records returned by contract transitions.
/**
 * Read user's activity from UserActivity records returned by contract transitions.
 * 
 * IMPORTANT: The records returned by contract transitions show the LATEST transaction amounts,
 * not cumulative totals. The contract updates mappings correctly, but the returned records
 * are placeholders showing only the current transaction.
 * 
 * For EXACT cumulative values, we need to read from mappings using the hash method.
 * However, for simplicity, this function reads from records (which show latest transaction).
 * 
 * @param publicKey - User's Aleo address (aleo1...)
 * @param requestRecords - Function from useWallet() to request records (required)
 * @param requestTransaction - Function to call contract transitions (optional, for hash method)
 */
export async function getUserPosition(
  publicKey?: string,
  requestRecords?: (program: string, includeSpent?: boolean) => Promise<any[]>,
  requestTransaction?: ((transaction: any) => Promise<string>) | undefined,
  transactionStatus?: (txId: string) => Promise<any>,
  requestTransactionHistory?: (programId: string) => Promise<any[]>
): Promise<{
  supplied: string | null;
  borrowed: string | null;
  totalDeposits: string | null;
  totalWithdrawals: string | null;
  totalBorrows: string | null;
  totalRepayments: string | null;
}> {
  // Note: The contract returns UserActivity records, but they are placeholders (show current transaction, not cumulative)
  // The actual cumulative values are in mappings, which require hash computation to read
  // For simplicity, we'll read from records (which show latest transaction amounts)
  // The contract logic correctly updates mappings in finalize functions
  
  // Fallback: Read from records (may be placeholders, but better than nothing)
  if (!requestRecords) {
    console.warn('getUserPosition: requestRecords not available');
    return { 
      supplied: '0', 
      borrowed: '0',
      totalDeposits: '0',
      totalWithdrawals: '0',
      totalBorrows: '0',
      totalRepayments: '0',
    };
  }
  if (!requestRecords) {
    console.warn('getUserPosition: requestRecords not available');
    return { 
      supplied: '0', 
      borrowed: '0',
      totalDeposits: '0',
      totalWithdrawals: '0',
      totalBorrows: '0',
      totalRepayments: '0',
    };
  }

  try {
    // Request all UserActivity records from the wallet for lending_pool_v8.aleo
    // These are PRIVATE records - only visible to the wallet owner
    console.log('========================================');
    console.log('🔍 getUserPosition: RECORD FETCH DEBUG');
    console.log('========================================');
    console.log('Step 1: Calling requestRecords with program ID:', LENDING_POOL_PROGRAM_ID);
    console.log('User Address:', publicKey);
    console.log('requestRecords function type:', typeof requestRecords);
    
    // Request records from current program only (lending_pool_v8.aleo)
    let records: any[] | null = null;
    
    try {
      console.log('Requesting records for program:', LENDING_POOL_PROGRAM_ID);
      // requestRecords takes two parameters: (programId: string, includeSpent?: boolean)
      records = await requestRecords(LENDING_POOL_PROGRAM_ID, false);
      console.log('requestRecords returned:', records?.length || 0, 'records');
      
      if (records && Array.isArray(records) && records.length > 0) {
        console.log('✅ Successfully got records from current program');
      } else {
        console.warn('⚠️ No records found for current program');
      }
    } catch (recordsError: any) {
      console.warn('requestRecords failed:', recordsError?.message);
      records = null;
    }
    
    console.log('Final records result:');
    console.log('  - Records:', records);
    console.log('  - Is Array:', Array.isArray(records));
    console.log('  - Records Count:', records?.length || 0);
    console.log('  - Records Type:', typeof records);
    console.log('  - Is Null:', records === null);
    console.log('  - Is Undefined:', records === undefined);
    console.log('  - Full Records (first 1000 chars):', JSON.stringify(records, null, 2).substring(0, 1000));
    console.log('========================================');
    
    // Check if records is null, undefined, or empty
    if (records === null || records === undefined) {
      console.error('❌ getUserPosition: requestRecords returned null or undefined');
      console.error('This might mean:');
      console.error('  1. The wallet has not indexed records yet');
      console.error('  2. requestRecords function is not working correctly');
      console.error('  3. Permission issue with the wallet');
      return { 
        supplied: '0', 
        borrowed: '0',
        totalDeposits: '0',
        totalWithdrawals: '0',
        totalBorrows: '0',
        totalRepayments: '0',
      };
    }
    
    if (!Array.isArray(records)) {
      console.error('❌ getUserPosition: requestRecords did not return an array');
      console.error('Returned type:', typeof records);
      console.error('Returned value:', records);
      // Try to convert to array if it's an object
      if (records && typeof records === 'object') {
        console.log('Attempting to convert object to array...');
        records = Object.values(records);
        console.log('Converted records:', records);
      } else {
        return { 
          supplied: '0', 
          borrowed: '0',
          totalDeposits: '0',
          totalWithdrawals: '0',
          totalBorrows: '0',
          totalRepayments: '0',
        };
      }
    }
    
    if (records.length === 0) {
      console.error('❌ getUserPosition: NO RECORDS FOUND (array is empty)');
      console.error('This means the wallet has not indexed the UserActivity record yet.');
      console.error('Solutions:');
      console.error('  1. Wait 10-30 seconds after transaction finalizes');
      console.error('  2. Disconnect and reconnect wallet');
      console.error('  3. Check if transaction actually completed on explorer');
      console.error('  4. Check wallet activity view to see if records are there');
      return { 
        supplied: '0', 
        borrowed: '0',
        totalDeposits: '0',
        totalWithdrawals: '0',
        totalBorrows: '0',
        totalRepayments: '0',
      };
    }

    // Calculate CUMULATIVE totals by summing ALL UserActivity records
    // Each transaction creates a new record with the transaction amount
    // Summing all records gives the cumulative total (matching the mappings)
    let cumulativeTotalDeposits = 0;
    let cumulativeTotalWithdrawals = 0;
    let cumulativeTotalBorrows = 0;
    let cumulativeTotalRepayments = 0;
    let recordsProcessed = 0;

    // Iterate through ALL records and sum them up
    console.log('📊 Processing', records.length, 'records...');
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        console.log(`\n--- Processing Record ${i + 1}/${records.length} ---`);
        console.log('Record type:', typeof record);
        console.log('Record:', record);
        
        let recordData: any;
        if (typeof record === 'string') {
          try {
            recordData = JSON.parse(record);
            console.log('Parsed from JSON string');
          } catch {
            recordData = { raw: record };
            console.log('Could not parse as JSON, treating as raw string');
          }
        } else {
          recordData = record;
          console.log('Record is already an object');
        }
        
        console.log('Record Data:', JSON.stringify(recordData, null, 2));
        console.log('Record Keys:', recordData ? Object.keys(recordData) : 'null');
        
        // Check if this is a UserActivity record - be more lenient
        const hasUserActivityFields = 
          (recordData.data && (
            recordData.data.total_deposits !== undefined || 
            recordData.data.total_withdrawals !== undefined ||
            recordData.data.total_borrows !== undefined ||
            recordData.data.total_repayments !== undefined
          )) ||
          (recordData.total_deposits !== undefined || 
           recordData.total_withdrawals !== undefined ||
           recordData.total_borrows !== undefined ||
           recordData.total_repayments !== undefined);
        
        const matchesProgram = 
          recordData.program_id === LENDING_POOL_PROGRAM_ID || 
          recordData.programId === LENDING_POOL_PROGRAM_ID ||
          recordData.program === LENDING_POOL_PROGRAM_ID;
        
        const isUserActivity = hasUserActivityFields || matchesProgram;
        
        console.log('Is UserActivity?', isUserActivity);
        console.log('  - Has UserActivity fields:', hasUserActivityFields);
        console.log('  - Matches program:', matchesProgram);
        
        if (isUserActivity || hasUserActivityFields) {
          console.log('✅ Found UserActivity record!');
          
          // Helper function to extract numeric value from various formats
          const extractValue = (value: any): number | undefined => {
            if (value === undefined || value === null) return undefined;
            
            // If it's already a number
            if (typeof value === 'number') {
              return isNaN(value) ? undefined : value;
            }
            
            // If it's a string, try to parse it
            if (typeof value === 'string') {
              // Handle formats like "100u64.private", "100u64", "100"
              // Remove ".private", ".public", "u64" suffixes
              const cleaned = value.replace(/\.(private|public)$/, '').replace(/u64$/, '').trim();
              const num = Number(cleaned);
              return isNaN(num) ? undefined : num;
            }
            
            return undefined;
          };
          
          // Try multiple possible record structures
          let totalDeposits: number | undefined;
          let totalWithdrawals: number | undefined;
          let totalBorrows: number | undefined;
          let totalRepayments: number | undefined;
          
          // Structure 1: recordData.data.total_deposits (nested data) - THIS IS THE ACTUAL FORMAT!
          if (recordData.data) {
            // Values are like "0u64.private" or "100u64.private"
            totalDeposits = extractValue(recordData.data.total_deposits);
            totalWithdrawals = extractValue(recordData.data.total_withdrawals);
            totalBorrows = extractValue(recordData.data.total_borrows);
            totalRepayments = extractValue(recordData.data.total_repayments);
            console.log('getUserPosition: Extracted from data - deposits:', totalDeposits, 'withdrawals:', totalWithdrawals, 'borrows:', totalBorrows, 'repayments:', totalRepayments);
          }
          
          // Structure 2: recordData.total_deposits (top level)
          if (totalDeposits === undefined && recordData.total_deposits !== undefined) {
            console.log('📦 Trying top-level total_deposits');
            totalDeposits = extractValue(recordData.total_deposits);
          }
          if (totalWithdrawals === undefined && recordData.total_withdrawals !== undefined) {
            totalWithdrawals = extractValue(recordData.total_withdrawals);
          }
          if (totalBorrows === undefined && recordData.total_borrows !== undefined) {
            totalBorrows = extractValue(recordData.total_borrows);
          }
          if (totalRepayments === undefined && recordData.total_repayments !== undefined) {
            totalRepayments = extractValue(recordData.total_repayments);
          }
          
          // Structure 3: Deep search in the object
          if (totalDeposits === undefined || totalWithdrawals === undefined || totalBorrows === undefined || totalRepayments === undefined) {
            const searchInObject = (obj: any, key: string): any => {
              if (!obj || typeof obj !== 'object') return undefined;
              if (key in obj) return obj[key];
              for (const k in obj) {
                if (typeof obj[k] === 'object') {
                  const found = searchInObject(obj[k], key);
                  if (found !== undefined) return found;
                }
              }
              return undefined;
            };
            
            if (totalDeposits === undefined) {
              totalDeposits = extractValue(searchInObject(recordData, 'total_deposits'));
            }
            if (totalWithdrawals === undefined) {
              totalWithdrawals = extractValue(searchInObject(recordData, 'total_withdrawals'));
            }
            if (totalBorrows === undefined) {
              totalBorrows = extractValue(searchInObject(recordData, 'total_borrows'));
            }
            if (totalRepayments === undefined) {
              totalRepayments = extractValue(searchInObject(recordData, 'total_repayments'));
            }
          }
          
          console.log('getUserPosition: Extracted values from record - deposits:', totalDeposits, 'withdrawals:', totalWithdrawals, 'borrows:', totalBorrows, 'repayments:', totalRepayments);
          
          // Sum up all values to get cumulative totals
          // Each record represents one transaction, so summing all gives cumulative
          if (totalDeposits !== undefined && !isNaN(totalDeposits)) {
            cumulativeTotalDeposits += totalDeposits;
          }
          if (totalWithdrawals !== undefined && !isNaN(totalWithdrawals)) {
            cumulativeTotalWithdrawals += totalWithdrawals;
          }
          if (totalBorrows !== undefined && !isNaN(totalBorrows)) {
            cumulativeTotalBorrows += totalBorrows;
          }
          if (totalRepayments !== undefined && !isNaN(totalRepayments)) {
            cumulativeTotalRepayments += totalRepayments;
          }
          
          recordsProcessed++;
          console.log('getUserPosition: Cumulative totals so far - deposits:', cumulativeTotalDeposits, 'withdrawals:', cumulativeTotalWithdrawals, 'borrows:', cumulativeTotalBorrows, 'repayments:', cumulativeTotalRepayments);
        }
      } catch (e) {
        // Skip records that can't be parsed
        console.warn('getUserPosition: Failed to parse record:', e, record);
      }
    }

    // Calculate net positions from the cumulative counters
    const calculatedNetSupplied = cumulativeTotalDeposits - cumulativeTotalWithdrawals;
    const calculatedNetBorrowed = cumulativeTotalBorrows - cumulativeTotalRepayments;

    console.log('========================================');
    console.log('📊 getUserPosition: CUMULATIVE TOTALS FROM RECORDS');
    console.log('========================================');
    console.log('📝 Records Processed:', recordsProcessed, 'out of', records.length);
    console.log('💰 Cumulative Activity Totals (Sum of All Records):');
    console.log('  - Total Deposits:', cumulativeTotalDeposits, '(sum of all deposit records)');
    console.log('  - Total Withdrawals:', cumulativeTotalWithdrawals, '(sum of all withdrawal records)');
    console.log('  - Total Borrows:', cumulativeTotalBorrows, '(sum of all borrow records)');
    console.log('  - Total Repayments:', cumulativeTotalRepayments, '(sum of all repay records)');
    console.log('📈 Net Positions:');
    console.log('  - Net Supplied:', calculatedNetSupplied, '(deposits - withdrawals)');
    console.log('  - Net Borrowed:', calculatedNetBorrowed, '(borrows - repayments)');
    console.log('========================================');
    console.log('ℹ️  Note: These are cumulative totals calculated by summing all UserActivity records.');
    console.log('ℹ️  Each transaction creates a new record, so summing all gives the cumulative total.');
    console.log('========================================');

    // Return net positions (for backward compatibility) and individual counters
    // All values are returned as strings for display
    return {
      supplied: String(calculatedNetSupplied >= 0 ? calculatedNetSupplied : 0), // Net supplied (deposits - withdrawals)
      borrowed: String(calculatedNetBorrowed >= 0 ? calculatedNetBorrowed : 0), // Net borrowed (borrows - repayments)
      totalDeposits: String(cumulativeTotalDeposits), // Cumulative deposits (sum of all records)
      totalWithdrawals: String(cumulativeTotalWithdrawals), // Cumulative withdrawals (sum of all records)
      totalBorrows: String(cumulativeTotalBorrows), // Cumulative borrows (sum of all records)
      totalRepayments: String(cumulativeTotalRepayments), // Cumulative repayments (sum of all records)
    };
  } catch (error) {
    console.error('getUserPosition: Failed to fetch user activity from private records:', error);
    return { 
      supplied: '0', 
      borrowed: '0',
      totalDeposits: '0',
      totalWithdrawals: '0',
      totalBorrows: '0',
      totalRepayments: '0',
    };
  }
}

/**
 * 1. Post Bounty
 */
export async function postBounty(
  caller: string,
  bountyId: number,
  reward: number
): Promise<string> {
  const inputs = [
    `${caller}.private`,
    `${bountyId}.private`,
    `${caller}.private`,
    `${reward}.private`,
  ];
  const result = await client.request('executeTransition', {
    programId: BOUNTY_PROGRAM_ID,
    functionName: 'post_bounty',
    inputs,
  });
  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }
  return result.transactionId;
}

/**
 * 2. View Bounty by ID
 */
export async function viewBountyById(
  bountyId: number
): Promise<{ payment: number; status: number }> {
  const inputs = [`${bountyId}.private`];
  const result = await client.request('executeTransition', {
    programId: BOUNTY_PROGRAM_ID,
    functionName: 'view_bounty_by_id',
    inputs,
  });

  // Fetch finalized data from the mappings
  const payment = await fetchMappingValue('bounty_output_payment', bountyId);
  const status = await fetchMappingValue('bounty_output_status', bountyId);

  return { payment, status };
}

/**
 * 3. Submit Proposal
 */
export async function submitProposal(
  caller: string,
  bountyId: number,
  proposalId: number,
  proposer: string
): Promise<string> {
  const inputs = [
    `${caller}.private`,
    `${bountyId}.private`,
    `${proposalId}.private`,
    `${proposer}.private`,
  ];
  const result = await client.request('executeTransition', {
    programId: BOUNTY_PROGRAM_ID,
    functionName: 'submit_proposal',
    inputs,
  });
  return result.transactionId;
}

/**
 * 4. Accept Proposal
 */
export async function acceptProposal(
  caller: string,
  bountyId: number,
  proposalId: number,
  creator: string,
  reward: number
): Promise<string> {
  const inputs = [
    `${caller}.private`,
    `${bountyId}.private`,
    `${proposalId}.private`,
    `${creator}.private`,
    `${reward}.private`,
  ];
  const result = await client.request('executeTransition', {
    programId: BOUNTY_PROGRAM_ID,
    functionName: 'accept_proposal',
    inputs,
  });
  return result.transactionId;
}

/**
 * 5. Delete Bounty
 */
export async function deleteBounty(
  caller: string,
  bountyId: number
): Promise<string> {
  const inputs = [`${caller}.private`, `${bountyId}.private`];
  const result = await client.request('executeTransition', {
    programId: BOUNTY_PROGRAM_ID,
    functionName: 'delete_bounty',
    inputs,
  });
  return result.transactionId;
}

/**
 * 6. Wait for Transaction Finalization (best-effort)
 *
 * NOTE:
 * - Public Aleo RPC endpoints like `testnetbeta.aleorpc.com` do NOT currently
 *   expose a `getTransactionStatus` method, so we cannot poll precise status.
 * - Instead, we do a simple timed wait to give the network time to include
 *   and finalize the transaction, then return `false` if we timed out.
 *
 * This avoids noisy "Method not found" RPC errors while still giving the user
 * feedback that we're waiting a short period for finalization.
 */
export async function waitForTransactionToFinalize(
  _transactionId: string
): Promise<boolean> {
  const totalWaitMs = 15_000; // 15 seconds total wait
  const stepMs = 3_000; // check every 3 seconds
  let waited = 0;

  while (waited < totalWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, stepMs));
    waited += stepMs;
    // We *could* add optional explorer polling here in the future.
  }

  // We don't know the real status, just that we've waited long enough.
  return false;
}


/**
 * 7. Transfer Payment
 */
export async function transfer(
  caller: string,
  receiver: string,
  amount: number
): Promise<string> {
  const inputs = [`${caller}.private`, `${receiver}.private`, `${amount}.private`];
  const result = await client.request('executeTransition', {
    programId: BOUNTY_PROGRAM_ID,
    functionName: 'transfer',
    inputs,
  });
  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }
  return result.transactionId;
}


/**
 * Helper to Fetch Mapping Values
 */
export async function fetchMappingValue(
  mappingName: string,
  key: string | number // Allow both string and number
): Promise<number> {
  try {
    // Convert `key` to string if it's a number
    const keyString = typeof key === 'number' ? `${key}.public` : `${key}.public`;

    const result = await client.request('getMappingValue', {
      programId: BOUNTY_PROGRAM_ID,
      mappingName,
      key: keyString, // Always pass as a string
    });

    return parseInt(result.value, 10); // Parse as integer
  } catch (error) {
    console.error(
      `Failed to fetch mapping ${mappingName} with key ${key}:`,
      error
    );
    throw error;
  }
}

/**
 * Utility to Create JSON-RPC Client
 */
export function getClient(apiUrl: string): JSONRPCClient {
  const client: JSONRPCClient = new JSONRPCClient((jsonRPCRequest: any) =>
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(jsonRPCRequest),
    }).then((response) => {
      if (response.status === 200) {
        return response.json().then((jsonRPCResponse) =>
          client.receive(jsonRPCResponse)
        );
      }
      throw new Error(response.statusText);
    })
  );
  return client;
}

/**
 * Get Verifying Key for a Function
 */
async function getDeploymentTransaction(programId: string): Promise<any> {
  const response = await fetch(`${CURRENT_RPC_URL}find/transactionID/deployment/${programId}`);
  const deployTxId = await response.json();
  const txResponse = await fetch(`${CURRENT_RPC_URL}transaction/${deployTxId}`);
  const tx = await txResponse.json();
  return tx;
}

export async function getVerifyingKey(
  programId: string,
  functionName: string
): Promise<string> {
  const deploymentTx = await getDeploymentTransaction(programId);

  const allVerifyingKeys = deploymentTx.deployment.verifying_keys;
  const verifyingKey = allVerifyingKeys.filter((vk: any) => vk[0] === functionName)[0][1][0];
  return verifyingKey;
}

export async function getProgram(programId: string, apiUrl: string): Promise<string> {
  const client = getClient(apiUrl);
  const program = await client.request('program', {
    id: programId
  });
  return program;
}


//Deny a proposal

export async function denyProposal(
  caller: string,
  bountyId: number,
  proposalId: number
): Promise<string> {
  const inputs = [
    `${caller}.private`,   
    `${bountyId}.private`, 
    `${proposalId}.private` 
  ];
    
    const result = await client.request('executeTransition', {
      programId: BOUNTY_PROGRAM_ID,
      functionName: 'deny_proposal', 
      inputs, 
    });

    return result.transactionId;
}