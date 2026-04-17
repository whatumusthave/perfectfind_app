import mouse, keyboard, time, threading
from pynput import mouse, keyboard

kb = keyboard.Controller()
click_count = 0
timer = None

def execute_action():
    global click_count, timer
    if click_count == 1:
        kb.press(keyboard.Key.cmd); kb.press('a'); kb.release('a'); kb.release(keyboard.Key.cmd)
        print("✅ [1] Select All")
    elif click_count == 2:
        kb.press(keyboard.Key.cmd); kb.press(keyboard.Key.shift); kb.press('4')
        kb.release('4'); kb.release(keyboard.Key.shift); kb.release(keyboard.Key.cmd)
        print("📸 [2] Screen Capture")
    elif click_count == 3:
        kb.press(keyboard.Key.backspace); kb.release(keyboard.Key.backspace)
        print("🗑️ [3] Delete")
    elif click_count == 4:
        kb.press(keyboard.Key.enter); kb.release(keyboard.Key.enter)
        print("🚀 [4] Enter Executed")
    click_count = 0
    timer = None

def on_click(x, y, button, pressed):
    global click_count, timer
    if button == mouse.Button.middle and pressed:
        click_count += 1
        if not timer:
            timer = threading.Timer(0.5, execute_action)
            timer.start()

with mouse.Listener(on_click=on_click) as l:
    l.join()
