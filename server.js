const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
const stripe = Stripe('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'); // Replace with your LIVE Stripe secret key

app.use(cors());
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
    const { amount, description, statement_descriptor } = req.body;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: description || 'VocabSwipe Donation',
                    },
                    unit_amount: amount, // In cents
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'https://vocabswipe.com/thank-you',
            cancel_url: 'https://vocabswipe.com/donate',
            payment_intent_data: {
                statement_descriptor: statement_descriptor || 'VOCABSWIPE.COM', // Matches Stripe public details
            },
        });
        res.json({ id: session.id });
    } catch (error) {
        console.error('Error creating checkout session:', error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
