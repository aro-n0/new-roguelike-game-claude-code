/* audio.js（完全版：AudioEngine + BGMManager。playQueuedNow未定義エラーを解消し、TRACKSを整理） */
"use strict";

const AudioEngine=(function(){
  let ctx=null,master=null,bgmGain=null,seGain=null,bgmNodes=[];

  function init(){
    if(ctx) return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain(); master.connect(ctx.destination);
    bgmGain=ctx.createGain(); bgmGain.gain.value=0.35; bgmGain.connect(master);
    seGain=ctx.createGain(); seGain.gain.value=0.7; seGain.connect(master);
  }
  function setVol(bgm,se){
    if(bgmGain) bgmGain.gain.value=bgm;
    if(seGain) seGain.gain.value=se;
    if(typeof BGMManager!=='undefined' && BGMManager.setVolume) BGMManager.setVolume(bgm);
  }
  function tone({freq=440,dur=0.15,type='sine',gain=0.3,slideTo=null,delay=0}){
    if(!ctx) return;
    const t0=ctx.currentTime+delay;
    const osc=ctx.createOscillator(); const g=ctx.createGain();
    osc.type=type; osc.frequency.setValueAtTime(freq,t0);
    if(slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo),t0+dur);
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(gain,t0+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    osc.connect(g); g.connect(seGain);
    osc.start(t0); osc.stop(t0+dur+0.02);
  }
  function noise({dur=0.2,gain=0.25,delay=0,filterFreq=1200}){
    if(!ctx) return;
    const t0=ctx.currentTime+delay;
    const size=Math.max(1,Math.floor(ctx.sampleRate*dur));
    const buf=ctx.createBuffer(1,size,ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<size;i++) d[i]=(Math.random()*2-1)*(1-i/size);
    const src=ctx.createBufferSource(); src.buffer=buf;
    const filter=ctx.createBiquadFilter(); filter.type='bandpass'; filter.frequency.value=filterFreq;
    const g=ctx.createGain(); g.gain.setValueAtTime(gain,t0); g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
    src.connect(filter); filter.connect(g); g.connect(seGain);
    src.start(t0);
  }

  const SE={
    attack(){ tone({freq:220,slideTo:120,dur:0.09,type:'square',gain:0.18}); },
    hitEnemy(){ noise({dur:0.08,gain:0.3,filterFreq:1800}); },
    enemyDie(){ tone({freq:520,slideTo:60,dur:0.28,type:'sawtooth',gain:0.22}); noise({dur:0.15,gain:0.15,filterFreq:900,delay:0.02}); },
    playerHit(){ tone({freq:140,slideTo:50,dur:0.32,type:'triangle',gain:0.35}); noise({dur:0.25,gain:0.2,filterFreq:400}); },
    token(){ tone({freq:1500,slideTo:2200,dur:0.08,type:'sine',gain:0.16}); },
    chest(){ tone({freq:440,slideTo:1200,dur:0.4,type:'sine',gain:0.3}); tone({freq:660,slideTo:1600,dur:0.4,type:'sine',gain:0.22,delay:0.06}); },
    chestFanfare(){
      [440,554,660,880].forEach((f,i)=>tone({freq:f,slideTo:f*1.4,dur:0.35,type:'sine',gain:0.26,delay:i*0.09}));
      noise({dur:0.3,gain:0.15,filterFreq:2200,delay:0.02});
    },
    skillBuy(){ tone({freq:300,slideTo:900,dur:0.18,type:'square',gain:0.2}); },
    unlock(){ tone({freq:600,slideTo:1400,dur:0.16,type:'sine',gain:0.22}); tone({freq:1000,slideTo:2000,dur:0.22,type:'sine',gain:0.18,delay:0.05}); },
    starGain(){ tone({freq:660,slideTo:1320,dur:0.3,type:'sine',gain:0.28}); tone({freq:990,slideTo:1980,dur:0.35,type:'sine',gain:0.2,delay:0.08}); },
    waveStart(){ tone({freq:110,slideTo:220,dur:0.5,type:'sawtooth',gain:0.25}); },
    gameOver(){ tone({freq:300,slideTo:40,dur:1.1,type:'sawtooth',gain:0.3}); },
    gameClear(){ tone({freq:440,slideTo:880,dur:0.5,type:'sine',gain:0.3}); tone({freq:660,slideTo:1320,dur:0.6,type:'sine',gain:0.25,delay:0.2}); tone({freq:880,slideTo:1760,dur:0.8,type:'sine',gain:0.22,delay:0.4}); },
    click(){ tone({freq:600,dur:0.05,type:'square',gain:0.15}); },
    pop(){ tone({freq:520,slideTo:760,dur:0.06,type:'sine',gain:0.12}); },
    critical(){ tone({freq:1200,slideTo:2200,dur:0.18,type:'square',gain:0.22}); noise({dur:0.1,gain:0.15,filterFreq:3000}); },
    laser(){ tone({freq:1400,slideTo:300,dur:0.22,type:'sawtooth',gain:0.16}); },
    lightning(){ noise({dur:0.12,gain:0.28,filterFreq:2600}); tone({freq:1800,slideTo:400,dur:0.1,type:'square',gain:0.12}); },
    fireball(){ noise({dur:0.3,gain:0.3,filterFreq:300}); tone({freq:100,slideTo:40,dur:0.4,type:'sawtooth',gain:0.2}); },
    poison(){ tone({freq:300,slideTo:260,dur:0.15,type:'sine',gain:0.08}); },
    drone(){ tone({freq:900,slideTo:1300,dur:0.06,type:'square',gain:0.1}); },
    shield(){ tone({freq:200,slideTo:800,dur:0.4,type:'sine',gain:0.3}); noise({dur:0.3,gain:0.2,filterFreq:2000}); },
    shieldBreak(){ tone({freq:2200,slideTo:600,dur:0.18,type:'square',gain:0.22}); noise({dur:0.15,gain:0.2,filterFreq:3500}); },
    bossAppear(){ tone({freq:60,slideTo:30,dur:1.4,type:'sawtooth',gain:0.4}); noise({dur:1.0,gain:0.3,filterFreq:200}); },
    bossDie(){ tone({freq:200,slideTo:20,dur:2.0,type:'sawtooth',gain:0.4}); noise({dur:1.5,gain:0.35,filterFreq:500,delay:0.1}); },
    bossShoot(){ tone({freq:180,slideTo:80,dur:0.15,type:'square',gain:0.2}); },
    crosscut(){ tone({freq:2400,slideTo:400,dur:0.4,type:'sawtooth',gain:0.3}); noise({dur:0.5,gain:0.25,filterFreq:4000}); },
    shotgunCock(){ noise({dur:0.12,gain:0.3,filterFreq:800}); tone({freq:80,slideTo:40,dur:0.5,type:'square',gain:0.3,delay:0.08}); noise({dur:0.4,gain:0.28,filterFreq:1500,delay:0.1}); },
    lifedrain(){ tone({freq:60,slideTo:80,dur:0.6,type:'sine',gain:0.3}); tone({freq:60,slideTo:80,dur:0.6,type:'sine',gain:0.25,delay:0.5}); },
    superCrit(){ tone({freq:50,slideTo:25,dur:0.8,type:'square',gain:0.4}); noise({dur:0.5,gain:0.3,filterFreq:200}); },
    astraArrow(){ tone({freq:300,slideTo:2000,dur:0.5,type:'sawtooth',gain:0.25}); noise({dur:0.3,gain:0.2,filterFreq:3000,delay:0.1}); },
    mothershipLaser(){ tone({freq:150,slideTo:1800,dur:0.35,type:'sawtooth',gain:0.2}); },
    transformRumble(){ tone({freq:45,dur:4.0,type:'sawtooth',gain:0.3}); noise({dur:4.0,gain:0.22,filterFreq:150}); },
    transformFlash(){ tone({freq:800,slideTo:1600,dur:0.25,type:'sine',gain:0.35}); noise({dur:0.2,gain:0.3,filterFreq:4000}); },
    transformSpark(){ noise({dur:0.06,gain:0.2,filterFreq:5000}); tone({freq:2000,slideTo:200,dur:0.08,type:'square',gain:0.15}); },
    transformDeepImpact(){ tone({freq:60,slideTo:20,dur:0.6,type:'sawtooth',gain:0.4}); noise({dur:0.4,gain:0.3,filterFreq:200}); },
    legendReady(){ tone({freq:1600,slideTo:2400,dur:0.15,type:'square',gain:0.22}); tone({freq:2400,dur:0.08,type:'sine',gain:0.2,delay:0.05}); },
    astraFire(){ tone({freq:70,slideTo:40,dur:0.6,type:'sawtooth',gain:0.35}); noise({dur:0.3,gain:0.2,filterFreq:300}); },
    lifedrainOn(){ tone({freq:90,slideTo:50,dur:0.5,type:'sine',gain:0.3}); noise({dur:0.3,gain:0.18,filterFreq:250}); }
  };

  function startBGM(){ /* 廃止: BGMManagerのファイル再生に統一。互換のため空実装 */ }
  function stopBGM(){ /* 廃止: 互換のため空実装 */ }

  return {init,SE,startBGM,stopBGM,setVol,get ctx(){return ctx;}};
})();

/* ---- BGMManager: 即時停止 → 1秒無音 → 再生（既定フェードイン、gameoverのみ即時フル音量） ---- */
const BGMManager=(function(){
  const TRACKS={
    title:'assets/bgm/bgm_title_01.mp3',
    stage1:'assets/bgm/bgm_stage_01.mp3',
    stage2:'assets/bgm/bgm_stage_02.mp3',
    gameover:'assets/bgm/bgm_gameover.mp3',
    boss10p1:'assets/bgm/bgm_boss10_phase1.mp3',
    boss10p2:'assets/bgm/bgm_boss10_phase2.mp3',
    boss20p1:'assets/bgm/bgm_boss20_phase1.mp3',
    boss20p2:'assets/bgm/bgm_boss20_phase2.mp3',
  };
  let audioEl=null;
  let currentKey=null;
  let fadeTimer=null;
  let gapTimer=null;
  let targetVolume=0.35;

  function ensureElement(){
    if(!audioEl){ audioEl=new Audio(); audioEl.loop=true; audioEl.volume=0; }
    return audioEl;
  }
  function clearTimers(){
    if(fadeTimer){ clearInterval(fadeTimer); fadeTimer=null; }
    if(gapTimer){ clearTimeout(gapTimer); gapTimer=null; }
  }
  function setVolume(v){
    targetVolume=v;
    if(audioEl && !fadeTimer) audioEl.volume=v;
  }
  function fadeInTo(el,durationMs){
    clearInterval(fadeTimer); fadeTimer=null;
    const startTime=performance.now();
    el.volume=0;
    fadeTimer=setInterval(()=>{
      const t=(performance.now()-startTime)/durationMs;
      if(t>=1){ el.volume=targetVolume; clearInterval(fadeTimer); fadeTimer=null; }
      else { el.volume=targetVolume*t; }
    },30);
  }

  /* 即座に指定トラックを再生開始する内部関数（無音間・停止処理は行わない） */
  function playNow(key,fadeIn){
    if(!key || !TRACKS[key]) return;
    const el=ensureElement();
    try{
      el.src=TRACKS[key];
      el.currentTime=0;
      if(fadeIn){
        el.volume=0;
        el.play().catch(()=>{});
        fadeInTo(el,800);
      } else {
        el.volume=targetVolume;
        el.play().catch(()=>{});
      }
      currentKey=key;
    }catch(e){}
  }

  /* switchTo: 同じ曲ならシームレス継続。異なる曲なら即時停止→1秒無音→再生 */
  function switchTo(key,opts){
    opts=opts||{};
    const fadeIn = opts.fadeIn!==false; /* 既定true */
    const gapMs = opts.gapMs!==undefined? opts.gapMs : 1000;
    if(!key || !TRACKS[key]) return;
    const el=ensureElement();
    if(currentKey===key && !el.paused){ return; } /* 継続再生、何もしない */

    clearTimers();
    el.pause();
    currentKey=null;

    gapTimer=setTimeout(()=>{ playNow(key,fadeIn); },gapMs);
  }

  /* playQueuedNow: 何らかの理由で即座に指定トラックを鳴らしたい場合の安全なエントリポイント。
     既に同じ曲が再生中なら何もしない。無音の間を待たず、必要ならフェードインで即再生する。
     （enemy.js からの呼び出しで未定義エラーが出ないよう必ずエクスポートする） */
  function playQueuedNow(key,fadeIn){
    if(!key || !TRACKS[key]) return;
    if(currentKey===key) return;
    clearTimers();
    playNow(key, fadeIn!==false);
  }

  function stop(){
    clearTimers();
    if(audioEl) audioEl.pause();
    currentKey=null;
  }

  return { switchTo, playQueuedNow, stop, setVolume, get currentKey(){ return currentKey; } };
})();
