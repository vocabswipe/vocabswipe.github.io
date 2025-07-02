import os
import yaml
import logging
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.prompt import Prompt, Confirm

# Initialize rich console
console = Console()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'vocab3000_deletion.log'), encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Define paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
VOCAB_DB_PATH = os.path.join(BASE_DIR, 'data', 'vocab3000_database.yaml')
AUDIO_BACK_DIR = os.path.join(BASE_DIR, 'data', 'audio', 'back')

def load_file(filename, file_type='yaml'):
    """Load a YAML file with error handling."""
    logger.info(f"Loading: {filename}")
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f) or []
    except FileNotFoundError:
        logger.warning(f"{filename} not found. Using default structure.")
        return []
    except yaml.YAMLError as e:
        logger.error(f"Error parsing '{filename}': {e}")
        console.print(Panel(f"[red]Error: Failed to parse {filename}\n{e}[/red]", title="Parse Error", border_style="red"))
        return []

def save_file(data, filename, file_type='yaml'):
    """Save data to a YAML file."""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            yaml.safe_dump(data, f, allow_unicode=True)
        logger.info(f"Successfully saved: {filename}")
        console.print(f"[green]✓ Database saved: {filename}[/green]")
    except Exception as e:
        logger.error(f"Error saving '{filename}': {e}")
        console.print(Panel(f"[red]Error: Failed to save {filename}\n{e}[/red]", title="Save Error", border_style="red"))
        raise

def delete_sentence():
    """Prompt user to select and delete a sentence from the database."""
    console.print(Panel(
        "Vocab3000 Sentence Deletion Tool\nRemove mispronounced sentences and their audio files",
        title="Deletion Tool", border_style="blue", expand=False
    ))

    # Load the database
    vocab_db = load_file(VOCAB_DB_PATH, file_type='yaml')
    if not vocab_db:
        console.print("[red]✗ Database is empty or could not be loaded.[/red]")
        logger.error("Database is empty or failed to load.")
        return

    # Prompt for word
    word = Prompt.ask("[cyan]Enter the front card word (e.g., 'the')[/cyan]").strip()
    word_lower = word.lower()

    # Find the entry
    entry = next((e for e in vocab_db if e['word'].lower() == word_lower), None)
    if not entry:
        console.print(f"[yellow]⚠ Word '{word}' not found in the database.[/yellow]")
        logger.warning(f"Word '{word}' not found.")
        return

    # Check if there are back_cards
    if not entry.get('back_cards'):
        console.print(f"[yellow]⚠ No example sentences found for '{word}'.[/yellow]")
        logger.warning(f"No back_cards for word '{word}'.")
        return

    # Display sentences with numbers
    table = Table(title=f"Example Sentences for '{word}'", style="cyan", show_lines=True)
    table.add_column("No.", style="bold")
    table.add_column("Sentence", justify="left")
    table.add_column("Definition", justify="left")
    table.add_column("Audio File", justify="left")

    for i, card in enumerate(entry['back_cards'], 1):
        table.add_row(
            str(i),
            card['example_en'][:50] + ('...' if len(card['example_en']) > 50 else ''),
            card['definition_en'][:50] + ('...' if len(card['definition_en']) > 50 else ''),
            card.get('audio_file', 'MISSING')[:50] + ('...' if len(card.get('audio_file', '')) > 50 else '')
        )
    console.print(table)

    # Prompt for sentence selection
    selection = Prompt.ask(
        "[cyan]Enter the number of the sentence to delete (or 'cancel' to exit)[/cyan]",
        default="cancel"
    )
    if selection.lower() == 'cancel':
        console.print("[yellow]Operation cancelled.[/yellow]")
        logger.info("User cancelled sentence deletion.")
        return

    try:
        selection_idx = int(selection) - 1
        if selection_idx < 0 or selection_idx >= len(entry['back_cards']):
            console.print("[red]✗ Invalid selection number.[/red]")
            logger.error(f"Invalid selection number: {selection}")
            return
    except ValueError:
        console.print("[red]✗ Invalid input. Please enter a number or 'cancel'.[/red]")
        logger.error(f"Invalid input for selection: {selection}")
        return

    # Confirm deletion
    selected_card = entry['back_cards'][selection_idx]
    sentence = selected_card['example_en']
    audio_file = selected_card.get('audio_file', '')
    console.print(Panel(
        f"Sentence: {sentence}\n"
        f"Definition: {selected_card['definition_en']}\n"
        f"Audio File: {audio_file or 'MISSING'}",
        title="Confirm Deletion", border_style="yellow", expand=False
    ))
    if not Confirm.ask("[cyan]Are you sure you want to delete this sentence?[/cyan]"):
        console.print("[yellow]Operation cancelled.[/yellow]")
        logger.info(f"User cancelled deletion of sentence: {sentence}")
        return

    # Delete the audio file if it exists
    if audio_file:
        audio_path = os.path.join(AUDIO_BACK_DIR, word_lower, audio_file)
        if os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                console.print(f"[green]✓ Deleted audio file: {audio_path}[/green]")
                logger.info(f"Deleted audio file: {audio_path}")
            except OSError as e:
                console.print(f"[red]⚠ Failed to delete audio file {audio_path}: {e}[/red]")
                logger.error(f"Error deleting audio file {audio_path}: {e}")
        else:
            console.print(f"[yellow]⚠ Audio file {audio_path} not found.[/yellow]")
            logger.warning(f"Audio file not found: {audio_path}")

    # Remove the sentence from back_cards
    entry['back_cards'].pop(selection_idx)
    console.print(f"[green]✓ Removed sentence: {sentence}[/green]")
    logger.info(f"Removed sentence '{sentence}' from word '{word}'")

    # If no back_cards remain, remove the entire word entry
    if not entry['back_cards']:
        vocab_db = [e for e in vocab_db if e['word'].lower() != word_lower]
        console.print(f"[green]✓ Removed word '{word}' from database (no remaining sentences).[/green]")
        logger.info(f"Removed word '{word}' from database as no back_cards remain.")
        # Optionally, delete the word audio file
        word_audio_file = entry.get('word_audio_file', '')
        if word_audio_file:
            word_audio_path = os.path.join(BASE_DIR, 'data', 'audio', 'front', word_audio_file)
            if os.path.exists(word_audio_path):
                try:
                    os.remove(word_audio_path)
                    console.print(f"[green]✓ Deleted word audio file: {word_audio_path}[/green]")
                    logger.info(f"Deleted word audio file: {word_audio_path}")
                except OSError as e:
                    console.print(f"[red]⚠ Failed to delete word audio file {word_audio_path}: {e}[/red]")
                    logger.error(f"Error deleting word audio file {word_audio_path}: {e}")

    # Save the updated database
    save_file(vocab_db, VOCAB_DB_PATH, file_type='yaml')

def main():
    """Main function for the sentence deletion tool."""
    while True:
        delete_sentence()
        if not Confirm.ask("[cyan]Do you want to delete another sentence?[/cyan]"):
            console.print("[cyan]Exiting Vocab3000 Sentence Deletion Tool.[/cyan]")
            logger.info("User exited the deletion tool.")
            break

if __name__ == "__main__":
    main()
