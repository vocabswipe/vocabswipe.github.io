import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchIndex, setSearchIndex] = useState([]);

  useEffect(() => {
    fetch('/vocabswipe.github.io/data/search.json')
      .then((res) => res.json())
      .then((data) => {
        console.log('Search index loaded:', data.length);
        setSearchIndex(data);
      })
      .catch((error) => console.error('Error loading search index:', error));
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value.trim().toLowerCase();
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }

    const filtered = searchIndex.filter((item) =>
      item.word.toLowerCase().includes(value)
    );
    console.log('Search results:', filtered);
    setResults(filtered.slice(0, 10));
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
