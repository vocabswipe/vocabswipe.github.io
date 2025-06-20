import { useState } from 'react';
import { getAvailableLetters, getWordsByLetter } from '../../lib/data';
import Flashcard from '../../components/Flashcard';

export default function Flashcards({ letter, words }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % words.length);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
  };

  if (!words.length) {
    return <div className="text-center p-4">No words found for letter {letter.toUpperCase()}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-4">
        Flashcards for Letter {letter.toUpperCase()}
      </h1>
      <Flashcard word={words[currentIndex]} letter={letter} />
      <div className="flex justify-between mt-4">
        <button
          onClick={prevCard}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Previous
        </button>
        <span className="text-lg">
          {currentIndex + 1} / {words.length}
        </span>
        <button
          onClick={nextCard}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export async function getStaticPaths() {
  const letters = getAvailableLetters();
  const paths = letters.map((letter) => ({
    params: { letter },
  }));
  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const { letter } = params;
  const words = getWordsByLetter(letter);
  return {
    props: { letter, words },
  };
}
