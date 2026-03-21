/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Base
                background: '#000000', // Pure black
                foreground: '#ffffff',

                // The "Void" - Deep darks
                'void-main': '#000000', // Pure black
                'void-lighter': '#0a0a0a', // Almost black

                // Monochrome Accents (formerly Neon)
                'neon-primary': '#ffffff', // White (Primary Action/Highlight)
                'neon-secondary': '#a3a3a3', // Neutral 400 (Secondary)
                'neon-accent': '#525252', // Neutral 600 (Tertiary/Depth)

                // Glass States
                'glass-border': 'rgba(255, 255, 255, 0.15)',
                'glass-border-hover': 'rgba(255, 255, 255, 0.3)',
                'glass-surface': 'rgba(10, 10, 10, 0.6)',
                'glass-highlight': 'rgba(255, 255, 255, 0.1)',

                // Status - Minimalist/Monochrome
                success: '#ffffff', // Use white + icons for success
                error: '#ffffff',   // Use white + icons for error (or very subtle red if needed, but sticking to mono)
                warning: '#ffffff',
            },
            fontFamily: {
                sans: ['Space Grotesk', 'sans-serif'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'glass-gradient': 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
                'glass-gradient-hover': 'linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'float-delayed': 'float 6s ease-in-out 3s infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shimmer': 'shimmer 2.5s linear infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                shimmer: {
                    '100%': { transform: 'translateX(100%)' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(255, 255, 255, 0.1), 0 0 10px rgba(255, 255, 255, 0.05)' },
                    '100%': { boxShadow: '0 0 20px rgba(255, 255, 255, 0.4), 0 0 40px rgba(255, 255, 255, 0.2)' },
                }
            },
            boxShadow: {
                'neon': '0 0 5px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.3)', // White glow
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
                'glass-hover': '0 8px 32px 0 rgba(0, 0, 0, 0.7)',
            }
        },
    },
    plugins: [],
}
