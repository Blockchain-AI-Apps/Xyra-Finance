import { useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TransactionOptions } from '@provablehq/aleo-types';
import { PROGRAM_ID, generateSalt } from '../../../utils/aleo-utils';
import { CheckoutSession } from '../types';

export const useCheckoutPayment = (session: CheckoutSession | null) => {
    const { address: publicKey, wallet, executeTransaction, requestRecords, decrypt } = useWallet();
    const [status, setStatus] = useState<string>('');
    const [txId, setTxId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [step, setStep] = useState<'PAY' | 'CONVERT'>('PAY');

    const getBalance = (record: any, tokenType: string): number => {
        try {
            const fieldName = tokenType === 'CREDITS' ? 'microcredits' : 'amount';
            let valStr = '';

            if (record.data && record.data[fieldName]) {
                valStr = record.data[fieldName];
            } else if (record.plaintext) {
                const regex = new RegExp(`${fieldName}:\\s*([\\d_]+)u(64|128)`);
                const match = record.plaintext.match(regex);
                if (match && match[1]) {
                    valStr = match[1];
                }
            }
            if (valStr) {
                return parseInt(valStr.replace(/_/g, '').replace(/u(64|128)/, ''));
            }
        } catch { return 0; }
        return 0;
    };

    const pay = async () => {
        if (!session || !publicKey || !executeTransaction || !wallet?.adapter) return;

        try {
            setLoading(true);
            setError(null);
            setStatus('Searching your wallet for private balance...');

            // 1. Determine Token Program
            let tokenProgram = 'credits.aleo';
            let amountMicro = Math.round(session.amount * 1_000_000);
            let typeSuffix = 'u64';
            let funcName = 'pay_invoice'; // In standard ZK Pay, we have pay_invoice, pay_invoice_usdcx, etc.

            if (session.token_type === 'USDCX') {
                tokenProgram = 'test_usdcx_stablecoin.aleo';
                typeSuffix = 'u128';
                funcName = 'pay_invoice_usdcx';
            } else if (session.token_type === 'USAD') {
                tokenProgram = 'test_usad_stablecoin.aleo';
                typeSuffix = 'u128';
                funcName = 'pay_invoice_usad';
            }

            // 2. Request Records from Wallet
            const records = await requestRecords(tokenProgram, false);

            let payRecord = null;
            for (const r of (records as any[])) {
                if (r.spent) continue;

                // Decrypt if needed
                if (r.recordCiphertext && !r.plaintext && decrypt) {
                    try { r.plaintext = await decrypt(r.recordCiphertext); } catch { }
                }

                const bal = getBalance(r, session.token_type);
                if (bal >= amountMicro) {
                    payRecord = r;
                    break;
                }
            }

            if (!payRecord) {
                let totalPrivateBalance = 0;
                for (const r of (records as any[])) {
                    if (!r.spent) {
                        totalPrivateBalance += getBalance(r, session.token_type);
                    }
                }

                if (totalPrivateBalance >= amountMicro) {
                    setStep('CONVERT');
                    setStatus(`Privacy Protocol requires a single consolidated record. Please merge records.`);
                    setLoading(false);
                    return;
                } else {
                    setStep('CONVERT');
                    setStatus(`Insufficient Private ${session.token_type} balance. Please convert public tokens.`);
                    setLoading(false);
                    return;
                }
            }

            let proofsInput = undefined;
            if (session.token_type !== 'CREDITS') {
                setStatus('Generating Compliance Proofs for Stablecoin...');
                const { getFreezeListRoot, getFreezeListCount, getFreezeListIndex } = await import('../../../utils/aleo-utils');
                // Ensure we call them even if unused to wake up the node state if needed
                await getFreezeListRoot();
                await getFreezeListCount();
                const firstIndex = await getFreezeListIndex(0);
                const { generateFreezeListProof } = await import('../../../utils/aleo-utils');
                const { Address } = await import('@provablehq/wasm');

                let index0FieldStr = undefined;
                if (firstIndex) {
                    try {
                        const addr = Address.from_string(firstIndex);
                        const grp = addr.toGroup();
                        const x = grp.toXCoordinate();
                        index0FieldStr = x.toString();
                    } catch (e) { console.warn("Failed to convert address to field", e); }
                }
                const proof = await generateFreezeListProof(1, index0FieldStr);
                proofsInput = `[${proof}, ${proof}]`;
                setStatus('Requesting your approval to execute payment...');
            }

            // 3. Construct Inputs (Standard Pay)
            // pay_invoice(record input, address merchant, u64 amount, field salt, field payment_secret, field invoice_hash)
            const paymentSecret = generateSalt();
            
            if (!session.merchant_address) {
                throw new Error("Merchant address is missing from session details.");
            }

            const inputs = [
                payRecord.plaintext || payRecord.ciphertext || payRecord,
                session.merchant_address,
            `${amountMicro}${typeSuffix}`,
                session.salt,
                paymentSecret,
                session.invoice_hash
            ];

            if (proofsInput) {
                inputs.push(proofsInput);
            }

            const transaction: TransactionOptions = {
                program: PROGRAM_ID,
                function: funcName,
                inputs: inputs,
                fee: 100_000,
                privateFee: false
            };

            const result = await executeTransaction(transaction);

            if (result && result.transactionId) {
                setTxId(result.transactionId);
                setStatus(`Transaction Broadcasted! Waiting for network...`);

                // 4. Poll for Success
                let isPending = true;
                let attempts = 0;
                let onChainId = result.transactionId; // Will be updated to real at1... ID
                while (isPending && attempts < 120) {
                    attempts++;
                    await new Promise(r => setTimeout(r, 1000));
                    try {
                        const statusRes = await wallet.adapter.transactionStatus(result.transactionId);
                        const statusStr = typeof statusRes === 'string'
                            ? (statusRes as string).toLowerCase()
                            : (statusRes as any)?.status?.toLowerCase();

                        // Extract the real on-chain ID once available (replaces initial Shield ID)
                        if ((statusRes as any)?.transactionId) {
                            onChainId = (statusRes as any).transactionId;
                            console.log('[useCheckoutPayment] Real on-chain TX ID found:', onChainId);
                            setTxId(onChainId);
                        }

                        // We will rely on our Supabase WebSocket listener to do the real redirect. 
                        // But locally, we can mark success to show UI and notify the backend to trigger webhooks.
                        if (statusStr === 'completed' || statusStr === 'finalized' || statusStr === 'accepted') {
                            setStatus('Payment Successful! Notifying Merchant...');

                            try {
                                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
                                // Update the new standard invoice with the REAL on-chain payment TX ID.
                                await fetch(`${API_URL}/invoices/${session.invoice_hash}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        status: 'SETTLED',
                                        payment_tx_ids: [onChainId]
                                    })
                                });

                                // Also update the checkout session with the REAL on-chain TX ID.
                                await fetch(`${API_URL}/checkout/sessions/${session.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'SETTLED', tx_id: onChainId })
                                });
                            } catch (err) {
                                console.error("Failed to notify backend", err);
                            }

                            setSuccess(true);
                            isPending = false;

                            console.log("[useCheckoutPayment] Transaction Successful! Attempting redirect handler...");
                            if (session.success_url) {
                                console.log(`[useCheckoutPayment] Scheduling redirect to: ${session.success_url} in 3 seconds...`);
                                setTimeout(() => {
                                    console.log(`[useCheckoutPayment] Executing redirect now!`);
                                    try {
                                        const url = new URL(session.success_url as string);
                                        url.searchParams.set('session_id', session.id);
                                        window.location.href = url.toString();
                                    } catch (e) {
                                        // Fallback if success_url is somehow not a valid URL object
                                        window.location.href = session.success_url as string + `?session_id=${session.id}`;
                                    }
                                }, 3000);
                            } else {
                                console.log("[useCheckoutPayment] No success_url found in session object:", session);
                            }
                        } else if (statusStr === 'failed' || statusStr === 'rejected') {
                            throw new Error('Transaction rejected by the Aleo network.');
                        }
                    } catch (e) {
                        // Polling error, ignore
                    }
                }
            } else {
                throw new Error("Failed to get Transaction ID from wallet.");
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || "An error occurred during payment.");
        } finally {
            setLoading(false);
        }
    };

    const convertPublicToPrivate = async (overrideAmount?: number) => {
        if (!session || !publicKey || !executeTransaction) return;

        try {
            setLoading(true);

            let tokenProgramId = 'credits.aleo';
            let typeSuffix = 'u64';
            let tokenName = 'Credits';

            if (session.token_type === 'USDCX') {
                tokenProgramId = 'test_usdcx_stablecoin.aleo';
                typeSuffix = 'u128';
                tokenName = 'USDCX';
            } else if (session.token_type === 'USAD') {
                tokenProgramId = 'test_usad_stablecoin.aleo';
                typeSuffix = 'u128';
                tokenName = 'USAD';
            }

            setStatus(`Converting Public ${tokenName} to Private...`);

            const finalAmount = (overrideAmount !== undefined && overrideAmount > 0) ? overrideAmount : session.amount;
            const amountMicro = Math.round(finalAmount * 1_000_000);

            const transaction: TransactionOptions = {
                program: tokenProgramId,
                function: 'transfer_public_to_private',
                inputs: [publicKey, `${amountMicro}${typeSuffix}`],
                fee: 100_000,
                privateFee: false
            };

            const result = await executeTransaction(transaction);

            if (result && result.transactionId) {
                setTxId(result.transactionId);
                setStatus(`Converting... TxID: ${result.transactionId.slice(0, 10)}...`);

                if (!wallet || !wallet.adapter) {
                    await new Promise(r => setTimeout(r, 2000));
                    setStep('PAY');
                    return;
                }

                let isPending = true;
                let attempts = 0;
                while (isPending && attempts < 120) {
                    attempts++;
                    await new Promise(r => setTimeout(r, 1000));
                    try {
                        const statusRes = await wallet.adapter.transactionStatus(result.transactionId);
                        const statusStr = typeof statusRes === 'string'
                            ? (statusRes as string).toLowerCase()
                            : (statusRes as any)?.status?.toLowerCase();
                        if ((statusRes as any)?.transactionId) {
                            console.log("Conversion On-Chain ID found.");
                        }
                        if (statusStr === 'completed' || statusStr === 'finalized' || statusStr === 'accepted') {
                            setStatus('Conversion successful! Resuming payment flow...');
                            await new Promise(r => setTimeout(r, 1000));
                            setStep('PAY');
                            isPending = false;
                        } else if (statusStr === 'failed' || statusStr === 'rejected') {
                            throw new Error('Transaction rejected by network');
                        }
                    } catch (e) {
                        // ignore poll
                    }
                }
            } else {
                throw new Error("Failed to get Transaction ID from wallet.");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Conversion failed');
        } finally {
            setLoading(false);
        }
    };

    return {
        pay,
        convertPublicToPrivate,
        status,
        txId,
        loading,
        error,
        success,
        step,
        setStep,
        publicKey
    };
};
