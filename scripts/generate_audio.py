import os
import yaml
from pathlib import Path
from tqdm import tqdm
from collections import defaultdict
import logging
from gtts import gTTS

# TTS function using gTTS for American English
def generate_tts_audio(word, output_file):
    """
    Generate audio using Google Text-to-Speech (gTTS) for American English.
    Saves audio to an MP3 file.
    """
    try:
        tts = gTTS(text=word, lang='en', tld='us', slow=False)
        tts.save(output_file)
        if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
            return True
        else:
            logging.error(f"Generated file '{output_file}' is empty or invalid")
            return False
    except Exception as e:
        logging.error(f"Failed to generate audio for '{word}': {str(e)}")
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
    """Validate that the YAML directory exists and list its contents."""
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

def load_yaml_files():
    """Load all .yaml files and collect word entries with their source letter."""
    word_entries = []
    word_to_letter = defaultdict(list)
    missing_files = []
    empty_files = []

    for letter in LETTERS:
        yaml_path = YAML_DIR / f"{letter}.yaml"
        if not yaml_path.exists():
            missing_files.append(letter)
            continue

        try:
            with open(yaml_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or []
                if not isinstance(data, list):
                    logging.warning(f"Invalid format in {yaml_path}: expected a list")
                    empty_files.append(letter)
                    continue
                if not data:
                    logging.warning(f"No entries in {yaml_path}")
                    empty_files.append(letter)
                    continue
                for entry in data:
                    word = entry.get("word", "").strip().lower()
                    if not word:
                        logging.warning(f"Empty or invalid word in {letter}.yaml")
                        continue
                    word_entries.append((letter, word))
                    word_to_letter[word].append(letter)
        except Exception as e:
            logging.error(f"Error reading {yaml_path}: {str(e)}")
            empty_files.append(letter)

    return word_entries, word_to_letter, missing_files, empty_files

def check_duplicates(word_to_letter):
    """Identify and report duplicate words across .yaml files."""
    duplicates = {word: letters for word, letters in word_to_letter.items() if len(letters) > 1}
    if duplicates:
        logging.warning("Found duplicate words:")
        for word, letters in duplicates.items():
            logging.warning(f"  Word '{word}' appears in {', '.join(letters)}")
    return duplicates

def ensure_audio_directories():
    """Create audio directories for each letter if they don't exist."""
    for letter in LETTERS:
        audio_path = AUDIO_DIR / letter
        try:
            os.makedirs(audio_path, exist_ok=True)
        except Exception as e:
            logging.error(f"Error creating directory {audio_path}: {str(e)}")

def generate_audio_files(word_entries, overwrite=False):
    """Generate audio files for each word, with overwrite option."""
    total_entries = len(word_entries)
    logging.info(f"Processing {total_entries} entries")
    
    generated = 0
    skipped = 0
    failed = 0

    # Clean progress bar
    with tqdm(total=total_entries, desc="Generating audio", unit="word", position=0, leave=True) as pbar:
        for letter, word in word_entries:
            audio_path = AUDIO_DIR / letter / f"{word}.mp3"
            
            # Skip if not overwriting and file exists with non-zero size
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
                logging.error(f"Error generating audio for '{word}' in {letter}: {str(e)}")
                failed += 1
            
            pbar.update(1)

    return generated, skipped, failed

def validate_audio_files(word_entries):
    """Validate that every word has an audio file and no extra audio files exist."""
    missing_audio = []
    extra_audio = []
    empty_audio_dirs = []

    word_set = {(letter, word) for letter, word in word_entries}

    for letter in LETTERS:
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

def main():
    """Main function to orchestrate audio generation and validation."""
    # Prompt user for overwrite choice
    while True:
        response = input("Do you want to overwrite existing audio files? [y/n]: ").strip().lower()
        if response in ['y', 'n']:
            overwrite = response == 'y'
            logging.info(f"User chose to {'overwrite' if overwrite else 'skip'} existing audio files")
            break
        print("Please enter 'y' or 'n'.")

    # Validate YAML directory
    if not validate_yaml_dir():
        logging.error("Cannot proceed due to YAML directory issues. Exiting.")
        return

    # Ensure audio directories exist
    ensure_audio_directories()

    # Load all .yaml files
    word_entries, word_to_letter, missing_files, empty_files = load_yaml_files()
    
    if missing_files:
        logging.warning(f"Missing .yaml files for letters: {', '.join(missing_files)}")
    if empty_files:
        logging.warning(f"Empty or invalid .yaml files for letters: {', '.join(empty_files)}")
    
    if not word_entries:
        logging.error("No valid entries found in .yaml files. Exiting.")
        return

    # Check for duplicates
    duplicates = check_duplicates(word_to_letter)
    if duplicates:
        logging.warning(f"Found {len(duplicates)} duplicate words. Please resolve before proceeding.")

    # Generate audio files
    generated, skipped, failed = generate_audio_files(word_entries, overwrite=overwrite)

    # Validate audio files
    missing_audio, extra_audio, empty_audio_dirs = validate_audio_files(word_entries)

    # Summary
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
