import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../../components/StatusBadge';
import { LinkButton } from '../../../components/ui/LinkButton';
import { CopyButton } from '../../../components/ui/CopyButton';
import { generateInvoicePdf } from '../../../utils/generateInvoicePdf';

interface InvoiceTableProps {
    invoices: any[];
    loading: boolean;
    search: string;
    currentPage: number;
    itemsPerPage: number;
    setCurrentPage: (page: number | ((prev: number) => number)) => void;
    onVerify: (invoice: any) => void;
    onSettle: (invoice: any) => void;
    settlingId: string | null;
    onViewPayments: (paymentIds: string[]) => void;
    transactions: any[];
}

const ShimmerRow: React.FC = () => (
    <tr className="animate-pulse">
        <td className="py-4 px-6"><div className="h-4 w-28 bg-white/10 rounded" /></td>
        <td className="py-4 px-6 text-center"><div className="h-4 w-12 bg-white/10 rounded mx-auto" /></td>
        <td className="py-4 px-6 text-center"><div className="h-5 w-16 bg-white/10 rounded mx-auto" /></td>
        <td className="py-4 px-6 text-center"><div className="h-5 w-14 bg-white/10 rounded mx-auto" /></td>
        <td className="py-4 px-6 text-center"><div className="h-5 w-16 bg-white/10 rounded-full mx-auto" /></td>
        <td className="py-4 px-6 text-center"><div className="h-4 w-16 bg-white/10 rounded mx-auto" /></td>
        <td className="py-4 px-6 text-left"><div className="h-4 w-20 bg-white/10 rounded" /></td>
        <td className="py-4 px-6 text-right"><div className="h-7 w-24 bg-white/10 rounded mx-auto" /></td>
    </tr>
);

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
    invoices,
    loading,
    search,
    currentPage,
    itemsPerPage,
    setCurrentPage,
    onVerify,
    onSettle,
    settlingId,
    onViewPayments,
    transactions
}) => {
    const navigate = useNavigate();
    const [initialGrace, setInitialGrace] = useState(true);

    // Always show shimmer for the first 5 seconds after mount, then allow empty state
    useEffect(() => {
        const timer = setTimeout(() => setInitialGrace(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    // If invoices arrive, immediately kill the grace period
    useEffect(() => {
        if (invoices.length > 0) {
            setInitialGrace(false);
        }
    }, [invoices.length]);

    const filteredInvoices = invoices.filter(inv => !search || inv.invoiceHash?.toLowerCase().includes(search.toLowerCase()));

    // Pagination Logic
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Show shimmer if loading OR still within the initial grace period (and no data yet)
    const showShimmer = invoices.length === 0 && (loading || initialGrace);
    const showEmpty = invoices.length === 0 && !loading && !initialGrace;

    return (
        <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-white/10 text-left">
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest">Invoice Hash</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Amount</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Type</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Wallet</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Tx IDs</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-left">Memo</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {showShimmer ? (
                        <>
                            <ShimmerRow />
                            <ShimmerRow />
                            <ShimmerRow />
                        </>
                    ) : showEmpty ? (
                        <tr><td colSpan={8} className="text-center py-12 text-gray-500 italic">{search ? 'No invoices match your search.' : 'No created invoices found.'}</td></tr>
                    ) : (
                        paginatedInvoices.map((inv, i) => {
                            // Base Params
                            const paymentParams = new URLSearchParams({
                                merchant: inv.owner || '',
                                amount: inv.invoiceType === 2 ? '0' : inv.amount.toString(),
                                salt: inv.salt || ''
                            });

                            if (inv.tokenType === 1) paymentParams.append('token', 'usdcx');
                            if (inv.tokenType === 2) paymentParams.append('token', 'usad');
                            if (inv.invoiceType === 1) paymentParams.append('type', 'multipay');
                            if (inv.invoiceType === 2) paymentParams.append('type', 'donation');

                            // 1. Link WITH Memo (Default)
                            if (inv.memo) paymentParams.append('memo', inv.memo);
                            const paymentLink = `${window.location.origin}/pay?${paymentParams.toString()}`;

                            // 2. Link WITHOUT Memo (Optional)
                            let paymentLinkNoMemo = undefined;
                            if (inv.memo) {
                                const paramsNo = new URLSearchParams(paymentParams);
                                paramsNo.delete('memo');
                                paymentLinkNoMemo = `${window.location.origin}/pay?${paramsNo.toString()}`;
                            }

                            return (
                                <tr
                                    key={i}
                                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                                    onClick={() => navigate(`/invoice/${inv.invoiceHash}`)}
                                >
                                    <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate(`/invoice/${inv.invoiceHash}`)}
                                                className="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors underline-offset-2 hover:underline text-left"
                                                title="Open invoice details"
                                            >
                                                {inv.invoiceHash?.slice(0, 10)}...{inv.invoiceHash?.slice(-6)}
                                            </button>
                                            <CopyButton text={inv.invoiceHash} title="Copy Invoice Hash" className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {inv.invoiceType === 2 ? (
                                            <div className="flex flex-col items-center gap-1">
                                                {inv.donations?.credits > 0 && <span className="text-xs font-bold text-white">{inv.donations.credits} <span className="text-[10px] text-gray-500 uppercase">Credits</span></span>}
                                                {inv.donations?.usdcx > 0 && <span className="text-xs font-bold text-white">{inv.donations.usdcx} <span className="text-[10px] text-gray-500 uppercase">USDCx</span></span>}
                                                {inv.donations?.usad > 0 && <span className="text-xs font-bold text-white">{inv.donations.usad} <span className="text-[10px] text-gray-500 uppercase">USAD</span></span>}
                                                {(!inv.donations || (inv.donations.credits === 0 && inv.donations.usdcx === 0 && inv.donations.usad === 0)) && (
                                                    <span className="font-bold text-gray-500">0 <span className="text-[10px] text-gray-600 uppercase">{inv.tokenType === 0 ? 'Credits' : inv.tokenType === 1 ? 'USDCx' : inv.tokenType === 2 ? 'USAD' : 'ANY'}</span></span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-white">{inv.amount}</span>
                                                <span className="text-[10px] text-gray-500 uppercase">{inv.tokenType === 0 ? 'Credits' : inv.tokenType === 1 ? 'USDCx' : 'USAD'}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${inv.invoiceType === 1 ? 'bg-purple-900/30 text-purple-400 border border-purple-500/20' :
                                            inv.invoiceType === 2 ? 'bg-pink-900/30 text-pink-400 border border-pink-500/20' :
                                                'bg-gray-800 text-gray-400 border border-white/5'
                                            }`}>
                                            {inv.invoiceType === 1 ? 'Multi' : inv.invoiceType === 2 ? 'Donate' : 'Standard'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {inv.walletType === 1 ? (
                                            <div className="flex items-center justify-center gap-1 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider border border-neon-primary/40 bg-neon-primary/10 text-neon-primary" title="Funds protected by ephemeral burner address">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                                Burner
                                            </div>
                                        ) : (
                                            <span className="text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider text-gray-500">Main</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <StatusBadge status={inv.status} />
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <div className="flex flex-col gap-1 items-center">
                                            {inv.creationTx && (
                                                <a href={`https://testnet.explorer.provable.com/transaction/${inv.creationTx}`} target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:text-neon-primary transition-colors underline decoration-dotted">
                                                    Create Tx
                                                </a>
                                            )}
                                            {inv.paymentTxIds?.length > 0 && (
                                                <div className="group/tx relative">
                                                    <button
                                                        onClick={() => onViewPayments(inv.paymentTxIds)}
                                                        className="text-[10px] text-green-500 hover:text-green-400 cursor-pointer border-b border-green-500/30 hover:border-green-400/50 transition-colors"
                                                    >
                                                        {inv.paymentTxIds.length} Payment{inv.paymentTxIds.length > 1 ? 's' : ''}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-left">
                                        <span className="text-sm text-gray-400 truncate max-w-[150px] block" title={inv.memo}>{inv.memo || '-'}</span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex gap-2 justify-end w-full">
                                            {/* DOWNLOAD PDF */}
                                            <button
                                                onClick={() => {
                                                    const dbTx = transactions.find((t: any) => t.invoice_hash === inv.invoiceHash);
                                                    generateInvoicePdf({
                                                        invoiceHash: inv.invoiceHash,
                                                        amount: inv.amount,
                                                        tokenType: inv.tokenType,
                                                        invoiceType: inv.invoiceType,
                                                        walletType: inv.walletType,
                                                        status: inv.status,
                                                        memo: inv.memo,
                                                        creationTx: inv.creationTx,
                                                        paymentTxIds: inv.paymentTxIds,
                                                        items: dbTx?.invoice_items || undefined,
                                                        donations: inv.donations || undefined,
                                                    });
                                                }}
                                                className="flex items-center justify-center w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-gray-400 hover:text-white"
                                                title="Download Invoice PDF"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                            </button>

                                            {(inv.amount === 0 && inv.invoiceType !== 2) ? (
                                                <span className="text-[10px] text-yellow-500 animate-pulse px-2">Syncing...</span>
                                            ) : (
                                                <LinkButton url={paymentLink} urlNoMemo={paymentLinkNoMemo} />
                                            )}

                                            {/* Settle Button for Donation (2) or Multipay (1) if not already settled */}
                                            {inv.status !== 'SETTLED' && (inv.invoiceType === 1 || inv.invoiceType === 2) && (
                                                <button
                                                    onClick={() => onSettle(inv)}
                                                    disabled={settlingId === inv.invoiceHash}
                                                    className="flex items-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded border border-red-500/20 hover:border-red-500/50 transition-all text-red-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Stop accepting payments and settle on-chain"
                                                >
                                                    {settlingId === inv.invoiceHash ? (
                                                        <span className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                    Settle
                                                </button>
                                            )}

                                            <button
                                                onClick={() => onVerify(inv)}
                                                className="flex items-center gap-1.5 text-xs bg-neon-primary/10 hover:bg-neon-primary/20 px-3 py-1.5 rounded-md border border-neon-primary/20 hover:border-neon-primary/50 transition-all text-neon-primary font-medium group/btn"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Verify
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6 pb-4">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="flex gap-2">
                        {Array.from({ length: totalPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${currentPage === pageNum
                                        ? 'bg-neon-primary text-black font-bold shadow-lg shadow-neon-primary/20'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};
