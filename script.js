document.addEventListener('DOMContentLoaded', () => {
  const wordCloud = document.getElementById('word-cloud');
  const loadingIndicator = document.getElementById('loading-indicator');
  const flashcardContainer = document.getElementById('flashcard-container');
  const flashcard = document.getElementById('flashcard');
  const wordEl = document.getElementById('word');
  const englishEl = document.getElementById('english');
  const thaiEl = document.getElementById('thai');
  const audioErrorEl = document.getElementById('audio-error');
  const logo = document.querySelector('.logo');
  const logoCom = document.querySelector('.logo-com');
  const slogan = document.querySelector('.slogan');
  const header = document.getElementById('header');
  const wordCloudIcon = document.getElementById('word-cloud-icon');
  const donateIcon = document.getElementById('donate-icon');
  const shareIcon = document.getElementById('share-icon');
  const donatePopup = document.getElementById('donate-popup');
  const closePopupIcon = document.getElementById('close-popup-icon');
  const swipeUpTooltip = document.getElementById('swipe-up-tooltip');
  const swipeDownTooltip = document.getElementById('swipe-down-tooltip');
  const tapTooltip = document.getElementById('tap-tooltip');
  const highlightWordsContainer = document.getElementById('highlight-words-container');

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
  let translationY = 0;
  let isPinching = false;
  let currentAudio = null;
  const preloadedAudio = new Set();
  const CACHE_KEY = 'vocabswipe_data_v1';
  let wordTimeouts = [];
  let lastWordIndex = 0;
  let placedWords = [];
  let spatialGrid = null;
  let wordCloudSvg = null;
  let wordArray = [];
  let wordFreq = {};
  let wordCaseMap = new Map();

  let visitCount = parseInt(localStorage.getItem('visitCount') || '0', 10);
  visitCount += 1;
  localStorage.setItem('visitCount', visitCount.toString());

  function isPC() {
    return !('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '');
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

  function createSpatialGrid(width, height, cellSize = 50) {
    const grid = new Map();
    function addToGrid(x, y, width, height, wordObj) {
      const minX = Math.floor(x / cellSize);
      const maxX = Math.floor((x + width) / cellSize);
      const minY = Math.floor(y / cellSize);
      const maxY = Math.floor((y + height) / cellSize);
      for (let i = minX; i <= maxX; i++) {
        for (let j = minY; j <= maxY; j++) {
          const key = `${i},${j}`;
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key).push(wordObj);
        }
      }
    }
    function getNearbyWords(x, y, width, height) {
      const minX = Math.floor(x / cellSize);
      const maxX = Math.floor((x + width) / cellSize);
      const minY = Math.floor(y / cellSize);
      const maxY = Math.floor((y + height) / cellSize);
      const nearby = new Set();
      for (let i = minX; i <= maxX; i++) {
        for (let j = minY; j <= maxY; j++) {
          const key = `${i},${j}`;
          if (grid.has(key)) {
            grid.get(key).forEach(word => nearby.add(word));
          }
        }
      }
      return Array.from(nearby);
    }
    return { addToGrid, getNearbyWords };
  }

  function isOverlapping(x, y, width, height, spatialGrid) {
    const padding = 2;
    const nearbyWords = spatialGrid.getNearbyWords(x, y, width, height);
    for (const word of nearbyWords) {
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
        const wordGroup = document.querySelector('.highlight-word-group');
        if (wordGroup) wordGroup.classList.add('glow');
        setTimeout(() => {
          flashcard.classList.remove('glow');
          if (wordGroup) wordGroup.classList.remove('glow');
        }, 500);
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

  closePopupIcon.addEventListener('click', () => {
    hideDonatePopup();
  });

  shareIcon.addEventListener('click', async () => {
    try {
      const canvas = await html2canvas(document.body, {
        width: window.innerWidth,
        height: window.innerHeight,
        scale: 2,
        backgroundColor: '#000000',
        useCORS: true,
      });

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

      const file = new File([blob], 'vocabswipe_card.png', { type: 'image/png' });

      const shareData = {
        files: [file],
        title: 'VocabSwipe - Learn English Vocabulary',
        text: `Check out this word from VocabSwipe! Master words, swipe by swipe. Visit VocabSwipe.com #VocabSwipe #LearnEnglish`,
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        console.log('Shared successfully via Web Share API');
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'vocabswipe_card.png';
        link.click();
        URL.revokeObjectURL(url);
        console.log('Web Share API not available, image downloaded');

        audioErrorEl.textContent = 'Image downloaded. Share it to Instagram Reels manually!';
        audioErrorEl.style.display = 'block';
        setTimeout(() => {
          audioErrorEl.style.display = 'none';
        }, 3000);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      audioErrorEl.textContent = 'Failed to share: ' + error.message;
      audioErrorEl.style.display = 'block';
      setTimeout(() => {
        audioErrorEl.style.display = 'none';
      }, 3000);
    }
  });

  function showTooltip(tooltip, direction) {
    const isPc = isPC();
    const tooltipIcon = tooltip.querySelector('.tooltip-icon');
    const tooltipText = tooltip.querySelector('.tooltip-text');

    if (isPc) {
      if (direction === 'up') {
        tooltipIcon.src = 'arrow-up.svg';
        tooltipIcon.alt = 'Arrow Up';
        tooltipText.textContent = 'Press Up Arrow for next card';
      } else if (direction === 'down') {
        tooltipIcon.src = 'arrow-down.svg';
        tooltipIcon.alt = 'Arrow Down';
        tooltipText.textContent = 'Press Down Arrow for previous card';
      } else if (direction === 'tap') {
        tooltipIcon.src = 'spacebar.svg';
        tooltipIcon.alt = 'Spacebar';
        tooltipText.textContent = 'Press Spacebar to hear audio';
      }
    } else {
      if (direction === 'up') {
        tooltipIcon.src = 'swipe-up.svg';
        tooltipIcon.alt = 'Swipe Up';
        tooltipText.textContent = 'Swipe up for next card';
      } else if (direction === 'down') {
        tooltipIcon.src = 'swipe-down.svg';
        tooltipIcon.alt = 'Swipe Down';
        tooltipText.textContent = 'Swipe down for previous card';
      } else if (direction === 'tap') {
        tooltipIcon.src = 'tap.svg';
        tooltipIcon.alt = 'Tap';
        tooltipText.textContent = 'Tap to hear audio';
      }
    }

    header.style.filter = 'blur(5px)';
    logo.style.filter = 'blur(5px)';
    logoCom.style.filter = 'blur(5px)';
    slogan.style.filter = 'blur(5px)';
    flashcard.style.filter = 'none';

    const flashcardRect = flashcard.getBoundingClientRect();
    const containerRect = flashcardContainer.getBoundingClientRect();
    const centerX = flashcardRect.left - containerRect.left + flashcardRect.width / 2;
    let centerY;
    if (direction === 'tap') {
      const wordRect = wordEl.getBoundingClientRect();
      const englishRect = englishEl.getBoundingClientRect();
      centerY = wordRect.bottom + (englishRect.top - wordRect.bottom) / 2 - containerRect.top - 10;
    } else {
      centerY = flashcardRect.top - containerRect.top + flashcardRect.height / 2;
    }

    tooltip.style.left = `${centerX}px`;
    tooltip.style.top = `${centerY}px`;

    tooltip.style.display = 'flex';

    setTimeout(() => {
      if (direction === 'tap') {
        tooltip.classList.add('animate-tap');
        setTimeout(() => {
          flashcard.classList.add('glow');
          flashcard.style.setProperty('--glow-color', '#00ff88');
          const wordGroup = document.querySelector('.highlight-word-group');
          if (wordGroup) wordGroup.classList.add('left');
          setTimeout(() => {
            flashcard.classList.remove('glow');
            if (wordGroup) wordGroup.classList.remove('glow');
          }, 500);
        }, 1000);
      } else {
        tooltip.classList.add(direction === 'up' ? 'animate-up' : 'animate-down');
      }
    }, 10);

    setTimeout(() => {
      tooltip.style.display = 'none';
      tooltip.classList.remove(direction === 'tap' ? 'animate-tap' : direction === 'up' ? 'animate-up' : 'animate-down');
      if (
        swipeUpTooltip.style.display === 'none' &&
        swipeDownTooltip.style.display === 'none' &&
        tapTooltip.style.display === 'none'
      ) {
        header.style.filter = 'none';
        logo.style.filter = 'none';
        logoCom.style.filter = 'none';
        slogan.style.filter = 'none';
      }
    }, direction === 'tap' ? 2500 : 2000);
  }

  async function loadData() {
    try {
      wordCloud.style.display = 'block';
      loadingIndicator.style.display = 'block';
      loadingIndicator.style.opacity = '1';

      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        console.log('Loading data from localStorage cache');
        entries = JSON.parse(cachedData);
        if (entries.length > 0) {
          loadingIndicator.style.transition = 'opacity 0.3s ease';
          loadingIndicator.style.opacity = '0';
          setTimeout(() => {
            loadingIndicator.style.display = 'none';
            displayWordCloud(0);
          }, 300);
          return;
        }
      }

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

      localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
      console.log(`Loaded ${entries.length} entries and cached in localStorage`);

      loadingIndicator.style.transition = 'opacity 0.3s ease';
      loadingIndicator.style.opacity = '0';
      setTimeout(() => {
        loadingIndicator.style.display = 'none';
        displayWordCloud(0);
      }, 300);
    } catch (error) {
      console.error('LoadData Error:', error);
      loadingIndicator.style.display = 'none';
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

  function displayWordCloud(startIndex = 0) {
    if (!wordFreq || Object.keys(wordFreq).length === 0) {
      wordFreq = {};
      wordCaseMap = new Map();
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
      wordArray = Array.from(wordCaseMap.entries())
        .map(([lowerWord, originalWord]) => ({ word: originalWord, freq: wordFreq[lowerWord] }))
        .sort((a, b) => b.freq - a.freq);
    }

    const maxFreq = Math.max(...Object.values(wordFreq));
    const containerWidth = window.innerWidth;
    const containerHeight = Math.max(window.innerHeight * 1.5, wordCaseMap.size * 15);
    wordCloud.style.width = `${containerWidth}px`;
    wordCloud.style.height = `${containerHeight}px`;

    if (startIndex === 0) {
      wordCloud.innerHTML = '';
      wordCloud.appendChild(loadingIndicator);
      placedWords = [];
      spatialGrid = createSpatialGrid(containerWidth, containerHeight);
      wordCloudSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      wordCloudSvg.className = 'word-cloud-lines';
      wordCloudSvg.style.position = 'absolute';
      wordCloudSvg.style.top = '0';
      wordCloudSvg.style.left = '0';
      wordCloudSvg.style.width = `${containerWidth}px`;
      wordCloudSvg.style.height = `${containerHeight}px`;
      wordCloudSvg.style.zIndex = '5';
      wordCloudSvg.style.pointerEvents = 'none';
      wordCloud.appendChild(wordCloudSvg);
    } else {
      document.querySelectorAll('.cloud-word').forEach(word => {
        word.style.transition = 'opacity 0.3s ease';
        word.style.opacity = '1';
        const duration = 2 + Math.random() * 3;
        const delay = Math.random() * 3;
        word.style.animation = `twinkle ${duration}s infinite ${delay}s`;
      });
      if (wordCloudSvg) {
        wordCloudSvg.style.transition = 'opacity 0.3s ease';
        wordCloudSvg.style.opacity = '1';
      }
    }

    if (wordArray.length === 0) {
      wordCloud.innerHTML = '<div class="error-message">No words to display in word cloud.</div>';
      wordCloud.style.display = 'flex';
      wordCloud.style.alignItems = 'center';
      wordCloud.style.justifyContent = 'center';
      wordCloud.style.height = '100vh';
      return;
    }

    const initialDisplayCount = Math.ceil(wordArray.length * 0.05);
    const remainingWords = wordArray.length - initialDisplayCount;
    const delayPerWord = remainingWords > 0 ? 4.1675 : 0;

    if (startIndex === 0) {
      wordArray.slice(0, initialDisplayCount).forEach(({ word, freq }) => {
        const wordEl = document.createElement('div');
        wordEl.className = 'cloud-word';
        wordEl.textContent = word;
        const size = 0.8 + (freq / maxFreq) * 2.2;
        wordEl.style.fontSize = `${size}rem`;
        const wordColor = colors[Math.floor(Math.random() * colors.length)];
        wordEl.style.color = wordColor;
        wordColors.set(word.toLowerCase(), wordColor);
        wordEl.style.opacity = '1';
        const duration = 2 + Math.random() * 3;
        const delay = Math.random() * 3;
        wordEl.style.animation = `twinkle ${duration}s infinite ${delay}s`;
        wordCloud.appendChild(wordEl);

        const { width, height } = wordEl.getBoundingClientRect();
        let x, y, placed = false;
        const maxAttempts = 500;

        for (let attempts = 0; attempts < maxAttempts && !placed; attempts++) {
          x = Math.random() * (containerWidth - width);
          y = Math.random() * (containerHeight - height);
          if (!isOverlapping(x, y, width, height, spatialGrid)) {
            wordEl.style.left = `${x}px`;
            wordEl.style.top = `${y}px`;
            const wordObj = { x, y, width, height, word, element: wordEl };
            placedWords.push(wordObj);
            spatialGrid.addToGrid(x, y, width, height, wordObj);
            placed = true;
          }
        }

        if (!placed) {
          console.warn(`Could not place word: ${word}`);
          wordEl.remove();
          return;
        }

        addWordEventListener(wordEl, word);
      });
    }

    wordArray.slice(Math.max(initialDisplayCount, startIndex)).forEach(({ word, freq }, index) => {
      const actualIndex = initialDisplayCount + index;
      if (actualIndex < startIndex) return;
      const timeoutId = setTimeout(() => {
        const wordEl = document.createElement('div');
        wordEl.className = 'cloud-word';
        wordEl.textContent = word;
        const size = 0.8 + (freq / maxFreq) * 2.2;
        wordEl.style.fontSize = `${size}rem`;
        const wordColor = colors[Math.floor(Math.random() * colors.length)];
        wordEl.style.color = wordColor;
        wordColors.set(word.toLowerCase(), wordColor);
        wordEl.style.opacity = '0';
        const duration = 2 + Math.random() * 3;
        const delay = Math.random() * 3;
        wordEl.style.animation = `twinkle ${duration}s infinite ${delay}s`;
        wordCloud.appendChild(wordEl);

        const { width, height } = wordEl.getBoundingClientRect();
        let x, y, placed = false;
        const maxAttempts = 500;

        for (let attempts = 0; attempts < maxAttempts && !placed; attempts++) {
          x = Math.random() * (containerWidth - width);
          y = Math.random() * (containerHeight - height);
          if (!isOverlapping(x, y, width, height, spatialGrid)) {
            wordEl.style.left = `${x}px`;
            wordEl.style.top = `${y}px`;
            const wordObj = { x, y, width, height, word, element: wordEl };
            placedWords.push(wordObj);
            spatialGrid.addToGrid(x, y, width, height, wordObj);
            placed = true;
          }
        }

        if (!placed) {
          console.warn(`Could not place word: ${word}`);
          wordEl.remove();
          return;
        }

        wordEl.style.transition = 'opacity 0.3s ease';
        wordEl.style.opacity = '1';
        lastWordIndex = actualIndex + 1;

        addWordEventListener(wordEl, word);
      }, (actualIndex - startIndex) * delayPerWord);
      wordTimeouts.push(timeoutId);
    });

    const lineTimeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        if (startIndex === 0 || !wordCloudSvg.hasChildNodes()) {
          wordCloudSvg.innerHTML = '';
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
              wordCloudSvg.appendChild(line);
            });
          });
        }
        wordCloudSvg.style.opacity = '1';
      });
    }, (wordArray.length - startIndex) * delayPerWord + 100);
    wordTimeouts.push(lineTimeoutId);
  }

  function drawConnectingLine(word1El, word2El) {
    if (!word1El || !word2El) return null;

    const word1Rect = word1El.getBoundingClientRect();
    const word2Rect = word2El.getBoundingClientRect();
    const containerRect = highlightWordsContainer.getBoundingClientRect();

    const x1 = word1Rect.right - containerRect.left + 5;
    const x2 = word2Rect.left - containerRect.left - 5;
    const y = word1Rect.top + word1Rect.height / 2 - containerRect.top;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', '#ffffff');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-opacity', '0');
    line.style.transition = 'stroke-opacity 0.5s ease';

    return line;
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

    highlightWordsContainer.innerHTML = '';
    const highlightedWords = wordsToHighlight.filter(w => entry.english.toLowerCase().includes(w.word.toLowerCase()));
    const currentWordObj = highlightedWords.find(w => w.word.toLowerCase() === currentWord.toLowerCase());
    const nextWordObj = highlightedWords.find(w => w.word.toLowerCase() !== currentWord.toLowerCase());

    const wordGroup = document.createElement('div');
    wordGroup.className = 'highlight-word-group';
    highlightWordsContainer.appendChild(wordGroup);

    let currentWordEl = null;
    let nextWordEl = null;

    if (currentWordObj) {
      currentWordEl = document.createElement('span');
      currentWordEl.className = 'highlight-word current-word';
      currentWordEl.textContent = currentWordObj.word;
      currentWordEl.style.color = currentWordObj.color;
      currentWordEl.style.transform = 'translateX(-300px)';
      currentWordEl.style.opacity = '0';
      wordGroup.appendChild(currentWordEl);
    }

    if (nextWordObj) {
      nextWordEl = document.createElement('span');
      nextWordEl.className = 'highlight-word next-word';
      nextWordEl.textContent = nextWordObj.word;
      nextWordEl.style.color = nextWordObj.color;
      nextWordEl.style.transform = 'translateX(300px)';
      nextWordEl.style.opacity = '0';
      wordGroup.appendChild(nextWordEl);
    }

    if (currentWordEl && nextWordEl) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.className = 'highlight-word-line';
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '5';
      const line = drawConnectingLine(currentWordEl, nextWordEl);
      if (line) svg.appendChild(line);
      wordGroup.appendChild(svg);
    }

    setTimeout(() => {
      if (currentWordEl) {
        currentWordEl.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
        currentWordEl.style.transform = 'translateX(0)';
        currentWordEl.style.opacity = '1';
      }
      if (nextWordEl) {
        nextWordEl.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
        nextWordEl.style.transform = 'translateX(0)';
        nextWordEl.style.opacity = '1';
      }
      if (currentWordEl && nextWordEl) {
        const word1Rect = currentWordEl.getBoundingClientRect();
        const word2Rect = nextWordEl.getBoundingClientRect();
        const containerRect = highlightWordsContainer.getBoundingClientRect();
        const x1 = word1Rect.right - containerRect.left + 5;
        const x2 = word2Rect.left - containerRect.left - 5;
        const y = word1Rect.top + word1Rect.height / 2 - containerRect.top;
        const line = wordGroup.querySelector('.highlight-word-line line');
        if (line) {
          line.setAttribute('x1', x1);
          line.setAttribute('x2', x2);
          line.setAttribute('y1', y);
          line.setAttribute('y2', y);
          line.setAttribute('stroke-opacity', '0.10');
          line.style.transition = 'stroke-opacity 0.5s ease';
        }
      }
    }, 100);

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

    shareIcon.style.display = 'block';
  }

  function addWordEventListener(wordEl, word) {
    wordEl.addEventListener('click', () => {
      stopAudio();
      wordTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      wordTimeouts = [];
      document.querySelectorAll('.cloud-word').forEach(otherWord => {
        if (otherWord !== wordEl) {
          otherWord.style.transition = 'none';
          otherWord.style.opacity = '0';
          otherWord.style.animation = 'none';
        }
      });
      if (wordCloudSvg) {
        wordCloudSvg.style.transition = 'none';
        wordCloudSvg.style.opacity = '0';
      }
      wordCloud.style.transform = 'scale(1) translate(0px, 0px)';
      wordCloud.style.transformOrigin = 'center center';
      currentScale = 1;
      translateX = 0;
      translationY = 0;

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
          if (wordCloudSvg) wordCloudSvg.style.opacity = '1';

          flashcardContainer.style.display = 'flex';
          flashcardContainer.style.opacity = '0';
          flashcardContainer.style.transition = 'opacity 1s ease';
          flashcardContainer.style.opacity = '1';

          header.style.display = 'flex';
          header.style.opacity = '0';
          header.style.transition = 'opacity 1s ease';
          header.style.opacity = '1';
          donateIcon.style.display = 'block';
          shareIcon.style.display = 'block';

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

          if (visitCount <= 100) {
            setTimeout(() => {
              showTooltip(swipeUpTooltip, 'up');
              setTimeout(() => {
                showTooltip(swipeDownTooltip, 'down');
                setTimeout(() => {
                  showTooltip(tapTooltip, 'tap');
                }, 2500);
              }, 2500);
            }, 6000);
          }
        }, 700);
      }, 300);
    });
  }

  wordCloudIcon.addEventListener('click', () => {
    stopAudio();
    flashcardContainer.style.transition = 'opacity 0.7s ease';
    flashcardContainer.style.opacity = '0';
    header.style.transition = 'opacity 0.7s ease';
    header.style.opacity = '0';
    donateIcon.style.display = 'none';
    shareIcon.style.display = 'none';
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

      displayWordCloud(lastWordIndex);
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
      const wordGroup = document.querySelector('.highlight-word-group');
      if (wordGroup) {
        wordGroup.style.transition = 'none';
        wordGroup.style.opacity = '0';
      }
      setTimeout(() => {
        currentIndex++;
        currentColorIndex = (currentColorIndex + 1) % colors.length;
        displayEntry(currentIndex);
      }, 0);
      lastSwipeTime = Date.now();
    } else if (swipeDistance < -minSwipeDistance && currentIndex > 0) {
      console.log('Swipe down detected, going to previous entry');
      stopAudio();
      const wordGroup = document.querySelector('.highlight-word-group');
      if (wordGroup) {
        wordGroup.style.transition = 'none';
        wordGroup.style.opacity = '0';
      }
      setTimeout(() => {
        currentIndex--;
        currentColorIndex = (currentColorIndex - 1 + colors.length) % colors.length;
        displayEntry(currentIndex);
      }, 0);
      lastSwipeTime = Date.now();
    }
  }, { passive: false });

  document.addEventListener('keydown', e => {
    if (flashcardContainer.style.display === 'flex') {
      if (e.key === 'ArrowUp' && currentIndex < entries.length - 1) {
        console.log('Arrow up pressed, going to next entry');
        stopAudio();
        const wordGroup = document.querySelector('.highlight-word-group');
        if (wordGroup) {
          wordGroup.style.transition = 'none';
          wordGroup.style.opacity = '0';
        }
        setTimeout(() => {
          currentIndex++;
          currentColorIndex = (currentColorIndex + 1) % colors.length;
          displayEntry(currentIndex);
        }, 0);
        lastSwipeTime = Date.now();
      } else if (e.key === 'ArrowDown' && currentIndex > 0) {
        console.log('Arrow down pressed, going to previous entry');
        stopAudio();
        const wordGroup = document.querySelector('.highlight-word-group');
        if (wordGroup) {
          wordGroup.style.transition = 'none';
          wordGroup.style.opacity = '0';
        }
        setTimeout(() => {
          currentIndex--;
          currentColorIndex = (currentColorIndex - 1 + colors.length) % colors.length;
          displayEntry(currentIndex);
        }, 0);
        lastSwipeTime = Date.now();
      } else if (e.key === ' ') {
        e.preventDefault();
        console.log('Spacebar pressed, triggering flashcard click');
        flashcard.click();
      }
    }
  });

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
      wordCloud.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translationY}px)`;
      pinchStartDistance = pinchDistance;
    } else if (e.touches.length === 1 && currentScale > 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - (wordCloud._lastX || e.touches[0].clientX);
      const deltaY = e.touches[0].clientY - (wordCloud._lastY || e.touches[0].clientY);
      translateX += deltaX / currentScale;
      translationY += deltaY / currentScale;
      wordCloud.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translationY}px)`;
      wordCloud._lastX = e.touches[0].clientX;
      wordCloud._lastY = e.touches[0].clientY;
    }
  }, { passive: false });

  wordCloud.addEventListener('touchend', e => {
    wordCloud._lastX = null;
    wordCloud._lastY = null;
    isPinching = false;
  }, { passive: true });

  loadData();
});
