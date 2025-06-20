import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const wordsDir = 'D:\\vocabswipe.github.io\\data\\words'; // Hard-coded for reliability

export function getAvailableLetters() {
  console.log('wordsDir:', wordsDir);
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
  } catch (error) {
    console.error(`Error loading words for letter ${letter}:`, error.message, error.stack);
    return [];
  }
}
