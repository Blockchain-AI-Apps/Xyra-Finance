import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { PrivateKey } from '@provablehq/sdk';
import { AleoNetworkClient, AleoKeyProvider, ProgramManager, NetworkRecordProvider } from '@provablehq/sdk';
import { useBurnerWallet } from '../../../../hooks/BurnerWalletProvider';
import { encryptWithPassword, decryptWithPassword, stringToFieldChunks } from '../../../../utils/crypto';
import { PROGRAM_ID } from '../../../../utils/aleo-utils';
import { getScannerSession, fetchAllPrivateBalances, findSpendableRecord } from './scanner';
import type { PrivateBalances, SweepCurrency } from './types';

export function useBurnerActions() {
    const { address, executeTransaction } = useWallet();
    const {
        burnerAddress, encryptedBurnerKey, decryptedBurnerKey,
        setDecryptedBurnerKey, refreshProfile, fetchedFromChain,
        hasOnChainRecord, setHasOnChainRecord,
    } = useBurnerWallet();

    // ── UI state ──
    const [isGenerating, setIsGenerating]     = useState(false);
    const [isDecrypting, setIsDecrypting]     = useState(false);
    const [isBackingUp, setIsBackingUp]       = useState(false);
    const [isSweeping, setIsSweeping]         = useState(false);
    const [isScanningBalances, setIsScanningBalances] = useState(false);
    const [copied, setCopied]                 = useState(false);
    const [error, setError]                   = useState<string | null>(null);

    // ── Modal visibility ──
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showUnlockModal, setShowUnlockModal]     = useState(false);
    const [showBackupModal, setShowBackupModal]     = useState(false);
    const [showSweepModal, setShowSweepModal]       = useState(false);

    // ── Form values ──
    const [password, setPassword]               = useState('');
    const [showPassword, setShowPassword]       = useState(false);
    const [sweepAmount, setSweepAmount]         = useState('');
    const [sweepCurrency, setSweepCurrency]     = useState<SweepCurrency>('ALEO');
    const [sweepDestination, setSweepDestination] = useState(address || '');

    // ── Sweep result ──
    const [sweepSuccess, setSweepSuccess]       = useState('');
    const [sweepTxId, setSweepTxId]             = useState<string | null>(null);
    const [sweepLogs, setSweepLogs]             = useState<string[]>([]);

    // ── Private balances ──
    const [privateBalances, setPrivateBalances] = useState<PrivateBalances>({ ALEO: -1, USDCx: -1, USAD: -1 });

    const logsEndRef = useRef<HTMLDivElement>(null);

    // ── Helpers ──
    const addLog = useCallback((msg: string) => {
        setSweepLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }, []);

    const openSweepModal = useCallback(() => {
        setError(null);
        setSweepLogs([]);
        setSweepTxId(null);
        setSweepSuccess('');
        setPrivateBalances({ ALEO: -1, USDCx: -1, USAD: -1 });
        setSweepDestination(address || '');
        setShowSweepModal(true);
        // Kick off balance scan immediately
        if (decryptedBurnerKey) {
            setIsScanningBalances(true);
            fetchAllPrivateBalances(decryptedBurnerKey)
                .then(setPrivateBalances)
                .catch(() => setPrivateBalances({ ALEO: 0, USDCx: 0, USAD: 0 }))
                .finally(() => setIsScanningBalances(false));
        }
    }, [address, decryptedBurnerKey]);

    const fetchPrivateBalances = useCallback(async () => {
        if (!decryptedBurnerKey) return;
        setIsScanningBalances(true);
        setPrivateBalances({ ALEO: -1, USDCx: -1, USAD: -1 });
        try {
            const balances = await fetchAllPrivateBalances(decryptedBurnerKey);
            setPrivateBalances(balances);
        } catch (e) {
            console.error('Failed to fetch private balances:', e);
            setPrivateBalances({ ALEO: 0, USDCx: 0, USAD: 0 });
        } finally {
            setIsScanningBalances(false);
        }
    }, [decryptedBurnerKey]);

    // ── Handlers ──
    const handleGenerateBurner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address) { setError('Wallet not connected.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        try {
            setIsGenerating(true);
            setError(null);
            const newPrivateKey = new PrivateKey();
            const newAddress = newPrivateKey.to_address().to_string();
            const rawPrivateKeyStr = newPrivateKey.to_string();
            const encryptedKeyPayload = await encryptWithPassword(rawPrivateKeyStr, password);
            const { updateUserProfile } = await import('../../../../services/api');
            await updateUserProfile(address, newAddress, encryptedKeyPayload);
            setDecryptedBurnerKey(rawPrivateKeyStr);
            await refreshProfile();
            setShowGenerateModal(false);
            setPassword('');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to generate Burner Wallet.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUnlockBurner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!encryptedBurnerKey) return;
        if (!password) { setError('Password required.'); return; }
        try {
            setIsDecrypting(true);
            setError(null);
            const decryptedKey = await decryptWithPassword(encryptedBurnerKey, password);
            try { PrivateKey.from_string(decryptedKey); } catch {
                throw new Error('Invalid decryption result. Please check your password.');
            }
            setDecryptedBurnerKey(decryptedKey);
            setShowUnlockModal(false);
            setPassword('');
        } catch (err: any) {
            console.error('Unlock failed', err);
            setError('Incorrect password or corrupted data.');
        } finally {
            setIsDecrypting(false);
        }
    };

    const handleBackupRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!decryptedBurnerKey || !burnerAddress || !password || !encryptedBurnerKey || !executeTransaction) {
            setError('Wallet must be unlocked and connected, and password must be entered.');
            return;
        }
        try {
            setIsBackingUp(true);
            setError(null);
            const passField = stringToFieldChunks(password, 1, 15)[0];
            const payloadFields = stringToFieldChunks(encryptedBurnerKey, 10, 15);
            const inputs = [burnerAddress, passField, ...payloadFields];
            await executeTransaction({ program: PROGRAM_ID, function: 'backup_burner_wallet', inputs, fee: 500_000 });
            setShowBackupModal(false);
            setPassword('');
            setHasOnChainRecord(true);
        } catch (err: any) {
            console.error('Backup failed', err);
            setError(err.message || 'Failed to trigger backup transaction.');
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleSweepFunds = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!decryptedBurnerKey) { setError('Wallet must be unlocked to sweep funds.'); return; }

        const currentBal = privateBalances[sweepCurrency];
        if (currentBal >= 0 && Number(sweepAmount) > currentBal) {
            setError(`Insufficient private ${sweepCurrency} balance (Available: ${currentBal.toFixed(4)}).`);
            return;
        }

        if (!sweepAmount || isNaN(Number(sweepAmount)) || Number(sweepAmount) <= 0) {
            setError('Please enter a valid positive amount.'); return;
        }
        if (!sweepDestination) { setError('Please enter a destination address.'); return; }

        try {
            setIsSweeping(true);
            setError(null);
            setSweepSuccess('');
            setSweepTxId(null);
            setSweepLogs([]);

            addLog('Initializing burner wallet account...');
            const host = 'https://api.explorer.provable.com/v1';
            const networkClient = new AleoNetworkClient(host);
            const keyProvider = new AleoKeyProvider();
            keyProvider.useCache(true);

            addLog('Authenticating with Record Scanner...');
            const session = await getScannerSession(decryptedBurnerKey);
            addLog(`✓ Scanner registered. UUID: ${session.scannerUuid.substring(0, 20)}...`);

            const recordProvider = new NetworkRecordProvider(session.account, networkClient);
            const programManager = new ProgramManager(host, keyProvider, recordProvider);
            programManager.setAccount(session.account);

            const microcreditsRequired = Number(sweepAmount) * 1_000_000;
            let programName: string;
            let functionName = 'transfer_private';
            let amountFormatted: string;
            let inputs: string[];

            if (sweepCurrency === 'ALEO') {
                programName = 'credits.aleo';
                amountFormatted = microcreditsRequired.toString() + 'u64';
                addLog(`Scanning for private ALEO record (need ≥${sweepAmount} ALEO)...`);
                const recordPt = await findSpendableRecord(session, programName, 'credits', microcreditsRequired, true);
                if (!recordPt) throw new Error(`No private ALEO record ≥ ${sweepAmount} found.`);
                addLog('✓ Found private ALEO record!');
                inputs = [recordPt, sweepDestination, amountFormatted];
            } else {
                programName = sweepCurrency === 'USDCx' ? 'test_usdcx_stablecoin.aleo' : 'test_usad_stablecoin.aleo';
                amountFormatted = microcreditsRequired.toString() + 'u128';

                addLog(`Generating Freeze List proofs for ${sweepCurrency}...`);
                let proofsInput = '';
                try {
                    const { generateFreezeListProof, getFreezeListIndex } = await import('../../../../utils/aleo-utils');
                    const { Address } = await import('@provablehq/wasm');
                    const firstIndex = await getFreezeListIndex(0);
                    let index0FieldStr: string | undefined;
                    if (firstIndex) {
                        try { index0FieldStr = Address.from_string(firstIndex).toGroup().toXCoordinate().toString(); } catch {}
                    }
                    const proof = await generateFreezeListProof(1, index0FieldStr);
                    proofsInput = `[${proof}, ${proof}]`;
                    addLog('✓ Freeze List proofs ready.');
                } catch {
                    throw new Error('Compliance subsystem unreachable — cannot generate transfer proofs.');
                }

                addLog(`Scanning for private ${sweepCurrency} Token record...`);
                const recordPt = await findSpendableRecord(session, programName, 'Token', microcreditsRequired, false);
                if (!recordPt) throw new Error(`No private ${sweepCurrency} Token record ≥ ${sweepAmount} found.`);
                addLog(`✓ Found private ${sweepCurrency} Token record!`);
                inputs = [sweepDestination, amountFormatted, recordPt, proofsInput];
            }

            addLog(`Building ZK authorization for ${programName}/${functionName}...`);
            const authorization = await programManager.buildAuthorization({ programName, functionName, inputs });
            addLog('✓ Authorization built! Requesting fee sponsorship from backend...');

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const sponsorRes = await fetch(`${apiUrl}/dps/sponsor-sweep`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ execution_authorization_string: authorization.toString(), programName }),
            });
            const response = await sponsorRes.json();
            if (!sponsorRes.ok) throw new Error(response?.error || response?.message || 'Backend sponsorship failed.');

            const txId = response.transaction?.id || response.transactionId || '';
            addLog(`✓ Sweep submitted! TxID: ${txId}`);
            setSweepTxId(txId);
            setSweepSuccess('Sweep broadcasted successfully!');
            setSweepAmount('');
        } catch (err: any) {
            console.error('DPS Sweep Failed:', err);
            addLog(`✗ Error: ${err.message}`);
            setError(err.message || 'Sweeping funds failed during DPS Request.');
        } finally {
            setIsSweeping(false);
        }
    };

    const handleCopyKey = () => {
        if (!decryptedBurnerKey) return;
        navigator.clipboard.writeText(decryptedBurnerKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return {
        // wallet context
        address, burnerAddress, decryptedBurnerKey, fetchedFromChain, hasOnChainRecord,
        // loading states
        isGenerating, isDecrypting, isBackingUp, isSweeping, copied,
        // error/success
        error, setError,
        // modal visibility
        showGenerateModal, setShowGenerateModal,
        showUnlockModal, setShowUnlockModal,
        showBackupModal, setShowBackupModal,
        showSweepModal, setShowSweepModal,
        // form values
        password, setPassword, showPassword, setShowPassword,
        sweepAmount, setSweepAmount,
        sweepCurrency, setSweepCurrency,
        sweepDestination, setSweepDestination,
        // sweep result
        sweepSuccess, setSweepSuccess, sweepTxId, setSweepTxId,
        sweepLogs, setSweepLogs, logsEndRef,
        // balances
        privateBalances, setPrivateBalances, isScanningBalances,
        // handlers
        handleGenerateBurner, handleUnlockBurner, handleBackupRecord,
        handleSweepFunds, handleCopyKey, fetchPrivateBalances, openSweepModal,
        addLog,
    };
}
