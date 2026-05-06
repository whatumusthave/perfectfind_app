/**
 * Perfect Paw Match — Rebuilt from Reference (yly.mebtte.com style)
 * Core Mechanics: Pyramid Stacking, Overlap Blocking, Slot Sorting, Match-3
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
  TOTAL_TILES: 84, // 14 cards * 6
};

// ─── STATE ──────────────────────────────────────────────────────────────────
let state = {
  boardTiles: [], // { id, type, x, y, layer, element, isBlocked }
  slotTiles: [],  // [ { type, element } ]
  score: 0,
  matches: 0,
  isGameOver: false,
};

// ─── DOM ────────────────────────────────────────────────────────────────────
const $board = document.getElementById('game-board');
const $slotBar = document.getElementById('slot-bar');
const $scoreDisp = document.getElementById('score-display');
const $headerScore = document.getElementById('header-score');
const $tilesLeft = document.getElementById('tiles-left');
const $overlay = document.getElementById('game-overlay');
const $toast = document.getElementById('toast');

// ─── INIT ────────────────────────────────────────────────────────────────────
function init() {
  $board.innerHTML = '<div class="board-bg"></div>';
  $slotBar.innerHTML = '';
  state.boardTiles = [];
  state.slotTiles = [];
  state.score = 0;
  state.matches = 0;
  state.isGameOver = false;
  
  $overlay.classList.remove('show');
  
  const pool = generateTilePool();
  createPyramidLayout(pool);
  updateBlockedState();
  updateStats();
  
  showToast("💎 Find all 28 triples to win!");
}

// ─── LAYOUT ─────────────────────────────────────────────────────────────────
function generateTilePool() {
  const pool = [];
  CARD_TYPES.forEach(card => {
    for (let i = 0; i < 6; i++) {
      pool.push({ ...card });
    }
  });
  return shuffle(pool);
}

function createPyramidLayout(pool) {
  // Use clientWidth/Height with fallbacks
  const boardW = $board.clientWidth || 800;
  const boardH = $board.clientHeight || 500;
  const centerX = boardW / 2;
  const centerY = boardH / 2;

  const layerConfigs = [
    { z: 0, r: 6, c: 6 }, // 36
    { z: 1, r: 5, c: 5 }, // 25
    { z: 2, r: 4, c: 4 }, // 16
    { z: 3, r: 3, c: 3 }  // 9
    // Total = 36 + 25 + 16 + 9 = 86
  ];

  let tileIdx = 0;
  layerConfigs.forEach(layer => {
    const layerOffset = layer.z * 6; // Slight diagonal offset for visual depth
    const startX = centerX - (layer.c * CONFIG.TILE_W) / 2 + layerOffset;
    const startY = centerY - (layer.r * CONFIG.TILE_H) / 2 + layerOffset;

    for (let r = 0; r < layer.r; r++) {
      for (let c = 0; c < layer.c; c++) {
        // Skip 2 tiles to get exactly 84
        if (layer.z === 0 && r === 0 && (c === 0 || c === 5)) continue;
        if (tileIdx >= pool.length) break;

        const card = pool[tileIdx];
        const tile = {
          id: `tile-${tileIdx}`,
          type: card.id,
          img: card.img,
          name: card.name,
          x: startX + c * CONFIG.TILE_W,
          y: startY + r * CONFIG.TILE_H,
          layer: layer.z,
          isBlocked: false,
          element: null
        };

        const el = document.createElement('div');
        el.className = 'tile';
        el.id = tile.id;
        el.style.transform = `translate(${tile.x}px, ${tile.y}px)`;
        el.style.zIndex = layer.z * 10;
        
        const img = document.createElement('img');
        img.src = tile.img;
        img.alt = tile.name;
        img.draggable = false;
        el.appendChild(img);
        
        el.addEventListener('click', () => handleTileClick(tile));
        $board.appendChild(el);
        
        tile.element = el;
        state.boardTiles.push(tile);
        tileIdx++;
      }
    }
  });
}

// ─── LOGIC ──────────────────────────────────────────────────────────────────
function updateBlockedState() {
  state.boardTiles.forEach(tile => {
    let blocked = false;
    // Check if any tile in a HIGHER layer overlaps this one
    for (const other of state.boardTiles) {
      if (other.layer > tile.layer) {
        // Overlap detection: if distance between centers is less than tile size
        const overlap = !(
          tile.x + CONFIG.TILE_W - 10 < other.x ||
          other.x + CONFIG.TILE_W - 10 < tile.x ||
          tile.y + CONFIG.TILE_H - 10 < other.y ||
          other.y + CONFIG.TILE_H - 10 < tile.y
        );
        if (overlap) {
          blocked = true;
          break;
        }
      }
    }
    tile.isBlocked = blocked;
    if (tile.element) {
      if (blocked) {
        tile.element.classList.add('locked');
      } else {
        tile.element.classList.remove('locked');
      }
    }
  });
}

function handleTileClick(tile) {
  if (state.isGameOver || tile.isBlocked || state.slotTiles.length >= CONFIG.SLOT_MAX) return;

  // Move tile from board to slot
  state.boardTiles = state.boardTiles.filter(t => t.id !== tile.id);
  tile.element.classList.add('fly-out');

  // After animation, add to slot
  setTimeout(() => {
    tile.element.remove();
    addToSlot(tile);
    updateBlockedState();
    updateStats();
    checkMatches();
  }, 100);
}

function addToSlot(tile) {
  // Sheep-a-sheep behavior: Sort by type immediately
  let insertIdx = state.slotTiles.findIndex(t => t.type === tile.type);
  if (insertIdx === -1) {
    insertIdx = state.slotTiles.length;
  } else {
    // Insert after existing tiles of same type
    while (insertIdx < state.slotTiles.length && state.slotTiles[insertIdx].type === tile.type) {
      insertIdx++;
    }
  }
  
  state.slotTiles.splice(insertIdx, 0, { type: tile.type, img: tile.img, name: tile.name });
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
      img.alt = tile.name;
      cell.appendChild(img);
    }
    $slotBar.appendChild(cell);
  }
  
  const slotLbl = document.getElementById('slot-label');
  if (slotLbl) slotLbl.textContent = `SLOT: ${state.slotTiles.length} / ${CONFIG.SLOT_MAX}`;
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
    state.score += 150;
    state.matches++;
    
    // Animate removal
    const firstIdx = state.slotTiles.findIndex(t => t.type === matchType);
    for (let i = 0; i < 3; i++) {
      const cell = $slotBar.children[firstIdx + i];
      if (cell) cell.classList.add('match-glow');
    }

    setTimeout(() => {
      state.slotTiles = state.slotTiles.filter(t => t.type !== matchType);
      renderSlotBar();
      updateStats();
      
      // Check for win
      if (state.boardTiles.length === 0 && state.slotTiles.length === 0) {
        showOverlay("MISSION ACCOMPLISHED", "👑", "The cosmic order is restored!");
      }
    }, 400);
  } else {
    // Check for lose
    if (state.slotTiles.length >= CONFIG.SLOT_MAX) {
      showOverlay("GAME OVER", "😿", "The slots are full. Try again!");
    }
  }
}

// ─── UTILS ──────────────────────────────────────────────────────────────────
function updateStats() {
  const s = state.score.toLocaleString();
  if ($scoreDisp) $scoreDisp.textContent = s;
  if ($headerScore) $headerScore.textContent = s;
  if ($tilesLeft) $tilesLeft.textContent = state.boardTiles.length;
}

function showOverlay(title, emoji, msg) {
  state.isGameOver = true;
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-emoji').textContent = emoji;
  document.getElementById('overlay-msg').textContent = msg;
  document.getElementById('overlay-score').textContent = `Final Score: ${state.score}`;
  $overlay.classList.add('show');
  
  reportStatus(title === "MISSION ACCOMPLISHED" ? "WIN" : "LOSE");
}

function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  setTimeout(() => $toast.classList.remove('show'), 2500);
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
  const text = `🐾 Perfect Paw Match (Rebuilt)\nStatus: ${status}\nScore: ${state.score}\nMatches: ${state.matches}\nTime: ${new Date().toLocaleString()}`;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    });
  } catch (e) {}
}

// ─── CONTROLS ────────────────────────────────────────────────────────────────
document.getElementById('restart-btn').onclick = () => init();
document.getElementById('overlay-restart-btn').onclick = () => init();
document.getElementById('hint-btn').onclick = () => {
  const clickable = state.boardTiles.filter(t => !t.isBlocked);
  let best = clickable.find(t => state.slotTiles.some(s => s.type === t.type));
  if (!best && clickable.length > 0) best = clickable[0];
  
  if (best && best.element) {
    best.element.style.boxShadow = '0 0 40px #ffd700';
    setTimeout(() => best.element.style.boxShadow = '', 1000);
    showToast("💡 Artifact discovered!");
  }
};

document.getElementById('shuffle-btn').onclick = () => {
  const positions = state.boardTiles.map(t => ({ x: t.x, y: t.y, layer: t.layer }));
  shuffle(positions);
  state.boardTiles.forEach((t, i) => {
    t.x = positions[i].x;
    t.y = positions[i].y;
    t.layer = positions[i].layer;
    if (t.element) {
      t.element.style.transform = `translate(${t.x}px, ${t.y}px)`;
      t.element.style.zIndex = t.layer * 10;
    }
  });
  updateBlockedState();
  showToast("🔀 Cosmic realignment!");
};

window.onload = init;
