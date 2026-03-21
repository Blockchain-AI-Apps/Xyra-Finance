import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface GenerateModalProps {
    error: string | null;
    isGenerating: boolean;
    password: string;
    setPassword: (v: string) => void;
    showPassword: boolean;
    setShowPassword: (v: boolean) => void;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}

export const GenerateModal: React.FC<GenerateModalProps> = ({
    error, isGenerating, password, setPassword, showPassword, setShowPassword, onSubmit, onClose,
}) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <form onSubmit={onSubmit} className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-2">Secure Burner Wallet</h3>
            <p className="text-sm text-gray-400 mb-6">Create a password to encrypt your private key. NullPay cannot recover this password.</p>

            {error && (
                <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs text-center">{error}</div>
            )}

            <div className="relative mb-6">
                <input
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    placeholder="Encryption Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-primary pr-12"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            </div>

            <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={isGenerating || password.length < 6}
                    className="flex-1 py-3 bg-neon-primary text-black font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {isGenerating ? 'Securing...' : 'Generate'}
                </button>
            </div>
        </form>
    </div>
);
