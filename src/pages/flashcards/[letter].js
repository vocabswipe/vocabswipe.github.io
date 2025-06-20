import { useState, useEffect } from 'react';
import { getAvailableLetters, getWordsByLetter } from '../../lib/data';
import Hammer from 'hammerjs';
import { Howl } from 'howler';

export default function Flashcards({ letter, words }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  const playAudio = () => {
    const word = words[currentIndex].word;
    const audioSrc = `/vocabswipe.github.io/audio/${letter}/${word}.mp3`;
    console.log('Playing audio:', audioSrc);
    const sound = new Howl({
      src: [audioSrc],
      format: ['mp3'],
      onend: () => console.log('Audio playback ended'),
      onloaderror: (id, error) => console.error('Audio load error:', error),
      onplayerror: (id, error) => console.error('Audio play error:', error),
    });
    sound.play();
  };

  const handleSwipe = (direction) => {
    if (direction === 'left' && currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      if (autoPlay) setTimeout(playAudio, 500);
    } else if (direction === 'right' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      if (autoPlay) setTimeout(playAudio, 500);
    }
  };

  useEffect(() => {
    const card = document.getElementById('flashcard');
    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL });
    hammer.on('swipeleft', () => handleSwipe('left'));
    hammer.on('swiperight', () => handleSwipe('right'));
    hammer.on('tap', () => playAudio());
    hammer.on('doubletap', () => setIsFlipped(!isFlipped));
    return () => hammer.destroy();
  }, [currentIndex, isFlipped]);

  if (!words.length) {
    return <div className="text-center p-4">No words found for letter {letter.toUpperCase()}</div>;
  }

  const word = words[currentIndex];

  return (
    <div className="container mx-auto p-4 flex flex-col h-screen">
      <h1 className="text-2xl font-bold text-center mb-4">Flashcards for {letter.toUpperCase()}</h1>
      <div
        id="flashcard"
        className={`flex-grow bg-white shadow-lg rounded-lg p-6 flex items-center justify-center transition-transform duration-300 ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        <div className="text-center w-full" style={{ backfaceVisibility: 'hidden' }}>
          {isFlipped ? (
            <div className="transform rotate-y-180">
              <h2 className="text-xl font-semibold">{word.word}</h2>
              <p className="text-gray-600">{word.part_of_speech}</p>
              <p className="mt-2">{word.definition}</p>
              <p className="text-gray-500 italic mt-2">{word.example_sentence}</p>
            </div>
          ) : (
            <h2 className="text-2xl font-bold">{word.word}</h2>
          )}
        </div>
      </div>
      <div className="flex justify-between mt-4">
        <button
          onClick={() => handleSwipe('right')}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          disabled={currentIndex === 0}
        >
          Previous
        </button>
        <span className="text-lg">{currentIndex + 1} /
