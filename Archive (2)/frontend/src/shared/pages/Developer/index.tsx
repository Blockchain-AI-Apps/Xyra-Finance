import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Terminal, Key, Globe, BookOpen, ArrowRight, CheckCircle, Lock, Zap, Shield, Copy, Check } from 'lucide-react';

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const CodeBlock = ({ title, code, language = 'javascript' }: { title: string; code: string; language?: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="mt-4 mb-6 group">
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-t-xl border-b-0">
                <span className="font-mono text-xs text-neon-primary font-bold uppercase tracking-wider">{title}</span>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-600 font-mono uppercase">{language}</span>
                    <button onClick={handleCopy} className="text-gray-500 hover:text-white transition-colors">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>
            <pre className="p-5 bg-black/80 border border-white/10 rounded-b-xl overflow-x-auto text-xs text-gray-300 font-mono leading-relaxed group-hover:border-white/20 transition-colors max-h-[500px] overflow-y-auto">
                <code>{code}</code>
            </pre>
        </div>
    );
};

// ─── Inline Property Breakdown ────────────────────────────────────────────────
const PropRow = ({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) => (
    <div className="flex flex-col sm:flex-row items-start gap-3 py-4 border-b border-white/[0.06] last:border-b-0">
        <div className="flex items-center gap-2 min-w-[200px]">
            <code className="text-neon-primary text-xs font-mono font-bold">{name}</code>
            {required && <span className="text-[9px] text-red-400 font-black uppercase tracking-widest">req</span>}
        </div>
        <code className="text-blue-400 text-xs font-mono min-w-[80px]">{type}</code>
        <p className="text-gray-500 text-xs leading-relaxed flex-1">{desc}</p>
    </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status, desc }: { status: string; desc: string }) => {
    const colors: Record<string, string> = {
        PENDING: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
        SETTLED: 'text-green-400 bg-green-400/10 border-green-400/20',
        FAILED: 'text-red-400 bg-red-400/10 border-red-400/20',
        EXPIRED: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
    };
    return (
        <div className="flex items-center gap-4 py-3 border-b border-white/[0.05] last:border-0">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border font-mono ${colors[status] ?? 'text-white'}`}>{status}</span>
            <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const DeveloperPortal = () => {
    const { address: publicKey } = useWallet();
    const [name, setName] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [secretKey, setSecretKey] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('keys');
    const [commandCopied, setCommandCopied] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!publicKey) { setError('Please connect your Aleo wallet first.'); return; }
        if (!name) { setError('Merchant name is required.'); return; }
        try {
            setLoading(true);
            setError(null);
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const response = await fetch(`${apiUrl}/merchants/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, aleo_address: publicKey, webhook_url: webhookUrl || null }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Registration failed.');
            setSecretKey(data.secret_key);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'keys', label: 'API Keys', icon: BookOpen },
        { id: 'quickstart', label: 'Quick Start', icon: Zap },
        { id: 'sdk', label: 'SDK Reference', icon: Terminal },
        { id: 'sessions', label: 'Sessions API', icon: Key },
        { id: 'webhooks', label: 'Webhooks', icon: Globe },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative min-h-screen"
        >
            {/* Background blobs */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute bottom-[-10%] right-[10%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[100px] animate-float-delayed" />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto pt-8 pb-24 px-6">

                {/* ── Hero ─────────────────────────────────────────────── */}
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="mb-16 flex flex-col items-center text-center"
                >
                    <motion.div variants={fadeInUp} className="mb-6">
                        <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">For Developers</span>
                    </motion.div>
                    <motion.h1
                        variants={fadeInUp}
                        className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-6"
                    >
                        Developers <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-primary to-neon-accent">Page</span>
                    </motion.h1>
                    <motion.p variants={fadeInUp} className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        The complete SDK and API reference for integrating Zero-Knowledge private payments into any application.
                        Stripe-like simplicity. Aleo-grade privacy.
                    </motion.p>

                    <motion.div variants={fadeInUp} className="mt-8 mb-4">
                        <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:border-white/20 transition-all group max-w-fit mx-auto cursor-pointer" onClick={() => {
                            navigator.clipboard.writeText('npm install @nullpay/node');
                            setCommandCopied(true);
                            setTimeout(() => setCommandCopied(false), 2000);
                        }}>
                            <Terminal className="w-3.5 h-3.5 text-gray-500 group-hover:text-neon-primary transition-colors" />
                            <code className="text-sm font-mono text-gray-300">npm install @nullpay/node</code>
                            <div className="flex items-center gap-1.5 ml-4 border-l border-white/10 pl-4">
                                {commandCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />}
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors">
                                    {commandCopied ? 'Copied!' : 'Copy'}
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-6 mt-6">
                        {[
                            { icon: Shield, label: 'AES-256-GCM encrypted keys' },
                            { icon: Zap, label: 'Sub-500ms session creation' },
                            { icon: Lock, label: 'ZK proofs, zero exposure' },
                        ].map((feat, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                                <feat.icon className="w-4 h-4 text-gray-600" />
                                <span>{feat.label}</span>
                            </div>
                        ))}
                    </motion.div>
                </motion.div>

                {/* ── Sticky Tab Nav ────────────────────────────────────── */}
                <div className="sticky top-24 z-50 mb-12">
                    <div className="flex flex-wrap gap-2 bg-black/60 backdrop-blur-2xl p-2 rounded-2xl border border-white/[0.06] max-w-fit">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === tab.id
                                        ? 'bg-white text-black shadow-lg'
                                        : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                                    }`}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Tab Content ───────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {/* ── QUICK START ── */}
                    {activeTab === 'quickstart' && (
                        <motion.div key="quickstart" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {[
                                    { n: '01', title: 'Install SDK', desc: 'One npm command to add the NullPay Node client to your backend.', icon: Terminal },
                                    { n: '02', title: 'Create Session', desc: 'Generate a unique checkout URL with amount, currency, and redirect URLs.', icon: Key },
                                    { n: '03', title: 'Verify & Fulfill', desc: 'Listen to webhooks or poll the session to confirm payment and unlock value.', icon: CheckCircle },
                                ].map((step, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500 group"
                                    >
                                        <div className="flex items-center gap-3 mb-5">
                                            <span className="text-[11px] font-black text-gray-600 font-mono">{step.n}</span>
                                            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center group-hover:border-white/20 transition-all">
                                                <step.icon className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                                        <p className="text-gray-500 text-sm leading-relaxed group-hover:text-gray-400 transition-colors">{step.desc}</p>
                                    </motion.div>
                                ))}
                            </div>

                            <GlassCard className="p-8 md:p-10">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-bold text-white">Installation</h2>
                                    <a
                                        href="https://www.npmjs.com/package/@nullpay/node"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                                    >
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M0 7.334v8h6.666v2.666H12v-2.666h12v-8H0zm6.666 5.332H4V10h2.666v2.666zm5.334 0h-2.666V10h2.666v2.666zm8 0h-2.666V10h2.666v2.666z" /></svg>
                                        npm package
                                    </a>
                                </div>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    The <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">@nullpay/node</code> SDK is a lightweight client for your Node.js backend.
                                    Never expose your secret key on the frontend.
                                </p>
                                <CodeBlock title="Install SDK" language="bash" code={`npm install @nullpay/node`} />

                                <h2 className="text-2xl font-bold text-white mt-10 mb-2">Initialize the Client</h2>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    Instantiate once and reuse. Your <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">secretKey</code> starts with <code className="text-gray-300 bg-white/5 px-1.5 py-0.5 rounded">sk_</code>.
                                    Store it in an environment variable — never commit it to source control.
                                </p>
                                <CodeBlock title="nullpay.ts — Server-side client" code={`import { NullPay } from '@nullpay/node';

const nullpay = new NullPay({
    secretKey: process.env.NULLPAY_SECRET_KEY!, // sk_xxxxxxxxxxxxxxxx
});

export default nullpay;`} />

                                <h2 className="text-2xl font-bold text-white mt-10 mb-2">Create a Checkout Session</h2>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    Call this from your server when a user initiates a purchase.
                                    The returned <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">session.checkout_url</code> is a unique, one-time payment page
                                    hosted on NullPay where the user's browser generates the ZK-proof.
                                </p>
                                <CodeBlock title="POST /api/checkout — Your backend route" code={`import nullpay from './nullpay';

export async function createCheckout(req, res) {
    const session = await nullpay.checkout.sessions.create({
        amount: 50,         // Number of tokens (e.g. 50 USDCX)
        currency: 'USDCX', // 'CREDITS' | 'USDCX' | 'USAD'

        // The placeholder {CHECKOUT_SESSION_ID} is auto-replaced by NullPay
        success_url: 'https://yoursite.com/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://yoursite.com/cart',
    });

    // Redirect the user to the NullPay payment page
    res.redirect(303, session.checkout_url);
}`} />

                                <h2 className="text-2xl font-bold text-white mt-10 mb-2">Verify the Payment on Success</h2>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    On your <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">success_url</code>, retrieve the session using the
                                    <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded mx-1">session_id</code> query parameter.
                                    Always verify <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">status === 'SETTLED'</code> before fulfilling orders.
                                </p>
                                <CodeBlock title="GET /success — Your success page handler" code={`import nullpay from './nullpay';

export async function handleSuccess(req, res) {
    const { session_id } = req.query;

    // Retrieve the session from NullPay
    const session = await nullpay.checkout.sessions.retrieve(session_id);

    if (session.status !== 'SETTLED') {
        // Payment not confirmed — do NOT fulfill
        return res.redirect('/cart?error=payment_not_confirmed');
    }

    // ✅ Payment confirmed on Aleo. Fulfill the order.
    await db.orders.fulfill({ sessionId: session_id });
    await sendConfirmationEmail(session.metadata);

    res.send('Order confirmed!');
}`} />
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* ── SDK REFERENCE ── */}
                    {activeTab === 'sdk' && (
                        <motion.div key="sdk" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <GlassCard className="p-8 md:p-10">
                                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">SDK Reference</span>
                                <h2 className="text-3xl font-bold text-white mt-3 mb-2">NullPay Node SDK</h2>
                                <p className="text-gray-400 text-sm leading-relaxed mb-10">
                                    Complete reference for all methods in the <code className="text-neon-primary">@nullpay/node</code> package.
                                </p>

                                <div className="space-y-12">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                                            <Terminal className="w-5 h-5 text-gray-500" />
                                            new NullPay(config)
                                        </h3>
                                        <p className="text-gray-500 text-sm mb-5 leading-relaxed">Constructor. Creates and authenticates the client with NullPay servers.</p>
                                        <div className="bg-black/40 rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04] px-4 mb-5">
                                            <PropRow name="secretKey" type="string" required desc="Your merchant Secret API Key. Must start with sk_. Store in environment variables only." />
                                        </div>
                                        <CodeBlock title="Initialization" code={`import { NullPay } from '@nullpay/node';

const nullpay = new NullPay({ secretKey: 'sk_test_••••••••' });`} />
                                    </div>

                                    <div className="pt-4 border-t border-white/[0.06]">
                                        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                                            <Key className="w-5 h-5 text-gray-500" />
                                            nullpay.checkout.sessions.create(params)
                                        </h3>
                                        <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                                            Creates a new Checkout Session. Returns a session object with a unique <code className="text-neon-primary">checkout_url</code>.
                                            The user must be redirected to this URL to complete payment. Each session is single-use.
                                        </p>
                                        <div className="bg-black/40 rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04] px-4 mb-5">
                                            <PropRow name="amount" type="number" required desc="The amount of tokens to charge. Denominated in whole units (e.g. 50 for 50 USDCX)." />
                                            <PropRow name="currency" type="'CREDITS' | 'USDCX' | 'USAD'" required desc="The token type to accept as payment." />
                                            <PropRow name="success_url" type="string" required desc="URL to redirect after successful payment. Use {CHECKOUT_SESSION_ID} as a placeholder." />
                                            <PropRow name="cancel_url" type="string" desc="URL to redirect if the user cancels or closes the checkout." />
                                        </div>
                                        <CodeBlock title="Create session" code={`const session = await nullpay.checkout.sessions.create({
    amount: 100,
    currency: 'USDCX',
    success_url: 'https://yoursite.com/success?id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://yoursite.com/cart',
});

console.log(session.id);   // ses_abc123
console.log(session.checkout_url);  // https://nullpay.app/checkout/ses_abc123`} />
                                    </div>

                                    <div className="pt-4 border-t border-white/[0.06]">
                                        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-gray-500" />
                                            nullpay.checkout.sessions.retrieve(id)
                                        </h3>
                                        <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                                            Fetches a previously created session by its ID. Use this on your <code className="text-neon-primary">success_url</code> page to
                                            verify payment status before fulfilling an order. Always check <code className="text-neon-primary">status === 'SETTLED'</code>.
                                        </p>
                                        <div className="bg-black/40 rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04] px-4 mb-5">
                                            <PropRow name="id" type="string" required desc="The session ID returned from sessions.create() or from the {CHECKOUT_SESSION_ID} URL placeholder." />
                                        </div>
                                        <CodeBlock title="Retrieve session" code={`const session = await nullpay.checkout.sessions.retrieve('ses_abc123');

// Always guard on status before fulfilling
if (session.status === 'SETTLED') {
    console.log('Payment confirmed! Invoice:', session.invoice_hash);
    console.log('Amount paid:', session.amount, session.token_type);
}`} />
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* ── SESSIONS API ── */}
                    {activeTab === 'sessions' && (
                        <motion.div key="sessions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <GlassCard className="p-8 md:p-10">
                                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">Sessions API</span>
                                <h2 className="text-3xl font-bold text-white mt-3 mb-2">Checkout Session Object</h2>
                                <p className="text-gray-400 text-sm leading-relaxed mb-10">
                                    A Checkout Session represents the entire lifecycle of a payment — from creation through on-chain settlement.
                                    All sensitive fields are encrypted at rest using AES-256-GCM.
                                </p>

                                <h3 className="text-lg font-bold text-white mb-4">Session Properties</h3>
                                <div className="bg-black/40 rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04] px-4 mb-10">
                                    <PropRow name="id" type="string" desc="Unique identifier for the session. Format: ses_xxxxxxxx." />
                                    <PropRow name="status" type="string" desc="Payment status. One of: PROCESSING, PENDING, SETTLED, FAILED." />
                                    <PropRow name="amount" type="number" desc="The amount charged, in whole token units (e.g. 50 for 50 USDCX). Available on retrieve." />
                                    <PropRow name="token_type" type="string" desc="Token type: CREDITS, USDCX, or USAD. Available on retrieve." />
                                    <PropRow name="checkout_url" type="string" desc="The one-time checkout URL to redirect your customer to." />
                                    <PropRow name="invoice_hash" type="string" desc="The zero-knowledge invoice hash." />
                                </div>

                                <h3 className="text-lg font-bold text-white mb-4">Status Lifecycle</h3>
                                <div className="bg-black/40 rounded-2xl border border-white/[0.06] px-5 py-2 mb-10">
                                    <StatusBadge status="PENDING" desc="Session created. The user has been redirected to the checkout page but has not yet submitted payment." />
                                    <StatusBadge status="SETTLED" desc="Payment confirmed on Aleo. The ZK-proof has been verified and funds have moved on-chain. Safe to fulfill." />
                                    <StatusBadge status="FAILED" desc="The transaction was submitted but rejected by the Aleo network. Do NOT fulfill. Contact support." />
                                    <StatusBadge status="EXPIRED" desc="The session was not completed within the time limit (24h). Create a new session for the user." />
                                </div>

                                <h3 className="text-lg font-bold text-white mb-4">Raw HTTP API (without SDK)</h3>
                                <CodeBlock title="POST /api/checkout/sessions" language="http" code={`POST https://null-pay-rs8i.vercel.app/api/checkout/sessions
Authorization: Bearer sk_test_xxxxxxxxxxxxxxxx
Content-Type: application/json

{
    "amount": 100,
    "currency": "USDCX",
    "success_url": "https://yoursite.com/success?id={CHECKOUT_SESSION_ID}",
    "cancel_url": "https://yoursite.com/cart"
}

// Response 200 OK
{
    "id": "ses_a1b2c3d4",
    "checkout_url": "https://nullpay.app/checkout/ses_a1b2c3d4",
    "status": "PROCESSING",
    "invoice_hash": "...",
    "salt": "..."
}`} />

                                <CodeBlock title="GET /api/checkout/sessions/:id" language="http" code={`GET https://null-pay-rs8i.vercel.app/api/checkout/sessions/ses_a1b2c3d4
Authorization: Bearer sk_test_xxxxxxxxxxxxxxxx

// Response 200 OK — payment settled
{
    "id": "ses_a1b2c3d4",
    "status": "SETTLED",
    "amount": 100,
    "token_type": "USDCX",
    "invoice_hash": "...",
    "merchant_name": "My Premium Store"
}`} />
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* ── WEBHOOKS ── */}
                    {activeTab === 'webhooks' && (
                        <motion.div key="webhooks" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <GlassCard className="p-8 md:p-10">
                                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">Webhooks</span>
                                <h2 className="text-3xl font-bold text-white mt-3 mb-2">Real-Time Event Delivery</h2>
                                <p className="text-gray-400 text-sm leading-relaxed mb-10">
                                    Webhooks are the recommended way to fulfill orders. When a payment settles on-chain, NullPay sends an
                                    authenticated <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">POST</code> request to your registered webhook URL
                                    within seconds. You set your webhook URL when registering as a merchant.
                                </p>

                                <h3 className="text-lg font-bold text-white mb-4">Event Payload</h3>
                                <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                                    NullPay sends a JSON body containing the webhook event object. Use the SDK's <code className="text-neon-primary">constructEvent</code> to automatically parse and verify the HMAC-SHA256 signature in one step.
                                </p>
                                <CodeBlock title="Webhook POST body" language="json" code={`{
    "id": "ses_a1b2c3d4",
    "amount": 100,
    "token_type": "USDCX",
    "status": "SETTLED",
    "tx_id": "at1abc...xyz",
    "timestamp": "2025-03-13T07:30:00.000Z"
}`} />

                                <h3 className="text-lg font-bold text-white mb-4 mt-8">Handling Webhooks in Express</h3>
                                <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                                    Your endpoint must respond with a <code className="text-neon-primary">2xx</code> status within 30 seconds.
                                    If it doesn't, NullPay will retry delivery up to 3 times with exponential backoff.
                                </p>
                                <CodeBlock title="Express webhook handler" code={`import express from 'express';
import nullpay from './nullpay';

const app = express();

// ⚠️ Ensure you capture the raw body for signature verification
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-nullpay-signature'];

    try {
        const event = nullpay.webhooks.constructEvent(req.body.toString(), signature);

        if (event.status === 'SETTLED') {
            // ✅ Double-check session status via API before fulfilling
            const verified = await nullpay.checkout.sessions.retrieve(event.id);

            if (verified.status === 'SETTLED') {
                // Fulfill the order in your database
                await db.orders.updateStatus(event.id, 'fulfilled');
                console.log('Order fulfilled for session:', event.id);
            }
        }

        // Always return 200 to acknowledge receipt
        res.status(200).json({ received: true });
    } catch (err) {
        res.status(400).send(\`Webhook Error: \${err.message}\`);
    }
});`} />

                                <div className="mt-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                    <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-gray-400" />
                                        Security Best Practices
                                    </h4>
                                    <div className="space-y-3 mt-4">
                                        {[
                                            'Always verify the session status via API before fulfilling — do not trust the webhook payload alone.',
                                            'Your webhook URL should use HTTPS in production.',
                                            'Implement idempotency — store processed session IDs to prevent double-fulfillment on retries.',
                                            'Use a secret key rotation strategy — register a new merchant account if your key is compromised.',
                                        ].map((tip, i) => (
                                            <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
                                                <span className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-gray-600 font-bold shrink-0 mt-0.5">{i + 1}</span>
                                                {tip}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* ── API KEYS / REGISTRATION ── */}
                    {activeTab === 'keys' && (
                        <motion.div key="keys" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                {/* Registration Card */}
                                <GlassCard className="p-8">
                                    <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">Step 01</span>
                                    <h2 className="text-2xl font-bold text-white mt-3 mb-2">Register as a Merchant</h2>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-8">
                                        Connect your Aleo wallet to register. Your wallet address becomes the settlement destination — all payments flow here.
                                        Your Secret Key is encrypted with <strong className="text-white">AES-256-GCM</strong> before being stored.
                                    </p>

                                    {!publicKey ? (
                                        <div className="space-y-5 text-center py-4">
                                            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto">
                                                <Lock className="w-6 h-6 text-gray-500" />
                                            </div>
                                            <p className="text-gray-500 text-sm">Connect your Aleo wallet to identify yourself. Payments settle to this address.</p>
                                            <div className="wallet-adapter-wrapper w-full [&>button]:!w-full [&>button]:!bg-white [&>button]:!text-black [&>button]:!font-black [&>button]:!rounded-xl [&>button]:!h-12">
                                                <WalletMultiButton />
                                            </div>
                                        </div>
                                    ) : secretKey ? (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                                            <div className="p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                                    <span className="text-sm font-bold text-white">Merchant Registered</span>
                                                </div>
                                                <p className="text-gray-400 text-xs leading-relaxed mb-4">
                                                    Copy your Secret Key and store it in an environment variable immediately.
                                                    This is the <span className="text-red-400 font-bold">only time</span> it will be shown.
                                                </p>
                                                <div className="bg-black/60 rounded-xl p-4 border border-white/10 relative overflow-hidden">
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-neon-primary to-neon-accent" />
                                                    <code className="text-neon-primary text-xs font-mono break-all pl-2">{secretKey}</code>
                                                </div>
                                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mt-3 animate-pulse">⚠ Copy now — cannot be recovered later</p>
                                            </div>
                                            <Button variant="secondary" className="w-full" onClick={() => setSecretKey(null)}>
                                                Register Another Store
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <form onSubmit={handleRegister} className="space-y-5">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Store Name *</label>
                                                <input
                                                    value={name}
                                                    onChange={e => setName(e.target.value)}
                                                    placeholder="e.g. My Premium Store"
                                                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-colors font-mono"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Webhook URL <span className="text-gray-600 normal-case tracking-normal font-normal">(recommended)</span></label>
                                                <input
                                                    type="url"
                                                    value={webhookUrl}
                                                    onChange={e => setWebhookUrl(e.target.value)}
                                                    placeholder="https://yoursite.com/api/webhook"
                                                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-colors font-mono"
                                                />
                                                <p className="text-[10px] text-gray-600 mt-1.5 ml-1">NullPay will POST here every time a payment settles.</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Settlement Address</label>
                                                <div className="bg-black/30 rounded-xl p-3.5 border border-white/[0.05]">
                                                    <p className="text-[10px] text-gray-500 font-mono break-all">{publicKey}</p>
                                                </div>
                                            </div>
                                            {error && (
                                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                                    <p className="text-xs text-red-400">{error}</p>
                                                </div>
                                            )}
                                            <Button type="submit" variant="primary" glow className="w-full h-14 text-base" disabled={loading}>
                                                {loading ? (
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                        Generating...
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2">
                                                        <Key className="w-4 h-4" />
                                                        Generate Secret Key
                                                        <ArrowRight className="w-4 h-4" />
                                                    </span>
                                                )}
                                            </Button>
                                        </form>
                                    )}
                                </GlassCard>

                                {/* Info Side */}
                                <div className="space-y-5">
                                    <div className="p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                        <h3 className="text-lg font-bold text-white mb-4">Key Security Model</h3>
                                        <div className="space-y-4">
                                            {[
                                                { label: 'Encryption at Rest', desc: 'Your secret key is hashed (SHA-256) for fast lookup and stored as AES-256-GCM ciphertext. The plaintext never persists.' },
                                                { label: 'One-Time Display', desc: 'The plaintext key is returned once — immediately after creation. After that, even NullPay cannot recover it.' },
                                                { label: 'No Rotation (Yet)', desc: 'If your key is compromised, register a new merchant account with a new Aleo address.' },
                                            ].map((item, i) => (
                                                <div key={i} className="flex items-start gap-3">
                                                    <div className="w-5 h-5 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[10px] text-gray-500 font-bold shrink-0 mt-0.5">{i + 1}</div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white mb-1">{item.label}</p>
                                                        <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                        <h3 className="text-lg font-bold text-white mb-4">Environment Setup</h3>
                                        <CodeBlock title=".env" language="bash" code={`# Server-side only — never expose on frontend
NULLPAY_SECRET_KEY=sk_xxxxxxxxxxxxxxxx`} />
                                        <CodeBlock title="Loading in code" code={`import { NullPay } from '@nullpay/node';

// ✅ Read from environment
const nullpay = new NullPay({
    secretKey: process.env.NULLPAY_SECRET_KEY!,
});`} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default DeveloperPortal;
