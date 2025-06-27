import yaml
import os
import shutil
from datetime import datetime
from termcolor import colored

def load_yaml_file(file_path):
    """Load a YAML file and return its contents."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return yaml.safe_load(file)
    except Exception as e:
        print(colored(f"Error loading {file_path}: {e}", "red"))
        return None

def save_yaml_file(file_path, data):
    """Save data to a YAML file."""
    try:
        with open(file_path, 'w', encoding='utf-8') as file:
            yaml.safe_dump(data, file, allow_unicode=True, sort_keys=False)
        print(colored(f"Successfully saved {file_path}", "green"))
    except Exception as e:
        print(colored(f"Error saving {file_path}: {e}", "red"))

def create_backup(file_path):
    """Create a backup of the specified file with a timestamp."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.backup_{timestamp}"
    shutil.copy(file_path, backup_path)
    print(colored(f"Backup created: {backup_path}", "cyan"))
    return backup_path

def find_problematic_entries(data, field, bad_symbol="â€™"):
    """Find entries in the data that contain the bad symbol in the specified field."""
    problematic = []
    for entry in data:
        if 'back_cards' in entry:
            for card in entry['back_cards']:
                if bad_symbol in card.get(field, ""):
                    problematic.append({
                        'word': entry.get('word', 'unknown'),
                        'field': field,
                        'value': card[field]
                    })
    return problematic

def find_correct_entry(word, field, value, vocab2_data):
    """Find the correct entry in vocab_database2.yaml based on word and field content."""
    for entry in vocab2_data:
        if entry.get('word') == word:
            for card in entry.get('back_cards', []):
                # Match based on similarity of content (ignoring bad symbols)
                cleaned_value = value.replace("â€™", "'")
                if card.get(field) == cleaned_value:
                    return card[field]
    return None

def main():
    # Print script purpose
    print(colored("=" * 50, "cyan"))
    print(colored("YAML Correction Script", "cyan", attrs=["bold"]))
    print(colored("=" * 50, "cyan"))
    print("This script will:")
    print("- Load vocab_database.yaml and vocab_database2.yaml")
    print("- Identify sentences and definitions with 'â€™' in vocab_database.yaml")
    print("- Find correct replacements in vocab_database2.yaml using word keys")
    print("- Report unmatched entries with problematic symbols")
    print("- Create a backup of vocab_database.yaml")
    print("- Display corrections for manual review")
    print("- Update vocab_database.yaml upon user confirmation")
    print(colored("=" * 50, "cyan"))
    print()

    # Load YAML files
    vocab1 = load_yaml_file('vocab_database.yaml')
    vocab2 = load_yaml_file('vocab_database2.yaml')
    
    if not vocab1 or not vocab2:
        print(colored("Exiting due to file loading errors.", "red"))
        return

    # Find problematic entries in example_en and definition_en
    problematic_examples = find_problematic_entries(vocab1, 'example_en')
    problematic_definitions = find_problematic_entries(vocab1, 'definition_en')
    problematic = problematic_examples + problematic_definitions

    if not problematic:
        print(colored("No problematic entries with 'â€™' found in vocab_database.yaml.", "green"))
        return

    # Find corrections and track unmatched entries
    corrections = []
    unmatched = []
    for issue in problematic:
        word = issue['word']
        field = issue['field']
        bad_value = issue['value']
        correct_value = find_correct_entry(word, field, bad_value, vocab2)
        if correct_value:
            corrections.append({
                'word': word,
                'field': field,
                'bad_value': bad_value,
                'correct_value': correct_value
            })
        else:
            unmatched.append({
                'word': word,
                'field': field,
                'bad_value': bad_value
            })

    # Display corrections
    if corrections:
        print(colored("Proposed Corrections:", "yellow", attrs=["bold"]))
        print("-" * 50)
        for i, correction in enumerate(corrections, 1):
            print(f"{i}. Word: {correction['word']}")
            print(f"   Field: {correction['field']}")
            print(f"   Incorrect: {colored(correction['bad_value'], 'red')}")
            print(f"   Correct: {colored(correction['correct_value'], 'green')}")
            print("-" * 50)
    else:
        print(colored("No corrections found in vocab_database2.yaml.", "yellow"))

    # Display unmatched entries
    if unmatched:
        print(colored("Unmatched Problematic Entries (No Correction Available):", "magenta", attrs=["bold"]))
        print("-" * 50)
        for i, issue in enumerate(unmatched, 1):
            print(f"{i}. Word: {issue['word']}")
            print(f"   Field: {issue['field']}")
            print(f"   Problematic Value: {colored(issue['bad_value'], 'red')}")
            print("-" * 50)

    if not corrections:
        print(colored("No corrections to apply. Exiting.", "yellow"))
        return

    # Ask for user confirmation
    print()
    confirm = input(colored("Do you want to apply these corrections to vocab_database.yaml? (yes/no): ", "cyan")).strip().lower()
    if confirm != 'yes':
        print(colored("Corrections not applied. Exiting.", "yellow"))
        return

    # Create backup
    create_backup('vocab_database.yaml')

    # Apply corrections
    for correction in corrections:
        word = correction['word']
        field = correction['field']
        bad_value = correction['bad_value']
        correct_value = correction['correct_value']
        for entry in vocab1:
            if entry.get('word') == word:
                for card in entry.get('back_cards', []):
                    if card[field] == bad_value:
                        card[field] = correct_value

    # Save updated YAML
    save_yaml_file('vocab_database.yaml', vocab1)
    print(colored("Corrections applied successfully!", "green"))

if __name__ == "__main__":
    main()
