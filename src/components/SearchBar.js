import { useState } from 'react';
import Link from 'next/link';
import { getAllWords } from '../lib/data';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }
    const allWords = getAllWords();
    const filtered = allWords.filter((word) =>
      word.word.toLowerCase().includes(value)
    );
    setResults(filtered.slice(0, 10)); // Limit to 10 results
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search words..."
        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {results.length > 0 && (
        <ul className="absolute bg-white border rounded shadow-lg w-full mt-1 z-10">
          {results.map((result) => (
            <li key={`${result.letter}-${result.word}`}>
              <Link href={`/flashcards/${result.letter}`}>
                <a className="block p-2 hover:bg-gray-100">
                  {result.word} ({result.letter.toUpperCase()})
                </a>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
