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
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, ''');
  }

  function highlightWords(sentence, wordsToHighlight) {
    let escapedSentence = escapeHTML(sentence);
    for (const { word, color } of wordsToHighlight) {
      const regex = new RegExp(`\\b${escapeHTML(word)}\\b`, 'gi');
      escapedSentence = escapedSentence.replace(regex, match =>
        `<span class="highlight" style="color: ${color}">${match}</span>`
      );
    }
    return escapedSentence;
  }

  async function loadData() {
    try {
      const response = await fetch('data/database.jsonl');
      if (!response.ok) throw new Error('Failed to load database.jsonl');
      const data = await response.text();
      entries = data.trim().split('\n').map(line => JSON.parse(line));
      if (!entries.length) throw new Error('No entries in database.jsonl');

      totalWordsEl.textContent = entries.length;
      const uniqueWords = new Set(entries.map(entry => entry.word.toLowerCase()));
      uniqueWordsEl.textContent = uniqueWords.size;
      totalSentencesEl.textContent = entries.length;
      statsBar.classList.add('loaded');

      displayWordCloud(uniqueWords);
    } catch (error) {
      console.error('Error:', error);
      wordEl.textContent = 'Error';
      englishEl.textContent = 'Failed to load data';
      thaiEl.textContent = '';
      statsBar.style.display = 'none';
      wordCloud.style.display = 'none';
    }
  }

  function isOverlapping(x, y, width, height, placedWords) {
    for (const word of placedWords) {
      const dx = x - word.x;
      const dy = y - word.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = (width + word.width) / 2 + 10; // 10px padding
      if (distance < minDistance) return true;
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
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight * 2;
    const placedWords = [];

    // Convert uniqueWords Set to array with frequency for sorting
    const wordArray = Array.from(uniqueWords).map(word => ({
      word,
      freq: wordFreq[word]
    })).sort((a, b) => b.freq - a.freq); // Sort by frequency (descending)

    wordArray.forEach(({ word, freq }, index) => {
      const wordEl = document.createElement('div');
      wordEl.className = 'cloud-word';
      wordEl.textContent = word;
      const size = 1 + (freq / maxFreq) * 2; // Font size 1rem to 3rem
      wordEl.style.fontSize = `${size}rem`;
      wordEl.style.color = colors[Math.floor(Math.random() * colors.length)];
      wordEl.style.opacity = '0';
      wordCloud.appendChild(wordEl);

      // Calculate dimensions after appending to get accurate size
      const { width, height } = wordEl.getBoundingClientRect();
      let x, y, attempts = 0;
      const maxAttempts = 100;

      // Find non-overlapping position
      do {
        x = Math.random() * (containerWidth - width);
        y = Math.random() * (containerHeight - height);
        attempts++;
      } while (isOverlapping(x, y, width, height, placedWords) && attempts < maxAttempts);

      if (attempts < maxAttempts) {
        wordEl.style.left = `${x}px`;
        wordEl.style.top = `${y}px`;
        placedWords.push({ x, y, width, height });
      } else {
        // If no position found, place randomly (fallback)
        wordEl.style.left = `${Math.random() * (containerWidth - width)}px`;
        wordEl.style.top = `${Math.random() * (containerHeight - height)}px`;
      }

      // Fade-in timing: more frequent words appear earlier
      const normalizedFreq = (maxFreq - freq) / (maxFreq - minFreq || 1); // 0 (most frequent) to 1 (least frequent)
      const delay = normalizedFreq * 5000; // 0 to 5 seconds
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
