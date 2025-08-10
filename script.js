// Simulated user data (to be replaced with Firebase)
let currentUser = null;
let isSubscribed = false;

// Page elements
const loginPage = document.getElementById('login-page');
const contentPage = document.getElementById('content-page');
const subscriptionPage = document.getElementById('subscription-page');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const subscribeBtn = document.getElementById('subscribe-btn');
const logoutBtn = document.getElementById('logout-btn');
const backToContentBtn = document.getElementById('back-to-content');
const subscriptionStatus = document.getElementById('subscription-status');
const content = document.getElementById('content');

// Show/hide pages
function showPage(page) {
    loginPage.classList.remove('active');
    contentPage.classList.remove('active');
    subscriptionPage.classList.remove('active');
    page.classList.add('active');
}

// Simulated login (replace with Firebase Auth)
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Simulate authentication
    if (email === 'test@example.com' && password === 'password') {
        currentUser = { email: email };
        isSubscribed = false; // Simulate free membership
        showPage(contentPage);
        updateContentPage();
    } else {
        loginError.textContent = 'Invalid email or password';
    }
});

// Update content page based on subscription status
function updateContentPage() {
    if (isSubscribed) {
        subscriptionStatus.textContent = 'You are a premium subscriber!';
        subscribeBtn.style.display = 'none';
        content.style.display = 'block';
    } else {
        subscriptionStatus.textContent = 'You need a subscription to view content.';
        subscribeBtn.style.display = 'block';
        content.style.display = 'none';
    }
}

// Subscribe button click
subscribeBtn.addEventListener('click', () => {
    showPage(subscriptionPage);
});

// Back to content from subscription page
backToContentBtn.addEventListener('click', () => {
    // Simulate subscription activation (replace with Firebase Firestore update)
    isSubscribed = true;
    showPage(contentPage);
    updateContentPage();
});

// Logout
logoutBtn.addEventListener('click', () => {
    currentUser = null;
    isSubscribed = false;
    showPage(loginPage);
    loginForm.reset();
    loginError.textContent = '';
});

// Initial page setup
showPage(loginPage);
