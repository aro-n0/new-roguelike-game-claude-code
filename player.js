/* player.js（全文更新：バット既存演出完全維持＋マルチ武器配置＋Orbital Shield＋独立ダメージ計算） */
function makePlayer(){
  const {base,build}=computePlayerStats();
  return {x:0,y:0,r:20,hp:base.maxHp,maxHp:base.maxHp,base,build,
    atkTimer:0,boltTimer:0,mageTimer:0,fireballTimer:0,pistolTimer:0,sniperTimer:0,droneAngle:0,
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

  /* --- バット（既存演出完全維持）: 弓術習得時のみ非表示・攻撃停止 --- */
  if(!p.build.bowUnlocked){
    p.atkTimer-=dt;
    if(p.atkTimer<=0){
      const atkRange = p.build.boxerMode ? (p.build.boxerRange||42) : p.base.range;
      const inRange=targets.filter(e=>dist(e.x,e.y,p.x,p.y)<=atkRange+e.r);
      if(inRange.length>0){
        const atkSpd = p.build.boxerMode ? p.base.atkSpd*(p.build.boxerAtkSpdMul||1) : p.base.atkSpd;
        p.atkTimer=1/atkSpd;
        const nearest=inRange.reduce((a,b)=>dist(a.x,a.y,p.x,p.y)<dist(b.x,b.y,p.x,p.y)?a:b);
        p.swingAngle=Math.atan2(nearest.y-p.y,nearest.x-p.x);
        p.swingAnim=0; game.hitStop=0.035;
        AudioEngine.SE.attack();
        let dmg;
        if(p.build.boxerMode){
          dmg=((p.base.batDamage||p.base.damage)+p.build.boxerDmg)*p.build.boxerDmgMult*p.build.boxerCombo;
        } else {
          dmg=(p.base.batDamage||p.base.damage);
        }
        inRange.forEach(e=>{
          const crit=Math.random()<(p.base.crit+(p.build.boxerCritBonus||0));
          damageTarget(e,dmg*(crit?p.base.critMult:1),crit);
          tryApplyStatus(e);
          if(p.base.knockback>0){
            const ang=Math.atan2(e.y-p.y,e.x-p.x);
            e.x+=Math.cos(ang)*p.base.knockback*0.12; e.y+=Math.sin(ang)*p.base.knockback*0.12;
          }
          spawnParticles(e.x,e.y,'#e8fbff',5);
        });
        game.swings.push({x:p.x,y:p.y,angle:p.swingAngle,life:0.18,maxLife:0.18,range:atkRange,boxer:p.build.boxerMode});
      }
    }
    if(p.swingAnim<1) p.swingAnim=Math.min(1,p.swingAnim+dt/0.22);
  }

  /* --- 弓（前座解放でバット代替、独立ダメージ計算） --- */
  if(p.build.bowUnlocked){
    p.boltTimer=(p.boltTimer||0)-dt;
    if(p.boltTimer<=0 && targets.length>0){
      p.boltTimer=p.build.bowFireInterval||1.5;
      const searchR=p.build.bowSearchRadius||300;
      const inRange=targets.filter(e=>dist(e.x,e.y,p.x,p.y)<=searchR);
      const sorted=(inRange.length?inRange:targets).sort((a,b)=>dist(a.x,a.y,p.x,p.y)-dist(b.x,b.y,p.x,p.y));
      const n=Math.min(p.build.arrowCount||1, sorted.length);
      const rawDmg=(p.base.batDamage||p.base.damage)*(p.build.bowDmgMult||1);
      p.swingAngle=Math.atan2(sorted[0].y-p.y,sorted[0].x-p.x);
      for(let i=0;i<n;i++){
        const t=sorted[i%sorted.length];
        const ang=Math.atan2(t.y-p.y,t.x-p.x)+(i-((n-1)/2))*0.08;
        const delay=i*0.05;
        setTimeout(()=>{ AudioEngine.SE.attack(); },delay*1000);
        game.bullets.push({x:p.x,y:p.y,vx:Math.cos(ang)*420,vy:Math.sin(ang)*420,r:6,
          dmg:rawDmg,owner:'player',pierce:(p.build.arrowPierce||0)>0,pierceMax:p.build.arrowPierce||0,hitSet:new Set(),color:'#f4ff00',isArrow:true,critChance:p.base.crit,critMult:p.base.critMult});
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

  /* --- ガンマン（バット/弓/拳と併用可・独立射撃） --- */
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
            dmg:(p.build.pistolDmg||0)*(p.build.gunnerDmgMult||1),owner:'player',pierce:false,hitSet:new Set(),color:'#c4f5ff'});
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
            dmg:(p.build.sniperDmg||0)*(p.build.gunnerDmgMult||1),owner:'player',pierce:(p.build.sniperPierce||0)>0,pierceMax:p.build.sniperPierce||0,hitSet:new Set(),color:'#ffbe0b'});
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
          game.bullets.push({x:dx,y:dy,vx:Math.cos(ang)*360,vy:Math.sin(ang)*360,r:4,dmg:p.build.droneDmg*p.build.droneDmgMult,owner:'player',pierce:false,hitSet:new Set(),color:'#00fff2'});
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

/* --- 描画: バット既存演出を完全維持 --- */
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
  [-1,1].forEach(side=>{
    const kx=p.x+Math.cos(p.swingAngle+side*1.2)*24, ky=p.y+Math.sin(p.swingAngle+side*1.2)*24;
    ctx.save(); ctx.translate(kx,ky); ctx.shadowColor='#ff2b4d'; ctx.shadowBlur=10;
    ctx.fillStyle='#ff2b4d'; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill(); ctx.restore();
  });
}
function drawPlayer(){
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

  /* メイン武器: バット優先維持、弓習得時のみ弓に切替 */
  if(p.build.bowUnlocked){
    drawHoloBow(p);
    if(p.build.boxerMode) drawNeonKnuckles(p);
  } else if(p.build.boxerMode){
    ctx.save(); ctx.fillStyle='#ff2b4d'; ctx.shadowColor='#ff2b4d'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(p.x+Math.cos(p.swingAngle)*(p.r+8), p.y+Math.sin(p.swingAngle)*(p.r+8),7,0,Math.PI*2); ctx.fill(); ctx.restore();
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

  /* ガンビット（バット/弓/拳と併用可） */
  if(p.build.gunnerUnlocked){ drawGunbit(p,2.4); drawGunbit(p,-2.4); }

  (game.drones||[]).forEach(dr=>{
    ctx.save(); ctx.shadowColor='#00fff2'; ctx.shadowBlur=10; ctx.fillStyle='#0a1830'; ctx.strokeStyle='#00fff2'; ctx.lineWidth=2;
    roundRectPath(ctx,dr.x-7,dr.y-7,14,14,4); ctx.fill(); ctx.stroke(); ctx.restore();
  });
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
