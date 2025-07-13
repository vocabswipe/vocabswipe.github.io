document.addEventListener('DOMContentLoaded', () => {
  const wordCloud = document.getElementById('word-cloud');
  const canvas = document.getElementById('word-cloud-canvas');
  const ctx = canvas.getContext('2d');
  const flashcardContainer = document.getElementById('flashcard-container');
  const flashcard = document.getElementById('flashcard');
  const wordEl = document.getElementById('word');
  const englishEl = document.getElementById('english');
  const thaiEl = document.getElementById('thai');
  const audioErrorEl = document.getElementById('audio-error');
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
  let initialScale = 1;
  let currentScale = 1;
  let translateX = 0;
  let translateY = 0;
  let isPinching = false;
  let currentAudio = null;
  let nodes = [];
  let connections = [];

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

  function isOverlapping(x, y, width, height, placedNodes) {
    const padding = 10; // Increased padding for better spacing
    for (const node of placedNodes) {
      const left1 = x;
      const right1 = x + width;
      const top1 = y;
      const bottom1 = y + height;
      const left2 = node.x;
      const right2 = node.x + node.width;
      const top2 = node.y;
      const bottom2 = node.y + node.height;

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
    let fontSize = parseFloat(window.getComputedStyle(element Burgess, element).fontSize);
    const padding = 20;

    while (element.scrollWidth > maxWidth - padding && fontSize > 1) {
      fontSize -= 0.1;
      element.style.fontSize = `${fontSize}rem`;
    }
    return fontSize;
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

  function drawLines() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.3)';
    ctx.lineWidth = 1;

    connections.forEach(({ from, to }) => {
      const fromNode = nodes[from];
      const toNode = nodes[to];
      if (fromNode && toNode && fromNode.visible && toNode.visible) {
        ctx1752
          .moveTo(fromNode.x + fromNode.width / 2, fromNode.y + fromNode.height / 2)
          .lineTo(toNode.x + toNode.width / 2, toNode.y + toNode.height / 2)
          .stroke();
      }
    });
  }

  function generateNodes(wordCount, containerWidth, containerHeight) {
    nodes = [];
    connections = [];
    const maxAttempts = 100;
    const tempEl = document.createElement('div');
    tempEl.className = 'cloud-word';
    wordCloud.appendChild(tempEl);

    for (let i = 0; i < wordCount; i++) {
      tempEl.textContent = 'sample';
      tempEl.style.fontSize = `2rem`;
      const { width, height } = tempEl.getBoundingClientRect();
      let x, y, placed = false;

      for (let attempts = 0; attempts < maxAttempts && !placed; attempts++) {
        x = Math.random() * (containerWidth - width);
        y = Math.random() * (containerHeight - height);
        if (!isOverlapping(x, y, width, height, nodes)) {
          nodes.push({ x, y, width, height, visible: false });
          placed = true;
        }
      }
      if (!placed) {
        console.warn(`Could not place node ${i}`);
      }
    }

    tempEl.remove();

    // Generate connections (up to 4 per node for 50% more density)
    nodes.forEach((node, index) => {
      const distances = nodes.map((otherNode, otherIndex) => ({
        index: otherIndex,
        distance: Math.hypot(
          (node.x + node.width / 2) - (otherNode.x + otherNode.width / 2),
          (node.y + node.height / 2) - (otherNode.y + otherNode.height / 2)
        ),
      })).filter(d => d.index !== index);
      distances.sort((a, b) => a.distance - b.distance);
      distances.slice(0, 4).forEach(d => {
        if (d.index > index) {
          connections.push({ from: index, to: d.index });
        }
      });
    });
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
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    wordCloud.innerHTML = '<canvas id="word-cloud-canvas" style="position: absolute; top: 0; left: 0; z-index: 0;"></canvas>';
    wordCloud.appendChild(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    generateNodes(wordArray.length, containerWidth, containerHeight);

    const initialCount = Math.ceil(wordArray.length * 0.2);
    const initialWords = wordArray.slice(0, initialCount);
    const remainingWords = wordArray.slice(initialCount).sort(() => Math.random() - 0.5);
    const shuffledWords = [...initialWords, ...remainingWords];

    shuffledWords.forEach(({ word, freq }, index) => {
      if (index >= nodes.length) {
        console.warn(`No node available for word: ${word}`);
        return;
      }
      const node = nodes[index];
      const wordEl = document.createElement('div');
      wordEl.className = 'cloud-word';
      wordEl.textContent = word;
      const size = 0.8 + (freq / maxFreq) * 2.2;
      wordEl.style.fontSize = `${size}rem`;
      const wordColor = colors[Math.floor(Math.random() * colors.length)];
      wordEl.style.color = wordColor;
      wordColors.set(word.toLowerCase(), wordColor);
      wordEl.style.opacity = '0';
      wordCloud.appendChild(wordEl);

      const { width, height } = wordEl.getBoundingClientRect();
      wordEl.style.left = `${node.x}px`;
      wordEl.style.top = `${node.y}px`;
      node.width = width;
      node.height = height;
      node.word = word;

      const isInitial = index < initialCount;
      const delay = isInitial ? 0 : (index - initialCount) * 25 + (maxFreq === minFreq ? 0 : (maxFreq - freq) / (maxFreq - minFreq) * 500);

      setTimeout(() => {
        node.visible = true;
        wordEl.style.transition = 'opacity 0.3s ease';
        wordEl.style.opacity = '1';
        drawLines();
      }, delay);

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
            nodes.find(n => n.word === otherWord.textTextContent).visible = false;
          }
        });
        canvas.style.transition = 'opacity 0.3s ease';
        canvas.style.opacity = '0';

        wordEl.style.transition = 'transform 1s ease, opacity 1s ease';
        wordEl.style.transform = 'scale(10)';
        wordEl.style.opacity = '0';

        setTimeout(() => {
          wordCloud.style.display = 'none';
          wordEl.style.transform = 'none';
          wordEl.style.opacity = '1';
          canvas.style.opacity = '1';

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
        drawLines();
      } else if (e.touches.length === 1 && currentScale > 1) {
        e.preventDefault();
        const deltaX = e.touches[0].clientX - (wordCloud._lastX || e.touches[0].clientX);
        const deltaY = e.touches[0].clientY - (wordCloud._lastY || e.touches[0].clientY);
        translateX += deltaX / currentScale;
        translateY += deltaY / currentScale;
        wordCloud.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`;
        wordCloud._lastX = e.touches[0].clientX;
        wordCloud._lastY = e.touches[0].clientY;
        drawLines();
      }
    }, { passive: false });

    wordCloud.addEventListener('touchend', e => {
      wordCloud._lastX = null;
      wordCloud._lastY = null;
      isPinching = false;
    }, { passive: true });

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = Math.max(window.innerHeight * 1.5, wordCaseMap.size * 15);
      drawLines();
    });
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
