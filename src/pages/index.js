import Link from 'next/link';
import { getAvailableLetters } from '../lib/data';
import SearchBar from '../components/SearchBar';

export default function Home({ letters }) {
  console.log('Home rendered with letters:', letters);
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">VocabSwipe</h1>
      <SearchBar />
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 mt-6">
        {letters.length ? (
          letters.map((letter) => (
            <Link
              key={letter}
              href={`/flashcards/${letter}`}
              className="bg-blue-500 text-white text-center p-4 rounded hover:bg-blue-600"
            >
              {letter.toUpperCase()}
            </Link>
          ))
        ) : (
          <p className="text-center col-span-full">No letters available</p>
        )}
      </div>
    </div>
  );
}

export async function getStaticProps() {
  try {
    const letters = getAvailableLetters();
    console.log('getStaticProps letters:', letters);
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
