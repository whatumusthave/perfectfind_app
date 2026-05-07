// Perfect Paw Match - Yang Le Ge Yang EXACT Clone
// Rules:
// - Grid layout, tiles overlap by exactly 1/4
// - ONLY tiles with NOTHING on top are clickable (fully visible = lit up)
// - Stage 1: simple 3x3 grid, 1 layer = easy tutorial
// - Stage 2+: dense layered grid, hollow center, side decks

const CARDS = [
  'amethyst_heart','celestial_potion','crystal_ball','fuchsia_ribbon',
  'golden_paw','indigo_bowtie','jeweled_keyhole','midnight_cushion',
  'mystic_yarn_ball','rose_pufferfish','royal_cat_bed','sapphire_paw',
  'shopping_bag','starry_cat_mic'
];
const CARD_PATH = 'assets/cards/';
const SLOT_MAX = 7;
const TW = 56; // tile width
const TH = 56; // tile height
const STEP = 42; // grid step = TW * 0.75 = 1/4 overlap

let stage = 1;
let tiles = [];
let slots = [];
let slotsTop = [];
let hasTopRow = false;
let leftDeck = [];
let rightDeck = [];
let undoHistory = [];
let undoCount = 2;
let shuffleCount = 1;
let score = 0;
let timeLeft = 90;
let timerInterval = null;
let gameActive = false;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// ── Generate tile pool ────────────────────────────────────────────────
function generatePool() {
  if (stage === 1) {
    // Stage 1: 3 card types x 3 = 9 tiles, 1 layer, super easy
    const pool = [];
    CARDS.slice(0, 3).forEach(c => [0,1,2].forEach(() => pool.push(c)));
    return { board: shuffle(pool), left: [], right: [] };
  }
  // Stage 2+: 14 types x 6 = 84 board tiles
  const board = [];
  CARDS.forEach(c => [0,1,2,3,4,5].forEach(() => board.push(c)));
  // Side decks: 13 cards each
  const dp = shuffle([...CARDS,...CARDS,...CARDS]);
  return { board: shuffle(board), left: dp.slice(0,13), right: dp.slice(13,26) };
}

// ── Build board layout ────────────────────────────────────────────────
function buildBoard(pool) {
  const board = document.getElementById('game-board');
  const bw = board.clientWidth || 500;
  const bh = board.clientHeight || 420;
  tiles = [];

  if (stage === 1) {
    // Simple 3x3 grid, single layer, centered
    const COLS = 3;
    const gridW = COLS * STEP;
    const gridH = COLS * STEP;
    const startX = Math.floor(bw/2 - gridW/2);
    const startY = Math.floor(bh/2 - gridH/2);
    pool.forEach((card, i) => {
      tiles.push({
        id: i, card,
        col: i % COLS,
        row: Math.floor(i / COLS),
        x: startX + (i % COLS) * STEP,
        y: startY + Math.floor(i / COLS) * STEP,
        layer: 0,
        removed: false
      });
    });
    return;
  }

  // Stage 2+: Multi-layer dense grid
  // Layout: layer 0 = bottom (most tiles), layers go up
  // Each layer is a grid, higher layers shifted by half-step for offset
  
  const LAYER_COUNT = 5;
  const perLayer = Math.ceil(pool.length / LAYER_COUNT);
  let idx = 0;

  for (let layer = 0; layer < LAYER_COUNT; layer++) {
    const count = Math.min(perLayer, pool.length - idx);
    
    // Grid dimensions for this layer
    const COLS = Math.ceil(Math.sqrt(count * 1.3));
    const ROWS = Math.ceil(count / COLS);
    
    // Each layer slightly smaller/centered
    const shrink = layer * 0.5; // slight inward shift per layer
    const gridW = (COLS - 1) * STEP + TW;
    const gridH = (ROWS - 1) * STEP + TH;
    const startX = Math.floor(bw/2 - gridW/2 + shrink * 3);
    const startY = Math.floor(bh/2 - gridH/2 + shrink * 2);

    for (let i = 0; i < count && idx < pool.length; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      tiles.push({
        id: idx,
        card: pool[idx],
        col, row,
        x: startX + col * STEP,
        y: startY + row * STEP,
        layer,
        removed: false
      });
      idx++;
    }
  }
}

// ── CRITICAL: Tile is blocked if ANY other tile on higher layer overlaps it ──
// Overlap threshold: tiles must overlap by at least 1/4 of their size to block
function isBlocked(tile) {
  if (tile.removed) return true;
  const overlap = TW * 0.25; // 1/4 overlap threshold
  return tiles.some(t =>
    !t.removed &&
    t.id !== tile.id &&
    t.layer > tile.layer &&
    // Check if t overlaps tile by at least 1/4
    t.x < tile.x + TW - overlap &&
    t.x + TW > tile.x + overlap &&
    t.y < tile.y + TH - overlap &&
    t.y + TH > tile.y + overlap
  );
}

// ── Render ────────────────────────────────────────────────────────────
function render() {
  const board = document.getElementById('game-board');
  board.innerHTML = '';

  // Sort: lower layers first, then by row/col for proper z-index
  const sorted = tiles.filter(t => !t.removed)
    .sort((a,b) => {
      if (a.layer !== b.layer) return a.layer - b.layer;
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

  sorted.forEach((tile, si) => {
    const blocked = isBlocked(tile);
    const el = document.createElement('div');
    el.className = 'tile' + (blocked ? ' blocked' : ' free');
    el.style.left = tile.x + 'px';
    el.style.top = tile.y + 'px';
    el.style.zIndex = tile.layer * 1000 + tile.row * 50 + tile.col;

    const img = document.createElement('img');
    img.src = CARD_PATH + tile.card + '.png';
    img.draggable = false;
    el.appendChild(img);

    if (!blocked) {
      el.addEventListener('click', () => clickTile(tile));
      el.addEventListener('touchstart', (e) => { e.preventDefault(); clickTile(tile); }, {passive:false});
    }
    board.appendChild(el);
  });

  renderDecks();
  renderSlots();
  updateUI();
}

function renderDecks() {
  renderOneDeck('left-deck', leftDeck, 'left');
  renderOneDeck('right-deck', rightDeck, 'right');
}

function renderOneDeck(id, deck, side) {
  const el = document.getElementById(id);
  if (!deck.length) {
    el.innerHTML = '<div class="deck-empty">✓</div>';
    return;
  }
  const topCard = deck[deck.length - 1];
  const stackCount = Math.min(deck.length - 1, 4);
  let html = `<div class="deck-wrap" onclick="drawDeck('${side}')" ontouchstart="drawDeck('${side}')">`;
  // Stack of face-down cards behind
  for (let i = stackCount; i >= 1; i--) {
    html += `<div class="deck-back-card" style="bottom:${i*3}px;right:${i*2}px"></div>`;
  }
  // Top card face-up
  html += `<div class="deck-top-open"><img src="${CARD_PATH}${topCard}.png" alt=""/></div>`;
  html += `<div class="deck-count">${deck.length}</div>`;
  html += '</div>';
  el.innerHTML = html;
}

function renderSlots() {
  // Top overflow row
  const topBar = document.getElementById('slot-bar-top');
  if (hasTopRow) {
    topBar.style.display = 'flex';
    topBar.innerHTML = '';
    for (let i = 0; i < SLOT_MAX; i++) {
      const div = document.createElement('div');
      div.className = 'slot' + (slotsTop[i] ? ' filled' : '');
      if (slotsTop[i]) {
        const img = document.createElement('img');
        img.src = CARD_PATH + slotsTop[i] + '.png';
        div.appendChild(img);
      }
      topBar.appendChild(div);
    }
  } else {
    topBar.style.display = 'none';
  }

  // Bottom main row
  const bar = document.getElementById('slot-bar');
  bar.innerHTML = '';
  for (let i = 0; i < SLOT_MAX; i++) {
    const div = document.createElement('div');
    div.className = 'slot' + (slots[i] ? ' filled' : '');
    if (slots[i]) {
      const img = document.createElement('img');
      img.src = CARD_PATH + slots[i] + '.png';
      div.appendChild(img);
    }
    bar.appendChild(div);
  }

  const total = slots.length + slotsTop.length;
  const max = hasTopRow ? SLOT_MAX * 2 : SLOT_MAX;
  document.getElementById('slot-count').textContent = `SLOT: ${total} / ${max}`;
}

function updateUI() {
  document.getElementById('score').textContent = '★ ' + score.toLocaleString();
  document.getElementById('undo-btn').innerHTML = `↩<br>UNDO(${undoCount})`;
  document.getElementById('shuffle-btn').innerHTML = `⟳<br>SHUF(${shuffleCount})`;
  const boardLeft = tiles.filter(t => !t.removed).length;
  if (boardLeft === 0 && !leftDeck.length && !rightDeck.length && !slots.length && !slotsTop.length) {
    showWin();
  }
}

// ── Slot management ───────────────────────────────────────────────────
function insertSlot(card) {
  const targetSlots = (hasTopRow && slots.length >= SLOT_MAX) ? slotsTop : slots;
  // Group same cards together
  let at = targetSlots.length;
  for (let i = targetSlots.length - 1; i >= 0; i--) {
    if (targetSlots[i] === card) { at = i + 1; break; }
  }
  targetSlots.splice(at, 0, card);
}

function checkMatch() {
  // Check bottom row
  let changed = true;
  while (changed) {
    changed = false;
    const map = {};
    slots.forEach((c,i) => { (map[c] = map[c] || []).push(i); });
    for (const [,idx] of Object.entries(map)) {
      if (idx.length >= 3) {
        const rm = new Set(idx.slice(0,3));
        slots = slots.filter((_,i) => !rm.has(i));
        score += 300 * stage;
        changed = true; break;
      }
    }
  }
  // Check top row - if match found, pull down from top to fill bottom
  if (hasTopRow) {
    changed = true;
    while (changed) {
      changed = false;
      const map = {};
      slotsTop.forEach((c,i) => { (map[c] = map[c] || []).push(i); });
      for (const [,idx] of Object.entries(map)) {
        if (idx.length >= 3) {
          const rm = new Set(idx.slice(0,3));
          slotsTop = slotsTop.filter((_,i) => !rm.has(i));
          score += 300 * stage;
          changed = true; break;
        }
      }
    }
    // If top row empty, hide it and pull remaining down
    if (!slotsTop.length) {
      hasTopRow = false;
    } else if (slotsTop.length > 0 && slots.length < SLOT_MAX) {
      // Pull from top row to fill bottom row gaps
      while (slots.length < SLOT_MAX && slotsTop.length > 0) {
        slots.push(slotsTop.shift());
      }
      if (!slotsTop.length) hasTopRow = false;
    }
  }
}

// ── Actions ───────────────────────────────────────────────────────────
function saveUndo() {
  undoHistory.push({
    slots: [...slots],
    slotsTop: [...slotsTop],
    hasTopRow,
    leftDeck: [...leftDeck],
    rightDeck: [...rightDeck],
    tileStates: tiles.map(t => ({ id: t.id, removed: t.removed })),
    score
  });
}

function clickTile(tile) {
  if (!gameActive || tile.removed || isBlocked(tile)) return;
  saveUndo();
  tile.removed = true;
  insertSlot(tile.card);
  checkMatch();
  render();
  checkSlotFull();
}

function drawDeck(side) {
  if (!gameActive) return;
  const deck = side === 'left' ? leftDeck : rightDeck;
  if (!deck.length) return;
  if (slots.length >= SLOT_MAX && !hasTopRow) { showSlotFull(); return; }
  if (hasTopRow && slotsTop.length >= SLOT_MAX) { showGameOver(); return; }
  saveUndo();
  const card = deck.pop();
  insertSlot(card);
  checkMatch();
  render();
  checkSlotFull();
}

function checkSlotFull() {
  if (!hasTopRow && slots.length >= SLOT_MAX) showSlotFull();
  else if (hasTopRow && slotsTop.length >= SLOT_MAX) showGameOver();
}

function doUndo() {
  if (!gameActive || !undoCount || !undoHistory.length) return;
  const s = undoHistory.pop();
  s.tileStates.forEach(ts => {
    const t = tiles.find(t => t.id === ts.id);
    if (t) t.removed = ts.removed;
  });
  slots = s.slots; slotsTop = s.slotsTop; hasTopRow = s.hasTopRow;
  leftDeck = s.leftDeck; rightDeck = s.rightDeck; score = s.score;
  undoCount--;
  render();
}

function doShuffle() {
  if (!gameActive || !shuffleCount) return;
  shuffleCount--;
  const active = tiles.filter(t => !t.removed);
  const cards = shuffle(active.map(t => t.card));
  active.forEach((t,i) => t.card = cards[i]);
  render();
}

// ── Slot full → show ad option ────────────────────────────────────────
function showSlotFull() {
  gameActive = false;
  clearInterval(timerInterval);
  document.getElementById('overlay').style.display = 'flex';
  document.getElementById('overlay').innerHTML = `
    <div class="result-box lose">
      <div style="font-size:36px">😾</div>
      <h2>SLOTS FULL!</h2>
      <p>Watch a short ad to push<br>3 slots up and continue!</p>
      <button onclick="watchAd()" style="background:#22c55e;color:#fff;">
        📺 Watch Ad → Push 3 Up
      </button>
      <button onclick="restartGame()">↺ Restart</button>
    </div>`;
}

function watchAd() {
  const overlay = document.getElementById('overlay');
  let cd = 5; // simulate 5s (set to 30 for real ads)
  overlay.innerHTML = `
    <div class="result-box" style="text-align:center">
      <div style="font-size:48px">📺</div>
      <h2 style="color:var(--l)">Ad Playing...</h2>
      <div id="ad-cd" style="font-size:48px;color:var(--g);margin:12px 0">${cd}</div>
    </div>`;
  const t = setInterval(() => {
    cd--;
    const el = document.getElementById('ad-cd');
    if (el) el.textContent = cd;
    if (cd <= 0) {
      clearInterval(t);
      // Move last 3 from bottom row UP to top row
      const moved = slots.splice(slots.length - 3, 3);
      slotsTop = [...moved, ...slotsTop];
      hasTopRow = true;
      overlay.style.display = 'none';
      gameActive = true;
      startTimer();
      render();
    }
  }, 1000);
}

function showGameOver() {
  if (!gameActive) return;
  gameActive = false;
  clearInterval(timerInterval);
  const rate = stage === 1 ? '72%' : '0.1%';
  document.getElementById('overlay').style.display = 'flex';
  document.getElementById('overlay').innerHTML = `
    <div class="result-box lose">
      <div style="font-size:48px">😾</div>
      <h2>GAME OVER</h2>
      <div class="clear-rate">Clear Rate: ${rate}</div>
      <p>${stage > 1 ? 'Only 0.1% of players clear this!' : 'Try again!'}</p>
      <button onclick="restartGame()">↺ Try Again</button>
      <button onclick="nextStage()">Next Stage</button>
    </div>`;
}

function showWin() {
  gameActive = false;
  clearInterval(timerInterval);
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

// ── Timer ─────────────────────────────────────────────────────────────
function startTimer() {
  timeLeft = stage === 1 ? 60 : 180;
  clearInterval(timerInterval);
  updateTimer();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimer();
    if (timeLeft <= 0) { clearInterval(timerInterval); showGameOver(); }
  }, 1000);
}

function updateTimer() {
  const m = String(Math.floor(timeLeft/60)).padStart(2,'0');
  const s = String(timeLeft%60).padStart(2,'0');
  const el = document.getElementById('timer');
  el.textContent = m + ':' + s;
  el.style.color = timeLeft < 30 ? '#ff6b6b' : '#ffd700';
}

function nextStage() {
  stage++;
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('stage-label').textContent = 'Stage ' + stage;
  startGame();
}

function restartGame() {
  document.getElementById('overlay').style.display = 'none';
  startGame();
}

function startGame() {
  gameActive = true;
  slots = []; slotsTop = []; hasTopRow = false;
  undoHistory = []; undoCount = 2; shuffleCount = 1; score = 0;
  const { board, left, right } = generatePool();
  leftDeck = left; rightDeck = right;
  buildBoard(board);
  render();
  startTimer();
}

window.addEventListener('load', () => { stage = 1; startGame(); });
window.doUndo = doUndo;
window.doShuffle = doShuffle;
window.restartGame = restartGame;
window.nextStage = nextStage;
window.drawDeck = drawDeck;
window.watchAd = watchAd;
