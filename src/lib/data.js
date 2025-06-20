import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const wordsDir = path.join(process.cwd(), 'data', 'words');

// Get all available letters (a-z) with .yaml files
export function getAvailableLetters() {
  try {
    const files = fs.readdirSync(wordsDir);
    return files
      .filter((file) => file.match(/^[a-z]\.yaml$/))
      .map((file) => file.replace('.yaml', ''))
      .sort();
  } catch (error) {
    console.error('Error reading letters:', error);
    return [];
  }
}

// Load words for a specific letter
export function getWordsByLetter(letter) {
  try {
    const filePath = path.join(wordsDir, `${letter}.yaml`);
    if (!fs.existsSync(filePath)) return [];
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.load(fileContents) || [];
  } catch (error) {
    console.error(`Error loading words for letter ${letter}:`, error);
    return [];
  }
}

// Load all words for search (optional)
export function getAllWords() {
  const letters = getAvailableLetters();
  const allWords = [];
  for (const letter of letters) {
    const words = getWordsByLetter(letter);
    words.forEach((word) => {
      allWords.push({ ...word, letter });
    });
  }
  return allWords;
}
