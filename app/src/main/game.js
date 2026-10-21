(() => {
'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const controlsEl = document.getElementById('controls');
let W = innerWidth, H = innerHeight, DPR = 1;
const TAU = Math.PI * 2;
const themes = [
  {name:'Ebon Ruins', bg:'#080b17', far:'#14192d', near:'#20263e', ground:'#171d30', accent:'#72e5db', glow:'#233e50'},
  {name:'Ashen Caverns', bg:'#160b13', far:'#2b1522', near:'#40202c', ground:'#2a1822', accent:'#ff9774', glow:'#5b302e'},
  {name:'Verdant Blight', bg:'#07150f', far:'#102d24', near:'#184237', ground:'#142a24', accent:'#8ce59b', glow:'#244e37'},
  {name:'Frostgrave', bg:'#08121e', far:'#14283b', near:'#1d3d50', ground:'#1b2d3c', accent:'#83d6ff', glow:'#28526a'},
  {name:'Crimson Citadel', bg:'#170811', far:'#321322', near:'#4a1c2b', ground:'#2a1424', accent:'#ff6d8e', glow:'#67243d'},
  {name:'Sunken Archive', bg:'#061516', far:'#0f2b31', near:'#17434a', ground:'#142e36', accent:'#65e8da', glow:'#23505b'},
  {name:'Void Wastes', bg:'#0c071c', far:'#211438', near:'#34204f', ground:'#201936', accent:'#c29aff', glow:'#45326a'},
  {name:'Starforge', bg:'#11100a', far:'#2b2414', near:'#45351a', ground:'#2a2519', accent:'#ffd778', glow:'#5d481f'},
  {name:'Dreadwild', bg:'#101008', far:'#262918', near:'#3c4225', ground:'#242b1c', accent:'#d6ec82', glow:'#505a2f'},
  {name:'Nether Crown', bg:'#10060c', far:'#2d101c', near:'#49172a', ground:'#2a1322', accent:'#ff79ad', glow:'#661e42'}
];
const weapons = [
  {id:'rust',name:'Rustbound Sword',type:'melee',coins:0,gems:0,damage:16,rate:.52,range:67,unlock:1,desc:'Reliable short-range slash. Free starter.'},
  {id:'bow',name:'Hunter Bow',type:'bow',coins:45,gems:0,damage:15,rate:.68,range:470,speed:560,unlock:2,desc:'Accurate arrows with a steady draw.'},
  {id:'wand',name:'Gloam Wand',type:'wand',coins:95,gems:1,damage:19,rate:.78,range:430,speed:390,unlock:5,desc:'Arcane bolts travel slower, hit harder.'},
  {id:'gun',name:'Repeater',type:'gun',coins:180,gems:2,damage:8,rate:.19,range:560,speed:760,unlock:11,desc:'Fast shots; each bullet is modest.'},
  {id:'aegis',name:'Aegis Blade',type:'aegis',coins:290,gems:3,damage:23,rate:.63,range:76,unlock:21,desc:'Heavy blade. Reduces incoming damage by 12%.'},
  {id:'crossbow',name:'Night Crossbow',type:'crossbow',coins:430,gems:4,damage:39,rate:1.08,range:640,speed:690,unlock:31,desc:'Slow, powerful bolts; timing matters.'},
  {id:'flame',name:'Flame Flower',type:'flame',coins:620,gems:6,damage:7,rate:.14,range:165,unlock:41,desc:'Short cone of fire; weak at long range.'}
];
const armors = [
  {id:'cloth',name:'Traveler Wraps',coins:0,gems:0,def:0,unlock:1,desc:'No protection. Stay mobile.'},
  {id:'leather',name:'Stitched Leather',coins:55,gems:0,def:.06,unlock:2,desc:'6% damage reduction.'},
  {id:'iron',name:'Black Iron Mail',coins:145,gems:1,def:.12,unlock:8,desc:'12% damage reduction.'},
  {id:'ember',name:'Emberplate',coins:280,gems:2,def:.18,unlock:18,desc:'18% damage reduction.'},
  {id:'wraith',name:'Wraithweave',coins:470,gems:4,def:.24,unlock:35,desc:'24% damage reduction.'},
  {id:'crown',name:'Crownsteel Armor',coins:760,gems:7,def:.29,unlock:55,desc:'29% damage reduction. Not immunity.'}
];
const supplies = [{id:'potion',name:'Tonic Flask ×1',coins:34,gems:0,unlock:1,desc:'Restore 40 health during a level.'}];
const typeNames = {grunt:'Hollow',archer:'Hex Archer',brute:'Grave Brute',wraith:'Wisp'};
let save = loadSave();
let state = 'menu', returnState = 'menu', currentLevel = Math.max(1, save.maxUnlocked || 1), infiniteRun = false;
let world = null, player = null, enemies = [], projectiles = [], particles = [], floaters = [];
let cameraX = 0, floorY = 0, lastTime = performance.now(), elapsed = 0;
let hits = [], uiScroll = 0, uiTab = 'weapons', pointerDown = null;
let inputs = Object.create(null), pressed = new Set();
let toastText = '', toastTimer = 0;
let stats = {kills:0,damage:0};
let bgMotes = Array.from({length:90}, () => ({x:Math.random(),y:Math.random(),s:.4+Math.random()*1.5,p:Math.random()*TAU}));

function loadSave() {
  const fallback = {coins:0,gems:0,maxUnlocked:1,cleared:[],infiniteUnlocked:false,ownedWeapons:['rust'],equippedWeapon:'rust',ownedArmors:['cloth'],equippedArmor:'cloth',potions:0,totalKills:0};
  try {
    const a = JSON.parse(localStorage.getItem('shadowboundSave') || 'null');
    return Object.assign(fallback, a || {});
  } catch (_) { return fallback; }
}
function saveNow() { try { localStorage.setItem('shadowboundSave', JSON.stringify(save)); } catch (_) {} }
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function rand(a,b){return a + Math.random()*(b-a);}
function themeFor(lvl){return themes[Math.floor((Math.max(1,lvl)-1)/10)%themes.length];}
function weaponNow(){return weapons.find(w=>w.id===save.equippedWeapon)||weapons[0];}
function armorNow(){return armors.find(a=>a.id===save.equippedArmor)||armors[0];}
function roundedRect(x,y,w,h,r,fill,stroke,line=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=line;ctx.strokeStyle=stroke;ctx.stroke();}}
function txt(s,x,y,size=14,color='#eef2ff',weight=600,align='left'){ctx.font=`${weight} ${size}px system-ui, sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(s),x,y);}
function smallCaps(s,x,y,size=10,color='#91a0bf',align='left'){ctx.font=`800 ${size}px system-ui, sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(s).toUpperCase(),x,y);}
function line(x1,y1,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function addHit(x,y,w,h,fn){hits.push({x,y,w,h,fn});}
function uiButton(x,y,w,h,label,fn,opt={}){
  const fill=opt.fill||'rgba(20,29,49,.94)', stroke=opt.stroke||'rgba(127,163,218,.34)', color=opt.color||'#eaf1ff';
  roundedRect(x,y,w,h,Math.min(12,h*.23),fill,stroke,1);
  if(opt.accent){roundedRect(x+3,y+3,3,h-6,2,opt.accent,null);}
  txt(label,x+w/2,y+h/2,opt.size||13,color,opt.weight||800,'center');
  addHit(x,y,w,h,fn);
}
function toast(s){toastText=s;toastTimer=2.3;}
function resize(){
  const oldFloor=floorY;W=innerWidth;H=innerHeight;DPR=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);
  floorY=H-58;
  if(player && oldFloor>0) player.y += floorY-oldFloor;
}
addEventListener('resize', resize, {passive:true});resize();

function makeLevel(lvl, endless=false, preserveHealth=false){
  currentLevel=lvl;infiniteRun=endless || lvl>100;
  const t=themeFor(lvl), oldHealth=player?player.health:100;
  floorY=H-58;
  const worldWidth=Math.max(1900,W*2.5)+Math.min(lvl,100)*4;
  const n=Math.min(8,3+Math.floor((Math.min(lvl,100)-1)/9));
  world={width:worldWidth,level:lvl,theme:t,platforms:[],exitX:worldWidth-75,cleared:false,rewarded:false,spawnedBoss:lvl%5===0};
  for(let i=0;i<Math.floor(worldWidth/235);i++){
    if(Math.random()<.72){let x=180+i*220+rand(-45,40);if(x>worldWidth-230)continue;
      world.platforms.push({x,w:rand(95,190),off:rand(78,205)});}
  }
  enemies=[];projectiles=[];particles=[];floaters=[];cameraX=0;
  player={x:78,y:floorY-48,w:29,h:48,vy:0,vx:0,health:preserveHealth?Math.min(100,oldHealth+18):100,maxHealth:100,onGround:false,facing:1,attackCD:0,swing:0,dashCD:0,dashTime:0,invuln:0,coyote:0,jumpBuffer:0,crouch:false,aimUp:false,dropTimer:0,flash:0};
  for(let i=0;i<n;i++){
    const x=290+i*((worldWidth-780)/Math.max(1,n-1))+rand(-55,55);
    const pool=lvl<5?['grunt','grunt','archer']:lvl<15?['grunt','archer','brute']:['grunt','archer','brute','wraith'];
    const type=pool[Math.floor(Math.random()*pool.length)];
    const scale=healthScale(lvl);const base={grunt:42,archer:31,brute:84,wraith:38}[type];
    enemies.push({id:Math.random().toString(36).slice(2),type,x:clamp(x,250,worldWidth-300),y:floorY-42,w:type==='brute'?38:30,h:type==='wraith'?32:42,hp:Math.round(base*scale),maxHp:Math.round(base*scale),speed:({grunt:80,archer:55,brute:43,wraith:92})[type]*(1+powerLevel(lvl)*.0018),damage:Math.round((type==='brute'?14:type==='wraith'?8:9)+powerLevel(lvl)*.08),attackCD:rand(.5,1.3),touchCD:0,vy:0,dir:-1,flash:0,dead:false});
  }
  if(world.spawnedBoss){
    const base=260+lvl*1.1, hs=healthScale(lvl);
    enemies.push({id:'boss-'+lvl+'-'+Math.random().toString(36).slice(2),type:'boss',name:bossName(lvl),x:worldWidth-440,y:floorY-76,w:68,h:76,hp:Math.round(base*hs),maxHp:Math.round(base*hs),speed:62+powerLevel(lvl)*.18,damage:Math.round(15+powerLevel(lvl)*.15),attackCD:1.4,charge:0,pattern:0,touchCD:0,flash:0,dead:false});
  }
  saveNow();
}
function healthScale(lvl){const l=Math.max(1,lvl);return 1+.075*Math.min(l-1,20)+.032*Math.min(Math.max(0,l-21),40)+.016*Math.max(0,Math.min(l,100)-61)+.012*Math.max(0,l-100);}
function powerLevel(lvl){return Math.min(lvl,100)+Math.max(0,lvl-100)*.22;}
function bossName(lvl){return ['The Gutter King','Cinder Matriarch','Rotroot Colossus','Glacier Maw','The Red Regent','Drowned Archivist','Void Harrower','Starforge Sentinel','The Thorn Crown','The Nether Sovereign'][Math.floor((lvl-1)/10)%10];}
function startLevel(lvl, endless=false, preserveHealth=false){
  clearInputs();
  if(lvl>100 && !save.infiniteUnlocked && !endless){toast('Clear level 100 to unlock Endless.');return;}
  if(!endless && lvl>save.maxUnlocked){toast('That level is still locked.');return;}
  makeLevel(lvl,endless,preserveHealth);state='playing';controlsEl.style.display='block';saveNow();
}
function openShop(from){returnState=from;state='shop';uiScroll=0;uiTab='weapons';controlsEl.style.display='none';}
function menu(){clearInputs();state='menu';controlsEl.style.display='none';saveNow();}
function pauseGame(){if(state==='playing'){clearInputs();state='pause';controlsEl.style.display='none';}else if(state==='pause'){clearInputs();state='playing';controlsEl.style.display='block';}}
function owns(list,id){return Array.isArray(list)&&list.includes(id);}
function priceText(item){let p=[];if(item.coins)p.push('C '+item.coins);if(item.gems)p.push('◆ '+item.gems);return p.join('  ')||'FREE';}
function canPay(item){return save.coins>=item.coins&&save.gems>=item.gems;}
function purchase(type,item){
  const inventory=type==='weapon'?'ownedWeapons':type==='armor'?'ownedArmors':null;
  if(type==='supply'){
    if(currentLevel<item.unlock){toast('Unlocks at level '+item.unlock);return;}
    if(!canPay(item)){toast('Not enough currency.');return;}
    save.coins-=item.coins;save.gems-=item.gems;save.potions=(save.potions||0)+1;saveNow();toast('Tonic added to your supplies.');return;
  }
  if(owns(save[inventory],item.id)){
    if(type==='weapon')save.equippedWeapon=item.id;else save.equippedArmor=item.id;
    saveNow();toast(item.name+' equipped.');return;
  }
  if(currentLevel<item.unlock){toast('Unlocks at level '+item.unlock);return;}
  if(!canPay(item)){toast('Not enough coins or diamonds.');return;}
  save.coins-=item.coins;save.gems-=item.gems;save[inventory].push(item.id);
  if(type==='weapon')save.equippedWeapon=item.id;else save.equippedArmor=item.id;
  saveNow();toast(item.name+' purchased and equipped.');
}

function drawBackground(){
  const t=world?world.theme:themes[0];
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,t.bg);g.addColorStop(1,t.glow);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // distant moons and drifting ash
  ctx.globalAlpha=.5;ctx.fillStyle=t.accent;ctx.beginPath();ctx.arc(W*.78,H*.19,Math.min(W,H)*.055,0,TAU);ctx.fill();ctx.globalAlpha=1;
  for(let layer=0;layer<2;layer++){
    ctx.beginPath();const base=H*(.57+layer*.12);ctx.moveTo(0,H);ctx.lineTo(0,base);
    for(let x=0;x<=W+50;x+=50){const wx=x+(world?cameraX*(layer===0?.1:.2):0);const y=base-Math.abs(Math.sin(wx*.008+layer*2))*H*.1-Math.abs(Math.sin(wx*.021))*H*.045;ctx.lineTo(x,y);}
    ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=layer===0?t.far:t.near;ctx.fill();
  }
  for(const m of bgMotes){const x=(m.x*W - (world?cameraX*.035:elapsed*5*m.s))%W;const xx=(x+W)%W;const y=(m.y*H+Math.sin(elapsed*.4+m.p)*8);ctx.globalAlpha=.18+.2*Math.sin(elapsed+m.p);ctx.fillStyle=t.accent;ctx.fillRect(xx,y,m.s,m.s);}
  ctx.globalAlpha=1;
}
function drawWorld(){
  drawBackground();if(!world)return;
  const t=world.theme, cam=cameraX;
  // floor with luminous hairline
  ctx.fillStyle=t.ground;ctx.fillRect(0,floorY,W,H-floorY);
  ctx.fillStyle=t.accent;ctx.globalAlpha=.55;ctx.fillRect(0,floorY,W,2);ctx.globalAlpha=1;
  for(let x=-(cam%58);x<W+60;x+=58){line(x,floorY+12,x-18,floorY+H*.35,t.glow,1);}
  // platform ledges
  for(const p of world.platforms){const x=p.x-cam,y=floorY-p.off;if(x+p.w<0||x>W)continue;
    roundedRect(x,y,p.w,10,4,t.near,t.accent,1);ctx.globalAlpha=.2;ctx.fillStyle=t.accent;ctx.fillRect(x+6,y+10,p.w-12,2);ctx.globalAlpha=1;
    for(let sx=x+12;sx<x+p.w-6;sx+=23){ctx.fillStyle=t.glow;ctx.fillRect(sx,y+12,2,rand(5,12));}
  }
  drawExit(world.exitX-cam);
  for(const p of projectiles){const x=p.x-cam;ctx.save();ctx.globalAlpha=clamp(p.life*2,0,1);ctx.shadowBlur=12;ctx.shadowColor=p.color;ctx.fillStyle=p.color;
    if(p.kind==='arrow'||p.kind==='bolt'){ctx.translate(x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));ctx.fillRect(-10,-2,20,4);ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(4,-5);ctx.lineTo(4,5);ctx.fill();}
    else{ctx.beginPath();ctx.arc(x,p.y,p.r||5,0,TAU);ctx.fill();ctx.globalAlpha=.25;ctx.beginPath();ctx.arc(x,p.y,(p.r||5)*2.2,0,TAU);ctx.fill();}
    ctx.restore();
  }
  for(const e of enemies)if(!e.dead)drawEnemy(e,e.x-cam);
  if(player)drawHero(player.x-cam,player.y);
  for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x-cam,p.y,p.size,p.size);}
  ctx.globalAlpha=1;
  for(const f of floaters){ctx.globalAlpha=clamp(f.life,0,1);txt(f.text,f.x-cam,f.y, f.size||13, f.color||'#fff',800,'center');}
  ctx.globalAlpha=1;
}
function drawExit(x){if(x<-40||x>W+40)return;const open=world.cleared;ctx.save();ctx.translate(x,floorY-7);ctx.shadowBlur=20;ctx.shadowColor=world.theme.accent;ctx.strokeStyle=world.theme.accent;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,-40,20,39,0,0,TAU);ctx.stroke();ctx.globalAlpha=.25;ctx.fillStyle=world.theme.accent;ctx.beginPath();ctx.ellipse(0,-40,15,34,0,0,TAU);ctx.fill();ctx.globalAlpha=1;if(!open){ctx.beginPath();ctx.moveTo(-9,-52);ctx.lineTo(9,-28);ctx.moveTo(9,-52);ctx.lineTo(-9,-28);ctx.strokeStyle='#7b8299';ctx.stroke();}ctx.restore();}
function drawHero(x,y){
  const p=player;if(!p)return;ctx.save();ctx.translate(x+p.w/2,y);ctx.scale(p.facing,1);if(p.invuln>0&&Math.floor(elapsed*18)%2===0)ctx.globalAlpha=.42;
  const crouch=p.crouch&&p.onGround;const h=crouch?33:p.h;const t=world?world.theme:themes[0];
  // feet and shadow
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(0,p.h+3,22,5,0,0,TAU);ctx.fill();
  // cloak silhouette
  ctx.shadowColor=t.accent;ctx.shadowBlur=5;ctx.fillStyle='#111522';ctx.strokeStyle='#5d6a85';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-12,13);ctx.lineTo(-15,h-4);ctx.lineTo(-4,h-1);ctx.lineTo(0,h-7);ctx.lineTo(8,h-1);ctx.lineTo(15,h-4);ctx.lineTo(10,14);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
  // head / hood
  ctx.fillStyle='#080b13';ctx.strokeStyle='#7b8aa6';ctx.beginPath();ctx.ellipse(0,10,12,13,0,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle=t.accent;ctx.fillRect(2,-1,6,2);ctx.globalAlpha*=.8;ctx.fillRect(2,3,4,1);ctx.globalAlpha=1;
  // belt, shoulder guard, weapon silhouette
  ctx.fillStyle='#313a50';ctx.fillRect(-10,Math.min(27,h-12),20,4);ctx.fillStyle=t.accent;ctx.fillRect(-2,Math.min(27,h-12),4,4);
  ctx.strokeStyle=weaponNow().type==='melee'||weaponNow().type==='aegis'?'#cbd7eb':t.accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(11,24);ctx.lineTo(24,8);ctx.stroke();ctx.lineWidth=1;ctx.strokeStyle='#6e7b96';ctx.beginPath();ctx.moveTo(8,25);ctx.lineTo(16,30);ctx.stroke();
  if(weaponNow().id==='aegis'){ctx.fillStyle='#a6b8ce';ctx.strokeStyle=t.accent;ctx.beginPath();ctx.moveTo(14,20);ctx.lineTo(23,17);ctx.lineTo(27,25);ctx.lineTo(20,34);ctx.lineTo(14,29);ctx.closePath();ctx.fill();ctx.stroke();}
  if(p.swing>0){ctx.globalAlpha=.75;ctx.strokeStyle=t.accent;ctx.lineWidth=3;ctx.beginPath();ctx.arc(3,24,weaponNow().range*.6,-.9,.9);ctx.stroke();}
  ctx.restore();
}
function drawEnemy(e,x){
  ctx.save();ctx.translate(x+e.w/2,e.y);const t=world.theme;ctx.shadowBlur=e.type==='boss'?18:7;ctx.shadowColor=t.accent;ctx.globalAlpha=e.flash>0?.65:1;
  if(e.type==='boss'){
    const pulse=1+Math.sin(elapsed*4)*.025;ctx.scale(pulse,1);
    ctx.fillStyle='#170c19';ctx.strokeStyle='#ff668b';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-e.w*.47,e.h*.28);ctx.lineTo(-e.w*.52,e.h*.73);ctx.lineTo(-e.w*.2,e.h);ctx.lineTo(e.w*.23,e.h);ctx.lineTo(e.w*.51,e.h*.68);ctx.lineTo(e.w*.42,e.h*.2);ctx.lineTo(e.w*.19,0);ctx.lineTo(-e.w*.21,0);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#ffb2c2';ctx.beginPath();ctx.moveTo(-20,16);ctx.lineTo(-9,19);ctx.lineTo(-16,29);ctx.fill();ctx.beginPath();ctx.moveTo(20,16);ctx.lineTo(9,19);ctx.lineTo(16,29);ctx.fill();
    ctx.fillStyle='#ff678e';ctx.fillRect(-19,25,11,4);ctx.fillRect(8,25,11,4);
  }else if(e.type==='wraith'){
    ctx.fillStyle='#1b223a';ctx.strokeStyle='#889cff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-14,6);ctx.quadraticCurveTo(-23,19,-17,29);ctx.lineTo(-11,25);ctx.lineTo(-5,34);ctx.lineTo(3,25);ctx.lineTo(12,32);ctx.lineTo(16,12);ctx.quadraticCurveTo(10,-5,0,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#c2caff';ctx.fillRect(0,9,7,3);
  }else{
    ctx.fillStyle=e.type==='brute'?'#2a2435':e.type==='archer'?'#172c32':'#202337';ctx.strokeStyle=e.type==='brute'?'#c17c9f':e.type==='archer'?'#6dcdbb':'#8793b4';ctx.lineWidth=1.5;
    ctx.beginPath();if(e.type==='brute'){ctx.moveTo(-e.w/2,10);ctx.lineTo(-e.w/2-3,e.h-3);ctx.lineTo(e.w/2+3,e.h-3);ctx.lineTo(e.w/2,10);ctx.lineTo(7,0);ctx.lineTo(-9,0);}else{ctx.moveTo(-e.w/2,8);ctx.lineTo(-e.w/2+2,e.h-3);ctx.lineTo(e.w/2-2,e.h-3);ctx.lineTo(e.w/2,8);ctx.lineTo(8,0);ctx.lineTo(-8,0);}ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=e.type==='archer'?'#ffcd8a':'#ff758c';ctx.fillRect(2,10,7,3);if(e.type==='brute'){ctx.fillStyle='#c17c9f';ctx.fillRect(-15,5,7,12);ctx.fillRect(8,5,7,12);}
  }
  ctx.shadowBlur=0;ctx.globalAlpha=1;
  // small hp bar; boss hp bar is also fixed in HUD
  if(e.hp<e.maxHp){const bw=e.type==='boss'?78:34;ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(-bw/2,-10,bw,4);ctx.fillStyle=e.type==='boss'?'#ff668b':'#f46c82';ctx.fillRect(-bw/2,-10,bw*clamp(e.hp/e.maxHp,0,1),4);}
  ctx.restore();
}
function spawnParticles(x,y,color,n=8){for(let i=0;i<n;i++)particles.push({x:x+rand(-8,8),y:y+rand(-8,8),vx:rand(-110,110),vy:rand(-170,45),size:rand(2,5),life:rand(.25,.7),max:.7,color});}
function floater(x,y,text,color='#fff',size=13){floaters.push({x,y,text,color,size,life:1.1,vy:-26});}
function damageEnemy(e,dmg){if(e.dead)return;e.hp-=dmg;e.flash=.12;stats.damage+=dmg;floater(e.x+e.w/2,e.y-5,'-'+Math.round(dmg),e.type==='boss'?'#ff9ab2':'#b5f2e9',11);spawnParticles(e.x+e.w/2,e.y+e.h/2,world.theme.accent,3);
  if(e.hp<=0){e.dead=true;stats.kills++;save.totalKills=(save.totalKills||0)+1;const coin=e.type==='boss'?Math.round(65+currentLevel*3):Math.round(({grunt:9,archer:11,brute:16,wraith:13}[e.type]||10)+currentLevel*.32);save.coins+=coin;floater(e.x+e.w/2,e.y,'+'+coin+' C','#f4d078',14);if(e.type==='boss'){const gem=2+Math.floor(currentLevel/25);save.gems+=gem;floater(e.x+e.w/2,e.y-23,'+'+gem+' ◆','#bca8ff',14);toast('Boss defeated — '+gem+' diamonds!');spawnParticles(e.x+e.w/2,e.y+e.h/2,'#ff789a',28);}else if(Math.random()<.065){save.gems++;floater(e.x+e.w/2,e.y-18,'+1 ◆','#c7adff',12);}saveNow();}
}
function hurtPlayer(amount, sourceX){if(player.invuln>0)return;let reduction=armorNow().def;if(weaponNow().id==='aegis')reduction+=.12;amount=Math.max(1,Math.round(amount*(1-Math.min(.38,reduction))));player.health-=amount;player.invuln=.72;player.flash=.15;player.vy=-220;player.vx=(player.x<sourceX?-1:1)*180;floater(player.x+player.w/2,player.y-8,'-'+amount,'#ff8292',15);spawnParticles(player.x+player.w/2,player.y+20,'#ff6f87',7);if(player.health<=0){player.health=0;state='gameover';controlsEl.style.display='none';saveNow();}}
function firePlayerProjectile(w){const px=player.x+player.w/2+player.facing*15, py=player.y+(player.aimUp?8:player.crouch?34:23);let speed=w.speed||450,vy=0,kind=w.type==='bow'?'arrow':w.type==='crossbow'?'bolt':w.type==='gun'?'bullet':'magic',color=w.type==='wand'?'#bca4ff':w.type==='gun'?'#f7d381':w.type==='crossbow'?'#8df4dc':world.theme.accent;
  if(player.aimUp){vy=-speed*.6;speed*=.8;}
  projectiles.push({x:px,y:py,vx:player.facing*speed,vy,damage:w.damage,team:'player',life:w.range/speed+.15,r:w.type==='gun'?3:5,kind,color,ownerId:'player'});
}
function attack(){const w=weaponNow();if(player.attackCD>0)return;player.attackCD=w.rate;player.swing=.22;
  if(w.type==='melee'||w.type==='aegis'){
    for(const e of enemies){if(e.dead)continue;const dx=(e.x+e.w/2)-(player.x+player.w/2);const dy=(e.y+e.h/2)-(player.y+player.h/2);if(dx*player.facing> -8 && Math.abs(dx)<=w.range+e.w/2 && Math.abs(dy)<75)damageEnemy(e,w.damage);}
  }else if(w.type==='flame'){
    for(const e of enemies){if(e.dead)continue;const dx=(e.x+e.w/2)-(player.x+player.w/2),dy=(e.y+e.h/2)-(player.y+player.h/2);if(dx*player.facing>0&&Math.abs(dx)<w.range+e.w/3&&Math.abs(dy)<75)damageEnemy(e,w.damage);}
    for(let i=0;i<7;i++)particles.push({x:player.x+player.w/2+player.facing*rand(25,150),y:player.y+rand(5,36),vx:player.facing*rand(10,80),vy:rand(-20,35),size:rand(3,7),life:rand(.1,.25),max:.25,color:Math.random()<.5?'#ff8c56':'#ffd16f'});
  }else firePlayerProjectile(w);
}
function fireEnemy(e, count=1, spread=0){
  const sourceX=e.x+e.w/2, sourceY=e.y+e.h*.35, targetX=player.x+player.w/2, targetY=player.y+player.h*.48;
  const dx=targetX-sourceX,dy=targetY-sourceY,base=Math.atan2(dy,dx);
  for(let i=0;i<count;i++){const a=base+(count===1?0:(i-(count-1)/2)*spread);const speed=e.type==='boss'?235:e.type==='wraith'?205:175;
    projectiles.push({x:sourceX,y:sourceY,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,damage:e.damage*(e.type==='boss'?.72:1),team:'enemy',life:3,r:e.type==='boss'?7:4,kind:'orb',color:e.type==='boss'?'#ff6798':e.type==='archer'?'#ffbd77':'#a8a0ff',ownerId:e.id});}
}
function usePotion(){if(!player||state!=='playing')return;if(save.potions<=0){toast('No tonics. Buy one in the shop.');return;}if(player.health>=player.maxHealth){toast('Health is already full.');return;}save.potions--;player.health=Math.min(player.maxHealth,player.health+40);floater(player.x+player.w/2,player.y-6,'+40 HP','#80f0bd',15);spawnParticles(player.x+player.w/2,player.y+20,'#80f0bd',12);saveNow();}

function update(dt){elapsed+=dt;if(toastTimer>0)toastTimer-=dt;
 if(state==='playing'&&player)updateGame(dt);
 if(state==='playing'||state==='menu'||state==='shop'||state==='pause'||state==='select'||state==='clear'||state==='gameover'){
   for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
   for(const f of floaters){f.y+=f.vy*dt;f.life-=dt;}floaters=floaters.filter(f=>f.life>0);
 }
}
function updateGame(dt){
  const p=player;const w=weaponNow();p.attackCD=Math.max(0,p.attackCD-dt);p.swing=Math.max(0,p.swing-dt);p.dashCD=Math.max(0,p.dashCD-dt);p.dashTime=Math.max(0,p.dashTime-dt);p.invuln=Math.max(0,p.invuln-dt);p.flash=Math.max(0,p.flash-dt);
  p.aimUp=!!inputs.up;p.crouch=!!inputs.crouch||!!inputs.down;
  if(pressed.has('jump'))p.jumpBuffer=.13;else p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
  if(pressed.has('dash')&&p.dashCD<=0){p.dashTime=.19;p.dashCD=1.12;p.invuln=Math.max(p.invuln,.18);p.vx=p.facing*610;spawnParticles(p.x+p.w/2,p.y+p.h*.7,world.theme.accent,5);}
  if(p.jumpBuffer>0&&(p.onGround||p.coyote>0)){p.vy=-565;p.onGround=false;p.coyote=0;p.jumpBuffer=0;}
  if(inputs.left){p.facing=-1;if(p.dashTime<=0)p.vx=-245;}
  else if(inputs.right){p.facing=1;if(p.dashTime<=0)p.vx=245;}
  else if(p.dashTime<=0)p.vx*=Math.pow(.0008,dt);
  if(inputs.attack)attack();if(pressed.has('potion'))usePotion();
  if(p.dashTime<=0){p.vy+=1480*dt;p.vy=Math.min(920,p.vy);}
  const oldY=p.y, oldBottom=p.y+p.h; p.x+=p.vx*dt;p.x=clamp(p.x,0,world.width-p.w);p.y+=p.vy*dt;p.onGround=false;
  if(p.y+p.h>=floorY){p.y=floorY-p.h;p.vy=0;p.onGround=true;}
  if(p.vy>=0&&p.dropTimer<=0){for(const pl of world.platforms){const py=floorY-pl.off;if(p.x+p.w>pl.x&&p.x<pl.x+pl.w&&oldBottom<=py+7&&p.y+p.h>=py){p.y=py-p.h;p.vy=0;p.onGround=true;break;}}}
  if(p.onGround)p.coyote=.09;else p.coyote=Math.max(0,p.coyote-dt);
  if(inputs.down&&pressed.has('down')){for(const pl of world.platforms){const py=floorY-pl.off;if(p.x+p.w>pl.x&&p.x<pl.x+pl.w&&Math.abs(p.y+p.h-py)<14){p.y+=8;p.vy=90;p.onGround=false;break;}}}
  p.dropTimer=Math.max(0,p.dropTimer-dt);
  if(p.y>H+200)hurtPlayer(25,p.x);
  // Enemies
  for(const e of enemies){if(e.dead)continue;e.attackCD-=dt;e.touchCD=Math.max(0,e.touchCD-dt);e.flash=Math.max(0,e.flash-dt);
    const dx=(p.x+p.w/2)-(e.x+e.w/2), adx=Math.abs(dx), dy=(p.y+p.h/2)-(e.y+e.h/2);e.dir=dx<0?-1:1;
    if(e.type==='boss'){
      if(e.charge>0){e.x+=e.dir*(e.speed*4.1)*dt;e.charge-=dt;}
      else{if(adx>78)e.x+=Math.sign(dx)*e.speed*dt; if(e.attackCD<=0){e.pattern=(e.pattern+1)%3;if(e.pattern===0){fireEnemy(e,3,.23);e.attackCD=1.65;}else if(e.pattern===1){e.charge=.43;e.attackCD=2.05;spawnParticles(e.x+e.w/2,floorY-3,'#ff789a',12);}else{fireEnemy(e,5,.17);e.attackCD=2.25;}}}
    }else if(e.type==='archer'){
      if(adx<170)e.x-=Math.sign(dx)*e.speed*.45*dt;else if(adx>270)e.x+=Math.sign(dx)*e.speed*.42*dt;
      if(e.attackCD<=0&&adx<440){fireEnemy(e,1);e.attackCD=1.8+Math.random()*.5;}
    }else if(e.type==='wraith'){
      if(adx>48)e.x+=Math.sign(dx)*e.speed*dt;
      e.y=floorY-e.h-15-Math.sin(elapsed*3+e.x*.01)*22;
      if(e.attackCD<=0&&adx<350){fireEnemy(e,1);e.attackCD=2.1;}
    }else{
      if(adx>37)e.x+=Math.sign(dx)*e.speed*dt;
      if(e.type==='brute'&&e.attackCD<=0&&adx<70){e.attackCD=1.65;if(adx<55&&Math.abs(dy)<70)hurtPlayer(e.damage,e.x);}
    }
    e.x=clamp(e.x,0,world.width-e.w);
    if(e.type!=='wraith')e.y=floorY-e.h;
    if(e.type!=='archer'&&e.type!=='boss'&&e.type!=='wraith'&&adx<=(p.w+e.w)*.48+3&&Math.abs(dy)<70&&e.touchCD<=0){hurtPlayer(e.damage,e.x);e.touchCD=e.type==='brute'?1.35:1.0;}
  }
  // Move and resolve projectiles
  for(const b of projectiles){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    if(b.team==='player'){
      for(const e of enemies){if(e.dead)continue;if(b.x>=e.x-3&&b.x<=e.x+e.w+3&&b.y>=e.y-6&&b.y<=e.y+e.h+6){damageEnemy(e,b.damage);b.life=0;break;}}
    }else if(p.invuln<=0&&b.x>=p.x-3&&b.x<=p.x+p.w+3&&b.y>=p.y-4&&b.y<=p.y+p.h+4){hurtPlayer(b.damage,b.x);b.life=0;}
  }
  projectiles=projectiles.filter(b=>b.life>0&&b.x>-50&&b.x<world.width+50&&b.y>-80&&b.y<H+100);
  // camera follows without showing beyond world bounds
  cameraX=clamp(p.x-W*.38,0,Math.max(0,world.width-W));
  const alive=enemies.some(e=>!e.dead);
  if(!alive&&!world.cleared){world.cleared=true;if(!world.rewarded){world.rewarded=true;const reward=Math.round(22+currentLevel*1.65+(currentLevel<10?12:0));save.coins+=reward;if(currentLevel%5===0)save.gems+=1;floater(p.x+p.w/2,p.y-25,'LEVEL REWARD +'+reward+' C','#f4d078',16);save.cleared=Array.from(new Set([...(save.cleared||[]),currentLevel]));save.maxUnlocked=Math.max(save.maxUnlocked,currentLevel+1);if(currentLevel>=100)save.infiniteUnlocked=true;saveNow();toast('Gate opened — find the exit.');}}
  if(world.cleared&&p.x+p.w/2>=world.exitX){state='clear';controlsEl.style.display='none';saveNow();}
  pressed.clear();
}

function drawHUD(){
 const t=world.theme;const pad=14;roundedRect(12,11,Math.min(340,W*.49),74,12,'rgba(8,12,23,.84)','rgba(145,177,226,.2)');
 smallCaps((infiniteRun?'ENDLESS':'LEVEL')+' '+currentLevel,24,25,10,t.accent);txt(t.name,24,43,13,'#e4ebff',750);txt(weaponNow().name+'  /  '+armorNow().name,24,63,10,'#9ba9c4',600);
 const hx=Math.min(375,W*.54), hw=Math.max(112,W*.25), hy=17;
 smallCaps('VITALITY',hx,hy,9,'#9ba9c4');roundedRect(hx,hy+10,hw,9,5,'rgba(0,0,0,.55)','rgba(160,184,225,.18)');roundedRect(hx,hy+10,hw*clamp(player.health/player.maxHealth,0,1),9,5,player.health<30?'#fa6176':'#6fe2bd',null);
 txt(Math.ceil(player.health)+' / '+player.maxHealth,hx+hw,hy+35,10,'#eaf2ff',700,'right');
 // currency and pause
 const rightW= Math.min(174,W*.28);roundedRect(W-rightW-62,11,rightW,33,9,'rgba(8,12,23,.83)','rgba(145,177,226,.2)');txt('● '+save.coins,W-rightW-52,28,12,'#f5d37a',800);txt('◆ '+save.gems,W-rightW+29,28,12,'#c5b2ff',800);
 uiButton(W-53,12,41,32,'Ⅱ',()=>pauseGame(),{fill:'rgba(26,34,55,.93)',size:16});
 const alive=enemies.filter(e=>!e.dead);const boss=alive.find(e=>e.type==='boss');
 if(boss){const bw=Math.min(360,W*.56),x=(W-bw)/2;roundedRect(x,14,bw,38,9,'rgba(12,8,18,.9)','rgba(255,113,151,.48)');smallCaps(boss.name||bossName(currentLevel),W/2,24,9,'#ff91ac','center');roundedRect(x+12,33,bw-24,8,4,'rgba(0,0,0,.7)',null);roundedRect(x+12,33,(bw-24)*clamp(boss.hp/boss.maxHp,0,1),8,4,'#ff638c',null);}
 if(world.cleared){roundedRect(W*.29, H*.16, W*.42, 36, 10,'rgba(9,18,24,.83)','rgba(110,233,207,.45)');txt('GATE OPEN  •  MOVE RIGHT TO EXIT',W*.5,H*.16+18,11,'#84f0d5',850,'center');}
 const aliveCount=alive.length;smallCaps(aliveCount?('HOSTILES '+aliveCount):'AREA CLEAR',W-18,H-51,9,aliveCount?'#d7a1b6':'#82ebce','right');
}

function drawMenu(){drawBackground();const center=W/2;
  // decorative hero card
  roundedRect(center-175,H*.095,350,83,17,'rgba(10,15,28,.56)','rgba(111,229,219,.18)');
  ctx.save();ctx.translate(center-130,H*.13);ctx.scale(1.2,1.2);drawHero(0,0);ctx.restore();
  smallCaps('A DARK FANTASY ACTION PLATFORMER',center+8,H*.14,9,'#96a9ca','center');txt('SHADOWBOUND',center+8,H*.2,Math.min(35,W*.065),'#eff5ff',950,'center');txt('Fight forward. Adapt. Survive.',center+8,H*.245,11,'#95a7c8',600,'center');
  const bw=Math.min(320,W*.68),bh=42,gap=9,y=H*.34;
  uiButton(center-bw/2,y,bw,bh,'CONTINUE  ·  LEVEL '+save.maxUnlocked,()=>startLevel(Math.min(100,save.maxUnlocked)),{fill:'rgba(32,73,78,.9)',stroke:'rgba(113,231,215,.55)',accent:'#72e5db',size:13});
  const smallW=Math.min(150,(W-44)/3), sy=y+bh+10;
  uiButton(center-smallW*1.5-6,sy,smallW,bh-5,'LEVELS',()=>{state='select';uiScroll=0;controlsEl.style.display='none';},{size:11});
  uiButton(center-smallW/2,sy,smallW,bh-5,'SHOP',()=>openShop('menu'),{size:11});
  const infReady=!!save.infiniteUnlocked;
  uiButton(center+smallW/2+6,sy,smallW,bh-5,infReady?'ENDLESS':'ENDLESS 🔒',()=>{if(infReady)startLevel(101,true);else toast('Clear level 100 to unlock Endless.');},{size:10,color:infReady?'#eaf1ff':'#7a849d'});
  txt('100 handcrafted-style stages  ·  Boss every 5 levels  ·  10 shifting realms',center,H-.07*H,10,'#8392b1',600,'center');
  txt('MOVE ◀ ▶   JUMP ↑   ATTACK J   DASH SHIFT   POTION E',center,H-.035*H,9,'#657493',700,'center');
}
function drawPanelTitle(kicker,title,sub=''){
  smallCaps(kicker,24,24,10,world?world.theme.accent:'#72e5db');txt(title,24,48,23,'#edf3ff',900);if(sub)txt(sub,24,70,11,'#91a2c2',550);
}
function drawShop(){drawBackground();roundedRect(12,10,W-24,H-20,18,'rgba(8,12,22,.96)','rgba(130,165,220,.3)');drawPanelTitle('THE WAYFARER’S MARKET','Gear & Supplies','Spend carefully. Better gear helps, but positioning still matters.');
  txt('● '+save.coins, W-152,29,13,'#f5d37a',850);txt('◆ '+save.gems,W-78,29,13,'#c5b2ff',850);
  const tabY=82,tabW=Math.min(145,(W-80)/3),tabGap=7;const tabs=[['weapons','WEAPONS'],['armor','ARMOR'],['supplies','SUPPLIES']];let tx=24;
  for(const [id,label] of tabs){uiButton(tx,tabY,tabW,30,label,()=>{uiTab=id;uiScroll=0;},{fill:uiTab===id?'rgba(44,80,88,.94)':'rgba(20,29,48,.93)',stroke:uiTab===id?'rgba(111,231,215,.7)':'rgba(126,157,203,.25)',size:10,color:uiTab===id?'#9bf7e5':'#9eacc7'});tx+=tabW+tabGap;}
  uiButton(W-103,tabY,78,30,'← BACK',()=>{state=returnState;controlsEl.style.display=returnState==='playing'?'block':'none';},{size:10});
  const list=uiTab==='weapons'?weapons:uiTab==='armor'?armors:supplies;const left=24, top=122, gap=10, cardW=(W-58)/2, cardH=72, cols=2;
  const totalRows=Math.ceil(list.length/cols), visibleBottom=H-22;
  ctx.save();ctx.beginPath();ctx.rect(18,top,W-36,visibleBottom-top);ctx.clip();
  list.forEach((item,i)=>{
    const col=i%cols,row=Math.floor(i/cols),x=left+col*(cardW+10),y=top+row*(cardH+8)-uiScroll;
    if(y+cardH<top-2||y>visibleBottom) return;
    let owned=uiTab==='weapons'?owns(save.ownedWeapons,item.id):uiTab==='armor'?owns(save.ownedArmors,item.id):false;
    const equipped=uiTab==='weapons'?save.equippedWeapon===item.id:uiTab==='armor'?save.equippedArmor===item.id:false;
    const locked=currentLevel<item.unlock;
    roundedRect(x,y,cardW,cardH,11,locked?'rgba(19,22,34,.83)':'rgba(19,28,46,.86)',equipped?'rgba(114,229,219,.72)':'rgba(124,157,208,.22)',equipped?1.5:1);
    ctx.fillStyle=locked?'#35394a':world?world.theme.accent:'#72e5db';ctx.globalAlpha=locked?.22:.8;ctx.beginPath();ctx.arc(x+19,y+20,6,0,TAU);ctx.fill();ctx.globalAlpha=1;
    const tx=x+32;txt(item.name,tx,y+17,12,locked?'#79839a':'#e7efff',850);
    txt(item.desc,tx,y+36,Math.max(8,Math.min(10,cardW*.026)),locked?'#68728a':'#97a8c8',550);
    if(uiTab==='weapons')txt('DMG '+item.damage+'  ·  '+(item.type==='melee'||item.type==='aegis'?'MELEE':item.type.toUpperCase()),tx,y+54,9,'#7e91b4',800);
    if(uiTab==='armor')txt('REDUCTION '+Math.round(item.def*100)+'%',tx,y+54,9,'#7e91b4',800);
    if(uiTab==='supplies')txt('RESTORE 40 HP',tx,y+54,9,'#7e91b4',800);
    const bw=Math.min(105,cardW*.32), bx=x+cardW-bw-7, by=y+22, bh=29;
    let label=locked?'LVL '+item.unlock:uiTab==='supplies'?priceText(item):owned?(equipped?'EQUIPPED':'EQUIP'):priceText(item);
    const affordable=canPay(item);uiButton(bx,by,bw,bh,label,()=>{if(locked){toast('Unlocks at level '+item.unlock);return;}if(uiTab==='weapons')purchase('weapon',item);else if(uiTab==='armor')purchase('armor',item);else purchase('supply',item);},{fill:equipped?'rgba(45,100,91,.95)':owned?'rgba(35,45,67,.95)':affordable&&!locked?'rgba(56,61,79,.95)':'rgba(31,29,41,.95)',stroke:equipped?'rgba(114,229,219,.52)':'rgba(136,162,207,.26)',size:Math.min(10,bw*.095),color:locked?'#65708b':equipped?'#a8f8e7':affordable?'#f0d28a':'#7b849a'});
  });
  ctx.restore();
  const totalH=top+totalRows*(cardH+8);if(totalH>visibleBottom){const trackX=W-10,trackY=top,trackH=visibleBottom-top;roundedRect(trackX,trackY,3,trackH,2,'rgba(95,116,154,.22)',null);const thumbH=Math.max(28,trackH*trackH/(totalH-top));roundedRect(trackX,trackY+(trackH-thumbH)*(uiScroll/Math.max(1,totalH-visibleBottom)),3,thumbH,2,'rgba(122,221,211,.8)',null);}
  txt('Upgrades improve your odds; every enemy still hits back.',W/2,H-11,9,'#667696',550,'center');
}
function drawSelect(){drawBackground();roundedRect(12,10,W-24,H-20,18,'rgba(8,12,22,.96)','rgba(130,165,220,.3)');drawPanelTitle('CHOOSE YOUR FIGHT','Level Atlas','Cleared levels can be replayed. Boss stages are marked with ◆.');uiButton(W-102,24,78,32,'← BACK',()=>menu(),{size:10});
 const gap=5,gridX=25,top=103;const cell=Math.min(42,(W-50-gap*9)/10,Math.max(22,(H-145-gap*9)/10));const gridW=cell*10+gap*9;const x0=(W-gridW)/2;
 ctx.save();ctx.beginPath();ctx.rect(18,top,W-36,H-25-top);ctx.clip();
 for(let n=1;n<=100;n++){const c=(n-1)%10,r=Math.floor((n-1)/10),x=x0+c*(cell+gap),y=top+r*(cell+gap)-uiScroll,unlocked=n<=save.maxUnlocked,cleared=(save.cleared||[]).includes(n),boss=n%5===0;
   roundedRect(x,y,cell,cell,6,cleared?'rgba(45,96,85,.9)':unlocked?'rgba(32,44,68,.94)':'rgba(18,22,34,.85)',cleared?'rgba(111,230,197,.55)':unlocked?'rgba(118,154,211,.34)':'rgba(72,80,103,.2)');
   txt(String(n),x+cell/2,y+cell/2,Math.max(9,cell*.34),unlocked?'#e4ecff':'#535d75',850,'center');if(boss){ctx.fillStyle='#f5c86d';ctx.beginPath();ctx.arc(x+cell-4,y+4,2.4,0,TAU);ctx.fill();}
   if(unlocked)addHit(x,y,cell,cell,()=>startLevel(n,n>100));
 }
 ctx.restore();const total=top+10*(cell+gap);if(total>H-25){const trackH=H-25-top,thumbH=Math.max(25,trackH*trackH/(total-top));roundedRect(W-10,top,3,trackH,2,'rgba(95,116,154,.22)',null);roundedRect(W-10,top+(trackH-thumbH)*(uiScroll/Math.max(1,total-(H-25))),3,thumbH,2,'rgba(122,221,211,.8)',null);}
 txt('◆  BOSS LEVEL',26,H-22,9,'#f4cc78',800);txt('●  CLEARED',160,H-22,9,'#80e1bc',800);txt('ENDLESS '+(save.infiniteUnlocked?'UNLOCKED':'LOCKED UNTIL LEVEL 100'),W-24,H-22,9,save.infiniteUnlocked?'#8eebd7':'#7c849c',800,'right');
}
function drawPause(){drawWorld();drawHUD();ctx.fillStyle='rgba(3,5,12,.7)';ctx.fillRect(0,0,W,H);const bw=Math.min(340,W*.78),bh=42,x=(W-bw)/2;roundedRect(x-15,H*.13,bw+30,H*.74,20,'rgba(10,14,25,.97)','rgba(126,166,219,.34)');smallCaps('TAKE A BREATH',W/2,H*.22,10,world.theme.accent,'center');txt('PAUSED',W/2,H*.29,27,'#eef4ff',900,'center');let y=H*.36;
 uiButton(x,y,bw,bh,'RESUME',()=>pauseGame(),{fill:'rgba(39,84,81,.93)',stroke:'rgba(114,229,219,.55)'});y+=50;uiButton(x,y,bw,bh,'SHOP & EQUIPMENT',()=>openShop('pause'));y+=50;uiButton(x,y,bw,bh,'RESTART LEVEL',()=>startLevel(currentLevel,infiniteRun));y+=50;uiButton(x,y,bw,bh,'MAIN MENU',()=>menu());}
function drawClear(){drawWorld();drawHUD();ctx.fillStyle='rgba(3,5,12,.67)';ctx.fillRect(0,0,W,H);const bw=Math.min(410,W*.84),x=(W-bw)/2;roundedRect(x,H*.16,bw,H*.68,20,'rgba(10,17,29,.98)','rgba(111,231,204,.44)');smallCaps('STAGE CLEARED',W/2,H*.25,10,world.theme.accent,'center');txt(world.spawnedBoss?'BOSS DEFEATED':'GATE REACHED',W/2,H*.33,24,'#eef7ff',900,'center');txt('Level '+currentLevel+'  ·  Total kills '+stats.kills,W/2,H*.405,12,'#97a8c9',650,'center');txt('Coins: '+save.coins+'     Diamonds: '+save.gems,W/2,H*.455,12,'#f1d28a',750,'center');
 const bw2=Math.min(175,(bw-36)/2),y=H*.54;uiButton(W/2-bw2-5,y,bw2,41,currentLevel>=100?'ENTER ENDLESS':'NEXT LEVEL',()=>{if(currentLevel>=100){save.infiniteUnlocked=true;saveNow();startLevel(101,true,true);}else startLevel(currentLevel+1,infiniteRun,true);},{fill:'rgba(38,83,79,.95)',stroke:'rgba(114,229,219,.56)',size:10});uiButton(W/2+5,y,bw2,41,'SHOP',()=>openShop('clear'),{size:11});uiButton(W/2-bw2-5,y+49,bw2*2+10,36,'MAIN MENU',()=>menu(),{size:10});
}
function drawGameover(){drawWorld();drawHUD();ctx.fillStyle='rgba(6,4,12,.75)';ctx.fillRect(0,0,W,H);const bw=Math.min(360,W*.8),x=(W-bw)/2;roundedRect(x,H*.2,bw,H*.6,18,'rgba(18,10,21,.97)','rgba(255,108,137,.43)');smallCaps('THE DARK CLAIMS ANOTHER',W/2,H*.29,10,'#ff849b','center');txt('FALLEN',W/2,H*.37,30,'#fff0f4',950,'center');txt('Every attempt teaches you something.',W/2,H*.435,11,'#a6a7c1',600,'center');let y=H*.5;uiButton(x+25,y,bw-50,39,'RETRY LEVEL '+currentLevel,()=>startLevel(currentLevel,infiniteRun),{fill:'rgba(63,39,57,.96)',stroke:'rgba(255,111,148,.46)'});uiButton(x+25,y+47,bw-50,39,'SHOP & UPGRADE',()=>openShop('gameover'));uiButton(x+25,y+94,bw-50,34,'MAIN MENU',()=>menu());}

function render(){hits=[];if(state==='menu')drawMenu();else if(state==='shop')drawShop();else if(state==='select')drawSelect();else if(state==='pause')drawPause();else if(state==='clear')drawClear();else if(state==='gameover')drawGameover();else if(state==='playing'){drawWorld();drawHUD();}
 if(toastTimer>0&&state!=='playing'){const y=H-62;const tw=Math.min(W-36,Math.max(210,toastText.length*7+32));roundedRect((W-tw)/2,y,tw,34,10,'rgba(24,34,52,.97)','rgba(139,179,225,.3)');txt(toastText,W/2,y+17,11,'#e9f2ff',700,'center');}
}
function frame(now){const dt=Math.min(.035,(now-lastTime)/1000||0);lastTime=now;update(dt);render();requestAnimationFrame(frame);}requestAnimationFrame(frame);

function posFromEvent(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
canvas.addEventListener('pointerdown',e=>{const p=posFromEvent(e);pointerDown={x:p.x,y:p.y,scroll:uiScroll,moved:false};canvas.setPointerCapture?.(e.pointerId);e.preventDefault();});
canvas.addEventListener('pointermove',e=>{if(!pointerDown)return;const p=posFromEvent(e);if(Math.abs(p.y-pointerDown.y)>7&& (state==='shop'||state==='select')){pointerDown.moved=true;uiScroll=clamp(pointerDown.scroll+(pointerDown.y-p.y),0,scrollLimit());}});
canvas.addEventListener('pointerup',e=>{const p=posFromEvent(e);if(pointerDown&&!pointerDown.moved){const hit=[...hits].reverse().find(h=>p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h);if(hit)hit.fn();}pointerDown=null;e.preventDefault();});
canvas.addEventListener('pointercancel',()=>{pointerDown=null;});
canvas.addEventListener('wheel',e=>{if(state==='shop'||state==='select'){uiScroll=clamp(uiScroll+e.deltaY,0,scrollLimit());e.preventDefault();}},{passive:false});
function scrollLimit(){if(state==='select'){const cell=Math.min(42,(W-50-5*9)/10,Math.max(22,(H-145-5*9)/10));return Math.max(0,103+10*(cell+5)-(H-25));}if(state==='shop'){const list=uiTab==='weapons'?weapons:uiTab==='armor'?armors:supplies;return Math.max(0,122+Math.ceil(list.length/2)*80-(H-22));}return 0;}
function setInput(name,on){if(on&&!inputs[name])pressed.add(name);inputs[name]=on;const b=document.querySelector(`[data-control="${name}"]`);if(b)b.classList.toggle('pressed',on);}
function clearInputs(){for(const k of Object.keys(inputs)){inputs[k]=false;const b=document.querySelector(`[data-control="${k}"]`);if(b)b.classList.remove('pressed');}pressed.clear();}
document.querySelectorAll('[data-control]').forEach(b=>{
 const name=b.dataset.control;
 b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);setInput(name,true);});
 const release=e=>{e.preventDefault?.();setInput(name,false);};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',()=>setInput(name,false));
});
const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Space:'jump',KeyJ:'attack',KeyK:'attack',ShiftLeft:'dash',ShiftRight:'dash',KeyL:'dash',KeyC:'crouch',KeyE:'potion'};
addEventListener('keydown',e=>{if(e.code==='Escape'||e.code==='Backspace'){e.preventDefault();if(state==='playing')pauseGame();else if(state==='pause')pauseGame();else if(state==='shop'||state==='select')menu();return;}const n=keyMap[e.code];if(n){e.preventDefault();setInput(n,true);}});
addEventListener('keyup',e=>{const n=keyMap[e.code];if(n){e.preventDefault();setInput(n,false);}});
addEventListener('blur',()=>{for(const k of Object.keys(inputs))setInput(k,false);});
window.gameBack=()=>{if(state==='playing')pauseGame();else if(state==='pause')pauseGame();else if(state!=='menu')menu();else return 'menu';return state;};
// Keep pointer actions responsive after entering a fresh screen.

})();
