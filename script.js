// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCdvEuh27Y0Oa6YDvlfq6Uvfheiwd4kMQE",
    authDomain: "vocabswipe-35b93.firebaseapp.com",
    projectId: "vocabswipe-35b93",
    storageBucket: "vocabswipe-35b93.firebasestorage.app",
    messagingSenderId: "750129637200",
    appId: "1:750129637200:web:138ea980ab41861cf7ee55",
    measurementId: "G-F9HFL0SNPY"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized:', firebase.app().name);
} catch (error) {
    console.error('Firebase initialization error:', error.message);
}
const auth = firebase.auth();
const analytics = firebase.analytics();

// Authentication logic
const loginButton = document.getElementById('login-button');
const loginModal = document.getElementById('login-modal');
const closeModal = document.getElementById('close-modal');
const googleLogin = document.getElementById('google-login');

if (!loginButton || !loginModal || !closeModal || !googleLogin) {
    console.error('Authentication elements missing:', {
        loginButton: !!loginButton,
        loginModal: !!loginModal,
        closeModal: !!closeModal,
        googleLogin: !!googleLogin
    });
} else {
    loginButton.addEventListener('click', () => {
        console.log('Login button clicked');
        loginModal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        console.log('Close modal clicked');
        loginModal.style.display = 'none';
    });

    googleLogin.addEventListener('click', () => {
        console.log('Google login clicked');
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then(result => {
                loginModal.style.display = 'none';
                console.log('Logged in user:', result.user.uid);
                loginButton.textContent = 'Profile';
                analytics.logEvent('login', { method: 'google' });
            })
            .catch(error => console.error('Google login error:', error.message, error.code));
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            loginButton.textContent = 'Profile';
            console.log('User logged in:', user.uid);
        } else {
            loginButton.textContent = 'Login';
            console.log('No user logged in');
        }
    });
}

// Array to hold vocabulary entries
let vocabData = [];
let originalVocabLength = 0;
let currentIndex = 0;
let hasSwiped = false;
let isEnglish = true;

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
                from: $(this).data('from'),
                to: $(this).data('to'),
                speed: $(this).data('speed'),
                refreshInterval: $(this).data('refresh-interval'),
                decimals: $(this).data('decimals')
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
    if (!statsNumberElement || !countNumberElement.length) {
        console.error('Stats elements missing for updateWebsiteStats');
        return;
    }
    countNumberElement.data('to', originalVocabLength);
    countNumberElement.data('countToOptions', {
        formatter: function (value, options) {
            return value.toFixed(options.decimals).replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
        }
    });
    countNumberElement.countTo();
    statsNumberElement.style.opacity = '1';
}

// Function to update progress bar
function updateProgressBar() {
    const progressFill = document.getElementById('progress-fill');
    const progressValue = document.getElementById('progress-value');
    const progressLabel = document.getElementById('progress-label');
    if (!progressFill || !progressValue || !progressLabel) {
        console.error('Progress bar elements missing');
        return;
    }
    const totalCards = originalVocabLength;
    const swipedCount = swipedCards.length;
    const percentage = totalCards > 0 ? (swipedCount / totalCards) * 100 : 0;
    
    progressFill.style.width = `${percentage}%`;
    progressValue.textContent = swipedCount.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
    
    if (hasSwiped && swipedCount > 0) {
        const progressContainer = document.querySelector('.progress-bar-container');
        if (progressContainer) {
            progressContainer.style.opacity = '1';
            progressContainer.style.transition = 'opacity 1s ease';
            progressLabel.style.opacity = '1';
            progressValue.style.opacity = '1';
            progressFill.classList.add('progress-brighten', 'progress-glow');
            setTimeout(() => {
                progressFill.classList.remove('progress-brighten', 'progress-glow');
            }, 300);
        }
    }
}

// Function to alternate stats text, slogan, and progress label between English and Thai
function alternateStatsText() {
    const line1 = document.getElementById('stats-line1');
    const slogan = document.querySelector('.website-slogan');
    const progressLabel = document.getElementById('progress-label');
    if (!line1 || !slogan || !progressLabel) {
        console.error('Text elements missing for alternateStatsText');
        return;
    }

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

    line1.textContent = 'Essential American English Sentences';
    slogan.textContent = 'Master Words, Swipe by Swipe';
    progressLabel.textContent = 'Swiped Cards';
    line1.style.opacity = '1';
    slogan.style.opacity = '1';
    progressLabel.style.opacity = '0';
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
    if (!progressContainer || !progressLabel || !progressValue || !progressFill) {
        console.error('Progress bar elements missing for showProgressBar');
        return;
    }
    
    const totalCards = originalVocabLength;
    const swipedCount = swipedCards.length;
    const percentage = totalCards > 0 ? (swipedCount / totalCards) * 100 : 0;
    
    progressFill.style.width = `${percentage}%`;
    progressValue.textContent = swipedCount.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
    progressLabel.textContent = isEnglish ? 'Swiped Cards' : 'จำนวนการ์ดที่ปัดไปแล้ว';
    progressLabel.classList.toggle('thai-text', !isEnglish);

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
        if (card) {
            card.style.backgroundColor = cardBackgroundColor;
            card.style.borderColor = cardBorderColor;
            const contentElements = card.querySelectorAll('.word, .sentence');
            contentElements.forEach(element => {
                element.style.color = cardTextColor;
            });
        }
    });
}

// Function to populate cards with content before animation
function populateCardsBeforeAnimation() {
    if (vocabData.length === 0) {
        console.warn('No vocab data to populate cards');
        return;
    }

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

    if (!currentCard || !wordTopElement || !wordBottomElement || !englishElement || !thaiElement || !audioElement) {
        console.error('Current card elements missing');
        return;
    }

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

    nextCards.forEach((next, index) => {
        if (currentIndex + index + 1 < vocabData.length) {
            const nextEntry = vocabData[currentIndex + index + 1];
            const nextWordTopElement = document.getElementById(next.top);
            const nextWordBottomElement = document.getElementById(next.bottom);
            const nextEnglishElement = document.getElementById(next.english);
            const nextThaiElement = document.getElementById(next.thai);
            if (!nextWordTopElement || !nextWordBottomElement || !nextEnglishElement || !nextThaiElement) {
                console.error(`Next card elements missing for index ${index + 1}`);
                return;
            }
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

    if (!cardContainer || cards.some(card => !card)) {
        console.error('Card container or cards missing for animation');
        callback();
        return;
    }

    cards.forEach((card, index) => {
        card.style.display = 'block';
        card.style.transition = 'none';
        card.style.transform = `translateY(-${window.innerHeight}px) rotate(${(cards.length - 1 - index) * 0.3249}deg)`;
        card.style.opacity = '0';
    });

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
    if (!topCard || !nextCard) {
        console.error('Card elements missing for interactions');
        return;
    }

    topCard.addEventListener('click', (e) => {
        if (!hasMoved) {
            const audio = document.getElementById('card-audio');
            if (audio) {
                topCard.classList.add('glow');
                audio.play().catch(error => console.error('Error playing audio:', error));
                setTimeout(() => {
                    topCard.classList.remove('glow');
                }, 600);
            }
        }
    });

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

// Function to start tutorial animation for first 1000 visits
function startTutorialAnimation() {
    if (visitCount > 1000) return;

    const handpoint = document.getElementById('handpoint');
    const topCard = document.getElementById('vocab-card');
    const audio = document.getElementById('card-audio');
    if (!handpoint || !topCard || !audio) {
        console.error('Tutorial elements missing');
        return;
    }

    handpoint.style.display = 'block';
    handpoint.style.opacity = '0';
    handpoint.style.left = '50%';
    handpoint.style.top = '50%';
    handpoint.style.transform = 'translate(-50%, -50%)';

    setTimeout(() => {
        handpoint.style.transition = 'opacity 0.5s ease';
        handpoint.style.opacity = '1';

        setTimeout(() => {
            handpoint.classList.add('tap-effect');
            topCard.classList.add('glow');
            audio.play().catch(error => console.error('Error playing audio:', error));

            setTimeout(() => {
                handpoint.classList.remove('tap-effect');
                topCard.classList.remove('glow');

                setTimeout(() => {
                    const angle = Math.random() * 2 * Math.PI;
                    const magnitude = window.innerWidth * 1.5;
                    const translateX = Math.cos(angle) * magnitude;
                    const translateY = Math.sin(angle) * magnitude;
                    const rotate = (translateX / window.innerWidth) * 30;

                    topCard.style.transition = 'transform 1.5s ease, opacity 1.5s ease';
                    handpoint.style.transition = 'transform 1.5s ease';
                    topCard.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`;
                    topCard.style.opacity = '0';
                    handpoint.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`;

                    setTimeout(() => {
                        handpoint.style.display = 'none';
                        moveToNextCard(translateX, translateY, rotate, true);
                    }, 1500);
                }, 2000);
            }, 600);
        }, 500);
    }, 2000);
}

// Function to fetch and parse JSONL file with lazy loading
async function loadVocabData() {
    try {
        console.log('Starting loadVocabData');
        const spinner = document.getElementById('loading-spinner');
        if (!spinner) {
            console.error('Loading spinner element missing');
            return;
        }
        spinner.style.display = 'block';

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
        if (cards.some(card => !card)) {
            console.error('Some card elements are missing');
            return;
        }
        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.display = 'none';
        });

        const statsNumberElement = document.querySelector('.stats-number');
        if (!statsNumberElement) {
            console.error('Stats number element missing');
        } else {
            statsNumberElement.style.opacity = '1';
        }
        alternateStatsText();

        const progressContainer = document.querySelector('.progress-bar-container');
        const progressLabel = document.getElementById('progress-label');
        const progressValue = document.getElementById('progress-value');
        if (!progressContainer || !progressLabel || !progressValue) {
            console.error('Progress bar elements missing');
        } else {
            progressContainer.style.opacity = '0';
            progressLabel.style.opacity = '0';
            progressValue.style.opacity = '0';
        }

        console.log('Fetching data/database.jsonl');
        const response = await fetch('data/database.jsonl');
        if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
        }
        const text = await response.text();
        const lines = text.trim().split('\n');
        originalVocabLength = lines.length;
        const initialBatchSize = 200;
        let allVocab = lines.slice(0, initialBatchSize).map((line, index) => {
            try {
                return { ...JSON.parse(line), originalIndex: index };
            } catch (e) {
                console.error(`Error parsing JSONL line ${index}:`, e);
                return null;
            }
        }).filter(item => item !== null);
        vocabData = allVocab.filter(item => !swipedCards.includes(item.originalIndex));
        if (vocabData.length === 0) {
            swipedCards = [];
            localStorage.setItem('swipedCards', JSON.stringify(swipedCards));
            vocabData = allVocab.slice();
        }
        vocabData = vocabData.sort(() => Math.random() - 0.5);
        console.log(`Loaded ${vocabData.length} vocab entries initially`);

        updateWebsiteStats();
        populateCardsBeforeAnimation();
        console.log('Starting card stack animation');
        animateCardStackDrop(() => {
            console.log('Card stack animation complete, displaying cards');
            displayCards();
            spinner.style.display = 'none';
            showProgressBar();
            startTutorialAnimation();
        });

        setTimeout(async () => {
            const remainingVocab = lines.slice(initialBatchSize).map((line, index) => {
                try {
                    return { ...JSON.parse(line), originalIndex: index + initialBatchSize };
                } catch (e) {
                    console.error(`Error parsing JSONL line ${index + initialBatchSize}:`, e);
                    return null;
                }
            }).filter(item => item !== null);
            allVocab = allVocab.concat(remainingVocab);
            vocabData = allVocab.filter(item => !swipedCards.includes(item.originalIndex));
            if (vocabData.length === 0) {
                swipedCards = [];
                localStorage.setItem('swipedCards', JSON.stringify(swipedCards));
                vocabData = allVocab.slice();
            }
            vocabData = vocabData.sort(() => Math.random() - 0.5);
            console.log(`Loaded ${vocabData.length} total vocab entries`);
            populateCardsBeforeAnimation();
            showProgressBar();
        }, 0);
    } catch (error) {
        console.error('Error in loadVocabData:', error.message);
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.style.display = 'none';
        document.getElementById('word-top').textContent = 'Error';
        document.getElementById('word-bottom').textContent = 'Error';
        document.getElementById('english').textContent = 'Failed to load data';
        document.getElementById('thai').textContent = '';
    }
}

// Function to display the current and next cards
function displayCards() {
    if (vocabData.length === 0) {
        console.warn('No vocab data to display cards');
        return;
    }

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

    if (!currentCard || !wordTopElement || !wordBottomElement || !englishElement || !thaiElement || !audioElement) {
        console.error('Current card elements missing for display');
        return;
    }

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

    nextCards.forEach((next, index) => {
        if (currentIndex + index + 1 < vocabData.length) {
            const nextEntry = vocabData[currentIndex + 1];
            const nextWordTopElement = document.getElementById(next.top);
            const nextWordBottomElement = document.getElementById(next.bottom);
            const nextEnglishElement = document.getElementById(next.english);
            const nextThaiElement = document.getElementById(next.thai);
            if (!next.card || !nextWordTopElement || !nextWordBottomElement || !nextEnglishElement || !nextThaiElement) {
                console.error(`Next card elements missing for index ${index + 1}`);
                return;
            }
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
            if (next.card) next.card.style.opacity = '0';
        }
    });

    stackCards.forEach((card, index) => {
        if (card) {
            card.style.backgroundColor = cardBackgroundColor;
            card.style.borderColor = cardBorderColor;
        }
    });
}

// Function to animate and move to next card
function moveToNextCard(translateX, translateY, rotate, isAnimation = false) {
    const card = document.getElementById('vocab-card');
    if (!card) {
        console.error('Vocab card missing for moveToNextCard');
        return;
    }
    card.style.transition = 'transform 0.75s ease, opacity 0.75s ease';
    card.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`;
    card.style.opacity = '0';
    card.style.zIndex = '2000';
    if (!isAnimation) {
        const originalIndex = vocabData[currentIndex]?.originalIndex;
        if (originalIndex !== undefined && !swipedCards.includes(originalIndex)) {
            swipedCards.push(originalIndex);
            localStorage.setItem('swipedCards', JSON.stringify(swipedCards));
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
let hasMoved = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let startTime = 0;
const minSwipeDistance = 50;
const maxTapDistance = 10;
const maxTapDuration = 300;

const card = document.querySelector('#vocab-card');
if (!card) {
    console.error('Vocab card missing for touch/mouse events');
} else {
    card.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            e.preventDefault();
            startX = e.changedTouches[0].screenX;
            startY = e.changedTouches[0].screenY;
            currentX = startX;
            currentY = startY;
            startTime = Date.now();
            card.style.transition = 'none';
            card.style.zIndex = '2000';
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
            card.style.zIndex = '2000';
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
            if (audio) {
                card.classList.add('glow');
                audio.play().catch(error => console.error('Error playing audio:', error));
                card.style.transform = 'translate(0, 0) rotate(0deg)';
                setTimeout(() => {
                    card.classList.remove('glow');
                }, 600);
            }
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
        card.style.zIndex = '2000';
        isDragging = true;
        hasMoved = false;
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
                hasMoved = true;
            }
            const rotate = (deltaX / window.innerWidth) * 30;
            card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotate}deg)`;
            card.style.zIndex = '2000';
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
            if (audio) {
                card.classList.add('glow');
                audio.play().catch(error => console.error('Error playing audio:', error));
                card.style.transform = 'translate(0, 0) rotate(0deg)';
                setTimeout(() => {
                    card.classList.remove('glow');
                }, 600);
            }
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
}

document.addEventListener('keydown', (e) => {
    const card = document.querySelector('#vocab-card');
    if (!card) return;
    switch (e.key) {
        case ' ':
            e.preventDefault();
            const audio = document.querySelector('#card-audio');
            if (audio) {
                card.classList.add('glow');
                audio.play().catch(error => console.error('Error playing audio:', error));
                setTimeout(() => {
                    card.classList.remove('glow');
                }, 600);
            }
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
if (shareIcon) {
    shareIcon.addEventListener('click', () => {
        if (typeof html2canvas === 'undefined') {
            console.error('html2canvas is not loaded');
            return;
        }
        captureSnapshot();
    });
}

// Function to capture snapshot
function captureSnapshot() {
    const canvas = document.querySelector('#snapshot-canvas');
    const ctx = canvas.getContext('2d');
    const mainContent = document.querySelector('.main-content');

    if (!canvas || !ctx || !mainContent) {
        console.error('Snapshot elements missing');
        return;
    }

    const viewportWidth = 360;
    const viewportHeight = 640;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = viewportWidth * pixelRatio;
    canvas.height = viewportHeight * pixelRatio;
    ctx.scale(pixelRatio, pixelRatio);

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
        console.error('Error capturing snapshot:', error);
    });
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    loadVocabData();
});
