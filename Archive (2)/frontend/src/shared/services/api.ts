const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Invoice {
    invoice_hash: string;
    merchant_address: string;
    designated_address?: string; // The address used for this specific invoice
    is_burner?: boolean;         // True if the designated address is a burner wallet
    payer_address?: string;
    amount: number;
    memo?: string;
    status: 'PENDING' | 'SETTLED';
    block_height?: number;
    block_settled?: number;
    invoice_transaction_id?: string;
    payment_tx_ids?: string[];
    payment_tx_id?: string;
    created_at?: string;
    updated_at?: string;
    salt?: string;
    invoice_type?: number;
    token_type?: number;
    invoice_items?: { name: string; quantity: number; unitPrice: number; total: number }[];
}

export const fetchInvoices = async (status?: string): Promise<Invoice[]> => {
    const url = new URL(`${API_URL}/invoices`);
    if (status) {
        url.searchParams.append('status', status);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error('Failed to fetch invoices');
    }
    return response.json();
};

export const fetchInvoiceByHash = async (hash: string): Promise<Invoice> => {
    const response = await fetch(`${API_URL}/invoice/${hash}`);

    if (!response.ok) {
        throw new Error('Failed to fetch invoice');
    }
    return response.json();
};

export const createInvoice = async (data: Partial<Invoice>): Promise<Invoice> => {
    const response = await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create invoice');
    }
    return response.json();
};

export const updateInvoiceStatus = async (hash: string, data: Partial<Invoice>): Promise<Invoice> => {
    const response = await fetch(`${API_URL}/invoices/${hash}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update invoice');
    }
    return response.json();
};

export const fetchInvoicesByMerchant = async (merchant: string): Promise<Invoice[]> => {
    console.log(`📡 [API CALL] Fetching invoices for merchant: ${merchant}`);
    const response = await fetch(`${API_URL}/invoices/merchant/${merchant}`);
    if (!response.ok) {
        throw new Error('Failed to fetch merchant invoices');
    }
    const data = await response.json();
    console.log(`📦 [API RESPONSE] Invoices for ${merchant}:`, data.length, data);
    return data;
};

export const fetchRecentTransactions = async (limit: number = 10): Promise<Invoice[]> => {
    const response = await fetch(`${API_URL}/invoices/recent?limit=${limit}`);
    if (!response.ok) {
        throw new Error('Failed to fetch recent transactions');
    }
    return response.json();
};

export interface UserProfile {
    main_address: string;
    burner_address?: string | null;
    encrypted_burner_key?: string | null;
    profile_main_invoice_hash?: string | null;
    profile_burner_invoice_hash?: string | null;
    updated_at?: string;
}

export const getUserProfile = async (address: string): Promise<UserProfile | null> => {
    const response = await fetch(`${API_URL}/users/profile/${address}`);
    if (!response.ok) {
        if (response.status === 404) {
             return null;
        }
        throw new Error('Failed to fetch user profile');
    }
    return response.json();
};

export const updateUserProfile = async (
    main_address: string,
    burner_address?: string,
    encrypted_burner_key?: string,
    profile_main_invoice_hash?: string,
    profile_burner_invoice_hash?: string
): Promise<UserProfile> => {
    const response = await fetch(`${API_URL}/users/profile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            main_address, 
            burner_address, 
            encrypted_burner_key,
            profile_main_invoice_hash,
            profile_burner_invoice_hash
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to update user profile');
    }
    
    return response.json();
};
