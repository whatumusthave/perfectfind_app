// Perfect Paw Match - Yang Le Ge Yang FINAL
// STRICT RULE: A tile is BLOCKED if ANY higher-layer tile overlaps even 1 pixel
const CARDS = [
  'amethyst_heart','celestial_potion','crystal_ball','fuchsia_ribbon',
  'golden_paw','indigo_bowtie','jeweled_keyhole','midnight_cushion',
  'mystic_yarn_ball','rose_pufferfish','royal_cat_bed','sapphire_paw',
  'shopping_bag','starry_cat_mic'
];
const CARD_PATH = 'assets/cards/';
const SLOT_MAX = 7;
const TW = 56;
const TH = 56;
const GRID_STEP = 42; // 56 * 0.75 = 42 means 14px overlap = 1/4

let stage=1, tiles=[], slots=[], slotsTop=[], hasTopRow=false;
let leftDeck=[], rightDeck=[], undoHistory=[];
let undoCount=2, shuffleCount=1, score=0, timeLeft=90;
let timerInterval=null, gameActive=false;

function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

function generatePool(){
  if(stage===1){
    const p=[];
    CARDS.slice(0,3).forEach(c=>{for(let i=0;i<3;i++)p.push(c);});
    return{board:shuffle(p),left:[],right:[]};
  }
  const b=[];
  CARDS.forEach(c=>{for(let i=0;i<6;i++)b.push(c);});
  const dp=shuffle([...CARDS,...CARDS,...CARDS]);
  return{board:shuffle(b),left:dp.slice(0,13),right:dp.slice(13,26)};
}

function buildBoard(pool){
  const board=document.getElementById('game-board');
  const bw=board.clientWidth||500, bh=board.clientHeight||400;
  tiles=[];

  if(stage===1){
    // 3x3 single layer tutorial
    const cols=3,gw=cols*GRID_STEP,gh=cols*GRID_STEP;
    const sx=Math.floor(bw/2-gw/2),sy=Math.floor(bh/2-gh/2);
    pool.forEach((card,i)=>{
      tiles.push({id:i,card,x:sx+(i%cols)*GRID_STEP,y:sy+Math.floor(i/cols)*GRID_STEP,layer:0,removed:false});
    });
    return;
  }

  // Stage 2+: 5 layers, dense grid, 1/4 overlap
  const layers=5, per=Math.ceil(pool.length/layers);
  let idx=0;
  for(let layer=0;layer<layers;layer++){
    const count=Math.min(per,pool.length-idx);
    const cols=Math.ceil(Math.sqrt(count*1.3));
    const rows=Math.ceil(count/cols);
    const gw=(cols-1)*GRID_STEP+TW;
    const gh=(rows-1)*GRID_STEP+TH;
    // Center each layer, offset slightly per layer
    const sx=Math.floor(bw/2-gw/2)+layer*2;
    const sy=Math.floor(bh/2-gh/2)+layer*2;
    for(let i=0;i<count&&idx<pool.length;i++){
      const col=i%cols, row=Math.floor(i/cols);
      tiles.push({
        id:idx, card:pool[idx],
        x:sx+col*GRID_STEP,
        y:sy+row*GRID_STEP,
        layer, removed:false
      });
      idx++;
    }
  }
}

// ── STRICT BLOCKING: even 1px overlap from higher layer = BLOCKED ──
function isBlocked(tile){
  if(tile.removed) return true;
  for(let i=0;i<tiles.length;i++){
    const t=tiles[i];
    if(t.removed || t.id===tile.id || t.layer<=tile.layer) continue;
    // Check if rectangles overlap AT ALL (even 1px)
    const noOverlap = t.x >= tile.x+TW || t.x+TW <= tile.x || t.y >= tile.y+TH || t.y+TH <= tile.y;
    if(!noOverlap) return true; // ANY overlap = blocked
  }
  return false;
}

function render(){
  const board=document.getElementById('game-board');
  board.innerHTML='';
  const vis=tiles.filter(t=>!t.removed).sort((a,b)=>a.layer!==b.layer?a.layer-b.layer:a.y!==b.y?a.y-b.y:a.x-b.x);
  vis.forEach((tile,si)=>{
    const blocked=isBlocked(tile);
    const el=document.createElement('div');
    el.className='tile'+(blocked?' blocked':' free');
    el.style.left=tile.x+'px';
    el.style.top=tile.y+'px';
    el.style.zIndex=tile.layer*1000+(tile.y/GRID_STEP|0)*50+(tile.x/GRID_STEP|0);
    const img=document.createElement('img');
    img.src=CARD_PATH+tile.card+'.png';
    img.draggable=false;
    el.appendChild(img);
    if(!blocked){
      el.onclick=()=>clickTile(tile);
      el.ontouchstart=(e)=>{e.preventDefault();clickTile(tile);};
    }
    board.appendChild(el);
  });
  renderDecks();
  renderSlots();
  updateUI();
}

function renderDecks(){
  rDeck('left-deck',leftDeck,'left');
  rDeck('right-deck',rightDeck,'right');
}
function rDeck(id,deck,side){
  const el=document.getElementById(id);
  if(!deck.length){el.innerHTML='<div class="deck-empty">✓</div>';return;}
  const top=deck[deck.length-1];
  const sc=Math.min(deck.length-1,4);
  let h=`<div class="deck-wrap" onclick="drawDeck('${side}')">`;
  for(let i=sc;i>=1;i--)h+=`<div class="deck-back-card" style="bottom:${i*3}px;right:${i*2}px"></div>`;
  h+=`<div class="deck-top-open"><img src="${CARD_PATH}${top}.png"/></div>`;
  h+=`<div class="deck-count">${deck.length}</div></div>`;
  el.innerHTML=h;
}

function renderSlots(){
  const topBar=document.getElementById('slot-bar-top');
  if(hasTopRow){
    topBar.style.display='flex';topBar.innerHTML='';
    for(let i=0;i<SLOT_MAX;i++){
      const d=document.createElement('div');d.className='slot'+(slotsTop[i]?' filled':'');
      if(slotsTop[i]){const m=document.createElement('img');m.src=CARD_PATH+slotsTop[i]+'.png';d.appendChild(m);}
      topBar.appendChild(d);
    }
  }else{topBar.style.display='none';}
  const bar=document.getElementById('slot-bar');bar.innerHTML='';
  for(let i=0;i<SLOT_MAX;i++){
    const d=document.createElement('div');d.className='slot'+(slots[i]?' filled':'');
    if(slots[i]){const m=document.createElement('img');m.src=CARD_PATH+slots[i]+'.png';d.appendChild(m);}
    bar.appendChild(d);
  }
  document.getElementById('slot-count').textContent=`SLOT: ${slots.length+slotsTop.length} / ${hasTopRow?SLOT_MAX*2:SLOT_MAX}`;
}

function updateUI(){
  document.getElementById('score').textContent='★ '+score.toLocaleString();
  document.getElementById('undo-btn').innerHTML=`↩<br>UNDO(${undoCount})`;
  document.getElementById('shuffle-btn').innerHTML=`⟳<br>SHUF(${shuffleCount})`;
  if(!tiles.filter(t=>!t.removed).length&&!leftDeck.length&&!rightDeck.length&&!slots.length&&!slotsTop.length)showWin();
}

function insertSlot(card){
  const tgt=(hasTopRow&&slots.length>=SLOT_MAX)?slotsTop:slots;
  let at=tgt.length;
  for(let i=tgt.length-1;i>=0;i--){if(tgt[i]===card){at=i+1;break;}}
  tgt.splice(at,0,card);
}

function checkMatch(){
  let ch=true;
  while(ch){ch=false;const m={};slots.forEach((c,i)=>{(m[c]=m[c]||[]).push(i);});
    for(const[,idx]of Object.entries(m)){if(idx.length>=3){slots=slots.filter((_,i)=>!new Set(idx.slice(0,3)).has(i));score+=300*stage;ch=true;break;}}}
  if(hasTopRow){
    ch=true;
    while(ch){ch=false;const m={};slotsTop.forEach((c,i)=>{(m[c]=m[c]||[]).push(i);});
      for(const[,idx]of Object.entries(m)){if(idx.length>=3){slotsTop=slotsTop.filter((_,i)=>!new Set(idx.slice(0,3)).has(i));score+=300*stage;ch=true;break;}}}
    if(!slotsTop.length)hasTopRow=false;
    else if(slots.length<SLOT_MAX){while(slots.length<SLOT_MAX&&slotsTop.length)slots.push(slotsTop.shift());if(!slotsTop.length)hasTopRow=false;}
  }
}

function saveUndo(){undoHistory.push({slots:[...slots],slotsTop:[...slotsTop],hasTopRow,leftDeck:[...leftDeck],rightDeck:[...rightDeck],ts:tiles.map(t=>({id:t.id,r:t.removed})),score});}

function clickTile(tile){
  if(!gameActive||tile.removed||isBlocked(tile))return;
  saveUndo();tile.removed=true;insertSlot(tile.card);checkMatch();render();
  if(!hasTopRow&&slots.length>=SLOT_MAX)showSlotFull();
  else if(hasTopRow&&slotsTop.length>=SLOT_MAX)showGameOver();
}

function drawDeck(side){
  if(!gameActive)return;
  if(!hasTopRow&&slots.length>=SLOT_MAX){showSlotFull();return;}
  if(hasTopRow&&slotsTop.length>=SLOT_MAX){showGameOver();return;}
  const dk=side==='left'?leftDeck:rightDeck;
  if(!dk.length)return;
  saveUndo();insertSlot(dk.pop());checkMatch();render();
  if(!hasTopRow&&slots.length>=SLOT_MAX)showSlotFull();
  else if(hasTopRow&&slotsTop.length>=SLOT_MAX)showGameOver();
}

function doUndo(){
  if(!gameActive||!undoCount||!undoHistory.length)return;
  const s=undoHistory.pop();
  s.ts.forEach(ts=>{const t=tiles.find(t=>t.id===ts.id);if(t)t.removed=ts.r;});
  slots=s.slots;slotsTop=s.slotsTop;hasTopRow=s.hasTopRow;
  leftDeck=s.leftDeck;rightDeck=s.rightDeck;score=s.score;
  undoCount--;render();
}

function doShuffle(){
  if(!gameActive||!shuffleCount)return;
  shuffleCount--;
  const a=tiles.filter(t=>!t.removed);
  const c=shuffle(a.map(t=>t.card));
  a.forEach((t,i)=>t.card=c[i]);
  render();
}

function showSlotFull(){
  gameActive=false;clearInterval(timerInterval);
  document.getElementById('overlay').style.display='flex';
  document.getElementById('overlay').innerHTML=`<div class="result-box lose"><div style="font-size:36px">😾</div><h2>SLOTS FULL!</h2><p>Watch ad to push 3 slots up!</p><button onclick="watchAd()" style="background:#22c55e;color:#fff">📺 Watch Ad → Push 3 Up</button><button onclick="restartGame()">↺ Restart</button></div>`;
}

function watchAd(){
  const ov=document.getElementById('overlay');
  let cd=5;
  ov.innerHTML=`<div class="result-box"><div style="font-size:48px">📺</div><h2 style="color:var(--l)">Ad Playing...</h2><div id="acd" style="font-size:48px;color:var(--g);margin:12px 0">${cd}</div></div>`;
  const t=setInterval(()=>{cd--;const e=document.getElementById('acd');if(e)e.textContent=cd;
    if(cd<=0){clearInterval(t);const moved=slots.splice(slots.length-3,3);slotsTop=[...moved,...slotsTop];hasTopRow=true;ov.style.display='none';gameActive=true;startTimer();render();}
  },1000);
}

function showGameOver(){
  if(!gameActive)return;gameActive=false;clearInterval(timerInterval);
  document.getElementById('overlay').style.display='flex';
  document.getElementById('overlay').innerHTML=`<div class="result-box lose"><div style="font-size:48px">😾</div><h2>GAME OVER</h2><div class="clear-rate">Clear Rate: ${stage===1?'72%':'0.1%'}</div><p>${stage>1?'Only 0.1% clear this!':'Try again!'}</p><button onclick="restartGame()">↺ Try Again</button><button onclick="nextStage()">Next Stage</button></div>`;
}

function showWin(){
  gameActive=false;clearInterval(timerInterval);
  document.getElementById('overlay').style.display='flex';
  document.getElementById('overlay').innerHTML=`<div class="result-box win"><div style="font-size:48px">👑</div><h2>PERFECT MATCH!</h2><div class="result-score">Score: ${score.toLocaleString()}</div><button onclick="nextStage()">Next Stage →</button><button onclick="restartGame()">Play Again</button></div>`;
}

function startTimer(){
  timeLeft=stage===1?60:180;clearInterval(timerInterval);updateTimer();
  timerInterval=setInterval(()=>{timeLeft--;updateTimer();if(timeLeft<=0){clearInterval(timerInterval);showGameOver();}},1000);
}

function updateTimer(){
  const m=String(Math.floor(timeLeft/60)).padStart(2,'0'),s=String(timeLeft%60).padStart(2,'0');
  const el=document.getElementById('timer');el.textContent=m+':'+s;el.style.color=timeLeft<30?'#ff6b6b':'#ffd700';
}

function nextStage(){stage++;document.getElementById('overlay').style.display='none';document.getElementById('stage-label').textContent='Stage '+stage;startGame();}
function restartGame(){document.getElementById('overlay').style.display='none';startGame();}

function startGame(){
  gameActive=true;slots=[];slotsTop=[];hasTopRow=false;undoHistory=[];undoCount=2;shuffleCount=1;score=0;
  const{board,left,right}=generatePool();leftDeck=left;rightDeck=right;buildBoard(board);render();startTimer();
}

window.addEventListener('load',()=>{stage=1;startGame();});
window.doUndo=doUndo;window.doShuffle=doShuffle;window.restartGame=restartGame;window.nextStage=nextStage;window.drawDeck=drawDeck;window.watchAd=watchAd;
