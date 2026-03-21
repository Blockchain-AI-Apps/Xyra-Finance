import React from 'react';
import { GlassCard } from '../../../../components/ui/GlassCard';
import { useBurnerActions } from './useBurnerActions';
import { GenerateModal } from './GenerateModal';
import { UnlockModal } from './UnlockModal';
import { BackupModal } from './BackupModal';
import { SweepModal } from './SweepModal';
import type { BurnerWalletSettingsProps } from './types';

export const BurnerWalletSettings: React.FC<BurnerWalletSettingsProps> = ({ itemVariants }) => {
    const a = useBurnerActions();

    if (!a.address) return null;

    return (
        <>
            {/* ── Main Card ── */}
            <GlassCard variants={itemVariants} className="p-5 mb-8 border border-neon-primary/20 bg-neon-primary/5">
                <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-neon-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Privacy Burner Wallet
                </h2>
                <p className="text-gray-500 text-xs mb-4">
                    Receive payments privately via an ephemeral wallet. Your private key is encrypted client-side with your password.
                </p>

                {a.error && (
                    <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs text-center">{a.error}</div>
                )}

                {!a.burnerAddress ? (
                    <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/20 rounded-xl bg-black/20 text-center">
                        <h3 className="text-sm font-semibold text-white mb-1">No Burner Wallet Found</h3>
                        <p className="text-xs text-gray-400 mb-4 max-w-sm">
                            Generate one to enable enhanced privacy. Your key will be secured with a password only you know.
                        </p>
                        <button
                            onClick={() => { a.setError(null); a.setPassword(''); a.setShowGenerateModal(true); }}
                            className="px-5 py-1.5 bg-gradient-to-r from-neon-primary to-neon-accent hover:opacity-90 text-black font-bold rounded-lg transition-all text-sm">
                            Generate Burner Wallet
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Address + lock badge */}
                        <div className="flex flex-col md:flex-row gap-3 items-center justify-between p-3 bg-black/40 rounded-xl border border-white/10">
                            <div className="flex-1 overflow-hidden">
                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">Burner Address</label>
                                <div className="text-xs text-white font-mono truncate" title={a.burnerAddress}>{a.burnerAddress}</div>
                            </div>
                            <div className="shrink-0">
                                {a.decryptedBurnerKey ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold border border-green-500/20">
                                        <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />Unlocked
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-bold border border-orange-500/20">
                                        <div className="w-1 h-1 rounded-full bg-orange-500" />Locked
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Locked state */}
                        {!a.decryptedBurnerKey ? (
                            <div className="p-3 border border-orange-500/20 bg-orange-500/5 rounded-xl flex items-center justify-between gap-3">
                                <p className="text-xs text-orange-200/80">Unlock with your password to view the private key.</p>
                                <button onClick={() => { a.setError(null); a.setPassword(''); a.setShowUnlockModal(true); }}
                                    className="px-4 py-1.5 shrink-0 bg-transparent border border-orange-500/50 hover:bg-orange-500/10 text-orange-400 font-bold rounded-lg transition-all text-xs">
                                    Unlock Key
                                </button>
                            </div>
                        ) : (
                            <div className="p-3 border border-neon-primary/20 bg-neon-primary/5 rounded-xl flex flex-col gap-3">
                                {a.fetchedFromChain && (
                                    <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                        <span className="text-blue-400 text-[11px] font-bold">Password and Private Key securely fetched from on-chain records.</span>
                                    </div>
                                )}
                                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                                    <p className="text-xs text-gray-400">
                                        Copy your burner private key and import it into <strong className="text-white">Shield Wallet</strong>.
                                    </p>
                                    <div className="flex gap-2 shrink-0">
                                        {!(a.fetchedFromChain || a.hasOnChainRecord) && (
                                            <button onClick={() => { a.setError(null); a.setPassword(''); a.setShowBackupModal(true); }}
                                                className="px-4 py-1.5 bg-transparent border border-white/20 hover:bg-white/5 text-white font-bold rounded-lg transition-all text-xs">
                                                Backup as Record (Optional)
                                            </button>
                                        )}
                                        <button onClick={a.openSweepModal}
                                            className="px-4 py-1.5 bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30 text-blue-400 font-bold rounded-lg transition-all text-xs shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:scale-105">
                                            Sweep Funds
                                        </button>
                                        <button onClick={a.handleCopyKey}
                                            className="px-4 py-1.5 bg-neon-primary hover:bg-neon-accent text-black font-bold rounded-lg transition-all text-xs shadow-[0_0_10px_rgba(34,197,94,0.2)] hover:scale-105">
                                            {a.copied ? '✓ Copied!' : 'Copy Private Key'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </GlassCard>

            {/* ── Modals ── */}
            {a.showGenerateModal && (
                <GenerateModal
                    error={a.error} isGenerating={a.isGenerating}
                    password={a.password} setPassword={a.setPassword}
                    showPassword={a.showPassword} setShowPassword={a.setShowPassword}
                    onSubmit={a.handleGenerateBurner}
                    onClose={() => a.setShowGenerateModal(false)}
                />
            )}
            {a.showUnlockModal && (
                <UnlockModal
                    error={a.error} isDecrypting={a.isDecrypting}
                    password={a.password} setPassword={a.setPassword}
                    showPassword={a.showPassword} setShowPassword={a.setShowPassword}
                    onSubmit={a.handleUnlockBurner}
                    onClose={() => a.setShowUnlockModal(false)}
                />
            )}
            {a.showBackupModal && (
                <BackupModal
                    error={a.error} isBackingUp={a.isBackingUp}
                    password={a.password} setPassword={a.setPassword}
                    showPassword={a.showPassword} setShowPassword={a.setShowPassword}
                    onSubmit={a.handleBackupRecord}
                    onClose={() => a.setShowBackupModal(false)}
                />
            )}
            {a.showSweepModal && (
                <SweepModal
                    privateBalances={a.privateBalances}
                    isScanningBalances={a.isScanningBalances}
                    onScanBalances={a.fetchPrivateBalances}
                    sweepCurrency={a.sweepCurrency} setSweepCurrency={a.setSweepCurrency}
                    sweepAmount={a.sweepAmount} setSweepAmount={a.setSweepAmount}
                    sweepDestination={a.sweepDestination} setSweepDestination={a.setSweepDestination}
                    isSweeping={a.isSweeping}
                    error={a.error}
                    sweepSuccess={a.sweepSuccess} sweepTxId={a.sweepTxId}
                    sweepLogs={a.sweepLogs} logsEndRef={a.logsEndRef}
                    onSubmit={a.handleSweepFunds}
                    onClose={() => { a.setShowSweepModal(false); a.setSweepLogs([]); a.setSweepTxId(null); a.setSweepSuccess(''); }}
                />
            )}
        </>
    );
};
