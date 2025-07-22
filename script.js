document.addEventListener('DOMContentLoaded', () => {
  const cardDeck = document.getElementById('card-deck');
  const loadingIndicator = document.getElementById('loading-indicator');
  const flashcardContainer = document.getElementById('flashcard-container');
  const flashcard = document.getElementById('flashcard');
  const cardInner = flashcard.querySelector('.card-inner');
  const frontWordEl = document.getElementById('front-word');
  const wordEl = document.getElementById('word');
  const englishEl = document.getElementById('english');
  const thaiEl = document.getElementById('thai');
  const audioErrorEl = document.getElementById('audio-error');

  let entries = [];
  let currentEntries = [];
  let currentIndex = 0;
  let touchStartY = 0;
  let touchEndY = 0;
  let touchStartTime = 0;
  let lastSwipeTime = 0;
  let currentColor = '';
  let wordColors = new Map();
  let initialScale = 1;
  let currentScale = 1;
  let translateX = 0;
  let translationY = 0;
  let isPinching = false;
  let currentAudio = null;
  const preloadedAudio = new Set();
  const CACHE_KEY = 'vocabswipe_data_v1';
  let wordFreq = {};
  let wordCaseMap = new Map();
  let wordEntryMap = new Map(); // Maps words to their entries
  let visitCount = parseInt(localStorage.getItem('visitCount') || '0', 10);
  visitCount += 1;
  localStorage.setItem('visitCount', visitCount.toString());

  const unoColors = [
    { bg: '#ff0000' },
    { bg: '#0000ff' },
    { bg: '#00ff00' },
    { bg: '#ffff00' }
  ];

  function isPC() {
    return !('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function highlightWord(sentence, word) {
    const escapedSentence = escapeHTML(sentence);
    const escapedWord = escapeHTML(word);
    const regex = new RegExp(`\\b\\w*${escapedWord}\\w*\\b(?![^<]*>)`, 'gi');
    return escapedSentence.replace(regex, `<span class="highlight">$&</span>`);
  }

  function getConsistentUnoColor(word) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = word.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % unoColors.length;
    if (word.toLowerCase() === 'money') {
      return unoColors[3];
    }
    return unoColors[index];
  }

  function adjustWordSize(word, element, maxWidth, isMiniCard = false) {
    const baseFontSize = isMiniCard ? 1.2 : 2.5; // Increased base font size for mini-card
    element.style.fontSize = `${baseFontSize}rem`;
    element.style.whiteSpace = 'nowrap';
    element.textContent = word;
    let fontSize = parseFloat(window.getComputedStyle(element).fontSize);
    const padding = isMiniCard ? 5 : 10;

    while (element.scrollWidth > maxWidth - padding && fontSize > (isMiniCard ? 0.6 : 0.8)) {
      fontSize -= 0.05;
      element.style.fontSize = `${fontSize}rem`;
    }

    if (isMiniCard) {
      const flashcardWidth = 280; // Updated flashcard width
      const miniCardWidth = 140; // Updated mini-card width
      const scaleRatio = miniCardWidth / flashcardWidth;
      const targetFontSize = fontSize * scaleRatio;
      element.style.fontSize = `${Math.max(targetFontSize, 0.6)}rem`;
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
    const end = Math.min(currentEntries.length - 1, index + range);

    for (let i = start; i <= end; i++) {
      if (i !== index && currentEntries[i].audio) {
        const audioUrl = `/data/${currentEntries[i].audio}`;
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

  function playAudio(audioUrl) {
    stopAudio();
    console.log(`Attempting to play audio: ${audioUrl}`);
    currentAudio = new Audio(audioUrl);
    setTimeout(() => {
      currentAudio.play().then(() => {
        console.log('Audio playing successfully');
        audioErrorEl.style.display = 'none';
      }).catch(e => {
        console.error('Error playing audio:', e);
        audioErrorEl.textContent = 'Failed to play audio: ' + e.message;
        audioErrorEl.style.display = 'block';
        setTimeout(() => audioErrorEl.style.display = 'none', 2000);
      });
    }, 500);
  }

  async function loadData() {
    try {
      cardDeck.style.display = 'grid';
      loadingIndicator.style.opacity = '1';

      localStorage.removeItem(CACHE_KEY);

      console.log('Fetching data/database.jsonl...');
      const cacheBuster = Date.now();
      const response = await fetch(`data/database.jsonl?cb=${cacheBuster}`, {
        cache: 'no-store'
      });
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

      localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
      console.log(`Loaded ${entries.length} entries and cached in localStorage`);

      loadingIndicator.style.transition = 'opacity 0.3s ease';
      loadingIndicator.style.opacity = '0';
      setTimeout(() => {
        loadingIndicator.style.display = 'none';
        displayCardDeck();
      }, 300);
    } catch (error) {
      console.error('LoadData Error:', error);
      loadingIndicator.style.display = 'none';
      cardDeck.innerHTML = `
        <div class="error-message">
          Failed to load vocabulary data. Please ensure 'data/database.jsonl' exists and is valid.
          <br>Error: ${escapeHTML(error.message)}
        </div>`;
      cardDeck.style.display = 'flex';
      cardDeck.style.alignItems = 'center';
      cardDeck.style.justifyContent = 'center';
      cardDeck.style.height = '100vh';
    }
  }

  function displayCardDeck() {
    if (!wordFreq || Object.keys(wordFreq).length === 0) {
      wordFreq = {};
      wordCaseMap = new Map();
      wordEntryMap = new Map();
      entries.forEach(entry => {
        if (typeof entry.word !== 'string') {
          throw new Error('Invalid word format in database entry');
        }
        const lowerWord = entry.word.toLowerCase();
        wordFreq[lowerWord] = (wordFreq[lowerWord] || 0) + 1;
        if (!wordCaseMap.has(lowerWord)) {
          wordCaseMap.set(lowerWord, entry.word);
        }
        if (!wordEntryMap.has(lowerWord)) {
          wordEntryMap.set(lowerWord, []);
        }
        wordEntryMap.get(lowerWord).push(entry);
      });
    }

    cardDeck.innerHTML = '';
    cardDeck.appendChild(loadingIndicator);

    const wordArray = Array.from(wordCaseMap.entries())
      .map(([lowerWord, originalWord]) => ({ word: originalWord, freq: wordFreq[lowerWord] }))
      .sort((a, b) => b.freq - a.freq);

    wordArray.forEach(({ word }) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'mini-card';
      const unoColor = getConsistentUnoColor(word.toLowerCase());
      cardEl.style.backgroundColor = unoColor.bg;
      cardEl.style.border = '3px solid #ffffff';

      const cardInner = document.createElement('div');
      cardInner.className = 'card-inner';
      const cardFront = document.createElement('div');
      cardFront.className = 'card-front';
      const content = document.createElement('div');
      content.className = 'content';

      // Randomly select one entry for this word
      const wordEntries = wordEntryMap.get(word.toLowerCase());
      const randomEntry = wordEntries[Math.floor(Math.random() * wordEntries.length)];

      const wordSpan = document.createElement('span');
      wordSpan.className = 'mini-card-word';
      wordSpan.textContent = randomEntry.word;
      adjustWordSize(randomEntry.word, wordSpan, cardEl.offsetWidth * 0.9, true);

      const englishSpan = document.createElement('div');
      englishSpan.className = 'english';
      englishSpan.innerHTML = highlightWord(randomEntry.english, randomEntry.word);

      const thaiSpan = document.createElement('div');
      thaiSpan.className = 'thai';
      thaiSpan.textContent = randomEntry.thai;

      content.appendChild(wordSpan);
      content.appendChild(englishSpan);
      content.appendChild(thaiSpan);
      cardFront.appendChild(content);
      cardInner.appendChild(cardFront);
      cardEl.appendChild(cardInner);

      cardDeck.appendChild(cardEl);

      addCardEventListener(cardEl, word, randomEntry);
    });
  }

  function addCardEventListener(cardEl, word, selectedEntry) {
    cardEl.addEventListener('click', () => {
      stopAudio();
      document.querySelectorAll('.mini-card').forEach(otherCard => {
        if (otherCard !== cardEl) {
          otherCard.style.transition = 'opacity 0.7s ease';
          otherCard.style.opacity = '0';
        }
      });

      const maxCardWidth = window.innerWidth * 0.95; // Increased for mobile viewport
      cardEl.style.maxWidth = `${maxCardWidth}px`;
      const rect = cardEl.getBoundingClientRect();
      const centerX = window.innerWidth / 2 - rect.width / 2 - rect.left;
      const centerY = window.innerHeight / 2 - rect.height / 2 - rect.top;

      const currentWidth = rect.width;
      const targetWidth = Math.min(currentWidth * 2, maxCardWidth);
      const scaleFactor = Math.min(2, targetWidth / currentWidth);

      cardEl.style.transition = 'transform 0.7s ease';
      cardEl.style.transform = `translate(${centerX}px, ${centerY}px) scale(${scaleFactor})`;
      cardEl.style.zIndex = '20';

      setTimeout(() => {
        cardDeck.style.display = 'none';
        cardEl.style.transform = 'none';
        cardEl.style.zIndex = '10';
        cardEl.style.maxWidth = '';
        const wordSpan = cardEl.querySelector('.mini-card-word');
        wordSpan.style.fontSize = '';

        flashcardContainer.style.display = 'flex';
        flashcardContainer.style.opacity = '0';
        flashcardContainer.style.transition = 'opacity 1s ease';
        flashcardContainer.style.opacity = '1';

        flashcardContainer.style.height = '100vh';
        flashcardContainer.style.justifyContent = 'center';
        document.body.style.overflow = 'hidden';

        currentEntries = entries.filter(entry => entry.word.toLowerCase() === word.toLowerCase());
        currentEntries = shuffleArray([...currentEntries]);
        // Place the selected entry as the first one
        const selectedEntryIndex = currentEntries.findIndex(entry => entry === selectedEntry);
        if (selectedEntryIndex !== -1) {
          [currentEntries[0], currentEntries[selectedEntryIndex]] = [currentEntries[selectedEntryIndex], currentEntries[0]];
        }
        currentIndex = 0;
        currentColor = '#ffffff';

        // Set front word for the initial display
        frontWordEl.textContent = word;
        adjustWordSize(word, frontWordEl, flashcard.offsetWidth * 0.9, true);

        // Trigger flip animation
        cardInner.classList.add('flip');

        displayEntry(currentIndex);
      }, 700);
    });
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function displayEntry(index) {
    if (currentEntries.length === 0) return;
    currentIndex = ((index % currentEntries.length) + currentEntries.length) % currentEntries.length;
    const entry = currentEntries[currentIndex];
    const currentWord = entry.word;

    const unoColor = getConsistentUnoColor(currentWord.toLowerCase());
    flashcard.style.backgroundColor = unoColor.bg;
    flashcard.style.border = '6px solid #ffffff';
    frontWordEl.style.color = '#ffffff';
    wordEl.style.color = '#ffffff';
    englishEl.style.color = '#ffffff';
    thaiEl.style.color = '#ffffff';

    adjustWordSize(currentWord, frontWordEl, flashcard.offsetWidth * 0.9, true);
    adjustWordSize(currentWord, wordEl, flashcard.offsetWidth * 0.9);
    englishEl.innerHTML = highlightWord(entry.english, currentWord);
    thaiEl.textContent = entry.thai;
    audioErrorEl.style.display = 'none';

    preloadAudio(currentIndex);

    if (entry.audio) {
      const audioUrl = `/data/${entry.audio}`;
      console.log(`Setting up audio for: ${audioUrl}`);
      flashcard.onclick = null;
      flashcard.onclick = () => {
        console.log('Playing audio on tap');
        playAudio(audioUrl);
      };
    } else {
      console.log('No audio available for this entry');
      flashcard.onclick = null;
      audioErrorEl.textContent = 'No audio available';
      audioErrorEl.style.display = 'block';
      setTimeout(() => audioErrorEl.style.display = 'none', 2000);
    }
  }

  cardDeck.addEventListener('touchstart', e => {
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

  cardDeck.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      isPinching = true;
      const pinchDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = currentScale * (pinchDistance / pinchStartDistance);
      currentScale = Math.max(1, Math.min(newScale, 3));
      cardDeck.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translationY}px)`;
      pinchStartDistance = pinchDistance;
    } else if (e.touches.length === 1 && currentScale > 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - (cardDeck._lastX || e.touches[0].clientX);
      const deltaY = e.touches[0].clientY - (cardDeck._lastY || e.touches[0].clientY);
      translateX += deltaX / currentScale;
      translationY += deltaY / currentScale;
      cardDeck.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translationY}px)`;
      cardDeck._lastX = e.touches[0].clientX;
      cardDeck._lastY = e.touches[0].clientY;
    }
  }, { passive: false });

  cardDeck.addEventListener('touchend', e => {
    cardDeck._lastX = null;
    cardDeck._lastY = null;
    isPinching = false;
  }, { passive: true });

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
    } else if (swipeDistance > minSwipeDistance) {
      console.log('Swipe up detected, going to next entry');
      stopAudio();
      setTimeout(() => {
        currentIndex++;
        cardInner.classList.remove('flip');
        setTimeout(() => {
          displayEntry(currentIndex);
          cardInner.classList.add('flip');
        }, 300);
      }, 0);
      lastSwipeTime = Date.now();
    } else if (swipeDistance < -minSwipeDistance) {
      console.log('Swipe down detected, going to previous entry');
      stopAudio();
      setTimeout(() => {
        currentIndex--;
        cardInner.classList.remove('flip');
        setTimeout(() => {
          displayEntry(currentIndex);
          cardInner.classList.add('flip');
        }, 300);
      }, 0);
      lastSwipeTime = Date.now();
    }
  }, { passive: false });

  document.addEventListener('keydown', e => {
    if (flashcardContainer.style.display === 'flex') {
      if (e.key === 'ArrowUp') {
        console.log('Arrow up pressed, going to next entry');
        stopAudio();
        setTimeout(() => {
          currentIndex++;
          cardInner.classList.remove('flip');
          setTimeout(() => {
            displayEntry(currentIndex);
            cardInner.classList.add('flip');
          }, 300);
        }, 0);
        lastSwipeTime = Date.now();
      } else if (e.key === 'ArrowDown') {
        console.log('Arrow down pressed, going to previous entry');
        stopAudio();
        setTimeout(() => {
          currentIndex--;
          cardInner.classList.remove('flip');
          setTimeout(() => {
            displayEntry(currentIndex);
            cardInner.classList.add('flip');
          }, 300);
        }, 0);
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
