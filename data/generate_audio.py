import json
import hashlib
import os
from pathlib import Path
import logging
from tqdm import tqdm
import boto3
from botocore.exceptions import ClientError
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configuration
DATABASE_PATH = "database.jsonl"  # Relative path since script is in data/ directory
AUDIO_DIR = "audio"  # Relative path for audio subdirectory
OUTPUT_FORMAT = "mp3"
SAMPLE_RATE = "22050"
VOICE_ID = "Matthew"
ENGINE = "neural"
MAX_RETRIES = 3  # Number of retries for AWS Polly failures
RETRY_DELAY = 2  # Seconds to wait between retries

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
                    entry = json.loads(line)
                    # Validate required fields
                    if not all(key in entry for key in ['word', 'english', 'thai']):
                        logging.warning(f"Skipping invalid entry (missing required fields): {line.strip()}")
                        continue
                    entries.append(entry)
        logging.info(f"Read {len(entries)} valid entries from {DATABASE_PATH}")
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
    for attempt in range(MAX_RETRIES):
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
            return True
        except ClientError as e:
            logging.error(f"Attempt {attempt + 1}/{MAX_RETRIES} failed for '{sentence}': {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            else:
                raise
        except Exception as e:
            logging.error(f"Error generating audio for '{sentence}': {e}")
            raise
    return False

def clean_orphaned_audio(entries):
    """Delete audio files not referenced by any entry."""
    used_hashes = {get_sentence_hash(entry['english']) for entry in entries if entry.get('english')}
    audio_files = list(Path(AUDIO_DIR).glob(f"*.{OUTPUT_FORMAT}"))
    deleted_count = 0
    for audio_file in audio_files:
        file_hash = audio_file.stem
        if file_hash not in used_hashes:
            try:
                audio_file.unlink()
                logging.info(f"Deleted orphaned audio: {audio_file}")
                deleted_count += 1
            except Exception as e:
                logging.error(f"Failed to delete orphaned audio {audio_file}: {e}")
    return deleted_count

def verify_audio_files(entries):
    """Verify that all non-empty English sentences have corresponding audio files."""
    missing_audio = []
    for entry in entries:
        sentence = entry.get('english', '')
        if not sentence:
            continue
        audio_path = entry.get('audio', '')
        # Check if audio path is valid and file exists
        if not audio_path or not Path(audio_path).exists():
            missing_audio.append(sentence)
    return missing_audio

def main():
    """Main function to generate audio files, update database, and verify audio."""
    # Ensure audio directory exists
    ensure_audio_directory()

    # Read database
    entries = read_database()
    if not entries:
        logging.warning("No valid entries found in database.jsonl")
        return

    # Cache existing audio files
    audio_files = {f.stem: f for f in Path(AUDIO_DIR).glob(f"*.{OUTPUT_FORMAT}")}
    logging.info(f"Found {len(audio_files)} existing audio files in {AUDIO_DIR}")

    # Track processed sentences and counters for summary
    processed_sentences = set()
    updated_entries = []
    generated_count = 0
    reused_count = 0
    skipped_count = 0

    # Process entries with progress bar
    for entry in tqdm(entries, desc="Processing entries", unit="entry"):
        sentence = entry.get('english', '')
        if not sentence:
            logging.warning(f"Skipping entry with missing English sentence: {entry}")
            updated_entries.append(entry)
            skipped_count += 1
            continue

        if sentence in processed_sentences:
            logging.info(f"Skipping duplicate sentence: {sentence}")
            updated_entries.append(entry)
            skipped_count += 1
            continue

        sentence_hash = get_sentence_hash(sentence)
        audio_filename = f"{sentence_hash}.{OUTPUT_FORMAT}"
        audio_path = Path(AUDIO_DIR) / audio_filename
        repo_audio_path = f"{AUDIO_DIR}/{audio_filename}"

        # Check if audio file exists in directory
        if sentence_hash in audio_files:
            logging.info(f"Using existing audio: {audio_path}")
            entry['audio'] = repo_audio_path
            reused_count += 1
        else:
            logging.info(f"Generating audio for: {sentence}")
            generate_audio(sentence, audio_path)
            entry['audio'] = repo_audio_path
            generated_count += 1

        updated_entries.append(entry)
        processed_sentences.add(sentence)

    # Write updated database
    write_database(updated_entries)

    # Clean orphaned audio files
    deleted_count = clean_orphaned_audio(updated_entries)

    # Verify all sentences have audio files
    missing_audio = verify_audio_files(updated_entries)
    if missing_audio:
        logging.error(f"Missing audio files for {len(missing_audio)} sentences:")
        for sentence in missing_audio:
            logging.error(f" - {sentence}")
    else:
        logging.info("All sentences have corresponding audio files.")

    # Print summary report
    logging.info("\n=== Summary Report ===")
    logging.info(f"Total entries processed: {len(entries)}")
    logging.info(f"Audio files generated: {generated_count}")
    logging.info(f"Existing audio files reused: {reused_count}")
    logging.info(f"Entries skipped (duplicates or empty): {skipped_count}")
    logging.info(f"Orphaned audio files deleted: {deleted_count}")
    logging.info(f"Missing audio files: {len(missing_audio)}")
    logging.info("Audio generation complete. Please use GitHub Desktop to push changes to the repository.")

if __name__ == "__main__":
    main()
