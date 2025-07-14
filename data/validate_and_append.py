import json
import os
import hashlib
from tqdm import tqdm
from collections import Counter
import re

def generate_audio(word, audio_dir):
    """
    Placeholder function to generate audio for a word.
    Replace with actual audio generation logic (e.g., using a TTS library).
    Saves audio as <word>.mp3 in the specified audio_dir.
    Returns True if successful, False otherwise.
    """
    try:
        # Placeholder: Simulate audio generation
        audio_file = os.path.join(audio_dir, f"{word}.mp3")
        with open(audio_file, 'w') as f:
            f.write(f"Simulated audio for {word}")
        return True
    except Exception as e:
        print(f"❌ Error generating audio for '{word}': {e}")
        return False

def validate_and_append(temp_file, db_file, audio_dir="data/audio"):
    """
    Validates entries in temp_sentences.jsonl and database.jsonl, appends valid entries,
    generates audio for entries missing audio files, and reports key changes.
    Validates audio file names and existence, entry order, and provides a detailed summary.
    Prints minimal, important information to the console.
    """
    errors = []
    temp_entries = []
    db_entries = []
    error_context = []  # Store (error_msg, db_entry_index, line_number) for word-in-sentence errors
    audio_files_to_generate = []
    audio_dir = os.path.abspath(audio_dir)

    # Ensure audio directory exists
    os.makedirs(audio_dir, exist_ok=True)

    # Print current working directory
    print(f"📍 Starting validation in: {os.getcwd()}")

    # Check if temp file exists and is not empty
    if not os.path.exists(temp_file):
        print(f"❌ Error: '{temp_file}' not found")
        return False, None
    if os.path.getsize(temp_file) == 0:
        print(f"⚠️ Warning: '{temp_file}' is empty")
        return False, None

    # Validate temp file
    print("\n📄 Validating temp_sentences.jsonl")
    previous_english = None
    temp_line_count = 0
    temp_entries_with_lines = []
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
                        errors.append(f"Temp line {line_number}: Missing fields (word, english, thai)")
                        continue
                    if not all(entry[key].strip() for key in ['word', 'english', 'thai']):
                        errors.append(f"Temp line {line_number}: Empty fields")
                        continue
                    # Validate audio file name format
                    audio_filename = f"{entry['word']}.mp3"
                    if not re.match(r'^[\w\-]+\.mp3$', audio_filename):
                        errors.append(f"Temp line {line_number}: Invalid audio filename format for '{entry['word']}'")
                        continue
                    # Check if word is in prior sentence's english field
                    if previous_english and entry['word'].lower() not in previous_english.lower():
                        errors.append(
                            f"Temp line {line_number}: Word '{entry['word']}' not in prior sentence: '{previous_english}'"
                        )
                    previous_english = entry['english']
                    temp_entries.append(entry)
                    temp_entries_with_lines.append((entry, line_number))
                    # Check for missing audio file
                    audio_path = os.path.join(audio_dir, audio_filename)
                    if not os.path.exists(audio_path):
                        audio_files_to_generate.append((entry, line_number))
                except json.JSONDecodeError:
                    errors.append(f"Temp line {line_number}: Invalid JSON")
                    continue
        print(f"  Found {temp_line_count} lines, {len(temp_entries)} valid entries")
    except Exception as e:
        print(f"❌ Error reading temp_sentences.jsonl: {e}")
        return False, None

    # Validate database file
    print("\n📂 Validating database.jsonl")
    previous_english = None
    db_line_count = 0
    db_entries_with_lines = []
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
                        errors.append(f"Database line {line_number}: Missing fields (word, english, thai)")
                        continue
                    if not all(entry[key].strip() for key in ['word', 'english', 'thai']):
                        errors.append(f"Database line {line_number}: Empty fields")
                        continue
                    # Validate audio file name format and existence
                    audio_filename = f"{entry['word']}.mp3"
                    if not re.match(r'^[\w\-]+\.mp3$', audio_filename):
                        errors.append(f"Database line {line_number}: Invalid audio filename format for '{entry['word']}'")
                        continue
                    audio_path = os.path.join(audio_dir, audio_filename)
                    if not os.path.exists(audio_path):
                        errors.append(f"Database line {line_number}: Missing audio file '{audio_filename}'")
                        continue
                    # Check if word is in prior sentence's english field
                    if previous_english and entry['word'].lower() not in previous_english.lower():
                        error_msg = (
                            f"Database line {line_number}: Word '{entry['word']}' not in prior sentence: '{previous_english}'"
                        )
                        error_context.append((error_msg, len(db_entries), line_number))
                    previous_english = entry['english']
                    db_entries.append(entry)
                    db_entries_with_lines.append((entry, line_number))
                except json.JSONDecodeError:
                    errors.append(f"Database line {line_number}: Invalid JSON")
                    continue
        print(f"  Found {db_line_count} lines, {len(db_entries)} valid entries")
    except Exception as e:
        print(f"❌ Error reading database.jsonl: {e}")
        return False, None
    if db_line_count == 0:
        print(f"  {db_file} is empty or does not exist")

    # Report errors with context
    if errors or error_context:
        print("\n🚨 Validation Errors:")
        for error in errors:
            print(f"  {error}")
        for error_msg, error_index, error_line in error_context:
            print(f"\n  {error_msg}")
            print("  Context (Previous 3 and Next 3 Entries):")
            start_idx = max(0, error_index - 3)
            end_idx = min(len(db_entries), error_index + 4)
            for idx in range(start_idx, end_idx):
                entry, line_num = db_entries_with_lines[idx]
                prefix = "  * " if idx == error_index else "    "
                print(f"{prefix}Line {line_num}: {json.dumps(entry, ensure_ascii=False)}")
        print("\n❌ Validation failed: Fix errors in temp or database files.")
        return False, db_entries[-1] if db_entries else None

    # Generate audio files for missing entries
    if audio_files_to_generate:
        print("\n🎵 Generating Audio Files")
        for entry, line_number in tqdm(audio_files_to_generate, desc="Generating audio", unit="entry", leave=False):
            print(f"  Generating audio for '{entry['word']}' (Line {line_number})")
            if generate_audio(entry['word'], audio_dir):
                print(f"    ✅ Audio generated: {entry['word']}.mp3")
            else:
                errors.append(f"Temp line {line_number}: Failed to generate audio for '{entry['word']}'")
        if any(f"Failed to generate audio" in error for error in errors):
            print("\n❌ Audio generation failed for some entries.")
            return False, db_entries[-1] if db_entries else None

    # Append valid temp entries to database
    print("\n📝 Appending to database.jsonl")
    try:
        with open(db_file, 'a', encoding='utf-8') as f_db:
            for entry in tqdm(temp_entries, desc="Appending", unit="entry", leave=False):
                json.dump(entry, f_db, ensure_ascii=False)
                f_db.write('\n')
        print(f"  Appended {len(temp_entries)} entries")
    except Exception as e:
        print(f"❌ Error appending to database.jsonl: {e}")
        return False, db_entries[-1] if db_entries else None

    # Empty temp file
    print("\n🗑️ Clearing temp_sentences.jsonl")
    try:
        with open(temp_file, 'w', encoding='utf-8') as f_temp:
            f_temp.write('')
        print(f"  Cleared temp_sentences.jsonl")
    except Exception as e:
        print(f"❌ Error clearing temp_sentences.jsonl: {e}")
        return False, db_entries[-1] if db_entries else None

    # Check for adjacent duplicates
    print("\n🔍 Checking for adjacent duplicates")
    duplicates = []
    all_entries = db_entries + temp_entries
    entry_hashes = {}
    for i, entry in enumerate(all_entries):
        entry_tuple = (entry['word'], entry['english'])
        entry_hash = hashlib.md5(json.dumps(entry_tuple, ensure_ascii=False).encode('utf-8')).hexdigest()
        if i > 0 and entry_hash == entry_hashes.get(i - 1):
            duplicates.append(
                f"Lines {i} and {i+1}: Duplicate entry - Word: {entry['word']}, English: {entry['english']}"
            )
        entry_hashes[i] = entry_hash
    if duplicates:
        print("\n⚠️ Adjacent Duplicates Found:")
        for dup in duplicates:
            print(f"  {dup}")
    else:
        print("\n✅ No adjacent duplicates found")

    # Detailed summary
    print("\n📊 Database Summary")
    total_entries = len(all_entries)
    unique_words = len(set(entry['word'].lower() for entry in all_entries))
    total_english_sentences = len([entry['english'] for entry in all_entries])
    unique_english_sentences = len(set(entry['english'].lower() for entry in all_entries))
    word_frequencies = Counter(entry['word'].lower() for entry in all_entries)
    top_10_words = word_frequencies.most_common(10)

    print(f"  Total entries: {total_entries}")
    print(f"  Total words: {total_entries}")
    print(f"  Unique words: {unique_words}")
    print(f"  Total English sentences: {total_english_sentences}")
    print(f"  Unique English sentences: {unique_english_sentences}")
    print(f"  Adjacent duplicates: {len(duplicates)}")
    print("\n  Top 10 Most Frequent Words:")
    for word, freq in top_10_words:
        print(f"    {word}: {freq}")

    # Confirmation message
    print("\n🟢 Status")
    audio_valid = all(os.path.exists(os.path.join(audio_dir, f"{entry['word']}.mp3")) for entry in all_entries)
    order_valid = not error_context
    if not errors and audio_valid and order_valid and not duplicates:
        print("  ✅ All green: Entries valid, audio files present, in order, no duplicates.")
    else:
        status = []
        if errors:
            status.append("validation errors")
        if not audio_valid:
            status.append("missing/invalid audio files")
        if not order_valid:
            status.append("ordering issues")
        if duplicates:
            status.append("adjacent duplicates")
        print(f"  ❌ Issues detected: {', '.join(status)}.")

    # Last database entry
    last_entry = all_entries[-1] if all_entries else None
    print("\n📌 Last Database Entry")
    if last_entry:
        print(f"  {json.dumps(last_entry, ensure_ascii=False)}")
    else:
        print("  No valid entries in database.jsonl")

    return not (errors or error_context or not audio_valid), last_entry

def main():
    # File paths
    temp_file = "temp_sentences.jsonl"
    db_file = "database.jsonl"
    audio_dir = "data/audio"

    # Create database file and audio directory if they don't exist
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    if not os.path.exists(db_file):
        print(f"ℹ️ Creating {db_file}")
        with open(db_file, 'a', encoding='utf-8'):
            pass
    os.makedirs(audio_dir, exist_ok=True)

    # Validate and append
    print("🚀 VocabSwipe Data Processor")
    success, last_entry = validate_and_append(temp_file, db_file, audio_dir)
    if success:
        print("\n🎉 Operation completed successfully")
    else:
        print("\n⚠️ Operation completed with issues")

if __name__ == "__main__":
    main()
