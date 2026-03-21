import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { getUserProfile } from '../services/api';
import { PROGRAM_ID, parseBurnerBackupRecord } from '../utils/aleo-utils';
import { fieldChunksToString, decryptWithPassword } from '../utils/crypto';

interface BurnerWalletContextType {
    burnerAddress: string | null;
    decryptedBurnerKey: string | null;
    setDecryptedBurnerKey: (key: string | null) => void;
    encryptedBurnerKey: string | null;
    refreshProfile: () => Promise<void>;
    fetchedFromChain: boolean;
    hasOnChainRecord: boolean;
    setHasOnChainRecord: (v: boolean) => void;
}

const BurnerWalletContext = createContext<BurnerWalletContextType | undefined>(undefined);

export const BurnerWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { address, requestRecords, decrypt } = useWallet();
    const [burnerAddress, setBurnerAddress] = useState<string | null>(null);
    const [encryptedBurnerKey, setEncryptedBurnerKey] = useState<string | null>(null);
    const [decryptedBurnerKey, setDecryptedBurnerKey] = useState<string | null>(null);
    const [fetchedFromChain, setFetchedFromChain] = useState<boolean>(false);
    const [hasOnChainRecord, setHasOnChainRecord] = useState<boolean>(false);

    const refreshProfile = async () => {
        if (!address) {
            setBurnerAddress(null);
            setEncryptedBurnerKey(null);
            setDecryptedBurnerKey(null);
            setFetchedFromChain(false);
            setHasOnChainRecord(false);
            return;
        }
        
        try {
            const profile = await getUserProfile(address);
            if (profile) {
                setBurnerAddress(profile.burner_address || null);
                setEncryptedBurnerKey(profile.encrypted_burner_key || null);
            }
        } catch (error) {
            console.error("Failed to fetch user profile for burner wallet details", error);
        }
    };

    useEffect(() => {
        refreshProfile();
    }, [address]);

    // Silent background check and auto-unlock to see if a record already exists
    useEffect(() => {
        const fetchAndUnlockFromChain = async () => {
             // Only run if we don't have it decrypted yet
             if (decryptedBurnerKey || !address || !requestRecords || !burnerAddress) return;
             
             try {
                 const records = await requestRecords(PROGRAM_ID, true);
                 if (!records) return;
                 
                 for (const r of (records as any[])) {
                     let plaintext = r.plaintext;
                     const cipher = r.recordCiphertext || r.ciphertext;
                     if (!plaintext && cipher && decrypt) {
                         try {
                              plaintext = await decrypt(cipher);
                         } catch (e) { continue; }
                     }
                     
                     const burnerRecord = parseBurnerBackupRecord({ ...r, plaintext });
                     if (burnerRecord && burnerRecord.burnerAddress === burnerAddress && burnerRecord.passwordPart) {
                          setHasOnChainRecord(true);
                          
                          const passwordStr = fieldChunksToString([burnerRecord.passwordPart]);
                          const encryptedPayload = fieldChunksToString(burnerRecord.pkParts);
                          
                          try {
                               const decryptedKey = await decryptWithPassword(encryptedPayload, passwordStr);
                               import('@provablehq/sdk').then(({ PrivateKey }) => {
                                    PrivateKey.from_string(decryptedKey);
                                    setDecryptedBurnerKey(decryptedKey);
                                    setFetchedFromChain(true); 
                                    setBurnerAddress(burnerRecord.burnerAddress);
                                    setEncryptedBurnerKey(encryptedPayload);
                               });
                               console.log("🔓 Automatically unlocked Burner Wallet using on-chain record!");
                               return; 
                          } catch (e) { console.warn("Found record but decryption failed", e); }
                     }
                 }
             } catch (e) {
                 console.error("Auto-unlock from chain failed", e);
             }
        };

        if (burnerAddress && !hasOnChainRecord) {
            fetchAndUnlockFromChain();
        }
    }, [address, burnerAddress, decryptedBurnerKey, requestRecords, decrypt, hasOnChainRecord]);

    return (
        <BurnerWalletContext.Provider value={{
            burnerAddress,
            decryptedBurnerKey,
            setDecryptedBurnerKey,
            encryptedBurnerKey,
            refreshProfile,
            fetchedFromChain,
            hasOnChainRecord,
            setHasOnChainRecord
        }}>
            {children}
        </BurnerWalletContext.Provider>
    );
};

export const useBurnerWallet = () => {
    const context = useContext(BurnerWalletContext);
    if (!context) {
        throw new Error('useBurnerWallet must be used within a BurnerWalletProvider');
    }
    return context;
};
