import Link from 'next/link';
import { getAvailableLetters } from '../lib/data';
import { useState } from 'react';

export default function Home({ letters }) {
  const [selectedLetter, setSelectedLetter] = useState(letters[0] || 'a');
  console.log('Home rendered with letters:', letters);

  return (
    <div className="container mx-auto p-4 flex flex-col h-screen">
      <h1 className="text-3xl font-bold text-center mb-4">VocabSwipe</h1>
      <nav className="flex overflow-x-auto mb-4">
        {letters.map((letter) => (
          <button
            key={letter}
            onClick={() => setSelectedLetter(letter)}
            className={`px-3 py-1 mx-1 rounded-full text-sm font-medium ${
              selectedLetter === letter ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {letter.toUpperCase()}
          </button>
        ))}
      </nav>
      <Link
        href={`/flashcards/${selectedLetter}`}
        className="mt-auto mb-4 bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Start Flashcards
      </Link>
    </div>
  );
}

export async function getStaticProps() {
  console.log('Running getStaticProps for Home');
  try {
    const letters = getAvailableLetters();
    console.log('getStaticProps letters:', letters);
    if (!letters.length) {
      console.warn('No letters found in data/words/');
    }
    return {
      props: { letters },
    };
  } catch (error) {
    console.error('getStaticProps error:', error.message, error.stack);
    return {
      props: { letters: [] },
    };
  }
}
