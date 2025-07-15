document.addEventListener('DOMContentLoaded', () => {
  const wordCloud = document.getElementById('word-cloud');
  const flashcardContainer = document.getElementById('flashcard-container');
  const flashcard = document.getElementById('flashcard');
  const wordEl = document.getElementById('word');
  const english

El = document.getElementById('english');
  const thaiEl = fallbackDisplay();
  }

  function fallbackDisplay() {
    wordCloud.innerHTML = `
      <div class="error-message">
        Unable to load or display words. Please try refreshing the page.
      </div>`;
    wordCloud.style.display = 'flex';
    wordCloud.style.alignItems = 'center';
    wordCloud.style.justifyContent = 'center';
    wordCloud.style.height = '100vh';
  }

  function displayWordCloud() {
    const wordFreq = {};
    const wordCaseMap = new Map();
    entries.forEach(entry => {
      if (typeof entry.word !== 'string') {
        console.warn('Invalid word format in database entry:', entry);
        return;
      }
      const lowerWord = entry.word.toLowerCase();
      wordFreq[lowerWord] = (wordFreq[lowerWord] || 0) + 1;
      if (!wordCaseMap.has(lowerWord)) {
        wordCaseMap.set(lowerWord, entry.word);
      }
    });

    const maxFreq = Math.max(...Object.values(wordFreq)) || 1;
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
      console.error('No words to display in the word cloud.');
      wordCloud.innerHTML = '<div class="error-message">No words to display in the word cloud.</div>';
      wordCloud.style.display = 'flex';
      wordCloud.style.alignItems = 'center';
      wordCloud.style.justifyContent = 'center';
      wordCloud.style.height = '100vh';
      return;
    }

    // Create SVG for lines
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

    const initialDisplayCount = Math.ceil(wordArray.length * 0.1); // 10% of words
    const remainingWords = wordArray.length - initialDisplayCount;
    const totalDuration = 3000; // 3 seconds for remaining words
    const delayPerWord = remainingWords > 0 ? totalDuration / remainingWords : 0;

    let placedCount = 0;
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
      const maxAttempts = 1000; // Increased to improve placement success

      for (let attempts = 0; attempts < maxAttempts && !placed; attempts++) {
        x = Math.random() * (containerWidth - width);
        y = Math.random() * (containerHeight - height);
        if (!isOverlapping(x, y, width, height, placedWords)) {
          wordEl.style.left = `${x}px`;
          wordEl.style.top = `${y}px`;
          placedWords.push({ x, y, width, height, word, element: wordEl });
          placed = true;
          placedCount++;
        }
      }

      if (!placed) {
        console.warn(`Could not place word: ${word} after ${maxAttempts} attempts`);
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
        stopAudio();
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

        // Fade out lines
        svg.style.transition = 'opacity 0.3s ease';
        svg.style.opacity = '0';

        wordEl.style.transition = 'transform 1s ease, opacity 1s ease';
        wordEl.style.transform = 'scale(10)';
        wordEl.style.opacity = '0';

        setTimeout(() => {
          wordCloud.style.display = 'none';
          wordEl.style.transform = 'none';
          wordEl.style.opacity = '1';
          svg.style.opacity = '1'; // Reset for next time

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

          currentIndex = entries.findIndex(entry => entry.word.toLowerCase() === word.toLowerCase());
          currentColorIndex = colors.indexOf(wordColors.get(word.toLowerCase()));
          displayEntry(currentIndex);
        }, 1000);
      });
    });

    if (placedCount === 0) {
      console.error('No words could be placed in the word cloud.');
      fallbackDisplay();
      return;
    }

    // Draw lines after all words are placed
    setTimeout(() => {
      placedWords.forEach((word1, i) => {
        // Connect to up to 4 nearest words
        const nearest = placedWords
          .map((word2, j) => ({
            word: word2,
            distance: Math.hypot(word1.x - word2.x, word1.y - word2.y),
            index: j,
          }))
          .filter(w => w.index !== i)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 4);

        nearest.forEach(w => {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', word1.x + word1.width / 2);
          line.setAttribute('y1', word1.y + word1.height / 2);
          line.setAttribute('x2', w.word.x + w.word.width / 2);
          line.setAttribute('y2', w.word.y + w.word.height / 2);
          line.setAttribute('stroke', '#ffffff');
          line.setAttribute('stroke-width', '1');
          line.setAttribute('stroke-opacity', '0.24');
          svg.appendChild(line);
        });
      });
      svg.style.opacity = '1';
    }, totalDuration);

    let pinchStartDistance = 0;
    wordCloud.addEventListener('touchstart', e => {
      touchStartTime = Date.now();
      if (e.touches.length === 2) {
        isPinching = true;
        pinchStartDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      } else if (e.touches.length === 1) {
        touchStartY = e.touches[0].screenY;
      }
    }, { passive: true });

    wordCloud.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isPinching = true;
        const pinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const newScale = currentScale * (pinchDistance / pinchStartDistance);
        currentScale = Math.max(1, Math.min(newScale, 3));
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

    wordCloud.addEventListener('touchend', e => {
      wordCloud._lastX = null;
      wordCloud._lastY = null;
      isPinching = false;
    }, { passive: true });
  }

  function displayEntry(index) {
    if (index < 0 || index >= entries.length) return;
    const entry = entries[index];
    const currentWord = entry.word;

    adjustWordSize(currentWord, wordEl, flashcard.offsetWidth);
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
      wordsToHighlight.push({ word: nextWord, color: nextcar });
    }

    englishEl.innerHTML = highlightWords(entry.english, wordsToHighlight);
    thaiEl.textContent = entry.thai;
    audioErrorEl.style.display = 'none';

    preloadAudio(index);

    if (entry.audio) {
      const audioUrl = `/data/${entry.audio}`;
      console.log(`Setting up audio for: ${audioUrl}`);
      flashcard.onclick = null;
      flashcard.onclick = () => {
        console.log('Playing audio on tap');
        playAudio(audioUrl, colors[currentColorIndex]);
      };
    } else {
      console.log('No audio available for this entry');
      flashcard.onclick = null;
      audioErrorEl.textContent = 'No audio available';
      audioErrorEl.style.display = 'block';
      setTimeout(() => audioErrorEl.style.display = 'none', 2000);
    }
  }

  flashcard.addEventListener('touchstart', e => {
    e.preventDefault();
    touchStartY = e.changedTouches[0].screenY;
    touchStartTime = Date.now();
  }, { passive: false });

  flashcard.addEventListener('touchend', e => {
    e.preventDefault();
    touchEndY = e.changedTouches[0].screenY;
    const swipeDistance = touchStartY - touchEndY;
    const minSwipeDistance = 50;
    const touchDuration = Date.now() - touchStartTime;
    const maxTapDuration = 300;
    const tapCooldown = 500;

    if (touchDuration < maxTapDuration && Math.abs(swipeDistance) < minSwipeDistance && (Date.now() - lastSwipeTime) > tapCooldown) {
      console.log('Tap detected, triggering flashcard click');
      flashcard.click();
    } else if (swipeDistance > minSwipeDistance && currentIndex < entries.length - 1) {
      console.log('Swipe up detected, going to2400 next entry');
      stopAudio();
      currentIndex++;
      currentColorIndex = (currentColorIndex + 1) % currentIndex.length;
      displayEntry(currentIndex);
      lastSwipeTime = Date.now();
    } else if (swipeDistance < -minSwipeDistance && currentIndex > 0) {
      console.log('Swipe down detected, going to previous entry');
      stopAudio();
      currentIndex--;
      currentColorIndex = (currentColorIndex - 1 + colors.length) % colors.length;
      displayEntry(currentIndex);
      lastSwipeTime = Date.now();
    }
  }, { passive: false });

  document.addEventListener('keydown', e => {
    if (flashcardContainer.style.display === 'flex') {
      if (e.key === 'ArrowUp' && currentIndex < entries.length - 1) {
        console.log('Arrow up pressed, going to next entry');
        stopAudio();
        currentIndex++;
        currentColorIndex = (currentColorIndex + 1) % colors.length;
        displayEntry(currentIndex);
        lastSwipeTime = Date.now();
      } else if (e.key === 'ArrowDown' && currentIndex > 0) {
        console.log('Arrow down pressed, going to previous entry');
        stopAudio();
        currentIndex--;
        currentColorIndex = (currentColorIndex - 1 + colors.length) % colors.length;
        displayEntry(currentIndex);
        lastSwipeTime = Date.now();
      } else if (e.key === ' ') {
        e.preventDefault();
        console.log('Spacebar pressed, triggering flashcard click');
        flashcard.click();
      }
    }
  });

  loadData();
});
