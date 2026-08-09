/* skilltree.js（全文更新：CORE表示12項目・攻撃力表記変更、装甲強化テキスト修正、6色ノードカラー＆遠近ロック判定、弓術ビルド再構築、CORE hover表示） */

/* ---- Wave1〜50想定累計トークン（Ultimateコスト計算用、既存値を流用） ---- */
function sumWaveTokens(waves){ let s=0; for(let w=1;w<=waves;w++) s+=w*15; return s; }
const TOKENS_50WAVES_1ROUND=sumWaveTokens(50);
const TOKENS_50WAVES_2ROUNDS=TOKENS_50WAVES_1ROUND*2;

/* ---- 装甲強化ノード テキスト修正 ---- */
/* vitalityBranch内 armorDeriv の定義を以下に置き換え */
const armorDerivFix={
  line2:'ダメージを無効化するシールドを持つ',
  line3:l=> l>0 ? 'HP30%以下の時に発動するシールドを取得' : 'HP30%以下の時に発動するシールドを取得'
};
/* 既存の armorDeriv オブジェクト生成部分の line2/line3 プロパティを armorDerivFix の値で上書き */
armorDeriv.line2=armorDerivFix.line2;
armorDeriv.line3=armorDerivFix.line3;
armorDeriv.name='装甲強化';

/* ---- 弓術ビルド 再構築 ---- */
function bowCostGrowth(maxLv,startCost,endCost){ return Math.pow(endCost/startCost, 1/(maxLv-1)); }

const bowBranch=(function(){
  const gateP=organicPlace(t_speed_pos,-110,180,230,tierRadius('gate'));
  const gate={id:'bo_gate',costType:'token',scope:'slot',parent:'t_speed',tier:'gate',isGate:true,
    name:'弓術取得',icon:'➶',maxLv:1,baseCost:600,growth:1,x:gateP.x,y:gateP.y,
    apply:(b,l)=>{b.bowUnlocked=true;},
    line2:'バットを捨てホログラムサイバーボウを装備',
    line3:l=>'1.5秒毎に自動で矢を発射する'};
  const gateStarCost=1;
  gate.starCost=gateStarCost;

  const multishotP=organicPlace(gateP,-26,150,190,tierRadius('deriv'));
  const multishot={id:'bo_multishot',costType:'star',scope:'slot',parent:'bo_gate',tier:'deriv',
    name:'連射弓',icon:'➶',maxLv:1,baseCost:1,growth:1,x:multishotP.x,y:multishotP.y,
    apply:(b,l)=>{b.arrowCount=(b.arrowCount||1)+1;},
    line2:'同時に放つ矢の数が増加',line3:l=>'矢の数+1'};

  const multiP=organicPlace(multishotP,-40,130,160,tierRadius('upgrade'));
  const MULTI_MAXLV=5;
  const multi={id:'bo_multi',costType:'token',scope:'slot',parent:'bo_multishot',tier:'upgrade',
    name:'マルチノック',icon:'➶',maxLv:MULTI_MAXLV,baseCost:300,growth:bowCostGrowth(MULTI_MAXLV,300,12000),
    x:multiP.x,y:multiP.y,apply:(b,l)=>{b.arrowCount=(b.arrowCount||1)+l;},
    line2:'矢の数がさらに増加',line3:l=>`矢の数+${l}`};

  const barbP=organicPlace(multishotP,-8,130,160,tierRadius('upgrade'));
  const BARB_MAXLV=6;
  const barb={id:'bo_dmg',costType:'token',scope:'slot',parent:'bo_multishot',tier:'upgrade',
    name:'鏃強化',icon:'➶',maxLv:BARB_MAXLV,baseCost:200,growth:bowCostGrowth(BARB_MAXLV,200,10000),
    x:barbP.x,y:barbP.y,apply:(b,l)=>{b.bowDmgMult=(b.bowDmgMult||1)+ (1.8*l/BARB_MAXLV);},
    line2:'矢の攻撃倍率が上昇',line3:l=>`攻撃倍率+${Math.round(180*l/BARB_MAXLV)}%`};

  const gravP=organicPlace(barbP,-8,120,150,tierRadius('upgrade'));
  const gravBolt={id:'bo_gravbolt',costType:'star',scope:'slot',parent:'bo_dmg',tier:'upgrade',
    name:'過重力ボルト',icon:'➶',maxLv:1,baseCost:1,growth:1,x:gravP.x,y:gravP.y,
    req:{id:'bo_dmg',lvl:BARB_MAXLV},
    apply:(b,l)=>{b.bowDmgMult=(b.bowDmgMult||1)+0.7;},
    line2:'矢の攻撃倍率がさらに大幅上昇',line3:l=>'攻撃倍率+70%（合計+250%）'};

  const precisionP=organicPlace(gateP,26,150,190,tierRadius('deriv'));
  const precision={id:'bo_precision',costType:'star',scope:'slot',parent:'bo_gate',tier:'deriv',
    name:'精密射撃',icon:'➶',maxLv:1,baseCost:1,growth:1,x:precisionP.x,y:precisionP.y,
    apply:(b,l)=>{b.arrowPierce=(b.arrowPierce||0)+1;},
    line2:'矢が敵を貫通するようになる',line3:l=>'貫通数+1'};

  const pierceP=organicPlace(precisionP,8,130,160,tierRadius('upgrade'));
  const PIERCE_MAXLV=4;
  const pierce={id:'bo_pierce',costType:'token',scope:'slot',parent:'bo_precision',tier:'upgrade',
    name:'貫通鏃',icon:'➶',maxLv:PIERCE_MAXLV,baseCost:150,growth:bowCostGrowth(PIERCE_MAXLV,150,9000),
    x:pierceP.x,y:pierceP.y,apply:(b,l)=>{b.arrowPierce=(b.arrowPierce||0)+l;},
    line2:'貫通する敵の数が増加',line3:l=>`貫通数+${l}`};

  const rapidP=organicPlace(precisionP,40,130,160,tierRadius('upgrade'));
  const RAPID_MAXLV=7;
  const rapid={id:'bo_speed',costType:'token',scope:'slot',parent:'bo_precision',tier:'upgrade',
    name:'速射訓練',icon:'➶',maxLv:RAPID_MAXLV,baseCost:400,growth:bowCostGrowth(RAPID_MAXLV,400,11000),
    x:rapidP.x,y:rapidP.y,apply:(b,l)=>{b.bowFireInterval=1.5-(0.7*l/RAPID_MAXLV);},
    line2:'矢の発射間隔が短縮',line3:l=>`発射間隔 ${(1.5-0.7*l/RAPID_MAXLV).toFixed(2)}秒`};

  const capP=organicPlace(gateP,0,340,400,tierRadius('capstone'),12);
  const capstone={id:'bo_capstone',costType:'star',scope:'slot',parent:'bo_multishot',tier:'capstone',
    name:'乱れ撃ち',icon:'➹',maxLv:1,baseCost:4,growth:1,x:capP.x,y:capP.y,
    derivReq:{ids:['bo_multishot','bo_precision'],needCount:2},
    apply:(b,l)=>{b.bowDmgMult=(b.bowDmgMult||1)+0.6;},
    line2:'弓の全ダメージが大幅上昇',line3:l=>'攻撃倍率+60%'};

  const legP=organicPlace(capP,-24,180,230,tierRadius('legend'));
  const legend={id:'bo_legend',costType:'star',scope:'slot',parent:'bo_capstone',tier:'legend',
    name:'アストラ・アロー',icon:'✝',maxLv:1,baseCost:5,growth:1,x:legP.x,y:legP.y,
    req:{id:'bo_capstone',lvl:1},apply:(b,l)=>{b.legendBow=true;},
    line2:'画面を貫く超巨大な光の矢',line3:l=>'進路上のすべてを消滅させる'};

  const ultP=organicPlace(capP,24,180,230,tierRadius('ultimate'));
  const ultimate={id:'bo_ultimate',costType:'token',scope:'slot',parent:'bo_capstone',tier:'ultimate',
    name:'百鬼夜行',icon:'➹',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,x:ultP.x,y:ultP.y,
    req:{id:'bo_capstone',lvl:1},apply:(b,l)=>{b.arrowCount=(b.arrowCount||1)+2;b.bowDmgMult=(b.bowDmgMult||1)+0.3;},
    line2:'発射数と威力が最大まで強化',line3:l=>'矢の数+2 攻撃倍率+30%'};

  return [gate,multishot,multi,barb,gravBolt,precision,pierce,rapid,capstone,legend,ultimate];
})();

/* ---- 前座ゲートのトークン+スター複合コスト対応: buyNode をゲート専用に拡張 ---- */
function buyNode(node){
  if(nodeState(node)!=='unlockable') return false;
  const lvl=getLevel(node);
  const cost=costAt(node,lvl);
  if(node.tier==='gate' && node.starCost){
    if(gameData.tokens<cost || gameData.skillStars<node.starCost) return false;
    gameData.tokens-=cost; gameData.skillStars-=node.starCost;
  } else if(node.costType==='token'){
    if(gameData.tokens<cost) return false;
    gameData.tokens-=cost;
  } else {
    if(gameData.skillStars<cost) return false;
    gameData.skillStars-=cost;
  }
  if(node.scope==='global'){ gameData.tokenLevels[node.id]=lvl+1; }
  else {
    const slot=gameData.slots[gameData.activeSlot];
    if(!slot.build) slot.build={};
    slot.build[node.id]=lvl+1;
  }
  AudioEngine.SE.unlock();
  SkillTree.triggerUnlockFx(node.id);
  saveGame();
  if(window.onCurrencyChange) window.onCurrencyChange();
  return true;
}
function canAfford(node){
  if(nodeState(node)!=='unlockable') return false;
  const lvl=getLevel(node);
  const cost=costAt(node,lvl);
  if(node.tier==='gate' && node.starCost) return gameData.tokens>=cost && gameData.skillStars>=node.starCost;
  return node.costType==='token'? gameData.tokens>=cost : gameData.skillStars>=cost;
}

/* ---- 遠近ロック判定つきノード状態（6色対応） ----
   locked-far   : 2つ以上奥（親の親も未解放）
   locked-near  : 直前（親は解放済みだが本ノードの条件未達）
   poor         : 解放条件は満たすがコスト不足
   rich         : 購入可能
   maxed        : レベルMAX
   gate-owned   : 前座ゲート解放済み
*/
function nodeState(node){
  if(node.parent==='core'){ return getLevel(node)>=node.maxLv? 'maxed':'unlockable'; }
  const parent=findNode(node.parent);
  const parentOwned = node.tier==='capstone'? (node.derivReq? reqMetCap(node):isOwned(parent)) : isOwned(parent);
  if(!parentOwned){
    if(node.tier==='capstone'){
      const anyDerivOwned=node.derivReq.ids.some(id=>isOwned(findNode(id)));
      return anyDerivOwned? 'locked-near':'locked-far';
    }
    const grandOwned = parent && (parent.parent==='core' || isOwned(findNode(parent.parent)));
    return grandOwned? 'locked-near':'locked-far';
  }
  if(node.tier==='gate'){
    if(tokenTotalLevels()<GATE_THRESHOLD) return 'locked-near';
  } else if(node.req && getLevel(findNode(node.req.id))<node.req.lvl){
    return 'locked-near';
  } else if(node.groupReq){
    const sum=node.groupReq.ids.reduce((s,id)=>s+getLevel(findNode(id)),0);
    if(sum<node.groupReq.total) return 'locked-near';
  }
  if(getLevel(node)>=node.maxLv) return 'maxed';
  return 'unlockable';
}
function reqMetCap(node){
  const count=node.derivReq.ids.filter(id=>isOwned(findNode(id))).length;
  return count>=node.derivReq.needCount;
}
function isVisible(node){ return true; } /* locked-far も描画対象（暗いグレーで表示） */

const NODE_COLOR_MAP={
  lockedFar:'#3A3F58', lockedNear:'#8A99AD', poor:'#FF5533',
  rich:'#00F0FF', maxed:'#FFE600', gate:'#FF007F'
};
function resolveNodeColor(n,st,lvl){
  if(st==='locked-far') return NODE_COLOR_MAP.lockedFar;
  if(st==='locked-near') return NODE_COLOR_MAP.lockedNear;
  if(st==='maxed') return NODE_COLOR_MAP.maxed;
  if(n.tier==='gate' && lvl>0) return NODE_COLOR_MAP.gate;
  if(st==='unlockable') return canAfford(n)? NODE_COLOR_MAP.rich : NODE_COLOR_MAP.poor;
  return NODE_COLOR_MAP.lockedFar;
}

/* ---- SkillTree: 描画順（線→円）、ノード重なり回避、CORE hoverでカーソル&ハイライト表示 ---- */
const SkillTree=(function(){
  let view={scale:0.5,offsetX:0,offsetY:0};
  let dragging=false,lastX=0,lastY=0,dragged=false;
  let animScale={}, unlockFx={}, hoverId=null, selectedId=null, hoverCore=false;
  let touch={mode:null,lastMidX:0,lastMidY:0,lastDist:0};

  function worldToScreen(x,y){ return {x:W/2+(x+view.offsetX)*view.scale, y:H/2+(y+view.offsetY)*view.scale}; }
  function screenToWorld(sx,sy){ return {x:(sx-W/2)/view.scale-view.offsetX, y:(sy-H/2)/view.scale-view.offsetY}; }
  function reset(){ view.scale=0.5; view.offsetX=0; view.offsetY=0; animScale={}; unlockFx={}; hoverId=null; selectedId=null; hoverCore=false; closePanel(); }

  function zoomAt(sx,sy,factor){
    const before=screenToWorld(sx,sy);
    view.scale=Math.max(0.12,Math.min(1.8, view.scale*factor));
    const after=screenToWorld(sx,sy);
    view.offsetX+=(after.x-before.x); view.offsetY+=(after.y-before.y);
  }
  function panBy(dx,dy){ view.offsetX+=dx/view.scale; view.offsetY+=dy/view.scale; }
  function onWheel(e){ e.preventDefault(); zoomAt(e.offsetX,e.offsetY, e.deltaY<0?1.1:0.9); }
  function onDown(e){ dragging=true; dragged=false; lastX=e.clientX; lastY=e.clientY; }
  function onMove(e){
    if(dragging){
      const dx=e.clientX-lastX, dy=e.clientY-lastY;
      if(Math.abs(dx)>2||Math.abs(dy)>2) dragged=true;
      panBy(dx,dy); lastX=e.clientX; lastY=e.clientY;
    } else { hoverCheck(e.offsetX,e.offsetY); }
  }
  function onUp(e){ dragging=false; }

  function touchDist(t){ return Math.hypot(t[0].clientX-t[1].clientX, t[0].clientY-t[1].clientY); }
  function touchMid(t){ return {x:(t[0].clientX+t[1].clientX)/2, y:(t[0].clientY+t[1].clientY)/2}; }
  function onTouchStart(e){
    e.preventDefault();
    if(e.touches.length===1){ touch.mode='pan'; dragged=false; touch.lastX=e.touches[0].clientX; touch.lastY=e.touches[0].clientY; }
    else if(e.touches.length>=2){ touch.mode='pinch'; touch.lastDist=touchDist(e.touches); const mid=touchMid(e.touches); touch.lastMidX=mid.x; touch.lastMidY=mid.y; }
  }
  function onTouchMove(e){
    e.preventDefault();
    const rect=canvas.getBoundingClientRect();
    if(touch.mode==='pan' && e.touches.length===1){
      const dx=e.touches[0].clientX-touch.lastX, dy=e.touches[0].clientY-touch.lastY;
      if(Math.abs(dx)>2||Math.abs(dy)>2) dragged=true;
      panBy(dx,dy); touch.lastX=e.touches[0].clientX; touch.lastY=e.touches[0].clientY;
    } else if(touch.mode==='pinch' && e.touches.length>=2){
      const newDist=touchDist(e.touches); const mid=touchMid(e.touches);
      const mx=mid.x-rect.left, my=mid.y-rect.top;
      if(touch.lastDist>0) zoomAt(mx,my, newDist/touch.lastDist);
      panBy(mid.x-touch.lastMidX, mid.y-touch.lastMidY);
      touch.lastDist=newDist; touch.lastMidX=mid.x; touch.lastMidY=mid.y;
    }
  }
  function onTouchEnd(e){
    if(touch.mode==='pan' && !dragged && e.changedTouches.length===1){
      const rect=canvas.getBoundingClientRect();
      handleTap(e.changedTouches[0].clientX-rect.left, e.changedTouches[0].clientY-rect.top);
    }
    if(e.touches.length===0){ touch.mode=null; hoverId=null; hoverCore=false; canvas.style.cursor='default'; }
    else if(e.touches.length===1){ touch.mode='pan'; touch.lastX=e.touches[0].clientX; touch.lastY=e.touches[0].clientY; }
  }

  function nodeScreenPos(n){ return worldToScreen(n.x,n.y); }
  function nodeBaseRadius(n){ return tierRadius(n.tier); }
  function nodeRadius(n){ const s=animScale[n.id]||1; return nodeBaseRadius(n)*view.scale*s; }
  function hitNode(sx,sy){
    for(const n of ALL_NODES){
      const p=nodeScreenPos(n); const r=nodeRadius(n);
      if(Math.hypot(sx-p.x,sy-p.y)<=r) return n;
    }
    return null;
  }
  function hitCoreLocal(sx,sy){
    const corePos=worldToScreen(0,0);
    return Math.hypot(sx-corePos.x,sy-corePos.y)<=34*view.scale;
  }

  function handleTap(sx,sy){
    if(dragging && dragged) return;
    if(hitCoreLocal(sx,sy)){ openCoreModal(); return; }
    const n=hitNode(sx,sy);
    if(!n){ selectedId=null; closePanel(); return; }
    const st=nodeState(n);
    if(selectedId===n.id){
      if(st==='unlockable'){ buyNode(n); openPanel(n); }
    } else { selectedId=n.id; openPanel(n); }
  }
  function openPanel(n){
    const panel=document.getElementById('skillNodePanel'); if(!panel) return;
    const st=nodeState(n);
    const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
    const isFogged = st==='locked-far'||st==='locked-near';
    set('snpName', isFogged?'？？？':n.name);
    set('snpDesc', isFogged?'':n.line2);
    const lvl=getLevel(n);
    set('snpCurrent', lvl>0?(typeof n.line3==='function'?n.line3(lvl):n.line3):'なし');
    const nextLvl=Math.min(n.maxLv,lvl+1);
    set('snpNext', st==='unlockable'?(typeof n.line3==='function'?n.line3(nextLvl):n.line3):(st==='maxed'?'最大解放済み':'解放条件未達成'));
    const cost=st==='maxed'?0:costAt(n,lvl);
    const costText = (n.tier==='gate'&&n.starCost) ? `${cost} ⬡ + ${n.starCost} ⭐` : `${cost} ${n.costType==='token'?'⬡ トークン':'⭐ スター'}`;
    set('snpCost', st==='maxed'?'MAX':costText);
    const btn=document.getElementById('snpConfirm');
    if(btn){
      btn.style.display = st==='unlockable'? 'block':'none';
      btn.onclick=()=>{ if(nodeState(n)==='unlockable'){ buyNode(n); openPanel(n); } };
    }
    const scr=nodeScreenPos(n);
    panel.style.left=Math.min(W-300,scr.x+30)+'px';
    panel.style.top=Math.min(H-160,Math.max(10,scr.y-60))+'px';
    panel.classList.remove('hidden');
  }
  function closePanel(){ const el=document.getElementById('skillNodePanel'); if(el) el.classList.add('hidden'); }
  function hoverCheck(sx,sy){
    const onCore=hitCoreLocal(sx,sy);
    if(onCore!==hoverCore){ hoverCore=onCore; if(onCore) AudioEngine.SE.pop(); }
    canvas.style.cursor = onCore? 'pointer':'default';
    if(onCore){ if(hoverId){ hoverId=null; } return; }
    const n=hitNode(sx,sy);
    const id=n?n.id:null;
    if(id!==hoverId){ hoverId=id; if(id) AudioEngine.SE.pop(); }
    canvas.style.cursor = id? 'pointer':'default';
  }
  function triggerUnlockFx(id){ unlockFx[id]=0.7; }
  function updateAnim(dt){
    ALL_NODES.forEach(n=>{
      const target=(n.id===hoverId||n.id===selectedId)?1.22:1;
      const cur=animScale[n.id]||1;
      animScale[n.id]=cur+(target-cur)*Math.min(1,dt*14);
    });
    Object.keys(unlockFx).forEach(id=>{ unlockFx[id]-=dt; if(unlockFx[id]<=0) delete unlockFx[id]; });
  }

  function render(dt){
    updateAnim(dt||0.016);
    ctx.save(); ctx.fillStyle='#04050a'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(0,255,242,0.05)'; ctx.lineWidth=1;
    const gridStep=80*view.scale;
    const originX=(W/2+view.offsetX*view.scale)%gridStep, originY=(H/2+view.offsetY*view.scale)%gridStep;
    for(let x=originX;x<W;x+=gridStep){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=originY;y<H;y+=gridStep){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    /* 1. 枝（線）をすべて先に描画 */
    ALL_NODES.forEach(n=>{
      const parentPos = n.parent==='core'? worldToScreen(0,0) : nodeScreenPos(findNode(n.parent));
      const myPos=nodeScreenPos(n);
      const owned=isOwned(n);
      ctx.strokeStyle= owned? 'rgba(255,0,229,0.7)' : 'rgba(120,130,160,0.3)';
      ctx.lineWidth = owned?3:1.5;
      ctx.beginPath(); ctx.moveTo(parentPos.x,parentPos.y); ctx.lineTo(myPos.x,myPos.y); ctx.stroke();
    });

    /* 2. CORE（hover時パルス強調でクリック可能を示す） */
    const corePos=worldToScreen(0,0);
    const corePulse = hoverCore ? (0.85+0.25*Math.sin(performance.now()/160)) : 1;
    ctx.save();
    ctx.shadowColor= hoverCore? '#00F0FF' : '#fff';
    ctx.shadowBlur=(hoverCore?36:24)*view.scale*corePulse;
    ctx.fillStyle= hoverCore? 'rgba(0,240,255,0.12)' : '#101830';
    ctx.strokeStyle= hoverCore? '#00F0FF' : '#fff'; ctx.lineWidth= hoverCore?4:3;
    ctx.beginPath(); ctx.arc(corePos.x,corePos.y,34*view.scale*(hoverCore?1.08:1),0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle= hoverCore? '#00F0FF' : '#fff'; ctx.font=`${12*view.scale}px Consolas`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('CORE',corePos.x,corePos.y-(hoverCore?4*view.scale:0));
    if(hoverCore){ ctx.font=`${8*view.scale}px Consolas`; ctx.fillText('TAP',corePos.x,corePos.y+10*view.scale); }
    ctx.restore();

    /* 3. すべてのノード（円）を後から描画 */
    ALL_NODES.forEach(n=>{
      const st=nodeState(n);
      const p=nodeScreenPos(n); const r=nodeRadius(n);
      const lvl=getLevel(n);
      let color=resolveNodeColor(n,st,lvl);
      if(n.id===selectedId) color='#fff';
      const pulsing = st==='locked-near' || (st==='unlockable' && lvl===0 && canAfford(n));
      const pulseScale = pulsing ? (0.85+0.15*Math.sin(performance.now()/220)) : 1;
      ctx.save();
      ctx.shadowColor=color; ctx.shadowBlur=(st!=='locked-far'?(pulsing?26:16):0)*view.scale*pulseScale;
      ctx.fillStyle='rgba(10,12,24,0.94)'; ctx.strokeStyle=color; ctx.lineWidth=(n.tier==='legend'||n.tier==='gate')?3.5:2.5;
      ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
      const isFogged= st==='locked-far'||st==='locked-near';
      ctx.fillStyle=color; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font=`${14*view.scale}px Consolas`;
      ctx.fillText(isFogged?'？':n.icon, p.x, p.y-6*view.scale);
      ctx.font=`${9*view.scale}px Consolas`;
      if(st==='maxed') ctx.fillText('MAX', p.x, p.y+9*view.scale);
      else if(st==='unlockable') ctx.fillText(lvl>0?`${lvl}/${n.maxLv}`:`${costAt(n,lvl)}`, p.x, p.y+9*view.scale);
      else if(isFogged) ctx.fillText(`${costAt(n,0)}`, p.x, p.y+9*view.scale);
      ctx.restore();

      if(unlockFx[n.id]!==undefined){
        const t=unlockFx[n.id]; const prog=1-Math.max(0,t/0.7);
        ctx.save(); ctx.globalAlpha=Math.max(0,1-prog);
        ctx.strokeStyle='#fff'; ctx.lineWidth=3*view.scale; ctx.shadowColor='#fff'; ctx.shadowBlur=20*view.scale;
        ctx.beginPath(); ctx.arc(p.x,p.y,r+prog*30*view.scale,0,Math.PI*2); ctx.stroke(); ctx.restore();
      }
    });
    ctx.restore();
    if(selectedId){
      const n=findNode(selectedId);
      if(n) openPanel(n); else { selectedId=null; closePanel(); }
    }
    const cb=document.getElementById('stTokens'); if(cb) cb.textContent=gameData.tokens;
    const csb=document.getElementById('stStars'); if(csb) csb.textContent=gameData.skillStars;
  }
  return {render,onWheel,onDown,onMove,onUp,onTouchStart,onTouchMove,onTouchEnd,reset,triggerUnlockFx,handleTap,
    _worldToScreen:worldToScreen,_scale:()=>view.scale};
})();

/* ---- CORE STATUS モーダル: 12項目、攻撃力は「素の数値 [倍率込み最終値]」表記 ---- */
function openCoreModal(){
  const modal=document.getElementById('coreModal'); if(!modal) return;
  const {base,build}=computePlayerStats();
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };

  const rawDamage=base.damage;
  const totalMult=(build.mageDmgMult||1)*(build.boxerDmgMult||1)*(build.bowDmgMult||1)*(build.gunnerDmgMult||1);
  const finalDamage=Math.round(rawDamage*totalMult);

  set('coreMaxHp', Math.round(base.maxHp+build.vitHp));
  set('coreRegen', ((build.regenEnabled? (base.regen+(build.regen||0)) : 0)).toFixed(2)+'/秒');
  set('coreDamage', `${rawDamage.toFixed(1)} [${finalDamage}]`);
  set('coreAtkSpd', base.atkSpd.toFixed(2)+'/秒');
  set('coreRange', Math.round(base.range));
  set('coreTokenDrop', ((base.tokenMul-1)*100>=0?'+':'')+Math.round((base.tokenMul-1)*100)+'%');
  set('coreSpeed', Math.round(base.speed));
  set('coreKnockback', Math.round(base.knockback));
  set('coreCrit', Math.round(base.crit*100)+'%');
  set('coreCritMult', (base.critMult||2.0).toFixed(2)+'x');
  set('coreTotalTokens', gameData.totalTokensEarned||0);
  set('coreTotalStars', gameData.totalStarsEarned||0);
  modal.classList.remove('hidden');
}
function closeCoreModal(){ const modal=document.getElementById('coreModal'); if(modal) modal.classList.add('hidden'); }
