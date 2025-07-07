import yaml
import os
import re
from datetime import datetime

# Script Name: correct_word_capitalization.py
# Purpose: Scans a YAML database file for words that should be capitalized (e.g., proper nouns),
# prints example sentences for verification, prompts for confirmation, and corrects the words
# in the 'word' field. Creates a backup of the original file and saves the corrected file
# with the same name. Generates a summary report of changes.

def load_yaml_file(file_path):
    """Load the YAML file and return its contents."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return yaml.safe_load(file)
    except Exception as e:
        print(f"Error loading YAML file: {e}")
        return None

def save_yaml_file(data, file_path):
    """Save the data to a YAML file."""
    try:
        with open(file_path, 'w', encoding='utf-8') as file:
            yaml.safe_dump(data, file, allow_unicode=True, sort_keys=False)
        print(f"File saved successfully as {file_path}")
    except Exception as e:
        print(f"Error saving YAML file: {e}")

def create_backup_file(original_file):
    """Create a backup of the original file with a timestamp."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"{original_file}.backup_{timestamp}"
    try:
        with open(original_file, 'r', encoding='utf-8') as src:
            with open(backup_file, 'w', encoding='utf-8') as dst:
                dst.write(src.read())
        print(f"Backup created: {backup_file}")
        return backup_file
    except Exception as e:
        print(f"Error creating backup: {e}")
        return None

def is_proper_noun(word):
    """Check if the word should be capitalized (e.g., months, names, etc.)."""
    # List of common proper nouns that should be capitalized
    proper_nouns = [
        'january', 'february', 'march', 'april', 'may', 'june', 'july',
        'august', 'september', 'october', 'november', 'december',
        # Add more proper nouns as needed (e.g., names, places)
    ]
    return word.lower() in proper_nouns

def collect_example_sentences(data, word_entry):
    """Collect all example_en sentences for a given word entry."""
    return [card['example_en'] for card in word_entry['back_cards'] if 'example_en' in card]

def print_summary_table(changes):
    """Print a summary table of original and corrected words."""
    if not changes:
        print("\nNo changes proposed.")
        return
    print("\nSummary of Proposed Changes:")
    print("-" * 40)
    print(f"{'Rank':<8} {'Original Word':<15} {'Corrected Word':<15}")
    print("-" * 40)
    for change in changes:
        print(f"{change['rank']:<8} {change['original']:<15} {change['corrected']:<15}")
    print("-" * 40)

def correct_word_capitalization(file_path):
    """Main function to scan and correct word capitalization in the YAML file."""
    # Load the YAML file
    data = load_yaml_file(file_path)
    if not data:
        return

    # List to store proposed changes
    changes = []

    # Iterate through each entry in the YAML file (sorted by rank)
    for entry in sorted(data, key=lambda x: x['rank']):
        word = entry.get('word', '')
        rank = entry.get('rank', 0)

        # Check if the word is a proper noun that needs capitalization
        if is_proper_noun(word) and not word[0].isupper():
            # Collect example sentences
            examples = collect_example_sentences(entry, word)
            
            # Print word details and example sentences
            print(f"\nFound word that needs capitalization:")
            print(f"Rank: {rank}")
            print(f"Word: {word}")
            print("Example Sentences:")
            for i, example in enumerate(examples, 1):
                print(f"  {i}. {example}")
            
            # Suggest correction
            corrected_word = word.capitalize()
            print(f"Suggested correction: {word} -> {corrected_word}")
            
            # Prompt for confirmation
            while True:
                response = input("Do you confirm this change? (y/n): ").strip().lower()
                if response in ['y', 'n']:
                    break
                print("Please enter 'y' for yes or 'n' for no.")

            if response == 'y':
                # Store the change for the summary
                changes.append({
                    'rank': rank,
                    'original': word,
                    'corrected': corrected_word,
                    'entry': entry  # Reference to the entry for later update
                })
            else:
                print(f"Skipping correction for '{word}'.")

    # Print summary of proposed changes
    print_summary_table(changes)

    # Ask for final confirmation to apply all changes
    if changes:
        while True:
            final_response = input("\nDo you agree to apply all proposed changes? (y/n): ").strip().lower()
            if final_response in ['y', 'n']:
                break
            print("Please enter 'y' for yes or 'n' for no.")

        if final_response == 'y':
            # Create a backup of the original file
            backup_file = create_backup_file(file_path)
            if not backup_file:
                print("Failed to create backup. Aborting changes.")
                return

            # Apply the changes
            for change in changes:
                change['entry']['word'] = change['corrected']
            
            # Save the corrected file
            save_yaml_file(data, file_path)
            print("\nAll changes applied successfully!")
        else:
            print("\nNo changes applied to the file.")
    else:
        print("\nNo changes were needed or approved.")

def main():
    """Entry point of the script."""
    file_path = 'vocab3000_database.yaml'
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} does not exist.")
        return
    correct_word_capitalization(file_path)

if __name__ == "__main__":
    main()
