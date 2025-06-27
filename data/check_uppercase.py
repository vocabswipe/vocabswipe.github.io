import yaml
import os
from datetime import datetime
import shutil
from termcolor import colored

def load_yaml_file(file_path):
    """Load a YAML file and return its contents."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return yaml.safe_load(file)
    except Exception as e:
        print(colored(f"Error loading {file_path}: {e}", "red"))
        return None

def save_yaml_file(data, file_path):
    """Save data to a YAML file."""
    try:
        with open(file_path, 'w', encoding='utf-8') as file:
            yaml.safe_dump(data, file, allow_unicode=True)
        print(colored(f"Successfully saved to {file_path}", "green"))
    except Exception as e:
        print(colored(f"Error saving {file_path}: {e}", "red"))

def create_backup(file_path):
    """Create a backup of the original file with a timestamp."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.backup_{timestamp}"
    shutil.copyfile(file_path, backup_path)
    print(colored(f"Backup created: {backup_path}", "cyan"))
    return backup_path

def find_uppercase_words(vocab_data):
    """Find entries where the word is entirely uppercase."""
    issues = []
    for entry in vocab_data:
        word = entry.get('word', '')
        if word.isupper() and word:  # Check if word is all uppercase and not empty
            issues.append({'word': word, 'entry': entry})
    return issues

def display_issues(issues):
    """Display uppercase word issues and prompt for corrections."""
    if not issues:
        print(colored("\nNo fully uppercase words found in vocab_database.yaml.", "green"))
        return []

    print(colored("\nFound fully uppercase words in vocab_database.yaml:", "yellow"))
    print("=" * 50)
    corrections = []
    for i, issue in enumerate(issues, 1):
        word = issue['word']
        print(colored(f"\nIssue {i}: Word = '{word}'", "cyan"))
        print("  Example sentences:")
        for j, card in enumerate(issue['entry'].get('back_cards', []), 1):
            print(f"    {j}. {card.get('example_en', 'N/A')}")
        while True:
            new_word = input(colored(f"  Enter the correct word for '{word}' (or press Enter to keep '{word.lower()}'): ", "yellow")).strip()
            if not new_word:
                new_word = word.lower()  # Default to lowercase version
            if new_word.isalpha():  # Basic validation: ensure only letters
                corrections.append({'old_word': word, 'new_word': new_word, 'entry': issue['entry']})
                print(colored(f"  Proposed correction: '{word}' -> '{new_word}'", "green"))
                break
            else:
                print(colored("Invalid input. Please enter a word containing only letters.", "red"))
        print("-" * 50)
    return corrections

def confirm_action(corrections):
    """Prompt user to confirm or cancel the corrections."""
    if not corrections:
        return False
    print(colored("\nSummary of proposed corrections:", "yellow"))
    print("=" * 50)
    for i, correction in enumerate(corrections, 1):
        print(f"{i}. '{correction['old_word']}' -> '{correction['new_word']}'")
    while True:
        response = input(colored("\nDo you want to proceed with these changes? (y/n): ", "yellow")).lower()
        if response in ['y', 'n']:
            return response == 'y'
        print(colored("Please enter 'y' or 'n'.", "red"))

def apply_corrections(vocab_data, corrections):
    """Apply the word corrections to vocab_data."""
    for correction in corrections:
        for entry in vocab_data:
            if entry.get('word') == correction['old_word']:
                entry['word'] = correction['new_word']
    return vocab_data

def verify_no_uppercase_words(vocab_data):
    """Verify that no fully uppercase words remain in the data."""
    for entry in vocab_data:
        word = entry.get('word', '')
        if word.isupper() and word:
            return False
    return True

def main():
    print(colored("\n=== YAML Vocabulary Database Uppercase Word Correction Script ===", "blue"))
    print("This script will:")
    print("1. Create a backup of vocab_database.yaml")
    print("2. Scan for fully uppercase words (e.g., 'TRUE')")
    print("3. Prompt for correct lowercase versions")
    print("4. Display proposed changes for confirmation")
    print("5. Update and save vocab_database.yaml")
    print("6. Verify no fully uppercase words remain")
    print("=" * 50)

    # Load YAML file
    vocab_data = load_yaml_file('vocab_database.yaml')
    if not vocab_data:
        print(colored("Exiting due to file loading errors.", "red"))
        return

    # Create backup
    create_backup('vocab_database.yaml')

    # Find uppercase words
    issues = find_uppercase_words(vocab_data)

    # Display issues and get corrections
    corrections = display_issues(issues)
    if not corrections:
        print(colored("No changes needed. Exiting.", "green"))
        return

    # Confirm changes
    if not confirm_action(corrections):
        print(colored("Changes aborted by user.", "red"))
        return

    # Apply corrections
    vocab_data = apply_corrections(vocab_data, corrections)

    # Save updated file
    save_yaml_file(vocab_data, 'vocab_database.yaml')

    # Verify no uppercase words remain
    if verify_no_uppercase_words(vocab_data):
        print(colored("Verification: No fully uppercase words remain in vocab_database.yaml.", "green"))
    else:
        print(colored("Warning: Some fully uppercase words may still remain in vocab_database.yaml.", "red"))

    print(colored("\nScript completed.", "blue"))

if __name__ == "__main__":
    main()
