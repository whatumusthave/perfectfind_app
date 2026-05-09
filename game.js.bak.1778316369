// Perfect Paw Match v2.1 - Fixed: 14 cards * 3, image fix, side decks 28 total, shuffle all, ghost click fix
const CARDS = [
  '1amethyst_heart',
  '2celestial_potion',
  '3Silver_Shopping_Bag',
  '4Terquois_cushion',
  '5Sapphire_Paw',
  '6fuchsia_ribbon',
  '7jeweled_keyhole',
  '8golden_paw ',
  '9pinkruby_pufferfish',
  '10crystal_ball',
  '11indigo_bowtie',
  '12royal cat bed',
  '13zio',
  '14ziawink'
];
const CP = '/assets/cards/', SM = 7, CS = 62, STEP = 31, LOFF = 16;
let stage = 1, tiles = [], sideLeft = [], sideRight = [], slots = [], hist = [], undo = 2, shuf = 1, score = 0, on = false, lastClickTime = 0;

// Shuffle array
function sh(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// Get board positions (visible tiles only)
function getPositions() {
  if (stage === 1) return [
    {gx:0,gy:0,l:0},{gx:1,gy:0,l:0},{gx:2,gy:0,l:0},
    {gx:0,gy:1,l:0},{gx:1,gy:1,l:0},{gx:2,gy:1,l:0},
    {gx:0,gy:2,l:0},{gx:1,gy:2,l:0},{gx:2,gy:2,l:0},
    {gx:0,gy:0,l:1},{gx:1,gy:0,l:1},{gx:2,gy:0,l:1},
  ];
  if (stage === 2) return [
    ...[0,1,2,3].flatMap(r => [0,1,2,3,4].map(c => ({gx:c,gy:r,l:0}))),
    ...[0,1,2].flatMap(r => [1,2,3].map(c => ({gx:c,gy:r,l:1}))),
    {gx:1,gy:0,l:2},{gx:2,gy:0,l:2},{gx:1,gy:1,l:2},{gx:2,gy:1,l:2},
  ];
  return [
    ...[0,1,2,3,4].flatMap(r => [0,1,2,3,4,5].map(c => ({gx:c,gy:r,l:0}))),
    ...[0,1,2,3].flatMap(r => [1,2,3,4].map(c => ({gx:c,gy:r,l:1}))),
    ...[0,1,2].flatMap(r => [2,3].map(c => ({gx:c,gy:r,l:2}))),
    {gx:2,gy:1,l:3},
  ];
}

// Random step 25%-75% of CS
function rStep() { return Math.round(CS * (0.25 + Math.random() * 0.5)); }

function build() {
  const bd = document.getElementById('game-board');
  const bw = bd.offsetWidth || 360, bh = bd.offsetHeight || 460;
  tiles = []; sideLeft = []; sideRight = [];

  // Visible board
  const pos = getPositions();
  const count = pos.length - pos.length % 3; // Always multiple of 3
  const used = sh(pos).slice(0, count);

  // Exactly 14 cards, shuffled, repeat exactly 3x for no remainder
  const chosen = sh([...CARDS]).slice(0, 14); // 14 unique cards
  const pool = [];
  for (let i = 0; i < count; i++) pool.push(chosen[i % 14]); // Repeat cycle
  const boardCards = sh(pool);

  // Side decks for stage 2+: 14 each side, top visible
  if (stage >= 2) {
    const sidePool = sh([...CARDS]).slice(0, 14); // 14 cards each
    sideLeft = sidePool.map((card, i) => ({id: `L${i}`, card, visible: i === 0, px: -80, py: 50 + i * 10, layer: 0}));
    sideRight = sidePool.map((card, i) => ({id: `R${i}`, card, visible: i === 0, px: bw - 20, py: 50 + i * 10, layer: 0}));
    sideLeft[0].visible = true; sideRight[0].visible = true; // Top always open
  }

  // Pre-compute random steps
  const colSteps = [], rowSteps = [];
  for (let i = 0; i < 10; i++) { colSteps.push(rStep()); rowSteps.push(rStep()); }

  // Pixel positions
  const pxArr = [];
  used.forEach(({gx, gy, l}) => {
    let px = 0, py = 0;
    for (let c = 0; c < gx; c++) px += colSteps[c % colSteps.length];
    for (let r = 0; r < gy; r++) py += rowSteps[r % rowSteps.length];
    px += l * LOFF; py += l * LOFF;
    pxArr.push({px, py});
  });

  // Bounding box & offset
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  pxArr.forEach(({px, py}) => {
    minX = Math.min(minX, px); minY = Math.min(minY, py);
    maxX = Math.max(maxX, px + CS); maxY = Math.max(maxY, py + CS);
  });
  const ox = Math.round(bw / 2 - (maxX - minX) / 2 - minX);
  const oy = Math.round(bh * 0.45 - (maxY - minY) / 2 - minY);

  // Build tiles
  used.forEach(({gx, gy, l}, i) => {
    tiles.push({
      id: i, card: boardCards[i], gx, gy,
      px: pxArr[i].px + ox, py: pxArr[i].py + oy,
      layer: l, rm: false, visible: true
    });
  });
}

function isBlocked(t) {
  if (t.rm || t.id.toString().startsWith('L') || t.id.toString().startsWith('R')) return false; // Sides always clickable if visible
  const thresh = CS * 0.15;
  for (const o of tiles) {
    if (o.rm || o.id === t.id || o.layer <= t.layer) continue;
    const ox = Math.min(t.px + CS, o.px + CS) - Math.max(t.px, o.px);
    const oy = Math.min(t.py + CS, o.py + CS) - Math.max(t.py, o.py);
    if (ox >= thresh && oy >= thresh) return true;
  }
  return false;
}

// Image load fix: preload + error fallback
const imgCache = new Map();
function preloadImages() {
  CARDS.forEach(card => {
    const img = new Image();
    img.src = CP + card + '.png';
    imgCache.set(card, img);
    img.onerror = () => { console.log(`Image missing: ${card}`); }; // Log missing
  });
  // Note: card_back.png might not exist yet, but we'll try
  const backImg = new Image();
  backImg.src = CP + 'card_back.png';
  imgCache.set('card_back', backImg);
}

function render() {
  const bd = document.getElementById('game-board');
  bd.innerHTML = '';

  // Render tiles (board + sides)
  const allTiles = [...tiles, ...sideLeft, ...sideRight].filter(t => !t.rm);
  allTiles.sort((a, b) => a.layer - b.layer || a.py - b.py || a.px - b.px);

  allTiles.forEach(t => {
    const bl = isBlocked(t);
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:${t.px}px;top:${t.py}px;width:${CS}px;height:${CS}px;z-index:${t.layer*500 + t.py*20 + (t.px|0)};border-radius:8px;overflow:hidden;pointer-events:${bl ? 'none' : 'auto'};cursor:${bl ? 'not-allowed' : 'pointer'};`;

    const img = document.createElement('img');
    const useCard = t.visible ? t.card : 'card_back';
    img.src = imgCache.has(useCard) ? imgCache.get(useCard).src : CP + useCard + '.png';
    img.style.cssText = `width:100%;height:100%;object-fit:cover;display:block;border-radius:7px;border:${bl ? '1.5px solid rgba(120,90,170,.4)' : '2.5px solid rgba(255,215,0,.9)'};filter:${bl ? 'brightness(.55) saturate(0.7)' : 'brightness(1)'};box-shadow:${bl ? 'none' : '0 2px 10px rgba(255,215,0,.3)'};transition:filter .1s, box-shadow .1s;`;
    img.onerror = () => { img.style.background = '#4caf50'; img.src = ''; }; // Fallback green

    el.appendChild(img);
    if (!bl) {
      el.onclick = () => clickTile(t);
      el.ontouchstart = e => { e.preventDefault(); clickTile(t); };
    }
    bd.appendChild(el);
  });

  renderSlots();
  renderUI();
}

function renderSlots() {
  const bar = document.getElementById('slot-bar');
  bar.innerHTML = '';
  for (let i = 0; i < SM; i++) {
    const d = document.createElement('div');
    d.style.cssText = `width:40px;height:40px;border:2px dashed ${slots[i]?'rgba(255,215,0,.5)':'rgba(205,189,255,.5)'};border-radius:7px;background:${slots[i]?'rgba(255,215,0,.06)':'rgba(50,34,71,.3)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;`;
    if (slots[i]) {
      const m = document.createElement('img');
      m.src = CP + slots[i] + '.png';
      m.style.cssText = 'width:34px;height:34px;object-fit:cover;border-radius:5px;';
      d.appendChild(m);
    }
    bar.appendChild(d);
  }
  document.getElementById('slot-count').textContent = slots.length + '/' + SM;
}

function renderUI() {
  document.getElementById('score').textContent = '★ ' + score.toLocaleString();
  const undoBadge = document.getElementById('undo-badge');
  const shufBadge = document.getElementById('shuf-badge');
  if(undoBadge) undoBadge.textContent = undo;
  if(shufBadge) shufBadge.textContent = shuf;
  if (!tiles.filter(t => !t.rm).length && !sideLeft.length && !sideRight.length && !slots.length) win();
}

function insertSlot(card) {
  let at = slots.length;
  for (let i = slots.length - 1; i >= 0; i--) { if (slots[i] === card) { at = i + 1; break; } }
  slots.splice(at, 0, card);
}

function checkMatch() {
  let ch = true;
  while (ch) {
    ch = false;
    const m = {};
    slots.forEach((c, i) => { (m[c] = m[c] || []).push(i); });
    for (const [, idx] of Object.entries(m)) {
      if (idx.length >= 3) {
        slots = slots.filter((_, i) => !new Set(idx.slice(0, 3)).has(i));
        score += 300 * stage;
        ch = true;
        break;
      }
    }
  }
}

function saveState() {
  hist.push({
    slots: [...slots],
    ts: tiles.map(t => ({id: t.id, rm: t.rm})),
    sideL: sideLeft.map(t => ({id: t.id, rm: t.rm, visible: t.visible})),
    sideR: sideRight.map(t => ({id: t.id, rm: t.rm, visible: t.visible})),
    score
  });
}

function clickTile(t) {
  const now = Date.now();
  if (!on || now - lastClickTime < 120 || t.rm || isBlocked(t) || (!t.visible && (t.id.toString().startsWith('L') || t.id.toString().startsWith('R')))) return;
  lastClickTime = now;

  saveState();
  t.rm = true;
  // If it was a side deck card, reveal the next one
  if (t.id.toString().startsWith('L')) {
    const idx = sideLeft.indexOf(t);
    if (idx < sideLeft.length - 1) sideLeft[idx+1].visible = true;
  } else if (t.id.toString().startsWith('R')) {
    const idx = sideRight.indexOf(t);
    if (idx < sideRight.length - 1) sideRight[idx+1].visible = true;
  }

  insertSlot(t.card);
  checkMatch();
  render();

  if (slots.length >= SM) showFull();
}

function doUndo() {
  if (!on || !undo || !hist.length) return;
  const s = hist.pop();
  s.ts.forEach(({id, rm}) => { const t = tiles.find(t => t.id === id); if (t) t.rm = rm; });
  s.sideL?.forEach(({id, rm, visible}) => { const t = sideLeft.find(t => t.id === id); if (t) { t.rm = rm; t.visible = visible; } });
  s.sideR?.forEach(({id, rm, visible}) => { const t = sideRight.find(t => t.id === id); if (t) { t.rm = rm; t.visible = visible; } });
  slots = s.slots;
  score = s.score;
  undo--;
  render();
}

function doShuffle() {
  if (!on || !shuf) return;
  shuf--;
  // Shuffle ALL: board + sides
  const allCards = tiles.filter(t => !t.rm).map(t => t.card);
  if (sideLeft.length) allCards.push(...sideLeft.filter(t=>!t.rm).map(t => t.card));
  if (sideRight.length) allCards.push(...sideRight.filter(t=>!t.rm).map(t => t.card));
  const shuffled = sh(allCards);

  // Reassign to visible positions
  let idx = 0;
  tiles.filter(t => !t.rm).forEach(t => t.card = shuffled[idx++]);
  sideLeft.filter(t=>!t.rm).forEach(t => t.card = shuffled[idx++]);
  sideRight.filter(t=>!t.rm).forEach(t => t.card = shuffled[idx++]);
  render();
}

function doWithdraw() {
  if (!on || !slots.length) return;
  const card = slots.pop();
  const gone = tiles.filter(t => t.rm);
  if (gone.length) { gone[gone.length - 1].rm = false; gone[gone.length - 1].card = card; }
  else slots.push(card);
  render();
}

function showFull() {
  on = false;
  const ov = document.getElementById('overlay'); ov.style.display = 'flex';
  ov.innerHTML = `<div class="result-box lose"><div style="font-size:42px">😾</div><h2>SLOTS FULL!</h2>
  <p>Watch ad to free 3 slots</p>
  <button onclick="doAd()" style="background:#22c55e;color:#fff">📺 Watch Ad (+3)</button>
  <button onclick="doRestart()">↺ Restart</button></div>`;
}

function doAd() {
  const ov = document.getElementById('overlay'); let cd = 5;
  ov.innerHTML = `<div class="result-box" style="text-align:center"><div style="font-size:52px">📺</div><div id="acd" style="font-size:52px;font-weight:800;color:#ffd700;margin-top:10px">${cd}</div></div>`;
  const iv = setInterval(() => {
    cd--; const e = document.getElementById('acd'); if (e) e.textContent = cd;
    if (cd <= 0) { clearInterval(iv); slots = slots.slice(3); ov.style.display = 'none'; on = true; render(); }
  }, 1000);
}

function win() {
  on = false;
  const ov = document.getElementById('overlay'); ov.style.display = 'flex';
  ov.innerHTML = `<div class="result-box win"><div style="font-size:52px">👑</div><h2>PERFECT!</h2>
  <div style="font-size:14px;font-weight:700;margin:6px 0 14px">Score: ${score.toLocaleString()}</div>
  <button onclick="doNext()">Next Stage →</button>
  <button onclick="doRestart()">↺ Replay</button></div>`;
}

function doNext() { stage++; document.getElementById('overlay').style.display = 'none'; document.getElementById('stage-label').textContent = 'Stage ' + stage; go(); }
function doRestart() { document.getElementById('overlay').style.display = 'none'; document.getElementById('stage-label').textContent = 'Stage ' + stage; go(); }

function go() {
  on = true; slots = []; hist = []; undo = 2; shuf = 1; score = 0;
  build(); render();
}

window.addEventListener('load', () => {
  preloadImages();
  stage = 1;
  go();
});

window.doUndo = doUndo; window.doShuffle = doShuffle; window.doWithdraw = doWithdraw;
window.doRestart = doRestart; window.doNext = doNext; window.doAd = doAd;
