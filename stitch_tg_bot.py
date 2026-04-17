import telebot
import os
import sys
from dotenv import load_dotenv

# Find the .env file relative to the script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DOTENV_PATH = os.path.join(SCRIPT_DIR, '.env')
load_dotenv(DOTENV_PATH)

TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')

if not TOKEN or not CHAT_ID:
    print(f"❌ ERROR: Token or Chat ID not found in {DOTENV_PATH}")
    sys.exit(1)

bot = telebot.TeleBot(TOKEN)

def send_notification(message):
    print(f"📡 Sending notification: {message}")
    try:
        bot.send_message(CHAT_ID, f"🐈‍⬛ [Perfect Paw Match] {message}")
        os.system('afplay /System/Library/Sounds/Pink.aiff') # Play sound as requested
        print("✅ Notification sent successfully with sound.")
    except Exception as e:
        print(f"❌ Failed to send notification: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        msg = " ".join(sys.argv[1:])
        send_notification(msg)
    else:
        send_notification("완성된 14종 카드 시스템 배포가 완료되었습니다! 🐾 모든 인프라 연동이 정상입니다.")
