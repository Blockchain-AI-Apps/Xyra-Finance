import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../shared/components/ui/Button';

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};



export const USDCxInfo: React.FC = () => {
    return (
        <section className="relative z-10 pt-12 pb-20 overflow-hidden">
            {/* BACKGROUND GLOW */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-neon-primary/5 rounded-full blur-[150px] pointer-events-none -z-10" />

            <div className="max-w-7xl mx-auto px-6">
                
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 text-center tracking-tight">
                    Supported <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-primary to-neon-accent">Stablecoins</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    {/* USDCx SECTION */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                        className="text-center bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-neon-primary/30 transition-colors"
                    >

                        <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">
                            USDCx
                        </h3>
                        <p className="text-lg text-gray-400 mb-8 min-h-[80px]">
                            Control what you share on your terms. USDCx is a wrapped representation of USDC on Aleo, bringing optional privacy to stablecoin transactions.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button
                                variant="ghost"
                                className="h-12 px-6 text-sm text-neon-primary hover:text-neon-accent hover:bg-neon-primary/10 border border-neon-primary/20 w-full sm:w-auto"
                                onClick={() => window.open('https://usdcx.aleo.dev/', '_blank')}
                            >
                                Mint USDCx on Aleo
                                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </Button>
                            <Button
                                variant="ghost"
                                className="h-12 px-6 text-sm text-gray-400 hover:text-white hover:bg-white/5 border border-white/10 w-full sm:w-auto"
                                onClick={() => window.open('https://faucet.circle.com/', '_blank')}
                            >
                                Get Sepolia USDC
                                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </Button>
                        </div>
                    </motion.div>

                    {/* USAD SECTION */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                        className="text-center bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-emerald-400/30 transition-colors"
                    >

                        <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">
                            USAD
                        </h3>
                        <p className="text-lg text-gray-400 mb-8 min-h-[80px]">
                            A programmable stablecoin designed for Aleo. Enjoy high-speed, private network infrastructure while maintaining peg stability.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button
                                variant="ghost"
                                className="h-12 px-6 text-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 border border-emerald-400/20 w-full sm:w-auto"
                                onClick={() => window.open('https://usad.aleo.dev/', '_blank')}
                            >
                                Mint USAD on Aleo
                                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </Button>
                            <Button
                                variant="ghost"
                                className="h-12 px-6 text-sm text-gray-400 hover:text-white hover:bg-white/5 border border-white/10 w-full sm:w-auto"
                                onClick={() => window.open('https://faucet.paxos.com/', '_blank')}
                            >
                                Get Sepolia USDG
                                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </Button>
                        </div>
                    </motion.div>
                </div>



                {/* FOOTER / DISCLAIMER */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                    className="text-center border-t border-white/5 pt-6"
                >
                    <p className="text-xs text-gray-500 max-w-4xl mx-auto leading-relaxed mb-8">
                        USDCx is a wrapped representation of USDC on the Aleo Network. Users may deposit USDC to receive USDCx on Aleo. USDC is issued by Circle. The privacy features described in this documentation apply exclusively to transactions on the Aleo Network. Tokens bridged to or existing on other blockchain networks will not have these privacy features. Transactions involving these tokens on non-Aleo chains are not private by default and do not benefit from Aleo's zero-knowledge cryptography or privacy-preserving features.
                        <br /><br />
                        USAD is a wrapped representation of USDG on the Aleo Network. At launch, users can deposit USDG to receive USAD. USAD is an encrypted stablecoin that keeps your transactions, balance, and everything else you do private from unwanted eyes while maintaining full regulatory compliance through Paxos Labs’ trusted infrastructure.
                    </p>

                </motion.div>

            </div>
        </section>
    );
};


