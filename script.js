document.addEventListener('DOMContentLoaded', () => {
    const flashcard = document.getElementById('flashcard');
    const wordEl = document.getElementById('word');
    const englishEl = document.getElementById('english');
    const thaiEl = document.getElementById('thai');
    
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
            displayEntry(currentIndex);
        })
        .catch(error => {
            console.error('Error:', error);
            wordEl.textContent = 'Error';
            englishEl.textContent = 'Failed to load data';
            thaiEl.textContent = '';
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
        flashcard.classList.add('swiping');
    });
    
    flashcard.addEventListener('touchend', e => {
        touchEndY = e.changedTouches[0].screenY;
        flashcard.classList.remove('swiping');
        
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
