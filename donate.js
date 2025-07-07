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
    themeToggle.addEventListener('touchend', (e) => {
        e.preventDefault();
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'bright' ? 'dark' : 'bright';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcons(newTheme);
    });

    // Update icons based on theme
    function updateIcons(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        const backIcon = document.querySelector('.back-icon');
        const loadingIcon = document.querySelector('.loading-icon');
        themeIcon.src = theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg';
        backIcon.src = theme === 'bright' ? 'back-bright.svg' : 'back-night.svg';
        if (loadingIcon) {
            loadingIcon.src = theme === 'bright' ? 'loading-bright.gif' : 'loading-night.gif';
        }
    }

    // Donation buttons
    const donateButtons = document.querySelectorAll('.donate-amount');
    const qrCodeContainer = document.querySelector('.qr-code-container');
    const qrCodeImage = document.querySelector('#qr-code');
    const qrAmount = document.querySelector('#qr-amount');
    const loadingOverlay = document.querySelector('.loading-overlay');

    donateButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = btn.getAttribute('data-amount');
            highlightAmount(btn);
            fetchQRCode(amount);
        });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            const amount = btn.getAttribute('data-amount');
            highlightAmount(btn);
            fetchQRCode(amount);
        });
    });

    // Highlight selected amount
    function highlightAmount(selectedBtn) {
        donateButtons.forEach(btn => btn.classList.remove('selected'));
        selectedBtn.classList.add('selected');
    }

    // Fetch PromptPay QR code (placeholder implementation)
    async function fetchQRCode(amount) {
        try {
            if (!navigator.onLine) {
                throw new Error('You appear to be offline. Please check your internet connection.');
            }
            loadingOverlay.style.display = 'flex';
            qrCodeContainer.style.display = 'none';

            // Placeholder: Replace with actual PromptPay QR code generation API
            // Example: Call a backend endpoint like '/api/generate-promptpay-qr' with the amount
            // For demonstration, using a static QR code image or mock URL
            const qrCodeUrl = `/data/qr-codes/promptpay-${amount}thb.png`; // Adjust path as needed
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify QR code exists (optional, depends on your setup)
            const response = await fetch(qrCodeUrl, { method: 'HEAD' });
            if (!response.ok) {
                throw new Error('Failed to load QR code for the selected amount.');
            }

            qrAmount.textContent = amount;
            qrCodeImage.src = qrCodeUrl;
            qrCodeContainer.style.display = 'block';
            loadingOverlay.style.display = 'none';
        } catch (error) {
            console.error('QR code fetch error:', error.message);
            const message = error.message.includes('offline')
                ? 'Network error: Please check your internet connection and try again.'
                : 'An error occurred while loading the QR code: ' + error.message;
            showTooltip(message);
            loadingOverlay.style.display = 'none';
        }
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

    // Close tooltip
    const tooltipClose = document.querySelector('.tooltip-close');
    tooltipClose.addEventListener('click', () => {
        document.querySelector('.tooltip-overlay').style.display = 'none';
    });
    tooltipClose.addEventListener('touchend', (e) => {
        e.preventDefault();
        document.querySelector('.tooltip-overlay').style.display = 'none';
    });
});
