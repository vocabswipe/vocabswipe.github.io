import yaml
import os
from datetime import datetime
import shutil
from termcolor import colored
import difflib

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

def find_replacements(vocab1_data, vocab2_data):
    """Find and report entries with 'â€™' in vocab1 and potential replacements from vocab2."""
    issues = []
    vocab2_dict = {entry['word']: entry for entry in vocab2_data if 'word' in entry}

    for entry in vocab1_data:
        word = entry.get('word', '')
        back_cards = entry.get('back_cards', [])
        for card in back_cards:
            example_en = card.get('example_en', '')
            definition_en = card.get('definition_en', '')
            if 'â€™' in example_en or 'â€™' in definition_en:
                issue = {'word': word, 'card': card, 'example_en': example_en, 'definition_en': definition_en}
                # Look for a matching word in vocab2
                if word in vocab2_dict:
                    vocab2_cards = vocab2_dict[word].get('back_cards', [])
                    # Try to find a matching definition or example
                    for v2_card in vocab2_cards:
                        if v2_card['definition_en'] == definition_en.replace('â€™', "'"):
                            issue['replacement_example'] = v2_card.get('example_en', '')
                            issue['replacement_definition'] = v2_card['definition_en']
                            break
                    else:
                        issue['replacement_example'] = example_en.replace('â€™', "'")
                        issue['replacement_definition'] = definition_en.replace('â€™', "'")
                else:
                    issue['replacement_example'] = example_en.replace('â€™', "'")
                    issue['replacement_definition'] = definition_en.replace('â€™', "'")
                issues.append(issue)
    return issues

def display_issues(issues):
    """Display issues and their proposed replacements in a formatted manner."""
    if not issues:
        print(colored("\nNo entries with 'â€™' found in vocab_database.yaml.", "green"))
        return False

    print(colored("\nFound entries with 'â€™' in vocab_database.yaml:", "yellow"))
    print("=" * 50)
    for i, issue in enumerate(issues, 1):
        print(colored(f"\nIssue {i}: Word = '{issue['word']}'", "cyan"))
        print(f"  Original Example: {issue['example_en']}")
        print(f"  Original Definition: {issue['definition_en']}")
        print(colored(f"  Proposed Example: {issue['replacement_example']}", "green"))
        print(colored(f"  Proposed Definition: {issue['replacement_definition']}", "green"))
        print("-" * 50)
    return True

def confirm_action():
    """Prompt user to confirm or cancel the update."""
    while True:
        response = input(colored("\nDo you want to proceed with these changes? (y/n): ", "yellow")).lower()
        if response in ['y', 'n']:
            return response == 'y'
        print(colored("Please enter 'y' or 'n'.", "red"))

def apply_replacements(vocab1_data, issues):
    """Apply the replacements to vocab1_data."""
    for issue in issues:
        word = issue['word']
        for entry in vocab1_data:
            if entry.get('word') == word:
                for card in entry.get('back_cards', []):
                    if card['example_en'] == issue['example_en'] and card['definition_en'] == issue['definition_en']:
                        card['example_en'] = issue['replacement_example']
                        card['definition_en'] = issue['replacement_definition']
    return vocab1_data

def verify_no_special_chars(vocab1_data):
    """Verify that no 'â€™' remains in the updated data."""
    for entry in vocab1_data:
        for card in entry.get('back_cards', []):
            if 'â€™' in card.get('example_en', '') or 'â€™' in card.get('definition_en', ''):
                return False
    return True

def main():
    print(colored("\n=== YAML Vocabulary Database Correction Script ===", "blue"))
    print("This script will:")
    print("1. Create a backup of vocab_database.yaml")
    print("2. Scan for 'â€™' in example_en and definition_en fields")
    print("3. Attempt to replace with matching entries from vocab_database2.yaml")
    print("4. If no match, replace 'â€™' with a standard apostrophe (')")
    print("5. Display changes for review before updating")
    print("6. Verify no 'â€™' remains after updates")
    print("=" * 50)

    # Load YAML files
    vocab1_data = load_yaml_file('vocab_database.yaml')
    vocab2_data = load_yaml_file('vocab_database2.yaml')
    if not vocab1_data or not vocab2_data:
        print(colored("Exiting due to file loading errors.", "red"))
        return

    # Create backup
    create_backup('vocab_database.yaml')

    # Find issues and replacements
    issues = find_replacements(vocab1_data, vocab2_data)

    # Display issues and get user confirmation
    if not display_issues(issues):
        print(colored("No changes needed. Exiting.", "green"))
        return

    if not confirm_action():
        print(colored("Changes aborted by user.", "red"))
        return

    # Apply replacements
    vocab1_data = apply_replacements(vocab1_data, issues)

    # Save updated file
    save_yaml_file(vocab1_data, 'vocab_database.yaml')

    # Verify no special characters remain
    if verify_no_special_chars(vocab1_data):
        print(colored("Verification: No 'â€™' characters remain in vocab_database.yaml.", "green"))
    else:
        print(colored("Warning: Some 'â€™' characters may still remain in vocab_database.yaml.", "red"))

    print(colored("\nScript completed.", "blue"))

if __name__ == "__main__":
    main()
