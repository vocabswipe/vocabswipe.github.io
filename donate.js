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

    // Stripe integration
    const stripe = Stripe('your-stripe-public-key'); // Replace with your Stripe public key
    const donateButtons = document.querySelectorAll('.donate-amount');
    const customAmountInput = document.querySelector('#custom-amount');
    const donateSubmit = document.querySelector('.donate-submit');

    donateButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseInt(btn.getAttribute('data-amount')) * 100; // Convert to cents
            initiateCheckout(amount);
        });
    });

    donateSubmit.addEventListener('click', () => {
        const customAmount = parseFloat(customAmountInput.value);
        if (customAmount >= 1) {
            initiateCheckout(Math.floor(customAmount * 100)); // Convert to cents
        } else {
            alert('Please enter a valid donation amount ($1 or more).');
        }
    });

    function initiateCheckout(amount) {
        stripe.redirectToCheckout({
            lineItems: [{ price_data: { currency: 'usd', product_data: { name: 'VocabSwipe Donation' }, unit_amount: amount }, quantity: 1 }],
            mode: 'payment',
            successUrl: 'https://vocabswipe.com/thank-you',
            cancelUrl: 'https://vocabswipe.com/donate',
        }).then(result => {
            if (result.error) {
                console.error('Checkout error:', result.error.message);
                alert('An error occurred. Please try again.');
            }
        });
    }

    // Social sharing
    const shareBtn = document.querySelector('.share-btn');
    shareBtn.addEventListener('click', () => {
        const shareText = encodeURIComponent('I supported VocabSwipe to help students learn English for free! Try it at vocabswipe.com');
        window.open(`https://twitter.com/intent/tweet?text=${shareText}`);
    });

    function updateIcons(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        const backIcon = document.querySelector('.back-icon');
        themeIcon.src = theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg';
        backIcon.src = theme === 'bright' ? 'back-bright.svg' : 'back-night.svg';
    }
});
