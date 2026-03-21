import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'nullpay_changelog_wave3';

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 30 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: "spring" as const, duration: 0.6, bounce: 0.3 }
    },
    exit: { opacity: 0, scale: 0.9, y: 30, transition: { duration: 0.3 } }
};

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: { delay: i * 0.08 + 0.3, duration: 0.5 }
    })
};

export const ChangelogOverlay: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasSeen = localStorage.getItem(STORAGE_KEY);
        if (!hasSeen) {
            const timer = setTimeout(() => setIsVisible(true), 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = (dontShowAgain: boolean) => {
        setIsVisible(false);
        if (dontShowAgain) {
            localStorage.setItem(STORAGE_KEY, 'true');
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans antialiased">
                    {/* BACKDROP */}
                    <motion.div
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={() => handleClose(false)}
                    />

                    {/* MODAL */}
                    <motion.div
                        className="relative w-full max-w-2xl bg-[#080808] border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {/* DECORATIVE BACKGROUND GLOWS */}
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-neon-primary/10 rounded-full blur-[120px] pointer-events-none opacity-60" />
                        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none opacity-60" />

                        {/* HEADER */}
                        <div className="p-8 pb-4 shrink-0 relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="px-3 py-1 bg-neon-primary/10 border border-neon-primary/30 rounded-full text-[10px] font-bold text-neon-primary uppercase tracking-widest">
                                    Wave 3 — March 2025
                                </span>
                            </div>
                            <motion.h2
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight"
                            >
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-primary via-white to-purple-400 animate-gradient-x bg-[length:200%_auto]">
                                    Biggest Update
                                </span>{' '}Yet
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-gray-400 text-sm"
                            >
                                SDK, USAD token, multi-token donations, burner wallets, profile QR, live notifications and more.
                            </motion.p>
                        </div>

                        {/* CONTENT SCROLL */}
                        <div className="p-8 pt-2 overflow-y-auto custom-scrollbar space-y-7 relative z-10 pr-6">

                            {/* ITEM 1: SDK */}
                            <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible" className="flex gap-5 group">
                                <div className="mt-1 shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-primary/20 to-cyan-600/5 flex items-center justify-center text-neon-primary border border-neon-primary/20 shadow-[0_0_15px_rgba(0,243,255,0.15)] group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-white group-hover:text-neon-primary transition-colors">NullPay Node SDK — Beta Released</h3>
                                        <span className="px-2 py-0.5 bg-neon-primary/10 border border-neon-primary/30 rounded-full text-[9px] font-bold text-neon-primary uppercase tracking-widest">NEW</span>
                                    </div>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                        The official <code className="text-neon-primary bg-neon-primary/10 px-1 rounded">@nullpay/node</code> SDK is now live on npm. Merchants can integrate NullPay's privacy-preserving payment infrastructure into any Node.js backend in minutes.
                                    </p>
                                    <div className="bg-neon-primary/5 border border-neon-primary/10 rounded-xl p-3 backdrop-blur-sm space-y-2">
                                        <div>
                                            <h4 className="text-[10px] font-bold text-neon-primary uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-neon-primary animate-pulse" />
                                                Installation
                                            </h4>
                                            <code className="text-xs text-gray-300 font-mono bg-black/40 border border-white/5 rounded-lg px-3 py-2 block">
                                                npm install @nullpay/node
                                            </code>
                                        </div>
                                        <div className="pt-2 border-t border-white/5">
                                            <h4 className="text-[10px] font-bold text-neon-primary uppercase tracking-widest mb-1">Features</h4>
                                            <ul className="text-xs text-gray-500 space-y-1">
                                                <li>• <code className="text-gray-300">checkout.sessions.create()</code> — create hosted checkout sessions</li>
                                                <li>• <code className="text-gray-300">checkout.sessions.retrieve()</code> — poll session status</li>
                                                <li>• <code className="text-gray-300">webhooks.verifySignature()</code> — HMAC-SHA256 validation</li>
                                                <li>• <code className="text-gray-300">webhooks.constructEvent()</code> — parse & verify in one call</li>
                                                <li>• Supports <strong className="text-white">CREDITS</strong>, <strong className="text-blue-400">USDCX</strong>, and <strong className="text-green-400">USAD</strong> out of the box</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* ITEM 2: USAD */}
                            <motion.div custom={1} variants={itemVariants} initial="hidden" animate="visible" className="flex gap-5 group">
                                <div className="mt-1 shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/5 flex items-center justify-center text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)] group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">USAD Private Token Support</h3>
                                        <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded-full text-[9px] font-bold text-green-400 uppercase tracking-widest">NEW</span>
                                    </div>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                        NullPay now supports <strong className="text-green-400">USAD</strong> as a third payment token alongside Aleo Credits and USDCx. Merchants can create invoices denominated in USAD, and all payments settle privately via the on-chain USAD program.
                                    </p>
                                    <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-3 backdrop-blur-sm space-y-2">
                                        <div>
                                            <h4 className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                On-Chain Token Type
                                            </h4>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                USAD is represented as <code className="text-green-300 bg-green-500/10 px-1 rounded">token_type: 2u8</code> in the smart contract. Invoice creation uses <code className="text-green-300 bg-green-500/10 px-1 rounded">create_invoice_usad</code> and payment uses <code className="text-green-300 bg-green-500/10 px-1 rounded">pay_invoice_usad</code>. Amounts are denominated in micro-USAD (×1,000,000), matching USDCx precision. Full dual-receipt generation applies: both PayerReceipt and MerchantReceipt are generated atomically.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* ITEM 3: MULTI-TOKEN DONATIONS */}
                            <motion.div custom={2} variants={itemVariants} initial="hidden" animate="visible" className="flex gap-5 group">
                                <div className="mt-1 shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/5 flex items-center justify-center text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)] group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">Multi-Token Donation Invoices</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                        Donation invoices now accept <strong className="text-white">any token</strong>. Instead of being locked to a specific token type, payers can contribute in whichever private token they hold — Credits, USDCx, or USAD. The merchant receives whatever the payer sends.
                                    </p>
                                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-3 backdrop-blur-sm space-y-2">
                                        <div>
                                            <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                                How It Works
                                            </h4>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                Donation invoices are created with <code className="text-orange-300 bg-orange-500/10 px-1 rounded">invoice_type: 2u8</code> and <code className="text-orange-300 bg-orange-500/10 px-1 rounded">amount: 0</code>. The new <code className="text-orange-300 bg-orange-500/10 px-1 rounded">create_invoice_any</code> transition sets <code className="text-orange-300 bg-orange-500/10 px-1 rounded">token_type: 3</code> (ANY), signaling full token flexibility. At pay-time, the payment page dynamically shows all 3 token options and routes to the correct on-chain transition based on what the payer selects.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-2 border-t border-orange-500/10">
                                            <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-400 font-bold uppercase tracking-wide">Credits</span>
                                            <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] text-blue-400 font-bold uppercase tracking-wide">USDCx</span>
                                            <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] text-green-400 font-bold uppercase tracking-wide">USAD</span>
                                            <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-400 font-bold uppercase tracking-wide">Payer's Choice</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* ITEM 4: LIVE PAYMENT NOTIFICATIONS */}
                            <motion.div custom={3} variants={itemVariants} initial="hidden" animate="visible" className="flex gap-5 group">
                                <div className="mt-1 shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/5 flex items-center justify-center text-yellow-400 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.15)] group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">Live Payment Notifications</h3>
                                        <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-[9px] font-bold text-yellow-400 uppercase tracking-widest">REALTIME</span>
                                    </div>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                        Merchants now receive instant push notifications the moment a payment is received for any of their invoices — standard, multi-pay, or donation. Powered entirely by <strong className="text-white">Supabase Realtime</strong> channels (no WebSocket servers required).
                                    </p>
                                    <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-3 backdrop-blur-sm space-y-2">
                                        <div>
                                            <h4 className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                                What You Get
                                            </h4>
                                            <ul className="text-xs text-gray-500 space-y-1 leading-relaxed">
                                                <li>• Toast notification with amount, token type, and truncated invoice hash</li>
                                                <li>• Ascending 3-tone chime sound on every new payment</li>
                                                <li>• Settlement notification when a multi-pay invoice is manually closed</li>
                                                <li>• On-chain amount lookup for multi-pay invoices via MerchantReceipt scan</li>
                                                <li>• Duplicate-safe: same transaction never fires twice</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* ITEM 5: BURNER WALLET */}
                            <motion.div custom={4} variants={itemVariants} initial="hidden" animate="visible" className="flex gap-5 group">
                                <div className="mt-1 shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/5 flex items-center justify-center text-red-400 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)] group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">Burner Wallet — Full Merchant Anonymity</h3>
                                        <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded-full text-[9px] font-bold text-red-400 uppercase tracking-widest">NEW</span>
                                    </div>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                        Merchants who want zero exposure can now generate a <strong className="text-white">Burner Wallet</strong> — a fresh Aleo key pair stored only in the browser. All invoices created with the burner wallet route payments to this address, completely decoupling the merchant's real identity from their payment activity.
                                    </p>
                                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 backdrop-blur-sm">
                                        <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                            Privacy Guarantees
                                        </h4>
                                        <ul className="text-xs text-gray-500 space-y-1 leading-relaxed">
                                            <li>• Burner key pair generated locally — never sent to any server</li>
                                            <li>• Stored encrypted in <code className="text-gray-300">localStorage</code> under the merchant's session</li>
                                            <li>• Invoice payment-link shows burner address only — real account stays hidden</li>
                                            <li>• Payments received are tied to the burner address, not the login wallet</li>
                                            <li>• Toggle between Main and Burner invoice creation from the dashboard</li>
                                        </ul>
                                    </div>
                                </div>
                            </motion.div>

                            {/* ITEM 6: PROFILE QR */}
                            <motion.div custom={5} variants={itemVariants} initial="hidden" animate="visible" className="flex gap-5 group">
                                <div className="mt-1 shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/5 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">Permanent Profile QR Code</h3>
                                        <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded-full text-[9px] font-bold text-purple-400 uppercase tracking-widest">NEW</span>
                                    </div>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                        A permanent, one-time-setup QR code for your profile. Share it anywhere — anyone can scan it and pay you in <em>any token they have</em>, with no amount limit. The QR never expires because it backs a permanent on-chain multi-pay donation invoice.
                                    </p>
                                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3 backdrop-blur-sm space-y-2">
                                        <div>
                                            <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                                Technical Detail
                                            </h4>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                Calls <code className="text-purple-300 bg-purple-500/10 px-1 rounded">create_invoice_any</code> on-chain with <code className="text-purple-300 bg-purple-500/10 px-1 rounded">invoice_type: 2u8</code> (donation) and <code className="text-purple-300 bg-purple-500/10 px-1 rounded">amount: 0u128</code>. The resulting hash is saved to the user's profile in Supabase, so it persists across sessions. Supports both Main Wallet QR and a separate <strong className="text-white">Burner Wallet QR</strong> for maximum privacy separation.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* ITEM 7: DASHBOARD */}
                            <motion.div custom={6} variants={itemVariants} initial="hidden" animate="visible" className="flex gap-5 group">
                                <div className="mt-1 shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">Enhanced Merchant Dashboard</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                        The dashboard has been rebuilt with richer analytics. Merchants now see live wallet balances (Credits, USDCx, USAD), earnings breakdowns by token, and transaction history charts — all without leaving NullPay.
                                    </p>
                                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 backdrop-blur-sm">
                                        <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                            What's New
                                        </h4>
                                        <ul className="text-xs text-gray-500 space-y-1 leading-relaxed">
                                            <li>• Real-time on-chain balance display (Credits, USDCx, USAD)</li>
                                            <li>• Revenue charts showing payments over time per token type</li>
                                            <li>• Split earnings view: Main Wallet vs Burner Wallet earnings</li>
                                            <li>• Invoice status breakdown (PENDING / SETTLED / OPEN) at a glance</li>
                                            <li>• Burner wallet details section with address + QR</li>
                                        </ul>
                                    </div>
                                </div>
                            </motion.div>

                            {/* ITEM 8: TESTING REPO */}
                            <motion.div custom={7} variants={itemVariants} initial="hidden" animate="visible" className="flex gap-5 group">
                                <div className="mt-1 shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-600/5 flex items-center justify-center text-pink-400 border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.15)] group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-white group-hover:text-pink-400 transition-colors">SDK Testing Environment</h3>
                                        <span className="px-2 py-0.5 bg-pink-500/10 border border-pink-500/30 rounded-full text-[9px] font-bold text-pink-400 uppercase tracking-widest">DEPLOYED</span>
                                    </div>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                        A dedicated test merchant website is live, built entirely on the <code className="text-pink-400 bg-pink-500/10 px-1 rounded">@nullpay/node</code> SDK. It demonstrates the complete checkout flow — session creation, hosted payment UI, and webhook handling — exactly how a real merchant integration works.
                                    </p>
                                    <div className="bg-pink-500/5 border border-pink-500/10 rounded-xl p-3 backdrop-blur-sm">
                                        <h4 className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                                            What It Covers
                                        </h4>
                                        <ul className="text-xs text-gray-500 space-y-1 leading-relaxed">
                                            <li>• Full checkout session creation using <code className="text-gray-300">NullPay.checkout.sessions.create()</code></li>
                                            <li>• Redirect to NullPay's hosted checkout page with pre-filled invoice</li>
                                            <li>• Webhook signature verification on payment receipt</li>
                                            <li>• Success / failure redirect handling with <code className="text-gray-300">session_id</code></li>
                                            <li>• Live end-to-end test across all 3 token types</li>
                                        </ul>
                                    </div>
                                </div>
                            </motion.div>

                        </div>

                        {/* FOOTER ACTIONS */}
                        <div className="p-8 pt-6 shrink-0 bg-black/40 border-t border-white/5 flex items-center justify-between backdrop-blur-md relative z-10">
                            <button
                                onClick={() => handleClose(false)}
                                className="text-sm text-gray-400 hover:text-white transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white/5"
                            >
                                Remind Me Later
                            </button>

                            <button
                                onClick={() => handleClose(true)}
                                className="px-8 py-3 bg-neon-primary hover:bg-neon-accent text-black text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(0,243,255,0.2)] hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Got it! Don't show again
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
