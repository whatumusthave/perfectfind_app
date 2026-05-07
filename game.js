// Perfect Paw Match - Yang Le Ge Yang (羊了个羊) Style
// Exact clone of the viral Chinese game mechanics

const CARDS = [
  'amethyst_heart','celestial_potion','crystal_ball','fuchsia_ribbon',
  'golden_paw','indigo_bowtie','jeweled_keyhole','midnight_cushion',
  'mystic_yarn_ball','rose_pufferfish','royal_cat_bed','sapphire_paw',
  'shopping_bag','starry_cat_mic'
];
const CARD_PATH = 'assets/cards/';
const SLOT_MAX = 7;
const TW = 58; // tile width
const TH = 58; // tile height

let stage = 1;
let tiles = [];
let slots = [];
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
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Tile generation ───────────────────────────────────────────────────
function generatePool() {
  if (stage === 1) {
    // Stage 1: easy - 5 card types x 3 = 15 tiles
    const pool = [];
    CARDS.slice(0, 5).forEach(c => [0,1,2].forEach(() => pool.push(c)));
    return { board: shuffle(pool), left: [], right: [] };
  }
  // Stage 2+: 14 types x 6 = 84 board + 13 each side deck
  const board = [];
  CARDS.forEach(c => [0,1,2,3,4,5].forEach(() => board.push(c)));
  // Side decks: 13 random cards each (mix of types)
  const allCards = [];
  CARDS.forEach(c => [0,1,2].forEach(() => allCards.push(c)));
  const shuffledAll = shuffle(allCards);
  return {
    board: shuffle(board),
    left: shuffledAll.slice(0, 13),
    right: shuffledAll.slice(13, 26)
  };
}

// ── Board layout - TIGHT GRID with layer overlaps ─────────────────────
function buildBoard(pool) {
  const board = document.getElementById('game-board');
  const bw = board.clientWidth || 500;
  const bh = board.clientHeight || 380;
  tiles = [];

  if (stage === 1) {
    // Simple 2-layer for tutorial
    const STEP = 62; // tile step (slight overlap)
    const COLS = 5;
    const ROWS = Math.ceil(pool.length / COLS);
    const startX = bw/2 - (COLS * STEP)/2;
    const startY = bh/2 - (ROWS * STEP)/2;

    pool.forEach((card, i) => {
      const layer = i < Math.ceil(pool.length * 0.6) ? 0 : 1;
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      tiles.push({
        id: i, card,
        x: startX + col * STEP + (layer * 8),
        y: startY + row * STEP + (layer * 6),
        layer, removed: false
      });
    });
    return;
  }

  // Stage 2+: Yang Le Ge Yang style
  // Grid-based but tiles HEAVILY overlap like real game
  // The key: step size << tile size = dense overlap
  
  const LAYER_COUNT = 5;
  const perLayer = Math.ceil(pool.length / LAYER_COUNT);
  
  // Grid parameters - tight step means lots of overlap
  const STEP_X = 36; // much less than TW=58, so 22px overlap horizontally
  const STEP_Y = 34; // much less than TH=58, so 24px overlap vertically
  
  let idx = 0;
  for (let layer = 0; layer < LAYER_COUNT; layer++) {
    const count = Math.min(perLayer, pool.length - idx);
    const COLS = Math.ceil(Math.sqrt(count * 1.5));
    const ROWS = Math.ceil(count / COLS);
    
    const gridW = COLS * STEP_X;
    const gridH = ROWS * STEP_Y;
    const startX = bw/2 - gridW/2;
    const startY = bh/2 - gridH/2;
    
    // Each higher layer shifts slightly for visual depth
    const layerOffX = (layer - 2) * 3;
    const layerOffY = (layer - 2) * 3;
    
    for (let i = 0; i < count && idx < pool.length; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      
      // Small random jitter within each grid cell - creates the "messy overlap" look
      const jitterX = (Math.random() - 0.5) * 14;
      const jitterY = (Math.random() - 0.5) * 14;
      
      const x = startX + col * STEP_X + layerOffX + jitterX;
      const y = startY + row * STEP_Y + layerOffY + jitterY;
      
      tiles.push({
        id: idx,
        card: pool[idx],
        x: Math.max(0, Math.min(bw - TW, x)),
        y: Math.max(0, Math.min(bh - TH, y)),
        layer,
        removed: false
      });
      idx++;
    }
  }
}

// ── Blocked logic ─────────────────────────────────────────────────────
function isBlocked(tile) {
  if (tile.removed) return true;
  return tiles.some(t =>
    !t.removed &&
    t.id !== tile.id &&
    t.layer > tile.layer &&
    t.x < tile.x + TW - 6 &&
    t.x + TW > tile.x + 6 &&
    t.y < tile.y + TH - 6 &&
    t.y + TH > tile.y + 6
  );
}

// ── Render ────────────────────────────────────────────────────────────
function render() {
  const board = document.getElementById('game-board');
  board.innerHTML = '';
  
  const visible = tiles.filter(t => !t.removed)
    .sort((a,b) => a.layer !== b.layer ? a.layer - b.layer : a.y - b.y);

  visible.forEach((tile, si) => {
    const blocked = isBlocked(tile);
    const el = document.createElement('div');
    el.className = 'tile' + (blocked ? ' blocked' : '');
    el.style.cssText = `left:${tile.x}px;top:${tile.y}px;z-index:${tile.layer*100+si}`;
    const img = document.createElement('img');
    img.src = CARD_PATH + tile.card + '.png';
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
  renderOneDeck('left-deck', leftDeck, 'left');
  renderOneDeck('right-deck', rightDeck, 'right');
}

function renderOneDeck(id, deck, side) {
  const el = document.getElementById(id);
  if (deck.length === 0) {
    el.innerHTML = '<div class="deck-empty">✓</div>';
    return;
  }
  // Show stack visual - multiple cards stacked
  const stackCount = Math.min(deck.length, 4);
  let html = '<div class="deck-wrap" onclick="drawDeck(\'' + side + '\')">';
  // Back cards (face down, offset)
  for (let i = stackCount - 1; i >= 1; i--) {
    html += `<div class="deck-back-card" style="bottom:${i*3}px;right:${i*2}px"></div>`;
  }
  // Top card - face down
  html += '<div class="deck-top-card"><div class="deck-pattern"></div></div>';
  html += `<div class="deck-count">${deck.length}</div>`;
  html += '</div>';
  el.innerHTML = html;
}

function renderSlots() {
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
  document.getElementById('slot-count').textContent = `SLOT: ${slots.length} / ${SLOT_MAX}`;
}

function updateUI() {
  document.getElementById('score').textContent = '★ ' + score.toLocaleString();
  document.getElementById('undo-btn').innerHTML = `↩<br>UNDO(${undoCount})`;
  document.getElementById('shuffle-btn').innerHTML = `⟳<br>SHUF(${shuffleCount})`;
  
  const left = tiles.filter(t => !t.removed).length;
  if (left === 0 && leftDeck.length === 0 && rightDeck.length === 0 && slots.length === 0) {
    showWin();
  }
}

// ── Game actions ──────────────────────────────────────────────────────
function saveUndo(tileId) {
  undoHistory.push({
    tileId,
    slots: [...slots],
    leftDeck: [...leftDeck],
    rightDeck: [...rightDeck],
    tileStates: tiles.map(t => ({ id: t.id, removed: t.removed })),
    score
  });
}

function clickTile(tile) {
  if (!gameActive || tile.removed || isBlocked(tile)) return;
  saveUndo(tile.id);
  tile.removed = true;
  insertToSlot(tile.card);
  checkMatch();
  render();
  if (slots.length >= SLOT_MAX) setTimeout(showLose, 200);
}

function drawDeck(side) {
  if (!gameActive) return;
  if (slots.length >= SLOT_MAX) { showLose(); return; }
  const deck = side === 'left' ? leftDeck : rightDeck;
  if (!deck.length) return;
  saveUndo(null);
  const card = deck.pop();
  insertToSlot(card);
  checkMatch();
  render();
  if (slots.length >= SLOT_MAX) setTimeout(showLose, 200);
}

function insertToSlot(card) {
  // Insert next to matching cards
  let at = slots.length;
  for (let i = slots.length - 1; i >= 0; i--) {
    if (slots[i] === card) { at = i + 1; break; }
  }
  slots.splice(at, 0, card);
}

function checkMatch() {
  let changed = true;
  while (changed) {
    changed = false;
    const map = {};
    slots.forEach((c, i) => { (map[c] = map[c]||[]).push(i); });
    for (const [, idx] of Object.entries(map)) {
      if (idx.length >= 3) {
        const rm = new Set(idx.slice(0, 3));
        slots = slots.filter((_, i) => !rm.has(i));
        score += 300 * stage;
        changed = true;
        break;
      }
    }
  }
}

function doUndo() {
  if (!gameActive || undoCount <= 0 || !undoHistory.length) return;
  const s = undoHistory.pop();
  s.tileStates.forEach(ts => {
    const t = tiles.find(t => t.id === ts.id);
    if (t) t.removed = ts.removed;
  });
  slots = s.slots;
  leftDeck = s.leftDeck;
  rightDeck = s.rightDeck;
  score = s.score;
  undoCount--;
  render();
}

function doShuffle() {
  if (!gameActive || !shuffleCount) return;
  shuffleCount--;
  const active = tiles.filter(t => !t.removed);
  const cards = shuffle(active.map(t => t.card));
  active.forEach((t, i) => t.card = cards[i]);
  render();
}

// ── Timer ─────────────────────────────────────────────────────────────
function startTimer() {
  timeLeft = stage === 1 ? 90 : 180;
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
  el.style.color = timeLeft < 30 ? '#ff6b6b' : '#ffd700';
}

// ── End screens ───────────────────────────────────────────────────────
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

function showLose() {
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
      <p>${stage > 1 ? 'Only 0.1% of players clear this level!' : 'Almost there!'}</p>
      <button onclick="restartGame()">Try Again</button>
      <button onclick="nextStage()">Next Stage</button>
    </div>`;
}

function nextStage() {
  stage++;
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('stage-label').textContent = `Stage ${stage}`;
  startGame();
}

function restartGame() {
  document.getElementById('overlay').style.display = 'none';
  startGame();
}

function startGame() {
  gameActive = true;
  slots = []; undoHistory = [];
  undoCount = 2; shuffleCount = 1; score = 0;
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
