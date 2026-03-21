import { useState, useCallback } from 'react';
import type { NextPageWithLayout } from '@/types';
import Layout from '@/layouts/_layout';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { USDC_TOKEN_PROGRAM_ID } from '@/types';

// Deployed with hand-written AVM: local struct MerkleProof + unqualified [MerkleProof; 2u32] (same as zkpay)
const TEST_PROGRAM_ID = 'test_transfer_usdcx_v2.aleo';
const USDCX_PROGRAM_ID = 'test_usdcx_stablecoin.aleo';

const STATIC_MERKLE_PROOFS =
  '[{siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 1u32}, {siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 1u32}]';

const TestDepositPage: NextPageWithLayout = () => {
  const { publicKey, requestRecords, executeTransaction, connected, wallet } = useWallet();
  const [amount, setAmount] = useState('0.1');
  const [status, setStatus] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const isReady = !!(connected && executeTransaction);

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLog((prev) => [`[${ts}] ${msg}`, ...prev]);
    console.log(msg);
  };

  const handleDeposit = useCallback(async () => {
    if (!executeTransaction || !requestRecords) {
      setStatus('Wallet not connected or executeTransaction unavailable');
      return;
    }

    try {
      setStatus('Finding USDCx token records...');
      addLog('Step 1: Requesting records from wallet');

      const allRecords = await requestRecords(USDCX_PROGRAM_ID);
      addLog(`Found ${allRecords?.length ?? 0} total USDCx records`);

      if (!allRecords || allRecords.length === 0) {
        setStatus('No USDCx records found in wallet');
        addLog('ERROR: No USDCx token records. Make sure you have USDCx tokens.');
        return;
      }

      const amountMicro = Math.round(parseFloat(amount) * 1_000_000);
      addLog(`Amount: ${amount} USDC = ${amountMicro} micro-USDC`);

      const unspentRecords = allRecords.filter((r: any) => !r.spent);
      addLog(`Unspent records: ${unspentRecords.length}`);

      if (unspentRecords.length === 0) {
        setStatus('No unspent USDCx records found');
        addLog('ERROR: All records are spent');
        return;
      }

      // Use first unspent record — the chain will validate the amount
      const tokenRecord = unspentRecords[0];
      addLog(`Step 2: Using record with keys: ${Object.keys(tokenRecord).join(', ')}`);

      // Get the token input — Shield wallet uses recordCiphertext
      const tokenInput = tokenRecord.recordCiphertext || tokenRecord.ciphertext || tokenRecord.plaintext || tokenRecord;
      addLog(`Step 3: Token input type: ${typeof tokenInput}, field used: ${tokenRecord.recordCiphertext ? 'recordCiphertext' : tokenRecord.ciphertext ? 'ciphertext' : tokenRecord.plaintext ? 'plaintext' : 'raw'}`);

      const amountStr = `${amountMicro}u64`;
      const inputs: (string | any)[] = [tokenInput, amountStr, STATIC_MERKLE_PROOFS];

      addLog(`Step 4: Calling ${TEST_PROGRAM_ID}/deposit`);
      addLog(`Input types: [${typeof inputs[0]}, ${typeof inputs[1]}, ${typeof inputs[2]}]`);

      setStatus('Sending to Shield wallet for signing...');

      const result = await executeTransaction({
        program: TEST_PROGRAM_ID,
        function: 'deposit',
        inputs,
        fee: 5_000_000,
        privateFee: false,
      });

      const txId = result?.transactionId;
      addLog(`Step 5: Result: ${JSON.stringify(result)}`);

      if (txId) {
        setStatus(`SUCCESS! TX: ${txId}`);
        addLog(`SUCCESS: ${txId}`);
      } else {
        setStatus('No transaction ID returned');
      }
    } catch (error: any) {
      const msg = error?.message || String(error);
      setStatus(`ERROR: ${msg.slice(0, 200)}`);
      addLog(`ERROR: ${msg}`);

      if (msg.includes('parse') || msg.includes('MerkleProof')) {
        addLog('>>> MerkleProof parsing issue detected!');
      }
      if (msg.includes('cancelled') || msg.includes('canceled') || msg.includes('rejected')) {
        addLog('>>> User cancelled');
      }
    }
  }, [executeTransaction, requestRecords, amount]);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
        Test USDCx Deposit
      </h1>
      <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1rem' }}>
        Program: {TEST_PROGRAM_ID} — Testing MerkleProof compatibility with Shield wallet
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <WalletMultiButton />
      </div>

      <p style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '1rem', wordBreak: 'break-all' }}>
        connected: {String(connected)} | publicKey: {publicKey || 'null'} | executeTransaction: {executeTransaction ? 'yes' : 'no'} | wallet: {wallet?.adapter?.name || 'none'}
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (USDC)"
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #444',
            background: '#222',
            color: '#fff',
            width: '150px',
          }}
        />
        <button
          onClick={handleDeposit}
          disabled={!isReady}
          style={{
            padding: '0.5rem 1.5rem',
            borderRadius: '4px',
            border: 'none',
            background: isReady ? '#4CAF50' : '#555',
            color: '#fff',
            cursor: isReady ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
          }}
        >
          Test Deposit
        </button>
      </div>

      {status && (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            background: status.includes('ERROR') ? '#4a1515' : status.includes('SUCCESS') ? '#154a15' : '#333',
            border: `1px solid ${status.includes('ERROR') ? '#f44' : status.includes('SUCCESS') ? '#4f4' : '#555'}`,
            fontSize: '0.85rem',
            wordBreak: 'break-all',
          }}
        >
          {status}
        </div>
      )}

      <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Debug Log</h2>
      <div
        style={{
          background: '#111',
          border: '1px solid #333',
          borderRadius: '4px',
          padding: '0.75rem',
          maxHeight: '400px',
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.7rem',
          lineHeight: '1.5',
        }}
      >
        {log.length === 0 ? (
          <span style={{ opacity: 0.5 }}>Connect wallet and click Test Deposit</span>
        ) : (
          log.map((entry, i) => (
            <div key={i} style={{ color: entry.includes('ERROR') ? '#f88' : entry.includes('SUCCESS') ? '#8f8' : entry.includes('>>>') ? '#ff0' : '#ccc' }}>
              {entry}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

TestDepositPage.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

export default TestDepositPage;
