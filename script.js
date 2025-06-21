// Initialize app
async function init() {
    // Load words from YAML
    async function loadWords() {
        try {
            const response = await fetch('./vocab_database.yaml');
            if (!response.ok) throw new Error('Failed to load vocab_database.yaml');
            const yamlText = await response.text();
            return jsyaml.load(yamlText) || [];
        } catch (error) {
            console.error('Error loading YAML:', error);
            return [];
        }
    }

    // Shuffle array (Fisher-Yates algorithm)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    const words = await loadWords();
    if (words.length === 0) {
        document.getElementById('word').textContent = 'Error loading words';
        document.getElementById('totalWords').textContent = '0';
        return;
    }

    // Shuffle words
    const shuffledWords = shuffleArray([...words]);

    // Update total words stat
    document.getElementById('totalWords').textContent = words.length.toLocaleString();

    let currentIndex = 0;
    const flashcard = document.getElementById('flashcard');
    const wordEl = document.getElementById('word');
    const wordBackEl = document.getElementById('wordBack');
    const posEl = document.getElementById('partOfSpeech');
    const defEnEl = document.getElementById('definitionEn');
    const defThEl = document.getElementById('definitionTh');
    const exEnEl = document.getElementById('exampleEn');
    const exThEl = document.getElementById('exampleTh');
    const audioEl = document.getElementById('wordAudio');
    const playAudioBtn = document.getElementById('playAudio');
    let audioTimeout = null;
    let isTransitioning = false;

    // Function to update card content
    function updateCard(index, direction = null) {
        if (isTransitioning) return;
        isTransitioning = true;
        flashcard.classList.add('transitioning');

        if (direction) {
            flashcard.classList.add(`swiping-${direction}`);
        }

        // Wait for the exit animation to complete
        setTimeout(() => {
            // Update content
            const wordData = shuffledWords[index];
            wordEl.textContent = wordData.word;
            wordBackEl.textContent = wordData.word;
            posEl.textContent = wordData.part_of_speech;
            defEnEl.textContent = wordData.definition_en;
            defThEl.textContent = wordData.definition_th;
            exEnEl.textContent = wordData.example_en;
            exThEl.textContent = wordData.example_th;
            audioEl.src = `./audio/${wordData.audio_file}`;

            // Reset card position and state
            flashcard.style.transform = 'translateX(0)';
            flashcard.style.opacity = '1';
            flashcard.classList.remove('swiping-left', 'swiping-right', 'flipped');

            // Play audio after reset
            playAudioWithDelay();

            // Re-enable interactions
            requestAnimationFrame(() => {
                isTransitioning = false;
                flashcard.classList.remove('transitioning');
            });
        }, 400); // Match CSS transition duration
    }

    // Play audio with 0.2s delay
    function playAudioWithDelay() {
        if (audioTimeout) clearTimeout(audioTimeout);
        audioTimeout = setTimeout(() => {
            audioEl.play().catch(error => console.error('Audio playback error:', error));
        }, 200); // 200ms = 0.2 seconds
    }

    // Initial card
    updateCard(currentIndex);

    // Swipe and tap handling with Hammer.js
    const hammer = new Hammer(flashcard);
    hammer.on('swipeleft', () => {
        if (currentIndex < shuffledWords.length - 1) {
            currentIndex++;
            updateCard(currentIndex, 'right');
        }
    });
    hammer.on('swiperight', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCard(currentIndex, 'left');
        }
    });
    hammer.on('tap', () => {
        playAudioWithDelay();
    });
    hammer.on('doubletap', () => {
        flashcard.classList.toggle('flipped');
    });

    // Play audio button on back of card
    playAudioBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent tap event from triggering
        playAudioWithDelay();
    });
}

init();
