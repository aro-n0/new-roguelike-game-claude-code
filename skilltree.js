/* skilltree.js */
const GATE_THRESHOLD=0; // fog system replaces gating
function costAt(node,lvl){ return Math.round(node.baseCost*Math.pow(node.growth,lvl)); }

function chain(branch,angle,defs){
  const nodes=[];
  let parent='core';
  defs.forEach((d,i)=>{
    const radius = branch==='token' ? 140+i*140 : 550+i*160;
    const rad=(angle-90)*Math.PI/180;
    nodes.push(Object.assign({},d,{
      id:d.id, category:d.category, branch, parent,
      x:Math.cos(rad)*radius, y:Math.sin(rad)*radius, tier:i===0?'root':(i===defs.length-1?'ultimate':(i===defs.length-2?'capstone':'mid'))
    }));
    parent=d.id;
  });
  return nodes;
}

const TOKEN_NODES=[
  ...chain('token',200,[
    {id:'t_dmg',name:'刃部強化',icon:'⚔',maxLv:10,baseCost:6,growth:1.15,apply:(b,l)=>{b.damage+=1*l;},desc:l=>`攻撃力 +${l}`},
    {id:'t_dmg2',name:'合金コーティング',icon:'⚔',maxLv:8,baseCost:20,growth:1.2,apply:(b,l)=>{b.damage+=2*l;},desc:l=>`攻撃力 +${2*l}`},
  ]),
  ...chain('token',160,[
    {id:'t_hp',name:'装甲プレート',icon:'♥',maxLv:10,baseCost:6,growth:1.15,apply:(b,l)=>{b.maxHp+=10*l;},desc:l=>`最大HP +${10*l}`},
    {id:'t_regen',name:'自己修復ナノ',icon:'✚',maxLv:6,baseCost:22,growth:1.2,apply:(b,l)=>{b.regen+=0.25*l;},desc:l=>`HP自動回復 +${(0.25*l).toFixed(2)}/秒`},
  ]),
  ...chain('token',250,[
    {id:'t_spd',name:'脚部モーター',icon:'➤',maxLv:8,baseCost:6,growth:1.16,apply:(b,l)=>{b.speed*=(1+0.03*l);},desc:l=>`移動速度 +${Math.round(3*l)}%`},
    {id:'t_magnet',name:'磁場拡張器',icon:'⊕',maxLv:5,baseCost:20,growth:1.2,apply:(b,l)=>{b.magnet+=15*l;},desc:l=>`取得範囲 +${15*l}`},
  ]),
  ...chain('token',290,[
    {id:'t_range',name:'索敵センサー',icon:'◎',maxLv:8,baseCost:6,growth:1.16,apply:(b,l)=>{b.range*=(1+0.04*l);},desc:l=>`射程 +${Math.round(4*l)}%`},
    {id:'t_aspd',name:'反応速度チップ',icon:'⚡',maxLv:8,baseCost:20,growth:1.2,apply:(b,l)=>{b.atkSpd*=(1+0.04*l);},desc:l=>`攻撃速度 +${Math.round(4*l)}%`},
  ]),
];

function mult(base,l,g){ return Math.pow(g,l); }
const BUILD_NODES=[
  ...chain('star',0,[
    {id:'st_root',category:'build',name:'疫病適性',icon:'☣',maxLv:5,baseCost:1,growth:1.3,apply:(b,l)=>{b.statusChance+=0.06*l;},desc:l=>`状態異常付与率 +${Math.round(6*l)}%`},
    {id:'st_poison',category:'build',name:'猛毒コーティング',icon:'🧪',maxLv:5,baseCost:4,growth:1.3,apply:(b,l)=>{b.poisonDmg+=2*l;},desc:l=>`毒ダメージ/tick +${2*l}`},
    {id:'st_frost',category:'build',name:'凍傷誘発剤',icon:'❄',maxLv:5,baseCost:6,growth:1.32,apply:(b,l)=>{b.frostSlow+=0.08*l;},desc:l=>`敵鈍足 +${Math.round(8*l)}%`},
    {id:'st_capstone',category:'build',name:'疫病の権化',icon:'☠',maxLv:8,baseCost:10,growth:1.5,apply:(b,l)=>{b.statusDmgMult*=mult(0,l,1.32);},desc:l=>`状態異常倍率 x${mult(0,l,1.32).toFixed(2)}`},
    {id:'st_ultimate',category:'build',name:'終末瘴気',icon:'☣',maxLv:5,baseCost:40,growth:1.6,apply:(b,l)=>{b.statusChance+=0.05*l; b.statusDmgMult*=mult(0,l,1.25);},desc:l=>`付与率+${Math.round(5*l)}% 倍率x${mult(0,l,1.25).toFixed(2)}`},
  ]),
  ...chain('star',51,[
    {id:'la_root',category:'build',name:'光学兵器適性',icon:'▮',maxLv:5,baseCost:1,growth:1.3,apply:(b,l)=>{b.laserUnlocked=true; b.laserDmg+=3*l;},desc:l=>`貫通レーザー習得 威力+${3*l}`},
    {id:'la_dmg',category:'build',name:'出力増幅',icon:'▮',maxLv:5,baseCost:4,growth:1.3,apply:(b,l)=>{b.laserDmg+=4*l;},desc:l=>`レーザー威力 +${4*l}`},
    {id:'la_width',category:'build',name:'収束レンズ',icon:'▮',maxLv:5,baseCost:6,growth:1.3,apply:(b,l)=>{b.laserWidth+=6*l;},desc:l=>`ビーム幅 +${6*l}`},
    {id:'la_capstone',category:'build',name:'メガレーザー',icon:'▰',maxLv:8,baseCost:10,growth:1.5,apply:(b,l)=>{b.laserDmgMult*=mult(0,l,1.32);},desc:l=>`レーザー倍率 x${mult(0,l,1.32).toFixed(2)}`},
    {id:'la_ultimate',category:'build',name:'超臨界ビーム',icon:'▰',maxLv:5,baseCost:40,growth:1.6,apply:(b,l)=>{b.laserWidth+=10*l; b.laserDmgMult*=mult(0,l,1.25);},desc:l=>`幅+${10*l} 倍率x${mult(0,l,1.25).toFixed(2)}`},
  ]),
  ...chain('star',103,[
    {id:'bo_root',category:'build',name:'弓術習得',icon:'➶',maxLv:5,baseCost:1,growth:1.3,apply:(b,l)=>{b.bowUnlocked=true; b.arrowDmg+=2*l;},desc:l=>`弓習得 威力+${2*l}`},
    {id:'bo_multi',category:'build',name:'マルチノック',icon:'➶',maxLv:4,baseCost:5,growth:1.35,apply:(b,l)=>{b.arrowCount+=l;},desc:l=>`同時発射数 +${l}`},
    {id:'bo_dmg',category:'build',name:'鏃強化',icon:'➶',maxLv:5,baseCost:6,growth:1.3,apply:(b,l)=>{b.arrowDmg+=3*l;},desc:l=>`矢威力 +${3*l}`},
    {id:'bo_capstone',category:'build',name:'乱れ撃ち',icon:'➹',maxLv:8,baseCost:10,growth:1.5,apply:(b,l)=>{b.bowDmgMult*=mult(0,l,1.32);},desc:l=>`弓倍率 x${mult(0,l,1.32).toFixed(2)}`},
    {id:'bo_ultimate',category:'build',name:'千本乱舞',icon:'➹',maxLv:5,baseCost:40,growth:1.6,apply:(b,l)=>{b.arrowCount+=Math.floor(l/2); b.bowDmgMult*=mult(0,l,1.25);},desc:l=>`発射数+${Math.floor(l/2)} 倍率x${mult(0,l,1.25).toFixed(2)}`},
  ]),
  ...chain('star',154,[
    {id:'bx_root',category:'build',name:'拳闘士の誓い',icon:'✊',maxLv:1,baseCost:2,growth:1.5,apply:(b,l,base)=>{b.boxerMode=true; base.range*=0.6; base.atkSpd*=0.85; b.boxerDmg+=5;},desc:l=>`バットを捨て拳装備`},
    {id:'bx_power',category:'build',name:'鋼拳',icon:'✊',maxLv:5,baseCost:5,growth:1.32,apply:(b,l)=>{b.boxerDmg+=6*l;},desc:l=>`拳威力 +${6*l}`},
    {id:'bx_combo',category:'build',name:'連撃技術',icon:'✊',maxLv:5,baseCost:6,growth:1.32,apply:(b,l)=>{b.boxerCombo+=0.2*l;},desc:l=>`連撃倍率 +${Math.round(20*l)}%`},
    {id:'bx_capstone',category:'build',name:'限界突破',icon:'☄',maxLv:8,baseCost:12,growth:1.55,apply:(b,l)=>{b.boxerDmgMult*=mult(0,l,1.35);},desc:l=>`拳倍率 x${mult(0,l,1.35).toFixed(2)}`},
    {id:'bx_ultimate',category:'build',name:'神速の拳',icon:'☄',maxLv:5,baseCost:45,growth:1.65,apply:(b,l)=>{b.boxerCombo+=0.15*l; b.boxerDmgMult*=mult(0,l,1.28);},desc:l=>`連撃+${Math.round(15*l)}% 倍率x${mult(0,l,1.28).toFixed(2)}`},
  ]),
  ...chain('star',206,[
    {id:'mg_root',category:'build',name:'魔術適性',icon:'✦',maxLv:5,baseCost:1,growth:1.3,apply:(b,l)=>{b.mageUnlocked=true; b.chainCount+=l; b.mageDmg+=3*l;},desc:l=>`連鎖雷習得 (連鎖${l})`},
    {id:'mg_chain',category:'build',name:'増幅コイル',icon:'⚡',maxLv:4,baseCost:5,growth:1.35,apply:(b,l)=>{b.chainCount+=l;},desc:l=>`連鎖数 +${l}`},
    {id:'mg_fireball',category:'build',name:'業火の秘術',icon:'🔥',maxLv:5,baseCost:6,growth:1.32,apply:(b,l)=>{b.fireballRadius+=18*l; b.fireballDmg+=5*l;},desc:l=>`範囲+${18*l} 威力+${5*l}`},
    {id:'mg_capstone',category:'build',name:'アークメイジ',icon:'☀',maxLv:8,baseCost:10,growth:1.5,apply:(b,l)=>{b.mageDmgMult*=mult(0,l,1.32);},desc:l=>`魔法倍率 x${mult(0,l,1.32).toFixed(2)}`},
    {id:'mg_ultimate',category:'build',name:'大魔導',icon:'☀',maxLv:5,baseCost:40,growth:1.6,apply:(b,l)=>{b.chainCount+=Math.floor(l/2); b.mageDmgMult*=mult(0,l,1.25);},desc:l=>`連鎖+${Math.floor(l/2)} 倍率x${mult(0,l,1.25).toFixed(2)}`},
  ]),
  ...chain('star',257,[
    {id:'vt_root',category:'build',name:'耐久適性',icon:'🛡',maxLv:5,baseCost:1,growth:1.3,apply:(b,l)=>{b.dmgReduction+=0.03*l;},desc:l=>`被ダメージ軽減 +${Math.round(3*l)}%`},
    {id:'vt_hp',category:'build',name:'強化外殻',icon:'🛡',maxLv:6,baseCost:5,growth:1.3,apply:(b,l)=>{b.vitHp+=25*l;},desc:l=>`最大HP +${25*l}`},
    {id:'vt_shield',category:'build',name:'緊急衝撃波',icon:'⊙',maxLv:3,baseCost:8,growth:1.4,apply:(b,l)=>{b.shieldEnabled=true; b.shieldCdReduce+=3*l;},desc:l=>`HP30%以下で緊急シールド発動 (CD-${3*l}s)`},
    {id:'vt_capstone',category:'build',name:'不屈の意志',icon:'✝',maxLv:8,baseCost:12,growth:1.5,apply:(b,l)=>{b.dmgReductionMult*=mult(0,l,1.3);},desc:l=>`軽減倍率 x${mult(0,l,1.3).toFixed(2)}`},
    {id:'vt_ultimate',category:'build',name:'鋼鉄の心臓',icon:'✝',maxLv:5,baseCost:42,growth:1.6,apply:(b,l)=>{b.vitHp+=30*l; b.dmgReductionMult*=mult(0,l,1.25);},desc:l=>`最大HP+${30*l} 倍率x${mult(0,l,1.25).toFixed(2)}`},
  ]),
  ...chain('star',309,[
    {id:'dr_root',category:'build',name:'ドローン起動',icon:'◈',maxLv:1,baseCost:2,growth:1.5,apply:(b,l)=>{b.droneCount+=1; b.droneDmg+=3;},desc:l=>`自律ドローンを1機展開`},
    {id:'dr_count',category:'build',name:'量産ライン',icon:'◈',maxLv:4,baseCost:6,growth:1.4,apply:(b,l)=>{b.droneCount+=l;},desc:l=>`ドローン数 +${l}`},
    {id:'dr_dmg',category:'build',name:'兵装強化',icon:'◈',maxLv:5,baseCost:6,growth:1.32,apply:(b,l)=>{b.droneDmg+=4*l;},desc:l=>`ドローン威力 +${4*l}`},
    {id:'dr_capstone',category:'build',name:'AI最適化',icon:'◉',maxLv:8,baseCost:11,growth:1.5,apply:(b,l)=>{b.droneDmgMult*=mult(0,l,1.32);},desc:l=>`ドローン倍率 x${mult(0,l,1.32).toFixed(2)}`},
    {id:'dr_ultimate',category:'build',name:'ドローンスウォーム',icon:'◉',maxLv:5,baseCost:42,growth:1.6,apply:(b,l)=>{b.droneCount+=Math.floor(l/2); b.droneDmgMult*=mult(0,l,1.25);},desc:l=>`数+${Math.floor(l/2)} 倍率x${mult(0,l,1.25).toFixed(2)}`},
  ]),
];
const ALL_NODES=[...TOKEN_NODES,...BUILD_NODES];
function findNode(id){ return ALL_NODES.find(n=>n.id===id); }
function getLevel(node){
  if(node.category==='token') return gameData.tokenLevels[node.id]||0;
  const slot=gameData.slots[gameData.activeSlot];
  return (slot.build&&slot.build[node.id])||0;
}
function isOwned(node){ return getLevel(node)>0; }
function isVisible(node){
  if(node.parent==='core') return true;
  const p=findNode(node.parent);
  return p? isOwned(p) : false;
}
function canAfford(node){
  const lvl=getLevel(node);
  if(lvl>=node.maxLv) return false;
  const cost=costAt(node,lvl);
  return node.category==='token'? gameData.tokens>=cost : gameData.skillStars>=cost;
}
function buyNode(node){
  const lvl=getLevel(node);
  if(lvl>=node.maxLv || !isVisible(node)) return;
  const cost=costAt(node,lvl);
  if(node.category==='token'){
    if(gameData.tokens<cost) return;
    gameData.tokens-=cost; gameData.tokenLevels[node.id]=lvl+1;
  } else {
    if(gameData.skillStars<cost) return;
    gameData.skillStars-=cost;
    const slot=gameData.slots[gameData.activeSlot];
    if(!slot.build) slot.build={};
    slot.build[node.id]=lvl+1;
  }
  AudioEngine.SE.skillBuy(); saveGame();
}
function computePlayerStats(){
  const base={maxHp:100,damage:1,range:70,atkSpd:1.0,speed:180,regen:0,magnet:40,crit:0.05};
  const build={statusChance:0,statusDmgMult:1,poisonDmg:0,frostSlow:0,
    laserUnlocked:false,laserDmg:0,laserDmgMult:1,laserWidth:20,
    bowUnlocked:false,arrowCount:1,arrowDmg:0,bowDmgMult:1,
    boxerMode:false,boxerDmg:0,boxerCombo:1,boxerDmgMult:1,
    mageUnlocked:false,chainCount:0,mageDmg:0,mageDmgMult:1,fireballRadius:0,fireballDmg:0,
    vitHp:0,dmgReduction:0,dmgReductionMult:1,shieldEnabled:false,shieldCdReduce:0,
    droneCount:0,droneDmg:0,droneDmgMult:1};
  TOKEN_NODES.forEach(n=>{ const l=gameData.tokenLevels[n.id]||0; if(l>0) n.apply(base,l); });
  const slot=gameData.slots[gameData.activeSlot];
  BUILD_NODES.forEach(n=>{ const l=(slot.build&&slot.build[n.id])||0; if(l>0) n.apply(build,l,base); });
  base.maxHp+=build.vitHp;
  return {base,build};
}

/* ---- Canvas fog-tree renderer with pan & zoom ---- */
const SkillTree=(function(){
  let view={scale:0.55,offsetX:0,offsetY:0};
  let dragging=false,lastX=0,lastY=0,dragged=false;
  let tooltipEl=null;
  function worldToScreen(x,y){ return {x:W/2+(x+view.offsetX)*view.scale, y:H/2+(y+view.offsetY)*view.scale}; }
  function screenToWorld(sx,sy){ return {x:(sx-W/2)/view.scale-view.offsetX, y:(sy-H/2)/view.scale-view.offsetY}; }
  function reset(){ view.scale=0.55; view.offsetX=0; view.offsetY=0; }
  function onWheel(e){
    e.preventDefault();
    const before=screenToWorld(e.offsetX,e.offsetY);
    view.scale=Math.max(0.15,Math.min(1.6, view.scale*(e.deltaY<0?1.1:0.9)));
    const after=screenToWorld(e.offsetX,e.offsetY);
    view.offsetX+=(after.x-before.x); view.offsetY+=(after.y-before.y);
  }
  function onDown(e){ dragging=true; dragged=false; lastX=e.clientX; lastY=e.clientY; }
  function onMove(e){
    if(dragging){
      const dx=e.clientX-lastX, dy=e.clientY-lastY;
      if(Math.abs(dx)>2||Math.abs(dy)>2) dragged=true;
      view.offsetX+=dx/view.scale; view.offsetY+=dy/view.scale;
      lastX=e.clientX; lastY=e.clientY;
    } else {
      hoverCheck(e.offsetX,e.offsetY);
    }
  }
  function onUp(e){
    if(!dragged){ handleClick(e.offsetX,e.offsetY); }
    dragging=false;
  }
  function nodeScreenPos(n){ return worldToScreen(n.x,n.y); }
  function nodeRadius(n){ return (n.tier==='capstone'?26:(n.tier==='ultimate'?30:22))*view.scale; }
  function hitNode(sx,sy){
    for(const n of ALL_NODES){
      if(!isVisible(n)) continue;
      const p=nodeScreenPos(n); const r=nodeRadius(n);
      if(Math.hypot(sx-p.x,sy-p.y)<=r) return n;
    }
    return null;
  }
  function handleClick(sx,sy){
    const n=hitNode(sx,sy);
    if(n){ buyNode(n); }
  }
  function hoverCheck(sx,sy){
    const n=hitNode(sx,sy);
    hideTooltip();
    if(n && isVisible(n)){
      const lvl=getLevel(n);
      tooltipEl=document.createElement('div'); tooltipEl.className='st-tooltip';
      const descText=lvl>0?n.desc(lvl):'未取得';
      const cost=lvl<n.maxLv?`次コスト:${costAt(n,lvl)} ${n.category==='token'?'トークン':'スター'}`:'MAX';
      tooltipEl.innerHTML=`<b>${n.name}</b><br>${descText}<br>${cost}`;
      document.body.appendChild(tooltipEl);
      tooltipEl.style.left=(sx+16)+'px'; tooltipEl.style.top=(sy+8)+'px';
    }
  }
  function hideTooltip(){ if(tooltipEl){ tooltipEl.remove(); tooltipEl=null; } }
  function render(){
    ctx.save();
    ctx.fillStyle='#04050a'; ctx.fillRect(0,0,W,H);
    // grid
    ctx.strokeStyle='rgba(0,255,242,0.05)'; ctx.lineWidth=1;
    const gridStep=80*view.scale;
    const originX=(W/2+view.offsetX*view.scale)%gridStep, originY=(H/2+view.offsetY*view.scale)%gridStep;
    for(let x=originX;x<W;x+=gridStep){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=originY;y<H;y+=gridStep){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    // edges
    ALL_NODES.forEach(n=>{
      if(!isVisible(n)) return;
      const p=findNode(n.parent==='core'?null:n.parent);
      const parentPos = n.parent==='core'? worldToScreen(0,0) : nodeScreenPos(p);
      const myPos=nodeScreenPos(n);
      const owned=isOwned(n);
      ctx.strokeStyle= owned? 'rgba(255,0,229,0.7)' : 'rgba(120,130,160,0.35)';
      ctx.lineWidth = owned?3:1.5;
      ctx.beginPath(); ctx.moveTo(parentPos.x,parentPos.y); ctx.lineTo(myPos.x,myPos.y); ctx.stroke();
    });

    // core
    const corePos=worldToScreen(0,0);
    ctx.save();
    ctx.shadowColor='#fff'; ctx.shadowBlur=24*view.scale;
    ctx.fillStyle='#101830'; ctx.strokeStyle='#fff'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(corePos.x,corePos.y,34*view.scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font=`${12*view.scale}px Consolas`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('CORE',corePos.x,corePos.y);
    ctx.restore();

    // nodes
    ALL_NODES.forEach(n=>{
      if(!isVisible(n)) return;
      const p=nodeScreenPos(n); const r=nodeRadius(n);
      const lvl=getLevel(n); const owned=lvl>0; const afford=canAfford(n);
      ctx.save();
      let color = n.category==='token'?'#f4ff00':'#d1c4ff';
      if(owned) color = n.category==='token'?'#39ff88':'#ff00e5';
      else if(!afford) color='#3a4560';
      ctx.shadowColor=color; ctx.shadowBlur=(owned||afford?14:0)*view.scale;
      ctx.fillStyle='rgba(10,12,24,0.94)'; ctx.strokeStyle=color; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle=color; ctx.textAlign='center'; ctx.textBaseline='middle';
      if(!owned && !afford && lvl===0){
        // fogged unaffordable still shows ??? per spec (name hidden regardless, only cost shown)
      }
      ctx.font=`${14*view.scale}px Consolas`;
      ctx.fillText(owned?n.icon:'？', p.x, p.y-6*view.scale);
      ctx.font=`${9*view.scale}px Consolas`;
      const label = owned? `${lvl}/${n.maxLv}` : `${costAt(n,0)}`;
      ctx.fillText(label, p.x, p.y+9*view.scale);
      ctx.restore();
    });
    ctx.restore();
  }
  return {render,onWheel,onDown,onMove,onUp,reset,hideTooltip};
})();
