import React from 'react';
import GlassCard from '../../shared/components/GlassCard';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Input } from '../../shared/components/ui/Input';
import { Button } from '../../shared/components/ui/Button';
import type { InvoiceType } from '../../shared/hooks/useCreateInvoice';
import type { InvoiceItem } from '../../shared/types/invoice';

interface InvoiceFormProps {
    amount: number | '';
    setAmount: (val: number | '') => void;
    memo: string;
    setMemo: (val: string) => void;
    handleCreate: () => void;
    loading: boolean;
    publicKey: string | null;
    status: string;
    invoiceType: InvoiceType;
    setInvoiceType: (val: InvoiceType) => void;
    tokenType: number;
    setTokenType: (val: number) => void;
    walletType: number;
    setWalletType: (val: number) => void;
    hasBurnerWallet: boolean;
    items: InvoiceItem[];
    showItems: boolean;
    setShowItems: (val: boolean) => void;
    addItem: () => void;
    updateItem: (index: number, field: keyof InvoiceItem, value: string | number) => void;
    removeItem: (index: number) => void;
}

export const MobileInvoiceForm: React.FC<InvoiceFormProps> = ({
    amount,
    setAmount,
    memo,
    setMemo,
    handleCreate,
    loading,
    publicKey,
    status,
    invoiceType,
    setInvoiceType,
    tokenType,
    setTokenType,
    walletType,
    setWalletType,
    hasBurnerWallet,
    items,
    showItems,
    setShowItems,
    addItem,
    updateItem,
    removeItem
}) => {
    return (
        <GlassCard variant="heavy" className="p-5">
            <h2 className="text-2xl font-bold text-white mb-6">Invoice Details</h2>

            <div className="space-y-6">

                {/* INVOICE TYPE TOGGLE */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Type</label>
                    <div className="p-1 bg-black/20 rounded-xl flex gap-1 border border-white/5">
                        <button
                            onClick={() => {
                                setInvoiceType('standard');
                                if (tokenType === 3) setTokenType(0);
                            }}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${invoiceType === 'standard'
                                ? 'bg-neon-primary text-black shadow-lg shadow-neon-primary/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Standard
                        </button>
                        <button
                            onClick={() => {
                                setInvoiceType('multipay');
                                if (tokenType === 3) setTokenType(0);
                            }}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${invoiceType === 'multipay'
                                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Multi Pay
                        </button>
                        <button
                            onClick={() => setInvoiceType('donation')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${invoiceType === 'donation'
                                ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Donation
                        </button>
                    </div>
                </div>

                {/* WALLET TYPE TOGGLE */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Receiving Wallet</label>
                    <div className="p-1 bg-black/20 rounded-xl flex gap-1 border border-white/5 mb-2">
                        <button
                            onClick={() => setWalletType(0)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${walletType === 0
                                ? 'bg-white text-black shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Main
                        </button>
                        <button
                            onClick={() => hasBurnerWallet ? setWalletType(1) : null}
                            disabled={!hasBurnerWallet}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${walletType === 1
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : !hasBurnerWallet
                                    ? 'text-gray-600 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            🔒 Burner
                        </button>
                    </div>
                    {walletType === 1 && (
                        <div className="text-xs text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 text-center mb-2">
                            🛡️ Enhanced Privacy Mode
                        </div>
                    )}
                    {!hasBurnerWallet && (
                        <div className="text-xs text-gray-500 text-center mb-2">
                            Create a Burner Wallet from your Dashboard.
                        </div>
                    )}
                </div>

                {/* CURRENCY TOGGLE */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Currency</label>
                    <div className="p-1 bg-black/20 rounded-xl flex gap-1 border border-white/5 mb-4">
                        <button
                            onClick={() => setTokenType(0)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${tokenType === 0
                                ? 'bg-white text-black shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Credits
                        </button>
                        <button
                            onClick={() => setTokenType(1)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${tokenType === 1
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            USDCx
                        </button>
                        <button
                            onClick={() => setTokenType(2)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${tokenType === 2
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            USAD
                        </button>
                        {invoiceType === 'donation' && (
                            <button
                                onClick={() => setTokenType(3)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${tokenType === 3
                                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                ANY
                            </button>
                        )}
                    </div>
                </div>

                <div className="text-xs text-gray-400 text-center -mt-4 mb-4">
                    {invoiceType === 'standard' && 'Single payment only. Invoice closes after payment.'}
                    {invoiceType === 'multipay' && 'Allows multiple payments. Ideal for campaigns.'}
                    {invoiceType === 'donation' && (
                        <span>
                            <strong className="text-pink-400 block mb-1">Donation Mode</strong>
                            Open-ended payments. Payer decides the amount.
                        </span>
                    )}
                </div>

                {invoiceType !== 'donation' && (
                    <Input
                        label={`Amount (${tokenType === 0 ? 'Credits' : tokenType === 1 ? 'USDCx' : 'USAD'})`}
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                )}

                {/* LINE ITEMS TOGGLE — Standard only */}
                {invoiceType === 'standard' && (
                    <div>
                        <label
                            className="flex items-center gap-3 cursor-pointer select-none group"
                            onClick={() => {
                                if (!showItems) addItem();
                                setShowItems(!showItems);
                            }}
                        >
                            <div className={`w-10 h-5 rounded-full relative transition-all duration-300 ${
                                showItems
                                    ? 'bg-neon-primary/30 border-neon-primary/50'
                                    : 'bg-white/10 border-white/10'
                            } border`}>
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${
                                    showItems
                                        ? 'left-[22px] bg-neon-primary shadow-[0_0_8px_rgba(0,243,255,0.5)]'
                                        : 'left-0.5 bg-gray-500'
                                }`} />
                            </div>
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Add Line Items</span>
                        </label>
                    </div>
                )}

                {/* LINE ITEMS — Mobile Card Layout */}
                {invoiceType === 'standard' && showItems && (
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="bg-black/30 rounded-xl border border-white/5 p-3 space-y-2 relative">
                                <button
                                    onClick={() => removeItem(index)}
                                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                                <input
                                    type="text"
                                    placeholder="Item name"
                                    value={item.name}
                                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                                    className="bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none w-full pr-8"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <span className="text-[10px] text-gray-500 uppercase block mb-1">Qty</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity || ''}
                                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                            className="bg-white/5 rounded-lg text-sm text-white text-center py-1.5 focus:outline-none focus:ring-1 focus:ring-neon-primary/30 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-500 uppercase block mb-1">Price</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unitPrice || ''}
                                            onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                                            className="bg-white/5 rounded-lg text-sm text-white text-center py-1.5 focus:outline-none focus:ring-1 focus:ring-neon-primary/30 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-500 uppercase block mb-1">Total</span>
                                        <div className="text-sm text-neon-primary font-mono text-center py-1.5">
                                            {item.total > 0 ? item.total.toFixed(2) : '—'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addItem}
                            className="w-full py-3 text-sm text-gray-400 hover:text-neon-primary transition-all flex items-center justify-center gap-2 bg-black/20 rounded-xl border border-dashed border-white/10 hover:border-neon-primary/30"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Item
                        </button>

                        {items.length > 0 && items.some(i => i.total > 0) && (
                            <div className="flex justify-between items-center px-3 py-2 bg-neon-primary/5 rounded-lg border border-neon-primary/20">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total</span>
                                <span className="text-lg font-bold text-neon-primary font-mono">
                                    {items.reduce((sum, i) => sum + i.total, 0).toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <Input
                    label="Memo (Optional)"
                    type="text"
                    placeholder={invoiceType === 'donation' ? "e.g., Save the Whales Campaign" : "e.g., Dinner Bill"}
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                />

                <div className="w-full mt-4">
                    {!publicKey ? (
                        <div className="wallet-adapter-wrapper w-full [&>button]:!w-full [&>button]:!justify-center [&>button]:!h-12 [&>button]:!rounded-xl [&>button]:!font-bold [&>button]:!bg-white [&>button]:!text-black hover:[&>button]:!bg-gray-200 [&>button]:!transition-colors">
                            <WalletMultiButton className="!w-full !justify-center" />
                        </div>
                    ) : (
                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={handleCreate}
                            disabled={loading}
                            glow={!loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </span>
                            ) : (
                                invoiceType === 'standard' ? 'Generate Null Invoice Link' :
                                    invoiceType === 'multipay' ? 'Create Multi Pay Link' :
                                        'Create Donation Link'
                            )}
                        </Button>
                    )}
                </div>

                {status && (
                    <div className={`p-4 rounded-xl text-center text-sm font-medium border ${status.includes('Error')
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-neon-primary/10 border-neon-primary/20 text-neon-primary'
                        }`}>
                        {status}
                    </div>
                )}
            </div>
        </GlassCard>
    );
};
