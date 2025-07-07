import yaml
import os

# Dictionary of words and ranks to replace
replacements = {
    1029: "July"
}

def replace_words_in_yaml(input_file, output_file):
    # List to store successfully replaced words
    replaced_words = []
    
    try:
        # Read the YAML file
        with open(input_file, 'r', encoding='utf-8') as file:
            data = yaml.safe_load(file)
        
        # Process each entry in the YAML data
        for entry in data:
            if isinstance(entry, dict) and 'rank' in entry and 'word' in entry:
                rank = entry['rank']
                if rank in replacements:
                    old_word = entry['word']
                    new_word = replacements[rank]
                    entry['word'] = new_word
                    replaced_words.append((old_word, new_word))
                    # Update word_audio_file to match new word
                    entry['word_audio_file'] = f"{new_word}.mp3"
        
        # Write the modified data back to the file
        with open(output_file, 'w', encoding='utf-8') as file:
            yaml.safe_dump(data, file, allow_unicode=True, sort_keys=False)
        
        # Print successfully replaced words
        print("Words successfully replaced:")
        for old, new in replaced_words:
            print(f"'{old}' -> '{new}'")
        
        print(f"\nDatabase file '{output_file}' successfully edited.")
        
    except FileNotFoundError:
        print(f"Error: The file '{input_file}' was not found.")
    except yaml.YAMLError as e:
        print(f"Error parsing YAML file: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    input_file = "vocab3000_database.yaml"
    output_file = "vocab3000_database.yaml"  # Overwrite the same file
    replace_words_in_yaml(input_file, output_file)
