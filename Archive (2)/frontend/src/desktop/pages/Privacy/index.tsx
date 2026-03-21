import React from 'react';
import { motion } from 'framer-motion';
import { pageVariants } from '../../../shared/utils/animations';
import { GlassCard } from '../../../shared/components/ui/GlassCard';

const Privacy: React.FC = () => {
    return (
        <motion.div
            className="page-container relative min-h-screen"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >


            <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-screen h-[800px] z-0 pointer-events-none flex justify-center overflow-hidden">
                <img
                    src="/assets/aleo_globe.png"
                    alt="Aleo Globe"
                    className="w-full h-full object-cover opacity-50 mix-blend-screen mask-image-gradient-b"
                    style={{
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                    }}
                />
            </div>

            <div className="w-full pt-8 relative z-10 pb-24">
                {/* HERO HEADER */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center text-center mb-16"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter leading-tight text-white">
                        Privacy by <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-primary to-neon-accent animate-pulse-glow">Design</span>
                    </h1>
                    <p className="text-gray-300 text-xl leading-relaxed max-w-2xl mb-8">
                        NullPay leverages Zero-Knowledge Proofs (ZKP) to ensure your financial data remains confidential.
                        We don't just protect your privacy; we mathematically guarantee it.
                    </p>
                </motion.div>

                {/* CONTENT GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* CARD 1: THE HIDDEN LEDGER */}
                    <GlassCard className="p-10 min-h-[400px] flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">01</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-neon-primary/20 flex items-center justify-center text-neon-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            </span>
                            The Hidden Ledger
                        </h2>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            <span className="text-neon-accent font-semibold">Legacy vs v5:</span> Previously, we had the mapping <code className="bg-white/10 px-1 rounded text-red-400">payment_secret : field {'=>'} amount</code>.
                        </p>
                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-xs text-gray-300">
                            <div className="flex justify-between mb-4 pb-2 border-b border-white/10">
                                <span className="text-gray-500 uppercase tracking-widest">Public State</span>
                                <span className="text-green-400">● Live Code</span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity">
                                    <div className="flex flex-col">
                                        <span className="text-red-400 line-through">mapping: payment_secret {'=>'} amount</span>
                                        <span className="text-[10px] text-gray-500">Publicly visible link</span>
                                    </div>
                                    <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-md border border-red-500/20 text-[10px]">REMOVED</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-neon-primary">record: {'{'} receipt_hash {'}'}</span>
                                        <span className="text-[10px] text-gray-500">Encrypted on-chain storage</span>
                                    </div>
                                    <span className="px-2 py-1 bg-neon-primary/10 text-neon-primary rounded-md border border-neon-primary/20 text-[10px] animate-pulse-glow">NEW STANDARD</span>
                                </div>
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-500">
                            We have removed the public mapping and instead store the receipt hash in a private record. Only the owner can decrypt it, ensuring total privacy on the blockchain.
                        </p>
                    </GlassCard>

                    {/* CARD 2: BLIND DATABASE */}
                    <GlassCard className="p-10 min-h-[400px] flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">02</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </span>
                            Blind Database
                        </h2>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            Our database is mathematically blind. We explicitly <strong>do not store</strong> the Amount or Memo fields.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                                <div className="text-red-400 text-xs uppercase tracking-widest mb-1">Removed</div>
                                <div className="font-mono text-sm text-gray-400 line-through">Amount</div>
                                <div className="font-mono text-sm text-gray-400 line-through">Memo</div>
                            </div>
                            <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                                <div className="text-green-400 text-xs uppercase tracking-widest mb-1">Encrypted</div>
                                <div className="font-mono text-sm text-white">Merchant Addr</div>
                                <div className="font-mono text-xs text-green-300 mt-1 truncate">U2FsdGVkX19...</div>
                            </div>
                        </div>

                        <p className="mt-4 text-sm text-gray-500">
                            Even if our database were compromised, your financial data remains non-existent or encrypted with AES-256.
                        </p>
                    </GlassCard>

                    <GlassCard className="p-10 min-h-[400px] flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10 md:col-span-2">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">03</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </span>
                            Dual-Record Settlement
                        </h2>

                        <p className="text-gray-400 mb-8 leading-relaxed max-w-3xl">
                            <span className="text-neon-primary font-semibold">Atomic Execution:</span> The <code className="bg-white/10 px-1 rounded text-blue-300">pay_invoice</code> transition guarantees that either <strong>both</strong> parties receive their receipts, or the transaction fails entirely. It is mathematically impossible for a payer to pay without getting a receipt.
                        </p>

                        <div className="relative grid grid-cols-1 md:grid-cols-11 gap-4 items-center">

                            {/* STEP 1: INPUT */}
                            <div className="md:col-span-3 flex flex-col gap-2">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center group-hover:border-blue-500/30 transition-colors">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Input</div>
                                    <div className="text-sm font-semibold text-white">Invoice Record</div>
                                    <div className="text-[10px] text-gray-500 mt-1">Merchant's Request</div>
                                </div>
                            </div>

                            {/* ARROW */}
                            <div className="md:col-span-1 flex justify-center text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </div>

                            {/* STEP 2: PROCESS */}
                            <div className="md:col-span-3 relative">
                                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-20 animate-pulse-slow"></div>
                                <div className="bg-black/60 p-4 rounded-xl border border-blue-500/30 text-center relative z-10 backdrop-blur-sm">
                                    <div className="text-[10px] text-blue-400 uppercase tracking-widest mb-1">Smart Contract</div>
                                    <div className="text-sm font-bold text-white">pay_invoice</div>
                                    <div className="text-[10px] text-gray-400 mt-1 font-mono">Generates 2 Records</div>
                                </div>
                            </div>

                            {/* ARROW SPLIT */}
                            <div className="md:col-span-1 flex justify-center text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </div>

                            {/* STEP 3: DUAL OUTPUT */}
                            <div className="md:col-span-3 flex flex-col gap-3">
                                <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20 flex justify-between items-center">
                                    <div>
                                        <div className="text-xs text-green-400 font-bold">PayerReceipt</div>
                                        <div className="text-[10px] text-gray-500">Proof of Payment</div>
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                </div>
                                <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 flex justify-between items-center">
                                    <div>
                                        <div className="text-xs text-blue-400 font-bold">MerchantReceipt</div>
                                        <div className="text-[10px] text-gray-500">Proof of Revenue</div>
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-white text-sm font-semibold">Cryptographic Link</h4>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        Both receipts share an identical <code className="text-neon-primary bg-white/5 px-1 rounded">receipt_hash</code>, allowing off-chain verification without revealing data on-chain.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-white text-sm font-semibold">Asset Agnostic</h4>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        The settlement logic creates standardized receipts for both <span className="text-white">Aleo Credits</span> and <span className="text-white">USDCx</span>, preserving the same privacy guarantees.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-white text-sm font-semibold">Encrypted Metadata</h4>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        Off-chain details are protected by <span className="text-neon-primary bg-white/5 px-1 rounded">AES-256</span> encryption, ensuring even the database remains blind.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </GlassCard>

                    {/* CARD 3: THE PAYMENT SECRET */}
                    <GlassCard className="p-10 min-h-[400px] flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">04</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </span>
                            The Payment Secret
                        </h2>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            Every transaction is protected by a client-generated <code className="text-pink-400">payment_secret</code>.
                        </p>
                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 text-sm space-y-3">
                            <p className="text-gray-400">
                                We use <span className="text-neon-primary font-mono">BHP256::commit_to_field</span> to bind this secret to the receipt.
                            </p>
                            <div className="flex gap-2 text-xs font-mono text-gray-500">
                                <span className="text-pink-400">Input:</span> secret + salt
                                <span className="mx-2">→</span>
                                <span className="text-green-400">Output:</span> receipt_hash
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-500">
                            The smart contract verifies the commitment without ever seeing the secret itself, enabling a truly trustless proof of payment.
                        </p>
                    </GlassCard>

                    {/* CARD 4: PRIVATE TRANSFERS */}
                    <GlassCard className="p-10 min-h-[400px] flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">05</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </span>
                            Private Transfers
                        </h2>

                        <div className="space-y-4">
                            <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">Leo Program Call</span>
                                    <span className="text-[10px] text-gray-500 font-mono">credits.aleo</span>
                                </div>
                                <code className="block font-mono text-xs text-gray-300 bg-white/5 p-2 rounded border border-white/5">
                                    transfer_private(input_record, merchant, amount)
                                </code>
                            </div>

                            <ul className="space-y-3 text-sm text-gray-400">
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 min-w-[16px]">
                                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <strong className="text-white">Record Consumption (Burning):</strong>
                                        <p className="text-xs text-gray-500 mt-0.5">The payer's input record is physically consumed on-chain. It ceases to exist, preventing double-spending.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 min-w-[16px]">
                                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <strong className="text-white">Encrypted Outputs:</strong>
                                        <p className="text-xs text-gray-500 mt-0.5">Two new records are minted (Payment + Change). The <code className="text-purple-400">amount</code> and <code className="text-purple-400">owner</code> fields are fully encrypted under the recipient's view key.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </GlassCard>

                    {/* CARD 6: TAMPER-PROOF INTEGRITY */}
                    <GlassCard className="p-10 min-h-[400px] flex flex-col justify-between relative overflow-hidden group hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-8xl font-bold font-mono">06</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </span>
                            Tamper-Proof Integrity
                        </h2>
                        <p className="text-gray-400 mb-4 leading-relaxed">
                            <strong>No frauds, pure math.</strong> We employ <span className="text-neon-primary font-mono bg-neon-primary/10 px-1 rounded">BHP 256</span> hashing to cryptographically seal every invoice.
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                            Can a merchant trick you by creating a fake invoice for a higher amount?
                        </p>
                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span>Record: BHP256(10, Salt)</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                <span>Link: BHP256(100, Salt)</span>
                            </div>
                            <div className="font-mono text-xs text-red-400 pt-2 border-t border-white/10">
                                ❌ HASH MISMATCH → REVERT
                            </div>
                        </div>
                    </GlassCard>

                </div>
            </div>
        </motion.div>
    );
};

export default Privacy;
