# File name: update_vocab_database.py

import pandas as pd
import yaml
import os

# Read the CSV file
csv_file = 'COCA_WordFrequency_no_duplicates.csv'
df = pd.read_csv(csv_file)

# Convert CSV data to a dictionary for easy lookup
freq_dict = dict(zip(df['word'], zip(df['rank'], df['freq'])))

# Read the YAML file
yaml_file = 'vocab_database.yaml'
with open(yaml_file, 'r') as file:
    vocab_data = yaml.safe_load(file)

# Update ranks and frequencies in the YAML data
updated_count = 0
for entry in vocab_data:
    word = entry['word']
    if word in freq_dict:
        # Update rank and freq from CSV
        entry['rank'], entry['freq'] = freq_dict[word]
        updated_count += 1
    else:
        print(f"Warning: Word '{word}' not found in CSV file")

# Confirm updates
total_entries = len(vocab_data)
print(f"\nUpdated {updated_count} out of {total_entries} entries")
print(f"Words in YAML: {[entry['word'] for entry in vocab_data]}")
print(f"Words in CSV: {list(freq_dict.keys())}")

# Overwrite the original YAML file with updated data
with open(yaml_file, 'w') as file:
    yaml.safe_dump(vocab_data, file, sort_keys=False)
print(f"\nUpdated YAML file saved as: {yaml_file}")

# Verify the updated YAML file
with open(yaml_file, 'r') as file:
    updated_vocab_data = yaml.safe_load(file)
print("\nVerification of updated YAML:")
for entry in updated_vocab_data:
    word = entry['word']
    rank = entry['rank']
    freq = entry['freq']
    print(f"Word: {word}, Rank: {rank}, Freq: {freq}")
