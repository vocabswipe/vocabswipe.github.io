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
        line1.style.transition = 'opacity 0.05s ease';
        line2.style.transition = 'opacity 0.05s ease';
        slogan.style.transition = 'opacity 0.05s ease';
        line1.style.opacity = '0';
        line2.style.opacity = '0';
        slogan.style.opacity = '0';

        setTimeout(() => {
            if (isEnglish) {
                line1.textContent = 'ประโยคภาษาอังกฤษอเมริกันที่จำเป็น';
                line2.textContent = 'การ์ดที่พร้อมใช้และยังเพิ่มขึ้นเรื่อย ๆ';
                slogan.textContent = 'ยิ่งปัด ยิ่งเก่งศัพท์';
                line1.classList.add('thai-text');
                line2.classList.add('thai-text');
                slogan.classList.add('thai-text');
            } else {
                line1.textContent = 'Essential American English Sentences';
                line2.textContent = 'cards available and still growing';
                slogan.textContent = 'Master Words, Swipe by Swipe';
                line1.classList.remove('thai-text');
                line2.classList.remove('thai-text');
                slogan.classList.remove('thai-text');
            }
            line1.style.opacity = '1';
            line2.style.opacity = '1';
            slogan.style.opacity = '1';
            isEnglish = !isEnglish;
        }, 50);
    }

    line1.textContent = 'Essential American English Sentences';
    line2.textContent = 'cards available and still growing';
    slogan.textContent = 'Master Words, Swipe by Swipe';
    line1.style.opacity = '1';
    line2.style.opacity = '1';
    slogan.style.opacity = '1';
    line1.classList.remove('thai-text');
    line2.classList.remove('thai-text');
    slogan.classList.remove('thai-text');

    setInterval(swapText, 20000);
}

// Function to check if it's night time in Thailand (10 PM - 6 AM)
function isThailandNightTime() {
    const now = new Date();
    const thailandTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const hours = thailandTime.getHours();
    return hours >= 22 || hours < 6;
}

// Function to detect if user is on mobile
function isMobileDevice() {
    return /Mobi|Android/i.test(navigator.userAgent);
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
        document.getElementById('next-card-5'),
        document.getElementById('next-card-6'),
        document.getElementById('next-card-7'),
        document.getElementById('next-card-8'),
        document.getElementById('next-card-9'),
        ...document.querySelectorAll('.card-stack')
    ];

    cards.forEach(card => {
        card.style.backgroundColor = cardBackgroundColor;
        card.style.borderColor = cardBorderColor;
        const contentElements = card.querySelectorAll('.word, .sentence');
        contentElements.forEach(element => {
            element.style.color = cardTextColor;
        });
    });
}

// Function to populate cards with content before animation
function populateCardsBeforeAnimation() {
    if (vocabData.length === 0) return;

    const isNight = isThailandNightTime();
    const cardTextColor = isNight ? '#FFD700' : '#000000';
    const isMobile = isMobileDevice();
    const showWelcome = visitCount <= 5;
    const currentCard = document.getElementById('vocab-card');
    const wordTopElement = document.getElementById('word-top');
    const wordBottomElement = document.getElementById('word-bottom');
    const englishElement = document.getElementById('english');
    const thaiElement = document.getElementById('thai');
    const audioElement = document.getElementById('card-audio');

    const nextCards = [
        { top: 'next-word-top-1', bottom: 'next-word-bottom-1', english: 'next-english-1', thai: 'next-thai-1' },
        { top: 'next-word-top-2', bottom: 'next-word-bottom-2', english: 'next-english-2', thai: 'next-thai-2' },
        { top: 'next-word-top-3', bottom: 'next-word-bottom-3', english: 'next-english-3', thai: 'next-thai-3' },
        { top: 'next-word-top-4', bottom: 'next-word-bottom-4', english: 'next-english-4', thai: 'next-thai-4' },
        { top: 'next-word-top-5', bottom: 'next-word-bottom-5', english: 'next-english-5', thai: 'next-thai-5' },
        { top: 'next-word-top-6', bottom: 'next-word-bottom-6', english: 'next-english-6', thai: 'next-thai-6' },
        { top: 'next-word-top-7', bottom: 'next-word-bottom-7', english: 'next-english-7', thai: 'next-thai-7' },
        { top: 'next-word-top-8', bottom: 'next-word-bottom-8', english: 'next-english-8', thai: 'next-thai-8' },
        { top: 'next-word-top-9', bottom: 'next-word-bottom-9', english: 'next-english-9', thai: 'next-thai-9' }
    ];

    // Populate current card
    if (currentIndex < vocabData.length) {
        let entry;
        if (showWelcome) {
            entry = vocabData.find(item => item.word === (isMobile ? 'VocabSwipe_mobile_user' : 'VocabSwipe_pc_user'));
            if (entry) {
                wordTopElement.textContent = 'VocabSwipe.com';
                wordBottomElement.textContent = 'VocabSwipe.com';
                wordTopElement.style.fontFamily = "'Bangers', cursive";
                wordBottomElement.style.fontFamily = "'Bangers', cursive";
                englishElement.textContent = entry.english;
                thaiElement.textContent = entry.thai;
                audioElement.src = `data/${entry.audio}`;
            }
        } else {
            entry = vocabData[currentIndex];
            wordTopElement.textContent = entry.word;
            wordBottomElement.textContent = entry.word;
            wordTopElement.style.fontFamily = "'Times New Roman', Times, serif";
            wordBottomElement.style.fontFamily = "'Times New Roman', Times, serif";
            englishElement.textContent = entry.english;
            thaiElement.textContent = entry.thai;
            audioElement.src = `data/${entry.audio}`;
        }
        wordTopElement.style.color = cardTextColor;
        wordBottomElement.style.color = cardTextColor;
        englishElement.style.color = cardTextColor;
        thaiElement.style.color = cardTextColor;
    }

    // Populate next cards
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
            nextWordTopElement.style.fontFamily = "'Times New Roman', Times, serif";
            nextWordBottomElement.style.fontFamily = "'Times New Roman', Times, serif";
        }
    });
}

// Function to animate card stack drop
function animateCardStackDrop(callback) {
    const cardContainer = document.getElementById('card-container');
    const cards = [
        document.querySelector('.card-stack-3'),
        document.querySelector('.card-stack-2'),
        document.querySelector('.card-stack-1'),
        document.getElementById('next-card-9'),
        document.getElementById('next-card-8'),
        document.getElementById('next-card-7'),
        document.getElementById('next-card-6'),
        document.getElementById('next-card-5'),
        document.getElementById('next-card-4'),
        document.getElementById('next-card-3'),
        document.getElementById('next-card-2'),
        document.getElementById('next-card-1'),
        document.getElementById('vocab-card')
    ];

    // Set initial state for animation (cards off-screen at top)
    cards.forEach((card, index) => {
        card.style.display = 'block'; // Make cards visible just before animation
        card.style.transition = 'none';
        card.style.transform = `translateY(-${window.innerHeight}px) rotate(${(cards.length - 1 - index) * 0.3249}deg)`; // Reduced by 10% from 0.36
        card.style.opacity = '0';
    });

    // Start animation after a brief delay
    setTimeout(() => {
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.style.transition = `transform ${0.8 + index * 0.2}s ease-out, opacity ${0.8 + index * 0.2}s ease-out`;
                const translateX = (cards.length - 1 - index) * 1.296; // Reduced by 10% from 1.44
                const translateY = (cards.length - 1 - index) * 1.296; // Reduced by 10% from 1.44
                const rotate = (cards.length - 1 - index) * 0.3249; // Reduced by 10% from 0.36
                card.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`;
                card.style.opacity = '1';
            }, index * 200);
        });

        // Call callback after animation completes
        setTimeout(() => {
            enableCardInteractions();
            callback();
        }, 1000 + (cards.length - 1) * 200);
    }, 100);
}

// Function to enable tap interactions for cards
function enableCardInteractions() {
    const topCard = document.getElementById('vocab-card');
    const nextCard = document.getElementById('next-card-1');

    // Tap handler for top card
    topCard.addEventListener('click', () => {
        if (!isDragging) {
            const audio = document.getElementById('card-audio');
            topCard.classList.add('glow');
            audio.play().catch(error => console.error('Error playing audio:', error));
            setTimeout(() => {
                topCard.classList.remove('glow');
            }, 600);
        }
    });

    // Tap handler for next card
    nextCard.addEventListener('click', () => {
        if (!isDragging && currentIndex + 1 < vocabData.length) {
            const nextEntry = vocabData[currentIndex + 1];
            const audio = new Audio(`data/${nextEntry.audio}`);
            nextCard.classList.add('glow');
            audio.play().catch(error => console.error('Error playing audio:', error));
            setTimeout(() => {
                nextCard.classList.remove('glow');
            }, 600);
        }
    });
}

// Function to fetch and parse JSONL file
async function loadVocabData() {
    try {
        setInitialCardTheme();
        const cards = [
            document.getElementById('vocab-card'),
            document.getElementById('next-card-1'),
            document.getElementById('next-card-2'),
            document.getElementById('next-card-3'),
            document.getElementById('next-card-4'),
            document.getElementById('next-card-5'),
            document.getElementById('next-card-6'),
            document.getElementById('next-card-7'),
            document.getElementById('next-card-8'),
            document.getElementById('next-card-9'),
            ...document.querySelectorAll('.card-stack')
        ];
        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.display = 'none'; // Ensure cards are hidden initially
        });

        const response = await fetch('data/database.jsonl');
        const text = await response.text();
        vocabData = text.trim().split('\n').map(line => JSON.parse(line));
        vocabData = vocabData.sort(() => Math.random() - 0.5);

        populateCardsBeforeAnimation();

        animateCardStackDrop(() => {
            displayCards();
            updateWebsiteStats();
            alternateStatsText();
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
    const isMobile = isMobileDevice();
    const showWelcome = visitCount <= 5;

    const currentCard = document.getElementById('vocab-card');
    const wordTopElement = document.getElementById('word-top');
    const wordBottomElement = document.getElementById('word-bottom');
    const englishElement = document.getElementById('english');
    const thaiElement = document.getElementById('thai');
    const audioElement = document.getElementById('card-audio');
    const nextCards = [
        { card: document.getElementById('next-card-1'), top: 'next-word-top-1', bottom: 'next-word-bottom-1', english: 'next-english-1', thai: 'next-thai-1', zIndex: 9, translateX: 1.296, translateY: 1.296, rotate: 0.3249 },
        { card: document.getElementById('next-card-2'), top: 'next-word-top-2', bottom: 'next-word-bottom-2', english: 'next-english-2', thai: 'next-thai-2', zIndex: 8, translateX: 2.592, translateY: 2.592, rotate: 0.6498 },
        { card: document.getElementById('next-card-3'), top: 'next-word-top-3', bottom: 'next-word-bottom-3', english: 'next-english-3', thai: 'next-thai-3', zIndex: 7, translateX: 3.888, translateY: 3.888, rotate: 0.9747 },
        { card: document.getElementById('next-card-4'), top: 'next-word-top-4', bottom: 'next-word-bottom-4', english: 'next-english-4', thai: 'next-thai-4', zIndex: 6, translateX: 5.184, translateY: 5.184, rotate: 1.2996 },
        { card: document.getElementById('next-card-5'), top: 'next-word-top-5', bottom: 'next-word-bottom-5', english: 'next-english-5', thai: 'next-thai-5', zIndex: 5, translateX: 6.48, translateY: 6.48, rotate: 1.6245 },
        { card: document.getElementById('next-card-6'), top: 'next-word-top-6', bottom: 'next-word-bottom-6', english: 'next-english-6', thai: 'next-thai-6', zIndex: 4, translateX: 7.776, translateY: 7.776, rotate: 1.9494 },
        { card: document.getElementById('next-card-7'), top: 'next-word-top-7', bottom: 'next-word-bottom-7', english: 'next-english-7', thai: 'next-thai-7', zIndex: 3, translateX: 9.072, translateY: 9.072, rotate: 2.2743 },
        { card: document.getElementById('next-card-8'), top: 'next-word-top-8', bottom: 'next-word-bottom-8', english: 'next-english-8', thai: 'next-thai-8', zIndex: 2, translateX: 10.368, translateY: 10.368, rotate: 2.5992 },
        { card: document.getElementById('next-card-9'), top: 'next-word-top-9', bottom: 'next-word-bottom-9', english: 'next-english-9', thai: 'next-thai-9', zIndex: 1, translateX: 11.664, translateY: 11.664, rotate: 2.9241 }
    ];
    const stackCards = document.querySelectorAll('.card-stack');

    // Current card
    if (currentIndex < vocabData.length) {
        let entry;
        if (showWelcome && currentIndex === 0) {
            entry = vocabData.find(item => item.word === (isMobile ? 'VocabSwipe_mobile_user' : 'VocabSwipe_pc_user'));
            if (entry) {
                wordTopElement.textContent = 'VocabSwipe.com';
                wordBottomElement.textContent = 'VocabSwipe.com';
                wordTopElement.style.fontFamily = "'Bangers', cursive";
                wordBottomElement.style.fontFamily = "'Bangers', cursive";
                englishElement.textContent = entry.english;
                thaiElement.textContent = entry.thai;
                audioElement.src = `data/${entry.audio}`;
            }
        } else {
            entry = vocabData[currentIndex];
            wordTopElement.textContent = entry.word;
            wordBottomElement.textContent = entry.word;
            wordTopElement.style.fontFamily = "'Times New Roman', Times, serif";
            wordBottomElement.style.fontFamily = "'Times New Roman', Times, serif";
            englishElement.textContent = entry.english;
            thaiElement.textContent = entry.thai;
            audioElement.src = `data/${entry.audio}`;
        }
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
            nextWordTopElement.style.fontFamily = "'Times New Roman', Times, serif";
            nextWordBottomElement.style.fontFamily = "'Times New Roman', Times, serif";
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
        card.style.transform = 'translate(0, 0) rotate(0deg)';
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

const card = document.querySelector('#vocab-card');

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
        const audio = document.querySelector('#card-audio');
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
        const audio = document.querySelector('#card-audio');
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
            const audio = document.querySelector('#card-audio');
            card.classList.add('glow');
            audio.play().catch(error => console.error('Error playing audio:', error));
            setTimeout(() => {
                card.classList.remove('glow');
            }, 600);
            break;
        case 'ArrowLeft':
            e.preventDefault();
            moveToNextCard(-window.innerWidth, 0, -15);
            break;
        case 'ArrowRight':
            e.preventDefault();
            moveToNextCard(window.innerWidth, 0, 15);
            break;
        case 'ArrowUp':
            e.preventDefault();
            moveToNextCard(0, -window.innerHeight, -10);
            break;
        case 'ArrowDown':
            e.preventDefault();
            moveToNextCard(0, window.innerHeight, 10);
            break;
    }
});

// Share icon functionality
const shareIcon = document.querySelector('#share-icon');
shareIcon.addEventListener('click', () => {
    if (typeof html2canvas === 'undefined') {
        console.error('html2canvas is not loaded');
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
    const canvas = document.querySelector('#snapshot-canvas');
    const ctx = canvas.getContext('2d');

    const viewportWidth = Math.min(window.innerWidth, 360);
    const viewportHeight = Math.min(window.innerHeight, 640);
    canvas.width = viewportWidth * window.devicePixelRatio;
    canvas.height = viewportHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.fillStyle = '#35654d';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    html2canvas(document.body, {
        width: viewportWidth,
        height: viewportHeight,
        scale: 2,
        backgroundColor: '#35654d',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
            const clonedCards = clonedDoc.querySelectorAll('.card');
            clonedCards.forEach(card => {
                card.style.transition = 'none';
                card.style.opacity = '1';
            });
            const clonedStats = clonedDoc.querySelector('.website-stats');
            clonedStats.style.transition = 'none';
            clonedStats.style.opacity = '1';
            const clonedText = clonedDoc.querySelectorAll('.count-text, .website-slogan');
            clonedText.forEach(text => {
                text.style.transition = 'none';
                text.style.opacity = '1';
            });
        }
    }).then(canvas => {
        ctx.drawImage(canvas, 0, 0, viewportWidth, viewportHeight);
        
        canvas.toBlob(blob => {
            if (!blob) {
                console.error('Failed to generate canvas blob');
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
                });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'vocabswipe-snapshot.png';
                link.click();
                URL.revokeObjectURL(link.href);
            }
        }, 'image/png', 1.0);
    }).catch(error => {
        console.error('Error:', error);
    });
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadVocabData();
});
