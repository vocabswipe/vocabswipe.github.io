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
  let wordColors = new Map();
  let initialScale = 1;
  let currentScale = 1;
  let translateX = 0;
  let translateY = 0;

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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
      if (!response.ok) throw new Error(`Failed to load database.jsonl: ${response.status}`);
      const data = await response.text();
      entries = data.trim().split('\n').map(line => JSON.parse(line));
      if (!entries.length) throw new Error('No entries in database.jsonl');

      totalWordsEl.textContent = entries.length;
      const uniqueWords = new Set(entries.map(entry => entry.word.toLowerCase()));
      uniqueWordsEl.textContent = uniqueWords.size;
      totalSentencesEl.textContent = entries.length;

      wordCloud.style.display = 'block';
      displayWordCloud(uniqueWords);
    } catch (error) {
      console.error('Error:', error.message);
      wordCloud.textContent = 'Failed to load vocabulary data. Please check if data/database.jsonl exists.';
      wordCloud.style.color = '#ff4081';
      wordCloud.style.fontSize = '1.2rem';
      wordCloud.style.textAlign = 'center';
      wordCloud.style.padding = '20px';
      wordCloud.style.display = 'block';
    }
  }

  function isOverlapping(x, y, width, height, placedWords) {
    const padding = 2;
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
    const containerWidth = window.innerWidth;
    const containerHeight = Math.max(window.innerHeight * 0.8, uniqueWords.size * 10);
    wordCloud.style.width = `${containerWidth}px`;
    wordCloud.style.height = `${containerHeight}px`;

    const placedWords = [];
    const wordArray = Array.from(uniqueWords)
      .map(word => ({ word, freq: wordFreq[word] }))
      .sort((a, b) => b.freq - a.freq);

    wordArray.forEach(({ word, freq }, index) => {
      const wordEl = document.createElement('div');
      wordEl.className = 'cloud-word';
      wordEl.textContent = word;
      const size = 0.8 + (freq / maxFreq) * 2.2;
      wordEl.style.fontSize = `${size}rem`;
      const wordColor = colors[Math.floor(Math.random() * colors.length)];
      wordEl.style.color = wordColor;
      wordColors.set(word, wordColor);
      wordEl.style.opacity = '0';
      wordCloud.appendChild(wordEl);

      const { width, height } = wordEl.getBoundingClientRect();
      let x, y, placed = false;
      const maxAttempts = 500;

      // Random placement with minimal spacing
      for (let attempts = 0; attempts < maxAttempts && !placed; attempts++) {
        x = Math.random() * (containerWidth - width);
        y = Math.random() * (containerHeight - height);
        if (!isOverlapping(x, y, width, height, placedWords)) {
          wordEl.style.left = `${x}px`;
          wordEl.style.top = `${y}px`;
          placedWords.push({ x, y, width, height });
          placed = true;
        }
      }

      if (!placed) {
        wordEl.remove();
        return;
      }

      const normalizedFreq = maxFreq === minFreq ? 0 : (maxFreq - freq) / (maxFreq - minFreq);
      const delay = normalizedFreq * 1000;
      setTimeout(() => {
        wordEl.style.transition = 'opacity 0.5s ease';
        wordEl.style.opacity = '1';
      }, index * 50 + delay);

      wordEl.addEventListener('click', () => {
        // Reset zoom and transform
        wordCloud.style.transform = 'scale(1) translate(0px, 0px)';
        wordCloud.style.transformOrigin = 'center center';
        currentScale = 1;
        translateX = 0;
        translateY = 0;

        document.querySelectorAll('.cloud-word').forEach(otherWord => {
          if (otherWord !== wordEl) {
            otherWord.style.transition = 'opacity 0.3s ease';
            otherWord.style.opacity = '0';
          }
        });

        wordEl.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        wordEl.style.transform = 'scale(3)';
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

          currentIndex = entries.findIndex(entry => entry.word.toLowerCase() === word);
          currentColorIndex = colors.indexOf(wordColors.get(word));
          displayEntry(currentIndex);
        }, 300);
      });
    });

    // Enable pinch-to-zoom
    let pinchStartDistance = 0;
    wordCloud.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        pinchStartDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    wordCloud.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const pinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const newScale = currentScale * (pinchDistance / pinchStartDistance);
        currentScale = Math.max(1, Math.min(newScale, 3)); // Limit zoom between 1x and 3x
        wordCloud.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`;
        pinchStartDistance = pinchDistance;
      } else if (e.touches.length === 1 && currentScale > 1) {
        e.preventDefault();
        const deltaX = e.touches[0].clientX - (wordCloud._lastX || e.touches[0].clientX);
        const deltaY = e.touches[0].clientY - (wordCloud._lastY || e.touches[0].clientY);
        translateX += deltaX / currentScale;
        translateY += deltaY / currentScale;
        wordCloud.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`;
        wordCloud._lastX = e.touches[0].clientX;
        wordCloud._lastY = e.touches[0].clientY;
      }
    }, { passive: false });

    wordCloud.addEventListener('touchend', () => {
      wordCloud._lastX = null;
      wordCloud._lastY = null;
    }, { passive: true });
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
