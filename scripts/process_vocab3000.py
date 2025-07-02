import os
import json
import yaml
import boto3
import time
import logging
import re
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, BarColumn, TextColumn, SpinnerColumn
from rich.text import Text
import shutil

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

def load_file(filename, file_type='jsonl'):
    """Load a file (JSONL or YAML) with error handling and correction for JSONL."""
    logger.info(f"Loading: {filename}")
    try:
        if file_type == 'jsonl':
            entries = []
            corrections = []
            errors = []
            line_count = 0
            invalid_line_count = 0

            # Create a backup of the original file
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
                    entries.append(entry)
                except json.JSONDecodeError as e:
                    logger.warning(f"Line {i} invalid JSON: {line} - Error: {e}")
                    invalid_line_count += 1
                    fixed_line = None
                    original_line = line
                    line = line.replace('}{', '},{')
                    if line.count('{') > line.count('}'):
                        line += '}'
                    if line.count('}') > line.count('{'):
                        line = '{' + line
                    line = line.replace(',]', ']').replace(',}', '}')
                    line = line.replace("'", '"')

                    try:
                        entry = json.loads(line)
                        entries.append(entry)
                        corrections.append((i, original_line, line, str(e)))
                        logger.info(f"Line {i} fixed: {original_line} -> {line}")
                    except json.JSONDecodeError as e2:
                        errors.append((i, original_line, str(e)))
                        logger.error(f"Line {i} unfixable: {original_line} - Error: {e2}")

            if corrections:
                with open(CORRECTED_JSONL_PATH, 'w', encoding='utf-8') as f:
                    for entry in entries:
                        json.dump(entry, f, ensure_ascii=False)
                        f.write('\n')
                logger.info(f"Corrected JSONL saved to: {CORRECTED_JSONL_PATH}")
                console.print(f"[green]✓ Corrected JSONL saved: {CORRECTED_JSONL_PATH}[/green]")

            if corrections:
                table = Table(title="📝 JSONL Corrections Report", style="cyan", show_lines=True)
                table.add_column("Line", style="bold")
                table.add_column("Original", justify="left")
                table.add_column("Corrected", justify="left")
                table.add_column("Error", justify="left")
                for line_num, orig, fixed, err in corrections:
                    table.add_row(str(line_num), orig[:50] + ('...' if len(orig) > 50 else ''), fixed[:50] + ('...' if len(fixed) > 50 else ''), err[:50] + ('...' if len(err) > 50 else ''))
                console.print(table)

            if line_count > 0 and (invalid_line_count / line_count) > 0.5:
                console.print(Panel(
                    f"[red]✗ Over 50% of lines ({invalid_line_count}/{line_count}) are invalid. Manual editing required.\n"
                    f"Original file backed up at: {BACKUP_JSONL_PATH}\n"
                    f"Please fix the JSONL file and retry.",
                    title="Critical Error", border_style="red", expand=False
                ))
                logger.error("Too many invalid lines. Suggesting manual edit.")
                return []

            if errors:
                table = Table(title="⚠ JSONL Unfixable Errors", style="red", show_lines=True)
                table.add_column("Line", style="bold")
                table.add_column("Content", justify="left")
                table.add_column("Error", justify="left")
                for line_num, content, err in errors:
                    table.add_row(str(line_num), content[:50] + ('...' if len(content) > 50 else ''), err[:50] + ('...' if len(err) > 50 else ''))
                console.print(table)
                console.print(Panel(
                    f"[yellow]⚠ {len(errors)} lines could not be fixed. Consider manual editing.\n"
                    f"Original file backed up at: {BACKUP_JSONL_PATH}",
                    title="Warning", border_style="yellow", expand=False
                ))

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
    required_fields = ['word', 'rank', 'freq', 'back_cards']
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

def get_audio_filename(word, text, prefix):
    """Generate a unique filename for audio files."""
    safe_word = word.lower().replace(' ', '_')
    if prefix == 'word':
        return f"{safe_word}.mp3"
    else:
        # Clean example sentence for filename
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
                # Duplicate found
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
            f"[yellow]⚠ {len(duplicate_sentences)} duplicate example sentences removed from {removed_sentence_count} entries.[/yellow]",
            title="Duplicate Sentences Report", border_style="yellow", expand=False
        ))

    return duplicate_sentences, removed_sentence_count

def check_duplicates(vocab_db):
    """Check and remove duplicate word entries in the database, keeping the entry with the most back_cards."""
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
                    'rank': entry['rank'],
                    'back_cards_count': len(entry['back_cards']),
                    'word_audio_file': entry.get('word_audio_file', ''),
                    'sentence_audio_files': [card.get('audio_file', '') for card in entry['back_cards']],
                    'voice_id': entry.get('voice_id', '')
                })

            # Select the entry to keep (one with most back_cards)
            entries.sort(key=lambda x: len(x[1]['back_cards']), reverse=True)
            keep_index, keep_entry = entries[0]
            entries_to_remove = entries[1:]

            # Collect audio files from entries to remove
            for index, entry in entries_to_remove:
                removed_count += 1
                word_audio = entry.get('word_audio_file', '')
                if word_audio:
                    redundant_audio_files.append(os.path.join(AUDIO_FRONT_DIR, word_audio))
                for card in entry['back_cards']:
                    audio_file = card.get('audio_file', '')
                    if audio_file:
                        redundant_audio_files.append(os.path.join(AUDIO_BACK_DIR, entry['word'].lower(), audio_file))

            # Remove duplicate entries from vocab_db
            for index, _ in reversed(entries_to_remove):
                vocab_db.pop(index)

    # Delete redundant audio files
    for audio_file in redundant_audio_files:
        if os.path.exists(audio_file):
            try:
                os.remove(audio_file)
                logger.info(f"Deleted redundant audio file: {audio_file}")
            except OSError as e:
                logger.error(f"Error deleting audio file {audio_file}: {e}")

    if duplicates:
        table = Table(title="⚠ Duplicate Word Entries Detected in vocab3000_database.yaml", style="red", show_lines=True)
        table.add_column("Index", style="bold")
        table.add_column("Word", justify="left")
        table.add_column("Rank", justify="right")
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
                str(dup['rank']),
                str(dup['back_cards_count']),
                dup['word_audio_file'],
                ", ".join(dup['sentence_audio_files'])[:50] + ('...' if len(", ".join(dup['sentence_audio_files'])) > 50 else ''),
                dup['voice_id'],
                status
            )
        console.print(table)
        console.print(Panel(
            f"[yellow]⚠ {len(duplicates)} duplicate word entries detected. Kept entries with most back_cards. Removed {removed_count} entries.[/yellow]",
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

def generate_summary_report(vocab_db, valid_entries, duplicates, removed_count, duplicate_sentences, removed_sentence_count, missing_audio, first_word, last_word):
    """Generate a concise high-tech summary report with missing ranks and confirmation."""
    if vocab_db:
        max_rank = max(entry['rank'] for entry in vocab_db)
        present_ranks = {entry['rank'] for entry in vocab_db}
        missing_ranks = [rank for rank in range(1, max_rank + 1) if rank not in present_ranks]
        total_words = len(vocab_db)
        total_sentences = sum(len(entry['back_cards']) for entry in vocab_db)
    else:
        max_rank = 0
        missing_ranks = []
        total_words = 0
        total_sentences = 0

    table = Table(title="📊 Vocabulary Sync Report", style="cyan", show_lines=True)
    table.add_column("Metric", style="bold")
    table.add_column("Value", justify="right")
    
    table.add_row("Processed Entries", str(len(valid_entries)))
    table.add_row("Valid Entries", f"[green]{len(valid_entries)}[/green]")
    table.add_row("Duplicate Words Removed", f"[yellow]{removed_count}[/yellow]" if removed_count else "0")
    table.add_row("Duplicate Sentences Removed", f"[yellow]{removed_sentence_count}[/yellow]" if removed_sentence_count else "0")
    table.add_row("Database Size (Words)", str(total_words))
    table.add_row("Total Sentences", str(total_sentences))
    table.add_row("Max Rank", str(max_rank))
    table.add_row("Missing Ranks", f"[yellow]{len(missing_ranks)}[/yellow]" if missing_ranks else "[green]0[/green]")

    console.print(table)

    if missing_ranks:
        console.print(Panel(
            "\n".join([f"Rank {rank}" for rank in missing_ranks]),
            title="Missing Ranks", border_style="yellow", expand=False
        ))
    else:
        console.print(Panel("[green]✓ No Missing Ranks[/green]", title="Missing Ranks", border_style="green", expand=False))

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
    confirmation.append("[green]✓ All Ranks Present[/green]" if not missing_ranks else "[yellow]✗ Missing Ranks Detected[/yellow]")
    console.print(Panel("\n".join(confirmation), title="Confirmation Status", border_style="green", expand=False))

    report_path = os.path.join(REPORTS_DIR, f"vocab3000_report_{time.strftime('%Y%m%d_%H%M%S')}.txt")
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(str(table))
        f.write("\n\nMissing Ranks:\n")
        if missing_ranks:
            f.write("\n".join([f"Rank {rank}" for rank in missing_ranks]))
        else:
            f.write("None")
        f.write("\n\nMissing Audio Files:\n")
        if missing_audio:
            f.write("\n".join([f"{word} ({audio_type}: {audio_file})" for word, audio_type, audio_file in missing_audio]))
        else:
            f.write("None")
        f.write("\n\nConfirmation Status:\n")
        f.write("\n".join([line.strip("[green]").strip("[/green]").strip("[red]").strip("[/red]").strip("[yellow]").strip("[/yellow]") for line in confirmation]))
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
    first_word_data = None
    last_word_data = None

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
                first_word_data = {
                    'word': entry['word'],
                    'rank': entry['rank'],
                    'freq': entry['freq'],
                    'back_cards': entry['back_cards']
                }
            last_word = entry['word']
            last_word_data = {
                'word': entry['word'],
                'rank': entry['rank'],
                'freq': entry['freq'],
                'back_cards': entry['back_cards']
            }

            existing_entry = next((e for e in vocab_db if e['word'].lower() == word_lower and e.get('voice_id') == 'Matthew'), None)

            if existing_entry:
                # Check for new back_cards
                existing_examples = {card['example_en']: card for card in existing_entry['back_cards']}
                new_cards = []
                for card in entry['back_cards']:
                    if card['example_en'] not in existing_examples:
                        new_cards.append(card)
                
                if new_cards:
                    # Generate audio for new example sentences
                    word_dir = os.path.join(AUDIO_BACK_DIR, word_lower)
                    os.makedirs(word_dir, exist_ok=True)
                    for card in new_cards:
                        sentence_text = f"<speak>{card['example_en']}</speak>"
                        sentence_audio_filename = get_audio_filename(entry['word'], card['example_en'], 'sentence')
                        sentence_audio_path = os.path.join(word_dir, sentence_audio_filename)
                        sentence_success = generate_audio(sentence_text, sentence_audio_path, 'Matthew', use_ssml=True) if not os.path.exists(sentence_audio_path) else True
                        if sentence_success:
                            card['audio_file'] = sentence_audio_filename
                        else:
                            card['audio_file'] = ''
                        existing_entry['back_cards'].append(card)
                    valid_entries.append(existing_entry)
                progress.advance(task)
                continue

            selected_voice = 'Matthew'
            new_entry = {
                'word': entry['word'],
                'rank': entry['rank'],
                'freq': entry['freq'],
                'voice_id': selected_voice,
                'word_audio_file': '',
                'back_cards': []
            }

            # Generate word audio
            word_audio_filename = get_audio_filename(entry['word'], entry['word'], 'word')
            word_audio_path = os.path.join(AUDIO_FRONT_DIR, word_audio_filename)
            word_text = f"<speak>{entry['word']}</speak>"
            word_success = generate_audio(word_text, word_audio_path, selected_voice, use_ssml=True) if not os.path.exists(word_audio_path) else True
            new_entry['word_audio_file'] = word_audio_filename if word_success else ''

            # Generate sentence audio
            word_dir = os.path.join(AUDIO_BACK_DIR, word_lower)
            os.makedirs(word_dir, exist_ok=True)
            for card in entry['back_cards']:
                sentence_text = f"<speak>{card['example_en']}</speak>"
                sentence_audio_filename = get_audio_filename(entry['word'], card['example_en'], 'sentence')
                sentence_audio_path = os.path.join(word_dir, sentence_audio_filename)
                sentence_success = generate_audio(sentence_text, sentence_audio_path, selected_voice, use_ssml=True) if not os.path.exists(sentence_audio_path) else True
                card['audio_file'] = sentence_audio_filename if sentence_success else ''
                new_entry['back_cards'].append(card)

            if word_success and all(card['audio_file'] for card in new_entry['back_cards']):
                valid_entries.append(new_entry)
            else:
                invalid_entries.append(entry)

            progress.advance(task)

    # Remove duplicate sentences before saving
    duplicate_sentences, removed_sentence_count = check_duplicate_sentences(vocab_db)

    for entry in valid_entries:
        word_lower = entry['word'].lower()
        vocab_db = [e for e in vocab_db if not (e['word'].lower() == word_lower and e.get('voice_id') == 'Matthew')]
        vocab_db.append(entry)
    vocab_db.sort(key=lambda x: x['rank'])

    duplicates, removed_count = check_duplicates(vocab_db)
    missing_audio = verify_audio_files(vocab_db)
    save_file(vocab_db, VOCAB_DB_PATH, file_type='yaml')
    generate_summary_report(vocab_db, valid_entries, duplicates, removed_count, duplicate_sentences, removed_sentence_count, missing_audio, first_word, last_word)
    
    return valid_entries, invalid_entries, first_word_data, last_word_data

def main():
    """Main function with streamlined high-tech UX."""
    console.print(Panel(
        Text("Vocab3000Sync v1.0\nNeural-Powered Vocabulary Processor for Vocab3000", style="bold cyan"),
        title="System Boot", border_style="blue", expand=False
    ))

    console.print("[cyan]Initializing Vocabulary Sync...[/cyan]")
    # Check for duplicates in vocab3000_database.yaml before processing new entries
    vocab_db = load_file(VOCAB_DB_PATH, file_type='yaml')
    if vocab_db:
        duplicates, removed_count = check_duplicates(vocab_db)
        duplicate_sentences, removed_sentence_count = check_duplicate_sentences(vocab_db)
        if removed_count > 0 or removed_sentence_count > 0:
            save_file(vocab_db, VOCAB_DB_PATH, file_type='yaml')
            logger.info(f"Initial duplicate check: Removed {removed_count} word entries and {removed_sentence_count} duplicate sentences from {VOCAB_DB_PATH}")

    entries = load_file(TEMP_VOCAB_JSONL_PATH, file_type='jsonl')
    if not entries:
        console.print("[yellow]No valid entries found in temp_vocab3000.jsonl.[/yellow]")
        logger.warning("No valid entries to process")
        return

    console.print(f"[cyan]Processing {len(entries)} Entries...[/cyan]")
    append_to_log(entries)
    valid_entries, invalid_entries, first_word_data, last_word_data = process_entries(entries)
    
    if valid_entries:
        if first_word_data and last_word_data:
            table = Table(title="📋 Processed Batch Summary", style="cyan", show_lines=True)
            table.add_column("Field", style="bold")
            table.add_column("First Word", justify="left")
            table.add_column("Last Word", justify="left")

            table.add_row("Word", first_word_data['word'], last_word_data['word'])
            table.add_row("Rank", str(first_word_data['rank']), str(last_word_data['rank']))
            table.add_row("Frequency", str(first_word_data['freq']), str(last_word_data['freq']))
            table.add_row("Back Cards", f"{len(first_word_data['back_cards'])} cards", f"{len(last_word_data['back_cards'])} cards")

            console.print(table)
        else:
            console.print("[yellow]⚠ No valid words processed in this batch.[/yellow]")

        save_file([], TEMP_VOCAB_JSONL_PATH, file_type='jsonl')
        console.print("[green]✓ Input File Processed and Cleared.[/green]")
        logger.info("Batch processed successfully. temp_vocab3000.jsonl cleared.")
    else:
        console.print("[red]✗ Processing Failed. Input File Not Cleared.[/red]")
        logger.warning("Batch processing failed. temp_vocab3000.jsonl not cleared.")

    if invalid_entries:
        console.print(f"[yellow]⚠ {len(invalid_entries)} Invalid Entries Detected. See vocab3000_processing.log.[/yellow]")
        logger.warning(f"Invalid entries: {invalid_entries}")

if __name__ == "__main__":
    main()
