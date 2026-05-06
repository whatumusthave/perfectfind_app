/**
 * Perfect Paw Match — Triple-Match Tile Game Engine
 * Sheep-a-Sheep style: click stacked tiles → slot bar → match 3 to clear
 */

// ─── CARD DEFINITIONS ───────────────────────────────────────────────────────
const CARDS = [
  { id: 1,  name: 'Amethyst Heart',   img: 'assets/cards/amethyst_heart.png' },
  { id: 2,  name: 'Celestial Potion', img: 'assets/cards/celestial_potion.png' },
  { id: 3,  name: 'Crystal Ball',     img: 'assets/cards/crystal_ball.png' },
  { id: 4,  name: 'Fuchsia Ribbon',   img: 'assets/cards/fuchsia_ribbon.png' },
  { id: 5,  name: 'Golden Paw',       img: 'assets/cards/golden_paw.png' },
  { id: 6,  name: 'Indigo Bowtie',    img: 'assets/cards/indigo_bowtie.png' },
  { id: 7,  name: 'Jeweled Keyhole',  img: 'assets/cards/jeweled_keyhole.png' },
  { id: 8,  name: 'Midnight Cushion', img: 'assets/cards/midnight_cushion.png' },
  { id: 9,  name: 'Mystic Yarn Ball', img: 'assets/cards/mystic_yarn_ball.png' },
  { id: 10, name: 'Rose Pufferfish',  img: 'assets/cards/rose_pufferfish.png' },
  { id: 11, name: 'Royal Cat Bed',    img: 'assets/cards/royal_cat_bed.png' },
  { id: 12, name: 'Sapphire Paw',     img: 'assets/cards/sapphire_paw.png' },
  { id: 13, name: 'Shopping Bag',     img: 'assets/cards/shopping_bag.png' },
  { id: 14, name: 'Starry Cat Mic',   img: 'assets/cards/starry_cat_mic.png' },
];

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const CFG = {
  MAX_SLOTS: 7,
  TIMER_SECS: 120,
  SCORE_PER_MATCH: 150,
  SCORE_PER_BOARD_CLEAR: 500,
  // Board layout: number of tiles per level
  levels: [
    { tileCount: 36, layers: 3, cardTypes: 6  },  // Level 1 — 12 types×3
    { tileCount: 48, layers: 4, cardTypes: 8  },  // Level 2
    { tileCount: 60, layers: 5, cardTypes: 10 },  // Level 3
    { tileCount: 72, layers: 5, cardTypes: 12 },  // Level 4
    { tileCount: 84, layers: 6, cardTypes: 14 },  // Level 5+
  ],
  TILE_W: 72, TILE_H: 72,
  TILE_OVERLAP: 6,  // px overlap between stacked tiles
};

// ─── STATE ───────────────────────────────────────────────────────────────────
let state = {
  tiles: [],       // all board tiles [{id, cardId, x, y, layer, blocked, el}]
  slotBar: [],     // tiles currently in slot bar (max 7)
  score: 0,
  matches: 0,
  level: 1,
  timerSecs: CFG.TIMER_SECS,
  timerInterval: null,
  busy: false,
  gameOver: false,
  muted: false,
  hintUsed: false,
};

// ─── DOM REFS ────────────────────────────────────────────────────────────────
const $board    = document.getElementById('game-board');
const $slotBar  = document.getElementById('slot-bar');
const $slotLbl  = document.getElementById('slot-label');
const $scoreDisp  = document.getElementById('score-display');
const $headerScore = document.getElementById('header-score');
const $matchDisp  = document.getElementById('matches-display');
const $levelDisp  = document.getElementById('level-display');
const $tilesLeft  = document.getElementById('tiles-left');
const $timerText  = document.getElementById('timer-text');
const $ringFill   = document.getElementById('ring-fill');
const $timerRing  = document.getElementById('timer-ring');
const $overlay    = document.getElementById('game-overlay');
const $overlayEmoji = document.getElementById('overlay-emoji');
const $overlayTitle = document.getElementById('overlay-title');
const $overlayMsg   = document.getElementById('overlay-msg');
const $overlayScore = document.getElementById('overlay-score');
const $boardEmpty   = document.getElementById('board-empty');
const $toast        = document.getElementById('toast');

// ─── INIT ────────────────────────────────────────────────────────────────────
function init(levelNum = 1) {
  state.level = levelNum;
  state.tiles = [];
  state.slotBar = [];
  state.busy = false;
  state.gameOver = false;
  state.hintUsed = false;
  $overlay.classList.remove('show');
  $boardEmpty.classList.remove('show');

  generateBoard();
  renderSlotBar();
  updateStats();
  startTimer();
  toast(`✨ Level ${state.level} — Good luck!`);
}

// ─── BOARD GENERATION ────────────────────────────────────────────────────────
function getLevelCfg() {
  const idx = Math.min(state.level - 1, CFG.levels.length - 1);
  return CFG.levels[idx];
}

function generateBoard() {
  $board.innerHTML = '';
  state.tiles = [];

  const lv = getLevelCfg();
  // ensure tile count is multiple of 3
  const count = lv.tileCount - (lv.tileCount % 3);
  const typeCount = Math.min(lv.cardTypes, CARDS.length);

  // Pick which card types to use
  const shuffledCards = shuffle([...CARDS]).slice(0, typeCount);

  // Build a pool of (count) tiles — each type appears in multiples of 3
  const pool = [];
  let setsNeeded = count / 3;
  while (pool.length < count) {
    const card = shuffledCards[pool.length % shuffledCards.length];
    pool.push(card, card, card);
  }
  // Trim to exact count
  pool.length = count;
  shuffle(pool);

  // Layout: multi-layer pyramid-style random placement
  const boardW = $board.offsetWidth || 800;
  const boardH = Math.max(420, window.innerHeight * 0.42);
  $board.style.height = boardH + 'px';

  const cols = Math.floor((boardW - 20) / (CFG.TILE_W - CFG.TILE_OVERLAP));
  const rows = Math.floor((boardH - 20) / (CFG.TILE_H - CFG.TILE_OVERLAP));

  // Assign positions in grid, then stack layers on top
  let tileId = 0;
  let poolIdx = 0;

  for (let layer = 0; layer < lv.layers && poolIdx < pool.length; layer++) {
    // How many tiles on this layer (fewer as layers increase)
    const layerTiles = Math.floor((count / lv.layers) * (1 - layer * 0.08));
    const layerCount = Math.min(layerTiles, pool.length - poolIdx);

    // Grid positions for this layer with slight jitter
    const positions = generateLayerPositions(layerCount, cols, rows, layer, boardW, boardH);

    for (let i = 0; i < positions.length && poolIdx < pool.length; i++) {
      const card = pool[poolIdx++];
      const pos = positions[i];
      const tile = {
        id: tileId++,
        cardId: card.id,
        cardName: card.name,
        cardImg: card.img,
        x: pos.x, y: pos.y,
        layer: layer,
        blocked: false,
        el: null,
      };
      state.tiles.push(tile);
    }
  }

  // Render all tiles
  state.tiles.forEach(tile => renderTile(tile));
  updateBlockedState();
  updateStats();
}

function generateLayerPositions(count, cols, rows, layer, boardW, boardH) {
  const positions = [];
  const tileW = CFG.TILE_W - CFG.TILE_OVERLAP;
  const tileH = CFG.TILE_H - CFG.TILE_OVERLAP;
  const padding = 10;

  // Create grid of available positions
  const grid = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.push({
        x: padding + c * tileW + (layer * 4),
        y: padding + r * tileH + (layer * 4),
      });
    }
  }
  shuffle(grid);

  // Pick `count` positions, with slight random offset per tile
  for (let i = 0; i < Math.min(count, grid.length); i++) {
    const jitterX = (Math.random() - 0.5) * 10;
    const jitterY = (Math.random() - 0.5) * 10;
    positions.push({
      x: Math.max(0, Math.min(boardW - CFG.TILE_W - 4, grid[i].x + jitterX)),
      y: Math.max(0, Math.min(boardH - CFG.TILE_H - 4, grid[i].y + jitterY)),
    });
  }
  return positions;
}

// A tile is "blocked" if another tile of higher layer overlaps it significantly
function updateBlockedState() {
  const tiles = state.tiles;
  tiles.forEach(tile => {
    tile.blocked = false;
    for (let other of tiles) {
      if (other.id === tile.id) continue;
      if (other.layer <= tile.layer) continue;
      // Check overlap
      if (overlaps(tile, other, 30)) {
        tile.blocked = true;
        break;
      }
    }
    if (tile.el) {
      if (tile.blocked) {
        tile.el.classList.remove('active');
        tile.el.classList.add('locked');
        tile.el.title = `${tile.cardName} (blocked)`;
      } else {
        tile.el.classList.remove('locked');
        tile.el.classList.add('active');
        tile.el.title = tile.cardName;
      }
    }
  });
}

function overlaps(a, b, threshold) {
  return !(
    a.x + CFG.TILE_W - threshold < b.x ||
    b.x + CFG.TILE_W - threshold < a.x ||
    a.y + CFG.TILE_H - threshold < b.y ||
    b.y + CFG.TILE_H - threshold < a.y
  );
}

// ─── RENDER TILE ─────────────────────────────────────────────────────────────
function renderTile(tile) {
  const el = document.createElement('div');
  el.className = 'tile';
  el.dataset.id = tile.id;
  el.style.left = tile.x + 'px';
  el.style.top  = tile.y + 'px';
  el.style.zIndex = tile.layer * 10 + 1;

  const img = document.createElement('img');
  img.src = tile.cardImg;
  img.alt = tile.cardName;
  img.draggable = false;
  el.appendChild(img);

  el.addEventListener('click', () => onTileClick(tile.id));
  $board.appendChild(el);
  tile.el = el;
}

// ─── SLOT BAR ────────────────────────────────────────────────────────────────
function renderSlotBar() {
  $slotBar.innerHTML = '';
  for (let i = 0; i < CFG.MAX_SLOTS; i++) {
    const cell = document.createElement('div');
    cell.className = 'slot-cell';
    cell.id = `slot-${i}`;
    const tileData = state.slotBar[i];
    if (tileData) {
      cell.classList.add('filled');
      const img = document.createElement('img');
      img.src = tileData.cardImg;
      img.alt = tileData.cardName;
      cell.appendChild(img);
    }
    $slotBar.appendChild(cell);
  }
  $slotLbl.textContent = `SLOT: ${state.slotBar.length} / ${CFG.MAX_SLOTS}`;
}

// ─── CLICK HANDLER ───────────────────────────────────────────────────────────
function onTileClick(tileId) {
  if (state.busy || state.gameOver) return;

  const tile = state.tiles.find(t => t.id === tileId);
  if (!tile || tile.blocked) return;
  if (state.slotBar.length >= CFG.MAX_SLOTS) return;

  // Remove from board
  state.tiles = state.tiles.filter(t => t.id !== tileId);

  // Animate tile flying out
  if (tile.el) {
    tile.el.classList.add('fly-out');
    setTimeout(() => tile.el && tile.el.remove(), 350);
  }

  // Insert into slot bar in sorted position (group same types together)
  insertIntoSlot(tile);

  updateBlockedState();
  renderSlotBar();
  updateStats();

  // Check for match
  checkMatches();
}

// Insert tile into slot bar, grouping same card types together
function insertIntoSlot(tile) {
  // Find a position next to same card type
  let insertIdx = state.slotBar.length; // default: end
  for (let i = 0; i < state.slotBar.length; i++) {
    if (state.slotBar[i].cardId === tile.cardId) {
      // Find last occurrence of this card type
      let lastIdx = i;
      while (lastIdx + 1 < state.slotBar.length && state.slotBar[lastIdx + 1].cardId === tile.cardId) {
        lastIdx++;
      }
      insertIdx = lastIdx + 1;
      break;
    }
  }
  state.slotBar.splice(insertIdx, 0, tile);
}

// ─── MATCH CHECK ─────────────────────────────────────────────────────────────
function checkMatches() {
  // Look for 3+ consecutive same card type in slot bar
  let i = 0;
  while (i < state.slotBar.length - 2) {
    if (
      state.slotBar[i].cardId === state.slotBar[i+1].cardId &&
      state.slotBar[i+1].cardId === state.slotBar[i+2].cardId
    ) {
      // Found a match!
      handleMatch(i);
      return; // wait for animation, then re-check
    }
    i++;
  }

  // No match found — check game over
  if (state.slotBar.length >= CFG.MAX_SLOTS) {
    triggerGameOver();
  }
}

function handleMatch(startIdx) {
  state.busy = true;
  const matchedCard = state.slotBar[startIdx];

  // Visual: flash matched cells
  for (let k = startIdx; k < startIdx + 3; k++) {
    const cell = document.getElementById(`slot-${k}`);
    if (cell) {
      cell.classList.add('match-glow');
      const particle = document.createElement('div');
      particle.className = 'match-particle';
      cell.appendChild(particle);
    }
  }

  state.score += CFG.SCORE_PER_MATCH + (state.level - 1) * 30;
  state.matches++;

  toast(`✨ ${matchedCard.cardName} — MATCH! +${CFG.SCORE_PER_MATCH}`);
  spawnStars(3);

  setTimeout(() => {
    // Remove matched tiles from slot bar
    state.slotBar.splice(startIdx, 3);
    renderSlotBar();
    updateStats();
    state.busy = false;

    // Check for win (board empty + slot bar empty)
    if (state.tiles.length === 0 && state.slotBar.length === 0) {
      triggerWin();
      return;
    }
    // Board cleared but slot bar still has tiles? (chain check)
    if (state.tiles.length === 0) {
      checkBoardClear();
      return;
    }

    // Recursive match check for chain reactions
    checkMatches();
  }, 500);
}

function checkBoardClear() {
  // All board tiles gone — check if slot bar can still be cleared
  // If slot bar is also empty, it's a win
  if (state.slotBar.length === 0) {
    triggerWin();
  } else {
    // Board cleared bonus
    $boardEmpty.classList.add('show');
    // Check matches in remaining slot bar
    checkMatches();
  }
}

// ─── TIMER ───────────────────────────────────────────────────────────────────
function startTimer() {
  stopTimer();
  state.timerSecs = CFG.TIMER_SECS + (state.level - 1) * 30;
  updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    if (state.gameOver || state.busy) return;
    state.timerSecs--;
    updateTimerDisplay();
    if (state.timerSecs <= 0) {
      stopTimer();
      triggerGameOver('Time\'s up! ⏰');
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function updateTimerDisplay() {
  const m = Math.floor(state.timerSecs / 60);
  const s = state.timerSecs % 60;
  $timerText.textContent = `${m}:${String(s).padStart(2, '0')}`;

  const total = CFG.TIMER_SECS + (state.level - 1) * 30;
  const circumference = 2 * Math.PI * 24; // r=24
  const offset = circumference * (1 - state.timerSecs / total);
  $ringFill.style.strokeDashoffset = offset;
  $ringFill.style.strokeDasharray = circumference;

  const isLow = state.timerSecs <= 20;
  $timerRing.classList.toggle('danger', isLow);
}

// ─── STATS ───────────────────────────────────────────────────────────────────
function updateStats() {
  $scoreDisp.textContent  = state.score.toLocaleString();
  $headerScore.textContent = state.score.toLocaleString();
  $matchDisp.textContent  = state.matches;
  $levelDisp.textContent  = state.level;
  $tilesLeft.textContent  = state.tiles.length;
}

// ─── WIN / GAME OVER ─────────────────────────────────────────────────────────
function triggerWin() {
  stopTimer();
  state.gameOver = true;
  state.score += CFG.SCORE_PER_BOARD_CLEAR;
  updateStats();
  spawnStars(12);

  $overlayEmoji.textContent = '🎉';
  $overlayTitle.textContent = 'STAGE CLEAR!';
  $overlayMsg.textContent   = `All ${state.matches} matches found! Amazing! ✨`;
  $overlayScore.textContent = `Score: ${state.score.toLocaleString()}`;

  document.getElementById('overlay-restart-btn').textContent = '';
  document.getElementById('overlay-restart-btn').innerHTML =
    '<span class="icon" style="font-family:Material Symbols Outlined">arrow_forward</span> NEXT LEVEL';
  document.getElementById('overlay-restart-btn').onclick = () => init(state.level + 1);

  setTimeout(() => $overlay.classList.add('show'), 600);
  reportStatus('WIN');
}

function triggerGameOver(reason = 'Slot bar filled up! 😿') {
  if (state.gameOver) return;
  stopTimer();
  state.gameOver = true;

  $overlayEmoji.textContent = '😿';
  $overlayTitle.textContent = 'GAME OVER';
  $overlayMsg.textContent   = reason;
  $overlayScore.textContent = `Final Score: ${state.score.toLocaleString()}`;

  document.getElementById('overlay-restart-btn').innerHTML =
    '<span class="icon" style="font-family:Material Symbols Outlined">replay</span> PLAY AGAIN';
  document.getElementById('overlay-restart-btn').onclick = () => init(1);

  setTimeout(() => $overlay.classList.add('show'), 400);
  reportStatus('LOSE');
}

// ─── CONTROLS ────────────────────────────────────────────────────────────────
document.getElementById('restart-btn').onclick = () => {
  if (confirm('Restart from Level 1?')) {
    state.score = 0;
    state.matches = 0;
    init(1);
  }
};

document.getElementById('shuffle-btn').onclick = () => {
  if (state.gameOver || state.busy) return;
  // Shuffle positions of unblocked tiles
  const activeTiles = state.tiles.filter(t => !t.blocked);
  if (activeTiles.length < 2) { toast('Nothing to shuffle!'); return; }
  const positions = activeTiles.map(t => ({ x: t.x, y: t.y }));
  shuffle(positions);
  activeTiles.forEach((tile, i) => {
    tile.x = positions[i].x;
    tile.y = positions[i].y;
    if (tile.el) {
      tile.el.style.left = tile.x + 'px';
      tile.el.style.top  = tile.y + 'px';
    }
  });
  updateBlockedState();
  toast('🔀 Board shuffled!');
  state.score = Math.max(0, state.score - 30);
  updateStats();
};

document.getElementById('hint-btn').onclick = () => {
  if (state.gameOver || state.busy) return;
  showHint();
};

document.getElementById('mute-btn').onclick = () => {
  state.muted = !state.muted;
  document.getElementById('mute-btn').textContent = state.muted ? 'volume_off' : 'volume_up';
};

// ─── HINT ────────────────────────────────────────────────────────────────────
function showHint() {
  // Find an active tile whose card type exists in slot bar (close to match)
  const slotCounts = {};
  state.slotBar.forEach(t => {
    slotCounts[t.cardId] = (slotCounts[t.cardId] || 0) + 1;
  });

  const activeTiles = state.tiles.filter(t => !t.blocked);
  // Priority: tiles that would complete a match (slotCount == 2)
  let best = activeTiles.find(t => slotCounts[t.cardId] === 2);
  // Fallback: tiles that start a new group (slotCount == 1)
  if (!best) best = activeTiles.find(t => slotCounts[t.cardId] === 1);
  // Fallback: any active tile
  if (!best && activeTiles.length > 0) best = activeTiles[0];

  if (!best) { toast('No hints available!'); return; }

  const el = best.el;
  if (!el) return;

  // Flash the hint tile
  el.style.animation = 'none';
  el.style.transition = 'none';
  el.style.boxShadow = '0 0 30px rgba(255,215,0,1), 0 0 60px rgba(255,215,0,0.6)';
  el.style.transform = 'scale(1.2)';
  el.style.zIndex = '9999';
  toast(`💡 Hint: Click ${best.cardName}!`);

  setTimeout(() => {
    el.style.boxShadow = '';
    el.style.transform = '';
    el.style.zIndex = best.layer * 10 + 1;
  }, 1500);

  state.score = Math.max(0, state.score - 50);
  updateStats();
}

// ─── PARTICLES ───────────────────────────────────────────────────────────────
function spawnStars(count = 5) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star-particle';
    const angle = (i / count) * Math.PI * 2;
    const dist = 80 + Math.random() * 120;
    star.style.left = cx + 'px';
    star.style.top  = cy + 'px';
    star.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    star.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    star.style.background = Math.random() > 0.5 ? '#ffd700' : '#cdbdff';
    star.style.animationDelay = (Math.random() * 0.3) + 's';
    document.body.appendChild(star);
    setTimeout(() => star.remove(), 1200);
  }
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove('show'), 2200);
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── REPORTING ───────────────────────────────────────────────────────────────
async function reportStatus(status) {
  const BOT_TOKEN = '8309347424:AAF5UMdDguIbsaKQ2StFhvxT7ZvnaupAaBE';
  const CHAT_ID   = '8452005297';
  const text = `🐾 Perfect Paw Match\nStatus: ${status}\nScore: ${state.score}\nLevel: ${state.level}\nMatches: ${state.matches}\n${new Date().toLocaleString()}`;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    });
  } catch (e) { /* silent */ }
}

// ─── START ───────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => init(1));
window.addEventListener('resize', () => {
  // Re-layout board on resize without losing state
  if (!state.gameOver && state.tiles.length > 0) {
    const boardW = $board.offsetWidth || 800;
    const boardH = Math.max(420, window.innerHeight * 0.42);
    $board.style.height = boardH + 'px';
  }
});
