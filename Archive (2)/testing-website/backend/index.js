require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { NullPay } = require('@nullpay/node');

const app = express();
app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

const nullpay = new NullPay({
    secretKey: process.env.NULLPAY_SECRET_KEY || 'sk_test_cd1469c40d28100ef42bfb0bc2fd6bb0a05eb21b882c1e00', // Connected to DB!
    baseURL: 'https://null-pay-rs8i.vercel.app/api'
});

const PORT = 4000;

app.post('/api/create-checkout', async (req, res) => {
    try {
        const { item, price } = req.body;
        console.log(`[Merchant] Creating checkout for ${item} at ${price}`);
        const frontendUrl = process.env.FRONTEND_URL || 'https://testing-website-frontend.vercel.app';
        const session = await nullpay.checkout.sessions.create({
            amount: price,
            invoice_hash: '1115746144388697626639199193629687485898491210296849134687801972477586805400field',
            salt: '337031781705903168303998209154958292665field',
            success_url: `${frontendUrl}/success`,
            cancel_url: `${frontendUrl}/cart`
        });
        res.json({ checkoutUrl: session.checkout_url });
    } catch (error) {
        console.error('[Merchant] Checkout Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/verify-session', async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id) return res.status(400).json({ error: 'Missing session_id' });
        
        console.log(`[Merchant] Verifying session: ${session_id}`);
        const session = await nullpay.checkout.sessions.retrieve(session_id);
        
        if (session.status === 'SETTLED') {
            res.json({ success: true, isPremium: true });
        } else {
            res.json({ success: false, isPremium: false, status: session.status });
        }
    } catch (error) {
        console.error('[Merchant] Verify Session Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Webhook Route: Receive fulfillment notifications from NullPay
app.post('/api/webhook', (req, res) => {
    const signature = req.headers['x-nullpay-signature'];

    try {
        const event = nullpay.webhooks.constructEvent(req.rawBody, signature);

        console.log(`\n✅ [Merchant Webhook] Verified Event Received: ${event.id}`);
        console.log(`   - Status: ${event.status}`);
        console.log(`   - Amount: ${event.amount} ${event.token_type}`);

        if (event.status === 'SETTLED') {
            console.log(`   - 🛍️ FULFILLING ORDER! TX ID: ${event.tx_id}`);
        }

        res.status(200).json({ received: true });
    } catch (err) {
        console.error(`❌ [Merchant Webhook] Security Error:`, err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Merchant Backend running on http://localhost:${PORT}`);
    });
}

module.exports = app;
