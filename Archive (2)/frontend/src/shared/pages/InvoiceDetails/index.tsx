import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateInvoicePdf } from '../../utils/generateInvoicePdf';
import { PROGRAM_ID, parseMerchantReceipt, MerchantReceipt } from '../../utils/aleo-utils';
import { VerifyModal } from '../Profile/components/modals/VerifyModal';

interface InvoiceData {
    invoice_hash: string;
    merchant_address?: string;
    designated_address?: string;
    is_burner?: boolean;
    payer_address?: string;
    amount?: number;
    memo?: string;
    status?: 'PENDING' | 'SETTLED';
    invoice_transaction_id?: string;
    payment_tx_ids?: string[];
    payment_tx_id?: string;
    created_at?: string;
    updated_at?: string;
    salt?: string;
    invoice_type?: number;
    token_type?: number;
    invoice_items?: { name: string; quantity: number; unitPrice: number; total: number }[];
}

const EXPLORER = 'https://testnet.explorer.provable.com/transaction';
const TOKEN_LABELS: Record<number, string> = { 0: 'Credits', 1: 'USDCx', 2: 'USAD' };
const TYPE_INFO: Record<number, { label: string; color: string; bg: string; border: string }> = {
    0: { label: 'Standard',  color: '#e2e8f0', bg: 'rgba(226,232,240,0.1)',  border: 'rgba(226,232,240,0.2)' },
    1: { label: 'Multi-Pay', color: '#d8b4fe', bg: 'rgba(216,180,254,0.12)', border: 'rgba(216,180,254,0.25)' },
    2: { label: 'Donation',  color: '#f9a8d4', bg: 'rgba(249,168,212,0.12)', border: 'rgba(249,168,212,0.25)' },
};

/* ─── Copy Button ──────────────────────────────────────────────────────────── */
const CopyBtn: React.FC<{ text: string; small?: boolean }> = ({ text, small }) => {
    const [ok, setOk] = useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1600); }}
            className={`flex-shrink-0 transition-all duration-200 ${small ? 'p-1' : 'p-1.5'} rounded-md active:scale-90`}
            style={{ color: ok ? '#00f3ff' : 'rgba(255,255,255,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.color = ok ? '#00f3ff' : 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = ok ? '#00f3ff' : 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent'; }}
            title="Copy"
        >
            <AnimatePresence mode="wait">
                {ok ? (
                    <motion.svg key="check" initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}
                        className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </motion.svg>
                ) : (
                    <motion.svg key="copy" initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}
                        className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </motion.svg>
                )}
            </AnimatePresence>
        </button>
    );
};

/* ─── Tx Chip ──────────────────────────────────────────────────────────────── */
const TxChip: React.FC<{ txId: string; color?: 'blue' | 'green'; label?: string }> = ({ txId, color = 'blue', label }) => {
    const s = {
        blue:  { bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)', text: '#93c5fd', dot: '#60a5fa', hover: 'rgba(96,165,250,0.18)' },
        green: { bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.3)', text: '#86efac', dot: '#4ade80', hover: 'rgba(74,222,128,0.18)' },
    }[color];
    return (
        <div className="flex items-center gap-2.5 group/chip">
            {label && <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <a href={`${EXPLORER}/${txId}`}
                    className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-mono text-xs font-medium transition-all duration-200 border flex-1 min-w-0"
                    style={{ background: s.bg, borderColor: s.border, color: s.text }}
                    onMouseEnter={e => { e.currentTarget.style.background = s.hover; e.currentTarget.style.borderColor = s.dot; }}
                    onMouseLeave={e => { e.currentTarget.style.background = s.bg; e.currentTarget.style.borderColor = s.border; }}
                >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.dot, boxShadow: `0 0 8px ${s.dot}` }} />
                    <span className="truncate">{txId}</span>
                    <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-50 group-hover/chip:opacity-100 transition-opacity ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
                <CopyBtn text={txId} small />
            </div>
        </div>
    );
};

/* ─── Stat Card ────────────────────────────────────────────────────────────── */
const StatCard: React.FC<{ label: string; value: React.ReactNode; accent?: string; sub?: string }> = ({ label, value, accent = '#00f3ff', sub }) => (
    <div className="relative overflow-hidden rounded-2xl border p-5"
        style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(12px)' }}>
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}80, transparent)` }} />
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</p>
        <div>{value}</div>
        {sub && <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{sub}</p>}
    </div>
);

/* ─── Address Row ──────────────────────────────────────────────────────────── */
const AddressRow: React.FC<{ label: string; addr: string; accent?: string }> = ({ label, addr, accent = '#00f3ff' }) => (
    <div className="flex items-start gap-4 py-4 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] flex-shrink-0 w-24 pt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
        <div className="flex items-start gap-2 min-w-0 flex-1">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
            <span className="font-mono text-xs break-all leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>{addr}</span>
            <CopyBtn text={addr} small />
        </div>
    </div>
);

/* ─── Section Wrapper ──────────────────────────────────────────────────────── */
const Section: React.FC<{ delay?: number; children: React.ReactNode }> = ({ delay = 0, children }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}>
        {children}
    </motion.div>
);

/* ─── Section Title ────────────────────────────────────────────────────────── */
const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; accent?: string; action?: React.ReactNode }> = ({ icon, title, accent = '#00f3ff', action }) => (
    <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center border"
                style={{ background: `${accent}20`, borderColor: `${accent}45` }}>
                <span style={{ color: accent }}>{icon}</span>
            </div>
            <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.85)' }}>{title}</h2>
        </div>
        {action}
    </div>
);

/* ─── Card Shell ───────────────────────────────────────────────────────────── */
const Card: React.FC<{ children: React.ReactNode; accent?: string; noPad?: boolean }> = ({ children, accent, noPad }) => (
    <div className="relative overflow-hidden rounded-2xl border"
        style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(16px)' }}>
        {accent && <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}70, transparent)` }} />}
        <div className={noPad ? '' : 'p-6'}>{children}</div>
    </div>
);

/* ─── Unauthorized ─────────────────────────────────────────────────────────── */
const Unauthorized: React.FC<{ noWallet?: boolean; onBack: () => void }> = ({ noWallet, onBack }) => (
    <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm w-full text-center">
            <div className="relative rounded-3xl border p-12"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(249,115,22,0.35)', backdropFilter: 'blur(20px)', boxShadow: '0 0 80px rgba(249,115,22,0.08)' }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border"
                    style={{ background: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.35)' }}>
                    <svg className="w-8 h-8" style={{ color: '#fb923c' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-white font-black text-2xl mb-3">Access Denied</h2>
                <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {noWallet ? 'Connect your wallet to verify ownership and view this invoice.' : 'This invoice is private and only accessible to its owner.'}
                </p>
                <button onClick={onBack} className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider border transition-all"
                    style={{ background: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.35)', color: '#fb923c' }}>← Dashboard</button>
            </div>
        </motion.div>
    </div>
);

/* ─── Loading ──────────────────────────────────────────────────────────────── */
const LoadingScreen = () => (
    <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(0,243,255,0.15)', borderTopColor: '#00f3ff' }} />
                <div className="absolute inset-3 rounded-full border animate-spin" style={{ animationDuration: '1.8s', animationDirection: 'reverse', borderColor: 'rgba(0,243,255,0.08)', borderTopColor: 'rgba(0,243,255,0.5)' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full" style={{ background: '#00f3ff', boxShadow: '0 0 12px #00f3ff' }} />
                </div>
            </div>
            <p className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading Invoice</p>
        </div>
    </div>
);

/* ─── Main Page ────────────────────────────────────────────────────────────── */
const InvoiceDetailsPage: React.FC = () => {
    const { hash } = useParams<{ hash: string }>();
    const navigate = useNavigate();
    const { address, requestRecords, decrypt } = useWallet();

    const [invoice, setInvoice]         = useState<InvoiceData | null>(null);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [authStatus, setAuthStatus]   = useState<'loading' | 'authorized' | 'unauthorized' | 'no-wallet'>('loading');
    const [pdfLoading, setPdfLoading]   = useState(false);
    const [copied, setCopied]           = useState(false);

    const [receipts, setReceipts]                   = useState<MerchantReceipt[]>([]);
    const [scanningReceipts, setScanningReceipts]   = useState(false);
    const [scanned, setScanned]                     = useState(false);

    const [showVerify, setShowVerify]           = useState(false);
    const [verifyInput, setVerifyInput]         = useState('');
    const [verifyStatus, setVerifyStatus]       = useState<'IDLE' | 'CHECKING' | 'FOUND' | 'NOT_FOUND' | 'ERROR' | 'MISMATCH'>('IDLE');
    const [verifiedRecord, setVerifiedRecord]   = useState<any>(null);

    useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, []);

    useEffect(() => {
        if (!hash) { setError('No invoice hash provided.'); setLoading(false); return; }
        const load = async () => {
            setLoading(true); setError(null);
            try {
                const { fetchInvoiceByHash } = await import('../../services/api');
                const data = await fetchInvoiceByHash(hash);
                if (!data) { setError('Invoice not found.'); setLoading(false); return; }
                setInvoice(data);
                if (!address) setAuthStatus('no-wallet');
                else if (address.toLowerCase() === (data.merchant_address || '').toLowerCase()) setAuthStatus('authorized');
                else setAuthStatus('unauthorized');
            } catch (e: any) { setError(e.message || 'Failed to load invoice.'); }
            finally { setLoading(false); }
        };
        load();
    }, [hash, address]);

    // Auto-scan receipts for donation invoices as soon as everything is ready
    useEffect(() => {
        if (invoice?.invoice_type === 2 && !scanned && !scanningReceipts) {
            handleScanReceipts();
        }
    }, [invoice]);



    const handleScanReceipts = async () => {
        if (!requestRecords || !decrypt || !invoice) return;
        setScanningReceipts(true);
        try {
            const records = await requestRecords(PROGRAM_ID, true);
            const found: MerchantReceipt[] = [];
            if (records) {
                for (const r of records as any[]) {
                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher) { try { plaintext = await decrypt(cipher); } catch { } }
                    const receipt = parseMerchantReceipt({ ...r, plaintext });
                    if (receipt) {
                        const nh = (receipt.invoiceHash || '').replace(/field$/, '').trim();
                        const ni = (invoice.invoice_hash || '').replace(/field$/, '').trim();
                        if (nh === ni || receipt.invoiceHash === invoice.invoice_hash) found.push(receipt);
                    }
                }
            }
            const seen = new Set<string>();
            setReceipts(found.filter(r => { if (seen.has(r.receiptHash)) return false; seen.add(r.receiptHash); return true; }));
        } catch (e) { console.error(e); }
        finally { setScanningReceipts(false); setScanned(true); }
    };

    const handleVerifyReceipt = async () => {
        if (!verifyInput || !requestRecords || !decrypt || !invoice) return;
        setVerifyStatus('CHECKING'); setVerifiedRecord(null);
        try {
            const records = await requestRecords(PROGRAM_ID, true);
            let foundRecord: any = null;
            if (records) {
                for (const r of records as any[]) {
                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher) { try { plaintext = await decrypt(cipher); } catch { } }
                    if (plaintext && plaintext.includes(verifyInput)) {
                        const amountMatch      = plaintext.match(/amount:\s*([\d_]+)u64/);
                        const tokenTypeMatch   = plaintext.match(/token_type:\s*(\d+)u8/);
                        const invoiceHashMatch = plaintext.match(/invoice_hash:\s*([\d]+)field/);
                        foundRecord = {
                            plaintext,
                            amount:      amountMatch      ? parseInt(amountMatch[1].replace(/_/g, '')) / 1_000_000 : 'Unknown',
                            tokenType:   tokenTypeMatch   ? parseInt(tokenTypeMatch[1]) : 0,
                            invoiceHash: invoiceHashMatch ? invoiceHashMatch[1] : 'Unknown',
                        };
                        break;
                    }
                }
            }
            if (foundRecord) {
                const rh = foundRecord.invoiceHash.trim();
                const ih = (invoice.invoice_hash || '').trim().replace(/field$/, '');
                setVerifiedRecord(foundRecord);
                setVerifyStatus(rh !== ih ? 'MISMATCH' : 'FOUND');
            } else { setVerifyStatus('NOT_FOUND'); }
        } catch { setVerifyStatus('ERROR'); }
    };

    const handlePdf = async () => {
        if (!invoice) return;
        setPdfLoading(true);
        try {
            await generateInvoicePdf({
                invoiceHash: invoice.invoice_hash, amount: invoice.amount ?? 0,
                tokenType: invoice.token_type ?? 0, invoiceType: invoice.invoice_type ?? 0,
                walletType: invoice.is_burner ? 1 : 0, status: invoice.status ?? 'PENDING',
                memo: invoice.memo, creationTx: invoice.invoice_transaction_id,
                paymentTxIds, items: invoice.invoice_items,
            });
        } finally { setPdfLoading(false); }
    };

    const handleCopyLink = () => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); };

    const paymentTxIds: string[] = invoice?.payment_tx_ids?.length
        ? invoice.payment_tx_ids
        : invoice?.payment_tx_id ? [invoice.payment_tx_id] : [];

    if (loading) return <LoadingScreen />;

    if (error) return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="text-center max-w-md rounded-3xl border p-12"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(239,68,68,0.35)', backdropFilter: 'blur(20px)' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 border"
                    style={{ background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.35)' }}>
                    <svg className="w-7 h-7" style={{ color: '#f87171' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="text-white font-black text-xl mb-2">Invoice Not Found</h2>
                <p className="text-sm mb-6" style={{ color: '#f87171' }}>{error}</p>
                <button onClick={() => navigate('/profile')} className="px-5 py-2.5 rounded-xl text-sm border transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>← Dashboard</button>
            </div>
        </div>
    );

    if (authStatus === 'unauthorized' || authStatus === 'no-wallet')
        return <Unauthorized noWallet={authStatus === 'no-wallet'} onBack={() => navigate('/profile')} />;

    if (!invoice) return null;

    const typeInfo   = TYPE_INFO[invoice.invoice_type ?? 0] || TYPE_INFO[0];
    const tokenLabel = TOKEN_LABELS[invoice.token_type ?? 0] || 'Credits';
    const isSettled  = invoice.status === 'SETTLED';
    const shortHash  = `${invoice.invoice_hash.slice(0, 16)}...${invoice.invoice_hash.slice(-12)}`;
    const verifyingInvoice = { invoiceHash: invoice.invoice_hash };

    return (
        <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <style>{`
                @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
                .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
                @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
                .shimmer-block { background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.06) 75%); background-size: 600px 100%; animation: shimmer 1.6s infinite; border-radius: 12px; }
            `}</style>

            <VerifyModal
                isOpen={showVerify}
                onClose={() => { setShowVerify(false); setVerifyInput(''); setVerifyStatus('IDLE'); setVerifiedRecord(null); }}
                verifyingInvoice={verifyingInvoice}
                verifyInput={verifyInput} setVerifyInput={setVerifyInput}
                verifyStatus={verifyStatus} verifiedRecord={verifiedRecord}
                merchantReceipts={receipts} onVerify={handleVerifyReceipt}
            />

            {/* ── STICKY NAV ─────────────────────────────────────────────────── */}
            <motion.nav
                initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                className="sticky top-0 z-50 border-b"
                style={{ background: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)' }}
            >
                <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                        <button onClick={() => navigate('/profile', { replace: true })}
                            className="flex items-center gap-2 text-sm font-semibold transition-colors group"
                            style={{ color: 'rgba(255,255,255,0.5)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                        >
                            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Dashboard
                        </button>
                        <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.12)' }} />
                        <div className="flex items-center gap-2.5">
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>Invoice</span>
                            <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>{shortHash}</span>
                            <CopyBtn text={invoice.invoice_hash} small />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Status pill */}
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border"
                            style={{
                                background: isSettled ? 'rgba(74,222,128,0.12)' : 'rgba(250,204,21,0.12)',
                                borderColor: isSettled ? 'rgba(74,222,128,0.35)' : 'rgba(250,204,21,0.35)',
                                color: isSettled ? '#4ade80' : '#facc15',
                            }}>
                            <span className={`w-1.5 h-1.5 rounded-full ${!isSettled ? 'pulse-dot' : ''}`}
                                style={{ background: isSettled ? '#4ade80' : '#facc15', boxShadow: `0 0 6px ${isSettled ? '#4ade80' : '#facc15'}` }} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">{isSettled ? 'Settled' : 'Pending'}</span>
                        </div>

                        {/* Share */}
                        <button onClick={handleCopyLink}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all"
                            style={{
                                background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.07)',
                                borderColor: copied ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.15)',
                                color: copied ? '#4ade80' : 'rgba(255,255,255,0.85)',
                            }}>
                            {copied
                                ? <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Copied</>
                                : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Share</>}
                        </button>

                        {/* Verify */}
                        <button
                            onClick={() => { setVerifyInput(''); setVerifyStatus('IDLE'); setVerifiedRecord(null); setShowVerify(true); }}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all"
                            style={{ background: 'rgba(216,180,254,0.12)', borderColor: 'rgba(216,180,254,0.35)', color: '#d8b4fe' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(216,180,254,0.2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(216,180,254,0.12)')}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Verify Receipt
                        </button>

                        {/* PDF */}
                        <button onClick={handlePdf} disabled={pdfLoading}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                            style={{ background: 'rgba(0,243,255,0.12)', borderColor: 'rgba(0,243,255,0.35)', color: '#00f3ff', boxShadow: '0 0 16px rgba(0,243,255,0.15)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,243,255,0.22)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(0,243,255,0.25)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,243,255,0.12)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(0,243,255,0.15)'; }}
                        >
                            {pdfLoading
                                ? <div className="w-3.5 h-3.5 rounded-full border animate-spin" style={{ borderColor: 'rgba(0,243,255,0.2)', borderTopColor: '#00f3ff' }} />
                                : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                            {pdfLoading ? 'Generating...' : 'Export PDF'}
                        </button>
                    </div>
                </div>
            </motion.nav>

            {/* ── HERO ───────────────────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
                className="relative border-b overflow-hidden"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
            >
                {/* Grid overlay */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }} />
                <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,243,255,0.8), transparent)' }} />

                <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 py-12 lg:py-16">
                    <div className="flex flex-col xl:flex-row xl:items-end gap-10 xl:gap-16">

                        {/* Amount + meta */}
                        <div className="flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-7">
                                <span className="px-3.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider"
                                    style={{ background: typeInfo.bg, borderColor: typeInfo.border, color: typeInfo.color }}>
                                    {typeInfo.label}
                                </span>
                                {invoice.is_burner && (
                                    <span className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider"
                                        style={{ background: 'rgba(0,243,255,0.1)', borderColor: 'rgba(0,243,255,0.3)', color: '#00f3ff' }}>
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                                        </svg>
                                        Burner Wallet
                                    </span>
                                )}
                                <span className="px-3.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider"
                                    style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)' }}>
                                    {tokenLabel}
                                </span>
                            </div>

                            {/* Amount */}
                            <div className="mb-7">
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                    {invoice.invoice_type === 2 ? 'Donations Received' : 'Total Amount'}
                                </p>
                                {invoice.invoice_type === 2 ? (() => {
                                    // Show shimmer while scanning
                                    if (scanningReceipts) return (
                                        <div className="flex items-center gap-4">
                                            <div className="shimmer-block" style={{ width: 'clamp(8rem, 18vw, 14rem)', height: 'clamp(3rem, 7vw, 5.5rem)' }} />
                                            <div className="shimmer-block" style={{ width: '5rem', height: '1.5rem', alignSelf: 'flex-end', marginBottom: '0.5rem' }} />
                                        </div>
                                    );
                                    // Aggregate per-token totals from on-chain receipts (same as tile logic)
                                    const totals = { credits: 0, usdcx: 0, usad: 0 };
                                    receipts.forEach(r => {
                                        const amt = r.amount / 1_000_000;
                                        if (r.tokenType === 0) totals.credits += amt;
                                        else if (r.tokenType === 1) totals.usdcx  += amt;
                                        else if (r.tokenType === 2) totals.usad   += amt;
                                    });
                                    const hasAny = totals.credits > 0 || totals.usdcx > 0 || totals.usad > 0;
                                    return hasAny ? (
                                        <div className="flex flex-wrap items-baseline gap-5">
                                            {totals.credits > 0 && (
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-black tabular-nums leading-none" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: '#ffffff', textShadow: '0 0 60px rgba(0,243,255,0.2)' }}>
                                                        {totals.credits.toFixed(totals.credits % 1 === 0 ? 0 : 4)}
                                                    </span>
                                                    <span className="font-bold uppercase tracking-widest" style={{ fontSize: 'clamp(0.85rem, 2vw, 1.4rem)', color: 'rgba(0,243,255,0.75)' }}>Credits</span>
                                                </div>
                                            )}
                                            {totals.usdcx > 0 && (
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-black tabular-nums leading-none" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: '#ffffff', textShadow: '0 0 60px rgba(168,85,247,0.2)' }}>
                                                        {totals.usdcx.toFixed(totals.usdcx % 1 === 0 ? 0 : 4)}
                                                    </span>
                                                    <span className="font-bold uppercase tracking-widest" style={{ fontSize: 'clamp(0.85rem, 2vw, 1.4rem)', color: 'rgba(168,85,247,0.75)' }}>USDCx</span>
                                                </div>
                                            )}
                                            {totals.usad > 0 && (
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-black tabular-nums leading-none" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: '#ffffff', textShadow: '0 0 60px rgba(249,168,212,0.2)' }}>
                                                        {totals.usad.toFixed(totals.usad % 1 === 0 ? 0 : 4)}
                                                    </span>
                                                    <span className="font-bold uppercase tracking-widest" style={{ fontSize: 'clamp(0.85rem, 2vw, 1.4rem)', color: 'rgba(249,168,212,0.75)' }}>USAD</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-baseline gap-4">
                                            <span className="font-black tabular-nums leading-none" style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)', color: 'rgba(255,255,255,0.25)', textShadow: 'none' }}>0</span>
                                            <span className="font-bold uppercase tracking-widest text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                                {scanned ? 'No receipts yet' : 'Scan receipts to see totals'}
                                            </span>
                                        </div>
                                    );
                                })() : (
                                    <div className="flex items-baseline gap-4">
                                        <span className="font-black tabular-nums leading-none" style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)', color: '#ffffff', textShadow: '0 0 60px rgba(0,243,255,0.2)' }}>
                                            {invoice.amount ?? '—'}
                                        </span>
                                        <span className="font-bold uppercase tracking-widest" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.75rem)', color: 'rgba(0,243,255,0.75)' }}>
                                            {tokenLabel}
                                        </span>
                                    </div>
                                )}
                            </div>


                            {/* Hash row */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>Invoice Hash</span>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
                                    style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' }}>
                                    <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{shortHash}</span>
                                    <CopyBtn text={invoice.invoice_hash} small />
                                </div>
                            </div>

                            {invoice.memo && (
                                <div className="mt-5 inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border"
                                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)' }}>
                                    <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                    <span className="text-sm italic" style={{ color: 'rgba(255,255,255,0.6)' }}>"{invoice.memo}"</span>
                                </div>
                            )}
                        </div>

                        {/* Quick-stats grid */}
                        <div className="xl:w-[400px] grid grid-cols-2 gap-3">
                            <StatCard label="Status" accent={isSettled ? '#4ade80' : '#facc15'}
                                value={
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${!isSettled ? 'pulse-dot' : ''}`}
                                            style={{ background: isSettled ? '#4ade80' : '#facc15', boxShadow: `0 0 10px ${isSettled ? '#4ade80' : '#facc15'}` }} />
                                        <span className="text-sm font-black uppercase tracking-wide" style={{ color: isSettled ? '#4ade80' : '#facc15' }}>
                                            {isSettled ? 'Settled' : 'Pending'}
                                        </span>
                                    </div>
                                }
                            />
                            <StatCard label="Invoice Type" accent={typeInfo.color}
                                value={<span className="text-sm font-black" style={{ color: typeInfo.color }}>{typeInfo.label}</span>}
                            />
                            <StatCard label="Token" accent="#00f3ff"
                                value={<span className="text-sm font-black text-white">{tokenLabel}</span>}
                            />
                            <StatCard label="Wallet" accent={invoice.is_burner ? '#00f3ff' : 'rgba(255,255,255,0.4)'}
                                value={<span className="text-sm font-black" style={{ color: invoice.is_burner ? '#00f3ff' : 'rgba(255,255,255,0.55)' }}>
                                    {invoice.is_burner ? '🔥 Burner' : 'Main'}
                                </span>}
                            />
                            {invoice.created_at && (
                                <div className="col-span-2">
                                    <StatCard label="Created" accent="rgba(255,255,255,0.4)"
                                        value={<span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{new Date(invoice.created_at).toLocaleString()}</span>}
                                        sub={invoice.updated_at ? `Updated ${new Date(invoice.updated_at).toLocaleString()}` : undefined}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── CONTENT GRID ───────────────────────────────────────────────── */}
            <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 py-8">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* LEFT */}
                    <div className="xl:col-span-2 space-y-5">

                        {/* TRANSACTIONS */}
                        <Section delay={0.05}>
                            <Card accent="#60a5fa">
                                <SectionTitle accent="#60a5fa" title="Transactions"
                                    icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                />
                                <div className="space-y-5">
                                    {invoice.invoice_transaction_id ? (
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Creation Transaction</p>
                                            <TxChip txId={invoice.invoice_transaction_id} color="blue" />
                                        </div>
                                    ) : (
                                        <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.25)' }}>No creation transaction recorded.</p>
                                    )}
                                    {paymentTxIds.length > 0 && (
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                                Payment Transaction{paymentTxIds.length > 1 ? `s (${paymentTxIds.length})` : ''}
                                            </p>
                                            <div className="space-y-2">
                                                {paymentTxIds.map((txId, i) => (
                                                    <TxChip key={i} txId={txId} color="green" label={paymentTxIds.length > 1 ? `#${i + 1}` : undefined} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {paymentTxIds.length === 0 && !invoice.invoice_transaction_id && (
                                        <div className="text-center py-10 rounded-xl border border-dashed" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No transactions recorded yet</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </Section>

                        {/* RECEIPT HASHES */}
                        <Section delay={0.1}>
                            <Card accent="#4ade80">
                                <SectionTitle accent="#4ade80" title="On-Chain Receipt Hashes"
                                    icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
                                    action={scanned && receipts.length > 0 && (
                                        <button onClick={handleScanReceipts} disabled={scanningReceipts}
                                            className="text-[11px] font-bold uppercase tracking-wider transition-colors"
                                            style={{ color: 'rgba(255,255,255,0.6)' }}
                                            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
                                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                                        >Rescan</button>
                                    )}
                                />
                                {!scanned ? (
                                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border"
                                            style={{ background: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.3)' }}>
                                            <svg className="w-5 h-5" style={{ color: '#4ade80' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>Scan wallet records</p>
                                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Find all on-chain receipt hashes for this invoice</p>
                                        </div>
                                        <button onClick={handleScanReceipts} disabled={scanningReceipts}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                                            style={{ background: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.35)', color: '#4ade80' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.2)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.1)')}
                                        >
                                            {scanningReceipts
                                                ? <><div className="w-3.5 h-3.5 rounded-full border animate-spin" style={{ borderColor: 'rgba(74,222,128,0.2)', borderTopColor: '#4ade80' }} />Scanning...</>
                                                : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>Scan Receipts</>
                                            }
                                        </button>
                                    </div>
                                ) : receipts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>No receipts found for this invoice</p>
                                        <button onClick={handleScanReceipts} disabled={scanningReceipts} className="text-xs underline underline-offset-2" style={{ color: 'rgba(255,255,255,0.45)' }}>Rescan records</button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {receipts.map((r, idx) => (
                                            <motion.div key={idx}
                                                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                                                className="flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all"
                                                style={{ background: 'rgba(74,222,128,0.07)', borderColor: 'rgba(74,222,128,0.25)' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.13)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.07)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.25)'; }}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="text-[11px] font-bold w-6 text-center flex-shrink-0" style={{ color: 'rgba(74,222,128,0.6)' }}>#{idx + 1}</span>
                                                    <div className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(74,222,128,0.25)' }} />
                                                    <span className="font-mono text-xs truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                                        {r.receiptHash.slice(0, 22)}...{r.receiptHash.slice(-14)}
                                                    </span>
                                                    <CopyBtn text={r.receiptHash} small />
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                                    <span className="font-black text-sm text-white">{(r.amount / 1_000_000)}</span>
                                                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{TOKEN_LABELS[r.tokenType]}</span>
                                                </div>
                                            </motion.div>
                                        ))}
                                        <p className="text-center text-[11px] pt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                            {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} found
                                        </p>
                                    </div>
                                )}
                            </Card>
                        </Section>

                        {/* LINE ITEMS */}
                        {invoice.invoice_items && invoice.invoice_items.length > 0 && (
                            <Section delay={0.15}>
                                <Card accent="#fb923c" noPad>
                                    <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                        <SectionTitle accent="#fb923c" title="Line Items"
                                            icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
                                        />
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                                                    {[['Item','left'],['Qty','center'],['Unit Price','right'],['Total','right']].map(([h, align]) => (
                                                        <th key={h} className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em]"
                                                            style={{ color: 'rgba(255,255,255,0.45)', textAlign: align as any }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {invoice.invoice_items.map((item, idx) => (
                                                    <tr key={idx} className="border-b transition-colors"
                                                        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        <td className="px-6 py-4 text-sm font-semibold text-white">{item.name}</td>
                                                        <td className="px-6 py-4 text-center text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.quantity}</td>
                                                        <td className="px-6 py-4 text-right font-mono text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                                            {item.unitPrice} <span className="text-[10px]">{tokenLabel}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-sm text-white">
                                                            {item.total} <span className="text-[10px] font-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>{tokenLabel}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ background: 'rgba(0,243,255,0.05)' }}>
                                                    <td colSpan={3} className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(0,243,255,0.65)' }}>Total</td>
                                                    <td className="px-6 py-4 text-right font-black text-lg" style={{ color: '#00f3ff' }}>
                                                        {invoice.invoice_items.reduce((s, i) => s + i.total, 0)}
                                                        <span className="text-sm font-normal ml-1.5" style={{ color: 'rgba(0,243,255,0.55)' }}>{tokenLabel}</span>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </Card>
                            </Section>
                        )}
                    </div>

                    {/* RIGHT sidebar */}
                    <div className="space-y-5">

                        {/* ADDRESSES */}
                        <Section delay={0.12}>
                            <Card accent="#00f3ff">
                                <SectionTitle accent="#00f3ff" title="Addresses & Hashes"
                                    icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>}
                                />
                                <AddressRow label="Invoice Hash" addr={invoice.invoice_hash} accent="#00f3ff" />
                                {invoice.salt && <AddressRow label="Salt" addr={invoice.salt} accent="rgba(255,255,255,0.5)" />}
                                {invoice.merchant_address && <AddressRow label="Merchant" addr={invoice.merchant_address} accent="#93c5fd" />}
                                {invoice.designated_address && invoice.designated_address !== invoice.merchant_address && (
                                    <AddressRow label="Designated" addr={invoice.designated_address} accent="#c084fc" />
                                )}
                                {invoice.payer_address && <AddressRow label="Payer" addr={invoice.payer_address} accent="#86efac" />}
                            </Card>
                        </Section>

                        {/* METADATA */}
                        <Section delay={0.17}>
                            <Card accent="#c084fc">
                                <SectionTitle accent="#c084fc" title="Metadata"
                                    icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                                />
                                <div>
                                    {[
                                        { label: 'Status', value:
                                            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border"
                                                style={{ background: isSettled ? 'rgba(74,222,128,0.14)' : 'rgba(250,204,21,0.14)', borderColor: isSettled ? 'rgba(74,222,128,0.4)' : 'rgba(250,204,21,0.4)', color: isSettled ? '#4ade80' : '#facc15' }}>
                                                {invoice.status ?? 'PENDING'}
                                            </span>
                                        },
                                        { label: 'Token', value: <span className="text-sm font-black text-white">{tokenLabel}</span> },
                                        { label: 'Type', value:
                                            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border"
                                                style={{ background: typeInfo.bg, borderColor: typeInfo.border, color: typeInfo.color }}>
                                                {typeInfo.label}
                                            </span>
                                        },
                                        { label: 'Wallet', value: invoice.is_burner
                                            ? <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: '#00f3ff' }}>
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
                                                Burner Wallet
                                              </span>
                                            : <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>Main Wallet</span>
                                        },
                                        ...(invoice.created_at ? [{ label: 'Created', value: <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{new Date(invoice.created_at).toLocaleString()}</span> }] : []),
                                        ...(invoice.updated_at ? [{ label: 'Updated', value: <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{new Date(invoice.updated_at).toLocaleString()}</span> }] : []),
                                    ].map(({ label, value }, i, arr) => (
                                        <div key={label} className="flex items-center justify-between py-3.5"
                                            style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                                            <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
                                            {value}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </Section>

                        {/* PDF EXPORT */}
                        <Section delay={0.22}>
                            <div className="relative overflow-hidden rounded-2xl border p-6"
                                style={{ background: 'rgba(0,243,255,0.06)', borderColor: 'rgba(0,243,255,0.45)', backdropFilter: 'blur(16px)' }}>
                                <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,243,255,0.7), transparent)' }} />
                                <div className="absolute right-0 top-0 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(0,243,255,0.1) 0%, transparent 70%)' }} />
                                <div className="relative">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0"
                                            style={{ background: 'rgba(0,243,255,0.15)', borderColor: 'rgba(0,243,255,0.4)' }}>
                                            <svg className="w-5 h-5" style={{ color: '#00f3ff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white">Export as PDF</p>
                                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Formatted receipt for your records</p>
                                        </div>
                                    </div>
                                    <button onClick={handlePdf} disabled={pdfLoading}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                        style={{ background: 'rgba(0,243,255,0.15)', borderColor: 'rgba(0,243,255,0.4)', color: '#00f3ff', boxShadow: '0 0 24px rgba(0,243,255,0.15)' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,243,255,0.28)'; e.currentTarget.style.boxShadow = '0 0 36px rgba(0,243,255,0.28)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,243,255,0.15)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(0,243,255,0.15)'; }}
                                    >
                                        {pdfLoading
                                            ? <><div className="w-3.5 h-3.5 rounded-full border animate-spin" style={{ borderColor: 'rgba(0,243,255,0.2)', borderTopColor: '#00f3ff' }} />Generating...</>
                                            : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Download PDF</>}
                                    </button>
                                </div>
                            </div>
                        </Section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetailsPage;