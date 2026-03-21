import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TransactionOptions } from '@provablehq/aleo-types';
import { getInvoiceHashFromMapping, getInvoiceData, PROGRAM_ID, generateSalt } from '../../utils/aleo-utils';
import type { PaymentStep, InvoiceState } from './types';

export const useSharedPayment = () => {
    const [searchParams] = useSearchParams();
    const { address, wallet, executeTransaction, requestRecords, decrypt } = useWallet();
    const publicKey = address;
    const [invoice, setInvoice] = useState<InvoiceState | null>(null);
    const [donationAmount, setDonationAmount] = useState<string>('');
    const [status, setStatus] = useState<string>('Initializing...');
    const [step, setStep] = useState<PaymentStep>('CONNECT');
    const [loading, setLoading] = useState(false);
    const [txId, setTxId] = useState<string | null>(null);
    const [conversionTxId, setConversionTxId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [programId, setProgramId] = useState<string | null>(null);
    const [paymentSecret, setPaymentSecret] = useState<string | null>(null);
    const [receiptHash] = useState<string | null>(null);
    const [receiptSearchFailed, setReceiptSearchFailed] = useState(false);

    useEffect(() => {
        const init = async () => {
            let merchant = searchParams.get('merchant');
            let amount = searchParams.get('amount');
            let salt = searchParams.get('salt');
            let hashParam = searchParams.get('hash');

            const memo = searchParams.get('memo') || '';
            const tokenParam = searchParams.get('token');
            const tokenType = tokenParam === 'usdcx' ? 1 : tokenParam === 'usad' ? 2 : 0;
            const typeParam = searchParams.get('type');
            let initialType = typeParam === 'donation' ? 2 : (typeParam === 'multipay' ? 1 : 0);
            const sessionId = searchParams.get('session_id');

            try {
                setLoading(true);
                setStatus('Verifying Invoice...');

                setProgramId(PROGRAM_ID);
                setPaymentSecret(generateSalt());

                let fetchedHash: string | null = hashParam || null;

                // If they provided a raw hash (like from Profile QR), try fetching metadata from DB first
                if (fetchedHash && (!merchant || !salt)) {
                    try {
                        const { fetchInvoiceByHash } = await import('../../services/api');
                        const dbInvoice = await fetchInvoiceByHash(fetchedHash);
                        if (dbInvoice) {
                            merchant = dbInvoice.merchant_address || null;
                            salt = dbInvoice.salt || null;

                            // Amount is conceptually 0 for Donations, but DB doesn't store Amount.
                            // However Profile/Donation QR creates them with 0.
                            const coercedAmount = dbInvoice.amount ? dbInvoice.amount.toString() : amount;
                            amount = dbInvoice.invoice_type === 2 ? '0' : (coercedAmount || null);
                            initialType = dbInvoice.invoice_type !== undefined ? dbInvoice.invoice_type : initialType;
                        }
                    } catch (e) { console.warn("Could not fetch missing DB details for Hash-only link", e); }
                }

                if (!merchant || !salt) {
                    setError('Invalid Invoice Link: Missing merchant or salt parameters');
                    setLoading(false);
                    return;
                }
                if (!amount && initialType !== 2) {
                    setError('Invalid Invoice Link: Missing amount');
                    setLoading(false);
                    return;
                }

                setError(null);

                if (!fetchedHash) {
                    fetchedHash = await getInvoiceHashFromMapping(salt || '');
                    if (!fetchedHash) {
                        setError('Invoice not found or invalid salt.');
                        setLoading(false);
                        return;
                    }
                }

                const invoiceData = await getInvoiceData(fetchedHash);
                const statusOnChain = invoiceData ? invoiceData.status : 0;
                const tokenTypeOnChain = invoiceData ? invoiceData.tokenType : (tokenType || 0);
                const invoiceTypeOnChain = invoiceData ? invoiceData.invoiceType : initialType;

                console.log(`🔗 On-Chain Invoice Data | Status: ${statusOnChain}, Token Type: ${tokenTypeOnChain}, Type: ${invoiceTypeOnChain}`);

                // Fetch DB details to check for manual settlement or off-chain status
                let dbInvoice = null;
                try {
                    const { fetchInvoiceByHash } = await import('../../services/api');
                    dbInvoice = await fetchInvoiceByHash(fetchedHash);
                } catch (e) { console.warn("Could not fetch DB details", e); }

                // Check if Settled on-chain OR manually settled in DB
                if (statusOnChain === 1 || (dbInvoice && dbInvoice.status === 'SETTLED')) {
                    if (dbInvoice && dbInvoice.payment_tx_id) {
                        setTxId(dbInvoice.payment_tx_id);
                    }

                    setInvoice({
                        merchant,
                        amount: Number(amount) || 0,
                        salt,
                        hash: fetchedHash,
                        memo,
                        tokenType: tokenTypeOnChain,
                        invoiceType: invoiceTypeOnChain,
                        items: dbInvoice?.invoice_items || undefined,
                        sessionId: sessionId || undefined
                    });
                    setStep('ALREADY_PAID');
                    setLoading(false);
                    return;
                }

                setInvoice({
                    merchant,
                    amount: Number(amount) || 0,
                    salt,
                    hash: fetchedHash,
                    memo,
                    tokenType: tokenTypeOnChain,
                    invoiceType: invoiceTypeOnChain,
                    items: dbInvoice?.invoice_items || undefined,
                    sessionId: sessionId || undefined
                });

                setStatus(''); // Clear status after verification
                if (publicKey) {
                    setStep('PAY');
                } else {
                    setStep('CONNECT');
                }

            } catch (err) {
                console.error(err);
                setError('Failed to verify invoice integrity.');
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [searchParams, publicKey]);

    const pollTransaction = async (initialTxId: string) => {
        if (!wallet || !wallet.adapter) return;

        let isPending = true;
        let attempts = 0;
        let onChainId = initialTxId;

        while (isPending && attempts < 120) {
            attempts++;
            await new Promise(r => setTimeout(r, 1000));
            try {
                const statusRes = await wallet.adapter.transactionStatus(initialTxId);
                const statusStr = typeof statusRes === 'string'
                    ? (statusRes as string).toLowerCase()
                    : (statusRes as any)?.status?.toLowerCase();

                if ((statusRes as any)?.transactionId) {
                    onChainId = (statusRes as any).transactionId;
                    console.log("Payment On-Chain ID found:", onChainId);
                    setTxId(onChainId);
                }

                if (statusStr === 'completed' || statusStr === 'finalized' || statusStr === 'accepted') {
                    setStep('SUCCESS');
                    setStatus('Payment Successful!');

                    try {
                        const { updateInvoiceStatus, fetchInvoiceByHash } = await import('../../services/api');
                        console.log("📝 [usePayment] Updating Invoice in DB...", { onChainId, invoiceHash: invoice?.hash });

                        const updatePayload: any = {
                            payment_tx_ids: onChainId
                        };
                        if (invoice?.hash) {
                            const currentDbInvoice = await fetchInvoiceByHash(invoice.hash);
                            if (currentDbInvoice && (currentDbInvoice.invoice_type === 1 || currentDbInvoice.invoice_type === 2)) {
                                console.log("ℹ️ Multi Pay / Donation Invoice detected. Keeping status as PENDING.");
                            } else {
                                updatePayload.status = 'SETTLED';
                            }
                            console.log("📤 Sending Update Payload:", updatePayload);
                            await updateInvoiceStatus(invoice.hash, updatePayload);
                            console.log("✅ DB Update Successful!");
                        }
                        
                        if (invoice?.sessionId) {
                            try {
                                console.log(`📢 [usePayment] Updating Checkout Session ${invoice.sessionId}`);
                                const checkoutApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
                                await fetch(`${checkoutApiUrl}/checkout/sessions/${invoice.sessionId}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'SETTLED', tx_id: onChainId })
                                });
                                console.log("✅ Checkout Session Updated!");
                            } catch (checkoutErr) {
                                console.error("❌ Failed to update checkout session:", checkoutErr);
                            }
                        }

                        if (programId && invoice?.hash) {
                            setStatus('Syncing Receipt Record...');
                            await new Promise(r => setTimeout(r, 1000));
                            setReceiptSearchFailed(true);
                        }

                    } catch (dbErr) { console.error("❌ DB Update Error:", dbErr); }

                    isPending = false;
                } else if (statusStr === 'failed' || statusStr === 'rejected') {
                    throw new Error('Transaction rejected on-chain.');
                }
            } catch (err) {
                console.warn("Polling error:", err);
            }
        }
    };

    // ─── Convert public Credits/Tokens to private ─────────────────────────────
    const convertPublicToPrivate = async (overrideAmount?: number, selectedTokenOverride?: number) => {
        if (!invoice || !publicKey || !executeTransaction) return;

        try {
            setLoading(true);

            const activeTokenType = selectedTokenOverride !== undefined ? selectedTokenOverride : invoice.tokenType;

            // Determine Program ID and type suffix based on token type
            let tokenProgramId = 'credits.aleo';
            let typeSuffix = 'u64';
            let tokenName = 'Credits';

            if (activeTokenType === 1) {
                tokenProgramId = 'test_usdcx_stablecoin.aleo';
                typeSuffix = 'u128';
                tokenName = 'USDCx';
            } else if (activeTokenType === 2) {
                tokenProgramId = 'test_usad_stablecoin.aleo';
                typeSuffix = 'u128';
                tokenName = 'USAD';
            }

            setStatus(`Converting Public ${tokenName} to Private...`);
            const parsedDonation = Number(donationAmount);
            const invoiceAmount = (invoice.amount === 0 && parsedDonation > 0) ? parsedDonation : invoice.amount;

            const finalAmount = (overrideAmount !== undefined && overrideAmount > 0) ? overrideAmount : invoiceAmount;
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
                setConversionTxId(result.transactionId);
                setStatus(`Converting... TxID: ${result.transactionId.slice(0, 10)}... Polling for confirmation...`);

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
                            const finalId = (statusRes as any).transactionId;
                            console.log("Conversion On-Chain ID found:", finalId);
                            setConversionTxId(finalId);
                        }

                        if (statusStr === 'completed' || statusStr === 'finalized' || statusStr === 'accepted') {
                            setStatus('Conversion Successful! Refreshing page...');
                            await new Promise(r => setTimeout(r, 1500));
                            // Refresh the page so the newly minted private records are picked up correctly
                            window.location.reload();
                            isPending = false;
                        } else if (statusStr === 'failed' || statusStr === 'rejected') {
                            throw new Error('Conversion transaction rejected on-chain.');
                        }
                    } catch (err) {
                        console.warn("Polling error or pending:", err);
                    }
                }
            } else {
                throw new Error("Transaction execution failed to return a Transaction ID.");
            }
            setLoading(false);

        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!publicKey) return;
        setStep('PAY');
    };

    return {
        // State
        invoice,
        donationAmount,
        setDonationAmount,
        status,
        setStatus,
        step,
        setStep,
        loading,
        setLoading,
        txId,
        setTxId,
        conversionTxId,
        error,
        setError,
        programId,
        paymentSecret,
        receiptHash,
        receiptSearchFailed,
        setReceiptSearchFailed,
        // Wallet
        publicKey,
        executeTransaction,
        requestRecords,
        decrypt,
        wallet,
        // Helpers
        pollTransaction,
        convertPublicToPrivate,
        handleConnect,
    };
};
