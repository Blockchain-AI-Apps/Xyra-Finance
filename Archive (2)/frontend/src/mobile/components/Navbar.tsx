import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { motion } from 'framer-motion';
import { cn } from '../../shared/utils/cn';

const MobileNavbar = () => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;
    const navItems = [
        { path: '/create', label: 'Create' },
        { path: '/pay', label: 'Pay' },
        { path: '/profile', label: 'Dashboard' },
        { path: '/profile-qr', label: 'QR' },
    ];

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50 h-20 flex items-center justify-center px-4 pointer-events-none"
        >
            <div className="w-full max-w-7xl flex items-center justify-between pointer-events-auto">
                <Link to="/" className="group flex items-center gap-2 no-underline">
                    <div className="relative w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                        <div className="w-3 h-3 border-2 border-black rotate-45" />
                    </div>
                    <span className="text-lg font-bold text-white tracking-tight">
                        NullPay
                    </span>
                </Link>

                <div className="transform scale-90 origin-right">
                    <WalletMultiButton className="!bg-black/50 !backdrop-blur-lg !border !border-white/10 !rounded-full !py-2 !px-4 !h-auto !font-sans !font-semibold !text-xs !text-white" />
                </div>
            </div>

            {/* Mobile Bottom Nav */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
                <div className="flex bg-black/60 backdrop-blur-xl border border-white/10 rounded-full p-1 items-center gap-1 shadow-2xl shadow-neon-primary/10">
                    {navItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "relative px-5 py-3 rounded-full text-xs font-medium transition-colors duration-300 flex flex-col items-center gap-1",
                                    active ? "text-neon-primary" : "text-gray-400 hover:text-white"
                                )}
                            >
                                {active && (
                                    <motion.span
                                        layoutId="mobile-nav-indicator"
                                        className="absolute inset-0 rounded-full bg-neon-primary/10 border border-neon-primary/20 shadow-[0_0_15px_rgba(0,243,255,0.2)]"
                                    />
                                )}
                                <span className="relative z-10 font-bold tracking-wide">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </motion.nav>
    );
};

export default MobileNavbar;
