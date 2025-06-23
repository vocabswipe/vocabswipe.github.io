import os
import json
import yaml
from tqdm import tqdm
import boto3
import hashlib
from collections import defaultdict
import time
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'vocab_processing.log'), encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Define paths using absolute paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEMP_VOCAB_JSONL_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'temp_vocab_multi_cards.jsonl')
TEMP_VOCAB_LOG_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'temp_vocab_log.yaml')
VOCAB_DB_PATH = os.path.join(BASE_DIR, 'data', 'vocab_database.yaml')
AUDIO_DIR = os.path.join(BASE_DIR, 'data', 'audio')

# Ensure audio, temp, and reports directories exist
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(os.path.dirname(TEMP_VOCAB_JSONL_PATH), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'data', 'reports'), exist_ok=True)

# Initialize AWS Polly client with error handling
try:
    polly_client = boto3.client('polly', region_name='us-east-1')
    logger.info("AWS Polly client initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize AWS Polly client: {e}")
    raise

# Use only Matthew's voice (en-US, neural)
FAVORITE_VOICES = ['Matthew']

def load_file(file_path, file_type='jsonl'):
    """Load JSONL or YAML file and return its content."""
    logger.info(f"Attempting to load: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            if file_type == 'jsonl':
                data = [json.loads(line) for line in file if line.strip()]
            else:
                data = yaml.safe_load(file) or []
            return data
    except FileNotFoundError:
        logger.warning(f"{file_path} does not exist. Creating default structure.")
        return [] if file_type == 'jsonl' else {}
    except (yaml.YAMLError, json.JSONDecodeError) as e:
        logger.error(f"Error parsing {file_type.upper()} file {file_path}: {e}")
        return [] if file_type == 'jsonl' else {}

def save_file(data, file_path, file_type='yaml'):
    """Save data to YAML or JSON file."""
    try:
        with open(file_path, 'w', encoding='utf-8') as file:
            if file_type == 'json':
                json.dump(data, file, ensure_ascii=False, indent=2)
            else:
                yaml.safe_dump(data, file, allow_unicode=True, sort_keys=False)
        logger.info(f"Saved data to {file_path}")
    except Exception as e:
        logger.error(f"Error saving {file_type.upper()} file {file_path}: {e}")
        raise

def append_to_log(entries):
    """Append entries to temp_vocab_log.yaml, creating a blank file if it doesn't exist."""
    if not os.path.exists(TEMP_VOCAB_LOG_PATH):
        logger.info(f"Creating blank {TEMP_VOCAB_LOG_PATH}")
        save_file([], TEMP_VOCAB_LOG_PATH, file_type='yaml')
    
    existing_log = load_file(TEMP_VOCAB_LOG_PATH, file_type='yaml')
    if not isinstance(existing_log, list):
        logger.warning(f"{TEMP_VOCAB_LOG_PATH} is not a list. Initializing as empty list.")
        existing_log = []
    existing_log.extend(entries)
    save_file(existing_log, TEMP_VOCAB_LOG_PATH, file_type='yaml')
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
    required_fields = ['word', 'rank', 'freq', 'part_of_speech', 'back_cards']
    if not all(field in entry for field in required_fields):
        logger.warning(f"Invalid entry - missing required fields: {entry}")
        return False
    if not isinstance(entry['back_cards'], list) or len(entry['back_cards']) < 1:
        logger.warning(f"Invalid entry - back_cards must be a non-empty list: {entry}")
        return False
    for card in entry['back_cards']:
        if not all(k in card for k in ['definition_en', 'example_en']):
            logger.warning(f"Invalid back_card in entry: {entry}")
            return False
    return True

def get_audio_filename(word, text, prefix, voice_id, index=0):
    """Generate unique audio filename based on word, prefix, voice_id, MD5 hash, and index."""
    safe_word = word.lower().replace(' ', '_')
    return f"{safe_word}_{prefix}_{index}+{voice_id}+{hashlib.md5(text.encode('utf-8')).hexdigest()}.mp3"

def check_duplicates(vocab_db, new_entries):
    """Check for duplicates and prepare to merge back_cards, keeping all unique entries."""
    seen_words = {entry['word'].lower(): entry for entry in vocab_db}
    duplicates = []
    merged_entries = []

    for new_entry in new_entries:
        word_lower = new_entry['word'].lower()
        if word_lower in seen_words:
            duplicates.append((new_entry['word'], word_lower))
            existing_entry = seen_words[word_lower]
            # Merge new back_cards if they are unique
            new_back_cards = new_entry['back_cards']
            existing_back_cards = existing_entry.get('back_cards', [])
            unique_new_cards = [card for card in new_back_cards if card not in existing_back_cards]
            if unique_new_cards:
                existing_entry['back_cards'].extend(unique_new_cards)
                merged_entries.append(existing_entry)
        else:
            seen_words[word_lower] = new_entry
            merged_entries.append(new_entry)

    return duplicates, merged_entries

def verify_audio_files(vocab_db):
    """Verify that all entries in vocab_db have corresponding audio files."""
    missing_audio = []
    for entry in vocab_db:
        word_audio_files = entry.get('word_audio_file', [])
        sentence_audio_files = entry.get('sentence_audio_file', [])
        for i, audio_file in enumerate(word_audio_files):
            if audio_file and not os.path.exists(os.path.join(AUDIO_DIR, audio_file)):
                missing_audio.append((entry['word'], 'word_audio_file', i, audio_file))
        for i, audio_file in enumerate(sentence_audio_files):
            if audio_file and not os.path.exists(os.path.join(AUDIO_DIR, audio_file)):
                missing_audio.append((entry['word'], 'sentence_audio_file', i, audio_file))
    return missing_audio

def generate_summary_report(vocab_db, valid_entries, duplicates, removed_count, missing_audio, initial_word_count, skipped_entries):
    """Generate a summary report of the processing results."""
    total_words = len(vocab_db)
    total_audio_files = sum(len(entry.get('word_audio_file', [])) + len(entry.get('sentence_audio_file', [])) for entry in vocab_db)
    new_words = len([e for e in valid_entries if e not in vocab_db])  # Count only truly new words
    new_cards = sum(len(entry['back_cards']) for entry in valid_entries) - sum(len(entry.get('back_cards', [])) for entry in vocab_db)

    report = [
        "=== Vocabulary Database Processing Report ===",
        f"Date and Time: {time.strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        f"Total Words in Database: {total_words}",
        f"Initial Words (before processing): {initial_word_count}",
        f"Newly Added Words: {new_words}",
        f"Newly Added Back Cards: {new_cards}",
        f"Skipped Entries (already processed): {skipped_entries}",
        f"Total Audio Files (should be 6x entries): {total_audio_files} (Expected: {6 * total_words})",
    ]
    
    if new_words > 0 or new_cards > 0:
        report.append("\nUpdates Added:")
        for entry in valid_entries[:min(5, len(valid_entries))]:  # Show up to 5 updated entries
            report.append(f"  {entry['word']} (Rank: {entry['rank']}, New Cards: {len(entry['back_cards']) - len([c for c in entry['back_cards'] if c in vocab_db])})")
        if len(valid_entries) > 5:
            report.append(f"  ... and {len(valid_entries) - 5} more")
    
    if duplicates:
        report.append("\nExisting Words with New Cards:")
        for word, _ in duplicates:
            report.append(f"  {word}")
    else:
        report.append("\nNo Existing Words Updated.")
    
    if missing_audio:
        report.append("\nMissing Audio Files:")
        for word, audio_type, index, path in missing_audio:
            report.append(f"  Word: {word}, Type: {audio_type}, Index: {index}, Path: {path}")
    else:
        report.append("\nAll Audio Files Present.")
    
    report.append("\n=== End of Report ===")
    
    report_text = '\n'.join(report)
    print(report_text)
    report_path = os.path.join(BASE_DIR, 'data', 'reports', f"vocab_report_{time.strftime('%Y%m%d_%H%M%S')}.txt")
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_text)
    logger.info(f"Report saved to: {report_path}")

def process_entries(entries):
    """Process vocabulary entries and update database, allowing new back_cards for existing words."""
    vocab_db = load_file(VOCAB_DB_PATH, file_type='yaml')
    if not isinstance(vocab_db, list):
        logger.warning(f"{VOCAB_DB_PATH} is not a list or empty. Initializing as empty list.")
        vocab_db = []

    initial_word_count = len(vocab_db)
    valid_entries = []
    invalid_entries = []
    skipped_entries = 0

    for entry in tqdm(entries, desc="Processing"):
        if not validate_entry(entry):
            invalid_entries.append(entry)
            continue

        word_lower = entry['word'].lower()
        existing_entry = next((e for e in vocab_db if e['word'].lower() == word_lower), None)

        if existing_entry and existing_entry.get('voice_id') == 'Matthew':
            voice = existing_entry['voice_id']
            word_audio_files = existing_entry.get('word_audio_file', [])
            sentence_audio_files = existing_entry.get('sentence_audio_file', [])
            all_audio_exist = all(os.path.exists(os.path.join(AUDIO_DIR, f)) for f in word_audio_files + sentence_audio_files)

            if all_audio_exist:
                logger.info(f"Skipping entry '{entry['word']}' - audio files already exist with voice {voice}")
                skipped_entries += 1
                continue  # Skip further processing since audio exists

        # Prepare new entry or update existing one
        selected_voice = 'Matthew'
        if existing_entry:
            new_entry = existing_entry.copy()
            # Merge new back_cards, keeping only unique ones
            existing_back_cards = new_entry.get('back_cards', [])
            new_back_cards = entry['back_cards']
            unique_new_cards = [card for card in new_back_cards if card not in existing_back_cards]
            if unique_new_cards:
                new_entry['back_cards'].extend(unique_new_cards)
            else:
                logger.info(f"No new unique back_cards for '{entry['word']}'")
                continue
        else:
            new_entry = {
                'word': entry['word'],
                'rank': entry['rank'],
                'freq': entry['freq'],
                'part_of_speech': entry['part_of_speech'],
                'back_cards': entry['back_cards'],
                'word_audio_file': [],
                'sentence_audio_file': [],
                'voice_id': selected_voice
            }

        # Delete existing audio files if they exist with a different voice
        if existing_entry and existing_entry.get('voice_id') != 'Matthew':
            for audio_file in existing_entry.get('word_audio_file', []) + existing_entry.get('sentence_audio_file', []):
                audio_path = os.path.join(AUDIO_DIR, audio_file)
                if os.path.exists(audio_path):
                    try:
                        os.remove(audio_path)
                        logger.info(f"Deleted old audio file with different voice: {audio_path}")
                    except OSError as e:
                        logger.error(f"Error deleting old audio file {audio_path}: {e}")

        # Generate audio for word (if new or voice changed)
        word_text = f"<speak>{new_entry['word']}</speak>"
        word_audio_filename = get_audio_filename(new_entry['word'], new_entry['word'], 'word', selected_voice)
        word_audio_path = os.path.join(AUDIO_DIR, word_audio_filename)
        word_success = generate_audio(word_text, word_audio_path, selected_voice, use_ssml=True) if not os.path.exists(word_audio_path) or (existing_entry and existing_entry.get('voice_id') != 'Matthew') else True
        new_entry['word_audio_file'] = [word_audio_filename] if word_success else []

        # Generate audio for all back_cards (existing + new)
        sentence_audio_files = []
        for i, card in enumerate(new_entry['back_cards']):
            sentence_text = f"<speak>{new_entry['word']}. {card['example_en']}</speak>"
            sentence_audio_filename = get_audio_filename(new_entry['word'], f"{new_entry['word']}. {card['example_en']}", 'sentence', selected_voice, i)
            sentence_audio_path = os.path.join(AUDIO_DIR, sentence_audio_filename)
            sentence_success = generate_audio(sentence_text, sentence_audio_path, selected_voice, use_ssml=True) if not os.path.exists(sentence_audio_path) else True
            sentence_audio_files.append(sentence_audio_filename if sentence_success else '')
        new_entry['sentence_audio_file'] = sentence_audio_files

        if word_success and all(sentence_audio_files):
            valid_entries.append(new_entry)
        else:
            invalid_entries.append(entry)

    # Update database with merged entries
    for entry in valid_entries:
        word_lower = entry['word'].lower()
        vocab_db = [e for e in vocab_db if e['word'].lower() != word_lower or e == entry]  # Keep the updated entry
        vocab_db.append(entry)
    vocab_db.sort(key=lambda x: x['rank'])  # Sort by rank for consistency

    duplicates, merged_entries = check_duplicates(vocab_db, valid_entries)
    missing_audio = verify_audio_files(vocab_db)
    save_file(vocab_db, VOCAB_DB_PATH, file_type='yaml')
    generate_summary_report(vocab_db, valid_entries, duplicates, 0, missing_audio, initial_word_count, skipped_entries)
    
    return valid_entries, invalid_entries

def main():
    """Main function to process temp_vocab_multi_cards.jsonl and update vocab_database.yaml."""
    entries = load_file(TEMP_VOCAB_JSONL_PATH, file_type='jsonl')
    if not entries:
        logger.warning("No entries to process in temp_vocab_multi_cards.jsonl")
        return

    append_to_log(entries)
    valid_entries, invalid_entries = process_entries(entries)
    print(f"Processed {len(entries)} entries: {len(valid_entries)} valid, {len(invalid_entries)} invalid")
    if invalid_entries:
        logger.warning(f"Invalid entries: {invalid_entries}")

    if valid_entries:
        save_file([], TEMP_VOCAB_JSONL_PATH, file_type='json')  # Clear JSONL (save as empty JSON)
        logger.info("Batch processed successfully. temp_vocab_multi_cards.jsonl cleared.")
    else:
        logger.warning("Batch processing failed. temp_vocab_multi_cards.jsonl not cleared.")

if __name__ == "__main__":
    main()
