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
            displayQRCode(amount);
        });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            const amount = btn.getAttribute('data-amount');
            highlightAmount(btn);
            displayQRCode(amount);
        });
    });

    // Highlight selected amount
    function highlightAmount(selectedBtn) {
        donateButtons.forEach(btn => btn.classList.remove('selected'));
        selectedBtn.classList.add('selected');
    }

    // Display QR code for selected amount
    function displayQRCode(amount) {
        try {
            if (!navigator.onLine) {
                throw new Error('You appear to be offline. Please check your internet connection.');
            }
            loadingOverlay.style.display = 'flex';
            qrCodeContainer.style.display = 'none';

            // Set QR code image path
            const qrCodeUrl = `qr_code/${amount}_THB_qr_code.jpg`;
            
            // Preload image to check if it exists
            const img = new Image();
            img.src = qrCodeUrl;
            img.onload = () => {
                qrAmount.textContent = amount;
                qrCodeImage.src = qrCodeUrl;
                qrCodeContainer.style.display = 'block';
                loadingOverlay.style.display = 'none';
                console.log(`Displayed QR code for ${amount} THB: ${qrCodeUrl}`);
            };
            img.onerror = () => {
                throw new Error(`QR code image not found for ${amount} THB.`);
            };
        } catch (error) {
            console.error('QR code display error:', error.message);
            const message = error.message.includes('offline')
                ? 'Network error: Please check your internet connection and try again.'
                : `Error loading QR code: ${error.message}`;
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
