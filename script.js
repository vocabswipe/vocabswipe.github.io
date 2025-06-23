let audioContext = null; // Web Audio API context
let audioUnlocked = false; // Flag to track if audio is unlocked
let currentAudio = null;
let audioCache = new Map();
const MAX_CACHE_SIZE = 10;

// Initialize AudioContext on first user interaction
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.resume().then(() => {
            audioUnlocked = true;
            console.log('AudioContext resumed and audio unlocked for autoplay.');
        }).catch(err => {
            console.error('Failed to resume AudioContext:', err);
        });
    }
}

// Unlock audio on first user interaction
document.body.addEventListener('touchstart', initAudioContext, { once: true });
document.body.addEventListener('click', initAudioContext, { once: true });

function playAudio(audioFile) {
    if (!audioFile) {
        console.warn('No audio file available');
        return;
    }
    if (!audioUnlocked) {
        console.warn('Audio playback blocked until unlocked by user gesture.');
        return;
    }
    stopAudio();
    let audio = audioCache.get(audioFile);
    if (!audio) {
        audio = new Audio(`data/audio/${audioFile}`);
        audio.preload = 'auto';
        audio.load();
        audioCache.set(audioFile, audio);
    }
    currentAudio = audio;
    const playPromise = currentAudio.play();
    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                console.log(`Playing audio: ${audioFile}`);
            })
            .catch(error => {
                console.error(`Playback error for ${audioFile}:`, error);
                // Retry playback after a short delay if blocked
                if (!audioUnlocked) {
                    setTimeout(() => playAudio(audioFile), 100);
                }
            });
    }
}

function playAudioAfterEvent(audioFile) {
    if (!audioFile) {
        console.warn('No audio file available');
        return;
    }
    // Ensure AudioContext is initialized before playing
    if (!audioContext) {
        initAudioContext();
    }
    playAudio(audioFile);
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
                    const audioFile = isFlipped ?
                        words[currentWordIndex].sentence_audio_file[currentBackCardIndex] ||
                        words[currentWordIndex].word_audio_file[0] :
                        words[currentWordIndex].word_audio_file[0];
                    playAudioAfterEvent(audioFile);
                }
                tapCount = 0;
            }, doubleTapThreshold);
        } else if (tapCount === 2 && currentTime - lastTapTime < doubleTapThreshold) {
            flipCard();
            tapCount = 0;
        }
        lastTapTime = currentTime;
    });

    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });

    // Debounce swipe events to prevent multiple triggers
    let swipeTimeout = null;
    function handleSwipe(direction, callback) {
        if (swipeTimeout) return;
        swipeTimeout = setTimeout(() => {
            callback();
            swipeTimeout = null;
        }, 100);
    }

    hammer.on('swipeleft', () => {
        handleSwipe('left', () => {
            if (words.length) {
                if (!isFlipped) {
                    currentWordIndex = (currentWordIndex + 1) % words.length;
                    playAudioAfterEvent(words[currentWordIndex].word_audio_file[0]);
                } else {
                    currentWordIndex = (currentWordIndex + 1) % words.length;
                    currentBackCardIndex = 0;
                    playAudioAfterEvent(words[currentWordIndex].sentence_audio_file[currentBackCardIndex] || words[currentWordIndex].word_audio_file[0]);
                }
                stopAudio();
                displayWord();
                preloadAudio();
            }
        });
    });

    hammer.on('swiperight', () => {
        handleSwipe('right', () => {
            if (words.length) {
                if (!isFlipped) {
                    currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
                    playAudioAfterEvent(words[currentWordIndex].word_audio_file[0]);
                } else {
                    currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
                    currentBackCardIndex = 0;
                    playAudioAfterEvent(words[currentWordIndex].sentence_audio_file[currentBackCardIndex] || words[currentWordIndex].word_audio_file[0]);
                }
                stopAudio();
                displayWord();
                preloadAudio();
            }
        });
    });

    hammer.on('swipeup', () => {
        handleSwipe('up', () => {
            if (isFlipped && words[currentWordIndex].back_cards) {
                currentBackCardIndex = (currentBackCardIndex + 1) % words[currentWordIndex].back_cards.length;
                displayWord();
                playAudioAfterEvent(words[currentWordIndex].sentence_audio_file[currentBackCardIndex] || words[currentWordIndex].word_audio_file[0]);
            }
        });
    });

    hammer.on('swipedown', () => {
        handleSwipe('down', () => {
            if (isFlipped && words[currentWordIndex].back_cards) {
                currentBackCardIndex = (currentBackCardIndex - 1 + words[currentWordIndex].back_cards.length) % words[currentWordIndex].back_cards.length;
                displayWord();
                playAudioAfterEvent(words[currentWordIndex].sentence_audio_file[currentBackCardIndex] || words[currentWordIndex].word_audio_file[0]);
            }
        });
    });
}

// Rest of your code (loadWords, preloadAudio, stopAudio, flipCard, displayWord) remains unchanged
