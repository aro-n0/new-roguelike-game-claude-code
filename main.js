/* main.js */
const SAVE_KEY='neonDecaySaveV3';
function defaultSave(){
  return { tokens:0, skillStars:0, maxWave:0, tokenLevels:{},
    slots:[{name:'スロット1',build:{}},{name:'スロット2',build:{}},{name:'スロット3',build:{}},{name:'スロット4',build:{}},{name:'スロット5',build:{}}],
    activeSlot:0, milestonesClaimed:[], settings:{bgm:0.35,se:0.7} };
}
function loadGame(){
  try{
    const raw=localStorage.getItem(SAVE_KEY); if(!raw) return defaultSave();
    const p=JSON.parse(raw); const d=defaultSave();
    return { tokens:p.tokens||0, skillStars:p.skillStars||0, maxWave:p.maxWave||0, tokenLevels:p.tokenLevels||{},
      slots:(p.slots&&p.slots.length===5)?p.slots:d.slots, activeSlot:p.activeSlot||0,
      milestonesClaimed:p.milestonesClaimed||[], settings:Object.assign({bgm:0.35,se:0.7},p.settings||{}) };
  }catch(e){ return defaultSave(); }
}
let gameData=loadGame();
function saveGame(){ localStorage.setItem(SAVE_KEY, JSON.stringify(gameData)); }

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
let W=0,H=0;
function resize(){ canvas.width=window.innerWidth; canvas.height=window.innerHeight; W=canvas.width; H=canvas.height; }
window.addEventListener('resize',resize); resize();

function roundRectPath(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function norm(v){ const l=Math.hypot(v[0],v[1])||1; return [v[0]/l,v[1]/l]; }
function drawRoundedPolygon(cx,cy,radius,sides,rotation,cornerRadius){
  const pts=[]; for(let i=0;i<sides;i++){ const a=rotation+i*(Math.PI*2/sides); pts.push([cx+Math.cos(a)*radius,cy+Math.sin(a)*radius]); }
  ctx.beginPath();
  for(let i=0;i<pts.length;i++){
    const p0=pts[i],p1=pts[(i+1)%pts.length],p2=pts[(i+2)%pts.length];
    const v1=norm([p0[0]-p1[0],p0[1]-p1[1]]), v2=norm([p2[0]-p1[0],p2[1]-p1[1]]);
    const cut=Math.min(cornerRadius,radius*0.5);
    const s=[p1[0]+v1[0]*cut,p1[1]+v1[1]*cut], en=[p1[0]+v2[0]*cut,p1[1]+v2[1]*cut];
    if(i===0) ctx.moveTo(s[0],s[1]); else ctx.lineTo(s[0],s[1]);
    ctx.quadraticCurveTo(p1[0],p1[1],en[0],en[1]);
  }
  ctx.closePath();
}
function dist(x1,y1,x2,y2){ return Math.hypot(x1-x2,y1-y2); }
function pointToSegDist(px,py,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1; const len2=dx*dx+dy*dy||1;
  let t=((px-x1)*dx+(py-y1)*dy)/len2; t=Math.max(0,Math.min(1,t));
  return dist(px,py,x1+t*dx,y1+t*dy);
}
function damageTarget(e,amount){
  e.hp-=amount; e.hitFlash=0.12; AudioEngine.SE.hitEnemy(); spawnParticles(e.x,e.y,e.color||'#fff',4);
  if(e.hp<=0 && !e.dead){
    e.dead=true;
    const isBossPart = game.boss && (e===game.boss || (game.boss.children&&game.boss.children.includes(e)) || (game.boss.segs&&game.boss.segs.includes(e)));
    if(!isBossPart){ game.kills++; AudioEngine.SE.enemyDie(); spawnParticles(e.x,e.y,e.color,16); spawnChestMaybe(e.x,e.y); }
  }
}
function spawnChestMaybe(x,y){ if(Math.random()<0.005){ game.chests.push({x,y,r:16,phase:Math.random()*Math.PI*2,value:25+Math.floor(Math.random()*40)}); } }
function spawnParticles(x,y,color,count){
  for(let i=0;i<count;i++){
    const ang=Math.random()*Math.PI*2, spd=60+Math.random()*180;
    game.particles.push({x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,life:0.4+Math.random()*0.4,maxLife:0.6,color,size:2+Math.random()*3});
  }
}
function screenShake(a){ game.shake=Math.max(game.shake,a); }
function waveEnemyCount(wave){ return Math.round(10+(wave-1)*4.4); }

const keys={};
window.addEventListener('keydown',e=>{ keys[e.key.toLowerCase()]=true; });
window.addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; });

let screenState='title';
let game=null;
let lastTime=0;

function startRun(){
  game={player:makePlayer(),enemies:[],bullets:[],particles:[],chests:[],swings:[],lightnings:[],fireballs:[],drones:[],
    wave:1,waveTimer:0,waveDuration:26,spawnTimer:0,spawnQueue:waveEnemyCount(1),kills:0,elapsed:0,shake:0,running:true,
    tokensThisRun:0,starsThisRun:0,boss:null,bossActive:false,hitStop:0};
  game.player.x=W/2; game.player.y=H/2;
  screenState='game'; syncScreenDom();
  showWaveBanner(1); AudioEngine.SE.waveStart();
  lastTime=performance.now(); requestAnimationFrame(loop);
}
function showWaveBanner(w){ const el=document.getElementById('waveBanner'); el.textContent='WAVE '+w; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
function showStarBanner(){ const el=document.getElementById('starBanner'); el.textContent='🌟 スキルスター獲得！'; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }

function loop(now){
  if(!game||!game.running) return;
  let rawDt=(now-lastTime)/1000; lastTime=now; rawDt=Math.min(rawDt,0.05);
  let dt=rawDt;
  if(game.hitStop>0){ game.hitStop-=rawDt; dt=rawDt*0.08; }
  update(dt); render();
  requestAnimationFrame(loop);
}

function triggerBoss(wave){
  game.bullets=[];
  game.boss=createBoss(wave); game.bossActive=true;
  document.getElementById('bossHpWrap').classList.remove('hidden');
  document.getElementById('bossName').textContent=game.boss.name;
  AudioEngine.SE.bossAppear(); AudioEngine.startBGM(true);
  showWaveBanner('WAVE '+wave+' — BOSS');
}
function endBoss(){
  const wave=game.boss.wave;
  dissolveBoss(); AudioEngine.SE.bossDie();
  document.getElementById('bossHpWrap').classList.add('hidden');
  if(!gameData.milestonesClaimed.includes(wave)){
    gameData.milestonesClaimed.push(wave); gameData.skillStars+=1; game.starsThisRun+=1;
    saveGame(); AudioEngine.SE.starGain(); showStarBanner();
  }
  game.boss=null; game.bossActive=false;
  AudioEngine.startBGM(false);
  if(wave>=50){ triggerGameClear(); return; }
  game.wave=wave+1; game.waveTimer=0; game.waveDuration=Math.max(14,26-game.wave*0.4);
  game.spawnQueue=(game.spawnQueue||0)+waveEnemyCount(game.wave);
  showWaveBanner(game.wave); AudioEngine.SE.waveStart();
}
function triggerGameClear(){
  game.running=false; AudioEngine.SE.gameClear(); AudioEngine.stopBGM();
  gameData.maxWave=Math.max(gameData.maxWave,50); saveGame();
  document.getElementById('clearTime').textContent=fmtTime(game.elapsed);
  document.getElementById('clearKills').textContent=game.kills;
  document.getElementById('clearTokens').textContent=game.tokensThisRun;
  document.getElementById('clearStars').textContent=game.starsThisRun;
  setTimeout(()=>{ screenState='gameclear'; syncScreenDom(); },1200);
}
function fmtTime(t){ return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0'); }

function update(dt){
  const p=game.player;
  game.elapsed+=dt;
  if(game.shake>0) game.shake=Math.max(0,game.shake-dt*40);

  if(!game.bossActive){
    game.waveTimer+=dt; game.spawnTimer+=dt;
    if(game.waveTimer>=game.waveDuration){
      const nextWave=game.wave+1;
      if(BOSS_TABLE[nextWave]){ game.wave=nextWave; triggerBoss(nextWave); }
      else {
        game.waveTimer=0; game.wave=nextWave; game.waveDuration=Math.max(14,26-game.wave*0.4);
        game.spawnQueue=(game.spawnQueue||0)+waveEnemyCount(game.wave);
        showWaveBanner(game.wave); AudioEngine.SE.waveStart();
      }
    }
    const spawnInterval=Math.max(0.18,0.9-game.wave*0.02);
    if(game.spawnTimer>=spawnInterval && (game.spawnQueue||0)>0){
      game.spawnTimer=0; game.spawnQueue--; game.enemies.push(spawnEnemy(game.wave));
    }
  }

  const prevX=p.x, prevY=p.y;
  updatePlayer(dt);
  p.moveVX=(p.x-prevX)/Math.max(dt,0.0001); p.moveVY=(p.y-prevY)/Math.max(dt,0.0001);

  game.swings.forEach(s=>s.life-=dt); game.swings=game.swings.filter(s=>s.life>0);
  game.lightnings.forEach(l=>l.life-=dt); game.lightnings=game.lightnings.filter(l=>l.life>0);
  game.fireballs.forEach(f=>{ f.life-=dt; f.r=f.maxR*(1-f.life/f.maxLife); }); game.fireballs=game.fireballs.filter(f=>f.life>0);

  updateEnemies(dt);
  if(game.bossActive && game.boss){
    updateBoss(dt);
    if(bossIsDefeated(game.boss)){ endBoss(); }
    else {
      const cur=bossTotalHp(game.boss), mx=bossMaxHp(game.boss);
      document.getElementById('bossHpInner').style.width=Math.max(0,cur/mx*100)+'%';
    }
  }

  for(const b of game.bullets){
    b.x+=b.vx*dt; b.y+=b.vy*dt;
    b.dead=(b.x<-50||b.x>W+50||b.y<-50||b.y>H+50);
    if(b.owner==='enemy' && !b.dead){
      if(dist(b.x,b.y,p.x,p.y)<b.r+p.r){ damagePlayer(b.dmg); b.dead=true; }
    } else if(b.owner==='player' && !b.dead){
      let targets=[...game.enemies];
      if(game.bossActive && game.boss){
        const bossTargets = game.boss.type==='splitter'?[game.boss,...game.boss.children]:(game.boss.type==='centipede'?game.boss.segs:[game.boss]);
        targets=targets.concat(bossTargets.filter(t=>!t.dead));
      }
      for(const e of targets){
        if(b.hitSet.has(e)) continue;
        if(dist(b.x,b.y,e.x,e.y)<b.r+e.r){ damageTarget(e,b.dmg); tryApplyStatus(e); b.hitSet.add(e); if(!b.pierce){ b.dead=true; break; } }
      }
    }
  }
  game.bullets=game.bullets.filter(b=>!b.dead);

  for(const pt of game.particles){ pt.x+=pt.vx*dt; pt.y+=pt.vy*dt; pt.vx*=0.92; pt.vy*=0.92; pt.life-=dt; }
  game.particles=game.particles.filter(pt=>pt.life>0);

  for(const c of game.chests){
    c.phase+=dt*3;
    if(dist(c.x,c.y,p.x,p.y)<c.r+p.r+10){ c.collected=true; game.tokensThisRun+=Math.round(c.value*p.base.tokenMul); AudioEngine.SE.chest(); spawnParticles(c.x,c.y,'#f4ff00',18); }
  }
  game.chests=game.chests.filter(c=>!c.collected);

  updateHUD();
  if(p.hp<=0) endRun();
}

function updateHUD(){
  const p=game.player;
  document.getElementById('hpBar').style.width=Math.max(0,(p.hp/p.maxHp*100))+'%';
  document.getElementById('hpText').textContent=Math.max(0,Math.ceil(p.hp))+'/'+Math.round(p.maxHp);
  document.getElementById('waveText').textContent=game.wave;
  document.getElementById('killText').textContent=game.kills;
  document.getElementById('runTokenText').textContent=game.tokensThisRun;
  document.getElementById('timeText').textContent=fmtTime(game.elapsed);
}
function endRun(){
  game.running=false; AudioEngine.SE.gameOver(); AudioEngine.stopBGM();
  document.getElementById('bossHpWrap').classList.add('hidden');
  const tokensEarned=Math.round((game.wave*15+game.kills*1)*game.player.base.tokenMul+game.tokensThisRun);
  gameData.tokens+=tokensEarned; gameData.maxWave=Math.max(gameData.maxWave,game.wave); saveGame();
  document.getElementById('statWave').textContent=game.wave;
  document.getElementById('statKills').textContent=game.kills;
  document.getElementById('statTime').textContent=fmtTime(game.elapsed);
  document.getElementById('statTokens').textContent=tokensEarned;
  document.getElementById('statStars').textContent=game.starsThisRun;
  setTimeout(()=>{ screenState='gameover'; syncScreenDom(); },500);
}

function render(){
  ctx.save(); ctx.clearRect(0,0,W,H);
  ctx.strokeStyle='rgba(0,255,242,0.06)'; ctx.lineWidth=1;
  for(let x=0;x<W;x+=48){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0;y<H;y+=48){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  let shakeX=0,shakeY=0;
  if(game.shake>0){ shakeX=(Math.random()-0.5)*game.shake; shakeY=(Math.random()-0.5)*game.shake; ctx.translate(shakeX,shakeY); }

  for(const c of game.chests){
    const glow=10+Math.sin(c.phase)*6;
    ctx.save(); ctx.shadowColor='#f4ff00'; ctx.shadowBlur=glow; ctx.fillStyle='#f4ff00';
    roundRectPath(ctx,c.x-c.r,c.y-c.r,c.r*2,c.r*2,5); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke(); ctx.restore();
  }
  for(const pt of game.particles){ ctx.globalAlpha=Math.max(0,pt.life/pt.maxLife); ctx.fillStyle=pt.color; ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.size,0,Math.PI*2); ctx.fill(); }
  ctx.globalAlpha=1;

  drawEnemies();
  if(game.bossActive && game.boss){ drawTelegraphs(); drawBoss(); }

  for(const b of game.bullets){ ctx.save(); ctx.shadowColor=b.color; ctx.shadowBlur=14; ctx.fillStyle=b.color; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  for(const l of game.lightnings){
    const a=l.life/l.maxLife;
    ctx.save(); ctx.globalAlpha=a; ctx.strokeStyle=l.type==='laser'?'#00fff2':'#d1c4ff'; ctx.lineWidth=l.type==='laser'?5:3;
    ctx.shadowColor=ctx.strokeStyle; ctx.shadowBlur=16; ctx.beginPath(); ctx.moveTo(l.x1,l.y1); ctx.lineTo(l.x2,l.y2); ctx.stroke(); ctx.restore();
  }
  for(const f of game.fireballs){
    const a=f.life/f.maxLife;
    ctx.save(); ctx.globalAlpha=a*0.5; ctx.fillStyle='#ff6a2b'; ctx.shadowColor='#ff6a2b'; ctx.shadowBlur=24;
    ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
  for(const s of game.swings){
    const a=s.life/s.maxLife;
    ctx.save(); ctx.globalAlpha=a*0.6; ctx.strokeStyle=s.boxer?'#ff2b4d':'#00fff2'; ctx.lineWidth=6;
    ctx.shadowColor=ctx.strokeStyle; ctx.shadowBlur=18; ctx.beginPath(); ctx.arc(s.x,s.y,s.range*0.7,s.angle-0.9,s.angle+0.9); ctx.stroke(); ctx.restore();
  }
  drawPlayer();
  ctx.restore();
}

function starIconHtml(){ return `<svg class="star-icon-svg" viewBox="0 0 100 140"><path d="M50 2 C54 2 56 6 58 14 L66 46 C82 48 96 50 98 54 C100 58 96 62 84 70 L64 84 C68 100 72 116 70 122 C68 128 62 128 50 118 C38 128 32 128 30 122 C28 116 32 100 36 84 L16 70 C4 62 0 58 2 54 C4 50 18 48 34 46 L42 14 C44 6 46 2 50 2 Z" fill="url(#starGrad)" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>`; }
function renderGlobalCurrency(){ document.getElementById('globalCurrency').innerHTML=`<div class="curr-pill">⬡ ${gameData.tokens}</div><div class="curr-pill star">${starIconHtml()} ${gameData.skillStars}</div>`; }

let stLoopRunning=false;
function stLoop(){
  if(screenState!=='skilltree') { stLoopRunning=false; return; }
  SkillTree.render();
  requestAnimationFrame(stLoop);
}
function renderSlotBar(){
  const bar=document.getElementById('stSlotBar'); bar.innerHTML='';
  gameData.slots.forEach((s,i)=>{
    const btn=document.createElement('button');
    btn.className='slot-btn'+(i===gameData.activeSlot?' active':'');
    btn.textContent=s.name; btn.title='ダブルクリックで名称変更';
    btn.addEventListener('click',()=>{ gameData.activeSlot=i; saveGame(); });
    btn.addEventListener('dblclick',()=>{ const nn=prompt('スロット名を入力',s.name); if(nn){ s.name=nn.slice(0,12); saveGame(); renderSlotBar(); } });
    bar.appendChild(btn);
  });
}

function syncScreenDom(){
  ['titleScreen','settingsScreen','gameOverScreen','gameClearScreen'].forEach(id=>document.getElementById(id).classList.add('hidden'));
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('skilltreeOverlay').classList.add('hidden');
  renderGlobalCurrency();
  const gc=document.getElementById('globalCurrency'); gc.style.opacity = screenState==='game'?'0.55':'1';

  if(screenState==='title'){ document.getElementById('titleScreen').classList.remove('hidden'); document.getElementById('titleMaxWave').textContent=gameData.maxWave; }
  else if(screenState==='settings'){ document.getElementById('settingsScreen').classList.remove('hidden'); }
  else if(screenState==='game'){ document.getElementById('hud').classList.remove('hidden'); }
  else if(screenState==='gameover'){ document.getElementById('gameOverScreen').classList.remove('hidden'); }
  else if(screenState==='gameclear'){ document.getElementById('gameClearScreen').classList.remove('hidden'); }
  else if(screenState==='skilltree'){
    document.getElementById('skilltreeOverlay').classList.remove('hidden');
    renderSlotBar(); SkillTree.reset();
    if(!stLoopRunning){ stLoopRunning=true; requestAnimationFrame(stLoop); }
  }
}

canvas.addEventListener('wheel',(e)=>{ if(screenState==='skilltree') SkillTree.onWheel(e); },{passive:false});
canvas.addEventListener('mousedown',(e)=>{ if(screenState==='skilltree') SkillTree.onDown(e); });
canvas.addEventListener('mousemove',(e)=>{ if(screenState==='skilltree') SkillTree.onMove(e); });
window.addEventListener('mouseup',(e)=>{ if(screenState==='skilltree') SkillTree.onUp(e); });

function ensureAudio(){ AudioEngine.init(); }
document.getElementById('btnStart').addEventListener('click',()=>{ ensureAudio(); AudioEngine.SE.click(); AudioEngine.startBGM(false); startRun(); });
document.getElementById('btnSkillTree').addEventListener('click',()=>{ ensureAudio(); AudioEngine.SE.click(); screenState='skilltree'; syncScreenDom(); });
document.getElementById('btnSettings').addEventListener('click',()=>{ ensureAudio(); AudioEngine.SE.click(); screenState='settings'; syncScreenDom(); });
document.getElementById('btnSettingsBack').addEventListener('click',()=>{ AudioEngine.SE.click(); screenState='title'; syncScreenDom(); });
document.getElementById('btnNext').addEventListener('click',()=>{ AudioEngine.SE.click(); screenState='skilltree'; syncScreenDom(); });
document.getElementById('btnTreeExit').addEventListener('click',()=>{ AudioEngine.SE.click(); SkillTree.hideTooltip(); screenState='title'; syncScreenDom(); });
document.getElementById('btnClearBack').addEventListener('click',()=>{ AudioEngine.SE.click(); screenState='title'; syncScreenDom(); });
document.getElementById('btnRespec').addEventListener('click',()=>{
  const slot=gameData.slots[gameData.activeSlot];
  let starsInvested=0;
  Object.keys(slot.build||{}).forEach(id=>{ const n=findNode(id); const lvl=slot.build[id]; for(let l=0;l<lvl;l++) starsInvested+=costAt(n,l); });
  if(starsInvested<=0) return;
  const tokenCost=Math.round(starsInvested*5);
  if(gameData.tokens<tokenCost){ alert('トークンが足りません（必要: '+tokenCost+'）'); return; }
  if(!confirm('トークン'+tokenCost+'を消費して「'+slot.name+'」のスキルスターを振り直しますか？')) return;
  gameData.tokens-=tokenCost; gameData.skillStars+=starsInvested; slot.build={};
  AudioEngine.SE.skillBuy(); saveGame();
});
document.getElementById('bgmVol').addEventListener('input',(e)=>{ AudioEngine.setVol(e.target.value/100,gameData.settings.se); gameData.settings.bgm=e.target.value/100; saveGame(); });
document.getElementById('seVol').addEventListener('input',(e)=>{ AudioEngine.setVol(gameData.settings.bgm,e.target.value/100); gameData.settings.se=e.target.value/100; saveGame(); });
document.getElementById('bgmVol').value=Math.round(gameData.settings.bgm*100);
document.getElementById('seVol').value=Math.round(gameData.settings.se*100);

screenState='title'; syncScreenDom();
