import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Cloudflare API Configuration
CF_API_TOKEN = os.getenv('CLOUDFLARE_API_TOKEN', 'YOUR_CLOUDFLARE_API_TOKEN')
ZONE_ID = os.getenv('CLOUDFLARE_ZONE_ID', 'YOUR_ZONE_ID')

def fix_allowlist_typo():
    """
    Search for firewall rules or filters with the typo '얼라인레스트' 
    and rename them to 'ALLOWLIST'.
    """
    if CF_API_TOKEN == 'YOUR_CLOUDFLARE_API_TOKEN':
        print("❌ ERROR: CLOUDFLARE_API_TOKEN not found in .env or script.")
        return

    headers = {
        "Authorization": f"Bearer {CF_API_TOKEN}",
        "Content-Type": "application/json"
    }

    # 1. Fetch Firewall Rules
    print("📡 Fetching Cloudflare Firewall Rules...")
    url = f"https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/firewall/rules"
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch rules: {response.text}")
        return

    rules = response.json().get('result', [])
    found = False

    for rule in rules:
        description = rule.get('description', '')
        if '얼라인레스트' in description:
            print(f"🔍 Found typo in rule: {description} (ID: {rule['id']})")
            
            # Update the description
            new_description = description.replace('얼라인레스트', 'ALLOWLIST')
            update_url = f"{url}/{rule['id']}"
            update_data = {"description": new_description}
            
            upd_resp = requests.patch(update_url, headers=headers, json=update_data)
            if upd_resp.status_code == 200:
                print(f"✅ Successfully updated: {new_description}")
                found = True
            else:
                print(f"❌ Failed to update rule: {upd_resp.text}")

    if not found:
        print("ℹ️ No '얼라인레스트' typos found in Firewall Rules description.")

if __name__ == "__main__":
    fix_allowlist_typo()
