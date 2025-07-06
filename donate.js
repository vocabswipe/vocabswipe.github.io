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
    const donateButtons = document.querySelectorAll('.donate-amount');
    const customAmountInput = document.querySelector('#custom-amount');
    const donateSubmit = document.querySelector('.donate-submit');
    const donationImpact = document.querySelector('#donation-impact');

    // Update donation impact text
    function updateImpactText(amount) {
        const impact = amount >= 350 ? 'supports premium features for 50 users!' :
                       amount >= 175 ? 'maintains servers for 100 users/month!' :
                       amount >= 100 ? 'provides audio for 200 sentences!' :
                       amount >= 10 ? 'keeps VocabSwipe free for 10 users!' : '';
        donationImpact.textContent = amount > 0 ? 
            `Your ฿${amount.toFixed(2)} donation ${impact}` :
            `Example: ฿175 ${impact}`;
    }

    // Initialize impact text
    updateImpactText(0);

    // Handle preset donation buttons
    donateButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseFloat(btn.getAttribute('data-amount'));
            const priceId = btn.getAttribute('data-price-id');
            updateImpactText(amount);
            highlightAmount(btn);
            initiateCheckout([{ price: priceId, quantity: 1 }]);
        });
    });

    // Handle custom donation
    donateSubmit.addEventListener('click', () => {
        const customAmount = parseFloat(customAmountInput.value);
        if (isNaN(customAmount) || customAmount < 10) {
            showTooltip('Please enter a valid donation amount (minimum ฿10).');
            return;
        }
        updateImpactText(customAmount);
        donateButtons.forEach(btn => btn.classList.remove('selected'));
        initiateCheckout([{
            price_data: {
                currency: 'thb',
                product_data: {
                    name: 'VocabSwipe Donation',
                },
                unit_amount: Math.floor(customAmount * 100), // Convert to satang
            },
            quantity: 1,
        }]);
    });

    // Highlight selected amount
    function highlightAmount(selectedBtn) {
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
        }, 5000);
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
                paymentMethodTypes: ['promptpay'], // Explicitly restrict to PromptPay
            });
            if (result.error) {
                throw new Error(result.error.message);
            }
        } catch (error) {
            console.error('Checkout error:', error.message);
            const message = error.message.includes('client-only integration is not enabled')
                ? 'Payment setup error: Please contact support at support@vocabswipe.com.'
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
