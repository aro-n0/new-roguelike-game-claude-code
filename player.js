/* player.js */

/* --- レジェンドアクティブ発動 --- */
function triggerLegendSkill(key){
  const p=game.player;
  if(!game.legendCooldowns) game.legendCooldowns={crosscut:0,shotgun:0,lifedrain:0};
  if(game.legendCooldowns[key]>0) return;
  if(key==='crosscut' && p.build.legendMage){
    game.legendCooldowns.crosscut=18;
    game.flashTimer=0.35; screenShake(20); AudioEngine.SE.crosscut();
    game.lightnings.push({type:'laser',x1:0,y1:p.y,x2:W,y2:p.y,life:0.5,maxLife:0.5});
    game.lightnings.push({type:'laser',x1:p.x,y1:0,x2:p.x,y2:H,life:0.5,maxLife:0.5});
    const dmg=(p.build.mageDmg*p.build.mageDmgMult||40)*6;
    allTargets().forEach(e=>{
      if(Math.abs(e.y-p.y)<60 || Math.abs(e.x-p.x)<60){ damageTarget(e,dmg,false); spawnParticles(e.x,e.y,'#00fff2',20); }
    });
  }
  else if(key==='shotgun' && p.build.legendGunner){
    game.legendCooldowns.shotgun=16;
    AudioEngine.SE.shotgunCock(); screenShake(16);
    const baseAng=p.swingAngle;
    for(let i=-4;i<=4;i++){
      const ang=baseAng+i*0.11;
      game.bullets.push({x:p.x,y:p.y,vx:Math.cos(ang)*600,vy:Math.sin(ang)*600,r:6,dmg:((p.build.pistolDmg||0)+(p.build.sniperDmg||0)+30),owner:'player',pierce:true,hitSet:new Set(),color:'#ffbe0b'});
    }
    spawnParticles(p.x,p.y,'#ffbe0b',30);
  }
  else if(key==='lifedrain' && p.build.legendVitality){
    if(p.hp>=p.maxHp*0.99) return;
    game.legendCooldowns.lifedrain=14;
    AudioEngine.SE.lifedrain(); screenShake(10);
    const targets=allTargets().filter(e=>dist(e.x,e.y,p.x,p.y)<260);
    let healed=0;
    targets.forEach(e=>{ const dmg=30+p.base.damage*4; damageTarget(e,dmg,false); healed+=dmg*0.5; spawnParticles(e.x,e.y,'#ff2b4d',10); });
    p.hp=Math.min(p.maxHp,p.hp+healed);
    spawnParticles(p.x,p.y,'#39ff88',30);
  }
}

/* 自動発動系レジェンドパッシブ処理 */
function updateLegendPassives(dt){
  const p=game.player;
  if(p.build.legendBoxer && p.build.boxerMode){
    p._superCritTimer=(p._superCritTimer||0)-dt;
    if(p._superCritTimer<=0){
      p._superCritTimer=0.3;
      if(Math.random()<0.003){
        const t=nearestEnemyTo(p.x,p.y);
        if(t){
          const dmg=(t.maxHp||t.hp)*0.4;
          damageTarget(t,dmg,true);
          screenShake(26); game.flashTimer=0.25; AudioEngine.SE.superCrit();
          spawnParticles(t.x,t.y,'#fff',40);
        }
      }
    }
  }
  if(p.build.legendChem && p.build.chemUnlocked){
    /* 火傷は tryApplyStatus 内で別途付与（enemy.dots に burn タイプを追加） */
  }
  if(p.build.legendBow && p.build.bowUnlocked){
    p._astraTimer=(p._astraTimer||0)-dt;
    if(p._astraTimer<=0){
      p._astraTimer=10;
      const t=nearestEnemyTo(p.x,p.y);
      if(t){
        AudioEngine.SE.astraArrow(); screenShake(14);
        const ang=Math.atan2(t.y-p.y,t.x-p.x);
        game.bullets.push({x:p.x,y:p.y,vx:Math.cos(ang)*700,vy:Math.sin(ang)*700,r:14,dmg:(p.build.arrowDmg*p.build.bowDmgMult||20)*8,owner:'player',pierce:true,hitSet:new Set(),color:'#f4ff00'});
      }
    }
  }
  if(p.build.legendDrone && p.build.droneCount>0){
    if(!game.mothership) game.mothership={angle:0,laserTimer:2,overclockTimer:8,overclockActive:0};
    const ms=game.mothership;
    ms.laserTimer-=dt;
    if(ms.laserTimer<=0){
      ms.laserTimer=2.5;
      const t=nearestEnemyTo(p.x,p.y-90);
      if(t){
        AudioEngine.SE.mothershipLaser();
        const ang=Math.atan2(t.y-(p.y-90),t.x-p.x);
        game.lightnings.push({type:'laser',x1:p.x,y1:p.y-90,x2:p.x+Math.cos(ang)*600,y2:p.y-90+Math.sin(ang)*600,life:0.3,maxLife:0.3});
        allTargets().forEach(e=>{ if(pointToSegDist(e.x,e.y,p.x,p.y-90,p.x+Math.cos(ang)*600,p.y-90+Math.sin(ang)*600)<18) damageTarget(e,60,false); });
      }
    }
    ms.overclockTimer-=dt;
    if(ms.overclockTimer<=0){ ms.overclockTimer=8; ms.overclockActive=3; AudioEngine.SE.drone(); }
    if(ms.overclockActive>0) ms.overclockActive-=dt;
  }
}

function makePlayer(){
  const {base,build}=computePlayerStats();
  return {x:0,y:0,r:20,hp:base.maxHp,maxHp:base.maxHp,base,build,
    atkTimer:0,boltTimer:0,mageTimer:0,fireballTimer:0,droneAngle:0,
    invuln:0,swingAngle:0,swingAnim:1,shieldCd:0,shieldFlash:0};
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
  if(p.build.poisonDmg>0){ e.dots=e.dots||[]; e.dots.push({color:'#39ff88',dmg:p.build.poisonDmg*p.build.statusDmgMult,interval:0.5,tickTimer:0.5,remaining:3}); }
  if(p.build.frostSlow>0){ e.slowFactor=Math.max(0.15,1-p.build.frostSlow); e.slowTimer=2; }
}

const easeOutBack=t=>{ const c1=1.70158,c3=c1+1; const tt=Math.min(1,Math.max(0,t)); return 1+c3*Math.pow(tt-1,3)+c1*Math.pow(tt-1,2); };

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
      p.swingAnim=0; game.hitStop=0.035;
      AudioEngine.SE.attack();
      let dmg = p.build.boxerMode? (p.base.damage+p.build.boxerDmg)*p.build.boxerDmgMult*p.build.boxerCombo : p.base.damage;
      inRange.forEach(e=>{
        const crit=Math.random()<p.base.crit;
        damageTarget(e,dmg*(crit?2:1),crit); // 第3引数に crit (クリティカルフラグ) を追加
        tryApplyStatus(e);
        const kb=(40+p.base.knockback)*0.35; // ノックバック力を強化
        const ang=Math.atan2(e.y-p.y,e.x-p.x);
        e.x+=Math.cos(ang)*kb; e.y+=Math.sin(ang)*kb;
        spawnParticles(e.x,e.y,'#e8fbff',5);
      });
      game.swings.push({x:p.x,y:p.y,angle:p.swingAngle,life:0.18,maxLife:0.18,range:p.base.range,boxer:p.build.boxerMode});
    }
  }
  if(p.swingAnim<1) p.swingAnim=Math.min(1,p.swingAnim+dt/0.22);

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
          dr.timer=Math.max(0.35,0.9-p.build.droneCdReduce);
          const ang=Math.atan2(t.y-dy,t.x-dx);
          game.bullets.push({x:dx,y:dy,vx:Math.cos(ang)*360,vy:Math.sin(ang)*360,r:4,dmg:p.build.droneDmg*p.build.droneDmgMult,owner:'player',pierce:false,hitSet:new Set(),color:'#00fff2'});
          AudioEngine.SE.drone();
        }
      }
    });
  } else { game.drones=[]; }

  updateLegendPassives(dt); // regen処理の直前に追記

  if(p.base.regen>0 && p.hp<p.maxHp) p.hp=Math.min(p.maxHp,p.hp+p.base.regen*dt);
}

function damagePlayer(amount){
  const p=game.player; if(p.invuln>0) return;
  const reduced = amount*(1-Math.min(0.85,p.build.dmgReduction*p.build.dmgReductionMult));
  p.hp-=reduced; p.invuln=0.5; AudioEngine.SE.playerHit(); screenShake(10); spawnParticles(p.x,p.y,'#ff2b4d',10);
}

function drawMothership(){
  if(!game.player.build.legendDrone || game.player.build.droneCount<=0) return;
  const p=game.player, ms=game.mothership;
  ctx.save();
  ctx.translate(p.x,p.y-90);
  ctx.shadowColor='#00fff2'; ctx.shadowBlur=(ms&&ms.overclockActive>0)?30:16;
  ctx.fillStyle='#0a1830'; ctx.strokeStyle= (ms&&ms.overclockActive>0)?'#ffbe0b':'#00fff2'; ctx.lineWidth=3;
  roundRectPath(ctx,-30,-14,60,28,10); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawCyberBat(p,batAngle,alpha,isTrail){
  ctx.save();
  ctx.globalAlpha*=alpha;
  ctx.translate(p.x+Math.cos(batAngle)*(p.r-2), p.y+Math.sin(batAngle)*(p.r-2));
  ctx.rotate(batAngle);
  const len=46, headW=13, gripW=4;
  const grad=ctx.createLinearGradient(0,0,len,0);
  grad.addColorStop(0,'#0a2a33');
  grad.addColorStop(0.35,'#0affee');
  grad.addColorStop(0.72,'#00fff2');
  grad.addColorStop(1,'#ff00e5');
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
  ctx.restore();

  if(!p.build.boxerMode){
    const off=(1-easeOutBack(p.swingAnim))*-1.3;
    if(p.swingAnim<0.85){
      [0.30,0.16].forEach((back,i)=>{
        const ta=Math.max(0,p.swingAnim-back);
        const toff=(1-easeOutBack(ta))*-1.3;
        drawCyberBat(p,p.swingAngle+toff,0.12*(2-i),true);
      });
    }
    drawCyberBat(p,p.swingAngle+off,1,false);
  } else {
    ctx.save(); ctx.fillStyle='#ff2b4d'; ctx.shadowColor='#ff2b4d'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(p.x+Math.cos(p.swingAngle)*(p.r+8), p.y+Math.sin(p.swingAngle)*(p.r+8),7,0,Math.PI*2); ctx.fill(); ctx.restore();
  }

  (game.drones||[]).forEach(dr=>{
    ctx.save(); ctx.shadowColor='#00fff2'; ctx.shadowBlur=10; ctx.fillStyle='#0a1830'; ctx.strokeStyle='#00fff2'; ctx.lineWidth=2;
    roundRectPath(ctx,dr.x-7,dr.y-7,14,14,4); ctx.fill(); ctx.stroke(); ctx.restore();
  });

  drawMothership(); // ドローン描画の後にマザーシップを描画
}
