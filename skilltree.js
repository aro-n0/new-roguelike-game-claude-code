/* skilltree.js（全文更新：token/star分離バグ修正、Root→中間群1/2→Capstone→Legend&Ultimate構造、全ノードcostType明示） */
const GATE_THRESHOLD=12;
function costAt(node,lvl){ return Math.round(node.baseCost*Math.pow(node.growth,lvl)); }
function mult(l,g){ return Math.pow(g,l); }
function P(parent,angleDeg,radius){
  const rad=angleDeg*Math.PI/180;
  return {x:parent.x+Math.cos(rad)*radius, y:parent.y+Math.sin(rad)*radius};
}
const core={x:0,y:0,id:'core'};

/* ---- 基礎ステータス（アカウント共通・token専用） ---- */
const t_dmg_pos=P(core,-90,170);
const t_dmg={id:'t_dmg',costType:'token',scope:'global',name:'攻撃力',icon:'⚔',maxLv:200,baseCost:8,growth:1.28,parent:'core',
  x:t_dmg_pos.x,y:t_dmg_pos.y,apply:(b,l)=>{b.damage+=1.3*l;},line2:'近接ダメージが上昇',line3:l=>`攻撃力+${(1.3*l).toFixed(1)}`};
const t_aspd_pos=P(t_dmg_pos,-150,170);
const t_aspd={id:'t_aspd',costType:'token',scope:'global',name:'攻撃速度',icon:'⚡',maxLv:12,baseCost:10,growth:1.2,parent:'t_dmg',
  x:t_aspd_pos.x,y:t_aspd_pos.y,apply:(b,l)=>{b.atkSpd*=(1+0.03*l);},line2:'攻撃間隔が短縮',line3:l=>`攻撃速度+${Math.round(3*l)}%`};
const t_crit_pos=P(t_dmg_pos,-30,170);
const t_crit={id:'t_crit',costType:'token',scope:'global',name:'クリティカル率',icon:'✹',maxLv:12,baseCost:10,growth:1.2,parent:'t_dmg',
  x:t_crit_pos.x,y:t_crit_pos.y,apply:(b,l)=>{b.crit+=0.02*l;},line2:'会心の一撃が発生しやすくなる',line3:l=>`クリティカル率+${Math.round(2*l)}%`};
const t_hp_pos=P(t_dmg_pos,-90,220);
const t_hp={id:'t_hp',costType:'token',scope:'global',name:'体力増強',icon:'♥',maxLv:15,baseCost:8,growth:1.18,parent:'t_dmg',
  x:t_hp_pos.x,y:t_hp_pos.y,apply:(b,l)=>{b.maxHp+=12*l;},line2:'最大HPが増加',line3:l=>`最大HP+${12*l}`};
const t_range_pos=P(t_aspd_pos,-170,170);
const t_range={id:'t_range',costType:'token',scope:'global',name:'攻撃範囲',icon:'◎',maxLv:10,baseCost:12,growth:1.22,parent:'t_aspd',
  x:t_range_pos.x,y:t_range_pos.y,apply:(b,l)=>{b.range*=(1+0.04*l);},line2:'近接攻撃の届く距離が伸びる',line3:l=>`射程+${Math.round(4*l)}%`};
const t_tokendrop_pos=P(t_aspd_pos,-130,170);
const t_tokendrop={id:'t_tokendrop',costType:'token',scope:'global',name:'トークンドロップ率',icon:'⬡',maxLv:200,baseCost:20,growth:1.4,parent:'t_aspd',
  x:t_tokendrop_pos.x,y:t_tokendrop_pos.y,apply:(b,l)=>{b.tokenMul*=(1+0.05*l);},line2:'獲得するトークンが増加',line3:l=>`トークン獲得量x${(1+0.05*l).toFixed(2)}`};
const t_speed_pos=P(t_hp_pos,-110,170);
const t_speed={id:'t_speed',costType:'token',scope:'global',name:'移動速度',icon:'➤',maxLv:10,baseCost:10,growth:1.2,parent:'t_hp',
  x:t_speed_pos.x,y:t_speed_pos.y,apply:(b,l)=>{b.speed*=(1+0.03*l);},line2:'移動が速くなる',line3:l=>`移動速度+${Math.round(3*l)}%`};
const t_knockback_pos=P(t_hp_pos,-70,170);
const t_knockback={id:'t_knockback',costType:'token',scope:'global',name:'ノックバック力',icon:'☄',maxLv:10,baseCost:10,growth:1.2,parent:'t_hp',
  x:t_knockback_pos.x,y:t_knockback_pos.y,apply:(b,l)=>{b.knockback+=14*l;},line2:'攻撃時に敵を弾き飛ばす',line3:l=>`ノックバック力+${14*l}`};
const TOKEN_NODES=[t_dmg,t_aspd,t_crit,t_hp,t_range,t_tokendrop,t_speed,t_knockback];
function tokenTotalLevels(){ let s=0; TOKEN_NODES.forEach(n=>{ s+=gameData.tokenLevels[n.id]||0; }); return s; }

/* ---- ビルド分岐生成: Root(token/slot) → 中間群1(2) & 中間群2(3)(star) → Capstone(star) → Legend & Ultimate(star) ---- */
function buildFullBranch(tokenId,tokenPos,angle,cfg){
  const rootPos=P(tokenPos,angle,170);
  const root=Object.assign({},cfg.root,{costType:'token',scope:'slot',parent:tokenId,tier:'root',x:rootPos.x,y:rootPos.y});

  const g1a1=angle-24, g1a2=angle-8;
  const g1aPos=P(rootPos,g1a1,150), g1bPos=P(rootPos,g1a2,150);
  const g1a=Object.assign({},cfg.g1[0],{costType:'star',scope:'slot',parent:root.id,tier:'mid',group:'g1',x:g1aPos.x,y:g1aPos.y});
  const g1b=Object.assign({},cfg.g1[1],{costType:'star',scope:'slot',parent:root.id,tier:'mid',group:'g1',x:g1bPos.x,y:g1bPos.y});

  const g2a1=angle+8, g2a2=angle+20, g2a3=angle+32;
  const g2aPos=P(rootPos,g2a1,150), g2bPos=P(rootPos,g2a2,155), g2cPos=P(rootPos,g2a3,150);
  const g2a=Object.assign({},cfg.g2[0],{costType:'star',scope:'slot',parent:root.id,tier:'mid',group:'g2',x:g2aPos.x,y:g2aPos.y});
  const g2b=Object.assign({},cfg.g2[1],{costType:'star',scope:'slot',parent:root.id,tier:'mid',group:'g2',x:g2bPos.x,y:g2bPos.y});
  const g2c=Object.assign({},cfg.g2[2],{costType:'star',scope:'slot',parent:root.id,tier:'mid',group:'g2',x:g2cPos.x,y:g2cPos.y});

  const groupIds=[g1a.id,g1b.id,g2a.id,g2b.id,g2c.id];
  const capPos=P(rootPos,angle,360);
  const capstone=Object.assign({},cfg.capstone,{costType:'star',scope:'slot',parent:root.id,tier:'capstone',x:capPos.x,y:capPos.y,
    groupReq:{ids:groupIds,total:6}});

  const legPos=P(capPos,angle-16,230), ultPos=P(capPos,angle+16,230);
  const legend=Object.assign({},cfg.legend,{costType:'star',scope:'slot',parent:capstone.id,tier:'legend',x:legPos.x,y:legPos.y,
    req:{id:capstone.id,lvl:3}});
  const ultimate=Object.assign({},cfg.ultimate,{costType:'star',scope:'slot',parent:capstone.id,tier:'ultimate',x:ultPos.x,y:ultPos.y,
    req:{id:capstone.id,lvl:3}});

  return [root,g1a,g1b,g2a,g2b,g2c,capstone,legend,ultimate];
}

const mageBranch=buildFullBranch('t_range',t_range_pos,-170,{
  root:{id:'mg_root',name:'魔術適性',icon:'✦',maxLv:1,baseCost:1,growth:1,apply:(b,l)=>{b.mageUnlocked=true;},line2:'連鎖する雷を習得',line3:l=>'遠距離攻撃が可能になる'},
  g1:[
    {id:'mg_chain',name:'増幅コイル',icon:'⚡',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.chainCount+=l;b.mageDmg+=3*l;},line2:'雷が敵を伝って連鎖する',line3:l=>`連鎖数+${l} 威力+${3*l}`},
    {id:'mg_speed',name:'瞬速詠唱',icon:'⚡',maxLv:5,baseCost:3,growth:1.3,apply:(b,l)=>{b.mageAtkSpd=(b.mageAtkSpd||0)+0.06*l;},line2:'雷の発動間隔が短縮',line3:l=>`発動速度+${Math.round(6*l)}%`},
  ],
  g2:[
    {id:'mg_fireball',name:'業火の秘術',icon:'🔥',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.fireballRadius+=16*l;b.fireballDmg+=5*l;},line2:'着弾地点に爆炎を発生させる',line3:l=>`範囲+${16*l} 威力+${5*l}`},
    {id:'mg_burnradius',name:'拡張詠唱円',icon:'🔥',maxLv:5,baseCost:3,growth:1.3,apply:(b,l)=>{b.fireballRadius+=10*l;},line2:'爆炎の範囲がさらに拡大',line3:l=>`範囲+${10*l}`},
    {id:'mg_potency',name:'魔力凝縮',icon:'✦',maxLv:5,baseCost:3,growth:1.3,apply:(b,l)=>{b.mageDmgMult*=mult(l,1.2);},line2:'すべての魔法ダメージが上昇',line3:l=>`魔法倍率x${mult(l,1.2).toFixed(2)}`},
  ],
  capstone:{id:'mg_capstone',name:'アークメイジ',icon:'☀',maxLv:6,baseCost:8,growth:1.45,apply:(b,l)=>{b.mageDmgMult*=mult(l,1.32);},line2:'魔法系すべての威力が飛躍的に上昇',line3:l=>`魔法倍率x${mult(l,1.32).toFixed(2)}`},
  ultimate:{id:'mg_ultimate',name:'大魔導',icon:'☀',maxLv:5,baseCost:12,growth:1.5,apply:(b,l)=>{b.chainCount+=Math.floor(l/2);b.mageDmgMult*=mult(l,1.22);},line2:'連鎖と威力が大幅強化される',line3:l=>`連鎖+${Math.floor(l/2)} 倍率x${mult(l,1.22).toFixed(2)}`},
  legend:{id:'mg_legend',name:'クロスカット・レディエンス',icon:'✝',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.legendMage=true;},line2:'画面を十字に切り裂く極大閃光',line3:l=>'アクティブ発動 画面全域大ダメージ'},
});

const droneBranch=buildFullBranch('t_tokendrop',t_tokendrop_pos,-130,{
  root:{id:'dr_root',name:'ドローン起動',icon:'◈',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.droneCount+=1;b.droneDmg+=3;},line2:'自律ドローンを展開',line3:l=>'周囲を旋回し自動攻撃する'},
  g1:[
    {id:'dr_cd',name:'再突入プロトコル短縮',icon:'◈',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.droneCdReduce+=0.08*l;},line2:'ドローンの攻撃間隔が短縮',line3:l=>`攻撃CD-${(0.08*l).toFixed(2)}秒`},
    {id:'dr_dmg',name:'兵装強化',icon:'◈',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.droneDmg+=4*l;},line2:'ドローンの弾丸威力が上昇',line3:l=>`ドローン威力+${4*l}`},
  ],
  g2:[
    {id:'dr_count',name:'量産ライン',icon:'◈',maxLv:5,baseCost:3,growth:1.35,apply:(b,l)=>{b.droneCount+=l;},line2:'展開するドローン数が増加',line3:l=>`ドローン数+${l}`},
    {id:'dr_range',name:'索敵範囲拡張',icon:'◈',maxLv:5,baseCost:3,growth:1.3,apply:(b,l)=>{b.droneRange=(b.droneRange||0)+30*l;},line2:'ドローンの索敵距離が伸びる',line3:l=>`索敵範囲+${30*l}`},
    {id:'dr_potency',name:'兵装最適化',icon:'◉',maxLv:5,baseCost:3,growth:1.3,apply:(b,l)=>{b.droneDmgMult*=mult(l,1.2);},line2:'ドローンの全火力が上昇',line3:l=>`ドローン倍率x${mult(l,1.2).toFixed(2)}`},
  ],
  capstone:{id:'dr_capstone',name:'AI最適化',icon:'◉',maxLv:6,baseCost:8,growth:1.45,apply:(b,l)=>{b.droneDmgMult*=mult(l,1.32);},line2:'ドローン群の火力が大幅上昇',line3:l=>`ドローン倍率x${mult(l,1.32).toFixed(2)}`},
  ultimate:{id:'dr_ultimate',name:'ドローンスウォーム',icon:'◉',maxLv:5,baseCost:12,growth:1.5,apply:(b,l)=>{b.droneCount+=Math.floor(l/2);b.droneDmgMult*=mult(l,1.22);},line2:'ドローン数と火力がさらに強化',line3:l=>`数+${Math.floor(l/2)} 倍率x${mult(l,1.22).toFixed(2)}`},
  legend:{id:'dr_legend',name:'プロトタイプ・マザーシップ',icon:'✝',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.legendDrone=true;},line2:'巨大母艦ドローンを常時召喚',line3:l=>'レーザー照射と全体オーバークロック'},
});

const chemicalBranch=buildFullBranch('t_crit',t_crit_pos,-45,{
  root:{id:'ch_root',name:'高化学兵器適性',icon:'☣',maxLv:1,baseCost:1,growth:1,apply:(b,l)=>{b.chemUnlocked=true;},line2:'攻撃に毒を付与できるようになる',line3:l=>'状態異常攻撃を習得'},
  g1:[
    {id:'ch_chance',name:'噴霧強化',icon:'☣',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.statusChance+=0.06*l;},line2:'状態異常が付与されやすくなる',line3:l=>`付与率+${Math.round(6*l)}%`},
    {id:'ch_poison',name:'猛毒コーティング',icon:'🧪',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.poisonDmg+=2*l;},line2:'毒の継続ダメージが上昇',line3:l=>`毒ダメージ+${2*l}`},
  ],
  g2:[
    {id:'ch_frost',name:'凍傷誘発剤',icon:'❄',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.frostSlow+=0.08*l;},line2:'敵の動きを鈍らせる',line3:l=>`敵鈍足+${Math.round(8*l)}%`},
    {id:'ch_burn',name:'焼夷弾頭',icon:'🔥',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.burnDmg=(b.burnDmg||0)+3*l;},line2:'火傷を追加で付与する',line3:l=>`火傷ダメージ+${3*l}`},
    {id:'ch_potency',name:'猛毒濃縮',icon:'☠',maxLv:5,baseCost:3,growth:1.3,apply:(b,l)=>{b.statusDmgMult*=mult(l,1.2);},line2:'状態異常ダメージ全般が上昇',line3:l=>`倍率x${mult(l,1.2).toFixed(2)}`},
  ],
  capstone:{id:'ch_capstone',name:'疫病の権化',icon:'☠',maxLv:6,baseCost:8,growth:1.45,apply:(b,l)=>{b.statusDmgMult*=mult(l,1.32);},line2:'あらゆる状態異常が激化する',line3:l=>`倍率x${mult(l,1.32).toFixed(2)}`},
  ultimate:{id:'ch_ultimate',name:'終末瘴気',icon:'☣',maxLv:5,baseCost:12,growth:1.5,apply:(b,l)=>{b.statusChance+=0.05*l;b.statusDmgMult*=mult(l,1.22);},line2:'付与率とダメージが同時に強化',line3:l=>`付与+${Math.round(5*l)}% 倍率x${mult(l,1.22).toFixed(2)}`},
  legend:{id:'ch_legend',name:'二段火傷（インフェルノ）',icon:'✝',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.legendChem=true;},line2:'毒とは別に火傷を二重付与',line3:l=>'毎秒超高ダメージで焼き尽くす'},
});

const boxerBranch=buildFullBranch('t_crit',t_crit_pos,-15,{
  root:{id:'bx_root',name:'闘士の誓い',icon:'✊',maxLv:1,baseCost:2,growth:1,apply:(b,l,base)=>{b.boxerMode=true;base.range*=0.6;base.atkSpd*=0.85;b.boxerDmg+=5;},line2:'バットを捨て拳を装備する',line3:l=>'射程が下がる代わりに超近接高火力'},
  g1:[
    {id:'bx_power',name:'鋼拳',icon:'✊',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.boxerDmg+=6*l;},line2:'拳の一撃威力が上昇',line3:l=>`拳威力+${6*l}`},
    {id:'bx_combo',name:'連撃技術',icon:'✊',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.boxerCombo+=0.2*l;},line2:'連続ヒットで威力が伸びる',line3:l=>`連撃倍率+${Math.round(20*l)}%`},
  ],
  g2:[
    {id:'bx_crit',name:'急所突き',icon:'✹',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.boxerCritBonus=(b.boxerCritBonus||0)+0.02*l;},line2:'クリティカル率が上昇',line3:l=>`クリティカル率+${Math.round(2*l)}%`},
    {id:'bx_speed',name:'フットワーク',icon:'✊',maxLv:5,baseCost:3,growth:1.3,apply:(b,l,base)=>{base.speed*=(1+0.03*l);},line2:'移動速度が上昇',line3:l=>`移動速度+${Math.round(3*l)}%`},
    {id:'bx_potency',name:'闘気凝縮',icon:'☄',maxLv:5,baseCost:3,growth:1.3,apply:(b,l)=>{b.boxerDmgMult*=mult(l,1.2);},line2:'拳の全ダメージが上昇',line3:l=>`拳倍率x${mult(l,1.2).toFixed(2)}`},
  ],
  capstone:{id:'bx_capstone',name:'限界突破',icon:'☄',maxLv:6,baseCost:8,growth:1.45,apply:(b,l)=>{b.boxerDmgMult*=mult(l,1.35);},line2:'拳の威力が限界を超えて上昇',line3:l=>`拳倍率x${mult(l,1.35).toFixed(2)}`},
  ultimate:{id:'bx_ultimate',name:'神速の拳',icon:'☄',maxLv:5,baseCost:12,growth:1.5,apply:(b,l)=>{b.boxerCombo+=0.15*l;b.boxerDmgMult*=mult(l,1.24);},line2:'連撃と威力がさらに強化',line3:l=>`連撃+${Math.round(15*l)}% 倍率x${mult(l,1.24).toFixed(2)}`},
  legend:{id:'bx_legend',name:'スーパークリティカル',icon:'✝',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.legendBoxer=true;},line2:'極低確率で発生する超絶一撃',line3:l=>'敵の最大HPの約4割を吹き飛ばす'},
});

const bowBranch=buildFullBranch('t_speed',t_speed_pos,-110,{
  root:{id:'bo_root',name:'弓術取得',icon:'➶',maxLv:1,baseCost:1,growth:1,apply:(b,l)=>{b.bowUnlocked=true;},line2:'弓による遠距離攻撃を習得',line3:l=>'複数の敵を同時に狙える'},
  g1:[
    {id:'bo_multi',name:'マルチノック',icon:'➶',maxLv:5,baseCost:3,growth:1.32,apply:(b,l)=>{b.arrowCount+=l;},line2:'同時に射る矢の本数が増加',line3:l=>`同時発射数+${l}`},
    {id:'bo_dmg',name:'鏃強化',icon:'➶',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.arrowDmg+=3*l;},line2:'矢一本あたりの威力が上昇',line3:l=>`矢威力+${3*l}`},
  ],
  g2:[
    {id:'bo_speed',name:'速射訓練',icon:'➶',maxLv:5,baseCost:3,growth:1.3,apply:(b,l)=>{b.bowAtkSpd=(b.bowAtkSpd||0)+0.05*l;},line2:'弓の発射間隔が短縮',line3:l=>`発射速度+${Math.round(5*l)}%`},
    {id:'bo_pierce',name:'貫通鏃',icon:'➶',maxLv:4,baseCost:3,growth:1.35,apply:(b,l)=>{b.arrowPierce=(b.arrowPierce||0)+l;},line2:'矢が敵を貫通するようになる',line3:l=>`貫通数+${l}`},
    {id:'bo_potency',name:'弦力凝縮',icon:'➹',maxLv:5,baseCost:3,growth:1.3,apply:(b,l)=>{b.bowDmgMult*=mult(l,1.2);},line2:'弓の全ダメージが上昇',line3:l=>`弓倍率x${mult(l,1.2).toFixed(2)}`},
  ],
  capstone:{id:'bo_capstone',name:'乱れ撃ち',icon:'➹',maxLv:6,baseCost:8,growth:1.45,apply:(b,l)=>{b.bowDmgMult*=mult(l,1.32);},line2:'弓の全ダメージが大幅上昇',line3:l=>`弓倍率x${mult(l,1.32).toFixed(2)}`},
  ultimate:{id:'bo_ultimate',name:'千本乱舞',icon:'➹',maxLv:5,baseCost:12,growth:1.5,apply:(b,l)=>{b.arrowCount+=Math.floor(l/2);b.bowDmgMult*=mult(l,1.22);},line2:'発射数と威力が同時に強化',line3:l=>`発射数+${Math.floor(l/2)} 倍率x${mult(l,1.22).toFixed(2)}`},
  legend:{id:'bo_legend',name:'アストラ・アロー',icon:'✝',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.legendBow=true;},line2:'画面を貫く超巨大な光の矢',line3:l=>'進路上のすべてを消滅させる'},
});

const gunnerBranch=buildFullBranch('t_knockback',t_knockback_pos,-90,{
  root:{id:'gn_root',name:'銃器適性',icon:'●',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.gunnerUnlocked=true;},line2:'ピストルによる連射攻撃を習得',line3:l=>'狙った方向へ自動発砲する'},
  g1:[
    {id:'gn_pistol',name:'連射機構',icon:'●',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.pistolDmg=(b.pistolDmg||0)+3*l;},line2:'ピストルの連射威力が上昇',line3:l=>`ピストル威力+${3*l}`},
    {id:'gn_pistolspd',name:'高速リロード',icon:'●',maxLv:5,baseCost:3,growth:1.3,apply:(b,l)=>{b.pistolSpd=(b.pistolSpd||0)+0.06*l;},line2:'ピストルの連射速度が上昇',line3:l=>`連射速度+${Math.round(6*l)}%`},
  ],
  g2:[
    {id:'gn_sniper',name:'重弾薬',icon:'◆',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.sniperDmg=(b.sniperDmg||0)+8*l;},line2:'スナイパー弾の威力が上昇',line3:l=>`スナイパー威力+${8*l}`},
    {id:'gn_sniperpierce',name:'徹甲弾',icon:'◆',maxLv:5,baseCost:3,growth:1.32,apply:(b,l)=>{b.sniperPierce=(b.sniperPierce||0)+l;},line2:'貫通する敵の数が増加',line3:l=>`貫通数+${l}`},
    {id:'gn_potency',name:'火薬増強',icon:'☄',maxLv:5,baseCost:3,growth:1.3,apply:(b,l)=>{b.gunnerDmgMult=(b.gunnerDmgMult||1)*mult(l,1.2);},line2:'銃器全般のダメージが上昇',line3:l=>`銃器倍率x${mult(l,1.2).toFixed(2)}`},
  ],
  capstone:{id:'gn_capstone',name:'火器統制',icon:'☄',maxLv:6,baseCost:8,growth:1.45,apply:(b,l)=>{b.gunnerDmgMult=(b.gunnerDmgMult||1)*mult(l,1.32);},line2:'銃器全般の威力が大幅上昇',line3:l=>`銃器倍率x${mult(l,1.32).toFixed(2)}`},
  ultimate:{id:'gn_ultimate',name:'掃討命令',icon:'☄',maxLv:5,baseCost:12,growth:1.5,apply:(b,l)=>{b.pistolDmg=(b.pistolDmg||0)+4*l;b.sniperDmg=(b.sniperDmg||0)+6*l;},line2:'すべての銃器威力がさらに上昇',line3:l=>`威力全体+${4*l}〜${6*l}`},
  legend:{id:'gn_legend',name:'破滅のショットガン',icon:'✝',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.legendGunner=true;},line2:'扇状の全敵貫通弾幕を掃射',line3:l=>'至近距離ではボスすら瞬殺する'},
});

const vitalityBranch=buildFullBranch('t_knockback',t_knockback_pos,-40,{
  root:{id:'vt_root',name:'生命体適性',icon:'🛡',maxLv:1,baseCost:2,growth:1,apply:(b,l)=>{b.vitalityUnlocked=true;},line2:'肉体を強化し耐久力を高める',line3:l=>'被ダメージ軽減の基礎を習得'},
  g1:[
    {id:'vt_hp',name:'強化外殻',icon:'🛡',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.vitHp+=25*l;},line2:'最大HPが増加',line3:l=>`最大HP+${25*l}`},
    {id:'vt_reduce',name:'装甲硬化',icon:'🛡',maxLv:6,baseCost:3,growth:1.3,apply:(b,l)=>{b.dmgReduction+=0.02*l;},line2:'被ダメージが軽減される',line3:l=>`被ダメージ軽減+${Math.round(2*l)}%`},
  ],
  g2:[
    {id:'vt_resist',name:'状態異常耐性',icon:'🛡',maxLv:5,baseCost:3,growth:1.3,apply:(b,l)=>{b.dmgReduction+=0.015*l;},line2:'状態異常の被害を軽減する',line3:l=>`被ダメージ軽減+${(1.5*l).toFixed(1)}%`},
    {id:'vt_shield',name:'緊急衝撃波',icon:'⊙',maxLv:3,baseCost:3,growth:1.4,apply:(b,l)=>{b.shieldEnabled=true;b.shieldCdReduce+=3*l;},line2:'HPが低下すると自動発動',line3:l=>`衝撃波の再使用短縮-${3*l}秒`},
    {id:'vt_regen',name:'自己修復ナノ',icon:'✚',maxLv:5,baseCost:3,growth:1.3,apply:(b,l)=>{b.regen+=0.25*l;},line2:'時間経過でHPが回復する',line3:l=>`HP自動回復+${(0.25*l).toFixed(2)}/秒`},
  ],
  capstone:{id:'vt_capstone',name:'不屈の意志',icon:'✝',maxLv:6,baseCost:8,growth:1.45,apply:(b,l)=>{b.dmgReductionMult*=mult(l,1.3);},line2:'被ダメージ軽減が大幅上昇',line3:l=>`軽減倍率x${mult(l,1.3).toFixed(2)}`},
  ultimate:{id:'vt_ultimate',name:'鋼鉄の心臓',icon:'✝',maxLv:5,baseCost:12,growth:1.5,apply:(b,l)=>{b.vitHp+=30*l;b.dmgReductionMult*=mult(l,1.22);},line2:'HPと軽減率が同時に強化',line3:l=>`最大HP+${30*l} 倍率x${mult(l,1.22).toFixed(2)}`},
  legend:{id:'vt_legend',name:'ライフドレイン（吸血）',icon:'✝',maxLv:1,baseCost:4,growth:1,apply:(b,l)=>{b.legendVitality=true;},line2:'自身のHPを消費し周囲から吸血',line3:l=>'大ダメージと引き換えに大幅回復'},
});

const BUILD_NODES=[...mageBranch,...droneBranch,...chemicalBranch,...boxerBranch,...bowBranch,...gunnerBranch,...vitalityBranch];
const ALL_NODES=[...TOKEN_NODES,...BUILD_NODES];
function findNode(id){ return ALL_NODES.find(n=>n.id===id); }

/* ---- レベル参照: scope='global'はアカウント共通、scope='slot'はスロット内 ---- */
function getLevel(node){
  if(node.scope==='global') return gameData.tokenLevels[node.id]||0;
  const slot=gameData.slots[gameData.activeSlot];
  return (slot.build&&slot.build[node.id])||0;
}
function isOwned(node){ return node && getLevel(node)>0; }
function reqMet(node){
  if(node.groupReq){
    const sum=node.groupReq.ids.reduce((s,id)=>s+getLevel(findNode(id)),0);
    return sum>=node.groupReq.total;
  }
  if(node.req){
    if(getLevel(findNode(node.req.id))<node.req.lvl) return false;
  }
  return true;
}
/* 4段階: hidden / fogged(？？？+コストのみ) / available(名前+コスト) / owned */
function nodeState(node){
  if(node.parent==='core'){
    return isOwned(node)? 'owned':'available';
  }
  const parent=findNode(node.parent);
  const parentOwned=isOwned(parent);
  if(!parentOwned){
    const grandOwned = parent && (parent.parent==='core' || isOwned(findNode(parent.parent)));
    return grandOwned? 'fogged':'hidden';
  }
  if(node.tier==='root'){
    if(tokenTotalLevels()<GATE_THRESHOLD) return 'fogged';
    return isOwned(node)? 'owned':'available';
  }
  if(isOwned(node)) return 'owned';
  return reqMet(node)? 'available':'fogged';
}
function isVisible(node){ return nodeState(node)!=='hidden'; }
function canAfford(node){
  if(nodeState(node)!=='available') return false;
  const lvl=getLevel(node);
  if(lvl>=node.maxLv) return false;
  const cost=costAt(node,lvl);
  return node.costType==='token'? gameData.tokens>=cost : gameData.skillStars>=cost;
}
/* ---- トークン/スター消費バグ修正: costTypeで厳密分岐、即時反映＆セーブ ---- */
function buyNode(node){
  if(nodeState(node)!=='available') return false;
  const lvl=getLevel(node);
  if(lvl>=node.maxLv) return false;
  const cost=costAt(node,lvl);
  if(node.costType==='token'){
    if(gameData.tokens<cost) return false;
    gameData.tokens-=cost;
  } else {
    if(gameData.skillStars<cost) return false;
    gameData.skillStars-=cost;
  }
  if(node.scope==='global'){
    gameData.tokenLevels[node.id]=lvl+1;
  } else {
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
function computePlayerStats(){
  const base={maxHp:100,damage:1,range:70,atkSpd:1.0,speed:180,regen:0,magnet:40,crit:0.05,knockback:0,tokenMul:1};
  const build={statusChance:0,statusDmgMult:1,poisonDmg:0,frostSlow:0,burnDmg:0,
    bowUnlocked:false,arrowCount:1,arrowDmg:0,bowDmgMult:1,bowAtkSpd:0,arrowPierce:0,
    boxerMode:false,boxerDmg:0,boxerCombo:1,boxerDmgMult:1,boxerCritBonus:0,
    mageUnlocked:false,chainCount:0,mageDmg:0,mageDmgMult:1,fireballRadius:0,fireballDmg:0,mageAtkSpd:0,
    vitalityUnlocked:false,vitHp:0,dmgReduction:0,dmgReductionMult:1,shieldEnabled:false,shieldCdReduce:0,
    droneCount:0,droneDmg:0,droneDmgMult:1,droneCdReduce:0,droneRange:0,
    gunnerUnlocked:false,pistolDmg:0,pistolSpd:0,sniperDmg:0,sniperPierce:0,gunnerDmgMult:1,
    legendMage:false,legendDrone:false,legendChem:false,legendBoxer:false,legendBow:false,legendGunner:false,legendVitality:false};
  TOKEN_NODES.forEach(n=>{ const l=gameData.tokenLevels[n.id]||0; if(l>0) n.apply(base,l); });
  const slot=gameData.slots[gameData.activeSlot];
  BUILD_NODES.forEach(n=>{ const l=(slot.build&&slot.build[n.id])||0; if(l>0) n.apply(build,l,base); });
  base.maxHp+=build.vitHp;
  return {base,build};
}

/* ---- Canvas fog-tree renderer: マウス+タッチ(2本指ズーム&パン同時), ぷにアニメ, 3段ツールチップ ---- */
const SkillTree=(function(){
  let view={scale:0.5,offsetX:0,offsetY:0};
  let dragging=false,lastX=0,lastY=0,dragged=false;
  let tooltipEl=null;
  let animScale={}, unlockFx={}, hoverId=null;
  let touch={mode:null,lastMidX:0,lastMidY:0,lastDist:0};

  function worldToScreen(x,y){ return {x:W/2+(x+view.offsetX)*view.scale, y:H/2+(y+view.offsetY)*view.scale}; }
  function screenToWorld(sx,sy){ return {x:(sx-W/2)/view.scale-view.offsetX, y:(sy-H/2)/view.scale-view.offsetY}; }
  function reset(){ view.scale=0.5; view.offsetX=0; view.offsetY=0; animScale={}; unlockFx={}; hoverId=null; }

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
  function onUp(e){ if(!dragged) handleClick(e.offsetX,e.offsetY); dragging=false; }

  function touchDist(t){ return Math.hypot(t[0].clientX-t[1].clientX, t[0].clientY-t[1].clientY); }
  function touchMid(t){ return {x:(t[0].clientX+t[1].clientX)/2, y:(t[0].clientY+t[1].clientY)/2}; }
  function onTouchStart(e){
    e.preventDefault();
    if(e.touches.length===1){
      touch.mode='pan'; dragged=false;
      touch.lastX=e.touches[0].clientX; touch.lastY=e.touches[0].clientY;
    } else if(e.touches.length>=2){
      touch.mode='pinch';
      touch.lastDist=touchDist(e.touches);
      const mid=touchMid(e.touches); touch.lastMidX=mid.x; touch.lastMidY=mid.y;
    }
  }
  function onTouchMove(e){
    e.preventDefault();
    const rect=canvas.getBoundingClientRect();
    if(touch.mode==='pan' && e.touches.length===1){
      const dx=e.touches[0].clientX-touch.lastX, dy=e.touches[0].clientY-touch.lastY;
      if(Math.abs(dx)>2||Math.abs(dy)>2) dragged=true;
      panBy(dx,dy);
      touch.lastX=e.touches[0].clientX; touch.lastY=e.touches[0].clientY;
    } else if(touch.mode==='pinch' && e.touches.length>=2){
      const newDist=touchDist(e.touches);
      const mid=touchMid(e.touches);
      const mx=mid.x-rect.left, my=mid.y-rect.top;
      /* ズームとパンを同フレームで同時反映 */
      if(touch.lastDist>0){ zoomAt(mx,my, newDist/touch.lastDist); }
      panBy(mid.x-touch.lastMidX, mid.y-touch.lastMidY);
      touch.lastDist=newDist; touch.lastMidX=mid.x; touch.lastMidY=mid.y;
    }
  }
  function onTouchEnd(e){
    if(touch.mode==='pan' && !dragged && e.changedTouches.length===1){
      const rect=canvas.getBoundingClientRect();
      handleClick(e.changedTouches[0].clientX-rect.left, e.changedTouches[0].clientY-rect.top);
    }
    if(e.touches.length===0){ touch.mode=null; hoverId=null; }
    else if(e.touches.length===1){ touch.mode='pan'; touch.lastX=e.touches[0].clientX; touch.lastY=e.touches[0].clientY; }
  }

  function nodeScreenPos(n){ return worldToScreen(n.x,n.y); }
  function nodeBaseRadius(n){ return n.tier==='legend'?32:(n.tier==='capstone'||n.tier==='ultimate'?26:22); }
  function nodeRadius(n){ const s=animScale[n.id]||1; return nodeBaseRadius(n)*view.scale*s; }
  function hitNode(sx,sy){
    for(const n of ALL_NODES){
      if(nodeState(n)==='hidden') continue;
      const p=nodeScreenPos(n); const r=nodeRadius(n);
      if(Math.hypot(sx-p.x,sy-p.y)<=r) return n;
    }
    return null;
  }
  function handleClick(sx,sy){ const n=hitNode(sx,sy); if(n) buyNode(n); }
  function hoverCheck(sx,sy){
    const n=hitNode(sx,sy);
    const id=n?n.id:null;
    if(id!==hoverId){ hoverId=id; if(id) AudioEngine.SE.pop(); }
    hideTooltip();
    const st=n?nodeState(n):null;
    if(n && (st==='available'||st==='owned')){
      const lvl=getLevel(n);
      tooltipEl=document.createElement('div'); tooltipEl.className='st-tooltip';
      const l3 = typeof n.line3==='function'? n.line3(Math.max(1,lvl)) : n.line3;
      tooltipEl.innerHTML=`<div class="st-tt-name">${n.name}</div><div class="st-tt-l2">${n.line2}</div><div class="st-tt-l3">${l3}</div>`;
      document.body.appendChild(tooltipEl);
      tooltipEl.style.left=(sx+16)+'px'; tooltipEl.style.top=(sy+8)+'px';
    }
  }
  function hideTooltip(){ if(tooltipEl){ tooltipEl.remove(); tooltipEl=null; } }
  function triggerUnlockFx(id){ unlockFx[id]=0.7; }

  function updateAnim(dt){
    ALL_NODES.forEach(n=>{
      const target = (n.id===hoverId)?1.22:1;
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
      ctx.save();
      let color = n.costType==='token'?'#f4ff00':'#d1c4ff';
      if(n.tier==='legend') color='#ff00e5';
      if(st==='owned') color = n.tier==='legend'?'#ff2b4d':(n.costType==='token'?'#39ff88':'#ff00e5');
      else if(st==='fogged') color='#3a4560';
      else if(!canAfford(n)) color='#5a6480';
      ctx.shadowColor=color; ctx.shadowBlur=(st==='owned'||st==='available'?14:0)*view.scale;
      ctx.fillStyle='rgba(10,12,24,0.94)'; ctx.strokeStyle=color; ctx.lineWidth=n.tier==='legend'?3.5:2.5;
      ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle=color; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font=`${14*view.scale}px Consolas`;
      ctx.fillText(st==='owned'?n.icon:'？', p.x, p.y-6*view.scale);
      if(st==='owned'){ ctx.font=`${9*view.scale}px Consolas`; ctx.fillText(`${lvl}/${n.maxLv}`, p.x, p.y+9*view.scale); }
      else if(st==='available'){ ctx.font=`${9*view.scale}px Consolas`; ctx.fillText(`${costAt(n,lvl)}`, p.x, p.y+9*view.scale); }
      ctx.restore();

      if(unlockFx[n.id]!==undefined){
        const t=unlockFx[n.id]; const prog=1-Math.max(0,t/0.7);
        ctx.save(); ctx.globalAlpha=Math.max(0,1-prog);
        ctx.strokeStyle='#fff'; ctx.lineWidth=3*view.scale; ctx.shadowColor='#fff'; ctx.shadowBlur=20*view.scale;
        ctx.beginPath(); ctx.arc(p.x,p.y,r+prog*30*view.scale,0,Math.PI*2); ctx.stroke(); ctx.restore();
      }
    });
    ctx.restore();
  }
  return {render,onWheel,onDown,onMove,onUp,onTouchStart,onTouchMove,onTouchEnd,reset,hideTooltip,triggerUnlockFx};
})();
