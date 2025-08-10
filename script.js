// script.js
import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';

// Initialize Stripe
const stripe = Stripe('pk_live_51Ri7mdACmO3bLEHxUQlvPufDUiZ65CrnslG4fOIkTWNy5gNlwTrvNKJoGJt9xnZc7Zm7KKIhq8UuUQgTlu6WPZfq004Csmm26C');
const functions = getFunctions();

// Page elements
const loginPage = document.getElementById('login-page');
const signupPage = document.getElementById('signup-page');
const contentPage = document.getElementById('content-page');
const premiumContent = document.getElementById('premium-content');
const subscriptionPrompt = document.getElementById('subscription-prompt');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const logoutButton = document.getElementById('logout');

// Show signup page
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginPage.classList.add('hidden');
    signupPage.classList.remove('hidden');
});

// Show login page
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupPage.classList.add('hidden');
    loginPage.classList.remove('hidden');
});

// Login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged handles navigation
    } catch (error) {
        alert(`Login failed: ${error.message}`);
    }
});

// Signup form submission with payment
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        // Create Firebase user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        // Initialize Firestore user document
        await setDoc(doc(db, 'users', userId), {
            email: email,
            isSubscribed: false
        });

        // Create Stripe Checkout session
        const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
        const result = await createCheckoutSession();
        const sessionId = result.data.sessionId;

        // Redirect to Stripe Checkout for PromptPay QR code
        await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
        alert(`Signup or payment initiation failed: ${error.message}`);
    }
});

// Logout
logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        // onAuthStateChanged handles navigation
    } catch (error) {
        alert(`Logout failed: ${error.message}`);
    }
});

// Authentication state observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in, check subscription status
        loginPage.classList.add('hidden');
        signupPage.classList.add('hidden');
        contentPage.classList.remove('hidden');

        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().isSubscribed) {
                premiumContent.classList.remove('hidden');
                subscriptionPrompt.classList.add('hidden');
            } else {
                premiumContent.classList.add('hidden');
                subscriptionPrompt.classList.remove('hidden');
            }
        } catch (error) {
            alert(`Error checking subscription: ${error.message}`);
        }
    } else {
        // User is signed out
        contentPage.classList.add('hidden');
        loginPage.classList.remove('hidden');
        premiumContent.classList.add('hidden');
        subscriptionPrompt.classList.add('hidden');
    }
});
