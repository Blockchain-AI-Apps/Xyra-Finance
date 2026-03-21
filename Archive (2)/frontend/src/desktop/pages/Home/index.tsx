import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Lock, Globe, Server, Eye, EyeOff, FileText, Layers, Coins, KeyRound } from 'lucide-react';
import DottedGlobe from './components/DottedGlobe';
import { RedditMarquee } from './components/RedditMarquee';
import { FlashlightEffect } from './components/FlashlightEffect';

const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.92 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } }
};

const Home = () => {
    return (
        <FlashlightEffect>
            <div className="min-h-screen bg-black text-white relative font-sans w-full overflow-x-hidden">


                <main className="relative z-10 w-full overflow-hidden">
                    <section className="relative min-h-[85vh] flex items-center">

                        {/* Globe — full-screen absolute background */}
                        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                            <DottedGlobe />
                        </div>

                        {/* Text content — positioned on top */}
                        <div className="relative z-10 w-full px-6 md:px-12 lg:px-24 pt-20">
                            <motion.div
                                variants={staggerContainer}
                                initial="hidden"
                                animate="show"
                                className="flex flex-col space-y-6 text-center lg:text-left max-w-xl"
                            >
                                <div className="relative">
                                    <motion.h1
                                        variants={fadeInUp}
                                        className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.05] relative z-10"
                                    >
                                        Pay Privately.<br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-gray-600">
                                            Nullify the{' '}
                                        </span>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/60 to-white/10">
                                            Trace.
                                        </span>
                                    </motion.h1>

                                    {/* Curved gradient line — upside-down smile, behind the text */}
                                    <svg viewBox="0 0 500 50" fill="none" xmlns="http://www.w3.org/2000/svg"
                                        className="absolute bottom-[-20px] left-0 w-[90%] h-auto z-0 pointer-events-none"
                                    >
                                        <defs>
                                            <linearGradient id="curve-grad" x1="0" y1="0" x2="500" y2="0" gradientUnits="userSpaceOnUse">
                                                <stop offset="0%" stopColor="white" stopOpacity="0.7" />
                                                <stop offset="50%" stopColor="white" stopOpacity="0.25" />
                                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path d="M 0 40 Q 250 0 500 40" stroke="url(#curve-grad)" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                </div>

                                <motion.p
                                    variants={fadeInUp}
                                    className="text-lg md:text-xl text-gray-400 max-w-lg font-light leading-relaxed"
                                >
                                    NullPay is a decentralized payment protocol on Aleo that empowers users with absolute financial privacy.
                                    Create, send, and settle invoices without ever exposing your wallet balance or transaction history to the public.
                                </motion.p>

                                <motion.div
                                    variants={fadeInUp}
                                    className="flex flex-col sm:flex-row gap-5 pt-4 w-full sm:w-auto justify-center lg:justify-start"
                                >
                                    <Link to="/explorer" className="enter-bliss-button flex items-center justify-center gap-3 px-8 py-5 text-white w-full sm:w-auto">
                                        <span className="font-bold text-lg relative z-10">Get Started</span>
                                        <ArrowRight className="w-5 h-5 relative z-10" />
                                    </Link>

                                    <Link to="/docs" className="group flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 backdrop-blur-md">
                                        <span className="font-semibold text-lg text-gray-300 group-hover:text-white transition-colors">Documentation</span>
                                    </Link>
                                </motion.div>
                            </motion.div>
                        </div>
                    </section>

                    <section className="pt-24 pb-20 px-6 md:px-12 lg:px-24">
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="max-w-5xl mx-auto"
                        >
                            <div className="text-center mb-10">
                                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">The Problem</span>
                                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mt-4">Public Ledgers Expose You</h2>
                                <p className="text-gray-400 text-lg mt-4 max-w-2xl mx-auto">Every transaction on a public blockchain reveals your wallet balance, transaction history, and financial habits to anyone you interact with.</p>
                            </div>

                            <RedditMarquee />
                        </motion.div>
                    </section>


                    {/* ═══════════════════════════════════════════ */}
                    {/* SECTION 4: WHAT IS NULLPAY                 */}
                    {/* ═══════════════════════════════════════════ */}
                    <section className="py-24 px-6 md:px-12 lg:px-24 border-t border-white/[0.06]">

                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: "-100px" }}
                            className="max-w-7xl mx-auto"
                        >
                            <motion.div variants={fadeInUp} className="text-center mb-16">
                                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">The Solution</span>
                                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mt-4">What is NullPay?</h2>
                                <p className="text-gray-400 text-lg mt-4 max-w-3xl mx-auto leading-relaxed">
                                    NullPay is a decentralized invoice and payment protocol that breaks the link between sender and receiver.
                                    Create invoices, collect payments, and settle transactions — all without revealing who paid whom, or how much.
                                </p>
                            </motion.div>

                            {/* Feature Bento Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {[
                                    {
                                        icon: Shield,
                                        title: "Zero-Knowledge Invoices",
                                        desc: "Invoice details are hashed on-chain using BHP256 cryptography. Only the hash is public — merchant address, amount, and metadata remain completely private.",
                                    },
                                    {
                                        icon: EyeOff,
                                        title: "Untraceable Payments",
                                        desc: "Payments use Aleo's private transfer function. The sender's identity is never revealed on-chain. No one can trace who paid the invoice.",
                                    },
                                    {
                                        icon: Layers,
                                        title: "Dual-Record System",
                                        desc: "Every payment atomically generates two encrypted receipts — a PayerReceipt and MerchantReceipt. Both parties get proof without public exposure.",
                                    },
                                    {
                                        icon: Coins,
                                        title: "Multi-Asset Support",
                                        desc: "Pay with Aleo Credits or USDCx (private stablecoin). Merchants choose which assets to accept. Full atomic swap execution for stablecoins.",
                                    },
                                    {
                                        icon: FileText,
                                        title: "Flexible Invoice Types",
                                        desc: "Standard invoices for one-time payments, Multi-Pay invoices for crowdfunding campaigns, and Donation invoices with open-ended amounts.",
                                    },
                                    {
                                        icon: KeyRound,
                                        title: "Encrypted Metadata",
                                        desc: "Off-chain data is encrypted with AES-256. We don't store amounts or memos. Even if our database were compromised, your financial data stays safe.",
                                    },
                                ].map((feature, i) => (
                                    <motion.div
                                        key={i}
                                        variants={scaleIn}
                                        className="p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-500 group"
                                    >
                                        <div className="w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center mb-5 border border-white/[0.08] group-hover:border-white/20 group-hover:bg-white/[0.1] transition-all duration-300">
                                            <feature.icon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                                        </div>
                                        <h3 className="text-lg font-bold mb-2.5 text-white group-hover:text-white transition-colors">{feature.title}</h3>
                                        <p className="text-gray-500 text-sm leading-relaxed group-hover:text-gray-400 transition-colors">{feature.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </section>

                    {/* ═══════════════════════════════════════════ */}
                    {/* SECTION 4.5: MOBILE EXPERIENCE             */}
                    {/* ═══════════════════════════════════════════ */}
                    <section className="py-24 px-6 md:px-12 lg:px-24 border-t border-white/[0.06] bg-gradient-to-b from-transparent via-white/[0.01] to-transparent">
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8 }}
                            className="max-w-6xl mx-auto"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                                {/* Left: Static Phone Mockup */}
                                <div className="order-2 lg:order-1 flex justify-center lg:justify-start relative">
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                                    <motion.div
                                        animate={{
                                            y: [0, -15, 0],
                                            rotate: [0, 1, 0]
                                        }}
                                        transition={{
                                            duration: 6,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                        className="relative z-0"
                                    >
                                        <img
                                            src="/assets/nullpay_mobile01-left.png"
                                            alt="NullPay Mobile"
                                            className="w-full max-w-[450px] h-auto drop-shadow-[0_20px_50px_rgba(255,255,255,0.05)]"
                                        />
                                    </motion.div>
                                </div>

                                {/* Right: Text Content */}
                                <div className="order-1 lg:order-2 space-y-8">
                                    <div>
                                        <span className="text-[11px] uppercase tracking-[0.25em] text-neon-primary font-bold px-3 py-1 rounded-full bg-neon-primary/10 border border-neon-primary/20">Mobile Suite</span>
                                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mt-6 tracking-tight">Privacy in Your Pocket</h2>
                                    </div>

                                    <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
                                        Take absolute financial privacy wherever you go. NullPay V1 Mobile is now live, bringing the power of zero-knowledge cryptography to your smartphone.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-colors group">
                                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Shield className="w-5 h-5 text-gray-400" />
                                            </div>
                                            <h4 className="font-bold text-white mb-2">Shield Wallet Beta</h4>
                                            <p className="text-xs text-gray-500 leading-relaxed">Integrated directly with Shield Wallet for secure key management and private transactions.</p>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-colors group">
                                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Globe className="w-5 h-5 text-gray-400" />
                                            </div>
                                            <h4 className="font-bold text-white mb-2">Private QR Scan</h4>
                                            <p className="text-xs text-gray-500 leading-relaxed">Instantly scan invoice QR codes and settle payments privately at point-of-sale terminals.</p>
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <div className="inline-flex items-center gap-2 text-sm text-gray-400 italic">
                                            <span className="w-1.5 h-1.5 rounded-full bg-neon-primary animate-pulse" />
                                            Performance optimized for mobile devices
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </section>

                    {/* ═══════════════════════════════════════════ */}
                    {/* SECTION 5: HOW IT WORKS                    */}
                    {/* ═══════════════════════════════════════════ */}
                    <section className="py-24 px-6 md:px-12 lg:px-24 border-t border-white/[0.06]">
                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: "-100px" }}
                            className="max-w-6xl mx-auto"
                        >
                            <motion.div variants={fadeInUp} className="text-center mb-20">
                                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">How It Works</span>
                                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mt-4">Three Steps to Privacy</h2>
                                <p className="text-gray-400 text-lg mt-4 max-w-2xl mx-auto">From invoice creation to private settlement — the entire flow is designed around zero-knowledge.</p>
                            </motion.div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                                {/* Connecting line (desktop) */}
                                <div className="hidden md:block absolute top-[72px] left-[16.66%] right-[16.66%] h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                                {[
                                    {
                                        step: "01",
                                        title: "Create Invoice",
                                        desc: "Merchant enters amount, token type, and invoice type. A random salt is generated and the details are hashed using BHP256. Only the hash is stored on-chain.",
                                        icon: FileText,
                                    },
                                    {
                                        step: "02",
                                        title: "Share Payment Link",
                                        desc: "The merchant shares a payment link containing the salt. The payer's client verifies the on-chain hash, confirming the invoice is authentic and unmodified.",
                                        icon: Globe,
                                    },
                                    {
                                        step: "03",
                                        title: "Private Settlement",
                                        desc: "The payer executes a private transfer. Funds move to the merchant without revealing the payer's identity. Both parties receive encrypted receipts atomically.",
                                        icon: Lock,
                                    },
                                ].map((step, i) => (
                                    <motion.div key={i} variants={fadeInUp} className="relative">
                                        <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500 group h-full">
                                            {/* Step number */}
                                            <div className="w-14 h-14 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mb-6 group-hover:bg-white/[0.1] group-hover:border-white/20 transition-all duration-300 relative z-10">
                                                <span className="text-lg font-bold text-gray-400 group-hover:text-white transition-colors">{step.step}</span>
                                            </div>
                                            <step.icon className="w-6 h-6 text-gray-500 mb-4 group-hover:text-white transition-colors" />
                                            <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                                            <p className="text-gray-500 text-sm leading-relaxed group-hover:text-gray-400 transition-colors">{step.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </section>


                    {/* ═══════════════════════════════════════════ */}
                    {/* SECTION 6: WHAT IS ALEO                    */}
                    {/* ═══════════════════════════════════════════ */}
                    <section className="py-24 px-6 md:px-12 lg:px-24 border-t border-white/[0.06]">
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8 }}
                            className="max-w-6xl mx-auto"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                                {/* Left: Text */}
                                <div className="space-y-6">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08]">
                                        <Server className="w-4 h-4 text-gray-400" />
                                        <span className="text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">Architecture</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                                        Powered by <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.35)]">Aleo</span>
                                    </h2>
                                    <p className="text-lg text-gray-300 font-light leading-relaxed">
                                        Aleo is a <strong className="text-white">Layer-1 blockchain</strong> purpose-built for zero-knowledge applications. Unlike Ethereum or Solana where privacy is an afterthought, Aleo makes ZK-proofs a native, first-class feature.
                                    </p>
                                    <div className="space-y-4 pt-2">
                                        {[
                                            { label: "Off-Chain Execution", desc: "Smart contracts execute privately on the user's device. Only the cryptographic proof is submitted on-chain." },
                                            { label: "Encrypted Records", desc: "Aleo uses encrypted records instead of public accounts. Only the record owner can decrypt and view their data." },
                                            { label: "Leo Language", desc: "Programs are written in Leo — a Rust-inspired language designed for writing zero-knowledge applications safely." },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5 border border-white/[0.08]">
                                                    <Zap className="w-4 h-4 text-gray-400" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white mb-1">{item.label}</h4>
                                                    <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right: Orbital Diagram */}
                                <div className="flex justify-center">
                                    <div className="relative w-full aspect-square max-w-sm">
                                        {/* Outer ring */}
                                        <div className="absolute inset-0 border border-white/[0.08] rounded-full animate-[spin_25s_linear_infinite]">
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/20 border border-white/30" />
                                        </div>
                                        {/* Middle ring */}
                                        <div className="absolute inset-6 border border-white/[0.12] rounded-full animate-[spin_18s_linear_infinite_reverse] border-dashed">
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white/30 border border-white/40" />
                                        </div>
                                        {/* Inner ring */}
                                        <div className="absolute inset-14 border border-white/[0.06] rounded-full animate-[spin_12s_linear_infinite]">
                                            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/20" />
                                        </div>
                                        {/* Center */}
                                        <div className="absolute inset-[72px] bg-gradient-to-tr from-white/[0.04] to-transparent rounded-full backdrop-blur-xl flex items-center justify-center border border-white/[0.08] shadow-[0_0_60px_rgba(255,255,255,0.05)]">
                                            <div className="text-center">
                                                <h3 className="text-2xl font-bold tracking-widest uppercase opacity-70">Zero</h3>
                                                <h3 className="text-2xl font-bold tracking-widest uppercase opacity-70">Knowledge</h3>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </section>

                    {/* ═══════════════════════════════════════════ */}
                    {/* SECTION 7: WHY NULLPAY — COMPARISON         */}
                    {/* ═══════════════════════════════════════════ */}
                    <section className="py-24 px-6 md:px-12 lg:px-24 border-t border-white/[0.06]">
                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: "-100px" }}
                            className="max-w-6xl mx-auto"
                        >
                            <motion.div variants={fadeInUp} className="text-center mb-16">
                                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">Why NullPay</span>
                                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mt-4">Privacy is Not Optional</h2>
                                <p className="text-gray-400 text-lg mt-4 max-w-2xl mx-auto">See how NullPay fundamentally differs from traditional blockchain payments.</p>
                            </motion.div>

                            <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Traditional */}
                                <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] relative overflow-hidden">
                                    <div className="absolute top-4 right-4">
                                        <Eye className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-400 mb-6 flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-xs font-mono text-gray-600">✕</span>
                                        Traditional Payments
                                    </h3>
                                    <div className="space-y-4">
                                        {[
                                            "Wallet balance visible to everyone",
                                            "Full transaction history exposed",
                                            "Receiver knows sender's identity",
                                            "Single public account model",
                                            "No privacy without mixers",
                                            "Payment amounts are public"
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 text-sm text-gray-500">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-600 shrink-0" />
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* NullPay */}
                                <div className="p-8 rounded-2xl bg-white/[0.04] border border-white/[0.12] relative overflow-hidden group hover:border-white/20 transition-all duration-500">
                                    <div className="absolute top-4 right-4">
                                        <EyeOff className="w-6 h-6 text-white/40 group-hover:text-white/60 transition-colors" />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3 relative z-10">
                                        <span className="w-8 h-8 rounded-lg bg-white/[0.08] border border-white/[0.15] flex items-center justify-center text-xs font-mono text-white">✓</span>
                                        NullPay Protocol
                                    </h3>
                                    <div className="space-y-4 relative z-10">
                                        {[
                                            "Balance hidden via encrypted records",
                                            "Transactions are private by default",
                                            "Sender identity is never revealed",
                                            "Dual-record receipt system",
                                            "Native ZK — no mixers needed",
                                            "Amounts encrypted on-chain"
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 text-sm text-gray-300 group-hover:text-gray-200 transition-colors">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </section>

                    {/* ═══════════════════════════════════════════ */}
                    {/* SECTION 8: FINAL CTA                       */}
                    {/* ═══════════════════════════════════════════ */}
                    <section className="py-32 px-6 md:px-12 lg:px-24 border-t border-white/[0.06]">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8 }}
                            className="max-w-4xl mx-auto text-center"
                        >
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                                Ready to Go Private?
                            </h2>
                            <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
                                Join the movement toward a future where financial privacy is the default. Start creating private invoices and accepting untraceable payments today.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-5 justify-center">
                                <Link to="/create" className="enter-bliss-button flex items-center justify-center gap-3 px-10 py-5 text-white w-full sm:w-auto">
                                    <span className="font-bold text-lg relative z-10">Create Your First Invoice</span>
                                    <ArrowRight className="w-5 h-5 relative z-10" />
                                </Link>
                            </div>

                            {/* Footer tag */}
                            <div className="mt-20">
                                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
                                    <span className="text-gray-500 font-mono text-xs tracking-widest uppercase">
                                        Building the Private Economy on Aleo
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </section>

                </main>
            </div>
        </FlashlightEffect>
    );
};

export default Home;
