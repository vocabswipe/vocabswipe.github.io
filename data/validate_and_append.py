import json
import os
import hashlib
import re
from tqdm import tqdm
from collections import Counter

def contains_unwanted_chars(text):
    """Check if text contains Chinese, Russian, or other non-Latin characters."""
    # Matches Chinese (CJK) or Cyrillic characters
    pattern = r'[\u4e00-\u9fff\u0400-\u04ff]'
    return bool(re.search(pattern, text))

def contains_english_chars(text):
    """Check if text contains English (Latin) characters."""
    pattern = r'[a-zA-Z]'
    return bool(re.search(pattern, text))

def word_in_sentence(word, sentence):
    """Check if word (or its simple variants) is in the sentence."""
    word = word.lower().strip()
    sentence = sentence.lower().strip()
    # Simple check for word presence, including basic variations (e.g., drive -> drives)
    word_variants = [word, word + 's', word + 'd', word + 'ed', word + 'ing']
    return any(variant in sentence.split() for variant in word_variants)

def validate_and_append(temp_file, db_file):
    """
    Validates entries in temp_sentences.jsonl and database.jsonl, appends valid entries to database,
    empties temp file, appends last database entry to temp file, and reports statistics including:
    - Total and unique main words and English sentences
    - Total duplicate sentences
    Skips entries with:
    - Unwanted characters (e.g., Chinese, Russian) in word, english, or thai fields
    - English sentences not containing the main word (or its variants)
    - Thai sentences with English characters (user prompted to keep/skip)
    Assumes all files are in the same directory: D:\vocabswipe.github.io\data.
    """
    errors = []
    temp_entries = []
    db_entries = []
    skipped_entries = []

    # Print header and working directory
    print("\n" + "═"*60)
    print("🌟 VocabSwipe Data Validation & Append System 🌟")
    print("═"*60)
    print(f"📍 Working directory: {os.getcwd()}\n")

    # Check if temp file exists and is not empty
    if not os.path.exists(temp_file):
        print(f"❌ Error: '{temp_file}' not found")
        return False, None
    if os.path.getsize(temp_file) == 0:
        print(f"⚠️ Warning: '{temp_file}' is empty")
        return False, None

    # Validate temp file
    print("📄 Validating temp_sentences.jsonl")
    temp_line_count = 0
    temp_entries_with_lines = []  # Store (entry, line_number)
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
                    # Check for unwanted characters
                    if any(contains_unwanted_chars(entry[key]) for key in ['word', 'english', 'thai']):
                        skipped_entries.append(f"Temp line {line_number}: Contains unwanted characters (e.g., Chinese, Russian)")
                        continue
                    # Check if word is in English sentence
                    if not word_in_sentence(entry['word'], entry['english']):
                        skipped_entries.append(f"Temp line {line_number}: Word '{entry['word']}' not found in English sentence")
                        continue
                    # Check for English characters in Thai field
                    if contains_english_chars(entry['thai']):
                        print(f"\n⚠️ Temp line {line_number}: Thai field contains English characters: {entry['thai']}")
                        response = input("  Keep this entry? (y/n): ").strip().lower()
                        if response != 'y':
                            skipped_entries.append(f"Temp line {line_number}: Thai field contains English characters (skipped by user)")
                            continue
                    temp_entries.append(entry)
                    temp_entries_with_lines.append((entry, line_number))
                except json.JSONDecodeError:
                    errors.append(f"Temp line {line_number}: Invalid JSON")
                    continue
        print(f"  ✅ Found {temp_line_count} lines, {len(temp_entries)} valid entries")
    except Exception as e:
        print(f"❌ Error reading temp_sentences.jsonl: {e}")
        return False, None

    # Validate database file
    print("\n📂 Validating database.jsonl")
    db_line_count = 0
    db_entries_with_lines = []  # Store (entry, line_number)
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
                    # Skip entries with unwanted characters
                    if any(contains_unwanted_chars(entry[key]) for key in ['word', 'english', 'thai']):
                        skipped_entries.append(f"Database line {line_number}: Contains unwanted characters (e.g., Chinese, Russian)")
                        continue
                    # Skip entries where word is not in English sentence
                    if not word_in_sentence(entry['word'], entry['english']):
                        skipped_entries.append(f"Database line {line_number}: Word '{entry['word']}' not found in English sentence")
                        continue
                    db_entries.append(entry)
                    db_entries_with_lines.append((entry, line_number))
                except json.JSONDecodeError:
                    errors.append(f"Database line {line_number}: Invalid JSON")
                    continue
        print(f"  ✅ Found {db_line_count} lines, {len(db_entries)} valid entries")
    except Exception as e:
        print(f"❌ Error reading database.jsonl: {e}")
        return False, None
    if db_line_count == 0:
        print(f"  ℹ️ {db_file} is empty or does not exist")

    # Report errors
    if errors:
        print("\n🚨 Validation Errors:")
        for error in errors:
            print(f"  - {error}")
        print("\n❌ Validation failed: Please fix errors in temp or database files.")
        return False, db_entries[-1] if db_entries else None

    # Report skipped entries
    if skipped_entries:
        print("\n⏭️ Skipped Entries:")
        for skip in skipped_entries:
            print(f"  - {skip}")

    # Append valid temp entries to database
    print("\n📝 Appending to database.jsonl")
    try:
        with open(db_file, 'a', encoding='utf-8') as f_db:
            for entry in tqdm(temp_entries, desc="Appending", unit="entry", leave=False):
                json.dump(entry, f_db, ensure_ascii=False)
                f_db.write('\n')
        print(f"  ✅ Appended {len(temp_entries)} entries")
    except Exception as e:
        print(f"❌ Error appending to database.jsonl: {e}")
        return False, db_entries[-1] if db_entries else None

    # Empty temp file and append last database entry
    print("\n🗑️ Clearing and updating temp_sentences.jsonl")
    try:
        # Clear temp file
        with open(temp_file, 'w', encoding='utf-8') as f_temp:
            f_temp.write('')
        print(f"  ✅ Cleared temp_sentences.jsonl")
        
        # Append last database entry (without audio field)
        all_entries = db_entries + temp_entries
        if all_entries:
            last_entry = all_entries[-1]
            # Create entry with only word, english, thai
            temp_entry = {
                "word": last_entry["word"],
                "english": last_entry["english"],
                "thai": last_entry["thai"]
            }
            with open(temp_file, 'a', encoding='utf-8') as f_temp:
                json.dump(temp_entry, f_temp, ensure_ascii=False)
                f_temp.write('\n')
            print(f"  ✅ Appended last database entry to temp_sentences.jsonl")
    except Exception as e:
        print(f"❌ Error clearing or updating temp_sentences.jsonl: {e}")
        return False, db_entries[-1] if db_entries else None

    # Database statistics
    print("\n📊 Database Statistics")
    all_entries = db_entries + temp_entries
    total_words = len(all_entries)
    unique_words = len(set(entry['word'].lower() for entry in all_entries if entry))
    total_sentences = len(all_entries)
    unique_sentences = len(set(entry['english'].lower() for entry in all_entries if entry))
    # Calculate total duplicate sentences
    sentence_counts = Counter(entry['english'].lower() for entry in all_entries if entry)
    total_duplicates = sum(count - 1 for count in sentence_counts.values() if count > 1)

    # Summary report
    print("\n" + "═"*60)
    print("📈 Summary Report")
    print("═"*60)
    print(f"  Total Main Words: {total_words}")
    print(f"  Unique Main Words: {unique_words}")
    print(f"  Total English Sentences: {total_sentences}")
    print(f"  Unique English Sentences: {unique_sentences}")
    print(f"  Total Duplicate Sentences: {total_duplicates}")

    # Last database entry
    print("\n📌 Last Database Entry")
    last_entry = all_entries[-1] if all_entries else None
    if last_entry:
        print(f"  {json.dumps(last_entry, ensure_ascii=False, indent=2)}")
    else:
        print("  No valid entries in database.jsonl")

    # Final status
    print("\n🟢 Operation Status")
    if not errors:
        print("  ✅ All green: Database entries are valid.")
    else:
        print("  ❌ Validation failed: Please fix errors in temp or database files.")

    return not errors, last_entry

def main():
    print("\n🚀 Starting VocabSwipe Data Processing")
    # File paths (all in same directory)
    temp_file = "temp_sentences.jsonl"
    db_file = "database.jsonl"

    # Create database file if it doesn't exist
    if not os.path.exists(db_file):
        print(f"ℹ️ Creating {db_file}")
        with open(db_file, 'a', encoding='utf-8'):
            pass

    # Validate and append
    success, last_entry = validate_and_append(temp_file, db_file)
    print("\n" + "═"*60)
    if success:
        print("🎉 Operation Completed Successfully")
    else:
        print("⚠️ Operation Completed with Errors")
    print("═"*60)

if __name__ == "__main__":
    main()
