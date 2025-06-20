import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';

export default function Flashcard({ word, letter }) {
  const [flipped, setFlipped] = useState(false);
  const audioSrc = `/vocabswipe.github.io/audio/${letter}/${word.word}.mp3`;
  const soundRef = useRef(null);

  const playAudio = () => {
    console.log('Playing audio:', audioSrc);
    if (soundRef.current) {
      soundRef.current.play();
      return;
    }

    soundRef.current = new Howl({
      src: [audioSrc],
      format: ['mp3'],
      onend: () => console.log('Audio playback ended'),
      onloaderror: (id, error) => console.error('Audio load error:', error),
      onplayerror: (id, error) => console.error('Audio play error:', error),
    });

    soundRef.current.play();
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unload();
      }
    };
  }, []);

  return (
    <div
      className="bg-white shadow-lg rounded-lg p-6 cursor-pointer min-h-64 flex items-center justify-center"
      onClick={() => setFlipped(!flipped)}
    >
      {flipped ? (
        <div className="text-center">
          <h2 className="text-xl font-semibold">{word.word}</h2>
          <p className="text-gray-600">{word.part_of_speech}</p>
          <p className="mt-2">{word.definition}</p>
          <p className="text-gray-500 italic mt-2">{word.example_sentence}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              playAudio();
            }}
            className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Play Audio
          </button>
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-bold">{word.word}</h2>
        </div>
      )}
    </div>
  );
}
