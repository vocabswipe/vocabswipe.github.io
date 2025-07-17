document.addEventListener('DOMContentLoaded', () => {
  const wordCloud = document.getElementById('word-cloud');
  const flashcardContainer = document.getElementById('flashcard-container');
  const flashcard = document.getElementById('flashcard');
  const wordEl = document.getElementById('word');
  const englishEl = document.getElementById('english');
  const thaiEl = document.getElementById('thai');
  const audioErrorEl = document.getElementById('audio-error');
  const logo = document.querySelector('.logo');
  const logoCom = document.querySelector('.logo-com');
  const logoWrapper = document.querySelector('.logo-wrapper');
  const slogan = document.querySelector('.slogan');
  const header = document.getElementById('header');
  const wordCloudIcon = document.getElementById('word-cloud-icon');
  const donateIcon = document.getElementById('donate-icon');
  const donatePopup = document.getElementById('donate-popup');

  let entries = [];
  let currentIndex = 0;
  let touchStartY = 0;
  let touchEndY = 0;
  let touchStartTime = 0;
  let lastSwipeTime = 0;
  const colors = ['#00ff88', '#ffeb3b', '#00e5ff', '#ff4081', '#ff9100', '#e040fb'];
  let currentColorIndex = 0;
  let wordColors = new Map();
  let initialScale = 1;
  let currentScale = 1;
  let translateX = 0;
  let translateY = 0;
  let isPinching = false;
  let currentAudio = null;
  const preloadedAudio = new Set();

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
    wordsToHighlight.sort((a, b) => b.word.length - a.word.length);
    for (const { word, color } of wordsToHighlight) {
      const escapedWord = escapeHTML(word);
      const regex = new RegExp(`\\b${escapedWord}\\b(?![^<]*>)`, 'gi');
      escapedSentence = escapedSentence.replace(regex, `<span class="highlight" style="color: ${color};">$&</span>`);
    }
    return escapedSentence;
  }

  async function loadData() {
    try {
      wordCloud.style.display = 'block';
      console.log('Fetching data/database.jsonl...');
      const response = await fetch('data/database.jsonl');
      if (!response.ok) {
        throw new Error(`Failed to fetch data/database.jsonl: ${response.status} ${response.statusText}`);
      }
      const data = await response.text();
      if (!data.trim()) {
        throw new Error('data/database.jsonl is empty');
      }
      entries = data.trim().split('\n').map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          throw new Error(`Invalid JSON at line ${index + 1}: ${e.message}`);
        }
      });
      if (!entries.length) {
        throw new Error('No valid entries in data/database.jsonl');
      }

      console.log(`Loaded ${entries.length} entries`);
      displayWordCloud();
    } catch (error) {
      console.error('LoadData Error:', error);
      wordCloud.innerHTML = `
        <div class="error-message">
          Failed to load vocabulary data. Please ensure 'data/database.jsonl' exists and is valid.
          <br>Error: ${escapeHTML(error.message)}
        </div>`;
      wordCloud.style.display = 'flex';
      wordCloud.style.alignItems = 'center';
      wordCloud.style.justifyContent = 'center';
      wordCloud.style.height = '100vh';
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

  function adjustWordSize(word, element, maxWidth) {
    element.style.fontSize = '3rem';
    element.textContent = word;
    let fontSize = parseFloat(window.getComputedStyle(element).fontSize);
    const padding = 20;

    while (element.scrollWidth > maxWidth - padding && fontSize > 1) {
      fontSize -= 0.1;
      element.style.fontSize = `${fontSize}rem`;
    }
  }

  function stopAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    audioErrorEl.style.display = 'none';
  }

  function preloadAudio(index) {
    const range = 10;
    const start = Math.max(0, index - range);
    const end = Math.min(entries.length - 1, index + range);

    for (let i = start; i <= end; i++) {
      if (i !== index && entries[i].audio) {
        const audioUrl = `/data/${entries[i].audio}`;
        if (!preloadedAudio.has(audioUrl)) {
          console.log(`Preloading audio: ${audioUrl}`);
          const audio = new Audio(audioUrl);
          audio.preload = 'auto';
          audio.load();
          preloadedAudio.add(audioUrl);
        }
      }
    }
  }

  function playAudio(audioUrl, wordColor) {
    stopAudio();
    console.log(`Attempting to play audio: ${audioUrl}`);
    currentAudio = new Audio(audioUrl);
    setTimeout(() => {
      currentAudio.play().then(() => {
        console.log('Audio playing successfully');
        flashcard.classList.add('glow');
        flashcard.style.setProperty('--glow-color', wordColor);
        setTimeout(() => flashcard.classList.remove('glow'), 500);
        audioErrorEl.style.display = 'none';
      }).catch(e => {
        console.error('Error playing audio:', e);
        audioErrorEl.textContent = 'Failed to play audio: ' + e.message;
        audioErrorEl.style.display = 'block';
        setTimeout(() => audioErrorEl.style.display = 'none', 2000);
      });
    }, 500);
  }

  function showDonatePopup() {
    donatePopup.style.display = 'flex';
    flashcardContainer.style.filter = 'blur(5px)';
    header.style.filter = 'blur(5px)';
    document.body.style.overflow = 'hidden';
  }

  function hideDonatePopup() {
    donatePopup.style.display = 'none';
    flashcardContainer.style.filter = 'none';
    header.style.filter = 'none';
    document.body.style.overflow = 'hidden';
  }

  donatePopup.addEventListener('click', e => {
    if (e.target === donatePopup) {
      hideDonatePopup();
    }
  });

  donateIcon.addEventListener('click', () => {
    showDonatePopup();
  });

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

        svg.style.transition = 'opacity 0.3s ease';
        svg.style.opacity = '0';

        const rect = wordEl.getBoundingClientRect();
        const centerX = window.innerWidth / 2 - rect.width / 2 - rect.left;
        const centerY = window.innerHeight / 2 - rect.height / 2 - rect.top;

        wordEl.style.transition = 'transform 0.7s ease, opacity 0.7s ease';
        wordEl.style.transform = `translate(${centerX}px, ${centerY}px) scale(3)`;
        wordEl.style.zIndex = '20';

        setTimeout(() => {
          wordEl.style.opacity = '0';

          setTimeout(() => {
            wordCloud.style.display = 'none';
            wordEl.style.transform = 'none';
            wordEl.style.opacity = '1';
            wordEl.style.zIndex = '10';
            svg.style.opacity = '1';

            flashcardContainer.style.display = 'flex';
            flashcardContainer.style.opacity = '0';
            flashcardContainer.style.transition = 'opacity 1s ease';
            flashcardContainer.style.opacity = '1';

            header.style.display = 'flex';
            header.style.opacity = '0';
            header.style.transition = 'opacity 1s ease';
            header.style.opacity = '1';
            donateIcon.style.display = 'block';

            flashcardContainer.style.height = '100vh';
            flashcardContainer.style.justifyContent = 'center';
            document.body.style.overflow = 'hidden';

            setTimeout(() => {
              logo.style.transition = 'transform 1s ease, opacity 1s ease';
              logo.style.transform = 'translateX(0)';
              logo.style.opacity = '1';
              setTimeout(() => {
                logoCom.style.transition = 'transform 1s ease, opacity 1s ease';
                logoCom.style.transform = 'translateX(0)';
                logoCom.style.opacity = '1';
              }, 1000);
            }, 4000);

            setTimeout(() => {
              slogan.style.transition = 'transform 1s ease, opacity 1s ease';
              slogan.style.transform = 'translateX(0)';
              slogan.style.opacity = '1';
            }, 4000);

            const matchingIndices = entries
              .map((entry, idx) => ({ entry, idx }))
              .filter(({ entry }) => entry.word.toLowerCase() === word.toLowerCase())
              .map(({ idx }) => idx);

            if (matchingIndices.length > 0) {
              currentIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];
            } else {
              currentIndex = entries.findIndex(entry => entry.word.toLowerCase() === word.toLowerCase());
            }

            currentColorIndex = colors.indexOf(wordColors.get(word.toLowerCase()));
            displayEntry(currentIndex);
          }, 700);
        }, 300);
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
      wordsToHighlight.push({ word: nextWord, color: nextColor });
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

  wordCloudIcon.addEventListener('click', () => {
    stopAudio();
    flashcardContainer.style.transition = 'opacity 0.7s ease';
    flashcardContainer.style.opacity = '0';
    header.style.transition = 'opacity 0.7s ease';
    header.style.opacity = '0';
    donateIcon.style.display = 'none';
    hideDonatePopup();

    setTimeout(() => {
      flashcardContainer.style.display = 'none';
      header.style.display = 'none';
      document.body.style.overflow = 'auto';
      wordCloud.style.display = 'block';
      wordCloud.style.opacity = '0';
      wordCloud.style.transition = 'opacity 0.7s ease';
      wordCloud.style.opacity = '1';

      logo.style.transform = 'translateX(-100%)';
      logo.style.opacity = '0';
      logoCom.style.transform = 'translateX(100%)';
      logoCom.style.opacity = '0';
      slogan.style.transform = 'translateX(100%)';
      slogan.style.opacity = '0';

      document.querySelectorAll('.cloud-word').forEach(word => {
        word.style.transition = 'opacity 0.3s ease';
        word.style.opacity = '1';
      });
      const svg = document.querySelector('.word-cloud-lines');
      if (svg) {
        svg.style.transition = 'opacity 0.3s ease';
        svg.style.opacity = '1';
      }
    }, 700);
  });

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
      console.log('Swipe up detected, going to next entry');
      stopAudio();
      currentIndex++;
      currentColorIndex = (currentColorIndex + 1) % colors.length;
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
