import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "./GlassCard";

interface ButtonProps extends HTMLMotionProps<"button"> {
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
    glow?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", glow = true, children, ...props }, ref) => {
        const variants = {
            primary: "bg-gradient-to-r from-neon-primary to-neon-accent text-black font-bold border-none hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]",
            secondary: "bg-white/10 text-white border border-white/10 hover:bg-white/20 hover:border-white/20",
            outline: "bg-transparent border border-neon-primary/50 text-neon-primary hover:bg-neon-primary/10",
            ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5",
        };

        const sizes = {
            sm: "px-4 py-2 text-sm",
            md: "px-6 py-3 text-base",
            lg: "px-8 py-4 text-lg",
        };

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    "relative rounded-xl transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden",
                    variants[variant],
                    sizes[size],
                    glow && variant === 'primary' && "animate-glow",
                    className
                )}
                {...props}
            >
                <span className="relative z-10 flex items-center gap-2">{children as React.ReactNode}</span>

                {/* Hover Shine for Primary */}
                {variant === 'primary' && (
                    <div className="absolute inset-0 -translate-x-full hover:animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
                )}
            </motion.button>
        );
    }
);

Button.displayName = "Button";

export { Button };
