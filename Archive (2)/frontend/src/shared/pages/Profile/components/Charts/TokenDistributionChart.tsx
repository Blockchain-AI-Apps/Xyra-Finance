import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { GlassCard } from '../../../../components/ui/GlassCard';
import { MerchantReceipt } from '../../../../utils/aleo-utils';
import { Shimmer } from '../../../../components/ui/Shimmer';

interface TokenDistributionChartProps {
    receipts: MerchantReceipt[];
    isLoading?: boolean;
}

export const TokenDistributionChart: React.FC<TokenDistributionChartProps> = ({ receipts, isLoading }) => {
    // 0 = Credits, 1 = USDCx, 2 = USAD
    const creditsVolume = receipts
        .filter(r => r.tokenType === 0)
        .reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0);

    const usdcxVolume = receipts
        .filter(r => r.tokenType === 1)
        .reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0);

    const usadVolume = receipts
        .filter(r => r.tokenType === 2)
        .reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0);

    const data = [
        { name: 'Credits', value: Number(creditsVolume.toFixed(2)), color: '#FFFFFF' }, // White
        { name: 'USDCx', value: Number(usdcxVolume.toFixed(2)), color: '#60A5FA' }, // blue-400
        { name: 'USAD', value: Number(usadVolume.toFixed(2)), color: '#34D399' }, // emerald-400
    ].filter(item => item.value > 0);

    const renderCustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-lg text-sm text-white">
                    <p className="font-bold mb-1">{payload[0].name}</p>
                    <p className="text-gray-300">
                        Volume: <span className="text-white font-medium">{payload[0].value}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <GlassCard className="p-6 flex flex-col items-center justify-center group hover:border-white/20 h-full">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest block w-full text-left mb-4">Token Distribution</h3>
            {isLoading ? (
                <div className="w-full flex-1 flex flex-col items-center justify-center gap-4">
                    <Shimmer className="w-[120px] h-[120px] rounded-full bg-white/5" />
                    <Shimmer className="w-32 h-4 rounded-md bg-white/5" />
                </div>
            ) : data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm h-[140px]">
                    No tokens received yet
                </div>
            ) : (
                <div className="w-full h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={renderCustomTooltip} />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}
        </GlassCard>
    );
};
