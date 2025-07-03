import yaml
import re
import os
from typing import List, Dict
import sys

def is_non_english(text: str) -> bool:
    """
    Check if the text contains non-English characters (outside ASCII letters, numbers, and basic punctuation).
    Returns True if non-English characters are found.
    """
    # Regex to match non-English characters (outside ASCII letters, numbers, and common punctuation)
    non_english_pattern = r'[^\x00-\x7F]'
    return bool(re.search(non_english_pattern, text))

def scan_yaml_for_non_english(file_path: str) -> List[Dict]:
    """
    Scan the YAML file for non-English characters in word, definition_en, and example_en fields.
    Returns a list of dictionaries containing details of non-English findings.
    """
    findings = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            data = yaml.safe_load(file)
            
        if not isinstance(data, list):
            print("Error: YAML file does not contain a list of entries.")
            return findings
            
        for entry in data:
            word = entry.get('word', '')
            back_cards = entry.get('back_cards', [])
            
            # Check the 'word' field
            if is_non_english(word):
                findings.append({
                    'word': word,
                    'field': 'word',
                    'value': word,
                    'entry_rank': entry.get('rank', 'Unknown')
                })
            
            # Check each back_card's definition_en and example_en
            for card in back_cards:
                definition = card.get('definition_en', '')
                example = card.get('example_en', '')
                
                if is_non_english(definition):
                    findings.append({
                        'word': word,
                        'field': 'definition_en',
                        'value': definition,
                        'entry_rank': entry.get('rank', 'Unknown')
                    })
                
                if is_non_english(example):
                    findings.append({
                        'word': word,
                        'field': 'example_en',
                        'value': example,
                        'entry_rank': entry.get('rank', 'Unknown')
                    })
                    
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
    except yaml.YAMLError as e:
        print(f"Error: Failed to parse YAML file - {e}")
    except Exception as e:
        print(f"Error: An unexpected error occurred - {e}")
    
    return findings

def print_findings(findings: List[Dict]):
    """
    Print the findings in a formatted, user-friendly way to the console.
    """
    # Console UI/UX design
    terminal_width = os.get_terminal_size().columns if hasattr(os, 'get_terminal_size') else 80
    separator = "=" * terminal_width
    half_separator = "-" * (terminal_width // 2)

    print("\n" + separator)
    print("🔍 Non-English Character Scanner Results".center(terminal_width))
    print(separator + "\n")

    if not findings:
        print("✅ No non-English characters found in the YAML file.".center(terminal_width))
        print("\n" + separator)
        return

    print(f"Found {len(findings)} instance(s) of non-English characters:\n")
    
    for i, finding in enumerate(findings, 1):
        print(half_separator)
        print(f"Finding #{i}:")
        print(f"  Word: {finding['word']}")
        print(f"  Rank: {finding['entry_rank']}")
        print(f"  Field: {finding['field']}")
        print(f"  Value: {finding['value']}")
        print(half_separator + "\n")
    
    print(separator)

def main():
    """
    Main function to run the non-English character scanner.
    """
    yaml_file = 'vocab3000_database.yaml'
    
    # Check if the YAML file exists in the current directory
    if not os.path.exists(yaml_file):
        print(f"Error: '{yaml_file}' not found in the current directory.")
        sys.exit(1)
    
    # Scan the YAML file
    findings = scan_yaml_for_non_english(yaml_file)
    
    # Print the results
    print_findings(findings)

if __name__ == "__main__":
    main()
