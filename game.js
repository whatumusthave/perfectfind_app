// Perfect Paw Match — 최종 완벽판
// HTML 구조: #game-board > #board-inner (360×460, position:relative)
// 반드시 getElementById('board-inner') 사용

const CARDS=[
  'amethyst-heart','cosmic-milk-bottle','crystal-ball','fuchsia-ribbon',
  'golden-paw','indigo-bowtie','jeweled-key','mystic-yarn',
  'ruby-goby','royal-cat-bed','sapphire-paw','silver-bag',
  'starry-mic','turquoise-cushion'
];
const CP='asset/cards/', CW=72, CH=72, STEP=36;
const BW=360, BH=460;

// ── 레벨 설정 ──
const LEVELS=[
  {boardCount:9,  deckMode:0, layers:2},  // Lv1 튜토리얼
  {boardCount:42, deckMode:5, layers:1},  // Lv2 쉬움
  {boardCount:63, deckMode:5, layers:3},  // Lv3 쉬움+
  {boardCount:84, deckMode:4, layers:3},  // Lv4 중간
  {boardCount:84, deckMode:3, layers:4},  // Lv5 중간
  {boardCount:98, deckMode:3, layers:5},  // Lv6 중간+
  {boardCount:98, deckMode:3, layers:6},  // Lv7 중간++
  {boardCount:98, deckMode:2, layers:7},  // Lv8 어려움
  {boardCount:98, deckMode:2, layers:8},  // Lv9 어려움+
  {boardCount:98, deckMode:2, layers:10}, // Lv10 극한 (1%)
];

let tiles=[], slots=[], hist=[],
    undo=2, shuf=1, score=0, on=false, stage=1,
    SM=7, adUsed=false,
    deckTL=[], deckBL=[], deckTR=[], deckBR=[], deckBC=[];

// ── 포인트 시스템 ──
function getPts(){ return parseInt(localStorage.getItem('ppm_points')||'0'); }
function setPts(n){ localStorage.setItem('ppm_points', n); }
function addPts(n){
  setPts(getPts()+n);
  showPtToast('+'+n+' ⭐');
}
function showPtToast(msg){
  let t=document.getElementById('pt-toast');
  if(!t){
    t=document.createElement('div');
    t.id='pt-toast';
    t.style.cssText='position:fixed;top:80px;right:16px;background:#ffd700;color:#1a0a2e;'+
      'padding:8px 18px;border-radius:999px;font-weight:800;font-size:14px;'+
      'z-index:9999;pointer-events:none;transition:opacity 0.4s;';
    document.body.appendChild(t);
  }
  t.textContent=msg;
  t.style.opacity='1';
  clearTimeout(t._tid);
  t._tid=setTimeout(()=>{ t.style.opacity='0'; },1200);
}

// Shop에서 구매한 Undo/Shuffle 로드
function loadShopItems(){
  const su=parseInt(localStorage.getItem('ppm_undo')||'0');
  const ss=parseInt(localStorage.getItem('ppm_shuffle')||'0');
  if(su>0){ undo+=su; localStorage.removeItem('ppm_undo'); }
  if(ss>0){ shuf+=ss; localStorage.removeItem('ppm_shuffle'); }
}

// ── 유틸 ──
function shuffle(a){
  const b=[...a];
  for(let i=b.length-1;i>0;i--){
    const j=0|Math.random()*(i+1);
    [b[i],b[j]]=[b[j],b[i]];
  }
  return b;
}

// ── 풀 생성 ──
function makePool(){
  // 앞 42장: 3장씩 묶음 유지 (shuffle 없음 → 맨위 레이어에 매치 쉬운 카드)
  // 뒤 84장: 완전 랜덤
  const front=[];
  const picked=shuffle([...CARDS]); // 14종 순서만 섞음
  picked.forEach(c=>{ front.push(c,c,c); }); // 각 3장 묶음
  const back=[];
  for(let r=0;r<6;r++) CARDS.forEach(c=>back.push(c));
  return [...front, ...shuffle(back)];
}

function makeLv1Pool(){
  const picked=shuffle([...CARDS]).slice(0,3);
  const pool=[];
  for(let i=0;i<3;i++) for(let j=0;j<3;j++) pool.push(picked[i]);
  return shuffle(pool);
}

// ── Lv1 보드 ──
function buildLv1(){
  const cols=3, rows=3;
  const gapX=CW+4;
  const gapY=CH-20;
  const totalW=(cols-1)*gapX+CW;
  const totalH=(rows-1)*gapY+CH;
  const ox=Math.round((BW-totalW)/2);
  const oy=Math.round((BH-totalH)/2)-20;
  const result=[];
  for(let r=0;r<rows;r++)
    for(let c=0;c<cols;c++)
      result.push({x:ox+c*gapX, y:oy+r*gapY, layer:r});
  return result;
}

// ── Lv2~10 보드 ──
function buildBoard(count, layers){
  const allTiles=[];
  const layerCounts=[];
  let remaining=count;
  for(let L=0;L<layers;L++){
    const ratio=(layers-L)/layers;
    const c=L===layers-1 ? remaining : Math.round(count*ratio/layers);
    const actual=Math.min(c, remaining);
    layerCounts.push(actual);
    remaining-=actual;
  }
  if(remaining>0) layerCounts[0]+=remaining;

  const baseCols=Math.ceil(Math.sqrt(layerCounts[0]*1.3));
  const baseRows=Math.ceil(layerCounts[0]/baseCols);
  const totalW=(baseCols-1)*STEP+CW;
  const totalH=(baseRows-1)*STEP+CH;
  const baseOx=Math.round((BW-totalW)/2);
  const baseOy=Math.round((BH-totalH)/2);

  const baseSlots=[];
  for(let r=0;r<baseRows;r++)
    for(let c=0;c<baseCols;c++)
      baseSlots.push({x:baseOx+c*STEP, y:baseOy+r*STEP});

  const shuffledBase=shuffle(baseSlots).slice(0,layerCounts[0]);
  shuffledBase.forEach(s=>allTiles.push({x:s.x,y:s.y,layer:0}));

  for(let L=1;L<layers;L++){
    const thisCount=layerCounts[L];
    if(thisCount<=0) continue;
    const prevTiles=allTiles.filter(t=>t.layer===L-1);
    if(!prevTiles.length) continue;
    const minX=Math.min(...prevTiles.map(t=>t.x));
    const maxX=Math.max(...prevTiles.map(t=>t.x));
    const minY=Math.min(...prevTiles.map(t=>t.y));
    const maxY=Math.max(...prevTiles.map(t=>t.y));
    const layerSlots=[];
    for(let y=minY;y<=maxY;y+=STEP)
      for(let x=minX;x<=maxX;x+=STEP)
        layerSlots.push({x,y});
    const offset=STEP/2;
    const placed=shuffle(layerSlots).slice(0,thisCount);
    placed.forEach(s=>{
      let nx=s.x+offset, ny=s.y+offset;
      nx=Math.max(0,Math.min(BW-CW,nx));
      ny=Math.max(0,Math.min(BH-CH,ny));
      allTiles.push({x:nx,y:ny,layer:L});
    });
  }

  while(allTiles.length<count){
    const base=allTiles[0|Math.random()*allTiles.length];
    const L=base.layer+1;
    const d=[[STEP,0],[-STEP,0],[0,STEP],[0,-STEP]][0|Math.random()*4];
    const nx=Math.max(0,Math.min(BW-CW,base.x+d[0]));
    const ny=Math.max(0,Math.min(BH-CH,base.y+d[1]));
    allTiles.push({x:nx,y:ny,layer:L});
  }

  allTiles.sort((a,b)=>a.layer-b.layer);
  return allTiles;
}

// ── 겹침판정 ──
function checkShading(){
  for(let i=0;i<tiles.length;i++){
    const c=tiles[i];
    if(c.removed){c.blocked=false;c.coverage=0;continue;}
    c.blocked=false; c.coverage=0;
    for(let j=i+1;j<tiles.length;j++){
      const o=tiles[j];
      if(o.removed) continue;
      let covered=0;
      const quads=[
        {x:c.x,      y:c.y},
        {x:c.x+STEP, y:c.y},
        {x:c.x,      y:c.y+STEP},
        {x:c.x+STEP, y:c.y+STEP},
      ];
      quads.forEach(q=>{
        if(q.x<o.x+CW&&q.x+STEP>o.x&&q.y<o.y+CH&&q.y+STEP>o.y) covered++;
      });
      if(covered>0){
        c.coverage=Math.max(c.coverage,Math.min(covered,3));
        c.blocked=true;
        break;
      }
    }
  }
}

// ── 덱 배분 ──
function assignDecks(pool, offset, deckMode){
  deckTL=[]; deckBL=[]; deckTR=[]; deckBR=[]; deckBC=[];
  let idx=offset;
  if(deckMode===5){
    for(let i=0;i<6;i++) deckTL.push(pool[idx++]);
    for(let i=0;i<6;i++) deckTR.push(pool[idx++]);
  } else if(deckMode===4){
    for(let i=0;i<10;i++) deckTL.push(pool[idx++]);
    for(let i=0;i<4;i++)  deckBL.push(pool[idx++]);
    for(let i=0;i<10;i++) deckTR.push(pool[idx++]);
    for(let i=0;i<4;i++)  deckBR.push(pool[idx++]);
  } else if(deckMode===3){
    for(let i=0;i<10;i++) deckTL.push(pool[idx++]);
    for(let i=0;i<10;i++) deckTR.push(pool[idx++]);
    for(let i=0;i<8;i++)  deckBC.push(pool[idx++]);
  } else if(deckMode===2){
    for(let i=0;i<14;i++) deckTL.push(pool[idx++]);
    for(let i=0;i<14;i++) deckTR.push(pool[idx++]);
  }
}

// ── 스테이지 빌드 ──
function buildStage(){
  const lv=LEVELS[Math.min(stage-1,LEVELS.length-1)];
  const isLv1=lv.boardCount===9;
  const pool=isLv1 ? makeLv1Pool() : makePool();
  tiles=[];
  const positions=isLv1 ? buildLv1() : buildBoard(lv.boardCount, lv.layers);
  // positions: layer 오름차순 (0=바닥, 마지막=맨위)
  // 맨 위 layer 타일(마지막 9개)에 3종x3장 고정 배치
  const topCount=Math.min(9, positions.length);
  const topStart=positions.length-topCount;
  const topCards=[];
  const picked3=shuffle([...CARDS]).slice(0,3);
  picked3.forEach(c=>{ topCards.push(c,c,c); });
  const topShuffled=shuffle(topCards);
  const restPool=shuffle(pool.slice(0));
  for(let i=0;i<lv.boardCount;i++){
    const isTop=i>=topStart;
    const card=isTop ? topShuffled[i-topStart] : restPool[i];
    tiles.push({
      id:i, card:card,
      x:positions[i].x, y:positions[i].y,
      layer:positions[i].layer,
      removed:false, blocked:false, coverage:0
    });
  }
  assignDecks(pool, lv.boardCount, lv.deckMode);
  checkShading();
  if(!isLv1) guaranteeMatch();
}

// 클릭 가능한 카드 중 같은 종류 3장 보장
function guaranteeMatch(){
  const free=tiles.filter(t=>!t.removed&&!t.blocked);
  if(free.length<3) return;
  // 클릭 가능한 카드 중 10쌍(30장) 강제 매치 보장
  const pairs=Math.min(12, Math.floor(free.length/3));
  const cardTypes=[];
  for(let i=0;i<pairs;i++) cardTypes.push(CARDS[i%CARDS.length]);
  let idx=0;
  for(let p=0;p<pairs;p++){
    if(idx+2>=free.length) break;
    free[idx].card=cardTypes[p];
    free[idx+1].card=cardTypes[p];
    free[idx+2].card=cardTypes[p];
    idx+=3;
  }
}

// ── 렌더링 ──
function render(){
  const bd=document.getElementById('board-inner');
  bd.innerHTML='';
  tiles.filter(t=>!t.removed).forEach((t,ai)=>{
    const el=document.createElement('div');
    el.style.cssText=
      `position:absolute;left:${t.x}px;top:${t.y}px;`+
      `width:${CW}px;height:${CH}px;border-radius:8px;`+
      `overflow:hidden;z-index:${(t.layer+1)*100+ai};`;
    const img=document.createElement('img');
    img.src=CP+t.card+'.png';
    img.style.cssText='width:100%;height:100%;object-fit:cover;display:block;';
    el.appendChild(img);
    if(t.blocked){
      const alpha=[0,0.35,0.48,0.58][t.coverage]||0.48;
      const ov=document.createElement('div');
      ov.style.cssText=
        `position:absolute;inset:0;background:rgba(10,5,25,${alpha});`+
        `border-radius:8px;pointer-events:none;`;
      el.appendChild(ov);
      el.style.pointerEvents='none';
      el.style.border='1px solid rgba(120,100,160,0.3)';
    } else {
      el.style.border='2.5px solid gold';
      el.style.cursor='pointer';
      el.style.boxShadow='0 0 10px rgba(255,215,0,0.5)';
      el.onclick=()=>clickTile(t);
    }
    bd.appendChild(el);
  });
  renderDecks();
  renderSlots();
  renderUI();
}

// ── 덱 렌더링 ──
function makeDeckEl(deck, onclick){
  if(!deck.length) return null;
  const wrap=document.createElement('div');
  wrap.style.cssText='position:relative;width:62px;height:82px;cursor:pointer;';
  wrap.onclick=onclick;
  const showCount=Math.min(6,deck.length);
  for(let i=showCount-1;i>=0;i--){
    const back=document.createElement('div');
    back.style.cssText=
      `position:absolute;left:${i*2}px;top:${i*2}px;`+
      `width:56px;height:74px;background:rgba(80,80,80,.85);`+
      `border:1px solid rgba(255,255,255,.2);border-radius:6px;`;
    wrap.appendChild(back);
  }
  const off=(showCount-1)*2;
  const front=document.createElement('div');
  front.style.cssText=
    `position:absolute;left:${off}px;top:${off}px;`+
    `width:56px;height:74px;border-radius:6px;overflow:hidden;`+
    `z-index:20;border:2px solid gold;box-shadow:0 0 6px rgba(255,215,0,0.4);`;
  const img=document.createElement('img');
  img.src=CP+deck[deck.length-1]+'.png';
  img.style.cssText='width:100%;height:100%;object-fit:cover;';
  front.appendChild(img);
  wrap.appendChild(front);
  const cnt=document.createElement('div');
  cnt.textContent=deck.length;
  cnt.style.cssText=
    'position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);'+
    'font-size:10px;font-weight:800;color:gold;';
  wrap.appendChild(cnt);
  return wrap;
}

function renderDecks(){
  const ld=document.getElementById('left-deck');
  const rd=document.getElementById('right-deck');
  ld.innerHTML=''; rd.innerHTML='';
  const lv=LEVELS[Math.min(stage-1,LEVELS.length-1)];
  if(lv.deckMode===0) return;
  const leftWrap=document.createElement('div');
  leftWrap.style.cssText='display:flex;flex-direction:column;gap:16px;align-items:center;';
  if(deckTL.length){const el=makeDeckEl(deckTL,()=>drawDeck('TL'));if(el)leftWrap.appendChild(el);}
  if(deckBL.length){const el=makeDeckEl(deckBL,()=>drawDeck('BL'));if(el)leftWrap.appendChild(el);}
  ld.appendChild(leftWrap);
  const rightWrap=document.createElement('div');
  rightWrap.style.cssText='display:flex;flex-direction:column;gap:16px;align-items:center;';
  if(deckTR.length){const el=makeDeckEl(deckTR,()=>drawDeck('TR'));if(el)rightWrap.appendChild(el);}
  if(deckBR.length){const el=makeDeckEl(deckBR,()=>drawDeck('BR'));if(el)rightWrap.appendChild(el);}
  rd.appendChild(rightWrap);
}

function drawDeck(which){
  if(!on) return;
  const map={TL:deckTL,BL:deckBL,TR:deckTR,BR:deckBR,BC:deckBC};
  const deck=map[which];
  if(!deck||!deck.length) return;
  if(slots.length>=SM){on=false;showResult(false);return;}
  saveHist();
  slots.push(deck.pop());
  addPts(10);
  while(checkMatch());
  render();
  if(slots.length>=SM){on=false;showResult(false);}
}

function renderSlots(){
  const bar=document.getElementById('slot-bar');
  bar.innerHTML='';
  for(let i=0;i<SM;i++){
    const d=document.createElement('div');
    d.style.cssText=
      `width:40px;height:40px;border:2px dashed ${slots[i]?'gold':'#555'};`+
      `border-radius:6px;display:flex;align-items:center;`+
      `justify-content:center;background:rgba(30,15,50,.5);`;
    if(slots[i]){
      const m=document.createElement('img');
      m.src=CP+slots[i]+'.png';
      m.style.cssText='width:34px;height:34px;object-fit:cover;border-radius:4px;';
      d.appendChild(m);
    }
    bar.appendChild(d);
  }
  document.getElementById('slot-count').textContent=slots.length+'/'+SM;
}

function renderUI(){
  document.getElementById('score').textContent='★ '+score.toLocaleString();
  document.getElementById('stage-label').textContent='Stage '+stage;
  const allEmpty=!deckTL.length&&!deckBL.length&&!deckTR.length&&!deckBR.length&&!deckBC.length;
  if(!tiles.filter(t=>!t.removed).length&&allEmpty&&!slots.length) win();
}

function checkMatch(){
  const m={};
  slots.forEach((c,i)=>{(m[c]=m[c]||[]).push(i);});
  for(const idx of Object.values(m)){
    if(idx.length>=3){
      const rm=new Set(idx.slice(0,3));
      slots=slots.filter((_,i)=>!rm.has(i));
      score+=300;
      addPts(300);
      return true;
    }
  }
  return false;
}

function saveHist(){
  hist.push({
    tiles:tiles.map(x=>({id:x.id,removed:x.removed})),
    slots:[...slots],
    deckTL:[...deckTL],deckBL:[...deckBL],
    deckTR:[...deckTR],deckBR:[...deckBR],deckBC:[...deckBC],
    score
  });
}

function clickTile(t){
  if(!on||t.removed||t.blocked) return;
  if(slots.length>=SM){on=false;showResult(false);return;}
  saveHist();
  t.removed=true;
  slots.push(t.card);
  addPts(10);
  checkShading();
  while(checkMatch());
  render();
  if(slots.length>=SM){on=false;showResult(false);}
}

function doUndo(){
  if(!on||!undo||!hist.length) return;
  const s=hist.pop();
  s.tiles.forEach(ts=>{
    const t=tiles.find(x=>x.id===ts.id);
    if(t) t.removed=ts.removed;
  });
  slots=[...s.slots];
  deckTL=[...s.deckTL]; deckBL=[...s.deckBL];
  deckTR=[...s.deckTR]; deckBR=[...s.deckBR]; deckBC=[...s.deckBC];
  score=s.score;
  undo--;
  document.getElementById('undo-badge').textContent=undo;
  checkShading();
  render();
}

function doShuffle(){
  if(!on||!shuf) return;
  shuf--;
  document.getElementById('shuf-badge').textContent=shuf;
  const alive=tiles.filter(t=>!t.removed);
  const all=[...alive.map(t=>t.card),...deckTL,...deckBL,...deckTR,...deckBR,...deckBC];
  const shuffled=shuffle(all);
  let idx=0;
  alive.forEach(t=>{t.card=shuffled[idx++];});
  const tl=deckTL.length,bl=deckBL.length,tr=deckTR.length,br=deckBR.length,bc=deckBC.length;
  deckTL=shuffled.slice(idx,idx+tl); idx+=tl;
  deckBL=shuffled.slice(idx,idx+bl); idx+=bl;
  deckTR=shuffled.slice(idx,idx+tr); idx+=tr;
  deckBR=shuffled.slice(idx,idx+br); idx+=br;
  deckBC=shuffled.slice(idx,idx+bc);
  checkShading();
  render();
}

function doWithdraw(){}

function showResult(isWin){
  const ov=document.getElementById('overlay');
  ov.style.display='flex';
  if(isWin&&stage<10){
    ov.innerHTML=`<div class="result-box win">
      <h2>🎉 STAGE ${stage} CLEAR!</h2>
      <p>Score: ${score.toLocaleString()}</p>
      <button onclick="nextStage()">Next Stage →</button>
      <button onclick="window.location.href='index.html'">Home</button>
    </div>`;
  } else if(isWin){
    ov.innerHTML=`<div class="result-box win">
      <h2>🏆 ALL CLEAR!</h2>
      <p>Final Score: ${score.toLocaleString()}</p>
      <button onclick="restartGame()">Play Again</button>
      <button onclick="window.location.href='index.html'">Home</button>
    </div>`;
  } else if(stage>=5&&!adUsed){
    ov.innerHTML=`<div class="result-box lose">
      <h2>😿 SLOTS FULL!</h2>
      <p>Watch ad for +3 slots?</p>
      <button onclick="watchAd()">📺 Watch Ad</button>
      <button onclick="retryStage()">Try Again</button>
    </div>`;
  } else {
    ov.innerHTML=`<div class="result-box lose">
      <h2>😿 TOO BAD</h2>
      <p>Stage ${stage} — Slots are full!</p>
      <button onclick="retryStage()">Try Again</button>
      <button onclick="window.location.href='index.html'">Home</button>
    </div>`;
  }
}

function watchAd(){
  const ov=document.getElementById('overlay');
  let n=5;
  ov.innerHTML=`<div class="result-box">
    <h2>📺 Ad Playing...</h2>
    <p id="ad-count" style="font-size:48px;font-weight:800;color:var(--gold)">${n}</p>
    <p style="font-size:12px;color:rgba(205,189,255,.5)">Please wait</p>
  </div>`;
  const t=setInterval(()=>{
    n--;
    const el=document.getElementById('ad-count');
    if(el) el.textContent=n;
    if(n<=0){
      clearInterval(t);
      SM=10;adUsed=true;on=true;
      ov.style.display='none';
      render();
    }
  },1000);
}

function win(){on=false;showResult(true);}

function _reset(keepStage){
  document.getElementById('overlay').style.display='none';
  if(!keepStage){stage=1;score=0;}
  tiles=[];slots=[];hist=[];
  undo=2;shuf=1;on=true;SM=7;adUsed=false;
  deckTL=[];deckBL=[];deckTR=[];deckBR=[];deckBC=[];
  loadShopItems();
  document.getElementById('undo-badge').textContent=undo;
  document.getElementById('shuf-badge').textContent=shuf;
  buildStage();render();
}

function nextStage(){stage++;_reset(true);}
function retryStage(){_reset(true);}
function restartGame(){_reset(false);}

window.addEventListener('load',()=>{loadShopItems();buildStage();on=true;render();});
window.doUndo=doUndo;
window.doShuffle=doShuffle;
window.doWithdraw=doWithdraw;
window.nextStage=nextStage;
window.retryStage=retryStage;
window.restartGame=restartGame;
window.watchAd=watchAd;
