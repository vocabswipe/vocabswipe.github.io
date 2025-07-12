document.addEventListener('DOMContentLoaded', () => {
    const flashcard = document.getElementById('flashcard');
    const wordEl = document.getElementById('word');
    const englishEl = document.getElementById('english');
    const thaiEl = document.getElementById('thai');
    const statsBar = document.getElementById('stats-bar');
    const totalWordsEl = document.getElementById('total-words');
    const uniqueWordsEl = document.getElementById('unique-words');
    const totalSentencesEl = document.getElementById('total-sentences');
    
    let entries = [];
    let currentIndex = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    
    // Fetch and parse JSONL file
    async function loadData() {
        try {
            const response = await fetch('data/database.jsonl');
            if (!response.ok) throw new Error('Failed to load database.jsonl');
            const data = await response.text();
            entries = data.trim().split('\n').map(line => JSON.parse(line));
            if (!entries.length) throw new Error('No entries in database.jsonl');
            
            // Random first entry
            currentIndex = Math.floor(Math.random() * entries.length);
            displayEntry(currentIndex);
            
            // Update stats
            totalWordsEl.textContent = entries.length;
            uniqueWordsEl.textContent = new Set(entries.map(entry => entry.word.toLowerCase())).size;
            totalSentencesEl.textContent = entries.length;
            
            // Fade in stats bar
            statsBar.classList.add('loaded');
        } catch (error) {
            console.error('Error:', error);
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
        wordEl.textContent = entry.word;
        
        // Highlight the word in the English sentence
        const wordRegex = new RegExp(`\\b${entry.word}\\b`, 'gi');
        englishEl.innerHTML = entry.english.replace(wordRegex, `<span class="highlight">${entry.word}</span>`);
        thaiEl.textContent = entry.thai;
    }
    
    // Swipe handling
    flashcard.addEventListener('touchstart', e => {
        e.preventDefault(); // Prevent default touch behavior
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: false });
    
    flashcard.addEventListener('touchend', e => {
        e.preventDefault(); // Prevent default touch behavior
        touchEndY = e.changedTouches[0].screenY;
        const swipeDistance = touchStartY - touchEndY;
        const minSwipeDistance = 50;
        
        if (swipeDistance > minSwipeDistance && currentIndex < entries.length - 1) {
            currentIndex++;
            displayEntry(currentIndex);
        } else if (swipeDistance < -minSwipeDistance && currentIndex > 0) {
            currentIndex--;
            displayEntry(currentIndex);
        }
    }, { passive: false });
    
    // Initialize
    loadData();
});
