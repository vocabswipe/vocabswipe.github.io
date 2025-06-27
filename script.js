let currentWordIndex = 0;
let currentBackCardIndex = 0;
let words = [];
let isFlipped = false;
let currentAudio = null;
let audioCache = new Map();
const MAX_CACHE_SIZE = 10;
let audioUnlocked = false;
let maxFreq = 0;
let minFreq = 1;

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'bright';
    document.body.setAttribute('data-theme', savedTheme);
    
    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'bright' ? 'dark' : 'bright';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    loadWords();
    setupEventListeners();
});

document.body.addEventListener('touchstart', () => {
    audioUnlocked = true;
    console.log('Audio unlocked via touchstart');
}, { once: true });
document.body.addEventListener('click', () => {
    audioUnlocked = true;
    console.log('Audio unlocked via click');
}, { once: true });

function loadWords() {
    fetch('data/vocab_database.yaml')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - Check if vocab_database.yaml exists in data/`);
            }
            return response.text();
        })
        .then(yamlText => {
            words = jsyaml.load(yamlText) || [];
            if (!words.length) {
                console.warn('No words found in vocab_database.yaml');
                alert('No vocabulary data available. Please ensure vocab_database.yaml is populated.');
                return;
            }
            words.sort((a, b) => a.rank - b.rank);
            maxFreq = words.find(word => word.rank === 1)?.freq || 1;
            minFreq = Math.min(...words.map(word => word.freq).filter(freq => freq > 0)) || 1;
            displayWord();
            preloadAudio();
        })
        .catch(error => {
            console.error('Error loading words:', error.message);
            alert('Failed to load vocabulary data. Check the console for details.');
        });
}

// Function to show arrow effect for swipes
function showSwipeEffect(direction) {
    const card = document.querySelector('.flashcard');
    card.classList.remove('swipe-left', 'swipe-right', 'swipe-up', 'swipe-down');
    card.classList.add(`swipe-${direction}`);
    setTimeout(() => {
        card.classList.remove(`swipe-${direction}`);
    }, 300); // Match animation duration
}

// Function to show tap effect
function showTapEffect(isDoubleTap) {
    const card = document.querySelector('.flashcard');
    card.classList.add(isDoubleTap ? 'tap-double' : 'tap-single');
    setTimeout(() => {
        card.classList.remove(isDoubleTap ? 'tap-double' : 'tap-single');
    }, 200); // Match animation duration
}

function setupEventListeners() {
    const card = document.querySelector('.flashcard');
    let tapCount = 0;
    let lastTapTime = 0;
    const doubleTapThreshold = 300;

    card.addEventListener('click', (e) => {
        const currentTime = new Date().getTime();
        tapCount++;
        if (tapCount === 1) {
            setTimeout(() => {
                if (tapCount === 1) {
                    showTapEffect(false); // Single tap effect
                    const audioFile = isFlipped ? 
                        (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                         words[currentWordIndex]?.word_audio_file?.[0]) : 
                        words[currentWordIndex]?.word_audio_file?.[0];
                    if (audioFile) {
                        playAudio(audioFile);
                    } else {
                        console.warn(`No audio file for ${isFlipped ? 'back' : 'front'} card at word index ${currentWordIndex}`);
                    }
                }
                tapCount = 0;
            }, doubleTapThreshold);
        } else if (tapCount === 2 && currentTime - lastTapTime < doubleTapThreshold) {
            showTapEffect(true); // Double tap effect
            flipCard();
            tapCount = 0;
        }
        lastTapTime = currentTime;
    });

    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
    hammer.on('swipeleft', () => {
        if (words.length) {
            showSwipeEffect('left');
            currentWordIndex = (currentWordIndex + 1) % words.length;
            currentBackCardIndex = 0;
            stopAudio();
            displayWord();
            const audioFile = isFlipped ? 
                (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                 words[currentWordIndex]?.word_audio_file?.[0]) : 
                words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile) {
                console.log(`Swipe left: Playing audio for ${isFlipped ? 'back' : 'front'} card at word index ${currentWordIndex}`);
                playAudio(audioFile);
            } else {
                console.warn(`No audio file for ${isFlipped ? 'back' : 'front'} card at word index ${currentWordIndex}`);
            }
            preloadAudio();
        }
    });
    hammer.on('swiperight', () => {
        if (words.length) {
            showSwipeEffect('right');
            currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
            currentBackCardIndex = 0;
            stopAudio();
            displayWord();
            const audioFile = isFlipped ? 
                (words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                 words[currentWordIndex]?.word_audio_file?.[0]) : 
                words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile) {
                console.log(`Swipe right: Playing audio for ${isFlipped ? 'back' : 'front'} card at word index ${currentWordIndex}`);
                playAudio(audioFile);
            } else {
                console.warn(`No audio file for ${isFlipped ? 'back' : 'front'} card at word index ${currentWordIndex}`);
            }
            preloadAudio();
        }
    });
    hammer.on('swipeup', () => {
        if (isFlipped && words[currentWordIndex]?.back_cards) {
            showSwipeEffect('up');
            currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
            stopAudio();
            displayWord();
            const audioFile = words[currentWordIndex]?.sentence_audio_file?.[currentBackCardIndex] || 
                             words[currentWordIndex]?.word_audio_file?.[0];
            if (audioFile) {
                console.log(`Swipe up: Playing audio for back card at index ${currentBackCardIndex} for word ${currentWordIndex}`);
                playAudio(audioFile);
            } else {
                console.warn(`No audio file for back card at index ${currentBackCardIndex} for word at ${currentWordIndex}`);
            }
            preloadAudio();
        }
    });
    hammer.on('swipedown', () => {
        if (isFlipped && words[currentWordIndex Facet id="back-rank">Index</span>
                            <div class="frequency-container">
                                <span class="frequency-label">Frequency:</span>
                                <div class="frequency-bar">
                                    <div id="back-frequency-fill" class="frequency-fill"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>
