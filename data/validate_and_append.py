import json
import os
from tqdm import tqdm

def validate_and_append(temp_file, db_file):
    """
    Validates entries in temp_sentences.jsonl and database.jsonl, checks for duplicates in database,
    appends valid entries if no errors, empties temp file, and reports total/unique words.
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

    # Validate database file and check for duplicates
    db_entries = []
    previous_english = None
    seen_entries = set()  # Track (word, english, thai) for duplicates
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
                    # Check for duplicates
                    entry_tuple = (entry['word'].lower(), entry['english'].lower(), entry['thai'])
                    if entry_tuple in seen_entries:
                        errors.append(f"Database line {i+1}: Duplicate entry: {json.dumps(entry, ensure_ascii=False)}")
                    else:
                        seen_entries.add(entry_tuple)
                    previous_english = entry['english']
                    db_entries.append(entry)
                except json.JSONDecodeError:
                    errors.append(f"Database line {i+1}: Invalid JSON")
                    continue

    # Report errors or confirm no duplicates
    if errors:
        print("\n🚨 Errors Found:")
        for error in errors:
            print(f"  {error}")
        print("\n⚠️ No entries appended. Fix errors and rerun.")
    else:
        print("\n✅ All entries valid. No duplicates found in database.jsonl.")

    # Summarize database
    unique_words = len(set(entry['word'].lower() for entry in db_entries + temp_entries))
    print("\n📊 Database Summary")
    print(f"  Total entries: {len(db_entries) + len(temp_entries)}")
    print(f"  Unique words: {unique_words}")

    # Append to database and empty temp file if no errors
    if not errors:
        print("\n📝 Appending to database.jsonl")
        with open(db_file, 'a', encoding='utf-8') as f_db:
            for entry in tqdm(temp_entries, desc="Appending", unit="entry", leave=False):
                json.dump(entry, f_db, ensure_ascii=False)
                f_db.write('\n')
        print("\n🗑️ Clearing temp_sentences.jsonl")
        open(temp_file, 'w', encoding='utf-8').close()

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

    return len(errors) == 0, last_entry

def main():
    # File paths
    temp_file = "temp_sentences.jsonl"
    db_file = "database.jsonl"

    # Create database file if it doesn't exist
    if not os.path.exists(db_file):
        print(f"ℹ️ Creating {db_file}")
        open(db_file, 'a', encoding='utf-8').close()

    # Validate and append
    validate_and_append(temp_file, db_file)

if __name__ == "__main__":
    main()
