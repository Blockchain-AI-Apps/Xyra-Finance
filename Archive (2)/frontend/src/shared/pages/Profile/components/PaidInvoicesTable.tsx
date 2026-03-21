import React, { useMemo } from 'react';
import { Shimmer } from '../../../components/ui/Shimmer';
import { CopyButton } from '../../../components/ui/CopyButton';
import { PayerReceipt } from '../../../utils/aleo-utils';

interface PaidInvoicesTableProps {
    receipts: PayerReceipt[];
    loading: boolean;
    search: string;
    onViewReceipts: (hashes: string[]) => void;
}

export const PaidInvoicesTable: React.FC<PaidInvoicesTableProps> = ({ receipts, loading, search, onViewReceipts }) => {
    // Process receipts to group by invoiceHash
    const groupedReceipts = useMemo(() => {
        // Deduplicate by receiptHash first
        const seenReceipts = new Set<string>();
        const deduped = receipts.filter(r => {
            if (seenReceipts.has(r.receiptHash)) return false;
            seenReceipts.add(r.receiptHash);
            return true;
        });

        const grouped = new Map<string, PayerReceipt[]>();
        deduped.forEach(r => {
            const key = r.invoiceHash;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(r);
        });

        return Array.from(grouped.entries())
            .filter(([hash]) => !search || hash.toLowerCase().includes(search.toLowerCase()));
    }, [receipts, search]);

    return (
        <table className="w-full">
            <thead>
                <tr className="bg-black/40 border-b border-white/5 text-left">
                    <th className="py-5 px-6 text-xs font-bold text-gray-300 uppercase tracking-wider">Invoice Hash</th>
                    <th className="py-5 px-6 text-xs font-bold text-gray-300 uppercase tracking-wider text-center">Amount Paid</th>
                    <th className="py-5 px-6 text-xs font-bold text-gray-300 uppercase tracking-wider text-right">Receipt Hash</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                            <td className="py-5 px-6"><Shimmer className="h-6 w-48 bg-white/5 rounded" /></td>
                            <td className="py-5 px-6 text-center"><Shimmer className="h-6 w-24 bg-white/5 rounded mx-auto" /></td>
                            <td className="py-5 px-6 text-right"><Shimmer className="h-6 w-48 bg-white/5 rounded ml-auto" /></td>
                        </tr>
                    ))
                ) : groupedReceipts.length === 0 ? (
                    <tr>
                        <td colSpan={3} className="py-8 text-center text-gray-500 italic">No paid invoices found.</td>
                    </tr>
                ) : (
                    groupedReceipts.map(([invoiceHash, receipts]) => {
                        let totalCredits = 0;
                        let totalUSDCx = 0;
                        let totalUSAD = 0;
                        
                        receipts.forEach(r => {
                           if (r.tokenType === 1) totalUSDCx += r.amount;
                           else if (r.tokenType === 2) totalUSAD += r.amount;
                           else totalCredits += r.amount;
                        });

                        return (
                            <tr key={invoiceHash} className="hover:bg-white/5 transition-colors group">
                                <td className="py-5 px-6">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm text-gray-300 truncate max-w-[120px]" title={invoiceHash}>
                                            {invoiceHash.slice(0, 10)}...{invoiceHash.slice(-8)}
                                        </span>
                                        <CopyButton text={invoiceHash} title="Copy Invoice Hash" className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white" />
                                    </div>
                                    <span className="block text-[10px] text-gray-500 mt-0.5">{receipts.length} payments</span>
                                </td>
                                <td className="py-5 px-6 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        {totalCredits > 0 && <span className="font-bold text-white text-md">{totalCredits / 1_000_000} <span className="text-[10px] text-gray-500 uppercase">Credits</span></span>}
                                        {totalUSDCx > 0 && <span className="font-bold text-white text-md">{totalUSDCx / 1_000_000} <span className="text-[10px] text-gray-500 uppercase">USDCx</span></span>}
                                        {totalUSAD > 0 && <span className="font-bold text-white text-md">{totalUSAD / 1_000_000} <span className="text-[10px] text-gray-500 uppercase">USAD</span></span>}
                                        {totalCredits === 0 && totalUSDCx === 0 && totalUSAD === 0 && <span className="font-bold text-white text-md">0</span>}
                                    </div>
                                </td>
                                <td className="py-5 px-6 text-right font-mono text-neon-accent text-sm">
                                    {receipts.length === 1 ? (
                                        <div className="flex justify-end items-center gap-3 group/rh">
                                            <span className="text-gray-400 group-hover:text-white transition-colors truncate max-w-[100px]" title={receipts[0].receiptHash}>
                                                {receipts[0].receiptHash.slice(0, 8)}...{receipts[0].receiptHash.slice(-6)}
                                            </span>
                                            <CopyButton text={receipts[0].receiptHash} title="Copy Receipt Hash" className="flex items-center gap-1.5 text-xs bg-neon-accent/10 hover:bg-neon-accent/20 text-neon-accent px-3 py-1.5 rounded border border-neon-accent/30 transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.2)]" />
                                        </div>
                                    ) : (
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => onViewReceipts(receipts.map(r => r.receiptHash))}
                                                className="text-xs bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded text-purple-400 border border-purple-500/20 transition-colors font-bold"
                                            >
                                                Receipts ({receipts.length})
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
    );
};
