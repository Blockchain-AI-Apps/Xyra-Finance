import fetch from 'node-fetch';
import crypto from 'crypto';

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

export class NullPay {
    private secretKey: string;
    private baseURL: string;

    constructor(config: NullPayConfig) {
        if (!config.secretKey) {
            throw new Error("NullPay API Key is required.");
        }
        this.secretKey = config.secretKey;
        this.baseURL = config.baseURL || 'https://null-pay-rs8i.vercel.app/api';
    }

    public checkout = {
        sessions: {
            create: async (params: CreateCheckoutSessionParams): Promise<CheckoutSession> => {
                const response = await fetch(`${this.baseURL}/checkout/sessions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.secretKey}`
                    },
                    body: JSON.stringify(params)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`NullPay API Error: ${response.status} - ${errorData.error || response.statusText}`);
                }

                return await response.json() as CheckoutSession;
            },
            retrieve: async (sessionId: string): Promise<CheckoutSession> => {
                const response = await fetch(`${this.baseURL}/checkout/sessions/${sessionId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.secretKey}`
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`NullPay API Error: ${response.status} - ${errorData.error || response.statusText}`);
                }

                return await response.json() as CheckoutSession;
            }
        }
    };

    public webhooks = {
        /**
         * Verifies the HMAC-SHA256 signature attached to a NullPay webhook payload.
         * @param payload The raw stringified JSON body of the webhook request.
         * @param signature The hex signature from the `x-nullpay-signature` header.
         * @returns true if the signature is valid and securely originates from NullPay.
         */
        verifySignature: (payload: string, signature: string): boolean => {
            if (!payload || !signature) return false;

            try {
                const expectedSignature = crypto
                    .createHmac('sha256', this.secretKey)
                    .update(payload)
                    .digest('hex');

                // Constant-time string comparison to prevent timing attacks
                if (expectedSignature.length !== signature.length) return false;

                return crypto.timingSafeEqual(
                    Buffer.from(signature, 'utf8'),
                    Buffer.from(expectedSignature, 'utf8')
                );
            } catch (err) {
                console.error("NullPay Signature Verification Error:", err);
                return false;
            }
        },

        /**
         * Helper method to immediately verify and parse the webhook event.
         * Throws an error if the signature is invalid.
         */
        constructEvent: (payload: string, signature: string): WebhookEvent => {
            if (!this.webhooks.verifySignature(payload, signature)) {
                throw new Error("Invalid NullPay Webhook Signature. This request might be spoofed.");
            }
            return JSON.parse(payload) as WebhookEvent;
        }
    };
}
