const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')('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');
const express = require('express');
const bodyParser = require('body-parser');

admin.initializeApp();

const app = express();
app.use(bodyParser.raw({ type: 'application/json' }));

// Create Stripe Checkout session
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }
  const userId = context.auth.uid;
  const email = context.auth.token.email;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['promptpay'],
      mode: 'subscription',
      line_items: [
        {
          price: 'price_1RucJuACmO3bLEHxBLtHwAMi',
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: 'http://localhost:8080/success?session_id={CHECKOUT_SESSION_ID}', // Update for production
      cancel_url: 'http://localhost:8080/cancel', // Update for production
      metadata: { userId: userId },
    });

    return { sessionId: session.id };
  } catch (error) {
    throw new functions.https.HttpsError('internal', `Failed to create checkout session: ${error.message}`);
  }
});

// Handle Stripe webhook events
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = 'your-webhook-secret'; // Replace after setting up webhook

  try {
    const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;

      await admin.firestore().collection('users').doc(userId).set(
        {
          isSubscribed: true,
          stripeSubscriptionId: session.subscription,
          stripeCustomerId: session.customer,
        },
        { merge: true }
      );
    }

    res.status(200).send('Webhook received');
  } catch (error) {
    res.status(400).send(`Webhook error: ${error.message}`);
  }
});

exports.handleWebhook = functions.https.onRequest(app);
