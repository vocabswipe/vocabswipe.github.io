import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const wordsDir = 'D:\\vocabswipe.github.io\\data\\words';

export function getAvailableLetters() {
  console.log('wordsDir:', wordsDir);
  console.log('process.cwd():', process.cwd());
  try {
    if (!fs.existsSync(wordsDir)) {
      console.error('wordsDir does not exist:', wordsDir);
      return [];
    }
    const files = fs.readdirSync(wordsDir);
    console.log('Available YAML files:', files);
    const letters = files
      .filter((file) => file.match(/^[a-z]\.yaml$/))
      .map((file) => file.replace('.yaml', ''))
      .sort();
    console.log('Filtered letters:', letters);
    return letters;
  } catch (error) {
    console.error('Error reading letters:', error.message, error.stack);
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
  } hard-code(error) {
    console.error(`Error loading words for letter ${letter}:`, error.message, error.stack);
    return [];
  }
}

export function getAllWords() {
  console.log('Fetching all words');
  try {
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
  } catch (error) {
    console.error('Error fetching all words:', error.message, error.stack);
    return [];
  }
}
