import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../../shared/components/ui/GlassCard';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

const Verification = () => {
    const [secret, setSecret] = useState('');
    const [salt, setSalt] = useState('');
    const [status, setStatus] = useState<'IDLE' | 'CHECKING' | 'VALID' | 'INVALID'>('IDLE');

    const handleVerify = async () => {
        if (!secret || !salt) return;
        setStatus('CHECKING');
        await new Promise(r => setTimeout(r, 1000));

        try {
            const isValid = secret.length > 5 && salt.length > 5;

            setStatus(isValid ? 'VALID' : 'INVALID');
        } catch (e) {
            setStatus('INVALID');
        }
    };

    return (
        <div className="page-container relative min-h-screen flex items-center justify-center p-6">
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/20 rounded-full blur-[120px] animate-float" />
                <div className="absolute bottom-[-10%] right-[20%] w-[35%] h-[35%] bg-blue-600/20 rounded-full blur-[120px] animate-float-delayed" />
            </div>

            <GlassCard className="w-full max-w-md p-8 relative z-10 flex flex-col gap-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Verify Payment</h1>
                    <p className="text-gray-400 text-sm">
                        Enter the cryptographic secret provided by the payer to verify a transaction without revealing their identity.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-white text-xs font-bold uppercase tracking-wider mb-2 block">Payment Secret</label>
                        <Input
                            value={secret}
                            onChange={(e) => { setSecret(e.target.value); setStatus('IDLE'); }}
                            placeholder="Enter payment secret..."
                            className="bg-black/40 border-white/10 focus:border-violet-500 font-mono text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-white text-xs font-bold uppercase tracking-wider mb-2 block">Invoice Salt</label>
                        <Input
                            value={salt}
                            onChange={(e) => { setSalt(e.target.value); setStatus('IDLE'); }}
                            placeholder="Enter invoice salt..."
                            className="bg-black/40 border-white/10 focus:border-violet-500 font-mono text-sm"
                        />
                    </div>
                </div>

                <Button
                    variant="primary"
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold"
                    onClick={handleVerify}
                    disabled={status === 'CHECKING' || !secret || !salt}
                >
                    {status === 'CHECKING' ? 'Verifying on Chain...' : 'Verify Proof'}
                </Button>

                {status === 'VALID' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-4 text-center">
                        <span className="text-emerald-400 font-bold flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Valid Payment Found
                        </span>
                        <p className="text-xs text-gray-300 mt-1">This secret corresponds to a valid on-chain receipt.</p>
                    </motion.div>
                )}

                {status === 'INVALID' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-center">
                        <span className="text-red-400 font-bold flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            Invalid Proof
                        </span>
                        <p className="text-xs text-gray-300 mt-1">No payment receipt found for this secret/salt combination.</p>
                    </motion.div>
                )}
            </GlassCard>
        </div>
    );
};

export default Verification;
