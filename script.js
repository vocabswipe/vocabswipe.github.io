document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const flashcard = document.getElementById('flashcard');
    const wordEl = document.getElementById('word');
    const englishEl = document.getElementById('english');
    const thaiEl = document.getElementById('thai');
    const statsBar = document.getElementById('stats-bar');
    const totalWordsEl = document.getElementById('total-words');
    const uniqueWordsEl = document.getElementById('unique-words');
    const totalSentencesEl = document.getElementById('total-sentences');

    // State variables
    let entries = [];
    let currentIndex = 0;
    let touchStartY = 0;
    const colors = ['#00ff88', '#ffeb3b', '#00e5ff', '#ff4081']; // Green, Yellow, Cyan, Magenta
    let currentColorIndex = 0;

    // Utility function to escape special characters for regex
    const escapeRegex = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // Fetch and parse JSONL file
    async function loadData() {
        try {
            const response = await fetch('data/database.jsonl');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.text();
            entries = data.trim().split('\n').map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    console.warn(`Skipping malformed JSONL line: ${line}`);
                    return null;
                }
            }).filter(entry => entry && entry.word && entry.english && entry.thai);
            
            if (!entries.length) throw new Error('No valid entries in database.jsonl');

            // Initialize with random entry
            currentIndex = Math.floor(Math.random() * entries.length);
            currentColorIndex = Math.floor(Math.random() * colors.length);
            displayEntry(currentIndex);

            // Update stats
            totalWordsEl.textContent = entries.length;
            uniqueWordsEl.textContent = new Set(entries.map(entry => entry.word.toLowerCase())).size;
            totalSentencesEl.textContent = entries.length;

            // Fade in stats bar
            statsBar.classList.add('loaded');
        } catch (error) {
            console.error('Error loading data:', error);
            wordEl.textContent = 'Error';
            englishEl.textContent = 'Failed to load data';
            thaiEl.textContent = '';
            statsBar.style.display = 'none';
        }
    }

    // Display entry at given index
    function displayEntry(index) {
        if (index < 0 || index >= entries.length) return;
        const entry = entries[index];
        wordEl.textContent = ENTRY.word || 'N/A';
        wordEl.style.color = colors[currentColorIndex];

        // Get adjacent words and colors
        const nextWord = index < entries.length - 1 ? entries[index + 1].word : null;
        const prevWord = index > 0 ? entries[index - 1].word : null;
        const nextColor = colors[(currentColorIndex + 1) % colors.length];
        const prevColor = colors[(currentColorIndex - 1 + colors.length) % colors.length];

        // Highlight words in sentence
        let sentence = entry.english || '';
        const wordRegex = new RegExp(`\\b${escapeRegex(entry.word)}\\b`, 'gi');
        sentence = sentence.replace(wordRegex, `<span class="highlight" style="color: ${colors[currentColorIndex]}">$&</span>`);

        if (nextWord) {
            const nextWordRegex = new RegExp(`\\b${escapeRegex(nextWord)}\\b`, 'gi');
            sentence = sentence.replace(nextWordRegex, `<span class="highlight" style="color: ${nextColor}">$&</span>`);
        }

        if (prevWord) {
            const prevWordRegex = new RegExp(`\\b${escapeRegex(prevWord)}\\b`, 'gi');
            sentence = sentence.replace(prevWordRegex, `<span class="highlight" style="color: ${prevColor}">$&</span>`);
        }

        englishEl.innerHTML = sentence;
        thaiEl.textContent = entry.thai || '';
    }

    // Swipe handling
    flashcard.addEventListener('touchstart', e => {
        e.preventDefault();
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: false });

    flashcard.addEventListener('touchend', e => {
        e.preventDefault();
        touchEndY = e.changedTouches[0].screenY;
        const swipeDistance = touchStartY - touchEndY;
        const minSwipeDistance = 50;

        if (swipeDistance > minSwipeDistance && currentIndex < entries.length - 1) {
            currentIndex++;
            currentColorIndex = (currentColorIndex + 1) % colors.length;
            displayEntry(currentIndex);
        } else if (swipeDistance < -minSwipeDistance && currentIndex > 0) {
            currentIndex--;
            currentColorIndex = (currentColorIndex - 1 + colors.length) % colors.length;
            displayEntry(currentIndex);
        }
    }, { passive: false });

    // Initialize
    loadData();
});
