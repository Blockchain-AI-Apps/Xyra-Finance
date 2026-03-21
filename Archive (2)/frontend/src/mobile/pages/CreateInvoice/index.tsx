import React from 'react';
import { motion } from 'framer-motion';
import { useCreateInvoice } from '../../../shared/hooks/useCreateInvoice';
import { MobileInvoiceForm } from '../../components/InvoiceForm';
import { InvoiceCard } from '../../../shared/components/invoice/InvoiceCard';
import { useBurnerWallet } from '../../../shared/hooks/BurnerWalletProvider';

const MobileCreateInvoice: React.FC = () => {
    const {
        amount, setAmount,
        memo, setMemo,
        status, loading,
        invoiceData,
        handleCreate,
        resetInvoice,
        publicKey,
        invoiceType,
        setInvoiceType,
        tokenType,
        setTokenType,
        walletType,
        setWalletType,
        items,
        showItems,
        setShowItems,
        addItem,
        updateItem,
        removeItem
    } = useCreateInvoice();

    const { burnerAddress } = useBurnerWallet();
    const hasBurnerWallet = !!burnerAddress;

    return (
        <div className="page-container relative min-h-screen pt-0 px-4">
            <div className="w-full max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center text-center mb-8"
                >
                    <h1 className="text-3xl font-bold mb-4 tracking-tighter leading-none text-white">
                        Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-primary to-neon-accent">Null Invoice</span>
                    </h1>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-2">
                        Generate a privacy-preserving invoice link.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 gap-12 items-start">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="w-full"
                    >
                        {!invoiceData ? (
                            <MobileInvoiceForm
                                amount={amount}
                                setAmount={setAmount}
                                memo={memo}
                                setMemo={setMemo}
                                handleCreate={handleCreate}
                                loading={loading}
                                publicKey={publicKey}
                                status={status}
                                invoiceType={invoiceType}
                                setInvoiceType={setInvoiceType}
                                tokenType={tokenType}
                                setTokenType={setTokenType}
                                walletType={walletType}
                                setWalletType={setWalletType}
                                hasBurnerWallet={hasBurnerWallet}
                                items={items}
                                showItems={showItems}
                                setShowItems={setShowItems}
                                addItem={addItem}
                                updateItem={updateItem}
                                removeItem={removeItem}
                            />
                        ) : (
                            <InvoiceCard
                                invoiceData={invoiceData}
                                resetInvoice={resetInvoice}
                                memo={memo}
                            />
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default MobileCreateInvoice;
