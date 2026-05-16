// Perfect Paw Match — 이미지 6장 기준 완전 재작성
// 카드풀: 14종 × 6배 = 126장 (3배수)
// Lv1: 보드 18장, 덱 없음 (전부 100% 오픈, 겹침 최소)
// Lv2~10: 보드 98장 + 양쪽덱 각 14장 = 126장
// 보드: 50% 겹침 격자 (STEP=36px), 9열×11행=99슬롯
// 겹침판정: 4분할(2×2) 기준 각 25%, 최대 75%까지만 가림
// 100% 오픈 카드만 밝게+gold테두리+클릭가능
// 슬롯 7칸, 3매치 자동 제거
// 셔플: 보드전체+가려진카드+덱 전부 포함

const CARDS=[
  'amethyst-heart','celestial-potion','crystal-ball','fuchsia-ribbon',
  'golden-paw','indigo-bowtie','jeweled-key','mistic-yarn',
  'rose-pufferfish','royal-cat-bed','sapphire-paw','silver-bag',
  'starry-mic','turquoise-cushion'
];
const CP='asset/cards/', CW=72, CH=72, STEP=36;
const BW=360, BH=460;

// 레벨 설정
const LEVELS=[
  {hasDeck:false, boardCount:18,  layers:1}, // Lv1
  {hasDeck:true,  boardCount:42,  layers:2}, // Lv2
  {hasDeck:true,  boardCount:54,  layers:2}, // Lv3
  {hasDeck:true,  boardCount:63,  layers:3}, // Lv4
  {hasDeck:true,  boardCount:72,  layers:3}, // Lv5
  {hasDeck:true,  boardCount:81,  layers:3}, // Lv6
  {hasDeck:true,  boardCount:84,  layers:4}, // Lv7
  {hasDeck:true,  boardCount:90,  layers:4}, // Lv8
  {hasDeck:true,  boardCount:96,  layers:5}, // Lv9
  {hasDeck:true,  boardCount:96,  layers:6}, // Lv10 보스
];

let tiles=[], slots=[], hist=[],
    undo=2, shuf=1, score=0, on=false, stage=1,
    SM=7, adUsed=false,
    leftDeck=[], rightDeck=[];

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

// 50% 겹침 격자 슬롯 99개 생성
function makeGridSlots(){
  const totalH=(11-1)*STEP+CH; // 432px
  const oy=Math.round((BH-totalH)/2); // 14px 상하여백
  const slots=[];
  for(let r=0;r<11;r++)
    for(let c=0;c<9;c++)
      slots.push({x:c*STEP, y:oy+r*STEP});
  return slots;
}

// 보드 배치: count장을 layers층으로 중앙 밀집 배치
function buildBoard(count, layers){
  const gridSlots=makeGridSlots();
  const cx=BW/2, cy=BH/2;
  // 중앙 가까운 순 정렬
  const sorted=[...gridSlots].sort((a,b)=>
    Math.hypot(a.x+CW/2-cx,a.y+CH/2-cy)-Math.hypot(b.x+CW/2-cx,b.y+CH/2-cy)
  );

  const allTiles=[];
  const layer0Count=Math.ceil(count/layers);
  // 1층: 중앙 밀집 슬롯 셔플해서 배치
  const base0=shuffle(sorted.slice(0, Math.min(layer0Count, sorted.length)));
  base0.forEach(s=>allTiles.push({x:s.x, y:s.y, layer:0}));

  // 2층~: 아래층 카드 위에 STEP 오프셋으로 쌓기
  const dirs=[
    [STEP,0],[-STEP,0],[0,STEP],[0,-STEP],
    [STEP,STEP],[-STEP,STEP],[STEP,-STEP],[-STEP,-STEP]
  ];
  for(let L=1; L<layers; L++){
    const remaining=count-allTiles.length;
    if(remaining<=0) break;
    const thisCount=Math.min(Math.ceil(count/layers), remaining);
    const prevLayer=shuffle(allTiles.filter(t=>t.layer===L-1));
    for(let i=0; i<thisCount; i++){
      const base=prevLayer[i%prevLayer.length];
      let placed=false;
      const triedDirs=shuffle(dirs);
      for(const d of triedDirs){
        const nx=Math.max(0,Math.min(BW-CW, Math.round((base.x+d[0])/STEP)*STEP));
        const ny=Math.max(0,Math.min(BH-CH, Math.round((base.y+d[1])/STEP)*STEP));
        const dup=allTiles.some(t=>t.layer===L&&t.x===nx&&t.y===ny);
        if(!dup){
          allTiles.push({x:nx, y:ny, layer:L});
          placed=true;
          break;
        }
      }
      if(!placed) allTiles.push({x:base.x, y:base.y, layer:L});
    }
  }

  allTiles.sort((a,b)=>a.layer-b.layer);
  return allTiles;
}

// 겹침판정: 4분할(2×2), 최대 75% 가림
function checkShading(){
  for(let i=0;i<tiles.length;i++){
    const c=tiles[i];
    if(c.removed){c.blocked=false;c.coverage=0;continue;}
    c.blocked=false;
    c.coverage=0;
    for(let j=i+1;j<tiles.length;j++){
      const o=tiles[j];
      if(o.removed) continue;
      // c카드의 4사각형 중 o카드가 덮는 수
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
        c.coverage=Math.max(c.coverage, Math.min(covered,3)); // 최대 3(75%)
        c.blocked=true;
        break;
      }
    }
  }
}

function buildStage(){
  const lv=LEVELS[Math.min(stage-1,LEVELS.length-1)];
  const pool=makePool();
  tiles=[]; leftDeck=[]; rightDeck=[];
  const boardCount=lv.boardCount;
  const deckEach=lv.hasDeck?14:0;
  const positions=buildBoard(boardCount, lv.layers);
  for(let i=0;i<boardCount;i++){
    tiles.push({
      id:i, card:pool[i],
      x:positions[i].x, y:positions[i].y,
      removed:false, blocked:false, coverage:0
    });
  }
  if(lv.hasDeck){
    for(let i=0;i<deckEach;i++) leftDeck.push(pool[boardCount+i]);
    for(let i=0;i<deckEach;i++) rightDeck.push(pool[boardCount+deckEach+i]);
  }
  checkShading();
}

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
      // coverage 1=25% 2=50% 3=75% 어둡기
      const alpha=[0,0.35,0.48,0.58][t.coverage]||0.48;
      const ov=document.createElement('div');
      ov.style.cssText=
        `position:absolute;inset:0;background:rgba(10,5,25,${alpha});`+
        `border-radius:8px;pointer-events:none;`;
      el.appendChild(ov);
      el.style.pointerEvents='none';
      el.style.cursor='not-allowed';
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

function renderOneDeck(elId, deck, side){
  const el=document.getElementById(elId);
  el.innerHTML='';
  if(!deck.length) return;
  const wrap=document.createElement('div');
  wrap.style.cssText='position:relative;width:64px;height:100px;cursor:pointer;';
  wrap.onclick=()=>drawDeck(side);
  const showCount=Math.min(5,deck.length);
  for(let i=showCount-1;i>=0;i--){
    const back=document.createElement('div');
    back.style.cssText=
      `position:absolute;left:${i*2}px;top:${i*2}px;`+
      `width:58px;height:78px;background:rgba(50,34,71,.95);`+
      `border:1.5px solid rgba(255,215,0,.4);border-radius:6px;`;
    wrap.appendChild(back);
  }
  const off=(showCount-1)*2;
  const front=document.createElement('div');
  front.style.cssText=
    `position:absolute;left:${off}px;top:${off}px;`+
    `width:58px;height:78px;border-radius:6px;overflow:hidden;`+
    `z-index:20;border:2px solid gold;box-shadow:0 0 8px rgba(255,215,0,0.4);`;
  const img=document.createElement('img');
  img.src=CP+deck[deck.length-1]+'.png';
  img.style.cssText='width:100%;height:100%;object-fit:cover;';
  front.appendChild(img);
  wrap.appendChild(front);
  const cnt=document.createElement('div');
  cnt.textContent=deck.length;
  cnt.style.cssText=
    'position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);'+
    'font-size:11px;font-weight:800;color:gold;';
  wrap.appendChild(cnt);
  el.appendChild(wrap);
}

function renderDecks(){
  renderOneDeck('left-deck',leftDeck,'left');
  renderOneDeck('right-deck',rightDeck,'right');
}

function drawDeck(side){
  if(!on) return;
  const deck=side==='left'?leftDeck:rightDeck;
  if(!deck.length) return;
  if(slots.length>=SM){on=false;showResult(false);return;}
  saveHist();
  slots.push(deck.pop());
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
  if(!tiles.filter(t=>!t.removed).length&&
     !leftDeck.length&&!rightDeck.length&&!slots.length) win();
}

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
    leftDeck:[...leftDeck],
    rightDeck:[...rightDeck],
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
  leftDeck=[...s.leftDeck];
  rightDeck=[...s.rightDeck];
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
  const all=[...alive.map(t=>t.card),...leftDeck,...rightDeck];
  const shuffled=shuffle(all);
  let idx=0;
  alive.forEach(t=>{t.card=shuffled[idx++];});
  const ld=leftDeck.length, rd=rightDeck.length;
  leftDeck=shuffled.slice(idx,idx+ld);
  idx+=ld;
  rightDeck=shuffled.slice(idx,idx+rd);
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
  leftDeck=[];rightDeck=[];
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
