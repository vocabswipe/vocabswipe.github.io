import os
import yaml
from pathlib import Path
from tqdm import tqdm
from collections import defaultdict
import logging
import time

# Placeholder TTS function (replace with your actual TTS service, e.g., AWS Polly)
def generate_tts_audio(word, output_file, voice="en-US"):
    """
    Placeholder for generating audio using a TTS service.
    Replace with your actual TTS implementation (e.g., AWS Polly, Google TTS).
    """
    try:
        # Simulate TTS generation for now
        time.sleep(0.1)  # Simulate API call delay
        with open(output_file, 'wb') as f:
            f.write(b"Simulated MP3 content")  # Placeholder content
        return True
    except Exception as e:
        logging.error(f"Failed to generate audio for '{word}': {str(e)}")
        return False

# Configuration
# Resolve paths relative to the project root (two levels up from scripts/)
PROJECT_ROOT = Path(__file__).parent.parent
YAML_DIR = PROJECT_ROOT / "data" / "words"
AUDIO_DIR = PROJECT_ROOT / "public" / "audio"
LETTERS = "abcdefghijklmnopqrstuvwxyz"

# Setup logging (console only, no log file)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)

def load_yaml_files():
    """Load all .yaml files and collect word entries with their source letter."""
    logging.info(f"Looking for .yaml files in: {YAML_DIR}")
    word_entries = []
    word_to_letter = defaultdict(list)  # Track duplicates: word -> list of letters
    missing_files = []

    for letter in LETTERS:
        yaml_path = YAML_DIR / f"{letter}.yaml"
        if not yaml_path.exists():
            missing_files.append(letter)
            logging.debug(f"Missing .yaml file: {yaml_path}")
            continue

        try:
            with open(yaml_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or []
                if not isinstance(data, list):
                    logging.warning(f"Invalid format in {yaml_path}: expected a list")
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

    return word_entries, word_to_letter, missing_files

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
    logging.info(f"Ensuring audio directories exist in: {AUDIO_DIR}")
    for letter in LETTERS:
        audio_path = AUDIO_DIR / letter
        try:
            os.makedirs(audio_path, exist_ok=True)
        except Exception as e:
            logging.error(f"Failed to create directory {audio_path}: {str(e)}")

def generate_audio_files(word_entries):
    """Generate audio files for each word with a progress bar."""
    total_entries = len(word_entries)
    logging.info(f"Processing {total_entries} total entries")
    
    generated = 0
    skipped = 0
    failed = 0

    # Progress bar
    with tqdm(total=total_entries, desc="Generating audio", unit="word") as pbar:
        for letter, word in word_entries:
            audio_path = AUDIO_DIR / letter / f"{word}.mp3"
            
            if audio_path.exists():
                skipped += 1
                pbar.update(1)
                continue

            try:
                if generate_tts_audio(word, audio_path, voice="en-US"):
                    generated += 1
                else:
                    failed += 1
            except Exception as e:
                logging.error(f"Unexpected error for '{word}' in {letter}: {str(e)}")
                failed += 1
            
            pbar.update(1)

    return generated, skipped, failed

def validate_audio_files(word_entries):
    """Validate that every word has an audio file and no extra audio files exist."""
    missing_audio = []
    extra_audio = []
    word_set = {(letter, word) for letter, word in word_entries}

    for letter in LETTERS:
        audio_dir = AUDIO_DIR / letter
        if not audio_dir.exists():
            continue

        # Check for extra audio files
        for audio_file in audio_dir.glob("*.mp3"):
            word = audio_file.stem.lower()
            if (letter, word) not in word_set:
                extra_audio.append((letter, word, audio_file))

        # Check for missing audio files
        for _, word in filter(lambda x: x[0] == letter, word_entries):
            audio_path = audio_dir / f"{word}.mp3"
            if not audio_path.exists():
                missing_audio.append((letter, word, audio_path))

    return missing_audio, extra_audio

def main():
    """Main function to orchestrate audio generation and validation."""
    logging.info("Starting audio generation process")

    # Log resolved paths for debugging
    logging.info(f"Project root: {PROJECT_ROOT}")
    logging.info(f"YAML directory: {YAML_DIR}")
    logging.info(f"Audio directory: {AUDIO_DIR}")

    # Ensure audio directories exist
    ensure_audio_directories()

    # Load all .yaml files
    word_entries, word_to_letter, missing_files = load_yaml_files()
    
    if missing_files:
        logging.warning(f"Missing .yaml files for letters: {', '.join(missing_files)}")
    
    if not word_entries:
        logging.error("No valid entries found in .yaml files. Exiting.")
        return

    # Check for duplicates
    duplicates = check_duplicates(word_to_letter)
    if duplicates:
        logging.warning(f"Found {len(duplicates)} duplicate words. Please resolve before proceeding.")
        # Optionally, exit if duplicates are critical
        # return

    # Generate audio files
    generated, skipped, failed = generate_audio_files(word_entries)

    # Validate audio files
    missing_audio, extra_audio = validate_audio_files(word_entries)

    # Summary
    total_entries = len(word_entries)
    logging.info("\n=== Audio Generation Summary ===")
    logging.info(f"Total entries processed: {total_entries}")
    logging.info(f"Audio files generated: {generated}")
    logging.info(f"Audio files skipped (already exist): {skipped}")
    logging.info(f"Audio generation failures: {failed}")
    logging.info(f"Duplicate words: {len(duplicates)}")
    logging.info(f"Missing audio files: {len(missing_audio)}")
    if missing_audio:
        logging.warning("Missing audio files:")
        for letter, word, path in missing_audio:
            logging.warning(f"  {word} in {letter} ({path})")
    logging.info(f"Extra audio files: {len(extra_audio)}")
    if extra_audio:
        logging.warning("Extra audio files:")
        for letter, word, path in extra_audio:
            logging.warning(f"  {word} in {letter} ({path})")
    
    if not duplicates and not missing_audio and not extra_audio and failed == 0:
        logging.info("Success: All entries have corresponding audio files, no duplicates or issues detected!")
    else:
        logging.warning("Issues detected. Please review console output for details.")

    logging.info("Audio generation process completed.")

if __name__ == "__main__":
    main()
