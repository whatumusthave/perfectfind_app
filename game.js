// Perfect Paw Match
const CARDS=[
  '1amethyst_heart',
  '3Silver_Shopping_Bag',
  '4Terquois_cushion',
  '5Sapphire_Paw',
  '6fuchsia_ribbon',
  '7jeweled_keyhole',
  '8golden_paw ',
  '9pinkruby_pufferfish',
  '10crystal_ball',
  '11celestial_potion',
  '12royal cat bed',
  '13zio',
  '14indigo_bowtie',
  '15ziawink'
];
const CP='assets/cards/',SM=7,CS=64;
let stage=1,tiles=[],slots=[],leftDeck=[],rightDeck=[],hist=[],undo=2,shuf=1,score=0,on=false;

function sh(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=0|Math.random()*(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;}

function getLayout(){
  if(stage===1)return{
    layers:[
      [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]],
      [[0,0],[1,0],[0,1],[1,1]]
    ],step:CS,deckCount:0
  };
  if(stage===2)return{
    layers:[
      [[1,0],[2,0],[3,0],[4,0],
       [0,1],[1,1],[2,1],[3,1],[4,1],[5,1],
       [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],
       [1,3],[2,3],[3,3],[4,3]],
      [[1,1],[2,1],[3,1],[4,1],[1,2],[2,2],[3,2],[4,2]],
      [[2,1],[3,1],[2,2],[3,2]]
    ],step:CS-16,deckCount:6
  };
  return{
    layers:[
      [[1,0],[2,0],[3,0],[4,0],[5,0],
       [0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
       [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
       [0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],
       [1,4],[2,4],[3,4],[4,4],[5,4]],
      [[1,1],[2,1],[3,1],[4,1],[5,1],
       [1,2],[2,2],[3,2],[4,2],[5,2],
       [1,3],[2,3],[3,3],[4,3],[5,3]],
      [[2,1],[3,1],[4,1],[2,2],[3,2],[4,2],[2,3],[3,3],[4,3]],
      [[3,2]]
    ],step:CS-20,deckCount:9
  };
}

function build(){
  const bd=document.getElementById('game-board');
  const bw=bd.clientWidth||360,bh=bd.clientHeight||500;
  tiles=[];leftDeck=[];rightDeck=[];

  const{layers,step,deckCount}=getLayout();
  const allPos=[];
  layers.forEach((layer,li)=>sh(layer).forEach(([gx,gy])=>allPos.push({gx,gy,layer:li})));

  const useCount=allPos.length-allPos.length%3;
  const used=allPos.slice(0,useCount);

  // Card pool: stage1=3 types, stage2=8, stage3+=all14
  const numTypes=stage===1?3:stage===2?8:14;
  const chosen=sh([...CARDS]).slice(0,numTypes);
  const pool=[];let ci=0;
  while(pool.length<used.length){pool.push(chosen[ci%chosen.length]);ci++;}
  const shuffled=sh(pool).slice(0,used.length);

  // Center in board
  let minPx=Infinity,minPy=Infinity,maxPx=-Infinity,maxPy=-Infinity;
  used.forEach(({gx,gy,layer})=>{
    const px=gx*step+layer*10,py=gy*step+layer*10;
    minPx=Math.min(minPx,px);minPy=Math.min(minPy,py);
    maxPx=Math.max(maxPx,px+CS);maxPy=Math.max(maxPy,py+CS);
  });
  const boardH=bh*0.78;
  const ox=0|bw/2-(maxPx-minPx)/2-minPx;
  const oy=0|boardH/2-(maxPy-minPy)/2-minPy;

  used.forEach(({gx,gy,layer},i)=>{
    tiles.push({id:i,card:shuffled[i],gx,gy,
      px:gx*step+layer*10+ox,py:gy*step+layer*10+oy,
      layer,rm:false});
  });

  // Pull some top-layer free tiles into side decks
  if(deckCount>0){
    const topFree=sh(tiles.filter(t=>t.layer===0&&!isBlocked(t)));
    const half=0|deckCount/2;
    topFree.slice(0,half).forEach(t=>{leftDeck.push(t.card);t.rm=true;});
    topFree.slice(half,deckCount).forEach(t=>{rightDeck.push(t.card);t.rm=true;});
  }
}

function isBlocked(t){
  if(t.rm)return true;
  const thresh=CS*0.25;
  for(let i=0;i<tiles.length;i++){
    const o=tiles[i];
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
  tiles.filter(t=>!t.rm)
    .sort((a,b)=>a.layer-b.layer||a.gy-b.gy||a.gx-b.gx)
    .forEach(t=>{
      const bl=isBlocked(t);
      const el=document.createElement('div');
      el.className='tile'+(bl?' blocked':' free');
      el.style.cssText=`left:${t.px}px;top:${t.py}px;width:${CS}px;height:${CS}px;z-index:${t.layer*500+t.gy*20+t.gx};`;
      const img=document.createElement('img');
      img.src=CP+t.card+'.png';img.draggable=false;
      el.appendChild(img);
      if(!bl){el.onclick=()=>click(t);el.ontouchstart=e=>{e.preventDefault();click(t);};}
      bd.appendChild(el);
    });
  rDecks();rSlots();uiUpdate();
}

function rDecks(){
  document.querySelectorAll('.deck-float').forEach(e=>e.remove());
  const bd=document.getElementById('game-board');
  const bw=bd.clientWidth||360,bh=bd.clientHeight||500;
  const dy=bh*0.82;
  ['left','right'].forEach(side=>{
    const dk=side==='left'?leftDeck:rightDeck;
    const el=document.createElement('div');
    el.className='deck-float';
    el.style.cssText=`position:absolute;${side==='left'?'left:8px':'right:8px'};top:${dy}px;width:62px;z-index:9000;`;
    if(!dk.length){el.innerHTML='<div style="text-align:center;font-size:20px;color:rgba(205,189,255,.25)">✓</div>';bd.appendChild(el);return;}
    const top=dk[dk.length-1],sc=Math.min(dk.length-1,4);
    let h=`<div style="position:relative;width:60px;height:80px;" onclick="draw('${side}')">`;
    for(let i=sc;i>=1;i--)h+=`<div style="position:absolute;width:58px;height:76px;background:linear-gradient(135deg,#3d2e6b,#251847);border:1.5px solid rgba(205,189,255,.45);border-radius:8px;bottom:${i*3}px;right:${i*2}px;"></div>`;
    h+=`<div style="position:absolute;bottom:0;left:0;width:58px;height:76px;border:2.5px solid #ffd700;border-radius:8px;overflow:hidden;box-shadow:0 0 10px rgba(255,215,0,.4)"><img src="${CP}${top}.png" style="width:100%;height:100%;object-fit:cover"/></div>`;
    h+=`<div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);font-size:11px;font-weight:700;color:var(--l);background:var(--h);border-radius:10px;padding:2px 7px;">${dk.length}</div>`;
    h+='</div>';
    el.innerHTML=h;bd.appendChild(el);
  });
}

function rSlots(){
  const bar=document.getElementById('slot-bar');bar.innerHTML='';
  for(let i=0;i<SM;i++){
    const d=document.createElement('div');
    d.className='slot'+(slots[i]?' filled':'');
    if(slots[i]){const m=document.createElement('img');m.src=CP+slots[i]+'.png';d.appendChild(m);}
    bar.appendChild(d);
  }
  document.getElementById('slot-count').textContent=slots.length+'/'+SM;
}

function uiUpdate(){
  document.getElementById('score').textContent='★ '+score.toLocaleString();
  document.getElementById('undo-count').textContent=undo;
  document.getElementById('shuf-count').textContent=shuf;
  if(!tiles.filter(t=>!t.rm).length&&!leftDeck.length&&!rightDeck.length&&!slots.length)win();
}

function ins(card){
  let at=slots.length;
  for(let i=slots.length-1;i>=0;i--){if(slots[i]===card){at=i+1;break;}}
  slots.splice(at,0,card);
}

function chk(){
  let ch=true;
  while(ch){ch=false;const m={};
    slots.forEach((c,i)=>{(m[c]=m[c]||[]).push(i);});
    for(const[,idx]of Object.entries(m)){
      if(idx.length>=3){slots=slots.filter((_,i)=>!new Set(idx.slice(0,3)).has(i));score+=300*stage;ch=true;break;}
    }
  }
}

function save(){hist.push({slots:[...slots],l:[...leftDeck],r:[...rightDeck],ts:tiles.map(t=>({id:t.id,r:t.rm})),score});}

function click(t){
  if(!on||t.rm||isBlocked(t))return;
  save();t.rm=true;ins(t.card);chk();render();
  if(slots.length>=SM)full();
}

function draw(side){
  if(!on)return;
  const dk=side==='left'?leftDeck:rightDeck;
  if(!dk.length)return;
  if(slots.length>=SM){full();return;}
  save();ins(dk.pop());chk();render();
  if(slots.length>=SM)full();
}

function doUndo(){
  if(!on||!undo||!hist.length)return;
  const s=hist.pop();
  s.ts.forEach(ts=>{const t=tiles.find(t=>t.id===ts.id);if(t)t.rm=ts.r;});
  slots=s.slots;leftDeck=s.l;rightDeck=s.r;score=s.score;undo--;render();
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

function full(){
  on=false;
  const ov=document.getElementById('overlay');ov.style.display='flex';
  ov.innerHTML=`<div class="result-box lose"><div style="font-size:42px">😾</div><h2>SLOTS FULL!</h2>
    <p>Watch ad to free 3 slots</p>
    <button onclick="ad()" style="background:#22c55e;color:#fff">📺 Watch Ad (+3)</button>
    <button onclick="restart()">↺ Restart</button></div>`;
}

function ad(){
  const ov=document.getElementById('overlay');let cd=5;
  ov.innerHTML=`<div class="result-box" style="text-align:center"><div style="font-size:52px">📺</div><div id="acd" style="font-size:48px;font-weight:800;color:var(--g);margin-top:12px">${cd}</div></div>`;
  const t=setInterval(()=>{cd--;const e=document.getElementById('acd');if(e)e.textContent=cd;
    if(cd<=0){clearInterval(t);slots=slots.slice(3);ov.style.display='none';on=true;render();}
  },1000);
}

function win(){
  on=false;
  document.getElementById('overlay').style.display='flex';
  document.getElementById('overlay').innerHTML=`
    <div class="result-box win"><div style="font-size:52px">👑</div><h2>PERFECT!</h2>
    <div style="font-size:14px;font-weight:700;margin:6px 0 14px">Score: ${score.toLocaleString()}</div>
    <button onclick="next()">Next Stage →</button>
    <button onclick="restart()">↺ Replay</button></div>`;
}

function next(){stage++;document.getElementById('overlay').style.display='none';document.getElementById('stage-label').textContent='Stage '+stage;go();}
function restart(){document.getElementById('overlay').style.display='none';document.getElementById('stage-label').textContent='Stage '+stage;go();}

function go(){
  on=true;slots=[];hist=[];undo=2;shuf=1;score=0;
  build();render();
}

window.addEventListener('load',()=>{stage=1;go();});
window.doUndo=doUndo;window.doShuffle=doShuffle;window.doWithdraw=doWithdraw;
window.restart=restart;window.next=next;window.draw=draw;window.ad=ad;
