/**
 * Perfect Paw Match — Rebuilt from Claude's Logic
 * Adapted for current HTML structure
 */

const CARDS = [
  'amethyst_heart', 'celestial_potion', 'crystal_ball', 'fuchsia_ribbon',
  'golden_paw', 'indigo_bowtie', 'jeweled_keyhole', 'midnight_cushion',
  'mystic_yarn_ball', 'rose_pufferfish', 'royal_cat_bed', 'sapphire_paw',
  'shopping_bag', 'starry_cat_mic'
];

const CARD_PATH = 'assets/cards/';
const SLOT_MAX = 7;
const TILE_W = 72; // Adjusted to match my CSS
const TILE_H = 72;
const TILE_OVERLAP = 24;

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

// ── DOM REFS ────────────────────────────────────────────────────────────────
const $board = document.getElementById('game-board');
const $slotBar = document.getElementById('slot-bar');
const $leftDeck = document.getElementById('side-deck-left');
const $rightDeck = document.getElementById('side-deck-right');
const $slotLabel = document.getElementById('slot-label');
const $scoreDisp = document.getElementById('score-display');
const $headerScore = document.getElementById('header-score');
const $timerDisp = document.getElementById('timer-text');
const $levelDisp = document.getElementById('level-display');
const $overlay = document.getElementById('game-overlay');
const $undoBtn = document.getElementById('undo-btn');
const $shuffleBtn = document.getElementById('shuffle-btn');

// ── Generate tiles ──────────────────────────────────────────────────────────
function generateTiles(stageNum) {
  const pool = [];
  if (stageNum === 1) {
    const easyCards = CARDS.slice(0, 5);
    easyCards.forEach(c => { for (let i = 0; i < 3; i++) pool.push(c); });
  } else {
    // Stage 2+: 14 * 12 = 168 tiles for true rage feel
    CARDS.forEach(c => { for (let i = 0; i < 12; i++) pool.push(c); });
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

// ── Build Board ──────────────────────────────────────────────────────────────
function buildBoard(pool) {
  const bw = $board.clientWidth || 800;
  const bh = $board.clientHeight || 480;

  const layerCount = stage === 1 ? 2 : 8; // More layers for stage 2
  const tilesOnBoard = stage === 1 ? pool.length : Math.floor(pool.length * 0.8);
  const tilesPerLayer = Math.ceil(tilesOnBoard / layerCount);

  tiles = [];
  let poolIdx = 0;

  for (let layer = 0; layer < layerCount; layer++) {
    const count = Math.min(tilesPerLayer, pool.length - poolIdx);
    const cols = Math.ceil(Math.sqrt(count));

    for (let i = 0; i < count && poolIdx < pool.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const startX = bw / 2 - (cols * (TILE_W - TILE_OVERLAP)) / 2;
      const startY = bh / 2 - (Math.ceil(count / cols) * (TILE_H - TILE_OVERLAP)) / 2;

      const randOffX = stage === 1 ? 0 : (Math.random() - 0.5) * TILE_W * 0.6;
      const randOffY = stage === 1 ? 0 : (Math.random() - 0.5) * TILE_H * 0.6;

      const x = startX + col * (TILE_W - TILE_OVERLAP) + randOffX;
      const y = startY + row * (TILE_H - TILE_OVERLAP) + randOffY;

      tiles.push({
        id: poolIdx,
        card: pool[poolIdx],
        x: Math.max(20, Math.min(bw - TILE_W - 20, x)),
        y: Math.max(20, Math.min(bh - TILE_H - 20, y)),
        layer,
        removed: false,
        el: null
      });
      poolIdx++;
    }
  }

  const remaining = pool.slice(poolIdx);
  const half = Math.floor(remaining.length / 2);
  leftDeck = remaining.slice(0, half);
  rightDeck = remaining.slice(half);
}

function isBlocked(tile) {
  if (tile.removed) return true;
  return tiles.some(t =>
    !t.removed &&
    t.layer > tile.layer &&
    t.x < tile.x + TILE_W - 8 &&
    t.x + TILE_W > tile.x + 8 &&
    t.y < tile.y + TILE_H - 8 &&
    t.y + TILE_H > tile.y + 8
  );
}

// ── Rendering ────────────────────────────────────────────────────────────────
function render() {
  $board.innerHTML = '<div class="board-bg"></div>';

  tiles.forEach(tile => {
    if (tile.removed) return;
    const blocked = isBlocked(tile);

    const el = document.createElement('div');
    el.className = 'tile' + (blocked ? ' locked' : ' active');
    el.style.transform = `translate(${tile.x}px, ${tile.y}px)`;
    el.style.zIndex = tile.layer * 10 + Math.floor(tile.y / 10);

    const img = document.createElement('img');
    img.src = CARD_PATH + tile.card + '.png';
    img.draggable = false;
    el.appendChild(img);

    if (!blocked) {
      el.addEventListener('click', () => clickTile(tile));
    }

    tile.el = el;
    $board.appendChild(el);
  });

  renderSlots();
  renderDecks();
  updateUI();
}

function renderSlots() {
  $slotBar.innerHTML = '';
  for (let i = 0; i < SLOT_MAX; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot-cell';
    if (slots[i]) {
      const img = document.createElement('img');
      img.src = CARD_PATH + slots[i].card + '.png';
      slot.appendChild(img);
      slot.classList.add('filled');
    }
    $slotBar.appendChild(slot);
  }
  $slotLabel.textContent = `SLOT: ${slots.length} / ${SLOT_MAX}`;
}

function renderDecks() {
  $leftDeck.innerHTML = '';
  $rightDeck.innerHTML = '';

  if (leftDeck.length > 0) {
    const el = createDeckStack(leftDeck.length, 'left');
    $leftDeck.appendChild(el);
  }
  if (rightDeck.length > 0) {
    const el = createDeckStack(rightDeck.length, 'right');
    $rightDeck.appendChild(el);
  }
}

function createDeckStack(count, side) {
  const stack = document.createElement('div');
  stack.className = 'tile active';
  stack.style.position = 'relative';
  stack.style.margin = 'auto';
  
  // Show the top card partially or just a back
  stack.innerHTML = `
    <div style="width:100%; height:100%; background:rgba(255,215,0,0.1); display:flex; align-items:center; justify-content:center; font-weight:bold; color:#ffd700; font-size:24px; border:2px dashed #ffd700; border-radius:12px;">
      ${count}
    </div>
  `;
  stack.onclick = () => drawFromDeck(side);
  return stack;
}

function updateUI() {
  const s = score.toLocaleString();
  $scoreDisp.textContent = s;
  if ($headerScore) $headerScore.textContent = s;
  $levelDisp.textContent = stage;
  
  $undoBtn.innerHTML = `<span class="icon">undo</span> UNDO (${undoCount})`;
  $shuffleBtn.innerHTML = `<span class="icon">shuffle</span> SHUFFLE (${shuffleCount})`;
  
  $undoBtn.disabled = undoCount <= 0 || undoStack.length === 0;
  $shuffleBtn.disabled = shuffleCount <= 0;

  const remaining = tiles.filter(t => !t.removed).length;
  document.getElementById('tiles-left').textContent = remaining + leftDeck.length + rightDeck.length;
  
  if (remaining === 0 && leftDeck.length === 0 && rightDeck.length === 0 && slots.length === 0) {
    showWin();
  }
}

// ── Actions ──────────────────────────────────────────────────────────────────
function clickTile(tile) {
  if (!gameActive || tile.removed || isBlocked(tile)) return;

  undoStack.push({
    tileId: tile.id,
    slots: JSON.parse(JSON.stringify(slots)),
    score
  });

  tile.removed = true;
  tile.el.classList.add('fly-out');

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
      const toRemove = indices.slice(0, 3);
      slots = slots.filter((_, i) => !toRemove.includes(i));
      score += 300;
      matched = true;
      showToast(`✨ Matched ${card.replace('_', ' ')}!`);
    }
  });

  if (matched) checkMatches();
}

function drawFromDeck(side) {
  if (!gameActive || slots.length >= SLOT_MAX) return;

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
  const lastState = undoStack.pop();
  const tile = tiles.find(t => t.id === lastState.tileId);
  if (tile) tile.removed = false;
  slots = lastState.slots;
  score = lastState.score;
  undoCount--;
  render();
  showToast("⏪ Undo used!");
}

function doShuffle() {
  if (!gameActive || shuffleCount <= 0) return;
  shuffleCount--;

  const activeTiles = tiles.filter(t => !t.removed);
  const cards = activeTiles.map(t => t.card);
  const shuffled = shuffle(cards);
  activeTiles.forEach((t, i) => t.card = shuffled[i]);

  render();
  showToast("🔀 Board Shuffled!");
}

// ── Timer & Overlay ──────────────────────────────────────────────────────────
function startTimer() {
  timeLeft = stage === 1 ? 120 : 300;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    $timerDisp.textContent = `${mins}:${secs}`;
    $timerDisp.style.color = timeLeft < 30 ? '#ff6b6b' : '#ffd700';

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      showLose();
    }
  }, 1000);
}

function showWin() {
  gameActive = false;
  clearInterval(timerInterval);
  document.getElementById('overlay-next-btn').style.display = 'flex';
  setOverlay("MISSION ACCOMPLISHED", "🎉", `Perfect match! Final score: ${score.toLocaleString()}`);
  reportStatus("WIN");
}

function showLose() {
  gameActive = false;
  clearInterval(timerInterval);
  document.getElementById('overlay-next-btn').style.display = 'none';
  const msg = stage === 1 ? "So close! Try again?" : "Only 0.1% clear this stage. Rage on!";
  setOverlay("GAME OVER", "💀", msg);
  reportStatus("LOSE");
}

function setOverlay(title, emoji, msg) {
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-emoji').textContent = emoji;
  document.getElementById('overlay-msg').textContent = msg;
  document.getElementById('overlay-score').textContent = `Score: ${score.toLocaleString()}`;
  $overlay.classList.add('show');
}

function nextStage() {
  stage++;
  $overlay.classList.remove('show');
  startGame();
}

function restartGame() {
  stage = 1;
  $overlay.classList.remove('show');
  startGame();
}

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

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

async function reportStatus(status) {
  const BOT_TOKEN = '8309347424:AAF5UMdDguIbsaKQ2StFhvxT7ZvnaupAaBE';
  const CHAT_ID   = '8452005297';
  const text = `🐾 Perfect Paw Match (Claude Logic)\nStatus: ${status}\nStage: ${stage}\nScore: ${score}\nTime: ${new Date().toLocaleString()}`;
  try { fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: CHAT_ID, text }) }); } catch (e) {}
}

// ── Bindings ────────────────────────────────────────────────────────────────
$undoBtn.onclick = doUndo;
$shuffleBtn.onclick = doShuffle;
document.getElementById('restart-btn').onclick = restartGame;
document.getElementById('overlay-restart-btn').onclick = restartGame;

window.onload = startGame;
