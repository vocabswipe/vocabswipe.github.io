document.addEventListener('DOMContentLoaded', () => {
  const wordCloud = document.getElementById('word-cloud');
  const flashcardContainer = document.getElementById('flashcard-container');
  const flashcard = document.getElementById('flashcard');
  const wordEl = document.getElementById('word');
  const englishEl = document.getElementById('english');
  const thaiEl = document.getElementById('thai');
  const audioErrorEl = document.getElementById('audio-error');
  const storageBox = document.getElementById('storage-box');
  const storageLines = document.getElementById('storage-lines');
  const logo = document.querySelector('.logo');
  const slogan = document.querySelector('.slogan');

  let entries = [];
  let currentIndex = 0;
  let touchStartY = 0;
  let touchEndY = 0;
  let touchStartTime = 0;
  let lastSwipeTime = 0;
  const colors = ['#00ff88', '#ffeb3b', '#00e5ff', '#ff4081', '#ff9100', '#e040fb'];
  let currentColorIndex = 0;
  let wordColors = new Map();
  let currentAudio = null;
  const preloadedAudio = new Set();
  let storedWords = [];

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
      animateSwipeUp(currentIndex, colors[currentColorIndex]);
      currentIndex++;
      currentColorIndex = (currentColorIndex + 1) % colors.length;
      lastSwipeTime = Date.now();
    }
  }, { passive: false });

  document.addEventListener('keydown', e => {
    if (flashcardContainer.style.display === 'flex') {
      if (e.key === 'ArrowUp' && currentIndex < entries.length - 1) {
        console.log('Arrow up pressed, going to next entry');
        stopAudio();
        animateSwipeUp(currentIndex, colors[currentColorIndex]);
        currentIndex++;
        currentColorIndex = (currentColorIndex + 1) % colors.length;
        lastSwipeTime = Date.now();
      } else if (e.key === ' ') {
        e.preventDefault();
        console.log('Spacebar pressed, triggering flashcard click');
        flashcard.click();
      }
    }
  });

  loadData();

  // Expose necessary variables and functions to script_animations.js
  window.vocabSwipe = {
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
  };
});
