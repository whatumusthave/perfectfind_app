// Perfect Paw Match — 전체 규칙 완전 반영판
// 카드풀: 14종 × 6배 = 126장 (3배수)
// Lv1: 보드 18장, 덱 없음, 겹침 최소 (튜토리얼)
// Lv2~10: 보드 98장 + 양쪽 덱 4군데 (좌상/좌하/우상/우하) 각 7장씩 = 총 28장
// 보드: STEP=36px 격자, 중앙 밀집, 레이어별 겹쳐 쌓기
// 겹침판정: 4분할(2×2) 기준 25%단위, 최대 75%까지만 가림
// 100% 오픈 카드만 밝게+gold테두리+클릭가능
// 그림자 카드: 어둡게, 카드 종류 보임, 클릭 불가
// 슬롯 7칸, 3매치 자동 제거
// 5단계부터 슬롯 풀 시 광고 → +3칸
// undo 2번, 셔플 1번 (보드+덱+가려진카드 전부)

const CARDS=[
  'amethyst-heart','celestial-potion','crystal-ball','fuchsia-ribbon',
  'golden-paw','indigo-bowtie','jeweled-key','mistic-yarn',
  'rose-pufferfish','royal-cat-bed','sapphire-paw','silver-bag',
  'starry-mic','turquoise-cushion'
];
const CP='asset/cards/', CW=72, CH=72, STEP=36;
const BW=360, BH=460;

// 레벨 설정
// deckCount: 덱 4군데 각 장수 (총 deckCount×4장)
// boardCount + deckCount×4 = 126 (3배수)
const LEVELS=[
  {boardCount:18, deckCount:0,  layers:1}, // Lv1: 튜토리얼, 덱없음
  {boardCount:98, deckCount:7,  layers:2}, // Lv2
  {boardCount:98, deckCount:7,  layers:2}, // Lv3
  {boardCount:98, deckCount:7,  layers:3}, // Lv4
  {boardCount:98, deckCount:7,  layers:3}, // Lv5
  {boardCount:98, deckCount:7,  layers:4}, // Lv6
  {boardCount:98, deckCount:7,  layers:4}, // Lv7
  {boardCount:98, deckCount:7,  layers:5}, // Lv8
  {boardCount:98, deckCount:7,  layers:5}, // Lv9
  {boardCount:98, deckCount:7,  layers:6}, // Lv10 보스
];
// 98 + 7×4 = 126 ✓

let tiles=[], slots=[], hist=[],
    undo=2, shuf=1, score=0, on=false, stage=1,
    SM=7, adUsed=false,
    deckTL=[], deckBL=[], deckTR=[], deckBR=[];

function makePool(){
  const pool=[];
  for(let r=0;r<6;r++) CARDS.forEach(c=>pool.push(c));
  return shuffle(pool);
}

function shuffle(a){
  const b=[...a];
  for(let i=b.length-1;i>0;i--){
    const j=0|Math.random()*(i+1);
    [b[i],b[j]]=[b[j],b[i]];
  }
  return b;
}

// ── Lv1 전용: 3×3 격자 살짝 겹침 ──
function buildLv1(){
  // 3행×3열, 행간격=CH-18(살짝겹침), 열간격=CW+4
  const cols=3, rows=3;
  const gapX=CW+4, gapY=CH-16;
  const totalW=(cols-1)*gapX+CW;
  const totalH=(rows-1)*gapY+CH;
  const ox=Math.round((BW-totalW)/2);
  const oy=Math.round((BH-totalH)/2)-20;
  const result=[];
  for(let r=0;r<rows;r++)
    for(let c=0;c<cols;c++)
      result.push({x:ox+c*gapX, y:oy+r*gapY, layer:r}); // 아래행이 위행 위에
  return result;
}

// ── 50% 겹침 격자 슬롯 생성 (9×11=99슬롯) ──
function makeGridSlots(){
  const totalH=(11-1)*STEP+CH;
  const oy=Math.round((BH-totalH)/2);
  const slots=[];
  for(let r=0;r<11;r++)
    for(let c=0;c<9;c++)
      slots.push({x:c*STEP, y:oy+r*STEP});
  return slots;
}

// ── 보드 배치: 중앙 밀집, layers층 쌓기 ──
function buildBoard(count, layers){
  const gridSlots=makeGridSlots();
  const cx=BW/2, cy=BH/2;
  const sorted=[...gridSlots].sort((a,b)=>
    Math.hypot(a.x+CW/2-cx,a.y+CH/2-cy)-Math.hypot(b.x+CW/2-cx,b.y+CH/2-cy)
  );

  const allTiles=[];
  const perLayer=Math.ceil(count/layers);

  // 1층: 중앙 밀집 슬롯
  const base0=shuffle(sorted.slice(0, Math.min(perLayer, sorted.length)));
  base0.forEach(s=>allTiles.push({x:s.x, y:s.y, layer:0}));

  // 2층~: 아래층 위에 STEP 오프셋으로 쌓기
  const dirs=[
    [STEP,0],[-STEP,0],[0,STEP],[0,-STEP],
    [STEP,STEP],[-STEP,STEP],[STEP,-STEP],[-STEP,-STEP]
  ];
  for(let L=1;L<layers;L++){
    const remaining=count-allTiles.length;
    if(remaining<=0) break;
    const thisCount=Math.min(perLayer, remaining);
    const prevLayer=shuffle(allTiles.filter(t=>t.layer===L-1));
    for(let i=0;i<thisCount;i++){
      const base=prevLayer[i%prevLayer.length];
      let placed=false;
      const triedDirs=shuffle(dirs);
      for(const d of triedDirs){
        const nx=Math.max(0,Math.min(BW-CW,Math.round((base.x+d[0])/STEP)*STEP));
        const ny=Math.max(0,Math.min(BH-CH,Math.round((base.y+d[1])/STEP)*STEP));
        const dup=allTiles.some(t=>t.layer===L&&t.x===nx&&t.y===ny);
        if(!dup){allTiles.push({x:nx,y:ny,layer:L});placed=true;break;}
      }
      if(!placed) allTiles.push({x:base.x,y:base.y,layer:L});
    }
  }
  allTiles.sort((a,b)=>a.layer-b.layer);
  return allTiles;
}

// ── 겹침판정: 4분할(2×2), 최대 75% ──
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

// ── 스테이지 빌드 ──
function buildStage(){
  const lv=LEVELS[Math.min(stage-1,LEVELS.length-1)];
  const pool=makePool();
  tiles=[]; deckTL=[]; deckBL=[]; deckTR=[]; deckBR=[];

  const positions=lv.layers===1&&lv.boardCount===18
    ? buildLv1()
    : buildBoard(lv.boardCount, lv.layers);

  for(let i=0;i<lv.boardCount;i++){
    tiles.push({
      id:i, card:pool[i],
      x:positions[i].x, y:positions[i].y,
      removed:false, blocked:false, coverage:0
    });
  }

  // 덱 4군데: TL, BL, TR, BR 각 deckCount장
  const dc=lv.deckCount;
  if(dc>0){
    let idx=lv.boardCount;
    for(let i=0;i<dc;i++) deckTL.push(pool[idx++]);
    for(let i=0;i<dc;i++) deckBL.push(pool[idx++]);
    for(let i=0;i<dc;i++) deckTR.push(pool[idx++]);
    for(let i=0;i<dc;i++) deckBR.push(pool[idx++]);
  }
  checkShading();
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

// ── 덱 1개 렌더링 ──
function renderDeck(deck, onclick){
  const wrap=document.createElement('div');
  wrap.style.cssText='position:relative;width:62px;height:82px;cursor:pointer;flex-shrink:0;';
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
  // 맨앞장 100% 오픈
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

// ── 양쪽 덱 영역 렌더링 ──
// 좌: left-deck (위아래 2개), 우: right-deck (위아래 2개)
function renderDecks(){
  const ld=document.getElementById('left-deck');
  const rd=document.getElementById('right-deck');
  ld.innerHTML=''; rd.innerHTML='';

  if(!deckTL.length&&!deckBL.length&&!deckTR.length&&!deckBR.length) return;

  // 왼쪽: TL(위), BL(아래) 세로 배치
  const leftWrap=document.createElement('div');
  leftWrap.style.cssText='display:flex;flex-direction:column;gap:16px;align-items:center;';
  if(deckTL.length) leftWrap.appendChild(renderDeck(deckTL,()=>drawFromDeck('TL')));
  if(deckBL.length) leftWrap.appendChild(renderDeck(deckBL,()=>drawFromDeck('BL')));
  ld.appendChild(leftWrap);

  // 오른쪽: TR(위), BR(아래) 세로 배치
  const rightWrap=document.createElement('div');
  rightWrap.style.cssText='display:flex;flex-direction:column;gap:16px;align-items:center;';
  if(deckTR.length) rightWrap.appendChild(renderDeck(deckTR,()=>drawFromDeck('TR')));
  if(deckBR.length) rightWrap.appendChild(renderDeck(deckBR,()=>drawFromDeck('BR')));
  rd.appendChild(rightWrap);
}

// ── 덱에서 카드 꺼내기 ──
function drawFromDeck(which){
  if(!on) return;
  const map={TL:deckTL,BL:deckBL,TR:deckTR,BR:deckBR};
  const deck=map[which];
  if(!deck||!deck.length) return;
  if(slots.length>=SM){on=false;showResult(false);return;}
  saveHist();
  slots.push(deck.pop());
  while(checkMatch());
  render();
  if(slots.length>=SM){on=false;showResult(false);}
}

// ── 슬롯 렌더링 ──
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
  const allDecksEmpty=!deckTL.length&&!deckBL.length&&!deckTR.length&&!deckBR.length;
  if(!tiles.filter(t=>!t.removed).length&&allDecksEmpty&&!slots.length) win();
}

// ── 3매치 ──
function checkMatch(){
  const m={};
  slots.forEach((c,i)=>{(m[c]=m[c]||[]).push(i);});
  for(const idx of Object.values(m)){
    if(idx.length>=3){
      const rm=new Set(idx.slice(0,3));
      slots=slots.filter((_,i)=>!rm.has(i));
      score+=300;
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
    deckTR:[...deckTR],deckBR:[...deckBR],
    score
  });
}

function clickTile(t){
  if(!on||t.removed||t.blocked) return;
  if(slots.length>=SM){on=false;showResult(false);return;}
  saveHist();
  t.removed=true;
  slots.push(t.card);
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
  deckTR=[...s.deckTR]; deckBR=[...s.deckBR];
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
  const all=[
    ...alive.map(t=>t.card),
    ...deckTL,...deckBL,...deckTR,...deckBR
  ];
  const shuffled=shuffle(all);
  let idx=0;
  alive.forEach(t=>{t.card=shuffled[idx++];});
  const tl=deckTL.length,bl=deckBL.length,tr=deckTR.length,br=deckBR.length;
  deckTL=shuffled.slice(idx,idx+tl); idx+=tl;
  deckBL=shuffled.slice(idx,idx+bl); idx+=bl;
  deckTR=shuffled.slice(idx,idx+tr); idx+=tr;
  deckBR=shuffled.slice(idx,idx+br);
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
  deckTL=[];deckBL=[];deckTR=[];deckBR=[];
  document.getElementById('undo-badge').textContent=2;
  document.getElementById('shuf-badge').textContent=1;
  buildStage();render();
}

function nextStage(){stage++;_reset(true);}
function retryStage(){_reset(true);}
function restartGame(){_reset(false);}

window.addEventListener('load',()=>{buildStage();on=true;render();});
window.doUndo=doUndo;
window.doShuffle=doShuffle;
window.doWithdraw=doWithdraw;
window.nextStage=nextStage;
window.retryStage=retryStage;
window.restartGame=restartGame;
window.watchAd=watchAd;
