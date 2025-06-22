import os
import boto3
from tqdm import tqdm

# Define paths using absolute paths
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
SAMPLE_AUDIO_DIR = os.path.join(BASE_DIR, 'sample_audio')

# Ensure sample audio directory exists
os.makedirs(SAMPLE_AUDIO_DIR, exist_ok=True)

# Initialize AWS Polly client
polly_client = boto3.client('polly', region_name='us-east-1')

# Define the sample sentence
SAMPLE_SENTENCE = "This is a test sentence for AWS Polly voices."

# List of American English voices (en-US) with gender
VOICES = [
    {'VoiceId': 'Matthew', 'Gender': 'Male', 'Engine': 'neural'},
    {'VoiceId': 'Joey', 'Gender': 'Male', 'Engine': 'neural'},
    {'VoiceId': 'Justin', 'Gender': 'Male', 'Engine': 'neural'},
    {'VoiceId': 'Stephen', 'Gender': 'Male', 'Engine': 'neural'},
    {'VoiceId': 'Kevin', 'Gender': 'Male', 'Engine': 'neural'},
    {'VoiceId': 'Joanna', 'Gender': 'Female', 'Engine': 'neural'},
    {'VoiceId': 'Ivy', 'Gender': 'Female', 'Engine': 'neural'},
    {'VoiceId': 'Kendra', 'Gender': 'Female', 'Engine': 'neural'},
    {'VoiceId': 'Kimberly', 'Gender': 'Female', 'Engine': 'neural'},
    {'VoiceId': 'Salli', 'Gender': 'Female', 'Engine': 'neural'},
]

def generate_audio(text, output_path, voice_id, engine='neural', use_ssml=False):
    """Generate audio using AWS Polly and save to output_path."""
    try:
        if use_ssml:
            response = polly_client.synthesize_speech(
                Text=text,
                TextType='ssml',
                OutputFormat='mp3',
                VoiceId=voice_id,
                Engine=engine
            )
        else:
            response = polly_client.synthesize_speech(
                Text=text,
                OutputFormat='mp3',
                VoiceId=voice_id,
                Engine=engine
            )
        with open(output_path, 'wb') as file:
            file.write(response['AudioStream'].read())
        return True
    except Exception as e:
        print(f"Error generating audio for {voice_id}: {e}")
        return False

def generate_sample_audios():
    """Generate sample audio files for all specified voices."""
    successes = []
    failures = []

    for voice in tqdm(VOICES, desc="Generating sample audios"):
        voice_id = voice['VoiceId']
        engine = voice['Engine']
        output_path = os.path.join(SAMPLE_AUDIO_DIR, f"{voice_id}.mp3")

        # Skip if audio file already exists
        if os.path.exists(output_path):
            print(f"Audio file for {voice_id} already exists, skipping.")
            successes.append(voice_id)
            continue

        # Generate audio (no SSML for simplicity)
        success = generate_audio(SAMPLE_SENTENCE, output_path, voice_id, engine, use_ssml=False)
        if success:
            successes.append(voice_id)
            print(f"Generated audio for {voice_id} at {output_path}")
        else:
            failures.append(voice_id)

    print(f"\nSummary: {len(successes)} voices succeeded, {len(failures)} voices failed")
    if successes:
        print(f"Successful voices: {', '.join(successes)}")
    if failures:
        print(f"Failed voices: {', '.join(failures)}")

def main():
    """Main function to generate sample audio files."""
    generate_sample_audios()

if __name__ == "__main__":
    main()
