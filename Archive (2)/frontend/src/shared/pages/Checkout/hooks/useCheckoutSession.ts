import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CheckoutSession } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const useCheckoutSession = (sessionId: string | undefined) => {
    const [session, setSession] = useState<CheckoutSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionId) {
            setError("Invalid checkout URL.");
            setLoading(false);
            return;
        }

        const fetchSession = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
                const response = await fetch(`${API_URL}/checkout/sessions/${sessionId}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("Checkout session not found or expired.");
                    }
                    throw new Error("Failed to load checkout details.");
                }

                const data = await response.json();
                setSession(data);
            } catch (err: any) {
                setError(err.message || 'An unexpected error occurred.');
            } finally {
                setLoading(false);
            }
        };

        fetchSession();
    }, [sessionId]);

    // Real-Time Supabase Listener
    useEffect(() => {
        if (!sessionId || !session || !supabaseUrl || !supabaseKey) return;
        if (session.status === 'SETTLED' || session.status === 'FAILED') return;

        const supabase = createClient(supabaseUrl, supabaseKey);

        const channel = supabase.channel(`checkout_session_${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'payment_intents',
                    filter: `id=eq.${sessionId}`
                },
                (payload) => {
                    const newStatus = payload.new.status;
                    if (newStatus !== session.status) {
                        console.log(`📡 [Real-Time] Checkout Session status updated: ${newStatus}`);
                        setSession(prev => prev ? { ...prev, status: newStatus as any } : prev);

                        // If it settled, handle the automatic redirect
                        const redirectUrl = payload.new.success_url || session.success_url;
                        if (newStatus === 'SETTLED' && redirectUrl) {
                            console.log(`[useCheckoutSession] Scheduling redirect to: ${redirectUrl} in 3 seconds...`);
                            setTimeout(() => {
                                try {
                                    const url = new URL(redirectUrl as string);
                                    url.searchParams.set('session_id', sessionId);
                                    window.location.href = url.toString();
                                } catch (e) {
                                    window.location.href = redirectUrl as string + `?session_id=${sessionId}`;
                                }
                            }, 3000);
                        }
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Connected to Checkout real-time monitor');
                }
            });

        return () => {
            channel.unsubscribe();
        };
    }, [sessionId, session?.status, supabaseUrl]);

    return { session, loading, error };
};
