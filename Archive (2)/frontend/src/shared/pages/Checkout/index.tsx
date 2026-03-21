import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCheckoutSession } from './hooks/useCheckoutSession';
import { useCheckoutPayment } from './hooks/useCheckoutPayment';
import { CheckoutUI } from './components/CheckoutUI';
import { usePaymentMonitor } from '../../hooks/usePaymentMonitor';

export const CheckoutPage = () => {
    const { id } = useParams<{ id: string }>();
    const { session, loading, error: sessionError } = useCheckoutSession(id);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [customConvertAmount, setCustomConvertAmount] = useState<string>('');
    const {
        pay,
        status: paymentStatus,
        txId,
        loading: paymentLoading,
        error: paymentError,
        success,
        step,
        publicKey,
        convertPublicToPrivate
    } = useCheckoutPayment(session);

    // Call payment monitor. If the session isn't processing anymore, we have a real hash
    usePaymentMonitor();

    const handlePay = () => {
        if (step === 'CONVERT') {
            setShowConvertModal(true);
        } else {
            pay();
        }
    };

    const confirmConversion = async () => {
        setShowConvertModal(false);
        const amountToConvert = customConvertAmount ? Number(customConvertAmount) : undefined;
        await convertPublicToPrivate(amountToConvert);
    };

    const currencyLabel = session?.token_type || 'Tokens';

    // Real-time redirection is natively handled inside useCheckoutSession

    return (
        <>
            <CheckoutUI
                session={session}
                loading={loading}
                error={sessionError || paymentError}
                publicKey={publicKey}
                paymentStatus={paymentStatus}
                paymentLoading={paymentLoading}
                txId={txId}
                success={success}
                onPay={handlePay}
            />

            {/* CONVERSION MODAL */}
            <AnimatePresence>
                {showConvertModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowConvertModal(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-md"
                        >
                            <div className="p-8 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl flex flex-col gap-8 relative overflow-hidden">
                                {/* Close Button */}
                                <button
                                    onClick={() => setShowConvertModal(false)}
                                    className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors z-10"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>

                                <div className="text-center pt-2 relative z-10">
                                    <div className={`w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5 shadow-[0_0_15px_rgba(255,255,255,0.1)]`}>
                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-semibold text-white mb-2 tracking-tight">Convert to Private</h3>
                                    <p className="text-sm text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                                        Specify how many public <span className="text-white font-medium">{currencyLabel}</span> you want to convert into private records for this checkout.
                                    </p>
                                </div>

                                <div className="space-y-3 bg-[#111] p-5 rounded-2xl border border-white/5 relative z-10 focus-within:border-white/20 transition-colors">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block text-center">Amount to Convert</label>
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="number"
                                            placeholder={`Default needed: ${session?.amount || '0'}`}
                                            value={customConvertAmount}
                                            onChange={(e) => setCustomConvertAmount(e.target.value)}
                                            className="w-full bg-transparent text-center text-3xl font-medium text-white placeholder:text-white/20 focus:outline-none focus:ring-0 border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-500 text-center mt-2">
                                        Leave blank to convert exactly the required amount.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 relative z-10">
                                    <button className="w-full bg-white text-black font-semibold text-sm py-4 h-14 rounded-xl hover:bg-gray-200 transition-colors" onClick={confirmConversion}>
                                        Confirm Conversion
                                    </button>
                                    <button className="text-xs text-gray-500 hover:text-white transition-colors font-medium py-3 uppercase tracking-widest" onClick={() => setShowConvertModal(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default CheckoutPage;
