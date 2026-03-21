import React, { useRef, useEffect } from 'react';

export const LinkButton = ({ url, urlNoMemo }: { url: string, urlNoMemo?: string }) => {
    const [copied, setCopied] = React.useState(false);
    const [showDropdown, setShowDropdown] = React.useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCopy = (e: React.MouseEvent, textToCopy: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setShowDropdown(false);
        setTimeout(() => setCopied(false), 2000);
    };

    if (urlNoMemo) {
        return (
            <div className="relative" ref={dropdownRef}>
                <div className="flex items-center bg-neon-primary/10 rounded border border-neon-primary/20 hover:border-neon-primary/50 transition-all">
                    <button
                        onClick={(e) => handleCopy(e, url)}
                        className="px-3 py-1.5 text-xs text-neon-primary font-medium flex items-center gap-1.5 hover:bg-neon-primary/10 rounded-l transition-colors border-r border-neon-primary/20"
                    >
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
                        className="px-1.5 py-1.5 hover:bg-neon-primary/10 rounded-r text-neon-primary transition-colors"
                    >
                        <svg className={`w-3.5 h-3.5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                {showDropdown && (
                    <div className="absolute right-0 mt-1 w-40 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
                        <button
                            onClick={(e) => handleCopy(e, url)}
                            className="text-left px-4 py-2 text-xs text-white hover:bg-white/10 transition-colors border-b border-white/5"
                        >
                            Copy with Memo
                        </button>
                        <button
                            onClick={(e) => handleCopy(e, urlNoMemo)}
                            className="text-left px-4 py-2 text-xs text-white hover:bg-white/10 transition-colors"
                        >
                            Copy without Memo
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            onClick={(e) => handleCopy(e, url)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors font-medium group/btn ${copied
                ? "bg-green-500/10 border-green-500/20 text-green-500"
                : "bg-neon-primary/10 hover:bg-neon-primary/20 border-neon-primary/20 hover:border-neon-primary/50 text-neon-primary"
                }`}
        >
            {copied ? (
                <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                </>
            ) : (
                <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Link
                </>
            )}
        </button>
    );
};
