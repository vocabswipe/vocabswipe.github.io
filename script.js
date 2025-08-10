// script.js
import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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
const subscribeButton = document.getElementById('subscribe');

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
        // onAuthStateChanged will handle navigation
    } catch (error) {
        alert(`Login failed: ${error.message}`);
    }
});

// Signup form submission
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Initialize user subscription status in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            email: email,
            isSubscribed: false
        });
        // onAuthStateChanged will handle navigation
    } catch (error) {
        alert(`Signup failed: ${error.message}`);
    }
});

// Logout
logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        // onAuthStateChanged will handle navigation
    } catch (error) {
        alert(`Logout failed: ${error.message}`);
    }
});

// Subscribe button (simulated subscription)
subscribeButton.addEventListener('click', async () => {
    try {
        const user = auth.currentUser;
        if (user) {
            await setDoc(doc(db, 'users', user.uid), { isSubscribed: true }, { merge: true });
            subscriptionPrompt.classList.add('hidden');
            premiumContent.classList.remove('hidden');
            alert('Subscription successful! You now have access to premium content.');
        } else {
            alert('You must be logged in to subscribe.');
        }
    } catch (error) {
        alert(`Subscription failed: ${error.message}`);
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
