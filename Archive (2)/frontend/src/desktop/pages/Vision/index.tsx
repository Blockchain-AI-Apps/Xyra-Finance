import { motion } from 'framer-motion';
import { GlassCard } from '../../../shared/components/ui/GlassCard';
import { pageVariants, staggerContainer, fadeInUp, scaleIn } from '../../../shared/utils/animations';

const Vision = () => {
    const sections = [
        {
            title: "Universal Token Integration",
            icon: (
                <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            description: "Integrating USAD alongside USDCx and Aleo Credits. For standard and multi-pay invoices, merchants can specify a single asset (Credits, USDCx, or USAD) or allow stablecoin payments (USDCx/USAD). For donations, merchants can enable full flexibility, allowing supporters to contribute using any of the three assets.",
            gradient: "from-indigo-500/20 to-blue-500/20"
        },
        {
            title: "Instant Retail Invoices",
            icon: (
                <svg className="w-8 h-8 text-neon-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            description: "A dedicated 'Instant Invoice' page designed specifically for physical stores, cafes, and pop-up shops. Merchants can generate a quick invoice, and upon user payment, receive immediate 'Payment Successful' feedback. This real-time confirmation makes in-person crypto payments seamlessly practical.",
            gradient: "from-green-500/20 to-emerald-500/20"
        },
        {
            title: "Mobile Experience (Beta)",
            icon: (
                <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            ),
            description: "NullPay V1 Mobile is live via Shield Wallet (Beta). We are actively refining performance and design. Native QR scanning is now fully supported! Due to current wallet limitations, auto-decryption is still temporarily unavailable (pending Shield updates). However, the platform remains fully functional—users can manually decrypt records to transact securely on the go.",
            gradient: "from-cyan-500/20 to-blue-500/20"
        },
        {
            title: "E-Commerce & Enterprise",
            icon: (
                <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            description: "Scalable multi-payment invoices for e-commerce giants and large-scale corporations. Each product sold generates a unique, verifiable payment proof. Organized with individual invoice hashes and memos, making reconciliation effortless for high-volume merchants.",
            gradient: "from-purple-500/20 to-pink-500/20"
        },
        {
            title: "The Treasury System",
            icon: (
                <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            description: (
                <span>
                    <strong className="text-amber-400 block mb-2 text-xs uppercase tracking-widest border border-amber-400/30 bg-amber-400/10 px-2 py-1 rounded w-fit">Experimental Concept</strong>
                    An experimental concept we are exploring. This would involve an intermediary Treasury acting as a secure broker to further obscure the link between payer and receiver, adding an extra layer of privacy. While not yet in development, it represents the direction of our future privacy research.
                </span>
            ),
            gradient: "from-amber-500/20 to-orange-500/20"
        },
        {
            title: "Developer SDK",
            icon: (
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
            ),
            description: "A powerful SDK for seamless integration. Developers and companies can integrate NullPay into their platforms as easily as Stripe or Razorpay, bringing private, zero-knowledge payments to their own applications with just a few lines of code.",
            gradient: "from-emerald-500/20 to-teal-500/20"
        },
        {
            title: "Donations & Fundraising",
            icon: (
                <svg className="w-8 h-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            ),
            description: "Empowering NGOs, creators, and charitable causes. Use open-ended invoices for donations, giving flexibility to supporters to pay using Aleo Credits, USDCx, or the upcoming USAD token. Perfect for creators and open-source developers seeking privacy-preserving support.",
            gradient: "from-pink-500/20 to-rose-500/20"
        }
    ];

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

            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="w-full pt-8 pb-20 relative z-10"
            >
                {/* HERO SECTION */}
                <motion.div variants={fadeInUp} className="text-center mb-20">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter text-white leading-tight">
                        The Future of <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-primary via-white to-purple-400">Private Payments</span>
                    </h1>
                    <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        NullPay isn't just a tool; it's a vision for a world where financial privacy is the default, not an option.
                    </p>
                </motion.div>

                {/* VISION CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {sections.map((section, index) => (
                        <GlassCard
                            key={index}
                            variants={scaleIn}
                            className={`p-8 group relative overflow-hidden border-white/5 hover:border-white/20 transition-all duration-500 ${index === sections.length - 1 ? 'md:col-span-2' : ''}`}
                        >
                            {/* HOVER GRADIENT */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                            {/* MOBILE MOCKUP BACKGROUND - Only for Mobile Experience Card */}
                            {section.title === "Mobile Experience (Beta)" && (
                                <div className="absolute right-0 bottom-0 h-full w-auto opacity-40 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none grayscale group-hover:grayscale-0 flex items-end justify-end">
                                    <img
                                        src="/assets/nullpay_mobile01-left.png"
                                        alt="Mobile Mockup"
                                        className="h-full w-auto object-contain drop-shadow-xl"
                                    />
                                </div>
                            )}

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="mb-6 p-3 bg-white/5 rounded-2xl w-fit group-hover:scale-110 transition-transform duration-300 border border-white/5">
                                    {section.icon}
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-4 tracking-tight group-hover:text-neon-primary transition-colors">
                                    {section.title}
                                </h3>

                                <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                                    {section.description}
                                </p>
                            </div>
                        </GlassCard>
                    ))}
                </div>

                {/* CALL TO ACTION */}
                <motion.div variants={fadeInUp} className="mt-24 text-center">
                    <div className="inline-block p-[1px] rounded-full bg-gradient-to-r from-neon-primary/50 to-purple-500/50">
                        <div className="bg-black/80 backdrop-blur-xl rounded-full px-8 py-3">
                            <span className="text-gray-300 font-mono text-sm tracking-widest uppercase">
                                Building the Private Economy on Aleo
                            </span>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};

export default Vision;
