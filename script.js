// Fetch and parse the database
async function loadDatabase() {
    try {
        const response = await fetch('data/database.jsonl');
        const text = await response.text();
        const lines = text.trim().split('\n');
        const data = lines.map(line => JSON.parse(line));
        return data;
    } catch (error) {
        console.error('Error loading database:', error);
        return [];
    }
}

// Shuffle array
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Uno card colors
const colors = ['#ff4d4d', '#4d79ff', '#4dff4d', '#ffd11a'];

// Initialize the app
async function init() {
    const data = await loadDatabase();
    
    // Get unique words
    const uniqueWords = [...new Set(data.map(item => item.word))];
    const shuffledWords = shuffle(uniqueWords);

    const wordSelection = document.getElementById('word-selection');
    const cardContainer = document.getElementById('card-container');

    // Create word selection cards
    shuffledWords.forEach(word => {
        const card = document.createElement('div');
        card.classList.add('card', 'word-card');
        card.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        card.innerHTML = `<h2>${word}</h2>`;
        card.addEventListener('click', () => selectWord(word, data));
        wordSelection.appendChild(card);
    });
}

// Handle word selection
function selectWord(word, data) {
    const wordSelection = document.getElementById('word-selection');
    const cardContainer = document.getElementById('card-container');

    // Fade out unselected cards
    const cards = document.querySelectorAll('.word-card');
    cards.forEach(card => {
        if (card.querySelector('h2').textContent !== word) {
            card.classList.add('fade-out');
        } else {
            card.classList.add('scale-up');
        }
    });

    // After animation, show study cards
    setTimeout(() => {
        wordSelection.classList.add('hidden');
        cardContainer.classList.remove('hidden');

        // Filter data for selected word and shuffle
        const wordData = shuffle(data.filter(item => item.word === word));
        showStudyCards(wordData);
    }, 500);
}

// Display study cards
function showStudyCards(wordData) {
    const cardContainer = document.getElementById('card-container');
    cardContainer.innerHTML = '';

    let currentIndex = 0;

    function displayCard(index) {
        if (index >= wordData.length) return;

        const item = wordData[index];
        const card = document.createElement('div');
        card.classList.add('card', 'study-card');
        card.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        card.innerHTML = `
            <h2>${item.word}</h2>
            <p><strong>English:</strong> ${item.english}</p>
            <p><strong>Thai:</strong> ${item.thai}</p>
        `;

        // Play audio on click
        card.addEventListener('click', () => {
            const audio = new Audio(`data/${item.audio}`);
            audio.play();
        });

        cardContainer.appendChild(card);

        // Swipe handling
        let startX = 0;
        card.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
        });

        card.addEventListener('touchend', e => {
            const endX = e.changedTouches[0].clientX;
            const deltaX = endX - startX;

            if (Math.abs(deltaX) > 50) {
                card.classList.add(deltaX > 0 ? 'swipe-right' : 'swipe-left');
                setTimeout(() => {
                    card.remove();
                    currentIndex++;
                    displayCard(currentIndex);
                }, 500);
            }
        });
    }

    displayCard(currentIndex);
}

// Start the app
init();
