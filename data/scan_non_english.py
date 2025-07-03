import yaml
import re
import colorama
from colorama import Fore, Style

# Initialize colorama for colored console output
colorama.init()

def is_chinese(text):
    """Check if text contains Chinese characters."""
    return bool(re.search(r'[\u4e00-\u9fff]', text))

def is_russian(text):
    """Check if text contains Russian Cyrillic characters."""
    return bool(re.search(r'[\u0400-\u04ff]', text))

def scan_yaml_for_non_english(file_path):
    """Scan YAML file for Chinese or Russian words in specific fields."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            data = yaml.safe_load(file)
        
        print(f"{Fore.CYAN}=== Scanning vocab3000_database.yaml for Non-English Words ==={Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")
        
        found_issues = False
        
        for entry in data:
            word = entry.get('word', '')
            back_cards = entry.get('back_cards', [])
            
            # Check the 'word' field
            if is_chinese(word) or is_russian(word):
                found_issues = True
                lang = "Chinese" if is_chinese(word) else "Russian"
                print(f"{Fore.RED}⚠️ Non-English Word Detected{Style.RESET_ALL}")
                print(f"  Word: {Fore.YELLOW}{word}{Style.RESET_ALL}")
                print(f"  Language: {Fore.MAGENTA}{lang}{Style.RESET_ALL}")
                print(f"  Rank: {entry.get('rank', 'N/A')}, Freq: {entry.get('freq', 'N/A')}")
                print(f"{Fore.CYAN}{'-'*50}{Style.RESET_ALL}")
            
            # Check 'definition_en' and 'example_en' in back_cards
            for card in back_cards:
                definition = card.get('definition_en', '')
                example = card.get('example_en', '')
                
                # Check definition_en
                if is_chinese(definition) or is_russian(definition):
                    found_issues = True
                    lang = "Chinese" if is_chinese(definition) else "Russian"
                    print(f"{Fore.RED}⚠️ Non-English Definition Detected{Style.RESET_ALL}")
                    print(f"  Word: {Fore.YELLOW}{word}{Style.RESET_ALL}")
                    print(f"  Definition: {Fore.YELLOW}{definition}{Style.RESET_ALL}")
                    print(f"  Language: {Fore.MAGENTA}{lang}{Style.RESET_ALL}")
                    print(f"  Audio File: {card.get('audio_file', 'N/A')}")
                    print(f"{Fore.CYAN}{'-'*50}{Style.RESET_ALL}")
                
                # Check example_en
                if is_chinese(example) or is_russian(example):
                    found_issues = True
                    lang = "Chinese" if is_chinese(example) else "Russian"
                    print(f"{Fore.RED}⚠️ Non-English Example Detected{Style.RESET_ALL}")
                    print(f"  Word: {Fore.YELLOW}{word}{Style.RESET_ALL}")
                    print(f"  Example: {Fore.YELLOW}{example}{Style.RESET_ALL}")
                    print(f"  Language: {Fore.MAGENTA}{lang}{Style.RESET_ALL}")
                    print(f"  Audio File: {card.get('audio_file', 'N/A')}")
                    print(f"{Fore.CYAN}{'-'*50}{Style.RESET_ALL}")
        
        if not found_issues:
            print(f"{Fore.GREEN}✓ No Chinese or Russian words found in the YAML file.{Style.RESET_ALL}")
        
        print(f"\n{Fore.CYAN}=== Scan Complete ==={Style.RESET_ALL}")
    
    except FileNotFoundError:
        print(f"{Fore.RED}Error: vocab3000_database.yaml not found in the current directory.{Style.RESET_ALL}")
    except yaml.YAMLError as e:
        print(f"{Fore.RED}Error: Invalid YAML format - {e}{Style.RESET_ALL}")
    except Exception as e:
        print(f"{Fore.RED}Error: An unexpected error occurred - {e}{Style.RESET_ALL}")

if __name__ == "__main__":
    scan_yaml_for_non_english("vocab3000_database.yaml")
