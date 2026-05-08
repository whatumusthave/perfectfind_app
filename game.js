const CARDS=[
  '1amethyst_heart','3Silver_Shopping_Bag','4Terquois_cushion',
  '5Sapphire_Paw','6fuchsia_ribbon','7jeweled_keyhole','8golden_paw ',
  '9pinkruby_pufferfish','10crystal_ball','11celestial_potion',
  '12royal cat bed','13zio','14indigo_bowtie','15ziawink'
];
const CP='assets/cards/',SM=7;
let stage=1,tiles=[],slots=[],hist=[],undo=2,shuf=1,score=0,on=false;

function sh(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[b[i],b[j]]=[b[j],b[i]];}return b;}

// Card size and overlap offset per layer
const CS=64, LAY_OX=18, LAY_OY=18; // each layer shifts right+down 18px (=~28% of 64)

function getConfig(){
  if(stage===1)return{types:3, layout:[
    {c:3,r:3,layer:0},
    {c:2,r:2,layer:1}
  ]};
  if(stage===2)return{types:7, layout:[
    {c:6,r:4,layer:0},
    {c:4,r:3,layer:1},
    {c:2,r:2,layer:2}
  ]};
  return{types:11, layout:[
    {c:7,r:5,layer:0},
    {c:5,r:4,layer:1},
    {c:3,r:3,layer:2},
    {c:1,r:1,layer:3}
  ]};
}

function build(){
  const bd=document.getElementById('game-board');
  const bw=bd.clientWidth||360, bh=bd.clientHeight||500;
  tiles=[];

  const cfg=getConfig();
  const numLayers=cfg.layout.length;

  // Generate positions: each layer is a grid centered over previous
  // Layer 0 = bottom, Layer N = top
  // All layers share the same center point
  // Tiles at same (gx,gy) on different layers stack on top of each other with offset

  // Collect all (gx, gy, layer) combos — randomly assign cards
  const allPos=[];
  cfg.layout.forEach(({c,r,layer})=>{
    // center each layer's grid within the total cols/rows
    const maxC=cfg.layout[0].c, maxR=cfg.layout[0].r;
    const offX=Math.floor((maxC-c)/2), offY=Math.floor((maxR-r)/2);
    for(let gy=offY;gy<offY+r;gy++)
      for(let gx=offX;gx<offX+c;gx++)
        allPos.push({gx,gy,layer});
  });

  // Trim to multiple of 3
  const count=allPos.length - allPos.length%3;
  const used=sh(allPos).slice(0,count);

  // Card pool
  const chosen=sh([...CARDS]).slice(0,cfg.types);
  const pool=[];
  for(let i=0;i<count;i++) pool.push(chosen[i%chosen.length]);
  const cards=sh(pool);

  // Pixel positions: base grid step = CS (no overlap between adjacent grid cells)
  // Layer offset makes upper layers appear shifted
  const step=CS; // full card step — no squishing between grid cells
  const maxC=cfg.layout[0].c, maxR=cfg.layout[0].r;
  const totalW=maxC*step+(numLayers-1)*LAY_OX;
  const totalH=maxR*step+(numLayers-1)*LAY_OY;
  const baseX=Math.round(bw/2 - totalW/2);
  const baseY=Math.round(bh*0.42 - totalH/2);

  used.forEach(({gx,gy,layer},i)=>{
    tiles.push({
      id:i, card:cards[i],
      gx, gy, layer,
      px: baseX + gx*step + layer*LAY_OX,
      py: baseY + gy*step + layer*LAY_OY,
      rm:false
    });
  });
}

// A tile is blocked if any higher-layer tile overlaps it by >= 25% in both axes
function isBlocked(t){
  if(t.rm)return true;
  const thresh=CS*0.25; // 16px
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
      el.style.cssText=`position:absolute;left:${t.px}px;top:${t.py}px;width:${CS}px;height:${CS}px;z-index:${t.layer*500+t.gy*20+t.gx};border-radius:8px;overflow:hidden;cursor:${bl?'not-allowed':'pointer'};`;
      const img=document.createElement('img');
      img.src=CP+t.card+'.png';
      img.style.cssText=`width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;border-radius:7px;border:${bl?'1.5px solid rgba(80,60,120,.2)':'2.5px solid rgba(255,215,0,.9)'};filter:${bl?'brightness(.2) saturate(.08)':'brightness(1)'};box-shadow:${bl?'none':'0 2px 10px rgba(255,215,0,.3)'};`;
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
    d.style.cssText=`width:40px;height:40px;border:2px dashed ${slots[i]?'rgba(255,215,0,.5)':'rgba(205,189,255,.12)'};border-radius:7px;background:${slots[i]?'rgba(255,215,0,.06)':'rgba(50,34,71,.3)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;`;
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
  const rem=tiles.filter(t=>!t.rm);
  if(!rem.length&&!slots.length)win();
}

function insertSlot(card){
  // Insert next to existing same card for grouping
  let at=slots.length;
  for(let i=slots.length-1;i>=0;i--){if(slots[i]===card){at=i+1;break;}}
  slots.splice(at,0,card);
}

function checkMatch(){
  let changed=true;
  while(changed){
    changed=false;
    const m={};
    slots.forEach((c,i)=>{(m[c]=m[c]||[]).push(i);});
    for(const[,idx] of Object.entries(m)){
      if(idx.length>=3){
        const rm=new Set(idx.slice(0,3));
        slots=slots.filter((_,i)=>!rm.has(i));
        score+=300*stage;
        changed=true;break;
      }
    }
  }
}

function saveState(){
  hist.push({slots:[...slots],ts:tiles.map(t=>({id:t.id,rm:t.rm})),score});
}

function clickTile(t){
  if(!on||t.rm||isBlocked(t))return;
  saveState();
  t.rm=true;
  insertSlot(t.card);
  checkMatch();
  render();
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
  const alive=tiles.filter(t=>!t.rm);
  const cards=sh(alive.map(t=>t.card));
  alive.forEach((t,i)=>t.card=cards[i]);
  render();
}

function doWithdraw(){
  if(!on||!slots.length)return;
  // Put last slot card back: find a removed tile to restore
  const card=slots.pop();
  const gone=tiles.filter(t=>t.rm);
  if(gone.length){const t=gone[gone.length-1];t.rm=false;t.card=card;}
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
