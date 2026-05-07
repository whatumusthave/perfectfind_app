/**
 * Perfect Paw Match — Yang Le Ge Yang (羊了个羊) Edition
 * Features: Tutorial Stage, Rage-Inducing Stage, Side Decks, Shuffle & Undo
 */

// ─── DATA ───────────────────────────────────────────────────────────────────
const CARD_TYPES = [
  { id: 'amethyst_heart',   name: 'Amethyst Heart',   img: 'assets/cards/amethyst_heart.png' },
  { id: 'celestial_potion', name: 'Celestial Potion', img: 'assets/cards/celestial_potion.png' },
  { id: 'crystal_ball',     name: 'Crystal Ball',     img: 'assets/cards/crystal_ball.png' },
  { id: 'fuchsia_ribbon',   name: 'Fuchsia Ribbon',   img: 'assets/cards/fuchsia_ribbon.png' },
  { id: 'golden_paw',       name: 'Golden Paw',       img: 'assets/cards/golden_paw.png' },
  { id: 'indigo_bowtie',    name: 'Indigo Bowtie',    img: 'assets/cards/indigo_bowtie.png' },
  { id: 'jeweled_keyhole',  name: 'Jeweled Keyhole',  img: 'assets/cards/jeweled_keyhole.png' },
  { id: 'midnight_cushion', name: 'Midnight Cushion', img: 'assets/cards/midnight_cushion.png' },
  { id: 'mystic_yarn_ball', name: 'Mystic Yarn Ball', img: 'assets/cards/mystic_yarn_ball.png' },
  { id: 'rose_pufferfish',  name: 'Rose Pufferfish',  img: 'assets/cards/rose_pufferfish.png' },
  { id: 'royal_cat_bed',    name: 'Royal Cat Bed',    img: 'assets/cards/royal_cat_bed.png' },
  { id: 'sapphire_paw',     name: 'Sapphire Paw',     img: 'assets/cards/sapphire_paw.png' },
  { id: 'shopping_bag',     name: 'Shopping Bag',     img: 'assets/cards/shopping_bag.png' },
  { id: 'starry_cat_mic',   name: 'Starry Cat Mic',   img: 'assets/cards/starry_cat_mic.png' },
];

const CONFIG = {
  SLOT_MAX: 7,
  TILE_W: 72,
  TILE_H: 72,
  UNDO_MAX: 2,
  SHUFFLE_MAX: 1,
};

// ─── STATE ──────────────────────────────────────────────────────────────────
let state = {
  level: 1,
  boardTiles: [], // { id, type, x, y, layer, element, isBlocked, source: 'board'|'left'|'right' }
  slotTiles: [],
  score: 0,
  matches: 0,
  isGameOver: false,
  undoCount: CONFIG.UNDO_MAX,
  shuffleCount: CONFIG.SHUFFLE_MAX,
  history: [], 
};

// ─── DOM ────────────────────────────────────────────────────────────────────
const $board = document.getElementById('game-board');
const $leftDeck = document.getElementById('side-deck-left');
const $rightDeck = document.getElementById('side-deck-right');
const $slotBar = document.getElementById('slot-bar');
const $scoreDisp = document.getElementById('score-display');
const $tilesLeft = document.getElementById('tiles-left');
const $levelDisp = document.getElementById('level-display');
const $overlay = document.getElementById('game-overlay');
const $toast = document.getElementById('toast');

const $undoBtn = document.getElementById('undo-btn');
const $shuffleBtn = document.getElementById('shuffle-btn');

// ─── INIT ────────────────────────────────────────────────────────────────────
function init(level = 1) {
  state.level = level;
  $board.innerHTML = '<div class="board-bg"></div>';
  $leftDeck.innerHTML = '';
  $rightDeck.innerHTML = '';
  $slotBar.innerHTML = '';
  
  state.boardTiles = [];
  state.slotTiles = [];
  state.score = 0;
  state.matches = 0;
  state.isGameOver = false;
  state.undoCount = CONFIG.UNDO_MAX;
  state.shuffleCount = CONFIG.SHUFFLE_MAX;
  state.history = [];
  
  $overlay.classList.remove('show');
  updateSkillButtons();
  
  if (level === 1) {
    setupTutorial();
  } else {
    setupRageStage();
  }
  
  updateBlockedState();
  updateStats();
  
  showToast(level === 1 ? "😺 Level 1: Warm up!" : "🔥 Level 2: 0.1% Success Rate. GOOD LUCK.");
}

// ─── STAGE SETUPS ───────────────────────────────────────────────────────────
function setupTutorial() {
  // Level 1: 5 types * 3 = 15 tiles
  const types = CARD_TYPES.slice(0, 5);
  let pool = [];
  types.forEach(t => { for(let i=0; i<3; i++) pool.push({...t}); });
  shuffle(pool);
  
  const centerX = $board.clientWidth / 2;
  const centerY = $board.clientHeight / 2;
  
  pool.forEach((card, i) => {
    const tile = {
      id: `tile-${i}`,
      type: card.id,
      img: card.img,
      name: card.name,
      x: centerX - 100 + (i % 3) * 80,
      y: centerY - 100 + Math.floor(i / 3) * 80,
      layer: 0,
      source: 'board'
    };
    renderTile(tile);
    state.boardTiles.push(tile);
  });
}

function setupRageStage() {
  // Level 2: 14 types * 18 = 252 tiles total (must be divisible by 3)
  const COPIES = 18; 
  let pool = [];
  CARD_TYPES.forEach(t => { for(let i=0; i<COPIES; i++) pool.push({...t}); });
  shuffle(pool);
  
  // Side decks: 20 tiles each
  const sideDeckSize = 20;
  for (let i = 0; i < sideDeckSize; i++) {
    addSideTile(pool.pop(), 'left', i);
    addSideTile(pool.pop(), 'right', i);
  }
  
  // Main Board: Remainder (e.g., 252 - 40 = 212)
  const centerX = $board.clientWidth / 2;
  const centerY = $board.clientHeight / 2;
  
  // Create multiple layers with random offsets
  const LAYERS = 8;
  const tilesPerLayer = Math.floor(pool.length / LAYERS);
  
  let tileIdx = 0;
  for (let l = 0; l < LAYERS; l++) {
    const rows = 5 + (l % 2);
    const cols = 5 + (l % 2);
    const startX = centerX - (cols * CONFIG.TILE_W) / 2;
    const startY = centerY - (rows * CONFIG.TILE_H) / 2;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (pool.length === 0) break;
        const card = pool.pop();
        const tile = {
          id: `tile-main-${tileIdx++}`,
          type: card.id,
          img: card.img,
          name: card.name,
          // Random corner overlap feel: add slight jitter
          x: startX + c * CONFIG.TILE_W + (Math.random() * 20 - 10),
          y: startY + r * CONFIG.TILE_H + (Math.random() * 20 - 10),
          layer: l,
          source: 'board'
        };
        renderTile(tile);
        state.boardTiles.push(tile);
      }
    }
  }
  
  // Add any leftover tiles randomly
  while (pool.length > 0) {
    const card = pool.pop();
    const tile = {
      id: `tile-extra-${tileIdx++}`,
      type: card.id,
      img: card.img,
      name: card.name,
      x: centerX - 150 + Math.random() * 300,
      y: centerY - 150 + Math.random() * 300,
      layer: 10,
      source: 'board'
    };
    renderTile(tile);
    state.boardTiles.push(tile);
  }
}

function addSideTile(card, side, index) {
  const tile = {
    id: `tile-${side}-${index}`,
    type: card.id,
    img: card.img,
    name: card.name,
    x: 4, 
    y: index * 6, // Overlap vertically
    layer: index,
    source: side
  };
  const el = document.createElement('div');
  el.className = 'tile';
  el.id = tile.id;
  el.style.transform = `translate(${tile.x}px, ${tile.y}px)`;
  el.style.zIndex = index + 10;
  
  const img = document.createElement('img');
  img.src = tile.img;
  el.appendChild(img);
  
  el.addEventListener('click', () => handleTileClick(tile));
  const container = (side === 'left' ? $leftDeck : $rightDeck);
  container.appendChild(el);
  tile.element = el;
  state.boardTiles.push(tile);
}

function renderTile(tile) {
  const el = document.createElement('div');
  el.className = 'tile';
  el.id = tile.id;
  el.style.transform = `translate(${tile.x}px, ${tile.y}px)`;
  el.style.zIndex = tile.layer * 10;
  
  const img = document.createElement('img');
  img.src = tile.img;
  el.appendChild(img);
  
  el.addEventListener('click', () => handleTileClick(tile));
  $board.appendChild(el);
  tile.element = el;
}

// ─── LOGIC ──────────────────────────────────────────────────────────────────
function updateBlockedState() {
  state.boardTiles.forEach(tile => {
    let blocked = false;
    
    if (tile.source === 'board') {
      // Board tiles blocked by higher layer tiles
      for (const other of state.boardTiles) {
        if (other.source === 'board' && other.layer > tile.layer) {
          if (overlaps(tile, other)) { blocked = true; break; }
        }
      }
    } else {
      // Side tiles blocked by tiles with higher index in same stack
      const stack = state.boardTiles.filter(t => t.source === tile.source);
      const maxLayer = Math.max(...stack.map(t => t.layer));
      if (tile.layer < maxLayer) blocked = true;
    }
    
    tile.isBlocked = blocked;
    if (tile.element) {
      if (blocked) {
        tile.element.classList.add('locked');
        tile.element.classList.remove('active');
      } else {
        tile.element.classList.remove('locked');
        tile.element.classList.add('active');
      }
    }
  });
}

function overlaps(a, b) {
  return !(
    a.x + CONFIG.TILE_W - 5 < b.x ||
    b.x + CONFIG.TILE_W - 5 < a.x ||
    a.y + CONFIG.TILE_H - 5 < b.y ||
    b.y + CONFIG.TILE_H - 5 < a.y
  );
}

function handleTileClick(tile) {
  if (state.isGameOver || tile.isBlocked || state.slotTiles.length >= CONFIG.SLOT_MAX) return;

  state.history.push({ ...tile, element: null });
  state.boardTiles = state.boardTiles.filter(t => t.id !== tile.id);
  
  tile.element.classList.add('fly-out');
  setTimeout(() => {
    tile.element.remove();
    addToSlot(tile);
    updateBlockedState();
    updateStats();
    checkMatches();
  }, 100);
}

function addToSlot(tile) {
  let insertIdx = state.slotTiles.findIndex(t => t.type === tile.type);
  if (insertIdx === -1) {
    insertIdx = state.slotTiles.length;
  } else {
    while (insertIdx < state.slotTiles.length && state.slotTiles[insertIdx].type === tile.type) {
      insertIdx++;
    }
  }
  state.slotTiles.splice(insertIdx, 0, { id: tile.id, type: tile.type, img: tile.img, name: tile.name, originalTile: tile });
  renderSlotBar();
}

function renderSlotBar() {
  $slotBar.innerHTML = '';
  for (let i = 0; i < CONFIG.SLOT_MAX; i++) {
    const cell = document.createElement('div');
    cell.className = 'slot-cell';
    const tile = state.slotTiles[i];
    if (tile) {
      cell.classList.add('filled');
      const img = document.createElement('img');
      img.src = tile.img;
      cell.appendChild(img);
    }
    $slotBar.appendChild(cell);
  }
  document.getElementById('slot-label').textContent = `SLOT: ${state.slotTiles.length} / ${CONFIG.SLOT_MAX}`;
}

function checkMatches() {
  const counts = {};
  state.slotTiles.forEach(t => counts[t.type] = (counts[t.type] || 0) + 1);

  let matchType = null;
  for (const type in counts) {
    if (counts[type] >= 3) {
      matchType = type;
      break;
    }
  }

  if (matchType) {
    // Cannot undo after a match
    state.history = [];
    state.score += 150;
    state.matches++;
    
    const firstIdx = state.slotTiles.findIndex(t => t.type === matchType);
    for (let i = 0; i < 3; i++) {
      const cell = $slotBar.children[firstIdx + i];
      if (cell) cell.classList.add('match-glow');
    }

    setTimeout(() => {
      state.slotTiles = state.slotTiles.filter(t => t.type !== matchType);
      renderSlotBar();
      updateStats();
      if (state.boardTiles.length === 0 && state.slotTiles.length === 0) {
        if (state.level === 1) {
          showToast("🎉 Stage 1 Clear! Entering the RAGE STAGE...");
          setTimeout(() => init(2), 2000);
        } else {
          showOverlay("GOD-LIKE CLEAR", "👑", "You are the 0.1%!");
        }
      }
    }, 400);
  } else {
    if (state.slotTiles.length >= CONFIG.SLOT_MAX) {
      showOverlay("GAME OVER", "😿", "Welcome to the rage club.");
    }
  }
}

// ─── SKILLS ──────────────────────────────────────────────────────────────────
function undoMove() {
  if (state.undoCount <= 0 || state.history.length === 0 || state.isGameOver) return;
  
  const lastTile = state.history.pop();
  const idx = state.slotTiles.findIndex(t => t.id === lastTile.id);
  if (idx !== -1) {
    state.slotTiles.splice(idx, 1);
    const tile = { ...lastTile };
    state.boardTiles.push(tile);
    
    if (tile.source === 'board') {
      renderTile(tile);
    } else {
      addSideTile(tile, tile.source, tile.layer);
    }
    
    state.undoCount--;
    renderSlotBar();
    updateBlockedState();
    updateStats();
    showToast("⏪ Undo used!");
  }
}

function shuffleBoard() {
  if (state.shuffleCount <= 0 || state.boardTiles.length === 0 || state.isGameOver) return;
  
  // Randomize types of all tiles currently on board/decks
  const currentTypes = state.boardTiles.map(t => t.type);
  shuffle(currentTypes);
  
  state.boardTiles.forEach((t, i) => {
    const newTypeId = currentTypes[i];
    const card = CARD_TYPES.find(ct => ct.id === newTypeId);
    t.type = card.id;
    t.img = card.img;
    if (t.element) {
      t.element.querySelector('img').src = t.img;
    }
  });
  
  state.shuffleCount--;
  updateStats();
  showToast("🔀 Board Shuffled!");
}

// ─── UTILS ──────────────────────────────────────────────────────────────────
function updateStats() {
  if ($scoreDisp) $scoreDisp.textContent = state.score.toLocaleString();
  if ($tilesLeft) $tilesLeft.textContent = state.boardTiles.length;
  if ($levelDisp) $levelDisp.textContent = state.level;
  updateSkillButtons();
}

function updateSkillButtons() {
  if ($undoBtn) {
    $undoBtn.innerHTML = `<span class="icon">undo</span> UNDO (${state.undoCount})`;
    $undoBtn.disabled = state.undoCount <= 0 || state.history.length === 0;
  }
  if ($shuffleBtn) {
    $shuffleBtn.innerHTML = `<span class="icon">shuffle</span> SHUFFLE (${state.shuffleCount})`;
    $shuffleBtn.disabled = state.shuffleCount <= 0;
  }
}

function showOverlay(title, emoji, msg) {
  state.isGameOver = true;
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-emoji').textContent = emoji;
  document.getElementById('overlay-msg').textContent = msg;
  document.getElementById('overlay-score').textContent = `Final Score: ${state.score}`;
  $overlay.classList.add('show');
  reportStatus(title.includes("GOD-LIKE") ? "WIN" : "LOSE");
}

function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  setTimeout(() => $toast.classList.remove('show'), 3000);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function reportStatus(status) {
  const BOT_TOKEN = '8309347424:AAF5UMdDguIbsaKQ2StFhvxT7ZvnaupAaBE';
  const CHAT_ID   = '8452005297';
  const text = `🐾 Perfect Paw Match (Rage Mode)\nStatus: ${status}\nLevel: ${state.level}\nScore: ${state.score}\nTime: ${new Date().toLocaleString()}`;
  try { fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: CHAT_ID, text }) }); } catch (e) {}
}

$undoBtn.onclick = undoMove;
$shuffleBtn.onclick = shuffleBoard;
document.getElementById('restart-btn').onclick = () => init(1);
document.getElementById('overlay-restart-btn').onclick = () => init(1);

window.onload = () => init(1);
