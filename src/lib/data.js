import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const wordsDir = path.join(process.cwd(), '..', 'data', 'words');

export function getAvailableLetters() {
  console.log('wordsDir:', wordsDir);
  try {
    const files = fs.readdirSync(wordsDir);
    console.log('Available YAML files:', files);
    const letters = files
      .filter((file) => file.match(/^[a-z]\.yaml$/))
      .map((file) => file.replace('.yaml', ''))
      .sort();
    console.log('Filtered letters:', letters);
    return letters;
  } catch (error) {
    console.error('Error reading letters:', error);
    return [];
  }
}

export function getWordsByLetter(letter) {
  console.log('Loading words for letter:', letter);
  try {
    const filePath = path.join(wordsDir, `${letter}.yaml`);
    console.log('filePath:', filePath);
    if (!fs.existsSync(filePath)) {
      console.log('File not found:', filePath);
      return [];
    }
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const words = yaml.load(fileContents) || [];
    console.log(`Loaded ${words.length} words for ${letter}`);
    return words;
  } catch (error) {
    console.error('Error loading words for letter ${letter}:', error);
    return [];
  }
}

export function getAllWords() {
  const letters = getAvailableLetters();
  console.log('All letters:', letters);
  const allWords = [];
  for (const letter of letters) {
    const words = getWordsByLetter(letter);
    words.forEach((word) => {
      allWords.push({ ...word, letter });
    });
  }
  console.log('Total words:', allWords.length);
  return allWords;
}
