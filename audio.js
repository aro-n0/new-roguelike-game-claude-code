/* audio.js */
const AudioEngine=(function(){
  let ctx=null,master=null,bgmGain=null,seGain=null,bgmNodes=[],bossMode=false;
  function init(){
    if(ctx) return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain(); master.connect(ctx.destination);
    bgmGain=ctx.createGain(); bgmGain.gain.value=0.35; bgmGain.connect(master);
    seGain=ctx.createGain(); seGain.gain.value=0.7; seGain.connect(master);
  }
  function setVol(bgm,se){ if(bgmGain) bgmGain.gain.value=bgm; if(seGain) seGain.gain.value=se; }
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
    const size=ctx.sampleRate*dur;
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
    chest(){ tone({freq:440,slideTo:1200,dur:0.4,type:'sine',gain:0.3}); tone({freq:660,slideTo:1600,dur:0.4,type:'sine',gain:0.22,delay:0.06}); },
    skillBuy(){ tone({freq:300,slideTo:900,dur:0.18,type:'square',gain:0.2}); },
    starGain(){ tone({freq:660,slideTo:1320,dur:0.3,type:'sine',gain:0.28}); tone({freq:990,slideTo:1980,dur:0.35,type:'sine',gain:0.2,delay:0.08}); },
    waveStart(){ tone({freq:110,slideTo:220,dur:0.5,type:'sawtooth',gain:0.25}); },
    gameOver(){ tone({freq:300,slideTo:40,dur:1.1,type:'sawtooth',gain:0.3}); },
    gameClear(){ tone({freq:440,slideTo:880,dur:0.5,type:'sine',gain:0.3}); tone({freq:660,slideTo:1320,dur:0.6,type:'sine',gain:0.25,delay:0.2}); tone({freq:880,slideTo:1760,dur:0.8,type:'sine',gain:0.22,delay:0.4}); },
    click(){ tone({freq:600,dur:0.05,type:'square',gain:0.15}); },
    laser(){ tone({freq:1400,slideTo:300,dur:0.22,type:'sawtooth',gain:0.16}); },
    lightning(){ noise({dur:0.12,gain:0.28,filterFreq:2600}); tone({freq:1800,slideTo:400,dur:0.1,type:'square',gain:0.12}); },
    fireball(){ noise({dur:0.3,gain:0.3,filterFreq:300}); tone({freq:100,slideTo:40,dur:0.4,type:'sawtooth',gain:0.2}); },
    poison(){ tone({freq:300,slideTo:260,dur:0.15,type:'sine',gain:0.08}); },
    drone(){ tone({freq:900,slideTo:1300,dur:0.06,type:'square',gain:0.1}); },
    shield(){ tone({freq:200,slideTo:800,dur:0.4,type:'sine',gain:0.3}); noise({dur:0.3,gain:0.2,filterFreq:2000}); },
    bossAppear(){ tone({freq:60,slideTo:30,dur:1.4,type:'sawtooth',gain:0.4}); noise({dur:1.0,gain:0.3,filterFreq:200}); },
    bossDie(){ tone({freq:200,slideTo:20,dur:2.0,type:'sawtooth',gain:0.4}); noise({dur:1.5,gain:0.35,filterFreq:500,delay:0.1}); },
    bossShoot(){ tone({freq:180,slideTo:80,dur:0.15,type:'square',gain:0.2}); },
    pop(){ tone({freq:520,slideTo:760,dur:0.06,type:'sine',gain:0.12}); },
    unlock(){ tone({freq:600,slideTo:1400,dur:0.16,type:'sine',gain:0.22}); tone({freq:1000,slideTo:2000,dur:0.22,type:'sine',gain:0.18,delay:0.05}); },
    critical(){ tone({freq:1200,slideTo:2200,dur:0.18,type:'square',gain:0.22}); noise({dur:0.1,gain:0.15,filterFreq:3000}); },
    chestFanfare(){
      [440,554,660,880].forEach((f,i)=>tone({freq:f,slideTo:f*1.4,dur:0.35,type:'sine',gain:0.26,delay:i*0.09}));
      noise({dur:0.3,gain:0.15,filterFreq:2200,delay:0.02});
    }
  };
  function startBGM(boss){
    if(!ctx) return; stopBGM(); bossMode=!!boss;
    const baseFreqs = boss? [41,82,61] : [55,110,165];
    baseFreqs.forEach((f,i)=>{
      const osc=ctx.createOscillator(); osc.type=boss?(i===2?'sawtooth':'square'):(i===2?'square':'sawtooth'); osc.frequency.value=f;
      const g=ctx.createGain(); g.gain.value=i===0?(boss?0.22:0.18):(i===1?0.1:0.05);
      const filter=ctx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=boss?350:500;
      const lfo=ctx.createOscillator(); lfo.frequency.value=boss?0.15+i*0.05:0.07+i*0.02;
      const lfoGain=ctx.createGain(); lfoGain.gain.value=boss?260:180;
      lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
      osc.connect(filter); filter.connect(g); g.connect(bgmGain);
      osc.start(); lfo.start(); bgmNodes.push(osc,lfo);
    });
    const notes=boss?[110,131,98,116]:[220,262,330,392,330,262]; let idx=0;
    const arp=setInterval(()=>{ if(!ctx){clearInterval(arp);return;} tone({freq:notes[idx%notes.length],dur:boss?0.5:0.35,type:'triangle',gain:boss?0.08:0.05}); idx++; },boss?420:600);
    bgmNodes.push({stop:()=>clearInterval(arp)});
  }
  function stopBGM(){ bgmNodes.forEach(n=>{ try{n.stop&&n.stop();}catch(e){} }); bgmNodes=[]; }
  return {init,SE,startBGM,stopBGM,setVol,get ctx(){return ctx;}};
})();
