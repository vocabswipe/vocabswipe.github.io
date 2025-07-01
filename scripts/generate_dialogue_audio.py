import os
import json
import hashlib
import logging
import random
from rich.console import Console
from rich.panel import Panel
from rich.text import Text  # Added import to fix NameError
from rich.progress import Progress, BarColumn, TextColumn, SpinnerColumn
import boto3

# Initialize rich console
console = Console()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('dialogue_processing.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Define paths
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
INPUT_FILE = os.path.join(BASE_DIR, 'dialogues.jsonl')
OUTPUT_DB = os.path.join(BASE_DIR, 'dialogues_database.jsonl')
AUDIO_DIR = os.path.join(BASE_DIR, 'sample_dialogue_audio')

# Ensure audio directory exists
os.makedirs(AUDIO_DIR, exist_ok=True)

# Initialize AWS Polly client
try:
    polly_client = boto3.client('polly', region_name='us-east-1')
    logger.info("AWS Polly client initialized successfully.")
    console.print("[green]✓ Neural Audio Synthesis Engine Online[/green]")
except Exception as e:
    logger.error(f"Failed to initialize AWS Polly client: {e}")
    console.print(Panel(f"[red]Alert: Failed to initialize Neural Audio Synthesis Engine\nError: {e}[/red]", title="System Error", border_style="red"))
    raise

# Voice mapping based on gender
VOICE_MAP = {
    'male': ['Joey', 'Matthew', 'Stephen'],
    'female': ['Joanna', 'Kendra']
}

def load_jsonl(filename):
    """Load JSONL file with error handling."""
    entries = []
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        entry = json.loads(line)
                        # Validate required fields
                        if not all(key in entry for key in ['situation', 'dialogue', 'explanations', 'audio_file', 'audio_voice']):
                            logger.warning(f"Missing required fields in entry: {line}")
                            continue
                        entries.append(entry)
                    except json.JSONDecodeError as e:
                        logger.warning(f"Invalid JSON line: {line} - Error: {e}")
        logger.info(f"Loaded {len(entries)} entries from {filename}")
        console.print(f"[cyan]✓ Loaded {len(entries)} dialogue(s) from {filename}[/cyan]")
        return entries
    except FileNotFoundError:
        logger.error(f"{filename} not found.")
        console.print(f"[red]✗ {filename} not found.[/red]")
        return []
    except Exception as e:
        logger.error(f"Error loading {filename}: {e}")
        console.print(f"[red]✗ Error loading {filename}: {e}[/red]")
        return []

def save_jsonl(data, filename):
    """Save data to JSONL file."""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            for entry in data:
                json.dump(entry, f, ensure_ascii=False)
                f.write('\n')
        logger.info(f"Saved {len(data)} entries to {filename}")
        console.print(f"[green]✓ Saved {len(data)} dialogue(s) to {filename}[/green]")
    except Exception as e:
        logger.error(f"Error saving {filename}: {e}")
        console.print(f"[red]✗ Error saving {filename}: {e}[/red]")
        raise

def generate_audio(dialogue, situation, output_path, voice_map):
    """Generate a single audio file for the dialogue with pauses between speakers."""
    try:
        # Build SSML with pauses (0.5 seconds between speakers)
        ssml_parts = []
        for line in dialogue:
            speaker = line['speaker']
            text = line['text']
            gender = line['gender'].lower()
            voice = random.choice(voice_map.get(gender, voice_map['male']))  # Default to male if gender unknown
            # Escape special characters for SSML
            text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&apos;')
            ssml_parts.append(f'<p><prosody rate="medium"><voice name="{voice}">{text}</voice></prosody></p>')
        # Join with break tags outside f-string
        break_tag = '<break time="500ms"/>'
        ssml_text = '<speak>' + break_tag.join(ssml_parts) + '</speak>'

        response = polly_client.synthesize_speech(
            Text=ssml_text,
            TextType='ssml',
            OutputFormat='mp3',
            VoiceId=voice_map['male'][0],  # Primary voice for SSML (others embedded)
            Engine='neural',
            SampleRate='22050'
        )
        with open(output_path, 'wb') as f:
            f.write(response['AudioStream'].read())
        logger.info(f"Generated audio for '{situation}' at {output_path}")
        console.print(f"[green]✓ Generated audio for '{situation}' at {output_path}[/green]")
        return True
    except Exception as e:
        logger.error(f"Error generating audio for '{situation}': {e}")
        console.print(f"[red]⚠ Audio Generation Failed for '{situation}': {e}[/red]")
        return False

def get_audio_filename(situation, dialogue):
    """Generate unique filename using situation and MD5 hash of dialogue content."""
    dialogue_text = ''.join(line['text'] for line in dialogue)
    hash_value = hashlib.md5((situation + dialogue_text).encode('utf-8')).hexdigest()
    safe_situation = situation.replace(' ', '_').replace("'", "").lower()
    return os.path.join(AUDIO_DIR, f"{safe_situation}_{hash_value}.mp3")

def process_dialogue_entry():
    """Process the dialogue entries and generate audio."""
    entries = load_jsonl(INPUT_FILE)
    if not entries:
        console.print("[red]✗ No valid entries found in dialogues.jsonl[/red]")
        return

    with Progress(
        SpinnerColumn(),
        TextColumn("[cyan]Processing Dialogues..."),
        BarColumn(bar_width=20),
        TextColumn("{task.percentage:>3.0f}%"),
        console=console,
        refresh_per_second=10
    ) as progress:
        task = progress.add_task("Processing...", total=len(entries))

        updated_entries = []
        for entry in entries:
            situation = entry['situation']
            dialogue = entry['dialogue']
            # Generate unique filename
            audio_filename = get_audio_filename(situation, dialogue)
            # Track voices used
            voices_used = []
            for line in dialogue:
                gender = line['gender'].lower()
                voice = random.choice(VOICE_MAP.get(gender, VOICE_MAP['male']))
                voices_used.append({line['speaker']: voice})
            # Generate audio
            success = generate_audio(dialogue, situation, audio_filename, VOICE_MAP)
            if success:
                entry['audio_file'] = audio_filename
                entry['audio_voice'] = voices_used
                updated_entries.append(entry)
            else:
                console.print(f"[yellow]⚠ Skipped saving entry for '{situation}' due to audio generation failure[/yellow]")
            progress.advance(task)

        # Save updated database
        save_jsonl(updated_entries, OUTPUT_DB)
        console.print(f"[green]✓ Processed {len(updated_entries)} dialogue(s). Database saved to {OUTPUT_DB}[/green]")

if __name__ == "__main__":
    console.print(Panel(
        Text("DialogueSync v1.1\nNeural-Powered Dialogue Audio Generator", style="bold cyan"),
        title="System Boot", border_style="blue", expand=False
    ))
    process_dialogue_entry()
