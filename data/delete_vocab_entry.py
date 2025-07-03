import os
import yaml
import logging
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.prompt import Prompt

# Initialize rich console
console = Console()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'vocab_entry_deletion.log'), encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Define paths
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
VOCAB_DB_PATH = os.path.join(BASE_DIR, 'vocab3000_database.yaml')
AUDIO_FRONT_DIR = os.path.join(BASE_DIR, 'audio', 'front')
AUDIO_BACK_DIR = os.path.join(BASE_DIR, 'audio', 'back')
DATABASE_WORD_LIMIT = 3000

def load_yaml_file(filename):
    """Load the YAML file with error handling."""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            if not isinstance(data, list):
                logger.error(f"{filename} is not a valid YAML list.")
                console.print(Panel(
                    f"[red]Error: {filename} is not a valid YAML list.[/red]",
                    title="File Error", border_style="red", expand=False
                ))
                return []
            return data
    except FileNotFoundError:
        logger.error(f"{filename} not found.")
        console.print(Panel(
            f"[red]Error: {filename} not found.[/red]",
            title="File Error", border_style="red", expand=False
        ))
        return []
    except yaml.YAMLError as e:
        logger.error(f"Error parsing {filename}: {e}")
        console.print(Panel(
            f"[red]Error parsing {filename}: {e}[/red]",
            title="File Error", border_style="red", expand=False
        ))
        return []

def save_yaml_file(data, filename):
    """Save data to a YAML file."""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            yaml.safe_dump(data, f, allow_unicode=True)
        logger.info(f"Successfully saved: {filename}")
    except Exception as e:
        logger.error(f"Error saving '{filename}': {e}")
        console.print(Panel(
            f"[red]Error saving {filename}: {e}[/red]",
            title="Save Error", border_style="red", expand=False
        ))
        raise

def delete_audio_files(word_entry, word_lower):
    """Delete audio files associated with a word entry."""
    deleted_files = []
    failed_deletions = []

    # Delete word audio file
    word_audio = word_entry.get('word_audio_file', '')
    if word_audio:
        word_audio_path = os.path.join(AUDIO_FRONT_DIR, word_audio)
        if os.path.exists(word_audio_path):
            try:
                os.remove(word_audio_path)
                deleted_files.append(word_audio_path)
                logger.info(f"Deleted word audio file: {word_audio_path}")
            except OSError as e:
                failed_deletions.append((word_audio_path, str(e)))
                logger.error(f"Error deleting word audio file {word_audio_path}: {e}")

    # Delete sentence audio files
    word_dir = os.path.join(AUDIO_BACK_DIR, word_lower)
    if os.path.exists(word_dir):
        for card in word_entry.get('back_cards', []):
            audio_file = card.get('audio_file', '')
            if audio_file:
                audio_path = os.path.join(word_dir, audio_file)
                if os.path.exists(audio_path):
                    try:
                        os.remove(audio_path)
                        deleted_files.append(audio_path)
                        logger.info(f"Deleted sentence audio file: {audio_path}")
                    except OSError as e:
                        failed_deletions.append((audio_path, str(e)))
                        logger.error(f"Error deleting sentence audio file {audio_path}: {e}")
        # Remove word directory if empty
        try:
            if not os.listdir(word_dir):
                os.rmdir(word_dir)
                logger.info(f"Removed empty directory: {word_dir}")
        except OSError as e:
            logger.error(f"Error removing directory {word_dir}: {e}")

    return deleted_files, failed_deletions

def verify_audio_files(vocab_db):
    """Verify that all words and sentences in the database have audio files and check for redundant audio files."""
    missing_audio = []  # (word, type, file)
    redundant_audio = []  # (path, type)

    # Collect all expected audio files
    expected_word_audio = set()
    expected_sentence_audio = set()

    for entry in vocab_db:
        word_lower = entry['word'].lower()
        word_audio = entry.get('word_audio_file', '')
        if not word_audio:
            missing_audio.append((entry['word'], 'word_audio_file', 'MISSING'))
        else:
            word_audio_path = os.path.join(AUDIO_FRONT_DIR, word_audio)
            expected_word_audio.add(word_audio_path)
            if not os.path.exists(word_audio_path):
                missing_audio.append((entry['word'], 'word_audio_file', word_audio))

        for card in entry.get('back_cards', []):
            audio_file = card.get('audio_file', '')
            if not audio_file:
                missing_audio.append((entry['word'], 'sentence_audio_file', f"{card['example_en']} (MISSING)"))
            else:
                sentence_audio_path = os.path.join(AUDIO_BACK_DIR, word_lower, audio_file)
                expected_sentence_audio.add(sentence_audio_path)
                if not os.path.exists(sentence_audio_path):
                    missing_audio.append((entry['word'], 'sentence_audio_file', audio_file))

    # Check for redundant audio files in AUDIO_FRONT_DIR
    if os.path.exists(AUDIO_FRONT_DIR):
        for file in os.listdir(AUDIO_FRONT_DIR):
            file_path = os.path.join(AUDIO_FRONT_DIR, file)
            if os.path.isfile(file_path) and file_path not in expected_word_audio:
                redundant_audio.append((file_path, 'word_audio_file'))

    # Check for redundant audio files in AUDIO_BACK_DIR
    if os.path.exists(AUDIO_BACK_DIR):
        for word_dir in os.listdir(AUDIO_BACK_DIR):
            word_dir_path = os.path.join(AUDIO_BACK_DIR, word_dir)
            if os.path.isdir(word_dir_path):
                for file in os.listdir(word_dir_path):
                    file_path = os.path.join(word_dir_path, file)
                    if os.path.isfile(file_path) and file_path not in expected_sentence_audio:
                        redundant_audio.append((file_path, 'sentence_audio_file'))

    return missing_audio, redundant_audio

def delete_word_entry(word_to_delete):
    """Delete a word entry from the database and its associated audio files."""
    vocab_db = load_yaml_file(VOCAB_DB_PATH)
    if not vocab_db:
        return False, [], []

    word_lower = word_to_delete.lower()
    deleted_files = []
    failed_deletions = []
    found = False

    # Find and remove the word entry
    for entry in vocab_db[:]:
        if entry.get('word', '').lower() == word_lower:
            found = True
            deleted_files, failed_deletions = delete_audio_files(entry, word_lower)
            vocab_db.remove(entry)
            logger.info(f"Removed entry for word: {word_to_delete}")
            console.print(Panel(
                f"[green]✓ Removed entry for word: {word_to_delete}[/green]",
                title="Deletion Success", border_style="green", expand=False
            ))
            break

    if not found:
        logger.warning(f"Word '{word_to_delete}' not found in database.")
        console.print(Panel(
            f"[yellow]⚠ Word '{word_to_delete}' not found in database.[/yellow]",
            title="Word Not Found", border_style="yellow", expand=False
        ))
        return False, [], []

    # Save updated database
    save_yaml_file(vocab_db, VOCAB_DB_PATH)

    # Report deleted files
    if deleted_files:
        table = Table(title="🗑️ Deleted Audio Files", style="cyan", show_lines=True)
        table.add_column("File Path", style="bold")
        for file_path in deleted_files:
            table.add_row(file_path)
        console.print(table)

    # Report failed deletions
    if failed_deletions:
        table = Table(title="⚠ Failed Audio File Deletions", style="red", show_lines=True)
        table.add_column("File Path", style="bold")
        table.add_column("Error", justify="left")
        for file_path, error in failed_deletions:
            table.add_row(file_path, error[:50] + ('...' if len(error) > 50 else ''))
        console.print(table)

    return True, deleted_files, failed_deletions

def generate_summary_report(vocab_db, deleted_word, deleted_files, failed_deletions):
    """Generate a summary report after deletion, including audio file verification."""
    word_count = len(vocab_db)
    missing_audio, redundant_audio = verify_audio_files(vocab_db)

    # Summary table
    table = Table(title="📊 Database Status After Deletion", style="cyan", show_lines=True)
    table.add_column("Metric", style="bold")
    table.add_column("Value", justify="right")

    table.add_row("Deleted Word", deleted_word or "None")
    table.add_row("Total Words", str phrase="Word Not Found" if not deleted_word else f"Deleted {deleted_word}")
    table.add_row("Expected Words", str(DATABASE_WORD_LIMIT))
    table.add_row("Deleted Audio Files", str(len(deleted_files)))
    table.add_row("Failed Deletions", f"[yellow]{len(failed_deletions)}[/yellow]" if failed_deletions else "[green]0[/green]")
    table.add_row("Missing Audio Files", f"[yellow]{len(missing_audio)}[/yellow]" if missing_audio else "[green]0[/green]")
    table.add_row("Redundant Audio Files", f"[yellow]{len(redundant_audio)}[/yellow]" if redundant_audio else "[green]0[/green]")
    table.add_row("Database Status", 
                  "[red]Exceeds Limit[/red]" if word_count > DATABASE_WORD_LIMIT else 
                  "[yellow]Under Limit[/yellow]" if word_count < DATABASE_WORD_LIMIT else 
                  "[green]At Limit[/green]")

    console.print(table)

    # Report missing audio files
    if missing_audio:
        table = Table(title="⚠ Missing Audio Files", style="red", show_lines=True)
        table.add_column("Word", style="bold")
        table.add_column("Type", justify="left")
        table.add_column("File", justify="left")
        for word, audio_type, audio_file in missing_audio:
            table.add_row(word, audio_type, audio_file[:50] + ('...' if len(audio_file) > 50 else ''))
        console.print(table)

    # Report redundant audio files
    if redundant_audio:
        table = Table(title="⚠ Redundant Audio Files", style="red", show_lines=True)
        table.add_column("File Path", style="bold")
        table.add_column("Type", justify="left")
        for file_path, audio_type in redundant_audio:
            table.add_row(file_path, audio_type)
        console.print(table)

    # Confirmation status
    confirmation = []
    confirmation.append("[green]✓ All Words Have Audio Files[/green]" if not any(t == 'word_audio_file' for _, t, _ in missing_audio) else "[red]✗ Some Word Audio Files Missing[/red]")
    confirmation.append("[green]✓ All Sentences Have Audio Files[/green]" if not any(t == 'sentence_audio_file' for _, t, _ in missing_audio) else "[red]✗ Some Sentence Audio Files Missing[/red]")
    confirmation.append("[green]✓ No Redundant Audio Files[/green]" if not redundant_audio else "[red]✗ Redundant Audio Files Detected[/red]")
    confirmation.append("[green]✓ Database Size at 3000[/green]" if word_count == DATABASE_WORD_LIMIT else 
                       "[red]✗ Database Size Not at 3000[/red]")
    console.print(Panel("\n".join(confirmation), title="Confirmation Status", border_style="green", expand=False))

    # Log summary
    logger.info(f"Summary: {word_count} words, {len(missing_audio)} missing audio files, "
                f"{len(redundant_audio)} redundant audio files, {len(deleted_files)} deleted files, "
                f"{len(failed_deletions)} failed deletions")

def main():
    """Main function to delete a word entry and verify the database."""
    console.print(Panel(
        Text("Vocab3000 Entry Deleter v1.0\nWord and Audio Removal Tool", style="bold cyan"),
        title="System Boot", border_style="blue", expand=False
    ))

    # Prompt user for the word to delete
    word_to_delete = Prompt.ask("[cyan]Enter the word to delete (e.g., 'directors')", default="directors")
    console.print(f"[cyan]Deleting entry for word: {word_to_delete}...[/cyan]")

    # Delete the word entry and its audio files
    success, deleted_files, failed_deletions = delete_word_entry(word_to_delete)

    # Load the updated database for verification
    vocab_db = load_yaml_file(VOCAB_DB_PATH)
    if not vocab_db and success:
        console.print(Panel(
            "[red]Database is empty after deletion.[/red]",
            title="Database Error", border_style="red", expand=False
        ))
        return

    # Generate summary report
    generate_summary_report(vocab_db, word_to_delete if success else None, deleted_files, failed_deletions)
    console.print("[green]✓ Operation Complete[/green]")

if __name__ == "__main__":
    main()
