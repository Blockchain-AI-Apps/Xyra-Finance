import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MerchantReceipt, parseMerchantReceipt, fetchBurnerRecordsFromTx } from '../utils/aleo-utils';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useBurnerWallet } from './BurnerWalletProvider';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export interface ProfilePayment {
    type: 'main' | 'burner';
    amount: number;
    tokenType: number;
    timestamp: number;
    receiptHash: string;
    txId: string;
}

export const useProfilePayments = (
    mainHash: string | null,
    burnerHash: string | null,
    initialMainReceipts: MerchantReceipt[],
    initialBurnerReceipts: MerchantReceipt[]
) => {
    const { requestRecords, decrypt } = useWallet();
    const { decryptedBurnerKey } = useBurnerWallet();
    
    const [livePayments, setLivePayments] = useState<ProfilePayment[]>([]);
    const handledTxIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Derive initial feed
        const base: ProfilePayment[] = [];
        
        if (mainHash) {
            initialMainReceipts.forEach(r => {
                if (r.invoiceHash === mainHash) {
                    base.push({
                        type: 'main',
                        amount: Number(r.amount) / 1_000_000,
                        tokenType: r.tokenType,
                        timestamp: r.timestamp || 0, // Fallback if no timestamp
                        receiptHash: r.receiptHash,
                        txId: '' // We don't have txId from receipt directly unless added
                    });
                    handledTxIds.current.add(r.receiptHash); // mark receipt as handled
                }
            });
        }
        
        if (burnerHash) {
            initialBurnerReceipts.forEach(r => {
                if (r.invoiceHash === burnerHash) {
                    base.push({
                        type: 'burner',
                        amount: Number(r.amount) / 1_000_000,
                        tokenType: r.tokenType,
                        timestamp: r.timestamp || 0,
                        receiptHash: r.receiptHash,
                         txId: ''
                    });
                    handledTxIds.current.add(r.receiptHash);
                }
            });
        }

        // Sort by timestamp desc 
        // Note: Currently MerchantReceipt from aleo-utils might not have exact timestamp unless fetched from chain,
        // so real-time ones will appear at the top.
        setLivePayments(base);

    }, [mainHash, burnerHash, initialMainReceipts, initialBurnerReceipts]);

    useEffect(() => {
        if (!mainHash && !burnerHash) return;
        if (!supabaseUrl || !supabaseKey) return;

        const supabase = createClient(supabaseUrl, supabaseKey);

        const fetchNewMainReceipt = async (txId: string) => {
            if (!requestRecords || !decrypt) return;
            // A naive way: Wait briefly for chain sync, then fetch all records and extract our new one
            await new Promise(r => setTimeout(r, 8000));
            try {
                const records = await requestRecords('nullpay_main_v1.aleo', true); // Replace with PROGRAM_ID if exported
                if (records) {
                    // Reverse to get newest first
                    const recent = [...records].reverse().slice(0, 10);
                    for (const r of recent as any[]) {
                        let plaintext = r.plaintext;
                        if (!plaintext && r.recordCiphertext) {
                            try { plaintext = await decrypt(r.recordCiphertext); } catch (e) { }
                        }
                        const receipt = parseMerchantReceipt({...r, plaintext});
                        if (receipt && receipt.invoiceHash === mainHash) {
                            if (!handledTxIds.current.has(receipt.receiptHash)) {
                                handledTxIds.current.add(receipt.receiptHash);
                                setLivePayments(prev => [{
                                    type: 'main',
                                    amount: Number(receipt.amount) / 1_000_000,
                                    tokenType: receipt.tokenType,
                                    timestamp: Date.now(),
                                    receiptHash: receipt.receiptHash,
                                    txId
                                }, ...prev]);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch new main receipt", e);
            }
        };

        const fetchNewBurnerReceipt = async (txId: string) => {
            if (!decryptedBurnerKey) return;
            await new Promise(r => setTimeout(r, 4000));
            try {
                const records = await fetchBurnerRecordsFromTx(txId, decryptedBurnerKey);
                for (const r of records) {
                    const receipt = parseMerchantReceipt(r);
                    if (receipt && receipt.invoiceHash === burnerHash) {
                        if (!handledTxIds.current.has(receipt.receiptHash)) {
                            handledTxIds.current.add(receipt.receiptHash);
                            setLivePayments(prev => [{
                                type: 'burner',
                                amount: Number(receipt.amount) / 1_000_000,
                                tokenType: receipt.tokenType,
                                timestamp: Date.now(),
                                receiptHash: receipt.receiptHash,
                                txId
                            }, ...prev]);
                        }
                    }
                }
            } catch (e) {
                 console.error("Failed to fetch new burner receipt", e);
            }
        };

        const channel = supabase.channel('profile_payments')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'invoices' },
                async (payload) => {
                    const oldRecord = payload.old;
                    const newRecord = payload.new;

                    if (newRecord.invoice_hash !== mainHash && newRecord.invoice_hash !== burnerHash) {
                        return; // Not our profile QR
                    }

                    let oldTxIds: string[] = [];
                    let newTxIds: string[] = [];
                    try { oldTxIds = Array.isArray(oldRecord.payment_tx_ids) ? oldRecord.payment_tx_ids : JSON.parse(oldRecord.payment_tx_ids || '[]'); } catch (e) { }
                    try { newTxIds = Array.isArray(newRecord.payment_tx_ids) ? newRecord.payment_tx_ids : JSON.parse(newRecord.payment_tx_ids || '[]'); } catch (e) { }

                    if (newTxIds.length > oldTxIds.length) {
                        // Find the newly added Tx ID
                        const newId = newTxIds.find(id => !oldTxIds.includes(id));
                        if (newId) {
                            console.log(`[RealTime] New payment detected for ${newRecord.invoice_hash === mainHash ? 'Main' : 'Burner'} QR! TX:`, newId);
                            // It's already handled by toast from usePaymentMonitor ideally, 
                            // but we will fetch the decrypted payload here to inject it into the feed!
                            if (newRecord.invoice_hash === mainHash) {
                                fetchNewMainReceipt(newId);
                            } else {
                                fetchNewBurnerReceipt(newId);
                            }
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };

    }, [mainHash, burnerHash, decrypt, decryptedBurnerKey]);

    return { unifiedPayments: livePayments };
};
