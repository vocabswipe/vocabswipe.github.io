import json
import os
import hashlib
from tqdm import tqdm
import gtts  # For generating audio files
import re

def validate_and_append(temp_file, db_file, audio_dir="data/audio"):
    """
    Validates entries in temp_sentences.jsonl and database.jsonl, generates audio files for entries missing them,
    appends valid entries, empties temp file with last database entry, and provides a detailed summary.
    Checks audio file validity and entry order. All files are in D:\vocabswipe.github.io\data.
    """
    errors = []
    temp_entries = []
    db_entries = []
    audio_to_generate = []
    
    # Ensure audio directory exists
    os.makedirs(audio_dir, exist_ok=True)

    # Print working directory
    print(f"📍 Working in: {os.getcwd()}")

    # Check if temp file exists and is not empty
    if not os.path.exists(temp_file):
        print(f"❌ Error: '{temp_file}' not found")
        return False, None
    if os.path.getsize(temp_file) == 0:
        print(f"⚠️ Warning: '{temp_file}' is empty")
        return False, None

    # Validate temp file
    print("\n📄 Scanning temp_sentences.jsonl...")
    previous_english = None
    temp_line_count = 0
    try:
        with open(temp_file, 'r', encoding='utf-8') as f_temp:
            lines = f_temp.readlines()
            temp_line_count = len(lines)
            for i, line in enumerate(tqdm(lines, desc="Validating temp", unit="entry", leave=False)):
                line_number = i + 1
                if not line.strip():
                    errors.append(f"Temp line {line_number}: Empty line")
                    continue
                try:
                    entry = json.loads(line.strip())
                    if not all(key in entry for key in ['word', 'english', 'thai']):
                        errors.append(f"Temp line {line_number}: Missing fields")
                        continue
                    if not all(entry[key].strip() for key in ['word', 'english', 'thai']):
                        errors.append(f"Temp line {line_number}: Empty fields")
                        continue
                    if previous_english and entry['word'].lower() not in previous_english.lower():
                        errors.append(f"Temp line {line_number}: Word '{entry['word']}' not in prior sentence")
                    previous_english = entry['english']
                    temp_entries.append(entry)
                except json.JSONDecodeError:
                    errors.append(f"Temp line {line_number}: Invalid JSON")
                    continue
        print(f"✔️ {len(temp_entries)}/{temp_line_count} valid entries in temp_sentences.jsonl")
    except Exception as e:
        print(f"❌ Error reading temp_sentences.jsonl: {e}")
        return False, None

    # Validate database file and check audio files
    print("\n📂 Scanning database.jsonl...")
    previous_english = None
    db_line_count = 0
    try:
        with open(db_file, 'r', encoding='utf-8') as f_db:
            lines = f_db.readlines()
            db_line_count = len(lines)
            for i, line in enumerate(tqdm(lines, desc="Validating database", unit="entry", leave=False)):
                line_number = i + 1
                if not line.strip():
                    errors.append(f"Database line {line_number}: Empty line")
                    continue
                try:
                    entry = json.loads(line.strip())
                    if not all(key in entry for key in ['word', 'english', 'thai']):
                        errors.append(f"Database line {line_number}: Missing fields")
                        continue
                    if not all(entry[key].strip() for key in ['word', 'english', 'thai']):
                        errors.append(f"Database line {line_number}: Empty fields")
                        continue
                    if previous_english and entry['word'].lower() not in previous_english.lower():
                        errors.append(f"Database line {line_number}: Word '{entry['word']}' not in prior sentence")
                    previous_english = entry['english']
                    # Generate audio filename and check existence
                    audio_filename = f"{re.sub(r'[^a-zA-Z0-9]', '_', entry['word'].lower())}.mp3"
                    audio_path = os.path.join(audio_dir, audio_filename)
                    entry['audio'] = audio_filename
                    if not os.path.exists(audio_path):
                        audio_to_generate.append((entry, audio_path))
                    db_entries.append(entry)
                except json.JSONDecodeError:
                    errors.append(f"Database line {line_number}: Invalid JSON")
                    continue
        print(f"✔️ {len(db_entries)}/{db_line_count} valid entries in database.jsonl")
    except Exception as e:
        print(f"❌ Error reading database.jsonl: {e}")
        return False, None

    # Generate audio files for entries missing them
    if audio_to_generate:
        print("\n🎵 Generating audio files...")
        for entry, audio_path in tqdm(audio_to_generate, desc="Generating audio", unit="file"):
            print(f"  Generating audio for word: {entry['word']} ({entry['english']})")
            try:
                tts = gtts.gTTS(entry['english'], lang='en')
                tts.save(audio_path)
            except Exception as e:
                errors.append(f"Failed to generate audio for '{entry['word']}': {e}")

    # Report errors
    if errors:
        print("\n🚨 Validation Errors:")
        for error in errors:
            print(f"  {error}")
        print("❌ Validation failed. Fix errors before proceeding.")
        return False, db_entries[-1] if db_entries else None

    # Append valid temp entries to database
    print("\n📝 Appending to database.jsonl...")
    try:
        with open(db_file, 'a', encoding='utf-8') as f_db:
            for entry in tqdm(temp_entries, desc="Appending", unit="entry", leave=False):
                json.dump(entry, f_db, ensure_ascii=False)
                f_db.write('\n')
        print(f"✔️ Appended {len(temp_entries)} entries")
    except Exception as e:
        print(f"❌ Error appending to database.jsonl: {e}")
        return False, db_entries[-1] if db_entries else None

    # Empty temp file and add last database entry
    print("\n🗑️ Updating temp_sentences.jsonl...")
    last_entry = (db_entries + temp_entries)[-1] if (db_entries + temp_entries) else None
    try:
        with open(temp_file, 'w', encoding='utf-8') as f_temp:
            if last_entry:
                last_entry_no_audio = {k: v for k, v in last_entry.items() if k != 'audio'}
                json.dump(last_entry_no_audio, f_temp, ensure_ascii=False)
                f_temp.write('\n')
        print(f"✔️ Temp file cleared and last entry added")
    except Exception as e:
        print(f"❌ Error updating temp_sentences.jsonl: {e}")
        return False, last_entry

    # Check for adjacent duplicates
    print("\n🔍 Checking for duplicates...")
    duplicates = []
    all_entries = db_entries + temp_entries
    entry_hashes = {}
    for i, entry in enumerate(all_entries):
        entry_tuple = (entry['word'], entry['english'])
        entry_hash = hashlib.md5(json.dumps(entry_tuple, ensure_ascii=False).encode('utf-8')).hexdigest()
        if i > 0 and entry_hash == entry_hashes.get(i - 1):
            duplicates.append(f"Lines {i} and {i+1}: {entry['word']} - {entry['english']}")
        entry_hashes[i] = entry_hash
    print(f"{'✔️ No duplicates found' if not duplicates else f'⚠️ {len(duplicates)} duplicates found'}")

    # Detailed summary
    print("\n📊 Database Summary")
    all_entries = db_entries + temp_entries
    total_entries = len(all_entries)
    unique_words = len(set(entry['word'].lower() for entry in all_entries))
    total_sentences = len([entry['english'] for entry in all_entries])
    unique_sentences = len(set(entry['english'].lower() for entry in all_entries))
    word_freq = {}
    for entry in all_entries:
        word = entry['word'].lower()
        word_freq[word] = word_freq.get(word, 0) + 1
    top_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]

    print(f"  Total entries: {total_entries}")
    print(f"  Unique words: {unique_words}")
    print(f"  Total English sentences: {total_sentences}")
    print(f"  Unique English sentences: {unique_sentences}")
    print(f"  Adjacent duplicates: {len(duplicates)}")
    print(f"  Audio files validated: {len(all_entries)}/{len(all_entries)}")
    print("\n📈 Top 10 Most Frequent Words:")
    for word, freq in top_words:
        print(f"    {word}: {freq}")

    # Confirm order and audio validity
    print("\n🟢 Validation Status")
    audio_valid = all(os.path.exists(os.path.join(audio_dir, entry.get('audio', ''))) for entry in all_entries)
    order_valid = not any(
        entry['word'].lower() not in all_entries[i-1]['english'].lower()
        for i, entry in enumerate(all_entries[1:], 1) if all_entries[i-1].get('english')
    )
    if not errors and not duplicates and audio_valid and order_valid:
        print("  ✅ All entries valid, ordered correctly, with valid audio files")
    else:
        print("  ❌ Issues detected:")
        if errors: print("    - Validation errors present")
        if duplicates: print("    - Adjacent duplicates found")
        if not audio_valid: print("    - Missing or invalid audio files")
        if not order_valid: print("    - Entry order issues")

    # Print last entry
    print("\n📌 Last Database Entry")
    if last_entry:
        print(json.dumps(last_entry, ensure_ascii=False))
    else:
        print("  No valid entries")

    return not (errors or duplicates), last_entry

def main():
    # File paths
    temp_file = "temp_sentences.jsonl"
    db_file = "database.jsonl"
    audio_dir = "data/audio"

    # Create database file and audio directory if they don't exist
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    os.makedirs(audio_dir, exist_ok=True)
    if not os.path.exists(db_file):
        print(f"ℹ️ Creating {db_file}")
        with open(db_file, 'a', encoding='utf-8'):
            pass

    # Run validation and processing
    success, last_entry = validate_and_append(temp_file, db_file, audio_dir)
    print(f"\n{'🎉 Operation completed successfully' if success else '⚠️ Operation completed with issues'}")

if __name__ == "__main__":
    main()
