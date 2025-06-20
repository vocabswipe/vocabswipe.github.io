import { getAllWords } from '../../../lib/data';

export default function handler(req, res) {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json([]);
  }

  try {
    const query = q.toLowerCase();
    const allWords = getAllWords();
    const filtered = allWords.filter((word) =>
      word.word.toLowerCase().includes(query)
    );
    res.status(200).json(filtered);
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json([]);
  }
}
