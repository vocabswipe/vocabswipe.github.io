# scripts/generate_search_index.py
import json
from pathlib import Path
import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
WORDS_DIR = PROJECT_ROOT / "data" / "words"
OUTPUT_FILE = PROJECT_ROOT / "data" / "search.json"

search_index = []
for letter in "abcdefghijklmnopqrstuvwxyz":
  yaml_path = WORDS_DIR / f"{letter}.yaml"
  if not yaml_path.exists():
    continue
  with open(yaml_path, "r", encoding="utf-8") as f:
    words = yaml.safe_load(f) or []
    for word in words:
      search_index.append({"word": word["word"], "letter": letter})

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
  json.dump(search_index, f)
