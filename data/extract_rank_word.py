import yaml
import csv
import os

# Define the input and output file paths
input_file = "vocab3000_database.yaml"
output_file = "vocab_ranks.csv"

# Check if the input file exists
if not os.path.exists(input_file):
    print(f"Error: The file {input_file} does not exist in the current directory.")
    exit(1)

# Read the YAML file and extract rank and word
data = []
try:
    with open(input_file, 'r') as file:
        yaml_data = yaml.safe_load(file)
        
        # Ensure yaml_data is a list of entries
        if not isinstance(yaml_data, list):
            print("Error: YAML file does not contain a list of entries.")
            exit(1)
        
        # Extract rank and word from each entry
        for entry in yaml_data:
            if isinstance(entry, dict) and 'rank' in entry and 'word' in entry:
                data.append({
                    'rank': entry['rank'],
                    'word': entry['word']
                })
            else:
                print(f"Warning: Skipping invalid entry: {entry}")

except yaml.YAMLError as e:
    print(f"Error parsing YAML file: {e}")
    exit(1)
except Exception as e:
    print(f"Unexpected error: {e}")
    exit(1)

# Write the extracted data to a CSV file
try:
    with open(output_file, 'w', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=['rank', 'word'])
        writer.writeheader()
        for item in data:
            writer.writerow(item)
    print(f"Successfully created {output_file} with {len(data)} entries.")
except Exception as e:
    print(f"Error writing CSV file: {e}")
    exit(1)
