import json
import os

all_screens = []

raw_files = [
    "/Users/siayoon/.gemini/antigravity/brain/5b18996f-4ef4-480f-a020-1d97a2c51c85/.system_generated/steps/24/output.txt",
    "/Users/siayoon/.gemini/antigravity/brain/5b18996f-4ef4-480f-a020-1d97a2c51c85/.system_generated/steps/51/output.txt"
]

for rf in raw_files:
    if os.path.exists(rf):
        with open(rf, 'r') as f:
            data = json.load(f)
            screens = data.get('screens', [])
            for s in screens:
                # screen name format is projects/UID/screens/SCREEN_ID
                # but id field in screen object might be different. Let's look at the JSON again.
                # In the output.txt I saw earlier: {"name":"projects/.../screens/ID", "title":"...", "screenshot":{"downloadUrl":"..."}}
                # Some screens also have "id" directly.
                
                name = s.get('name', '')
                screen_id = name.split('/')[-1] if name else s.get('id', 'unknown')
                
                all_screens.append({
                    "id": screen_id,
                    "title": s.get('title', 'No Title'),
                    "url": s.get('screenshot', {}).get('downloadUrl', '')
                })

# Deduplicate by id
unique_screens = {s['id']: s for s in all_screens}.values()

with open('stitch_screens.json', 'w') as f:
    json.dump(list(unique_screens), f, indent=4)

print(f"Generated stitch_screens.json with {len(unique_screens)} unique screens.")
