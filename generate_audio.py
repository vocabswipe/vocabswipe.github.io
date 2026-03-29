import json
import os
import hashlib
import random
import asyncio
import edge_tts

# Define a list of free US English neural voices for variety
VOICES = [
    "en-US-AriaNeural",      # Female
    "en-US-GuyNeural",       # Male
    "en-US-JennyNeural",     # Female
    "en-US-ChristopherNeural",# Male
    "en-US-EricNeural",      # Male
    "en-US-MichelleNeural"   # Female
]

# Ensure the audio directory exists
AUDIO_DIR = "audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

async def generate_audio(text, voice, output_path):
    """Generates audio using edge-tts and saves it to the output path."""
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)

async def process_entries():
    input_file = "input.jsonl"
    output_file = "database.jsonl"

    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found.")
        return

    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'a', encoding='utf-8') as outfile:
        
        for line_num, line in enumerate(infile, 1):
            line = line.strip()
            if not line:
                continue
                
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                print(f"Skipping line {line_num}: Invalid JSON")
                continue

            word = entry.get("english", "")
            sentence = entry.get("sentence_en", "")

            if not word or not sentence:
                print(f"Skipping line {line_num}: Missing 'english' or 'sentence_en'")
                continue

            # 1. Generate a Unique ID
            # Using MD5 hash of (word + sentence) creates a short, URL-safe string
            unique_string = f"{word}_{sentence}"
            entry_id = hashlib.md5(unique_string.encode('utf-8')).hexdigest()

            # 2. Define audio file paths
            word_audio_filename = f"{entry_id}_word.mp3"
            sentence_audio_filename = f"{entry_id}_sentence.mp3"
            
            word_audio_path = os.path.join(AUDIO_DIR, word_audio_filename)
            sentence_audio_path = os.path.join(AUDIO_DIR, sentence_audio_filename)

            # 3. Pick a random voice for this entry
            selected_voice = random.choice(VOICES)
            print(f"Processing: '{word}' (ID: {entry_id[:8]}...) with voice {selected_voice}")

            # 4. Generate the audio files (if they don't already exist to allow resuming)
            if not os.path.exists(word_audio_path):
                await generate_audio(word, selected_voice, word_audio_path)
            
            if not os.path.exists(sentence_audio_path):
                await generate_audio(sentence, selected_voice, sentence_audio_path)

            # 5. Update the entry dictionary
            entry["id"] = entry_id
            entry["audio_word"] = f"audio/{word_audio_filename}"
            entry["audio_sentence"] = f"audio/{sentence_audio_filename}"

            # 6. Append to database.jsonl
            outfile.write(json.dumps(entry, ensure_ascii=False) + '\n')
            
    print("\nProcessing complete! All entries saved to database.jsonl.")

if __name__ == "__main__":
    # Run the async event loop
    asyncio.run(process_entries())
