// Array to hold vocabulary entries
let vocabData = [];
let originalVocabLength = 0; // Store original length for stats
let currentIndex = 0;
let hasSwiped = false; // Flag to track if user has swiped
let isEnglish = true; // Track language state for synchronization

// Track visit count
let visitCount = parseInt(localStorage.getItem('visitCount') || '0');
visitCount++;
localStorage.setItem('visitCount', visitCount);

// Initialize swiped cards from localStorage
let swipedCards = JSON.parse(localStorage.getItem('swipedCards') || '[]');

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
    const statsNumberElement = document.querySelector('.stats-number');
    const countNumberElement = $('.count-number');
    countNumberElement.data('to', originalVocabLength); // Use original length for stats
    countNumberElement.data('countToOptions', {
        formatter: function (value, options) {
            return value.toFixed(options.decimals).replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
        }
    });
    countNumberElement.countTo();
    statsNumberElement.style.opacity = '1'; // Ensure immediate visibility
}

// Function to update progress bar
function updateProgressBar() {
    const progressFill = document.getElementById('progress-fill');
    const progressValue = document.getElementById('progress-value');
    const progressLabel = document.getElementById('progress-label');
    const totalCards = originalVocabLength;
    const swipedCount = swipedCards.length;
    const percentage = totalCards > 0 ? (swipedCount / totalCards) * 100 : 0;
    
    progressFill.style.width = `${percentage}%`;
    progressValue.textContent = swipedCount.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
    
    // Show progress bar container and apply brighten and glow effect after first swipe
    if (hasSwiped && swipedCount > 0) {
        const progressContainer = document.querySelector('.progress-bar-container');
        progressContainer.style.opacity = '1';
        progressContainer.style.transition = 'opacity 1s ease';
        progressLabel.style.opacity = '1';
        progressValue.style.opacity = '1';
        progressFill.classList.add('progress-brighten', 'progress-glow');
        setTimeout(() => {
            progressFill.classList.remove('progress-brighten', 'progress-glow');
        }, 300); // Duration of the brighten and glow effect
    }
}

// Function to alternate stats text, slogan, and progress label between English and Thai
function alternateStatsText() {
    const line1 = document.getElementById('stats-line1');
    const slogan = document.querySelector('.website-slogan');
    const progressLabel = document.getElementById('progress-label');

    function swapText() {
        line1.style.transition = 'opacity 0.05s ease';
        slogan.style.transition = 'opacity 0.05s ease';
        progressLabel.style.transition = 'opacity 0.05s ease';
        line1.style.opacity = '0';
        slogan.style.opacity = '0';
        progressLabel.style.opacity = '0';

        setTimeout(() => {
            if (isEnglish) {
                line1.textContent = 'ประโยคภาษาอังกฤษอเมริกันที่จำเป็น';
                slogan.textContent = 'ยิ่งปัด ยิ่งเก่ง';
                progressLabel.textContent = 'จำนวนการ์ดที่ปัดไปแล้ว';
                line1.classList.add('thai-text');
                slogan.classList.add('thai-text');
                progressLabel.classList.add('thai-text');
            } else {
                line1.textContent = 'Essential American English Sentences';
                slogan.textContent = 'Master Words, Swipe by Swipe';
                progressLabel.textContent = 'Swiped Cards';
                line1.classList.remove('thai-text');
                slogan.classList.remove('thai-text');
                progressLabel.classList.remove('thai-text');
            }
            line1.style.opacity = '1';
            slogan.style.opacity = '1';
            progressLabel.style.opacity = '1';
            isEnglish = !isEnglish;
        }, 50);
    }

    // Initial setup
    line1.textContent = 'Essential American English Sentences';
    slogan.textContent = 'Master Words, Swipe by Swipe';
    progressLabel.textContent = 'Swiped Cards';
    line1.style.opacity = '1';
    slogan.style.opacity = '1';
    progressLabel.style.opacity = '0'; // Initially hidden
    line1.classList.remove('thai-text');
    slogan.classList.remove('thai-text');
    progressLabel.classList.remove('thai-text');

    setInterval(swapText, 20000);
}

// Function to show progress bar after data fetch
function showProgressBar() {
    const progressContainer = document.querySelector('.progress-bar-container');
    const progressLabel = document.getElementById('progress-label');
    const progressValue = document.getElementById('progress-value');
    const progressFill = document.getElementById('progress-fill');
    
    // Set initial progress bar values
    const totalCards = originalVocabLength;
    const swipedCount = swipedCards.length;
    const percentage = totalCards > 0 ? (swipedCount / totalCards) * 100 : 0;
    
    progressFill.style.width = `${percentage}%`;
    progressValue.textContent = swipedCount.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
    progressLabel.textContent = isEnglish ? 'Swiped Cards' : 'จำนวนการ์ดที่ปัดไปแล้ว';
    progressLabel.classList.toggle('thai-text', !isEnglish);

    // Fade in all progress bar elements
    progressContainer.style.transition = 'opacity 1s ease';
    progressContainer.style.opacity = '1';
    progressLabel.style.transition = 'opacity 1s ease';
    progressLabel.style.opacity = '1';
    progressValue.style.transition = 'opacity 1s ease';
    progressValue.style.opacity = '1';
}

// Function to set initial card theme
function setInitialCardTheme() {
    const cardBackgroundColor = '#FFF8DC';
    const cardTextColor = '#000000';
    const cardBorderColor = '#000000';

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

    const cardTextColor = '#000000';
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
        { top: 'next-word-top-9', bottom: 'next-word-top-9', bottom: 'next-word-bottom-9', english: 'next-english-9', thai: 'next-thai-9' }
    ];

    // Populate current card
    if (currentIndex < vocabData.length) {
        const entry = vocabData[currentIndex];
        wordTopElement.textContent = entry.word;
        wordBottomElement.textContent = entry.word;
        wordTopElement.style.fontFamily = "'Times New Roman', Times, serif";
        wordBottomElement.style.fontFamily = "'Times New Roman', Times, serif";
        englishElement.textContent = entry.english;
        thaiElement.textContent = entry.thai;
        audioElement.src = `data/${entry.audio}`;
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
        card.style.transform = `translateY(-${window.innerHeight}px) rotate(${(cards.length - 1 - index) * 0.3249}deg)`;
        card.style.opacity = '0';
    });

    // Start animation after a brief delay
    setTimeout(() => {
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.style.transition = `transform ${0.8 + index * 0.2}s ease-out, opacity ${0.8 + index * 0.2}s ease-out`;
                const translateX = (cards.length - 1 - index) * 1.296;
                const translateY = (cards.length - 1 - index) * 1.296;
                const rotate = (cards.length - 1 - index) * 0.3249;
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
    topCard.addEventListener('click', (e) => {
        if (!hasMoved) { // Only trigger audio if no movement occurred
            const audio = document.getElementById('card-audio');
            topCard.classList.add('glow');
            audio.play().catch(error => console.error('Error playing audio:', error));
            // Send audio play event to Google Analytics
            gtag('event', 'audio_play', {
                'event_category': 'Engagement',
                'event_label': `Card_${vocabData[currentIndex].originalIndex}_Audio`,
                'value': 1
            });
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
            // Send audio play event to Google Analytics for next card
            gtag('event', 'audio_play', {
                'event_category': 'Engagement',
                'event_label': `Card_${nextEntry.originalIndex}_Audio`,
                'value': 1
            });
            setTimeout(() => {
                nextCard.classList.remove('glow');
            }, 600);
        }
    });
}

// Function to start tutorial animation for first 1000 visits
function startTutorialAnimation() {
    if (visitCount > 5) return; // Skip if beyond 5 visits

    const handpoint = document.getElementById('handpoint');
    const topCard = document.getElementById('vocab-card');
    const audio = document.getElementById('card-audio');

    // Position handpoint at card center
    handpoint.style.display = 'block';
    handpoint.style.opacity = '0';
    handpoint.style.left = '50%';
    handpoint.style.top = '50%';
    handpoint.style.transform = 'translate(-50%, -50%)';

    // Fade in handpoint after 2 seconds
    setTimeout(() => {
        handpoint.style.transition = 'opacity 0.5s ease';
        handpoint.style.opacity = '1';

        // Tap animation after fade-in
        setTimeout(() => {
            handpoint.classList.add('tap-effect');
            topCard.classList.add('glow');
            audio.play().catch(error => console.error('Error playing audio:', error));
            // Send audio play event to Google Analytics for tutorial
            gtag('event', 'audio_play', {
                'event_category': 'Engagement',
                'event_label': `Card_${vocabData[currentIndex].originalIndex}_Audio_Tutorial`,
                'value': 1
            });
            // Remove tap effect and glow
            setTimeout(() => {
                handpoint.classList.remove('tap-effect');
                topCard.classList.remove('glow');

                // Pause for 1 second before swipe
                setTimeout(() => {
                    // Generate random angle for swipe (0 to 360 degrees)
                    const angle = Math.random() * 2 * Math.PI; // Random angle in radians
                    const magnitude = window.innerWidth * 1.5; // Swipe distance
                    const translateX = Math.cos(angle) * magnitude;
                    const translateY = Math.sin(angle) * magnitude;
                    const rotate = (translateX / window.innerWidth) * 30; // Rotation based on swipe direction

                    // Animate handpoint and card together
                    topCard.style.transition = 'transform 1.5s ease, opacity 1.5s ease';
                    handpoint.style.transition = 'transform 1.5s ease';
                    topCard.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`;
                    topCard.style.opacity = '0';
                    handpoint.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`;

                    // Reset after swipe animation
                    setTimeout(() => {
                        handpoint.style.display = 'none';
                        moveToNextCard(translateX, translateY, rotate, true); // isAnimation=true to skip progress bar update
                    }, 1500);
                }, 2000);
            }, 600); // Duration of tap and glow
        }, 500); // After fade-in
    }, 2000);
}

// Function to fetch and parse JSONL file with lazy loading
async function loadVocabData() {
    try {
        const spinner = document.getElementById('loading-spinner');
        spinner.style.display = 'block'; // Show spinner

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

        // Initialize stats display immediately
        const statsNumberElement = document.querySelector('.stats-number');
        statsNumberElement.style.opacity = '1';
        alternateStatsText(); // Start text alternation immediately

        // Hide progress bar initially
        const progressContainer = document.querySelector('.progress-bar-container');
        const progressLabel = document.getElementById('progress-label');
        const progressValue = document.getElementById('progress-value');
        progressContainer.style.opacity = '0';
        progressLabel.style.opacity = '0';
        progressValue.style.opacity = '0';

        // Fetch and parse initial batch (first 200 entries)
        const response = await fetch('data/database.jsonl');
        const text = await response.text();
        const lines = text.trim().split('\n');
        originalVocabLength = lines.length; // Store total length for stats
        const initialBatchSize = 200;
        let allVocab = lines.slice(0, initialBatchSize).map(line => JSON.parse(line));
        allVocab = allVocab.map((item, index) => ({ ...item, originalIndex: index }));
        vocabData = allVocab.filter(item => !swipedCards.includes(item.originalIndex));
        if (vocabData.length === 0) {
            swipedCards = [];
            localStorage.setItem('swipedCards', JSON.stringify(swipedCards));
            vocabData = allVocab.slice();
        }
        vocabData = vocabData.sort(() => Math.random() - 0.5);

        // Start stats number animation and card animation
        updateWebsiteStats();
        populateCardsBeforeAnimation();
        animateCardStackDrop(() => {
            displayCards();
            spinner.style.display = 'none'; // Hide spinner after animation
            showProgressBar(); // Show progress bar after data fetch
            startTutorialAnimation(); // Start tutorial animation after card stack
        });

        // Load remaining data in the background
        setTimeout(async () => {
            const remainingVocab = lines.slice(initialBatchSize).map((line, index) =>
                JSON.parse(line)).map((item, index) => ({
                    ...item,
                    originalIndex: index + initialBatchSize
                }));
            allVocab = allVocab.concat(remainingVocab);
            vocabData = allVocab.filter(item => !swipedCards.includes(item.originalIndex));
            if (vocabData.length === 0) {
                swipedCards = [];
                localStorage.setItem('swipedCards', JSON.stringify(swipedCards));
                vocabData = allVocab.slice();
            }
            vocabData = vocabData.sort(() => Math.random() - 0.5);
            populateCardsBeforeAnimation();
            showProgressBar(); // Update progress bar after full data load
        }, 0);
    } catch (error) {
        console.error('Error loading database:', error);
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('word-top').textContent = 'Error';
        document.getElementById('word-bottom').textContent = 'Error';
        document.getElementById('english').textContent = 'Failed to load data';
        document.getElementById('thai').textContent = '';
    }
}

// Function to display the current and next cards
function displayCards() {
    if (vocabData.length === 0) return;

    const cardBackgroundColor = '#FFF8DC';
    const cardTextColor = '#000000';
    const cardBorderColor = '#000000';

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
        const entry = vocabData[currentIndex];
        wordTopElement.textContent = entry.word;
        wordBottomElement.textContent = entry.word;
        wordTopElement.style.fontFamily = "'Times New Roman', Times, serif";
        wordBottomElement.style.fontFamily = "'Times New Roman', Times, serif";
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
function moveToNextCard(translateX, translateY, rotate, isAnimation = false) {
    const card = document.getElementById('vocab-card');
    card.style.transition = 'transform 0.75s ease, opacity 0.75s ease';
    card.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`;
    card.style.opacity = '0';
    card.style.zIndex = '2000'; // Ensure top card is above containers during swipe
    // Only update swipedCards and hasSwiped for user-initiated swipes
    if (!isAnimation) {
        const originalIndex = vocabData[currentIndex].originalIndex;
        if (!swipedCards.includes(originalIndex)) {
            swipedCards.push(originalIndex);
            localStorage.setItem('swipedCards', JSON.stringify(swipedCards));
            // Send swipe event to Google Analytics
            gtag('event', 'card_swipe', {
                'event_category': 'Engagement',
                'event_label': `Card_${originalIndex}`,
                'value': 1
            });
        }
        hasSwiped = true;
        updateProgressBar();
    }
    setTimeout(() => {
        currentIndex = (currentIndex + 1) % vocabData.length;
        displayCards();
        card.style.transition = 'none';
    }, 750);
}

// Touch and mouse handling
let isDragging = false;
let hasMoved = false; // Track if mouse moved during mousedown
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
        card.style.zIndex = '2000'; // Ensure top card is above containers during swipe
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
        card.style.zIndex = '2000'; // Ensure top card is above containers during swipe
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
        // Send audio play event to Google Analytics
        gtag('event', 'audio_play', {
            'event_category': 'Engagement',
            'event_label': `Card_${vocabData[currentIndex].originalIndex}_Audio`,
            'value': 1
        });
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
    card.style.zIndex = '2000'; // Ensure top card is above containers during swipe
    isDragging = true;
    hasMoved = false; // Reset hasMoved on mousedown
});

card.addEventListener('mousemove', (e) => {
    if (isDragging) {
        e.preventDefault();
        currentX = e.screenX;
        currentY = e.screenY;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > maxTapDistance) {
            hasMoved = true; // Mark as moved if distance exceeds tap threshold
        }
        const rotate = (deltaX / window.innerWidth) * 30;
        card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotate}deg)`;
        card.style.zIndex = '2000'; // Ensure top card is above containers during swipe
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

    if (distance <= maxTapDistance && duration <= maxTapDuration && !hasMoved) {
        const audio = document.querySelector('#card-audio');
        card.classList.add('glow');
        audio.play().catch(error => console.error('Error playing audio:', error));
        // Send audio play event to Google Analytics
        gtag('event', 'audio_play', {
            'event_category': 'Engagement',
            'event_label': `Card_${vocabData[currentIndex].originalIndex}_Audio`,
            'value': 1
        });
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
            // Send audio play event to Google Analytics
            gtag('event', 'audio_play', {
                'event_category': 'Engagement',
                'event_label': `Card_${vocabData[currentIndex].originalIndex}_Audio`,
                'value': 1
            });
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
    captureSnapshot();
});

// Function to capture snapshot
function captureSnapshot() {
    const canvas = document.querySelector('#snapshot-canvas');
    const ctx = canvas.getContext('2d');
    const mainContent = document.querySelector('.main-content');

    // Set canvas size to match mobile viewport (360px × 640px)
    const viewportWidth = 360;
    const viewportHeight = 640;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = viewportWidth * pixelRatio;
    canvas.height = viewportHeight * pixelRatio;
    ctx.scale(pixelRatio, pixelRatio);

    // Set background color to match the page
    ctx.fillStyle = '#35654d';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    html2canvas(mainContent, {
        width: viewportWidth,
        height: viewportHeight,
        scale: pixelRatio,
        backgroundColor: '#35654d',
        useCORS: true,
        logging: false,
        x: 0,
        y: 0
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
                    // Fallback to download using the same blob
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'vocabswipe-snapshot.png';
                    link.click();
                    URL.revokeObjectURL(link.href);
                });
            } else {
                // Download using the same blob
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'vocabswipe-snapshot.png';
                link.click();
                URL.revokeObjectURL(link.href);
            }
        }, 'image/png', 1.0);
    }).catch(error => {
        console.error('Error capturing snapshot:', error);
    });
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadVocabData();
});

