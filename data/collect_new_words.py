import json
import csv
import os

# Define file paths
json_file = 'new_words.json'
existing_csv = 'vocab_words.csv'
output_csv = 'new_vocab_words.csv'

# Function to read existing words from vocab_words.csv
def read_existing_words(csv_file):
    existing_words = set()
    if os.path.exists(csv_file):
        try:
            with open(csv_file, 'r', encoding='utf-8') as file:
                reader = csv.reader(file)
                next(reader, None)  # Skip header
                for row in reader:
                    if row:  # Ensure row is not empty
                        existing_words.add(row[0].strip())
        except Exception as e:
            print(f"Error reading {csv_file}: {e}")
    return existing_words

# Function to read words from JSON file
def read_json_words(json_file):
    try:
        with open(json_file, 'r', encoding='utf-8') as file:
            words = json.load(file)
            return [word.strip() for word in words if isinstance(word, str)]
    except FileNotFoundError:
        print(f"Error: The file {json_file} was not found.")
        return []
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON file: {e}")
        return []

# Function to save new words to CSV
def save_words_to_csv(words, csv_file):
    try:
        with open(csv_file, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow(['Word'])  # Write header
            for word in words:
                writer.writerow([word])
        print(f"New words successfully saved to {csv_file}")
    except Exception as e:
        print(f"Error writing to CSV file: {e}")

def main():
    # Check if JSON file exists
    if not os.path.exists(json_file):
        print(f"Error: {json_file} does not exist in the current directory.")
        return

    # Read existing words from vocab_words.csv
    existing_words = read_existing_words(existing_csv)

    # Read words from new_words.json
    json_words = read_json_words(json_file)

    # Filter out words that are already in vocab_words.csv
    new_words = [word for word in json_words if word not in existing_words]

    # Print new words to console
    if new_words:
        print("New words found:")
        for word in new_words:
            print(word)
    else:
        print("No new words found that aren't already in vocab_words.csv")
        return

    # Save new words to new_vocab_words.csv
    save_words_to_csv(new_words, output_csv)

if __name__ == "__main__":
    main()
