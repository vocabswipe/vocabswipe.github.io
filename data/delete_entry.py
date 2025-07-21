# File: delete_entry.py
import json
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
        print("Error: database.jsonl file not found.")
        return []
    except json.JSONDecodeError:
        print("Error: Invalid JSON format in database.jsonl.")
        return []

def save_database(file_path, data):
    """Save the modified data back to a new JSONL file."""
    with open(file_path, 'w', encoding='utf-8') as file:
        for entry in data:
            file.write(json.dumps(entry, ensure_ascii=False) + '\n')

def search_entries(data, search_term):
    """Search for entries where the English sentence contains the search term."""
    return [
        entry for entry in data
        if search_term.lower() in entry.get('english', '').lower()
    ]

def display_entries(entries):
    """Display numbered list of matching entries."""
    if not entries:
        print("\nNo entries found matching your search.")
        return
    print("\nMatching entries:")
    print("-" * 50)
    for idx, entry in enumerate(entries, 1):
        print(f"{idx}. Word: {entry['word']}")
        print(f"   English: {entry['english']}")
        print(f"   Thai: {entry['thai']}")
        print("-" * 50)

def main():
    database_file = 'database.jsonl'
    output_file = 'database_updated.jsonl'

    # Load the database
    data = load_database(database_file)
    if not data:
        print("Exiting due to database error.")
        return

    # Get search term from user
    print("\n=== Delete Entry from Database ===")
    search_term = input("\nEnter part of the English sentence to search (e.g., 'pick up some milk'): ").strip()
    if not search_term:
        print("Error: Search term cannot be empty.")
        return

    # Find matching entries
    matching_entries = search_entries(data, search_term)
    if not matching_entries:
        return

    # Display matching entries
    display_entries(matching_entries)

    # Get user selection
    try:
        selection = int(input("\nEnter the number of the entry to delete (or 0 to cancel): "))
        if selection == 0:
            print("Operation cancelled.")
            return
        if selection < 1 or selection > len(matching_entries):
            print("Error: Invalid selection.")
            return
    except ValueError:
        print("Error: Please enter a valid number.")
        return

    # Confirm deletion
    selected_entry = matching_entries[selection - 1]
    print("\nYou selected the following entry for deletion:")
    print("-" * 50)
    print(f"Word: {selected_entry['word']}")
    print(f"English: {selected_entry['english']}")
    print(f"Thai: {selected_entry['thai']}")
    print("-" * 50)
    
    confirm = input("\nAre you sure you want to delete this entry? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Deletion cancelled.")
        return

    # Remove the selected entry
    data.remove(selected_entry)
    print("\nEntry deleted successfully.")

    # Save to a new file
    save_database(output_file, data)
    print(f"Updated database saved as '{output_file}'.")

if __name__ == "__main__":
    main()
