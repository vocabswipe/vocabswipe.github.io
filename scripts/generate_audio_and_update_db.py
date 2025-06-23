import os
import json
import yaml
import boto3
import hashlib
import time
import logging
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, BarColumn, TextColumn, SpinnerColumn
from rich.text import Text

# Initialize rich console
console = Console()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'vocab_processing.log'), encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Define paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEMP_VOCAB_JSONL_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'temp_vocab_multi_cards.jsonl')
TEMP_VOCAB_LOG_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'temp_vocab_log.yaml')
VOCAB_DB_PATH = os.path.join(BASE_DIR, 'data', 'vocab_database.yaml')
AUDIO_DIR = os.path.join(BASE_DIR, 'data', 'audio')

# Ensure directories exist
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(os.path.dirname(TEMP_VOCAB_JSONL_PATH), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'data', 'reports'), exist_ok=True)

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

# Unchanged functions
def load_file(filename, file_type='jsonl'):
    logger.info(f"Loading: {filename}")
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            if file_type == 'jsonl':
                return [json.loads(line.strip()) for line in f if line.strip()]
            return yaml.safe_load(f) or []
    except FileNotFoundError:
        logger.warning(f"{filename} not found. Using default structure.")
        return [] if file_type == 'jsonl' else []
    except (yaml.YAMLError, json.JSONDecodeError) as e:
        logger.error(f"Error parsing '{filename}': {e}")
        return [] if file_type == 'jsonl' else []

def save_file(data, filename, file_type='yaml'):
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            if file_type == 'json':
                json.dump(data, f, ensure_ascii=False, indent=2)
            else:
                yaml.safe_dump(data, f, allow_unicode=True)
        logger.info(f"Successfully saved: {filename}")
    except Exception as e:
        logger.error(f"Error saving '{filename}': {e}")
        raise

def append_to_log(entries):
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
    required_fields = ['word', 'rank', 'freq', 'part_of_speech', 'back_cards']
    if not all(field in entry for field in required_fields):
        logger.warning(f"Invalid entry - missing fields: {entry}")
        return False
    if not isinstance(entry['back_cards'], list) or not entry['back_cards']:
        logger.warning(f"Invalid entry - back_cards invalid: {entry}")
        return False
    for card in entry['back_cards']:
        if not all(k in card for k in ['definition_en', 'example_en']):
            logger.warning(f"Invalid back_card in entry: {entry}")
            return False
    return True

def get_audio_filename(word, text, prefix, voice_id, index=0):
    safe_word = word.lower().replace(' ', '_')
    return f"{safe_word}_{prefix}_{index}+{voice_id}+{hashlib.md5(text.encode('utf-8')).hexdigest()}.mp3"

def check_duplicates(vocab_db):
    seen_words = set()
    duplicates = []
    for i, entry in enumerate(vocab_db):
        word_voice_key = (entry['word'].lower(), entry.get('voice_id', ''))
        if word_voice_key in seen_words:
            duplicates.append((i, entry['word'].lower()))
        else:
            seen_words.add(word_voice_key)
    
    removed_count = 0
    redundant_audio_files = []
    for i, _ in reversed(duplicates):
        removed_count += 1
        entry = vocab_db.pop(i)
        redundant_audio_files.extend(
            [os.path.join(AUDIO_DIR, f) for f in entry.get('word_audio_file', []) + entry.get('sentence_audio_file', []) if f]
        )
    
    for audio_file in redundant_audio_files:
        if os.path.exists(audio_file):
            try:
                os.remove(audio_file)
                logger.info(f"Deleted redundant audio file: {audio_file}")
            except OSError as e:
                logger.error(f"Error deleting audio file {audio_file}: {e}")
    
    return duplicates, removed_count

def verify_audio_files(vocab_db):
    missing_audio = []
    for entry in vocab_db:
        for i, audio_file in enumerate(entry.get('word_audio_file', [])):
            if audio_file and not os.path.exists(os.path.join(AUDIO_DIR, audio_file)):
                missing_audio.append((entry['word'], 'word_audio_file', i, audio_file))
        for i, audio_file in enumerate(entry.get('sentence_audio_file', [])):
            if audio_file and not os.path.exists(os.path.join(AUDIO_DIR, audio_file)):
                missing_audio.append((entry['word'], 'sentence_audio_file', i, audio_file))
    return missing_audio

def generate_summary_report(vocab_db, valid_entries, duplicates, removed_count, missing_audio, first_word, last_word):
    """Generate a concise high-tech summary report with confirmation."""
    table = Table(title="📊 Vocabulary Sync Report", style="cyan", show_lines=True)
    table.add_column("Metric", style="bold")
    table.add_column("Value", justify="right")
    
    table.add_row("Processed", str(len(valid_entries)))
    table.add_row("Valid", f"[green]{len(valid_entries)}[/green]")
    table.add_row("Duplicates Removed", f"[yellow]{removed_count}[/yellow]" if removed_count else "0")
    table.add_row("Database Size", str(len(vocab_db)))

    console.print(table)

    if missing_audio:
        console.print(Panel(
            "\n".join([f"⚠ {word} ({audio_type}, index {index})" for word, audio_type, index, _ in missing_audio]),
            title="Missing Audio", border_style="red", expand=False
        ))

    # Confirmation message
    confirmation = []
    confirmation.append("[green]✓ All Entries Have Audio Files[/green]" if not missing_audio else "[red]✗ Some Audio Files Missing[/red]")
    confirmation.append("[green]✓ No Duplicates or Redundant Audio Files[/green]" if removed_count == 0 and not duplicates else "[red]✗ Duplicates Detected and Removed[/red]")
    console.print(Panel("\n".join(confirmation), title="Confirmation", border_style="green", expand=False))

    report_path = os.path.join(BASE_DIR, 'data', 'reports', f"vocab_report_{time.strftime('%Y%m%d_%H%M%S')}.txt")
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(str(table))
        f.write("\n\nConfirmation:\n")
        f.write("\n".join([line.strip("[green]").strip("[/green]").strip("[red]").strip("[/red]") for line in confirmation]))
        if missing_audio:
            f.write("\n\nMissing Audio Files:\n" + "\n".join([f"{word} ({audio_type}, index {index})" for word, audio_type, index, _ in missing_audio]))
    logger.info(f"Report saved to: {report_path}")
    console.print(f"[green]✓ Report Saved: {report_path}[/green]")

def process_entries(entries):
    """Process entries with a single-line download-style progress bar."""
    vocab_db = load_file(VOCAB_DB_PATH, file_type='yaml')
    if not isinstance(vocab_db, list):
        logger.warning(f"{VOCAB_DB_PATH} invalid. Initializing as empty list.")
        vocab_db = []

    valid_entries = []
    invalid_entries = []
    first_word = None
    last_word = None

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
            if not first_word:
                first_word = entry['word']
            last_word = entry['word']

            existing_entry = next((e for e in vocab_db if e['word'].lower() == word_lower and e.get('voice_id') == 'Matthew'), None)

            if existing_entry:
                existing_cards = {card['example_en']: card for card in existing_entry['back_cards']}
                new_cards = {card['example_en']: card for card in entry['back_cards']}
                merged_cards = list(existing_cards.values()) + [card for example, card in new_cards.items() if example not in existing_cards]
                existing_entry['back_cards'] = merged_cards

                sentence_audio_files = existing_entry.get('sentence_audio_file', [])
                for i, card in enumerate(merged_cards):
                    if i >= len(sentence_audio_files) or card['example_en'] not in [c['example_en'] for c in existing_cards.values()]:
                        sentence_text = f"<speak>{existing_entry['word']}. {card['example_en']}</speak>"
                        sentence_audio_filename = get_audio_filename(existing_entry['word'], f"{existing_entry['word']}. {card['example_en']}", 'sentence', 'Matthew', i)
                        sentence_audio_path = os.path.join(AUDIO_DIR, sentence_audio_filename)
                        sentence_success = generate_audio(sentence_text, sentence_audio_path, 'Matthew', use_ssml=True) if not os.path.exists(sentence_audio_path) else True
                        if sentence_success and i >= len(sentence_audio_files):
                            sentence_audio_files.append(sentence_audio_filename)
                        elif sentence_success:
                            sentence_audio_files[i] = sentence_audio_filename
                existing_entry['sentence_audio_file'] = sentence_audio_files

                valid_entries.append(existing_entry)
                progress.advance(task)
                continue

            selected_voice = 'Matthew'
            new_entry = {
                'word': entry['word'],
                'rank': entry['rank'],
                'freq': entry['freq'],
                'part_of_speech': entry['part_of_speech'],
                'back_cards': entry['back_cards'],
                'word_audio_file': [],
                'sentence_audio_file': [],
                'voice_id': selected_voice
            }

            if existing_entry and existing_entry.get('voice_id') != 'Matthew':
                for audio_file in existing_entry.get('word_audio_file', []) + existing_entry.get('sentence_audio_file', []):
                    audio_path = os.path.join(AUDIO_DIR, audio_file)
                    if os.path.exists(audio_path):
                        try:
                            os.remove(audio_path)
                            logger.info(f"Deleted old audio file: {audio_path}")
                        except OSError as e:
                            logger.error(f"Error deleting old audio file {audio_path}: {e}")

            word_text = f"<speak>{new_entry['word']}</speak>"
            word_audio_filename = get_audio_filename(new_entry['word'], new_entry['word'], 'word', selected_voice)
            word_audio_path = os.path.join(AUDIO_DIR, word_audio_filename)
            word_success = generate_audio(word_text, word_audio_path, selected_voice, use_ssml=True) if not os.path.exists(word_audio_path) else True
            new_entry['word_audio_file'].append(word_audio_filename if word_success else '')

            sentence_audio_files = []
            for i, card in enumerate(new_entry['back_cards']):
                sentence_text = f"<speak>{new_entry['word']}. {card['example_en']}</speak>"
                sentence_audio_filename = get_audio_filename(new_entry['word'], f"{new_entry['word']}. {card['example_en']}", 'sentence', selected_voice, i)
                sentence_audio_path = os.path.join(AUDIO_DIR, sentence_audio_filename)
                sentence_success = generate_audio(sentence_text, sentence_audio_path, selected_voice, use_ssml=True) if not os.path.exists(sentence_audio_path) else True
                sentence_audio_files.append(sentence_audio_filename if sentence_success else '')

            new_entry['sentence_audio_file'] = sentence_audio_files

            if word_success and all(sentence_audio_files):
                valid_entries.append(new_entry)
            else:
                invalid_entries.append(entry)

            progress.advance(task)

    for entry in valid_entries:
        word_lower = entry['word'].lower()
        vocab_db = [e for e in vocab_db if not (e['word'].lower() == word_lower and e.get('voice_id') == 'Matthew')]
        vocab_db.append(entry)
    vocab_db.sort(key=lambda x: x['rank'])

    duplicates, removed_count = check_duplicates(vocab_db)
    missing_audio = verify_audio_files(vocab_db)
    save_file(vocab_db, VOCAB_DB_PATH, file_type='yaml')
    generate_summary_report(vocab_db, valid_entries, duplicates, removed_count, missing_audio, first_word, last_word)
    
    return valid_entries, invalid_entries

def main():
    """Main function with streamlined high-tech UX."""
    console.print(Panel(
        Text("VocabSync v2.1\nNeural-Powered Vocabulary Processor", style="bold cyan"),
        title="System Boot", border_style="blue", expand=False
    ))

    console.print("[cyan]Initializing Vocabulary Sync...[/cyan]")
    entries = load_file(TEMP_VOCAB_JSONL_PATH, file_type='jsonl')
    if not entries:
        console.print("[yellow]No entries found in temp_vocab_multi_cards.jsonl.[/yellow]")
        logger.warning("No entries to process")
        return

    console.print(f"[cyan]Processing {len(entries)} Entries...[/cyan]")
    append_to_log(entries)
    valid_entries, invalid_entries = process_entries(entries)
    
    if invalid_entries:
        console.print(f"[yellow]⚠ {len(invalid_entries)} Invalid Entries Detected. See vocab_processing.log.[/yellow]")
        logger.warning(f"Invalid entries: {invalid_entries}")

    if valid_entries:
        save_file([], TEMP_VOCAB_JSONL_PATH, file_type='json')
        console.print("[green]✓ Input File Processed and Cleared.[/green]")
        logger.info("Batch processed successfully. temp_vocab_multi_cards.jsonl cleared.")
    else:
        console.print("[red]✗ Processing Failed. Input File Not Cleared.[/red]")
        logger.warning("Batch processing failed. temp_vocab_multi_cards.jsonl not cleared.")

if __name__ == "__main__":
    main()
