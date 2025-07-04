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
    const buyButtons = document.querySelectorAll('.buy-btn');
    const currencySelector = document.querySelector('#currency-selector');
    const productPrices = document.querySelectorAll('.product-price');

    // Currency conversion rates
    const conversionRates = {
        USD: 1,
        EUR: 0.85,
        INR: 83,
        GBP: 0.75
    };

    // Update product prices based on currency
    function updateStoreUI(currency) {
        productPrices.forEach(price => {
            const usdPrice = parseFloat(price.getAttribute('data-usd-price'));
            const convertedPrice = (usdPrice * conversionRates[currency]).toFixed(2);
            price.textContent = `${currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}${convertedPrice}`;
            const parent = price.closest('.product');
            parent.querySelector('.buy-btn').setAttribute('data-converted-amount', convertedPrice);
        });
    }

    // Currency change handler
    currencySelector.addEventListener('change', () => {
        const currency = currencySelector.value;
        updateStoreUI(currency);
    });

    // Initialize UI with default currency
    updateStoreUI(currencySelector.value);

    // Handle purchases
    buyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const product = btn.getAttribute('data-product');
            const amount = parseFloat(btn.getAttribute('data-converted-amount'));
            const currency = currencySelector.value;
            initiateCheckout(product, amount, currency);
        });
    });

    // Initiate Stripe checkout
    function initiateCheckout(product, amount, currency) {
        stripe.redirectToCheckout({
            lineItems: [{
                price_data: {
                    currency: currency.toLowerCase(),
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

    // Social sharing
    const shareButtons = document.querySelectorAll('.share-btn');
    shareButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = btn.getAttribute('data-platform');
            const shareText = encodeURIComponent(`Check out VocabSwipe’s store for awesome English learning resources! Visit vocabswipe.com/store`);
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
                    url = `https://www.linkedin.com/shareArticle?mini=true&url=https://vocabswipe.com&title=VocabSwipe%20Store&summary=${shareText}`;
                    break;
            }
            window.open(url, '_blank');
        });
    });
});
