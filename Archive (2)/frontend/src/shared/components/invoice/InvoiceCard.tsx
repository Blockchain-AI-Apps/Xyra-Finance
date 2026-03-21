import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { InvoiceData } from '../../types/invoice';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';

interface InvoiceCardProps {
    invoiceData: InvoiceData;
    resetInvoice: () => void;
    memo: string;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
    invoiceData,
    resetInvoice
}) => {

    const [copied, setCopied] = React.useState(false);
    const [copiedHash, setCopiedHash] = React.useState(false);
    const [copiedSalt, setCopiedSalt] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(invoiceData.link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <GlassCard className="text-center p-8 bg-gradient-to-b from-glass-surface to-black/40">
            <h3 className="mb-6 text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-primary to-neon-accent animate-pulse-glow">
                Invoice Ready!
            </h3>

            <div className="flex justify-center mb-8">
                <div className="p-4 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    <QRCodeSVG
                        value={invoiceData.link}
                        size={180}
                        level="H"
                        includeMargin={false}
                    />
                </div>
            </div>
            {/* ... other code ... */}
            <div className="mb-8">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 text-left ml-1">Payment Link</label>
                <div className="flex gap-2">
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-gray-300 truncate">
                        {invoiceData.link}
                    </div>
                    <Button
                        variant={copied ? "primary" : "secondary"}
                        size="md"
                        onClick={handleCopy}
                    >
                        {copied ? 'Copied!' : 'Copy'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-left">
                <div
                    onClick={() => {
                        navigator.clipboard.writeText(invoiceData.hash);
                        setCopiedHash(true);
                        setTimeout(() => setCopiedHash(false), 2000);
                    }}
                    className="p-4 rounded-xl border border-white/5 bg-black/30 hover:border-neon-primary/30 transition-colors group cursor-pointer active:scale-95"
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hash</span>
                        {copiedHash ? (
                            <span className="text-[10px] text-neon-primary font-bold">Copied!</span>
                        ) : (
                            <svg className="w-3 h-3 text-gray-600 group-hover:text-neon-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </div>
                    <span className="font-mono text-neon-accent truncate block text-xs group-hover:text-neon-primary transition-colors" title={invoiceData.hash}>
                        {invoiceData.hash.slice(0, 8)}...{invoiceData.hash.slice(-8)}
                    </span>
                </div>
                <div
                    onClick={() => {
                        navigator.clipboard.writeText(invoiceData.salt);
                        setCopiedSalt(true);
                        setTimeout(() => setCopiedSalt(false), 2000);
                    }}
                    className="p-4 rounded-xl border border-white/5 bg-black/30 hover:border-purple-500/30 transition-colors group cursor-pointer active:scale-95"
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Salt</span>
                        {copiedSalt ? (
                            <span className="text-[10px] text-purple-400 font-bold">Copied!</span>
                        ) : (
                            <svg className="w-3 h-3 text-gray-600 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </div>
                    <span className="font-mono text-purple-400 truncate block text-xs group-hover:text-purple-300 transition-colors" title={invoiceData.salt}>
                        {invoiceData.salt.slice(0, 8)}...{invoiceData.salt.slice(-4)}
                    </span>
                </div>
            </div>

            <p className="text-gray-500 text-xs text-center mb-8">
                💡 You can verify this transaction in our <span className="text-neon-primary hover:underline cursor-pointer">Explorer</span> using these credentials.
            </p>

            <Button
                variant="outline"
                className="w-full"
                onClick={resetInvoice}
            >
                Create Another Invoice
            </Button>
        </GlassCard>
    );
};
