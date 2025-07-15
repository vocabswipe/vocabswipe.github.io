const {
  entries,
  wordCloud,
  flashcardContainer,
  flashcard,
  wordEl,
  englishEl,
  thaiEl,
  storageBox,
  storageLines,
  colors,
  wordColors,
  logo,
  slogan,
  displayEntry,
  adjustWordSize,
  highlightWords,
  storedWords,
  currentIndex,
  currentColorIndex
} = window.vocabSwipe;

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

function displayWordCloud() {
  const wordFreq = {};
  const wordCaseMap = new Map();
  entries.forEach(entry => {
    if (typeof entry.word !== 'string') {
      throw new Error('Invalid word format in database entry');
    }
    const lowerWord = entry.word.toLowerCase();
    wordFreq[lowerWord] = (wordFreq[lowerWord] || 0) + 1;
    if (!wordCaseMap.has(lowerWord)) {
      wordCaseMap.set(lowerWord, entry.word);
    }
  });

  const maxFreq = Math.max(...Object.values(wordFreq));
  const minFreq = Math.max(1, Math.min(...Object.values(wordFreq)));
  const containerWidth = window.innerWidth;
  const containerHeight = Math.max(window.innerHeight * 1.5, wordCaseMap.size * 15);
  wordCloud.style.width = `${containerWidth}px`;
  wordCloud.style.height = `${containerHeight}px`;

  wordCloud.innerHTML = '';
  const placedWords = [];
  const wordArray = Array.from(wordCaseMap.entries())
    .map(([lowerWord, originalWord]) => ({ word: originalWord, freq: wordFreq[lowerWord] }))
    .sort((a, b) => b.freq - a.freq);

  if (wordArray.length === 0) {
    wordCloud.innerHTML = '<div class="error-message">No words to display in word cloud.</div>';
    wordCloud.style.display = 'flex';
    wordCloud.style.alignItems = 'center';
    wordCloud.style.justifyContent = 'center';
    wordCloud.style.height = '100vh';
    return;
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.className = 'word-cloud-lines';
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = `${containerWidth}px`;
  svg.style.height = `${containerHeight}px`;
  svg.style.zIndex = '5';
  svg.style.pointerEvents = 'none';
  wordCloud.appendChild(svg);

  const initialDisplayCount = Math.ceil(wordArray.length * 0.1);
  const remainingWords = wordArray.length - initialDisplayCount;
  const totalDuration = 3000;
  const delayPerWord = remainingWords > 0 ? totalDuration / remainingWords : 0;

  wordArray.forEach(({ word, freq }, index) => {
    const wordEl = document.createElement('div');
    wordEl.className = 'cloud-word';
    wordEl.textContent = word;
    const size = 0.8 + (freq / maxFreq) * 2.2;
    wordEl.style.fontSize = `${size}rem`;
    const wordColor = colors[Math.floor(Math.random() * colors.length)];
    wordEl.style.color = wordColor;
    wordColors.set(word.toLowerCase(), wordColor);
    wordEl.style.opacity = index < initialDisplayCount ? '1' : '0';
    wordCloud.appendChild(wordEl);

    const { width, height } = wordEl.getBoundingClientRect();
    let x, y, placed = false;
    const maxAttempts = 500;

    for (let attempts = 0; attempts < maxAttempts && !placed; attempts++) {
      x = Math.random() * (containerWidth - width);
      y = Math.random() * (containerHeight - height);
      if (!isOverlapping(x, y, width, height, placedWords)) {
        wordEl.style.left = `${x}px`;
        wordEl.style.top = `${y}px`;
        placedWords.push({ x, y, width, height, word, element: wordEl });
        placed = true;
      }
    }

    if (!placed) {
      console.warn(`Could not place word: ${word}`);
      wordEl.remove();
      return;
    }

    if (index >= initialDisplayCount) {
      const normalizedFreq = maxFreq === minFreq ? 0 : (maxFreq - freq) / (maxFreq - minFreq);
      const delay = normalizedFreq * 500 + (index - initialDisplayCount) * delayPerWord;
      setTimeout(() => {
        wordEl.style.transition = 'opacity 0.3s ease';
        wordEl.style.opacity = '1';
      }, delay);
    }

    wordEl.addEventListener('click', () => {
      wordCloud.style.transform = 'scale(1) translate(0px, 0px)';
      wordCloud.style.transformOrigin = 'center center';

      document.querySelectorAll('.cloud-word').forEach(otherWord => {
        if (otherWord !== wordEl) {
          otherWord.style.transition = 'opacity 0.3s ease';
          otherWord.style.opacity = '0';
        }
      });

      svg.style.transition = 'opacity 0.3s ease';
      svg.style.opacity = '0';

      wordEl.style.transition = 'transform 1s ease, opacity 1s ease';
      wordEl.style.transform = 'scale(10)';
      wordEl.style.opacity = '0';

      setTimeout(() => {
        wordCloud.style.display = 'none';
        wordEl.style.transform = 'none';
        wordEl.style.opacity = '1';
        svg.style.opacity = '1';

        flashcardContainer.style.display = 'flex';
        flashcardContainer.style.opacity = '0';
        flashcardContainer.style.transition = 'opacity 1s ease';
        flashcardContainer.style.opacity = '1';

        flashcardContainer.style.height = '100vh';
        flashcardContainer.style.justifyContent = 'center';
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
          logo.style.transition = 'transform 1s ease, opacity 1s ease';
          logo.style.transform = 'translateX(0)';
          logo.style.opacity = '1';
        }, 4000);

        setTimeout(() => {
          slogan.style.transition = 'transform 1s ease, opacity 1s ease';
          slogan.style.transform = 'translateX(0)';
          slogan.style.opacity = '1';
        }, 4000);

        window.vocabSwipe.currentIndex = entries.findIndex(entry => entry.word.toLowerCase() === word.toLowerCase());
        window.vocabSwipe.currentColorIndex = colors.indexOf(wordColors.get(word.toLowerCase()));
        displayEntry(window.vocabSwipe.currentIndex);
      }, 1000);
    });
  });

  setTimeout(() => {
    placedWords.forEach((word1, i) => {
      const nearest = placedWords
        .map((word2, j) => ({
          word: word2,
          distance: Math.hypot(word1.x - word2.x, word1.y - word2.y),
          index: j,
        }))
        .filter(w => w.index !== i)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 6);

      nearest.forEach(w => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', word1.x + word1.width / 2);
        line.setAttribute('y1', word1.y + word1.height / 2);
        line.setAttribute('x2', w.word.x + w.word.width / 2);
        line.setAttribute('y2', w.word.y + w.word.height / 2);
        line.setAttribute('stroke', '#ffffff');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-opacity', '0.10');
        svg.appendChild(line);
      });
    });
    svg.style.opacity = '1';
  }, totalDuration);

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
      const newScale = window.vocabSwipe.currentScale * (pinchDistance / pinchStartDistance);
      window.vocabSwipe.currentScale = Math.max(1, Math.min(newScale, 3));
      wordCloud.style.transform = `scale(${window.vocabSwipe.currentScale}) translate(${window.vocabSwipe.translateX}px, ${window.vocabSwipe.translateY}px)`;
      pinchStartDistance = pinchDistance;
    } else if (e.touches.length === 1 && window.vocabSwipe.currentScale > 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - (wordCloud._lastX || e.touches[0].clientX);
      const deltaY = e.touches[0].clientY - (wordCloud._lastY || e.touches[0].clientY);
      window.vocabSwipe.translateX += deltaX / window.vocabSwipe.currentScale;
      window.vocabSwipe.translateY += deltaY / window.vocabSwipe.currentScale;
      wordCloud.style.transform = `scale(${window.vocabSwipe.currentScale}) translate(${window.vocabSwipe.translateX}px, ${window.vocabSwipe.translateY}px)`;
      wordCloud._lastX = e.touches[0].clientX;
      wordCloud._lastY = e.touches[0].clientY;
    }
  }, { passive: false });

  wordCloud.addEventListener('touchend', e => {
    wordCloud._lastX = null;
    wordCloud._lastY = null;
  }, { passive: true });
}

function animateSwipeUp(index, wordColor) {
  const currentEntry = entries[index];
  const nextEntry = entries[index + 1];
  const currentWord = currentEntry.word;
  const nextWord = nextEntry ? nextEntry.word : null;
  const nextColor = nextEntry ? colors[(currentColorIndex + 1) % colors.length] : null;

  // Create a clone of the current word to animate to storage box
  const wordClone = document.createElement('div');
  wordClone.className = 'storage-word';
  wordClone.textContent = currentWord;
  wordClone.style.color = wordColor;
  wordClone.style.fontSize = getStorageWordSize();
  wordClone.style.position = 'absolute';
  const wordRect = wordEl.getBoundingClientRect();
  wordClone.style.left = `${wordRect.left - storageBox.getBoundingClientRect().left}px`;
  wordClone.style.top = `${wordRect.top - storageBox.getBoundingClientRect().top}px`;
  storageBox.appendChild(wordClone);

  // Calculate destination position in storage box
  const storageRect = storageBox.getBoundingClientRect();
  const maxWidth = storageRect.width;
  const maxHeight = storageRect.height;
  let x, y, placed = false;
  const maxAttempts = 500;

  for (let attempts = 0; attempts < maxAttempts && !placed; attempts++) {
    x = Math.random() * (maxWidth - wordClone.offsetWidth);
    y = Math.random() * (maxHeight - wordClone.offsetHeight);
    if (!isOverlapping(x, y, wordClone.offsetWidth, wordClone.offsetHeight, storedWords)) {
      placed = true;
    }
  }

  if (!placed) {
    console.warn(`Could not place word in storage: ${currentWord}`);
    wordClone.remove();
    return;
  }

  storedWords.push({ x, y, width: wordClone.offsetWidth, height: wordClone.offsetHeight, word: currentWord, element: wordClone });

  // Animate word to storage box
  wordClone.style.transition = 'transform 1s ease, font-size 0.5s ease';
  wordClone.style.transform = `translate(${x - (wordRect.left - storageBox.getBoundingClientRect().left)}px, ${y - (wordRect.top - storageBox.getBoundingClientRect().top)}px)`;
  wordClone.style.fontSize = getStorageWordSize();

  // Draw line to previous word
  if (storedWords.length > 1) {
    const prevWord = storedWords[storedWords.length - 2];
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', prevWord.x + prevWord.width / 2);
    line.setAttribute('y1', prevWord.y + prevWord.height / 2);
    line.setAttribute('x2', x + wordClone.offsetWidth / 2);
    line.setAttribute('y2', y + wordClone.offsetHeight / 2);
    line.setAttribute('stroke', '#ffffff');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-opacity', '0.10');
    storageLines.appendChild(line);
  }

  // Fade out English sentence except next word, and Thai sentence
  const englishSpans = englishEl.querySelectorAll('.highlight');
  englishSpans.forEach(span => {
    const spanText = span.textContent.toLowerCase();
    if (nextWord && spanText === nextWord.toLowerCase()) {
      // Keep next word, prepare to move it
      span.style.transition = 'none';
    } else {
      span.style.transition = 'opacity 0.3s ease';
      span.style.opacity = '0';
    }
  });
  thaiEl.style.transition = 'opacity 0.3s ease';
  thaiEl.style.opacity = '0';
  wordEl.style.transition = 'opacity 0.3s ease';
  wordEl.style.opacity = '0';

  setTimeout(() => {
    if (nextEntry) {
      // Prepare next card
      wordEl.style.opacity = '0';
      thaiEl.style.opacity = '0';
      englishEl.innerHTML = '';
      thaiEl.textContent = '';

      // Display next entry without main word in English sentence
      const wordsToHighlight = [];
      const prevWord = index > 0 ? entries[index - 1].word : null;
      if (prevWord) {
        const prevColor = colors[(currentColorIndex - 1 + colors.length) % colors.length];
        wordsToHighlight.push({ word: prevWord, color: prevColor });
      }
      wordsToHighlight.push({ word: nextEntry.word, color: nextColor });
      const nextEnglishWithoutMain = nextEntry.english.replace(new RegExp(`\\b${nextEntry.word}\\b`, 'i'), '<span class="highlight" style="color: ' + nextColor + ';">_</span>');
      englishEl.innerHTML = highlightWords(nextEnglishWithoutMain, wordsToHighlight);
      thaiEl.textContent = nextEntry.thai;

      // Find the placeholder (_) position
      const placeholder = englishEl.querySelector('.highlight');
      const placeholderRect = placeholder.getBoundingClientRect();

      // Move the next word to the placeholder position
      englishSpans.forEach(span => {
        if (span.textContent.toLowerCase() === nextWord.toLowerCase()) {
          const spanRect = span.getBoundingClientRect();
          span.style.position = 'absolute';
          span.style.left = `${spanRect.left - flashcard.getBoundingClientRect().left}px`;
          span.style.top = `${spanRect.top - flashcard.getBoundingClientRect().top}px`;
          span.style.transition = 'transform 0.5s ease';
          setTimeout(() => {
            span.style.transform = `translate(${placeholderRect.left - spanRect.left}px, ${placeholderRect.top - spanRect.top}px)`;
          }, 50);
        }
      });

      // Fade in next card content
      setTimeout(() => {
        wordEl.style.color = nextColor;
        adjustWordSize(nextEntry.word, wordEl, flashcard.offsetWidth);
        wordEl.style.transition = 'opacity 0.3s ease';
        wordEl.style.opacity = '1';
        thaiEl.style.transition = 'opacity 0.3s ease';
        thaiEl.style.opacity = '1';
        englishEl.style.transition = 'opacity 0.3s ease';
        englishEl.style.opacity = '1';
        displayEntry(index + 1);
      }, 600);
    }
  }, 300);
}

function getStorageWordSize() {
  const baseSize = 1.5;
  const reductionFactor = 0.05;
  const size = Math.max(0.8, baseSize - storedWords.length * reductionFactor);
  return `${size}rem`;
}

displayWordCloud();
