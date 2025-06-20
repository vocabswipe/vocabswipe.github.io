import Link from 'next/link';
import { getAvailableLetters } from '../lib/data';
import SearchBar from '../components/SearchBar';

export default function Home({ letters }) {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">VocabSwipe</h1>
      <SearchBar />
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 mt-6">
        {letters.map((letter) => (
          <Link key={letter} href={`/flashcards/${letter}`}>
            <a className="bg-blue-500 text-white text-center p-4 rounded hover:bg-blue-600">
              {letter.toUpperCase()}
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}

export async function getStaticProps() {
  const letters = getAvailableLetters();
  return {
    props: { letters },
  };
}
