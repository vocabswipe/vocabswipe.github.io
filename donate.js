document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme
    const savedTheme = localStorage.getItem('theme') || 'bright';
    document.body.setAttribute('data-theme', savedTheme);
    updateIcons(savedTheme); // From utils.js

    // Theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'bright' ? 'dark' : 'bright';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcons(newTheme);
    });

    // Stripe integration
    const stripe = Stripe('pk_live_51RhLFoA8e2sIvZ3yITfyhk5jbD5vL4i58NmhWK9IZGOo5BkPFyS182JE5GZfG4rKttc04MOHsiLdVUHegVrXyW8I00Q5Qh75Me');
    const donateButtons = document.querySelectorAll('.donate-amount');
    const customAmountInput = document.querySelector('#custom-amount');
    const donateSubmit = document.querySelector('.donate-submit');
    const donationImpact = document.querySelector('#donation-impact');

    // Update donation impact text
    function updateImpactText(amount) {
        const impact = amount >= 10 ? 'supports premium features for 50 users!' :
                       amount >= 5 ? 'maintains servers for 100 users/month!' :
                       amount >= 3 ? 'provides audio for 200 sentences!' :
                       amount >= 1 ? 'keeps VocabSwipe free for 10 users!' : '';
        donationImpact.textContent = amount > 0 ? 
            `Your $${amount.toFixed(2)} donation ${impact}` :
            `Example: $5 ${impact}`;
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
        if (customAmount >= 1) {
            updateImpactText(customAmount);
            donateButtons.forEach(btn => btn.classList.remove('selected'));
            initiateCheckout([{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'VocabSwipe Donation',
                    },
                    unit_amount: Math.floor(customAmount * 100), // Convert to cents
                },
                quantity: 1,
            }]);
        } else {
            showTooltip('Please enter a valid donation amount (minimum $1).');
        }
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
        }, 3000); // Hide after 3 seconds
    }

    // Initiate Stripe checkout
    async function initiateCheckout(lineItems) {
        try {
            const result = await stripe.redirectToCheckout({
                lineItems: lineItems,
                mode: 'payment',
                successUrl: 'https://vocabswipe.com/thank-you',
                cancelUrl: 'https://vocabswipe.com/donate',
            });
            if (result.error) {
                throw new Error(result.error.message);
            }
        } catch (error) {
            console.error('Checkout error:', error.message);
            showTooltip('An error occurred during payment. Please try again.');
        }
    }

    // Close tooltip
    const tooltipClose = document.querySelector('.tooltip-close');
    tooltipClose.addEventListener('click', () => {
        document.querySelector('.tooltip-overlay').style.display = 'none';
    });
});
