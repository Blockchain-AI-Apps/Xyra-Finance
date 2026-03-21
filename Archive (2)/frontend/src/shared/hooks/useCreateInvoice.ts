import { useState, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TransactionOptions } from '@provablehq/aleo-types';
import { generateSalt, getInvoiceHashFromMapping, PROGRAM_ID, stringToField } from '../utils/aleo-utils';
import { InvoiceData, InvoiceItem } from '../types/invoice';
import { useBurnerWallet } from './BurnerWalletProvider';

export type InvoiceType = 'standard' | 'multipay' | 'donation';

export const useCreateInvoice = () => {
    const { address, executeTransaction, transactionStatus, requestTransactionHistory } = useWallet();
    const { burnerAddress } = useBurnerWallet();
    const publicKey = address;
    const [amount, setAmount] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);
    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
    const [memo, setMemo] = useState<string>('');
    const [status, setStatus] = useState<string>('');
    const [invoiceType, setInvoiceType] = useState<InvoiceType>('standard');
    const [tokenType, setTokenType] = useState<number>(0);
    const [walletType, setWalletType] = useState<number>(0);
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [showItems, setShowItems] = useState(false);

    const addItem = useCallback(() => {
        setItems(prev => [...prev, { name: '', quantity: 1, unitPrice: 0, total: 0 }]);
    }, []);

    const updateItem = useCallback((index: number, field: keyof InvoiceItem, value: string | number) => {
        setItems(prev => {
            const updated = [...prev];
            const item = { ...updated[index] };
            if (field === 'name') {
                item.name = value as string;
            } else if (field === 'quantity') {
                item.quantity = Number(value) || 0;
                item.total = item.quantity * item.unitPrice;
            } else if (field === 'unitPrice') {
                item.unitPrice = Number(value) || 0;
                item.total = item.quantity * item.unitPrice;
            }
            updated[index] = item;
            // Auto-update amount
            const total = updated.reduce((sum, i) => sum + i.total, 0);
            setAmount(total > 0 ? total : '');
            return updated;
        });
    }, []);

    const removeItem = useCallback((index: number) => {
        setItems(prev => {
            const updated = prev.filter((_, i) => i !== index);
            const total = updated.reduce((sum, i) => sum + i.total, 0);
            setAmount(updated.length > 0 && total > 0 ? total : '');
            return updated;
        });
    }, []);

    const handleCreate = async () => {
        if (!publicKey || !executeTransaction || !transactionStatus) {
            setStatus('Wallet not fully supported or connected. Please update wallet.');
            return;
        }

        // For donation, amount is 0, so we skip this check
        if (invoiceType !== 'donation' && (!amount || amount <= 0)) {
            setStatus('Please enter a valid amount.');
            return;
        }

        setLoading(true);
        setStatus('Initializing invoice creation...');

        try {
            const merchant = publicKey;
            let salt = generateSalt();
            console.log('this is the salt', salt);
            setStatus('Requesting wallet signature...');

            let typeInput = '0u8';
            if (invoiceType === 'multipay') typeInput = '1u8';
            else if (invoiceType === 'donation') typeInput = '2u8';

            const isDonation = invoiceType === 'donation';
            const amountMicro = isDonation ? 0 : Math.round(Number(amount) * 1_000_000);

            let functionName = 'create_invoice';
            let amountInput = `${amountMicro}u64`;

            if (tokenType === 1) { // USDCx
                functionName = 'create_invoice_usdcx';
                amountInput = `${amountMicro}u128`;
            } else if (tokenType === 2) { // USAD
                functionName = 'create_invoice_usad';
                amountInput = `${amountMicro}u128`;
            } else if (tokenType === 3) { // ANY
                functionName = 'create_invoice_any';
                amountInput = `${amountMicro}u128`;
            }

            // Ensure salt is ready
            if (!salt) {
                salt = generateSalt();
            }

            // Encode Memo
            const memoField = memo ? stringToField(memo) : '0field';

            // If Burner Wallet is selected, we must register the invoice under the Burner Address!
            const merchantAddress = walletType === 1 && burnerAddress ? burnerAddress : publicKey;

            const inputs = [
                merchantAddress,
                amountInput,
                salt,
                memoField,
                '0u32', // expiry hardcoded to 0
                typeInput,
                `${walletType}u8`
            ];

            const transaction: TransactionOptions = {
                program: PROGRAM_ID,
                function: functionName,
                inputs: inputs,
                fee: 100_000,
                privateFee: false
            };

            let txId = '';
            const result = await executeTransaction(transaction);
            if (result && result.transactionId) {
                txId = result.transactionId;
            }

            if (txId) {
                setStatus(`Transaction Broadcasted! Polling for status...`);
                console.log("Temporary Transaction ID:", txId);
                let isPending = true;
                let finalTransactionId = txId;
                let attempts = 0;
                const MAX_ATTEMPTS = 120;

                let hashFromStatus: string | null = null;

                while (isPending && attempts < MAX_ATTEMPTS) {
                    attempts++;
                    await new Promise(r => setTimeout(r, 1000));

                    try {
                        const statusResponse = await transactionStatus(txId);

                        const currentStatus = typeof statusResponse === 'string'
                            ? (statusResponse as string).toLowerCase()
                            : (statusResponse as any)?.status?.toLowerCase();

                        console.log('🔍 [Polling] Status:', currentStatus);

                        if (typeof statusResponse === 'object' && (statusResponse as any).transactionId) {
                            finalTransactionId = (statusResponse as any).transactionId;
                            console.log("Final Transaction ID:", finalTransactionId);
                        }

                        const responseAny = statusResponse as any;
                        if (responseAny?.execution?.transitions?.[0]?.outputs?.[0]?.value) {
                            hashFromStatus = responseAny.execution.transitions[0].outputs[0].value;
                        }

                        if (currentStatus !== 'pending' && currentStatus !== 'processing' && currentStatus !== 'submitted') {
                            isPending = false;

                            if (currentStatus === 'completed' || currentStatus === 'finalized' || currentStatus === 'accepted') {
                                console.log('Transaction accepted!');
                                setStatus('Transaction on-chain! Fetching execution data...');

                                let hash = hashFromStatus;

                                if (!hash) {
                                    console.log("Hash not found in status, attempting on-chain mapping lookup...");
                                    try {
                                        let attempts = 0;
                                        while (!hash && attempts < 5) {
                                            hash = await getInvoiceHashFromMapping(salt);
                                            if (!hash) await new Promise(r => setTimeout(r, 2000));
                                            attempts++;
                                        }
                                    } catch (err) {
                                        console.warn("Mapping lookup failed:", err);
                                    }
                                }

                                if (!hash) {
                                    console.log("Hash not found via mapping, attempting history lookup...");
                                    try {
                                        hash = await getInvoiceHashFromWallet(finalTransactionId, PROGRAM_ID);
                                    } catch (err: any) {
                                        console.warn("History lookup failed or timed out:", err);
                                    }
                                }

                                if (!hash) {
                                    console.log("Hash not found via wallet, attempting public chain fetch...");
                                    try {
                                        await new Promise(r => setTimeout(r, 2000));
                                        hash = await getInvoiceHashFromChain(finalTransactionId);
                                    } catch (err: any) {
                                        console.warn("Public chain lookup failed:", err);
                                    }
                                }

                                if (!hash) throw new Error("Could not retrieve Invoice Hash from wallet execution.");

                                setStatus('Hash retrieved successfully! Saving to database...');
                                try {
                                    const { createInvoice } = await import('../services/api');
                                    let dbInvoiceType = 0;
                                    if (invoiceType === 'multipay') dbInvoiceType = 1;
                                    if (invoiceType === 'donation') dbInvoiceType = 2;

                                    await createInvoice({
                                        invoice_hash: hash,
                                        merchant_address: merchant,
                                        designated_address: walletType === 1 && burnerAddress ? burnerAddress : merchant,
                                        // amount removed
                                        // memo removed
                                        status: 'PENDING',
                                        invoice_transaction_id: finalTransactionId,
                                        salt: salt,
                                        invoice_type: dbInvoiceType,
                                        token_type: tokenType,
                                        is_burner: walletType === 1,
                                        invoice_items: showItems && items.length > 0 ? items : undefined,
                                    });
                                    console.log("Invoice saved to DB");
                                } catch (dbErr) {
                                    console.error("Failed to save invoice to DB:", dbErr);
                                }

                                const invoiceMerchantAddress = walletType === 1 && burnerAddress ? burnerAddress : merchant;

                                const params = new URLSearchParams({
                                    merchant: invoiceMerchantAddress,
                                    amount: amount.toString(),
                                    salt
                                });
                                if (memo) params.append('memo', memo);
                                if (invoiceType === 'multipay') params.append('type', 'multipay');
                                if (invoiceType === 'donation') params.append('type', 'donation');
                                if (tokenType === 1) params.append('token', 'usdcx');
                                if (tokenType === 2) params.append('token', 'usad');
                                if (tokenType === 3) params.append('token', 'any');

                                const link = `${window.location.origin}/pay?${params.toString()}`;

                                setInvoiceData({ merchant: invoiceMerchantAddress, amount: Number(amount), salt, hash, link });
                                setStatus(`Invoice Created Successfully!`);
                                return;
                            } else {
                                throw new Error(`Transaction failed with status: ${currentStatus}`);
                            }
                        }
                    } catch (e: any) {
                        console.warn('Error polling status:', e);
                    }
                }

                if (isPending) throw new Error("Transaction polling timed out.");
            }

        } catch (error: any) {
            console.error(error);
            setStatus(`Error: ${error.message || 'Failed to create invoice'}`);
        } finally {
            setLoading(false);
        }
    };

    // Helper to fetch from Public API (Fall back for No-Auth/No-PW)
    const getInvoiceHashFromChain = async (finalTxId: string): Promise<string | null> => {
        const safeTxId = finalTxId.replace(/['"]+/g, '').trim();
        console.log(`Fetching public chain data for ${safeTxId}...`);

        try {
            const response = await fetch(`https://api.explorer.aleo.org/v1/testnet3/transaction/${safeTxId}`);
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            // Check structure: execution -> transitions[0] -> outputs[0] -> value
            if (data?.execution?.transitions?.[0]?.outputs?.[0]?.value) {
                console.log("✅ Found Hash via Public Chain API!");
                return data.execution.transitions[0].outputs[0].value;
            }
        } catch (error) {
            console.warn("Public chain fetch failed:", error);
        }
        return null;
    };

    // Helper to get execution safely with retries (Wallet Only)
    const getInvoiceHashFromWallet = async (finalTxId: string, programId: string): Promise<string | null> => {
        const safeTxId = finalTxId.replace(/['"]+/g, '').trim();
        console.log(`Getting execution output for ${safeTxId}...`);

        let i = 0;
        const MAX_RETRIES = 60; // Try for ~2 minutes (2s interval)
        let historyPermissionDenied = false;

        while (i < MAX_RETRIES) {
            try {
                // Try History Fetch (Primary method now since getExecution alias is gone)
                if (!historyPermissionDenied) {
                    try {
                        if (requestTransactionHistory) {
                            const history = await requestTransactionHistory(programId);
                            const foundTx = history.transactions.find((t: any) => t.transactionId === safeTxId || t.id === safeTxId);

                            const txAny = foundTx as any;
                            if (txAny && txAny.execution?.transitions?.[0]?.outputs?.[0]?.value) {
                                console.log("✅ Found Hash via Wallet History!");
                                return txAny.execution.transitions[0].outputs[0].value;
                            }
                        }
                    } catch (histError: any) {
                        console.warn('History lookup failed:', histError);
                        // Stop trying history if permission is denied to prevent spam
                        if (histError.message && (
                            histError.message.includes('NOT_GRANTED') ||
                            histError.message.includes('Permission') ||
                            histError.message.includes('Wallet not connected')
                        )) {
                            console.warn('Stopping history lookup due to permission denial or connection issue.');
                            return null; // Abort immediately to allow fallback strategies
                        }
                    }
                }
            } catch (e: any) {
                // Ignore transient errors
            }

            // Wait before next retry
            await new Promise(r => setTimeout(r, 2000));
            i++;
        }

        throw new Error("Failed to retrieve execution data from wallet after multiple attempts.");
    };

    const resetInvoice = () => {
        setInvoiceData(null);
        setAmount('');
        setMemo('');
        setStatus('');
        setInvoiceType('standard');
        setTokenType(0);
        setWalletType(0);
        setItems([]);
        setShowItems(false);
    };

    return {
        amount,
        setAmount,
        memo,
        setMemo,
        status,
        loading,
        invoiceData,
        handleCreate,
        resetInvoice,
        publicKey,
        invoiceType,
        setInvoiceType,
        tokenType,
        setTokenType,
        walletType,
        setWalletType,
        items,
        showItems,
        setShowItems,
        addItem,
        updateItem,
        removeItem
    };
};
