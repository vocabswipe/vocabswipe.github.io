import json
import os
import hashlib
import re
from tqdm import tqdm
from collections import Counter
import sys
import unicodedata

def validate_and_append(temp_file, db_file):
    """
    Validates entries in temp_sentences.jsonl and database.jsonl, appends valid entries to database,
    empties temp file, appends last database entry to temp file, and reports statistics including:
    - Total and unique main words and English sentences
    - Ratio of total main words to unique main words (2 decimal points)
    - Top 10 most frequent main words
    - Adjacent duplicates
    - Last database entry
    - Skipped entries due to unwanted characters, English in Thai, or word not in English sentence
    Assumes all files are in the same directory: D:\vocabswipe.github.io\data.
    """
    errors = []
    temp_entries = []
    db_entries = []
    skipped_entries = []
    kept_thai_with_english = []

    # Define regex patterns for unwanted characters
    chinese_pattern = re.compile(r'[\u4E00-\u9FFF]')  # Chinese characters
    russian_pattern = re.compile(r'[\u0400-\u04FF]')  # Russian Cyrillic characters
    english_pattern = re.compile(r'[a-zA-Z]')  # English alphabet characters

    # Print header and working directory
    print("\n" + "═"*60)
    print("🌟 VocabSwipe Data Validation and Append System 🌟")
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

                    # Check for unwanted characters (Chinese, Russian)
                    for field in ['word', 'english', 'thai']:
                        if chinese_pattern.search(entry[field]) or russian_pattern.search(entry[field]):
                            skipped_entries.append(
                                f"Temp line {line_number}: Unwanted characters ({field}: {entry[field]})"
                            )
                            continue

                    # Check if English sentence contains the main word
                    word = entry['word'].lower().strip()
                    english = entry['english'].lower().strip()
                    if word not in english.split():
                        skipped_entries.append(
                            f"Temp line {line_number}: Main word '{word}' not in English sentence '{english}'"
                        )
                        continue

                    # Check for English characters in Thai sentence
                    if english_pattern.search(entry['thai']):
                        print(f"\n⚠️ Temp line {line_number}: English characters found in Thai sentence")
                        print(f"  Entry: {json.dumps(entry, ensure_ascii=False)}")
                        while True:
                            response = input("  Keep this entry? (y/n): ").strip().lower()
                            if response in ['y', 'n']:
                                break
                            print("  Please enter 'y' or 'n'")
                        if response == 'n':
                            skipped_entries.append(
                                f"Temp line {line_number}: English in Thai sentence '{entry['thai']}' (user skipped)"
                            )
                            continue
                        else:
                            kept_thai_with_english.append(
                                f"Temp line {line_number}: Kept with English in Thai sentence '{entry['thai']}'"
                            )

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

    # Report duplicates
    if duplicates:
        print("\n⚠️ Adjacent Duplicate Entries:")
        for dup in duplicates:
            print(f"  - {dup}")
    else:
        print("\n✅ No adjacent duplicates found")

    # Database statistics
    print("\n📊 Database Statistics")
    total_words = len(all_entries)
    unique_words = len(set(entry['word'].lower() for entry in all_entries if entry))
    total_sentences = len(all_entries)
    unique_sentences = len(set(entry['english'].lower() for entry in all_entries if entry))
    word_freq = Counter(entry['word'].lower() for entry in all_entries if entry)
    top_words = word_freq.most_common(10)
    # Calculate ratio of total main words to unique main words
    ratio_words = total_words / unique_words if unique_words > 0 else "N/A"

    # Summary report
    print("\n" + "═"*60)
    print("📋 Summary Report")
    print("═"*60)
    print(f"📄 Temp File Processing:")
    print(f"  Total lines processed: {temp_line_count}")
    print(f"  Valid entries: {len(temp_entries)}")
    print(f"  Skipped entries: {len(skipped_entries)}")
    if skipped_entries:
        print("  Skipped entries details:")
        for skip in skipped_entries:
            print(f"    - {skip}")
    if kept_thai_with_english:
        print("  Kept entries with English in Thai (by user choice):")
        for kept in kept_thai_with_english:
            print(f"    - {kept}")
    print(f"\n📂 Database Processing:")
    print(f"  Total lines processed: {db_line_count}")
    print(f"  Valid entries: {len(db_entries)}")
    print(f"  Appended entries: {len(temp_entries)}")
    print(f"\n📊 Statistics:")
    print(f"  Total main words: {total_words}")
    print(f"  Unique main words: {unique_words}")
    print(f"  Ratio total/unique main words: {ratio_words if isinstance(ratio_words, str) else f'{ratio_words:.2f}'}")
    print(f"  Total English sentences: {total_sentences}")
    print(f"  Unique English sentences: {unique_sentences}")
    print(f"  Adjacent duplicates: {len(duplicates)}")
    print("\n  Top 10 Most Frequent Main Words:")
    if top_words:
        for word, freq in top_words:
            print(f"    - {word}: {freq}")
    else:
        print("    No words found in database.")
    print("\n📌 Last Database Entry")
    last_entry = all_entries[-1] if all_entries else None
    if last_entry:
        print(f"  {json.dumps(last_entry, ensure_ascii=False, indent=2)}")
    else:
        print("  No valid entries in database.jsonl")

    # Final status
    print("\n🟢 Operation Status")
    if not errors and not duplicates:
        print("  ✅ All green: Database entries are valid and no adjacent duplicates found.")
    elif not errors:
        print("  ✅ Database entries are valid, but adjacent duplicates found.")
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
