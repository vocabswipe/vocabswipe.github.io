document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme
    const savedTheme = localStorage.getItem('theme') || 'bright';
    document.body.setAttribute('data-theme', savedTheme);
    updateIcons(savedTheme);

    // Theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'bright' ? 'dark' : 'bright';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcons(newTheme);
    });

    // Update icons based on theme
    function updateIcons(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        const backIcon = document.querySelector('.back-icon');
        themeIcon.src = theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg';
        backIcon.src = theme === 'bright' ? 'back-bright.svg' : 'back-night.svg';
    }

    // Stripe integration
    const stripe = Stripe('pk_live_51RhLFoA8e2sIvZ3yITfyhk5jbD5vL4i58NmhWK9IZGOo5BkPFyS182JE5GZfG4rKttc04MOHsiLdVUHegVrXyW8I00Q5Qh75Me');
    const donateButton = document.querySelector('.donate-amount');

    // Handle donation button click
    donateButton.addEventListener('click', () => {
        const priceId = donateButton.getAttribute('data-price-id');
        highlightAmount(donateButton);
        initiateCheckout([{ price: priceId, quantity: 1 }]);
    });

    // Highlight selected amount (retained for potential future expansion)
    function highlightAmount(selectedBtn) {
        const donateButtons = document.querySelectorAll('.donate-amount');
        donateButtons.forEach(btn => btn.classList.remove('selected'));
        selectedBtn.classList.add('selected');
    }

    // Show tooltip for error messages
    function showTooltip(message) {
        const tooltipOverlay = document.querySelector('.tooltip-overlay');
        const tooltipText = document.querySelector('#tooltip-text');
        tooltipText.textContent = message;
        tooltipOverlay.style.display = 'flex';
        setTimeout(() => {
            tooltipOverlay.style.display = 'none';
        }, 3000);
    }

    // Initiate Stripe checkout
    async function initiateCheckout(lineItems) {
        try {
            if (!navigator.onLine) {
                throw new Error('You appear to be offline. Please check your internet connection.');
            }
            const result = await stripe.redirectToCheckout({
                lineItems: lineItems,
                mode: 'payment',
                successUrl: `${window.location.origin}/thank-you.html`,
                cancelUrl: `${window.location.origin}/donate.html`,
            });
            if (result.error) {
                throw new Error(result.error.message);
            }
        } catch (error) {
            console.error('Checkout error:', error.message);
            const message = error.message.includes('client-only integration is not enabled')
                ? 'Payment setup error: Please contact support@vocabswipe.com.'
                : error.message.includes('network') || error.message.includes('offline')
                ? 'Network error: Please check your internet connection and try again.'
                : 'An error occurred during payment: ' + error.message;
            showTooltip(message);
        }
    }

    // Close tooltip
    const tooltipClose = document.querySelector('.tooltip-close');
    tooltipClose.addEventListener('click', () => {
        document.querySelector('.tooltip-overlay').style.display = 'none';
    });
});
