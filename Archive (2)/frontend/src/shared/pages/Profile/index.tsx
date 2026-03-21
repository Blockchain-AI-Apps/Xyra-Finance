import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../components/ui/GlassCard';
import { useTransactions } from '../../hooks/useTransactions';
import { PROGRAM_ID, parseMerchantReceipt, MerchantReceipt, parseInvoice, InvoiceRecord, parsePayerReceipt, PayerReceipt, fetchBurnerRecordsFromTx } from '../../utils/aleo-utils';
import { useBurnerWallet } from '../../hooks/BurnerWalletProvider';
import { StatsCards } from './components/StatsCards';
import { InvoiceTable } from './components/InvoiceTable';
import { PaidInvoicesTable } from './components/PaidInvoicesTable';
import { VerifyModal } from './components/modals/VerifyModal';
import { PaymentHistoryModal } from './components/modals/PaymentHistoryModal';
import { ReceiptHashesModal } from './components/modals/ReceiptHashesModal';
import { BurnerWalletSettings } from './components/BurnerWalletSettings';
import { InvoiceDistributionChart } from './components/Charts/InvoiceDistributionChart';
import { TokenDistributionChart } from './components/Charts/TokenDistributionChart';
import { WalletBalances } from './components/WalletBalances';

const Profile: React.FC = () => {
    const { address, requestRecords, decrypt, executeTransaction } = useWallet();
    const { decryptedBurnerKey } = useBurnerWallet();
    const publicKey = address;
    const { transactions, loading: loadingTransactions, fetchTransactions } = useTransactions(publicKey || undefined);
    const [settling, setSettling] = useState<string | null>(null);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyInput, setVerifyInput] = useState('');
    const [verifyStatus, setVerifyStatus] = useState<'IDLE' | 'CHECKING' | 'FOUND' | 'NOT_FOUND' | 'ERROR' | 'MISMATCH'>('IDLE');
    const [verifiedRecord, setVerifiedRecord] = useState<any>(null);
    const [verifyingInvoice, setVerifyingInvoice] = useState<any>(null);
    const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[] | null>(null);
    const [selectedReceiptHashes, setSelectedReceiptHashes] = useState<string[] | null>(null);
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'created' | 'paid'>('created');
    const [merchantReceipts, setMerchantReceipts] = useState<MerchantReceipt[]>([]);
    const [createdInvoices, setCreatedInvoices] = useState<InvoiceRecord[]>([]);
    const [payerReceipts, setPayerReceipts] = useState<PayerReceipt[]>([]);
    const [burnerCreatedInvoices, setBurnerCreatedInvoices] = useState<InvoiceRecord[]>([]);
    const [burnerMerchantReceipts, setBurnerMerchantReceipts] = useState<MerchantReceipt[]>([]);
    const [loadingReceipts, setLoadingReceipts] = useState(false);
    const [loadingCreated, setLoadingCreated] = useState(false);
    const [loadingBurner, setLoadingBurner] = useState(true);
    const [loadingPayerReceipts, setLoadingPayerReceipts] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const fetchPayerReceiptsRef = useRef(0);

    const [profileMainHash, setProfileMainHash] = useState<string | null>(null);
    const [profileBurnerHash, setProfileBurnerHash] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (publicKey) {
                try {
                    const { getUserProfile } = await import('../../services/api');
                    const profile = await getUserProfile(publicKey);
                    if (profile) {
                        setProfileMainHash(profile.profile_main_invoice_hash || null);
                        setProfileBurnerHash(profile.profile_burner_invoice_hash || null);
                    }
                } catch (e) {
                    console.error("Failed to fetch profile hashes for exclusion", e);
                }
            }
        };
        fetchProfileData();
    }, [publicKey]);

    useEffect(() => {
        if (publicKey) {
            console.log("Profile mounted/updated. Fetching all data...");
            fetchTransactions();
            fetchCreatedInvoices();
            fetchMerchantReceipts();
            fetchPayerReceipts();
        }
    }, [publicKey]);

    useEffect(() => {
        const fetchBurnerData = async () => {
            console.log("🔥 [fetchBurnerData] Effect fired. decryptedBurnerKey:", !!decryptedBurnerKey, "transactions.length:", transactions.length);
            if (!decryptedBurnerKey || transactions.length === 0) {
                console.log("🔥 [fetchBurnerData] ABORTED - missing key or empty transactions");
                if (!decryptedBurnerKey) {
                    setLoadingBurner(false);
                }
                return;
            }
            setLoadingBurner(true);
            
            const burnerTxIds = new Set<string>();
            console.log("🔥 Burner Transactions from DB:", transactions.filter(t => t.is_burner).length);
            transactions.forEach(tx => {
                if (tx.is_burner) {
                    if (tx.invoice_transaction_id) burnerTxIds.add(tx.invoice_transaction_id);
                    if (tx.payment_tx_ids && Array.isArray(tx.payment_tx_ids)) {
                        tx.payment_tx_ids.forEach((id: string) => burnerTxIds.add(id));
                    }
                }
            });

            if (burnerTxIds.size === 0) {
                setLoadingBurner(false);
                return;
            }

            console.log("Fetching Burner records for TXs:", Array.from(burnerTxIds));
            const newCreated: InvoiceRecord[] = [];
            const newReceipts: MerchantReceipt[] = [];

            for (const txId of Array.from(burnerTxIds)) {
                const records = await fetchBurnerRecordsFromTx(txId, decryptedBurnerKey);
                for (const r of records) {
                    const invoice = parseInvoice(r);
                    if (invoice) newCreated.push(invoice);
                    const receipt = parseMerchantReceipt(r);
                    if (receipt) newReceipts.push(receipt);
                }
            }
            console.log("🔥 Final Parsed Burner Invoices:", newCreated.length, newCreated);
            console.log("🔥 Final Parsed Burner Receipts:", newReceipts.length, newReceipts);
            setBurnerCreatedInvoices(newCreated);
            setBurnerMerchantReceipts(newReceipts);
            setLoadingBurner(false);
        };
        fetchBurnerData();
    }, [transactions, decryptedBurnerKey]);

    const fetchCreatedInvoices = async () => {
        if (!requestRecords || !publicKey) return;
        setLoadingCreated(true);
        try {
            const records = await requestRecords(PROGRAM_ID, true);
            const validInvoices: InvoiceRecord[] = [];

            if (records) {
                console.log("Fetching created invoices from records...");
                for (const r of (records as any[])) {
                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher && decrypt) {
                        try {
                            plaintext = await decrypt(cipher);
                        } catch (e) { console.warn("Decrypt error for created invoice:", e); }
                    }

                    const invoice = parseInvoice({ ...r, plaintext });
                    if (invoice) {
                        console.log("Found On-Chain Invoice:", invoice.invoiceHash, "Amount:", invoice.amount);
                        validInvoices.push(invoice);
                    }
                }
            }
            setCreatedInvoices(validInvoices.reverse());
        } catch (e) {
            console.error("Error fetching created invoices:", e);
        } finally {
            setLoadingCreated(false);
        }
    };

    const fetchMerchantReceipts = async () => {
        if (!requestRecords || !publicKey) return;
        setLoadingReceipts(true);
        console.log("Fetching Merchant Receipts...");
        try {
            const records = await requestRecords(PROGRAM_ID, true);
            const validReceipts: MerchantReceipt[] = [];

            if (records) {
                for (const r of (records as any[])) {
                    if (r.spent) continue;

                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher && decrypt) {
                        try {
                            plaintext = await decrypt(cipher);
                        } catch (e) { console.warn("Decrypt error for merchant receipt:", e); }
                    }
                    // Try parsing as MerchantReceipt
                    const receipt = parseMerchantReceipt({ ...r, plaintext });
                    if (receipt) {
                        validReceipts.push(receipt);
                    }
                }
            }
            console.log("Merchant Receipts Found:", validReceipts.length);
            setMerchantReceipts(validReceipts.reverse());
        } catch (e) {
            console.error("Error fetching merchant receipts:", e);
        } finally {
            setLoadingReceipts(false);
        }
    };

    const fetchPayerReceipts = async () => {
        if (!requestRecords || !publicKey) return;
        const fetchId = ++fetchPayerReceiptsRef.current;
        setLoadingPayerReceipts(true);
        console.log(`[fetchPayerReceipts #${fetchId}] Starting...`);
        try {
            const records = await requestRecords(PROGRAM_ID, true);
            if (fetchId !== fetchPayerReceiptsRef.current) {
                console.log(`[fetchPayerReceipts #${fetchId}] Stale fetch, discarding.`);
                return;
            }
            const validReceipts: PayerReceipt[] = [];

            if (records) {
                for (const r of (records as any[])) {
                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher && decrypt) {
                        try {
                            plaintext = await decrypt(cipher);
                        } catch (e) { console.warn("Decrypt error for payer receipt:", e); }
                    }

                    const receipt = parsePayerReceipt({ ...r, plaintext });
                    if (receipt) {
                        console.log(`[fetchPayerReceipts #${fetchId}] Found Payer Receipt:`, receipt);
                        validReceipts.push(receipt);
                    }
                }
            }
            console.log(`[fetchPayerReceipts #${fetchId}] Total Payer Receipts Parsed:`, validReceipts.length);
            setPayerReceipts([...validReceipts].reverse());
            console.log(`[fetchPayerReceipts #${fetchId}] State updated with ${validReceipts.length} receipts.`);
        } catch (e) {
            console.error(`[fetchPayerReceipts #${fetchId}] Error:`, e);
        } finally {
            if (fetchId === fetchPayerReceiptsRef.current) {
                setLoadingPayerReceipts(false);
                console.log(`[fetchPayerReceipts #${fetchId}] Loading set to false.`);
            }
        }
    };

    const combinedInvoices = useMemo(() => {
        const merged = new Map<string, any>();
        console.log("🔄 Merging Invoices! Created:", createdInvoices.length, "Burner Created:", burnerCreatedInvoices.length);

        // 1. Index DB transactions for quick lookup (Metadata only)
        const dbMap = new Map<string, any>();
        transactions.forEach(tx => {
            if (tx.invoice_hash) dbMap.set(tx.invoice_hash, tx);
        });

        // 2. Layer on On-Chain Records (Authoritative Data)
        // MAIN WALLET INVOICES
        createdInvoices.forEach(record => {
            if (record.invoiceHash === profileMainHash || record.invoiceHash === profileBurnerHash) return; // Filter explicitly only Profile QRs from the Dashboard!
            
            const dbTx = dbMap.get(record.invoiceHash);

            merged.set(record.invoiceHash, {
                invoiceHash: record.invoiceHash,
                amount: record.amount / 1_000_000,
                tokenType: record.tokenType,
                invoiceType: record.invoiceType,
                walletType: 0, // Enforce Main Wallet
                owner: record.owner,
                salt: record.salt,

                // Merge DB Metadata if available
                status: dbTx?.status === 'SETTLED' ? 'SETTLED' : 'PENDING',
                creationTx: dbTx?.invoice_transaction_id || null,
                paymentTxIds: dbTx?.payment_tx_ids || (dbTx?.payment_tx_id ? [dbTx.payment_tx_id] : []),
                memo: record.memo || dbTx?.memo || '',
                isPending: false,
                source: 'chain',
                isValidOnChain: true
            });
        });

        // BURNER WALLET INVOICES
        burnerCreatedInvoices.forEach(record => {
            if (record.invoiceHash === profileMainHash || record.invoiceHash === profileBurnerHash) return; // Filter explicitly only Profile QRs from the Dashboard!
            
            const dbTx = dbMap.get(record.invoiceHash);

            merged.set(record.invoiceHash, {
                invoiceHash: record.invoiceHash,
                amount: record.amount / 1_000_000,
                tokenType: record.tokenType,
                invoiceType: record.invoiceType,
                walletType: 1, // Enforce Burner Wallet
                owner: record.owner,
                salt: record.salt,

                // Merge DB Metadata if available
                status: dbTx?.status === 'SETTLED' ? 'SETTLED' : 'PENDING',
                creationTx: dbTx?.invoice_transaction_id || null,
                paymentTxIds: dbTx?.payment_tx_ids || (dbTx?.payment_tx_id ? [dbTx.payment_tx_id] : []),
                memo: record.memo || dbTx?.memo || '',
                isPending: false,
                source: 'chain',
                isValidOnChain: true
            });
        });
        // 3. Aggregate donation totals from MerchantReceipts
        const allReceipts = [...merchantReceipts, ...burnerMerchantReceipts];
        const donationTotals = new Map<string, { credits: number, usdcx: number, usad: number }>();
        allReceipts.forEach(receipt => {
            const hash = receipt.invoiceHash.replace('field', '');
            if (!donationTotals.has(hash)) {
                donationTotals.set(hash, { credits: 0, usdcx: 0, usad: 0 });
            }
            const totals = donationTotals.get(hash)!;
            const amt = receipt.amount / 1_000_000;
            if (receipt.tokenType === 0) totals.credits += amt;
            else if (receipt.tokenType === 1) totals.usdcx += amt;
            else if (receipt.tokenType === 2) totals.usad += amt;
        });

        // Attach donation totals to donation invoices (invoiceType === 2)
        merged.forEach((inv, hash) => {
            if (inv.invoiceType === 2) {
                const normalizedHash = hash.replace('field', '');
                const totals = donationTotals.get(normalizedHash);
                if (totals) {
                    inv.donations = totals;
                    // Set the display amount to the total across all token types
                    inv.amount = totals.credits + totals.usdcx + totals.usad;
                }
            }
        });

        const finalArr = Array.from(merged.values());
        console.log("🔄 Final Combined Invoices Array (excluding Tips):", finalArr.length, finalArr);
        return finalArr;
    }, [transactions, createdInvoices, merchantReceipts, burnerCreatedInvoices, burnerMerchantReceipts]);

    const handleVerifyReceipt = async () => {
        if (!verifyInput || !requestRecords || !decrypt) return;

        try {
            setVerifyStatus('CHECKING');
            setVerifiedRecord(null);
            const records = await requestRecords(PROGRAM_ID, true);
            console.log("Checking records for receipt:", verifyInput);
            console.log("Records found:", records?.length);

            let foundRecord = null;

            if (records) {
                for (const [index, r] of (records as any[]).entries()) {
                    if (r.spent) {
                        console.log(`[Record ${index}] Skipped (spent)`);
                        continue;
                    }
                    let plaintext = r.plaintext;
                    if (!plaintext && r.recordCiphertext) {
                        try {
                            plaintext = await decrypt(r.recordCiphertext);
                        } catch (e) { console.warn("Decrypt error", e); }
                    }

                    if (plaintext) {
                        console.log(`[Record ${index}] Plaintext:`, plaintext);
                        if (plaintext.includes(verifyInput)) {
                            console.log("Match found in record:", index);
                            const amountMatch = plaintext.match(/amount:\s*([\d_]+)u64/);
                            const tokenTypeMatch = plaintext.match(/token_type:\s*(\d+)u8/);
                            const invoiceHashMatch = plaintext.match(/invoice_hash:\s*([\d]+)field/);

                            const rInvoiceHash = invoiceHashMatch ? invoiceHashMatch[1] : 'Unknown';

                            foundRecord = {
                                plaintext,
                                amount: amountMatch ? parseInt(amountMatch[1].replace(/_/g, '')) / 1_000_000 : 'Unknown',
                                tokenType: tokenTypeMatch ? parseInt(tokenTypeMatch[1]) : 0,
                                invoiceHash: rInvoiceHash
                            };

                            console.log("Parsed Record Data:", foundRecord);
                            break;
                        } else {
                            console.log(`[Record ${index}] No match for:`, verifyInput);
                        }
                    } else {
                        console.log(`[Record ${index}] No plaintext available`);
                    }
                }
            }

            if (foundRecord) {
                const recordHash = foundRecord.invoiceHash.trim();
                let invoiceHash = (verifyingInvoice.invoiceHash || verifyingInvoice.invoice_hash || '').trim();
                if (invoiceHash.endsWith('field')) {
                    invoiceHash = invoiceHash.slice(0, -5);
                }

                console.log(`Verifying: Record[${recordHash}] vs Invoice[${invoiceHash}]`);

                if (verifyingInvoice && recordHash !== invoiceHash) {
                    setVerifiedRecord(foundRecord);
                    setVerifyStatus('MISMATCH');
                } else {
                    setVerifiedRecord(foundRecord);
                    setVerifyStatus('FOUND');
                }
            } else {
                setVerifyStatus('NOT_FOUND');
            }

        } catch (e) {
            console.error("Verification failed", e);
            setVerifyStatus('ERROR');
        }
    };



    const uniqueMainReceipts = Array.from(new Map(merchantReceipts.map(r => [r.receiptHash, r])).values())
        .filter(r => r.invoiceHash !== profileMainHash && r.invoiceHash !== profileBurnerHash);
        
    const uniqueBurnerReceipts = Array.from(new Map(burnerMerchantReceipts.map(r => [r.receiptHash, r])).values())
        .filter(r => r.invoiceHash !== profileMainHash && r.invoiceHash !== profileBurnerHash);

    const merchantStats = {
        mainCredits: (uniqueMainReceipts
            .filter((r: any) => r.tokenType !== 1 && r.tokenType !== 2)
            .reduce((acc, curr: any) => acc + (Number(curr.amount) / 1_000_000 || 0), 0))
            .toFixed(2),
        mainUSDCx: (uniqueMainReceipts
            .filter((r: any) => r.tokenType === 1)
            .reduce((acc, curr: any) => acc + (Number(curr.amount) / 1_000_000 || 0), 0))
            .toFixed(2),
        mainUSAD: (uniqueMainReceipts
            .filter((r: any) => r.tokenType === 2)
            .reduce((acc, curr: any) => acc + (Number(curr.amount) / 1_000_000 || 0), 0))
            .toFixed(2),
        burnerCredits: (uniqueBurnerReceipts
            .filter((r: any) => r.tokenType !== 1 && r.tokenType !== 2)
            .reduce((acc, curr: any) => acc + (Number(curr.amount) / 1_000_000 || 0), 0))
            .toFixed(2),
        burnerUSDCx: (uniqueBurnerReceipts
            .filter((r: any) => r.tokenType === 1)
            .reduce((acc, curr: any) => acc + (Number(curr.amount) / 1_000_000 || 0), 0))
            .toFixed(2),
        burnerUSAD: (uniqueBurnerReceipts
            .filter((r: any) => r.tokenType === 2)
            .reduce((acc, curr: any) => acc + (Number(curr.amount) / 1_000_000 || 0), 0))
            .toFixed(2),
        invoices: combinedInvoices.length,
        settled: combinedInvoices.filter(inv => inv.status === 'SETTLED' || inv.status === 1).length,
        pending: combinedInvoices.filter(inv => inv.status === 'PENDING' || inv.status === 0).length
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const openExplorer = (txId?: string) => {
        if (txId) {
            window.open(`https://testnet.explorer.provable.com/transaction/${txId}`, '_blank');
        }
    };

    const handleSettle = async (invoice: any) => {
        if (!invoice || !invoice.salt || !executeTransaction) return;
        setSettling(invoice.invoiceHash);
        try {
            // For Donation (Type 2), amount is 0. For others, use invoice amount (Major -> Micro).
            const isDonation = invoice.invoiceType === 2;
            const amountMicro = isDonation ? 0 : Math.round(invoice.amount * 1_000_000);

            const transaction = {
                program: PROGRAM_ID,
                function: "settle_invoice",
                inputs: [
                    invoice.salt,
                    `${amountMicro}u64`
                ],
                fee: 100_000,
                privateFee: false
            };

            const result = await executeTransaction(transaction);

            if (result && result.transactionId) {
                // Optimistically update DB status
                try {
                    const { updateInvoiceStatus } = await import('../../services/api');
                    await updateInvoiceStatus(invoice.invoiceHash, {
                        status: 'SETTLED'
                    });
                } catch (e) { console.warn("DB update failed but tx sent", e); }

                // Refresh list
                setTimeout(() => {
                    fetchCreatedInvoices();
                    fetchTransactions();
                }, 2000);
            }
        } catch (e: any) {
            console.error("Settlement failed", e);
            alert("Failed to settle invoice: " + (e.message || "Unknown error"));
        } finally {
            setSettling(null);
        }
    };



    return (
        <div className="page-container relative min-h-screen">
            {/* BACKGROUND */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-white/5 rounded-full blur-[120px] animate-pulse-slow" />
            </div>
            <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-screen h-[800px] z-0 pointer-events-none flex justify-center overflow-hidden">
                <img
                    src="/assets/aleo_globe.png"
                    alt="Aleo Globe"
                    className="w-full h-full object-cover opacity-50 mix-blend-screen mask-image-gradient-b"
                    style={{
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                    }}
                />
            </div>


            {/* VERIFY MODAL */}
            <VerifyModal
                isOpen={showVerifyModal}
                onClose={() => setShowVerifyModal(false)}
                verifyingInvoice={verifyingInvoice}
                verifyInput={verifyInput}
                setVerifyInput={setVerifyInput}
                verifyStatus={verifyStatus}
                verifiedRecord={verifiedRecord}
                merchantReceipts={[...merchantReceipts, ...burnerMerchantReceipts]}
                onVerify={handleVerifyReceipt}
            />

            {/* TRANSACTION HISTORY MODAL (Legacy) */}
            <PaymentHistoryModal
                paymentIds={selectedPaymentIds}
                onClose={() => setSelectedPaymentIds(null)}
                onViewTx={openExplorer}
            />

            {/* RECEIPT HASHES MODAL */}
            <ReceiptHashesModal
                receiptHashes={selectedReceiptHashes}
                onClose={() => setSelectedReceiptHashes(null)}
            />

            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="w-full max-w-7xl mx-auto pt-10 relative z-10 pb-20"
            >
                {/* HEADER */}
                <motion.div variants={itemVariants} className="flex flex-col items-center justify-center text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter leading-tight text-white">
                        Merchant <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-primary to-neon-accent">Dashboard</span>
                    </h1>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-6">
                        Manage your invoices and settlements.
                    </p>

                    {/* REMOVED GLOBAL VERIFY BUTTON */}
                    {/* NEW: WALLET BALANCES */}
                    <WalletBalances itemVariants={itemVariants} />
                </motion.div>

                {/* TOP ROW: Stats & Charts */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                    {/* STATS */}
                    <div className="xl:col-span-1">
                        <StatsCards
                            merchantStats={merchantStats}
                            loadingReceipts={loadingReceipts}
                            loadingCreated={loadingCreated}
                            loadingBurner={loadingBurner}
                            itemVariants={itemVariants}
                        />
                    </div>

                    {/* CHARTS */}
                    <motion.div variants={itemVariants} className="xl:col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                        <InvoiceDistributionChart invoices={loadingBurner ? [] : combinedInvoices} isLoading={loadingCreated || loadingBurner} />
                        <TokenDistributionChart receipts={[...merchantReceipts, ...burnerMerchantReceipts]} isLoading={loadingReceipts || loadingBurner} />
                    </motion.div>
                </div>

                {/* BURNER WALLET SETTINGS - FULL WIDTH */}
                <BurnerWalletSettings itemVariants={itemVariants} transactions={transactions} />

                {/* INVOICE HISTORY */}
                <GlassCard variants={itemVariants} className="p-0 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex flex-col items-center justify-center gap-4">
                        <div className="flex p-1 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 relative">
                            {['created', 'paid'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`relative z-10 px-6 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === tab ? 'text-black' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {activeTab === tab && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-white rounded-full -z-10"
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                    {tab === 'created' ? 'My Invoices' : 'Paid Invoices'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* SEARCH */}
                    <div className="px-6 pb-4">
                        <div className="relative max-w-md mx-auto">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by invoice hash..."
                                value={invoiceSearch}
                                onChange={(e) => setInvoiceSearch(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-primary/50 focus:ring-1 focus:ring-neon-primary/30 transition-colors"
                            />
                            {invoiceSearch && (
                                <button
                                    onClick={() => setInvoiceSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        {/* CREATED TAB */}
                        <div style={{ display: activeTab === 'created' ? 'block' : 'none' }}>
                            <InvoiceTable
                                invoices={loadingBurner ? [] : combinedInvoices}
                                loading={loadingCreated || loadingTransactions || loadingBurner}
                                search={invoiceSearch}
                                currentPage={currentPage}
                                itemsPerPage={itemsPerPage}
                                setCurrentPage={setCurrentPage}
                                onVerify={(inv) => {
                                    setVerifyingInvoice(inv);
                                    setVerifyInput('');
                                    setVerifyStatus('IDLE');
                                    setVerifiedRecord(null);
                                    setShowVerifyModal(true);
                                }}
                                onSettle={handleSettle}
                                settlingId={settling}
                                onViewPayments={(ids) => setSelectedPaymentIds(ids)}
                                transactions={transactions}
                            />
                        </div>

                        {/* PAID TAB */}
                        <div style={{ display: activeTab === 'paid' ? 'block' : 'none' }}>
                            <PaidInvoicesTable
                                receipts={payerReceipts}
                                loading={loadingPayerReceipts}
                                search={invoiceSearch}
                                onViewReceipts={(hashes) => setSelectedReceiptHashes(hashes)}
                            />
                        </div>
                    </div>
                    {/* PRIVACY FOOTER */}
                    <div className="p-4 bg-white/5 border-t border-white/5 text-center text-xs text-gray-500 italic">
                        All this information is fetched from your private account records.
                    </div>
                </GlassCard>
            </motion.div>
        </div >
    );
};

export default Profile;
