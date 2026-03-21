import { useState, useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TransactionOptions } from '@provablehq/aleo-types';
import { generateSalt, getInvoiceHashFromMapping, PROGRAM_ID } from '../utils/aleo-utils';
import { useBurnerWallet } from './BurnerWalletProvider';
import { updateUserProfile, getUserProfile, createInvoice } from '../services/api';

export const useProfileQR = () => {
    const { address, executeTransaction, transactionStatus } = useWallet();
    const { burnerAddress } = useBurnerWallet();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [mainHash, setMainHash] = useState<string | null>(null);
    const [burnerHash, setBurnerHash] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (address) {
            checkExistingProfile(address);
        }
    }, [address]);

    const checkExistingProfile = async (walletAddress: string) => {
        try {
            const profile = await getUserProfile(walletAddress);
            if (profile) {
                if (profile.profile_main_invoice_hash) {
                    setMainHash(profile.profile_main_invoice_hash);
                    setInitialized(true);
                }
                if (profile.profile_burner_invoice_hash) {
                    setBurnerHash(profile.profile_burner_invoice_hash);
                }
            }
        } catch (e) {
            console.error("Failed to check profile", e);
        }
    };

    const generateSingleInvoice = async (isBurner: boolean): Promise<string> => {
        if (!address || !executeTransaction) throw new Error("Wallet not connected");

        const salt = generateSalt();
        const merchantAddress = isBurner && burnerAddress ? burnerAddress : address;
        
        // Donation type is 2 (open ended)
        const typeInput = '2u8'; 
        const amountInput = '0u128'; // create_invoice_any used for profile, accepting any token
        const functionName = 'create_invoice_any';
        
        const inputs = [
            merchantAddress,
            amountInput,
            salt,
            '0field', // memo
            '0u32', // expiry
            typeInput,
            isBurner ? '1u8' : '0u8' // walletType
        ];

        const transaction: TransactionOptions = {
            program: PROGRAM_ID,
            function: functionName,
            inputs,
            fee: 100_000,
            privateFee: false
        };

        const result = await executeTransaction(transaction);
        let finalTxId: string = result?.transactionId || '';
        if (!finalTxId) throw new Error("Failed to get transaction ID");

        setStatus(`Waiting for ${isBurner ? 'Burner' : 'Main'} invoice confirmation...`);

        // Polling
        let isPending = true;
        let attempts = 0;
        let hash: string | null = null;
        
        while (isPending && attempts < 120) {
            attempts++;
            await new Promise(r => setTimeout(r, 1000));
            try {
                const statusRes: any = await transactionStatus(finalTxId);
                const currentStatus = typeof statusRes === 'string' ? statusRes.toLowerCase() : statusRes?.status?.toLowerCase();
                
                if (statusRes?.transactionId) finalTxId = statusRes.transactionId;
                if (statusRes?.execution?.transitions?.[0]?.outputs?.[0]?.value) {
                    hash = statusRes.execution.transitions[0].outputs[0].value;
                }

                if (currentStatus === 'completed' || currentStatus === 'finalized' || currentStatus === 'accepted') {
                    isPending = false;
                    
                    if (!hash) {
                        try { hash = await getInvoiceHashFromMapping(salt); } catch (e) { }
                    }
                    if (!hash) {
                        try {
                            const res = await fetch(`https://api.explorer.aleo.org/v1/testnet3/transaction/${finalTxId.replace(/['"]+/g, '').trim()}`);
                            const data = await res.json();
                            if (data?.execution?.transitions?.[0]?.outputs?.[0]?.value) {
                                hash = data.execution.transitions[0].outputs[0].value;
                            }
                        } catch (e) { }
                    }
                    if (!hash) throw new Error("Could not retrieve Invoice Hash");

                    // Save to backend invoices table
                    await createInvoice({
                        invoice_hash: hash,
                        merchant_address: address, // Real merchant is the main address logging in
                        designated_address: merchantAddress,
                        status: 'PENDING',
                        invoice_transaction_id: finalTxId,
                        salt,
                        invoice_type: 2, // Donation
                        token_type: 3, // ANY
                        is_burner: isBurner,
                    });
                    
                    return hash;
                } else if (currentStatus !== 'pending' && currentStatus !== 'processing' && currentStatus !== 'submitted') {
                    throw new Error(`Transaction failed: ${currentStatus}`);
                }
            } catch (e: any) {
               console.warn(e);
            }
        }
        throw new Error("Timeout waiting for transaction confirmation");
    };

    const initializeQRs = async () => {
        if (!address) {
            setStatus("Please connect wallet first");
            return;
        }
        setLoading(true);
        setStatus("Initializing Profile QR...");
        
        try {
            let newMainHash = mainHash;
            if (!newMainHash) {
                setStatus("Please approve the Main Wallet invoice creation...");
                newMainHash = await generateSingleInvoice(false);
                setMainHash(newMainHash);
            }
            
            let newBurnerHash = burnerHash;
            if (!newBurnerHash && burnerAddress) {
                setStatus("Please approve the Burner Wallet invoice creation...");
                newBurnerHash = await generateSingleInvoice(true);
                setBurnerHash(newBurnerHash);
            }
            
            setStatus("Saving your Profile QR details...");
            
            // Only update backend if something was newly generated
            if (!mainHash || (!burnerHash && burnerAddress)) {
                await updateUserProfile(address, undefined, undefined, newMainHash || undefined, newBurnerHash || undefined);
            }
            
            setInitialized(true);
            setStatus("Profile QR successfully active!");
        } catch (e: any) {
            console.error("Initialization failed", e);
            setStatus(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return {
        initialized,
        loading,
        status,
        mainHash,
        burnerHash,
        initializeQRs
    };
};
