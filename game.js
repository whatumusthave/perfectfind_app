// Perfect Paw Match - Yang Le Ge Yang EXACT
// KEY FIX: All layers share the SAME grid positions
// Higher layer tile sits EXACTLY on top of lower layer tile
// So blocking detection is guaranteed
const CARDS=['amethyst_heart','celestial_potion','crystal_ball','fuchsia_ribbon','golden_paw','indigo_bowtie','jeweled_keyhole','midnight_cushion','mystic_yarn_ball','rose_pufferfish','royal_cat_bed','sapphire_paw','shopping_bag','starry_cat_mic'];
const CP='assets/cards/',SM=7,TW=56,TH=56,GS=42;
let stage=1,tiles=[],slots=[],leftDeck=[],rightDeck=[],hist=[],undo=2,shuf=1,score=0,time=90,tmr=null,on=false;

function sh(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=0|Math.random()*(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;}

function gen(){
  if(stage===1){const p=[];CARDS.slice(0,3).forEach(c=>{for(let i=0;i<3;i++)p.push(c);});return{b:sh(p),l:[],r:[]};}
  const b=[];CARDS.forEach(c=>{for(let i=0;i<6;i++)b.push(c);});
  const d=sh([...CARDS,...CARDS,...CARDS]);
  return{b:sh(b),l:d.slice(0,13),r:d.slice(13,26)};
}

function build(pool){
  const bd=document.getElementById('game-board');
  const bw=bd.clientWidth||500,bh=bd.clientHeight||400;
  tiles=[];

  if(stage===1){
    // 3x3 grid, 1 layer
    const c=3,gw=c*GS,gh=c*GS,sx=0|bw/2-gw/2,sy=0|bh/2-gh/2;
    pool.forEach((card,i)=>{tiles.push({id:i,card,gx:i%c,gy:0|i/c,x:sx+(i%c)*GS,y:sy+(0|i/c)*GS,layer:0,rm:false});});
    return;
  }

  // Stage 2+: GRID-BASED layers
  // Define a master grid. Each layer fills certain grid cells.
  // Higher layers sit ON TOP of same grid cells = guaranteed blocking.
  const COLS=7,ROWS=7;
  const gw=(COLS-1)*GS+TW, gh=(ROWS-1)*GS+TH;
  const sx=0|bw/2-gw/2, sy=0|bh/2-gh/2;

  // Create grid positions for each layer
  // Layer 0: fill most cells (7x7=49 minus center hole)
  // Layer 1: fill 5x5 center area (25)
  // Layer 2: fill 3x3 center area (9)
  // Layer 3: fill 1 center tile (1)
  // Total grid slots: ~84 positions across layers

  const layerGrids = [
    // Layer 0: 7x7 grid minus center 1x1 hole = 48 cells
    (() => {
      const cells = [];
      for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) {
        if(r===3 && c===3) continue; // center hole
        cells.push({gx:c, gy:r});
      }
      return cells;
    })(),
    // Layer 1: 5x5 grid centered = 25 cells
    (() => {
      const cells = [];
      for(let r=1;r<=5;r++) for(let c=1;c<=5;c++) cells.push({gx:c, gy:r});
      return cells;
    })(),
    // Layer 2: 3x3 grid centered = 9 cells
    (() => {
      const cells = [];
      for(let r=2;r<=4;r++) for(let c=2;c<=4;c++) cells.push({gx:c, gy:r});
      return cells;
    })(),
    // Layer 3: 1x1 center = 1 cell
    [{gx:3, gy:3}],
    // Layer 4: 1 extra = 1 cell offset
    [{gx:3, gy:2}]
  ];

  let idx=0;
  for(let layer=0;layer<layerGrids.length && idx<pool.length;layer++){
    const cells = sh([...layerGrids[layer]]); // shuffle cells
    for(let i=0;i<cells.length && idx<pool.length;i++){
      const {gx,gy} = cells[i];
      tiles.push({
        id:idx, card:pool[idx],
        gx, gy,
        x: sx + gx*GS,
        y: sy + gy*GS,
        layer,
        rm:false
      });
      idx++;
    }
  }
}

// BLOCKING: tile is blocked if ANY higher-layer tile occupies the SAME grid cell
// OR overlaps its pixel bounds at all
function blocked(t){
  if(t.rm) return true;
  for(let i=0;i<tiles.length;i++){
    const o=tiles[i];
    if(o.rm||o.id===t.id||o.layer<=t.layer) continue;
    // Same grid cell = definitely blocked
    if(o.gx===t.gx && o.gy===t.gy) return true;
    // Pixel overlap check (for edge cases)
    if(!(o.x>=t.x+TW || o.x+TW<=t.x || o.y>=t.y+TH || o.y+TH<=t.y)) return true;
  }
  return false;
}

function render(){
  const bd=document.getElementById('game-board');
  bd.innerHTML='';
  const vis=tiles.filter(t=>!t.rm).sort((a,b)=>a.layer!==b.layer?a.layer-b.layer:a.gy!==b.gy?a.gy-b.gy:a.gx-b.gx);
  vis.forEach((t,i)=>{
    const bl=blocked(t);
    const el=document.createElement('div');
    el.className='tile'+(bl?' blocked':' free');
    el.style.left=t.x+'px';el.style.top=t.y+'px';
    el.style.zIndex=t.layer*1000+t.gy*50+t.gx;
    const img=document.createElement('img');
    img.src=CP+t.card+'.png';img.draggable=false;
    el.appendChild(img);
    if(!bl){el.onclick=()=>click(t);el.ontouchstart=e=>{e.preventDefault();click(t);};}
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
  // Show total available slots (7 base + 3 bonus if earned)
  const max=slots.length<=SM?SM:SM+3;
  for(let i=0;i<max;i++){
    const d=document.createElement('div');
    d.className='slot'+(slots[i]?' filled':'')+(i>=SM?' bonus':'');
    if(slots[i]){const m=document.createElement('img');m.src=CP+slots[i]+'.png';d.appendChild(m);}
    bar.appendChild(d);
  }
  document.getElementById('slot-count').textContent=`SLOT: ${slots.length} / ${max}`;
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
  while(ch){ch=false;const m={};slots.forEach((c,i)=>{(m[c]=m[c]||[]).push(i);});
    for(const[,idx]of Object.entries(m)){if(idx.length>=3){slots=slots.filter((_,i)=>!new Set(idx.slice(0,3)).has(i));score+=300*stage;ch=true;break;}}}
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
  if(slots.length>=SM+3){over();return;}
  save();ins(dk.pop());chk();render();
  if(slots.length>=SM+3)over();
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

// SLOT FULL → watch ad → expand to 10 slots (3 bonus to the RIGHT)
function full(){
  if(slots.length<SM)return;
  on=false;clearInterval(tmr);
  document.getElementById('overlay').style.display='flex';
  document.getElementById('overlay').innerHTML=`
    <div class="result-box lose">
      <div style="font-size:36px">😾</div>
      <h2>SLOTS FULL!</h2>
      <p>Watch ad to get +3 bonus slots!</p>
      <button onclick="ad()" style="background:#22c55e;color:#fff">📺 Watch Ad → +3 Slots</button>
      <button onclick="restart()">↺ Restart</button>
    </div>`;
}

function ad(){
  const ov=document.getElementById('overlay');
  let cd=5;
  ov.innerHTML=`<div class="result-box"><div style="font-size:48px">📺</div><h2 style="color:var(--l)">Ad...</h2><div id="acd" style="font-size:48px;color:var(--g);margin:12px 0">${cd}</div></div>`;
  const t=setInterval(()=>{cd--;const e=document.getElementById('acd');if(e)e.textContent=cd;
    if(cd<=0){clearInterval(t);ov.style.display='none';on=true;timer();render();}
  },1000);
}

function over(){
  if(!on)return;on=false;clearInterval(tmr);
  const r=stage===1?'72%':'0.1%';
  document.getElementById('overlay').style.display='flex';
  document.getElementById('overlay').innerHTML=`
    <div class="result-box lose"><div style="font-size:48px">😾</div><h2>GAME OVER</h2>
    <div class="clear-rate">Clear Rate: ${r}</div>
    <p>${stage>1?'Only 0.1% clear this!':'Try again!'}</p>
    <button onclick="restart()">↺ Try Again</button><button onclick="next()">Next Stage</button></div>`;
}

function win(){
  on=false;clearInterval(tmr);
  document.getElementById('overlay').style.display='flex';
  document.getElementById('overlay').innerHTML=`
    <div class="result-box win"><div style="font-size:48px">👑</div><h2>PERFECT!</h2>
    <div class="result-score">Score: ${score.toLocaleString()}</div>
    <button onclick="next()">Next Stage →</button><button onclick="restart()">Play Again</button></div>`;
}

function timer(){
  time=stage===1?60:180;clearInterval(tmr);uT();
  tmr=setInterval(()=>{time--;uT();if(time<=0){clearInterval(tmr);over();}},1000);
}
function uT(){
  const m=String(0|time/60).padStart(2,'0'),s=String(time%60).padStart(2,'0');
  const e=document.getElementById('timer');e.textContent=m+':'+s;e.style.color=time<30?'#ff6b6b':'#ffd700';
}

function next(){stage++;document.getElementById('overlay').style.display='none';document.getElementById('stage-label').textContent='Stage '+stage;go();}
function restart(){document.getElementById('overlay').style.display='none';go();}

function go(){
  on=true;slots=[];hist=[];undo=2;shuf=1;score=0;
  const{b,l,r}=gen();leftDeck=l;rightDeck=r;build(b);render();timer();
}

window.addEventListener('load',()=>{stage=1;go();});
window.doUndo=doUndo;window.doShuffle=doShuffle;window.restart=restart;window.next=next;window.draw=draw;window.ad=ad;
