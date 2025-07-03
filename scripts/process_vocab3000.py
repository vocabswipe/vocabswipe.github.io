import os
import json
import yaml
import boto3
import time
import logging
import re
import shutil
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, BarColumn, TextColumn, SpinnerColumn

# Initialize rich console
console = Console()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'vocab3000_processing.log'), encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Define paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEMP_VOCAB_JSONL_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'temp_vocab3000.jsonl')
TEMP_VOCAB_LOG_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'temp_vocab3000_log.yaml')
VOCAB_DB_PATH = os.path.join(BASE_DIR, 'data', 'vocab3000_database.yaml')
AUDIO_FRONT_DIR = os.path.join(BASE_DIR, 'data', 'audio', 'front')
AUDIO_BACK_DIR = os.path.join(BASE_DIR, 'data', 'audio', 'back')
REPORTS_DIR = os.path.join(BASE_DIR, 'data', 'reports')
BACKUP_JSONL_PATH = os.path.join(BASE_DIR, 'data', 'temp', f'backup_vocab3000_{time.strftime("%Y%m%d_%H%M%S")}.jsonl')
CORRECTED_JSONL_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'corrected_vocab3000.jsonl')

# Ensure directories exist
os.makedirs(AUDIO_FRONT_DIR, exist_ok=True)
os.makedirs(AUDIO_BACK_DIR, exist_ok=True)
os.makedirs(os.path.dirname(TEMP_VOCAB_JSONL_PATH), exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

# Initialize AWS Polly client
try:
    polly_client = boto3.client('polly', region_name='us-east-1')
    logger.info("AWS Polly client initialized successfully.")
    console.print("[green]✓ Neural Audio Synthesis Engine Online[/green]")
except Exception as e:
    logger.error(f"Failed to initialize AWS Polly client: {e}")
    console.print(Panel(f"[red]Alert: Failed to initialize Neural Audio Synthesis Engine\nError: {e}[/red]", title="System Error", border_style="red"))
    raise

FAVORITE_VOICES = ['Matthew']

# Regex to detect non-English (non-Latin) words
NON_ENGLISH_PATTERN = re.compile(r'[\u4e00-\u9fff\u0400-\u04ff\u0e00-\u0e7f]')

def is_non_english(word):
    """Check if a word contains non-Latin characters (e.g., Chinese, Russian, Thai)."""
    return bool(NON_ENGLISH_PATTERN.search(word))

def load_file(filename, file_type='jsonl'):
    """Load a file (JSONL or YAML) with error handling and JSONL correction."""
    logger.info(f"Loading: {filename}")
    try:
        if file_type == 'jsonl':
            entries = []
            corrections = []
            errors = []
            line_count = 0
            invalid_line_count = 0
            non_english_words = []

            if os.path.exists(filename):
                shutil.copy(filename, BACKUP_JSONL_PATH)
                logger.info(f"Backup created at: {BACKUP_JSONL_PATH}")
                console.print(f"[cyan]✓ Backup created: {BACKUP_JSONL_PATH}[/cyan]")

            with open(filename, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                line_count = len(lines)

            for i, line in enumerate(lines, 1):
                line = line.strip()
                if not line:
                    continue

                try:
                    entry = json.loads(line)
                    if is_non_english(entry['word']):
                        non_english_words.append((i, entry['word']))
                        logger.warning(f"Line {i} contains non-English word: {entry['word']}")
                        continue
                    entries.append(entry)
                except json.JSONDecodeError as e:
                    logger.warning(f"Line {i} invalid JSON: {line} - Error: {e}")
                    invalid_line_count += 1
                    original_line = line
                    fixed_line = re.sub(r"(?<!\\)'(?=.*')", r'"', line)
                    fixed_line = fixed_line.replace('}{', '},{').replace(',]', ']').replace(',}', '}')
                    fixed_line = re.sub(r"(?<!\\)'([^']*?)(?<!\\)'", r'"\1"', fixed_line)
                    try:
                        entry = json.loads(fixed_line)
                        if is_non_english(entry['word']):
                            non_english_words.append((i, entry['word']))
                            logger.warning(f"Line {i} contains non-English word: {entry['word']}")
                            continue
                        entries.append(entry)
                        corrections.append((i, original_line, fixed_line, str(e)))
                        logger.info(f"Line {i} fixed: {original_line} -> {fixed_line}")
                    except json.JSONDecodeError as e2:
                        errors.append((i, original_line, str(e2)))
                        logger.error(f"Line {i} unfixable: {original_line} - Error: {e2}")

            if corrections:
                with open(CORRECTED_JSONL_PATH, 'w', encoding='utf-8') as f:
                    for entry in entries:
                        json.dump(entry, f, ensure_ascii=False)
                        f.write('\n')
                logger.info(f"Corrected JSONL saved to: {CORRECTED_JSONL_PATH}")
                console.print(f"[green]✓ Corrected JSONL saved: {CORRECTED_JSONL_PATH}[/green]")

            if non_english_words:
                table = Table(title="⚠ Non-English Words Skipped", style="yellow", show_lines=True)
                table.add_column("Line", style="bold")
                table.add_column("Word", justify="left")
                for line_num, word in non_english_words:
                    table.add_row(str(line_num), word)
                console.print(table)
                console.print(Panel(
                    f"[yellow]⚠ {len(non_english_words)} non-English words skipped.[/yellow]",
                    title="Non-English Words", border_style="yellow", expand=False
                ))

            if corrections:
                table = Table(title="📝 JSONL Corrections Report", style="cyan", show_lines=True)
                table.add_column("Line", style="bold")
                table.add_column("Original", justify="left")
                table.add_column("Corrected", justify="left")
                table.add_column("Error", justify="left")
                for line_num, orig, fixed, err in corrections:
                    table.add_row(str(line_num), orig[:50] + ('...' if len(orig) > 50 else ''), fixed[:50] + ('...' if len(fixed) > 50 else ''), err[:50] + ('...' if len(err) > 50 else ''))
                console.print(table)

            if errors:
                table = Table(title="⚠ JSONL Unfixable Errors", style="red", show_lines=True)
                table.add_column("Line", style="bold")
                table.add_column("Content", justify="left")
                table.add_column("Error", justify="left")
                for line_num, content, err in errors:
                    table.add_row(str(line_num), content[:50] + ('...' if len(content) > 50 else ''), err[:50] + ('...' if len(err) > 50 else ''))
                console.print(table)
                console.print(Panel(
                    f"[yellow]⚠ {len(errors)} lines could not be fixed.\nBackup: {BACKUP_JSONL_PATH}[/yellow]",
                    title="Warning", border_style="yellow", expand=False
                ))

            if line_count > 0 and (invalid_line_count / line_count) > 0.5:
                console.print(Panel(
                    f"[red]✗ Over 50% of lines ({invalid_line_count}/{line_count}) invalid.\n"
                    f"Backup: {BACKUP_JSONL_PATH}\nPlease fix and retry.[/red]",
                    title="Critical Error", border_style="red", expand=False
                ))
                logger.error("Too many invalid lines. Suggesting manual edit.")
                return []

            return entries

        with open(filename, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f) or []
            if isinstance(data, list):
                non_english_words = [(i, entry['word']) for i, entry in enumerate(data) if is_non_english(entry['word'])]
ಮ

System: * Today's date and time is 08:41 PM +07 on Thursday, July 03, 2025.

Here's the fully updated and optimized Python code for `process_vocab3000.py`, incorporating all the specified changes:

```python
import os
import json
import yaml
import boto3
import time
import logging
import re
import shutil
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, BarColumn, TextColumn, SpinnerColumn

# Initialize rich console
console = Console()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'vocab3000_processing.log'), encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Define paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEMP_VOCAB_JSONL_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'temp_vocab3000.jsonl')
TEMP_VOCAB_LOG_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'temp_vocab3000_log.yaml')
VOCAB_DB_PATH = os.path.join(BASE_DIR, 'data', 'vocab3000_database.yaml')
AUDIO_FRONT_DIR = os.path.join(BASE_DIR, 'data', 'audio', 'front')
AUDIO_BACK_DIR = os.path.join(BASE_DIR, 'data', 'audio', 'back')
REPORTS_DIR = os.path.join(BASE_DIR, 'data', 'reports')
BACKUP_JSONL_PATH = os.path.join(BASE_DIR, 'data', 'temp', f'backup_vocab3000_{time.strftime("%Y%m%d_%H%M%S")}.jsonl')
CORRECTED_JSONL_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'corrected_vocab3000.jsonl')

# Ensure directories exist
os.makedirs(AUDIO_FRONT_DIR, exist_ok=True)
os.makedirs(AUDIO_BACK_DIR, exist_ok=True)
os.makedirs(os.path.dirname(TEMP_VOCAB_JSONL_PATH), exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

# Initialize AWS Polly client
try:
    polly_client = boto3.client('polly', region_name='us-east-1')
    logger.info("AWS Polly client initialized successfully.")
    console.print("[green]✓ Neural Audio Synthesis Engine Online[/green]")
except Exception as e:
    logger.error(f"Failed to initialize AWS Polly client: {e}")
    console.print(Panel(f"[red]Alert: Failed to initialize Neural Audio Synthesis Engine\nError: {e}[/red]", title="System Error", border_style="red"))
    raise

FAVORITE_VOICES = ['Matthew']

# Regex to detect non-English (non-Latin) characters
NON_ENGLISH_PATTERN = re.compile(r'[\u4e00-\u9fff\u0400-\u04ff\u0e00-\u0e7f]')

def is_non_english(word):
    """Check if a word contains non-Latin characters (e.g., Chinese, Russian, Thai)."""
    return bool(NON_ENGLISH_PATTERN.search(word))

def load_file(filename, file_type='jsonl'):
    """Load a file (JSONL or YAML) with error handling and JSONL correction."""
    logger.info(f"Loading: {filename}")
    try:
        if file_type == 'jsonl':
            entries = []
            corrections = []
            errors = []
            line_count = 0
            invalid_line_count = 0
            non_english_words = []

            if os.path.exists(filename):
                shutil.copy(filename, BACKUP_JSONL_PATH)
                logger.info(f"Backup created at: {BACKUP_JSONL_PATH}")
                console.print(f"[cyan]✓ Backup created: {BACKUP_JSONL_PATH}[/cyan]")

            with open(filename, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                line_count = len(lines)

            for i, line in enumerate(lines, 1):
                line = line.strip()
                if not line:
                    continue

                try:
                    entry = json.loads(line)
                    if is_non_english(entry['word']):
                        non_english_words.append((i, entry['word']))
                        logger.warning(f"Line {i} contains non-English word: {entry['word']}")
                        continue
                    entries.append(entry)
                except json.JSONDecodeError as e:
                    logger.warning(f"Line {i} invalid JSON: {line} - Error: {e}")
                    invalid_line_count += 1
                    original_line = line
                    fixed_line = re.sub(r"(?<!\\)'(?=.*')", r'"', line)
                    fixed_line = fixed_line.replace('}{', '},{').replace(',]', ']').replace(',}', '}')
                    fixed_line = re.sub(r"(?<!\\)'([^']*?)(?<!\\)'", r'"\1"', fixed_line)
                    try:
                        entry = json.loads(fixed_line)
                        if is_non_english(entry['word']):
                            non_english_words.append((i, entry['word']))
                            logger.warning(f"Line {i} contains non-English word: {entry['word']}")
                            continue
                        entries.append(entry)
                        corrections.append((i, original_line, fixed_line, str(e)))
                        logger.info(f"Line {i} fixed: {original_line} -> {fixed_line}")
                    except json.JSONDecodeError as e2:
                        errors.append((i, original_line, str(e2)))
                        logger.error(f"Line {i} unfixable: {original_line} - Error: {e2}")

            if corrections:
                with open(CORRECTED_JSONL_PATH, 'w', encoding='utf-8') as f:
                    for entry in entries:
                        json.dump(entry, f, ensure_ascii=False)
                        f.write('\n')
                logger.info(f"Corrected JSONL saved to: {CORRECTED_JSONL_PATH}")
                console.print(f"[green]✓ Corrected JSONL saved: {CORRECTED_JSONL_PATH}[/green]")

            if non_english_words:
                table = Table(title="⚠ Non-English Words Skipped", style="yellow", show_lines=True)
                table.add_column("Line", style="bold")
                table.add_column("Word", justify="left")
                for line_num, word in non_english_words:
                    table.add_row(str(line_num), word)
                console.print(table)
                console.print(Panel(
                    f"[yellow]⚠ {len(non_english_words)} non-English words skipped.[/yellow]",
                    title="Non-English Words", border_style="yellow", expand=False
                ))

            if corrections:
                table = Table(title="📝 JSONL Corrections Report", style="cyan", show_lines=True)
                table.add_column("Line", style="bold")
                table.add_column("Original", justify="left")
                table.add_column("Corrected", justify="left")
                table.add_column("Error", justify="left")
                for line_num, orig, fixed, err in corrections:
                    table.add_row(str(line_num), orig[:50] + ('...' if len(orig) > 50 else ''), fixed[:50] + ('...' if len(fixed) > 50 else ''), err[:50] + ('...' if len(err) > 50 else ''))
                console.print(table)

            if errors:
                table = Table(title="⚠ JSONL Unfixable Errors", style="red", show_lines=True)
                table.add_column("Line", style="bold")
                table.add_column("Content", justify="left")
                table.add_column("Error", justify="left")
                for line_num, content, err in errors:
                    table.add_row(str(line_num), content[:50] + ('...' if len(content) > 50 else ''), err[:50] + ('...' if len(err) > 50 else ''))
                console.print(table)
                console.print(Panel(
                    f"[yellow]⚠ {len(errors)} lines could not be fixed.\nBackup: {BACKUP_JSONL_PATH}[/yellow]",
                    title="Warning", border_style="yellow", expand=False
                ))

            if line_count > 0 and (invalid_line_count / line_count) > 0.5:
                console.print(Panel(
                    f"[red]✗ Over 50% of lines ({invalid_line_count}/{line_count}) invalid.\n"
                    f"Backup: {BACKUP_JSONL_PATH}\nPlease fix and retry.[/red]",
                    title="Critical Error", border_style="red", expand=False
                ))
                logger.error("Too many invalid lines. Suggesting manual edit.")
                return []

            return entries

        with open(filename, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f) or []
    except FileNotFoundError:
        logger.warning(f"{filename} not found. Using default structure.")
        return [] if file_type == 'jsonl' else []
    except (yaml.YAMLError, json.JSONDecodeError) as e:
        logger.error(f"Error parsing '{filename}': {e}")
        return [] if file_type == 'jsonl' else []

def save_file(data, filename, file_type='yaml'):
    """Save data to a file (JSON or YAML)."""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            if file_type == 'json':
                json.dump(data, f, ensure_ascii=False, indent=2)
            elif file_type == 'jsonl':
                for entry in data:
                    json.dump(entry, f, ensure_ascii=False)
                    f.write('\n')
            else:
                yaml.safe_dump(data, f, allow_unicode=True)
        logger.info(f"Successfully saved: {filename}")
    except Exception as e:
        logger.error(f"Error saving '{filename}': {e}")
        raise

def append_to_log(entries):
    """Append entries to the log file."""
    if not os.path.exists(TEMP_VOCAB_LOG_PATH):
        logger.info(f"Creating blank {TEMP_VOCAB_LOG_PATH}")
        save_file([], TEMP_VOCAB_LOG_PATH, file_type='yaml')
    
    existing_log = load_file(TEMP_VOCAB_LOG_PATH, file_type='yaml')
    if not isinstance(existing_log, list):
        logger.warning(f"{TEMP_VOCAB_LOG_PATH} is not a list. Initializing as empty list.")
        existing_log = []
    existing_log.extend(entries)
    save_file(existing_log, TEMP_VOCAB_LOG_PATH, file_type='yaml')
    logger.info(f"Appended {len(entries)} entries to {TEMP_VOCAB_LOG_PATH}")

def generate_audio(text, output_path, voice_id, use_ssml=False):
    """Generate audio using AWS Polly."""
    try:
        response = polly_client.synthesize_speech(
            Text=text,
            TextType='ssml' if use_ssml else 'text',
            OutputFormat='mp3',
            VoiceId=voice_id,
            Engine='neural'
        )
        with open(output_path, 'wb') as f:
            f.write(response['AudioStream'].read())
        logger.info(f"Generated audio for '{text}' at {output_path}")
        return True
    except Exception as e:
        logger.error(f"Error generating audio for '{text}': {e}")
        console.print(f"[red]⚠ Audio Generation Failed for '{text}'[/red]")
        return False

def validate_entry(entry):
    """Validate a single JSONL entry."""
    required_fields = ['word', 'back_cards']
    if not all(field in entry for field in required_fields):
        logger.warning(f"Invalid entry - missing fields: {entry}")
        return False
    if not isinstance(entry['back_cards'], list) or len(entry['back_cards']) != 5:
        logger.warning(f"Invalid entry - back_cards invalid: {entry}")
        return False
    for card in entry['back_cards']:
        if not all(k in card for k in ['definition_en', 'example_en']):
            logger.warning(f"Invalid back_card in entry: {entry}")
            return False
    return True

def get_audio_filename(word, text, prefix):
    """Generate a unique filename for audio files."""
    safe_word = word.lower().replace(' ', '_')
    if prefix == 'word':
        return f"{safe_word}.mp3"
    else:
        safe_text = re.sub(r'[^\w\s]', '', text).replace(' ', '_')
        return f"{safe_word}_{safe_text}.mp3"

def check_duplicate_sentences(vocab_db):
    """Check and remove duplicate example sentences within each word's back_cards."""
    duplicate_sentences = []
    removed_sentence_count = 0

    for entry in vocab_db:
        word_lower = entry['word'].lower()
        seen_examples = {}
        unique_back_cards = []
        for card in entry['back_cards']:
            example = card['example_en']
            if example in seen_examples:
                duplicate_sentences.append({
                    'word': entry['word'],
                    'example_en': example,
                    'audio_file': card.get('audio_file', '')
                })
                removed_sentence_count += 1
                audio_path = os.path.join(AUDIO_BACK_DIR, word_lower, card.get('audio_file', '')) if card.get('audio_file') else ''
                if audio_path and os.path.exists(audio_path):
                    try:
                        os.remove(audio_path)
                        logger.info(f"Deleted duplicate sentence audio: {audio_path}")
                    except OSError as e:
                        logger.error(f"Error deleting duplicate sentence audio {audio_path}: {e}")
            else:
                seen_examples[example] = card
                unique_back_cards.append(card)
        entry['back_cards'] = unique_back_cards

    if duplicate_sentences:
        table = Table(title="⚠ Duplicate Example Sentences Removed", style="red", show_lines=True)
        table.add_column("Word", style="bold")
        table.add_column("Duplicate Sentence", justify="left")
        table.add_column("Audio File", justify="left")
        for dup in duplicate_sentences:
            table.add_row(
                dup['word'],
                dup['example_en'][:50] + ('...' if len(dup['example_en']) > 50 else ''),
                dup['audio_file'][:50] + ('...' if len(dup['audio_file']) > 50 else '')
            )
        console.print(table)
        console.print(Panel(
            f"[yellow]⚠ {len(duplicate_sentences)} duplicate sentences removed.[/yellow]",
            title="Duplicate Sentences Report", border_style="yellow", expand=False
        ))

    return duplicate_sentences, removed_sentence_count

def check_duplicates(vocab_db):
    """Check and remove duplicate word entries, keeping the entry with the most back_cards."""
    word_to_entries = {}
    for i, entry in enumerate(vocab_db):
        word_lower = entry['word'].lower()
        if word_lower not in word_to_entries:
            word_to_entries[word_lower] = []
        word_to_entries[word_lower].append((i, entry))

    duplicates = []
    removed_count = 0
    redundant_audio_files = []

    for word_lower, entries in word_to_entries.items():
        if len(entries) > 1:
            for index, entry in entries:
                duplicates.append({
                    'index': index,
                    'word': entry['word'],
                    'back_cards_count': len(entry['back_cards']),
                    'word_audio_file': entry.get('word_audio_file', ''),
                    'sentence_audio_files': [card.get('audio_file', '') for card in entry['back_cards']],
                    'voice_id': entry.get('voice_id', '')
                })
            entries.sort(key=lambda x: len(x[1]['back_cards']), reverse=True)
            keep_index, keep_entry = entries[0]
            entries_to_remove = entries[1:]
            for index, entry in entries_to_remove:
                removed_count += 1
                word_audio = entry.get('word_audio_file', '')
                if word_audio:
                    redundant_audio_files.append(os.path.join(AUDIO_FRONT_DIR, word_audio))
                for card in entry['back_cards']:
                    audio_file = card.get('audio_file', '')
                    if audio_file:
                        redundant_audio_files.append(os.path.join(AUDIO_BACK_DIR, entry['word'].lower(), audio_file))
            for index, _ in reversed(entries_to_remove):
                vocab_db.pop(index)

    for audio_file in redundant_audio_files:
        if os.path.exists(audio_file):
            try:
                os.remove(audio_file)
                logger.info(f"Deleted redundant audio file: {audio_file}")
            except OSError as e:
                logger.error(f"Error deleting audio file {audio_file}: {e}")

    if duplicates:
        table = Table(title="⚠ Duplicate Word Entries Detected", style="red", show_lines=True)
        table.add_column("Index", style="bold")
        table.add_column("Word", justify="left")
        table.add_column("Back Cards", justify="right")
        table.add_column("Word Audio File", justify="left")
        table.add_column("Sentence Audio Files", justify="left")
        table.add_column("Voice ID", justify="left")
        table.add_column("Status", justify="left")
        for dup in duplicates:
            status = "[green]Kept[/green]" if dup['index'] == min(d['index'] for d in duplicates if d['word'].lower() == dup['word'].lower()) else "[red]Removed[/red]"
            table.add_row(
                str(dup['index']),
                dup['word'],
                str(dup['back_cards_count']),
                dup['word_audio_file'],
                ", ".join(dup['sentence_audio_files'])[:50] + ('...' if len(", ".join(dup['sentence_audio_files'])) > 50 else ''),
                dup['voice_id'],
                status
            )
        console.print(table)
        console.print(Panel(
            f"[yellow]⚠ {len(duplicates)} duplicates detected. Removed {removed_count} entries.[/yellow]",
            title="Duplicate Words Report", border_style="yellow", expand=False
        ))

    return duplicates, removed_count

def verify_audio_files(vocab_db):
    """Verify that audio files exist for database entries."""
    missing_audio = []
    for entry in vocab_db:
        word_lower = entry['word'].lower()
        word_audio = entry.get('word_audio_file', '')
        if not word_audio:
            missing_audio.append((entry['word'], 'word_audio_file', 'MISSING'))
        elif not os.path.exists(os.path.join(AUDIO_FRONT_DIR, word_audio)):
            missing_audio.append((entry['word'], 'word_audio_file', word_audio))
        for card in entry['back_cards']:
            audio_file = card.get('audio_file', '')
            if not audio_file:
                missing_audio.append((entry['word'], 'sentence_audio_file', f"{card['example_en']} (MISSING)"))
            elif not os.path.exists(os.path.join(AUDIO_BACK_DIR, word_lower, audio_file)):
                missing_audio.append((entry['word'], 'sentence_audio_file', audio_file))
    return missing_audio

def generate_summary_report(vocab_db, valid_entries, duplicates, removed_count, duplicate_sentences, removed_sentence_count, missing_audio, non_english_db_words):
    """Generate a concise summary report with non-English words and audio issues."""
    non_english_count = len(non_english_db_words)
    total_words = len(vocab_db)
    total_sentences = sum(len(entry['back_cards']) for entry in vocab_db)

    table = Table(title="📊 Vocabulary Sync Report", style="cyan", show_lines=True)
    table.add_column("Metric", style="bold")
    table.add_column("Value", justify="right")
    
    table.add_row("Processed Entries", str(len(valid_entries)))
    table.add_row("Valid Entries", f"[green]{len(valid_entries)}[/green]")
    table.add_row("Duplicate Words Removed", f"[yellow]{removed_count}[/yellow]" if removed_count else "0")
    table.add_row("Duplicate Sentences Removed", f"[yellow]{removed_sentence_count}[/yellow]" if removed_sentence_count else "0")
    table.add_row("Non-English Words in DB", f"[yellow]{non_english_count}[/yellow]" if non_english_count else "[green]0[/green]")
    table.add_row("Database Size (Words)", str(total_words))
    table.add_row("Total Sentences", str(total_sentences))

    console.print(table)

    if non_english_db_words:
        table = Table(title="⚠ Non-English Words in Database", style="yellow", show_lines=True)
        table.add_column("Index", style="bold")
        table.add_column("Word", justify="left")
        for index, word in non_english_db_words:
            table.add_row(str(index), word)
        console.print(table)
        console.print(Panel(
            f"[yellow]⚠ {non_english_count} non-English words in database. Please remove manually.[/yellow]",
            title="Non-English Words", border_style="yellow", expand=False
        ))

    if missing_audio:
        table = Table(title="⚠ Missing Audio Files", style="red", show_lines=True)
        table.add_column("Word", style="bold")
        table.add_column("Type", justify="left")
        table.add_column("File", justify="left")
        for word, audio_type, audio_file in missing_audio:
            table.add_row(word, audio_type, audio_file[:50] + ('...' if len(audio_file) > 50 else ''))
        console.print(table)

    confirmation = []
    confirmation.append("[green]✓ All Words Have Audio Files[/green]" if not any(t == 'word_audio_file' for _, t, _ in missing_audio) else "[red]✗ Some Word Audio Files Missing[/red]")
    confirmation.append("[green]✓ All Sentences Have Audio Files[/green]" if not any(t == 'sentence_audio_file' for _, t, _ in missing_audio) else "[red]✗ Some Sentence Audio Files Missing[/red]")
    confirmation.append("[green]✓ No Duplicate Words[/green]" if removed_count == 0 and not duplicates else "[red]✗ Duplicate Words Detected and Removed[/red]")
    confirmation.append("[green]✓ No Duplicate Sentences[/green]" if removed_sentence_count == 0 and not duplicate_sentences else "[red]✗ Duplicate Sentences Detected and Removed[/red]")
    confirmation.append("[green]✓ No Non-English Words in Database[/green]" if not non_english_db_words else "[yellow]✗ Non-English Words Detected in Database[/yellow]")
    console.print(Panel("\n".join(confirmation), title="Confirmation Status", border_style="green", expand=False))

    report_path = os.path.join(REPORTS_DIR, f"vocab3000_report_{time.strftime('%Y%m%d_%H%M%S')}.txt")
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(str(table))
        f.write("\n\nNon-English Words in Database:\n")
        f.write("\n".join([f"Index {index}: {word}" for index, word in non_english_db_words]) if non_english_db_words else "None")
        f.write("\n\nMissing Audio Files:\n")
        f.write("\n".join([f"{word} ({audio_type}: {audio_file})" for word, audio_type, audio_file in missing_audio]) if missing_audio else "None")
        f.write("\n\nConfirmation Status:\n")
        f.write("\n".join([line.strip("[green]").strip("[/green]").strip("[red]").strip("[/red]").strip("[yellow]").strip("[/yellow]") for line in confirmation]))
    logger.info(f"Report saved to: {report_path}")
    console.print(f"[green]✓ Report Saved: {report_path}[/green]")

def process_entries(entries):
    """Process entries with a progress bar, updating existing database entries only."""
    vocab_db = load_file(VOCAB_DB_PATH, file_type='yaml')
    if not isinstance(vocab_db, list):
        logger.warning(f"{VOCAB_DB_PATH} invalid. Initializing as empty list.")
        vocab_db = []

    valid_entries = []
    invalid_entries = []
    non_english_db_words = [(i, entry['word']) for i, entry in enumerate(vocab_db) if is_non_english(entry['word'])]

    # Create a set of valid words in the database
    valid_words = {entry['word'].lower() for entry in vocab_db}

    with Progress(
        SpinnerColumn(),
        TextColumn("[cyan]{task.description}"),
        BarColumn(bar_width=20),
        TextColumn("{task.percentage:>3.0f}%"),
        console=console,
        refresh_per_second=10
    ) as progress:
        task = progress.add_task("Syncing Vocabulary...", total=len(entries))

        for entry in entries:
            if not validate_entry(entry):
                invalid_entries.append(entry)
                progress.advance(task)
                continue

            word_lower = entry['word'].lower()
            if word_lower not in valid_words:
                logger.warning(f"Word '{entry['word']}' not in database. Skipping.")
                console.print(f"[yellow]⚠ Word '{entry['word']}' not in database. Skipped.[/yellow]")
                progress.advance(task)
                continue

            existing_entry = next((e for e in vocab_db if e['word'].lower() == word_lower and e.get('voice_id') == 'Matthew'), None)
            if not existing_entry:
                logger.warning(f"Word '{entry['word']}' not found with voice 'Matthew'. Skipping.")
                console.print(f"[yellow]⚠ Word '{entry['word']}' not found with voice 'Matthew'. Skipped.[/yellow]")
                progress.advance(task)
                continue

            # Update back_cards
            existing_examples = {card['example_en']: card for card in existing_entry['back_cards']}
            new_cards = []
            for card in entry['back_cards']:
                if card['example_en'] not in existing_examples:
                    new_cards.append(card)
            
            if new_cards:
                word_dir = os.path.join(AUDIO_BACK_DIR, word_lower)
                os.makedirs(word_dir, exist_ok=True)
                for card in new_cards:
                    sentence_text = f"<speak>{card['example_en']}</speak>"
                    sentence_audio_filename = get_audio_filename(entry['word'], card['example_en'], 'sentence')
                    sentence_audio_path = os.path.join(word_dir, sentence_audio_filename)
                    sentence_success = generate_audio(sentence_text, sentence_audio_path, 'Matthew', use_ssml=True) if not os.path.exists(sentence_audio_path) else True
                    card['audio_file'] = sentence_audio_filename if sentence_success else ''
                    existing_entry['back_cards'].append(card)
                valid_entries.append(existing_entry)
            
            progress.advance(task)

    duplicate_sentences, removed_sentence_count = check_duplicate_sentences(vocab_db)
    duplicates, removed_count = check_duplicates(vocab_db)
    missing_audio = verify_audio_files(vocab_db)
    save_file(vocab_db, VOCAB_DB_PATH, file_type='yaml')
    generate_summary_report(vocab_db, valid_entries, duplicates, removed_count, duplicate_sentences, removed_sentence_count, missing_audio, non_english_db_words)
    
    return valid_entries, invalid_entries

def main():
    """Main function with streamlined UX."""
    console.print(Panel(
        "Vocab3000Sync v1.1\nNeural-Powered Vocabulary Processor", style="bold cyan",
        title="System Boot", border_style="blue", expand=False
    ))

    console.print("[cyan]Initializing Vocabulary Sync...[/cyan]")
    vocab_db = load_file(VOCAB_DB_PATH, file_type='yaml')
    if vocab_db:
        duplicates, removed_count = check_duplicates(vocab_db)
        duplicate_sentences, removed_sentence_count = check_duplicate_sentences(vocab_db)
        if removed_count > 0 or removed_sentence_count > 0:
            save_file(vocab_db, VOCAB_DB_PATH, file_type='yaml')
            logger.info(f"Initial duplicate check: Removed {removed_count} words and {removed_sentence_count} sentences")

    entries = load_file(TEMP_VOCAB_JSONL_PATH, file_type='jsonl')
    if not entries:
        console.print("[yellow]No valid entries found in temp_vocab3000.jsonl.[/yellow]")
        logger.warning("No valid entries to process")
        return

    console.print(f"[cyan]Processing {len(entries)} Entries...[/cyan]")
    append_to_log(entries)
    valid_entries, invalid_entries = process_entries(entries)
    
    if valid_entries:
        save_file([], TEMP_VOCAB_JSONL_PATH, file_type='jsonl')
        console.print("[green]✓ Input File Processed and Cleared.[/green]")
        logger.info("Batch processed successfully. temp_vocab3000.jsonl cleared.")
    else:
        console.print("[red]✗ Processing Failed. Input File Not Cleared.[/red]")
        logger.warning("Batch processing failed. temp_vocab3000.jsonl not cleared.")

    if invalid_entries:
        console.print(f"[yellow]⚠ {len(invalid_entries)} Invalid Entries Detected. See log file.[/yellow]")
        logger.warning(f"Invalid entries: {invalid_entries}")

if __name__ == "__main__":
    main()
