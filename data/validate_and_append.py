import json
import os
import hashlib
from tqdm import tqdm

def validate_and_append(temp_file, db_file):
    """
    Validates entries in temp_sentences.jsonl and database.jsonl, appends valid entries if both are valid,
    empties temp file, reports total/unique words and adjacent duplicates, and confirms validity.
    Prints previous 3 and next 3 valid entries for word-in-sentence errors.
    Assumes all files are in the same directory: D:\vocabswipe.github.io\data.
    """
    errors = []
    temp_entries = []
    db_entries = []
    error_context = []  # Store (error_msg, db_entry_index, line_number) for word-in-sentence errors

    # Print current working directory
    print(f"📍 Working directory: {os.getcwd()}")

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
                    # Check if word is in prior sentence's english field (skip for first valid entry)
                    if previous_english and entry['word'].lower() not in previous_english.lower():
                        errors.append(
                            f"Temp line {line_number}: Word '{entry['word']}' not in prior sentence: '{previous_english}'"
                        )
                    previous_english = entry['english']
                    temp_entries.append(entry)
                    temp_entries_with_lines.append((entry, line_number))
                except json.JSONDecodeError:
                    errors.append(f"Temp line {line_number}: Invalid JSON")
                    continue
        print(f"  Found {temp_line_count} lines, {len(temp_entries)} valid entries in temp_sentences.jsonl")
    except Exception as e:
        print(f"❌ Error reading temp_sentences.jsonl: {e}")
        return False, None

    # Validate database file
    print("\n📂 Validating database.jsonl")
    previous_english = None  # Reset for database validation
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
                    # Check if word is in prior sentence's english field (skip for first valid entry)
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
        print(f"  Found {db_line_count} lines, {len(db_entries)} valid entries in database.jsonl")
    except Exception as e:
        print(f"❌ Error reading database.jsonl: {e}")
        return False, None
    if db_line_count == 0:
        print(f"  {db_file} is empty or does not exist")

    # Report errors with context
    if errors or error_context:
        print("\n🚨 Errors Found:")
        for error in errors:
            print(f"  {error}")
        for error_msg, error_index, error_line in error_context:
            print(f"\n  {error_msg}")
            print("  Context (Previous 3 and Next 3 Valid Entries):")
            start_idx = max(0, error_index - 3)
            end_idx = min(len(db_entries), error_index + 4)  # Include error entry + next 3
            for idx in range(start_idx, end_idx):
                entry, line_num = db_entries_with_lines[idx]
                prefix = "  * " if idx == error_index else "    "
                print(f"{prefix}Line {line_num}: {json.dumps(entry, ensure_ascii=False)}")
        print("\n❌ Validation failed: Fix errors in temp or database files.")
        return False, db_entries[-1] if db_entries else None

    # Append valid temp entries to database
    print("\n📝 Appending to database.jsonl")
    try:
        with open(db_file, 'a', encoding='utf-8') as f_db:
            for entry in tqdm(temp_entries, desc="Appending", unit="entry", leave=False):
                json.dump(entry, f_db, ensure_ascii=False)
                f_db.write('\n')
        print(f"  Appended {len(temp_entries)} entries to database.jsonl")
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

    # Report duplicates
    if duplicates:
        print("\n⚠️ Adjacent Duplicate Entries Found:")
        for dup in duplicates:
            print(f"  {dup}")
    else:
        print("\n✅ No adjacent duplicates found")

    # Summarize database
    unique_words = len(set(entry['word'].lower() for entry in all_entries if entry))
    total_valid_entries = len(all_entries)
    print("\n📊 Database Summary")
    print(f"  Total valid entries: {total_valid_entries}")
    print(f"  Unique words: {unique_words}")
    print(f"  Adjacent duplicates: {len(duplicates)}")

    # Confirmation message
    print("\n🟢 Status")
    if not errors and not error_context and not duplicates:
        print("  ✅ All green: Database entries are valid, in order, and no adjacent duplicates found.")
    elif not errors and not error_context:
        print("  ✅ Database entries are valid and in order, but adjacent duplicates found.")
    else:
        print("  ❌ Validation failed: Fix errors in temp or database files.")

    # Get last database entry
    last_entry = all_entries[-1] if all_entries else None
    print("\n📌 Last Database Entry")
    if last_entry:
        print(f"```jsonl")
        print(json.dumps(last_entry, ensure_ascii=False, indent=2))
        print(f"```")
    else:
        print("  No valid entries in database.jsonl")

    return not (errors or error_context), last_entry

def main():
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
    if success:
        print("\n🎉 Operation completed successfully")
    else:
        print("\n⚠️ Operation completed with errors")

if __name__ == "__main__":
    main()
