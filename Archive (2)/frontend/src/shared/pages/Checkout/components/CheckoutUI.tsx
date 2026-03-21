import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Button } from '../../../components/ui/Button';
import { Shimmer } from '../../../components/ui/Shimmer';
import { CheckoutSession } from '../types';

interface CheckoutUIProps {
    session: CheckoutSession | null;
    loading: boolean;
    error: string | null;
    publicKey: string | null | undefined;
    paymentStatus: string;
    paymentLoading: boolean;
    txId: string | null;
    success: boolean;
    onPay: () => void;
}

export const CheckoutUI: React.FC<CheckoutUIProps> = ({
    session,
    loading,
    error,
    publicKey,
    paymentStatus,
    paymentLoading,
    success,
    onPay
}) => {
const [copiedLink, setCopiedLink] = useState(false);
    const [copiedHash, setCopiedHash] = useState(false);
    const [copiedSalt, setCopiedSalt] = useState(false);


    const paymentLink = typeof window !== 'undefined' && session ? (() => {
        const params = new URLSearchParams({
            merchant: session.merchant_address || session.merchants?.aleo_address || '',
            amount: `${Math.round(session.amount * 1_000_000)}${session.token_type === 'CREDITS' ? 'u64' : 'u128'}`,
            salt: session.salt || '',
            type: 'multipay',
            token: (session.token_type || 'usdcx').toLowerCase(),
            session_id: session.id
        });
        return `${window.location.origin}/pay?${params.toString()}`;
    })() : '';

    return (
        <div className="flex flex-col items-center justify-center min-h-[85vh]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold tracking-tighter text-white">
                        NullPay <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-white">Checkout</span>
                    </h1>
                </div>

                <GlassCard variant="heavy" className="p-8 relative overflow-hidden">
                    {!session && error ? (
                        <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    ) : loading && !session ? (
                        <div className="space-y-4">
                            <Shimmer className="h-4 w-1/3 bg-white/5 mx-auto rounded-md" />
                            <Shimmer className="h-10 w-full bg-white/5 rounded-xl" />
                            <Shimmer className="h-10 w-full bg-white/5 rounded-xl" />
                        </div>
                    ) : success || session?.status === 'SETTLED' ? (
                        <div className="text-center py-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-16 h-16 bg-neon-primary/20 border-2 border-neon-primary rounded-full flex items-center justify-center mx-auto mb-4"
                            >
                                <svg className="w-8 h-8 text-neon-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </motion.div>
                            <h2 className="text-xl font-bold text-white mb-2">Payment Successful</h2>
                            <p className="text-sm text-gray-400 mb-6">Your transaction has been securely settled on the Aleo blockchain.</p>
                            <p className="text-xs text-gray-500 mt-4 animate-pulse">Redirecting you back to merchant...</p>
                        </div>
                    ) : session ? (
                        <div className="space-y-6">
                            {/* Merchant Info */}
                            <div className="text-center pb-6 border-b border-white/10">
                                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Paying To</p>
                                <p className="text-lg font-bold text-white">{session.merchant_name}</p>
                            </div>

                            {/* Amount Info */}
                            <div className="text-center pb-6 border-b border-white/10">
                                <p className="text-4xl font-black text-white tracking-tighter mb-1">
                                    {session.amount} <span className="text-sm font-medium text-gray-500">{session.token_type}</span>
                                </p>
                            </div>

                            {/* Invoice Details */}
                            <div className="pt-6 pb-6 border-b border-white/10">
                                <div className="flex justify-center mb-6">
                                    <div className="p-3 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                        <QRCodeSVG
                                            value={paymentLink}
                                            size={140}
                                            level="H"
                                            includeMargin={false}
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-left ml-1">Payment Link</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 font-mono text-xs text-gray-300 truncate flex items-center">
                                            {paymentLink}
                                        </div>
                                        <Button
                                            variant={copiedLink ? "primary" : "secondary"}
                                            onClick={() => {
                                                navigator.clipboard.writeText(paymentLink);
                                                setCopiedLink(true);
                                                setTimeout(() => setCopiedLink(false), 2000);
                                            }}
                                            className="!py-2 !px-4 text-xs h-auto"
                                        >
                                            {copiedLink ? 'Copied!' : 'Copy'}
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-left">
                                    <div
                                        onClick={() => {
                                            if (session.invoice_hash) {
                                                navigator.clipboard.writeText(session.invoice_hash);
                                                setCopiedHash(true);
                                                setTimeout(() => setCopiedHash(false), 2000);
                                            }
                                        }}
                                        className="p-3 rounded-xl border border-white/5 bg-black/30 hover:border-neon-primary/30 transition-colors group cursor-pointer active:scale-95"
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest">Hash</span>
                                            {copiedHash ? (
                                                <span className="text-[9px] text-neon-primary font-bold">Copied!</span>
                                            ) : (
                                                <svg className="w-3 h-3 text-gray-600 group-hover:text-neon-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="font-mono text-neon-accent truncate block text-[10px] group-hover:text-neon-primary transition-colors" title={session.invoice_hash}>
                                            {session.invoice_hash ? `${session.invoice_hash.slice(0, 6)}...${session.invoice_hash.slice(-6)}` : 'Generating...'}
                                        </span>
                                    </div>
                                    <div
                                        onClick={() => {
                                            if (session.salt) {
                                                navigator.clipboard.writeText(session.salt);
                                                setCopiedSalt(true);
                                                setTimeout(() => setCopiedSalt(false), 2000);
                                            }
                                        }}
                                        className="p-3 rounded-xl border border-white/5 bg-black/30 hover:border-purple-500/30 transition-colors group cursor-pointer active:scale-95"
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest">Salt</span>
                                            {copiedSalt ? (
                                                <span className="text-[9px] text-purple-400 font-bold">Copied!</span>
                                            ) : (
                                                <svg className="w-3 h-3 text-gray-600 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="font-mono text-purple-400 truncate block text-[10px] group-hover:text-purple-300 transition-colors" title={session.salt}>
                                            {session.salt ? `${session.salt.slice(0, 6)}...${session.salt.slice(-4)}` : 'Generating...'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Status and Action */}
                            <div className="space-y-4 pt-2">
                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center animate-fade-in">
                                        <p className="text-red-400 text-sm">{error}</p>
                                    </div>
                                )}

                                {paymentStatus && !error && (
                                    <div className="p-3 bg-neon-primary/10 border border-neon-primary/20 rounded-xl text-center">
                                        <p className="text-xs text-neon-primary font-mono">{paymentStatus}</p>
                                    </div>
                                )}

                                {!publicKey ? (
                                    <div className="wallet-adapter-wrapper w-full [&>button]:!w-full [&>button]:!justify-center">
                                        <WalletMultiButton className="!w-full !bg-white !text-black !font-bold !rounded-xl !h-12 hover:!bg-gray-200 transition-colors" />
                                    </div>
                                ) : (
                                    <Button
                                        variant="primary"
                                        onClick={onPay}
                                        disabled={paymentLoading}
                                        glow
                                        className="w-full text-lg h-14"
                                    >
                                        {paymentLoading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                Processing on-chain...
                                            </span>
                                        ) : (
                                            `Pay ${session.amount} ${session.token_type}`
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : null}
                </GlassCard>

                <p className="text-center mt-6 text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                    Zero-Knowledge Privacy • Instant Settlement
                </p>
            </motion.div>
        </div>
    );
};
