import { useState, useEffect } from 'react';
import Howl from 'howler';

export default function Flashcard({ word, letter }) {
  const [flipped, setFlipped] = useState(false);
  const audioSrc = `/audio/${letter}/${word.word}.mp3`;

  const playAudio = () => {
    const sound = new Howl.Howl({
      src: [audioSrc],
      format: ['mp3'],
    });
    sound.play();
  };

  useEffect(() => {
    return () => {
      Howl.Howl.unload(); // Clean up audio on unmount
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
              e.stopPropagation(); // Prevent flip on audio click
              playAudio();
            }}
            className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
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
