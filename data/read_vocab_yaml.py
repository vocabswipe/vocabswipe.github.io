import yaml
import csv
import os

# Define the path to the YAML file and the output CSV file
yaml_file = 'vocab_database.yaml'
csv_file = 'vocab_words.csv'

# Function to read YAML and extract words
def extract_words_from_yaml(yaml_file):
    words = []
    try:
        with open(yaml_file, 'r', encoding='utf-8') as file:
            data = yaml.safe_load(file)
            # Iterate through each entry in the YAML file
            for entry in data:
                if 'word' in entry:
                    words.append(entry['word'])
                    print(entry['word'])  # Print the word to console
    except FileNotFoundError:
        print(f"Error: The file {yaml_file} was not found.")
    except yaml.YAMLError as e:
        print(f"Error parsing YAML file: {e}")
    return words

# Function to save words to CSV
def save_words_to_csv(words, csv_file):
    try:
        with open(csv_file, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            # Write header
            writer.writerow(['Word'])
            # Write each word as a row
            for word in words:
                writer.writerow([word])
        print(f"Words successfully saved to {csv_file}")
    except Exception as e:
        print(f"Error writing to CSV file: {e}")

def main():
    # Ensure the YAML file exists
    if not os.path.exists(yaml_file):
        print(f"Error: {yaml_file} does not exist in the current directory.")
        return
    
    # Extract words and print them
    print("Extracted words:")
    words = extract_words_from_yaml(yaml_file)
    
    # Save words to CSV
    if words:
        save_words_to_csv(words, csv_file)
    else:
        print("No words found in the database.")

if __name__ == "__main__":
    main()
