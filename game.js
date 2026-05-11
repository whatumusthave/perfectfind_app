const CARDS=['amethyst-heart','celestial-potion','crystal-ball','fuchsia-ribbon','golden-paw','indigo-bowtie','jeweled-key','mistic-yarn','rose-pufferfish','royal-cat-bed','sapphire-paw','silver-bag','starry-mic','turquoise-cushion'];
const CP='asset/cards/',CW=72,CH=72;
let tiles=[],slots=[],hist=[],undo=2,shuf=1,score=0,on=false,stage=1,SM=7,adUsed=false;

function sh(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=0|Math.random()*(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;}

/* ─── 레벨 설계 ───
  난이도 = 전체 카드 수 + 2층 비율
  전부 3배수 → 남김 없이 클리어 가능
  open = 1층(100% 보임, 바로 클릭), cover = 2층(겹쳐서 막힘)

  Lv  total  kinds  open  cover
  1    18     6     18     0     전부 열림
  2    21     7     18     3     거의 다 열림
  3    24     8     21     3     쉬움
  4    27     9     21     6     중반
  5    30    10     21     9     적당
  6    33    11     24     9     꽤 있음
  7    36    12     24    12     실전
  8    39    13     24    15     빡셈
  9    42    14     27    15     매우 빡셈
  10   42    14     21    21     보스 — 절반 막힘
*/
const LEVELS=[
  {total:18, kinds:6,  openCt:18, coverCt:0 },
  {total:21, kinds:7,  openCt:18, coverCt:3 },
  {total:24, kinds:8,  openCt:21, coverCt:3 },
  {total:27, kinds:9,  openCt:21, coverCt:6 },
  {total:30, kinds:10, openCt:21, coverCt:9 },
  {total:33, kinds:11, openCt:24, coverCt:9 },
  {total:36, kinds:12, openCt:24, coverCt:12},
  {total:39, kinds:13, openCt:24, coverCt:15},
  {total:42, kinds:14, openCt:27, coverCt:15},
  {total:42, kinds:14, openCt:21, coverCt:21},
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

// 1층 격자 (겹침 제로, 보드 360x460 중앙)
function makeGrid(count){
  const cols=4;
  const rows=Math.ceil(count/cols);
  const gapX=82,gapY=58;
  const totalW=(cols-1)*gapX+CW;
  const totalH=(rows-1)*gapY+CH;
  const offX=Math.round((360-totalW)/2);
  const offY=Math.max(8,Math.round((460-totalH)/2));
  const pos=[];
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(pos.length>=count)break;
      pos.push({x:offX+c*gapX, y:offY+r*gapY});
    }
  }
  return pos;
}

// 2층 — 1층 카드 사이에 겹치게 배치
function makeCover(count, gridPos){
  if(!count)return[];
  const mids=[];
  for(let i=0;i<gridPos.length;i++){
    for(let j=i+1;j<gridPos.length;j++){
      const dx=Math.abs(gridPos[i].x-gridPos[j].x);
      const dy=Math.abs(gridPos[i].y-gridPos[j].y);
      if(dx<=100&&dy<=80){
        mids.push({
          x:Math.round((gridPos[i].x+gridPos[j].x)/2),
          y:Math.round((gridPos[i].y+gridPos[j].y)/2)
        });
      }
    }
  }
  const shuffled=sh(mids);
  const pos=[];
  for(let i=0;i<count;i++){
    if(i<shuffled.length){
      pos.push(shuffled[i]);
    } else {
      pos.push({x:30+Math.round(Math.random()*240), y:30+Math.round(Math.random()*340)});
    }
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
  let idx=0;

  const gridPos=makeGrid(lv.openCt);
  gridPos.forEach(pos=>{
    if(idx>=lv.openCt)return;
    tiles.push({id:idx, card:shuffled[idx], x:pos.x, y:pos.y, removed:false, blocked:false});
    idx++;
  });

  const coverPos=makeCover(lv.coverCt, gridPos);
  coverPos.forEach(pos=>{
    if(idx>=lv.total)return;
    tiles.push({id:idx, card:shuffled[idx], x:pos.x, y:pos.y, removed:false, blocked:false});
    idx++;
  });

  checkShading();
}

function render(){
  const bd=document.getElementById('board-inner');
  bd.innerHTML='';
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
  renderSlots();
  renderUI();
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
  if(!tiles.filter(t=>!t.removed).length&&!slots.length) win();
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
  hist.push({tiles:tiles.map(x=>({id:x.id,removed:x.removed})),slots:[...slots]});
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
  slots=[...s.slots];
  undo--;
  document.getElementById('undo-badge').textContent=undo;
  checkShading();
  render();
}

function doShuffle(){
  if(!on||!shuf)return;
  shuf--;
  document.getElementById('shuf-badge').textContent=shuf;
  const alive=tiles.filter(t=>!t.removed);
  const cards=sh(alive.map(t=>t.card));
  alive.forEach((t,i)=>t.card=cards[i]);
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
    // Stage 5+ → 광고로 슬롯 확장 기회
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
      SM=10; // 슬롯 7 → 10 확장
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
  document.getElementById('undo-badge').textContent=2;
  document.getElementById('shuf-badge').textContent=1;
  buildStage();
  render();
}

function retryStage(){
  document.getElementById('overlay').style.display='none';
  tiles=[];slots=[];hist=[];undo=2;shuf=1;on=true;SM=7;adUsed=false;
  document.getElementById('undo-badge').textContent=2;
  document.getElementById('shuf-badge').textContent=1;
  buildStage();
  render();
}

function restartGame(){
  document.getElementById('overlay').style.display='none';
  stage=1;score=0;
  tiles=[];slots=[];hist=[];undo=2;shuf=1;on=true;SM=7;adUsed=false;
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
