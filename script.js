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
    
    // Fetch and parse JSONL file
    fetch('data/database.jsonl')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load database.jsonl');
            return response.text();
        })
        .then(data => {
            entries = data.trim().split('\n').map(line => JSON.parse(line));
            if (entries.length === 0) throw new Error('No entries in database.jsonl');
            
            // Random first entry
            currentIndex = Math.floor(Math.random() * entries.length);
            displayEntry(currentIndex);
            
            // Update stats
            const totalWords = entries.length;
            const uniqueWords = new Set(entries.map(entry => entry.word.toLowerCase())).size;
            const totalSentences = entries.length; // English sentences = total entries
            totalWordsEl.textContent = totalWords;
            uniqueWordsEl.textContent = uniqueWords;
            totalSentencesEl.textContent = totalSentences;
            
            // Fade in stats bar
            statsBar.classList.add('loaded');
        })
        .catch(error => {
            console.error('Error:', error);
            wordEl.textContent = 'Error';
            englishEl.textContent = 'Failed to load data';
            thaiEl.textContent = '';
            statsBar.style.display = 'none'; // Hide stats on error
        });
    
    // Display entry at given index
    function displayEntry(index) {
        if (index < 0 || index >= entries.length) return;
        const entry = entries[index];
        wordEl.textContent = entry.word;
        
        // Highlight the word in the English sentence
        const wordRegex = new RegExp(`\\b${entry.word}\\b`, 'gi');
        const highlightedEnglish = entry.english.replace(wordRegex, `<span class="highlight">${entry.word}</span>`);
        englishEl.innerHTML = highlightedEnglish;
        
        thaiEl.textContent = entry.thai;
    }
    
    // Swipe handling
    let touchStartY = 0;
    let touchEndY = 0;
    
    flashcard.addEventListener('touchstart', e => {
        touchStartY = e.changedTouches[0].screenY;
    });
    
    flashcard.addEventListener('touchend', e => {
        touchEndY = e.changedTouches[0].screenY;
        
        const swipeDistance = touchStartY - touchEndY;
        const minSwipeDistance = 50; // Minimum swipe distance in pixels
        
        if (swipeDistance > minSwipeDistance && currentIndex < entries.length - 1) {
            // Swipe up: next entry
            currentIndex++;
            displayEntry(currentIndex);
        } else if (swipeDistance < -minSwipeDistance && currentIndex > 0) {
            // Swipe down: previous entry
            currentIndex--;
            displayEntry(currentIndex);
        }
    });
});
