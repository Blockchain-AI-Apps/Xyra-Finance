import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import CreateInvoice from './pages/CreateInvoice';
import PaymentPage from './pages/Payment';
import Profile from '../shared/pages/Profile';
import CheckoutPage from '../shared/pages/Checkout';
import InvoiceDetails from '../shared/pages/InvoiceDetails';

const MobileAnimatedRoutes = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Navigate to="/create" replace />} />
                <Route path="/create" element={<CreateInvoice />} />
                <Route path="/pay" element={<PaymentPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/checkout/:id" element={<CheckoutPage />} />
                <Route path="/invoice/:hash" element={<InvoiceDetails />} />
                <Route path="*" element={<Navigate to="/create" replace />} />
            </Routes>
        </AnimatePresence>
    );
};

export const MobileApp = () => {
    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
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

            <Navbar />

            <main className="relative z-10 pt-24 px-4 pb-32 md:pb-12">
                <MobileAnimatedRoutes />
            </main>
        </div>
    );
};
