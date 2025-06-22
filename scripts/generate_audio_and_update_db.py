import os
import yaml
from tqdm import tqdm
import boto3
import hashlib
import random
from collections import defaultdict
import time
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'vocab_processing.log'), encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Define paths using absolute paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEMP_VOCAB_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'temp_vocab.yaml')
TEMP_VOCAB_LOG_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'temp_vocab_log.yaml')
VOCAB_DB_PATH = os.path.join(BASE_DIR, 'data', 'vocab_database.yaml')
AUDIO_DIR = os.path.join(BASE_DIR, 'data', 'audio')

# Ensure audio, temp, and reports directories exist
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(os.path.dirname(TEMP_VOCAB_PATH), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'data', 'reports'), exist_ok=True)

# Initialize AWS Polly client with error handling
try:
    polly_client = boto3.client('polly', region_name='us-east-1')
    logger.info("AWS Polly client initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize AWS Polly client: {e}")
    raise

# List of favorite voices (all en-US, neural)
FAVORITE_VOICES = ['Joanna', 'Joey', 'Kendra', 'Matthew', 'Stephen']

def load_yaml(file_path):
    """Load YAML file and return its content."""
    logger.info(f"Attempting to load: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            data = yaml.safe_load(file) or []
            return data
    except FileNotFoundError:
        logger.warning(f"{file_path} does not exist. Creating default structure.")
        return {
            'a': [], 'b': [], 'c': [], 'd': [], 'e': [], 'f': [], 'g': [], 'h': [], 'i': [], 'j': [],
            'k': [], 'l': [], 'm': [], 'n': [], 'o': [], 'p': [], 'q': [], 'r': [], 's': [], 't': [],
            'u': [], 'v': [], 'w': [], 'x': [], 'y': [], 'z': []
        } if file_path == VOCAB_DB_PATH else []
    except yaml.YAMLError as e:
        logger.error(f"Error parsing YAML file {file_path}: {e}")
        return []

def save_yaml(data, file_path):
    """Save data to YAML file."""
    try:
        with open(file_path, 'w', encoding='utf-8') as file:
            yaml.safe_dump(data, file, allow_unicode=True, sort_keys=False)
        logger.info(f"Saved data to {file_path}")
    except Exception as e:
        logger.error(f"Error saving YAML file {file_path}: {e}")
        raise

def append_to_log(entries):
    """Append entries to temp_vocab_log.yaml, creating a blank file if it doesn't exist."""
    if not os.path.exists(TEMP_VOCAB_LOG_PATH):
        logger.info(f"Creating blank {TEMP_VOCAB_LOG_PATH}")
        save_yaml([], TEMP_VOCAB_LOG_PATH)
    
    existing_log = load_yaml(TEMP_VOCAB_LOG_PATH)
    if not isinstance(existing_log, list):
        logger.warning(f"{TEMP_VOCAB_LOG_PATH} is not a list. Initializing as empty list.")
        existing_log = []
    existing_log.extend(entries)
    save_yaml(existing_log, TEMP_VOCAB_LOG_PATH)
    logger.info(f"Appended {len(entries)} entries to {TEMP_VOCAB_LOG_PATH}")

def generate_audio(text, output_path, voice_id, use_ssml=False):
    """Generate audio using AWS Polly and save to output_path."""
    try:
        if use_ssml:
            response = polly_client.synthesize_speech(
                Text=text,
                TextType='ssml',
                OutputFormat='mp3',
                VoiceId=voice_id,
                Engine='neural'
            )
        else:
            response = polly_client.synthesize_speech(
                Text=text,
                OutputFormat='mp3',
                VoiceId=voice_id,
                Engine='neural'
            )
        with open(output_path, 'wb') as file:
            file.write(response['AudioStream'].read())
        logger.info(f"Generated audio for '{text}' with voice {voice_id} at {output_path}")
        return True
    except Exception as e:
        logger.error(f"Error generating audio for '{text}' with voice {voice_id}: {e}")
        return False

def validate_entry(entry):
    """Validate vocabulary entry."""
    required_fields = ['word', 'part_of_speech', 'definition_th', 'example_en', 'example_th']
    valid = all(field in entry and isinstance(entry[field], str) and entry[field].strip() for field in required_fields)
    if not valid:
        logger.warning(f"Invalid entry: {entry}")
    return valid

def get_audio_filename(word, text, prefix, voice_id):
    """Generate unique audio filename based on word, prefix, voice_id, and MD5 hash."""
    safe_word = word.lower().replace(' ', '_')
    return f"{safe_word}_{prefix}+{voice_id}+{hashlib.md5(text.encode('utf-8')).hexdigest()}.mp3"

def check_duplicates(vocab_db):
    """Check for and remove duplicate words in vocab_db, keeping the last entry."""
    duplicates = defaultdict(list)
    for letter in vocab_db:
        seen_words = set()
        for entry in vocab_db[letter]:
            word_lower = entry['word'].lower()
            if word_lower in seen_words:
                duplicates[letter].append(word_lower)
            seen_words.add(word_lower)
    
    removed_count = 0
    redundant_audio_files = []
    for letter in vocab_db:
        if letter in duplicates:
            unique_entries = []
            seen_words = set()
            for entry in reversed(vocab_db[letter]):
                word_lower = entry['word'].lower()
                if word_lower not in seen_words:
                    unique_entries.append(entry)
                    seen_words.add(word_lower)
                else:
                    removed_count += 1
                    if entry.get('word_audio_file'):
                        redundant_audio_files.append(os.path.join(AUDIO_DIR, entry['word_audio_file']))
                    if entry.get('sentence_audio_file'):
                        redundant_audio_files.append(os.path.join(AUDIO_DIR, entry['sentence_audio_file']))
            vocab_db[letter] = list(reversed(unique_entries))
            vocab_db[letter] = sorted(vocab_db[letter], key=lambda x: x['word'].lower())
    
    for audio_file in redundant_audio_files:
        if os.path.exists(audio_file):
            try:
                os.remove(audio_file)
                logger.info(f"Deleted redundant audio file: {audio_file}")
            except OSError as e:
                logger.error(f"Error deleting audio file {audio_file}: {e}")
    
    return duplicates, removed_count

def verify_audio_files(vocab_db):
    """Verify that all entries in vocab_db have corresponding audio files."""
    missing_audio = []
    for letter in vocab_db:
        for entry in vocab_db[letter]:
            word_audio_path = os.path.join(AUDIO_DIR, entry.get('word_audio_file', ''))
            sentence_audio_path = os.path.join(AUDIO_DIR, entry.get('sentence_audio_file', ''))
            if not entry.get('word_audio_file') or not os.path.exists(word_audio_path):
                missing_audio.append((entry['word'], 'word_audio_file', word_audio_path))
            if not entry.get('sentence_audio_file') or not os.path.exists(sentence_audio_path):
                missing_audio.append((entry['word'], 'sentence_audio_file', sentence_audio_path))
    return missing_audio

def generate_summary_report(vocab_db, valid_entries, duplicates, removed_count, missing_audio, initial_word_count, skipped_entries):
    """Generate a summary report of the processing results."""
    total_words = sum(len(entries) for entries in vocab_db.values())
    new_words_by_letter = defaultdict(int)
    total_audio_files = 0
    for letter in vocab_db:
        for entry in vocab_db[letter]:
            if entry.get('word_audio_file'):
                total_audio_files += 1
            if entry.get('sentence_audio_file'):
                total_audio_files += 1
    for entry in valid_entries:
        word_lower = entry['word'].lower()
        first_char = word_lower[0]
        new_words_by_letter[first_char] += 1
    
    report = [
        "=== Vocabulary Database Processing Report ===",
        f"Date and Time: {time.strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        f"Total Words in Database: {total_words}",
        f"Initial Words (before processing): {initial_word_count}",
        f"Newly Added Words: {len(valid_entries) - skipped_entries}",
        f"Skipped Entries (already processed): {skipped_entries}",
        f"Total Audio Files (should be 2x entries): {total_audio_files} (Expected: {2 * total_words})",
    ]
    
    if new_words_by_letter:
        report.append("\nNew Words Added by Letter:")
        for letter in sorted(new_words_by_letter.keys()):
            report.append(f"  {letter.upper()}: {new_words_by_letter[letter]}")
    
    if duplicates:
        report.append("\nDuplicates Found and Removed:")
        for letter in duplicates:
            report.append(f"  {letter.upper()}: {', '.join(duplicates[letter])}")
        report.append(f"Total Duplicates Removed: {removed_count}")
    else:
        report.append("\nNo Duplicates Found.")
    
    if missing_audio:
        report.append("\nMissing Audio Files:")
        for word, audio_type, path in missing_audio:
            report.append(f"  Word: {word}, Missing: {audio_type}, Path: {path}")
    else:
        report.append("\nAll Audio Files Present.")
    
    report.append("\n=== End of Report ===")
    
    report_text = "\n".join(report)
    print(report_text)
    report_path = os.path.join(BASE_DIR, 'data', 'reports', f"vocab_report_{time.strftime('%Y%m%d_%H%M%S')}.txt")
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_text)
    logger.info(f"Report saved to: {report_path}")

def process_entries(entries):
    """Process vocabulary entries and update database."""
    vocab_db = load_yaml(VOCAB_DB_PATH)
    if not isinstance(vocab_db, dict):
        logger.error(f"{VOCAB_DB_PATH} is not a dictionary. Initializing default structure.")
        vocab_db = {chr(i): [] for i in range(ord('a'), ord('z') + 1)}
    
    initial_word_count = sum(len(entries) for entries in vocab_db.values())
    valid_entries = []
    invalid_entries = []
    skipped_entries = 0

    for entry in tqdm(entries, desc="Processing"):
        if not validate_entry(entry):
            invalid_entries.append(entry)
            continue

        word_lower = entry['word'].lower()
        if not word_lower or not word_lower[0].isalpha():
            logger.info(f"Skipping entry '{entry['word']}' - does not start with a letter")
            invalid_entries.append(entry)
            continue

        first_char = word_lower[0]
        existing_entry = None
        if first_char in vocab_db and vocab_db[first_char]:
            existing_entry = next((e for e in vocab_db[first_char] if e['word'].lower() == word_lower), None)

        if existing_entry and existing_entry.get('voice_id') in FAVORITE_VOICES:
            voice = existing_entry['voice_id']
            word_text = f"<speak>{entry['word']}</speak>"
            sentence_text = f"<speak>{entry['word']}. {entry['example_en']}</speak>"
            word_audio_filename = get_audio_filename(entry['word'], entry['word'], 'word', voice)
            sentence_audio_filename = get_audio_filename(entry['word'], f"{entry['word']}. {entry['example_en']}", 'sentence', voice)
            word_audio_path = os.path.join(AUDIO_DIR, word_audio_filename)
            sentence_audio_path = os.path.join(AUDIO_DIR, sentence_audio_filename)

            if os.path.exists(word_audio_path) and os.path.exists(sentence_audio_path):
                logger.info(f"Skipping entry '{entry['word']}' - audio files already exist with voice {voice}")
                skipped_entries += 1
                valid_entries.append(existing_entry)
                continue

        # Generate new audio
        selected_voice = random.choice(FAVORITE_VOICES)
        new_entry = {
            'word': entry['word'],
            'part_of_speech': entry['part_of_speech'],
            'definition_th': entry['definition_th'],
            'example_en': entry['example_en'],
            'example_th': entry['example_th'],
            'word_audio_file': '',
            'sentence_audio_file': '',
            'voice_id': selected_voice
        }

        word_text = f"<speak>{new_entry['word']}</speak>"
        word_audio_filename = get_audio_filename(new_entry['word'], new_entry['word'], 'word', selected_voice)
        word_audio_path = os.path.join(AUDIO_DIR, word_audio_filename)

        sentence_text = f"<speak>{new_entry['word']}. {new_entry['example_en']}</speak>"
        sentence_audio_filename = get_audio_filename(new_entry['word'], f"{new_entry['word']}. {new_entry['example_en']}", 'sentence', selected_voice)
        sentence_audio_path = os.path.join(AUDIO_DIR, sentence_audio_filename)

        word_success = generate_audio(word_text, word_audio_path, selected_voice, use_ssml=True) if not os.path.exists(word_audio_path) else True
        sentence_success = generate_audio(sentence_text, sentence_audio_path, selected_voice, use_ssml=True) if not os.path.exists(sentence_audio_path) else True

        if word_success and sentence_success:
            new_entry['word_audio_file'] = word_audio_filename
            new_entry['sentence_audio_file'] = sentence_audio_filename
            valid_entries.append(new_entry)
        else:
            invalid_entries.append(entry)

    # Update database
    for entry in valid_entries:
        word = entry['word'].lower()
        first_char = word[0]
        vocab_db.setdefault(first_char, [])
        vocab_db[first_char] = [e for e in vocab_db[first_char] if e['word'].lower() != word]
        vocab_db[first_char].append(entry)
        vocab_db[first_char] = sorted(vocab_db[first_char], key=lambda x: x['word'].lower())

    duplicates, removed_count = check_duplicates(vocab_db)
    missing_audio = verify_audio_files(vocab_db)
    save_yaml(vocab_db, VOCAB_DB_PATH)
    generate_summary_report(vocab_db, valid_entries, duplicates, removed_count, missing_audio, initial_word_count, skipped_entries)
    
    return valid_entries, invalid_entries

def main():
    """Main function to process temp_vocab.yaml and update vocab_database.yaml."""
    entries = load_yaml(TEMP_VOCAB_PATH)
    if not entries:
        logger.warning("No entries to process in temp_vocab.yaml")
        return

    append_to_log(entries)
    valid_entries, invalid_entries = process_entries(entries)
    print(f"Processed {len(entries)} entries: {len(valid_entries)} valid, {len(invalid_entries)} invalid")
    if invalid_entries:
        logger.warning(f"Invalid entries: {invalid_entries}")

    if valid_entries:
        save_yaml([], TEMP_VOCAB_PATH)
        logger.info("Batch processed successfully. temp_vocab.yaml cleared.")
    else:
        logger.warning("Batch processing failed. temp_vocab.yaml not cleared.")

if __name__ == "__main__":
    main()
