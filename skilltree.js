"use strict";

function costAt(node,lvl){ return Math.round(node.baseCost*Math.pow(node.growth,lvl)); }
function mult(l,g){ return Math.pow(g,l); }
function growthFor(maxLv,startCost,endCost){ return maxLv>1 ? Math.pow(endCost/startCost,1/(maxLv-1)) : 1; }
function sumWaveTokens(waves){ let s=0; for(let w=1;w<=waves;w++) s+=w*15; return s; }
const TOKENS_50WAVES_1ROUND=sumWaveTokens(50);
const TOKENS_50WAVES_2ROUNDS=TOKENS_50WAVES_1ROUND*2;
const GATE_THRESHOLD=12;

const tierRadiusMap={gate:24,deriv:20,upgrade:16,capstone:26,legend:32,ultimate:30};
function tierRadius(tier){ return tierRadiusMap[tier]||20; }

/* ---- 前座（gate）ノードのアンカー固定設定 ---- */
const GATE_ANCHORS={
  mg_gate:{angle:-170,dist:210},
  dr_gate:{angle:-130,dist:210},
  ch_gate:{angle:-45,dist:210},
  bx_gate:{angle:-15,dist:210},
  bo_gate:{angle:-110,dist:210},
  gn_gate:{angle:-90,dist:210},
  vt_gate:{angle:-40,dist:210}
};

function lockGatePosition(gate,tokenPos){
  const anchor=GATE_ANCHORS[gate.id];
  if(!anchor) return;
  const rad=anchor.angle*Math.PI/180;
  gate.x=tokenPos.x+Math.cos(rad)*anchor.dist;
  gate.y=tokenPos.y+Math.sin(rad)*anchor.dist;
  gate.locked=true;
}

/* ---- 派生枝の固定オフセット配置 ---- */
const placedNodes=[{x:0,y:0,r:34}];
function organicPlace(parent,baseAngleDeg,minDist,maxDist,radius){
  const rad=baseAngleDeg*Math.PI/180;
  const dist=(minDist+maxDist)/2;
  const x=parent.x+Math.cos(rad)*dist;
  const y=parent.y+Math.sin(rad)*dist;
  placedNodes.push({x,y,r:radius});
  return {x,y};
}
const core={x:0,y:0,id:'core'};

/* ---- 基礎ステータス（トークン専用ツリー、幹＝上方向） ---- */
const t_dmg_pos=organicPlace(core,-90,150,195,tierRadius('gate'));
const T_DMG_MAXLV=50, T_DMG_BASE=20;
const t_dmg={id:'t_dmg',costType:'token',scope:'global',name:'攻撃力',icon:'⚔',maxLv:T_DMG_MAXLV,baseCost:T_DMG_BASE,
  growth:growthFor(T_DMG_MAXLV,T_DMG_BASE,TOKENS_50WAVES_1ROUND),parent:'core',
  x:t_dmg_pos.x,y:t_dmg_pos.y,apply:(b,l)=>{b.batDamage+=1.3*l; b.damage+=1.3*l;},line2:'近接ダメージが上昇',line3:l=>`攻撃力+${(1.3*l).toFixed(1)}`};

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

/* t_tokendrop 定義を差分に基づき差し替え（maxLv10, baseCost20, 累計コスト2000, 効果=回収半径100%→300%） */
const TOKEN_PICKUP_BASE_RADIUS=34; /* 0/10時＝接触しないと拾えない距離 */
const T_DROP_MAXLV=10, T_DROP_BASE=20, T_DROP_MAXCOST=2000;
const t_tokendrop_pos=organicPlace(t_aspd_pos,-130,140,185,tierRadius('gate'));
const t_tokendrop={id:'t_tokendrop',costType:'token',scope:'global',name:'トークン回収範囲',icon:'⬡',
  maxLv:T_DROP_MAXLV,baseCost:T_DROP_BASE,growth:growthFor(T_DROP_MAXLV,T_DROP_BASE,T_DROP_MAXCOST),
  parent:'t_aspd',x:t_tokendrop_pos.x,y:t_tokendrop_pos.y,
  apply:(b,l)=>{
    const pct=100+200*(l/T_DROP_MAXLV);
    b.pickupRadius=TOKEN_PICKUP_BASE_RADIUS*(pct/100);
    b.pickupRangePct=Math.round(pct);
  },
  line2:'トークンを回収するときの範囲が増加',
  line3:l=>`回収範囲 ${Math.round(100+200*(l/T_DROP_MAXLV))}%`};

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

/* ---- 汎用ゲートテンプレート ---- */
function buildStandardGateBranch(tokenId,tokenPos,angle,cfg){
  const gateP=organicPlace(tokenPos,angle,180,230,tierRadius('gate'));
  const gate=Object.assign({},cfg.gate,{costType:'token',scope:'slot',parent:tokenId,tier:'gate',isGate:true,x:gateP.x,y:gateP.y});

  lockGatePosition(gate,tokenPos);

  const d1P=organicPlace(gateP,angle-26,150,190,tierRadius('deriv'));
  const d2P=organicPlace(gateP,angle+26,150,190,tierRadius('deriv'));
  const deriv1=Object.assign({},cfg.deriv1.node,{costType:'star',scope:'slot',parent:gate.id,tier:'deriv',x:d1P.x,y:d1P.y});
  const deriv2=Object.assign({},cfg.deriv2.node,{costType:'star',scope:'slot',parent:gate.id,tier:'deriv',x:d2P.x,y:d2P.y});

  const u1aP=organicPlace(d1P,angle-40,120,150,tierRadius('upgrade'));
  const u1bP=organicPlace(d1P,angle-12,120,150,tierRadius('upgrade'));
  const up1a=Object.assign({},cfg.deriv1.upgrades[0],{parent:deriv1.id,tier:'upgrade',x:u1aP.x,y:u1aP.y});
  const up1b=Object.assign({},cfg.deriv1.upgrades[1],{parent:deriv1.id,tier:'upgrade',x:u1bP.x,y:u1bP.y});

  const u2aP=organicPlace(d2P,angle+12,120,150,tierRadius('upgrade'));
  const u2bP=organicPlace(d2P,angle+40,120,150,tierRadius('upgrade'));
  const up2a=Object.assign({},cfg.deriv2.upgrades[0],{parent:deriv2.id,tier:'upgrade',x:u2aP.x,y:u2aP.y});
  const up2b=Object.assign({},cfg.deriv2.upgrades[1],{parent:deriv2.id,tier:'upgrade',x:u2bP.x,y:u2bP.y});

  const capP=organicPlace(gateP,angle,320,380,tierRadius('capstone'));
  const capstone=Object.assign({},cfg.capstone,{costType:'star',scope:'slot',parent:deriv1.id,tier:'capstone',x:capP.x,y:capP.y,
    derivReq:{ids:[deriv1.id,deriv2.id],needCount:2}});

  const legP=organicPlace(capP,angle-24,170,220,tierRadius('legend'));
  const ultP=organicPlace(capP,angle+24,170,220,tierRadius('ultimate'));
  const legend=Object.assign({},cfg.legend,{costType:'star',scope:'slot',parent:capstone.id,tier:'legend',x:legP.x,y:legP.y,
    req:{id:capstone.id,lvl:1}});
  const ultimate=Object.assign({},cfg.ultimate,{costType:'token',scope:'slot',parent:capstone.id,tier:'ultimate',x:ultP.x,y:ultP.y,
    req:{id:capstone.id,lvl:1}});

  return [gate,deriv1,deriv2,up1a,up1b,up2a,up2b,capstone,legend,ultimate];
}

/* ---- 各ビルド（ノード名変更反映） ---- */
const mageBranch=buildStandardGateBranch('t_range',t_range_pos,-170,{
  gate:{id:'mg_gate',name:'魔術入門',icon:'✦',maxLv:1,baseCost:600,growth:1,apply:(b,l)=>{},line2:'解放するとビルドツリーへ進入できる',line3:()=>'能力値上昇なし'},
  deriv1:{node:{id:'mg_lightning',name:'雷撃付与',icon:'⚡',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.mageUnlocked=true;b.chainCount+=1;},line2:'連鎖する雷を習得',line3:()=>'敵を伝う遠距離攻撃'},
    upgrades:[
      {id:'mg_up_chain',name:'連鎖強化',icon:'⚡',maxLv:6,baseCost:6,growth:1.3,costType:'token',scope:'slot',apply:(b,l)=>{b.chainCount+=l;},line2:'雷の連鎖数が増加',line3:l=>`連鎖数+${l}`},
      {id:'mg_up_dmg',name:'雷撃威力',icon:'⚡',maxLv:6,baseCost:1,growth:1,costType:'star',scope:'slot',apply:(b,l)=>{b.mageDmg+=5*l;},line2:'雷のダメージが上昇',line3:l=>`威力+${5*l}`},
    ]},
  deriv2:{node:{id:'mg_fireball',name:'業火付与',icon:'🔥',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.fireballRadius=(b.fireballRadius||0)+40;b.fireballDmg=(b.fireballDmg||0)+10;},line2:'着弾地点に爆炎を発生',line3:()=>'広範囲ダメージを付与'},
    upgrades:[
      {id:'mg_up_radius',name:'爆炎範囲拡大',icon:'🔥',maxLv:6,baseCost:6,growth:1.3,costType:'token',scope:'slot',apply:(b,l)=>{b.fireballRadius+=12*l;},line2:'爆炎の範囲が拡大',line3:l=>`範囲+${12*l}`},
      {id:'mg_up_burndmg',name:'爆炎威力',icon:'🔥',maxLv:6,baseCost:1,growth:1,costType:'star',scope:'slot',apply:(b,l)=>{b.fireballDmg+=6*l;},line2:'爆炎のダメージが上昇',line3:l=>`威力+${6*l}`},
    ]},
  capstone:{id:'mg_capstone',name:'アークメイジ',icon:'☀',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.mageDmgMult=(b.mageDmgMult||1)*1.6;},line2:'魔法系すべての威力が飛躍的に上昇',line3:()=>'魔法倍率x1.6'},
  legend:{id:'mg_legend',name:'クロスカット・レディエンス',icon:'✝',maxLv:1,baseCost:5,growth:1,apply:(b,l)=>{b.legendMage=true;},line2:'画面を十字に切り裂く極大閃光',line3:()=>'アクティブ発動 画面全域大ダメージ'},
  ultimate:{id:'mg_ultimate',name:'グランドソーサラー',icon:'☀',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,apply:(b,l)=>{b.mageDmgMult=(b.mageDmgMult||1)*1.4;b.chainCount+=3;},line2:'魔法系の全能力が更に強化される',line3:()=>'倍率x1.4 連鎖+3'},
});

const droneBranch=buildStandardGateBranch('t_tokendrop',t_tokendrop_pos,-130,{
  gate:{id:'dr_gate',name:'ドローン起動',icon:'◈',maxLv:1,baseCost:700,growth:1,apply:(b,l)=>{},line2:'解放するとビルドツリーへ進入できる',line3:()=>'能力値上昇なし'},
  deriv1:{node:{id:'dr_combat',name:'戦闘ドローン配備',icon:'◈',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.droneCount+=1;b.droneDmg+=3;},line2:'自律ドローンを展開',line3:()=>'周囲を旋回し自動攻撃'},
    upgrades:[
      {id:'dr_up_count',name:'量産ライン',icon:'◈',maxLv:6,baseCost:6,growth:1.3,costType:'token',scope:'slot',apply:(b,l)=>{b.droneCount+=l;},line2:'展開数が増加',line3:l=>`ドローン数+${l}`},
      {id:'dr_up_dmg',name:'兵装強化',icon:'◈',maxLv:6,baseCost:1,growth:1,costType:'star',scope:'slot',apply:(b,l)=>{b.droneDmg+=5*l;},line2:'ドローンの威力が上昇',line3:l=>`威力+${5*l}`},
    ]},
  deriv2:{node:{id:'dr_support',name:'支援ドローン配備',icon:'◈',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.droneCdReduce=(b.droneCdReduce||0)+0.15;},line2:'ドローンの攻撃間隔を短縮',line3:()=>'攻撃頻度が上昇'},
    upgrades:[
      {id:'dr_up_cd',name:'再突入短縮',icon:'◈',maxLv:6,baseCost:6,growth:1.3,costType:'token',scope:'slot',apply:(b,l)=>{b.droneCdReduce=(b.droneCdReduce||0)+0.05*l;},line2:'攻撃間隔がさらに短縮',line3:l=>`CD-${(0.05*l).toFixed(2)}秒`},
      {id:'dr_up_mult',name:'兵装最適化',icon:'◉',maxLv:6,baseCost:1,growth:1,costType:'star',scope:'slot',apply:(b,l)=>{b.droneDmgMult*=mult(l,1.2);},line2:'ドローンの全火力が上昇',line3:l=>`倍率x${mult(l,1.2).toFixed(2)}`},
    ]},
  capstone:{id:'dr_capstone',name:'AI最適化',icon:'◉',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.droneDmgMult*=1.6;},line2:'ドローン群の火力が大幅上昇',line3:()=>'ドローン倍率x1.6'},
  legend:{id:'dr_legend',name:'プロトタイプ・マザーシップ',icon:'✝',maxLv:1,baseCost:5,growth:1,apply:(b,l)=>{b.legendDrone=true;},line2:'巨大母艦ドローンを常時召喚',line3:()=>'レーザー照射と全体オーバークロック'},
  ultimate:{id:'dr_ultimate',name:'ドローンフリート',icon:'◉',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,apply:(b,l)=>{b.droneCount+=2;b.droneDmgMult*=1.35;},line2:'ドローン数と火力が最大まで強化',line3:()=>'数+2 倍率x1.35'},
});

const chemicalBranch=buildStandardGateBranch('t_crit',t_crit_pos,-45,{
  gate:{id:'ch_gate',name:'科学者見習い',icon:'☣',maxLv:1,baseCost:650,growth:1,apply:(b,l)=>{},line2:'解放するとビルドツリーへ進入できる',line3:()=>'能力値上昇なし'},
  deriv1:{node:{id:'ch_poison',name:'毒付与',icon:'🧪',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.chemUnlocked=true;b.statusChance+=0.2;b.poisonDmg+=4;},line2:'攻撃に毒を付与',line3:()=>'毎秒継続ダメージを与える'},
    upgrades:[
      {id:'ch_up_poisondmg',name:'毒ダメージ上昇',icon:'🧪',maxLv:6,baseCost:6,growth:1.3,costType:'token',scope:'slot',apply:(b,l)=>{b.poisonDmg+=2*l;},line2:'毒の継続ダメージが上昇',line3:l=>`毒ダメージ+${2*l}`},
      {id:'ch_up_poisontime',name:'毒継続時間増加',icon:'🧪',maxLv:5,baseCost:1,growth:1,costType:'star',scope:'slot',apply:(b,l)=>{b.poisonDuration=(b.poisonDuration||3)+l;},line2:'毒の持続時間が延長',line3:l=>`持続時間+${l}秒`},
    ]},
  deriv2:{node:{id:'ch_frost',name:'凍傷付与',icon:'❄',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.frostSlow+=0.25;},line2:'攻撃に凍傷を付与',line3:()=>'敵の動きを鈍らせる'},
    upgrades:[
      {id:'ch_up_slow',name:'鈍足強化',icon:'❄',maxLv:6,baseCost:6,growth:1.3,costType:'token',scope:'slot',apply:(b,l)=>{b.frostSlow+=0.04*l;},line2:'敵の鈍足効果が強化',line3:l=>`鈍足+${Math.round(4*l)}%`},
      {id:'ch_up_statusdmg',name:'状態異常増幅',icon:'☠',maxLv:5,baseCost:1,growth:1,costType:'star',scope:'slot',apply:(b,l)=>{b.statusDmgMult*=mult(l,1.15);},line2:'状態異常ダメージ全般が上昇',line3:l=>`倍率x${mult(l,1.15).toFixed(2)}`},
    ]},
  capstone:{id:'ch_capstone',name:'疫病の権化',icon:'☠',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.statusDmgMult*=1.6;},line2:'あらゆる状態異常が激化する',line3:()=>'状態異常倍率x1.6'},
  legend:{id:'ch_legend',name:'二段火傷（インフェルノ）',icon:'✝',maxLv:1,baseCost:5,growth:1,apply:(b,l)=>{b.legendChem=true;},line2:'毒とは別に火傷を二重付与',line3:()=>'毎秒超高ダメージで焼き尽くす'},
  ultimate:{id:'ch_ultimate',name:'汚染フィールド',icon:'☣',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,apply:(b,l)=>{b.statusChance+=0.3;b.statusDmgMult*=1.3;},line2:'状態異常の付与率と威力が最大化',line3:()=>'付与率+30% 倍率x1.3'},
});

const boxerBranch=buildStandardGateBranch('t_crit',t_crit_pos,-15,{
  gate:{id:'bx_gate',name:'闘志の誓い',icon:'✊',maxLv:1,baseCost:650,growth:1,apply:(b,l,base)=>{b.boxerMode=true;b.boxerRange=base.range*0.6;b.boxerAtkSpdMul=0.85;b.boxerDmg+=8;},line2:'拳を装備する（バットと併用可）',line3:()=>'近接高火力の格闘スタイル'},
  deriv1:{node:{id:'bx_fist',name:'拳強化習得',icon:'✊',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.boxerDmg+=6;},line2:'拳の基礎威力が上昇',line3:()=>'拳威力+6'},
    upgrades:[
      {id:'bx_up_power',name:'鋼拳強化',icon:'✊',maxLv:6,baseCost:6,growth:1.3,costType:'token',scope:'slot',apply:(b,l)=>{b.boxerDmg+=6*l;},line2:'拳の威力が上昇',line3:l=>`威力+${6*l}`},
      {id:'bx_up_combo',name:'連撃技術',icon:'✊',maxLv:6,baseCost:1,growth:1,costType:'star',scope:'slot',apply:(b,l)=>{b.boxerCombo+=0.15*l;},line2:'連続ヒットで威力が伸びる',line3:l=>`連撃倍率+${Math.round(15*l)}%`},
    ]},
  deriv2:{node:{id:'bx_footwork',name:'闘気循環',icon:'✊',maxLv:1,baseCost:2,growth:1,apply:(b,l,base)=>{base.speed*=1.1;},line2:'俊敏性が向上する',line3:()=>'移動速度が上昇'},
    upgrades:[
      {id:'bx_up_speed',name:'フットワーク',icon:'✊',maxLv:5,baseCost:6,growth:1.3,costType:'token',scope:'slot',apply:(b,l,base)=>{base.speed*=(1+0.03*l);},line2:'移動速度がさらに上昇',line3:l=>`移動速度+${Math.round(3*l)}%`},
      {id:'bx_up_crit',name:'急所突き',icon:'✹',maxLv:5,baseCost:1,growth:1,costType:'star',scope:'slot',apply:(b,l)=>{b.boxerCritBonus=(b.boxerCritBonus||0)+0.02*l;},line2:'クリティカル率が上昇',line3:l=>`クリティカル率+${Math.round(2*l)}%`},
    ]},
  capstone:{id:'bx_capstone',name:'限界突破',icon:'☄',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.boxerDmgMult*=1.65;},line2:'拳の威力が限界を超えて上昇',line3:()=>'拳倍率x1.65'},
  legend:{id:'bx_legend',name:'スーパークリティカル',icon:'✝',maxLv:1,baseCost:5,growth:1,apply:(b,l)=>{b.legendBoxer=true;},line2:'極低確率で発生する超絶一撃',line3:()=>'敵の最大HPの約4割を吹き飛ばす'},
  ultimate:{id:'bx_ultimate',name:'鬼神の拳',icon:'☄',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,apply:(b,l)=>{b.boxerCombo+=0.3;b.boxerDmgMult*=1.35;},line2:'連撃と威力が最大まで強化される',line3:()=>'連撃+30% 倍率x1.35'},
});

const gunnerBranch=buildStandardGateBranch('t_knockback',t_knockback_pos,-90,{
  gate:{id:'gn_gate',name:'ガンマンの嗜み',icon:'●',maxLv:1,baseCost:650,growth:1,apply:(b,l)=>{b.gunnerUnlocked=true;},line2:'サイバーガンビットを浮遊配置（他武器と併用可）',line3:()=>'狙った方向へ自動発砲'},
  deriv1:{node:{id:'gn_pistol',name:'ピストル装備',icon:'●',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.pistolDmg=(b.pistolDmg||0)+5;},line2:'連射・浅貫通のピストルを習得',line3:()=>'狙った方向へ自動発砲'},
    upgrades:[
      {id:'gn_up_pistoldmg',name:'連射機構',icon:'●',maxLv:6,baseCost:6,growth:1.3,costType:'token',scope:'slot',apply:(b,l)=>{b.pistolDmg=(b.pistolDmg||0)+3*l;},line2:'ピストルの威力が上昇',line3:l=>`威力+${3*l}`},
      {id:'gn_up_pistolspd',name:'高速リロード',icon:'●',maxLv:5,baseCost:1,growth:1,costType:'star',scope:'slot',apply:(b,l)=>{b.pistolSpd=(b.pistolSpd||0)+0.05*l;},line2:'連射速度が上昇',line3:l=>`連射速度+${Math.round(5*l)}%`},
    ]},
  deriv2:{node:{id:'gn_sniper',name:'スナイパー装備',icon:'◆',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.sniperDmg=(b.sniperDmg||0)+15;b.sniperPierce=(b.sniperPierce||0)+2;},line2:'重撃・深貫通のスナイパーを習得',line3:()=>'一撃の威力と貫通力に優れる'},
    upgrades:[
      {id:'gn_up_sniperdmg',name:'重弾薬',icon:'◆',maxLv:6,baseCost:6,growth:1.3,costType:'token',scope:'slot',apply:(b,l)=>{b.sniperDmg=(b.sniperDmg||0)+8*l;},line2:'スナイパーの威力が上昇',line3:l=>`威力+${8*l}`},
      {id:'gn_up_sniperpierce',name:'徹甲弾',icon:'◆',maxLv:5,baseCost:1,growth:1,costType:'star',scope:'slot',apply:(b,l)=>{b.sniperPierce=(b.sniperPierce||0)+l;},line2:'貫通する敵の数が増加',line3:l=>`貫通数+${l}`},
    ]},
  capstone:{id:'gn_capstone',name:'火器統制',icon:'☄',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.gunnerDmgMult=(b.gunnerDmgMult||1)*1.6;},line2:'銃器全般の威力が大幅上昇',line3:()=>'銃器倍率x1.6'},
  legend:{id:'gn_legend',name:'破滅のショットガン',icon:'✝',maxLv:1,baseCost:5,growth:1,apply:(b,l)=>{b.legendGunner=true;},line2:'扇状の全敵貫通弾幕を掃射',line3:()=>'至近距離ではボスすら瞬殺する'},
  ultimate:{id:'gn_ultimate',name:'弾薬無限機構',icon:'☄',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,apply:(b,l)=>{b.pistolDmg=(b.pistolDmg||0)+8;b.sniperDmg=(b.sniperDmg||0)+16;},line2:'すべての銃器威力が最大化される',line3:()=>'威力+8〜16'},
});

/* ---- 生命体ビルド ---- */
const vitalityBranch=(function(){
  const gateP=organicPlace(t_knockback_pos,-40,180,230,tierRadius('gate'));
  const gate={id:'vt_gate',costType:'token',scope:'slot',parent:'t_knockback',tier:'gate',isGate:true,
    name:'超生命体',icon:'🛡',maxLv:1,baseCost:650,growth:1,x:gateP.x,y:gateP.y,
    apply:()=>{},line2:'解放するとビルドツリーへ進入できる',line3:()=>'能力値上昇なし'};
  lockGatePosition(gate,t_knockback_pos);

  const armorP=organicPlace(gateP,-24,150,190,tierRadius('deriv'));
  const armorDeriv={id:'vt_armor',costType:'star',scope:'slot',parent:'vt_gate',tier:'deriv',
    name:'装甲強化',icon:'🛡',maxLv:1,baseCost:2,growth:1,x:armorP.x,y:armorP.y,
    apply:(b,l)=>{b.vitalityUnlocked=true;b.dmgReduction+=0.05;},
    line2:'ダメージを無効化するシールドを装備',
    line3:l=> l>0 ? 'HP30%以下の時に発動するシールドを取得' : 'HP30%以下の時に発動するシールドを取得'};

  const regenP=organicPlace(gateP,24,150,190,tierRadius('deriv'));
  const regenDeriv={id:'vt_regenroot',costType:'star',scope:'slot',parent:'vt_gate',tier:'deriv',
    name:'自己修復習得',icon:'✚',maxLv:1,baseCost:2,growth:1,x:regenP.x,y:regenP.y,
    apply:(b,l)=>{b.vitalityUnlocked=true;b.regenEnabled=true;b.regen+=6;},line2:'HPが最大値未満のとき自動回復する',line3:()=>'1秒毎にHPを回復'};

  const shieldCountP=organicPlace(armorP,-18,150,190,tierRadius('upgrade'));
  const shieldCountNode={id:'vt_shieldcount',costType:'token',scope:'slot',parent:'vt_armor',tier:'upgrade',
    name:'最大シールド数増加',icon:'⊙',maxLv:6,baseCost:900,growth:2.2,x:shieldCountP.x,y:shieldCountP.y,
    apply:(b,l)=>{b.shieldMaxBonus=(b.shieldMaxBonus||0)+l;},line2:'展開できるシールドの上限が増加',line3:l=>`シールド上限+${l}`};

  const shieldRegenP=organicPlace(shieldCountP,-18,120,150,tierRadius('upgrade'));
  const shieldRegenNode={id:'vt_shieldregen',costType:'star',scope:'slot',parent:'vt_shieldcount',tier:'upgrade',
    name:'シールド自動回復',icon:'⊙',maxLv:1,baseCost:1,growth:1,x:shieldRegenP.x,y:shieldRegenP.y,
    apply:(b,l)=>{b.shieldAutoRegen=true;},line2:'時間経過でシールドが自動復元',line3:()=>'60秒毎にシールドを1つ回復'};

  const nanoP=organicPlace(regenP,18,150,190,tierRadius('upgrade'));
  const nanoNode={id:'vt_regennano',costType:'token',scope:'slot',parent:'vt_regenroot',tier:'upgrade',
    name:'自己修復ナノ',icon:'✚',maxLv:8,baseCost:800,growth:1.9,x:nanoP.x,y:nanoP.y,
    apply:(b,l)=>{b.regen+=4*l;},line2:'HP自動回復量が上昇',line3:l=>`HP自動回復+${4*l}/秒`};

  const capP=organicPlace(gateP,0,340,400,tierRadius('capstone'));
  const capstone={id:'vt_capstone',costType:'star',scope:'slot',parent:'vt_armor',tier:'capstone',
    name:'不屈の意志',icon:'✝',maxLv:1,baseCost:4,growth:1,x:capP.x,y:capP.y,
    derivReq:{ids:['vt_armor','vt_regenroot'],needCount:2},
    apply:(b,l)=>{b.dmgReductionMult*=1.5;},line2:'被ダメージ軽減が大幅上昇',line3:()=>'軽減倍率x1.5'};

  const legP=organicPlace(capP,-24,180,230,tierRadius('legend'));
  const legend={id:'vt_legend',costType:'star',scope:'slot',parent:'vt_capstone',tier:'legend',
    name:'ライフドレイン（吸血）',icon:'🩸',maxLv:1,baseCost:5,growth:1,x:legP.x,y:legP.y,
    req:{id:'vt_capstone',lvl:1},
    apply:(b,l)=>{b.legendVitality=true;},line2:'自身のHPを消費し周囲から吸血',line3:()=>'大ダメージと引き換えに大幅回復'};

  const ultP=organicPlace(capP,24,180,230,tierRadius('ultimate'));
  const ultimate={id:'vt_ultimate',costType:'token',scope:'slot',parent:'vt_capstone',tier:'ultimate',
    name:'不死身の肉体',icon:'🫀',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,x:ultP.x,y:ultP.y,
    req:{id:'vt_capstone',lvl:1},
    apply:(b,l)=>{b.vitHp+=80;b.dmgReductionMult*=1.3;},line2:'HPと軽減率が最大まで強化される',line3:()=>'最大HP+80 倍率x1.3'};

  return [gate,armorDeriv,regenDeriv,shieldCountNode,shieldRegenNode,nanoNode,capstone,legend,ultimate];
})();

/* ---- 弓術ビルド ---- */
const bowBranch=(function(){
  const gateP=organicPlace(t_speed_pos,-110,180,230,tierRadius('gate'));
  const gate={id:'bo_gate',costType:'token',scope:'slot',parent:'t_speed',tier:'gate',isGate:true,starCost:1,
    name:'弓術取得',icon:'➶',maxLv:1,baseCost:600,growth:1,x:gateP.x,y:gateP.y,
    apply:(b,l)=>{b.bowUnlocked=true;},
    line2:'バットを捨てホログラムサイバーボウを装備',
    line3:()=>'基礎2.0秒に1回、矢を自動発射'};
  lockGatePosition(gate,t_speed_pos);

  const multishotP=organicPlace(gateP,-34,150,190,tierRadius('deriv'));
  const multishot={id:'bo_multishot',costType:'star',scope:'slot',parent:'bo_gate',tier:'deriv',
    name:'連射弓',icon:'➶',maxLv:1,baseCost:1,growth:1,x:multishotP.x,y:multishotP.y,
    apply:(b,l)=>{b.arrowCount=(b.arrowCount||1)+1;},
    line2:'同時に放つ矢の数が増加',line3:()=>'矢の数+1'};

  const multiP=organicPlace(multishotP,-40,130,160,tierRadius('upgrade'));
  const MULTI_MAXLV=5;
  const multi={id:'bo_multi',costType:'token',scope:'slot',parent:'bo_multishot',tier:'upgrade',
    name:'マルチノック',icon:'➶',maxLv:MULTI_MAXLV,baseCost:300,growth:growthFor(MULTI_MAXLV,300,12000),
    x:multiP.x,y:multiP.y,apply:(b,l)=>{b.arrowCount=(b.arrowCount||1)+l;},
    line2:'矢の数がさらに増加',line3:l=>`矢の数+${l}`};

  const barbP=organicPlace(multishotP,-8,130,160,tierRadius('upgrade'));
  const BARB_MAXLV=6;
  const barb={id:'bo_dmg',costType:'token',scope:'slot',parent:'bo_multishot',tier:'upgrade',
    name:'鏃強化',icon:'➶',maxLv:BARB_MAXLV,baseCost:200,growth:growthFor(BARB_MAXLV,200,10000),
    x:barbP.x,y:barbP.y,apply:(b,l)=>{b.bowDmgMult=(b.bowDmgMult||1)+(1.8*l/BARB_MAXLV);},
    line2:'矢の攻撃倍率が上昇',line3:l=>`攻撃倍率+${Math.round(180*l/BARB_MAXLV)}%`};

  const gravP=organicPlace(barbP,-8,120,150,tierRadius('upgrade'));
  const gravBolt={id:'bo_gravbolt',costType:'star',scope:'slot',parent:'bo_dmg',tier:'upgrade',
    name:'過重力ボルト',icon:'⯍',maxLv:1,baseCost:1,growth:1,x:gravP.x,y:gravP.y,
    req:{id:'bo_dmg',lvl:BARB_MAXLV},
    apply:(b,l)=>{b.bowDmgMult=(b.bowDmgMult||1)+0.7;},
    line2:'矢の攻撃倍率がさらに大幅上昇',line3:()=>'攻撃倍率+70%（合計+250%）'};

  const precisionP=organicPlace(gateP,34,150,190,tierRadius('deriv'));
  const precision={id:'bo_precision',costType:'star',scope:'slot',parent:'bo_gate',tier:'deriv',
    name:'精密射撃',icon:'➶',maxLv:1,baseCost:1,growth:1,x:precisionP.x,y:precisionP.y,
    apply:(b,l)=>{ b.arrowPierce=(b.arrowPierce||0)+1; },
    line2:'矢が敵を貫通するようになる',line3:()=>'貫通数+1'};

  const pierceP=organicPlace(precisionP,8,130,160,tierRadius('upgrade'));
  const pierce={id:'bo_pierce',costType:'token',scope:'slot',parent:'bo_precision',tier:'upgrade',
    name:'貫通鏃',icon:'➶',maxLv:2,baseCost:1000,growth:8,
    x:pierceP.x,y:pierceP.y,apply:(b,l)=>{ b.arrowPierce=(b.arrowPierce||0)+l; },
    line2:'貫通する敵の数が増加',line3:l=>`貫通数+${l}`};

  const rapidP=organicPlace(precisionP,40,130,160,tierRadius('upgrade'));
  const RAPID_MAXLV=7;
  const rapid={id:'bo_speed',costType:'token',scope:'slot',parent:'bo_precision',tier:'upgrade',
    name:'速射訓練',icon:'⚡',maxLv:RAPID_MAXLV,baseCost:400,growth:growthFor(RAPID_MAXLV,400,11000),
    x:rapidP.x,y:rapidP.y,apply:(b,l)=>{b.bowSpeedReduce=(b.bowSpeedReduce||0)+0.1*l;},
    line2:'矢の発射間隔がさらに短縮',line3:l=>`発射間隔-${(0.1*l).toFixed(1)}秒`};

  const capP=organicPlace(gateP,0,340,400,tierRadius('capstone'));
  const capstone={id:'bo_capstone',costType:'star',scope:'slot',parent:'bo_multishot',tier:'capstone',
    name:'乱れ撃ち',icon:'⯍',maxLv:1,baseCost:4,growth:1,x:capP.x,y:capP.y,
    derivReq:{ids:['bo_multishot','bo_precision'],needCount:2},
    apply:(b,l)=>{b.bowDmgMult=(b.bowDmgMult||1)+0.6;},
    line2:'弓の全ダメージが大幅上昇',line3:()=>'攻撃倍率+60%'};

  const legP=organicPlace(capP,-24,180,230,tierRadius('legend'));
  const legend={id:'bo_legend',costType:'star',scope:'slot',parent:'bo_capstone',tier:'legend',
    name:'アストラ・アロー',icon:'🌟',maxLv:1,baseCost:5,growth:1,x:legP.x,y:legP.y,
    req:{id:'bo_capstone',lvl:1},apply:(b,l)=>{b.legendBow=true;},
    line2:'画面を貫く超巨大な光の矢',line3:()=>'進路上のすべてを消滅させる'};

  const ultP=organicPlace(capP,24,180,230,tierRadius('ultimate'));
  const ultimate={id:'bo_ultimate',costType:'token',scope:'slot',parent:'bo_capstone',tier:'ultimate',
    name:'百鬼夜行',icon:'🔱',maxLv:1,baseCost:TOKENS_50WAVES_2ROUNDS,growth:1,x:ultP.x,y:ultP.y,
    req:{id:'bo_capstone',lvl:1},apply:(b,l)=>{b.arrowCount=(b.arrowCount||1)+2;b.bowDmgMult=(b.bowDmgMult||1)+0.3;},
    line2:'発射数と威力が最大まで強化',line3:()=>'矢の数+2 攻撃倍率+30%'};

  return [gate,multishot,multi,barb,gravBolt,precision,pierce,rapid,capstone,legend,ultimate];
})();

const BUILD_NODES=[...mageBranch,...droneBranch,...chemicalBranch,...boxerBranch,...bowBranch,...gunnerBranch,...vitalityBranch];
const ALL_NODES=[...TOKEN_NODES,...BUILD_NODES];

function findNode(id){ return ALL_NODES.find(n=>n.id===id); }

/* =========================================================
   状態判定（nodeState修正 — レベル未MAXのノードは常に unlockable を返すよう統一）
   ========================================================= */
function getLevel(node){
  if(node.scope==='global') return gameData.tokenLevels[node.id]||0;
  const slot=gameData.slots[gameData.activeSlot];
  return (slot.build&&slot.build[node.id])||0;
}
function isOwned(node){ return !!(node && getLevel(node)>0); }

function nodeState(node){
  if(isOwned(node)){
    return getLevel(node)>=node.maxLv? 'maxed':'unlockable';
  }
  if(node.tier==='capstone' && node.derivReq){
    const ownedCount=node.derivReq.ids.filter(id=>isOwned(findNode(id))).length;
    if(ownedCount>=node.derivReq.needCount) return 'unlockable';
    if(ownedCount>=1) return 'fogged';
    return 'hidden';
  }
  if(node.parent==='core') return 'unlockable';
  const parent=findNode(node.parent);
  if(!parent) return 'hidden';
  if(isOwned(parent)){
    if(node.tier==='gate'){ return tokenTotalLevels()>=GATE_THRESHOLD? 'unlockable':'fogged'; }
    if(node.req && getLevel(findNode(node.req.id))<node.req.lvl) return 'fogged';
    if(node.groupReq){ const sum=node.groupReq.ids.reduce((s,id)=>s+getLevel(findNode(id)),0); if(sum<node.groupReq.total) return 'fogged'; }
    return 'unlockable';
  } else {
    const grandparent=findNode(parent.parent);
    if(parent.parent==='core' || (grandparent && isOwned(grandparent))) return 'fogged';
    return 'hidden';
  }
}

function canAfford(node){
  if(nodeState(node)!=='unlockable') return false;
  const lvl=getLevel(node);
  const cost=costAt(node,lvl);
  if(node.tier==='gate' && node.starCost) return gameData.tokens>=cost && gameData.skillStars>=node.starCost;
  return node.costType==='token'? gameData.tokens>=cost : gameData.skillStars>=cost;
}
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
  if(AudioEngine && AudioEngine.SE && AudioEngine.SE.unlock) AudioEngine.SE.unlock();
  if(typeof SkillTree!=='undefined' && SkillTree.triggerUnlockFx) SkillTree.triggerUnlockFx(node.id);
  saveGame();
  if(window.onCurrencyChange) window.onCurrencyChange();
  return true;
}
/* 振り直し: 所持数を総獲得数へ直接上書き（消費分は自動的に戻る計算式） */
function respecActiveSlot(){
  const slot=gameData.slots[gameData.activeSlot];
  slot.build={};
  gameData.tokenLevels={};
  gameData.tokens=gameData.totalTokensEarned||0;
  gameData.skillStars=gameData.totalStarsEarned||0;
  saveGame();
  if(window.onCurrencyChange) window.onCurrencyChange();
}

/* =========================================================
   プレイヤーステータス計算（独立ダメージ計算：基礎円バフは一括、派生バフは該当武器のみ）
   ========================================================= */
function computePlayerStats(){
  const base={maxHp:100,damage:1,batDamage:1,range:70,atkSpd:1.0,speed:180,regen:0,magnet:40,crit:0,critMult:2.0,knockback:1,pickupRadius:TOKEN_PICKUP_BASE_RADIUS,pickupRangePct:100};
  const build={pickupRadius:TOKEN_PICKUP_BASE_RADIUS,pickupRangePct:100,statusChance:0,statusDmgMult:1,poisonDmg:0,poisonDuration:3,frostSlow:0,burnDmg:0,
    bowUnlocked:false,arrowCount:1,arrowDmg:0,bowDmgMult:1,bowSpeedReduce:0,arrowPierce:0,bowRangeBonus:0,
    boxerMode:false,boxerDmg:0,boxerCombo:1,boxerDmgMult:1,boxerCritBonus:0,boxerRange:42,boxerAtkSpdMul:1,
    mageUnlocked:false,chainCount:0,mageDmg:0,mageDmgMult:1,fireballRadius:0,fireballDmg:0,mageAtkSpd:0,
    vitalityUnlocked:false,vitHp:0,dmgReduction:0,dmgReductionMult:1,
    regenEnabled:false,shieldMaxBonus:0,shieldAutoRegen:false,
    droneCount:0,droneDmg:0,droneDmgMult:1,droneCdReduce:0,droneRange:0,
    gunnerUnlocked:false,pistolDmg:0,pistolSpd:0,sniperDmg:0,sniperPierce:0,gunnerDmgMult:1,
    legendMage:false,legendDrone:false,legendChem:false,legendBoxer:false,legendBow:false,legendGunner:false,legendVitality:false};
  TOKEN_NODES.forEach(n=>{ const l=gameData.tokenLevels[n.id]||0; if(l>0) n.apply(base,l); });
  const slot=gameData.slots[gameData.activeSlot];
  BUILD_NODES.forEach(n=>{ const l=(slot.build&&slot.build[n.id])||0; if(l>0) n.apply(build,l,base); });
  base.maxHp+=build.vitHp;

  /* 弓の攻撃間隔: 基礎(2.0〜1.5s、0/12〜12/12)から速射訓練で減算 */
  const aspdLv=gameData.tokenLevels['t_aspd']||0;
  const bowBaseInterval=2.0-(0.5*Math.min(1,aspdLv/12));
  build.bowFireInterval=Math.max(0.8, bowBaseInterval-(build.bowSpeedReduce||0));

  /* 弓のサーチ半径: バット射程の4倍基準 */
  build.bowSearchRadius=base.range*4;

  return {base,build};
}

/* =========================================================
   resolveNodeColor: 'owned'状態が廃止されたため lvl>0 判定で色分岐するよう修正
   ========================================================= */
function resolveNodeColor(n,st,lvl){
  if(st==='fogged') return '#3A3F58';
  if(st==='maxed') return n.tier==='gate' ? '#FF007F' : '#FFE600';
  if(st==='unlockable'){
    if(lvl>0) return n.tier==='gate' ? '#FF2B9C' : '#00F0FF';
    return '#39FF14';
  }
  return null;
}

/* =========================================================
   Canvas描画/操作
   ========================================================= */
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
  function visibleNodes(){ return ALL_NODES.filter(n=>nodeState(n)!=='hidden'); }
  function hitNode(sx,sy){
    for(const n of visibleNodes()){
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
    const isFogged = st==='fogged';
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
    if(onCore!==hoverCore){ hoverCore=onCore; if(AudioEngine.SE.pop) AudioEngine.SE.pop(); }
    canvas.style.cursor = onCore? 'pointer':'default';
    if(onCore){ hoverId=null; return; }
    const n=hitNode(sx,sy);
    const id=n?n.id:null;
    if(id!==hoverId){ hoverId=id; if(id && AudioEngine.SE.pop) AudioEngine.SE.pop(); }
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

    const visible=visibleNodes();
    /* 1. 枝（線）を全描画 */
    visible.forEach(n=>{
      const parentPos = n.parent==='core'? worldToScreen(0,0) : nodeScreenPos(findNode(n.parent));
      const myPos=nodeScreenPos(n);
      const owned=isOwned(n);
      ctx.strokeStyle= owned? 'rgba(255,0,229,0.7)' : 'rgba(120,130,160,0.3)';
      ctx.lineWidth = owned?3:1.5;
      ctx.beginPath(); ctx.moveTo(parentPos.x,parentPos.y); ctx.lineTo(myPos.x,myPos.y); ctx.stroke();
    });

    /* 2. CORE */
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

    /* 3. ノード（円）を線の後に描画 */
    visible.forEach(n=>{
      const st=nodeState(n);
      const p=nodeScreenPos(n); const r=nodeRadius(n);
      const lvl=getLevel(n);
      let color=resolveNodeColor(n,st,lvl);
      if(n.id===selectedId) color='#fff';
      const pulsing = st==='unlockable';
      const pulseScale = pulsing ? (0.85+0.15*Math.sin(performance.now()/220)) : 1;
      ctx.save();
      ctx.shadowColor=color; ctx.shadowBlur=(pulsing?26:16)*view.scale*pulseScale;
      ctx.fillStyle='rgba(10,12,24,0.94)'; ctx.strokeStyle=color; ctx.lineWidth=(n.tier==='legend'||n.tier==='gate')?3.5:2.5;
      ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle=color; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font=`${14*view.scale}px Consolas`;
      ctx.fillText(st==='fogged'?'？':n.icon, p.x, p.y-6*view.scale);
      
      /* ---- ラベル表示 ---- */
      ctx.font=`${9*view.scale}px Consolas`;
      if(st==='maxed') ctx.fillText('MAX', p.x, p.y+9*view.scale);
      else if(st==='unlockable' && lvl>0) ctx.fillText(`${lvl}/${n.maxLv}`, p.x, p.y+9*view.scale);
      else if(st==='unlockable') ctx.fillText(`${costAt(n,lvl)}`, p.x, p.y+9*view.scale);
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

/* =========================================================
   CORE STATUS モーダル（12項目）
   ========================================================= */
function openCoreModal(){
  const modal=document.getElementById('coreModal'); if(!modal) return;
  const {base,build}=computePlayerStats();
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };

  const rawDamage=base.batDamage!==undefined?base.batDamage:base.damage;
  const totalMult=(build.mageDmgMult||1)*(build.boxerDmgMult||1)*(build.bowDmgMult||1)*(build.gunnerDmgMult||1);
  const finalDamage=Math.round(rawDamage*totalMult);

  set('coreMaxHp', Math.round(base.maxHp+build.vitHp));
  set('coreRegen', ((build.regenEnabled? (base.regen+(build.regen||0)) : 0)).toFixed(2)+'/秒');
  set('coreDamage', `${rawDamage.toFixed(1)} [${finalDamage}]`);
  set('coreAtkSpd', base.atkSpd.toFixed(2)+'/秒');
  set('coreRange', Math.round(base.range));
  set('coreTokenDrop', (base.pickupRangePct||100)+'%');
  set('coreSpeed', Math.round(base.speed));
  set('coreKnockback', Math.round(base.knockback));
  set('coreCrit', Math.round(base.crit*100)+'%');
  set('coreCritMult', (base.critMult||2.0).toFixed(2)+'x');
  set('coreTotalTokens', gameData.totalTokensEarned||0);
  set('coreTotalStars', gameData.totalStarsEarned||0);
  modal.classList.remove('hidden');
}
function closeCoreModal(){ const modal=document.getElementById('coreModal'); if(modal) modal.classList.add('hidden'); }
