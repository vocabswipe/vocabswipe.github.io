document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'bright';
    document.body.setAttribute('data-theme', savedTheme);
    updateIcons(savedTheme);

    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'bright' ? 'dark' : 'bright';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcons(newTheme);
    });

    const donateButtons = document.querySelectorAll('.donate-amount');
    const customAmountInput = document.querySelector('#custom-amount');
    const qrImage = document.querySelector('#promptpay-qr');
    const submitTransaction = document.querySelector('.submit-transaction');
    const transactionIdInput = document.querySelector('#transaction-id');
    const shareBtn = document.querySelector('.share-btn');

    donateButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = btn.getAttribute('data-amount');
            customAmountInput.value = amount;
            highlightAmount(btn);
        });
    });

    submitTransaction.addEventListener('click', () => {
        const transactionId = transactionIdInput.value.trim();
        const amount = parseFloat(customAmountInput.value) || 0;
        if (transactionId && amount >= 30) {
            // Replace with actual backend API call for verification
            fetch('/verify-donation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionId, amount })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Thank you for your donation! We have received your transaction.');
                    transactionIdInput.value = '';
                    customAmountInput.value = '';
                    window.location.href = '/thank-you';
                } else {
                    alert('Invalid transaction ID or amount. Please try again.');
                }
            })
            .catch(error => {
                console.error('Verification error:', error);
                alert('An error occurred. Please try again.');
            });
        } else {
            alert('Please enter a valid transaction ID and amount (minimum 30 THB).');
        }
    });

    shareBtn.addEventListener('click', () => {
        const shareText = encodeURIComponent('I supported VocabSwipe to help CMU students learn English for free! Join me at vocabswipe.com');
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
            // Instagram Stories sharing (simplified, Meta API recommended)
            const instagramUrl = `https://www.instagram.com/stories?text=${shareText}&url=https://vocabswipe.com`;
            window.open(instagramUrl, '_blank');
        } else {
            // Twitter/X sharing for desktop
            window.open(`https://twitter.com/intent/tweet?text=${shareText}`, '_blank');
        }
    });

    function highlightAmount(selectedBtn) {
        donateButtons.forEach(btn => btn.classList.remove('selected'));
        selectedBtn.classList.add('selected');
    }

    function updateIcons(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        const backIcon = document.querySelector('.back-icon');
        themeIcon.src = theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg';
        backIcon.src = theme === 'bright' ? 'back-bright.svg' : 'back-night.svg';
    }
});
