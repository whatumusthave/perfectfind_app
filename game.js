// Perfect Paw Match - Yang Le Ge Yang Style (Final)
const CARDS = [
  'amethyst_heart','celestial_potion','crystal_ball','fuchsia_ribbon',
  'golden_paw','indigo_bowtie','jeweled_keyhole','midnight_cushion',
  'mystic_yarn_ball','rose_pufferfish','royal_cat_bed','sapphire_paw',
  'shopping_bag','starry_cat_mic'
];
const CARD_PATH = 'assets/cards/';
const SLOT_MAX = 7;
const TW = 58;
const TH = 58;

let stage = 1;
let tiles = [];
let slots = [];        // bottom row (max 7)
let slotsTop = [];     // top row (overflow, max 7) - appears after ad
let leftDeck = [];
let rightDeck = [];
let undoHistory = [];
let undoCount = 2;
let shuffleCount = 1;
let score = 0;
let timeLeft = 90;
let timerInterval = null;
let gameActive = false;
let hasTopRow = false; // whether top row is visible

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function generatePool() {
  if (stage === 1) {
    const pool = [];
    CARDS.slice(0,5).forEach(c => [0,1,2].forEach(() => pool.push(c)));
    return { board: shuffle(pool), left: [], right: [] };
  }
  const board = [];
  CARDS.forEach(c => [0,1,2,3,4,5].forEach(() => board.push(c)));
  const deckPool = [];
  CARDS.forEach(c => [0,1,2].forEach(() => deckPool.push(c)));
  const sd = shuffle(deckPool);
  return { board: shuffle(board), left: sd.slice(0,13), right: sd.slice(13,26) };
}

function buildBoard(pool) {
  const board = document.getElementById('game-board');
  const bw = board.clientWidth || 500;
  const bh = board.clientHeight || 380;
  tiles = [];

  if (stage === 1) {
    const STEP = 62, COLS = 5;
    const startX = bw/2-(COLS*STEP)/2;
    const startY = bh/2-(Math.ceil(pool.length/COLS)*STEP)/2;
    pool.forEach((card,i) => {
      const layer = i < Math.ceil(pool.length*0.6) ? 0 : 1;
      tiles.push({ id:i, card, x:startX+(i%COLS)*STEP+layer*8, y:startY+Math.floor(i/COLS)*STEP+layer*6, layer, removed:false });
    });
    return;
  }

  const LAYER_COUNT = 5, perLayer = Math.ceil(pool.length/LAYER_COUNT);
  const STEP_X = 34, STEP_Y = 32;
  let idx = 0;
  for (let layer = 0; layer < LAYER_COUNT; layer++) {
    const count = Math.min(perLayer, pool.length-idx);
    const COLS = Math.ceil(Math.sqrt(count*1.4));
    const gridW = COLS*STEP_X, gridH = Math.ceil(count/COLS)*STEP_Y;
    const startX = bw/2-gridW/2+(layer-2)*2;
    const startY = bh/2-gridH/2+(layer-2)*2;
    for (let i = 0; i < count && idx < pool.length; i++) {
      const jX = (Math.random()-0.5)*12, jY = (Math.random()-0.5)*12;
      tiles.push({
        id:idx, card:pool[idx],
        x:Math.max(0,Math.min(bw-TW, startX+(i%COLS)*STEP_X+jX)),
        y:Math.max(0,Math.min(bh-TH, startY+Math.floor(i/COLS)*STEP_Y+jY)),
        layer, removed:false
      });
      idx++;
    }
  }
}

function isBlocked(tile) {
  if (tile.removed) return true;
  return tiles.some(t => !t.removed && t.id !== tile.id && t.layer > tile.layer &&
    t.x < tile.x+TW-6 && t.x+TW > tile.x+6 && t.y < tile.y+TH-6 && t.y+TH > tile.y+6);
}

function render() {
  const board = document.getElementById('game-board');
  board.innerHTML = '';
  tiles.filter(t => !t.removed).sort((a,b) => a.layer!==b.layer ? a.layer-b.layer : a.y-b.y)
    .forEach((tile,si) => {
      const blocked = isBlocked(tile);
      const el = document.createElement('div');
      el.className = 'tile'+(blocked?' blocked':' free');
      el.style.cssText = `left:${tile.x}px;top:${tile.y}px;z-index:${tile.layer*100+si}`;
      const img = document.createElement('img');
      img.src = CARD_PATH+tile.card+'.png';
      img.draggable = false;
      el.appendChild(img);
      if (!blocked) el.addEventListener('click', () => clickTile(tile));
      board.appendChild(el);
    });
  renderDecks();
  renderSlots();
  updateUI();
}

function renderDecks() {
  renderDeck('left-deck', leftDeck, 'left');
  renderDeck('right-deck', rightDeck, 'right');
}

function renderDeck(id, deck, side) {
  const el = document.getElementById(id);
  if (!deck.length) { el.innerHTML = '<div class="deck-empty">✓</div>'; return; }
  const topCard = deck[deck.length-1];
  const stackCount = Math.min(deck.length-1, 3);
  let html = `<div class="deck-wrap" onclick="drawDeck('${side}')">`;
  for (let i = stackCount; i > 0; i--) {
    html += `<div class="deck-back-card" style="bottom:${i*3}px;right:${i*2}px;"></div>`;
  }
  html += `<div class="deck-top-open"><img src="${CARD_PATH}${topCard}.png"/></div>`;
  html += `<div class="deck-count">${deck.length}</div></div>`;
  el.innerHTML = html;
}

function renderSlots() {
  // Top row (appears after ad watch)
  const topBar = document.getElementById('slot-bar-top');
  if (hasTopRow) {
    topBar.style.display = 'flex';
    topBar.innerHTML = '';
    for (let i = 0; i < SLOT_MAX; i++) {
      const div = document.createElement('div');
      div.className = 'slot'+(slotsTop[i]?' filled':'');
      if (slotsTop[i]) {
        const img = document.createElement('img');
        img.src = CARD_PATH+slotsTop[i]+'.png';
        div.appendChild(img);
      }
      topBar.appendChild(div);
    }
  } else {
    topBar.style.display = 'none';
    topBar.innerHTML = '';
  }

  // Bottom row (main)
  const bar = document.getElementById('slot-bar');
  bar.innerHTML = '';
  for (let i = 0; i < SLOT_MAX; i++) {
    const div = document.createElement('div');
    div.className = 'slot'+(slots[i]?' filled':'');
    if (slots[i]) {
      const img = document.createElement('img');
      img.src = CARD_PATH+slots[i]+'.png';
      div.appendChild(img);
    }
    bar.appendChild(div);
  }
  const total = slots.length + slotsTop.length;
  const max = hasTopRow ? SLOT_MAX*2 : SLOT_MAX;
  document.getElementById('slot-count').textContent = `SLOT: ${total} / ${max}`;
}

function updateUI() {
  document.getElementById('score').textContent = '★ '+score.toLocaleString();
  document.getElementById('undo-btn').innerHTML = `↩<br>UNDO(${undoCount})`;
  document.getElementById('shuffle-btn').innerHTML = `⟳<br>SHUF(${shuffleCount})`;
  const left = tiles.filter(t => !t.removed).length;
  if (left===0 && !leftDeck.length && !rightDeck.length && !slots.length && !slotsTop.length) showWin();
}

function saveUndo() {
  undoHistory.push({
    slots:[...slots], slotsTop:[...slotsTop], hasTopRow,
    leftDeck:[...leftDeck], rightDeck:[...rightDeck],
    tileStates:tiles.map(t=>({id:t.id,removed:t.removed})), score
  });
}

function insertSlot(card) {
  // Always insert into bottom row first
  let at = slots.length;
  for (let i = slots.length-1; i >= 0; i--) {
    if (slots[i]===card) { at=i+1; break; }
  }
  if (hasTopRow && slots.length >= SLOT_MAX) {
    // Bottom full → put in top row
    let atTop = slotsTop.length;
    for (let i = slotsTop.length-1; i >= 0; i--) {
      if (slotsTop[i]===card) { atTop=i+1; break; }
    }
    slotsTop.splice(atTop, 0, card);
  } else {
    slots.splice(at, 0, card);
  }
}

function checkMatch() {
  // Check bottom row
  let changed = true;
  while (changed) {
    changed = false;
    const map = {};
    slots.forEach((c,i) => { (map[c]=map[c]||[]).push(i); });
    for (const [,idx] of Object.entries(map)) {
      if (idx.length >= 3) {
        const rm = new Set(idx.slice(0,3));
        slots = slots.filter((_,i) => !rm.has(i));
        score += 300*stage;
        changed = true; break;
      }
    }
  }
  // Check top row
  if (hasTopRow) {
    changed = true;
    while (changed) {
      changed = false;
      const map = {};
      slotsTop.forEach((c,i) => { (map[c]=map[c]||[]).push(i); });
      for (const [,idx] of Object.entries(map)) {
        if (idx.length >= 3) {
          const rm = new Set(idx.slice(0,3));
          slotsTop = slotsTop.filter((_,i) => !rm.has(i));
          score += 300*stage;
          changed = true; break;
        }
      }
    }
    // If top row empty, hide it
    if (!slotsTop.length) hasTopRow = false;
  }
}

function clickTile(tile) {
  if (!gameActive || tile.removed || isBlocked(tile)) return;
  saveUndo();
  tile.removed = true;
  insertSlot(tile.card);
  checkMatch();
  render();
  // Check if both rows full
  const bottomFull = slots.length >= SLOT_MAX;
  const topFull = hasTopRow && slotsTop.length >= SLOT_MAX;
  if (bottomFull && !hasTopRow) showSlotFull();
  else if (topFull) showLose();
}

function drawDeck(side) {
  if (!gameActive) return;
  const bottomFull = slots.length >= SLOT_MAX;
  const topFull = hasTopRow && slotsTop.length >= SLOT_MAX;
  if (bottomFull && !hasTopRow) { showSlotFull(); return; }
  if (topFull) { showLose(); return; }
  const deck = side==='left' ? leftDeck : rightDeck;
  if (!deck.length) return;
  saveUndo();
  const card = deck.pop();
  insertSlot(card);
  checkMatch();
  render();
  if (slots.length >= SLOT_MAX && !hasTopRow) showSlotFull();
  else if (hasTopRow && slotsTop.length >= SLOT_MAX) showLose();
}

// SLOT FULL: Show ad → 3 bottom slots move UP to create top row
function showSlotFull() {
  gameActive = false;
  clearInterval(timerInterval);
  document.getElementById('overlay').style.display = 'flex';
  document.getElementById('overlay').innerHTML = `
    <div class="result-box lose">
      <div style="font-size:36px">😾</div>
      <h2>SLOTS FULL!</h2>
      <p>Watch a short ad to push 3 slots up<br>and get more room!</p>
      <button onclick="watchAd()" style="background:#22c55e;color:white;">
        📺 Watch Ad → Push 3 Up
      </button>
      <button onclick="restartGame()">↺ Restart</button>
    </div>`;
}

function watchAd() {
  const overlay = document.getElementById('overlay');
  let countdown = 5; // simulate 5s (use 30 for real)
  overlay.innerHTML = `
    <div class="result-box" style="text-align:center">
      <div style="font-size:48px">📺</div>
      <h2 style="color:var(--l)">Ad Playing...</h2>
      <div id="ad-timer" style="font-size:40px;color:var(--g);margin:16px 0">${countdown}</div>
    </div>`;
  const timer = setInterval(() => {
    countdown--;
    const el = document.getElementById('ad-timer');
    if (el) el.textContent = countdown;
    if (countdown <= 0) {
      clearInterval(timer);
      // Move last 3 from bottom to TOP row
      const moved = slots.splice(slots.length-3, 3);
      slotsTop = [...moved, ...slotsTop];
      hasTopRow = true;
      overlay.style.display = 'none';
      gameActive = true;
      startTimer();
      render();
    }
  }, 1000);
}

function doUndo() {
  if (!gameActive || !undoCount || !undoHistory.length) return;
  const s = undoHistory.pop();
  s.tileStates.forEach(ts => { const t=tiles.find(t=>t.id===ts.id); if(t) t.removed=ts.removed; });
  slots=s.slots; slotsTop=s.slotsTop; hasTopRow=s.hasTopRow;
  leftDeck=s.leftDeck; rightDeck=s.rightDeck; score=s.score;
  undoCount--;
  render();
}

function doShuffle() {
  if (!gameActive || !shuffleCount) return;
  shuffleCount--;
  const active = tiles.filter(t => !t.removed);
  const cards = shuffle(active.map(t => t.card));
  active.forEach((t,i) => t.card=cards[i]);
  render();
}

function startTimer() {
  timeLeft = stage===1 ? 90 : 180;
  clearInterval(timerInterval);
  updateTimer();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimer();
    if (timeLeft <= 0) { clearInterval(timerInterval); showLose(); }
  }, 1000);
}

function updateTimer() {
  const m = String(Math.floor(timeLeft/60)).padStart(2,'0');
  const s = String(timeLeft%60).padStart(2,'0');
  const el = document.getElementById('timer');
  el.textContent = `${m}:${s}`;
  el.style.color = timeLeft<30 ? '#ff6b6b' : '#ffd700';
}

function showWin() {
  gameActive = false; clearInterval(timerInterval);
  document.getElementById('overlay').style.display = 'flex';
  document.getElementById('overlay').innerHTML = `
    <div class="result-box win">
      <div style="font-size:48px">👑</div>
      <h2>PERFECT MATCH!</h2>
      <div class="result-score">Score: ${score.toLocaleString()}</div>
      <button onclick="nextStage()">Next Stage →</button>
      <button onclick="restartGame()">Play Again</button>
    </div>`;
}

function showLose() {
  if (!gameActive) return;
  gameActive = false; clearInterval(timerInterval);
  const rate = stage===1 ? '72%' : '0.1%';
  document.getElementById('overlay').style.display = 'flex';
  document.getElementById('overlay').innerHTML = `
    <div class="result-box lose">
      <div style="font-size:48px">😾</div>
      <h2>GAME OVER</h2>
      <div class="clear-rate">Clear Rate: ${rate}</div>
      <p>${stage>1 ? 'Only 0.1% clear this!' : 'Almost!'}</p>
      <button onclick="restartGame()">↺ Try Again</button>
      <button onclick="nextStage()">Next Stage</button>
    </div>`;
}

function nextStage() { stage++; document.getElementById('overlay').style.display='none'; document.getElementById('stage-label').textContent=`Stage ${stage}`; startGame(); }
function restartGame() { document.getElementById('overlay').style.display='none'; startGame(); }

function startGame() {
  gameActive=true; slots=[]; slotsTop=[]; hasTopRow=false; undoHistory=[];
  undoCount=2; shuffleCount=1; score=0;
  const {board,left,right} = generatePool();
  leftDeck=left; rightDeck=right;
  buildBoard(board);
  render();
  startTimer();
}

window.addEventListener('load', () => { stage=1; startGame(); });
window.doUndo=doUndo; window.doShuffle=doShuffle;
window.restartGame=restartGame; window.nextStage=nextStage;
window.drawDeck=drawDeck; window.watchAd=watchAd;
