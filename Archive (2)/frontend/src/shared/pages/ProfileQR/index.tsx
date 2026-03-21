import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useBurnerWallet } from '../../hooks/BurnerWalletProvider';
import { PROGRAM_ID, parseMerchantReceipt, MerchantReceipt } from '../../utils/aleo-utils';
import { useProfileQR } from '../../hooks/useProfileQR';
import { ProfileQR } from '../Profile/components/ProfileQR';

const ProfileQRPage: React.FC = () => {
    const { requestRecords, decrypt } = useWallet();
    const { decryptedBurnerKey } = useBurnerWallet();
    const { mainHash, burnerHash } = useProfileQR();

    const [mainReceipts, setMainReceipts] = useState<MerchantReceipt[]>([]);
    const [burnerReceipts, setBurnerReceipts] = useState<MerchantReceipt[]>([]);

    useEffect(() => {
        const fetchReceipts = async () => {
            if (!requestRecords || !decrypt || !mainHash) return;
            try {
                const records = await requestRecords(PROGRAM_ID, true);
                const validReceipts: MerchantReceipt[] = [];
                if (records) {
                    for (const r of (records as any[])) {
                        if (r.spent) continue;
                        let plaintext = r.plaintext;
                        const cipher = r.recordCiphertext || r.ciphertext;
                        if (!plaintext && cipher) {
                            try { plaintext = await decrypt(cipher); } catch (e) { }
                        }
                        const receipt = parseMerchantReceipt({ ...r, plaintext });
                        if (receipt && receipt.invoiceHash === mainHash) {
                            validReceipts.push(receipt);
                        }
                    }
                }
                setMainReceipts(validReceipts.reverse());
            } catch (e) { console.error(e); }
        };
        fetchReceipts();
    }, [requestRecords, mainHash, decrypt]);

    useEffect(() => {
        const fetchBurner = async () => {
            if (!decryptedBurnerKey || !burnerHash) return;
            // Since we don't know the exact txIds of ALL burner payments easily without indexing,
            // we rely on the Profile page's extensive lookup to get full history,
            // but for this tab, we can let useProfilePayments handle LIVE incoming, 
            // and we pass empty array or we would need the backend to give us the txIds again.
            // For simplicity and speed in this tab, we will fetch standard records via public client if we had them indexed,
            // or we just let it be empty and rely on live feed. The user can view history in Profile tab.
            // Let's at least initialize with empty to let live feed take over.
            setBurnerReceipts([]);
        };
        fetchBurner();
    }, [decryptedBurnerKey, burnerHash]);
    
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="page-container relative min-h-screen">
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-white/5 rounded-full blur-[120px] animate-pulse-slow" />
            </div>
            <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-screen h-[800px] z-0 pointer-events-none flex justify-center overflow-hidden">
                <img src="/assets/aleo_globe.png" alt="Aleo Globe" className="w-full h-full object-cover opacity-50 mix-blend-screen mask-image-gradient-b" style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)' }} />
            </div>

                <motion.div initial="hidden" animate="visible" variants={itemVariants} className="w-full max-w-2xl mx-auto mt-16 relative z-10 mb-12">
                    <ProfileQR initialMainReceipts={mainReceipts} initialBurnerReceipts={burnerReceipts} />
                </motion.div>
            
        </div>
    );
};

export default ProfileQRPage;
