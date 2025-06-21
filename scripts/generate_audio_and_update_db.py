import yaml
import os
import hashlib
import boto3
import sys
from tqdm import tqdm

# AWS Polly client
polly_client = boto3.client('polly', region_name='us-east-1')

# Resolve absolute paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))  # D:\vocabswipe.github.io\scripts
REPO_ROOT = os.path.dirname(SCRIPT_DIR)  # D:\vocabswipe.github.io
TEMP_VOCAB_PATH = os.path.join(REPO_ROOT, 'data', 'temp', 'temp_vocab.yaml')
DATABASE_PATH = os.path.join(REPO_ROOT, 'data', 'vocab_database.yaml')
AUDIO_DIR = os.path.join(REPO_ROOT, 'data', 'audio')
BATCH_DIR = os.path.join(REPO_ROOT, 'data', 'temp', 'batches')

def load_yaml(file_path):
    print(f"Attempting to load: {file_path}")  # Debug path
    if not os.path.exists(file_path):
        print(f"Error: {file_path} does not exist. Please create it with valid YAML content.")
        return []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            return data if data is not None else []
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return []

def save_yaml(data, file_path):
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False)
    except Exception as e:
        print(f"Error saving {file_path}: {e}")

def generate_audio(text, output_path):
    try:
        response = polly_client.synthesize_speech(
            Text=text,
            OutputFormat='mp3',
            VoiceId='Matthew',  # Male American English voice
            Engine='standard'
        )
        with open(output_path, 'wb') as f:
            f.write(response['AudioStream'].read())
        return True
    except Exception as e:
        print(f"Error generating audio for {text}: {e}")
        return False

def get_word_directory(word):
    return word[0].lower() if word and word[0].isalpha() else 'other'

def validate_entry(entry):
    required_fields = ['word', 'part_of_speech', 'definition_th', 'example_en', 'example_th']
    return all(
        isinstance(entry.get(field), str) and entry.get(field).strip() not in [None, '']
        for field in required_fields
    ) and isinstance(entry.get('audio_file', ''), str)

def process_batch():
    # Load temp vocab
    temp_entries = load_yaml(TEMP_VOCAB_PATH)
    if not temp_entries:
        print("No entries found in temp_vocab.yaml. Exiting.")
        return False

    # Load existing database
    database = load_yaml(DATABASE_PATH)
    if not database:
        database = {letter: [] for letter in 'abcdefghijklmnopqrstuvwxyz'}
        database['other'] = []

    # Track existing words to avoid duplicates
    existing_words = set()
    for letter in database:
        for entry in database[letter]:
            existing_words.add(entry['word'].lower())

    valid_entries = []
    invalid_entries = []

    # Process entries with progress bar
    with tqdm(total=len(temp_entries), desc="Processing", leave=False, ncols=100) as pbar:
        for entry in temp_entries:
            if not validate_entry(entry):
                invalid_entries.append(entry)
                pbar.update(1)
                continue

            word = entry['word'].strip()
            if word.lower() in existing_words:
                print(f"Duplicate word skipped: {word}")
                pbar.update(1)
                continue

            # Generate audio file
            content = f"{word}. {entry['part_of_speech']}. {entry['example_en']}."
            hash_input = content.encode('utf-8')
            audio_hash = hashlib.md5(hash_input).hexdigest()
            audio_filename = f"word_{audio_hash}.mp3"
            audio_path = os.path.join(AUDIO_DIR, audio_filename)

            if not os.path.exists(audio_path):
                if not generate_audio(content, audio_path):
                    invalid_entries.append(entry)
                    pbar.update(1)
                    continue

            entry['audio_file'] = audio_filename
            valid_entries.append(entry)
            existing_words.add(word.lower())
            pbar.update(1)

    # Append valid entries to database
    for entry in valid_entries:
        directory = get_word_directory(entry['word'])
        database[directory].append(entry)

    # Save updated database
    save_yaml(database, DATABASE_PATH)

    # Log results
    print(f"Processed {len(temp_entries)} entries: {len(valid_entries)} valid, {len(invalid_entries)} invalid")
    if invalid_entries:
        print("Invalid entries:", invalid_entries)

    # Clear temp_vocab.yaml only if successful
    if valid_entries:
        save_yaml([], TEMP_VOCAB_PATH)
        return True
    return False

def main():
    # Ensure directories exist
    os.makedirs(AUDIO_DIR, exist_ok=True)
    os.makedirs(BATCH_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(TEMP_VOCAB_PATH), exist_ok=True)

    success = process_batch()
    if success:
        print("Batch processed successfully. temp_vocab.yaml cleared.")
    else:
        print("Batch processing failed. temp_vocab.yaml not cleared.")

if __name__ == "__main__":
    main()
