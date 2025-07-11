import json
import os
import hashlib
from tqdm import tqdm

def validate_and_append(temp_file, db_file):
    """
    Validates entries in temp_sentences.jsonl and database.jsonl, appends valid entries if both are valid,
    empties temp file, reports total/unique words, checks for adjacent duplicates based on (word, english),
    and confirms validity.
    """
    errors = []
    temp_entries = []
    previous_english = None

    # Print current working directory
    print(f"📍 Working directory: {os.getcwd()}")

    # Check if temp file exists
    if not os.path.exists(temp_file):
        print(f"❌ Error: '{temp_file}' not found")
        return False, None

    # Validate temp file
    print("\n📄 Checking temp_sentences.jsonl")
    with open(temp_file, 'r', encoding='utf-8') as f_temp:
        lines = f_temp.readlines()
        for i, line in enumerate(tqdm(lines, desc="Validating temp", unit="entry", leave=False)):
            try:
                entry = json.loads(line.strip())
                if not all(key in entry for key in ['word', 'english', 'thai']):
                    errors.append(f"Temp line {i+1}: Missing fields (word, english, thai)")
                    continue
                if not all(entry[key].strip() for key in ['word', 'english', 'thai']):
                    errors.append(f"Temp line {i+1}: Empty fields")
                    continue
                if i > 0 and previous_english and entry['word'].lower() not in previous_english.lower():
                    errors.append(f"Temp line {i+1}: Word '{entry['word']}' not in prior sentence: '{previous_english}'")
                previous_english = entry['english']
                temp_entries.append(entry)
            except json.JSONDecodeError:
                errors.append(f"Temp line {i+1}: Invalid JSON")
                continue

    # Validate database file
    db_entries = []
    previous_english = None
    if os.path.exists(db_file):
        print("\n📂 Checking database.jsonl")
        with open(db_file, 'r', encoding='utf-8') as f_db:
            lines = f_db.readlines()
            for i, line in enumerate(tqdm(lines, desc="Validating database", unit="entry", leave=False)):
                try:
                    entry = json.loads(line.strip())
                    if not all(key in entry for key in ['word', 'english', 'thai']):
                        errors.append(f"Database line {i+1}: Missing fields (word, english, thai)")
                        continue
                    if not all(entry[key].strip() for key in ['word', 'english', 'thai']):
                        errors.append(f"Database line {i+1}: Empty fields")
                        continue
                    if i > 0 and previous_english and entry['word'].lower() not in previous_english.lower():
                        errors.append(f"Database line {i+1}: Word '{entry['word']}' not in prior sentence: '{previous_english}'")
                    previous_english = entry['english']
                    db_entries.append(entry)
                except json.JSONDecodeError:
                    errors.append(f"Database line {i+1}: Invalid JSON")
                    continue

    # Report errors
    if errors:
        print("\n🚨 Errors Found:")
        for error in errors:
            print(f"  {error}")
        print("\n❌ Validation failed: Fix errors in temp or database files.")
        return False, db_entries[-1] if db_entries else None

    # Append to database if no errors
    print("\n📝 Appending to database.jsonl")
    with open(db_file, 'a', encoding='utf-8') as f_db:
        for entry in tqdm(temp_entries, desc="Appending", unit="entry", leave=False):
            json.dump(entry, f_db, ensure_ascii=False)
            f_db.write('\n')

    # Empty temp file
    print("\n🗑️ Clearing temp_sentences.jsonl")
    open(temp_file, 'w', encoding='utf-8').close()

    # Check for adjacent duplicates in database (based on word and english)
    print("\n🔍 Checking for adjacent duplicates in database.jsonl")
    duplicates = []
    all_entries = db_entries + temp_entries
    for i in range(len(all_entries) - 1):
        current_entry = all_entries[i]
        next_entry = all_entries[i + 1]
        # Create hash of (word, english) for both entries
        current_tuple = (current_entry['word'], current_entry['english'])
        next_tuple = (next_entry['word'], next_entry['english'])
        current_hash = hashlib.md5(json.dumps(current_tuple, ensure_ascii=False).encode('utf-8')).hexdigest()
        next_hash = hashlib.md5(json.dumps(next_tuple, ensure_ascii=False).encode('utf-8')).hexdigest()
        if current_hash == next_hash:
            duplicates.append(f"Lines {i+1} and {i+2}: Duplicate entry - Word: {current_entry['word']}, English: {current_entry['english']}")

    # Report duplicates
    if duplicates:
        print("\n⚠️ Adjacent Duplicate Entries Found:")
        for dup in duplicates:
            print(f"  {dup}")
    else:
        print("\n✅ No adjacent duplicates found in database.jsonl")

    # Summarize database
    unique_words = len(set(entry['word'].lower() for entry in all_entries))
    print("\n📊 Database Summary")
    print(f"  Total entries: {len(all_entries)}")
    print(f"  Unique words: {unique_words}")
    print(f"  Adjacent duplicates: {len(duplicates)}")

    # Confirmation message
    print("\n🟢 Status")
    if not errors and not duplicates:
        print("  ✅ All green: Database entries are valid, in order, and no adjacent duplicates found.")
    elif not errors:
        print("  ✅ Database entries are valid and in order, but adjacent duplicates found.")
    else:
        print("  ❌ Validation failed: Fix errors in temp or database files.")

    # Get last database entry
    last_entry = temp_entries[-1] if temp_entries else None
    if os.path.exists(db_file):
        with open(db_file, 'r', encoding='utf-8') as f_db:
            lines = f_db.readlines()
            if lines:
                try:
                    last_entry = json.loads(lines[-1].strip())
                except json.JSONDecodeError:
                    print("⚠️ Warning: Last line in database.jsonl is invalid JSON")
                    last_entry = None

    print("\n📌 Last Database Entry")
    if last_entry:
        print(f"```jsonl")
        print(json.dumps(last_entry, ensure_ascii=False))
        print(f"```")
    else:
        print("  No entries in database.jsonl")

    return True, last_entry

def main():
    # File paths
    temp_file = "temp_sentences.jsonl"
    db_file = "data/database.jsonl"  # Updated to match website directory structure

    # Create database file if it doesn't exist
    if not os.path.exists(db_file):
        print(f"ℹ️ Creating {db_file}")
        os.makedirs(os.path.dirname(db_file), exist_ok=True)  # Ensure data directory exists
        open(db_file, 'a', encoding='utf-8').close()

    # Validate and append
    validate_and_append(temp_file, db_file)

if __name__ == "__main__":
    main()
