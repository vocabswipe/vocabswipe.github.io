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
    const buyButtons = document.querySelectorAll('.buy-btn');

    buyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const product = btn.getAttribute('data-product');
            const amount = parseInt(btn.getAttribute('data-amount'));
            initiateCheckout(product, amount);
        });
    });

    function initiateCheckout(product, amount) {
        stripe.redirectToCheckout({
            lineItems: [{ price_data: { currency: 'usd', product_data: { name: `VocabSwipe ${product}` }, unit_amount: amount }, quantity: 1 }],
            mode: 'payment',
            successUrl: 'https://vocabswipe.com/thank-you',
            cancelUrl: 'https://vocabswipe.com/store',
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
        const shareText = encodeURIComponent('Check out VocabSwipe’s store for awesome English learning resources! Visit vocabswipe.com/store');
        window.open(`https://twitter.com/intent/tweet?text=${shareText}`);
    });

    function updateIcons(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        const backIcon = document.querySelector('.back-icon');
        themeIcon.src = theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg';
        backIcon.src = theme === 'bright' ? 'back-bright.svg' : 'back-night.svg';
    }
});
