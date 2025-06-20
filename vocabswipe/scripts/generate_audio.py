import os
import yaml
from pathlib import Path
from tqdm import tqdm
from collections import defaultdict
import logging
from gtts import gTTS

# TTS function using gTTS for American English
def generate_tts_audio(word, output_file):
    """Generate audio using Google Text-to-Speech (gTTS) for a single word."""
    try:
        tts = gTTS(text=word, lang='en', tld='us', slow=False)
        tts.save(output_file)
        if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
            return True
        else:
            logging.error(f"Generated file '{output_file}' is empty or invalid")
            return False
    except Exception as e:
        logging.error(f"Failed to generate audio for '{word}': {e}")
        return False

# Configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent
YAML_DIR = PROJECT_ROOT / "data" / "words"
AUDIO_DIR = PROJECT_ROOT / "public" / "audio"
LETTERS = "abcdefghijklmnopqrstuvwxyz"

# Setup logging (console only, minimal output)
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[logging.StreamHandler()]
)

def validate_yaml_dir():
    """Validate that the YAML directory exists."""
    if not YAML_DIR.exists():
        logging.error(f"YAML directory does not exist: {YAML_DIR}")
        return False
    if not YAML_DIR.is_dir():
        logging.error(f"YAML directory is not a directory: {YAML_DIR}")
        return False
    
    yaml_files = list(YAML_DIR.glob("*.yaml"))
    if not yaml_files:
        logging.warning(f"No .yaml files found in {YAML_DIR}")
    else:
        logging.info(f"Found {len(yaml_files)} .yaml files in {YAML_DIR}")
    return True

def load_yaml_file(yaml_path, letter):
    """Load a single .yaml file."""
    word_entries = []
    seen_words = set()  # Track unique words in this file
    try:
        with open(yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or []
            if not isinstance(data, list):
                logging.warning(f"Invalid format in {yaml_path}: expected a list")
                return word_entries
            if not data:
                logging.warning(f"No entries in {yaml_path}")
                return word_entries
            for entry in data:
                word = entry.get("word")
                if not isinstance(word, str):
                    logging.warning(f"Invalid word type in {letter}.yaml: {word} (expected string)")
                    continue
                word = word.strip().lower()
                if not word:
                    logging.warning(f"Empty word in {letter}.yaml")
                    continue
                if word in seen_words:
                    logging.warning(f"Duplicate word '{word}' in {letter}.yaml; keeping first occurrence")
                    continue
                seen_words.add(word)
                word_entries.append((letter, word))
    except Exception as e:
        logging.error(f"Error reading {yaml_path}: {e}")
    return word_entries

def load_yaml_files(letters=LETTERS):
    """Load specified .yaml files."""
    word_entries = []
    word_to_letter = defaultdict(list)
    missing_files = []
    empty_files = []

    for letter in letters:
        yaml_path = YAML_DIR / f"{letter}.yaml"
        if not yaml_path.exists():
            missing_files.append(letter)
            continue
        entries = load_yaml_file(yaml_path, letter)
        if not entries:
            empty_files.append(letter)
            continue
        for entry in entries:
            word = entry[1]
            word_entries.append(entry)
            word_to_letter[word].append(letter)

    return word_entries, word_to_letter, empty_files, missing_files

def check_duplicates(word_to_letter):
    """Identify and report duplicate words across .yaml files."""
    duplicates = {word: letters for word, letters in word_to_letter.items() if len(letters) > 1}
    if duplicates:
        logging.warning("Found duplicate words across files:")
        for word, letters in duplicates.items():
            logging.warning(f"  Word '{word}' appears in {', '.join(letters)}")
    return duplicates

def ensure_audio_directories(letters=LETTERS):
    """Create audio directories for specified letters."""
    for letter in letters:
        audio_path = AUDIO_DIR / letter
        try:
            os.makedirs(audio_path, exist_ok=True)
        except Exception as e:
            logging.error(f"Error creating directory {audio_path}: {e}")

def generate_audio_files(word_entries, overwrite=False):
    """Generate audio files for each word, with overwrite option."""
    total_entries = len(word_entries)
    logging.info(f"Processing {total_entries} entries")
    
    generated = 0
    skipped = 0
    failed = 0

    with tqdm(total=total_entries, desc="Generating audio", unit="word", position=0, leave=True) as pbar:
        for letter, word in word_entries:
            audio_path = AUDIO_DIR / letter / f"{word}.mp3"
            
            if not overwrite and audio_path.exists() and audio_path.stat().st_size > 0:
                skipped += 1
                pbar.update(1)
                continue

            try:
                if generate_tts_audio(word, audio_path):
                    generated += 1
                else:
                    failed += 1
            except Exception as e:
                logging.error(f"Error generating audio for '{word}' in {letter}: {e}")
                failed += 1
            
            pbar.update(1)

    return generated, skipped, failed

def validate_audio_files(word_entries):
    """Validate that every word has an audio file and no extra audio files exist."""
    missing_audio = []
    extra_audio = []
    empty_audio_dirs = []

    word_set = {(letter, word) for letter, word in word_entries}
    letters = {letter for letter, _ in word_set}

    for letter in letters:
        audio_dir = AUDIO_DIR / letter
        if not audio_dir.exists():
            empty_audio_dirs.append(letter)
            continue

        audio_files = list(audio_dir.glob("*.mp3"))
        if not audio_files:
            empty_audio_dirs.append(letter)

        for audio_file in audio_files:
            word = audio_file.stem.lower()
            if (letter, word) not in word_set:
                extra_audio.append((letter, word, audio_file))

        for _, word in filter(lambda x: x[0] == letter, word_entries):
            audio_path = audio_dir / f"{word}.mp3"
            if not audio_path.exists() or audio_path.stat().st_size == 0:
                missing_audio.append((letter, word, audio_path))

    return missing_audio, extra_audio, empty_audio_dirs

def get_user_mode():
    """Prompt user to select generation mode."""
    while True:
        print("\nSelect mode:")
        print("[1] Specific YAML file (e.g., a for a.yaml)")
        print("[2] All YAML files (A-Z)")
        print("[q] Quit")
        choice = input("Enter choice [1/2/q]: ").strip().lower()
        if choice in ['1', '2', 'q']:
            return choice
        print("Invalid choice. Please enter 1, 2, or q.")

def get_letter():
    """Prompt user for a single letter."""
    while True:
        letter = input("Enter letter (a-z): ").strip().lower()
        if letter in LETTERS:
            return letter
        print("Invalid letter. Please enter a letter from a-z.")

def get_overwrite_choice():
    """Prompt user for overwrite option."""
    while True:
        response = input("Overwrite existing audio files? [y/n]: ").strip().lower()
        if response in ['y', 'n']:
            return response == 'y'
        print("Please enter 'y' or 'n'.")

def main():
    """Main function to orchestrate audio generation and validation."""
    mode = get_user_mode()
    if mode == 'q':
        print("Exiting.")
        return

    overwrite = get_overwrite_choice()
    logging.info(f"User chose to {'overwrite' if overwrite else 'skip'} existing audio files")

    if not validate_yaml_dir():
        logging.error("Cannot proceed due to YAML directory issues. Exiting.")
        return

    if mode == '1':
        letter = get_letter()
        letters = [letter]
        yaml_path = YAML_DIR / f"{letter}.yaml"
        if not yaml_path.exists():
            logging.error(f"{letter}.yaml not found in {YAML_DIR}")
            return
    else:
        letters = LETTERS

    ensure_audio_directories(letters)
    word_entries, word_to_letter, empty_files, missing_files = load_yaml_files(letters)
    
    if missing_files:
        logging.warning(f"Missing .yaml files for letters: {', '.join(missing_files)}")
    if empty_files:
        logging.warning(f"Empty or invalid .yaml files for letters: {', '.join(empty_files)}")
    
    if not word_entries:
        logging.error("No valid entries found in .yaml files. Exiting.")
        return

    duplicates = check_duplicates(word_to_letter)
    if duplicates:
        logging.warning(f"Found {len(duplicates)} duplicate words across files. Please review.")

    generated, skipped, failed = generate_audio_files(word_entries, overwrite)
    missing_audio, extra_audio, empty_audio_dirs = validate_audio_files(word_entries)

    logging.info("\n=== Audio Generation Summary ===")
    logging.info(f"Total entries processed: {len(word_entries)}")
    logging.info(f"Audio files generated: {generated}")
    logging.info(f"Audio files skipped (already exist): {skipped}")
    logging.info(f"Audio generation failures: {failed}")
    logging.info(f"Duplicate words: {len(duplicates)}")
    logging.info(f"Missing audio files: {len(missing_audio)}")
    if missing_audio:
        logging.warning("Missing or invalid audio files:")
        for letter, word, path in missing_audio:
            logging.warning(f"  {word} in {letter} ({path})")
    logging.info(f"Extra audio files: {len(extra_audio)}")
    if extra_audio:
        logging.warning("Extra audio files:")
        for letter, word, path in extra_audio:
            logging.warning(f"  {word} in {letter} ({path})")
    logging.info(f"Empty audio directories: {len(empty_audio_dirs)}")
    if empty_audio_dirs:
        logging.warning("Empty audio directories:")
        for letter in empty_audio_dirs:
            logging.warning(f"  {letter}")

    if not duplicates and not missing_audio and not extra_audio and not empty_audio_dirs and failed == 0:
        logging.info("Success: All entries have corresponding audio files, no duplicates or issues detected!")
    else:
        logging.warning("Issues detected. Please review console output for details.")

if __name__ == "__main__":
    main()
