import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    variant?: "heavy" | "default" | "light";
    hoverEffect?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ children, className, variant = "default", hoverEffect = true, ...props }, ref) => {
        const variants = {
            default: "bg-glass-surface backdrop-blur-xl border border-glass-border shadow-glass hover:shadow-[0_0_30px_rgba(0,243,255,0.1)]",
            heavy: "bg-[#02040a]/80 backdrop-blur-2xl border border-glass-border shadow-2xl",
            light: "bg-glass-surface backdrop-blur-lg border border-glass-border shadow-lg",
        };

        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={cn(
                    "rounded-3xl relative overflow-hidden group",
                    variants[variant],
                    hoverEffect && "hover:border-glass-border-hover transition-colors duration-300",
                    className
                )}
                {...props}
            >
                {/* Shine Effect */}
                {hoverEffect && (
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
                )}

                {/* Content */}
                <div className="relative z-10">{children}</div>
            </motion.div>
        );
    }
);

GlassCard.displayName = "GlassCard";

export { GlassCard, cn };
