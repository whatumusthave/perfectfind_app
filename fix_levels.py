with open('game.js', 'r') as f:
    content = f.read()

old = """const LEVELS=[
  {boardCount:9,  deckMode:0, layers:3},  // Lv1 튜토리얼
  {boardCount:98, deckMode:4, layers:3},  // Lv2
  {boardCount:98, deckMode:4, layers:4},  // Lv3
  {boardCount:98, deckMode:3, layers:4},  // Lv4
  {boardCount:98, deckMode:3, layers:5},  // Lv5
  {boardCount:98, deckMode:3, layers:5},  // Lv6
  {boardCount:98, deckMode:2, layers:6},  // Lv7
  {boardCount:98, deckMode:2, layers:6},  // Lv8
  {boardCount:98, deckMode:2, layers:7},  // Lv9
  {boardCount:98, deckMode:2, layers:8},  // Lv10 보스
];"""

new = """const LEVELS=[
  {boardCount:9,  deckMode:0, layers:2},  // Lv1 튜토리얼 (초쉬움)
  {boardCount:42, deckMode:0, layers:2},  // Lv2 쉬움
  {boardCount:42, deckMode:4, layers:3},  // Lv3 쉬움+덱
  {boardCount:84, deckMode:4, layers:4},  // Lv4 중간
  {boardCount:84, deckMode:3, layers:4},  // Lv5 중간
  {boardCount:98, deckMode:3, layers:5},  // Lv6 중간+
  {boardCount:98, deckMode:3, layers:6},  // Lv7 중간++
  {boardCount:98, deckMode:2, layers:6},  // Lv8 어려움
  {boardCount:98, deckMode:2, layers:7},  // Lv9 어려움+
  {boardCount:98, deckMode:2, layers:8},  // Lv10 보스
];"""

content = content.replace(old, new)
with open('game.js', 'w') as f:
    f.write(content)
print('done')
