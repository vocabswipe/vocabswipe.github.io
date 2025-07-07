import yaml
import os
import shutil
from tabulate import tabulate
from datetime import datetime

def load_yaml_file(file_path):
    """Load and return the YAML file content."""
    try:
        with open(file_path, 'r') as file:
            return yaml.safe_load(file)
    except Exception as e:
        print(f"\033[91mError loading YAML file: {e}\033[0m")
        return None

def save_yaml_file(file_path, data):
    """Save the data to a YAML file."""
    try:
        with open(file_path, 'w') as file:
            yaml.safe_dump(data, file, default_flow_style=False, sort_keys=False)
        print(f"\033[92mFile saved successfully: {file_path}\033[0m")
    except Exception as e:
        print(f"\033[91mError saving YAML file: {e}\033[0m")

def create_backup(file_path):
    """Create a backup of the original file with a timestamp."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.backup_{timestamp}"
    try:
        shutil.copy(file_path, backup_path)
        print(f"\033[92mBackup created: {backup_path}\033[0m")
        return backup_path
    except Exception as e:
        print(f"\033[91mError creating backup: {e}\033[0m")
        return None

def find_word_by_rank(data, rank):
    """Find and return the entry with the specified rank."""
    for entry in data:
        if entry.get('rank') == rank:
            return entry
    return None

def print_word_info(entry):
    """Print the word and its details in a formatted way."""
    print("\033[94m" + "="*50 + "\033[0m")
    print(f"\033[1mWord:\033[0m {entry['word']}")
    print(f"\033[1mRank:\033[0m {entry['rank']}")
    print(f"\033[1mFrequency:\033[0m {entry['freq']}")
    print(f"\033[1mVoice ID:\033[0m {entry['voice_id']}")
    print(f"\033[1mWord Audio File:\033[0m {entry['word_audio_file']}")
    print("\033[94m" + "="*50 + "\033[0m")

def main():
    file_path = 'vocab3000_database.yaml'
    
    # Check if the file exists
    if not os.path.exists(file_path):
        print(f"\033[91mError: The file '{file_path}' does not exist.\033[0m")
        return

    # Create a backup of the original file
    backup_path = create_backup(file_path)
    if not backup_path:
        print("\033[91mFailed to create backup. Exiting.\033[0m")
        return

    # Load the YAML file
    data = load_yaml_file(file_path)
    if not data:
        return

    changes = []  # To store original and corrected words

    while True:
        print("\n\033[96m=== Vocabulary Word Editor ===\033[0m")
        try:
            rank_input = input("\033[1mEnter the rank of the word to edit (or type 'finish' to end): \033[0m").strip()
            if rank_input.lower() == 'finish':
                break

            rank = int(rank_input)
            entry = find_word_by_rank(data, rank)
            if not entry:
                print(f"\033[91mNo word found with rank {rank}. Please try again.\033[0m")
                continue

            print_word_info(entry)
            edit_choice = input("\033[1mDo you want to edit this word? (yes/no): \033[0m").strip().lower()
            if edit_choice != 'yes':
                print("\033[93mNo changes made for this word.\033[0m")
                continue

            new_word = input("\033[1mEnter the corrected word: \033[0m").strip()
            if not new_word:
                print("\033[91mError: New word cannot be empty.\033[0m")
                continue

            # Store the change
            changes.append({
                'rank': rank,
                'original_word': entry['word'],
                'corrected_word': new_word
            })
            entry['word'] = new_word
            print(f"\033[92mWord updated to '{new_word}' for rank {rank}.\033[0m")

        except ValueError:
            print("\033[91mInvalid rank. Please enter a valid number.\033[0m")
        except Exception as e:
            print(f"\033[91mAn error occurred: {e}\033[0m")

    if changes:
        print("\n\033[96m=== Summary of Changes ===\033[0m")
        table = [[c['rank'], c['original_word'], c['corrected_word']] for c in changes]
        print(tabulate(table, headers=['Rank', 'Original Word', 'Corrected Word'], tablefmt='fancy_grid'))
        
        confirm = input("\n\033[1mDo you confirm these changes? (yes/no): \033[0m").strip().lower()
        if confirm == 'yes':
            save_yaml_file(file_path, data)
            print("\033[92mAll changes have been saved to the database.\033[0m")
        else:
            print("\033[93mChanges discarded. The original file remains unchanged.\033[0m")
    else:
        print("\033[93mNo changes were made.\033[0m")

    print(f"\033[94mBackup of the original file is available at: {backup_path}\033[0m")
    print("\033[96m=== Program Ended ===\033[0m")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\033[91mProgram terminated by user.\033[0m")
