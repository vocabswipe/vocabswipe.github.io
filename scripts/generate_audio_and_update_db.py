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
import shutil

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
REPORTS_DIR = os.path.join(BASE_DIR, 'data', 'reports')
BACKUP_JSONL_PATH = os.path.join(BASE_DIR, 'data', 'temp', f'backup_vocab_multi_cards_{time.strftime("%Y%m%d_%H%M%S")}.jsonl')
CORRECTED_JSONL_PATH = os.path.join(BASE_DIR, 'data', 'temp', 'corrected_vocab_multi_cards.jsonl')

# Ensure directories exist
os.makedirs(AUDIO_DIR, exist_ok=True)
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
                    f("/:Original file backed up at: {BACKUP_JSONL_PATH}\n"
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
    """Generate a unique filename for audio files."""
    safe_word = word.lower().replace(' ', '_')
    return f"{safe_word}_{prefix}_{index}+{voice_id}+{hashlib.md5(text.encode('utf-8')).hexdigest()}.mp3"

def check_duplicates(vocab_db, merge_back_cards=False):
    """Check and handle duplicate entries in the database (case-insensitive, word only)."""
    seen_words = {}
    duplicates = []
    
    for i, entry in enumerate(vocab_db):
        word_lower = entry['word'].lower()
        if word_lower in seen_words:
            duplicates.append((i, entry['word'], seen_words[word_lower][1]))
            seen_words[word_lower][1].append(entry)
        else:
            seen_words[word_lower] = (i, [entry])
    
    removed_count = 0
    redundant_audio_files = []
    unique_vocab_db = []

    for word_lower, (index, entries) in seen_words.items():
        if len(entries) == 1:
            unique_vocab_db.append(entries[0])
            continue

        console.print(Panel(
            f"[yellow]⚠ Duplicate word detected: '{word_lower}' (found {len(entries)} times)[/yellow]",
            title="Duplicate Detected", border_style="yellow", expand=False
        ))
        
        table = Table(title=f"Duplicate Entries for '{word_lower}'", style="yellow", show_lines=True)
        table.add_column("Index", style="bold")
        table.add_column("Word", justify="left")
        table.add_column("Rank", justify="right")
        table.add_column("Freq", justify="right")
        table.add_column("Part of Speech", justify="left")
        table.add_column("Back Cards", justify="right")
        table.add_column("Voice ID", justify="left")
        
        for idx, entry in enumerate(entries):
            table.add_row(
                str(idx),
                entry['word'],
                str(entry['rank']),
                str(entry['freq']),
                entry['part_of_speech'],
                str(len(entry['back_cards'])),
                entry.get('voice_id', 'N/A')
            )
        console.print(table)

        if merge_back_cards:
            entries.sort(key=lambda x: x['rank'])
            kept_entry = entries[0]
            merged_cards = {}
            for entry in entries:
                for card in entry['back_cards']:
                    example = card['example_en']
                    if example not in merged_cards:
                        merged_cards[example] = card
            
            kept_entry['back_cards'] = list(merged_cards.values())
            sentence_audio_files = []
            for i, card in enumerate(kept_entry['back_cards']):
                sentence_text = f"<speak>{kept_entry['word']}. {card['example_en']}</speak>"
                sentence_audio_filename = get_audio_filename(kept_entry['word'], f"{kept_entry['word']}. {card['example_en']}", 'sentence', kept_entry.get('voice_id', 'Matthew'), i)
                sentence_audio_path = os.path.join(AUDIO_DIR, sentence_audio_filename)
                sentence_success = generate_audio(sentence_text, sentence_audio_path, kept_entry.get('voice_id', 'Matthew'), use_ssml=True) if not os.path.exists(sentence_audio_path) else True
                sentence_audio_files.append(sentence_audio_filename if sentence_success else '')
            kept_entry['sentence_audio_file'] = sentence_audio_files
            
            unique_vocab_db.append(kept_entry)
            
            for entry in entries[1:]:
                redundant_audio_files.extend(
                    [os.path.join(AUDIO_DIR, f) for f in entry.get('word_audio_file', []) + entry.get('sentence_audio_file', []) if f]
                )
            removed_count += len(entries) - 1
        else:
            kept_entry = max(entries, key=lambda x: len(x['back_cards']))
            unique_vocab_db.append(kept_entry)
            for entry in entries:
                if entry != kept_entry:
                    redundant_audio_files.extend(
                        [os.path.join(AUDIO_DIR, f) for f in entry.get('word_audio_file', []) + entry.get('sentence_audio_file', []) if f]
                    )
                    removed_count += 1

    for audio_file in redundant_audio_files:
        if os.path.exists(audio_file):
            try:
                os.remove(audio_file)
                logger.info(f"Deleted redundant audio file: {audio_file}")
            except OSError as e:
                logger.error(f"Error deleting audio file {audio_file}: {e}")
    
    return duplicates, removed_count, unique_vocab_db

def verify_audio_files(vocab_db):
    """Verify that audio files exist for database entries."""
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
    """Generate a concise high-tech summary report with missing ranks, totals, and confirmation."""
    if vocab_db:
        max_rank = max(entry['rank'] for entry in vocab_db)
        present_ranks = {entry['rank'] for entry in vocab_db}
        missing_ranks = [rank for rank in range(1, max_rank + 1) if rank not in present_ranks]
        total_words = len(vocab_db)
        total_sentences = sum(len(entry['back_cards']) for entry in vocab_db)
        total_audio_files = sum(len(entry.get('word_audio_file', [])) + len(entry.get('sentence_audio_file', [])) for entry in vocab_db)
    else:
        max_rank = 0
        missing_ranks = []
        total_words = 0
        total_sentences = 0
        total_audio_files = 0

    table = Table(title="📊 Vocabulary Sync Report", style="cyan", show_lines=True)
    table.add_column("Metric", style="bold")
    table.add_column("Value", justify="right")
    
    table.add_row("Processed", str(len(valid_entries)))
    table.add_row("Valid", f"[green]{len(valid_entries)}[/green]")
    table.add_row("Duplicates Removed", f"[yellow]{removed_count}[/yellow]" if removed_count else "0")
    table.add_row("Total Words", str(total_words))
    table.add_row("Total Sentences", str(total_sentences))
    table.add_row("Total Audio Files", str(total_audio_files))
    table.add_row("Database Size", str(len(vocab_db)))
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
        console.print(Panel(
            "\n".join([f"⚠ {word} ({audio_type}, index {index})" for word, audio_type, index, _ in missing_audio]),
            title="Missing Audio", border_style="red", expand=False
        ))

    confirmation = []
    confirmation.append("[green]✓ All Entries Have Audio Files[/green]" if not missing_audio else "[red]✗ Some Audio Files Missing[/red]")
    confirmation.append("[green]✓ No Duplicates or Redundant Audio Files[/green]" if removed_count == 0 and not duplicates else "[red]✗ Duplicates Detected and Removed[/red]")
    confirmation.append("[green]✓ All Ranks Present[/green]" if not missing_ranks else "[yellow]✗ Missing Ranks Detected[/yellow]")
    console.print(Panel("\n".join(confirmation), title="Confirmation", border_style="green", expand=False))

    report_path = os.path.join(REPORTS_DIR, f"vocab_report_{time.strftime('%Y%m%d_%H%M%S')}.txt")
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(str(table))
        f.write("\n\nMissing Ranks:\n")
        if missing_ranks:
            f.write("\n".join([f"Rank {rank}" for rank in missing_ranks]))
        else:
            f.write("None")
        f.write("\n\nMissing Audio Files:\n")
        if missing_audio:
            f.write("\n".join([f"{word} ({audio_type}, index {index})" for word, audio_type, index, _ in missing_audio]))
        else:
            f.write("None")
        f.write("\n\nConfirmation:\n")
        f.write("\n".join([line.strip("[green]").strip("[/green]").strip("[red]").strip("[/red]").strip("[yellow]").strip("[/yellow]") for line in confirmation]))
    logger.info(f"Report saved to: {report_path}")
    console.print(f"[green]✓ Report Saved: {report_path}[/green]")

def process_entries(entries, merge_back_cards=False):
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
                    'part_of_speech': entry['part_of_speech'],
                    'back_cards': entry['back_cards']
                }
            last_word = entry['word']
            last_word_data = {
                'word': entry['word'],
                'rank': entry['rank'],
                'freq': entry['freq'],
                'part_of_speech': entry['part_of_speech'],
                'back_cards': entry['back_cards']
            }

            existing_entry = next((e for e in vocab_db if e['word'].lower() == word_lower), None)

            if existing_entry:
                if merge_back_cards:
                    existing_cards = {card['example_en']: card for card in existing_entry['back_cards']}
                    new_cards = {card['example_en']: card for card in entry['back_cards']}
                    merged_cards = list(existing_cards.values()) + [card for example, card in new_cards.items() if example not in existing_cards]
                    existing_entry['back_cards'] = merged_cards
                    sentence_audio_files = existing_entry.get('sentence_audio_file', [])
                    for i, card in enumerate(merged_cards):
                        if i >= len(sentence_audio_files) or card['example_en'] not in [c['example_en'] for c in existing_cards.values()]:
                            sentence_text = f"<speak>{existing_entry['word']}. {card['example_en']}</speak>"
                            sentence_audio_filename = get_audio_filename(existing_entry['word'], f"{existing_entry['word']}. {card['example_en']}", 'sentence', existing_entry.get('voice_id', 'Matthew'), i)
                            sentence_audio_path = os.path.join(AUDIO_DIR, sentence_audio_filename)
                            sentence_success = generate_audio(sentence_text, sentence_audio_path, existing_entry.get('voice_id', 'Matthew'), use_ssml=True) if not os.path.exists(sentence_audio_path) else True
                            if sentence_success and i >= len(sentence_audio_files):
                                sentence_audio_files.append(sentence_audio_filename)
                            elif sentence_success:
                                sentence_audio_files[i] = sentence_audio_filename
                    existing_entry['sentence_audio_file'] = sentence_audio_files
                else:
                    if len(entry['back_cards']) > len(existing_entry['back_cards']):
                        vocab_db.remove(existing_entry)
                        valid_entries.append(entry)
                    else:
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

    duplicates, removed_count, unique_vocab_db = check_duplicates(vocab_db, merge_back_cards=merge_back_cards)
    vocab_db = unique_vocab_db
    for entry in valid_entries:
        word_lower = entry['word'].lower()
        vocab_db = [e for e in vocab_db if e['word'].lower() != word_lower]
        vocab_db.append(entry)
    vocab_db.sort(key=lambda x: x['rank'])

    missing_audio = verify_audio_files(vocab_db)
    save_file(vocab_db, VOCAB_DB_PATH, file_type='yaml')
    generate_summary_report(vocab_db, valid_entries, duplicates, removed_count, missing_audio, first_word, last_word)
    
    return valid_entries, invalid_entries, first_word_data, last_word_data

def main():
    """Main function with streamlined high-tech UX."""
    console.print(Panel(
        Text("VocabSync v2.3\nNeural-Powered Vocabulary Processor with JSONL Auto-Correction and Duplicate Handling", style="bold cyan"),
        title="System Boot", border_style="blue", expand=False
    ))

    console.print("[cyan]Initializing Vocabulary Sync...[/cyan]")
    entries = load_file(TEMP_VOCAB_JSONL_PATH, file_type='jsonl')
    if not entries:
        console.print("[yellow]No valid entries found in temp_vocab_multi_cards.jsonl.[/yellow]")
        logger.warning("No valid entries to process")
        return

    console.print(f"[cyan]Processing {len(entries)} Entries...[/cyan]")
    append_to_log(entries)
    valid_entries, invalid_entries, first_word_data, last_word_data = process_entries(entries, merge_back_cards=True)
    
    if valid_entries:
        if first_word_data and last_word_data:
            table = Table(title="📋 Processed Batch Summary", style="cyan", show_lines=True)
            table.add_column("Field", style="bold")
            table.add_column("First Word", justify="left")
            table.add_column("Last Word", justify="left")

            table.add_row("Word", first_word_data['word'], last_word_data['word'])
            table.add_row("Rank", str(first_word_data['rank']), str(last_word_data['rank']))
            table.add_row("Frequency", str(first_word_data['freq']), str(last_word_data['freq']))
            table.add_row("Part of Speech", first_word_data['part_of_speech'], last_word_data['part_of_speech'])
            table.add_row("Back Cards", f"{len(first_word_data['back_cards'])} cards", f"{len(last_word_data['back_cards'])} cards")

            console.print(table)
        else:
            console.print("[yellow]⚠ No valid words processed in this batch.[/yellow]")

        save_file([], TEMP_VOCAB_JSONL_PATH, file_type='jsonl')
        console.print("[green]✓ Input File Processed and Cleared.[/green]")
        logger.info("Batch processed successfully. temp_vocab_multi_cards.jsonl cleared.")
    else:
        console.print("[red]✗ Processing Failed. Input File Not Cleared.[/red]")
        logger.warning("Batch processing failed. temp_vocab_multi_cards.jsonl not cleared.")

    if invalid_entries:
        console.print(f"[yellow]⚠ {len(invalid_entries)} Invalid Entries Detected. See vocab_processing.log.[/yellow]")
        logger.warning(f"Invalid entries: {invalid_entries}")

if __name__ == "__main__":
    main()
