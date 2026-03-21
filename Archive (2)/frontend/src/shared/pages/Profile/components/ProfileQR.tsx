import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Button } from '../../../components/ui/Button';
import { Shimmer } from '../../../components/ui/Shimmer';
import { useProfileQR } from '../../../hooks/useProfileQR';
import { useProfilePayments } from '../../../hooks/useProfilePayments';
import { useBurnerWallet } from '../../../hooks/BurnerWalletProvider';
import { MerchantReceipt } from '../../../utils/aleo-utils';

interface ProfileQRProps {
    initialMainReceipts: MerchantReceipt[];
    initialBurnerReceipts: MerchantReceipt[];
}

export const ProfileQR: React.FC<ProfileQRProps> = ({ initialMainReceipts, initialBurnerReceipts }) => {
    const { initialized, loading, status, mainHash, burnerHash, initializeQRs } = useProfileQR();
    const { unifiedPayments } = useProfilePayments(mainHash, burnerHash, initialMainReceipts, initialBurnerReceipts);
    const { burnerAddress } = useBurnerWallet();
    const [qrType, setQrType] = useState<'direct' | 'private'>('direct');

    const hasBurner = !!burnerAddress && !!burnerHash;
    const activeHash = qrType === 'private' && hasBurner ? burnerHash : mainHash;
    
    // The payment link logic
    const baseUrl = window.location.origin;
    const paymentLink = activeHash ? `${baseUrl}/pay?hash=${activeHash}` : '';

    const handleCopy = () => {
        if (paymentLink) {
            navigator.clipboard.writeText(paymentLink);
            alert('Copied to clipboard!');
        }
    };

    if (!initialized && loading) {
        return (
            <GlassCard className="p-12 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
                <div className="relative w-24 h-24 mb-4 mx-auto flex items-center justify-center">
                    {/* Glowing outer rings */}
                    <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-neon-primary animate-spin" style={{ animationDuration: '3s' }}></div>
                    <div className="absolute inset-2 rounded-full border-r-2 border-b-2 border-neon-accent animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                    <div className="absolute inset-4 rounded-full border-t-2 border-white/30 animate-spin" style={{ animationDuration: '1.5s' }}></div>
                    
                    {/* Inner QR icon pulsing */}
                    <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                        <svg className="w-8 h-8 text-neon-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-white mb-4 tracking-wide">Initializing Profile QR</h3>
                    <div className="flex items-center justify-center h-10">
                        <p className="text-neon-primary text-sm font-mono animate-pulse bg-neon-primary/10 px-4 py-2 rounded-lg border border-neon-primary/20 shadow-[0_0_15px_rgba(0,243,255,0.1)]">
                            {status || 'Please wait...'}
                        </p>
                    </div>
                </div>
            </GlassCard>
        );
    }

    if (!initialized) {
        return (
            <GlassCard className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-neon-primary/20 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-neon-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                </div>
                <div className="flex flex-col items-center justify-center w-full">
                    <h3 className="text-2xl font-bold text-white mb-4 text-center">Create Your Universal QR</h3>
                    <p className="text-gray-400 max-w-sm text-sm text-center leading-relaxed">
                        This is a one-time setup. Generate your permanent QR code for daily, real-world payments, just like UPI. 
                        Enable your Burner Wallet for maximum privacy.
                    </p>
                </div>
                {status && <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">{status}</p>}
                <div className="flex justify-center w-full mt-6">
                    <Button variant="primary" glow onClick={initializeQRs} disabled={loading} className="px-8 min-w-[200px]">
                        Initialize QR Codes
                    </Button>
                </div>
            </GlassCard>
        );
    }

    return (
        <GlassCard className="p-8 md:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden bg-gradient-to-b from-glass-surface to-black/40">
            <div className="flex bg-black/40 rounded-full p-1 border border-white/10 mb-8 mx-auto relative z-10 w-full max-w-xs shadow-inner">
                <button
                    onClick={() => setQrType('direct')}
                    className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-full transition-all duration-300 ${
                        qrType === 'direct' ? 'bg-neon-primary text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]' : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Direct
                </button>
                <button
                    onClick={() => {
                        if (hasBurner) {
                            setQrType('private');
                        } else if (burnerAddress && !burnerHash) {
                            setQrType('private');
                            // Auto trigger Burner QR creation since they haven't generated it yet
                            initializeQRs();
                        } else {
                            alert('Enable Burner Wallet in settings first!');
                        }
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold uppercase tracking-wider rounded-full transition-all duration-300 ${
                        qrType === 'private' ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'text-gray-400 hover:text-white'
                    } ${(!hasBurner && !burnerAddress) && 'opacity-50 cursor-not-allowed'}`}
                >
                    Private
                    {(!hasBurner && !burnerAddress) && (
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    )}
                </button>
            </div>

            <motion.div 
                key={qrType}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex justify-center mb-8 relative z-10"
            >
                {activeHash ? (
                    <div className="p-4 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        <QRCodeSVG value={paymentLink} size={220} level="H" includeMargin={false} />
                    </div>
                ) : (
                    <div className="w-[220px] h-[220px] bg-gray-100 flex items-center justify-center rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        <Shimmer className="w-full h-full" />
                    </div>
                )}
            </motion.div>

            <div className="mt-8 space-y-3 w-full max-w-sm relative z-10">
                <button 
                    onClick={handleCopy}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center justify-between transition-colors group"
                >
                    <span className="text-sm font-mono text-gray-400 group-hover:text-white truncate pr-4">
                        {paymentLink}
                    </span>
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-neon-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 01-2-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" />
                    </svg>
                </button>
                <p className="text-xs text-gray-500">
                    {qrType === 'direct' 
                        ? 'Payments sent here are visible through standard receipts.'
                        : 'Payments sent here are fully private and only decryptable by your burner wallet.'}
                </p>
            </div>
            
            {/* Background glowing effects based on selection */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-500 z-0 ${
                qrType === 'private' ? 'bg-purple-500' : 'bg-neon-primary'
            }`} />

            {/* LIVE FEED SUB-SECTION */}
            <div className="w-full mt-12 pt-8 border-t border-white/10 relative z-10 flex flex-col items-center">
                <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    Live Tip Feed
                </h4>
                
                <div className="w-full max-h-60 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {unifiedPayments.length === 0 ? (
                        <div className="text-gray-500 italic text-sm py-4">No tips received yet.</div>
                    ) : (
                        unifiedPayments.map((payment, idx) => (
                            <div key={payment.receiptHash || idx} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        payment.type === 'burner' ? 'bg-purple-500/20 text-purple-400' : 'bg-neon-primary/20 text-neon-primary'
                                    }`}>
                                        {payment.type === 'burner' ? (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-white">
                                            {payment.amount} {payment.tokenType === 0 ? 'Credits' : payment.tokenType === 1 ? 'USDCx' : 'USAD'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {payment.timestamp ? new Date(payment.timestamp).toLocaleTimeString() : 'Recent'}
                                        </div>
                                    </div>
                                </div>
                                
                                {payment.txId && (
                                    <a href={`https://testnet.explorer.provable.com/transaction/${payment.txId}`} target="_blank" rel="noreferrer" className="p-2 text-gray-500 hover:text-neon-primary transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </GlassCard>
    );
};
