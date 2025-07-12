document.addEventListener('DOMContentLoaded', () => {
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

  const colors = ['#00ff88', '#ffeb3b', '#00e5ff', '#ff4081'];
  let currentColorIndex = 0;

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function highlightWords(sentence, wordsToHighlight) {
    // Escape HTML first
    let escapedSentence = escapeHTML(sentence);

    // Replace each word in order with a span tag
    for (const { word, color } of wordsToHighlight) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      escapedSentence = escapedSentence.replace(regex, match =>
        `<span class="highlight" style="color: ${color}">${match}</span>`
      );
    }
    return escapedSentence;
  }

  async function loadData() {
    try {
      const response = await fetch('data/database.jsonl');
      if (!response.ok) throw new Error('Failed to load database.jsonl');

      const data = await response.text();
      entries = data.trim().split('\n').map(line => JSON.parse(line));
      if (!entries.length) throw new Error('No entries in database.jsonl');

      currentIndex = Math.floor(Math.random() * entries.length);
      currentColorIndex = Math.floor(Math.random() * colors.length);
      displayEntry(currentIndex);

      totalWordsEl.textContent = entries.length;
      uniqueWordsEl.textContent = new Set(entries.map(entry => entry.word.toLowerCase())).size;
      totalSentencesEl.textContent = entries.length;

      statsBar.classList.add('loaded');
    } catch (error) {
      console.error('Error:', error);
      wordEl.textContent = 'Error';
      englishEl.textContent = 'Failed to load data';
      thaiEl.textContent = '';
      statsBar.style.display = 'none';
    }
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
