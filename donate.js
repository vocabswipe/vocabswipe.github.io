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
    const stripe = Stripe('your-stripe-public-key'); // Replace with your Stripe public key
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
            alert('Please enter a valid donation amount (minimum $1).');
        }
    });

    // Highlight selected amount
    function highlightAmount(selectedBtn) {
        donateButtons.forEach(btn => btn.classList.remove('selected'));
        selectedBtn.classList.add('selected');
    }

    // Initiate Stripe checkout
    function initiateCheckout(amount) {
        stripe.redirectToCheckout({
            lineItems: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: 'VocabSwipe Donation' },
                    unit_amount: Math.floor(amount * 100) // Convert to cents
                },
                quantity: 1
            }],
            mode: 'payment',
            successUrl: 'https://vocabswipe.com/thank-you',
            cancelUrl: 'https://vocabswipe.com/donate'
        }).then(result => {
            if (result.error) {
                console.error('Checkout error:', result.error.message);
                alert('An error occurred. Please try again.');
            }
        });
    }

    // Social sharing
    const shareButtons = document.querySelectorAll('.share-btn');
    shareButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = btn.getAttribute('data-platform');
            const amount = customAmountInput.value ? parseFloat(customAmountInput.value) : 5;
            const shareText = encodeURIComponent(`I donated $${amount.toFixed(2)} to VocabSwipe to help students learn English for free! Join me at vocabswipe.com`);
            let url;
            switch (platform) {
                case 'twitter':
                    url = `https://twitter.com/intent/tweet?text=${shareText}`;
                    break;
                case 'whatsapp':
                    url = `https://wa.me/?text=${shareText}`;
                    break;
                case 'facebook':
                    url = `https://www.facebook.com/sharer/sharer.php?u=https://vocabswipe.com&quote=${shareText}`;
                    break;
                case 'linkedin':
                    url = `https://www.linkedin.com/shareArticle?mini=true&url=https://vocabswipe.com&title=VocabSwipe%20Donation&summary=${shareText}`;
                    break;
            }
            window.open(url, '_blank');
        });
    });
});
