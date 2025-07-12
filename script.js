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
    
    // Bright colors for dark theme
    const colors = ['#00ff88', '#ffeb3b', '#00e5ff', '#ff4081']; // Green, Yellow, Cyan, Magenta
    let currentColorIndex = 0;
    
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
            currentColorIndex = Math.floor(Math.random() * colors.length);
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
        wordEl.style.color = colors[currentColorIndex];
        
        // Find next and previous words
        const nextWord = index < entries.length - 1 ? entries[index + 1].word : null;
        const prevWord = index > 0 ? entries[index - 1].word : null;
        const nextColor = colors[(currentColorIndex + 1) % colors.length];
        const prevColor = colors[(currentColorIndex - 1 + colors.length) % colors.length];
        
        // Highlight current word, preserving original case
        let sentence = entry.english;
        const wordRegex = new RegExp(`\\b${entry.word}\\b`, 'gi');
        sentence = sentence.replace(wordRegex, match => `<span class="highlight" style="color: ${colors[currentColorIndex]}">${match}</span>`);
        
        // Highlight next word if exists
        if (nextWord) {
            const nextWordRegex = new RegExp(`\\b${nextWord}\\b`, 'gi');
            sentence = sentence.replace(nextWordRegex, match => `<span class="highlight" style="color: ${nextColor}">${match}</span>`);
        }
        
        // Highlight previous word if exists
        if (prevWord) {
            const prevWordRegex = new RegExp(`\\b${prevWord}\\b`, 'gi');
            sentence = sentence.replace(prevWordRegex, match => `<span class="highlight" style="color: ${prevColor}">${match}</span>`);
        }
        
        englishEl.innerHTML = sentence;
        thaiEl.textContent = entry.thai;
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
            currentColorIndex = (currentColorurrentIndex + 1) % colors.length;
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
