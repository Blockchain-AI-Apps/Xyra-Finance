import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Shimmer } from '../../../components/ui/Shimmer';

interface StatsCardsProps {
    merchantStats: {
        mainCredits: string;
        mainUSDCx: string;
        mainUSAD: string;
        burnerCredits: string;
        burnerUSDCx: string;
        burnerUSAD: string;
        invoices: number;
        settled: number;
        pending: number;
    };
    loadingReceipts: boolean;
    loadingCreated: boolean;

    loadingBurner: boolean;
    itemVariants: any;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ merchantStats, loadingReceipts, loadingCreated, loadingBurner, itemVariants }) => {
    return (
        <motion.div variants={itemVariants} className="flex flex-col gap-4 h-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Main Volume</span>
                {(loadingReceipts || loadingBurner) ? (
                    <Shimmer className="h-10 w-24 bg-white/5 rounded-md" />
                ) : (
                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.mainCredits}</span>
                            <span className="text-[10px] font-normal text-gray-500 uppercase">Credits</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.mainUSDCx}</span>
                            <span className="text-[10px] font-normal text-purple-400 uppercase">USDCx</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.mainUSAD}</span>
                            <span className="text-[10px] font-normal text-emerald-400 uppercase">USAD</span>
                        </div>
                    </div>
                )}
            </GlassCard>

            <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-neon-primary/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-bold text-neon-primary uppercase tracking-widest mb-3 block">Burner Volume</span>
                {(loadingReceipts || loadingBurner) ? (
                    <Shimmer className="h-10 w-24 bg-white/5 rounded-md" />
                ) : (
                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.burnerCredits}</span>
                            <span className="text-[10px] font-normal text-gray-500 uppercase">Credits</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.burnerUSDCx}</span>
                            <span className="text-[10px] font-normal text-purple-400 uppercase">USDCx</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white tracking-tighter">{merchantStats.burnerUSAD}</span>
                            <span className="text-[10px] font-normal text-emerald-400 uppercase">USAD</span>
                        </div>
                    </div>
                )}
            </GlassCard>
            </div>
            
            <div className="grid grid-cols-3 gap-4 h-full">
            <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Total Invoices</span>
                {(loadingCreated || loadingBurner) ? (
                    <Shimmer className="h-10 w-12 bg-white/5 rounded-md" />
                ) : (
                    <h2 className="text-3xl font-bold text-white tracking-tighter">{merchantStats.invoices}</h2>
                )}
            </GlassCard>
            
            <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Pending</span>
                {(loadingCreated || loadingBurner) ? (
                    <Shimmer className="h-10 w-12 bg-white/5 rounded-md" />
                ) : (
                    <h2 className="text-3xl font-bold text-yellow-400 tracking-tighter">{merchantStats.pending}</h2>
                )}
            </GlassCard>
            <GlassCard className="p-6 flex flex-col justify-center group hover:border-white/20">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Settled</span>
                {(loadingCreated || loadingBurner) ? (
                    <Shimmer className="h-10 w-12 bg-white/5 rounded-md" />
                ) : (
                    <h2 className="text-3xl font-bold text-green-400 tracking-tighter">{merchantStats.settled}</h2>
                )}
            </GlassCard>
            </div>
        </motion.div>
    );
};
