import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';

interface PaymentHistoryModalProps {
    paymentIds: string[] | null;
    onClose: () => void;
    onViewTx: (txId: string) => void;
}

import { createPortal } from 'react-dom';

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({ paymentIds, onClose, onViewTx }) => {
    return createPortal(
        <AnimatePresence>
            {paymentIds && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
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
                            <h3 className="text-xl font-bold text-white">Payment History</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="space-y-3">
                            {paymentIds.map((id, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/10">
                                    <span className="font-mono text-xs text-gray-300 truncate flex-1 mr-4" title={id}>
                                        {id.length > 24 ? `${id.slice(0, 12)}...${id.slice(-10)}` : id}
                                    </span>
                                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => onViewTx(id)}>
                                        View Tx
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
