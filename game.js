// Perfect Paw Match - Yang Le Ge Yang Style Game
// 14 cards × 6 = 84 tiles, guaranteed 3-divisible, rage-inducing difficulty

const CARDS = [
  'amethyst_heart', 'celestial_potion', 'crystal_ball', 'fuchsia_ribbon',
  'golden_paw', 'indigo_bowtie', 'jeweled_keyhole', 'midnight_cushion',
  'mystic_yarn_ball', 'rose_pufferfish', 'royal_cat_bed', 'sapphire_paw',
  'shopping_bag', 'starry_cat_mic'
];

const CARD_PATH = 'assets/cards/';
const SLOT_MAX = 7;
const TILE_W = 64;
const TILE_H = 64;
const TILE_OVERLAP = 20; // how much tiles overlap each other

let stage = 1;
let tiles = [];
let slots = [];
let leftDeck = [];
let rightDeck = [];
let undoStack = [];
let undoCount = 2;
let shuffleCount = 1;
let score = 0;
let timerInterval = null;
let timeLeft = 120;
let gameActive = false;

// ── Generate tiles guaranteed divisible by 3 ──────────────────────────
function generateTiles(stageNum) {
  const pool = [];
  // Stage 1: 5 card types × 3 = 15 tiles (easy)
  // Stage 2+: all 14 × 6 = 84 tiles (brutal)
  if (stageNum === 1) {
    const easyCards = CARDS.slice(0, 5);
    easyCards.forEach(c => { for (let i = 0; i < 3; i++) pool.push(c); });
  } else {
    CARDS.forEach(c => { for (let i = 0; i < 6; i++) pool.push(c); });
  }
  return shuffle(pool);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Build layered board layout ─────────────────────────────────────────
function buildBoard(pool) {
  const board = document.getElementById('game-board');
  const bw = board.clientWidth || 600;
  const bh = board.clientHeight || 480;

  // Stage 1: 2 layers, Stage 2+: 5 layers with tight overlapping
  const layerCount = stage === 1 ? 2 : 5;
  const tilesOnBoard = stage === 1 ? pool.length : Math.floor(pool.length * 0.75);
  const tilesPerLayer = Math.ceil(tilesOnBoard / layerCount);

  tiles = [];
  let poolIdx = 0;

  for (let layer = 0; layer < layerCount; layer++) {
    const count = Math.min(tilesPerLayer, pool.length - poolIdx);
    const cols = Math.ceil(Math.sqrt(count));

    for (let i = 0; i < count && poolIdx < pool.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      // Base position centered on board
      const startX = bw / 2 - (cols * (TILE_W - TILE_OVERLAP)) / 2;
      const startY = bh / 2 - (Math.ceil(count / cols) * (TILE_H - TILE_OVERLAP)) / 2;

      // Random offset for chaotic overlapping (key to yang le ge yang feel)
      const randOffX = stage === 1 ? 0 : (Math.random() - 0.5) * TILE_W * 0.8;
      const randOffY = stage === 1 ? 0 : (Math.random() - 0.5) * TILE_H * 0.8;

      const x = startX + col * (TILE_W - TILE_OVERLAP) + randOffX;
      const y = startY + row * (TILE_H - TILE_OVERLAP) + randOffY;

      tiles.push({
        id: poolIdx,
        card: pool[poolIdx],
        x: Math.max(0, Math.min(bw - TILE_W, x)),
        y: Math.max(0, Math.min(bh - TILE_H, y)),
        layer,
        removed: false,
        el: null
      });
      poolIdx++;
    }
  }

  // Side decks get remaining tiles
  const remaining = pool.slice(poolIdx);
  const half = Math.floor(remaining.length / 2);
  leftDeck = remaining.slice(0, half);
  rightDeck = remaining.slice(half);
}

// ── Check if tile is blocked (another tile overlaps it on higher layer) ─
function isBlocked(tile) {
  if (tile.removed) return true;
  return tiles.some(t =>
    !t.removed &&
    t.layer > tile.layer &&
    t.x < tile.x + TILE_W - 4 &&
    t.x + TILE_W > tile.x + 4 &&
    t.y < tile.y + TILE_H - 4 &&
    t.y + TILE_H > tile.y + 4
  );
}

// ── Render everything ─────────────────────────────────────────────────
function render() {
  const board = document.getElementById('game-board');
  board.innerHTML = '';

  tiles.forEach(tile => {
    if (tile.removed) return;
    const blocked = isBlocked(tile);

    const el = document.createElement('div');
    el.className = 'tile' + (blocked ? ' blocked' : '');
    el.style.left = tile.x + 'px';
    el.style.top = tile.y + 'px';
    el.style.zIndex = tile.layer * 10 + Math.floor(tile.y / 10);

    const img = document.createElement('img');
    img.src = CARD_PATH + tile.card + '.png';
    img.draggable = false;
    el.appendChild(img);

    if (!blocked) {
      el.addEventListener('click', () => clickTile(tile));
    }

    tile.el = el;
    board.appendChild(el);
  });

  renderSlots();
  renderDecks();
  updateUI();
}

function renderSlots() {
  const slotBar = document.getElementById('slot-bar');
  slotBar.innerHTML = '';
  for (let i = 0; i < SLOT_MAX; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    if (slots[i]) {
      const img = document.createElement('img');
      img.src = CARD_PATH + slots[i].card + '.png';
      slot.appendChild(img);
      slot.classList.add('filled');
    }
    slotBar.appendChild(slot);
  }
  document.getElementById('slot-count').textContent = `SLOT: ${slots.length} / ${SLOT_MAX}`;
}

function renderDecks() {
  const ld = document.getElementById('left-deck');
  const rd = document.getElementById('right-deck');

  ld.innerHTML = '';
  rd.innerHTML = '';

  if (leftDeck.length > 0) {
    const stack = document.createElement('div');
    stack.className = 'deck-stack';
    stack.innerHTML = `<div class="deck-back"></div><div class="deck-count">${leftDeck.length}</div>`;
    stack.addEventListener('click', () => drawFromDeck('left'));
    ld.appendChild(stack);
  }

  if (rightDeck.length > 0) {
    const stack = document.createElement('div');
    stack.className = 'deck-stack';
    stack.innerHTML = `<div class="deck-back"></div><div class="deck-count">${rightDeck.length}</div>`;
    stack.addEventListener('click', () => drawFromDeck('right'));
    rd.appendChild(stack);
  }
}

function updateUI() {
  document.getElementById('score').textContent = '★ ' + score.toLocaleString();
  document.getElementById('undo-btn').textContent = `↩ UNDO (${undoCount})`;
  document.getElementById('shuffle-btn').textContent = `⟳ SHUFFLE (${shuffleCount})`;

  const remaining = tiles.filter(t => !t.removed).length;
  if (remaining === 0 && leftDeck.length === 0 && rightDeck.length === 0 && slots.length === 0) {
    showWin();
  }
}

// ── Game actions ──────────────────────────────────────────────────────
function clickTile(tile) {
  if (!gameActive || tile.removed || isBlocked(tile)) return;

  // Save undo state
  undoStack.push({
    tileId: tile.id,
    slots: [...slots],
    score
  });

  tile.removed = true;
  tile.el.classList.add('removing');

  // Insert into slots sorted by card type
  const insertIdx = findInsertIndex(tile.card);
  slots.splice(insertIdx, 0, { card: tile.card, tileId: tile.id });

  setTimeout(() => {
    checkMatches();
    render();
    if (slots.length >= SLOT_MAX) {
      setTimeout(showLose, 300);
    }
  }, 150);
}

function findInsertIndex(card) {
  // Group same cards together
  let lastSame = -1;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].card === card) lastSame = i;
  }
  return lastSame >= 0 ? lastSame + 1 : slots.length;
}

function checkMatches() {
  const counts = {};
  slots.forEach((s, i) => {
    if (!counts[s.card]) counts[s.card] = [];
    counts[s.card].push(i);
  });

  let matched = false;
  Object.entries(counts).forEach(([card, indices]) => {
    if (indices.length >= 3) {
      // Remove first 3
      const toRemove = indices.slice(0, 3);
      slots = slots.filter((_, i) => !toRemove.includes(i));
      score += 300;
      matched = true;
    }
  });

  if (matched) checkMatches(); // chain matches
}

function drawFromDeck(side) {
  if (!gameActive) return;
  if (slots.length >= SLOT_MAX) { showLose(); return; }

  const deck = side === 'left' ? leftDeck : rightDeck;
  if (deck.length === 0) return;

  const card = deck.pop();
  const insertIdx = findInsertIndex(card);
  slots.splice(insertIdx, 0, { card, fromDeck: side });

  checkMatches();
  render();

  if (slots.length >= SLOT_MAX) {
    setTimeout(showLose, 300);
  }
}

function doUndo() {
  if (!gameActive || undoCount <= 0 || undoStack.length === 0) return;
  const state = undoStack.pop();
  const tile = tiles.find(t => t.id === state.tileId);
  if (tile) tile.removed = false;
  slots = state.slots;
  score = state.score;
  undoCount--;
  render();
}

function doShuffle() {
  if (!gameActive || shuffleCount <= 0) return;
  shuffleCount--;

  const activeTiles = tiles.filter(t => !t.removed);
  const cards = activeTiles.map(t => t.card);
  const shuffled = shuffle(cards);
  activeTiles.forEach((t, i) => t.card = shuffled[i]);

  render();
}

// ── Timer ─────────────────────────────────────────────────────────────
function startTimer() {
  timeLeft = stage === 1 ? 120 : 180;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timer').textContent = `${mins}:${secs}`;
    document.getElementById('timer').style.color = timeLeft < 30 ? '#ff6b6b' : '#ffd700';

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      showLose();
    }
  }, 1000);
}

// ── Win / Lose screens ────────────────────────────────────────────────
function showWin() {
  gameActive = false;
  clearInterval(timerInterval);

  const overlay = document.getElementById('overlay');
  overlay.innerHTML = `
    <div class="result-box win">
      <div class="result-stars">⭐⭐⭐</div>
      <h2>PERFECT PAW MATCH!</h2>
      <div class="result-score">Score: ${score.toLocaleString()}</div>
      <button onclick="nextStage()">Next Level →</button>
      <button onclick="restartGame()">Play Again</button>
    </div>`;
  overlay.style.display = 'flex';
}

function showLose() {
  gameActive = false;
  clearInterval(timerInterval);

  const clearRate = stage === 1 ? '72%' : '0.1%';
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = `
    <div class="result-box lose">
      <h2>💀 GAME OVER</h2>
      <div class="clear-rate">Clear Rate: ${clearRate}</div>
      <p>${stage === 1 ? 'So close! Try again?' : 'Only 0.1% of players clear this. Try again?'}</p>
      <button onclick="restartGame()">↩ Try Again</button>
      <button onclick="nextStage()">Skip to Next</button>
    </div>`;
  overlay.style.display = 'flex';
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

// ── Init ──────────────────────────────────────────────────────────────
function startGame() {
  gameActive = true;
  slots = [];
  undoStack = [];
  undoCount = 2;
  shuffleCount = 1;
  score = 0;

  const pool = generateTiles(stage);
  buildBoard(pool);
  render();
  startTimer();
}

window.addEventListener('load', () => {
  stage = 1;
  document.getElementById('stage-label').textContent = 'Stage 1';
  startGame();
});

// Export for buttons
window.doUndo = doUndo;
window.doShuffle = doShuffle;
window.restartGame = restartGame;
window.nextStage = nextStage;
window.drawFromDeck = drawFromDeck;
