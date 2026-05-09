// Perfect Paw Match - Stripe Cards, No Timer, 7 Slots, Proper Blocking
const CARDS=[
  '1amethyst_heart',
  '2zia',
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
const CP='assets/cards/',SM=7,TW=64,TH=64,GS=48;
let stage=1,tiles=[],slots=[],leftDeck=[],rightDeck=[],hist=[],undo=2,shuf=1,score=0,on=false;

function sh(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=0|Math.random()*(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;}

function stageConfig(){
  if(stage===1) return {types:4, copies:3, layers:2, deckCards:0};
  if(stage===2) return {types:6, copies:3, layers:3, deckCards:6};
  if(stage===3) return {types:8, copies:3, layers:3, deckCards:9};
  return {types:10, copies:3, layers:4, deckCards:12};
}

function gen(){
  const cfg=stageConfig();
  const chosen=sh([...CARDS]).slice(0,cfg.types);
  const pool=[];
  chosen.forEach(c=>{for(let i=0;i<cfg.copies;i++)pool.push(c);});
  const shuffled=sh(pool);
  const boardCount=shuffled.length-cfg.deckCards;
  const board=shuffled.slice(0,boardCount);
  const deckAll=shuffled.slice(boardCount);
  const half=0|deckAll.length/2;
  return{b:board,l:deckAll.slice(0,half),r:deckAll.slice(half)};
}

function build(pool){
  const bd=document.getElementById('game-board');
  const bw=bd.clientWidth||360,bh=bd.clientHeight||440;
  tiles=[];
  const cfg=stageConfig();
  const numLayers=cfg.layers;

  // Grid dimensions per layer (centered, shrinking each layer)
  const layerDefs=[
    {c:6,r:5},
    {c:4,r:4},
    {c:3,r:3},
    {c:2,r:2}
  ].slice(0,numLayers);

  const COLS=6,ROWS=5;
  const totalW=COLS*GS, totalH=ROWS*GS;
  const sx=0|bw/2-totalW/2, sy=0|bh/2-totalH/2;

  let idx=0;
  for(let layer=0;layer<numLayers&&idx<pool.length;layer++){
    const {c,r}=layerDefs[layer];
    const offX=0|((COLS-c)/2);
    const offY=0|((ROWS-r)/2);
    const cells=[];
    for(let gy=offY;gy<offY+r;gy++)
      for(let gx=offX;gx<offX+c;gx++)
        cells.push({gx,gy});
    const picked=sh(cells).slice(0,Math.min(cells.length,pool.length-idx));
    picked.forEach(({gx,gy})=>{
      if(idx>=pool.length)return;
      tiles.push({
        id:idx,card:pool[idx],
        gx,gy,
        // offset each layer slightly so stacking is visible
        x:sx+gx*GS,
        y:sy+gy*GS,
        layer,rm:false
      });
      idx++;
    });
  }
}

// A tile is blocked if ANY higher-layer tile sits on same grid cell
function blocked(t){
  if(t.rm)return true;
  for(let i=0;i<tiles.length;i++){
    const o=tiles[i];
    if(o.rm||o.id===t.id||o.layer<=t.layer)continue;
    if(o.gx===t.gx&&o.gy===t.gy)return true;
  }
  return false;
}

function render(){
  const bd=document.getElementById('game-board');
  bd.innerHTML='';
  const vis=tiles.filter(t=>!t.rm)
    .sort((a,b)=>a.layer!==b.layer?a.layer-b.layer:a.gy!==b.gy?a.gy-b.gy:a.gx-b.gx);
  vis.forEach(t=>{
    const bl=blocked(t);
    const el=document.createElement('div');
    el.className='tile'+(bl?' blocked':' free');
    el.style.left=t.x+'px';
    el.style.top=t.y+'px';
    el.style.width=TW+'px';
    el.style.height=TH+'px';
    el.style.zIndex=t.layer*1000+t.gy*50+t.gx;
    const img=document.createElement('img');
    img.src=CP+t.card+'.png';
    img.draggable=false;
    el.appendChild(img);
    if(!bl){
      el.onclick=()=>click(t);
      el.ontouchstart=e=>{e.preventDefault();click(t);};
    }
    bd.appendChild(el);
  });
  rDecks();rSlots();ui();
}

function rDecks(){rD('left-deck',leftDeck,'left');rD('right-deck',rightDeck,'right');}
function rD(id,dk,sd){
  const el=document.getElementById(id);
  if(!dk.length){el.innerHTML='<div class="deck-empty">✓</div>';return;}
  const top=dk[dk.length-1],sc=Math.min(dk.length-1,4);
  let h=`<div class="deck-wrap" onclick="draw('${sd}')">`;
  for(let i=sc;i>=1;i--)h+=`<div class="deck-back-card" style="bottom:${i*3}px;right:${i*2}px"></div>`;
  h+=`<div class="deck-top-open"><img src="${CP}${top}.png"/></div>`;
  h+=`<div class="deck-count">${dk.length}</div></div>`;
  el.innerHTML=h;
}

function rSlots(){
  const bar=document.getElementById('slot-bar');bar.innerHTML='';
  for(let i=0;i<SM;i++){
    const d=document.createElement('div');
    d.className='slot'+(slots[i]?' filled':'');
    if(slots[i]){
      const m=document.createElement('img');
      m.src=CP+slots[i]+'.png';
      d.appendChild(m);
    }
    bar.appendChild(d);
  }
  document.getElementById('slot-count').textContent=`SLOT: ${slots.length} / ${SM}`;
}

function ui(){
  document.getElementById('score').textContent='★ '+score.toLocaleString();
  document.getElementById('undo-btn').innerHTML=`↩<br>UNDO(${undo})`;
  document.getElementById('shuffle-btn').innerHTML=`⟳<br>SHUF(${shuf})`;
  if(!tiles.filter(t=>!t.rm).length&&!leftDeck.length&&!rightDeck.length&&!slots.length)win();
}

function ins(card){
  let at=slots.length;
  for(let i=slots.length-1;i>=0;i--){if(slots[i]===card){at=i+1;break;}}
  slots.splice(at,0,card);
}

function chk(){
  let ch=true;
  while(ch){
    ch=false;
    const m={};
    slots.forEach((c,i)=>{(m[c]=m[c]||[]).push(i);});
    for(const[,idx]of Object.entries(m)){
      if(idx.length>=3){
        slots=slots.filter((_,i)=>!new Set(idx.slice(0,3)).has(i));
        score+=300*stage;ch=true;break;
      }
    }
  }
}

function save(){hist.push({slots:[...slots],l:[...leftDeck],r:[...rightDeck],ts:tiles.map(t=>({id:t.id,r:t.rm})),score});}

function click(t){
  if(!on||t.rm||blocked(t))return;
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
  slots=s.slots;leftDeck=s.l;rightDeck=s.r;score=s.score;
  undo--;render();
}

function doShuffle(){
  if(!on||!shuf)return;shuf--;
  const a=tiles.filter(t=>!t.rm),c=sh(a.map(t=>t.card));
  a.forEach((t,i)=>t.card=c[i]);render();
}

function full(){
  if(slots.length<SM)return;
  on=false;
  document.getElementById('overlay').style.display='flex';
  document.getElementById('overlay').innerHTML=`
    <div class="result-box lose">
      <div style="font-size:36px">😾</div>
      <h2>SLOTS FULL!</h2>
      <p>Watch ad to free 3 slots!</p>
      <button onclick="ad()" style="background:#22c55e;color:#fff">📺 Watch Ad</button>
      <button onclick="restart()">↺ Restart</button>
    </div>`;
}

function ad(){
  const ov=document.getElementById('overlay');
  let cd=5;
  ov.innerHTML=`<div class="result-box"><div style="font-size:48px">📺</div><h2 style="color:var(--l)">Ad...</h2><div id="acd" style="font-size:48px;color:var(--g);margin:12px 0">${cd}</div></div>`;
  const t=setInterval(()=>{
    cd--;
    const e=document.getElementById('acd');if(e)e.textContent=cd;
    if(cd<=0){clearInterval(t);slots=slots.slice(3);ov.style.display='none';on=true;render();}
  },1000);
}

function win(){
  on=false;
  document.getElementById('overlay').style.display='flex';
  document.getElementById('overlay').innerHTML=`
    <div class="result-box win"><div style="font-size:48px">👑</div><h2>PERFECT!</h2>
    <div class="result-score">Score: ${score.toLocaleString()}</div>
    <button onclick="next()">Next Stage →</button><button onclick="restart()">Play Again</button></div>`;
}

function next(){stage++;document.getElementById('overlay').style.display='none';document.getElementById('stage-label').textContent='Stage '+stage;go();}
function restart(){stage=1;document.getElementById('overlay').style.display='none';document.getElementById('stage-label').textContent='Stage 1';go();}

function go(){
  on=true;slots=[];hist=[];undo=2;shuf=1;score=0;
  const{b,l,r}=gen();leftDeck=l;rightDeck=r;build(b);render();
}

window.addEventListener('load',()=>{stage=1;go();});
window.doUndo=doUndo;window.doShuffle=doShuffle;window.restart=restart;window.next=next;window.draw=draw;window.ad=ad;
