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
    const stripe = Stripe('pk_test_51RhLFxPBjyeniPBubSFW3SAABNmSbZfkn0c23rexkAFFIZHJOIAUz0In9hHHTURd5SeB5pFNJkpIbPYsfW347EJB00KuDKza9e'); // Replace with your Stripe public key
    const buyButtons = document.querySelectorAll('.buy-btn');

    // Handle purchases
    buyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const product = btn.getAttribute('data-product');
            const amount = parseFloat(btn.getAttribute('data-amount'));
            initiateCheckout(product, amount);
        });
    });

    // Initiate Stripe checkout
    function initiateCheckout(product, amount) {
        stripe.redirectToCheckout({
            lineItems: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: `VocabSwipe ${product}` },
                    unit_amount: Math.floor(amount * 100) // Convert to cents
                },
                quantity: 1
            }],
            mode: 'payment',
            successUrl: 'https://vocabswipe.com/thank-you',
            cancelUrl: 'https://vocabswipe.com/store'
        }).then(result => {
            if (result.error) {
                console.error('Checkout error:', result.error.message);
                alert('An error occurred. Please try again.');
            }
        });
    }
});
