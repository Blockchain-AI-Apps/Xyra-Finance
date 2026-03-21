import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CopyButton } from '../../../../components/ui/CopyButton';

interface ReceiptHashesModalProps {
    receiptHashes: string[] | null;
    onClose: () => void;
}

export const ReceiptHashesModal: React.FC<ReceiptHashesModalProps> = ({ receiptHashes, onClose }) => {
    return (
        <AnimatePresence>
            {receiptHashes && (
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
                        className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Receipt Hashes</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="space-y-3">
                            {receiptHashes.map((hash, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/10">
                                    <span className="font-mono text-xs text-gray-300 truncate flex-1 mr-4" title={hash}>
                                        {hash.length > 24 ? `${hash.slice(0, 12)}...${hash.slice(-10)}` : hash}
                                    </span>
                                    <CopyButton text={hash} title="Copy Receipt Hash" className="flex items-center gap-1.5 text-xs bg-neon-accent/10 hover:bg-neon-accent/20 text-neon-accent px-3 py-1.5 rounded border border-neon-accent/30 transition-all" />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
