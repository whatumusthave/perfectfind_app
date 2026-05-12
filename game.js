const CARDS=['amethyst-heart','celestial-potion','crystal-ball','fuchsia-ribbon','golden-paw','indigo-bowtie','jeweled-key','mistic-yarn','rose-pufferfish','royal-cat-bed','sapphire-paw','silver-bag','starry-mic','turquoise-cushion'];
const CP='asset/cards/',CW=72,CH=72;
let tiles=[],slots=[],hist=[],undo=2,shuf=1,score=0,on=false,stage=1,SM=7,adUsed=false;
let leftDeck=[],rightDeck=[];

function sh(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=0|Math.random()*(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;}

/* ─── 레벨 설계 (외곽→중심 피라미드) ───
  Lv1: 덱 없음, 보드만 18장
  Lv2+: 양쪽 덱 각 14장 + 보드 타일
  
  보드 구조: 중앙 1칸 비움 → 주변 8장(외곽) → 위로 겹쳐 쌓임
*/
const LEVELS=[
  {total:18, kinds:6,  boardCt:18, deckCt:0 },  // Lv1
  {total:42, kinds:7,  boardCt:14, deckCt:14},  // Lv2
  {total:48, kinds:8,  boardCt:20, deckCt:14},  // Lv3
  {total:54, kinds:9,  boardCt:26, deckCt:14},  // Lv4
  {total:60, kinds:10, boardCt:32, deckCt:14},  // Lv5
  {total:66, kinds:11, boardCt:38, deckCt:14},  // Lv6
  {total:72, kinds:12, boardCt:44, deckCt:14},  // Lv7
  {total:78, kinds:13, boardCt:50, deckCt:14},  // Lv8
  {total:84, kinds:14, boardCt:56, deckCt:14},  // Lv9
  {total:84, kinds:14, boardCt:56, deckCt:14},  // Lv10
];

function checkShading(){
  for(let i=0;i<tiles.length;i++){
    const cur=tiles[i];
    if(cur.removed){cur.blocked=false;continue;}
    cur.blocked=false;
    const x1=cur.x,y1=cur.y,x2=x1+CW,y2=y1+CH;
    for(let j=i+1;j<tiles.length;j++){
      const o=tiles[j];
      if(o.removed)continue;
      if(!(o.y+CH<=y1||o.y>=y2||o.x+CW<=x1||o.x>=x2)){cur.blocked=true;break;}
    }
  }
}

// 외곽→중심 피라미드 생성 (중앙 1칸 비우고 주변 8장부터)
function makeOuterToInner(count){
  const centerX=180, centerY=230;
  const pos=[];
  
  // Layer 1: 중앙 주변 8장 (외곽)
  const ring1=[
    {x:centerX-CW-10, y:centerY-CH-10},
    {x:centerX, y:centerY-CH-10},
    {x:centerX+CW+10, y:centerY-CH-10},
    {x:centerX-CW-10, y:centerY},
    {x:centerX+CW+10, y:centerY},
    {x:centerX-CW-10, y:centerY+CH+10},
    {x:centerX, y:centerY+CH+10},
    {x:centerX+CW+10, y:centerY+CH+10},
  ];
  ring1.forEach(p=>{if(pos.length<count)pos.push(p);});
  
  // Layer 2+: 랜덤하게 외곽 위에 겹쳐 쌓기
  const remaining=count-pos.length;
  for(let i=0;i<remaining;i++){
    const baseIdx=Math.floor(Math.random()*pos.length);
    const base=pos[baseIdx];
    pos.push({
      x:base.x+Math.random()*40-20,
      y:base.y-20-Math.random()*60
    });
  }
  
  return pos;
}

function buildStage(){
  const lv=LEVELS[Math.min(stage-1, LEVELS.length-1)];
  const pool=[];
  const chosen=sh(CARDS).slice(0, lv.kinds);
  chosen.forEach(c=>{for(let i=0;i<3;i++)pool.push(c);});
  const shuffled=sh(pool);

  tiles=[];
  leftDeck=[];
  rightDeck=[];
  let idx=0;

  // 보드 타일
  const boardPos=makeOuterToInner(lv.boardCt);
  boardPos.forEach(pos=>{
    if(idx>=lv.boardCt)return;
    tiles.push({id:idx, card:shuffled[idx], x:pos.x, y:pos.y, removed:false, blocked:false});
    idx++;
  });

  // 양쪽 덱 (레벨2+)
  if(lv.deckCt>0){
    for(let i=0;i<lv.deckCt;i++){
      if(idx>=shuffled.length)break;
      leftDeck.push(shuffled[idx]);
      idx++;
    }
    for(let i=0;i<lv.deckCt;i++){
      if(idx>=shuffled.length)break;
      rightDeck.push(shuffled[idx]);
      idx++;
    }
  }

  checkShading();
}

function render(){
  const bd=document.getElementById('board-inner');
  bd.innerHTML='';
  
  // 보드 타일
  tiles.filter(t=>!t.removed).forEach((t,arrIdx)=>{
    const el=document.createElement('div');
    el.style.cssText=`position:absolute;left:${t.x}px;top:${t.y}px;width:${CW}px;height:${CH}px;border-radius:8px;overflow:hidden;z-index:${arrIdx+10};`;

    const img=document.createElement('img');
    img.src=CP+t.card+'.png';
    img.style.cssText='width:100%;height:100%;object-fit:cover;display:block;';
    el.appendChild(img);

    if(t.blocked){
      const ov=document.createElement('div');
      ov.style.cssText=`position:absolute;inset:0;background:rgba(10,5,25,0.55);border-radius:8px;z-index:${arrIdx+20};pointer-events:none;`;
      el.appendChild(ov);
      el.style.pointerEvents='none';
      el.style.cursor='not-allowed';
    } else {
      el.style.border='2.5px solid gold';
      el.style.cursor='pointer';
      el.style.boxShadow='0 0 8px rgba(255,215,0,0.4)';
      el.onclick=()=>clickTile(t);
    }
    bd.appendChild(el);
  });
  
  // 양쪽 덱 렌더링
  renderDecks();
  renderSlots();
  renderUI();
}

function renderDecks(){
  const leftEl=document.getElementById('left-deck');
  const rightEl=document.getElementById('right-deck');
  leftEl.innerHTML='';
  rightEl.innerHTML='';
  
  if(leftDeck.length>0){
    const wrap=document.createElement('div');
    wrap.style.cssText='position:relative;width:60px;height:80px;cursor:pointer;';
    wrap.onclick=()=>drawDeck('left');
    
    // 뒤집힌 카드들
    for(let i=0;i<Math.min(3,leftDeck.length);i++){
      const back=document.createElement('div');
      back.style.cssText=`position:absolute;left:${i*2}px;top:${i*2}px;width:56px;height:76px;background:rgba(50,34,71,.95);border:2px solid gold;border-radius:6px;`;
      wrap.appendChild(back);
    }
    
    // 맨 앞장 (100% 보임)
    const front=document.createElement('div');
    front.style.cssText='position:absolute;left:6px;top:6px;width:56px;height:76px;background:#fff;border-radius:6px;overflow:hidden;z-index:10;';
    const img=document.createElement('img');
    img.src=CP+leftDeck[leftDeck.length-1]+'.png';
    img.style.cssText='width:100%;height:100%;object-fit:cover;';
    front.appendChild(img);
    wrap.appendChild(front);
    
    const count=document.createElement('div');
    count.textContent=leftDeck.length;
    count.style.cssText='position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);font-size:11px;font-weight:800;color:gold;';
    wrap.appendChild(count);
    
    leftEl.appendChild(wrap);
  }
  
  if(rightDeck.length>0){
    const wrap=document.createElement('div');
    wrap.style.cssText='position:relative;width:60px;height:80px;cursor:pointer;';
    wrap.onclick=()=>drawDeck('right');
    
    for(let i=0;i<Math.min(3,rightDeck.length);i++){
      const back=document.createElement('div');
      back.style.cssText=`position:absolute;left:${i*2}px;top:${i*2}px;width:56px;height:76px;background:rgba(50,34,71,.95);border:2px solid gold;border-radius:6px;`;
      wrap.appendChild(back);
    }
    
    const front=document.createElement('div');
    front.style.cssText='position:absolute;left:6px;top:6px;width:56px;height:76px;background:#fff;border-radius:6px;overflow:hidden;z-index:10;';
    const img=document.createElement('img');
    img.src=CP+rightDeck[rightDeck.length-1]+'.png';
    img.style.cssText='width:100%;height:100%;object-fit:cover;';
    front.appendChild(img);
    wrap.appendChild(front);
    
    const count=document.createElement('div');
    count.textContent=rightDeck.length;
    count.style.cssText='position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);font-size:11px;font-weight:800;color:gold;';
    wrap.appendChild(count);
    
    rightEl.appendChild(wrap);
  }
}

function drawDeck(side){
  if(!on)return;
  const deck=side==='left'?leftDeck:rightDeck;
  if(!deck.length||slots.length>=SM)return;
  
  hist.push({
    tiles:tiles.map(x=>({id:x.id,removed:x.removed})),
    slots:[...slots],
    leftDeck:[...leftDeck],
    rightDeck:[...rightDeck],
    score
  });
  
  const card=deck.pop();
  slots.push(card);
  if(side==='left')leftDeck=deck;
  else rightDeck=deck;
  
  checkMatch();
  render();
  if(slots.length>=SM){on=false;showResult(false);}
}

function renderSlots(){
  const bar=document.getElementById('slot-bar');
  bar.innerHTML='';
  for(let i=0;i<SM;i++){
    const d=document.createElement('div');
    d.style.cssText=`width:40px;height:40px;border:2px dashed ${slots[i]?'gold':'#666'};border-radius:6px;display:flex;align-items:center;justify-content:center;background:rgba(30,15,50,.5);`;
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
  if(!tiles.filter(t=>!t.removed).length&&!leftDeck.length&&!rightDeck.length&&!slots.length) win();
}

function checkMatch(){
  let m={};
  slots.forEach((c,i)=>{(m[c]=m[c]||[]).push(i);});
  for(const[,idx] of Object.entries(m)){
    if(idx.length>=3){
      slots=slots.filter((_,i)=>!idx.slice(0,3).includes(i));
      score+=300;
      return true;
    }
  }
  return false;
}

function clickTile(t){
  if(!on||t.removed||t.blocked)return;
  hist.push({
    tiles:tiles.map(x=>({id:x.id,removed:x.removed})),
    slots:[...slots],
    leftDeck:[...leftDeck],
    rightDeck:[...rightDeck],
    score
  });
  t.removed=true;
  slots.push(t.card);
  checkShading();
  while(checkMatch());
  render();
  if(slots.length>=SM){on=false;showResult(false);}
}

function doUndo(){
  if(!on||!undo||!hist.length)return;
  const s=hist.pop();
  s.tiles.forEach(ts=>{const t=tiles.find(x=>x.id===ts.id);if(t)t.removed=ts.removed;});
  slots=s.slots;
  leftDeck=s.leftDeck;
  rightDeck=s.rightDeck;
  score=s.score;
  undo--;
  document.getElementById('undo-badge').textContent=undo;
  checkShading();
  render();
}

function doShuffle(){
  if(!on||!shuf)return;
  shuf--;
  document.getElementById('shuf-badge').textContent=shuf;
  
  // 보드 타일 + 양쪽 덱 전부 섞기
  const allCards=[];
  tiles.filter(t=>!t.removed).forEach(t=>allCards.push(t.card));
  allCards.push(...leftDeck, ...rightDeck);
  const shuffled=sh(allCards);
  
  let idx=0;
  tiles.filter(t=>!t.removed).forEach(t=>{t.card=shuffled[idx++];});
  leftDeck=shuffled.slice(idx, idx+leftDeck.length);
  idx+=leftDeck.length;
  rightDeck=shuffled.slice(idx);
  
  checkShading();
  render();
}

function doWithdraw(){}

function showResult(isWin){
  const ov=document.getElementById('overlay');
  ov.style.display='flex';
  if(isWin && stage<10){
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
  } else {
    if(stage>=5 && !adUsed){
      ov.innerHTML=`<div class="result-box lose">
        <h2>😿 SLOTS FULL!</h2>
        <p>Watch ad to get +3 slots?</p>
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
}

function watchAd(){
  const ov=document.getElementById('overlay');
  let countdown=5;
  ov.innerHTML=`<div class="result-box">
    <h2>📺 Ad Playing...</h2>
    <p style="font-size:48px;font-weight:800;color:var(--gold)">${countdown}</p>
    <p style="font-size:12px;color:rgba(205,189,255,.5)">Please wait</p>
  </div>`;
  const timer=setInterval(()=>{
    countdown--;
    if(countdown<=0){
      clearInterval(timer);
      SM=10;
      adUsed=true;
      on=true;
      ov.style.display='none';
      render();
    } else {
      ov.querySelector('p[style*="font-size:48px"]').textContent=countdown;
    }
  },1000);
}

function win(){on=false;showResult(true);}

function nextStage(){
  document.getElementById('overlay').style.display='none';
  stage++;
  tiles=[];slots=[];hist=[];undo=2;shuf=1;on=true;SM=7;adUsed=false;
  leftDeck=[];rightDeck=[];
  document.getElementById('undo-badge').textContent=2;
  document.getElementById('shuf-badge').textContent=1;
  buildStage();
  render();
}

function retryStage(){
  document.getElementById('overlay').style.display='none';
  tiles=[];slots=[];hist=[];undo=2;shuf=1;on=true;SM=7;adUsed=false;
  leftDeck=[];rightDeck=[];
  document.getElementById('undo-badge').textContent=2;
  document.getElementById('shuf-badge').textContent=1;
  buildStage();
  render();
}

function restartGame(){
  document.getElementById('overlay').style.display='none';
  stage=1;score=0;
  tiles=[];slots=[];hist=[];undo=2;shuf=1;on=true;SM=7;adUsed=false;
  leftDeck=[];rightDeck=[];
  document.getElementById('undo-badge').textContent=2;
  document.getElementById('shuf-badge').textContent=1;
  buildStage();
  render();
}

window.addEventListener('load',()=>{on=true;buildStage();render();});
window.doUndo=doUndo;
window.doShuffle=doShuffle;
window.doWithdraw=doWithdraw;
window.restart=restartGame;
window.nextStage=nextStage;
window.retryStage=retryStage;
window.watchAd=watchAd;
window.drawDeck=drawDeck;
