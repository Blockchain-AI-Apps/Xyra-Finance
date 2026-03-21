import React from "react";
import { cn } from "./GlassCard";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, ...props }, ref) => {
        return (
            <div className="w-full space-y-2">
                {label && (
                    <label className="text-sm font-medium text-gray-300 uppercase tracking-wider ml-1">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    <input
                        type={type}
                        className={cn(
                            "flex h-14 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 text-gray-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300",
                            "hover:border-white/20 hover:bg-black/30",
                            error && "border-red-500 focus-visible:ring-red-500",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                    {/* Bottom Glow Line */}
                    <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-neon-primary/0 to-transparent group-focus-within:via-neon-primary/50 transition-all duration-500" />
                </div>
                {error && <p className="text-sm text-red-500 ml-1">{error}</p>}
            </div>
        );
    }
);

Input.displayName = "Input";

export { Input };
