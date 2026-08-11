/* enemy.js */

function spawnEnemy(wave){
  const edge=Math.floor(Math.random()*4); let x,y; const margin=60;
  if(edge===0){x=-margin;y=Math.random()*H;} else if(edge===1){x=W+margin;y=Math.random()*H;}
  else if(edge===2){x=Math.random()*W;y=-margin;} else {x=Math.random()*W;y=H+margin;}
  const diff=1+(wave-1)*0.14; // スケーリング倍率を少しマイルドに調整
  const roll=Math.random();
  let type;
  if(wave<11){
    // Wave 11未満は四角形と五角形のみ出現（三角形の遠距離敵は出現しない）
    type = roll<0.72 ? 'square' : 'pentagon';
  } else {
    // Wave 11以降から三角形（遠距離）が登場
    type = roll<0.5 ? 'square' : (roll<0.78 ? 'triangle' : 'pentagon');
  }
  const b={
    square:{hp:9,dmg:8,spd:70,r:16,color:'#ff3860',shape:'square'},
    triangle:{hp:9,dmg:6,spd:55,r:14,color:'#ffbe0b',shape:'triangle',ranged:true,shootRange:260,shootCd:1.8},
    pentagon:{hp:40,dmg:16,spd:32,r:24,color:'#a600ff',shape:'pentagon',tank:true},
  }[type];
  return {x,y,type,shape:b.shape,color:b.color,r:b.r,hp:Math.round(b.hp*diff),maxHp:Math.round(b.hp*diff),
    dmg:Math.round(b.dmg*(1+(wave-1)*0.11)),spd:b.spd*(1+Math.min(0.6,(wave-1)*0.035)),
    ranged:!!b.ranged,shootRange:b.shootRange||0,shootCd:b.shootCd||0,shootTimer:Math.random()*1.5,
    hitFlash:0,dots:[],slowFactor:1,slowTimer:0,dead:false};
}
function moveToward(e,tx,ty,dt,spd){ const ang=Math.atan2(ty-e.y,tx-e.x); e.x+=Math.cos(ang)*spd*dt; e.y+=Math.sin(ang)*spd*dt; }
function moveAway(e,tx,ty,dt,spd){ const ang=Math.atan2(e.y-ty,e.x-tx); e.x+=Math.cos(ang)*spd*dt; e.y+=Math.sin(ang)*spd*dt; }

function separateEnemies(){
  const list=game.enemies;
  for(let i=0;i<list.length;i++){
    for(let j=i+1;j<list.length;j++){
      const a=list[i],b=list[j];
      const d=dist(a.x,a.y,b.x,b.y), minD=a.r+b.r;
      if(d>0 && d<minD){
        const overlap=(minD-d)/2, ang=Math.atan2(b.y-a.y,b.x-a.x);
        a.x-=Math.cos(ang)*overlap; a.y-=Math.sin(ang)*overlap;
        b.x+=Math.cos(ang)*overlap; b.y+=Math.sin(ang)*overlap;
      }
    }
  }
}
function updateEnemyCommon(e,dt){
  if(e.hitFlash>0) e.hitFlash-=dt;
  if(e.slowTimer>0){ e.slowTimer-=dt; if(e.slowTimer<=0) e.slowFactor=1; }
  if(e.dots&&e.dots.length){
    for(const d of e.dots){
      d.tickTimer-=dt;
      if(d.tickTimer<=0){ d.tickTimer=d.interval; damageTarget(e,d.dmg); AudioEngine.SE.poison(); spawnParticles(e.x,e.y,d.color,3); }
      d.remaining-=dt;
    }
    e.dots=e.dots.filter(d=>d.remaining>0);
  }
}
function updateEnemies(dt){
  const p=game.player;
  for(const e of game.enemies){
    updateEnemyCommon(e,dt);
    const effSpd=e.spd*e.slowFactor;
    const d=dist(e.x,e.y,p.x,p.y);
    if(e.ranged){
      if(d>e.shootRange*0.7) moveToward(e,p.x,p.y,dt,effSpd);
      else if(d<e.shootRange*0.45) moveAway(e,p.x,p.y,dt,effSpd);
      e.shootTimer-=dt;
      if(e.shootTimer<=0 && d<e.shootRange){
        e.shootTimer=e.shootCd;
        const ang=Math.atan2(p.y-e.y,p.x-e.x);
        game.bullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*220,vy:Math.sin(ang)*220,r:6,dmg:e.dmg,owner:'enemy',color:'#ffbe0b'});
      }
    } else {
      moveToward(e,p.x,p.y,dt,effSpd);
      if(d<e.r+p.r) damagePlayer(e.dmg);
    }
  }
  separateEnemies();
  game.enemies=game.enemies.filter(e=>!e.dead);
}
function drawEnemyShape(e){
  ctx.save();
  const flashColor=e.hitFlash>0?'#ffffff':((e.dots&&e.dots.some(d=>d.color==='#39ff88'))?'#7cffb0':e.color);
  ctx.shadowColor=e.color; ctx.shadowBlur=14; ctx.fillStyle=flashColor; ctx.strokeStyle=e.color; ctx.lineWidth=2;
  if(e.shape==='square'){ roundRectPath(ctx,e.x-e.r,e.y-e.r,e.r*2,e.r*2,6); ctx.fill(); ctx.stroke(); }
  else if(e.shape==='triangle'){ drawRoundedPolygon(e.x,e.y,e.r,3,-Math.PI/2,4); ctx.fill(); ctx.stroke(); }
  else if(e.shape==='pentagon'){ drawRoundedPolygon(e.x,e.y,e.r,5,-Math.PI/2,5); ctx.fill(); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
  if(e.slowFactor<1){ ctx.strokeStyle='#8fd6ff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(e.x,e.y,e.r+4,0,Math.PI*2); ctx.stroke(); }
  ctx.restore();
  const w=e.r*2;
  ctx.save(); ctx.translate(e.x-w/2,e.y-e.r-10);
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,w,4);
  ctx.fillStyle=e.color; ctx.fillRect(0,0,w*Math.max(0,e.hp/e.maxHp),4);
  ctx.restore();
}
function drawEnemies(){ game.enemies.forEach(drawEnemyShape); }

/* ===================== TELEGRAPH SYSTEM ===================== */
function startTelegraph(owner,tele,duration,onFire){
  owner.telegraph=Object.assign({timer:duration,maxTimer:duration,onFire},tele);
}
function updateTelegraph(owner,dt){
  if(!owner.telegraph) return false;
  owner.telegraph.timer-=dt;
  if(owner.telegraph.timer<=0){
    const cb=owner.telegraph.onFire; owner.telegraph=null;
    if(cb) cb();
    return true;
  }
  return false;
}
function collectTelegraphs(){
  const b=game.boss; if(!b) return [];
  let list=[];
  if(b.telegraph) list.push(b.telegraph);
  if(b.children) b.children.forEach(c=>{ if(c.telegraph) list.push(c.telegraph); });
  if(b.segs) b.segs.forEach(s=>{ if(s.telegraph) list.push(s.telegraph); });
  return list;
}
function drawTelegraphs(){
  collectTelegraphs().forEach(t=>{
    const a=0.3+0.2*(1-t.timer/t.maxTimer);
    ctx.save();
    if(t.shape==='circle'){ ctx.fillStyle=`rgba(166,0,255,${a})`; ctx.strokeStyle='rgba(200,80,255,0.8)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(t.x,t.y,t.r,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
    else if(t.shape==='ring'){ ctx.strokeStyle=`rgba(166,0,255,${a+0.2})`; ctx.lineWidth=8; ctx.beginPath(); ctx.arc(t.x,t.y,t.r,0,Math.PI*2); ctx.stroke(); }
    else if(t.shape==='line'){ ctx.strokeStyle=`rgba(166,0,255,${a})`; ctx.lineWidth=t.width||30; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(t.x1,t.y1); ctx.lineTo(t.x2,t.y2); ctx.stroke(); }
    ctx.restore();
  });
}

/* ===================== BOSS TRANSFORM SYSTEM ===================== */
function initTransformState(b){
  b.transformed=false;
  b.transforming=false;
  b.transformPhase=null; /* 'zoomin' -> 'freeze' -> 'shake' -> 'flash' -> 'post' -> 'zoomout' */
  b.transformTimer=0;
  b.pendingTransformCheck=false; /* 攻撃パターン完了直後にチェックするフラグ */
}

function checkTransformTrigger(b){
  if(b.transformed || b.transforming) return;
  if(b.hp<=0) return; /* 変身前に死亡している場合は変身しない */
  if(b.hp/b.maxHp<=0.5){
    startTransform(b);
  }
}

function startTransform(b){
  b.transforming=true;
  b.transformPhase='zoomin';
  b.transformTimer=0;
  game.cameraZoom={active:true,target:b,scale:1,phase:'zoomin'};
  game.playerFrozen=true;
  /* 飛翔中の自弾（矢・魔法弾等）を無効化してすり抜けさせる */
  game.bullets.forEach(bl=>{ if(bl.owner==='player') bl.transformImmune=true; });
}

function updateTransform(b,dt){
  if(!b.transforming) return;
  b.transformTimer+=dt;
  const isFortress=b.type==='fortress';
  const zoomInDur=0.8;
  const freezeDur= isFortress? 1.5 : (b.type==='tank'?5:2.5);
  const shakeDur= isFortress? 3.0 : (b.type==='tank'?4:2);
  const flashDur= isFortress? 0.2 : 0.4;
  const postDur= isFortress? 2.0 : 0;
  const zoomOutDur=0.8;

  if(b.transformPhase==='zoomin'){
    game.cameraZoom.scale=1+ (b.transformTimer/zoomInDur)*0.8;
    if(b.transformTimer>=zoomInDur){ b.transformPhase='freeze'; b.transformTimer=0; if(isFortress) AudioEngine.SE.transformSpark(); }
  }
  else if(b.transformPhase==='freeze'){
    if(isFortress && Math.random()<0.3) AudioEngine.SE.transformSpark();
    if(b.transformTimer>=freezeDur){
      b.transformPhase='shake'; b.transformTimer=0;
      if(isFortress){ b.color='#3a3f58'; } else { AudioEngine.SE.transformRumble(); }
    }
  }
  else if(b.transformPhase==='shake'){
    b.shakeOffsetX=(Math.random()-0.5)*10;
    b.shakeOffsetY=(Math.random()-0.5)*10;
    if(b.transformTimer>=shakeDur){
      b.transformPhase='flash'; b.transformTimer=0;
      b.shakeOffsetX=0; b.shakeOffsetY=0;
      applyFormChange(b);
      if(isFortress) AudioEngine.SE.transformDeepImpact(); else AudioEngine.SE.transformFlash();
    }
  }
  else if(b.transformPhase==='flash'){
    b.flashAlpha=Math.max(0,1-(b.transformTimer/flashDur));
    if(b.transformTimer>=flashDur){
      b.transformPhase= isFortress? 'post' : 'zoomout';
      b.transformTimer=0;
    }
  }
  else if(b.transformPhase==='post'){
    if(b.transformTimer>=postDur){ b.transformPhase='zoomout'; b.transformTimer=0; }
  }
  else if(b.transformPhase==='zoomout'){
    game.cameraZoom.scale=1.8-((b.transformTimer/zoomOutDur)*0.8);
    if(b.transformTimer>=zoomOutDur){
      b.transforming=false; b.transformed=true;
      game.cameraZoom={active:false,target:null,scale:1,phase:null};
      game.playerFrozen=false; game.player.invuln=0;
      game.bullets=game.bullets.filter(bl=>!bl.transformImmune);
    }
  }
}

/* 形態変化: HPは変更せず（第1形態HPをそのまま継続）、見た目・攻撃パターンのみ切替 */
function applyFormChange(b){
  b.formTier=2;
  if(b.type==='tank'){
    b.shape='heptagon'; b.color='#ff2b4d';
  } else if(b.type==='fortress'){
    b.shape='hexagram'; b.color='#ff2b4d';
    b.turnState='cooldown'; b.turnCdTimer=7;
  }
}

/* ---- 出現ドロップイン処理: tank/fortress 共通で使用する共通エントランス関数 ---- */
function updateBossEntrance(b,dt){
  if(b.y<180 && (b.entranceTimer||0)<1.2){
    b.entranceTimer=(b.entranceTimer||0)+dt;
    b.y+=120*dt;
    return true; /* エントランス中はtrueを返し、呼び出し側で通常処理をスキップ */
  }
  return false;
}

/* ---- tank更新 ---- */
function updateBossTank(b,dt){
  const p=game.player;
  if(updateBossEntrance(b,dt)) return;
  if(b.transforming){ updateTransform(b,dt); return; }
  if(!b.telegraph){
    b.dashTimer-=dt;
    if(b.dashTimer<=0){
      b.dashTimer= b.formTier===2?4.0:4.5;
      if(b.formTier===2){
        /* 第2形態: 予測ラインを発射時点で確定させ、そのラインに沿って正確に突進する */
        const d=dist(b.x,b.y,p.x,p.y)||1;
        const lockedDX=(p.x-b.x)/d, lockedDY=(p.y-b.y)/d;
        const dashDist=500*2;
        startTelegraph(b,{shape:'line',x1:b.x,y1:b.y,x2:b.x+lockedDX*dashDist,y2:b.y+lockedDY*dashDist,width:b.r*2},1.0,()=>{
          b.mode='dash';
          b.dashVX=lockedDX*420*1.3; b.dashVY=lockedDY*420*1.3;
          b.dashTime=0.6*(dashDist/500);
          AudioEngine.SE.bossShoot();
          checkTransformTrigger(b);
        });
      } else {
        /* 第1形態: 予測表示のみで、突進発動時は改めてプレイヤーの位置へ向けて突進する */
        startTelegraph(b,{shape:'line',x1:b.x,y1:b.y,x2:p.x,y2:p.y,width:b.r*2},0.6,()=>{
          const dd=dist(b.x,b.y,p.x,p.y)||1;
          b.mode='dash';
          b.dashVX=(p.x-b.x)/dd*420; b.dashVY=(p.y-b.y)/dd*420;
          b.dashTime=0.6;
          AudioEngine.SE.bossShoot();
          checkTransformTrigger(b);
        });
      }
    }
    b.attackTimer-=dt;
    if(b.attackTimer<=0){
      b.attackTimer=2.8;
      if(b.formTier===2){
        let burstCount=0;
        const fireBurst=()=>{
          burstCount++;
          const rot=(burstCount-1)*10*Math.PI/180;
          const n=16;
          for(let i=0;i<n;i++){
            const ang=(i/n)*Math.PI*2+rot;
            game.bullets.push({x:b.x,y:b.y,vx:Math.cos(ang)*180,vy:Math.sin(ang)*180,r:8,
              dmg:10+Math.floor(Math.random()*31),owner:'enemy',color:'#a600ff'});
          }
          if(burstCount<3){ setTimeout(fireBurst,1000); }
          else { checkTransformTrigger(b); }
        };
        startTelegraph(b,{shape:'ring',x:b.x,y:b.y,r:170},0.55,fireBurst);
      } else {
        startTelegraph(b,{shape:'ring',x:b.x,y:b.y,r:170},0.55,()=>{
          AudioEngine.SE.bossShoot();
          const n=16;
          for(let i=0;i<n;i++){
            const ang=(i/n)*Math.PI*2;
            game.bullets.push({x:b.x,y:b.y,vx:Math.cos(ang)*180,vy:Math.sin(ang)*180,r:8,
              dmg:10+Math.floor(Math.random()*31),owner:'enemy',color:'#a600ff'});
          }
          checkTransformTrigger(b);
        });
      }
    }
  }
  updateTelegraph(b,dt);
  if(b.mode==='dash'){ b.dashTime-=dt; b.x+=b.dashVX*dt; b.y+=b.dashVY*dt; if(b.dashTime<=0) b.mode='chase'; }
  else if(!b.telegraph){ moveToward(b,p.x,p.y,dt,b.spd); }
  if(dist(b.x,b.y,p.x,p.y)<b.r+p.r) damagePlayer(40+Math.floor(Math.random()*11));
}

/* ---- fortress更新 ---- */
function updateBossFortress(b,dt){
  const p=game.player;
  if(updateBossEntrance(b,dt)) return;
  if(b.transforming){ updateTransform(b,dt); return; }
  if(!b.turnState){ b.turnState='cooldown'; b.turnCdTimer=7; }
  b.x=b.fixedX||W/2; b.y=Math.min(b.y,b.fixedY||160);

  if(b.turnState==='cooldown'){
    b.turnCdTimer-=dt;
    b.rotateAngle=(b.rotateAngle||0)+dt*2.4;
    if(b.turnCdTimer<=0){ b.rotateAngle=0; b.turnState='attack'; startFortressAttack(b); }
    if(dist(b.x,b.y,p.x,p.y)<b.r+p.r) damagePlayer(b.dmg*0.5*dt);
    return;
  }
  b.rotateAngle=0;
  updateTelegraph(b,dt);
  updateFortressLaser(b,dt);
}

function startFortressAttack(b){
  const p=game.player;
  const options = b.formTier===2 ? ['quantum','gravity','laser'] : ['quantum','gravity'];
  const canLaser = b.formTier===2 && b.hp/b.maxHp<=0.5;
  const pool = options.filter(o=> o!=='laser' || canLaser);
  const choice=pool[Math.floor(Math.random()*pool.length)];

  if(choice==='quantum'){
    const ang=Math.atan2(p.y-b.y,p.x-b.x);
    startTelegraph(b,{shape:'line',x1:b.x,y1:b.y,x2:b.x+Math.cos(ang)*700,y2:b.y+Math.sin(ang)*700,width:40},0.7,()=>{
      AudioEngine.SE.bossShoot();
      const a2=Math.atan2(p.y-b.y,p.x-b.x);
      game.bullets.push({x:b.x,y:b.y,vx:Math.cos(a2)*220,vy:Math.sin(a2)*220,r:22,dmg:50+Math.floor(Math.random()*21),owner:'enemy',color:'#f4ff00'});
      endFortressAttack(b);
    });
  } else if(choice==='gravity'){
    startTelegraph(b,{shape:'circle',x:b.x,y:b.y,r:260},0.6,()=>{
      const d=dist(b.x,b.y,p.x,p.y)||1;
      if(d<260){ const ang=Math.atan2(p.y-b.y,p.x-b.x); p.x+=Math.cos(ang)*90; p.y+=Math.sin(ang)*90; }
      else { const ang=Math.atan2(b.y-p.y,b.x-p.x); p.x+=Math.cos(ang)*60; p.y+=Math.sin(ang)*60; }
      let shots=0;
      const fire=()=>{
        shots++;
        const ang=Math.atan2(p.y-b.y,p.x-b.x);
        game.bullets.push({x:b.x,y:b.y,vx:Math.cos(ang)*240,vy:Math.sin(ang)*240,r:7,dmg:16,owner:'enemy',color:'#ffbe0b'});
        if(shots<3) setTimeout(fire,260); else endFortressAttack(b);
      };
      fire();
    });
  } else {
    startTelegraph(b,{shape:'line',x1:b.x,y1:b.y,x2:b.x+Math.cos(Math.atan2(p.y-b.y,p.x-b.x))*900,y2:b.y+Math.sin(Math.atan2(p.y-b.y,p.x-b.x))*900,width:30},1.0,()=>{
      b.laserActive=true; b.laserTimer=3.0;
      AudioEngine.SE.laser();
    });
  }
}

function endFortressAttack(b){
  b.turnState='cooldown'; b.turnCdTimer=7;
  checkTransformTrigger(b);
}

function scheduleNextFortressAttack(b){
  setTimeout(()=>{ if(b.turnState==='attack') startFortressAttack(b); },1000);
}

function updateFortressLaser(b,dt){
  if(!b.laserActive) return;
  const p=game.player;
  const targetAng=Math.atan2(p.y-b.y,p.x-b.x);
  b.laserAngle = b.laserAngle===undefined? targetAng : b.laserAngle+(targetAng-b.laserAngle)*Math.min(1,dt*2);
  const ex=b.x+Math.cos(b.laserAngle)*900, ey=b.y+Math.sin(b.laserAngle)*900;
  game.lightnings.push({type:'laser',x1:b.x,y1:b.y,x2:ex,y2:ey,life:0.05,maxLife:0.05});
  if(pointToSegDist(p.x,p.y,b.x,b.y,ex,ey)<20) damagePlayer(6*dt);
  screenShake(4);
  b.laserTimer-=dt;
  if(b.laserTimer<=0){ b.laserActive=false; endFortressAttack(b); }
}

/* ===================== BOSSES ===================== */
const BOSS_TABLE={10:'tank',20:'fortress',30:'splitter',40:'twinhead',50:'centipede'};

function createBoss(wave){
  const type=BOSS_TABLE[wave];
  const scale=1+(wave/10-1)*0.35;
  const base={x:W/2,y:-150,vx:0,vy:0,r:60,type,wave,dead:false,hitFlash:0,phaseTimer:0,attackTimer:1.5,dots:[],slowFactor:1,slowTimer:0,telegraph:null};
  if(type==='tank'){
    const boss=Object.assign(base,{name:'巨大タンク・デストロイヤー',color:'#a600ff',shape:'pentagon',r:70*Math.min(1.4,scale),
      hp:900*scale,maxHp:900*scale,dmg:26*scale,spd:34,mode:'chase',dashTimer:4,formTier:1,entranceTimer:0});
    initTransformState(boss);
    return boss;
  }
  if(type==='fortress'){
    const boss=Object.assign(base,{name:'砲撃要塞',color:'#ffbe0b',shape:'triangle',r:64*Math.min(1.4,scale),
      hp:1000*scale,maxHp:1000*scale,dmg:14*scale,spd:0,keepDist:0,formTier:1,
      turnState:'cooldown',turnTimer:0,turnCdTimer:7,entranceTimer:0,fixedX:W/2,fixedY:160,rotateAngle:0});
    initTransformState(boss);
    return boss;
  }
  if(type==='splitter'){
    return Object.assign(base,{name:'連結円の異形',color:'#39ff88',shape:'circle',r:80*Math.min(1.4,scale),
      hp:1300*scale,maxHp:1300*scale,dmg:18*scale,spd:38,children:[],splitStage:0});
  }
  if(type==='twinhead'){
    return Object.assign(base,{name:'双頭の異形',color:'#ff2b4d',shape:'pentagon',r:64*Math.min(1.4,scale),
      hp:1600*scale,maxHp:1600*scale,dmg:22*scale,spd:60,mode:'melee',modeTimer:4});
  }
  if(type==='centipede'){
    const segCount=10;
    const segs=[]; for(let i=0;i<segCount;i++) segs.push({x:W/2,y:-150-i*30,r:30,hp:120*scale,maxHp:120*scale,dead:false,shootTimer:Math.random()*1.5,telegraph:null});
    return Object.assign(base,{name:'ムカデ型最終兵器',color:'#ff6a2b',shape:'centipede',r:30,
      hp:0,maxHp:0,dmg:20*scale,spd:70,segs,t:0,history:[]});
  }
}
function bossTotalHp(b){
  if(b.type==='splitter') return b.hp+b.children.reduce((s,c)=>s+(c.dead?0:c.hp),0);
  if(b.type==='centipede') return b.segs.reduce((s,s2)=>s+(s2.dead?0:s2.hp),0);
  return b.hp;
}
function bossMaxHp(b){
  if(b.type==='splitter') return b.maxHp+b.children.reduce((s,c)=>s+c.maxHp,0);
  if(b.type==='centipede') return b.segs.reduce((s,s2)=>s+s2.maxHp,0);
  return b.maxHp;
}
function bossIsDefeated(b){
  if(b.type==='splitter') return b.hp<=0 && b.children.every(c=>c.dead);
  if(b.type==='centipede') return b.segs.every(s=>s.dead);
  return b.hp<=0;
}

function updateBoss(dt){
  const b=game.boss; if(!b) return;
  const p=game.player;
  b.phaseTimer+=dt;
  if(b.hitFlash>0) b.hitFlash-=dt;

  if(b.type==='tank'){
    updateBossTank(b,dt);
  }
  else if(b.type==='fortress'){
    updateBossFortress(b,dt);
  }
  else if(b.type==='splitter'){
    if(b.hp>0) moveToward(b,p.x,p.y,dt,b.spd);
    if(b.hp>0 && dist(b.x,b.y,p.x,p.y)<b.r+p.r) damagePlayer(b.dmg*dt*2);
    b.children.forEach(c=>{
      if(c.dead) return;
      moveToward(c,p.x,p.y,dt,c.spd);
      if(dist(c.x,c.y,p.x,p.y)<c.r+p.r) damagePlayer(c.dmg*dt*2);
    });
    const ratio=b.hp/b.maxHp;
    if(b.splitStage===0 && ratio<=0.66 && b.hp>0){ b.splitStage=1; splitBoss(b); }
    else if(b.splitStage===1 && ratio<=0.33 && b.hp>0){ b.splitStage=2; splitBoss(b); }
  }
  else if(b.type==='twinhead'){
    if(!b.telegraph){
      b.modeTimer-=dt;
      if(b.modeTimer<=0){ b.mode=b.mode==='melee'?'ranged':'melee'; b.modeTimer=5; }
      if(b.mode==='melee'){
        moveToward(b,p.x,p.y,dt,b.spd);
        if(dist(b.x,b.y,p.x,p.y)<b.r+p.r) damagePlayer(b.dmg*dt*2.4);
      } else {
        const d=dist(b.x,b.y,p.x,p.y);
        if(d<260) moveAway(b,p.x,p.y,dt,b.spd*0.6);
        b.attackTimer-=dt;
        if(b.attackTimer<=0){
          b.attackTimer=1.0;
          const ang=Math.atan2(p.y-b.y,p.x-b.x);
          startTelegraph(b,{shape:'line',x1:b.x,y1:b.y,x2:b.x+Math.cos(ang)*400,y2:b.y+Math.sin(ang)*400,width:60},0.45,()=>{
            AudioEngine.SE.bossShoot();
            for(let i=-1;i<=1;i++){ const a2=Math.atan2(p.y-b.y,p.x-b.x)+i*0.25; game.bullets.push({x:b.x,y:b.y,vx:Math.cos(a2)*240,vy:Math.sin(a2)*240,r:7,dmg:b.dmg*0.5,owner:'enemy',color:'#ff2b4d'}); }
          });
        }
      }
    }
    updateTelegraph(b,dt);
  }
  else if(b.type==='centipede'){
    b.t+=dt;
    const head=b.segs[0];
    const targetAng=Math.atan2(p.y-head.y,p.x-head.x)+Math.sin(b.t*2)*0.6;
    head.x+=Math.cos(targetAng)*b.spd*dt; head.y+=Math.sin(targetAng)*b.spd*dt;
    head.x=Math.max(40,Math.min(W-40,head.x)); head.y=Math.max(40,Math.min(H-40,head.y));
    b.history.unshift({x:head.x,y:head.y}); if(b.history.length>400) b.history.pop();
    for(let i=1;i<b.segs.length;i++){
      const hi=Math.min(b.history.length-1,i*8);
      const hp2=b.history[hi]||b.history[b.history.length-1];
      if(hp2 && !b.segs[i].dead){ b.segs[i].x=hp2.x; b.segs[i].y=hp2.y; }
    }
    b.segs.forEach(s=>{
      if(s.dead) return;
      if(dist(s.x,s.y,p.x,p.y)<s.r+p.r) damagePlayer(b.dmg*dt*1.6);
      if(!s.telegraph){
        s.shootTimer-=dt;
        if(s.shootTimer<=0){
          s.shootTimer=2.2+Math.random();
          const ang=Math.atan2(p.y-s.y,p.x-s.x);
          startTelegraph(s,{shape:'line',x1:s.x,y1:s.y,x2:s.x+Math.cos(ang)*300,y2:s.y+Math.sin(ang)*300,width:16},0.4,()=>{
            AudioEngine.SE.bossShoot();
            const a2=Math.atan2(p.y-s.y,p.x-s.x);
            game.bullets.push({x:s.x,y:s.y,vx:Math.cos(a2)*200,vy:Math.sin(a2)*200,r:6,dmg:b.dmg*0.35,owner:'enemy',color:'#ff6a2b'});
          });
        }
      }
      updateTelegraph(s,dt);
    });
  }
}

function splitBoss(b){
  AudioEngine.SE.hitEnemy(); screenShake(12);
  for(let i=0;i<2;i++){
    const ang=Math.random()*Math.PI*2;
    b.children.push({x:b.x+Math.cos(ang)*60,y:b.y+Math.sin(ang)*60,r:36,hp:b.maxHp*0.18,maxHp:b.maxHp*0.18,dmg:b.dmg*0.6,spd:b.spd*1.6,dead:false,hitFlash:0,dots:[],slowFactor:1,slowTimer:0,color:b.color});
    spawnParticles(b.x,b.y,b.color,20);
  }
}

function drawBossShape(b){
  ctx.save();
  const flash=b.hitFlash>0?'#fff':b.color;
  const ox=b.shakeOffsetX||0, oy=b.shakeOffsetY||0;
  ctx.translate(b.x + ox, b.y + oy);
  if(b.rotateAngle) ctx.rotate(b.rotateAngle);

  ctx.shadowColor=b.color; ctx.shadowBlur=24; ctx.fillStyle=flash; ctx.strokeStyle=b.color; ctx.lineWidth=3;
  if(b.shape==='pentagon') drawRoundedPolygon(0,0,b.r,5,-Math.PI/2,8);
  else if(b.shape==='heptagon') drawRoundedPolygon(0,0,b.r,7,-Math.PI/2,8);
  else if(b.shape==='triangle') drawRoundedPolygon(0,0,b.r,3,-Math.PI/2,8);
  else if(b.shape==='hexagram'){
    drawRoundedPolygon(0,0,b.r,3,-Math.PI/2,6);
    drawRoundedPolygon(0,0,b.r,3,Math.PI/2,6);
  }
  else { ctx.beginPath(); ctx.arc(0,0,b.r,0,Math.PI*2); }
  ctx.fill(); ctx.stroke();
  ctx.restore();

  if(b.transformPhase==='flash' && b.flashAlpha>0){
    ctx.save(); ctx.globalAlpha=b.flashAlpha; ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(b.x,b.y,b.r*1.4,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
}

function drawBoss(){
  const b=game.boss; if(!b) return;
  if(b.type==='centipede'){
    for(let i=b.segs.length-1;i>=0;i--){
      const s=b.segs[i]; if(s.dead) continue;
      ctx.save(); ctx.shadowColor=b.color; ctx.shadowBlur=14; ctx.fillStyle=i===0?'#fff':b.color; ctx.strokeStyle=b.color; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    return;
  }
  
  drawBossShape(b);

  if(b.children) b.children.forEach(c=>{
    if(c.dead) return;
    ctx.save(); ctx.shadowColor=c.color; ctx.shadowBlur=14; ctx.fillStyle=c.hitFlash>0?'#fff':c.color; ctx.strokeStyle=c.color; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(c.x,c.y,c.r,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.restore();
  });
}

function dissolveBoss(){
  const b=game.boss; if(!b) return;
  const pts = b.type==='centipede'? b.segs.filter(s=>!s.dead) : (b.type==='splitter'? [b,...b.children.filter(c=>!c.dead)] : [b]);
  pts.forEach(o=>spawnParticles(o.x,o.y,b.color,40));
  screenShake(22);
}
