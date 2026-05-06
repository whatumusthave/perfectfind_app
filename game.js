/**
 * Perfect Paw Match — Ultimate Triple-Match Tile Game
 * Viral "Sheep a Sheep" Mechanics Implementation
 */

// ─── CARD ASSETS ────────────────────────────────────────────────────────────
const CARD_ASSETS = [
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

// ─── GAME CONFIG ────────────────────────────────────────────────────────────
const CONFIG = {
  SLOT_CAPACITY: 7,
  TILE_SIZE: 72,
  OVERLAP_THRESHOLD: 40, // How many pixels overlap counts as "blocking"
  PYRAMID_LAYERS: 6,
  TOTAL_TRIPLES: 28, // 28 * 3 = 84 tiles total
};

// ─── STATE ──────────────────────────────────────────────────────────────────
let state = {
  boardTiles: [], // { id, type, x, y, z, isBlocked, element }
  slotTiles: [],  // [ { type, element } ]
  score: 0,
  isGameOver: false,
  isWin: false,
};

// ─── DOM ELEMENTS ───────────────────────────────────────────────────────────
const $board = document.getElementById('game-board');
const $slotBar = document.getElementById('slot-bar');
const $scoreDisplay = document.getElementById('score-display');
const $tilesLeft = document.getElementById('tiles-left');
const $overlay = document.getElementById('game-overlay');
const $toast = document.getElementById('toast');

// ─── INITIALIZATION ─────────────────────────────────────────────────────────
function initGame() {
  // Clear previous state
  $board.innerHTML = '';
  $slotBar.innerHTML = '';
  state.boardTiles = [];
  state.slotTiles = [];
  state.score = 0;
  state.isGameOver = false;
  state.isWin = false;
  $overlay.classList.remove('show');
  
  updateStats();
  generateTiles();
  renderBoard();
  checkBlockedState();
  
  showToast("🌟 Game Started! Match 3 to clear.");
}

// ─── TILE GENERATION ────────────────────────────────────────────────────────
function generateTiles() {
  // 1. Create a pool of 84 tiles (14 card types * 6 copies each = 28 triples)
  let pool = [];
  CARD_ASSETS.forEach(card => {
    for (let i = 0; i < 6; i++) {
      pool.push({ ...card });
    }
  });
  
  // Shuffle the pool
  shuffle(pool);
  
  // 2. Define positions in a "pseudo-3D" stack
  // Fallback to 800x600 if board size is not yet available
  const boardW = $board.clientWidth || 800;
  const boardH = $board.clientHeight || 500;
  const centerX = boardW / 2;
  const centerY = boardH / 2;
  
  let tileIndex = 0;
  
  // Layer distribution (total 84)
  const layerConfigs = [
    { z: 0, rows: 6, cols: 6 }, // 36
    { z: 1, rows: 5, cols: 5 }, // 25
    { z: 2, rows: 4, cols: 4 }, // 16
    { z: 3, rows: 2, cols: 2 }, // 4
    { z: 4, rows: 1, cols: 3 }  // 3
  ];
  
  layerConfigs.forEach(layer => {
    // Offset each layer slightly to create depth
    const layerOffset = layer.z * 4;
    const startX = centerX - ((layer.cols * CONFIG.TILE_SIZE) / 2) + layerOffset;
    const startY = centerY - ((layer.rows * CONFIG.TILE_SIZE) / 2) + layerOffset;
    
    for (let r = 0; r < layer.rows; r++) {
      for (let c = 0; c < layer.cols; c++) {
        if (tileIndex >= pool.length) break;
        
        const card = pool[tileIndex];
        const tile = {
          id: `tile-${tileIndex}`,
          type: card.id,
          img: card.img,
          name: card.name,
          x: startX + (c * CONFIG.TILE_SIZE),
          y: startY + (r * CONFIG.TILE_SIZE),
          z: layer.z,
          isBlocked: false,
          element: null
        };
        
        state.boardTiles.push(tile);
        tileIndex++;
      }
    }
  });
}

function renderBoard() {
  // Clear board before rendering
  $board.innerHTML = '<div class="board-bg"></div>';
  state.boardTiles.forEach(tile => {
    const el = document.createElement('div');
    el.className = 'tile';
    el.id = tile.id;
    // Use transform for better performance and positioning
    el.style.left = `0px`;
    el.style.top = `0px`;
    el.style.transform = `translate(${tile.x}px, ${tile.y}px)`;
    el.style.zIndex = tile.z * 10;
    
    const img = document.createElement('img');
    img.src = tile.img;
    img.alt = tile.name;
    img.draggable = false;
    
    el.appendChild(img);
    el.addEventListener('click', () => onTileClick(tile));
    
    $board.appendChild(el);
    tile.element = el;
  });
}

// ─── GAME LOGIC ─────────────────────────────────────────────────────────────
function checkBlockedState() {
  // A tile is blocked if any tile with a higher Z overlaps it
  for (let i = 0; i < state.boardTiles.length; i++) {
    const t1 = state.boardTiles[i];
    let blocked = false;
    
    for (let j = 0; j < state.boardTiles.length; j++) {
      const t2 = state.boardTiles[j];
      
      if (t2.z > t1.z) {
        // Simple bounding box collision check
        const overlap = !(
          t1.x + CONFIG.TILE_SIZE - 10 < t2.x ||
          t1.x + 10 > t2.x + CONFIG.TILE_SIZE ||
          t1.y + CONFIG.TILE_SIZE - 10 < t2.y ||
          t1.y + 10 > t2.y + CONFIG.TILE_SIZE
        );
        
        if (overlap) {
          blocked = true;
          break;
        }
      }
    }
    
    t1.isBlocked = blocked;
    if (t1.element) {
      if (blocked) {
        t1.element.classList.add('locked');
      } else {
        t1.element.classList.remove('locked');
      }
    }
  }
}

function onTileClick(tile) {
  if (state.isGameOver || tile.isBlocked || state.slotTiles.length >= CONFIG.SLOT_CAPACITY) return;
  
  // 1. Remove from board state and DOM
  state.boardTiles = state.boardTiles.filter(t => t.id !== tile.id);
  tile.element.classList.add('fly-out');
  
  // 2. Add to slot bar
  setTimeout(() => {
    addToSlot(tile);
    checkBlockedState();
    updateStats();
  }, 100);
}

function addToSlot(tile) {
  // Find insertion point (group same types)
  let insertIndex = state.slotTiles.findIndex(t => t.type === tile.type);
  if (insertIndex === -1) {
    insertIndex = state.slotTiles.length;
  } else {
    // Insert after the last matching type
    while (insertIndex < state.slotTiles.length && state.slotTiles[insertIndex].type === tile.type) {
      insertIndex++;
    }
  }
  
  state.slotTiles.splice(insertIndex, 0, { type: tile.type, img: tile.img, name: tile.name });
  
  renderSlotBar();
  
  // Check for matches
  checkMatches();
}

function renderSlotBar() {
  $slotBar.innerHTML = '';
  // Fill slots
  for (let i = 0; i < CONFIG.SLOT_CAPACITY; i++) {
    const cell = document.createElement('div');
    cell.className = 'slot-cell';
    
    if (state.slotTiles[i]) {
      cell.classList.add('filled');
      const img = document.createElement('img');
      img.src = state.slotTiles[i].img;
      img.alt = state.slotTiles[i].name;
      cell.appendChild(img);
    }
    
    $slotBar.appendChild(cell);
  }
  
  const slotLabel = document.getElementById('slot-label');
  if (slotLabel) slotLabel.textContent = `SLOT: ${state.slotTiles.length} / ${CONFIG.SLOT_CAPACITY}`;
}

function checkMatches() {
  const counts = {};
  state.slotTiles.forEach(t => {
    counts[t.type] = (counts[t.type] || 0) + 1;
  });
  
  let matchedType = null;
  for (let type in counts) {
    if (counts[type] >= 3) {
      matchedType = type;
      break;
    }
  }
  
  if (matchedType) {
    // Remove the 3 tiles
    state.score += 150;
    
    // Add match glow animation to the specific slots
    const firstIdx = state.slotTiles.findIndex(t => t.type === matchedType);
    for(let i=0; i<3; i++) {
        const cell = $slotBar.children[firstIdx + i];
        if(cell) cell.classList.add('match-glow');
    }
    
    setTimeout(() => {
      state.slotTiles = state.slotTiles.filter(t => t.type !== matchedType);
      renderSlotBar();
      updateStats();
      
      // Check if won
      if (state.boardTiles.length === 0 && state.slotTiles.length === 0) {
        showOverlay("YOU WIN!", "🎉", "All items matched perfectly!");
      }
    }, 400);
  } else {
    // Check if lost
    if (state.slotTiles.length >= CONFIG.SLOT_CAPACITY) {
      showOverlay("GAME OVER", "😿", "The slot bar is full!");
    }
  }
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function updateStats() {
  $scoreDisplay.textContent = state.score.toLocaleString();
  const headerScore = document.getElementById('header-score');
  if (headerScore) headerScore.textContent = state.score.toLocaleString();
  $tilesLeft.textContent = state.boardTiles.length;
}

function showOverlay(title, emoji, msg) {
  state.isGameOver = true;
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-emoji').textContent = emoji;
  document.getElementById('overlay-msg').textContent = msg;
  document.getElementById('overlay-score').textContent = `Final Score: ${state.score}`;
  $overlay.classList.add('show');
  
  // Report to Telegram/n8n
  reportStatus(title === "YOU WIN!" ? "WIN" : "LOSE");
}

function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  setTimeout(() => $toast.classList.remove('show'), 2500);
}

async function reportStatus(status) {
  const BOT_TOKEN = '8309347424:AAF5UMdDguIbsaKQ2StFhvxT7ZvnaupAaBE';
  const CHAT_ID   = '8452005297';
  const text = `🐾 Perfect Paw Match\nStatus: ${status}\nScore: ${state.score}\nTime: ${new Date().toLocaleString()}`;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    });
  } catch (e) {}
}

// ─── CONTROLS ────────────────────────────────────────────────────────────────
document.getElementById('restart-btn').onclick = () => initGame();
document.getElementById('overlay-restart-btn').onclick = () => initGame();
document.getElementById('hint-btn').onclick = () => {
    // Simple hint: highlight a clickable tile that matches something in the slot
    const clickable = state.boardTiles.filter(t => !t.isBlocked);
    let best = clickable.find(t => state.slotTiles.some(s => s.type === t.type));
    if (!best && clickable.length > 0) best = clickable[0];
    
    if (best && best.element) {
        best.element.style.transform = 'scale(1.2) translateY(-10px)';
        best.element.style.boxShadow = '0 0 30px #ffd700';
        setTimeout(() => {
            best.element.style.transform = '';
            best.element.style.boxShadow = '';
        }, 1000);
        showToast("💡 Look at the glowing tile!");
    }
};

document.getElementById('shuffle-btn').onclick = () => {
    // Shuffle positions of board tiles
    const positions = state.boardTiles.map(t => ({ x: t.x, y: t.y, z: t.z }));
    shuffle(positions);
    state.boardTiles.forEach((t, i) => {
        t.x = positions[i].x;
        t.y = positions[i].y;
        t.z = positions[i].z;
        if (t.element) {
            t.element.style.left = `${t.x}px`;
            t.element.style.top = `${t.y}px`;
            t.element.style.zIndex = t.z * 10;
        }
    });
    checkBlockedState();
    showToast("🔀 Board Shuffled!");
};

window.onload = initGame;
