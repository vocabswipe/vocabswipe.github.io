# File: delete_entry.py
import json
import re
import os
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
        print("🚫 Error: database.jsonl file not found.")
        return []
    except json.JSONDecodeError:
        print("🚫 Error: Invalid JSON format in database.jsonl.")
        return []

def save_database(file_path, data):
    """Save the modified data back to the original JSONL file."""
    with open(file_path, 'w', encoding='utf-8') as file:
        for entry in data:
            file.write(json.dumps(entry, ensure_ascii=False) + '\n')

def search_entries(data, search_term):
    """Search for entries where the English sentence contains the search term."""
    return [
        entry for entry in data
        if search_term.lower() in entry.get('english', '').lower()
    ]

def detect_unwanted_chars(text):
    """Detect if text contains Chinese or Russian characters."""
    unwanted_pattern = re.compile(r'[\u4e00-\u9fff\u0400-\u04ff]')
    return bool(unwanted_pattern.search(text))

def detect_english_in_thai(text):
    """Detect if Thai text contains English letters or words."""
    # Pattern to match any English letters (a-z, A-Z)
    english_pattern = re.compile(r'[a-zA-Z]+')
    return bool(english_pattern.search(text))

def detect_period_in_thai(text):
    """Detect if Thai text contains the unwanted character '。'."""
    return '。' in text

def scan_unwanted_entries(data):
    """Scan database for entries with unwanted characters in word, english, or thai fields."""
    unwanted_entries = []
    for entry in data:
        word = entry.get('word', '')
        english = entry.get('english', '')
        thai = entry.get('thai', '')
        if detect_unwanted_chars(word) or detect_unwanted_chars(english) or detect_unwanted_chars(thai):
            unwanted_entries.append(entry)
    return unwanted_entries

def scan_missing_word_entries(data):
    """Scan database for entries where the English sentence does not contain the main word."""
    missing_word_entries = []
    for entry in data:
        word = entry.get('word', '').lower()
        english = entry.get('english', '').lower()
        if word and word not in english:
            missing_word_entries.append(entry)
    return missing_word_entries

def scan_english_in_thai_entries(data):
    """Scan database for entries where Thai sentence contains English letters/words."""
    english_in_thai_entries = []
    for entry in data:
        thai = entry.get('thai', '')
        if detect_english_in_thai(thai):
            english_in_thai_entries.append(entry)
    return english_in_thai_entries

def scan_period_in_thai_entries(data):
    """Scan database for entries where Thai sentence contains the character '。'."""
    period_in_thai_entries = []
    for entry in data:
        thai = entry.get('thai', '')
        if detect_period_in_thai(thai):
            period_in_thai_entries.append(entry)
    return period_in_thai_entries

def display_entries(entries, title="Matching Entries"):
    """Display numbered list of entries with a given title."""
    if not entries:
        print(f"\nℹ️ No {title.lower()} found.")
        return False
    print(f"\n📋 {title}:")
    print("═" * 60)
    for idx, entry in enumerate(entries, 1):
        print(f"{idx}. Word: {entry['word']}")
        print(f"   English: {entry['english']}")
        print(f"   Thai: {entry['thai']}")
        print("─" * 60)
    return True

def display_menu():
    """Display the main menu."""
    print("\n=== 📖 Dictionary Entry Management ===")
    print("1️⃣ Search and delete by English sentence")
    print("2️⃣ Scan and delete entries with unwanted characters (e.g., Chinese, Russian)")
    print("3️⃣ Scan and delete entries where English sentence does not contain the main word")
    print("4️⃣ Scan and edit/delete entries with English in Thai sentence")
    print("5️⃣ Scan and delete entries with '。' in Thai sentence")
    print("0️⃣ Exit")
    print("═" * 60)

def handle_search_delete(data, database_file):
    """Handle deletion by searching English sentence."""
    search_term = input("\n🔍 Enter part of the English sentence to search (e.g., 'pick up some milk'): ").strip()
    if not search_term:
        print("🚫 Error: Search term cannot be empty.")
        return False

    matching_entries = search_entries(data, search_term)
    if not display_entries(matching_entries, "Matching Entries"):
        return False

    try:
        selection = int(input("\n✏️ Enter the number of the entry to delete (or 0 to cancel): "))
        if selection == 0:
            print("ℹ️ Operation cancelled.")
            return False
        if selection < 1 or selection > len(matching_entries):
            print("🚫 Error: Invalid selection.")
            return False
    except ValueError:
        print("🚫 Error: Please enter a valid number.")
        return False

    selected_entry = matching_entries[selection - 1]
    print("\n🗑️ You selected the following entry for deletion:")
    print("═" * 60)
    print(f"Word: {selected_entry['word']}")
    print(f"English: {selected_entry['english']}")
    print(f"Thai: {selected_entry['thai']}")
    print("═" * 60)

    confirm = input("\n❓ Are you sure you want to delete this entry? (y/n): ").strip().lower()
    if confirm != 'y':
        print("ℹ️ Deletion cancelled.")
        return False

    data.remove(selected_entry)
    print("\n✅ Entry deleted successfully.")
    save_database(database_file, data)
    print(f"💾 Database updated and saved to '{database_file}'.")
    return True

def handle_unwanted_chars_delete(data, database_file):
    """Handle deletion of entries with unwanted characters."""
    unwanted_entries = scan_unwanted_entries(data)
    if not display_entries(unwanted_entries, "Entries with Unwanted Characters"):
        return False

    print("\n🗑️ Delete options:")
    print("1️⃣ Delete a single entry")
    print("2️⃣ Delete all listed entries")
    print("0️⃣ Cancel")
    choice = input("\n➡️ Enter your choice (0-2): ").strip()

    if choice == '0':
        print("ℹ️ Operation cancelled.")
        return False
    elif choice == '2':
        confirm = input("\n❓ Are you sure you want to delete ALL listed entries? (y/n): ").strip().lower()
        if confirm != 'y':
            print("ℹ️ Deletion cancelled.")
            return False
        for entry in unwanted_entries:
            data.remove(entry)
        print("\n✅ All listed entries deleted successfully.")
        save_database(database_file, data)
        print(f"💾 Database updated and saved to '{database_file}'.")
        return True
    elif choice == '1':
        try:
            selection = int(input("\n✏️ Enter the number of the entry to delete (or 0 to cancel): "))
            if selection == 0:
                print("ℹ️ Operation cancelled.")
                return False
            if selection < 1 or selection > len(unwanted_entries):
                print("🚫 Error: Invalid selection.")
                return False
        except ValueError:
            print("🚫 Error: Please enter a valid number.")
            return False

        selected_entry = unwanted_entries[selection - 1]
        print("\n🗑️ You selected the following entry for deletion:")
        print("═" * 60)
        print(f"Word: {selected_entry['word']}")
        print(f"English: {selected_entry['english']}")
        print(f"Thai: {selected_entry['thai']}")
        print("═" * 60)

        confirm = input("\n❓ Are you sure you want to delete this entry? (y/n): ").strip().lower()
        if confirm != 'y':
            print("ℹ️ Deletion cancelled.")
            return False

        data.remove(selected_entry)
        print("\n✅ Entry deleted successfully.")
        save_database(database_file, data)
        print(f"💾 Database updated and saved to '{database_file}'.")
        return True
    else:
        print("🚫 Invalid choice. Please select 0, 1, or 2.")
        return False

def handle_missing_word_delete(data, database_file):
    """Handle deletion of entries where English sentence does not contain the main word."""
    missing_word_entries = scan_missing_word_entries(data)
    if not display_entries(missing_word_entries, "Entries Missing Main Word in English Sentence"):
        return False

    print("\n🗑️ Delete options:")
    print("1️⃣ Delete a single entry")
    print("2️⃣ Delete all listed entries")
    print("0️⃣ Cancel")
    choice = input("\n➡️ Enter your choice (0-2): ").strip()

    if choice == '0':
        print("ℹ️ Operation cancelled.")
        return False
    elif choice == '2':
        confirm = input("\n❓ Are you sure you want to delete ALL listed entries? (y/n): ").strip().lower()
        if confirm != 'y':
            print("ℹ️ Deletion cancelled.")
            return False
        for entry in missing_word_entries:
            data.remove(entry)
        print("\n✅ All listed entries deleted successfully.")
        save_database(database_file, data)
        print(f"💾 Database updated and saved to '{database_file}'.")
        return True
    elif choice == '1':
        try:
            selection = int(input("\n✏️ Enter the number of the entry to delete (or 0 to cancel): "))
            if selection == 0:
                print("ℹ️ Operation cancelled.")
                return False
            if selection < 1 or selection > len(missing_word_entries):
                print("🚫 Error: Invalid selection.")
                return False
        except ValueError:
            print("🚫 Error: Please enter a valid number.")
            return False

        selected_entry = missing_word_entries[selection - 1]
        print("\n🗑️ You selected the following entry for deletion:")
        print("═" * 60)
        print(f"Word: {selected_entry['word']}")
        print(f"English: {selected_entry['english']}")
        print(f"Thai: {selected_entry['thai']}")
        print("═" * 60)

        confirm = input("\n❓ Are you sure you want to delete this entry? (y/n): ").strip().lower()
        if confirm != 'y':
            print("ℹ️ Deletion cancelled.")
            return False

        data.remove(selected_entry)
        print("\n✅ Entry deleted successfully.")
        save_database(database_file, data)
        print(f"💾 Database updated and saved to '{database_file}'.")
        return True
    else:
        print("🚫 Invalid choice. Please select 0, 1, or 2.")
        return False

def handle_english_in_thai(data, database_file):
    """Handle editing or deletion of entries with English in Thai sentence."""
    english_in_thai_entries = scan_english_in_thai_entries(data)
    if not display_entries(english_in_thai_entries, "Entries with English in Thai Sentence"):
        return False

    print("\n⚙️ Options:")
    print("1️⃣ Edit a single entry")
    print("2️⃣ Delete a single entry")
    print("3️⃣ Delete all listed entries")
    print("0️⃣ Cancel")
    choice = input("\n➡️ Enter your choice (0-3): ").strip()

    if choice == '0':
        print("ℹ️ Operation cancelled.")
        return False
    elif choice == '3':
        confirm = input("\n❓ Are you sure you want to delete ALL listed entries? (y/n): ").strip().lower()
        if confirm != 'y':
            print("ℹ️ Deletion cancelled.")
            return False
        for entry in english_in_thai_entries:
            data.remove(entry)
        print("\n✅ All listed entries deleted successfully.")
        save_database(database_file, data)
        print(f"💾 Database updated and saved to '{database_file}'.")
        return True
    elif choice in ('1', '2'):
        try:
            selection = int(input("\n✏️ Enter the number of the entry to edit/delete (or 0 to cancel): "))
            if selection == 0:
                print("ℹ️ Operation cancelled.")
                return False
            if selection < 1 or selection > len(english_in_thai_entries):
                print("🚫 Error: Invalid selection.")
                return False
        except ValueError:
            print("🚫 Error: Please enter a valid number.")
            return False

        selected_entry = english_in_thai_entries[selection - 1]
        print("\n📋 Selected entry:")
        print("═" * 60)
        print(f"Word: {selected_entry['word']}")
        print(f"English: {selected_entry['english']}")
        print(f"Thai: {selected_entry['thai']}")
        print("═" * 60)

        if choice == '1':
            new_thai = input("\n✏️ Enter the corrected Thai sentence: ").strip()
            if not new_thai:
                print("🚫 Error: Thai sentence cannot be empty.")
                return False
            if detect_english_in_thai(new_thai):
                print("🚫 Error: New Thai sentence still contains English letters.")
                return False

            confirm = input("\n❓ Are you sure you want to update this entry? (y/n): ").strip().lower()
            if confirm != 'y':
                print("ℹ️ Update cancelled.")
                return False

            # Update the entry
            for entry in data:
                if (entry['word'] == selected_entry['word'] and 
                    entry['english'] == selected_entry['english'] and 
                    entry['thai'] == selected_entry['thai']):
                    entry['thai'] = new_thai
                    break

            print("\n✅ Entry updated successfully.")
            save_database(database_file, data)
            print(f"💾 Database updated and saved to '{database_file}'.")
            return True
        else:  # choice == '2'
            confirm = input("\n❓ Are you sure you want to delete this entry? (y/n): ").strip().lower()
            if confirm != 'y':
                print("ℹ️ Deletion cancelled.")
                return False

            data.remove(selected_entry)
            print("\n✅ Entry deleted successfully.")
            save_database(database_file, data)
            print(f"💾 Database updated and saved to '{database_file}'.")
            return True
    else:
        print("🚫 Invalid choice. Please select 0, 1, 2, or 3.")
        return False

def handle_period_in_thai_delete(data, database_file):
    """Handle deletion of entries with '。' in Thai sentence."""
    period_in_thai_entries = scan_period_in_thai_entries(data)
    if not display_entries(period_in_thai_entries, "Entries with '。' in Thai Sentence"):
        return False

    print("\n🗑️ Delete options:")
    print("1️⃣ Delete a single entry")
    print("2️⃣ Delete all listed entries")
    print("0️⃣ Cancel")
    choice = input("\n➡️ Enter your choice (0-2): ").strip()

    if choice == '0':
        print("ℹ️ Operation cancelled.")
        return False
    elif choice == '2':
        confirm = input("\n❓ Are you sure you want to delete ALL listed entries? (y/n): ").strip().lower()
        if confirm != 'y':
            print("ℹ️ Deletion cancelled.")
            return False
        for entry in period_in_thai_entries:
            data.remove(entry)
        print("\n✅ All listed entries deleted successfully.")
        save_database(database_file, data)
        print(f"💾 Database updated and saved to '{database_file}'.")
        return True
    elif choice == '1':
        try:
            selection = int(input("\n✏️ Enter the number of the entry to delete (or 0 to cancel): "))
            if selection == 0:
                print("ℹ️ Operation cancelled.")
                return False
            if selection < 1 or selection > len(period_in_thai_entries):
                print("🚫 Error: Invalid selection.")
                return False
        except ValueError:
            print("🚫 Error: Please enter a valid number.")
            return False

        selected_entry = period_in_thai_entries[selection - 1]
        print("\n🗑️ You selected the following entry for deletion:")
        print("═" * 60)
        print(f"Word: {selected_entry['word']}")
        print(f"English: {selected_entry['english']}")
        print(f"Thai: {selected_entry['thai']}")
        print("═" * 60)

        confirm = input("\n❓ Are you sure you want to delete this entry? (y/n): ").strip().lower()
        if confirm != 'y':
            print("ℹ️ Deletion cancelled.")
            return False

        data.remove(selected_entry)
        print("\n✅ Entry deleted successfully.")
        save_database(database_file, data)
        print(f"💾 Database updated and saved to '{database_file}'.")
        return True
    else:
        print("🚫 Invalid choice. Please select 0, 1, or 2.")
        return False

def main():
    database_file = 'database.jsonl'

    # Load the database
    data = load_database(database_file)
    if not data:
        print("🚫 Exiting due to database error.")
        return

    while True:
        display_menu()
        choice = input("\n➡️ Enter your choice (0-5): ").strip()
        print()

        if choice == '0':
            print("👋 Exiting Dictionary Entry Management.")
            break
        elif choice == '1':
            handle_search_delete(data, database_file)
        elif choice == '2':
            handle_unwanted_chars_delete(data, database_file)
        elif choice == '3':
            handle_missing_word_delete(data, database_file)
        elif choice == '4':
            handle_english_in_thai(data, database_file)
        elif choice == '5':
            handle_period_in_thai_delete(data, database_file)
        else:
            print("🚫 Invalid choice. Please select 0, 1, 2, 3, 4, or 5.")

if __name__ == "__main__":
    main()
