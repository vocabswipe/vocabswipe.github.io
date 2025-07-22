document.addEventListener('DOMContentLoaded', () => {
  const cardDeck = document.getElementById('card-deck');
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

  let entries = [];
  let currentEntries = []; // Store filtered entries for the chosen word
  let currentIndex = 0;
  let touchStartY = 0;
  let touchEndY = 0;
  let touchStartTime = 0;
  let lastSwipeTime = 0;
  let currentColor = ''; // Store the color of the selected word
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
  let visitCount = parseInt(localStorage.getItem('visitCount') || '0', 10);
  visitCount += 1;
  localStorage.setItem('visitCount', visitCount.toString());

  // Uno card colors (used only for background)
  const unoColors = [
    { bg: '#ff0000' }, // Red
    { bg: '#0000ff' }, // Blue
    { bg: '#00ff00' }, // Green
    { bg: '#ffff00' }  // Yellow
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
      .replace(/'/g, '&apos;');
  }

  function highlightWord(sentence, word) {
    const escapedSentence = escapeHTML(sentence);
    const escapedWord = escapeHTML(word);
    const regex = new RegExp(`\\b\\w*${escapedWord}\\w*\\b(?![^<]*>)`, 'gi');
    return escapedSentence.replace(regex, `<span class="highlight">$&</span>`);
  }

  function getConsistentUnoColor(word) {
    // Simple hash function to assign consistent color based on word
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = word.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % unoColors.length;
    // Ensure "money" is always yellow
    if (word.toLowerCase() === 'money') {
      return unoColors[3]; // Yellow
    }
    return unoColors[index];
  }

  function adjustWordSize(word, element, maxWidth, isMiniCard = false) {
    const baseFontSize = isMiniCard ? 1 : 2; // Base font size for mini-card and flashcard
    element.style.fontSize = `${baseFontSize}rem`;
    element.style.whiteSpace = 'nowrap'; // Prevent word wrapping
    element.textContent = word;
    let fontSize = parseFloat(window.getComputedStyle(element).fontSize);
    const padding = isMiniCard ? 5 : 10;

    // Scale font to fit within maxWidth in one line
    while (element.scrollWidth > maxWidth - padding && fontSize > (isMiniCard ? 0.5 : 0.8)) {
      fontSize -= 0.05; // Finer adjustment for smoother scaling
      element.style.fontSize = `${fontSize}rem`;
    }

    // For mini-cards, ensure font size is proportional to flashcard
    if (isMiniCard) {
      const flashcardWidth = 210; // Flashcard width in pixels
      const miniCardWidth = 105; // Mini-card width in pixels
      const scaleRatio = miniCardWidth / flashcardWidth;
      const targetFontSize = fontSize * scaleRatio;
      element.style.fontSize = `${Math.max(targetFontSize, 0.5)}rem`;
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
      const canvas = await html2canvas(flashcardContainer, {
        width: flashcardContainer.offsetWidth,
        height: flashcardContainer.offsetHeight,
        scale: window.devicePixelRatio || 2,
        backgroundColor: '#000000',
        useCORS: true,
      });

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

      const file = new File([blob], 'vocabswipe_card.png', { type: 'image/png' });

      const shareData = {
        files: [file],
        title: 'VocabSwipe - Learn English Vocabulary',
        text: `Check out this word from VocabSwipe! Master words, swipe by swipe. Visit VocabSwipe.com #VocabSwipe #LearnEnglish`,
        url: 'https://vocabswipe.com',
      };

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(shareData);
        console.log('Shared successfully via Web Share API');
        audioErrorEl.textContent = 'Shared successfully!';
        audioErrorEl.style.color = '#00ff88';
        audioErrorEl.style.display = 'block';
        setTimeout(() => {
          audioErrorEl.style.color = '#ff4081';
          audioErrorEl.style.display = 'none';
        }, 2000);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'vocabswipe_card.png';
        link.click();
        URL.revokeObjectURL(url);
        console.log('Web Share API not available, image downloaded');
        audioErrorEl.textContent = 'Image downloaded. Share it manually!';
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
      centerY = wordRect.top - containerRect.top + wordRect.height / 2;
    } else {
      centerY = flashcardRect.top - containerRect.top + flashcardRect.height / 2;
    }

    tooltip.style.left = `${centerX}px`;
    tooltip.style.top = `${centerY}px`;

    tooltip.style.display = 'flex';

    setTimeout(() => {
      if (direction === 'tap') {
        tooltip.classList.add('animate-tap');
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
      cardDeck.style.display = 'grid';
      loadingIndicator.style.opacity = '1';

      // Clear cache to ensure fetching the latest database
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
      cardEl.style.border = '3px solid #ffffff'; // Tripled border thickness

      const wordSpan = document.createElement('span');
      wordSpan.className = 'mini-card-word';
      wordSpan.textContent = word;
      adjustWordSize(word, wordSpan, cardEl.offsetWidth * 0.9, true);
      cardEl.appendChild(wordSpan);

      cardDeck.appendChild(cardEl);

      addCardEventListener(cardEl, word);
    });
  }

  function addCardEventListener(cardEl, word) {
    cardEl.addEventListener('click', () => {
      stopAudio();
      document.querySelectorAll('.mini-card').forEach(otherCard => {
        if (otherCard !== cardEl) {
          otherCard.style.transition = 'opacity 0.7s ease';
          otherCard.style.opacity = '0';
        }
      });

      const maxCardWidth = window.innerWidth * 0.9;
      cardEl.style.maxWidth = `${maxCardWidth}px`;
      const wordSpan = cardEl.querySelector('.mini-card-word');
      wordSpan.style.fontSize = '3rem';
      let fontSize = parseFloat(window.getComputedStyle(wordSpan).fontSize);
      while (wordSpan.scrollWidth > maxCardWidth && fontSize > 1) {
        fontSize -= 0.1;
        wordSpan.style.fontSize = `${fontSize}rem`;
      }

      const rect = cardEl.getBoundingClientRect();
      const centerX = window.innerWidth / 2 - rect.width / 2 - rect.left;
      const centerY = window.innerHeight / 2 - rect.height / 2 - rect.top;

      const currentWidth = rect.width;
      const targetWidth = Math.min(currentWidth * 2, maxCardWidth);
      const scaleFactor = Math.min(2, targetWidth / currentWidth);

      cardEl.style.transition = 'transform 0.7s ease, opacity 0.7s ease';
      cardEl.style.transform = `translate(${centerX}px, ${centerY}px) scale(${scaleFactor})`;
      cardEl.style.zIndex = '20';

      setTimeout(() => {
        cardEl.style.opacity = '0';

        setTimeout(() => {
          cardDeck.style.display = 'none';
          cardEl.style.transform = 'none';
          cardEl.style.opacity = '1';
          cardEl.style.zIndex = '10';
          cardEl.style.maxWidth = '';
          wordSpan.style.fontSize = '';

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

          currentEntries = entries.filter(entry => entry.word.toLowerCase() === word.toLowerCase());
          currentEntries = shuffleArray([...currentEntries]);
          currentIndex = 0;
          currentColor = '#ffffff'; // Set to white for text
          displayEntry(currentIndex);

          if (visitCount <= 5) {
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
    flashcard.style.border = '6px solid #ffffff'; // Tripled border thickness
    wordEl.style.color = '#ffffff'; // White text
    englishEl.style.color = '#ffffff'; // White text
    thaiEl.style.color = '#ffffff'; // White text

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

    shareIcon.style.display = 'block';
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
      cardDeck.style.display = 'grid';
      cardDeck.style.opacity = '0';
      cardDeck.style.transition = 'opacity 0.7s ease';
      cardDeck.style.opacity = '1';

      logo.style.transform = 'translateX(-100%)';
      logo.style.opacity = '0';
      logoCom.style.transform = 'translateX(100%)';
      logoCom.style.opacity = '0';
      slogan.style.transform = 'translateX(100%)';
      slogan.style.opacity = '0';

      displayCardDeck();
    }, 700);
  });

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
        displayEntry(currentIndex);
      }, 0);
      lastSwipeTime = Date.now();
    } else if (swipeDistance < -minSwipeDistance) {
      console.log('Swipe down detected, going to previous entry');
      stopAudio();
      setTimeout(() => {
        currentIndex--;
        displayEntry(currentIndex);
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
          displayEntry(currentIndex);
        }, 0);
        lastSwipeTime = Date.now();
      } else if (e.key === 'ArrowDown') {
        console.log('Arrow down pressed, going to previous entry');
        stopAudio();
        setTimeout(() => {
          currentIndex--;
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

  loadData();
});
