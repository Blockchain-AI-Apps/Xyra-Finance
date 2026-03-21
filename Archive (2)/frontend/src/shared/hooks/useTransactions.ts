import { useState, useCallback } from 'react';
import { Invoice, fetchInvoicesByMerchant, fetchRecentTransactions } from '../services/api';

export const useTransactions = (merchantAddress?: string) => {
    const [transactions, setTransactions] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = useCallback(async (limit: number = 20) => {
        setLoading(true);
        setError(null);
        try {
            let data: Invoice[];
            if (merchantAddress) {
                data = await fetchInvoicesByMerchant(merchantAddress);
            } else {
                data = await fetchRecentTransactions(limit);
            }
            setTransactions(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to fetch transactions');
        } finally {
            setLoading(false);
        }
    }, [merchantAddress]);

    return {
        transactions,
        loading,
        error,
        fetchTransactions
    };
};
