// Simple demo state management (to be replaced with Firebase)
let isLoggedIn = false;
let isSubscribed = false;

// Page navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// Login form handling
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Demo login logic (replace with Firebase Auth)
    if (email && password) {
        isLoggedIn = true;
        if (isSubscribed) {
            showPage('content-page');
        } else {
            showPage('subscription-page');
        }
    } else {
        alert('Please enter valid credentials');
    }
});

// Signup form handling
document.getElementById('signup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    // Demo signup logic (replace with Firebase Auth)
    if (email && password) {
        isLoggedIn = true;
        showPage('subscription-page');
    } else {
        alert('Please enter valid credentials');
    }
});

// Navigation links
document.getElementById('show-signup').addEventListener('click', () => showPage('signup-page'));
document.getElementById('show-login').addEventListener('click', () => showPage('login-page'));

// Subscription handling
document.getElementById('confirm-payment').addEventListener('click', () => {
    // Demo subscription logic (replace with PromptPay verification)
    isSubscribed = true;
    alert('Payment confirmed! You are now subscribed.');
    showPage('content-page');
});

document.getElementById('back-to-content').addEventListener('click', () => {
    if (isSubscribed) {
        showPage('content-page');
    } else {
        showPage('subscription-page');
    }
});

// Logout handling
document.getElementById('logout').addEventListener('click', () => {
    isLoggedIn = false;
    isSubscribed = false;
    showPage('login-page');
});

// Initial page
showPage('login-page');
