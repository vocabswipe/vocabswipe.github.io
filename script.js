// script.js remains mostly the same, with minor adjustments for theme consistency
// (e.g., card colors, but those are handled in CSS). No functional changes needed for tap/swipe.

// Array to hold vocabulary entries
let vocabData = [];
let originalVocabLength = 0; // Store original length for stats
let currentIndex = 0;
let hasSwiped = false; // Flag to track if user has swiped

// Track visit count
let visitCount = parseInt(localStorage.getItem('visitCount') || '0');
visitCount++;
localStorage.setItem('visitCount', visitCount);

// Initialize swiped cards from localStorage
let swipedCards = JSON.parse(localStorage.getItem('swipedCards') || '[]');

// jQuery number animation plugin (unchanged)
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
    
    // Show progress bar container after first swipe
    if (hasSwiped && swipedCount > 0) {
        const progressContainer = document.querySelector('.progress-bar-container');
        progressContainer.style.opacity = '1';
        progressContainer.style.transition = 'opacity 1s ease';
        progressLabel.style.opacity = '1';
        progressValue.style.opacity = '1';
    }
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
    progressLabel.textContent = 'Words Flowed';

    // Fade in all progress bar elements
    progressContainer.style.transition = 'opacity 1s ease';
    progressContainer.style.opacity = '1';
    progressLabel.style.transition = 'opacity 1s ease';
    progressLabel.style.opacity = '1';
    progressValue.style.transition = 'opacity 1s ease';
    progressValue.style.opacity = '1';
}

// Function to set initial card theme – updated for west coast humble style (earthy beige cards, black text)
function setInitialCardTheme() {
    const cardBackgroundColor = '#E0C9A6'; // Earthy beige for humble, west coast sunset vibe
    const cardTextColor = '#000000';
    const cardBorderColor = '#8B4513'; // Brown border for grounded feel

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

// Function to populate cards with content before animation (minor updates for text color)
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
        { top: 'next-word-top-9', bottom: 'next-word-bottom-9', english: 'next-english-9', thai: 'next-thai-9' }
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

// The rest of script.js remains unchanged...
// (Omitted for brevity, as no further changes are needed for the redesign. Copy the remaining functions from the original.)
