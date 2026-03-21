import React, { useState } from 'react';
import type { PrivateBalances, SweepCurrency } from './types';
import { Edit2, Lock } from 'lucide-react';

interface SweepModalProps {
    privateBalances: PrivateBalances;
    isScanningBalances: boolean;
    onScanBalances: () => void;
    sweepCurrency: SweepCurrency;
    setSweepCurrency: (v: SweepCurrency) => void;
    sweepAmount: string;
    setSweepAmount: (v: string) => void;
    sweepDestination: string;
    setSweepDestination: (v: string) => void;
    isSweeping: boolean;
    error: string | null;
    sweepSuccess: string;
    sweepTxId: string | null;
    sweepLogs: string[];
    logsEndRef: React.RefObject<HTMLDivElement | null>;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}

export const SweepModal: React.FC<SweepModalProps> = ({
    privateBalances, isScanningBalances, onScanBalances,
    sweepCurrency, setSweepCurrency, sweepAmount, setSweepAmount,
    sweepDestination, setSweepDestination,
    isSweeping, error, sweepSuccess, sweepTxId, sweepLogs, logsEndRef,
    onSubmit, onClose,
}) => {
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const currentBalance = privateBalances[sweepCurrency];
    const isAmountTooHigh = sweepAmount !== '' && !isNaN(Number(sweepAmount)) && Number(sweepAmount) > currentBalance && currentBalance >= 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <form onSubmit={onSubmit} className="bg-[#111] border border-blue-500/30 rounded-2xl p-6 w-full max-w-lg shadow-[0_0_30px_rgba(59,130,246,0.15)] my-4">

                {/* Header */}
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-white">Trustless Sweep via DPS</h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] uppercase tracking-wider font-bold">Fast Execution</span>
                </div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    ZK proofs generated via Aleo's Delegated Proving Service. Your private key never leaves the browser.
                </p>

                {/* Private Balance Cards */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Private Balances</span>
                        {!isScanningBalances && privateBalances.ALEO === -1 && (
                            <button type="button" onClick={onScanBalances}
                                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider transition-colors">
                                Scan Balances
                            </button>
                        )}
                        {isScanningBalances && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-full border border-blue-400 border-t-transparent animate-spin" />
                                Scanning...
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {(['ALEO', 'USDCx', 'USAD'] as const).map(token => {
                            const bal = privateBalances[token];
                            const isCurrent = sweepCurrency === token;
                            return (
                                <button key={token} type="button"
                                    onClick={() => { setSweepCurrency(token); if (bal > 0) setSweepAmount(String(bal)); }}
                                    className={`p-3 rounded-xl border transition-all text-left ${isCurrent ? 'border-blue-500/60 bg-blue-500/10' : 'border-white/10 bg-white/3 hover:border-white/20'}`}>
                                    <div className="text-[10px] text-gray-500 font-bold mb-1">{token}</div>
                                    {isScanningBalances
                                        ? <div className="h-4 w-12 bg-white/10 rounded animate-pulse" />
                                        : bal === -1
                                            ? <div className="text-[11px] text-gray-600">—</div>
                                            : bal === 0
                                                ? <div className="text-[11px] text-red-400 font-bold">No private funds</div>
                                                : <div className="text-sm text-white font-bold">{bal.toFixed(6)}</div>
                                    }
                                </button>
                            );
                        })}
                    </div>
                    {privateBalances[sweepCurrency] === 0 && (
                        <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400 text-xs">
                            ⚠️ No private {sweepCurrency} records found. Convert public {sweepCurrency} to private before sweeping.
                        </div>
                    )}
                </div>

                {/* Errors / Success */}
                {error && (
                    <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs text-center">{error}</div>
                )}
                {sweepSuccess && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm text-center font-bold">
                        {sweepSuccess}
                        {sweepTxId && (
                            <a href={`https://testnet.explorer.provable.com/transaction/${sweepTxId}`}
                                target="_blank" rel="noopener noreferrer"
                                className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-500/30 transition-colors">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View on Explorer
                            </a>
                        )}
                    </div>
                )}

                {/* Inputs */}
                <div className="space-y-3 mb-4">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Destination Address</label>
                            <button
                                type="button"
                                onClick={() => setIsEditingAddress(!isEditingAddress)}
                                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                            >
                                {isEditingAddress ? (
                                    <>
                                        <Lock className="w-3 h-3" />
                                        Lock Address
                                    </>
                                ) : (
                                    <>
                                        <Edit2 className="w-3 h-3" />
                                        Edit Address
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="aleo1..."
                                readOnly={!isEditingAddress}
                                value={sweepDestination}
                                onChange={(e) => setSweepDestination(e.target.value)}
                                className={`w-full bg-black border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono text-sm transition-all ${
                                    !isEditingAddress ? 'border-white/10 text-gray-400 cursor-not-allowed' : 'border-white/20'
                                }`}
                            />
                            {!isEditingAddress && (
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-[2]">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Amount</label>
                                {privateBalances[sweepCurrency] > 0 && (
                                    <button type="button"
                                        onClick={() => setSweepAmount(String(privateBalances[sweepCurrency]))}
                                        className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider transition-colors">
                                        Max ({privateBalances[sweepCurrency].toFixed(4)})
                                    </button>
                                )}
                            </div>
                            <input type="number" step="0.000001" placeholder="0.00"
                                value={sweepAmount} onChange={(e) => setSweepAmount(e.target.value)}
                                className={`w-full bg-black border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors ${isAmountTooHigh ? 'border-red-500' : 'border-white/20 focus:border-blue-500'}`}
                            />
                            {isAmountTooHigh && (
                                <p className="text-[10px] text-red-500 mt-1 font-bold">
                                    Amount exceeds private balance of {currentBalance.toFixed(6)} {sweepCurrency}.
                                </p>
                            )}
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block mb-1">Asset</label>
                            <select value={sweepCurrency} onChange={(e) => setSweepCurrency(e.target.value as SweepCurrency)}
                                className="w-full bg-black border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer">
                                <option value="ALEO">ALEO</option>
                                <option value="USDCx">USDCx</option>
                                <option value="USAD">USAD</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Live Log Feed */}
                {sweepLogs.length > 0 && (
                    <div className="mb-4">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Live Progress</div>
                        <div className="bg-black/60 border border-white/10 rounded-xl p-3 h-32 overflow-y-auto font-mono text-[11px] text-gray-400 space-y-0.5">
                            {sweepLogs.map((log, i) => (
                                <div key={i} className={log.includes('✗') ? 'text-red-400' : log.includes('✓') ? 'text-green-400' : ''}>
                                    {log}
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button type="button"
                        onClick={onClose}
                        className="flex-1 py-3 text-gray-400 hover:text-white transition-colors border border-white/10 rounded-xl hover:bg-white/5">
                        {sweepTxId ? 'Done' : 'Cancel'}
                    </button>
                    {!sweepTxId && (
                        <button type="submit"
                            disabled={isSweeping || !sweepAmount || !sweepDestination || privateBalances[sweepCurrency] <= 0 || isAmountTooHigh}
                            className={`flex-[2] py-3 text-white font-bold rounded-xl transition-all flex justify-center items-center gap-2 ${isAmountTooHigh ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 disabled:opacity-50'}`}>
                            {isSweeping ? (
                                <>
                                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                    <span>Sweeping...</span>
                                </>
                            ) : isAmountTooHigh ? 'Insufficient Balance' : 'Execute Sweep'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};
