import os
import yaml
from tqdm import tqdm
import boto3
import hashlib
import random
from collections import defaultdict

# Define paths using absolute paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEMP_VOCAB_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'temp_vocab.yaml')
TEMP_VOCAB_LOG_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'temp_vocab_log.yaml')
VOCAB_DB_PATH = os.path.join(BASE_DIR, 'data', 'vocab_database.yaml')
AUDIO_DIR = os.path.join(BASE_DIR, 'data', 'audio')

# Ensure audio and temp directories exist
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(os.path.dirname(TEMP_VOCAB_PATH), exist_ok=True)

# Initialize AWS Polly client
polly_client = boto3.client('polly', region_name='us-east-1')

# List of favorite voices (all en-US, neural)
FAVORITE_VOICES = ['Joanna', 'Joey', 'Kendra', 'Matthew', 'Stephen']

def load_yaml(file_path):
    """Load YAML file and return its content."""
    print(f"Attempting to load: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return yaml.safe_load(file) or []
    except FileNotFoundError:
        print(f"Error: {file_path} does not exist. Please create it with valid YAML content.")
        return {
            'a': [], 'b': [], 'c': [], 'd': [], 'e': [], 'f': [], 'g': [], 'h': [], 'i': [], 'j': [],
            'k': [], 'l': [], 'm': [], 'n': [], 'o': [], 'p': [], 'q': [], 'r': [], 's': [], 't': [],
            'u': [], 'v': [], 'w': [], 'x': [], 'y': [], 'z': []
        } if file_path == VOCAB_DB_PATH else []
    except yaml.YAMLError as e:
        print(f"Error parsing YAML file {file_path}: {e}")
        return []

def save_yaml(data, file_path):
    """Save data to YAML file."""
    with open(file_path, 'w', encoding='utf-8') as file:
        yaml.safe_dump(data, file, allow_unicode=True, sort_keys=False)

def append_to_log(entries):
    """Append entries to temp_vocab_log.yaml, creating a blank file if it doesn't exist."""
    if not os.path.exists(TEMP_VOCAB_LOG_PATH):
        print(f"Creating blank {TEMP_VOCAB_LOG_PATH}")
        save_yaml([], TEMP_VOCAB_LOG_PATH)
    
    existing_log = load_yaml(TEMP_VOCAB_LOG_PATH)
    if not isinstance(existing_log, list):
        existing_log = []
    existing_log.extend(entries)
    save_yaml(existing_log, TEMP_VOCAB_LOG_PATH)
    print(f"Appended {len(entries)} entries to {TEMP_VOCAB_LOG_PATH}")

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
        return True
    except Exception as e:
        print(f"Error generating audio for {text} with voice {voice_id}: {e}")
        return False

def validate_entry(entry):
    """Validate vocabulary entry."""
    required_fields = ['word', 'part_of_speech', 'definition_th', 'example_en', 'example_th']
    return all(field in entry and isinstance(entry[field], str) and entry[field].strip() for field in required_fields)

def get_audio_filename(word, text, prefix, voice_id):
    """Generate unique audio filename based on word, prefix, voice_id, and MD5 hash."""
    safe_word = word.lower().replace(' ', '_')
    return f"{safe_word}_{prefix}+{voice_id}+{hashlib.md5(text.encode('utf-8')).hexdigest()}.mp3"

def check_duplicates(vocab_db):
    """Check for and remove duplicates in vocab_database.yaml, keeping the first occurrence."""
    duplicates = defaultdict(list)
    duplicate_count = 0

    # Collect duplicates
    for letter in vocab_db:
        seen_words = set()
        for entry in vocab_db[letter]:
            word_lower = entry['word'].lower()
            if word_lower in seen_words:
                duplicates[letter].append(entry)
            else:
                seen_words.add(word_lower)

    # Remove duplicates, keeping the first occurrence
    for letter in duplicates:
        for dup_entry in duplicates[letter]:
            vocab_db[letter] = [e for e in vocab_db[letter] if e['word'].lower() != dup_entry['word'].lower()] + \
                               [next(e for e in vocab_db[letter] if e['word'].lower() == dup_entry['word'].lower())]
            duplicate_count += 1

    if duplicate_count > 0:
        print(f"Removed {duplicate_count} duplicate entries from vocab_database.yaml")
        save_yaml(vocab_db, VOCAB_DB_PATH)
    
    return duplicate_count

def validate_audio_files(vocab_db):
    """Validate that all entries in vocab_database.yaml have corresponding audio files."""
    missing_audio = []
    for letter in vocab_db:
        for entry in vocab_db[letter]:
            word_audio_path = os.path.join(AUDIO_DIR, entry.get('word_audio_file', ''))
            sentence_audio_path = os.path.join(AUDIO_DIR, entry.get('sentence_audio_file', ''))
            if not os.path.exists(word_audio_path):
                missing_audio.append((entry['word'], 'word_audio_file', entry.get('word_audio_file', '')))
            if not os.path.exists(sentence_audio_path):
                missing_audio.append((entry['word'], 'sentence_audio_file', entry.get('sentence_audio_file', '')))
    
    return missing_audio

def generate_summary_report(vocab_db, valid_entries, invalid_entries, duplicate_count, missing_audio):
    """Generate a summary report of the processing results."""
    total_words = sum(len(vocab_db[letter]) for letter in vocab_db)
    new_words_by_letter = defaultdict(int)
    
    for entry in valid_entries:
        word_lower = entry['word'].lower()
        first_char = word_lower[0]
        new_words_by_letter[first_char] += 1

    print("\n=== Vocabulary Processing Summary Report ===")
    print(f"Total words in vocab_database.yaml: {total_words}")
    print(f"Newly added words: {len(valid_entries)}")
    if new_words_by_letter:
        print("New words by letter:")
        for letter, count in sorted(new_words_by_letter.items()):
            print(f"  {letter.upper()}: {count}")
    else:
        print("  No new words added.")
    print(f"Invalid entries: {len(invalid_entries)}")
    if invalid_entries:
        print("Invalid entries details:", invalid_entries)
    print(f"Duplicates removed: {duplicate_count}")
    print(f"Entries with missing audio files: {len(missing_audio)}")
    if missing_audio:
        print("Missing audio files:")
        for word, audio_type, file_name in missing_audio:
            print(f"  Word: {word}, Type: {audio_type}, File: {file_name}")
    print("====================================\n")

def process_entries(entries):
    """Process vocabulary entries and update database."""
    vocab_db = load_yaml(VOCAB_DB_PATH)
    
    # Check for duplicates before processing new entries
    duplicate_count = check_duplicates(vocab_db)
    
    valid_entries = []
    invalid_entries = []

    for entry in tqdm(entries, desc="Processing"):
        if not validate_entry(entry):
            invalid_entries.append(entry)
            continue

        word_lower = entry['word'].lower()
        # Skip entries that don't start with a letter
        if not word_lower or not word_lower[0].isalpha():
            print(f"Skipping entry '{entry['word']}' - does not start with a letter")
            invalid_entries.append(entry)
            continue

        # Randomly select a voice for this entry
        selected_voice = random.choice(FAVORITE_VOICES)

        # Create a new entry with audio fields and voice_id
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

        # Generate word audio (no pause)
        word_text = f"<speak>{new_entry['word']}</speak>"
        word_audio_filename = get_audio_filename(new_entry['word'], new_entry['word'], 'word', selected_voice)
        word_audio_path = os.path.join(AUDIO_DIR, word_audio_filename)

        # Generate sentence audio (word + sentence, no pauses)
        sentence_text = f"<speak>{new_entry['word']}. {new_entry['example_en']}</speak>"
        sentence_audio_filename = get_audio_filename(new_entry['word'], f"{new_entry['word']}. {new_entry['example_en']}", 'sentence', selected_voice)
        sentence_audio_path = os.path.join(AUDIO_DIR, sentence_audio_filename)

        # Check if entry exists in database and has the same voice
        first_char = word_lower[0]
        existing_entry = None
        if first_char in vocab_db and vocab_db[first_char]:
            existing_entry = next((e for e in vocab_db[first_char] if e['word'].lower() == word_lower), None)

        # Skip if audio files exist and voice matches
        if (existing_entry and
            existing_entry.get('voice_id') == selected_voice and
            os.path.exists(word_audio_path) and
            os.path.exists(sentence_audio_path)):
            new_entry['word_audio_file'] = word_audio_filename
            new_entry['sentence_audio_file'] = sentence_audio_filename
            valid_entries.append(new_entry)
            continue

        # Generate audio files
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
        # Remove existing entry if it exists
        vocab_db[first_char] = [e for e in vocab_db[first_char] if e['word'].lower() != word]
        vocab_db[first_char].append(entry)
        vocab_db[first_char] = sorted(vocab_db[first_char], key=lambda x: x['word'].lower())

    save_yaml(vocab_db, VOCAB_DB_PATH)
    
    # Validate audio files after updating the database
    missing_audio = validate_audio_files(vocab_db)
    
    # Generate summary report
    generate_summary_report(vocab_db, valid_entries, invalid_entries, duplicate_count, missing_audio)
    
    return valid_entries, invalid_entries

def main():
    """Main function to process temp_vocab.yaml and update vocab_database.yaml."""
    entries = load_yaml(TEMP_VOCAB_PATH)
    if not entries:
        print("No entries to process in temp_vocab.yaml")
        return

    # Append entries to log file before processing
    append_to_log(entries)

    valid_entries, invalid_entries = process_entries(entries)
    print(f"Processed {len(entries)} entries: {len(valid_entries)} valid, {len(invalid_entries)} invalid")
    
    # Clear temp_vocab.yaml if at least one valid entry
    if valid_entries:
        save_yaml([], TEMP_VOCAB_PATH)
        print("Batch processed successfully. temp_vocab.yaml cleared.")
    else:
        print("Batch processing failed. temp_vocab.yaml not cleared.")

if __name__ == "__main__":
    main()
