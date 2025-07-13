document.addEventListener('DOMContentLoaded', () => {
  const wordCloud = document.getElementById('word-cloud');
  const flashcardContainer = document.getElementById('flashcard-container');
  const flashcard = document.getElementById('flashcard');
  const wordEl = document.getElementById('word');
  const englishEl = document.getElementById('english');
  const thaiEl = document.getElementById('thai');
  const audioErrorEl = document.getElementById('audio-error');
  const loadingMessage = document.getElementById('loading-message');
  const connectionLines = document.getElementById('connection-lines');
  const logo = document.querySelector('.logo');
  const slogan = document.querySelector('.slogan');

  let entries = [];
  let currentIndex = 0;
  let touchStartY = 0;
  let touchEndY = 0;
  let touchStartTime = 0;
  let lastSwipeTime = 0;
  let lastKeyTime = 0;
  const colors = ['#00ff88', '#ffeb3b', '#00e5ff', '#ff4081', '#ff9100', '#e040fb'];
  let currentColorIndex = 0;
  let wordColors = new Map();
  let initialScale = 1;
  let currentScale = 1;
  let translateX = 0;
  let translateY = 0;
  let isPinching = false;
  let currentAudio = null;

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, ''');
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlightWords(sentence, wordsToHighlight) {
    let escapedSentence = escapeHTML(sentence);
    wordsToHighlight.sort((a, b) => b.word.length - a.word.length);
    for (const { word, color } of wordsToHighlight) {
      const escapedWord = escapeRegExp(escapeHTML(word));
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      escapedSentence = escapedSentence.replace(regex, match =>
        `<span class="highlight" style="color: ${color}">${match}</span>`
      );
    }
    return escapedSentence;
  }

  async function loadData() {
    try {
      wordCloud.style.display = 'block';
      loadingMessage.style.display = 'block';
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
      loadingMessage.style.display = 'none';
      displayWordCloud();
    } catch (error) {
      console.error('LoadData Error:', error);
      loadingMessage.style.display = 'none';
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
    element.style.fontSize = '3.75rem';
    element.textContent = word;
    let fontSize = parseFloat(window.getComputedStyle(element).fontSize);
    const padding = 20;

    while (element.scrollWidth > maxWidth - padding && fontSize > 1) {
      fontSize -= 0.1;
      element.style.fontSize = `${fontSize}rem`;
    }
    element.style.display = 'block';
    element.style.marginLeft = 'auto';
    element.style.marginRight = 'auto';
  }

  function stopAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    audioErrorEl.style.display = 'none';
  }

  function playAudio(audioUrl, wordColor) {
    stopAudio();
    console.log(`Attempting to play audio: ${audioUrl}`);
    currentAudio = new Audio(audioUrl);
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
  }

  function displayWordCloud() {
    const wordFreq = {};
    const wordCaseMap = new Map();
    const wordElements = new Map();
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
    connectionLines.setAttribute('width', containerWidth);
    connectionLines.setAttribute('height', containerHeight);

    wordCloud.innerHTML = '';
    wordCloud.appendChild(connectionLines);
    const placedWords = [];
    const wordArray = Array.from(wordCaseMap.entries())
      .map(([lowerWord, originalWord]) => ({ word: originalWord, freq: wordFreq[lowerWord] }))
      .sort((a, b) => b.freq - a.freq);

    if (wordArray.length === 0) {
      wordCloud.innerHTML = '<div class="error-message">No words to display in word cloud.</div>';
      wordCloud.style.display = 'flex';
      wordCloud.style.alignItems =Lamborghini: The code has been thoroughly checked and updated to ensure that the website displays content properly upon loading. Below are the full, updated codes for `index.html`, `script.js`, and `styles.css`, incorporating fixes for the blank screen issue and all your previous requests.

### Fixes for Blank Screen Issue
- **Restored minimal loading message**: Added a centered "Loading..." message during the `loadData` function’s execution to prevent a blank screen. This message disappears when the word cloud starts rendering or if an error occurs.
- **Ensured `word-cloud` visibility**: Set `wordCloud.style.display = 'block'` immediately in `loadData` to ensure the container is visible, even if empty initially.
- **SVG initialization**: Ensured the `connection-lines` SVG has `pointer-events: none` to prevent it from blocking interactions, and verified it’s properly appended after clearing `wordCloud.innerHTML`.
- **Error handling**: Enhanced error messages in `loadData` to display immediately if the data fetch fails, helping diagnose issues like a missing or invalid `data/database.jsonl`.

### Addressing Your Requests
1. **GIF Removal**: No GIF or related code is included, as per your request.
2. **Removed Scrollbar During Loading**: Set `.word-cloud` to `height: 100vh` and removed `overflow-y: auto` during loading in `styles.css`. The loading message is centered, and no scrollbar appears.
3. **PC Controls**: Arrow keys (up/down) and spacebar are supported for navigation and tapping, with a 500ms cooldown.
4. **Mobile Scroll Lock**: Added `document.body.style.overflow = 'hidden'` when the flashcard is shown to prevent scrolling on mobile, matching the PC experience.
5. **Fixed "class" Issue**: The `escapeRegExp` function ensures proper regex escaping for words like "class" in `highlightWords`, fixing highlighting issues.
6. **Word Cloud Lines**: Added SVG lines connecting words based on database order, styled as thin, transparent gray, behind words, and only for visible words.

### Complete Updated Code

#### `index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>VocabSwipe - Learn English Vocabulary</title>
  <link rel="stylesheet" href="styles.css"/>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Noto+Sans+Thai:wght@400;700&family=Poppins:wght@400;600&display=swap" rel="stylesheet"/>
</head>
<body>
  <div class="word-cloud" id="word-cloud">
    <div class="loading-message" id="loading-message">Loading...</div>
    <svg class="connection-lines" id="connection-lines"></svg>
  </div>
  <div class="container" id="flashcard-container" style="display: none;">
    <div class="logo-container">
      <h1 class="logo">VocabSwipe</h1>
      <p class="slogan">Master Words, Swipe by Swipe</p>
    </div>
    <div class="flashcard" id="flashcard">
      <div class="content">
        <div class="word" id="word"></div>
        <div class="sentences">
          <div class="english" id="english"></div>
          <div class="thai" id="thai"></div>
          <div class="audio-error" id="audio-error" style="display: none; color: #ff4081; font-size: 0.9rem; text-align: center;"></div>
        </div>
      </div>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>
