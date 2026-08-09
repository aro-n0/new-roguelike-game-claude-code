/* skilltree.js（全文統合版） */
const GATE_THRESHOLD=12;
function costAt(node,lvl){ return Math.round(node.baseCost*Math.pow(node.growth,lvl)); }
function mult(l,g){ return Math.pow(g,l); }

/* Wave1〜50完走時の想定累計トークン量（wave*15の総和で概算） */
function sumWaveTokens(waves){ let s=0; for(let w=1;w<=waves;w++) s+=w*15; return s; }
const TOKENS_50WAVES_1ROUND=sumWaveTokens(50);      // ≒19125
const TOKENS_50WAVES_2ROUNDS=TOKENS_50WAVES_1ROUND*2; // Ultimateノード基準

const tierRadiusMap={gate:24,deriv:20,upgrade:16,capstone:26,legend:32,ultimate:30};
function tierRadius(tier){ return tierRadiusMap[tier]||20; }
const placedNodes=[{x:0,y:0,r:34}];
function organicPlace(parent,baseAngleDeg,minDist,maxDist,radius,jitterDeg){
  jitterDeg = jitterDeg===undefined?25:jitterDeg;
  let best=null;
  for(let attempt=0;attempt<30;attempt++){
    const jitter=(Math.random()*2-1)*jitterDeg;
    const angle=(baseAngleDeg+jitter)*Math.PI/180;
    const dist=minDist+Math.random()*(maxDist-minDist);
    const x=parent.x+Math.cos(angle)*dist;
    const y=parent.y+Math.sin(angle)*dist;
    const ok=!placedNodes.some(p=>Math.hypot(x-p.x,y-p.y)<(radius+p.r+16));
    if(ok){ best={x,y}; break; }
    if(!best) best={x,y};
  }
  placedNodes.push({x:best.x,y:best.y,r:radius});
  return best;
}
const core={x:0,y:0,id:'core'};

/* ---- 基礎ステータス（token専用・分岐最大3本） ---- */
const t_dmg_pos=organicPlace(core,-90,150,195,tierRadius('gate'));
function tokenCostGrowth(maxLv,targetTotalCost,baseCost){
  /* baseCost*growth^(maxLv-1) ≒ targetTotalCost となるgrowthを逆算 */
  return Math.pow(targetTotalCost/baseCost, 1/(maxLv-1));
}
const T_DMG_MAXLV=50, T_DMG_BASE=20;
const t_dmg={id:'t_dmg',costType:'token',scope:'global',name:'攻撃力',icon:'⚔',maxLv:T_DMG_MAXLV,baseCost:T_DMG_BASE,
  growth:tokenCostGrowth(T_DMG_MAXLV,TOKENS_50WAVES_1ROUND,T_DMG_BASE),parent:'core',
  x:t_dmg_pos.x,y:t_dmg_pos.y,apply:(b,l)=>{b.damage+=1.3*l;},line2:'近接ダメージが上昇',line3:l=>`攻撃力+${(1.3*l).toFixed(1)}`};

const t_aspd_pos=organicPlace(t_dmg_pos,-150,140,185,tierRadius('gate'));
const t_aspd={id:'t_aspd',costType:'token',scope:'global',name:'攻撃速度',icon:'⚡',maxLv:12,baseCost:10,growth:1.5,parent:'t_dmg',
  x:t_aspd_pos.x,y:t_aspd_pos.y,apply:(b,l)=>{b.atkSpd*=(1+0.03*l);},line2:'攻撃間隔が短縮',line3:l=>`攻撃速度+${Math.round(3*l)}%`};
const t_crit_pos=organicPlace(t_dmg_pos,-30,140,185,tierRadius('gate'));
const t_crit={id:'t_crit',costType:'token',scope:'global',name:'クリティカル率',icon:'✹',maxLv:12,baseCost:12,growth:1.55,parent:'t_dmg',
  x:t_crit_pos.x,y:t_crit_pos.y,apply:(b,l)=>{b.crit+=0.02*l;},line2:'会心の一撃が発生しやすくなる',line3:l=>`クリティカル率+${Math.round(2*l)}%`};
const t_hp_pos=organicPlace(t_dmg_pos,-90,190,235,tierRadius('gate'));
const t_hp={id:'t_hp',costType:'token',scope:'global',name:'体力増強',icon:'♥',maxLv:15,baseCost:8,growth:1.45,parent:'t_dmg',
  x:t_hp_pos.x,y:t_hp_pos.y,apply:(b,l)=>{b.maxHp+=12*l;},line2:'最大HPが増加',line3:l=>`最大HP+${12*l}`};

const t_range_pos=organicPlace(t_aspd_pos,-170,140,185,tierRadius('gate'));
const t_range={id:'t_range',costType:'token',scope:'global',name:'攻撃範囲',icon:'◎',maxLv:10,baseCost:12,growth:1.5,parent:'t_aspd',
  x:t_range_pos.x,y:t_range_pos.y,apply:(b,l)=>{b.range*=(1+0.04*l);},line2:'近接攻撃の届く距離が伸びる',line3:l=>`射程+${Math.round(4*l)}%`};
const T_DROP_MAXLV=50, T_DROP_BASE=20;
const t_tokendrop_pos=organicPlace(t_aspd_pos,-130,140,185,tierRadius('gate'));
const t_tokendrop={id:'t_tokendrop',costType:'token',scope:'global',name:'トークンドロップ率',icon:'⬡',maxLv:T_DROP_MAXLV,baseCost:T_DROP_BASE,
  growth:tokenCostGrowth(T_DROP_MAXLV,TOKENS_50WAVES_1ROUND,T_DROP_BASE),parent:'t_aspd',
  x:t_tokendrop_pos.x,y:t_tokendrop_pos.y,apply:(b,l)=>{b.tokenMul*=(1+0.05*l);},line2:'獲得するトークンが増加',line3:l=>`トークン獲得量x${(1+0.05*l).toFixed(2)}`};

const t_speed_pos=organicPlace(t_hp_pos,-110,140,185,tierRadius('gate'));
const t_speed={id:'t_speed',costType:'token',scope:'global',name:'移動速度',icon:'➤',maxLv:10,baseCost:10,growth:1.5,parent:'t_hp',
  x:t_speed_pos.x,y:t_speed_pos.y,apply:(b,l)=>{b.speed*=(1+0.03*l);},line2:'移動が速くなる',line3:l=>`移動速度+${Math.round(3*l)}%`};
const t_knockback_pos=organicPlace(t_hp_pos,-70,140,185,tierRadius('gate'));
const t_knockback={id:'t_knockback',costType:'token',scope:'global',name:'ノックバック力',icon:'☄',maxLv:10,baseCost:10,growth:1.5,parent:'t_hp',
  x:t_knockback_pos.x,y:t_knockback_pos.y,apply:(b,l)=>{b.knockback+=14*l;},line2:'攻撃時に敵を弾き飛ばす',line3:l=>`ノックバック力+${14*l}`};

const t_critmult_pos=organicPlace(t_crit_pos,-15,130,170,tierRadius('deriv'));
const T_CRITMULT_MAXLV=10;
const t_critmult={id:'t_critmult',costType:'token',scope:'global',name:'クリティカル倍率強化',icon:'✹',maxLv:T_CRITMULT_MAXLV,baseCost:14,growth:1.45,parent:'t_crit',
  x:t_critmult_pos.x,y:t_critmult_pos.y,apply:(b,l)=>{b.critMult=2.0+(1.0*l/T_CRITMULT_MAXLV);},
  line2:'クリティカル時の倍率が上昇',line3:l=>`クリティカル倍率 x${(2.0+(1.0*l/T_CRITMULT_MAXLV)).toFixed(2)}`};

const TOKEN_NODES=[t_dmg,t_aspd,t_crit,t_hp,t_range,t_tokendrop,t_speed,t_knockback,t_critmult];
function tokenTotalLevels(){ let s=0; TOKEN_NODES.forEach(n=>{ s+=gameData.tokenLevels[n.id]||0; }); return s; }

function buildGateTemplate(tokenId,tokenPos,angle,cfg){
  const gateP=organicPlace(tokenPos,angle,160,210,tierRadius('gate'));
  const gate=Object.assign({},cfg.gate,{costType:'token',scope:'slot',parent:tokenId,tier:'gate',isGate:true,x:gateP.x,y:gateP.y,
    apply:()=>{},line2:'解放するとビルドツリーへ進入できる',line3:()=>'能力値上昇なし'});

  const derivDefs=cfg.derivs;
  const spread = derivDefs.length===3? [-30,0,30] : [-20,20];
  const derivNodes=[]; const upgradeNodes=[];
  derivDefs.forEach((d,i)=>{
    const dAngle=angle+spread[i];
    const dPos=organicPlace(gateP,dAngle,140,180,tierRadius('deriv'));
    const derivNode=Object.assign({},d.node,{costType:'star',scope:'slot',parent:gate.id,tier:'deriv',x:dPos.x,y:dPos.y});
    derivNodes.push(derivNode);
    d.upgrades.forEach((u,ui)=>{
      const uAngle=dAngle+(ui===0?-16:16);
      const uPos=organicPlace(dPos,uAngle,110,150,tierRadius('upgrade'));
      const upNode=Object.assign({},u,{parent:derivNode.id,tier:'upgrade',x:uPos.x,y:uPos.y});
      upgradeNodes.push(upNode);
    });
  });

  const capP=organicPlace(gateP,angle,300,360,tierRadius('capstone'),12);
  const capstone=Object.assign({},cfg.capstone,{costType:'star',scope:'slot',parent:derivNodes[0].id,tier:'capstone',x:capP.x,y:capP.y,
    derivReq:{ids:derivNodes.map(d=>d.id),needCount:2}});

  const legP=organicPlace(capP,angle-24,170,220,tierRadius('legend'));
  const legend=Object.assign({},cfg.legend,{costType:'star',scope:'slot',parent:capstone.id,tier:'legend',x:legP.x,y:legP.y,
    req:{id:capstone.id,lvl:1}});
  const ultP=organicPlace(capP,angle+24,170,220,tierRadius('ultimate'));
  const ultimate=Object.assign({},cfg.ultimate,{costType:'token',scope:'slot',parent:capstone.id,tier:'ultimate',x:ultP.x,y:ultP.y,
    req:{id:capstone.id,lvl:1}});

  return [gate,...derivNodes,...upgradeNodes,capstone,legend,ultimate];
}

function upNode(id,name,icon,steps,costType,line2,line3,apply){
  return {id,name,icon,maxLv:steps,baseCost:costType==='star'?1:6,growth:costType==='star'?1:1.4,costType,scope:'slot',apply,line2,line3};
}

const mageBranch=buildGateTemplate('t_range',t_range_pos,-170,{
  gate:{id:'mg_gate',name:'魔術適性',icon:'✦',maxLv:1,baseCost:600},
  derivs:[
    {node:{id:'mg_lightning',name:'雷撃付与',icon:'⚡',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.mageUnlocked=true;b.chainCount+=1;},line2:'連鎖する雷を習得',line3:l=>'敵を伝う遠距離攻撃'},
     upgrades:[
       upNode('mg_up_chain','連鎖強化','⚡',6,'token','雷の連鎖数が増加',l=>`連鎖数+${l}`,(b,l)=>{b.chainCount+=l;}),
       upNode('mg_up_dmg','雷撃威力','⚡',6,'star','雷のダメージが上昇',l=>`威力+${5*l}`,(b,l)=>{b.mageDmg+=5*l;}),
     ]},
    {node:{id:'mg_fireball','name':'業火付与',icon:'🔥',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.fireballRadius=(b.fireballRadius||0)+40;b.fireballDmg=(b.fireballDmg||0)+10;},line2:'着弾地点に爆炎を発生',line3:l=>'広範囲ダメージを付与'},
     upgrades:[
       upNode('mg_up_radius','爆炎範囲拡大','🔥',6,'token','爆炎の範囲が拡大',l=>`範囲+${12*l}`,(b,l)=>{b.fireballRadius+=12*l;}),
       upNode('mg_up_burndmg','爆炎威力','🔥',6,'star','爆炎のダメージが上昇',l=>`威力+${6*l}`,(b,l)=>{b.fireballDmg+=6*l;}),
     ]},
  ],
  capstone:{id:'mg_capstone',name:'アークメイジ',icon:'☀',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.mageDmgMult=(b.mageDmgMult||1)*1.6;},line2:'魔法系すべての威力が飛躍的に上昇',line3:l=>'魔法倍率x1.6'},
  legend:{id:'mg_legend',name:'クロスカット・レディエンス',icon:'✝',maxLv:1,baseCost:5,growth:1,apply:(b,l)=>{b.legendMage=true;},line2:'画面を十字に切り裂く極大閃光',line3:l=>'アクティブ発動 画面全域大ダメージ'},
  ultimate:{id:'mg_ultimate',name:'グランドソーサラー',icon:'☀',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,apply:(b,l)=>{b.mageDmgMult=(b.mageDmgMult||1)*1.4;b.chainCount+=3;},line2:'魔法系の全能力が更に強化される',line3:l=>'倍率x1.4 連鎖+3'},
});

const droneBranch=buildGateTemplate('t_tokendrop',t_tokendrop_pos,-130,{
  gate:{id:'dr_gate',name:'ドローン起動',icon:'◈',maxLv:1,baseCost:700},
  derivs:[
    {node:{id:'dr_combat','name':'戦闘ドローン配備',icon:'◈',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.droneCount+=1;b.droneDmg+=3;},line2:'自律ドローンを展開',line3:l=>'周囲を旋回し自動攻撃'},
     upgrades:[
       upNode('dr_up_count','量産ライン','◈',6,'token','展開数が増加',l=>`ドローン数+${l}`,(b,l)=>{b.droneCount+=l;}),
       upNode('dr_up_dmg','兵装強化','◈',6,'star','ドローンの威力が上昇',l=>`威力+${5*l}`,(b,l)=>{b.droneDmg+=5*l;}),
     ]},
    {node:{id:'dr_support','name':'支援ドローン配備',icon:'◈',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.droneCdReduce=(b.droneCdReduce||0)+0.15;},line2:'ドローンの攻撃間隔を短縮',line3:l=>'攻撃頻度が上昇'},
     upgrades:[
       upNode('dr_up_cd','再突入短縮','◈',6,'token','攻撃間隔がさらに短縮',l=>`CD-${(0.05*l).toFixed(2)}秒`,(b,l)=>{b.droneCdReduce=(b.droneCdReduce||0)+0.05*l;}),
       upNode('dr_up_mult','兵装最適化','◉',6,'star','ドローンの全火力が上昇',l=>`倍率x${mult(l,1.2).toFixed(2)}`,(b,l)=>{b.droneDmgMult*=mult(l,1.2);}),
     ]},
  ],
  capstone:{id:'dr_capstone',name:'AI最適化',icon:'◉',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.droneDmgMult*=1.6;},line2:'ドローン群の火力が大幅上昇',line3:l=>'ドローン倍率x1.6'},
  legend:{id:'dr_legend',name:'プロトタイプ・マザーシップ',icon:'✝',maxLv:1,baseCost:5,growth:1,apply:(b,l)=>{b.legendDrone=true;},line2:'巨大母艦ドローンを常時召喚',line3:l=>'レーザー照射と全体オーバークロック'},
  ultimate:{id:'dr_ultimate',name:'ドローンフリート',icon:'◉',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,apply:(b,l)=>{b.droneCount+=2;b.droneDmgMult*=1.35;},line2:'ドローン数と火力が最大まで強化',line3:l=>'数+2 倍率x1.35'},
});

const chemicalBranch=buildGateTemplate('t_crit',t_crit_pos,-45,{
  gate:{id:'ch_gate',name:'高化学兵器適性',icon:'☣',maxLv:1,baseCost:650},
  derivs:[
    {node:{id:'ch_poison',name:'毒付与',icon:'🧪',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.chemUnlocked=true;b.statusChance+=0.2;b.poisonDmg+=4;},line2:'攻撃に毒を付与',line3:l=>'毎秒継続ダメージを与える'},
     upgrades:[
       upNode('ch_up_poisondmg','毒ダメージ上昇','🧪',6,'token','毒の継続ダメージが上昇',l=>`毒ダメージ+${2*l}`,(b,l)=>{b.poisonDmg+=2*l;}),
       upNode('ch_up_poisontime','毒継続時間増加','🧪',5,'star','毒の持続時間が延長',l=>`持続時間+${l}秒`,(b,l)=>{b.poisonDuration=(b.poisonDuration||3)+l;}),
     ]},
    {node:{id:'ch_frost',name:'凍傷付与',icon:'❄',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.frostSlow+=0.25;},line2:'攻撃に凍傷を付与',line3:l=>'敵の動きを鈍らせる'},
     upgrades:[
       upNode('ch_up_slow','鈍足強化','❄',6,'token','敵の鈍足効果が強化',l=>`鈍足+${Math.round(4*l)}%`,(b,l)=>{b.frostSlow+=0.04*l;}),
       upNode('ch_up_statusdmg','状態異常増幅','☠',5,'star','状態異常ダメージ全般が上昇',l=>`倍率x${mult(l,1.15).toFixed(2)}`,(b,l)=>{b.statusDmgMult*=mult(l,1.15);}),
     ]},
  ],
  capstone:{id:'ch_capstone',name:'疫病の権化',icon:'☠',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.statusDmgMult*=1.6;},line2:'あらゆる状態異常が激化する',line3:l=>'状態異常倍率x1.6'},
  legend:{id:'ch_legend',name:'二段火傷（インフェルノ）',icon:'✝',maxLv:1,baseCost:5,growth:1,apply:(b,l)=>{b.legendChem=true;},line2:'毒とは別に火傷を二重付与',line3:l=>'毎秒超高ダメージで焼き尽くす'},
  ultimate:{id:'ch_ultimate',name:'汚染フィールド',icon:'☣',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,apply:(b,l)=>{b.statusChance+=0.3;b.statusDmgMult*=1.3;},line2:'状態異常の付与率と威力が最大化',line3:l=>'付与率+30% 倍率x1.3'},
});

const boxerBranch=buildGateTemplate('t_crit',t_crit_pos,-15,{
  gate:{id:'bx_gate',name:'闘志の誓い',icon:'✊',maxLv:1,baseCost:650},
  derivs:[
    {node:{id:'bx_fist',name:'拳装備',icon:'✊',maxLv:1,baseCost:2,growth:1,apply:(b,l,base)=>{b.boxerMode=true;base.range*=0.6;base.atkSpd*=0.85;b.boxerDmg+=8;},line2:'バットを捨て拳を装備',line3:l=>'射程低下と引き換えに近接高火力'},
     upgrades:[
       upNode('bx_up_power','鋼拳強化','✊',6,'token','拳の威力が上昇',l=>`威力+${6*l}`,(b,l)=>{b.boxerDmg+=6*l;}),
       upNode('bx_up_combo','連撃技術','✊',6,'star','連続ヒットで威力が伸びる',l=>`連撃倍率+${Math.round(15*l)}%`,(b,l)=>{b.boxerCombo+=0.15*l;}),
     ]},
    {node:{id:'bx_footwork',name:'闘気循環',icon:'✊',maxLv:1,baseCost:2,growth:1,apply:(b,l,base)=>{base.speed*=1.1;},line2:'俊敏性が向上する',line3:l=>'移動速度が上昇'},
     upgrades:[
       upNode('bx_up_speed','フットワーク','✊',6,'token','移動速度がさらに上昇',l=>`移動速度+${Math.round(3*l)}%`,(b,l,base)=>{base.speed*=(1+0.03*l);}),
       upNode('bx_up_crit','急所突き','✹',5,'star','クリティカル率が上昇',l=>`クリティカル率+${Math.round(2*l)}%`,(b,l)=>{b.boxerCritBonus=(b.boxerCritBonus||0)+0.02*l;}),
     ]},
  ],
  capstone:{id:'bx_capstone',name:'限界突破',icon:'☄',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.boxerDmgMult*=1.65;},line2:'拳の威力が限界を超えて上昇',line3:l=>'拳倍率x1.65'},
  legend:{id:'bx_legend',name:'スーパークリティカル',icon:'✝',maxLv:1,baseCost:5,growth:1,apply:(b,l)=>{b.legendBoxer=true;},line2:'極低確率で発生する超絶一撃',line3:l=>'敵の最大HPの約4割を吹き飛ばす'},
  ultimate:{id:'bx_ultimate',name:'鬼神の拳',icon:'☄',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,apply:(b,l)=>{b.boxerCombo+=0.3;b.boxerDmgMult*=1.35;},line2:'連撃と威力が最大まで強化される',line3:l=>'連撃+30% 倍率x1.35'},
});

const bowBranch=buildGateTemplate('t_speed',t_speed_pos,-110,{
  gate:{id:'bo_gate',name:'弓術取得',icon:'➶',maxLv:1,baseCost:600},
  derivs:[
    {node:{id:'bo_multishot',name:'連射弓習得',icon:'➶',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.bowUnlocked=true;b.arrowCount+=1;b.arrowDmg+=4;},line2:'弓による遠距離攻撃を習得',line3:l=>'複数の敵を同時に狙える'},
     upgrades:[
       upNode('bo_up_multi','マルチノック','➶',5,'token','同時発射数が増加',l=>`発射数+${l}`,(b,l)=>{b.arrowCount+=l;}),
       upNode('bo_up_dmg','鏃強化','➶',6,'star','矢一本の威力が上昇',l=>`威力+${3*l}`,(b,l)=>{b.arrowDmg+=3*l;}),
     ]},
    {node:{id:'bo_precision',name:'精密射撃習得',icon:'➶',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.arrowPierce=(b.arrowPierce||0)+1;},line2:'矢が敵を貫通するようになる',line3:l=>'一直線上の敵を同時攻撃'},
     upgrades:[
       upNode('bo_up_pierce','貫通鏃','➶',4,'token','貫通する敵の数が増加',l=>`貫通数+${l}`,(b,l)=>{b.arrowPierce=(b.arrowPierce||0)+l;}),
       upNode('bo_up_speed','速射訓練','➶',5,'star','弓の発射間隔が短縮',l=>`発射速度+${Math.round(5*l)}%`,(b,l)=>{b.bowAtkSpd=(b.bowAtkSpd||0)+0.05*l;}),
     ]},
  ],
  capstone:{id:'bo_capstone',name:'乱れ撃ち',icon:'➹',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.bowDmgMult*=1.6;},line2:'弓の全ダメージが大幅上昇',line3:l=>'弓倍率x1.6'},
  legend:{id:'bo_legend',name:'アストラ・アロー',icon:'✝',maxLv:1,baseCost:5,growth:1,apply:(b,l)=>{b.legendBow=true;},line2:'画面を貫く超巨大な光の矢',line3:l=>'進路上のすべてを消滅させる'},
  ultimate:{id:'bo_ultimate',name:'百鬼夜行',icon:'➹',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,apply:(b,l)=>{b.arrowCount+=2;b.bowDmgMult*=1.3;},line2:'発射数と威力が最大まで強化',line3:l=>'発射数+2 倍率x1.3'},
});

const gunnerBranch=buildGateTemplate('t_knockback',t_knockback_pos,-90,{
  gate:{id:'gn_gate',name:'銃器適性',icon:'●',maxLv:1,baseCost:650},
  derivs:[
    {node:{id:'gn_pistol',name:'ピストル装備',icon:'●',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.gunnerUnlocked=true;b.pistolDmg=(b.pistolDmg||0)+5;},line2:'連射・浅貫通のピストルを習得',line3:l=>'狙った方向へ自動発砲'},
     upgrades:[
       upNode('gn_up_pistoldmg','連射機構','●',6,'token','ピストルの威力が上昇',l=>`威力+${3*l}`,(b,l)=>{b.pistolDmg=(b.pistolDmg||0)+3*l;}),
       upNode('gn_up_pistolspd','高速リロード','●',5,'star','連射速度が上昇',l=>`連射速度+${Math.round(5*l)}%`,(b,l)=>{b.pistolSpd=(b.pistolSpd||0)+0.05*l;}),
     ]},
    {node:{id:'gn_sniper',name:'スナイパー装備',icon:'◆',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.sniperDmg=(b.sniperDmg||0)+15;b.sniperPierce=(b.sniperPierce||0)+2;},line2:'重撃・深貫通のスナイパーを習得',line3:l=>'一撃の威力と貫通力に優れる'},
     upgrades:[
       upNode('gn_up_sniperdmg','重弾薬','◆',6,'token','スナイパーの威力が上昇',l=>`威力+${8*l}`,(b,l)=>{b.sniperDmg=(b.sniperDmg||0)+8*l;}),
       upNode('gn_up_sniperpierce','徹甲弾','◆',5,'star','貫通する敵の数が増加',l=>`貫通数+${l}`,(b,l)=>{b.sniperPierce=(b.sniperPierce||0)+l;}),
     ]},
  ],
  capstone:{id:'gn_capstone',name:'火器統制',icon:'☄',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.gunnerDmgMult=(b.gunnerDmgMult||1)*1.6;},line2:'銃器全般の威力が大幅上昇',line3:l=>'銃器倍率x1.6'},
  legend:{id:'gn_legend',name:'破滅のショットガン',icon:'✝',maxLv:1,baseCost:5,growth:1,apply:(b,l)=>{b.legendGunner=true;},line2:'扇状の全敵貫通弾幕を掃射',line3:l=>'至近距離ではボスすら瞬殺する'},
  ultimate:{id:'gn_ultimate',name:'弾薬無限機構',icon:'☄',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,apply:(b,l)=>{b.pistolDmg=(b.pistolDmg||0)+8;b.sniperDmg=(b.sniperDmg||0)+16;},line2:'すべての銃器威力が最大化される',line3:l=>'威力+8〜16'},
});

const vitalityBranch=(function(){
  const gateP=organicPlace(t_knockback_pos,-40,180,230,tierRadius('gate'));
  const gate={id:'vt_gate',costType:'token',scope:'slot',parent:'t_knockback',tier:'gate',isGate:true,
    name:'生命体適性',icon:'🛡',maxLv:1,baseCost:220,growth:1,x:gateP.x,y:gateP.y,
    apply:()=>{},line2:'解放するとビルドツリーへ進入できる',line3:()=>'能力値上昇なし'};

  const armorP=organicPlace(gateP,-24,150,190,tierRadius('deriv'));
  const armorDeriv={id:'vt_armor',costType:'star',scope:'slot',parent:'vt_gate',tier:'deriv',
    name:'装甲強化習得',icon:'🛡',maxLv:1,baseCost:2,growth:1,x:armorP.x,y:armorP.y,
    apply:(b,l)=>{b.vitalityUnlocked=true;b.vitHp+=40;b.dmgReduction+=0.05;},line2:'肉体を強化し耐久力を高める',line3:l=>'最大HPと被ダメージ軽減を習得'};

  const regenP=organicPlace(gateP,24,150,190,tierRadius('deriv'));
  const regenDeriv={id:'vt_regenroot',costType:'star',scope:'slot',parent:'vt_gate',tier:'deriv',
    name:'自己修復習得',icon:'✚',maxLv:1,baseCost:2,growth:1,x:regenP.x,y:regenP.y,
    apply:(b,l)=>{b.vitalityUnlocked=true;b.regenEnabled=true;b.regen+=6;},line2:'HPが最大値未満のとき自動回復する',line3:l=>'1秒毎にHPを回復'};

  const shieldCountP=organicPlace(armorP,-18,150,190,tierRadius('upgrade'));
  const shieldCountNode={id:'vt_shieldcount',costType:'token',scope:'slot',parent:'vt_armor',tier:'upgrade',
    name:'最大シールド数増加',icon:'⊙',maxLv:6,baseCost:900,growth:2.2,x:shieldCountP.x,y:shieldCountP.y,
    apply:(b,l)=>{b.shieldMaxBonus=(b.shieldMaxBonus||0)+l;},line2:'展開できるシールドの上限が増加',line3:l=>`シールド上限+${l}`};

  const shieldRegenP=organicPlace(shieldCountP,-18,120,150,tierRadius('upgrade'));
  const shieldRegenNode={id:'vt_shieldregen',costType:'star',scope:'slot',parent:'vt_shieldcount',tier:'upgrade',
    name:'シールド自動回復',icon:'⊙',maxLv:1,baseCost:1,growth:1,x:shieldRegenP.x,y:shieldRegenP.y,
    apply:(b,l)=>{b.shieldAutoRegen=true;},line2:'時間経過でシールドが自動復元',line3:l=>'60秒毎にシールドを1つ回復'};

  const nanoP=organicPlace(regenP,18,150,190,tierRadius('upgrade'));
  const nanoNode={id:'vt_regennano',costType:'token',scope:'slot',parent:'vt_regenroot',tier:'upgrade',
    name:'自己修復ナノ',icon:'✚',maxLv:8,baseCost:800,growth:1.9,x:nanoP.x,y:nanoP.y,
    apply:(b,l)=>{b.regen+=4*l;},line2:'HP自動回復量が上昇',line3:l=>`HP自動回復+${4*l}/秒`};

  const capP=organicPlace(gateP,0,340,400,tierRadius('capstone'),12);
  const capstone={id:'vt_capstone',costType:'star',scope:'slot',parent:'vt_armor',tier:'capstone',
    name:'不屈の意志',icon:'✝',maxLv:1,baseCost:4,growth:1,x:capP.x,y:capP.y,
    derivReq:{ids:['vt_armor','vt_regenroot'],needCount:2},
    apply:(b,l)=>{b.dmgReductionMult*=1.5;},line2:'被ダメージ軽減が大幅上昇',line3:l=>'軽減倍率x1.5'};

  const legP=organicPlace(capP,-24,180,230,tierRadius('legend'));
  const legend={id:'vt_legend',costType:'star',scope:'slot',parent:'vt_capstone',tier:'legend',
    name:'ライフドレイン（吸血）',icon:'✝',maxLv:1,baseCost:5,growth:1,x:legP.x,y:legP.y,
    req:{id:'vt_capstone',lvl:1},
    apply:(b,l)=>{b.legendVitality=true;},line2:'自身のHPを消費し周囲から吸血',line3:l=>'大ダメージと引き換えに大幅回復'};

  const ultP=organicPlace(capP,24,180,230,tierRadius('ultimate'));
  const ultimate={id:'vt_ultimate',costType:'token',scope:'slot',parent:'vt_capstone',tier:'ultimate',
    name:'不死身の肉体',icon:'✝',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,x:ultP.x,y:ultP.y,
    req:{id:'vt_capstone',lvl:1},
    apply:(b,l)=>{b.vitHp+=80;b.dmgReductionMult*=1.3;},line2:'HPと軽減率が最大まで強化される',line3:l=>'最大HP+80 倍率x1.3'};

  return [gate,armorDeriv,regenDeriv,shieldCountNode,shieldRegenNode,nanoNode,capstone,legend,ultimate];
})();

const BUILD_NODES=[...mageBranch,...droneBranch,...chemicalBranch,...boxerBranch,...bowBranch,...gunnerBranch,...vitalityBranch];
const ALL_NODES=[...TOKEN_NODES,...BUILD_NODES];
function findNode(id){ return ALL_NODES.find(n=>n.id===id); }

function getLevel(node){
  if(node.scope==='global') return gameData.tokenLevels[node.id]||0;
  const slot=gameData.slots[gameData.activeSlot];
  return (slot.build&&slot.build[node.id])||0;
}
function isOwned(node){ return node && getLevel(node)>0; }
function reqMet(node){
  if(node.derivReq){
    const count=node.derivReq.ids.filter(id=>isOwned(findNode(id))).length;
    return count>=node.derivReq.needCount;
  }
  if(node.req){ if(getLevel(findNode(node.req.id))<node.req.lvl) return false; }
  return true;
}
function nodeState(node){
  if(node.parent==='core'){ return getLevel(node)>=node.maxLv? 'maxed':'unlockable'; }
  const parent=findNode(node.parent);
  const parentOwned = node.tier==='capstone'? (node.derivReq? reqMet(node):isOwned(parent)) : isOwned(parent);
  if(!parentOwned){
    if(node.tier==='capstone'){
      const anyDerivOwned=node.derivReq.ids.some(id=>isOwned(findNode(id)));
      return anyDerivOwned? 'fogged':'hidden';
    }
    const grandOwned = parent && (parent.parent==='core' || isOwned(findNode(parent.parent)));
    return grandOwned? 'fogged':'hidden';
  }
  if(node.tier==='gate'){
    if(tokenTotalLevels()<GATE_THRESHOLD) return 'fogged';
  } else if(node.req && !reqMet(node)){
    return 'fogged';
  }
  return getLevel(node)>=node.maxLv? 'maxed':'unlockable';
}
function isVisible(node){ return nodeState(node)!=='hidden'; }
function canAfford(node){
  if(nodeState(node)!=='unlockable') return false;
  const lvl=getLevel(node);
  const cost=costAt(node,lvl);
  return node.costType==='token'? gameData.tokens>=cost : gameData.skillStars>=cost;
}
function buyNode(node){
  if(nodeState(node)!=='unlockable') return false;
  const lvl=getLevel(node);
  const cost=costAt(node,lvl);
  if(node.costType==='token'){
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
function respecActiveSlot(){
  const slot=gameData.slots[gameData.activeSlot];
  let starsRefund=0;
  Object.keys(slot.build||{}).forEach(id=>{
    const n=findNode(id); if(!n||n.costType!=='star') return;
    const lvl=slot.build[id];
    for(let l=0;l<lvl;l++) starsRefund+=costAt(n,l);
  });
  gameData.tokenLevels={};
  slot.build={};
  gameData.tokens=gameData.totalTokensEarned||0;
  gameData.skillStars+=starsRefund;
  saveGame();
  if(window.onCurrencyChange) window.onCurrencyChange();
}

function computePlayerStats(){
  const base={maxHp:100,damage:1,range:70,atkSpd:1.0,speed:180,regen:0,magnet:40,crit:0,critMult:2.0,knockback:1,tokenMul:1};
  const build={statusChance:0,statusDmgMult:1,poisonDmg:0,poisonDuration:3,frostSlow:0,burnDmg:0,
    bowUnlocked:false,arrowCount:1,arrowDmg:0,bowDmgMult:1,bowAtkSpd:0,arrowPierce:0,
    boxerMode:false,boxerDmg:0,boxerCombo:1,boxerDmgMult:1,boxerCritBonus:0,
    mageUnlocked:false,chainCount:0,mageDmg:0,mageDmgMult:1,fireballRadius:0,fireballDmg:0,mageAtkSpd:0,
    vitalityUnlocked:false,vitHp:0,dmgReduction:0,dmgReductionMult:1,shieldEnabled:false,shieldCdReduce:0,regenEnabled:false,shieldMaxBonus:0,shieldAutoRegen:false,
    droneCount:0,droneDmg:0,droneDmgMult:1,droneCdReduce:0,droneRange:0,
    gunnerUnlocked:false,pistolDmg:0,pistolSpd:0,sniperDmg:0,sniperPierce:0,gunnerDmgMult:1,
    legendMage:false,legendDrone:false,legendChem:false,legendBoxer:false,legendBow:false,legendGunner:false,legendVitality:false};
  TOKEN_NODES.forEach(n=>{ const l=gameData.tokenLevels[n.id]||0; if(l>0) n.apply(base,l); });
  const slot=gameData.slots[gameData.activeSlot];
  BUILD_NODES.forEach(n=>{ const l=(slot.build&&slot.build[n.id])||0; if(l>0) n.apply(build,l,base); });
  base.maxHp+=build.vitHp;
  return {base,build};
}

const NODE_COLOR_MAP={ locked:'#1a2035', lockedavail:'#8a5a00', buyable:'#f4ff00', active:'#00fff2', maxed:'#ff00e5' };
function resolveNodeColor(n,st,lvl){
  if(st==='fogged') return NODE_COLOR_MAP.locked;
  if(st==='maxed') return NODE_COLOR_MAP.maxed;
  if(lvl>0) return NODE_COLOR_MAP.active;
  if(st==='unlockable') return canAfford(n)? NODE_COLOR_MAP.buyable : NODE_COLOR_MAP.lockedavail;
  return NODE_COLOR_MAP.locked;
}

function openCoreModal(){
  const modal=document.getElementById('coreModal'); if(!modal) return;
  const {base,build}=computePlayerStats();
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('coreMaxHp', Math.round(base.maxHp));
  set('coreDmgMult', ((build.mageDmgMult||1)*(build.boxerDmgMult||1)*(build.bowDmgMult||1)*(build.gunnerDmgMult||1)*(build.droneDmgMult||1)).toFixed(2)+'x');
  set('coreRegen', ((base.regen||0)+ (build.regen||0)).toFixed(2)+'/秒');
  set('coreShieldMax', 3+(build.shieldMaxBonus||0));
  set('coreTotalTokens', gameData.totalTokensEarned||0);
  set('coreTotalStars', (gameData.totalStarsEarned||0));
  modal.classList.remove('hidden');
}
function closeCoreModal(){ const modal=document.getElementById('coreModal'); if(modal) modal.classList.add('hidden'); }

const SkillTree=(function(){
  let view={scale:0.5,offsetX:0,offsetY:0};
  let dragging=false,lastX=0,lastY=0,dragged=false;
  let animScale={}, unlockFx={}, hoverId=null, selectedId=null;
  let touch={mode:null,lastMidX:0,lastMidY:0,lastDist:0};

  function worldToScreen(x,y){ return {x:W/2+(x+view.offsetX)*view.scale, y:H/2+(y+view.offsetY)*view.scale}; }
  function screenToWorld(sx,sy){ return {x:(sx-W/2)/view.scale-view.offsetX, y:(sy-H/2)/view.scale-view.offsetY}; }
  function reset(){ view.scale=0.5; view.offsetX=0; view.offsetY=0; animScale={}; unlockFx={}; hoverId=null; selectedId=null; closePanel(); }

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
    if(e.touches.length===0){ touch.mode=null; hoverId=null; }
    else if(e.touches.length===1){ touch.mode='pan'; touch.lastX=e.touches[0].clientX; touch.lastY=e.touches[0].clientY; }
  }

  function nodeScreenPos(n){ return worldToScreen(n.x,n.y); }
  function nodeBaseRadius(n){ return tierRadius(n.tier); }
  function nodeRadius(n){ const s=animScale[n.id]||1; return nodeBaseRadius(n)*view.scale*s; }
  function hitNode(sx,sy){
    for(const n of ALL_NODES){
      if(nodeState(n)==='hidden') continue;
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
    if(st==='hidden') return;
    if(selectedId===n.id){
      if(st==='unlockable'){ buyNode(n); openPanel(n); }
    } else { selectedId=n.id; openPanel(n); }
  }
  function openPanel(n){
    const panel=document.getElementById('skillNodePanel'); if(!panel) return;
    const st=nodeState(n);
    const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
    set('snpName', st==='fogged'?'？？？':n.name);
    set('snpDesc', st==='fogged'?'':n.line2);
    const lvl=getLevel(n);
    set('snpCurrent', lvl>0?(typeof n.line3==='function'?n.line3(lvl):n.line3):'なし');
    const nextLvl=Math.min(n.maxLv,lvl+1);
    set('snpNext', st==='unlockable'?(typeof n.line3==='function'?n.line3(nextLvl):n.line3):(st==='maxed'?'最大解放済み':'解放条件未達成'));
    const cost=st==='maxed'?0:costAt(n,lvl);
    set('snpCost', st==='maxed'?'MAX':`${cost} ${n.costType==='token'?'⬡ トークン':'⭐ スター'}`);
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
    const n=hitNode(sx,sy);
    const id=n?n.id:null;
    if(id!==hoverId){ hoverId=id; if(id) AudioEngine.SE.pop(); }
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

    ALL_NODES.forEach(n=>{
      if(nodeState(n)==='hidden') return;
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
      const st=nodeState(n); if(st==='hidden') return;
      const p=nodeScreenPos(n); const r=nodeRadius(n);
      const lvl=getLevel(n);
      let color=resolveNodeColor(n,st,lvl);
      if(n.id===selectedId) color='#fff';
      const pulsing = st==='unlockable' && lvl===0 && canAfford(n);
      const pulseScale = pulsing ? (0.85+0.15*Math.sin(performance.now()/220)) : 1;
      ctx.save();
      ctx.shadowColor=color; ctx.shadowBlur=(st==='unlockable'||st==='maxed'||n.id===selectedId?(pulsing?26:16):0)*view.scale*pulseScale;
      ctx.fillStyle='rgba(10,12,24,0.94)'; ctx.strokeStyle=color; ctx.lineWidth=(n.tier==='legend'||n.tier==='gate')?3.5:2.5;
      ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle=color; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font=`${14*view.scale}px Consolas`;
      ctx.fillText(st==='fogged'?'？':n.icon, p.x, p.y-6*view.scale);
      ctx.font=`${9*view.scale}px Consolas`;
      if(st==='maxed') ctx.fillText('MAX', p.x, p.y+9*view.scale);
      else if(st==='unlockable') ctx.fillText(lvl>0?`${lvl}/${n.maxLv}`:`${costAt(n,lvl)}`, p.x, p.y+9*view.scale);
      else if(st==='fogged') ctx.fillText(`${costAt(n,0)}`, p.x, p.y+9*view.scale);
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
      if(n && nodeState(n)!=='hidden') openPanel(n); else { selectedId=null; closePanel(); }
    }
    const cb=document.getElementById('stTokens'); if(cb) cb.textContent=gameData.tokens;
    const csb=document.getElementById('stStars'); if(csb) csb.textContent=gameData.skillStars;
  }
  return {render,onWheel,onDown,onMove,onUp,onTouchStart,onTouchMove,onTouchEnd,reset,triggerUnlockFx,handleTap,
    _worldToScreen:worldToScreen,_scale:()=>view.scale};
})();
