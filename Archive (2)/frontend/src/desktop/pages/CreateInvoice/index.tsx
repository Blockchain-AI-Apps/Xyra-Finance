import React from 'react';
import { motion } from 'framer-motion';
import { pageVariants } from '../../../shared/utils/animations';
import { useCreateInvoice } from '../../../shared/hooks/useCreateInvoice';
import { InvoiceForm } from '../../../shared/components/invoice/InvoiceForm';
import { InvoiceCard } from '../../../shared/components/invoice/InvoiceCard';
import { USDCxInfo } from '../../components/USDCxInfo';
import { useBurnerWallet } from '../../../shared/hooks/BurnerWalletProvider';

export const CreateInvoice: React.FC = () => {
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
        <motion.div
            className="page-container relative min-h-screen"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-white/5 rounded-full blur-[120px] animate-pulse-slow" />
            </div>

            {/* ALEO GLOBE BACKGROUND */}
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
            <div className="w-full max-w-7xl mx-auto pt-12 px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center text-center mb-8"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter leading-tight text-white">
                        Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Null Invoice</span>
                    </h1>
                    <p className="text-gray-300 text-xl leading-relaxed max-w-2xl mb-2">
                        Generate a privacy-preserving Null Invoice link to receive payments securely on the Aleo network.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-1 gap-12 items-start max-w-2xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="w-full"
                    >
                        {!invoiceData ? (
                            <InvoiceForm
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

            <USDCxInfo />
        </motion.div>
    );
};

export default CreateInvoice;
