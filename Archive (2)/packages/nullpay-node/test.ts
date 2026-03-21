import { NullPay } from './src';

// Example Backend Usage
const main = async () => {
    // 1. Initialize SDK with secret key
    const nullpay = new NullPay({
        secretKey: 'merch_secure_test_key_xyz',
        baseURL: 'http://localhost:3000/v1'
    });

    console.log("=== Testing Webhook Signature Verification ===");

    // Example payload from Supabase intent
    const mockPayload = {
        id: "pi_12345",
        amount: 50,
        token_type: "USDCX",
        status: "SETTLED",
        tx_id: "at1abc12345",
        timestamp: new Date().toISOString()
    };
    const payloadString = JSON.stringify(mockPayload);

    // Create a mock signature exactly like the backend does
    const crypto = require('crypto');
    const validSignature = crypto
        .createHmac('sha256', 'merch_secure_test_key_xyz')
        .update(payloadString)
        .digest('hex');

    // 2. Client Side verification
    try {
        const event = nullpay.webhooks.constructEvent(payloadString, validSignature);
        console.log("✅ Webhook Event Parsed Successfully:", event.id, "Status:", event.status);
    } catch (e: any) {
        console.error("❌ Failed to construct event:", e.message);
    }

    // Try a bad signature
    try {
        nullpay.webhooks.constructEvent(payloadString, "bad_signature_hex");
        console.error("❌ Should have failed on bad signature.");
    } catch (e: any) {
        console.log("✅ Caught fake webhook:", e.message);
    }
};

main();
