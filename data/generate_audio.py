import json
import hashlib
from pathlib import Path
import logging
from tqdm import tqdm
import boto3
from botocore.exceptions import ClientError
import time

# Configure logging (save to file and console)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('audio_generation.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

# Configuration
DATABASE_PATH = "database.jsonl"  # Relative path since script is in data/ directory
AUDIO_DIR = "audio"  # Relative path for audio subdirectory
OUTPUT_FORMAT = "mp3"
SAMPLE_RATE = "22050"
ENGLISH_VOICE_ID = "Matthew"
THAI_VOICE_ID = "Kanya"  # Added for Thai audio support
ENGINE = "neural"
MAX_RETRIES = 3  # Number of retries for AWS Polly failures
RETRY_DELAY = 2  # Seconds to wait between retries
AWS_PROFILES = ["default", "new-account", "third-account"]  # Available AWS profiles
DEFAULT_AWS_PROFILE = "third-account"  # Default to third-account
AWS_REGION = "ap-southeast-1"  # Explicit region for Thailand

def get_sentence_hash(sentence):
    """Generate an MD5 hash of the sentence (lowercase) for unique file naming."""
    return hashlib.md5(sentence.lower().encode('utf-8')).hexdigest()

def ensure_audio_directory():
    """Create the audio directory if it doesn't exist."""
    try:
        Path(AUDIO_DIR).mkdir(parents=True, exist_ok=True)
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
                    if not entry['english'].strip() and not entry['thai'].strip():
                        logging.warning(f"Skipping entry with empty English and Thai sentences: {entry}")
                        continue
                    entries.append(entry)
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
    except Exception as e:
        logging.error(f"Failed to write to {DATABASE_PATH}: {e}")
        raise

def generate_audio(sentence, audio_path, aws_profile, voice_id, language="english"):
    """Generate audio for the given sentence using AWS Polly and save to audio_path."""
    session = boto3.Session(profile_name=aws_profile, region_name=AWS_REGION)
    polly_client = session.client('polly')
    for attempt in range(MAX_RETRIES):
        try:
            response = polly_client.synthesize_speech(
                Text=sentence,
                OutputFormat=OUTPUT_FORMAT,
                SampleRate=SAMPLE_RATE,
                VoiceId=voice_id,
                Engine=ENGINE
            )
            with open(audio_path, 'wb') as f:
                f.write(response['AudioStream'].read())
            logging.info(f"Generated audio for {language} sentence: {sentence}")
            return True
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logging.error(f"Attempt {attempt + 1}/{MAX_RETRIES} failed for '{sentence}' with profile '{aws_profile}': {error_code} - {e}")
            if error_code == 'ServiceQuotaExceeded':
                logging.error("AWS Polly quota exceeded. Please check your service limits in the AWS Console.")
                raise
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            else:
                raise
        except Exception as e:
            logging.error(f"Unexpected error generating audio for '{sentence}' with profile '{aws_profile}': {e}")
            raise
    return False

def clean_orphaned_audio(entries):
    """Delete audio files not referenced by any entry."""
    used_hashes = set()
    for entry in entries:
        if entry.get('english'):
            used_hashes.add(get_sentence_hash(entry['english']))
        if entry.get('thai'):
            used_hashes.add(get_sentence_hash(entry['thai']))
    audio_files = list(Path(AUDIO_DIR).glob(f"*.{OUTPUT_FORMAT}"))
    deleted_count = 0
    for audio_file in audio_files:
        file_hash = audio_file.stem
        if file_hash not in used_hashes:
            try:
                audio_file.unlink()
                deleted_count += 1
                logging.info(f"Deleted orphaned audio file: {audio_file}")
            except Exception as e:
                logging.error(f"Failed to delete orphaned audio {audio_file}: {e}")
    return deleted_count

def verify_audio_files(entries):
    """Verify that all valid entries have corresponding audio files."""
    missing_audio = []
    for entry in entries:
        for lang, field in [('english', 'audio_english'), ('thai', 'audio_thai')]:
            sentence = entry.get(lang, '')
            if not sentence:
                continue
            audio_path = entry.get(field, '')
            if not audio_path or not Path(audio_path).exists():
                missing_audio.append((entry['word'], sentence, audio_path, lang))
    return missing_audio

def get_aws_profile():
    """Prompt user to select an AWS profile with default option."""
    print("Available AWS accounts (profiles):")
    for i, profile in enumerate(AWS_PROFILES, 1):
        print(f"{i}. {profile}")
    print(f"Press Enter to use default profile ({DEFAULT_AWS_PROFILE}) or enter a number (1-{len(AWS_PROFILES)}).")
    while True:
        choice = input(f"Select AWS profile [Enter for default]: ").strip()
        if not choice:
            return DEFAULT_AWS_PROFILE
        try:
            choice = int(choice)
            if 1 <= choice <= len(AWS_PROFILES):
                return AWS_PROFILES[choice - 1]
            else:
                print(f"Please enter a number between 1 and {len(AWS_PROFILES)} or press Enter.")
        except ValueError:
            print("Invalid input. Please enter a number or press Enter.")

def main():
    """Main function to generate audio files, update database, and verify audio."""
    # Prompt user for AWS profile
    aws_profile = get_aws_profile()
    print(f"Using AWS profile: {aws_profile}")

    # Ensure audio directory exists
    ensure_audio_directory()

    # Read database
    entries = read_database()
    if not entries:
        print("No valid entries found in database.jsonl")
        return

    # Cache existing audio files
    audio_files = {f.stem: f for f in Path(AUDIO_DIR).glob(f"*.{OUTPUT_FORMAT}")}

    # Count entries needing audio generation
    need_audio_count = sum(1 for entry in entries 
                          if (entry.get('english') and (not entry.get('audio_english') or not Path(entry.get('audio_english', '')).exists())) or 
                             (entry.get('thai') and (not entry.get('audio_thai') or not Path(entry.get('audio_thai', '')).exists())))
    print(f"Total entries needing audio generation: {need_audio_count}")

    # Track counters for summary
    updated_entries = []
    generated_count = 0
    reused_count = 0
    skipped_count = 0

    # Process entries with progress bar for all entries
    with tqdm(total=len(entries), desc="Processing entries", unit="entry", 
              bar_format="{l_bar}{bar:20} {percentage:3.0f}% | {n_fmt}/{total_fmt} [{elapsed}<{remaining}]") as pbar:
        for entry in entries:
            updated_entry = entry.copy()
            sentence_english = entry.get('english', '')
            sentence_thai = entry.get('thai', '')
            needs_processing = False

            # Process English audio
            if sentence_english:
                sentence_hash = get_sentence_hash(sentence_english)
                audio_filename = f"{sentence_hash}.{OUTPUT_FORMAT}"
                audio_path = Path(AUDIO_DIR) / audio_filename
                repo_audio_path = f"{AUDIO_DIR}/{audio_filename}"
                current_audio_path = entry.get('audio_english', '')
                needs_audio = not current_audio_path or not Path(current_audio_path).exists()

                if needs_audio:
                    if sentence_hash in audio_files:
                        updated_entry['audio_english'] = repo_audio_path
                        reused_count += 1
                    else:
                        generate_audio(sentence_english, audio_path, aws_profile, ENGLISH_VOICE_ID, language="english")
                        updated_entry['audio_english'] = repo_audio_path
                        generated_count += 1
                        needs_processing = True
                else:
                    updated_entry['audio_english'] = current_audio_path
                    reused_count += 1
            else:
                skipped_count += 1

            # Process Thai audio
            if sentence_thai:
                sentence_hash = get_sentence_hash(sentence_thai)
                audio_filename = f"{sentence_hash}.{OUTPUT_FORMAT}"
                audio_path = Path(AUDIO_DIR) / audio_filename
                repo_audio_path = f"{AUDIO_DIR}/{audio_filename}"
                current_audio_path = entry.get('audio_thai', '')
                needs_audio = not current_audio_path or not Path(current_audio_path).exists()

                if needs_audio:
                    if sentence_hash in audio_files:
                        updated_entry['audio_thai'] = repo_audio_path
                        reused_count += 1
                    else:
                        generate_audio(sentence_thai, audio_path, aws_profile, THAI_VOICE_ID, language="thai")
                        updated_entry['audio_thai'] = repo_audio_path
                        generated_count += 1
                        needs_processing = True
                else:
                    updated_entry['audio_thai'] = current_audio_path
                    reused_count += 1
            else:
                skipped_count += 1

            updated_entries.append(updated_entry)
            pbar.update(1)  # Update progress bar for each entry

    # Write updated database
    write_database(updated_entries)

    # Clean orphaned audio files
    deleted_count = clean_orphaned_audio(updated_entries)

    # Verify all entries have audio files
    missing_audio = verify_audio_files(updated_entries)
    if missing_audio:
        print(f"\nError: Missing audio files for {len(missing_audio)} entries:")
        for word, sentence, audio_path, lang in missing_audio:
            print(f" - Word: {word}, {lang.capitalize()} Sentence: {sentence}, Audio: {audio_path or 'None'}")
    else:
        print("\nAll valid entries have corresponding audio files.")

    # Print summary report
    print("\n=== Summary Report ===")
    print(f"Total entries processed: {len(entries)}")
    print(f"Audio files generated: {generated_count}")
    print(f"Existing audio files reused: {reused_count}")
    print(f"Entries skipped (empty English or Thai): {skipped_count}")
    print(f"Orphaned audio files deleted: {deleted_count}")
    print(f"Missing audio files: {len(missing_audio)}")
    print("Audio generation complete. Please use GitHub Desktop to push changes to the repository.")

if __name__ == "__main__":
    main()
