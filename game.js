// Perfect Paw Match - Refined Engine
const CARDS=[
  '1amethyst_heart','3Silver_Shopping_Bag','4Terquois_cushion',
  '5Sapphire_Paw','6fuchsia_ribbon','7jeweled_keyhole','8golden_paw ',
  '9pinkruby_pufferfish','10crystal_ball','11celestial_potion',
  '12royal cat bed','13zio','14indigo_bowtie','15ziawink'
];
const CP='assets/cards/',SM=7,CS=62,OX=31,OY=31;
let stage=1,tiles=[],slots=[],hist=[],undo=2,shuf=1,score=0,on=false;

function sh(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[b[i],b[j]]=[b[j],b[i]];}return b;}

function getPositions(){
  if(stage===1)return[
    {gx:0,gy:0,l:0},{gx:1,gy:0,l:0},{gx:2,gy:0,l:0},
    {gx:0,gy:1,l:0},{gx:1,gy:1,l:0},{gx:2,gy:1,l:0},
    {gx:0,gy:2,l:0},{gx:1,gy:2,l:0},{gx:2,gy:2,l:0},
    {gx:0,gy:0,l:1},{gx:1,gy:0,l:1},{gx:2,gy:0,l:1},
  ];
  if(stage===2)return[
    ...[0,1,2,3].flatMap(r=>[0,1,2,3,4].map(c=>({gx:c,gy:r,l:0}))),
    ...[0,1,2].flatMap(r=>[1,2,3].map(c=>({gx:c,gy:r,l:1}))),
    {gx:1,gy:0,l:2},{gx:2,gy:0,l:2},{gx:1,gy:1,l:2},{gx:2,gy:1,l:2},
  ];
  return[
    ...[0,1,2,3,4].flatMap(r=>[0,1,2,3,4,5].map(c=>({gx:c,gy:r,l:0}))),
    ...[0,1,2,3].flatMap(r=>[1,2,3,4].map(c=>({gx:c,gy:r,l:1}))),
    ...[0,1,2].flatMap(r=>[2,3].map(c=>({gx:c,gy:r,l:2}))),
    {gx:2,gy:1,l:3},
  ];
}

function build(){
  const bd=document.getElementById('game-board');
  const bw=bd.clientWidth||360,bh=bd.clientHeight||460;
  tiles=[];

  const pos=getPositions();
  const count=pos.length-pos.length%3;
  const used=sh(pos).slice(0,count);

  const numTypes=stage===1?3:stage===2?7:12;
  const chosen=sh([...CARDS]).slice(0,numTypes);
  const pool=[];
  for(let i=0;i<count;i++)pool.push(chosen[i%chosen.length]);
  const cards=sh(pool);

  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  used.forEach(({gx,gy,l})=>{
    const px=gx*CS+l*OX,py=gy*CS+l*OY;
    minX=Math.min(minX,px);minY=Math.min(minY,py);
    maxX=Math.max(maxX,px+CS);maxY=Math.max(maxY,py+CS);
  });

  const ox=Math.round(bw/2-(maxX-minX)/2-minX);
  const oy=Math.round(bh*0.45-(maxY-minY)/2-minY);

  used.forEach(({gx,gy,l},i)=>{
    tiles.push({
      id:i,card:cards[i],gx,gy,
      px:gx*CS+l*OX+ox,
      py:gy*CS+l*OY+oy,
      layer:l,rm:false
    });
  });
}

function isBlocked(t){
  if(t.rm)return true;
  const thresh=CS*0.15;
  for(const o of tiles){
    if(o.rm||o.id===t.id||o.layer<=t.layer)continue;
    const ox=Math.min(t.px+CS,o.px+CS)-Math.max(t.px,o.px);
    const oy=Math.min(t.py+CS,o.py+CS)-Math.max(t.py,o.py);
    if(ox>=thresh&&oy>=thresh)return true;
  }
  return false;
}

function render(){
  const bd=document.getElementById('game-board');
  bd.innerHTML='';
  [...tiles].filter(t=>!t.rm)
    .sort((a,b)=>a.layer-b.layer||a.gy-b.gy||a.gx-b.gx)
    .forEach(t=>{
      const bl=isBlocked(t);
      const el=document.createElement('div');
      el.style.cssText=`position:absolute;left:${t.px}px;top:${t.py}px;width:${CS}px;height:${CS}px;z-index:${t.layer*500+t.gy*20+t.gx};border-radius:8px;overflow:hidden;pointer-events:${bl?'none':'auto'};cursor:${bl?'not-allowed':'pointer'};`;
      const img=document.createElement('img');
      img.src=CP+t.card+'.png';
      img.style.cssText=`width:100%;height:100%;object-fit:cover;display:block;border-radius:7px;border:${bl?'1.5px solid rgba(80,60,120,.2)':'2.5px solid rgba(255,215,0,.9)'};filter:${bl?'brightness(.2) saturate(.05)':'brightness(1)'};box-shadow:${bl?'none':'0 2px 10px rgba(255,215,0,.3)'};transition:filter .1s;`;
      el.appendChild(img);
      if(!bl){
        el.onclick=()=>clickTile(t);
        el.ontouchstart=e=>{e.preventDefault();clickTile(t);};
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
    d.style.cssText=`width:40px;height:40px;border:2px dashed ${slots[i]?'rgba(255,215,0,.5)':'rgba(205,189,255,.5)'};border-radius:7px;background:${slots[i]?'rgba(255,215,0,.06)':'rgba(50,34,71,.3)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;`;
    if(slots[i]){
      const m=document.createElement('img');
      m.src=CP+slots[i]+'.png';
      m.style.cssText='width:34px;height:34px;object-fit:cover;border-radius:5px;';
      d.appendChild(m);
    }
    bar.appendChild(d);
  }
  document.getElementById('slot-count').textContent=slots.length+'/'+SM;
}

function renderUI(){
  document.getElementById('score').textContent='★ '+score.toLocaleString();
  document.getElementById('undo-badge').textContent=undo;
  document.getElementById('shuf-badge').textContent=shuf;
  if(!tiles.filter(t=>!t.rm).length&&!slots.length)win();
}

function insertSlot(card){
  let at=slots.length;
  for(let i=slots.length-1;i>=0;i--){if(slots[i]===card){at=i+1;break;}}
  slots.splice(at,0,card);
}

function checkMatch(){
  let ch=true;
  while(ch){ch=false;const m={};
    slots.forEach((c,i)=>{(m[c]=m[c]||[]).push(i);});
    for(const[,idx] of Object.entries(m)){
      if(idx.length>=3){
        slots=slots.filter((_,i)=>!new Set(idx.slice(0,3)).has(i));
        score+=300*stage;ch=true;break;
      }
    }
  }
}

function saveState(){hist.push({slots:[...slots],ts:tiles.map(t=>({id:t.id,rm:t.rm})),score});}

function clickTile(t){
  if(!on||t.rm||isBlocked(t))return;
  saveState();t.rm=true;
  insertSlot(t.card);checkMatch();render();
  if(slots.length>=SM)showFull();
}

function doUndo(){
  if(!on||!undo||!hist.length)return;
  const s=hist.pop();
  s.ts.forEach(({id,rm})=>{const t=tiles.find(t=>t.id===id);if(t)t.rm=rm;});
  slots=s.slots;score=s.score;undo--;render();
}

function doShuffle(){
  if(!on||!shuf)return;shuf--;
  const a=tiles.filter(t=>!t.rm),c=sh(a.map(t=>t.card));
  a.forEach((t,i)=>t.card=c[i]);render();
}

function doWithdraw(){
  if(!on||!slots.length)return;
  const card=slots.pop();
  const gone=tiles.filter(t=>t.rm);
  if(gone.length){gone[gone.length-1].rm=false;gone[gone.length-1].card=card;}
  else slots.push(card);
  render();
}

function showFull(){
  on=false;
  const ov=document.getElementById('overlay');ov.style.display='flex';
  ov.innerHTML=`<div class="result-box lose"><div style="font-size:42px">😾</div><h2>SLOTS FULL!</h2>
  <p>Watch ad to free 3 slots</p>
  <button onclick="doAd()" style="background:#22c55e;color:#fff">📺 Watch Ad (+3)</button>
  <button onclick="doRestart()">↺ Restart</button></div>`;
}

function doAd(){
  const ov=document.getElementById('overlay');let cd=5;
  ov.innerHTML=`<div class="result-box" style="text-align:center"><div style="font-size:52px">📺</div><div id="acd" style="font-size:52px;font-weight:800;color:#ffd700;margin-top:10px">${cd}</div></div>`;
  const iv=setInterval(()=>{cd--;const e=document.getElementById('acd');if(e)e.textContent=cd;
    if(cd<=0){clearInterval(iv);slots=slots.slice(3);ov.style.display='none';on=true;render();}
  },1000);
}

function win(){
  on=false;
  const ov=document.getElementById('overlay');ov.style.display='flex';
  ov.innerHTML=`<div class="result-box win"><div style="font-size:52px">👑</div><h2>PERFECT!</h2>
  <div style="font-size:14px;font-weight:700;margin:6px 0 14px">Score: ${score.toLocaleString()}</div>
  <button onclick="doNext()">Next Stage →</button>
  <button onclick="doRestart()">↺ Replay</button></div>`;
}

function doNext(){stage++;document.getElementById('overlay').style.display='none';document.getElementById('stage-label').textContent='Stage '+stage;go();}
function doRestart(){document.getElementById('overlay').style.display='none';document.getElementById('stage-label').textContent='Stage '+stage;go();}

function go(){
  on=true;slots=[];hist=[];undo=2;shuf=1;score=0;
  build();render();
}

window.addEventListener('load',()=>{stage=1;go();});
window.doUndo=doUndo;window.doShuffle=doShuffle;window.doWithdraw=doWithdraw;
window.doRestart=doRestart;window.doNext=doNext;window.doAd=doAd;
