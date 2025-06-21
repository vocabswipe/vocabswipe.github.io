import yaml
import os
import hashlib
import boto3
import sys
from tqdm import tqdm
from pathlib import Path

# AWS Polly client (replace with your credentials)
polly_client = boto3.client('polly', region_name='us-east-1')

# Directories
TEMP_VOCAB_PATH = 'data/temp/temp_vocab.yaml'
DATABASE_PATH = 'data/vocab_database.yaml'
AUDIO_DIR = 'data/audio'
BATCH_DIR = 'data/temp/batches'

def load_yaml(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f) or []
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
            Engine='neural'     # Neural TTS for improved quality
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
    required_fields = ['word', 'part_of_speech', 'definition_th', 'example_en', 'example_th', 'audio_file']
    return all(
        isinstance(entry.get(field), str) and entry.get(field) not in [None, '']
        for field in required_fields if field != 'audio_file'
    ) and isinstance(entry.get('audio_file'), str)

def process_batch():
    # Load temp vocab
    temp_entries = load_yaml(TEMP_VOCAB_PATH)
    if not temp_entries:
        print("No entries found in temp_vocab.yaml")
        return

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
            content = f"{word}. {entry['part_of_speech']}. {entry['definition_th']}. {entry['example_en']}."
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

    # Clear temp_vocab.yaml
    save_yaml([], TEMP_VOCAB_PATH)

def main():
    # Ensure directories exist
    os.makedirs(AUDIO_DIR, exist_ok=True)
    os.makedirs(BATCH_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(TEMP_VOCAB_PATH), exist_ok=True)

    process_batch()

if __name__ == "__main__":
    main()
