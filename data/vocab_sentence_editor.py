import yaml
import os
from typing import List, Dict
import shutil

def load_yaml_file(file_path: str) -> List[Dict]:
    """Load the YAML file and return its contents."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            data = yaml.safe_load(file)
        return data
    except FileNotFoundError:
        print("Error: 'vocab_database.yaml' file not found.")
        exit(1)
    except yaml.YAMLError as e:
        print(f"Error parsing YAML file: {e}")
        exit(1)

def save_yaml_file(file_path: str, data: List[Dict], backup_path: str = "vocab_database_backup.yaml") -> None:
    """Save the updated data to the YAML file with a backup."""
    try:
        # Create a backup of the original file
        if os.path.exists(file_path):
            shutil.copy(file_path, backup_path)
            print(f"Backup created at: {backup_path}")
        
        # Save the updated data
        with open(file_path, 'w', encoding='utf-8') as file:
            yaml.safe_dump(data, file, allow_unicode=True, sort_keys=False)
        print("Database successfully updated.")
    except Exception as e:
        print(f"Error saving YAML file: {e}")
        exit(1)

def find_word_by_rank(data: List[Dict], rank: int) -> Dict:
    """Find the word entry by rank."""
    for entry in data:
        if entry.get('rank') == rank:
            return entry
    return None

def display_sentences(back_cards: List[Dict]) -> None:
    """Display all sentences with numbering."""
    print("\nSentences for the selected word:")
    print("-" * 40)
    for idx, card in enumerate(back_cards, 1):
        print(f"{idx}. {card['example_en']}")
    print("-" * 40)

def get_valid_rank() -> int:
    """Prompt user for a valid rank number."""
    while True:
        try:
            rank = input("Enter the rank number of the word (e.g., 7): ").strip()
            rank = int(rank)
            if rank < 1:
                print("Please enter a positive number.")
                continue
            return rank
        except ValueError:
            print("Invalid input. Please enter a number.")

def get_valid_sentence_choice(max_choice: int) -> int:
    """Prompt user for a valid sentence number to edit."""
    while True:
        try:
            choice = input(f"Which sentence do you want to edit (1-{max_choice}, or 0 to cancel)? ").strip()
            choice = int(choice)
            if choice == 0:
                return 0
            if 1 <= choice <= max_choice:
                return choice
            print(f"Please enter a number between 1 and {max_choice}, or 0 to cancel.")
        except ValueError:
            print("Invalid input. Please enter a number.")

def main():
    """Main function to run the sentence editor."""
    file_path = "vocab_database.yaml"
    data = load_yaml_file(file_path)
    changes_made = []

    print("\n=== Vocabulary Sentence Editor ===")
    print("Welcome! Use this tool to edit sentences in the vocabulary database.")
    print("==================================\n")

    while True:
        # Get rank from user
        rank = get_valid_rank()
        word_entry = find_word_by_rank(data, rank)

        if word_entry is None:
            print(f"No word found with rank {rank}. Please try another rank.")
            continue

        word = word_entry['word']
        back_cards = word_entry['back_cards']
        print(f"\nWord: '{word}' (Rank: {rank})")

        # Display sentences
        display_sentences(back_cards)

        # Ask for edit choice
        choice = get_valid_sentence_choice(len(back_cards))
        if choice == 0:
            print("Edit cancelled.")
            continue

        # Get new sentence
        old_sentence = back_cards[choice - 1]['example_en']
        print(f"\nCurrent sentence: {old_sentence}")
        new_sentence = input("Enter the new sentence (or press Enter to keep unchanged): ").strip()
        
        if new_sentence and new_sentence != old_sentence:
            # Update the sentence
            back_cards[choice - 1]['example_en'] = new_sentence
            changes_made.append({
                'word': word,
                'rank': rank,
                'sentence_number': choice,
                'old_sentence': old_sentence,
                'new_sentence': new_sentence
            })
            print(f"Sentence {choice} updated successfully.")
        else:
            print("No changes made to the sentence.")

        # Ask if user wants to edit another sentence for the same word
        continue_same_word = input("\nEdit another sentence for this word? (y/n): ").strip().lower()
        if continue_same_word != 'y':
            # Ask if user wants to select another word
            another_word = input("Select another word to edit? (y/n): ").strip().lower()
            if another_word != 'y':
                break

    # Save changes if any
    if changes_made:
        save_yaml_file(file_path, data)
    else:
        print("\nNo changes were made to the database.")

    # Summary of changes
    print("\n=== Summary of Actions ===")
    if changes_made:
        print(f"Total changes made: {len(changes_made)}")
        for idx, change in enumerate(changes_made, 1):
            print(f"\nChange {idx}:")
            print(f"Word: {change['word']} (Rank: {change['rank']})")
            print(f"Sentence {change['sentence_number']}:")
            print(f"Old: {change['old_sentence']}")
            print(f"New: {change['new_sentence']}")
    else:
        print("No sentences were edited.")
    print("==========================")
    print("Thank you for using the Vocabulary Sentence Editor!")

if __name__ == "__main__":
    main()
