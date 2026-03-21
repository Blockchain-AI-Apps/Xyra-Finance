"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullPay = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const crypto_1 = __importDefault(require("crypto"));
class NullPay {
    constructor(config) {
        this.checkout = {
            sessions: {
                create: async (params) => {
                    const response = await (0, node_fetch_1.default)(`${this.baseURL}/checkout/sessions`, {
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
                    return await response.json();
                },
                retrieve: async (sessionId) => {
                    const response = await (0, node_fetch_1.default)(`${this.baseURL}/checkout/sessions/${sessionId}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${this.secretKey}`
                        }
                    });
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(`NullPay API Error: ${response.status} - ${errorData.error || response.statusText}`);
                    }
                    return await response.json();
                }
            }
        };
        this.webhooks = {
            /**
             * Verifies the HMAC-SHA256 signature attached to a NullPay webhook payload.
             * @param payload The raw stringified JSON body of the webhook request.
             * @param signature The hex signature from the `x-nullpay-signature` header.
             * @returns true if the signature is valid and securely originates from NullPay.
             */
            verifySignature: (payload, signature) => {
                if (!payload || !signature)
                    return false;
                try {
                    const expectedSignature = crypto_1.default
                        .createHmac('sha256', this.secretKey)
                        .update(payload)
                        .digest('hex');
                    // Constant-time string comparison to prevent timing attacks
                    if (expectedSignature.length !== signature.length)
                        return false;
                    return crypto_1.default.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSignature, 'utf8'));
                }
                catch (err) {
                    console.error("NullPay Signature Verification Error:", err);
                    return false;
                }
            },
            /**
             * Helper method to immediately verify and parse the webhook event.
             * Throws an error if the signature is invalid.
             */
            constructEvent: (payload, signature) => {
                if (!this.webhooks.verifySignature(payload, signature)) {
                    throw new Error("Invalid NullPay Webhook Signature. This request might be spoofed.");
                }
                return JSON.parse(payload);
            }
        };
        if (!config.secretKey) {
            throw new Error("NullPay API Key is required.");
        }
        this.secretKey = config.secretKey;
        this.baseURL = config.baseURL || 'https://null-pay-rs8i.vercel.app/api/v1';
    }
}
exports.NullPay = NullPay;
