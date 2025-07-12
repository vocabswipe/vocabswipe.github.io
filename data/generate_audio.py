import json
import hashlib
import os
import boto3
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configuration
DATABASE_PATH = "database.jsonl"  # Relative path since script is in data/ directory
AUDIO_DIR = "audio"  # Relative path for audio subdirectory
OUTPUT_FORMAT = "mp3"
SAMPLE_RATE = "22050"
VOICE_ID = "Matthew"
ENGINE = "neural"
REPO_BASE_URL = "https://raw.githubusercontent.com/<username>/<repo>/main/"  # TODO: Replace <username>/<repo> with your GitHub username and repository name

def get_sentence_hash(sentence):
    """Generate an MD5 hash of the sentence (lowercase) for unique file naming."""
    return hashlib.md5(sentence.lower().encode('utf-8')).hexdigest()

def ensure_audio_directory():
    """Create the audio directory if it doesn't exist."""
    try:
        Path(AUDIO_DIR).mkdir(parents=True, exist_ok=True)
        logging.info(f"Audio directory ensured: {AUDIO_DIR}")
    except Exception as e:
        logging.error(f"Failed to create audio directory {AUDIO_DIR}: {e}")
        raise

def read_database():
    """Read the database.jsonl file and return entries."""
    entries = []
    try:
        with open(DATABASE_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    entries.append(json.loads(line))
        logging.info(f"Read {len(entries)} entries from {DATABASE_PATH}")
    except FileNotFoundError:
        logging.error(f"Database file not found: {DATABASE_PATH}")
        raise
    except json.JSONDecodeError as e:
        logging.error(f"Invalid JSON in {DATABASE_PATH}: {e}")
        raise
    return entries

def write_database(entries):
    """Write updated entries back to database.jsonl."""
    try:
        with open(DATABASE_PATH, 'w', encoding='utf-8') as f:
            for entry in entries:
                f.write(json.dumps(entry, ensure_ascii=False) + '\n')
        logging.info(f"Updated {DATABASE_PATH} with {len(entries)} entries")
    except Exception as e:
        logging.error(f"Failed to write to {DATABASE_PATH}: {e}")
        raise

def generate_audio(sentence, audio_path):
    """Generate audio for the given sentence using AWS Polly and save to audio_path."""
    polly_client = boto3.client('polly')
    try:
        response = polly_client.synthesize_speech(
            Text=sentence,
            OutputFormat=OUTPUT_FORMAT,
            SampleRate=SAMPLE_RATE,
            VoiceId=VOICE_ID,
            Engine=ENGINE
        )
        with open(audio_path, 'wb') as f:
            f.write(response['AudioStream'].read())
        logging.info(f"Generated audio: {audio_path}")
    except Exception as e:
        logging.error(f"Error generating audio for '{sentence}': {e}")
        raise

def clean_orphaned_audio(entries):
    """Delete audio files not referenced by any entry."""
    used_hashes = {get_sentence_hash(entry['english']) for entry in entries}
    audio_files = Path(AUDIO_DIR).glob(f"*.{OUTPUT_FORMAT}")
    for audio_file in audio_files:
        file_hash = audio_file.stem
        if file_hash not in used_hashes:
            try:
                audio_file.unlink()
                logging.info(f"Deleted orphaned audio: {audio_file}")
            except Exception as e:
                logging.error(f"Failed to delete orphaned audio {audio_file}: {e}")

def main():
    """Main function to generate audio files and update database."""
    # Ensure audio directory exists
    ensure_audio_directory()

    # Read database
    entries = read_database()
    if not entries:
        logging.warning("No entries found in database.jsonl")
        return

    # Track processed sentences to avoid duplicates
    processed_sentences = set()
    updated_entries = []

    # Process entries
    for entry in entries:
        sentence = entry.get('english', '')
        if not sentence:
            logging.warning(f"Skipping entry with missing English sentence: {entry}")
            updated_entries.append(entry)
            continue

        if sentence in processed_sentences:
            logging.info(f"Skipping duplicate sentence: {sentence}")
            updated_entries.append(entry)
            continue

        sentence_hash = get_sentence_hash(sentence)
        audio_filename = f"{sentence_hash}.{OUTPUT_FORMAT}"
        audio_path = os.path.join(AUDIO_DIR, audio_filename)
        repo_audio_path = f"{AUDIO_DIR}/{audio_filename}"

        # Check if audio file exists locally
        if not os.path.exists(audio_path):
            logging.info(f"Generating audio for: {sentence}")
            generate_audio(sentence, audio_path)

        # Update entry with audio path
        entry['audio'] = repo_audio_path
        updated_entries.append(entry)
        processed_sentences.add(sentence)

    # Write updated database
    write_database(updated_entries)

    # Clean orphaned audio files
    clean_orphaned_audio(updated_entries)

    logging.info("Audio generation complete. Please use GitHub Desktop to push changes to the repository.")

if __name__ == "__main__":
    main()
