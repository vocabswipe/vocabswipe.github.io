import yaml
import os
from datetime import datetime
import shutil

def load_yaml_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return yaml.safe_load(file)
    except Exception as e:
        print(f"\033[91mError loading {file_path}: {e}\033[0m")
        return None

def save_yaml_file(data, file_path):
    try:
        with open(file_path, 'w', encoding='utf-8') as file:
            yaml.safe_dump(data, file, allow_unicode=True)
        print(f"\033[92mSuccessfully saved to {file_path}\033[0m")
    except Exception as e:
        print(f"\033[91mError saving {file_path}: {e}\033[0m")

def create_backup(file_path):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.backup_{timestamp}"
    try:
        shutil.copy(file_path, backup_path)
        print(f"\033[94mCreated backup: {backup_path}\033[0m")
        return backup_path
    except Exception as e:
        print(f"\033[91mError creating backup: {e}\033[0m")
        return None

def find_and_replace_sentences(vocab_data, vocab2_data):
    changes = []
    words_not_found = []

    # Create a dictionary of correct sentences from vocab_database2.yaml
    vocab2_dict = {entry['word']: entry['back_cards'] for entry in vocab2_data if 'word' in entry}

    for entry in vocab_data:
        word = entry.get('word')
        if not word:
            continue

        back_cards = entry.get('back_cards', [])
        vocab2_back_cards = vocab2_dict.get(word, [])

        if not vocab2_back_cards:
            words_not_found.append(word)
            continue

        for i, card in enumerate(back_cards):
            example = card.get('example_en', '')
            if 'â€™' in example:
                # Find matching sentence in vocab2 by definition
                for vocab2_card in vocab2_back_cards:
                    if vocab2_card.get('definition_en') == card.get('definition_en'):
                        correct_example = vocab2_card.get('example_en')
                        changes.append({
                            'word': word,
                            'incorrect': example,
                            'correct': correct_example,
                            'index': i
                        })
                        break

    return changes, words_not_found

def main():
    print("\033[1;94m=== Sentence Correction Tool ===\033[0m")
    print("This script will:\n"
          "- Load vocab_database.yaml and vocab_database2.yaml\n"
          "- Identify sentences with 'â€™' in vocab_database.yaml\n"
          "- Find matching correct sentences from vocab_database2.yaml using word keys\n"
          "- Display proposed changes for review\n"
          "- Create a backup of vocab_database.yaml\n"
          "- Update vocab_database.yaml after user confirmation\n")

    # Load YAML files
    vocab_data = load_yaml_file('vocab_database.yaml')
    vocab2_data = load_yaml_file('vocab_database2.yaml')

    if not vocab_data or not vocab2_data:
        print("\033[91mAborting due to file loading errors.\033[0m")
        return

    # Find sentences to replace
    changes, words_not_found = find_and_replace_sentences(vocab_data, vocab2_data)

    # Display proposed changes
    if changes:
        print("\033[1;93mProposed Changes:\033[0m")
        print("-" * 50)
        for change in changes:
            print(f"\033[1mWord:\033[0m {change['word']}")
            print(f"\033[91mIncorrect:\033[0m {change['incorrect']}")
            print(f"\033[92mCorrect:\033[0m {change['correct']}")
            print("-" * 50)
    else:
        print("\033[93mNo sentences with 'â€™' found or no matching corrections available.\033[0m")

    # Display words not found in vocab_database2.yaml
    if words_not_found:
        print("\033[1;93mWords not found in vocab_database2.yaml:\033[0m")
        print(" - " + "\n - ".join(words_not_found))
        print("\033[93mThese words will remain unchanged due to missing entries.\033[0m")

    if not changes:
        print("\033[94mNo changes to apply. Exiting.\033[0m")
        return

    # Ask for user confirmation
    print("\n\033[1;94mDo you want to apply these changes? (y/n)\033[0m")
    response = input().strip().lower()
    if response != 'y':
        print("\033[93mChanges aborted by user.\033[0m")
        return

    # Create backup
    backup_path = create_backup('vocab_database.yaml')
    if not backup_path:
        print("\033[91mAborting due to backup failure.\033[0m")
        return

    # Apply changes
    for change in changes:
        word = change['word']
        index = change['index']
        correct = change['correct']
        for entry in vocab_data:
            if entry.get('word') == word:
                entry['back_cards'][index]['example_en'] = correct

    # Save updated file
    save_yaml_file(vocab_data, 'vocab_database.yaml')
    print("\033[1;92mUpdate complete! Original file backed up at:\033[0m", backup_path)

if __name__ == "__main__":
    main()
