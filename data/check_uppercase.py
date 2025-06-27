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

def find_uppercase_words(data):
    """Find words in the YAML data that are entirely uppercase."""
    issues = []
    for entry in data:
        word = entry.get('word', '')
        if word.isalpha() and word.isupper():
            issues.append({'original_word': word, 'entry': entry})
    return issues

def display_issues(issues):
    """Display uppercase words and prompt for replacements."""
    if not issues:
        print(colored("\nNo fully uppercase words found in vocab_database.yaml.", "green"))
        return None

    print(colored("\nFound fully uppercase words in vocab_database.yaml:", "yellow"))
    print("=" * 50)
    replacements = []
    for i, issue in enumerate(issues, 1):
        original_word = issue['original_word']
        print(colored(f"\nIssue {i}: Word = '{original_word}'", "cyan"))
        while True:
            new_word = input(colored(f"Enter the correct word for '{original_word}' (or press Enter to keep as is): ", "yellow")).strip()
            if new_word == "" or new_word.isalpha():
                break
            print(colored("Please enter a valid word (letters only) or press Enter to skip.", "red"))
        if new_word:
            print(colored(f"Proposed replacement: '{original_word}' -> '{new_word}'", "green"))
            replacements.append({'original_word': original_word, 'new_word': new_word, 'entry': issue['entry']})
        else:
            print(colored(f"Keeping '{original_word}' unchanged.", "yellow"))
        print("-" * 50)
    return replacements

def confirm_action(replacements):
    """Prompt user to confirm or cancel the changes."""
    if not replacements:
        print(colored("No changes proposed.", "yellow"))
        return False
    print(colored("\nSummary of proposed changes:", "yellow"))
    print("=" * 50)
    for i, rep in enumerate(replacements, 1):
        print(f"{i}. '{rep['original_word']}' -> '{rep['new_word']}'")
    while True:
        response = input(colored("\nDo you want to proceed with these changes? (y/n): ", "yellow")).lower()
        if response in ['y', 'n']:
            return response == 'y'
        print(colored("Please enter 'y' or 'n'.", "red"))

def apply_replacements(data, replacements):
    """Apply the confirmed replacements to the data."""
    for rep in replacements:
        rep['entry']['word'] = rep['new_word']
    return data

def verify_no_uppercase_words(data):
    """Verify that no fully uppercase words remain in the data."""
    for entry in data:
        word = entry.get('word', '')
        if word.isalpha() and word.isupper():
            return False
    return True

def main():
    print(colored("\n=== YAML Vocabulary Database Uppercase Word Correction Script ===", "blue"))
    print("This script will:")
    print("1. Create a backup of vocab_database.yaml")
    print("2. Scan for words that are entirely in uppercase (e.g., 'TRUE')")
    print("3. Prompt for correct lowercase versions")
    print("4. Display proposed changes for confirmation")
    print("5. Update the file if confirmed")
    print("6. Verify no uppercase words remain")
    print("=" * 50)

    # Load YAML file
    data = load_yaml_file('vocab_database.yaml')
    if not data:
        print(colored("Exiting due to file loading error.", "red"))
        return

    # Create backup
    create_backup('vocab_database.yaml')

    # Find uppercase words
    issues = find_uppercase_words(data)

    # Display issues and get replacements
    replacements = display_issues(issues)
    if not replacements:
        print(colored("No changes needed. Exiting.", "green"))
        return

    # Confirm changes
    if not confirm_action(replacements):
        print(colored("Changes aborted by user.", "red"))
        return

    # Apply replacements
    data = apply_replacements(data, replacements)

    # Save updated file
    save_yaml_file(data, 'vocab_database.yaml')

    # Verify no uppercase words remain
    if verify_no_uppercase_words(data):
        print(colored("Verification: No fully uppercase words remain in vocab_database.yaml.", "green"))
    else:
        print(colored("Warning: Some fully uppercase words may still remain in vocab_database.yaml.", "red"))

    print(colored("\nScript completed.", "blue"))

if __name__ == "__main__":
    main()
