import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';
import { CopyButton } from '../../../../components/ui/CopyButton';
import { MerchantReceipt } from '../../../../utils/aleo-utils';

interface VerifyModalProps {
    isOpen: boolean;
    onClose: () => void;
    verifyingInvoice: any;
    verifyInput: string;
    setVerifyInput: (value: string) => void;
    verifyStatus: 'IDLE' | 'CHECKING' | 'FOUND' | 'NOT_FOUND' | 'ERROR' | 'MISMATCH';
    verifiedRecord: any;
    merchantReceipts: MerchantReceipt[];
    onVerify: () => void;
}

export const VerifyModal: React.FC<VerifyModalProps> = ({
    isOpen,
    onClose,
    verifyingInvoice,
    verifyInput,
    setVerifyInput,
    verifyStatus,
    verifiedRecord,
    merchantReceipts,
    onVerify
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Verify Invoice Payment</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
                        </div>

                        {verifyingInvoice && (
                            <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/5">
                                <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Verifying For Invoice</div>
                                <div className="font-mono text-neon-primary text-sm truncate">{verifyingInvoice.invoiceHash}</div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Payer Receipt Hash</label>
                                <input
                                    type="text"
                                    value={verifyInput}
                                    onChange={(e) => setVerifyInput(e.target.value)}
                                    placeholder="Enter receipt hash..."
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon-primary"
                                />
                                <p className="text-xs text-gray-500 mt-2">Enter the receipt hash provided by the payer.</p>
                            </div>

                            {/* PAYMENT RECORDS LIST */}
                            {verifyingInvoice && (() => {
                                const seen = new Set<string>();
                                const matchingReceipts = merchantReceipts.filter(r => {
                                    if (r.invoiceHash !== verifyingInvoice.invoiceHash) return false;
                                    if (seen.has(r.receiptHash)) return false;
                                    seen.add(r.receiptHash);
                                    return true;
                                });
                                if (matchingReceipts.length === 0) return null;
                                return (
                                    <div className="mt-2">
                                        <div className="flex items-center gap-2 mb-3">
                                            <svg className="w-4 h-4 text-neon-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v13a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            <span className="text-sm font-bold text-white uppercase tracking-wider">Payment Records ({matchingReceipts.length})</span>
                                        </div>
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                            {matchingReceipts.map((receipt, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-lg border border-white/5 transition-colors cursor-pointer group"
                                                    onClick={() => setVerifyInput(receipt.receiptHash)}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-neon-accent text-xs">#{idx + 1}</span>
                                                        <span className="font-mono text-sm text-gray-300 group-hover:text-white transition-colors truncate">
                                                            {receipt.receiptHash.slice(0, 12)}...{receipt.receiptHash.slice(-8)}
                                                        </span>
                                                        <CopyButton text={receipt.receiptHash} title="Copy Receipt Hash" className="text-gray-600 hover:text-white flex-shrink-0" />
                                                    </div>
                                                    <span className="font-bold text-white text-sm whitespace-nowrap ml-3">
                                                        {receipt.amount / 1_000_000} <span className="text-xs text-gray-400 font-normal">{receipt.tokenType === 0 ? 'Credits' : receipt.tokenType === 1 ? 'USDCx' : 'USAD'}</span>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 italic">Click a record to auto-fill its receipt hash for verification.</p>
                                    </div>
                                );
                            })()}

                            {verifyStatus === 'FOUND' && verifiedRecord && (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2 text-green-400 font-bold">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Payment Verified!
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Amount Paid:</span>
                                            <span className="text-white font-mono">{verifiedRecord.amount} {verifiedRecord.tokenType === 0 ? 'Credits' : verifiedRecord.tokenType === 1 ? 'USDCx' : 'USAD'}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-2">Matches your private records.</div>
                                    </div>
                                </div>
                            )}

                            {verifyStatus === 'MISMATCH' && verifiedRecord && (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2 text-yellow-400 font-bold">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        Invoice Mismatch
                                    </div>
                                    <div className="text-sm text-gray-300">
                                        This receipt is valid but belongs to a <strong>different invoice</strong>.
                                        <div className="mt-1 font-mono text-xs text-gray-500">Receipt Invoice: {verifiedRecord.invoiceHash.slice(0, 10)}...</div>
                                    </div>
                                </div>
                            )}

                            {verifyStatus === 'NOT_FOUND' && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center text-red-400 text-sm">
                                    No matching receipt found in your records.
                                </div>
                            )}

                            <Button
                                className="w-full mt-4"
                                onClick={onVerify}
                                disabled={verifyStatus === 'CHECKING' || !verifyInput}
                            >
                                {verifyStatus === 'CHECKING' ? 'Checking Records...' : 'Verify Receipt'}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
