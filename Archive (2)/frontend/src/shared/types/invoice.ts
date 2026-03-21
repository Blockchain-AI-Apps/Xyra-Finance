export interface InvoiceItem {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface InvoiceData {
    merchant: string;
    amount: number;
    salt: string;
    hash: string;
    link: string;
}

export interface CreateInvoiceState {
    amount: number | '';
    loading: boolean;
    invoiceData: InvoiceData | null;
    expiry: string;
    memo: string;
    status: string;
}