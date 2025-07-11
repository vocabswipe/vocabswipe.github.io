import json
import os
from tqdm import tqdm

def validate_and_append(temp_file, db_file):
    """
    Validates entries in temp_sentences.jsonl and appends to database.jsonl if all are valid.
    Reports errors, progress, summary, and the last database entry.
    Creates database.jsonl if it doesn't exist.
    """
    # Initialize variables
    errors = []
    entries = []
    previous_english = None

    # Print current working directory for debugging
    print(f"📍 Current working directory: {os.getcwd()}")

    # Check if temp file exists
    if not os.path.exists(temp_file):
        print(f"❌ Error: Temporary file '{temp_file}' not found in current directory.")
        return False, None

    # Read and validate temporary file
    print("\n📄 Validating temp_sentences.jsonl...")
    with open(temp_file, 'r', encoding='utf-8') as f_temp:
        lines = f_temp.readlines()
        for i, line in enumerate(tqdm(lines, desc="Processing entries", unit="entry")):
            try:
                entry = json.loads(line.strip())
                # Check for required fields
                if not all(key in entry for key in ['word', 'english', 'thai']):
                    errors.append(f"Line {i+1}: Missing required fields (word, english, thai)")
                    continue
                # Check for non-empty fields
                if not all(entry[key].strip() for key in ['word', 'english', 'thai']):
                    errors.append(f"Line {i+1}: One or more fields are empty")
                    continue
                # Check word series (skip first entry)
                if i > 0 and previous_english and entry['word'].lower() not in previous_english.lower():
                    errors.append(f"Line {i+1}: Word '{entry['word']}' not found in previous English sentence: '{previous_english}'")
                previous_english = entry['english']
                entries.append(entry)
            except json.JSONDecodeError:
                errors.append(f"Line {i+1}: Invalid JSON format")
                continue

    # Print errors if any
    if errors:
        print("\n🚨 Validation Errors Found:")
        print("-------------------------")
        for error in errors:
            print(f"  - {error}")
        print("\n⚠️ No entries will be appended to database.jsonl until errors are fixed.")
        print("Please revise temp_sentences.jsonl and rerun the script.")
    else:
        print("\n✅ All entries are valid!")

    # Summary report
    print("\n📊 Summary Report")
    print("-----------------")
    print(f"Total entries processed: {len(lines)}")
    print(f"Valid entries: {len(entries)}")
    print(f"Errors found: {len(errors)}")
    
    # Append to database if no errors
    if not errors:
        print("\n📝 Appending valid entries to database.jsonl...")
        with open(db_file, 'a', encoding='utf-8') as f_db:
            for entry in tqdm(entries, desc="Appending entries", unit="entry"):
                # Ensure proper UTF-8 encoding without escaping
                json.dump(entry, f_db, ensure_ascii=False)
                f_db.write('\n')
        print("✅ Successfully appended all entries to database.jsonl")

    # Read and print the last entry in the database
    last_entry = None
    if os.path.exists(db_file):
        with open(db_file, 'r', encoding='utf-8') as f_db:
            lines = f_db.readlines()
            if lines:
                try:
                    last_entry = json.loads(lines[-1].strip())
                except json.JSONDecodeError:
                    print("⚠️ Warning: Last line in database.jsonl is invalid JSON.")
    
    print("\n📌 Last Entry in database.jsonl")
    print("-----------------------------")
    if last_entry:
        print(f"Word: {last_entry['word']}")
        print(f"English: {last_entry['english']}")
        print(f"Thai: {last_entry['thai']}")
    else:
        print("No entries in database.jsonl yet.")

    return len(errors) == 0, last_entry

def main():
    # File paths (files are in the current directory)
    temp_file = "temp_sentences.jsonl"
    db_file = "database.jsonl"

    # Ensure database file exists
    if not os.path.exists(db_file):
        print(f"ℹ️ Creating new database file: {db_file}")
        open(db_file, 'a', encoding='utf-8').close()  # Create empty file with UTF-8 encoding

    # Validate and append
    success, last_entry = validate_and_append(temp_file, db_file)

    # Provide guidance for next steps
    if success and last_entry:
        print("\n🔗 To generate the next 100 entries, use the following first entry:")
        print("```jsonl")
        # Ensure UTF-8 output without escaping
        print(json.dumps(last_entry, ensure_ascii=False))
        print("```")
        print("Update the prompt with this entry and regenerate the series.")

if __name__ == "__main__":
    main()
