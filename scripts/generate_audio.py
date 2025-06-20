import os
import yaml
from pathlib import Path
from tqdm import tqdm
from collections import defaultdict
import logging
from gtts import gTTS

# TTS function using gTTS for American English
def generate_tts_audio(word, output_file, voice="en-us"):
    """
    Generate audio using Google Text-to-Speech (gTTS) for American English.
    Saves audio to an MP3 file.
    """
    try:
        # Create TTS object with American English
        tts = gTTS(text=word, lang=voice, slow=False)
        # Save to MP3 file
        tts.save(output_file)
        # Verify file exists and is not empty
        if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
            logging.debug(f"Generated audio for '{word}' at {output_file}")
            return True
        else:
            logging.error(f"Generated file '{output_file}' is empty or invalid")
            return False
    except Exception as e:
        logging.error(f"Failed to generate audio for '{word}' with gTTS: {str(e)}")
        return False

# Configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent.resolve()
YAML_DIR = PROJECT_ROOT / "data" / "words"
AUDIO_DIR = PROJECT_ROOT / "public" / "audio"
LETTERS = "abcdefghijklmnopqrstuvwxyz"

# Setup logging (console only)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

def validate_yaml_dir():
    """Validate that the YAML directory exists."""
    if not YAML_DIR.exists():
        logger.error(f"YAML directory does not exist: {YAML_DIR}")
        return False
    if not YAML_DIR.is_dir():
        logger.error(f"YAML directory is not a directory: {YAML_DIR}")
        return False
    
    yaml_files = list(YAML_DIR.glob("*.yaml"))
    if not yaml_files:
        logger.warning(f"No .yaml files found in {YAML_DIR}")
    else:
        logger.info(f"Found {len(yaml_files)} .yaml files in {YAML_DIR}: {[f.name for f in yaml_files]}")
    
    return True

def load_yaml_files():
    """Load all .yaml files and collect word entries with their source letter."""
    logger.info(f"Looking for .yaml files in: {YAML_DIR}"})
    word_entries = []
    word_to_letter = defaultdict(list)
    missing_files = []
    empty_files = []

    for letter in LETTERS:
        yaml_path = YAML_DIR / f"{letter}.yaml"
        if not yaml_path.exists():
            logger.warning(f"Missing .yaml file: {yaml_path}")
            missing_files.append(letter)
            continue

        try:
            with open(yaml_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or []
                if not isinstance(data, list):
                    logger.warning(f"Invalid format in {yaml_path}: expected a list")
                    empty_files.append(letter)
                    continue
                if not data:
                    logger.warning(f"No entries in {yaml_path}")
                    empty_files.append(letter)
                    continue
                for entry in data:
                    word = entry.get("word", "").strip().lower()
                    if not word:
                        logger.warning(f"Empty or invalid word in {letter}.yaml")
                        continue
                    word_entries.append((letter, word))
                    word_to_letter[word].append(letter)
        except Exception as e:
            logger.error(f"Error reading {yaml_path}: {str(e)}")
            empty_files.append(letter)

    return word_entries, word_to_letter, missing_files, empty_files

def check_duplicates(word_to_letter):
    """Identify and report duplicate words across .yaml files."""
    duplicates = {word: letters for word, letters in word_to_letter.items() if len(letters) > 1}
    if duplicates:
        logger.warning("Found duplicate words:")
        for word, letters in duplicates.items():
            logger.warning(f"  Word '{word}' appears in {', '.join(letters)}")
    return duplicates

def ensure_audio_directories():
    """Create audio directories for each letter if they don't exist."""
    logger.info(f"Ensuring audio directories exist in: {AUDIO_DIR}")
    for letter in LETTERS:
        audio_path = AUDIO_DIR / letter
        try:
            os.makedirs(audio_path, exist_ok=True)
        except Exception as e:
            logger.error(f"Error creating directory {audio_path}: {e}")

def generate_audio_files(word_entries, overwrite=False):
    """Generate audio files for each word, with overwrite option."""
    total_entries = len(word_entries)
    logger.info(f"Processing {total_entries} total entries")
    
    generated = 0
    skipped = 0
    failed = 0

    with tqdm(total=total_entries, desc="Generating audio files", unit="word") as pbar:
        for letter, word in word_entries:
            audio_path = AUDIO_DIR / letter / f"{word}.mp3"
            
            # Skip if not overwriting and file exists with non-zero size
            if not overwrite and audio_path.exists() and audio_path.stat().st_size > 0:
                logger.debug(f"Skipped existing audio for '{word}' in {letter}")
                skipped += 1
                pbar.update(1)
                continue

            try:
                if generate_tts_audio(word, audio_path, voice="en-us"):
                    generated += 1
                else:
                    failed += 1
            except Exception as e:
                logger.error(f"Unexpected error for '{word}' in {letter}: {str(e)}")
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
    logger.info("Starting audio generation process")

    # Prompt user for overwrite choice
    while True:
        response = input("Do you want to overwrite existing audio files? [y/n]: ").strip().lower()
        if response in ['y', 'n']:
            overwrite = response == 'y'
            logger.info(f"User chose to {'overwrite' if overwrite else 'skip'} existing audio files")
            break
        print("Please enter 'y' or 'n'.")

    # Log resolved paths
    logger.info(f"Project root: {PROJECT_ROOT}")
    logger.info(f"YAML directory: {YAML_DIR}")
    logger.info(f"Audio directory: {AUDIO_DIR}")

    # Validate YAML directory
    if not validate_yaml_dir():
        logger.error("Cannot proceed due to YAML directory issues. Exiting.")
        return

    # Ensure audio directories exist
    ensure_audio_directories()

    # Load all .yaml files
    word_entries, word_to_letter, missing_files, empty_files = load_yaml_files()
    
    if missing_files:
        logger.warning(f"Missing .yaml files for letters: {', '.join(missing_files)}")
    if empty_files:
        logger.warning(f"Empty or invalid .yaml files for letters: {', '.join(empty_files)}")
    
    if not word_entries:
        logger.error("No valid entries found in .yaml files. Exiting.")
        return

    # Check for duplicates
    duplicates = check_duplicates(word_to_letter)
    if duplicates:
        logger.warning(f"Found {len(duplicates)} duplicate words. Please resolve before proceeding.")

    # Generate audio files
    generated, skipped, failed = generate_audio_files(word_entries, overwrite=overwrite)

    # Validate audio files
    missing_audio, extra_audio, empty_audio_dirs = validate_audio_files(word_entries)

    # Summary
    total_entries = len(word_entries)
    logger.info("\n=== Audio Generation Summary ===")
    logger.info(f"Total entries processed: {total_entries}")
    logger.info(f"Audio files generated: {generated}")
    logger.info(f"Audio files skipped (already exist): {skipped}")
    logger.info(f"Audio generation failures: {failed}")
    logger.info(f"Duplicate words: {len(duplicates)}")
    logger.info(f"Missing audio files: {len(missing_audio)}")
    if missing_audio:
        logger.warning("Missing or invalid audio files:")
        for letter, word, path in missing_audio:
            logger.warning(f"  {word} in {letter} ({path})")
    logger.info(f"Extra audio files: {len(extra_audio)}")
    if extra_audio:
        logger.warning("Extra audio files:")
        for letter, word, path in extra_audio:
            logger.warning(f"  {word} in {letter} ({path})")
    logger.info(f"Empty audio directories: {len(empty_audio_dirs)}")
    if empty_audio_dirs:
        logger.warning("Empty audio directories:")
        for letter in empty_audio_dirs:
            logger.warning(f"  {letter}")

    if not duplicates and not missing_audio and not extra_audio and not empty_audio_dirs and failed == 0:
        logger.info("Success: All entries have corresponding audio files, no duplicates or issues detected!")
    else:
        logger.warning("Issues detected. Please review console output for details.")

    logger.info("Audio generation process completed.")

if __name__ == "__main__":
    main()
