export interface NullPayConfig {
    secretKey: string;
    baseURL?: string;
}
export interface CreateCheckoutSessionParams {
    amount: number;
    currency?: 'CREDITS' | 'USDCX' | 'USAD';
    success_url?: string;
    cancel_url?: string;
    invoice_hash?: string;
    salt?: string;
}
export interface CheckoutSession {
    id: string;
    checkout_url: string;
    status: string;
    invoice_hash?: string;
    salt?: string;
}
export interface WebhookEvent {
    id: string;
    amount: number;
    token_type: string;
    status: 'SETTLED' | 'FAILED' | 'PROCESSING' | 'PENDING';
    tx_id: string | null;
    timestamp: string;
}
export declare class NullPay {
    private secretKey;
    private baseURL;
    constructor(config: NullPayConfig);
    checkout: {
        sessions: {
            create: (params: CreateCheckoutSessionParams) => Promise<CheckoutSession>;
            retrieve: (sessionId: string) => Promise<CheckoutSession>;
        };
    };
    webhooks: {
        /**
         * Verifies the HMAC-SHA256 signature attached to a NullPay webhook payload.
         * @param payload The raw stringified JSON body of the webhook request.
         * @param signature The hex signature from the `x-nullpay-signature` header.
         * @returns true if the signature is valid and securely originates from NullPay.
         */
        verifySignature: (payload: string, signature: string) => boolean;
        /**
         * Helper method to immediately verify and parse the webhook event.
         * Throws an error if the signature is invalid.
         */
        constructEvent: (payload: string, signature: string) => WebhookEvent;
    };
}
