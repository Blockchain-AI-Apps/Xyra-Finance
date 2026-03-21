import { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../utils/cn';

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'heavy' | 'light';
    glow?: boolean;
}

const GlassCard = ({ children, className = '', variant = 'default', glow = false, ...props }: GlassCardProps) => {
    const variants = {
        default: "bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl",
        heavy: "bg-zinc-900/60 backdrop-blur-2xl border border-white/5 shadow-2xl",
        light: "bg-white/5 backdrop-blur-lg border border-white/20 shadow-lg"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
                "glass-card rounded-2xl p-6 transition-all duration-300",
                variants[variant],
                glow && "shadow-[0_0_20px_rgba(0,243,255,0.15)] border-neon-primary/30",
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export default GlassCard;
