// Array to hold vocabulary entries
let vocabData = [];
let originalVocabLength = 0; // Store original length for stats
let currentIndex = 0;
let hasSwiped = false; // Flag to track if user has swiped
let mediaRecorders = {}; // Object to store MediaRecorder instances per card
let recordedChunks = {}; // Object to store recorded chunks per card
let isRecording = false; // Track if any recording is active
let isAudioPlaying = false; // Track if any audio is playing
let isPlayingRecording = false; // Track if any recorded audio is playing
let audioContext = null; // Web Audio API context
let currentAudioSource = null; // Track current audio source for stopping
let activeCardId = 'vocab-card'; // Track the active card for media operations

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
        speed: 3000,
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
    countNumberElement.data('to', originalVocabLength);
    countNumberElement.data('countToOptions', {
        formatter: function (value, options) {
            return value.toFixed(options.decimals).replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
        }
    });
    countNumberElement.countTo();
    statsElement.style.transition = 'opacity 1s ease';
    statsElement.style.opacity = '1';
}

// Function to update progress bar
function updateProgressBar() {
    const progressFill = document.getElementById('progress-fill');
    const progressValue = document.getElementById('progress-value');
    const totalCards = originalVocabLength;
    const swipedCount = swipedCards.length;
    const percentage = totalCards > 0 ? (swipedCount / totalCards) * 100 : 0;
    
    progressFill.style.width = `${percentage}%`;
    progressValue.textContent = swipedCount.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
    
    // Show progress bar after first swipe
    if (hasSwiped && swipedCount > 0) {
        const progressContainer = document.querySelector('.progress-container');
        progressContainer.style.opacity = '1';
        progressContainer.style.transition = 'opacity 1s ease';
    }
}

// Function to alternate stats text, slogan, progress label, and donation message between English and Thai
function alternateStatsText() {
    const line1 = document.getElementById('stats-line1');
    const slogan = document.querySelector('.website-slogan');
    const progressLabel = document.getElementById('progress-label');
    const donationMessage = document.getElementById('donation-message');
    let isEnglish = true;

    function swapText() {
        line1.style.transition = 'opacity 0.05s ease';
        slogan.style.transition = 'opacity 0.05s ease';
        progressLabel.style.transition = 'opacity 0.05s ease';
        donationMessage.style.transition = 'opacity 0.05s ease';
        line1.style.opacity = '0';
        slogan.style.opacity = '0';
        progressLabel.style.opacity = '0';
        donationMessage.style.opacity = '0';

        setTimeout(() => {
            if (isEnglish) {
                line1.textContent = 'ประโยคภาษาอังกฤษอเมริกันที่จำเป็น';
                slogan.textContent = 'ยิ่งปัด ยิ่งเก่ง';
                progressLabel.textContent = 'ปัดไปแล้ว';
                donationMessage.innerHTML = 'ซื้อกาแฟให้ผมเพื่อให้ <span class="vocabswipe-text">VOCABSWIPE</span> ฟรีและเติบโตต่อไป! สแกนคิวอาร์โค้ดเพื่อสนับสนุนผ่านพร้อมเพย์';
                line1.classList.add('thai-text');
                slogan.classList.add('thai-text');
                progressLabel.classList.add('thai-text');
                donationMessage.classList.add('thai-text');
            } else {
                line1.textContent = 'Essential American English Sentences';
                slogan.textContent = 'Master Words, Swipe by Swipe';
                progressLabel.textContent = 'Swiped Cards';
                donationMessage.innerHTML = 'Buy me a coffee to keep <span class="vocabswipe-text">VOCABSWIPE</span> free and growing! Scan the QR code to support via PromptPay.';
                line1.classList.remove('thai-text');
                slogan.classList.remove('thai-text');
                progressLabel.classList.remove('thai-text');
                donationMessage.classList.remove('thai-text');
            }
            line1.style.opacity = '1';
            slogan.style.opacity = '1';
            progressLabel.style.opacity = '1';
            donationMessage.style.opacity = '1';
            isEnglish = !isEnglish;
        }, 50);
    }

    line1.textContent = 'Essential American English Sentences';
    slogan.textContent = 'Master Words, Swipe by Swipe';
    progressLabel.textContent = 'Swiped Cards';
    donationMessage.innerHTML = 'Buy me a coffee to keep <span class="vocabswipe-text">VOCABSWIPE</span> free and growing! Scan the QR code to support via PromptPay.';
    line1.style.opacity = '1';
    slogan.style.opacity = '1';
    progressLabel.style.opacity = '1';
    donationMessage.style.opacity = '1';
    line1.classList.remove('thai-text');
    slogan.classList.remove('thai-text');
    progressLabel.classList.remove('thai-text');
    donationMessage.classList.remove('thai-text');

    setInterval(swapText, 20000);
}

// Function to detect if user is on mobile
function isMobileDevice() {
    return /Mobi|Android/i.test(navigator.userAgent);
}

// Function to set initial card theme (always white background)
function setInitialCardTheme() {
    const cardBackgroundColor = '#ffffff';
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
    const englishElement = document.getElementById('english');
    const thaiElement = document.getElementById('thai');
    const audioElement = document.getElementById('card-audio');

    const nextCards = [
        { top: 'next-word-top-1', english: 'next-english-1', thai: 'next-thai-1' },
        { top: 'next-word-top-2', english: 'next-english-2', thai: 'next-thai-2' },
        { top: 'next-word-top-3', english: 'next-english-3', thai: 'next-thai-3' },
        { top: 'next-word-top-4', english: 'next-english-4', thai: 'next-thai-4' },
        { top: 'next-word-top-5', english: 'next-english-5', thai: 'next-thai-5' },
        { top: 'next-word-top-6', english: 'next-english-6', thai: 'next-thai-6' },
        { top: 'next-word-top-7', english: 'next-english-7', thai: 'next-thai-7' },
        { top: 'next-word-top-8', english: 'next-english-8', thai: 'next-thai-8' },
        { top: 'next-word-top-9', english: 'next-english-9', thai: 'next-thai-9' }
    ];

    // Populate current card
    if (currentIndex < vocabData.length) {
        const entry = vocabData[currentIndex];
        wordTopElement.textContent = entry.word;
        wordTopElement.style.fontFamily = "'Times New Roman', Times, serif";
        englishElement.textContent = entry.english;
        thaiElement.textContent = entry.thai;
        audioElement.src = `data/${entry.audio}`;
        wordTopElement.style.color = cardTextColor;
        englishElement.style.color = cardTextColor;
        thaiElement.style.color = cardTextColor;
    }

    // Populate next cards
    nextCards.forEach((next, index) => {
        if (currentIndex + index + 1 < vocabData.length) {
            const nextEntry = vocabData[currentIndex + index + 1];
            const nextWordTopElement = document.getElementById(next.top);
            const nextEnglishElement = document.getElementById(next.english);
            const nextThaiElement = document.getElementById(next.thai);
            nextWordTopElement.textContent = nextEntry.word;
            nextEnglishElement.textContent = nextEntry.english;
            nextThaiElement.textContent = nextEntry.thai;
            nextWordTopElement.style.color = cardTextColor;
            nextEnglishElement.style.color = cardTextColor;
            nextThaiElement.style.color = cardTextColor;
            nextWordTopElement.style.fontFamily = "'Times New Roman', Times, serif";
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

        // Call callback after animation completes to enable interactions
        setTimeout(() => {
            enableCardInteractions();
            callback();
        }, 1000 + (cards.length - 1) * 200);
    }, 100);
}

// Function to stop all media for a specific card
function stopCardMedia(cardId) {
    // Stop audio playback
    if (isAudioPlaying && currentAudioSource) {
        try {
            currentAudioSource.stop();
        } catch (e) {
            console.log('Audio source already stopped or not started:', e);
        }
        isAudioPlaying = false;
        currentAudioSource = null;
        document.getElementById(`audio-button${cardId === 'vocab-card' ? '' : '-' + cardId.split('-')[1]}`).classList.remove('pulsating');
    }

    // Stop HTML5 audio fallback
    const cardAudio = document.getElementById('card-audio');
    if (!cardAudio.paused) {
        cardAudio.pause();
        cardAudio.currentTime = 0;
    }

    // Stop recording for the specific card
    if (mediaRecorders[cardId] && mediaRecorders[cardId].state === 'recording') {
        mediaRecorders[cardId].stop();
        isRecording = false;
        recordedChunks[cardId] = [];
        delete mediaRecorders[cardId]; // Clear the recorder
        document.getElementById(`mic-button${cardId === 'vocab-card' ? '' : '-' + cardId.split('-')[1]}`).classList.remove('pulsating');
    }

    // Stop recorded audio playback
    const recordedAudio = document.getElementById('recorded-audio');
    if (!recordedAudio.paused) {
        recordedAudio.pause();
        recordedAudio.currentTime = 0;
        isPlayingRecording = false;
    }

    // Reset button states for the specific card
    const playButton = document.getElementById(`play-button${cardId === 'vocab-card' ? '' : '-' + cardId.split('-')[1]}`);
    const soundwaveButton = document.getElementById(`soundwave-button${cardId === 'vocab-card' ? '' : '-' + cardId.split('-')[1]}`);
    playButton.style.display = 'none';
    soundwaveButton.style.display = 'none';
    updateButtonStates();
}

// Function to play audio using Web Audio API for mobile compatibility
function playAudio(audioSrc, audioButton, cardId) {
    // Stop any existing audio
    if (isAudioPlaying && currentAudioSource) {
        try {
            currentAudioSource.stop();
        } catch (e) {
            console.log('Audio source already stopped:', e);
        }
        isAudioPlaying = false;
        currentAudioSource = null;
        document.querySelectorAll('.audio-button').forEach(btn => btn.classList.remove('pulsating'));
    }

    // Stop HTML5 audio fallback
    const cardAudio = document.getElementById('card-audio');
    if (!cardAudio.paused) {
        cardAudio.pause();
        cardAudio.currentTime = 0;
    }

    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Ensure audio context is resumed (required for mobile browsers)
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            loadAndPlayAudio(audioSrc, audioButton, cardId);
        });
    } else {
        loadAndPlayAudio(audioSrc, audioButton, cardId);
    }
}

function loadAndPlayAudio(audioSrc, audioButton, cardId) {
    fetch(audioSrc)
        .then(response => response.arrayBuffer())
        .then(buffer => audioContext.decodeAudioData(buffer))
        .then(decodedData => {
            const source = audioContext.createBufferSource();
            source.buffer = decodedData;
            source.connect(audioContext.destination);
            isAudioPlaying = true;
            currentAudioSource = source;
            activeCardId = cardId;
            // Apply pulsating animation twice
            audioButton.classList.add('pulsating-twice');
            updateButtonStates();
            source.start(0);
            source.onended = () => {
                isAudioPlaying = false;
                currentAudioSource = null;
                activeCardId = null;
                audioButton.classList.remove('pulsating-twice');
                updateButtonStates();
            };
        })
        .catch(error => {
            console.error('Error playing audio with Web Audio API:', error);
            // Fallback to HTML5 audio
            const audio = new Audio(audioSrc);
            isAudioPlaying = true;
            activeCardId = cardId;
            audioButton.classList.add('pulsating-twice');
            updateButtonStates();
            audio.play().catch(err => console.error('Error playing fallback audio:', err));
            audio.onended = () => {
                isAudioPlaying = false;
                activeCardId = null;
                audioButton.classList.remove('pulsating-twice');
                updateButtonStates();
            };
        });
}

// Function to update button states (enable/disable)
function updateButtonStates() {
    const cards = [
        { id: 'vocab-card', audioId: 'audio-button', micId: 'mic-button', playId: 'play-button', soundwaveId: 'soundwave-button' },
        { id: 'next-card-1', audioId: 'audio-button-1', micId: 'mic-button-1', playId: 'play-button-1', soundwaveId: 'soundwave-button-1' },
        { id: 'next-card-2', audioId: 'audio-button-2', micId: 'mic-button-2', playId: 'play-button-2', soundwaveId: 'soundwave-button-2' },
        { id: 'next-card-3', audioId: 'audio-button-3', micId: 'mic-button-3', playId: 'play-button-3', soundwaveId: 'soundwave-button-3' },
        { id: 'next-card-4', audioId: 'audio-button-4', micId: 'mic-button-4', playId: 'play-button-4', soundwaveId: 'soundwave-button-4' },
        { id: 'next-card-5', audioId: 'audio-button-5', micId: 'mic-button-5', playId: 'play-button-5', soundwaveId: 'soundwave-button-5' },
        { id: 'next-card-6', audioId: 'audio-button-6', micId: 'mic-button-6', playId: 'play-button-6', soundwaveId: 'soundwave-button-6' },
        { id: 'next-card-7', audioId: 'audio-button-7', micId: 'mic-button-7', playId: 'play-button-7', soundwaveId: 'soundwave-button-7' },
        { id: 'next-card-8', audioId: 'audio-button-8', micId: 'mic-button-8', playId: 'play-button-8', soundwaveId: 'soundwave-button-8' },
        { id: 'next-card-9', audioId: 'audio-button-9', micId: 'mic-button-9', playId: 'play-button-9', soundwaveId: 'soundwave-button-9' }
    ];

    cards.forEach(card => {
        const audioButton = document.getElementById(card.audioId);
        const micButton = document.getElementById(card.micId);
        const playButton = document.getElementById(card.playId);

        audioButton.style.pointerEvents = (isAudioPlaying || isRecording || isPlayingRecording) ? 'none' : 'auto';
        micButton.style.pointerEvents = (isAudioPlaying || isPlayingRecording) ? 'none' : 'auto'; // Allow mic during recording
        playButton.style.pointerEvents = (isAudioPlaying || isRecording || isPlayingRecording) ? 'none' : 'auto';
    });
}

// Function to enable card interactions (audio and mic buttons)
function enableCardInteractions() {
    const cards = [
        { id: 'vocab-card', audioId: 'audio-button', micId: 'mic-button', playId: 'play-button', soundwaveId: 'soundwave-button', audioSrcId: 'card-audio' },
        { id: 'next-card-1', audioId: 'audio-button-1', micId: 'mic-button-1', playId: 'play-button-1', soundwaveId: 'soundwave-button-1' },
        { id: 'next-card-2', audioId: 'audio-button-2', micId: 'mic-button-2', playId: 'play-button-2', soundwaveId: 'soundwave-button-2' },
        { id: 'next-card-3', audioId: 'audio-button-3', micId: 'mic-button-3', playId: 'play-button-3', soundwaveId: 'soundwave-button-3' },
        { id: 'next-card-4', audioId: 'audio-button-4', micId: 'mic-button-4', playId: 'play-button-4', soundwaveId: 'soundwave-button-4' },
        { id: 'next-card-5', audioId: 'audio-button-5', micId: 'mic-button-5', playId: 'play-button-5', soundwaveId: 'soundwave-button-5' },
        { id: 'next-card-6', audioId: 'audio-button-6', micId: 'mic-button-6', playId: 'play-button-6', soundwaveId: 'soundwave-button-6' },
        { id: 'next-card-7', audioId: 'audio-button-7', micId: 'mic-button-7', playId: 'play-button-7', soundwaveId: 'soundwave-button-7' },
        { id: 'next-card-8', audioId: 'audio-button-8', micId: 'mic-button-8', playId: 'play-button-8', soundwaveId: 'soundwave-button-8' },
        { id: 'next-card-9', audioId: 'audio-button-9', micId: 'mic-button-9', playId: 'play-button-9', soundwaveId: 'soundwave-button-9' }
    ];

    cards.forEach((card, index) => {
        const audioButton = document.getElementById(card.audioId);
        const micButton = document.getElementById(card.micId);
        const playButton = document.getElementById(card.playId);
        const soundwaveButton = document.getElementById(card.soundwaveId);

        // Audio button handler (click and touchstart)
        const audioHandler = (e) => {
            e.preventDefault();
            if (isRecording || isPlayingRecording) return;
            let audioSrc;
            if (card.id === 'vocab-card') {
                audioSrc = document.getElementById('card-audio').src;
            } else if (currentIndex + index < vocabData.length) {
                const entry = vocabData[currentIndex + index];
                audioSrc = `data/${entry.audio}`;
            }
            if (audioSrc) {
                playAudio(audioSrc, audioButton, card.id);
            }
        };

        audioButton.addEventListener('click', audioHandler);
        audioButton.addEventListener('touchstart', audioHandler);

        // Microphone button handler (click and touchstart)
        const micHandler = (e) => {
            e.preventDefault();
            if (isAudioPlaying || isPlayingRecording) return;

            // Reset play and soundwave buttons immediately for this card
            document.getElementById(card.playId).style.display = 'none';
            document.getElementById(card.soundwaveId).style.display = 'none';
            recordedChunks[card.id] = []; // Reset recorded chunks for this card

            // Stop any ongoing recording for this card
            if (mediaRecorders[card.id] && mediaRecorders[card.id].state === 'recording') {
                mediaRecorders[card.id].stop();
                isRecording = false;
                delete mediaRecorders[card.id];
            }

            micButton.classList.add('pulsating');
            startRecording(card.id, card.playId, card.soundwaveId);
            setTimeout(() => {
                stopRecording(card.id, card.playId, card.soundwaveId);
                micButton.classList.remove('pulsating');
            }, 5000);
        };

        micButton.addEventListener('click', micHandler);
        micButton.addEventListener('touchstart', micHandler);

        // Play recording button handler (click and touchstart)
        const playHandler = (e) => {
            if (isAudioPlaying || isRecording || isPlayingRecording) return;
            e.preventDefault();
            playButton.classList.add('pulsating');
            setTimeout(() => playButton.classList.remove('pulsating'), 300);
            const recordedAudio = document.getElementById('recorded-audio');
            if (recordedAudio.src && recordedChunks[card.id] && recordedChunks[card.id].length > 0) {
                isPlayingRecording = true;
                activeCardId = card.id;
                updateButtonStates();
                animateSoundwave(card.soundwaveId);
                recordedAudio.play().then(() => {
                    recordedAudio.onended = () => {
                        isPlayingRecording = false;
                        activeCardId = null;
                        updateButtonStates();
                    };
                }).catch(error => {
                    console.error('Error playing recorded audio:', error);
                    isPlayingRecording = false;
                    activeCardId = null;
                    updateButtonStates();
                });
            }
        };

        playButton.addEventListener('click', playHandler);
        playButton.addEventListener('touchstart', playHandler);
    });
}

// Function to start recording for a specific card
function startRecording(cardId, playButtonId, soundwaveButtonId) {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorders[cardId] = new MediaRecorder(stream);
                recordedChunks[cardId] = [];
                mediaRecorders[cardId].start();
                isRecording = true;
                activeCardId = cardId;
                updateButtonStates();
                mediaRecorders[cardId].ondataavailable = (e) => {
                    recordedChunks[cardId].push(e.data);
                };
                mediaRecorders[cardId].onstop = () => {
                    const blob = new Blob(recordedChunks[cardId], { type: 'audio/wav' });
                    const recordedAudio = document.getElementById('recorded-audio');
                    recordedAudio.src = URL.createObjectURL(blob);
                    // Only show play button if the card is still active and recording exists
                    if (activeCardId === cardId && recordedChunks[cardId].length > 0) {
                        setTimeout(() => {
                            document.getElementById(playButtonId).style.display = 'inline-block';
                            document.getElementById(soundwaveButtonId).style.display = 'none';
                        }, 2000); // Show play button 2 seconds after recording stops
                    }
                    isRecording = false;
                    activeCardId = null;
                    updateButtonStates();
                    stream.getTracks().forEach(track => track.stop());
                };
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                isRecording = false;
                activeCardId = null;
                updateButtonStates();
                alert('Microphone access denied or not supported. Please ensure microphone permissions are granted.');
            });
    } else {
        console.error('MediaRecorder or getUserMedia not supported');
        isRecording = false;
        activeCardId = null;
        updateButtonStates();
        alert('Recording is not supported on this device or browser.');
    }
}

// Function to stop recording for a specific card
function stopRecording(cardId, playButtonId, soundwaveButtonId) {
    if (mediaRecorders[cardId] && mediaRecorders[cardId].state === 'recording') {
        mediaRecorders[cardId].stop();
    }
}

// Function to animate soundwave
function animateSoundwave(soundwaveButtonId) {
    const soundwave = document.getElementById(soundwaveButtonId);
    soundwave.style.display = 'inline-block';
    soundwave.style.animation = 'none';
    soundwave.offsetHeight; // Trigger reflow
    soundwave.style.animation = 'soundwaveSweep 5s linear forwards';
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
            card.style.display = 'none';
        });

        const response = await fetch('data/database.jsonl');
        const text = await response.text();
        let allVocab = text.trim().split('\n').map(line => JSON.parse(line));
        originalVocabLength = allVocab.length;
        allVocab = allVocab.map((item, index) => ({ ...item, originalIndex: index }));
        vocabData = allVocab.filter(item => !swipedCards.includes(item.originalIndex));
        if (vocabData.length === 0) {
            swipedCards = [];
            localStorage.setItem('swipedCards', JSON.stringify(swipedCards));
            vocabData = allVocab.slice();
        }
        vocabData = vocabData.sort(() => Math.random() - 0.5);

        populateCardsBeforeAnimation();

        animateCardStackDrop(() => {
            displayCards();
            updateWebsiteStats();
            updateProgressBar();
            alternateStatsText();
        });
    } catch (error) {
        console.error('Error loading database:', error);
        document.getElementById('word-top').textContent = 'Error';
        document.getElementById('english').textContent = 'Failed to load data';
        document.getElementById('thai').textContent = '';
    }
}

// Function to display the current and next cards
function displayCards() {
    if (vocabData.length === 0) return;

    const cardBackgroundColor = '#ffffff';
    const cardTextColor = '#000000';
    const cardBorderColor = '#000000';

    const currentCard = document.getElementById('vocab-card');
    const wordTopElement = document.getElementById('word-top');
    const englishElement = document.getElementById('english');
    const thaiElement = document.getElementById('thai');
    const audioElement = document.getElementById('card-audio');
    const nextCards = [
        { card: document.getElementById('next-card-1'), top: 'next-word-top-1', english: 'next-english-1', thai: 'next-thai-1', zIndex: 9, translateX: 1.296, translateY: 1.296, rotate: 0.3249 },
        { card: document.getElementById('next-card-2'), top: 'next-word-top-2', english: 'next-english-2', thai: 'next-thai-2', zIndex: 8, translateX: 2.592, translateY: 2.592, rotate: 0.6498 },
        { card: document.getElementById('next-card-3'), top: 'next-word-top-3', english: 'next-english-3', thai: 'next-thai-3', zIndex: 7, translateX: 3.888, translateY: 3.888, rotate: 0.9747 },
        { card: document.getElementById('next-card-4'), top: 'next-word-top-4', english: 'next-english-4', thai: 'next-thai-4', zIndex: 6, translateX: 5.184, translateY: 5.184, rotate: 1.2996 },
        { card: document.getElementById('next-card-5'), top: 'next-word-top-5', english: 'next-english-5', thai: 'next-thai-5', zIndex: 5, translateX: 6.48, translateY: 6.48, rotate: 1.6245 },
        { card: document.getElementById('next-card-6'), top: 'next-word-top-6', english: 'next-english-6', thai: 'next-thai-6', zIndex: 4, translateX: 7.776, translateY: 7.776, rotate: 1.9494 },
        { card: document.getElementById('next-card-7'), top: 'next-word-top-7', english: 'next-english-7', thai: 'next-thai-7', zIndex: 3, translateX: 9.072, translateY: 9.072, rotate: 2.2743 },
        { card: document.getElementById('next-card-8'), top: 'next-word-top-8', english: 'next-english-8', thai: 'next-thai-8', zIndex: 2, translateX: 10.368, translateY: 10.368, rotate: 2.5992 },
        { card: document.getElementById('next-card-9'), top: 'next-word-top-9', english: 'next-english-9', thai: 'next-thai-9', zIndex: 1, translateX: 11.664, translateY: 11.664, rotate: 2.9241 }
    ];
    const stackCards = document.querySelectorAll('.card-stack');

    // Current card
    if (currentIndex < vocabData.length) {
        const entry = vocabData[currentIndex];
        wordTopElement.textContent = entry.word;
        wordTopElement.style.fontFamily = "'Times New Roman', Times, serif";
        englishElement.textContent = entry.english;
        thaiElement.textContent = entry.thai;
        audioElement.src = `data/${entry.audio}`;
        wordTopElement.style.color = cardTextColor;
        englishElement.style.color = cardTextColor;
        thaiElement.style.color = cardTextColor;
        currentCard.style.backgroundColor = cardBackgroundColor;
        currentCard.style.borderColor = cardBorderColor;
        currentCard.style.transform = 'translate(0, 0) rotate(0deg)';
        currentCard.style.opacity = '1';
        currentCard.style.zIndex = '100';
        // Reset recording buttons for new top card
        document.getElementById('play-button').style.display = recordedChunks['vocab-card'] && recordedChunks['vocab-card'].length > 0 ? 'inline-block' : 'none';
        document.getElementById('soundwave-button').style.display = 'none';
    }

    // Next cards
    nextCards.forEach((next, index) => {
        if (currentIndex + index + 1 < vocabData.length) {
            const nextEntry = vocabData[currentIndex + index + 1];
            const nextWordTopElement = document.getElementById(next.top);
            const nextEnglishElement = document.getElementById(next.english);
            const nextThaiElement = document.getElementById(next.thai);
            nextWordTopElement.textContent = nextEntry.word;
            nextEnglishElement.textContent = nextEntry.english;
            nextThaiElement.textContent = nextEntry.thai;
            nextWordTopElement.style.color = cardTextColor;
            nextEnglishElement.style.color = cardTextColor;
            nextThaiElement.style.color = cardTextColor;
            nextWordTopElement.style.fontFamily = "'Times New Roman', Times, serif";
            next.card.style.backgroundColor = cardBackgroundColor;
            next.card.style.borderColor = cardBorderColor;
            next.card.style.transform = `translate(${next.translateX}px, ${next.translateY}px) rotate(${next.rotate}deg)`;
            next.card.style.opacity = '1';
            next.card.style.zIndex = next.zIndex;
            // Reset recording buttons for next cards
            document.getElementById(`play-button-${index + 1}`).style.display = recordedChunks[`next-card-${index + 1}`] && recordedChunks[`next-card-${index + 1}`].length > 0 ? 'inline-block' : 'none';
            document.getElementById(`soundwave-button-${index + 1}`).style.display = 'none';
        } else {
            next.card.style.opacity = '0';
        }
    });

    // Stack cards
    stackCards.forEach((card, index) => {
        card.style.backgroundColor = cardBackgroundColor;
        card.style.borderColor = cardBorderColor;
    });

    // Update progress bar after displaying cards
    updateProgressBar();
}

// Function to animate and move to next card
function moveToNextCard(translateX, translateY, rotate) {
    // Stop all media for the current card before moving to next card
    stopCardMedia('vocab-card');

    // Clear recorded chunks for the current card to prevent play button from appearing on new card
    recordedChunks['vocab-card'] = [];

    const card = document.getElementById('vocab-card');
    card.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
    card.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`;
    card.style.opacity = '0';
    card.style.zIndex = '1000';
    // Mark current card as swiped
    const originalIndex = vocabData[currentIndex].originalIndex;
    if (!swipedCards.includes(originalIndex)) {
        swipedCards.push(originalIndex);
        localStorage.setItem('swipedCards', JSON.stringify(swipedCards));
    }
    // Set hasSwiped to true after first swipe
    hasSwiped = true;
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

    if (distance > minSwipeDistance) {
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

    if (distance > minSwipeDistance) {
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
shareIcon.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (typeof html2canvas === 'undefined') {
        console.error('html2canvas is not loaded');
        return;
    }
    captureSnapshot();
});

// Coffee icon functionality
const coffeeIcon = document.querySelector('#coffee-icon');
const donationPopup = document.querySelector('#donation-popup');
const closeIcon = document.querySelector('#close-icon');
const mainContent = document.querySelector('.main-content');

coffeeIcon.addEventListener('click', () => {
    donationPopup.style.display = 'flex';
    mainContent.classList.add('blurred');
});
coffeeIcon.addEventListener('touchstart', (e) => {
    e.preventDefault();
    donationPopup.style.display = 'flex';
    mainContent.classList.add('blurred');
});

closeIcon.addEventListener('click', () => {
    donationPopup.style.display = 'none';
    mainContent.classList.remove('blurred');
});
closeIcon.addEventListener('touchstart', (e) => {
    e.preventDefault();
    donationPopup.style.display = 'none';
    mainContent.classList.remove('blurred');
});

donationPopup.addEventListener('click', (e) => {
    if (e.target === donationPopup) {
        donationPopup.style.display = 'none';
        mainContent.classList.remove('blurred');
    }
});
donationPopup.addEventListener('touchstart', (e) => {
    if (e.target === donationPopup) {
        e.preventDefault();
        donationPopup.style.display = 'none';
        mainContent.classList.remove('blurred');
    }
});

// Function to capture snapshot
function captureSnapshot() {
    const canvas = document.querySelector('#snapshot-canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size to match the current viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = viewportWidth * pixelRatio;
    canvas.height = viewportHeight * pixelRatio;
    ctx.scale(pixelRatio, pixelRatio);

    // Set background color to match the page
    ctx.fillStyle = '#35654d';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    html2canvas(document.documentElement, {
        width: viewportWidth,
        height: viewportHeight,
        scale: pixelRatio,
        backgroundColor: '#35654d',
        useCORS: true,
        logging: false,
        x: window.scrollX,
        y: window.scrollY
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
