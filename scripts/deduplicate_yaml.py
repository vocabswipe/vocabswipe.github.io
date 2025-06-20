import os
import yaml
from pathlib import Path
from tqdm import tqdm
import logging

# Configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent
YAML_DIR = PROJECT_ROOT / "data" / "words"
LETTERS = "abcdefghijklmnopqrstuvwxyz"

# Setup logging (console only, minimal output)
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[logging.StreamHandler()]
)

def validate_yaml_dir():
    """Validate that the YAML directory exists."""
    if not YAML_DIR.exists():
        logging.error(f"YAML directory does not exist: {YAML_DIR}")
        return False
    if not YAML_DIR.is_dir():
        logging.error(f"YAML directory is not a directory: {YAML_DIR}")
        return False
    
    yaml_files = list(YAML_DIR.glob("*.yaml"))
    if not yaml_files:
        logging.warning(f"No .yaml files found in {YAML_DIR}")
        return False
    logging.info(f"Found {len(yaml_files)} .yaml files in {YAML_DIR}")
    return True

def deduplicate_yaml_file(yaml_path, letter):
    """Deduplicate entries in a single .yaml file, keeping first occurrence."""
    original_entries = []
    deduplicated_entries = []
    seen_words = set()
    duplicates_removed = 0
    invalid_entries = 0

    try:
        with open(yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or []
            if not isinstance(data, list):
                logging.warning(f"Invalid format in {yaml_path}: expected a list")
                return 0, 0, 0, False
            original_entries = data

        for entry in original_entries:
            word = entry.get("word")
            if not isinstance(word, str):
                logging.warning(f"Invalid word type in {letter}.yaml: {word} (expected string)")
                invalid_entries += 1
                continue
            word = word.strip().lower()
            if not word:
                logging.warning(f"Empty word in {letter}.yaml")
                invalid_entries += 1
                continue
            if word in seen_words:
                logging.warning(f"Removed duplicate word '{word}' in {letter}.yaml")
                duplicates_removed += 1
                continue
            seen_words.add(word)
            deduplicated_entries.append(entry)

        # Write back deduplicated entries
        if deduplicated_entries != original_entries:
            with open(yaml_path, "w", encoding="utf-8") as f:
                yaml.safe_dump(deduplicated_entries, f, allow_unicode=True, sort_keys=False)
            logging.info(f"Updated {yaml_path}: removed {duplicates_removed} duplicates")
        
        return len(original_entries), len(deduplicated_entries), duplicates_removed, invalid_entries, True
    except Exception as e:
        logging.error(f"Error processing {yaml_path}: {e}")
        return 0, 0, 0, 0, False

def deduplicate_yaml_files():
    """Deduplicate all .yaml files with progress bar."""
    total_files = 0
    processed_files = 0
    total_entries = 0
    total_deduplicated = 0
    total_duplicates_removed = 0
    total_invalid_entries = 0
    failed_files = []

    if not validate_yaml_dir():
        return total_files, processed_files, total_entries, total_deduplicated, total_duplicates_removed, total_invalid_entries, failed_files

    yaml_files = [YAML_DIR / f"{letter}.yaml" for letter in LETTERS]
    total_files = len([f for f in yaml_files if f.exists()])

    with tqdm(total=total_files, desc="Deduplicating YAML files", unit="file", position=0, leave=True) as pbar:
        for letter in LETTERS:
            yaml_path = YAML_DIR / f"{letter}.yaml"
            if not yaml_path.exists():
                pbar.update(1)
                continue
            entries_count, dedup_count, dups_removed, invalid_count, success = deduplicate_yaml_file(yaml_path, letter)
            processed_files += 1
            total_entries += entries_count
            total_deduplicated += dedup_count
            total_duplicates_removed += dups_removed
            total_invalid_entries += invalid_count
            if not success:
                failed_files.append(letter)
            pbar.update(1)

    return total_files, processed_files, total_entries, total_deduplicated, total_duplicates_removed, total_invalid_entries, failed_files

def main():
    """Main function to deduplicate YAML files and report summary."""
    total_files, processed_files, total_entries, total_deduplicated, total_duplicates_removed, total_invalid_entries, failed_files = deduplicate_yaml_files()

    # Summary report
    logging.info("\n=== Deduplication Summary ===")
    logging.info(f"Total .yaml files found: {total_files}")
    logging.info(f"Files processed: {processed_files}")
    logging.info(f"Total entries processed: {total_entries}")
    logging.info(f"Deduplicated entries retained: {total_deduplicated}")
    logging.info(f"Duplicate entries removed: {total_duplicates_removed}")
    logging.info(f"Invalid entries skipped: {total_invalid_entries}")
    logging.info(f"Failed files: {len(failed_files)}")
    if failed_files:
        logging.warning("Failed files:")
        for letter in failed_files:
            logging.warning(f"  {letter}.yaml")
    
    if total_duplicates_removed == 0 and total_invalid_entries == 0 and not failed_files:
        logging.info("Success: No duplicates or invalid entries found!")
    else:
        logging.warning("Issues detected. Please review console output for details.")

if __name__ == "__main__":
    main()
