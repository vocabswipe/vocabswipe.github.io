const express = require('express');
const stripe = require('stripe')('sk_test_51RhLFoA8e2sIvZ3yP31f26C4S5ZjKZunYV80hlh9nTqU5ZZHrAdYHCQYIf3rfYzFfmjnDX7o16y80qgBOeTky9BV00hBmHTqCV');
const app = express();

app.use(express.static('public'));
app.use(express.json());

const YOUR_DOMAIN = 'http://localhost:4242'; // Replace with your actual domain in production

app.post('/create-checkout-session', async (req, res) => {
    try {
        const { priceId } = req.body;

        if (!priceId) {
            return res.status(400).json({ error: 'Price ID is required' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['promptpay'], // Enable PromptPay
            line_items: [
                {
                    price: priceId, // e.g., price_1RhtKSA8e2sIvZ3yik7L7cWT
                    quantity: 1,
                },
            ],
            currency: 'thb', // Set currency to Thai Baht
            mode: 'payment',
            success_url: `${YOUR_DOMAIN}/thank-you.html`,
            cancel_url: `${YOUR_DOMAIN}/donate.html`,
        });

        res.json({ id: session.id });
    } catch (error) {
        console.error('Error creating checkout session:', error.message);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

app.listen(4242, () => console.log('Server running on port 4242'));
