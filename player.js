/* player.js */
function makePlayer(){
  const {base,build}=computePlayerStats();
  return {x:0,y:0,r:20,hp:base.maxHp,maxHp:base.maxHp,base,build,
    atkTimer:0,boltTimer:0,laserTimer:0,mageTimer:0,fireballTimer:0,droneAngle:0,
    invuln:0,swingAngle:0,shieldCd:0,shieldFlash:0};
}
function nearestEnemyTo(x,y){
  let best=null,bd=Infinity;
  game.enemies.forEach(e=>{ const d=dist(e.x,e.y,x,y); if(d<bd){bd=d;best=e;} });
  if(game.boss){
    const targets = game.boss.children? [game.boss,...game.boss.children.filter(c=>!c.dead)] : [game.boss];
    targets.forEach(t=>{ if(t.dead) return; const d=dist(t.x,t.y,x,y); if(d<bd){bd=d;best=t;} });
  }
  return best;
}
function allTargets(){
  let list=[...game.enemies];
  if(game.boss){ list.push(game.boss); if(game.boss.children) list=list.concat(game.boss.children.filter(c=>!c.dead)); }
  return list.filter(t=>!t.dead);
}
function tryApplyStatus(e){
  const p=game.player; const chance=p.build.statusChance;
  if(chance<=0 || Math.random()>=chance) return;
  if(p.build.poisonDmg>0) e.dots=e.dots||[], e.dots.push({color:'#39ff88',dmg:p.build.poisonDmg*p.build.statusDmgMult,interval:0.5,tickTimer:0.5,remaining:3});
  if(p.build.frostSlow>0){ e.slowFactor=Math.max(0.15,1-p.build.frostSlow); e.slowTimer=2; }
}
function updatePlayer(dt){
  const p=game.player;
  if(p.invuln>0) p.invuln-=dt;
  if(p.shieldFlash>0) p.shieldFlash-=dt;

  let mvx=0,mvy=0;
  if(keys['w']||keys['arrowup']) mvy-=1;
  if(keys['s']||keys['arrowdown']) mvy+=1;
  if(keys['a']||keys['arrowleft']) mvx-=1;
  if(keys['d']||keys['arrowright']) mvx+=1;
  const len=Math.hypot(mvx,mvy)||1;
  p.x+=(mvx/len)*p.base.speed*dt; p.y+=(mvy/len)*p.base.speed*dt;
  p.x=Math.max(p.r,Math.min(W-p.r,p.x)); p.y=Math.max(p.r,Math.min(H-p.r,p.y));

  // emergency shield
  if(p.build.shieldEnabled){
    if(p.shieldCd>0) p.shieldCd-=dt;
    if(p.hp/p.maxHp<0.3 && p.shieldCd<=0){
      p.invuln=1.5; p.shieldFlash=0.6; p.shieldCd=Math.max(6,20-p.build.shieldCdReduce);
      AudioEngine.SE.shield(); screenShake(14);
      allTargets().forEach(t=>{ const d=dist(t.x,t.y,p.x,p.y); if(d<180){ const ang=Math.atan2(t.y-p.y,t.x-p.x); t.x+=Math.cos(ang)*60; t.y+=Math.sin(ang)*60; } });
      spawnParticles(p.x,p.y,'#c4f5ff',30);
    }
  }

  const targets=allTargets();
  p.atkTimer-=dt;
  if(p.atkTimer<=0){
    const inRange=targets.filter(e=>dist(e.x,e.y,p.x,p.y)<=p.base.range+e.r);
    if(inRange.length>0){
      p.atkTimer=1/p.base.atkSpd;
      const nearest=inRange.reduce((a,b)=>dist(a.x,a.y,p.x,p.y)<dist(b.x,b.y,p.x,p.y)?a:b);
      p.swingAngle=Math.atan2(nearest.y-p.y,nearest.x-p.x);
      AudioEngine.SE.attack();
      let dmg = p.build.boxerMode? (p.base.damage+p.build.boxerDmg)*p.build.boxerDmgMult*p.build.boxerCombo : p.base.damage;
      inRange.forEach(e=>{ const crit=Math.random()<p.base.crit; damageTarget(e,dmg*(crit?2:1)); tryApplyStatus(e); });
      game.swings.push({x:p.x,y:p.y,angle:p.swingAngle,life:0.18,maxLife:0.18,range:p.base.range,boxer:p.build.boxerMode});
    }
  }

  if(!p.build.boxerMode){
    if(p.build.bowUnlocked){
      p.boltTimer-=dt;
      if(p.boltTimer<=0 && targets.length>0){
        p.boltTimer=1.0/p.base.atkSpd;
        const sorted=[...targets].sort((a,b)=>dist(a.x,a.y,p.x,p.y)-dist(b.x,b.y,p.x,p.y));
        const n=Math.min(p.build.arrowCount, sorted.length);
        for(let i=0;i<n;i++){
          const t=sorted[i%sorted.length];
          const ang=Math.atan2(t.y-p.y,t.x-p.x)+(i-((n-1)/2))*0.08;
          game.bullets.push({x:p.x,y:p.y,vx:Math.cos(ang)*420,vy:Math.sin(ang)*420,r:5,dmg:p.build.arrowDmg*p.build.bowDmgMult,owner:'player',pierce:false,hitSet:new Set(),color:'#f4ff00'});
        }
        AudioEngine.SE.attack();
      }
    }
    if(p.build.laserUnlocked){
      p.laserTimer-=dt;
      if(p.laserTimer<=0){
        const t=nearestEnemyTo(p.x,p.y);
        if(t){
          p.laserTimer=1.4/p.base.atkSpd;
          const ang=Math.atan2(t.y-p.y,t.x-p.x);
          const ex=p.x+Math.cos(ang)*p.base.range*2, ey=p.y+Math.sin(ang)*p.base.range*2;
          game.lightnings.push({type:'laser',x1:p.x,y1:p.y,x2:ex,y2:ey,life:0.22,maxLife:0.22});
          AudioEngine.SE.laser();
          const dmg=p.build.laserDmg*p.build.laserDmgMult;
          targets.forEach(e=>{ if(pointToSegDist(e.x,e.y,p.x,p.y,ex,ey)<p.build.laserWidth/2+e.r){ damageTarget(e,dmg); tryApplyStatus(e); } });
        }
      }
    }
    if(p.build.mageUnlocked){
      p.mageTimer-=dt;
      if(p.mageTimer<=0 && targets.length>0){
        p.mageTimer=1.2/p.base.atkSpd; AudioEngine.SE.lightning();
        let current=nearestEnemyTo(p.x,p.y);
        const hit=new Set(); let chainDmg=p.build.mageDmg*p.build.mageDmgMult;
        let prevX=p.x,prevY=p.y;
        for(let i=0;i<=p.build.chainCount && current;i++){
          damageTarget(current,chainDmg); tryApplyStatus(current);
          game.lightnings.push({type:'bolt',x1:prevX,y1:prevY,x2:current.x,y2:current.y,life:0.18,maxLife:0.18});
          hit.add(current); prevX=current.x; prevY=current.y; chainDmg*=0.8;
          const next=targets.filter(e=>!hit.has(e)&&dist(e.x,e.y,current.x,current.y)<160).sort((a,b)=>dist(a.x,a.y,current.x,current.y)-dist(b.x,b.y,current.x,current.y))[0];
          current=next;
        }
      }
      if(p.build.fireballRadius>0){
        p.fireballTimer-=dt;
        if(p.fireballTimer<=0 && targets.length>0){
          p.fireballTimer=2.4/p.base.atkSpd;
          const t=nearestEnemyTo(p.x,p.y);
          if(t){
            AudioEngine.SE.fireball();
            game.fireballs.push({x:t.x,y:t.y,r:0,maxR:p.build.fireballRadius,life:0.4,maxLife:0.4});
            const dmg=p.build.fireballDmg*p.build.mageDmgMult;
            targets.forEach(e=>{ if(dist(e.x,e.y,t.x,t.y)<p.build.fireballRadius){ damageTarget(e,dmg); tryApplyStatus(e); } });
          }
        }
      }
    }
  }

  // drones
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
          dr.timer=0.9;
          const ang=Math.atan2(t.y-dy,t.x-dx);
          game.bullets.push({x:dx,y:dy,vx:Math.cos(ang)*360,vy:Math.sin(ang)*360,r:4,dmg:p.build.droneDmg*p.build.droneDmgMult,owner:'player',pierce:false,hitSet:new Set(),color:'#00fff2'});
          AudioEngine.SE.drone();
        }
      }
    });
  } else { game.drones=[]; }

  if(p.base.regen>0 && p.hp<p.maxHp) p.hp=Math.min(p.maxHp,p.hp+p.base.regen*dt);
}
function damagePlayer(amount){
  const p=game.player; if(p.invuln>0) return;
  const reduced = amount*(1-Math.min(0.85,p.build.dmgReduction*p.build.dmgReductionMult));
  p.hp-=reduced; p.invuln=0.5; AudioEngine.SE.playerHit(); screenShake(10); spawnParticles(p.x,p.y,'#ff2b4d',10);
}
function drawPlayer(){
  const p=game.player;
  ctx.save();
  if(p.invuln>0 && Math.floor(p.invuln*20)%2===0) ctx.globalAlpha=0.4;
  if(p.shieldFlash>0){ ctx.save(); ctx.strokeStyle='#c4f5ff'; ctx.lineWidth=3; ctx.globalAlpha=p.shieldFlash; ctx.beginPath(); ctx.arc(p.x,p.y,60,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
  ctx.shadowColor=p.build.boxerMode?'#ff2b4d':'#00fff2'; ctx.shadowBlur=20;
  ctx.fillStyle='#0a1830'; ctx.strokeStyle=p.build.boxerMode?'#ff2b4d':'#00fff2'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#f4ff00'; ctx.shadowColor='#f4ff00'; ctx.shadowBlur=10;
  ctx.beginPath(); const cy=p.y-p.r-2;
  ctx.moveTo(p.x-12,cy); ctx.lineTo(p.x-12,cy-10); ctx.lineTo(p.x-6,cy-2); ctx.lineTo(p.x,cy-14);
  ctx.lineTo(p.x+6,cy-2); ctx.lineTo(p.x+12,cy-10); ctx.lineTo(p.x+12,cy); ctx.closePath(); ctx.fill();
  if(!p.build.boxerMode){
    ctx.strokeStyle='#c98a4b'; ctx.lineWidth=5; ctx.shadowBlur=0;
    ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+Math.cos(p.swingAngle)*(p.r+14), p.y+Math.sin(p.swingAngle)*(p.r+14)); ctx.stroke();
  } else {
    ctx.fillStyle='#ff2b4d'; ctx.shadowBlur=0;
    ctx.beginPath(); ctx.arc(p.x+Math.cos(p.swingAngle)*(p.r+8), p.y+Math.sin(p.swingAngle)*(p.r+8),7,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
  (game.drones||[]).forEach(dr=>{
    ctx.save(); ctx.shadowColor='#00fff2'; ctx.shadowBlur=10; ctx.fillStyle='#0a1830'; ctx.strokeStyle='#00fff2'; ctx.lineWidth=2;
    roundRectPath(ctx,dr.x-7,dr.y-7,14,14,4); ctx.fill(); ctx.stroke(); ctx.restore();
  });
}
