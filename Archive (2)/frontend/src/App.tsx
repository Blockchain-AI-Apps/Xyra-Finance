import { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { usePaymentMonitor } from './shared/hooks/usePaymentMonitor';
import './index.css';

const MobileApp = lazy(() => import('./mobile/MobileApp').then(module => ({ default: module.MobileApp })));
const DesktopApp = lazy(() => import('./desktop/DesktopApp'));

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
};

function App() {
    usePaymentMonitor();
    const isMobile = useIsMobile();
    return (
        <Router>
            <Toaster />
            <Suspense fallback={
                <div className="min-h-screen bg-black flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            }>
                {isMobile ? <MobileApp /> : <DesktopApp />}
            </Suspense>
        </Router>
    );
}

export default App;
