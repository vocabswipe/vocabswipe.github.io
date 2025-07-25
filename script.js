// Array to hold vocabulary entries
let vocabData = [];

// Track visit count
let visitCount = parseInt(localStorage.getItem('visitCount') || '0');
visitCount++;
localStorage.setItem('visitCount', visitCount);

// jQuery number animation plugin
(function ($) {
    $.fn.countTo = function (options) {
        options = options || {};
        
        return $(this).each(function () {
            var settings = $.extend({}, $.fn.countTo.defaults, {
                from:            $(this).data('from'),
                to:              $(this).data('to'),
                speed:           $(this).data('speed'),
                refreshInterval: $(this).data('refresh-interval'),
                decimals:        $(this).data('decimals')
            }, options);
            
            var loops = Math.ceil(settings.speed / settings.refreshInterval),
                increment = (settings.to - settings.from) / loops;
            
            var self = this,
                $self = $(this),
                loopCount = 0,
                value = settings.from,
                data = $self.data('countTo') || {};
            
            $self.data('countTo', data);
            
            if (data.interval) {
                clearInterval(data.interval);
            }
            data.interval = setInterval(updateTimer, settings.refreshInterval);
            
            render(value);
            
            function updateTimer() {
                value += increment;
                loopCount++;
                
                render(value);
                
                if (typeof(settings.onUpdate) == 'function') {
                    settings.onUpdate.call(self, value);
                }
                
                if (loopCount >= loops) {
                    $self.removeData('countTo');
                    clearInterval(data.interval);
                    value = settings.to;
                    
                    if (typeof(settings.onComplete) == 'function') {
                        settings.onComplete.call(self, value);
                    }
                }
            }
            
            function render(value) {
                var formattedValue = settings.formatter.call(self, value, settings);
                $self.html(formattedValue);
            }
        });
    };
    
    $.fn.countTo.defaults = {
        from: 0,
        to: 0,
        speed: 10000,
        refreshInterval: 100,
        decimals: 0,
        formatter: formatter,
        onUpdate: null,
        onComplete: null
    };
    
    function formatter(value, settings) {
        return value.toFixed(settings.decimals).replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
    }
})(jQuery);

// Update website statistics display with animated number
function updateWebsiteStats() {
    const statsElement = document.getElementById('website-stats');
    const countNumberElement = $('.count-number');
    countNumberElement.data('to', vocabData.length);
    countNumberElement.data('countToOptions', {
        formatter: function (value, options) {
            return value.toFixed(options.decimals).replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
        }
    });
    countNumberElement.countTo();
    statsElement.style.transition = 'opacity 1s ease';
    statsElement.style.opacity = '1';
}

// Function to alternate stats text and slogan between English and Thai
function alternateStatsText() {
    const line1 = document.getElementById('stats-line1');
    const line2 = document.getElementById('stats-line2');
    const slogan = document.querySelector('.website-slogan');
    let isEnglish = true;

    function swapText() {
        // Fade out text only
        line1.style.transition = 'opacity 0.5s ease';
        line2.style.transition = 'opacity 0.5s ease';
        slogan.style.transition = 'opacity 0.5s ease';
        line1.style.opacity = '0';
        line2.style.opacity = '0';
        slogan.style.opacity = '0';

        setTimeout(() => {
            // Update text and classes
            if (isEnglish) {
                line1.textContent = 'ประโยคภาษาอังกฤษที่ใช้กันมากที่สุด';
                line2.textContent = 'การ์ดที่พร้อมใช้และยังเพิ่มขึ้นเรื่อย ๆ';
                slogan.textContent = 'ยิ่งปัด ยิ่งเก่งศัพท์';
                line1.classList.add('thai-text');
                line2.classList.add('thai-text');
                slogan.classList.add('thai-text');
            } else {
                line1.textContent = 'most spoken English sentences';
                line2.textContent = 'cards available and still growing';
                slogan.textContent = 'Master Words, Swipe by Swipe';
                line1.classList.remove('thai-text');
                line2.classList.remove('thai-text');
                slogan.classList.remove('thai-text');
            }
            // Fade in text
            line1.style.transition = 'opacity 0.5s ease';
            line2.style.transition = 'opacity 0.5s ease';
            slogan.style.transition = 'opacity 0.5s ease';
            line1.style.opacity = '1';
            line2.style.opacity = '1';
            slogan.style.opacity = '1';
            isEnglish = !isEnglish;
        }, 500);
    }

    // Start with English text (explicitly set)
    line1.textContent = 'most spoken English sentences';
    line2.textContent = 'cards available and still growing';
    slogan.textContent = 'Master Words, Swipe by Swipe';
    line1.style.opacity = '1';
    line2.style.opacity = '1';
    slogan.style.opacity = '1';
    line1.classList.remove('thai-text');
    line2.classList.remove('thai-text');
    slogan.classList.remove('thai-text');

    // Start alternating after 20 seconds, switching to Thai first
    setTimeout(() => {
        swapText();
        setInterval(swapText, 20000); // Alternate every 20 seconds
    }, 20000);
}

// Function to check if it's night time in Thailand (10 PM - 6 AM)
function isThailandNightTime() {
    const now = new Date();
    const thailandTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const hours = thailandTime.getHours();
    return hours >= 22 || hours < 6;
}

// Function to set initial card theme based on time
function setInitialCardTheme() {
    const isNight = isThailandNightTime();
    const cardBackgroundColor = isNight ? '#000000' : '#ffffff';
    const cardTextColor = isNight ? '#FFD700' : '#000000';
    const cardBorderColor = isNight ? '#FFD700' : '#000000';

    const cards = [
        document.getElementById('vocab-card'),
        document.getElementById('next-card-1'),
        document.getElementById('next-card-2'),
        document.getElementById('next-card-3'),
        document.getElementById('next-card-4'),
        ...document.querySelectorAll('.card-stack')
    ];

    cards.forEach(card => {
        card.style.backgroundColor = cardBackgroundColor;
        card.style.borderColor = cardBorderColor;
    });
}

// Function to animate card stack drop with two groups
function animateCardStackDrop(callback) {
    const cardContainer = document.getElementById('card-container');
    const stackCards = [
        document.querySelector('.card-stack-7'),
        document.querySelector('.card-stack-6'),
        document.querySelector('.card-stack-5'),
        document.querySelector('.card-stack-4'),
        document.querySelector('.card-stack-3'),
        document.querySelector('.card-stack-2'),
        document.querySelector('.card-stack-1')
    ];
    const contentCards = [
        document.getElementById('next-card-4'),
        document.getElementById('next-card-3'),
        document.getElementById('next-card-2'),
        document.getElementById('next-card-1'),
        document.getElementById('vocab-card')
    ];

    // Set initial state for animation (cards off-screen at top)
    stackCards.forEach((card, index) => {
        card.style.transition = 'none';
        card.style.transform = `translateY(-${window.innerHeight}px) rotate(${index * 0.1}deg)`; // Tighter rotation for stack cards
        card.style.opacity = '0';
    });

    contentCards.forEach((card, index) => {
        card.style.transition = 'none';
        card.style.transform = `translateY(-${window.innerHeight}px) rotate(${(contentCards.length - 1 - index) * 0.5}deg)`;
        card.style.opacity = '0';
    });

    // Start animation after a brief delay
    setTimeout(() => {
        // Animate stack cards (no content) first, tightly packed
        stackCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.transition = `transform ${0.8 + index * 0.05}s ease-out, opacity ${0.8 + index * 0.05}s ease-out`; // Faster for stack cards
                card.style.transform = `translate(${(stackCards.length - 1 - index) * 0.5}px, ${(stackCards.length - 1 - index) * 0.5}px) rotate(${(stackCards.length - 1 - index) * 0.1}deg)`; // Tighter translation
                card.style.opacity = '1';
            }, index * 50); // Stagger by 50ms for stack cards
        });

        // Animate content cards after stack cards, only if data is available
        contentCards.forEach((card, index) => {
            if (vocabData.length > index) { // Only animate if data is loaded
                setTimeout(() => {
                    card.style.transition = `transform ${0.8 + index * 0.2}s ease-out, opacity ${0.8 + index * 0.2}s ease-out`;
                    card.style.transform = `translate(${(contentCards.length - 1 - index) * 2}px, ${(contentCards.length - 1 - index) * 2}px) rotate(${(contentCards.length - 1 - index) * 0.5}deg)`;
                    card.style.opacity = '1';
                }, (stackCards.length * 50) + (index * 200)); // Start after stack cards, staggered by 200ms
            }
        });

        // Call callback after animation completes
        setTimeout(callback, 1000 + (stackCards.length * 50) + ((vocabData.length > contentCards.length ? contentCards.length : vocabData.length) * 200));
    }, 100);
}

// Function to fetch and parse JSONL file
async function loadVocabData() {
    try {
        // Set initial card theme and hide all cards
        setInitialCardTheme();
        const cards = [
            document.getElementById('vocab-card'),
            document.getElementById('next-card-1'),
            document.getElementById('next-card-2'),
            document.getElementById('next-card-3'),
            document.getElementById('next-card-4'),
            ...document.querySelectorAll('.card-stack')
        ];
        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.display = 'none'; // Hide cards to simulate empty table
        });

        // Show stack cards immediately to start animation
        const stackCards = document.querySelectorAll('.card-stack');
        stackCards.forEach(card => {
            card.style.display = 'block';
        });

        // Start stack animation for stack cards
        animateCardStackDrop(() => {
            displayCards();
            updateWebsiteStats();
            alternateStatsText();
        });

        // Fetch data
        const response = await fetch('data/database.jsonl');
        const text = await response.text();
        vocabData = text.trim().split('\n').map(line => JSON.parse(line));
        vocabData = vocabData.sort(() => Math.random() - 0.5);

        // Show content cards after data is loaded
        const contentCards = [
            document.getElementById('vocab-card'),
            document.getElementById('next-card-1'),
            document.getElementById('next-card-2'),
            document.getElementById('next-card-3'),
            document.getElementById('next-card-4')
        ];
        contentCards.forEach(card => {
            card.style.display = 'block';
        });

    } catch (error) {
        console.error('Error loading database:', error);
        document.getElementById('word-top').textContent = 'Error';
        document.getElementById('word-bottom').textContent = 'Error';
        document.getElementById('english').textContent = 'Failed to load data';
        document.getElementById('thai').textContent = '';
    }
}

// Current card index
let currentIndex = 0;

// Function to display the current and next cards
function displayCards() {
    if (vocabData.length === 0) return;

    const isNight = isThailandNightTime();
    const cardBackgroundColor = isNight ? '#000000' : '#ffffff';
    const cardTextColor = isNight ? '#FFD700' : '#000000';
    const cardBorderColor = isNight ? '#FFD700' : '#000000';

    const currentCard = document.getElementById('vocab-card');
    const wordTopElement = document.getElementById('word-top');
    const wordBottomElement = document.getElementById('word-bottom');
    const englishElement = document.getElementById('english');
    const thaiElement = document.getElementById('thai');
    const audioElement = document.getElementById('card-audio');
    const nextCards = [
        { card: document.getElementById('next-card-1'), top: 'next-word-top-1', bottom: 'next-word-bottom-1', english: 'next-english-1', thai: 'next-thai-1', zIndex: 9, translateX: 2, translateY: 2, rotate: 0.5 },
        { card: document.getElementById('next-card-2'), top: 'next-word-top-2', bottom: 'next-word-bottom-2', english: 'next-english-2', thai: 'next-thai-2', zIndex: 8, translateX: 4, translateY: 4, rotate: 1 },
        { card: document.getElementById('next-card-3'), top: 'next-word-top-3', bottom: 'next-word-bottom-3', english: 'next-english-3', thai: 'next-thai-3', zIndex: 7, translateX: 6, translateY: 6, rotate: 1.5 },
        { card: document.getElementById('next-card-4'), top: 'next-word-top-4', bottom: 'next-word-bottom-4', english: 'next-english-4', thai: 'next-thai-4', zIndex: 6, translateX: 8, translateY: 8, rotate: 2 }
    ];
    const stackCards = document.querySelectorAll('.card-stack');

    // Current card
    if (currentIndex < vocabData.length) {
        const entry = vocabData[currentIndex];
        wordTopElement.textContent = entry.word;
        wordBottomElement.textContent = entry.word;
        englishElement.textContent = entry.english;
        thaiElement.textContent = entry.thai;
        audioElement.src = `data/${entry.audio}`;
        wordTopElement.style.color = cardTextColor;
        wordBottomElement.style.color = cardTextColor;
        englishElement.style.color = cardTextColor;
        thaiElement.style.color = cardTextColor;
        currentCard.style.backgroundColor = cardBackgroundColor;
        currentCard.style.borderColor = cardBorderColor;
        currentCard.style.transform = 'translate(0, 0) rotate(0deg)';
        currentCard.style.opacity = '1';
        currentCard.style.zIndex = '100';
    }

    // Next cards
    nextCards.forEach((next, index) => {
        if (currentIndex + index + 1 < vocabData.length) {
            const nextEntry = vocabData[currentIndex + index + 1];
            const nextWordTopElement = document.getElementById(next.top);
            const nextWordBottomElement = document.getElementById(next.bottom);
            const nextEnglishElement = document.getElementById(next.english);
            const nextThaiElement = document.getElementById(next.thai);
            nextWordTopElement.textContent = nextEntry.word;
            nextWordBottomElement.textContent = nextEntry.word;
            nextEnglishElement.textContent = nextEntry.english;
            nextThaiElement.textContent = nextEntry.thai;
            nextWordTopElement.style.color = cardTextColor;
            nextWordBottomElement.style.color = cardTextColor;
            nextEnglishElement.style.color = cardTextColor;
            nextThaiElement.style.color = cardTextColor;
            next.card.style.backgroundColor = cardBackgroundColor;
            next.card.style.borderColor = cardBorderColor;
            next.card.style.transform = `translate(${next.translateX}px, ${next.translateY}px) rotate(${next.rotate}deg)`;
            next.card.style.opacity = '1';
            next.card.style.zIndex = next.zIndex;
        } else {
            next.card.style.opacity = '0';
        }
    });

    // Stack cards
    stackCards.forEach((card, index) => {
        card.style.backgroundColor = cardBackgroundColor;
        card.style.borderColor = cardBorderColor;
    });
}

// Function to animate and move to next card
function moveToNextCard(translateX, translateY, rotate) {
    const card = document.getElementById('vocab-card');
    card.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
    card.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`;
    card.style.opacity = '0';
    card.style.zIndex = '1000';
    setTimeout(() => {
        currentIndex = (currentIndex + 1) % vocabData.length;
        displayCards();
        card.style.transition = 'none';
    }, 500);
}

// Touch and mouse handling
let isDragging = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let startTime = 0;
const minSwipeDistance = 50;
const maxTapDistance = 10;
const maxTapDuration = 300;

const card = document.getElementById('vocab-card');

card.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        e.preventDefault();
        startX = e.changedTouches[0].screenX;
        startY = e.changedTouches[0].screenY;
        currentX = startX;
        currentY = startY;
        startTime = Date.now();
        card.style.transition = 'none';
        card.style.zIndex = '1000';
        isDragging = true;
    }
});

card.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
        e.preventDefault();
        currentX = e.changedTouches[0].screenX;
        currentY = e.changedTouches[0].screenY;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        const rotate = (deltaX / window.innerWidth) * 30;
        card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotate}deg)`;
        card.style.zIndex = '1000';
    }
});

card.addEventListener('touchend', (e) => {
    e.preventDefault();
    isDragging = false;
    const endX = e.changedTouches[0].screenX;
    const endY = e.changedTouches[0].screenY;
    const touchDuration = Date.now() - startTime;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance <= maxTapDistance && touchDuration <= maxTapDuration) {
        const audio = document.getElementById('card-audio');
        card.classList.add('glow');
        audio.play().catch(error => console.error('Error playing audio:', error));
        card.style.transform = 'translate(0, 0) rotate(0deg)';
        setTimeout(() => {
            card.classList.remove('glow');
        }, 600);
    } else if (distance > minSwipeDistance) {
        const angle = Math.atan2(deltaY, deltaX);
        const magnitude = distance * 5;
        const translateX = Math.cos(angle) * magnitude;
        const translateY = Math.sin(angle) * magnitude;
        const rotate = (deltaX / window.innerWidth) * 30;
        moveToNextCard(translateX, translateY, rotate);
    } else {
        card.style.transition = 'transform 0.3s ease';
        card.style.transform = 'translate(0, 0) rotate(0deg)';
    }
});

card.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.screenX;
    startY = e.screenY;
    currentX = startX;
    currentY = startY;
    startTime = Date.now();
    card.style.transition = 'none';
    card.style.zIndex = '1000';
    isDragging = true;
});

card.addEventListener('mousemove', (e) => {
    if (isDragging) {
        e.preventDefault();
        currentX = e.screenX;
        currentY = e.screenY;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        const rotate = (deltaX / window.innerWidth) * 30;
        card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotate}deg)`;
        card.style.zIndex = '1000';
    }
});

card.addEventListener('mouseup', (e) => {
    e.preventDefault();
    isDragging = false;
    const endX = e.screenX;
    const endY = e.screenY;
    const duration = Date.now() - startTime;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance <= maxTapDistance && duration <= maxTapDuration) {
        const audio = document.getElementById('card-audio');
        card.classList.add('glow');
        audio.play().catch(error => console.error('Error playing audio:', error));
        card.style.transform = 'translate(0, 0) rotate(0deg)';
        setTimeout(() => {
            card.classList.remove('glow');
        }, 600);
    } else if (distance > minSwipeDistance) {
        const angle = Math.atan2(deltaY, deltaX);
        const magnitude = distance * 5;
        const translateX = Math.cos(angle) * magnitude;
        const translateY = Math.sin(angle) * magnitude;
        const rotate = (deltaX / window.innerWidth) * 30;
        moveToNextCard(translateX, translateY, rotate);
    } else {
        card.style.transition = 'transform 0.3s ease';
        card.style.transform = 'translate(0, 0) rotate(0deg)';
    }
});

card.addEventListener('mouseleave', () => {
    if (isDragging) {
        isDragging = false;
        card.style.transition = 'transform 0.3s ease';
        card.style.transform = 'translate(0, 0) rotate(0deg)';
    }
});

document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case ' ':
            e.preventDefault();
            const audio = document.getElementById('card-audio');
            card.classList.add('glow');
            audio.play().catch(error => console.error('Error playing audio:', error));
            setTimeout(() => {
                card.classList.remove('glow');
            }, 600);
            break;
        case 'ArrowLeft':
            moveToNextCard(-window.innerWidth, 0, -15);
            break;
        case 'ArrowRight':
            moveToNextCard(window.innerWidth, 0, 15);
            break;
        case 'ArrowUp':
            moveToNextCard(0, -window.innerHeight, -10);
            break;
        case 'ArrowDown':
            moveToNextCard(0, window.innerHeight, 10);
            break;
    }
});

// Share icon functionality
const shareIcon = document.getElementById('share-icon');
shareIcon.addEventListener('click', () => {
    if (typeof html2canvas === 'undefined') {
        console.error('html2canvas is not loaded');
        alert('Snapshot feature is unavailable. Please try again later.');
        return;
    }
    shareIcon.classList.add('clicked');
    setTimeout(() => {
        shareIcon.classList.remove('clicked');
    }, 200);
    captureSnapshot();
});

// Function to capture snapshot
function captureSnapshot() {
    const cardContainer = document.getElementById('card-container');
    const canvas = document.getElementById('snapshot-canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions (increased by 50%)
    canvas.width = 1620; // 1080 * 1.5
    canvas.height = canvas.width * (16 / 9); // Maintain 9:16 aspect ratio
    ctx.fillStyle = '#35654d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scale = Math.min(canvas.width / window.innerWidth, canvas.height / window.innerHeight) * 0.8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scaledWidth = viewportWidth * scale;
    const scaledHeight = viewportHeight * scale;
    const offsetX = (canvas.width - scaledWidth) / 2;
    const offsetY = (canvas.height - scaledHeight) / 2;

    html2canvas(document.body, {
        width: window.innerWidth,
        height: window.innerHeight,
        scale: scale * 1.5, // Increase resolution by 50%
        backgroundColor: '#35654d'
    }).then(viewportCanvas => {
        ctx.drawImage(viewportCanvas, offsetX, offsetY, scaledWidth, scaledHeight);

        canvas.toBlob(blob => {
            if (!blob) {
                console.error('Failed to generate canvas blob');
                alert('Failed to create snapshot. Please try again.');
                return;
            }
            const file = new File([blob], 'vocabswipe-snapshot.png', { type: 'image/png' });
            const shareData = {
                files: [file],
                title: 'Check out my VocabSwipe snapshot!',
                text: 'Master words with VocabSwipe! Try it at VocabSwipe.com',
                url: 'https://VocabSwipe.com'
            };

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share(shareData).catch(error => {
                    console.error('Error sharing:', error);
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'vocabswipe-snapshot.png';
                    link.click();
                    URL.revokeObjectURL(link.href);
                    alert('Sharing not supported. Image downloaded instead.');
                });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'vocabswipe-snapshot.png';
                link.click();
                URL.revokeObjectURL(link.href);
                alert('Sharing not supported. Image downloaded instead.');
            }
        }, 'image/png');
    }).catch(error => {
        console.error('Error capturing viewport:', error);
        alert('Failed to capture snapshot. Please try again.');
    });
}

// Load data when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadVocabData();
});
