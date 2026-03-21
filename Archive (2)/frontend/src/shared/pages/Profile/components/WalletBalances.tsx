import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shimmer } from '../../../components/ui/Shimmer';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

interface WalletBalancesProps {
    itemVariants: any;
}

interface TokenBalance {
    name: string;
    public: string;
    private: string;
    loading: boolean;
}

export const WalletBalances: React.FC<WalletBalancesProps> = ({ itemVariants }) => {
    const { address, requestRecords, decrypt } = useWallet();
    
    const [balances, setBalances] = useState<TokenBalance[]>([
        { name: 'Credits', public: '0.00', private: '0.00', loading: true },
        { name: 'USDCx', public: '0.00', private: '0.00', loading: true },
        { name: 'USAD', public: '0.00', private: '0.00', loading: true },
    ]);

    const extractAmount = async (record: any, fieldName: string, typeSuffix: string): Promise<bigint> => {
        try {
            if (record.data && record.data[fieldName]) return BigInt(record.data[fieldName].replace(typeSuffix, ''));
            if (record.plaintext) {
                const regex = new RegExp(`${fieldName}:\\s*([\\d_]+)${typeSuffix}`);
                const match = record.plaintext.match(regex);
                if (match && match[1]) return BigInt(match[1].replace(/_/g, ''));
            }
            if (record.recordCiphertext && !record.plaintext && decrypt) {
                try {
                    const decrypted = await decrypt(record.recordCiphertext);
                    if (decrypted) {
                        record.plaintext = decrypted;
                        const regex = new RegExp(`${fieldName}:\\s*([\\d_]+)${typeSuffix}`);
                        const match = decrypted.match(regex);
                        if (match && match[1]) return BigInt(match[1].replace(/_/g, ''));
                    }
                } catch (e) { /* ignore */ }
            }
            return BigInt(0);
        } catch { return BigInt(0); }
    };

    const fetchTokenData = async (
        programId: string, 
        name: string, 
        fieldName: string, 
        typeSuffix: string,
        mappingName: string
    ): Promise<TokenBalance> => {
        let pubBal = '0.00';
        let privBal = '0.00';

        // Public
        try {
            const response = await fetch(`https://api.explorer.aleo.org/v1/testnet/program/${programId}/mapping/${mappingName}/${address}`);
            if (response.ok) {
                const data = await response.json();
                const str = String(data).replace(typeSuffix, '').replace(/"/g, '');
                pubBal = (Number(str) / 1_000_000).toFixed(2);
            }
        } catch (e) { }

        // Private
        try {
            if (requestRecords) {
                const records: any = await requestRecords(programId, false);
                let total = BigInt(0);
                for (const r of records) {
                    if (r.spent) continue;
                    const val = await extractAmount(r, fieldName, typeSuffix);
                    total += val;
                }
                privBal = (Number(total) / 1_000_000).toFixed(2);
            }
        } catch (e) { }

        return { name, public: pubBal, private: privBal, loading: false };
    };

    const fetchAll = useCallback(async () => {
        if (!address) {
            setBalances(prev => prev.map(b => ({ ...b, loading: false })));
            return;
        }

        const tokensInfo = [
            { programId: 'credits.aleo', name: 'Credits', fieldName: 'microcredits', typeSuffix: 'u64', mappingName: 'account' },
            { programId: 'test_usdcx_stablecoin.aleo', name: 'USDCx', fieldName: 'amount', typeSuffix: 'u128', mappingName: 'balances' },
            { programId: 'test_usad_stablecoin.aleo', name: 'USAD', fieldName: 'amount', typeSuffix: 'u128', mappingName: 'balances' }
        ];

        try {
            const results = await Promise.all(
                tokensInfo.map(t => fetchTokenData(t.programId, t.name, t.fieldName, t.typeSuffix, t.mappingName))
            );
            setBalances(results);
        } catch (e) {
            console.error("Failed to fetch all tokens:", e);
            setBalances(prev => prev.map(b => ({ ...b, loading: false })));
        }
    }, [address, requestRecords, decrypt]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return (
        <motion.div variants={itemVariants} className="flex flex-wrap gap-3 justify-center items-center mt-[-1rem] mb-4">
            {balances.map((token) => (
                <div key={token.name} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-sm group hover:border-white/20 hover:bg-white/10 transition-colors">
                    <span className="text-[10px] font-bold text-white tracking-widest uppercase w-14">{token.name}</span>
                    <div className="w-px h-5 bg-white/10" />
                    <div className="flex items-center gap-1.5 min-w-[70px]">
                        <span className="text-gray-400 text-[10px]" title="Public Balance">🌐</span>
                        {token.loading ? (
                            <Shimmer className="h-4 w-10 bg-white/10 rounded-sm" />
                        ) : (
                            <span className="text-xs font-bold text-white tracking-tighter truncate">{token.public}</span>
                        )}
                    </div>
                    <div className="w-px h-5 bg-white/10" />
                    <div className="flex items-center gap-1.5 min-w-[70px] relative">
                        <span className="text-neon-primary text-[10px]" title="Private Balance">🔒</span>
                        {token.loading ? (
                            <Shimmer className="h-4 w-10 bg-white/10 rounded-sm" />
                        ) : (
                            <span className="text-xs font-bold text-white tracking-tighter truncate">{token.private}</span>
                        )}
                        <div className="absolute inset-0 right-0 w-8 h-8 rounded-full bg-neon-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                    </div>
                </div>
            ))}
        </motion.div>
    );
};
