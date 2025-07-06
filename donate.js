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

    // Update icons
    function updateIcons(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        const backIcon = document.querySelector('.back-icon');
        themeIcon.src = theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg';
        backIcon.src = theme === 'bright' ? 'back-bright.svg' : 'back-night.svg';
    }

    // Stripe integration
    const stripe = Stripe('pk_live_51RhLFoA8e2sIvZ3yITfyhk5jbD5vL4i58NmhWK9IZGOo5BkPFyS182JE5GZfG4rKttc04MOHsiLdVUHegVrXyW8I00Q5Qh75Me');
    const donateButton = document.querySelector('.donate-amount');

    // Handle donation button
    donateButton.addEventListener('click', () => {
        const priceId = donateButton.getAttribute('data-price-id');
        highlightAmount(donateButton);
        initiateCheckout(priceId);
    });

    // Highlight selected amount
    function highlightAmount(selectedBtn) {
        selectedBtn.classList.add('selected');
        setTimeout(() => selectedBtn.classList.remove('selected'), 1000); // Remove highlight after 1s
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
    async function initiateCheckout(priceId) {
        try {
            if (!navigator.onLine) {
                throw new Error('You appear to be offline. Please check your internet connection.');
            }

            // Make a POST request to the server to create a Checkout session
            const response = await fetch('/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId: priceId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create checkout session. Please try again.');
            }

            const session = await response.json();
            const result = await stripe.redirectToCheckout({
                sessionId: session.id,
            });

            if (result.error) {
                throw new Error(result.error.message);
            }
        } catch (error) {
            console.error('Checkout error:', error.message);
            const message = error.message.includes('network') || error.message.includes('offline')
                ? 'Network error: Please check your internet connection and try again.'
                : error.message.includes('client-only integration')
                ? 'Payment setup error: Please contact support@vocabswipe.com.'
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
