import os
import yaml
import logging
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

# Initialize rich console
console = Console()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'vocab3000_analysis.log'), encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Define paths
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
VOCAB_DB_PATH = os.path.join(BASE_DIR, 'vocab3000_database.yaml')
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

def analyze_database():
    """Analyze the vocab3000_database.yaml file for rank coverage and word count."""
    vocab_db = load_yaml_file(VOCAB_DB_PATH)
    if not vocab_db:
        return

    # Collect word and rank information
    word_count = len(vocab_db)
    rank_to_word = {}
    duplicate_ranks = []
    missing_ranks = []
    invalid_ranks = []

    for entry in vocab_db:
        if not isinstance(entry, dict) or 'word' not in entry or 'rank' not in entry:
            logger.warning(f"Invalid entry found: {entry}")
            continue

        word = entry['word']
        rank = entry.get('rank')
        
        # Validate rank
        if not isinstance(rank, int) or rank < 1 or rank > DATABASE_WORD_LIMIT:
            invalid_ranks.append((word, rank))
            continue

        # Check for duplicate ranks
        if rank in rank_to_word:
            duplicate_ranks.append((rank, rank_to_word[rank], word))
        else:
            rank_to_word[rank] = word

    # Check for missing ranks
    present_ranks = set(rank_to_word.keys())
    missing_ranks = [rank for rank in range(1, DATABASE_WORD_LIMIT + 1) if rank not in present_ranks]

    # Generate summary report
    table = Table(title="📊 Vocabulary Database Analysis", style="cyan", show_lines=True)
    table.add_column("Metric", style="bold")
    table.add_column("Value", justify="right")

    table.add_row("Total Words", str(word_count))
    table.add_row("Expected Words", str(DATABASE_WORD_LIMIT))
    table.add_row("Missing Ranks", f"[yellow]{len(missing_ranks)}[/yellow]" if missing_ranks else "[green]0[/green]")
    table.add_row("Duplicate Ranks", f"[yellow]{len(duplicate_ranks)}[/yellow]" if duplicate_ranks else "[green]0[/green]")
    table.add_row("Invalid Ranks", f"[yellow]{len(invalid_ranks)}[/yellow]" if invalid_ranks else "[green]0[/green]")
    table.add_row("Database Status", 
                  "[red]Exceeds Limit[/red]" if word_count > DATABASE_WORD_LIMIT else 
                  "[yellow]Under Limit[/yellow]" if word_count < DATABASE_WORD_LIMIT else 
                  "[green]At Limit[/green]")

    console.print(table)

    # Report missing ranks
    if missing_ranks:
        console.print(Panel(
            "\n".join([f"Rank {rank}" for rank in missing_ranks]),
            title="Missing Ranks", border_style="yellow", expand=False
        ))

    # Report duplicate ranks
    if duplicate_ranks:
        table = Table(title="⚠ Duplicate Ranks Detected", style="red", show_lines=True)
        table.add_column("Rank", style="bold")
        table.add_column("Original Word", justify="left")
        table.add_column("Duplicate Word", justify="left")
        for rank, original_word, duplicate_word in duplicate_ranks:
            table.add_row(str(rank), original_word, duplicate_word)
        console.print(table)

    # Report invalid ranks
    if invalid_ranks:
        table = Table(title="⚠ Invalid Ranks Detected", style="red", show_lines=True)
        table.add_column("Word", style="bold")
        table.add_column("Invalid Rank", justify="right")
        for word, rank in invalid_ranks:
            table.add_row(word, str(rank))
        console.print(table)

    # Confirmation status
    confirmation = []
    confirmation.append("[green]✓ All Ranks Present[/green]" if not missing_ranks else "[yellow]✗ Missing Ranks Detected[/yellow]")
    confirmation.append("[green]✓ No Duplicate Ranks[/green]" if not duplicate_ranks else "[red]✗ Duplicate Ranks Detected[/red]")
    confirmation.append("[green]✓ No Invalid Ranks[/green]" if not invalid_ranks else red]✗ Invalid Ranks Detected[/red]")
    confirmation.append("[green]✓ Database Size at 3000[/green]" if word_count == DATABASE_WORD_LIMIT else 
                       "[red]✗ Database Size Not at 3000[/red]")
    console.print(Panel("\n".join(confirmation), title="Confirmation Status", border_style="green", expand=False))

    # Log summary
    logger.info(f"Analysis completed: {word_count} words, {len(missing_ranks)} missing ranks, "
                f"{len(duplicate_ranks)} duplicate ranks, {len(invalid_ranks)} invalid ranks")

def main():
    """Main function for analyzing vocab3000_database.yaml."""
    console.print(Panel(
        Text("Vocab3000 Analyzer v1.0\nDatabase Rank and Word Coverage Tool", style="bold cyan"),
        title="System Boot", border_style="blue", expand=False
    ))

    console.print("[cyan]Analyzing vocab3000_database.yaml...[/cyan]")
    analyze_database()
    console.print("[green]✓ Analysis Complete[/green]")

if __name__ == "__main__":
    main()
