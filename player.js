/* player.js（全文：ボクサーモード拡張・スーパークリティカル演出統合版） */

/*
  【skilltree.js 側の修正メモ】
  computePlayerStats 内の bowSearchRadius 算出行を以下に差し替えてください。
  --------------------------------------------------
  const rangeLv=gameData.tokenLevels['t_range']||0;
  const rangeMaxLv=t_range.maxLv;
  const playerR=20;
  build.bowSearchRadius = playerR*3 + (playerR*7-playerR*3)*Math.min(1,rangeLv/rangeMaxLv);
  build.mageSearchRadius = build.bowSearchRadius;
  --------------------------------------------------
*/

function makePlayer(){
  const {base,build}=computePlayerStats();
  return {x:0,y:0,r:20,hp:base.maxHp,maxHp:base.maxHp,base,build,
    atkTimer:0,boltTimer:0,mageTimer:0,fireballTimer:0,pistolTimer:0,sniperTimer:0,droneAngle:0,
    punchTimer:0,punchFxTimer:0,punchFxAngle:0,
    invuln:0,swingAngle:0,swingAnim:1,
    shield:0,shieldUnlockedThisRun:false,shieldRegenTimer:60,regenTickTimer:1,
    shieldAngle:0,shieldOrbits:[]};
}

function nearestEnemyTo(x,y){
  let best=null,bd=Infinity;
  game.enemies.forEach(e=>{ const d=dist(e.x,e.y,x,y); if(d<bd){bd=d;best=e;} });
  if(game.boss){
    const targets = game.boss.children? [game.boss,...game.boss.children.filter(c=>!c.dead)] : (game.boss.segs? game.boss.segs.filter(s=>!s.dead) : [game.boss]);
    targets.forEach(t=>{ if(t.dead) return; const d=dist(t.x,t.y,x,y); if(d<bd){bd=d;best=t;} });
  }
  return best;
}

function allTargets(){
  let list=[...game.enemies];
  if(game.boss){
    if(game.boss.children) list=list.concat(game.boss.children);
    if(game.boss.segs) list=list.concat(game.boss.segs);
    if(!game.boss.segs) list.push(game.boss);
  }
  return list.filter(t=>!t.dead);
}

function tryApplyStatus(e){
  const p=game.player; const chance=p.build.statusChance;
  if(chance<=0 || Math.random()>=chance) return;
  if(p.build.poisonDmg>0){ e.dots=e.dots||[]; e.dots.push({color:'#39ff88',dmg:p.build.poisonDmg*p.build.statusDmgMult,interval:0.5,tickTimer:0.5,remaining:p.build.poisonDuration||3}); }
  if(p.build.frostSlow>0){ e.slowFactor=Math.max(0.15,1-p.build.frostSlow); e.slowTimer=2; }
}

const easeOutBack=t=>{ const c1=1.70158,c3=c1+1; const tt=Math.min(1,Math.max(0,t)); return 1+c3*Math.pow(tt-1,3)+c1*Math.pow(tt-1,2); };

function updatePlayer(dt){
  const p=game.player;
  if(p.invuln>0) p.invuln-=dt;

  /* --- 血界タイマー減算 --- */
  if(game.bloodBorderTimer>0) game.bloodBorderTimer-=dt;

  /* --- Orbital Shield 更新 --- */
  p.shieldAngle=(p.shieldAngle||0)+dt*0.9;
  if(!p.shieldOrbits) p.shieldOrbits=[];
  const targetCount = p.shieldUnlockedThisRun ? (p.shield||0) : 0;
  while(p.shieldOrbits.length<targetCount){ p.shieldOrbits.push({scale:0}); if(AudioEngine.SE.shield) AudioEngine.SE.shield(); }
  while(p.shieldOrbits.length>targetCount){
    const idx=p.shieldOrbits.length-1;
    const n=Math.max(1,p.shieldOrbits.length);
    const ang=p.shieldAngle+(idx/n)*Math.PI*2;
    spawnParticles(p.x+Math.cos(ang)*46,p.y+Math.sin(ang)*46,'#00F0FF',16);
    p.shieldOrbits.pop();
  }
  p.shieldOrbits.forEach(o=>{ o.scale=Math.min(1,(o.scale||0)+dt*4); });

  let mvx=0,mvy=0;
  if(keys['w']||keys['arrowup']) mvy-=1;
  if(keys['s']||keys['arrowdown']) mvy+=1;
  if(keys['a']||keys['arrowleft']) mvx-=1;
  if(keys['d']||keys['arrowright']) mvx+=1;
  const len=Math.hypot(mvx,mvy)||1;
  p.x+=(mvx/len)*p.base.speed*dt; p.y+=(mvy/len)*p.base.speed*dt;
  p.x=Math.max(p.r,Math.min(W-p.r,p.x)); p.y=Math.max(p.r,Math.min(H-p.r,p.y));

  const targets=allTargets();

  /* --- 近接攻撃: ボクサーモード / 通常バット --- */
  if(p.build.boxerMode){
    p.punchTimer=(p.punchTimer===undefined?0:p.punchTimer)-dt;
    const baseInterval=Math.max(0.2, 1/p.base.atkSpd - (p.build.boxerAtkSpdSub||0));
    if(p.punchTimer<=0){
      const punchCount=p.build.boxerPunchCount||1;
      const punchRange=(p.build.boxerRange||p.base.range*0.8);
      p.punchTimer=baseInterval;
      for(let i=0;i<punchCount;i++){
        const delay=i*0.05;
        setTimeout(()=>{
          if(!game || !game.player || !game.player.build.boxerMode) return;
          const pl=game.player;
          const inRange=allTargets().filter(e=>dist(e.x,e.y,pl.x,pl.y)<=punchRange+e.r);
          if(inRange.length===0) return;
          const nearest=inRange.reduce((a,b)=>dist(a.x,a.y,pl.x,pl.y)<dist(b.x,b.y,pl.x,pl.y)?a:b);
          const ang=Math.atan2(nearest.y-pl.y,nearest.x-pl.x);
          pl.swingAngle=ang; pl.punchFxAngle=ang; pl.punchFxTimer=0.18;
          AudioEngine.SE.attack();
          const rawDmg=(pl.base.batDamage||pl.base.damage)+(pl.build.boxerBaseDmg||0);
          const dmg=rawDmg*(pl.build.boxerDmgMult||1);
          const critChance=pl.base.crit+(pl.build.boxerCritChanceBonus||0);
          const critMult=pl.base.critMult+(pl.build.boxerCritMultBonus||0);
          let isSuper=false, isCrit=false, finalDmg=dmg;
          if(pl.build.boxerSuperCritUnlocked && Math.random()<(pl.build.boxerSuperCritChance||0)){
            isSuper=true; finalDmg=dmg*(pl.build.boxerSuperCritMult||1);
          } else if(Math.random()<critChance){
            isCrit=true; finalDmg=dmg*critMult;
          }
          damageTarget(nearest, finalDmg, isCrit);
          tryApplyStatus(nearest);
          if(pl.lifedrainActive){
            const heal=finalDmg*0.1;
            pl.hp+=heal;
            if(pl.hp>pl.maxHp){ const overflow=pl.hp-pl.maxHp; pl.maxHp+=overflow; }
          }
          if(isSuper){ triggerSuperCritVisual(nearest.x,nearest.y,finalDmg); }
          if(pl.base.knockback>0){
            const kAng=Math.atan2(nearest.y-pl.y,nearest.x-pl.x);
            nearest.x+=Math.cos(kAng)*pl.base.knockback*0.12; nearest.y+=Math.sin(kAng)*pl.base.knockback*0.12;
          }
          spawnParticles(nearest.x,nearest.y,'#ff2b4d',6);
          game.swings=game.swings||[];
          game.swings.push({x:pl.x,y:pl.y,angle:ang,life:0.14,maxLife:0.14,range:punchRange,boxer:true});
        },delay*1000);
      }
    }
  } else if(!p.build.bowUnlocked){
    /* --- 通常バット攻撃 --- */
    p.atkTimer=(p.atkTimer===undefined?0:p.atkTimer)-dt;
    if(p.atkTimer<=0){
      const atkRange = p.base.range;
      const inRange=targets.filter(e=>dist(e.x,e.y,p.x,p.y)<=atkRange+e.r);
      if(inRange.length>0){
        p.atkTimer=1/p.base.atkSpd;
        const nearest=inRange.reduce((a,b)=>dist(a.x,a.y,p.x,p.y)<dist(b.x,b.y,p.x,p.y)?a:b);
        p.meleeAngle=Math.atan2(nearest.y-p.y,nearest.x-p.x);
        p.swingAngle=p.meleeAngle;
        p.swingAnim=0; game.hitStop=0.035;
        AudioEngine.SE.attack();
        const dmg=(p.base.batDamage||p.base.damage);
        inRange.forEach(e=>{
          const crit=Math.random()<p.base.crit;
          const dmgDealt=dmg*(crit?p.base.critMult:1);
          damageTarget(e,dmgDealt,crit);
          tryApplyStatus(e);
          if(p.lifedrainActive){
            const heal=dmgDealt*0.1;
            p.hp+=heal;
            if(p.hp>p.maxHp){ const overflow=p.hp-p.maxHp; p.maxHp+=overflow; }
            spawnParticles(e.x,e.y,'#ff2b4d',6);
          }
          if(p.base.knockback>0){
            const ang=Math.atan2(e.y-p.y,e.x-p.x);
            e.x+=Math.cos(ang)*p.base.knockback*0.12; e.y+=Math.sin(ang)*p.base.knockback*0.12;
          }
          spawnParticles(e.x,e.y,'#e8fbff',5);
        });
        game.swings.push({x:p.x,y:p.y,angle:p.meleeAngle,life:0.18,maxLife:0.18,range:atkRange,boxer:false});
      }
    }
    if(p.swingAnim<1) p.swingAnim=Math.min(1,p.swingAnim+dt/0.22);
  }

  /* --- 弓の発射処理 --- */
  if(p.build.bowUnlocked){
    p.boltTimer=(p.boltTimer||0)-dt;
    if(p.boltTimer<=0 && targets.length>0){
      p.boltTimer=p.build.bowFireInterval||1.5;
      const searchR=p.build.bowSearchRadius||(20*3);
      const inRange=targets.filter(e=>dist(e.x,e.y,p.x,p.y)<=searchR);
      const sorted=(inRange.length?inRange:targets).sort((a,b)=>dist(a.x,a.y,p.x,p.y)-dist(b.x,b.y,p.x,p.y));
      const n=Math.min(p.build.arrowCount||1, sorted.length);
      const rawDmg=(p.base.batDamage||p.base.damage)*(p.build.bowDmgMult||1);
      const maxHits=1+(p.build.arrowPierce||0);
      p.swingAngle=Math.atan2(sorted[0].y-p.y,sorted[0].x-p.x);
      for(let i=0;i<n;i++){
        const t=sorted[i%sorted.length];
        const ang=Math.atan2(t.y-p.y,t.x-p.x)+(i-((n-1)/2))*0.08;
        const delay=i*0.05;
        setTimeout(()=>{ AudioEngine.SE.attack(); },delay*1000);
        game.bullets.push({x:p.x,y:p.y,vx:Math.cos(ang)*420,vy:Math.sin(ang)*420,r:6,
          dmg:rawDmg,owner:'player',hitSet:new Set(),maxHits,color:'#f4ff00',isArrow:true,
          critChance:p.base.crit,critMult:p.base.critMult});
      }
    }
  }

  /* --- 魔術 --- */
  if(p.build.mageUnlocked){
    p.mageTimer=(p.mageTimer||0)-dt;
    if(p.mageTimer<=0 && targets.length>0){
      p.mageTimer=1.2/p.base.atkSpd; AudioEngine.SE.lightning();
      let current=nearestEnemyTo(p.x,p.y);
      const hit=new Set(); let chainDmg=p.build.mageDmg*p.build.mageDmgMult;
      let prevX=p.x,prevY=p.y;
      for(let i=0;i<=p.build.chainCount && current;i++){
        damageTarget(current,chainDmg,false); tryApplyStatus(current);
        game.lightnings.push({type:'bolt',x1:prevX,y1:prevY,x2:current.x,y2:current.y,life:0.18,maxLife:0.18});
        hit.add(current); prevX=current.x; prevY=current.y; chainDmg*=0.8;
        const next=targets.filter(e=>!hit.has(e)&&dist(e.x,e.y,current.x,current.y)<160).sort((a,b)=>dist(a.x,a.y,current.x,current.y)-dist(b.x,b.y,current.x,current.y))[0];
        current=next;
      }
    }
    if(p.build.fireballRadius>0){
      p.fireballTimer=(p.fireballTimer||0)-dt;
      if(p.fireballTimer<=0 && targets.length>0){
        p.fireballTimer=2.4/p.base.atkSpd;
        const t=nearestEnemyTo(p.x,p.y);
        if(t){
          AudioEngine.SE.fireball();
          game.fireballs.push({x:t.x,y:t.y,r:0,maxR:p.build.fireballRadius,life:0.4,maxLife:0.4});
          const dmg=p.build.fireballDmg*p.build.mageDmgMult;
          targets.forEach(e=>{ if(dist(e.x,e.y,t.x,t.y)<p.build.fireballRadius){ damageTarget(e,dmg,false); tryApplyStatus(e); } });
        }
      }
    }
  }

  /* --- ガンマン --- */
  if(p.build.gunnerUnlocked){
    if((p.build.pistolDmg||0)>0){
      p.pistolTimer=(p.pistolTimer||0)-dt;
      const interval=Math.max(0.15,0.5-(p.build.pistolSpd||0));
      if(p.pistolTimer<=0 && targets.length>0){
        p.pistolTimer=interval;
        const t=nearestEnemyTo(p.x,p.y);
        if(t){
          const ang=Math.atan2(t.y-p.y,t.x-p.x);
          game.bullets.push({x:p.x,y:p.y,vx:Math.cos(ang)*500,vy:Math.sin(ang)*500,r:4,
            dmg:(p.build.pistolDmg||0)*(p.build.gunnerDmgMult||1),owner:'player',hitSet:new Set(),maxHits:1,color:'#c4f5ff'});
        }
      }
    }
    if((p.build.sniperDmg||0)>0){
      p.sniperTimer=(p.sniperTimer||0)-dt;
      if(p.sniperTimer<=0 && targets.length>0){
        p.sniperTimer=1.6;
        const t=nearestEnemyTo(p.x,p.y);
        if(t){
          const ang=Math.atan2(t.y-p.y,t.x-p.x);
          game.bullets.push({x:p.x,y:p.y,vx:Math.cos(ang)*640,vy:Math.sin(ang)*640,r:5,
            dmg:(p.build.sniperDmg||0)*(p.build.gunnerDmgMult||1),owner:'player',hitSet:new Set(),
            maxHits:1+(p.build.sniperPierce||0),color:'#ffbe0b'});
        }
      }
    }
  }

  /* --- ドローン --- */
  if(p.build.droneCount>0){
    p.droneAngle+=dt*1.4;
    if(!game.drones || game.drones.length!==p.build.droneCount){
      game.drones=[]; for(let i=0;i<p.build.droneCount;i++) game.drones.push({angleOff:(i/p.build.droneCount)*Math.PI*2,timer:Math.random()});
    }
    game.drones.forEach(dr=>{
      dr.timer-=dt;
      const dx=p.x+Math.cos(p.droneAngle+dr.angleOff)*60, dy=p.y+Math.sin(p.droneAngle+dr.angleOff)*60;
      dr.x=dx; dr.y=dy;
      if(dr.timer<=0){
        const t=nearestEnemyTo(dx,dy);
        if(t && dist(t.x,t.y,dx,dy)<220){
          dr.timer=Math.max(0.35,0.9-(p.build.droneCdReduce||0));
          const ang=Math.atan2(t.y-dy,t.x-dx);
          game.bullets.push({x:dx,y:dy,vx:Math.cos(ang)*360,vy:Math.sin(ang)*360,r:4,dmg:p.build.droneDmg*p.build.droneDmgMult,owner:'player',maxHits:1,hitSet:new Set(),color:'#00fff2'});
          AudioEngine.SE.drone();
        }
      }
    });
  } else { game.drones=[]; }

  if(p.build.regenEnabled && p.hp<p.maxHp){
    p.regenTickTimer=(p.regenTickTimer===undefined?1:p.regenTickTimer)-dt;
    if(p.regenTickTimer<=0){
      p.regenTickTimer=1;
      const healAmt=Math.round(p.base.regen+(p.build.regen||0))||5;
      p.hp=Math.min(p.maxHp,p.hp+healAmt);
      game.regenPops=game.regenPops||[];
      game.regenPops.push({x:p.x,y:p.y-30,text:'+'+healAmt,life:1.0,maxLife:1.0,vy:-30});
      spawnParticles(p.x,p.y,'#39ff88',8);
    }
  }
  if(p.build.shieldAutoRegen && p.shieldUnlockedThisRun){
    const maxShield=3+(p.build.shieldMaxBonus||0);
    p.shieldRegenTimer=(p.shieldRegenTimer===undefined?60:p.shieldRegenTimer)-dt;
    if(p.shieldRegenTimer<=0){ p.shieldRegenTimer=60; if(p.shield<maxShield) p.shield++; }
  }
}

function damagePlayer(amount){
  const p=game.player; if(p.invuln>0) return;
  if(p.shieldUnlockedThisRun && (p.shield||0)>0){
    p.shield--;
    p.invuln=0.3;
    if(AudioEngine.SE.shieldBreak){ AudioEngine.SE.shieldBreak(); } else { AudioEngine.SE.playerHit(); }
    game.hitStop=Math.max(game.hitStop||0,0.05);
    const idx=p.shieldOrbits.length;
    const n=Math.max(1,p.shieldOrbits.length+1);
    const ang=p.shieldAngle+(idx/n)*Math.PI*2;
    spawnParticles(p.x+Math.cos(ang)*46,p.y+Math.sin(ang)*46,'#ffffff',10);
    spawnParticles(p.x+Math.cos(ang)*46,p.y+Math.sin(ang)*46,'#00F0FF',22);
    screenShake(6);
    return;
  }
  const reduced = amount*(1-Math.min(0.85,p.build.dmgReduction*p.build.dmgReductionMult));
  p.hp-=reduced; p.invuln=0.5; AudioEngine.SE.playerHit(); screenShake(10); spawnParticles(p.x,p.y,'#ff2b4d',10);
  if(!p.shieldUnlockedThisRun && isOwned(findNode('vt_armor')) && p.hp/p.maxHp<=0.3){
    p.shieldUnlockedThisRun=true;
    p.shield=3+(p.build.shieldMaxBonus||0);
    spawnParticles(p.x,p.y,'#00F0FF',30);
    screenShake(10);
  }
}

/* --- スーパークリティカル演出 --- */
function triggerSuperCritVisual(x,y,dmg){
  game.superCritFlash=0.06;
  screenShake(20);
  game.floatingTexts=game.floatingTexts||[];
  game.floatingTexts.push({x,y:y-40,text:Math.round(dmg).toString(),isSuperCrit:true,life:1.3,maxLife:1.3,vy:-20});
  if(AudioEngine.SE.superCrit) AudioEngine.SE.superCrit();
}

/* --- アストラ・アロー 詠唱魔法陣描画 --- */
function drawAstraCast(){
  if(!game.astraCast) return;
  const c=game.astraCast; c.life-=1/60;
  if(c.life<=0){ game.astraCast=null; return; }
  const a=Math.max(0,c.life/c.maxLife);
  ctx.save(); ctx.globalAlpha=a*0.6; ctx.strokeStyle='#c4f5ff'; ctx.shadowColor='#c4f5ff'; ctx.shadowBlur=20; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(c.x,c.y,40*(1+ (1-a)*0.6),0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(c.x,c.y,26*(1+ (1-a)*0.6),0,Math.PI*2); ctx.stroke();
  ctx.restore();
}

/* --- ライフドレイン 発動演出呼び出し --- */
function triggerLifedrainVisuals(){
  const p=game.player;
  game.bloodBorderTimer=10;
  game.shockwaves=game.shockwaves||[];
  game.shockwaves.push({x:p.x,y:p.y,r:0,maxR:260,life:0.6,maxLife:0.6});
}

/* --- ショックウェーブ描画 --- */
function drawShockwaves(dt){
  game.shockwaves=game.shockwaves||[];
  for(const s of game.shockwaves){
    s.life-=dt; s.r=s.maxR*(1-Math.max(0,s.life/s.maxLife));
    ctx.save(); ctx.globalAlpha=Math.max(0,s.life/s.maxLife)*0.5;
    ctx.strokeStyle='#8a0022'; ctx.lineWidth=6; ctx.shadowColor='#ff2b4d'; ctx.shadowBlur=20;
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }
  game.shockwaves=game.shockwaves.filter(s=>s.life>0);
}

/* --- 血界(画面枠パルス)描画 --- */
function drawBloodBorder(){
  if(!(game.bloodBorderTimer>0)) return;
  const pulse=0.4+0.3*Math.sin(performance.now()/200);
  ctx.save(); ctx.globalAlpha=pulse*0.5;
  ctx.strokeStyle='#ff2b4d'; ctx.lineWidth=30; ctx.shadowColor='#ff2b4d'; ctx.shadowBlur=40;
  ctx.strokeRect(0,0,W,H);
  ctx.restore();
}

/* --- 描画関数群 --- */
function drawCyberBat(p,batAngle,alpha,isTrail){
  ctx.save();
  ctx.globalAlpha*=alpha;
  ctx.translate(p.x+Math.cos(batAngle)*(p.r-2), p.y+Math.sin(batAngle)*(p.r-2));
  ctx.rotate(batAngle);
  const len=46, headW=13, gripW=4;
  const grad=ctx.createLinearGradient(0,0,len,0);
  grad.addColorStop(0,'#0a2a33'); grad.addColorStop(0.35,'#0affee'); grad.addColorStop(0.72,'#00fff2'); grad.addColorStop(1,'#ff00e5');
  ctx.shadowColor= isTrail? 'transparent' : '#00fff2';
  ctx.shadowBlur= isTrail?0:16;
  ctx.beginPath();
  ctx.moveTo(0,-gripW/2);
  ctx.quadraticCurveTo(len*0.55,-gripW/2, len,-headW/2);
  ctx.quadraticCurveTo(len+10,0, len,headW/2);
  ctx.quadraticCurveTo(len*0.55,gripW/2, 0,gripW/2);
  ctx.closePath();
  ctx.fillStyle=grad; ctx.fill();
  ctx.lineWidth=1.5; ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.stroke();
  if(!isTrail){
    ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(len*0.3,0); ctx.lineTo(len*0.75,0); ctx.stroke();
    ctx.beginPath(); ctx.arc(len*0.78,0,2.2,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  }
  ctx.restore();
}

function drawHoloBow(p){
  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.rotate(p.swingAngle);
  ctx.shadowColor='#f4ff00'; ctx.shadowBlur=14;
  ctx.strokeStyle='#f4ff00'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.arc(26,0,16,-1.1,1.1); ctx.stroke();
  ctx.strokeStyle='rgba(244,255,0,0.5)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(26,-15); ctx.lineTo(26,15); ctx.stroke();
  ctx.restore();
}

function drawGunbit(p,offAngle){
  const gx=p.x+Math.cos(p.swingAngle+offAngle)*30, gy=p.y+Math.sin(p.swingAngle+offAngle)*30;
  ctx.save();
  ctx.translate(gx,gy);
  ctx.shadowColor='#ffbe0b'; ctx.shadowBlur=10;
  ctx.fillStyle='#0a1830'; ctx.strokeStyle='#ffbe0b'; ctx.lineWidth=2;
  roundRectPath(ctx,-8,-5,16,10,3); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawNeonKnuckles(p){
  const ang=p.punchFxTimer>0 ? p.punchFxAngle : (p.meleeAngle!==undefined?p.meleeAngle:p.swingAngle);
  const kx=p.x+Math.cos(ang)*24, ky=p.y+Math.sin(ang)*24;
  ctx.save(); ctx.translate(kx,ky); ctx.shadowColor='#ff2b4d'; ctx.shadowBlur=10;
  ctx.fillStyle='#ff2b4d'; ctx.beginPath(); ctx.arc(0,0,7,0,Math.PI*2); ctx.fill(); ctx.restore();
}

function drawMothership(){
  const p=game.player;
  if(!p || !p.build || !p.build.legendDrone || (p.build.droneCount||0)<=0) return;
  ctx.save();
  ctx.translate(p.x,p.y-90);
  const overclock = game.mothership && game.mothership.overclockActive>0;
  ctx.shadowColor='#00fff2'; ctx.shadowBlur= overclock?30:16;
  ctx.fillStyle='#0a1830'; ctx.strokeStyle= overclock?'#ffbe0b':'#00fff2'; ctx.lineWidth=3;
  roundRectPath(ctx,-30,-14,60,28,10); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawLifedrainAura(){
  const p=game.player;
  if(!p.lifedrainActive) return;
  ctx.save();
  const pulse=0.7+0.3*Math.sin(performance.now()/150);
  ctx.globalAlpha=0.35*pulse;
  ctx.fillStyle='#8a0022';
  ctx.shadowColor='#ff2b4d'; ctx.shadowBlur=20;
  ctx.beginPath(); ctx.arc(p.x,p.y,p.r+16,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawPlayer(){
  /* 魔法陣（Astra）を自機下層に描画 */
  drawAstraCast();

  const p=game.player;
  ctx.save();
  if(p.invuln>0 && Math.floor(p.invuln*20)%2===0) ctx.globalAlpha=0.4;
  ctx.shadowColor=p.build.boxerMode?'#ff2b4d':'#00fff2'; ctx.shadowBlur=20;
  ctx.fillStyle='#0a1830'; ctx.strokeStyle=p.build.boxerMode?'#ff2b4d':'#00fff2'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#f4ff00'; ctx.shadowColor='#f4ff00'; ctx.shadowBlur=10;
  ctx.beginPath(); const cy=p.y-p.r-2;
  ctx.moveTo(p.x-12,cy); ctx.lineTo(p.x-12,cy-10); ctx.lineTo(p.x-6,cy-2); ctx.lineTo(p.x,cy-14);
  ctx.lineTo(p.x+6,cy-2); ctx.lineTo(p.x+12,cy-10); ctx.lineTo(p.x+12,cy); ctx.closePath(); ctx.fill();
  ctx.restore();

  if(p.build.bowUnlocked){
    drawHoloBow(p);
    if(p.build.boxerMode) drawNeonKnuckles(p);
  } else if(p.build.boxerMode){
    drawNeonKnuckles(p);
  } else {
    const off=(1-easeOutBack(p.swingAnim))*-1.3;
    if(p.swingAnim<0.85){
      [0.30,0.16].forEach((back,i)=>{
        const ta=Math.max(0,p.swingAnim-back);
        const toff=(1-easeOutBack(ta))*-1.3;
        drawCyberBat(p,p.swingAngle+toff,0.12*(2-i),true);
      });
    }
    drawCyberBat(p,p.swingAngle+off,1,false);
  }

  if(p.build.gunnerUnlocked){ drawGunbit(p,2.4); drawGunbit(p,-2.4); }

  (game.drones||[]).forEach(dr=>{
    ctx.save(); ctx.shadowColor='#00fff2'; ctx.shadowBlur=10; ctx.fillStyle='#0a1830'; ctx.strokeStyle='#00fff2'; ctx.lineWidth=2;
    roundRectPath(ctx,dr.x-7,dr.y-7,14,14,4); ctx.fill(); ctx.stroke(); ctx.restore();
  });

  drawLifedrainAura();
}

function drawHexPath(cx,cy,r){
  ctx.beginPath();
  for(let i=0;i<6;i++){ const a=i*Math.PI/3; const x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }
  ctx.closePath();
}

function drawOrbitalShields(){
  const p=game.player;
  if(!p.shieldOrbits || p.shieldOrbits.length===0) return;
  const n=p.shieldOrbits.length;
  const radius=46;
  p.shieldOrbits.forEach((o,i)=>{
    const ang=p.shieldAngle+(i/n)*Math.PI*2;
    const sx=p.x+Math.cos(ang)*radius, sy=p.y+Math.sin(ang)*radius;
    const pulse=0.85+0.15*Math.sin(performance.now()/300+i);
    ctx.save();
    ctx.translate(sx,sy); ctx.rotate(ang);
    ctx.scale((o.scale||1)*pulse,(o.scale||1)*pulse);
    ctx.shadowColor='#00F0FF'; ctx.shadowBlur=14;
    ctx.fillStyle='rgba(0,240,255,0.25)'; ctx.strokeStyle='#00F0FF'; ctx.lineWidth=2;
    drawHexPath(0,0,9);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  });
}
