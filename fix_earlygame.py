with open('game.js', 'r') as f:
    content = f.read()

# makePool 함수 교체 - 앞쪽은 3장씩 묶음, 뒤로 갈수록 섞임
old = """function makePool(){
  const pool=[];
  for(let r=0;r<9;r++) CARDS.forEach(c=>pool.push(c));
  return shuffle(pool);
}"""

new = """function makePool(){
  // 앞 1/3: 3장씩 묶음 (매치 쉬움) → 뒤 2/3: 완전 랜덤
  const pool=[];
  for(let r=0;r<9;r++) CARDS.forEach(c=>pool.push(c));
  // 앞 42장(14종x3)을 3장씩 묶어서 정렬
  const front=[];
  CARDS.forEach(c=>{ front.push(c,c,c); });
  const back=shuffle(pool.slice(42));
  return [...shuffle(front), ...back];
}"""

content = content.replace(old, new)
with open('game.js', 'w') as f:
    f.write(content)
print('done')
