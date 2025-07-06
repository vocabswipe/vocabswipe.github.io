const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
                statement_descriptor: statement_descriptor || 'VOCABSWIPE.COM',
            },
        });
        res.status(200).json({ id: session.id });
    } catch (error) {
        console.error('Error creating checkout session:', error.message);
        res.status(500).json({ error: error.message });
    }
}
