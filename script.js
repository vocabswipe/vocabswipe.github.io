// Simulated user data (replace with Firebase later)
let currentUser = null;
let isSubscribed = false;

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
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Simulated login (replace with Firebase auth)
    if (email && password) {
        currentUser = { email };
        showContentPage();
    } else {
        alert('Please enter valid credentials');
    }
});

// Signup form submission
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    // Simulated signup (replace with Firebase auth)
    if (email && password) {
        currentUser = { email };
        showContentPage();
    } else {
        alert('Please enter valid credentials');
    }
});

// Logout
logoutButton.addEventListener('click', () => {
    currentUser = null;
    isSubscribed = false;
    contentPage.classList.add('hidden');
    loginPage.classList.remove('hidden');
    premiumContent.classList.add('hidden');
    subscriptionPrompt.classList.add('hidden');
});

// Subscribe button
subscribeButton.addEventListener('click', () => {
    // Simulated subscription (replace with Firebase or payment integration)
    isSubscribed = true;
    subscriptionPrompt.classList.add('hidden');
    premiumContent.classList.remove('hidden');
    alert('Subscription successful! You now have access to premium content.');
});

// Show content page
function showContentPage() {
    loginPage.classList.add('hidden');
    signupPage.classList.add('hidden');
    contentPage.classList.remove('hidden');

    // Check subscription status (simulated)
    if (isSubscribed) {
        premiumContent.classList.remove('hidden');
        subscriptionPrompt.classList.add('hidden');
    } else {
        premiumContent.classList.add('hidden');
        subscriptionPrompt.classList.remove('hidden');
    }
}
