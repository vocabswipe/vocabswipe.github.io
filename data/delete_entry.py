# File: delete_entry.py
import json
import os
import re
from pathlib import Path

def load_database(file_path):
    """Load the JSONL database into a list of dictionaries."""
    data = []
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            for line in file:
                data.append(json.loads(line.strip()))
        return data
    except FileNotFoundError:
        print("Error: database.jsonl file not found.")
        return []
    except json.JSONDecodeError:
        print("Error: Invalid JSON format in database.jsonl.")
        return []

def save_database(file_path, data):
    """Save the modified data back to the original JSONL file."""
    with open(file_path, 'w', encoding='utf-8') as file:
        for entry in data:
            file.write(json.dumps(entry, ensure_ascii=False) + '\n')

def is_valid_english(text):
    """Check if text contains only English letters, numbers, and basic punctuation."""
    # Allow letters (a-z, A-Z), numbers, spaces, and common punctuation
    pattern = r'^[a-zA-Z0-9\s.,!?\'"-]+$'
    return bool(re.match(pattern, text))

def is_valid_thai(text):
    """Check if text contains only Thai characters, English letters, numbers, and basic punctuation."""
    # Allow Thai characters (U+0E00–U+0E7F), English letters, numbers, spaces, and punctuation
    pattern = r'^[\u0E00-\u0E7Fa-zA-Z0-9\s.,!?\'"-]+$'
    return bool(re.match(pattern, text))

def find_invalid_entries(data):
    """Find entries with unwanted characters (e.g., Chinese, Russian) in any field."""
    invalid_entries = []
    for entry in data:
        issues = []
        # Check word field (English only)
        if 'word' in entry and not is_valid_english(entry['word']):
            issues.append(f"Word contains invalid characters: {entry['word']}")
        # Check english field (English only)
        if 'english' in entry and not is_valid_english(entry['english']):
            issues.append(f"English sentence contains invalid characters: {entry['english']}")
        # Check thai field (Thai or English only)
        if 'thai' in entry and not is_valid_thai(entry['thai']):
            issues.append(f"Thai sentence contains invalid characters: {entry['thai']}")
        if issues:
            invalid_entries.append((entry, issues))
    return invalid_entries

def search_entries(data, search_term):
    """Search for entries where the English sentence contains the search term."""
    return [
        entry for entry in data
        if search_term.lower() in entry.get('english', '').lower()
    ]

def display_entries(entries, invalid=False):
    """Display numbered list of entries (invalid or search results)."""
    if not entries:
        print("\nNo entries found.")
        return
    print("\nMatching entries:" if not invalid else "\nEntries with invalid characters:")
    print("-" * 60)
    for idx, item in enumerate(entries, 1):
        entry = item[0] if invalid else item
        print(f"{idx}. Word: {entry['word']}")
        print(f"   English: {entry['english']}")
        print(f"   Thai: {entry['thai']}")
        if invalid:
            print(f"   Issues: {'; '.join(item[1])}")
        print("-" * 60)

def handle_invalid_entries(data, database_file):
    """Handle deletion of entries with invalid characters."""
    invalid_entries = find_invalid_entries(data)
    if not invalid_entries:
        print("\nNo entries with invalid characters found.")
        return data

    print("\n=== Entries with Unwanted Characters ===")
    print("The following entries contain invalid characters (e.g., Chinese, Russian).")
    display_entries(invalid_entries, invalid=True)

    while True:
        try:
            selection = input("\nEnter the number of the entry to delete (0 to skip, 'all' to delete all, 'q' to quit): ").strip().lower()
            if selection == 'q':
                print("Skipping invalid character deletion.")
                return data
            if selection == '0':
                print("No entries deleted.")
                return data
            if selection == 'all':
                confirm = input("\nAre you sure you want to delete ALL entries with invalid characters? (y/n): ").strip().lower()
                if confirm == 'y':
                    for entry, _ in invalid_entries:
                        data.remove(entry)
                    print(f"\nDeleted {len(invalid_entries)} entries successfully.")
                    save_database(database_file, data)
                    print(f"Database updated and saved to '{database_file}'.")
                    return data
                else:
                    print("Deletion cancelled.")
                    continue

            selection = int(selection)
            if selection < 1 or selection > len(invalid_entries):
                print("Error: Invalid selection.")
                continue

            # Confirm deletion
            selected_entry, issues = invalid_entries[selection - 1]
            print("\nYou selected the following entry for deletion:")
            print("-" * 60)
            print(f"Word: {selected_entry['word']}")
            print(f"English: {selected_entry['english']}")
            print(f"Thai: {selected_entry['thai']}")
            print(f"Issues: {'; '.join(issues)}")
            print("-" * 60)

            confirm = input("\nAre you sure you want to delete this entry? (y/n): ").strip().lower()
            if confirm == 'y':
                data.remove(selected_entry)
                print("\nEntry deleted successfully.")
                save_database(database_file, data)
                print(f"Database updated and saved to '{database_file}'.")
                return data
            else:
                print("Deletion cancelled.")
                continue
        except ValueError:
            print("Error: Please enter a valid number, 'all', or 'q'.")
            continue

def handle_search_deletion(data, database_file):
    """Handle deletion of entries based on search term."""
    print("\n=== Delete Entry by Search ===")
    search_term = input("\nEnter part of the English sentence to search (e.g., 'pick up some milk'): ").strip()
    if not search_term:
        print("Error: Search term cannot be empty.")
        return data

    # Find matching entries
    matching_entries = search_entries(data, search_term)
    if not matching_entries:
        print("\nNo entries found matching your search.")
        return data

    # Display matching entries
    display_entries(matching_entries)

    # Get user selection
    try:
        selection = int(input("\nEnter the number of the entry to delete (or 0 to cancel): "))
        if selection == 0:
            print("Operation cancelled.")
            return data
        if selection < 1 or selection > len(matching_entries):
            print("Error: Invalid selection.")
            return data
    except ValueError:
        print("Error: Please enter a valid number.")
        return data

    # Confirm deletion
    selected_entry = matching_entries[selection - 1]
    print("\nYou selected the following entry for deletion:")
    print("-" * 60)
    print(f"Word: {selected_entry['word']}")
    print(f"English: {selected_entry['english']}")
    print(f"Thai: {selected_entry['thai']}")
    print("-" * 60)
    
    confirm = input("\nAre you sure you want to delete this entry? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Deletion cancelled.")
        return data

    # Remove the selected entry
    data.remove(selected_entry)
    print("\nEntry deleted successfully.")
    save_database(database_file, data)
    print(f"Database updated and saved to '{database_file}'.")
    return data

def main():
    database_file = 'database.jsonl'

    # Load the database
    data = load_database(database_file)
    if not data:
        print("Exiting due to database error.")
        return

    while True:
        print("\n=== Delete Entry from Database ===")
        print("1. Check for entries with invalid characters (e.g., Chinese, Russian)")
        print("2. Search and delete by English sentence")
        print("3. Exit")
        choice = input("\nSelect an option (1-3): ").strip()

        if choice == '1':
            data = handle_invalid_entries(data, database_file)
        elif choice == '2':
            data = handle_search_deletion(data, database_file)
        elif choice == '3':
            print("Exiting program.")
            break
        else:
            print("Error: Invalid option. Please select 1, 2, or 3.")

if __name__ == "__main__":
    main()
