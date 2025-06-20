import Link from 'next/link';
import { getAvailableLetters } from '../lib/data';

export default function Home({ letters }) {
  console.log('Home rendered with letters:', letters);
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">VocabSwipe</h1>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 mt-6">
        {letters.length ? (
          letters.map((letter) => (
            <Link
              key={letter}
              href={`/flashcards/${letter}`}
              className="bg-blue-600 text-white text-center p-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {letter.toUpperCase()}
            </Link>
          ))
        ) : (
          <p className="text-center col-span-full text-gray-600">No letters available. Check data/words/ directory.</p>
        )}
      </div>
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
    console.error('getStaticProps error:', error);
    return {
      props: { letters: [] },
    };
  }
}
