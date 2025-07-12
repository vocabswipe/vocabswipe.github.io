document.addEventListener('DOMContentLoaded', () => {
  const wordCloud = document.getElementById('word-cloud');
  const flashcardContainer = document.getElementById('flashcard-container');
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
  const colors = ['#00ff88', '#ffeb3b', '#00e5ff', '#ff4081', '#ff9100', '#e040fb'];
  let currentColorIndex = 0;
  let wordColors = new Map(); // Store word-to-color mappings

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function highlightWords(sentence, wordsToHighlight) {
    let escapedSentence = escapeHTML(sentence);
    for (const { word, color } of wordsToHighlight) {
      const regex = new RegExp(`\\b${escapeHTML(word)}\\b`, 'g'); // Case-sensitive matching
      escapedSentence = escapedSentence.replace(regex, match =>
        `<span class="highlight" style="color: ${color}">${match}</span>`
      );
    }
    return escapedSentence;
  }

  async function loadData() {
    try {
      console.log('Attempting to fetch data/database.jsonl');
      const response = await fetch('data/database.jsonl');
      if (!response.ok) throw new Error(`Failed to load database.jsonl: ${response.status}`);
      const data = await response.text();
      entries = data.trim().split('\n').map(line => JSON.parse(line));
      if (!entries.length) throw new Error('No entries in database.jsonl');
      console.log(`Loaded ${entries.length} entries`);

      totalWordsEl.textContent = entries.length;
      const uniqueWords = new Set(entries.map(entry => entry.word)); // Preserve case for uniqueness
      uniqueWordsEl.textContent = uniqueWords.size;
      totalSentencesEl.textContent = entries.length;

      wordCloud.style.display = 'block';
      displayWordCloud(uniqueWords);
    } catch (error) {
      console.error('Error:', error.message);
      wordCloud.textContent = 'Failed to load vocabulary data. Please check if data/database.jsonl exists and is accessible.';
      wordCloud.style.color = '#ff4081';
      wordCloud.style.fontSize = '1.2rem';
      wordCloud.style.textAlign = 'center';
      wordCloud.style.padding = '20px';
      wordCloud.style.display = 'block';
    }
  }

  function isOverlapping(x, y, width, height, placedWords) {
    const padding = 1; // Tighter padding for denser placement
    for (const word of placedWords) {
      const left1 = x;
      const right1 = x + width;
      const top1 = y;
      const bottom1 = y + height;
      const left2 = word.x;
      const right2 = word.x + word.width;
      const top2 = word.y;
      const bottom2 = word.y + word.height;

      if (
        right1 + padding > left2 &&
        left1 - padding < right2 &&
        bottom1 + padding > top2 &&
        top1 - padding < bottom2
      ) {
        return true;
      }
    }
    return false;
  }

  function displayWordCloud(uniqueWords) {
    const wordFreq = {};
    entries.forEach(entry => {
      const word = entry.word; // Preserve case
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const maxFreq = Math.max(...Object.values(wordFreq));
    const minFreq = Math.min(...Object.values(wordFreq));
    const containerWidth = window.innerWidth - 20; // Reduced padding
    // Further reduce height for 200% density (from 25px to 12.5px per word)
    const containerHeight = Math.max(window.innerHeight * 0.5, uniqueWords.size * 12.5);
    wordCloud.style.minHeight = `${containerHeight}px`;

    const placedWords = [];
    const wordArray = Array.from(uniqueWords)
      .map(word => ({ word, freq: wordFreq[word] }))
      .sort((a, b) => b.freq - a.freq);

    // Optimized spiral placement
    wordArray.forEach(({ word, freq }, index) => {
      const wordEl = document.createElement('div');
      wordEl.className = 'cloud-word';
      wordEl.textContent = word; // Use original case
      const size = 0.6 + (freq / maxFreq) * 1.2; // Further reduced font size for density
      wordEl.style.fontSize = `${size}rem`;
      const wordColor = colors[Math.floor(Math.random() * colors.length)];
      wordEl.style.color = wordColor;
      wordColors.set(word, wordColor); // Store color with original case
      wordEl.style.opacity = '0';
      wordCloud.appendChild(wordEl);

      const { width, height } = wordEl.getBoundingClientRect();
      let x, y, attempts = 0;
      const maxAttempts = 300; // Increased for denser placement

      // Spiral placement
      let placed = false;
      let radius = 0;
      let angle = 0;
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;
      const spiralStep = 3; // Tighter spiral step

      while (!placed && attempts < maxAttempts) {
        x = centerX + radius * Math.cos(angle) - width / 2;
        y = centerY + radius * Math.sin(angle) - height / 2;
        if (x >= 0 && x + width <= containerWidth && y >= 0 && y + height <= containerHeight) {
          if (!isOverlapping(x, y, width, height, placedWords)) {
            placed = true;
            wordEl.style.left = `${x + 10}px`; // Reduced offset
            wordEl.style.top = `${y + 10}px`;
            placedWords.push({ x, y, width, height });
          }
        }
        angle += 0.3; // Tighter angle increment
        radius += spiralStep / (2 * Math.PI);
        attempts++;
      }

      if (!placed) {
        // Fallback grid placement for efficiency
        const gridSize = 10; // Smaller grid for density
        let gridPlaced = false;
        for (let gy = 0; gy < containerHeight && !gridPlaced; gy += gridSize) {
          for (let gx = 0; gx < containerWidth && !gridPlaced; gx += gridSize) {
            x = gx;
            y = gy;
            if (
              x + width <= containerWidth &&
              y + height <= containerHeight &&
              !isOverlapping(x, y, width, height, placedWords)
            ) {
              wordEl.style.left = `${x + 10}px`;
              wordEl.style.top = `${y + 10}px`;
              placedWords.push({ x, y, width, height });
              gridPlaced = true;
            }
          }
        }
        if (!gridPlaced) {
          wordEl.remove(); // Remove if no placement found
        }
      }

      const normalizedFreq = maxFreq === minFreq ? 0 : (maxFreq - freq) / (maxFreq - minFreq);
      const delay = normalizedFreq * 2000; // Reduced delay
      setTimeout(() => {
        wordEl.style.transition = 'opacity 0.3s ease';
        wordEl.style.opacity = '1';
      }, delay);

      wordEl.addEventListener('click', () => {
        document.querySelectorAll('.cloud-word').forEach(otherWord => {
          if (otherWord !== wordEl) {
            otherWord.style.transition = 'opacity 0.3s ease';
            otherWord.style.opacity = '0';
          }
        });

        wordEl.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        wordEl.style.transform = 'scale(5)';
        wordEl.style.opacity = '0';

        setTimeout(() => {
          wordCloud.style.display = 'none';
          statsBar.style.display = 'flex';
          statsBar.classList.add('loaded');
          flashcardContainer.style.display = 'flex';
          flashcardContainer.style.opacity = '0';
          flashcardContainer.style.transition = 'opacity 0.3s ease';
          setTimeout(() => {
            flashcardContainer.style.opacity = '1';
          }, 50);

          currentIndex = entries.findIndex(entry => entry.word === word); // Case-sensitive match
          currentColorIndex = colors.indexOf(wordColors.get(word));
          displayEntry(currentIndex);
        }, 300);
      });
    });
    console.log(`Rendered ${wordArray.length} words in word cloud`);
  }

  function displayEntry(index) {
    if (index < 0 || index >= entries.length) return;
    const entry = entries[index];
    const currentWord = entry.word;

    wordEl.textContent = currentWord;
    wordEl.style.color = colors[currentColorIndex];

    const prevWord = index > 0 ? entries[index - 1].word : null;
    const nextWord = index < entries.length - 1 ? entries[index + 1].word : null;

    const wordsToHighlight = [];
    if (prevWord) {
      const prevColor = colors[(currentColorIndex - 1 + colors.length) % colors.length];
      wordsToHighlight.push({ word: prevWord, color: prevColor });
    }
    wordsToHighlight.push({ word: currentWord, color: colors[currentColorIndex] });
    if (nextWord) {
      const nextColor = colors[(currentColorIndex + 1) % colors.length];
      wordsToHighlight.push({ word: nextWord, color: nextColor });
    }

    englishEl.innerHTML = highlightWords(entry.english, wordsToHighlight);
    thaiEl.textContent = entry.thai;
  }

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

  loadData();
});
