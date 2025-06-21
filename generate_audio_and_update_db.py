import yaml
import os
import hashlib
from gtts import gTTS
from tqdm import tqdm
from colorama import init, Fore, Style
import logging

# Initialize colorama for colored console output
init(autoreset=True)

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# File paths
MAIN_DB_FILE = 'vocab_database.yaml'
TEMP_DB_FILE = 'temp_vocab.yaml'
AUDIO_DIR = 'audio'

# Ensure audio directory exists
os.makedirs(AUDIO_DIR, exist_ok=True)

def load_yaml(file_path):
    """Load YAML file or return empty list if file doesn't exist."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f) or []
    except FileNotFoundError:
        return []

def save_yaml(data, file_path):
    """Save data to YAML file."""
    with open(file_path, 'w', encoding='utf-8') as f:
        yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False)

def generate_hash(entry):
    """Generate MD5 hash from English word, part of speech, definition, and example."""
    concat = f"{entry['word']}{entry['part_of_speech']}{entry['definition_en']}{entry['example_en']}"
    return hashlib.md5(concat.encode('utf-8')).hexdigest()

def check_duplicates(temp_entries, main_entries):
    """Check for duplicate words and return non-duplicate temp entries."""
    main_words = {entry['word'] for entry in main_entries}
    duplicates = [entry['word'] for entry in temp_entries if entry['word'] in main_words]
    if duplicates:
        logging.warning(f"{Fore.YELLOW}Duplicate words found in temp file: {duplicates}")
        return [entry for entry in temp_entries if entry['word'] not in main_words]
    return temp_entries

def remove_main_duplicates(main_entries):
    """Remove duplicate words in main database, keeping first occurrence."""
    seen_words = set()
    unique_entries = []
    duplicates_found = False
    for entry in main_entries:
        word = entry['word']
        if word not in seen_words:
            seen_words.add(word)
            unique_entries.append(entry)
        else:
            duplicates_found = True
            logging.warning(f"{Fore.YELLOW}Removed duplicate word in main database: {word}")
    if duplicates_found:
        save_yaml(unique_entries, MAIN_DB_FILE)
        logging.info(f"{Fore.GREEN}Updated {MAIN_DB_FILE} with duplicates removed")
    return unique_entries

def check_missing_audio(main_entries):
    """Check for missing audio files in main database."""
    missing = []
    for entry in main_entries:
        audio_path = os.path.join(AUDIO_DIR, entry['audio_file'])
        if not os.path.exists(audio_path):
            missing.append(entry['word'])
    if missing:
        logging.warning(f"{Fore.RED}Missing audio files for words: {missing}")
    return missing

def generate_audio(word, entry):
    """Generate audio for a word and return unique filename."""
    hash_value = generate_hash(entry)
    filename = f"word_{hash_value}.mp3"
    audio_path = os.path.join(AUDIO_DIR, filename)
    if os.path.exists(audio_path):
        logging.info(f"{Fore.CYAN}Audio already exists for '{word}': {filename}")
        return filename
    try:
        tts = gTTS(text=word, lang='en', tld='us')  # American English
        tts.save(audio_path)
        logging.info(f"{Fore.GREEN}Generated audio for '{word}': {filename}")
        return filename
    except Exception as e:
        logging.error(f"{Fore.RED}Failed to generate audio for '{word}': {e}")
        return None

def print_summary(main_entries, missing_audio):
    """Print summary of database status."""
    print(f"\n{Fore.MAGENTA}{Style.BRIGHT}=== VocabSwipe Database Summary ===")
    print(f"{Fore.CYAN}Total entries in {MAIN_DB_FILE}: {len(main_entries)}")
    if missing_audio:
        print(f"{Fore.RED}Missing audio files: {len(missing_audio)} words ({', '.join(missing_audio)})")
    else:
        print(f"{Fore.GREEN}All audio files present!")
    print(f"{Fore.CYAN}Duplicates: None (handled during processing)")
    print(f"{Fore.MAGENTA}{Style.BRIGHT}==================================")

def main():
    # Print header for nice UI
    print(f"\n{Fore.BLUE}{Style.BRIGHT}VocabSwipe Audio Generator")
    print(f"{Fore.BLUE}Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{Fore.BLUE}{'=' * 50}\n")

    # Empty temp file at start
    save_yaml([], TEMP_DB_FILE)
    logging.info(f"{Fore.GREEN}Cleared {TEMP_DB_FILE}")

    # Load main and temp databases
    main_db = load_yaml(MAIN_DB_FILE)
    temp_db = load_yaml(TEMP_DB_FILE)

    # Remove duplicates from main database
    main_db = remove_main_duplicates(main_db)

    # Check for duplicates in temp file
    temp_entries = check_duplicates(temp_db, main_db)
    if not temp_entries:
        logging.info(f"{Fore.YELLOW}No new entries to process after duplicate check.")
        print_summary(main_db, check_missing_audio(main_db))
        return

    # Process temporary entries with progress bar
    print(f"{Fore.CYAN}Generating audio for {len(temp_entries)} entries...")
    for entry in tqdm(temp_entries, desc=f"{Fore.GREEN}Processing", bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]"):
        word = entry['word']
        audio_file = generate_audio(word, entry)
        if audio_file:
            entry['audio_file'] = audio_file
            main_db.append(entry)
        else:
            logging.error(f"{Fore.RED}Skipping append for '{word}' due to audio generation failure.")

    # Save updated main database
    save_yaml(main_db, MAIN_DB_FILE)
    logging.info(f"{Fore.GREEN}Appended {len(temp_entries)} entries to {MAIN_DB_FILE}")

    # Print summary
    print_summary(main_db, check_missing_audio(main_db))

if __name__ == "__main__":
    from datetime import datetime
    main()
