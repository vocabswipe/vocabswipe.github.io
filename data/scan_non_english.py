import yaml
import re
from colorama import init, Fore, Style
import os

# Initialize colorama for colored console output
init()

def is_non_english(text):
    """
    Check if the text contains non-English (non-ASCII) characters.
    Returns a list of non-ASCII characters found or an empty list if none.
    """
    non_english_chars = re.findall(r'[^\x00-\x7F]', text)
    return non_english_chars

def scan_yaml_for_non_english(file_path):
    """
    Scan the YAML file for non-English characters in word, definition_en, and example_en fields.
    Print results in a formatted, color-coded way.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            data = yaml.safe_load(file)
        
        if not data:
            print(f"{Fore.YELLOW}Warning: The YAML file is empty or invalid.{Style.RESET_ALL}")
            return
        
        print(f"\n{Fore.CYAN}=== Scanning {file_path} for Non-English Characters ==={Style.RESET_ALL}\n")
        issues_found = False
        
        for entry in data:
            # Check the 'word' field
            word = entry.get('word', '')
            non_english_in_word = is_non_english(word)
            if non_english_in_word:
                issues_found = True
                print(f"{Fore.RED}[Issue] Non-English characters found in 'word': {word}{Style.RESET_ALL}")
                print(f"  Characters: {', '.join(non_english_in_word)}")
            
            # Check each back_card's definition_en and example_en
            for card in entry.get('back_cards', []):
                definition = card.get('definition_en', '')
                example = card.get('example_en', '')
                
                # Check definition_en
                non_english_in_def = is_non_english(definition)
                if non_english_in_def:
                    issues_found = True
                    print(f"{Fore.RED}[Issue] Non-English characters found in 'definition_en' for word '{word}': {definition}{Style.RESET_ALL}")
                    print(f"  Characters: {', '.join(non_english_in_def)}")
                
                # Check example_en
                non_english_in_ex = is_non_english(example)
                if non_english_in_ex:
                    issues_found = True
                    print(f"{Fore.RED}[Issue] Non-English characters found in 'example_en' for word '{word}': {example}{Style.RESET_ALL}")
                    print(f"  Characters: {', '.join(non_english_in_ex)}")
        
        if not issues_found:
            print(f"{Fore.GREEN}No non-English characters found in the YAML file.{Style.RESET_ALL}")
        
    except FileNotFoundError:
        print(f"{Fore.RED}Error: File '{file_path}' not found.{Style.RESET_ALL}")
    except yaml.YAMLError as e:
        print(f"{Fore.RED}Error: Failed to parse YAML file - {e}{Style.RESET_ALL}")
    except Exception as e:
        print(f"{Fore.RED}Unexpected error: {e}{Style.RESET_ALL}")

def main():
    # File path for the YAML file in the same directory
    yaml_file = 'vocab3000_database.yaml'
    
    # Check if the file exists in the current directory
    if not os.path.exists(yaml_file):
        print(f"{Fore.RED}Error: '{yaml_file}' not found in the current directory.{Style.RESET_ALL}")
        return
    
    scan_yaml_for_non_english(yaml_file)
    print(f"\n{Fore.CYAN}=== Scan Complete ==={Style.RESET_ALL}")

if __name__ == "__main__":
    main()
