import { useState } from 'react';
import Link from 'next/link';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async (e) => {
    const value = e.target.value.trim().toLowerCase();
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      setResults(data.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    }
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
              <Link
                href={`/flashcards/${result.letter}`}
                className="block p-2 hover:bg-gray-100"
              >
                {result.word} ({result.letter.toUpperCase()})
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
