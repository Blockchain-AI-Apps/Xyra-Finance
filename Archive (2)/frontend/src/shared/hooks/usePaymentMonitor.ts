import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { createClient } from '@supabase/supabase-js';
import { PROGRAM_ID, parseMerchantReceipt } from '../utils/aleo-utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ─── Notification Sound (Web Audio API — no external file needed) ───
function playPaymentSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

        const playTone = (freq: number, start: number, duration: number, gain: number) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            g.gain.setValueAtTime(gain, ctx.currentTime + start);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + duration);
        };

        playTone(523.25, 0, 0.15, 0.3);      // C5
        playTone(659.25, 0.12, 0.15, 0.3);    // E5
        playTone(783.99, 0.24, 0.25, 0.25);   // G5

        setTimeout(() => ctx.close(), 1000);
    } catch (e) {
        console.warn('Could not play notification sound:', e);
    }
}

// ─── Format amount for display ───
function formatAmount(amountRaw: number | string | null | undefined, isMicro: boolean = false): string {
    if (amountRaw === null || amountRaw === undefined) return '';
    const num = Number(amountRaw);
    if (isNaN(num) || num === 0) return '';
    const actualNum = isMicro ? num / 1_000_000 : num;
    return ` — ${actualNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} `;
}

export const usePaymentMonitor = () => {
    const { address: publicKey, requestRecords, decrypt } = useWallet();

    const notifiedInvoices = useRef<Set<string>>(new Set());
    const lastSoundPlayed = useRef<Map<string, number>>(new Map());

    const fetchOnChainAmount = async (invoiceHash: string, expectedCount: number): Promise<{ amount: string, token: string } | null> => {
        try {
            if (!requestRecords || !decrypt) return null;

            const normalizedHash = invoiceHash.replace('field', '');
            const retryDelays = [3000, 5000, 8000, 12000];

            for (let attempt = 0; attempt < retryDelays.length; attempt++) {
                console.log(`🔍 [PaymentMonitor] Attempt ${attempt + 1}/${retryDelays.length}: waiting ${retryDelays[attempt]}ms for on-chain sync...`);
                await new Promise(r => setTimeout(r, retryDelays[attempt]));

                const records = await requestRecords(PROGRAM_ID, true);
                if (!records || records.length === 0) continue;

                const matchingReceipts: { amount: number, tokenType: number }[] = [];

                for (const r of (records as any[])) {
                    if (r.spent) continue;

                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher) {
                        try { plaintext = await decrypt(cipher); } catch (e) { continue; }
                    }
                    if (!plaintext) continue;

                    const receipt = parseMerchantReceipt({ ...r, plaintext });
                    if (!receipt) continue;

                    const receiptInvHash = receipt.invoiceHash.replace('field', '');
                    if (receiptInvHash === normalizedHash) {
                        matchingReceipts.push({ amount: receipt.amount, tokenType: receipt.tokenType });
                    }
                }

                console.log(`🔍 [PaymentMonitor] Attempt ${attempt + 1}: found ${matchingReceipts.length} receipts (expected: ${expectedCount})`);

                if (matchingReceipts.length >= expectedCount) {
                    const newest = matchingReceipts[matchingReceipts.length - 1];
                    const token = newest.tokenType === 1 ? 'USDCx' : newest.tokenType === 2 ? 'USAD' : 'Credits';
                    const amountStr = formatAmount(newest.amount, true);
                    return { amount: amountStr, token };
                }
            }
        } catch (error) {
            console.warn('Failed to fetch on-chain records:', error);
        }
        return null;
    };

    useEffect(() => {
        if (!publicKey) return;

        let supabaseChannel: any = null;

        // Added withSound flag (defaults to true)
        const triggerNotification = (message: string, invoiceHash: string, withSound: boolean = true) => {
            console.log(`📣 [Notification Triggered]: ${message} | Sound: ${withSound}`);

            if (withSound) {
                const now = Date.now();
                const lastPlayed = lastSoundPlayed.current.get(invoiceHash) || 0;

                // Brief 5-second cooldown to prevent double-ringing on rapid partial payments
                if (now - lastPlayed > 5000) {
                    playPaymentSound();
                    lastSoundPlayed.current.set(invoiceHash, now);
                }
            }

            toast.success(message, { 
                id: invoiceHash, 
                duration: 6000, 
                position: 'top-right' 
            });
        };

        const setupSupabase = () => {
            if (!supabaseUrl || !supabaseKey) return;

            const supabase = createClient(supabaseUrl, supabaseKey);

            supabaseChannel = supabase.channel('invoices_changes')
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'invoices' },
                    async (payload) => {
                        const oldRecord = payload.old;
                        const newRecord = payload.new;

                        let oldTxIds: string[] = [];
                        let newTxIds: string[] = [];

                        try { oldTxIds = Array.isArray(oldRecord.payment_tx_ids) ? oldRecord.payment_tx_ids : JSON.parse(oldRecord.payment_tx_ids || '[]'); } catch (e) { }
                        try { newTxIds = Array.isArray(newRecord.payment_tx_ids) ? newRecord.payment_tx_ids : JSON.parse(newRecord.payment_tx_ids || '[]'); } catch (e) { }

                        // SCENARIO 1: New Transaction Added (WAIT FOR SYNC -> PLAY SOUND)
                        if (newTxIds.length > oldTxIds.length) {
                            const dedupKey = `${newRecord.invoice_hash}_TX_${newTxIds.length}`;
                            if (notifiedInvoices.current.has(dedupKey)) return;
                            notifiedInvoices.current.add(dedupKey);

                            try {
                                const response = await fetch(`${API_URL}/invoice/${newRecord.invoice_hash}`);
                                if (!response.ok) return;
                                const invoiceData = await response.json();

                                if (invoiceData.merchant_address === publicKey) {
                                    let amountStr = '';
                                    let tokenLabel = newRecord.token_type === 1 ? 'USDCx' : newRecord.token_type === 2 ? 'USAD' : 'Credits';

                                    if (newRecord.invoice_type === 2) {
                                        const expectedCount = newTxIds.length;
                                        const onChain = await fetchOnChainAmount(newRecord.invoice_hash, expectedCount);
                                        
                                        if (onChain) {
                                            amountStr = onChain.amount;
                                            tokenLabel = onChain.token;
                                        } else {
                                            amountStr = formatAmount(newRecord.amount);
                                        }
                                    } else {
                                        amountStr = formatAmount(newRecord.amount);
                                    }

                                    const msg = amountStr
                                        ? `Payment received${amountStr}${tokenLabel} for invoice ${newRecord.invoice_hash.slice(0, 6)}...`
                                        : `Payment received for invoice ${newRecord.invoice_hash.slice(0, 6)}...`;

                                    // TRUE = Play the sound for this notification
                                    triggerNotification(msg, newRecord.invoice_hash, true);
                                }
                            } catch (error) {
                                console.error('Failed to process payment event:', error);
                            }
                        } 
                        // SCENARIO 2: Status changed to SETTLED (NO SOUND)
                        else if (newRecord.status === 'SETTLED' && oldRecord.status !== 'SETTLED') {
                            const dedupKey = `${newRecord.invoice_hash}_SETTLED`;
                            if (notifiedInvoices.current.has(dedupKey)) return;
                            notifiedInvoices.current.add(dedupKey);

                            try {
                                const response = await fetch(`${API_URL}/invoice/${newRecord.invoice_hash}`);
                                if (!response.ok) return;
                                const invoiceData = await response.json();

                                if (invoiceData.merchant_address === publicKey) {
                                    // FALSE = Do NOT play the sound for the "Settled" status update
                                    triggerNotification(`Invoice ${newRecord.invoice_hash.slice(0, 6)}... settled!`, newRecord.invoice_hash, false);
                                }
                            } catch (error) {
                                console.error('Failed to process settled event:', error);
                            }
                        }
                    }
                )
                .subscribe();
        };

        setupSupabase();

        return () => {
            if (supabaseChannel) supabaseChannel.unsubscribe();
        };
    }, [publicKey]);
};