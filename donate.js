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
    const stripe = Stripe('pk_live_51RhLFoA8e2sIvZ3yITfyhk5jbD5vL4i58NmhWK9IZGOo5BkPFyS182JE5GZfG4rKttc04MOHsiLdVUHegVrXyW8I00Q5Qh75Me'); // Replace with your LIVE Stripe public key
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
            updateImpactText(amount);
            highlightAmount(btn);
            initiateCheckout(amount);
        });
    });

    // Handle custom donation
    donateSubmit.addEventListener('click', () => {
        const customAmount = parseFloat(customAmountInput.value);
        if (customAmount >= 1) {
            updateImpactText(customAmount);
            donateButtons.forEach(btn => btn.classList.remove('selected'));
            initiateCheckout(customAmount);
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
    async function initiateCheckout(amount) {
        try {
            const response = await fetch('https://vocabswipe-github-kek03uwtd-vocabswipes-projects.vercel.app/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Math.floor(amount * 100), // Convert to cents
                    description: 'VocabSwipe Donation',
                    statement_descriptor: 'VOCABSWIPE.COM'
                })
            });
            const session = await response.json();
            if (session.error) {
                throw new Error(session.error);
            }
            const result = await stripe.redirectToCheckout({ sessionId: session.id });
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
