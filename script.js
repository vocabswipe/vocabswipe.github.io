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
      // Use word boundaries and ensure case-insensitive matching
      const regex = new RegExp(`\\b${escapeHTML(word)}\\b`, 'gi');
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
      const uniqueWords = new Set(entries.map(entry => entry.word.toLowerCase()));
      uniqueWordsEl.textContent = uniqueWords.size;
      totalSentencesEl.textContent = entries.length;

      wordCloud.style.display = 'block'; // Ensure word cloud is visible
      displayWordCloud(uniqueWords);
    } catch (error) {
      console.error('Error:', error.message);
      wordCloud.textContent = 'Failed to load vocabulary data. Please check if data/database.jsonl exists and is accessible.';
      wordCloud.style.color = '#ff4081';
      wordCloud.style.fontSize = '1.2rem';
      wordCloud.style.textAlign = 'center';
      wordCloud.style.padding = '20px';
      wordCloud.style.display = 'block'; // Ensure error message is visible
    }
  }

  function isOverlapping(x, y, width, height, placedWords) {
    const padding = 1; // Increased padding for better spacing
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
      const word = entry.word.toLowerCase();
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const maxFreq = Math.max(...Object.values(wordFreq));
    const minFreq = Math.min(...Object.values(wordFreq));
    const containerWidth = window.innerWidth - 40; // Account for padding
    // Dynamically adjust height based on number of words
    const containerHeight = Math.max(window.innerHeight * 2, uniqueWords.size * 100); // At least 100px per word
    wordCloud.style.minHeight = `${containerHeight}px`; // Set dynamic height

    const placedWords = [];
    const wordArray = Array.from(uniqueWords)
      .map(word => ({ word, freq: wordFreq[word] }))
      .sort((a, b) => b.freq - a.freq);

    wordArray.forEach(({ word, freq }, index) => {
      const wordEl = document.createElement('div');
      wordEl.className = 'cloud-word';
      wordEl.textContent = word;
      const size = 1 + (freq / maxFreq) * 2;
      wordEl.style.fontSize = `${size}rem`;
      wordEl.style.color = colors[Math.floor(Math.random() * colors.length)];
      wordEl.style.opacity = '0';
      wordCloud.appendChild(wordEl);

      const { width, height } = wordEl.getBoundingClientRect();
      let x, y, attempts = 0;
      const maxAttempts = 100; // Increased attempts for better placement

      do {
        x = Math.random() * (containerWidth - width);
        y = Math.random() * (containerHeight - height);
        attempts++;
      } while (isOverlapping(x, y, width, height, placedWords) && attempts < maxAttempts);

      if (attempts < maxAttempts) {
        wordEl.style.left = `${x + 20}px`; // Offset for container padding
        wordEl.style.top = `${y + 20}px`; // Offset for container padding
        placedWords.push({ x, y, width, height });
      } else {
        // Fallback placement with slight offset to avoid stacking
        wordEl.style.left = `${Math.random() * (containerWidth - width) + 20}px`;
        wordEl.style.top = `${Math.random() * (containerHeight - height) + 20}px`;
      }

      const normalizedFreq = maxFreq === minFreq ? 0 : (maxFreq - freq) / (maxFreq - minFreq);
      const delay = normalizedFreq * 5000;
      setTimeout(() => {
        wordEl.style.transition = 'opacity 1s ease';
        wordEl.style.opacity = '1';
      }, delay);

      wordEl.addEventListener('click', () => {
        document.querySelectorAll('.cloud-word').forEach(otherWord => {
          if (otherWord !== wordEl) {
            otherWord.style.transition = 'opacity 1s ease';
            otherWord.style.opacity = '0';
          }
        });

        wordEl.style.transition = 'transform 1s ease, opacity 1s ease';
        wordEl.style.transform = 'scale(5)';
        wordEl.style.opacity = '0';

        setTimeout(() => {
          wordCloud.style.display = 'none';
          statsBar.style.display = 'flex'; // Show stats bar when flashcard appears
          statsBar.classList.add('loaded');
          flashcardContainer.style.display = 'flex';
          flashcardContainer.style.opacity = '0';
          flashcardContainer.style.transition = 'opacity 1s ease';
          setTimeout(() => {
            flashcardContainer.style.opacity = '1';
          }, 50);

          currentIndex = entries.findIndex(entry => entry.word.toLowerCase() === word.toLowerCase());
          currentColorIndex = Math.floor(Math.random() * colors.length);
          displayEntry(currentIndex);
        }, 1000);
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
