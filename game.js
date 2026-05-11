const CARDS=['amethyst-heart','celestial-potion','crystal-ball','fuchsia-ribbon','golden-paw','indigo-bowtie','jeweled-key','mistic-yarn','rose-pufferfish','royal-cat-bed','sapphire-paw','silver-bag','starry-mic','turquoise-cushion'];
const CP='asset/cards/',SM=7,CW=72,CH=72;
let tiles=[],slots=[],hist=[],undo=2,shuf=1,score=0,on=false;

function sh(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=0|Math.random()*(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;}

// 양러거양 방식: index 높을수록 위에 있음
function checkShading(){
  for(let i=0;i<tiles.length;i++){
    const cur=tiles[i];
    if(cur.removed){cur.blocked=false;continue;}
    cur.blocked=false;
    const x1=cur.x,y1=cur.y,x2=x1+CW,y2=y1+CH;
    for(let j=i+1;j<tiles.length;j++){
      const o=tiles[j];
      if(o.removed)continue;
      const overlap=!(o.y+CH<=y1||o.y>=y2||o.x+CW<=x1||o.x>=x2);
      if(overlap){cur.blocked=true;break;}
    }
  }
}

// Stage 1: 레이어 배치 — 아래층(넓게 펼침) + 위층(소수 겹침)
// 결과: 초반 클릭 가능 카드 ~20장 이상 확보
function buildStage1(){
  const pool=[];
  const chosen=sh(CARDS).slice(0,12); // 12장 × 3 = 36장
  chosen.forEach(c=>{for(let i=0;i<3;i++)pool.push(c);});
  const shuffled=sh(pool);

  tiles=[];
  let idx=0;

  // ── 1층: 5×4 격자, 간격 넓혀서 거의 안 겹침 (20장)
  const cols=5, rows=4;
  const gapX=68, gapY=74;
  const startX=14, startY=14;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(idx>=20)break;
      tiles.push({
        id:idx,
        card:shuffled[idx],
        x:startX+c*gapX,
        y:startY+r*gapY,
        removed:false,
        blocked:false
      });
      idx++;
    }
  }

  // ── 2층: 나머지 16장, 1층 타일 위에 작게 겹쳐서 쌓음
  // 2층은 z-index 높아서 막힌 타일이 생기고 난이도 올라감
  const layer2Pos=[
    {x:50, y:50},{x:118,y:50},{x:186,y:50},{x:254,y:50},
    {x:50, y:124},{x:118,y:124},{x:186,y:124},{x:254,y:124},
    {x:50, y:198},{x:118,y:198},{x:186,y:198},{x:254,y:198},
    {x:84, y:272},{x:152,y:272},{x:220,y:272},{x:152,y:320},
  ];
  layer2Pos.forEach(pos=>{
    if(idx>=36)return;
    tiles.push({
      id:idx,
      card:shuffled[idx],
      x:pos.x,
      y:pos.y,
      removed:false,
      blocked:false
    });
    idx++;
  });

  checkShading();
}

function render(){
  const bd=document.getElementById('game-board');
  bd.innerHTML='';
  tiles.filter(t=>!t.removed).forEach((t,arrIdx)=>{
    const el=document.createElement('div');
    el.style.cssText=`position:absolute;left:${t.x}px;top:${t.y}px;width:${CW}px;height:${CH}px;border-radius:8px;overflow:hidden;z-index:${arrIdx+10};`;

    const img=document.createElement('img');
    img.src=CP+t.card+'.png';
    img.style.cssText='width:100%;height:100%;object-fit:cover;display:block;';
    el.appendChild(img);

    if(t.blocked){
      // 반투명 overlay — 이미지는 보이지만 클릭 불가
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
  checkShading(); // 즉시 재계산
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
  ov.innerHTML=`<div class="result-box ${isWin?'win':'lose'}">
    <h2>${isWin?'🎉 PERFECT!':'😿 TOO BAD'}</h2>
    <p>${isWin?'Score: '+score.toLocaleString():'Slots are full!'}</p>
    <button onclick="restartGame()">${isWin?'Play Again':'Try Again'}</button>
    <button onclick="window.location.href='index.html'">Home</button>
  </div>`;
}

function win(){on=false;showResult(true);}

function restartGame(){
  document.getElementById('overlay').style.display='none';
  tiles=[];slots=[];hist=[];undo=2;shuf=1;score=0;on=true;
  document.getElementById('undo-badge').textContent=2;
  document.getElementById('shuf-badge').textContent=1;
  buildStage1();
  render();
}

window.addEventListener('load',()=>{on=true;buildStage1();render();});
window.doUndo=doUndo;
window.doShuffle=doShuffle;
window.doWithdraw=doWithdraw;
window.restart=restartGame;
