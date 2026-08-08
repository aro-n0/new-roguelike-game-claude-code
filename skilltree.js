/* skilltree.js */
const GATE_THRESHOLD=12;
function costAt(node,lvl){ return Math.round(node.baseCost*Math.pow(node.growth,lvl)); }
function mult(l,g){ return Math.pow(g,l); }
function P(parent,angleDeg,radius){
  const rad=angleDeg*Math.PI/180;
  return {x:parent.x+Math.cos(rad)*radius, y:parent.y+Math.sin(rad)*radius};
}

/* ---- Token tree (base stats) : 攻撃力 root -> branching tree ---- */
const core={x:0,y:0,id:'core'};

const t_dmg_pos=P(core,-90,170);
const t_dmg={id:'t_dmg',category:'token',name:'攻撃力',icon:'⚔',maxLv:200,baseCost:8,growth:1.28,parent:'core',
  x:t_dmg_pos.x,y:t_dmg_pos.y,apply:(b,l)=>{b.damage+=1*l;},desc:l=>`攻撃力 +${l}`};

const t_aspd_pos=P(t_dmg_pos,-150,170);
const t_aspd={id:'t_aspd',category:'token',name:'攻撃速度',icon:'⚡',maxLv:12,baseCost:10,growth:1.2,parent:'t_dmg',
  x:t_aspd_pos.x,y:t_aspd_pos.y,apply:(b,l)=>{b.atkSpd*=(1+0.03*l);},desc:l=>`攻撃速度 +${Math.round(3*l)}%`};

const t_crit_pos=P(t_dmg_pos,-30,170);
const t_crit={id:'t_crit',category:'token',name:'クリティカル率',icon:'✹',maxLv:12,baseCost:10,growth:1.2,parent:'t_dmg',
  x:t_crit_pos.x,y:t_crit_pos.y,apply:(b,l)=>{b.crit+=0.02*l;},desc:l=>`クリティカル率 +${Math.round(2*l)}%`};

const t_hp_pos=P(t_dmg_pos,-90,220);
const t_hp={id:'t_hp',category:'token',name:'体力増強',icon:'♥',maxLv:15,baseCost:8,growth:1.18,parent:'t_dmg',
  x:t_hp_pos.x,y:t_hp_pos.y,apply:(b,l)=>{b.maxHp+=12*l;},desc:l=>`最大HP +${12*l}`};

const t_range_pos=P(t_aspd_pos,-170,170);
const t_range={id:'t_range',category:'token',name:'攻撃範囲',icon:'◎',maxLv:10,baseCost:12,growth:1.22,parent:'t_aspd',
  x:t_range_pos.x,y:t_range_pos.y,apply:(b,l)=>{b.range*=(1+0.04*l);},desc:l=>`射程 +${Math.round(4*l)}%`};

const t_tokendrop_pos=P(t_aspd_pos,-130,170);
const t_tokendrop={id:'t_tokendrop',category:'token',name:'トークンドロップ率',icon:'⬡',maxLv:200,baseCost:20,growth:1.4,parent:'t_aspd',
  x:t_tokendrop_pos.x,y:t_tokendrop_pos.y,apply:(b,l)=>{b.tokenMul*=(1+0.05*l);},desc:l=>`トークン獲得量 x${(1+0.05*l).toFixed(2)}`};

const t_speed_pos=P(t_hp_pos,-110,170);
const t_speed={id:'t_speed',category:'token',name:'移動速度',icon:'➤',maxLv:10,baseCost:10,growth:1.2,parent:'t_hp',
  x:t_speed_pos.x,y:t_speed_pos.y,apply:(b,l)=>{b.speed*=(1+0.03*l);},desc:l=>`移動速度 +${Math.round(3*l)}%`};

const t_knockback_pos=P(t_hp_pos,-70,170);
const t_knockback={id:'t_knockback',category:'token',name:'ノックバック力',icon:'☄',maxLv:10,baseCost:10,growth:1.2,parent:'t_hp',
  x:t_knockback_pos.x,y:t_knockback_pos.y,apply:(b,l)=>{b.knockback+=8*l;},desc:l=>`ノックバック力 +${8*l}`};

const TOKEN_NODES=[t_dmg,t_aspd,t_crit,t_hp,t_range,t_tokendrop,t_speed,t_knockback];
function tokenTotalLevels(){ let s=0; TOKEN_NODES.forEach(n=>{ s+=gameData.tokenLevels[n.id]||0; }); return s; }

/* ---- 7 special skill branches (skill stars), each derives from a token node ---- */
function buildBranch(tokenId,tokenPos,angleDeg,defs){
  const rootPos=P(tokenPos,angleDeg,170);
  const root=Object.assign({},defs.root,{category:'build',parent:tokenId,tier:'root',x:rootPos.x,y:rootPos.y});
  const midAPos=P(rootPos,angleDeg-22,160);
  const midA=Object.assign({},defs.midA,{category:'build',parent:root.id,tier:'mid',x:midAPos.x,y:midAPos.y});
  const midBPos=P(rootPos,angleDeg+22,160);
  const midB=Object.assign({},defs.midB,{category:'build',parent:root.id,tier:'mid',x:midBPos.x,y:midBPos.y});
  const capPos=P(rootPos,angleDeg,330);
  const capstone=Object.assign({},defs.capstone,{category:'build',parent:midA.id,tier:'capstone',x:capPos.x,y:capPos.y,
    req:{id:midA.id,lvl:2,id2:midB.id,lvl2:2}});
  const ultPos=P(rootPos,angleDeg,480);
  const ultimate=Object.assign({},defs.ultimate,{category:'build',parent:capstone.id,tier:'ultimate',x:ultPos.x,y:ultPos.y,
    req:{id:capstone.id,lvl:4}});
  return [root,midA,midB,capstone,ultimate];
}

const mageBranch=buildBranch('t_range',t_range_pos,-170,{
  root:{id:'mg_root',name:'魔術適性',icon:'✦',maxLv:5,baseCost:1,growth:1.3,apply:(b,l)=>{b.mageUnlocked=true;b.chainCount+=l;b.mageDmg+=3*l;},desc:l=>`連鎖雷習得(連鎖${l})`},
  midA:{id:'mg_chain',name:'増幅コイル',icon:'⚡',maxLv:4,baseCost:5,growth:1.35,apply:(b,l)=>{b.chainCount+=l;},desc:l=>`連鎖数 +${l}`},
  midB:{id:'mg_fireball',name:'業火の秘術',icon:'🔥',maxLv:5,baseCost:6,growth:1.32,apply:(b,l)=>{b.fireballRadius+=18*l;b.fireballDmg+=5*l;},desc:l=>`範囲+${18*l} 威力+${5*l}`},
  capstone:{id:'mg_capstone',name:'アークメイジ',icon:'☀',maxLv:8,baseCost:10,growth:1.5,apply:(b,l)=>{b.mageDmgMult*=mult(l,1.32);},desc:l=>`魔法倍率 x${mult(l,1.32).toFixed(2)}`},
  ultimate:{id:'mg_ultimate',name:'大魔導',icon:'☀',maxLv:5,baseCost:40,growth:1.6,apply:(b,l)=>{b.chainCount+=Math.floor(l/2);b.mageDmgMult*=mult(l,1.25);},desc:l=>`連鎖+${Math.floor(l/2)} 倍率x${mult(l,1.25).toFixed(2)}`},
});

const droneBranch=buildBranch('t_tokendrop',t_tokendrop_pos,-130,{
  root:{id:'dr_root',name:'ドローン起動',icon:'◈',maxLv:1,baseCost:2,growth:1.5,apply:(b,l)=>{b.droneCount+=1;b.droneDmg+=3;},desc:l=>`自律ドローンを1機展開`},
  midA:{id:'dr_cd',name:'再突入プロトコル短縮',icon:'◈',maxLv:5,baseCost:5,growth:1.3,apply:(b,l)=>{b.droneCdReduce+=0.08*l;},desc:l=>`ドローン攻撃CD短縮 -${(0.08*l).toFixed(2)}s`},
  midB:{id:'dr_count',name:'量産ライン',icon:'◈',maxLv:4,baseCost:6,growth:1.4,apply:(b,l)=>{b.droneCount+=l;},desc:l=>`ドローン数 +${l}`},
  capstone:{id:'dr_capstone',name:'AI最適化',icon:'◉',maxLv:8,baseCost:11,growth:1.5,apply:(b,l)=>{b.droneDmgMult*=mult(l,1.32);},desc:l=>`ドローン倍率 x${mult(l,1.32).toFixed(2)}`},
  ultimate:{id:'dr_ultimate',name:'ドローンスウォーム',icon:'◉',maxLv:5,baseCost:42,growth:1.6,apply:(b,l)=>{b.droneCount+=Math.floor(l/2);b.droneDmgMult*=mult(l,1.25);},desc:l=>`数+${Math.floor(l/2)} 倍率x${mult(l,1.25).toFixed(2)}`},
});

const chemicalBranch=buildBranch('t_crit',t_crit_pos,-45,{
  root:{id:'ch_root',name:'高化学兵器適性',icon:'☣',maxLv:5,baseCost:1,growth:1.3,apply:(b,l)=>{b.statusChance+=0.06*l;},desc:l=>`状態異常付与率 +${Math.round(6*l)}%`},
  midA:{id:'ch_poison',name:'猛毒コーティング',icon:'🧪',maxLv:5,baseCost:4,growth:1.3,apply:(b,l)=>{b.poisonDmg+=2*l;},desc:l=>`毒ダメージ/tick +${2*l}`},
  midB:{id:'ch_frost',name:'凍傷誘発剤',icon:'❄',maxLv:5,baseCost:6,growth:1.32,apply:(b,l)=>{b.frostSlow+=0.08*l;},desc:l=>`敵鈍足 +${Math.round(8*l)}%`},
  capstone:{id:'ch_capstone',name:'疫病の権化',icon:'☠',maxLv:8,baseCost:10,growth:1.5,apply:(b,l)=>{b.statusDmgMult*=mult(l,1.32);},desc:l=>`状態異常倍率 x${mult(l,1.32).toFixed(2)}`},
  ultimate:{id:'ch_ultimate',name:'終末瘴気',icon:'☣',maxLv:5,baseCost:40,growth:1.6,apply:(b,l)=>{b.statusChance+=0.05*l;b.statusDmgMult*=mult(l,1.25);},desc:l=>`付与率+${Math.round(5*l)}% 倍率x${mult(l,1.25).toFixed(2)}`},
});

const boxerBranch=buildBranch('t_crit',t_crit_pos,-15,{
  root:{id:'bx_root',name:'闘士の誓い',icon:'✊',maxLv:1,baseCost:2,growth:1.5,apply:(b,l,base)=>{b.boxerMode=true;base.range*=0.6;base.atkSpd*=0.85;b.boxerDmg+=5;},desc:l=>`バットを捨て拳装備`},
  midA:{id:'bx_power',name:'鋼拳',icon:'✊',maxLv:5,baseCost:5,growth:1.32,apply:(b,l)=>{b.boxerDmg+=6*l;},desc:l=>`拳威力 +${6*l}`},
  midB:{id:'bx_combo',name:'連撃技術',icon:'✊',maxLv:5,baseCost:6,growth:1.32,apply:(b,l)=>{b.boxerCombo+=0.2*l;},desc:l=>`連撃倍率 +${Math.round(20*l)}%`},
  capstone:{id:'bx_capstone',name:'限界突破',icon:'☄',maxLv:8,baseCost:12,growth:1.55,apply:(b,l)=>{b.boxerDmgMult*=mult(l,1.35);},desc:l=>`拳倍率 x${mult(l,1.35).toFixed(2)}`},
  ultimate:{id:'bx_ultimate',name:'神速の拳',icon:'☄',maxLv:5,baseCost:45,growth:1.65,apply:(b,l)=>{b.boxerCombo+=0.15*l;b.boxerDmgMult*=mult(l,1.28);},desc:l=>`連撃+${Math.round(15*l)}% 倍率x${mult(l,1.28).toFixed(2)}`},
});

const bowBranch=buildBranch('t_speed',t_speed_pos,-110,{
  root:{id:'bo_root',name:'弓術取得',icon:'➶',maxLv:5,baseCost:1,growth:1.3,apply:(b,l)=>{b.bowUnlocked=true;b.arrowDmg+=2*l;},desc:l=>`弓習得 威力+${2*l}`},
  midA:{id:'bo_multi',name:'マルチノック',icon:'➶',maxLv:4,baseCost:5,growth:1.35,apply:(b,l)=>{b.arrowCount+=l;},desc:l=>`同時発射数 +${l}`},
  midB:{id:'bo_dmg',name:'鏃強化',icon:'➶',maxLv:5,baseCost:6,growth:1.3,apply:(b,l)=>{b.arrowDmg+=3*l;},desc:l=>`矢威力 +${3*l}`},
  capstone:{id:'bo_capstone',name:'乱れ撃ち',icon:'➹',maxLv:8,baseCost:10,growth:1.5,apply:(b,l)=>{b.bowDmgMult*=mult(l,1.32);},desc:l=>`弓倍率 x${mult(l,1.32).toFixed(2)}`},
  ultimate:{id:'bo_ultimate',name:'千本乱舞',icon:'➹',maxLv:5,baseCost:40,growth:1.6,apply:(b,l)=>{b.arrowCount+=Math.floor(l/2);b.bowDmgMult*=mult(l,1.25);},desc:l=>`発射数+${Math.floor(l/2)} 倍率x${mult(l,1.25).toFixed(2)}`},
});

const immunityBranch=buildBranch('t_knockback',t_knockback_pos,-85,{
  root:{id:'im_root',name:'免疫適性',icon:'🛡',maxLv:5,baseCost:1,growth:1.3,apply:(b,l)=>{b.dmgReduction+=0.02*l;},desc:l=>`被ダメージ軽減 +${Math.round(2*l)}%`},
  midA:{id:'im_cleanse',name:'自動解毒',icon:'🛡',maxLv:5,baseCost:4,growth:1.3,apply:(b,l)=>{b.dmgReduction+=0.015*l;},desc:l=>`被ダメージ軽減 +${(1.5*l).toFixed(1)}%`},
  midB:{id:'im_resist',name:'状態異常耐性',icon:'🛡',maxLv:5,baseCost:5,growth:1.3,apply:(b,l)=>{b.dmgReduction+=0.02*l;},desc:l=>`被ダメージ軽減 +${Math.round(2*l)}%`},
  capstone:{id:'im_capstone',name:'完全適応',icon:'✝',maxLv:8,baseCost:11,growth:1.5,apply:(b,l)=>{b.dmgReductionMult*=mult(l,1.25);},desc:l=>`軽減倍率 x${mult(l,1.25).toFixed(2)}`},
  ultimate:{id:'im_ultimate',name:'不滅の免疫',icon:'✝',maxLv:5,baseCost:40,growth:1.6,apply:(b,l)=>{b.dmgReduction+=0.03*l;b.dmgReductionMult*=mult(l,1.2);},desc:l=>`軽減+${Math.round(3*l)}% 倍率x${mult(l,1.2).toFixed(2)}`},
});

const vitalityBranch=buildBranch('t_knockback',t_knockback_pos,-55,{
  root:{id:'vt_root',name:'耐久適性',icon:'🛡',maxLv:5,baseCost:1,growth:1.3,apply:(b,l)=>{b.dmgReduction+=0.03*l;},desc:l=>`被ダメージ軽減 +${Math.round(3*l)}%`},
  midA:{id:'vt_hp',name:'強化外殻',icon:'🛡',maxLv:6,baseCost:5,growth:1.3,apply:(b,l)=>{b.vitHp+=25*l;},desc:l=>`最大HP +${25*l}`},
  midB:{id:'vt_shield',name:'緊急衝撃波',icon:'⊙',maxLv:3,baseCost:8,growth:1.4,apply:(b,l)=>{b.shieldEnabled=true;b.shieldCdReduce+=3*l;},desc:l=>`HP30%以下で緊急シールド発動 (CD-${3*l}s)`},
  capstone:{id:'vt_capstone',name:'不屈の意志',icon:'✝',maxLv:8,baseCost:12,growth:1.5,apply:(b,l)=>{b.dmgReductionMult*=mult(l,1.3);},desc:l=>`軽減倍率 x${mult(l,1.3).toFixed(2)}`},
  ultimate:{id:'vt_ultimate',name:'鋼鉄の心臓',icon:'✝',maxLv:5,baseCost:42,growth:1.6,apply:(b,l)=>{b.vitHp+=30*l;b.dmgReductionMult*=mult(l,1.25);},desc:l=>`最大HP+${30*l} 倍率x${mult(l,1.25).toFixed(2)}`},
});

const BUILD_NODES=[...mageBranch,...droneBranch,...chemicalBranch,...boxerBranch,...bowBranch,...immunityBranch,...vitalityBranch];
const ALL_NODES=[...TOKEN_NODES,...BUILD_NODES];
function findNode(id){ return ALL_NODES.find(n=>n.id===id); }

function getLevel(node){
  if(node.category==='token') return gameData.tokenLevels[node.id]||0;
  const slot=gameData.slots[gameData.activeSlot];
  return (slot.build&&slot.build[node.id])||0;
}
function isOwned(node){ return node && getLevel(node)>0; }
function isVisible(node){
  if(node.category==='token') return node.parent==='core' || isOwned(findNode(node.parent));
  if(!isOwned(findNode(node.parent))) return false;
  if(node.tier==='root') return tokenTotalLevels()>=GATE_THRESHOLD;
  return true;
}
function reqMet(node){
  if(!node.req) return true;
  if(getLevel(findNode(node.req.id))<node.req.lvl) return false;
  if(node.req.id2 && getLevel(findNode(node.req.id2))<node.req.lvl2) return false;
  return true;
}
function canAfford(node){
  const lvl=getLevel(node);
  if(lvl>=node.maxLv || !reqMet(node)) return false;
  const cost=costAt(node,lvl);
  return node.category==='token'? gameData.tokens>=cost : gameData.skillStars>=cost;
}
function buyNode(node){
  const lvl=getLevel(node);
  if(lvl>=node.maxLv || !isVisible(node) || !reqMet(node)) return;
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
  const base={maxHp:100,damage:1,range:70,atkSpd:1.0,speed:180,regen:0,magnet:40,crit:0.05,knockback:0,tokenMul:1};
  const build={statusChance:0,statusDmgMult:1,poisonDmg:0,frostSlow:0,
    bowUnlocked:false,arrowCount:1,arrowDmg:0,bowDmgMult:1,
    boxerMode:false,boxerDmg:0,boxerCombo:1,boxerDmgMult:1,
    mageUnlocked:false,chainCount:0,mageDmg:0,mageDmgMult:1,fireballRadius:0,fireballDmg:0,
    vitHp:0,dmgReduction:0,dmgReductionMult:1,shieldEnabled:false,shieldCdReduce:0,
    droneCount:0,droneDmg:0,droneDmgMult:1,droneCdReduce:0};
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
    } else { hoverCheck(e.offsetX,e.offsetY); }
  }
  function onUp(e){ if(!dragged) handleClick(e.offsetX,e.offsetY); dragging=false; }
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
  function handleClick(sx,sy){ const n=hitNode(sx,sy); if(n) buyNode(n); }
  function hoverCheck(sx,sy){
    const n=hitNode(sx,sy);
    hideTooltip();
    if(n && isVisible(n)){
      const lvl=getLevel(n);
      tooltipEl=document.createElement('div'); tooltipEl.className='st-tooltip';
      if(lvl>0){
        const cost=lvl<n.maxLv?`次コスト:${costAt(n,lvl)} ${n.category==='token'?'トークン':'スター'}`:'MAX';
        tooltipEl.innerHTML=`<b>${n.name}</b><br>${n.desc(lvl)}<br>${cost}`;
      } else {
        tooltipEl.innerHTML=`<b>？？？</b><br>解放コスト: ${costAt(n,0)} ${n.category==='token'?'トークン':'スター'}`;
      }
      document.body.appendChild(tooltipEl);
      tooltipEl.style.left=(sx+16)+'px'; tooltipEl.style.top=(sy+8)+'px';
    }
  }
  function hideTooltip(){ if(tooltipEl){ tooltipEl.remove(); tooltipEl=null; } }
  function render(){
    ctx.save(); ctx.fillStyle='#04050a'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(0,255,242,0.05)'; ctx.lineWidth=1;
    const gridStep=80*view.scale;
    const originX=(W/2+view.offsetX*view.scale)%gridStep, originY=(H/2+view.offsetY*view.scale)%gridStep;
    for(let x=originX;x<W;x+=gridStep){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=originY;y<H;y+=gridStep){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    ALL_NODES.forEach(n=>{
      if(!isVisible(n)) return;
      const parentPos = n.parent==='core'? worldToScreen(0,0) : nodeScreenPos(findNode(n.parent));
      const myPos=nodeScreenPos(n);
      const owned=isOwned(n);
      ctx.strokeStyle= owned? 'rgba(255,0,229,0.7)' : 'rgba(120,130,160,0.35)';
      ctx.lineWidth = owned?3:1.5;
      ctx.beginPath(); ctx.moveTo(parentPos.x,parentPos.y); ctx.lineTo(myPos.x,myPos.y); ctx.stroke();
    });

    const corePos=worldToScreen(0,0);
    ctx.save(); ctx.shadowColor='#fff'; ctx.shadowBlur=24*view.scale;
    ctx.fillStyle='#101830'; ctx.strokeStyle='#fff'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(corePos.x,corePos.y,34*view.scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font=`${12*view.scale}px Consolas`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('CORE',corePos.x,corePos.y);
    ctx.restore();

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
