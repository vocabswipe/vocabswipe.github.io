import yaml
import os
import hashlib
from datetime import datetime
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

# Required fields for each entry
REQUIRED_FIELDS = [
    'word', 'part_of_speech', 'definition_en', 'definition_th',
    'example_en', 'example_th', 'audio_file'
]

# Ensure audio directory exists
os.makedirs(AUDIO_DIR, exist_ok=True)

def load_yaml(file_path):
    """Load YAML file or return empty list if file doesn't exist."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            return data if isinstance(data, list) else []
    except FileNotFoundError:
        return []
    except yaml.YAMLError as e:
        logging.error(f"{Fore.RED}Failed to parse {file_path}: {e}")
        return []

def save_yaml(data, file_path):
    """Save data to YAML file."""
    with open(file_path, 'w', encoding='utf-8') as f:
        yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False)

def validate_entry(entry):
    """Validate an entry for required fields and non-empty strings."""
    errors = []
    if not isinstance(entry, dict):
        return False, ["Entry is not a dictionary"]
    
    # Check for missing fields
    for field in REQUIRED_FIELDS:
        if field not in entry:
            errors.append(f"Missing field: {field}")
    
    # Check for empty or non-string values
    for field in REQUIRED_FIELDS:
        if field in entry:
            if not isinstance(entry[field], str):
                errors.append(f"Field '{field}' is not a string")
            elif field != 'audio_file' and not entry[field].strip():  # Allow empty audio_file
                errors.append(f"Field '{field}' is empty")
    
    # Ensure audio_file is empty in temp file
    if 'audio_file' in entry and entry['audio_file'].strip():
        errors.append("Field 'audio_file' must be empty in temp file")
    
    return len(errors) == 0, errors

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

def print_summary(main_entries, missing_audio, invalid_count):
    """Print summary of database status."""
    print(f"\n{Fore.MAGENTA}{Style.BRIGHT}=== VocabSwipe Database Summary ===")
    print(f"{Fore.CYAN}Total entries in {MAIN_DB_FILE}: {len(main_entries)}")
    print(f"{Fore.CYAN}Invalid entries skipped in {TEMP_DB_FILE}: {invalid_count}")
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

    # Load main and temp databases
    main_db = load_yaml(MAIN_DB_FILE)
    temp_db = load_yaml(TEMP_DB_FILE)

    # Remove duplicates from main database
    main_db = remove_main_duplicates(main_db)

    if not temp_db:
        logging.info(f"{Fore.YELLOW}No entries in {TEMP_DB_FILE} to process.")
        print_summary(main_db, check_missing_audio(main_db), 0)
        return

    # Validate temp entries
    valid_entries = []
    invalid_count = 0
    print(f"{Fore.CYAN}Validating {len(temp_db)} entries in {TEMP_DB_FILE}...")
    for entry in temp_db:
        is_valid, errors = validate_entry(entry)
        if is_valid:
            valid_entries.append(entry)
        else:
            invalid_count += 1
            logging.error(f"{Fore.RED}Invalid entry for word '{entry.get('word', 'unknown')}': {'; '.join(errors)}")

    # Check for duplicates in valid entries
    valid_entries = check_duplicates(valid_entries, main_db)
    if not valid_entries:
        logging.info(f"{Fore.YELLOW}No valid entries to process after validation and duplicate check.")
        print_summary(main_db, check_missing_audio(main_db), invalid_count)
        # Clear temp file
        save_yaml([], TEMP_DB_FILE)
        logging.info(f"{Fore.GREEN}Cleared {TEMP_DB_FILE}")
        return

    # Process valid entries with single-line progress bar
    print(f"{Fore.CYAN}Generating audio for {len(valid_entries)} entries...")
    for entry in tqdm(valid_entries, desc=f"{Fore.GREEN}Processing", bar_format="{desc}: {percentage:3.0f}%|{bar:20}| {n}/{total} [{elapsed}<{remaining}]", leave=False):
        word = entry['word']
        audio_file = generate_audio(word, entry)
        if audio_file:
            entry['audio_file'] = audio_file
            main_db.append(entry)
        else:
            logging.error(f"{Fore.RED}Skipping append for '{word}' due to audio generation failure.")

    # Save updated main database
    save_yaml(main_db, MAIN_DB_FILE)
    logging.info(f"{Fore.GREEN}Appended {len(valid_entries)} entries to {MAIN_DB_FILE}")

    # Print summary
    print_summary(main_db, check_missing_audio(main_db), invalid_count)

    # Clear temp file after all tasks
    save_yaml([], TEMP_DB_FILE)
    logging.info(f"{Fore.GREEN}Cleared {TEMP_DB_FILE}")

if __name__ == "__main__":
    main()
