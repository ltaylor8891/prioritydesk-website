import {makeCorpse,corpseCorners,corpseOpacity,CORPSE_LIFETIME,recoverHealth,damageOpacity} from './life-effects.js?v=permanent-3';
import {createHitFeedback,recordHit,clearActorFeedback,drawHitFeedback} from './hit-feedback.js?v=permanent-3';
import {WALK_FRAMES,walkFrame,updateWalk,turnActor,headingTo,showsBack} from './actor-motion.js?v=permanent-3';
import {drawMinimap} from './minimap.js?v=permanent-3';
import {world,setWorld,groundAt,ladders,nearestLadder,CAMP_WORLD,clamp,cover,walls,blocked,move,wallDistance,visible,flowField,nextStep,ENEMY_SIZE,spriteCorners,raySprite} from './core.js?v=permanent-3';
import {drawEnemy,avatarColors,AVATAR_COUNT,CHARACTER_NAMES,CHARACTER_WIDTH,CHARACTER_HEIGHT} from './enemy-art.js?v=permanent-3';
import {createMarks,clearMarks,surfaceHit,addMark,markCorners,drawMarkTexture} from './bullet-marks.js?v=permanent-3';
import {WEAPONS,createArsenal,selectWeapon,startReload,stepWeapon,fireWeapon,drawPlayerWeapon,stepSelection,isGrenade,cleanLoadout,DEFAULT_LOADOUT,aimSpread,bloomSpread,aimZoom} from './weapons.js?v=permanent-3';
import {readyEnemyShot,stepProjectile,ENEMY_GUNS,enemyVolley} from './combat.js?v=permanent-3';
import {buildTrainingGround,drawDecal,drawTarget,TRAINING_TARGETS} from './training-ground.js?v=permanent-3';
import {buildTown,TOWN_WORLD} from './town.js?v=permanent-3';
import {buildWar,WAR_WORLD} from './war.js?v=permanent-3';
import {drawWeaponIcon} from './weapon-icons.js?v=permanent-3';
import {playerLevel,isUnlocked,unlockLevel} from './progression.js?v=permanent-3';
import {blindOpacity,cloudPuffs,cloudRadius,cloudOpacity,GRENADE} from './grenades.js?v=permanent-3';
import {mouseDelta} from './mouse-look.js';
import {createPointerLock} from './pointer-lock.js';
import {createMatch,tickMatch,fireMatchWeapon,flagCounts,MODES,CAPTURE_SECONDS,FFA_COLORS,MATCH_RULES,TEAM_NAMES,TEAM_COLORS} from './team-match.js?v=permanent-3';
import {INPUT_DT,moveFromInput} from './network-motion.js?v=permanent-3';
import {NetworkGame} from './network-client.js?v=permanent-3';
const $=id=>document.getElementById(id),canvas=$('world'),gl=canvas.getContext('webgl',{antialias:true,alpha:false});
if(!gl){$('unsupported').hidden=false;throw new Error('WebGL unavailable');}
const vertex=`attribute vec3 aPos;attribute vec3 aColor;attribute vec2 aUV;uniform mat4 uVP;varying vec3 vColor;varying vec2 vUV;varying float vDepth;void main(){gl_Position=uVP*vec4(aPos,1.0);vColor=aColor;vUV=aUV;vDepth=gl_Position.w;}`;
const fragment=`precision mediump float;varying vec3 vColor;varying vec2 vUV;varying float vDepth;uniform sampler2D uTexture;uniform float uSprite;uniform float uFlash;uniform float uOpacity;uniform float uSoft;uniform float uFogStart;uniform float uFogRange;uniform float uFogMax;uniform vec3 uFogColor;void main(){vec4 tex=mix(vec4(1.0),texture2D(uTexture,vUV),uSprite);if(tex.a<0.5&&uSoft<0.5)discard;vec3 color=mix(vColor*tex.rgb,vec3(1.0,0.65,0.35),uFlash);float fog=clamp((vDepth-uFogStart)/uFogRange,0.0,uFogMax);gl_FragColor=vec4(mix(color,uFogColor,fog),mix(uOpacity,uOpacity*tex.a,uSoft));}`;
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const loc=Object.fromEntries(['uVP','uTexture','uSprite','uFlash','uOpacity','uSoft','uFogStart','uFogRange','uFogMax','uFogColor'].map(n=>[n,gl.getUniformLocation(program,n)]));
const attrs=['aPos','aColor','aUV'].map(n=>gl.getAttribLocation(program,n));
function bind(buffer){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);attrs.forEach((a,i)=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,i===2?2:3,gl.FLOAT,false,32,[0,12,24][i]);});}
function quad(out,points,color,uv=[[0,0],[1,0],[1,1],[0,1]]){for(const i of [0,1,2,0,2,3])out.push(...points[i],...color,...uv[i]);}
function box(out,x,y,z,w,h,d,c){const a=x-w/2,b=x+w/2,l=z-d/2,r=z+d/2,t=y+h;quad(out,[[a,y,r],[b,y,r],[b,t,r],[a,t,r]],c.map(v=>v*.8));quad(out,[[b,y,l],[a,y,l],[a,t,l],[b,t,l]],c.map(v=>v*.6));quad(out,[[a,y,l],[a,y,r],[a,t,r],[a,t,l]],c.map(v=>v*.65));quad(out,[[b,y,r],[b,y,l],[b,t,l],[b,t,r]],c.map(v=>v*.9));quad(out,[[a,t,r],[b,t,r],[b,t,l],[a,t,l]],c);quad(out,[[a,y,l],[b,y,l],[b,y,r],[a,y,r]],c.map(v=>v*.5));}
const staticBuffer=data=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return b;};
const makeScene=s=>({...s,worldBuffer:staticBuffer(s.geometry),lineBuffer:staticBuffer(s.lines)});
const scenes={camp:makeScene(buildTrainingGround(box,quad)),town:makeScene(buildTown(box,quad)),war:makeScene(buildWar(box,quad))},worlds={camp:CAMP_WORLD,town:TOWN_WORLD,war:WAR_WORLD};
let scene=scenes.camp,selectedMap='camp';
const DEFAULT_FOG={start:14,range:65,max:.82,color:[.69,.75,.64]};
try{const m=localStorage.getItem('dead-signal-map');if(m==='town'||m==='war')selectedMap=m;}catch{}
const spriteBuffer=gl.createBuffer();
function texture(draw,width=32,height=48,smooth=false){const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');draw(ctx);const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,smooth?gl.LINEAR:gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,smooth?gl.LINEAR:gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return tex;}
const actorTextures=[null,0,1].map(team=>[0,1,2].map(variant=>({
  front:Array.from({length:WALK_FRAMES},(_,frame)=>texture(c=>drawEnemy(c,frame,variant,false,team),CHARACTER_WIDTH,CHARACTER_HEIGHT,true)),
  back:Array.from({length:WALK_FRAMES},(_,frame)=>texture(c=>drawEnemy(c,frame,variant,false,team,true),CHARACTER_WIDTH,CHARACTER_HEIGHT,true)),
  dead:texture(c=>drawEnemy(c,0,variant,false,team,false,true),CHARACTER_WIDTH,CHARACTER_HEIGHT,true),
  fire:Array.from({length:WALK_FRAMES},(_,frame)=>texture(c=>drawEnemy(c,frame,variant,true,team),CHARACTER_WIDTH,CHARACTER_HEIGHT,true))
})));
const teamMarkers=TEAM_COLORS.map((color,i)=>texture(c=>{c.fillStyle=color;c.strokeStyle='#17241f';c.lineWidth=6;c.fillRect(3,3,122,42);c.strokeRect(3,3,122,42);c.fillStyle='#17241f';c.font='bold 21px Arial';c.textAlign='center';c.fillText(TEAM_NAMES[i],64,32);},128,48,true));
const targetTextures=[false,true].map(hit=>texture(c=>drawTarget(c,hit),128,192,true));
const warningTexture=texture(c=>{c.fillStyle='#ffd66b';c.strokeStyle='#20291d';c.lineWidth=5;c.beginPath();c.moveTo(32,3);c.lineTo(61,57);c.lineTo(3,57);c.closePath();c.fill();c.stroke();c.fillStyle='#20291d';c.font='bold 38px Arial';c.textAlign='center';c.fillText('!',32,47);},64,64,true);
const projectileTexture=texture(c=>{c.fillStyle='#ffbd51';c.strokeStyle='#342f21';c.lineWidth=5;c.beginPath();c.arc(16,16,12,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#fff2ad';c.beginPath();c.arc(13,12,5,0,Math.PI*2);c.fill();},32,32,true);
for(const s of Object.values(scenes))s.decalTextures=s.decals.map(d=>texture(c=>drawDecal(c,d),512,Math.max(64,Math.round(512*d.h/d.w)),true));
const markTextures=[0,1,2].map(v=>texture(c=>drawMarkTexture(c,v),64,64,true));
function drawRing(c,color){c.clearRect(0,0,256,256);c.strokeStyle='#17241f';c.lineWidth=22;c.beginPath();c.arc(128,128,112,0,Math.PI*2);c.stroke();c.strokeStyle=color;c.lineWidth=14;c.beginPath();c.arc(128,128,112,0,Math.PI*2);c.stroke();
  c.lineWidth=5;for(let i=0;i<16;i++){const a=i*Math.PI/8;c.beginPath();c.moveTo(128+Math.cos(a)*84,128+Math.sin(a)*84);c.lineTo(128+Math.cos(a)*98,128+Math.sin(a)*98);c.stroke();}}
const ZONE_COLORS={neutral:'#e8e2c9',0:'#73c5ef',1:'#ffae67',contested:'#ff6a5a'};
const zoneRings=Object.fromEntries(Object.entries(ZONE_COLORS).map(([k,col])=>[k,texture(c=>drawRing(c,col),256,256,true)]));
const flagTextures=Object.fromEntries(Object.keys(ZONE_COLORS).flatMap(k=>[0,1,2].map(i=>[k+i,texture(c=>{c.fillStyle=ZONE_COLORS[k];c.strokeStyle='#17241f';c.lineWidth=5;c.beginPath();c.moveTo(3,3);c.lineTo(93,12);c.lineTo(93,50);c.lineTo(3,60);c.closePath();c.fill();c.stroke();c.fillStyle='#17241f';c.font='bold 34px Arial';c.textAlign='center';c.fillText('ABC'[i],42,45);},96,64,true)])));
const poleTexture=texture(c=>{c.fillStyle='#4a3a28';c.fillRect(0,0,16,128);c.strokeStyle='#17241f';c.lineWidth=3;c.strokeRect(1,1,14,126);},16,128,true);
const nameTags=new Map();
function nameTag(a){const key=a.id+'|'+a.name;if(!nameTags.has(key))nameTags.set(key,texture(c=>{c.fillStyle=FFA_COLORS[a.id%FFA_COLORS.length];c.strokeStyle='#17241f';c.lineWidth=6;c.fillRect(3,3,186,42);c.strokeRect(3,3,186,42);c.fillStyle='#17241f';c.font='bold 22px Arial';c.textAlign='center';c.fillText(String(a.name).slice(0,12).toUpperCase(),96,32);},192,48,true));return nameTags.get(key);}
const softTexture=stops=>texture(c=>{const g=c.createRadialGradient(64,64,0,64,64,64);for(const [o,col] of stops)g.addColorStop(o,col);c.fillStyle=g;c.fillRect(0,0,128,128);},128,128,true);
const smokeTexture=softTexture([[0,'rgba(222,226,224,1)'],[.5,'rgba(196,203,200,.85)'],[1,'rgba(176,186,182,0)']]);
const fireTexture=softTexture([[0,'rgba(255,250,214,1)'],[.35,'rgba(255,170,60,.92)'],[1,'rgba(255,90,20,0)']]);
const flashTexture=softTexture([[0,'rgba(255,255,255,1)'],[.5,'rgba(255,255,255,.75)'],[1,'rgba(255,255,255,0)']]);
const grenadeTextures=Object.fromEntries([['frag','#5d6b3c','#3f4a29'],['flash','#d8dbd4','#f2d35c'],['smoke','#7e8f86','#c9d8d1']].map(([k,body,band])=>[k,texture(c=>{c.fillStyle=body;c.strokeStyle='#17241f';c.lineWidth=3;c.beginPath();c.arc(16,18,11,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=band;c.fillRect(7,15,18,5);c.fillStyle='#9aa097';c.fillRect(12,3,8,6);c.strokeRect(12,3,8,6);},32,32,true)]));
const medTexture=texture(c=>{c.fillStyle='#172e32';c.fillRect(4,16,24,22);c.fillStyle='#c8d9b0';c.fillRect(6,17,20,18);c.fillStyle='#ff7849';c.fillRect(13,19,6,14);c.fillRect(9,23,14,6);});
const weaponCanvas=$('weapon'),wc=weaponCanvas.getContext('2d'),map=$('map').getContext('2d');
let arsenal=createArsenal(),projectiles=[],tracers=[],targets=TRAINING_TARGETS.map(t=>({...t,flash:0})),targetHits=0,tourView=0;
let width=0,height=0,now=0,last=0,mode='menu',wave=0,enemies=[],meds=[],kills=0,health=100,recoil=0,hurt=0,hit=0,noticeTime=0,waveWait=0,flow=new Map(),flowTimer=0,elapsed=0,muted=false,audio=null,mouseDown=false;
let loadout=[...DEFAULT_LOADOUT],recoilDebt=0,recoilRate=.3,recoilDelay=.25,lastKick=-9,aimHeld=false,wheelAcc=0,blasts=[],wasBlind=false;
const crouchHeld=()=>keys.has('ControlLeft')||keys.has('ControlRight'),shiftHeld=()=>keys.has('ShiftLeft')||keys.has('ShiftRight'),sprintHeld=()=>shiftHeld()&&keys.has('KeyW')&&!crouchHeld()&&!aimWanted(),aimWanted=()=>aimHeld&&!isGrenade(arsenal.selected)&&mode==='playing';
try{loadout=cleanLoadout(JSON.parse(localStorage.getItem('dead-signal-loadout')));}catch{}
let selectedAvatar=0,marks=createMarks(),shotAge=9,prevRecoil=0,runBlend=0,sprintBlend=0;
try{selectedAvatar=Math.min(AVATAR_COUNT-1,Math.max(0,Number(localStorage.getItem('dead-signal-avatar'))||0));}catch{}
const MODE_IDS={teams:'tdm',ffa:'ffa',ctf:'ctf'},matchMode=()=>MODE_IDS[selectedMode]||'tdm',isMatchMode=()=>selectedMode!=='drills',teamColoured=()=>selectedMode==='teams'||selectedMode==='ctf';
let match=null,selectedMode='teams',feedback=createHitFeedback(),drillFeed=[],feedStamp='',corpses=[],lastDamage=-Infinity,recovering=false;
let network=null,networkAttempt=0,networkAccumulator=0,networkWeapon=0,firePulse=false,reloadPulse=false,remoteTargets=[],onlineSetupStamp='',connectionConfig=null;
const keys=new Set();let player={x:0,y:1.65,z:12,yaw:0,pitch:0};
const pointerCapture=createPointerLock(canvas,document,captureState);
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];}
function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function view(p){const s=Math.sin(p.yaw),c=Math.cos(p.yaw),sp=Math.sin(p.pitch),cp=Math.cos(p.pitch),right=[c,0,s],up=[-s*sp,cp,c*sp],back=[-s*cp,-sp,c*cp];return [right[0],up[0],back[0],0,right[1],up[1],back[1],0,right[2],up[2],back[2],0,-right[0]*p.x-right[2]*p.z,-up[0]*p.x-up[1]*p.y-up[2]*p.z,-back[0]*p.x-back[1]*p.y-back[2]*p.z,1];}
function tone(freq,duration,type='square',volume=.035,end=freq){if(muted||!audio)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(1,end),audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);}
function notify(message,time=2){$('notice').textContent=message;noticeTime=time;}
function updateHud(){
  $('health').textContent=Math.ceil(health);$('healthbar').style.width=health+'%';$('vital-label').textContent=recovering?'RECOVERING':'VITALS';$('healthbar').classList.toggle('recovering',recovering);
  $('ammo').textContent=String(arsenal.ammo[arsenal.selected]).padStart(2,'0');$('ammo-max').textContent=WEAPONS[arsenal.selected].capacity;
  $('weapon-state').textContent=arsenal.reload>0?'RELOADING…':WEAPONS[arsenal.selected].name;
  $('wave').textContent=mode==='tour'?'TRAINING GROUND / PREVIEW':`DRILL ${String(wave).padStart(2,'0')} / 05`;
  $('remaining').textContent=mode==='tour'?'EXPLORE THE RANGE':`${enemies.length} HOSTILES · ${targetHits} TARGET HITS`;
  if(match&&mode!=='tour'){
    const mm=match.mode||'tdm',ffa=mm==='ffa',seconds=Math.max(0,Math.ceil((match.timeLimit??MATCH_RULES.timeLimit)-match.elapsed)),clock=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
    if(ffa){const top=[...match.actors].filter(a=>!a.disabled).sort((a,b)=>b.kills-a.kills)[0];$('wave').textContent=`FREE FOR ALL · ${clock} · FIRST TO ${MODES.ffa.scoreLimit}`;$('remaining').textContent=top?`LEADER ${top.name.toUpperCase()} · ${top.kills}`:'';}
    else if(mm==='ctf'){const f=flagCounts(match);$('wave').textContent=`CAPTURE THE FLAG · ${clock}`;$('remaining').textContent=`BLUE ${f[0]} — ${f[1]} ORANGE · FLAGS HELD`;}
    else{$('wave').textContent=`4 vs 4 · ${clock} · FIRST TO ${MATCH_RULES.scoreLimit}`;$('remaining').textContent=`BLUE ${match.scores[0]} — ${match.scores[1]} ORANGE`;}
    const team=TEAM_NAMES[player.team??0],rule=ffa?'FREE FOR ALL · EVERYONE IS AN ENEMY':`${team} TEAM · FRIENDLY FIRE OFF`;
    $('team-status').textContent=match.spectator?'BOT MATCH · SPECTATING · ESC TO EXIT':player.hp<=0?`RESPAWNING IN ${Math.ceil(player.respawn)}…`:player.protection>0?`${ffa?'FREE FOR ALL':team+' TEAM'} · SPAWN SHIELD`:rule;
    if(network)$('team-status').textContent+=` · ROOM ${network.room.roomId} · ${network.ping} ms`;
    $('team-status').style.color=ffa?'#f3ebd9':TEAM_COLORS[player.team??0];

    $('score-rows').replaceChildren(...[...match.actors].sort((a,b)=>(ffa?0:a.team-b.team)||b.kills-a.kills).map(a=>{const row=document.createElement('div');row.className='score-row';row.style.color=ffa?FFA_COLORS[a.id%FFA_COLORS.length]:TEAM_COLORS[a.team];for(const text of [a.disabled?'EMPTY SLOT':a.name+(a.id===player.id&&!match.spectator?' (YOU)':a.human?'':' [BOT]'),a.disabled?'OPEN':a.hp<=0?'RESPAWNING':a.human?'PLAYING':a.state,a.kills,a.deaths]){const cell=document.createElement('span');cell.textContent=text;row.append(cell);}return row;}));
  }
  updateZoneHud();
  $('team-status').hidden=!match||mode==='tour';
  $('scoreboard').hidden=!match||(!keys.has('Tab')&&mode!=='ended');
  document.querySelectorAll('[data-weapon]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.weapon)===arsenal.selected));
  updateWeaponBar();
}
const setLabel=(el,text)=>{const b=el.querySelector('b');if(b)b.textContent=text;else el.textContent=text;};
function updateWeaponBar(){
  const bar=$('weapon-bar'),key=loadout.join();
  if(bar.dataset.key!==key){bar.dataset.key=key;bar.replaceChildren(...loadout.map((w,i)=>{const d=document.createElement('span');d.innerHTML=`<b>${i+1}</b><i></i>`;d.firstChild.after(WEAPONS[w].short);return d;}));}
  [...bar.children].forEach((d,i)=>{
    const w=loadout[i];
    d.classList.toggle('selected',w===arsenal.selected);
    d.classList.toggle('empty',arsenal.ammo[w]===0);
    d.classList.toggle('locked',isGrenade(w)&&mode==='playing'&&!match);
    d.querySelector('i').textContent=isGrenade(w)?' ×'+arsenal.ammo[w]:'';
  });
}
function updateZoneHud(){
  const el=$('zone-hud'),zs=match?.zones;
  if(!zs?.length||mode==='tour'||mode==='ended'){el.hidden=true;return;}
  el.hidden=false;
  if(el.children.length!==zs.length+1)el.replaceChildren(...zs.map((_,i)=>{const d=document.createElement('div');d.className='zone';d.innerHTML=`<b>${'ABC'[i]}</b><span></span><i><u></u></i>`;return d;}),Object.assign(document.createElement('small'),{className:'zone-held'}));
  zs.forEach((z,i)=>{
    const d=el.children[i],inside=!match.spectator&&player.hp>0&&Math.hypot(player.x-z.x,player.z-z.z)<=z.r;
    d.className=`zone${z.contested?' contested':''}${z.capturer!==null?' capturing-'+z.capturer:''}${z.owner!==null?' owner-'+z.owner:''}${inside?' inside':''}`;
    d.querySelector('span').textContent=z.contested?'CONTESTED':z.capturer!==null?`${TEAM_NAMES[z.capturer]} ${z.progress.toFixed(1)} / ${CAPTURE_SECONDS}`:z.owner!==null?`${TEAM_NAMES[z.owner]} HELD`:'NEUTRAL';
    d.querySelector('u').style.width=(z.capturer!==null?z.progress/CAPTURE_SECONDS*100:z.owner!==null?100:0)+'%';
  });
  el.lastChild.textContent=`TIME HELD · BLUE ${Math.floor(match.held[0])}s · ORANGE ${Math.floor(match.held[1])}s`;
}
function spawnWave(){wave++;const spots=[[-12,-12],[12,-12],[-12,11],[12,11],[0,-13],[-13,0],[13,0],[5,12],[-5,-13],[11,9],[4,-13],[-12,6]];enemies=[];for(let i=0;i<3+wave;i++){let [x,z]=spots[(i+wave-1)%spots.length];if(Math.hypot(x-player.x,z-player.z)<5){x=-x;z=-z;}enemies.push({id:`drill-${wave}-${i}`,name:['Rookie','Old Hand','Operator'][i%3]+' '+(i+1),maxHp:wave>3?3:2,x,z,variant:i%3,heading:Math.atan2(player.x-x,z-player.z),yaw:Math.atan2(player.x-x,z-player.z)+Math.PI,moving:false,walkPhase:0,hp:wave>3?3:2,phase:Math.random()*6,attack:1.2+i*.45,aim:0,fire:0,flash:0});}notify(`WAVE ${String(wave).padStart(2,'0')}\nCLEAR THE TRAINING GROUND`,2.5);tone(320,.25,'sine',.045,640);updateHud();}
const menuMap=()=>isMatchMode()?selectedMap:'camp';
function applyMap(id){
  setWorld(worlds[id]);scene=scenes[id];
  const label=document.querySelector('.mission-label');if(label){label.querySelector('span').textContent=world.name.toUpperCase();label.querySelector('strong').textContent=world.subtitle;}
  const mh=document.querySelector('.map-heading');if(mh)mh.firstChild.textContent=world.name.toUpperCase()+' ';
  document.querySelectorAll('[data-view]').forEach((b,i)=>{b.textContent=world.viewNames[i];});
}
function begin(spectator=false){
  if(network){leaveOnline();openOnline();return;}
  $('pause-setup').hidden=true;
  applyMap(isMatchMode()||spectator===true?selectedMap:'camp');
  corpses=[];clearMarks(marks);lastDamage=-Infinity;recovering=false;feedback=createHitFeedback();drillFeed=[];feedStamp='';spectator=spectator===true;document.body.classList.toggle('spectating',spectator);document.body.classList.remove('previewing');match=null;player={x:0,y:1.65,z:12,yaw:0,pitch:0,hp:100,crouch:0,lift:0,vy:0};health=100;blasts=[];aimHeld=false;arsenal=createArsenal();projectiles=[];tracers=[];targetHits=0;targets=TRAINING_TARGETS.map(t=>({...t,flash:0}));wave=0;kills=0;elapsed=0;meds=[];waveWait=0;hurt=0;hit=0;recoil=0;recoilDebt=0;arsenal.selected=loadout[0];flowTimer=0;keys.clear();mouseDown=false;mode=spectator?'spectating':'paused';
  $('tour-controls').hidden=!spectator;$('menu').hidden=true;$('end').hidden=true;$('pause').hidden=true;$('hud').hidden=false;
  if(isMatchMode()||spectator){match=createMatch({spectator,mode:matchMode()});if(!spectator){player=match.actors[0];player.variant=selectedAvatar;player.arsenal.selected=loadout[0];arsenal=player.arsenal;}enemies=match.actors.filter(a=>!a.human);notify(spectator?`${MODES[match.mode].name} · BOT MATCH`:match.mode==='ffa'?'FREE FOR ALL\nFIRST TO 20 · EVERYONE IS AN ENEMY':match.mode==='ctf'?'BLUE TEAM · CAPTURE THE FLAG\nHOLD A CIRCLE FOR 10 SECONDS':'BLUE TEAM\nFIRST TO 30 · TAB FOR SCOREBOARD',3);updateHud();}else spawnWave();
  if(spectator)document.body.classList.add('previewing');else lock();
}
function captureState(state,error){
  keys.clear();mouseDown=false;aimHeld=false;
  if(network&&state!=='locked'){network.stop();firePulse=false;reloadPulse=false;}
  document.body.classList.toggle('mouse-captured',state==='locked');
  if(mode==='menu'||mode==='ended'||mode==='tour'||mode==='spectating')return;
  if(state==='locked'){mode='playing';$('pause').hidden=true;return;}
  mode=state==='requesting'?'locking':'paused';$('pause').hidden=false;
  $('resume').disabled=state==='requesting';
  $('capture-help').hidden=state!=='blocked';
  $('capture-help').querySelector('p').innerHTML=network?'This browser is not allowing FPS mouse capture. The online match keeps running.<br>Open the game address in standalone Chrome, Edge, or Firefox, join the room, then click <strong>Enter the field</strong>.':offlineCaptureHelp;
  $('pause-title').textContent=state==='blocked'?'MOUSE CAPTURE BLOCKED':state==='requesting'?'CAPTURING MOUSE…':'STAY SHARP.';
  $('resume').innerHTML=state==='blocked'?'TRY MOUSE CAPTURE <span>↗</span>':'BACK TO THE FIELD <span>↗</span>';
  if(state==='blocked')console.warn('Mouse capture unavailable:',error?.name,error?.message);
}
function lock(){
  canvas.focus();
  if(!audio){try{audio=new (window.AudioContext||window.webkitAudioContext)();}catch{}}
  audio?.resume();pointerCapture.request();
}
function pause(){if(mode!=='playing'&&mode!=='locking')return;pointerCapture.release();}
function finish(win){mode='ended';mouseDown=false;keys.clear();$('end').hidden=false;$('hud').hidden=true;$('end-label').textContent=win?'TRANSMISSION RESTORED':'SIGNAL LOST';$('end-title').textContent=win?'BACK ONLINE.':'FLATLINED.';$('end-description').textContent=`${win?'All five drills cleared. Training complete.':'The training squad held the ground. Use cover and watch their weapons.'} ${kills} sentries disabled in ${Math.floor(elapsed/60)}m ${Math.floor(elapsed%60)}s.`;pointerCapture.release();}
// Each gun kicks the view in its own style; part of the climb eases back down on its own, the rest you must pull down.
function kickView(){
  const r=WEAPONS[currentWeapon()]?.recoil,t=performance.now();
  if(!r||t-lastKick<40)return;
  lastKick=t;const up=r.up*(.85+Math.random()*.3);
  player.pitch=clamp(player.pitch+up,-.85,.85);player.yaw+=(Math.random()-.5)*2*r.side;
  recoilDebt+=up*r.recover;recoilRate=r.rate;recoilDelay=r.delay??.25;
}
function recoverView(dt){if(recoilDebt<=0||performance.now()-lastKick<recoilDelay*1000)return;const step=Math.min(recoilDebt,recoilRate*dt);recoilDebt-=step;player.pitch=clamp(player.pitch-step,-.85,.85);}
const FIRE_TONES=[170,95,200,240,70,120];
function fireSound(){if(isGrenade(arsenal.selected))tone(260,.08,'triangle',.04,150);else tone(FIRE_TONES[arsenal.selected]||170,.15,'sawtooth',.06,32);}
function currentWeapon(){return network?networkWeapon:arsenal.selected;}
function cycleWeapon(dir){
  if(mode==='tour'){switchGun(stepSelection(currentWeapon(),dir));return;}
  // The wheel follows your slot order 1 → 4, skipping grenades where they cannot be used.
  const at=Math.max(0,loadout.indexOf(currentWeapon()));
  for(let k=1;k<=4;k++){const w=loadout[(at+(dir<0?-k:k)+8)%4];if(!isGrenade(w)||match){switchGun(w);return;}}
}
function reloadGun(){if(network){if(mode==='playing'&&player.hp>0)reloadPulse=true;return;}if(mode!=='playing'||(match&&player.hp<=0)||!startReload(arsenal))return;tone(160,.15,'triangle',.06,300);updateHud();}
function switchGun(index){if(mode==='playing'&&!loadout.includes(index))return;if(mode==='playing'&&!match&&isGrenade(index)){notify('GRENADES ARE FOR TEAM MODES',1.4);return;}if(network){if(player.hp>0)networkWeapon=index;return;}if(selectWeapon(arsenal,index)){recoil=.3;tone(220,.08,'triangle',.03,320);updateHud();}}
function shoot(){
  if(player.climb>0)return;
  if(network){if(mode==='playing'&&player.hp>0)firePulse=true;return;}
  if(match){
    if(mode!=='playing'||player.hp<=0)return;
    if(arsenal.ammo[arsenal.selected]===0){if(isGrenade(arsenal.selected))notify('NO '+WEAPONS[arsenal.selected].name+'S LEFT',1);reloadGun();return;}
    if(fireMatchWeapon(match,player,player.yaw,player.pitch)){recoil=1;fireSound();kickView();}
    return;
  }
  if(mode!=='playing')return;if(arsenal.ammo[arsenal.selected]===0){reloadGun();return;}if(!fireWeapon(arsenal))return;
  const weapon=WEAPONS[arsenal.selected];recoil=1;fireSound();kickView();const bloomBefore=player.bloom||0;player.lastShot=elapsed;if(weapon.bloom)player.bloom=Math.min(1,bloomBefore+weapon.bloom.perShot);
  for(let pellet=0;pellet<weapon.pellets;pellet++){
    const sp=weapon.hip===undefined?weapon.spread:aimSpread(weapon,player.ads)+bloomSpread(weapon,bloomBefore,player.ads),yaw=player.yaw+(Math.random()-.5)*sp*2,pitch=player.pitch+(Math.random()-.5)*sp*2,cp=Math.cos(pitch);
    const dir={x:Math.sin(yaw)*cp,y:Math.sin(pitch),z:-Math.cos(yaw)*cp};let nearest=Math.min(weapon.range,wallDistance(player,dir)),target=null,board=null;
    for(const e of enemies){const t=raySprite(player,dir,e,ENEMY_SIZE,0);if(t<nearest){nearest=t;target=e;}}
    for(const b of targets){const t=raySprite(player,dir,b,2.2,0);if(t<nearest){nearest=t;target=null;board=b;}}
    if(target){target.hp-=Math.max(1,Math.round(weapon.damage/25));target.flash=.12;hit=.16;recordHit(feedback,target,1,elapsed);if(target.hp<=0){corpses.push(makeCorpse(target,elapsed));drillFeed.unshift({killer:'You',victim:target.name,weapon:weapon.short,team:0,victimTeam:1,time:elapsed});drillFeed=drillFeed.slice(0,4);kills++;enemies=enemies.filter(e=>e!==target);if(kills%4===0)meds.push({x:target.x,z:target.z});}}
    if(board){board.flash=.2;targetHits++;hit=.16;tone(580,.08,'triangle',.025,280);}
    if(!target&&!board)addMark(marks,surfaceHit(player,dir,nearest+.02),{size:weapon.pellets>1?.13:.22});
    tracers.push({a:{x:player.x+Math.cos(player.yaw)*.18,y:player.y-.18,z:player.z+Math.sin(player.yaw)*.18},b:{x:player.x+dir.x*nearest,y:player.y+dir.y*nearest,z:player.z+dir.z*nearest},life:.065});
  }
  updateHud();
}
function damage(amount,source){lastDamage=elapsed;recovering=false;health=Math.max(0,health-amount);hurt=.6;tone(70,.15,'sawtooth',.05,30);updateHud();if(health<=0){drillFeed.unshift({killer:source?.shooterName||'Sentry',victim:'You',weapon:source?.weapon||'CARBINE',team:1,victimTeam:0,time:elapsed});drillFeed=drillFeed.slice(0,4);finish(false);}}
function tick(dt){
  if(network&&match?.network){tickOnline(dt);return;}
  if(match&&(mode==='playing'||mode==='spectating')){tickTeams(dt);return;}
  if(mode!=='playing')return;if(document.pointerLockElement!==canvas){pause();return;}
  elapsed+=dt;recoil=Math.max(0,recoil-dt*7);hurt=Math.max(0,hurt-dt);hit=Math.max(0,hit-dt);recoverView(dt);
  if(stepWeapon(arsenal,dt)){tone(300,.1,'square',.025,500);updateHud();}
  if(player.bloom>0&&elapsed-(player.lastShot??-9)>.22)player.bloom=Math.max(0,player.bloom-(WEAPONS[arsenal.selected].bloom?.decay??2)*dt);
  if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').textContent='';}
  if(keys.has('ArrowLeft'))player.yaw-=dt*1.8;if(keys.has('ArrowRight'))player.yaw+=dt*1.8;
  if(keys.has('ArrowUp'))player.pitch=clamp(player.pitch+dt,-.85,.85);if(keys.has('ArrowDown'))player.pitch=clamp(player.pitch-dt,-.85,.85);
  moveFromInput(player,{yaw:player.yaw,pitch:player.pitch,forward:Number(keys.has('KeyW'))-Number(keys.has('KeyS')),strafe:Number(keys.has('KeyD'))-Number(keys.has('KeyA')),sprint:sprintHeld(),crouch:crouchHeld(),aim:aimWanted(),jump:keys.has('Space')},dt);
  if(mouseDown&&WEAPONS[arsenal.selected].automatic)shoot();
  flowTimer-=dt;if(flowTimer<=0){flow=flowField(player);flowTimer=.6;}
  for(const e of enemies){
    const previous={x:e.x,z:e.z};
    e.flash=Math.max(0,e.flash-dt);const d=Math.hypot(player.x-e.x,player.z-e.z),sight=visible(e,player);
    const bullet=readyEnemyShot(e,player,dt,wave,sight);if(bullet){bullet.shooterName=e.name;bullet.weapon=WEAPONS[e.variant].short;projectiles.push(...enemyVolley(bullet,e.variant));tone(105+e.variant*35,.08,'square',.02,60);}
    // Hold a readable firing stance; move into range when cover blocks a shot.
    if(!e.aim&&e.fire<=0&&(!sight||d>ENEMY_GUNS[e.variant].range*.65)){
      const dest=sight?player:nextStep(e,flow);
      if(dest){let dx=dest.x-e.x,dz=dest.z-e.z;const n=Math.hypot(dx,dz)||1,pace=(1.05+wave*.1)*dt;dx/=n;dz/=n;
        for(const other of enemies){if(other===e)continue;const sep=Math.hypot(e.x-other.x,e.z-other.z);if(sep>0&&sep<.85){dx+=(e.x-other.x)/sep*.6;dz+=(e.z-other.z)/sep*.6;}}
        move(e,dx*pace,dz*pace,.38);if(!sight)turnActor(e,Math.atan2(dx,-dz),dt);
      }
    }
    updateWalk(e,previous,dt);
  }
  projectiles=projectiles.filter(b=>{const result=stepProjectile(b,player,dt);if(result==='player'&&mode==='playing')damage(b.damage,b);return result==='flying';});
  if(mode!=='playing')return;
  tracers=tracers.filter(t=>(t.life-=dt)>0);for(const target of targets)target.flash=Math.max(0,target.flash-dt);
  const wasRecovering=recovering,beforeRecovery=health;health=recoverHealth(health,lastDamage,elapsed,dt);recovering=health>beforeRecovery;if(recovering||beforeRecovery<100||wasRecovering!==recovering)updateHud();
  meds=meds.filter(m=>{if(Math.hypot(m.x-player.x,m.z-player.z)<1&&health<100){health=Math.min(100,health+28);notify('+28 HEALTH',1.2);tone(700,.2,'sine',.05,1000);updateHud();return false;}return true;});
  if(!enemies.length){if(!waveWait){waveWait=3;projectiles=[];notify(wave===5?'TRAINING COMPLETE':'DRILL CLEARED · REARMING',3);arsenal.ammo=WEAPONS.map(w=>w.capacity);arsenal.reload=0;health=Math.min(100,health+15);updateHud();}waveWait-=dt;if(waveWait<=0){waveWait=0;if(wave===5)finish(true);else spawnWave();}}
}
function tickTeams(dt){
  if(mode==='playing'&&document.pointerLockElement!==canvas){pause();return;}
  recoverView(dt);elapsed+=dt;recoil=Math.max(0,recoil-dt*7);hurt=Math.max(0,hurt-dt);hit=Math.max(0,hit-dt);
  if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').textContent='';}
  if(!match.spectator&&player.hp>0){
    stepWeapon(arsenal,dt);
    if(keys.has('ArrowLeft'))player.yaw-=dt*1.8;if(keys.has('ArrowRight'))player.yaw+=dt*1.8;
    if(keys.has('ArrowUp'))player.pitch=clamp(player.pitch+dt,-.85,.85);if(keys.has('ArrowDown'))player.pitch=clamp(player.pitch-dt,-.85,.85);
    moveFromInput(player,{yaw:player.yaw,pitch:player.pitch,forward:Number(keys.has('KeyW'))-Number(keys.has('KeyS')),strafe:Number(keys.has('KeyD'))-Number(keys.has('KeyA')),sprint:sprintHeld(),crouch:crouchHeld(),aim:aimWanted(),jump:keys.has('Space')},dt);
    if(mouseDown&&WEAPONS[arsenal.selected].automatic)shoot();
  }
  tickMatch(match,dt);
  processMatchEvents();
  recovering=!match.spectator&&player.recovering;health=match.spectator?100:player.hp;enemies=match.actors.filter(a=>!a.human&&a.hp>0);
  tracers=tracers.filter(t=>(t.life-=dt)>0);updateHud();
  if(match.ended)finishTeamMatch();
}
function processMatchEvents(){
  for(const e of match.events){
    if(e.type==='shot'){tracers.push({...e,life:.08});{const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,dz=e.b.z-e.a.z,len=Math.hypot(dx,dy,dz);if(len>.05)addMark(marks,surfaceHit(e.a,{x:dx/len,y:dy/len,z:dz/len},len+.02),{size:.2});}if(e.shooter!==player.id||match.spectator)tone(120,.06,'square',.012,60);else if(network){recoil=1;fireSound();kickView();}}
    if(e.type==='hit'&&(match.spectator||e.shooter===player.id)){recordHit(feedback,match.actors[e.victim],e.amount,elapsed,{shooter:e.shooter,position:e});if(!match.spectator)hit=.16;}
    if(e.type==='throw'&&e.shooter===player.id&&network&&!match.spectator){recoil=1;fireSound();}
    if(e.type==='explode'){blasts.push({kind:e.kind,x:e.x,y:Math.max(e.y,.6),z:e.z,age:0});const far=Math.hypot(e.x-player.x,e.z-player.z);if(e.kind==='frag')tone(Math.max(40,95-far),.6,'sawtooth',Math.max(.01,.09-far*.002),28);else if(e.kind==='flash')tone(1800,.12,'square',.03,900);else tone(220,.5,'sine',.02,110);}
    if(e.type==='capture'){notify(`${TEAM_NAMES[e.team]} CAPTURED FLAG ${'ABC'[e.zone]}`,2.2);tone(520,.25,'sine',.05,880);}
    if(e.type==='respawn')clearActorFeedback(feedback,e.actor);
    if(e.type==='team-change'){clearActorFeedback(feedback,e.oldActor);clearActorFeedback(feedback,e.actor);}
    if(e.type==='hit'&&e.victim===player.id&&!match.spectator){hurt=.6;tone(70,.15,'sawtooth',.05,30);}
    if(e.type==='respawn'&&e.actor===player.id&&!match.spectator){arsenal=player.arsenal;mouseDown=false;keys.clear();notify(`BACK IN · ${TEAM_NAMES[player.team]} TEAM`,1);}
    if(e.type==='kill'&&e.victim===player.id&&!match.spectator){mouseDown=false;keys.clear();firePulse=false;}
  }
  match.events.length=0;
}
function finishTeamMatch(){
    mode='ended';mouseDown=false;keys.clear();$('end').hidden=false;$('hud').hidden=true;$('tour-controls').hidden=true;
    const ffa=match.mode==='ffa',ctf=match.mode==='ctf',you=match.spectator?'Bot match complete.':`You: ${player.kills} eliminations / ${player.deaths} deaths.`;
    $('end-label').textContent='MATCH COMPLETE';$('end-title').textContent=match.winner===null?'DRAW.':ffa?`${String(match.actors[match.winner]?.name).toUpperCase()} WINS.`:`${TEAM_NAMES[match.winner]} WINS.`;
    $('end-description').textContent=ffa?`${[...match.actors].filter(a=>!a.disabled).sort((a,b)=>b.kills-a.kills).slice(0,3).map(a=>`${a.name} ${a.kills}`).join(' · ')}. ${you} First to ${MODES.ffa.scoreLimit}, five-minute limit.`:ctf?`Flags held: Blue ${flagCounts(match)[0]} — ${flagCounts(match)[1]} Orange. Time held: Blue ${Math.floor(match.held[0])}s, Orange ${Math.floor(match.held[1])}s. ${you}`:`Blue ${match.scores[0]} — ${match.scores[1]} Orange. ${you} First to 30, five-minute limit.`;
    $('scoreboard').hidden=true;pointerCapture.release();
}
function drawSprite(e,tex,camera,size=ENEMY_SIZE,base=0,flash=0){const data=[];quad(data,spriteCorners(e,e.yaw??camera.yaw,size,base),[1,1,1],[[0,1],[1,1],[1,0],[0,0]]);bind(spriteBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1f(loc.uFlash,flash);gl.drawArrays(gl.TRIANGLES,0,6);}
function openOnline(){
  onlineSetupStamp='';$('room-mode').value=matchMode();$('room-map').value=selectedMap;
  $('online-panel').hidden=false;$('online-connect').hidden=false;$('online-room').hidden=true;
  $('create-room').disabled=false;$('join-room').disabled=false;
  $('copy-room').textContent='COPY INVITE';
  $('online-message').textContent='Create a private room, or enter a friend’s code. Pick a team; the host chooses whether to fill empty slots with AI.';
}
function leaveOnline(){
  networkAttempt++;const old=network;network=null;old?.leave().catch(()=>{});
  mode='menu';pointerCapture.release();match=null;enemies=[];tracers=[];keys.clear();mouseDown=false;
  document.body.classList.remove('spectating','previewing');$('pause').hidden=true;$('end').hidden=true;
  $('hud').hidden=true;$('menu').hidden=false;$('online-panel').hidden=true;setLabel($('restart'),'RESTART MATCH');
  $('retry').innerHTML='DROP IN AGAIN <span>↗</span>';$('pause-help').textContent=offlineHelp;
  $('pause-setup').hidden=true;applyMap(menuMap());
}
async function connectOnline(join){
  const code=join?$('room-code').value.trim().toUpperCase():'';
  if(join&&!/^[A-F0-9]{8}$/.test(code)){$('online-message').textContent='Enter the eight-character room code.';return;}
  const attempt=++networkAttempt;$('create-room').disabled=true;$('join-room').disabled=true;
  $('online-message').textContent='Connecting to the match server…';
  try{
    const address=$('server-address').value.trim();
    const fallbackAddress=address===connectionConfig?.server&&Date.now()<Date.parse(connectionConfig?.fallbackExpiresAt)?connectionConfig.fallbackServer:null;
    const game=await NetworkGame.connect({address,fallbackAddress,name:$('player-name').value,mode:join?undefined:$('room-mode').value,map:join?undefined:$('room-map').value,avatar:selectedAvatar,loadout,code,team:$('join-team').value==='auto'?null:Number($('join-team').value),
      onSnapshot:data=>{if(network&&attempt===networkAttempt)receiveOnline(data);},
      onDisconnect:()=>{if(network&&attempt===networkAttempt){leaveOnline();openOnline();$('online-message').textContent='Connection lost. Your slot is now a bot. Join the room again to return.';}}});
    if(attempt!==networkAttempt){game.leave();return;}
    network=game;
    game.onSetupError=message=>{for(const prefix of ['room','pause'])$(prefix+'-setup-status').textContent=message;};
    try{localStorage.setItem('dead-signal-name',$('player-name').value);localStorage.setItem('dead-signal-server',$('server-address').value);}catch{}
    if(game.latest)receiveOnline(game.latest);
  }catch(error){
    if(attempt===networkAttempt)$('online-message').textContent=`Could not join: ${error.message||'server unavailable'}. Check the server address and room code. For local play, run Start Multiplayer.cmd.`;
  }finally{if(attempt===networkAttempt){$('create-room').disabled=false;$('join-room').disabled=false;}}
}
function receiveOnline(data){
  if(world.id!==data.mapId)applyMap(data.mapId);
  if(mode==='ended'&&match?.network&&data.ended)return;
  updateOnlineSetup(data);
  if(!data.started){
    $('online-connect').hidden=true;$('online-room').hidden=false;$('room-info').textContent=`${MODES[data.mode].name} · ${worlds[data.mapId].name.toUpperCase()}`;$('online-code').textContent=data.roomId;
    $('online-message').textContent=data.host?'Share this code. Start when your squad is ready.':'Waiting for the room host to start the match.';
    $('start-online').hidden=!data.host;
    $('online-roster').replaceChildren(...data.actors.map(a=>{
      const row=document.createElement('div');row.style.color=TEAM_COLORS[a.team];
      if(data.mode==='ffa')row.style.color=FFA_COLORS[a.id%FFA_COLORS.length];
      row.textContent=`${data.mode==='ffa'?'PLAYER '+(a.id+1):TEAM_NAMES[a.team]} · ${a.disabled?'EMPTY SLOT':a.name+(a.id===data.selfId?' (YOU)':a.human?'':' [BOT]')}`;return row;
    }));return;
  }
  const first=!match?.network,changedTeam=!first&&player.id!==data.selfId,respawn=changedTeam||data.events.some(e=>e.type==='respawn'&&e.actor===data.selfId);
  const authoritative=data.actors[data.selfId];
  if(first){
    match={network:true,spectator:false,actors:[],events:[],mode:data.mode,zones:[],held:[0,0]};player={...authoritative};
    networkAccumulator=0;networkWeapon=authoritative.arsenal.selected;firePulse=false;reloadPulse=false;
    feedback=createHitFeedback();corpses=[];tracers=[];projectiles=[];meds=[];hurt=0;hit=0;recoil=0;feedStamp='';
    keys.clear();mouseDown=false;mode='paused';document.body.classList.remove('spectating','previewing');
    $('online-panel').hidden=true;$('menu').hidden=true;$('end').hidden=true;$('tour-controls').hidden=true;$('hud').hidden=false;
    $('pause').hidden=false;$('capture-help').hidden=true;$('resume').disabled=false;
    $('pause-title').textContent='YOUR SQUAD IS LIVE.';$('resume').innerHTML='ENTER THE FIELD <span>↗</span>';
    setLabel($('restart'),'LEAVE ONLINE MATCH');$('retry').textContent='BACK TO MULTIPLAYER';
    $('pause-help').textContent='WASD move · mouse aim / fire · R reload · Ctrl crouch · Space jump · Shift sprint · right mouse aim · 1–4 or mouse wheel to switch between your loadout. Tab shows scores. '+(data.mode==='ffa'?'Everyone is an enemy.':'Your team is '+TEAM_NAMES[authoritative.team]+'.')+' The online match continues while this menu is open. Click Enter the field to lock your mouse.';
  }
  if(changedTeam){keys.clear();mouseDown=false;firePulse=false;reloadPulse=false;networkAccumulator=0;networkWeapon=authoritative.arsenal.selected;
    $('pause-help').textContent='You joined '+TEAM_NAMES[authoritative.team]+'. Team swaps use a three-second respawn. The online match continues while this menu is open.';}
  const previousYaw=player.yaw,previousPitch=player.pitch,predicted=network.predicted();
  Object.assign(player,predicted||authoritative);
  if(!first&&!respawn){player.yaw=previousYaw;player.pitch=previousPitch;player.heading=previousYaw;}
  const previous=match.actors;
  match.actors=data.actors.map(a=>{
    if(a.id===data.selfId)return player;
    const old=previous.find(p=>p.id===a.id);
    const teleported=!old||old.hp<=0||old.human!==a.human||Math.hypot(a.x-old.x,a.z-old.z)>3;
    return teleported?{...a}:{...a,x:old.x,z:old.z,yaw:old.yaw,heading:old.heading};
  });
  remoteTargets=data.actors;
  Object.assign(match,{mode:data.mode,zones:data.zones,held:data.held,timeLimit:data.timeLimit,scores:data.scores,elapsed:data.elapsed,corpses:data.corpses,feed:data.feed,ended:data.ended,winner:data.winner});
  match.events.push(...data.events);elapsed=data.elapsed;arsenal=player.arsenal;health=player.hp;recovering=player.recovering;
  enemies=match.actors.filter(a=>a.id!==player.id&&a.hp>0);
  processMatchEvents();updateHud();
  if(data.ended&&mode!=='ended')finishTeamMatch();
}
function updateOnlineSetup(data){
  const own=data.actors[data.selfId],counts=[0,1].map(team=>data.actors.filter(a=>a.human&&a.team===team).length);
  const stamp=`${data.selfId}:${data.aiEnabled}:${data.started}`;
  if(stamp!==onlineSetupStamp){onlineSetupStamp=stamp;for(const prefix of ['room','pause'])$(prefix+'-setup-status').textContent=`${data.mode==='ffa'?'FREE FOR ALL':'YOUR TEAM: '+TEAM_NAMES[own.team]} · AI ${data.aiEnabled?'ON':'OFF'}${data.started?' · Swapping teams respawns you.':''}`;}
  $('pause-setup').hidden=false;
  for(const prefix of ['room','pause']){
    $(prefix+'-setup').querySelector('.team-choices').hidden=data.mode==='ffa';
    const toggle=$(prefix+'-ai');toggle.checked=data.aiEnabled;toggle.disabled=!data.host||data.ended;
    $(prefix+'-ai-note').textContent=data.host?'YOU CONTROL AI':'HOST CONTROLS AI';
    $(prefix+'-setup').querySelectorAll('[data-choose-team]').forEach(button=>{
      const team=Number(button.dataset.chooseTeam),joined=own.team===team;
      button.textContent=`${joined?'YOUR TEAM: ':''}${TEAM_NAMES[team]} · ${counts[team]}/4 PLAYERS`;
      button.classList.toggle('selected',joined);button.disabled=joined||counts[team]>=4||data.ended;
    });
  }
}
function tickOnline(dt){
  recoverView(dt);
  recoil=Math.max(0,recoil-dt*7);hurt=Math.max(0,hurt-dt);hit=Math.max(0,hit-dt);
  tracers=tracers.filter(t=>(t.life-=dt)>0);
  if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').textContent='';}
  for(const a of match.actors){
    if(a.id===player.id)continue;const target=remoteTargets[a.id],f=1-Math.exp(-18*dt);
    a.x+=(target.x-a.x)*f;a.z+=(target.z-a.z)*f;
    a.yaw+=Math.atan2(Math.sin(target.yaw-a.yaw),Math.cos(target.yaw-a.yaw))*f;
    a.heading+=Math.atan2(Math.sin(target.heading-a.heading),Math.cos(target.heading-a.heading))*f;
  }
  if(mode!=='playing'||player.hp<=0||match.ended){networkAccumulator=0;return;}
  if(document.pointerLockElement!==canvas){pause();return;}
  if(keys.has('ArrowLeft'))player.yaw-=dt*1.8;if(keys.has('ArrowRight'))player.yaw+=dt*1.8;
  if(keys.has('ArrowUp'))player.pitch=clamp(player.pitch+dt,-.85,.85);if(keys.has('ArrowDown'))player.pitch=clamp(player.pitch-dt,-.85,.85);
  networkAccumulator+=dt;
  while(networkAccumulator>=INPUT_DT){
    networkAccumulator-=INPUT_DT;
    const packet=network.send({yaw:player.yaw,pitch:player.pitch,forward:Number(keys.has('KeyW'))-Number(keys.has('KeyS')),
      strafe:Number(keys.has('KeyD'))-Number(keys.has('KeyA')),sprint:sprintHeld(),crouch:crouchHeld(),aim:aimWanted(),jump:keys.has('Space'),
      fire:firePulse||mouseDown,reload:reloadPulse,weapon:networkWeapon});
    if(packet){moveFromInput(player,packet);firePulse=false;reloadPulse=false;}
  }
}
function drawCorpses(camera){
  const bodies=match?match.corpses:corpses;
  const remaining=bodies.filter(c=>elapsed-c.diedAt<CORPSE_LIFETIME);
  if(match)match.corpses=remaining;else corpses=remaining;
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.uniform1f(loc.uSprite,1);gl.uniform1f(loc.uFlash,0);
  for(const c of [...remaining].sort((a,b)=>Math.hypot(b.x-camera.x,b.z-camera.z)-Math.hypot(a.x-camera.x,a.z-camera.z))){
    const points=corpseCorners(c,elapsed),data=[];quad(data,points,[.83,.83,.83],[[0,1],[1,1],[1,0],[0,0]]);
    bind(spriteBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);
    {const ct=match?.mode==='ffa'?undefined:c.team;gl.bindTexture(gl.TEXTURE_2D,actorTextures[ct===undefined?0:ct+1][c.variant].dead);}
    gl.uniform1f(loc.uOpacity,corpseOpacity(elapsed-c.diedAt));gl.drawArrays(gl.TRIANGLES,0,6);
  }
  gl.uniform1f(loc.uOpacity,1);gl.depthMask(true);gl.disable(gl.BLEND);
}
function drawWeapon(){wc.clearRect(0,0,width,height);if(mode==='menu'||mode==='ended'||mode==='spectating'||(match&&player.hp<=0))return;drawPlayerWeapon(wc,width,height,{ads:mode==='playing'&&player.hp>0&&!isGrenade(arsenal.selected)?player.ads||0:0,ammo:arsenal.ammo[arsenal.selected],selected:arsenal.selected,recoil,reload:arsenal.reload,time:now,run:runBlend,sprint:sprintBlend,walkPhase:player.walkPhase||0,shotAge,colors:avatarColors(player.variant??selectedAvatar,match&&!match.spectator?player.team:null)});}
function drawZones(camera){
  if(!match?.zones?.length||mode==='menu'||mode==='tour')return;
  gl.uniform1f(loc.uSprite,1);gl.uniform1f(loc.uFlash,0);gl.uniform1f(loc.uOpacity,1);
  match.zones.forEach((z,i)=>{
    const key=z.contested?'contested':z.capturer!==null?z.capturer:z.owner===null?'neutral':z.owner,half=z.r*1.085,data=[];
    quad(data,[[z.x-half,.07,z.z-half],[z.x+half,.07,z.z-half],[z.x+half,.07,z.z+half],[z.x-half,.07,z.z+half]],[1,1,1],[[0,0],[1,0],[1,1],[0,1]]);
    gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-3,-3);bind(spriteBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);gl.bindTexture(gl.TEXTURE_2D,zoneRings[key]);gl.drawArrays(gl.TRIANGLES,0,6);gl.disable(gl.POLYGON_OFFSET_FILL);
    drawDecalPlane({x:z.x,y:0,z:z.z,w:.2,h:6,yaw:camera.yaw},poleTexture);
    const rise=z.capturer!==null?z.progress/CAPTURE_SECONDS:z.owner!==null?1:.04;
    drawDecalPlane({x:z.x+Math.cos(camera.yaw)*.78,y:.3+rise*4.7,z:z.z+Math.sin(camera.yaw)*.78,w:1.4,h:.93,yaw:camera.yaw},flagTextures[key+i]);
  });
}
function drawSoft(x,y,z,size,yaw,tex,opacity){
  gl.uniform1f(loc.uSoft,1);gl.uniform1f(loc.uOpacity,opacity);drawDecalPlane({x,y:y-size/2,z,w:size,h:size,yaw},tex);
}
function drawEffects(camera,dt){
  const clouds=match?.clouds||[],gren=match?.grenades||[];
  gl.uniform1f(loc.uSprite,1);gl.uniform1f(loc.uFlash,0);gl.uniform1f(loc.uOpacity,1);
  for(const g of gren)drawDecalPlane({x:g.x,y:g.y-.12,z:g.z,w:.26,h:.26,yaw:camera.yaw},grenadeTextures[g.kind]);
  blasts=blasts.filter(b=>(b.age+=dt)<.5);
  const mist=scene.mist||[];
  if(!clouds.length&&!blasts.length&&!mist.length)return;
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  const puffs=[];
  for(const c of clouds){
    const grow=Math.min(1,c.age/GRENADE.smokeGrow),fade=cloudOpacity(c);
    for(const p of cloudPuffs(c)){
      const sway=Math.sin(c.age*.6+p.spin)*.25;
      puffs.push({x:c.x+p.dx*grow+sway,y:c.y+p.dy*grow+c.age*.04,z:c.z+p.dz*grow+Math.cos(c.age*.5+p.spin)*.25,size:p.size*(.35+.65*grow),opacity:.6*fade});
    }
  }
  // Ground mist: slow low patches that thicken the air near the ground, and fill the trenches.
  for(const m of mist){
    const x=m.x+Math.sin(now*m.speed+m.phase)*6,z=m.z+Math.cos(now*m.speed*.8+m.phase)*6;
    if(Math.hypot(x-camera.x,z-camera.z)>70)continue;
    puffs.push({x,y:groundAt(x,z)+m.rise,z,size:m.size,opacity:.2});
  }
  puffs.sort((a,b)=>Math.hypot(b.x-camera.x,b.z-camera.z)-Math.hypot(a.x-camera.x,a.z-camera.z));
  for(const p of puffs)drawSoft(p.x,p.y,p.z,p.size,camera.yaw,smokeTexture,p.opacity);
  for(const b of blasts){
    const t=b.age/.5,size=b.kind==='frag'?3.2+t*4:b.kind==='flash'?2.2+t*5:1.5+t*2;
    drawSoft(b.x,b.y,b.z,size,camera.yaw,b.kind==='frag'?fireTexture:b.kind==='flash'?flashTexture:smokeTexture,(1-t)*(b.kind==='smoke'?.4:.95));
  }
  gl.uniform1f(loc.uSoft,0);gl.uniform1f(loc.uOpacity,1);gl.depthMask(true);gl.disable(gl.BLEND);
}
// The crosshair opens to match the gun's current spread, so hip fire visibly sprays and aiming closes it up.
function updateCrosshair(ads,fov){
  const w=WEAPONS[arsenal.selected],el=$('crosshair');
  if(!w||isGrenade(arsenal.selected)||w.hip===undefined){el.style.opacity=.9;return;}
  const spread=aimSpread(w,ads)+bloomSpread(w,player.bloom,ads),px=Math.max(14,Math.min(160,spread/Math.tan(fov/2)*height*.5*1.1));
  el.style.width=el.style.height=px+'px';el.style.opacity=arsenal.selected===4&&ads>.6?0:.95;
}
function updateLadderHint(){
  const el=$('ladder-hint');
  if(mode!=='playing'||!player||!(player.hp>0)||!ladders.length){el.hidden=true;return;}
  const near=player.climb>0?true:nearestLadder(player,1.4);
  el.hidden=!near;
  if(near)el.textContent=player.climb>0?'W / S  CLIMB  ·  SPACE  LET GO':Math.abs((player.fy||0)-near.top)<.6?'FACE THE HOLE  ·  HOLD W  TO CLIMB DOWN':'FACE THE LADDER  ·  HOLD W  TO CLIMB';
}
function updateFlash(){
  const el=$('flash'),active=match&&!match.spectator&&mode!=='menu'&&player.hp>0,o=active?blindOpacity(player,match.elapsed):0;
  el.style.opacity=o;
  if(o>.5&&!wasBlind)tone(3200,1.2,'sine',.025,2400);
  wasBlind=o>.5;
}
function drawMarks(){
  if(!marks.list.length)return;gl.uniform1f(loc.uSprite,1);gl.uniform1f(loc.uFlash,0);gl.uniform1f(loc.uOpacity,1);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-2,-2);gl.depthMask(false);
  for(let v=0;v<3;v++){const data=[];for(const m of marks.list)if(m.variant===v)quad(data,markCorners(m),[1,1,1],[[0,1],[1,1],[1,0],[0,0]]);if(!data.length)continue;bind(spriteBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);gl.bindTexture(gl.TEXTURE_2D,markTextures[v]);gl.drawArrays(gl.TRIANGLES,0,data.length/8);}
  gl.depthMask(true);gl.disable(gl.POLYGON_OFFSET_FILL);
}
function drawDecalPlane(d,tex){const c=Math.cos(d.yaw)*d.w/2,s=Math.sin(d.yaw)*d.w/2,data=[];quad(data,[[d.x-c,d.y,d.z-s],[d.x+c,d.y,d.z+s],[d.x+c,d.y+d.h,d.z+s],[d.x-c,d.y+d.h,d.z-s]],[1,1,1],[[0,1],[1,1],[1,0],[0,0]]);bind(spriteBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1f(loc.uFlash,0);gl.drawArrays(gl.TRIANGLES,0,6);}
function showTour(){applyMap('camp');corpses=[];recovering=false;document.body.classList.remove('spectating');match=null;mode='tour';document.body.classList.add('previewing');$('menu').hidden=true;$('pause').hidden=true;$('hud').hidden=false;$('tour-controls').hidden=false;$('notice').textContent='';health=100;arsenal=createArsenal();updateHud();}
function exitTour(){applyMap(menuMap());corpses=[];recovering=false;document.body.classList.remove('spectating');match=null;enemies=[];tracers=[];mode='menu';document.body.classList.remove('previewing');$('menu').hidden=false;$('hud').hidden=true;$('tour-controls').hidden=true;}
function updateKillFeed(){
  const time=match?match.elapsed:elapsed,entries=(match?.feed||drillFeed).filter(e=>time-e.time<7);
  const active=mode!=='menu'&&mode!=='tour';$('kill-feed').hidden=!active||!entries.length;
  const stamp=JSON.stringify(entries)+Math.floor(time*10);if(stamp===feedStamp)return;feedStamp=stamp;
  $('kill-feed-rows').replaceChildren(...entries.map(e=>{
    const row=document.createElement('div');row.className='kill-row';row.style.opacity=Math.min(1,7-(time-e.time));
    if(e.killer===(network?player.name:'You')||e.victim===(network?player.name:'You'))row.classList.add('involves-you');
    const killer=document.createElement('strong'),weapon=document.createElement('span'),victim=document.createElement('strong');
    killer.textContent=e.killer;killer.style.color=TEAM_COLORS[e.team];weapon.textContent='— '+e.weapon+' →';weapon.className='kill-weapon';victim.textContent=e.victim;victim.style.color=TEAM_COLORS[e.victimTeam];
    row.append(killer,weapon,victim);return row;
  }));
}
function drawMap(camera=player,actors=enemies){const spectator=mode==='spectating',preview=mode==='tour';drawMinimap(map,camera,actors,{spectator,preview,meds,targets:world.id==='camp'?targets:[],ffa:match?.mode==='ffa',zones:match?.zones||[]});$('map-caption').textContent=spectator?'ALL TEAMS · NORTH UP':preview?'GROUND PLAN · NORTH UP':'VISIBLE ENEMIES · NORTH UP';}
function render(time){
  now=time/1000;const dt=Math.min(now-last,.04);last=now;
  if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;canvas.width=Math.round(width*Math.min(devicePixelRatio,1.5));canvas.height=Math.round(height*Math.min(devicePixelRatio,1.5));weaponCanvas.width=width;weaponCanvas.height=height;gl.viewport(0,0,canvas.width,canvas.height);}
  if(mode==='ended')elapsed+=dt;tick(dt);if(mode==='tour')recoil=Math.max(0,recoil-dt*7);
  {const playing=mode==='playing'&&player.hp>0,sprinting=playing&&player.moving&&sprintHeld()&&recoil<.3&&!mouseDown;
  runBlend+=((playing&&player.moving?1:0)-runBlend)*Math.min(1,dt*10);sprintBlend+=((sprinting?1:0)-sprintBlend)*Math.min(1,dt*8);
  if(recoil>prevRecoil+.4)shotAge=0;prevRecoil=recoil;shotAge+=dt;}
  const views=world.views,mc=world.menu.camera;
  const camera=mode==='menu'?{...mc,x:mc.x+Math.sin(now*.035)}:mode==='tour'||mode==='spectating'?views[tourView]:player;
  const baseFog=scene.fog||DEFAULT_FOG,overview=mode==='spectating'||mode==='menu'||mode==='tour',fog=overview?{...baseFog,start:baseFog.start*5,range:baseFog.range*3,max:Math.min(baseFog.max,.7)}:baseFog;gl.clearColor(fog.color[0],fog.color[1],fog.color[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);
  const aiming=mode==='playing'&&player.hp>0?player.ads||0:0,viewFov=1.18/aimZoom(WEAPONS[arsenal.selected],aiming);
  updateCrosshair(aiming,viewFov);updateLadderHint();
  const viewProjection=multiply(perspective(viewFov,width/height,.07,110),view(camera));gl.uniformMatrix4fv(loc.uVP,false,viewProjection);
  gl.uniform1f(loc.uFogStart,fog.start);gl.uniform1f(loc.uFogRange,fog.range);gl.uniform1f(loc.uFogMax,fog.max);gl.uniform3f(loc.uFogColor,fog.color[0],fog.color[1],fog.color[2]);
  gl.uniform1f(loc.uOpacity,1);gl.uniform1f(loc.uSprite,0);gl.uniform1f(loc.uFlash,0);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);
  bind(scene.worldBuffer);gl.drawArrays(gl.TRIANGLES,0,scene.geometry.length/8);gl.disable(gl.POLYGON_OFFSET_FILL);
  bind(scene.lineBuffer);gl.lineWidth(1.5);gl.drawArrays(gl.LINES,0,scene.lines.length/8);
  gl.uniform1f(loc.uSprite,1);for(const [i,d] of scene.decals.entries())drawDecalPlane(d,scene.decalTextures[i]);
  drawMarks();gl.uniform1f(loc.uSprite,1);drawZones(camera);
  for(const t of targets)drawSprite(t,targetTextures[t.flash>0?1:0],camera,2.2,0);
  const actors=mode==='menu'||mode==='tour'?world.menu.actors.map((a,i)=>({...a,variant:mode==='menu'&&i===0?selectedAvatar:a.variant,team:mode==='menu'&&teamColoured()?(i===0?0:1):undefined})):enemies;
  for(const e of actors){
    const ffa=match?.mode==='ffa',vt=ffa?undefined:e.team,frame=walkFrame(e),set=actorTextures[vt===undefined?0:vt+1][e.variant??0];
    const tex=showsBack(e,camera)?set.back[frame]:e.fire>0?set.fire[frame]:set.front[frame];
    const sz=1-.28*(e.crouch||0),lift=e.fy||0;
    drawSprite(e.human?{...e,yaw:e.yaw+Math.PI}:e,tex,camera,ENEMY_SIZE*sz,lift,e.flash>0?.65:0);
    if(ffa)drawDecalPlane({x:e.x,y:2.4*sz+lift,z:e.z,w:1.05,h:.28,yaw:camera.yaw},nameTag(e));else if(e.team!==undefined)drawDecalPlane({x:e.x,y:2.4*sz+lift,z:e.z,w:.85,h:.32,yaw:camera.yaw},teamMarkers[e.team]);
    if(e.aim>0&&e.team===undefined)drawDecalPlane({x:e.x,y:2.5,z:e.z,w:.42,h:.42,yaw:camera.yaw},warningTexture);
  }
  for(const b of projectiles)drawDecalPlane({x:b.x,y:b.y-.1,z:b.z,w:.2,h:.2,yaw:camera.yaw},projectileTexture);
  for(const m of meds)drawSprite(m,medTexture,camera,1.1,.1+Math.sin(now*3)*.1);
  if(tracers.length){const data=[];for(const t of tracers)for(const p of [t.a,t.b])data.push(p.x,p.y,p.z,1,.83,.42,0,0);gl.uniform1f(loc.uSprite,0);gl.uniform1f(loc.uFlash,0);bind(spriteBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);gl.drawArrays(gl.LINES,0,data.length/8);}
  if(mode!=='menu'&&mode!=='tour'){drawCorpses(camera);drawEffects(camera,dt);}updateFlash();drawWeapon();if(mode==='playing'||mode==='spectating')drawHitFeedback(wc,feedback,elapsed,viewProjection,camera,width,height);updateKillFeed();if(mode==='playing'||mode==='tour'||mode==='spectating'||mode==='paused'||mode==='locking')drawMap(camera,actors);$('damage').style.opacity=(mode==='menu'||mode==='tour'||mode==='spectating'||match?.spectator)?0:damageOpacity(health,hurt);$('hitmarker').style.opacity=hit>0?1:0;
requestAnimationFrame(render);
}
function leaveMatch(){leaveOnline();corpses=[];clearMarks(marks);projectiles=[];meds=[];recovering=false;health=100;$('tour-controls').hidden=true;$('kill-feed').hidden=true;$('scoreboard').hidden=true;}
$('leave-match').onclick=leaveMatch;$('end-menu').onclick=leaveMatch;
$('start').onclick=begin;$('retry').onclick=begin;$('restart').onclick=begin;$('resume').onclick=lock;$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'SOUND OFF':'SOUND ON';};
addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'){if(mode==='tour'||mode==='spectating')exitTour();else if(mode==='playing'||mode==='locking')pause();return;}if(mode==='playing'||mode==='tour'){const slot=['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9'].indexOf(e.code);if(slot>=0){if(mode==='tour')switchGun(slot);else if(slot<4)switchGun(loadout[slot]);}}if(mode!=='playing')return;keys.add(e.code);if(e.ctrlKey||e.code==='ControlLeft'||e.code==='ControlRight')e.preventDefault();if(e.code==='KeyR')reloadGun();});addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Tab')updateHud();});
addEventListener('wheel',e=>{if(mode!=='playing'&&mode!=='tour')return;e.preventDefault();wheelAcc+=e.deltaY;if(Math.abs(wheelAcc)<30)return;const dir=Math.sign(wheelAcc);wheelAcc=0;cycleWeapon(dir);},{passive:false});
canvas.addEventListener('mousedown',e=>{if(mode!=='playing'||document.pointerLockElement!==canvas)return;if(e.button===2){aimHeld=true;return;}if(e.button!==0)return;mouseDown=true;shoot();});
addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;if(e.button===2)aimHeld=false;});
addEventListener('mousemove',e=>{if(mode!=='playing')return;const delta=mouseDelta(e,document.pointerLockElement===canvas);const k=.0023/aimZoom(WEAPONS[currentWeapon()],player.ads);player.yaw+=delta.x*k;player.pitch=clamp(player.pitch-delta.y*k,-.85,.85);});
addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('play-url').value=location.href;
$('copy-url').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('copy-url').textContent='COPIED';}catch{$('play-url').focus();$('play-url').select();$('copy-url').textContent='PRESS CTRL+C';}};
$('watch').onclick=()=>begin(true);
document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>{selectedMap=b.dataset.map;try{localStorage.setItem('dead-signal-map',selectedMap);}catch{}syncMap();});
function syncMap(){document.querySelectorAll('[data-map]').forEach(b=>b.classList.toggle('selected',b.dataset.map===selectedMap));$('map-picker').hidden=selectedMode==='drills';if(mode==='menu')applyMap(menuMap());}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{selectedMode=b.dataset.mode;syncMap();document.querySelectorAll('[data-mode]').forEach(item=>item.classList.toggle('selected',item===b));$('start').innerHTML=({teams:'JOIN BLUE TEAM',ctf:'JOIN BLUE TEAM',ffa:'JOIN THE FREE FOR ALL',drills:'START THE DRILL'})[selectedMode]+' <span>↗</span>';$('mode-description').textContent=({teams:'You + 3 bots vs 4 bots · 30 eliminations · 5 minutes',ffa:'You + 7 bots · everyone is an enemy · first to 20 · 5 minutes',ctf:'Hold three 4 m circles for 10 s each · most flags at 5:00 wins',drills:'Solo survival · five waves · health pickups'})[selectedMode];if(mode==='menu')applyMap(menuMap());});
const statBar=(label,v)=>`<span class="stat"><em>${label}</em><u><i style="width:${Math.round(Math.max(.05,Math.min(1,v))*100)}%"></i></u></span>`;
const GRENADE_STATS={6:[['DAMAGE',1],['RADIUS',1]],7:[['BLIND',1],['RADIUS',1]],8:[['COVER',1],['DURATION',.75]]};
const SLOT_ROLES=['PRIMARY','SECONDARY','GRENADE','GRENADE'];
function buildLoadout(){
  const draft={guns:loadout.slice(0,2),nades:loadout.slice(2)};
  $('rank-value').textContent=playerLevel();
  const card=i=>{
    const w=WEAPONS[i],b=document.createElement('button'),locked=!isUnlocked(w);b.dataset.w=i;b.type='button';b.disabled=locked;b.classList.toggle('locked',locked);
    const stats=w.type==='grenade'?GRENADE_STATS[i].map(([l,v])=>statBar(l,v)).join(''):statBar('DAMAGE',w.damage*w.pellets/90)+statBar('RATE',1/(w.interval*7))+statBar('RANGE',w.range/80)+statBar('RECOIL',w.recoil.up/.12);
    b.innerHTML=`<span class="card-art"><canvas width="440" height="168"></canvas></span><strong>${w.name}</strong><small>${w.style}</small>${stats}${locked?`<em class="lock">LOCKED · RANK ${unlockLevel(w)}</em>`:''}`;
    drawWeaponIcon(b.querySelector('canvas').getContext('2d'),i);return b;
  };
  $('gun-grid').replaceChildren(...[0,1,2,3,4,5].map(card));$('grenade-grid').replaceChildren(...[6,7,8].map(card));
  // The kit strip shows the four slots with their weapon art; clicking a filled slot removes it.
  const slots=[0,1,2,3].map(n=>{const b=document.createElement('button');b.type='button';b.className='kit-slot';b.innerHTML=`<span class="slot-no">${n+1}</span><canvas width="300" height="152"></canvas><strong></strong><small>${SLOT_ROLES[n]}</small>`;return b;});
  $('kit').replaceChildren(...slots);
  const sync=()=>{
    document.querySelectorAll('#gun-grid [data-w],#grenade-grid [data-w]').forEach(b=>{const i=Number(b.dataset.w),slot=draft.guns.includes(i)?draft.guns.indexOf(i)+1:draft.nades.includes(i)?draft.nades.indexOf(i)+3:0;b.classList.toggle('selected',!!slot);b.dataset.slot=slot||'';});
    const items=[draft.guns[0],draft.guns[1],draft.nades[0],draft.nades[1]];
    slots.forEach((b,n)=>{const i=items[n],cv=b.querySelector('canvas');b.classList.toggle('empty',i===undefined);b.querySelector('strong').textContent=i===undefined?'EMPTY':WEAPONS[i].short;b.dataset.item=i??'';if(i!==undefined)drawWeaponIcon(cv.getContext('2d'),i);else cv.getContext('2d').clearRect(0,0,cv.width,cv.height);});
    const ok=draft.guns.length===2&&draft.nades.length===2;
    $('gun-count').textContent=`${draft.guns.length} / 2`;$('grenade-count').textContent=`${draft.nades.length} / 2`;$('loadout-done').disabled=!ok;
    if(ok){loadout=[...draft.guns,...draft.nades];try{localStorage.setItem('dead-signal-loadout',JSON.stringify(loadout));}catch{}}
    $('loadout-summary').textContent=loadout.map(i=>WEAPONS[i].short).join(' · ');
  };
  const toggle=i=>{const list=isGrenade(i)?draft.nades:draft.guns;if(list.includes(i))list.splice(list.indexOf(i),1);else{if(list.length>=2)list.shift();list.push(i);}sync();};
  document.querySelectorAll('#gun-grid [data-w],#grenade-grid [data-w]').forEach(b=>b.onclick=()=>toggle(Number(b.dataset.w)));
  slots.forEach(b=>b.onclick=()=>{if(b.dataset.item!=='')toggle(Number(b.dataset.item));});
  $('loadout').onclick=()=>{draft.guns=loadout.slice(0,2);draft.nades=loadout.slice(2);$('rank-value').textContent=playerLevel();sync();$('loadout-panel').hidden=false;};
  const close=()=>{
    $('loadout-panel').hidden=true;
    if(network){network.setLoadout(loadout);if(!loadout.includes(networkWeapon))networkWeapon=loadout[0];}
    else if(mode!=='menu'&&mode!=='tour'&&!loadout.includes(arsenal.selected)){arsenal.selected=loadout[0];arsenal.reload=0;arsenal.cooldown=Math.max(arsenal.cooldown,.2);}
    updateHud();
  };
  $('loadout-done').onclick=close;$('loadout-back').onclick=close;
  $('pause-loadout').onclick=()=>$('loadout').click();
  sync();
}
buildLoadout();
const avatarButtons=[...document.querySelectorAll('[data-avatar]')];
avatarButtons.forEach(b=>{const v=Number(b.dataset.avatar),c=b.querySelector('canvas');drawEnemy(c.getContext('2d'),0,v,false,selectedMode==='teams'?0:null);b.onclick=()=>{selectedAvatar=v;try{localStorage.setItem('dead-signal-avatar',v);}catch{}syncAvatar();};});
function syncAvatar(){avatarButtons.forEach(b=>{const on=Number(b.dataset.avatar)===selectedAvatar;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',on);});$('avatar-name').textContent=CHARACTER_NAMES[selectedAvatar].toUpperCase();}
syncAvatar();
$('tour').onclick=showTour;$('tour-exit').onclick=exitTour;document.querySelectorAll('[data-weapon]').forEach(b=>b.onclick=()=>switchGun(Number(b.dataset.weapon)));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{tourView=Number(b.dataset.view);});
syncMap();
requestAnimationFrame(render);

const offlineHelp=$('pause-help').textContent;
const offlineCaptureHelp=$('capture-help').querySelector('p').innerHTML;
document.querySelectorAll('[data-choose-team]').forEach(button=>button.onclick=()=>{
  for(const prefix of ['room','pause'])$(prefix+'-setup-status').textContent=network?.latest?.started?'Changing team · three-second respawn…':'Changing team…';
  network?.chooseTeam(Number(button.dataset.chooseTeam));
});
for(const prefix of ['room','pause'])$(prefix+'-ai').onchange=event=>{
  network?.setAi(event.target.checked);
  for(const target of ['room','pause'])$(target+'-setup-status').textContent=event.target.checked?'AI enabled · bots fill empty slots.':'AI disabled · human players only.';
};
$('online').onclick=openOnline;$('create-room').onclick=()=>connectOnline(false);$('join-room').onclick=()=>connectOnline(true);
$('start-online').onclick=()=>network?.start();$('close-online').onclick=()=>leaveOnline();
$('copy-room').onclick=async()=>{try{const invite=new URL(location.href);invite.searchParams.set('room',$('online-code').textContent);await navigator.clipboard.writeText(invite.href);$('copy-room').textContent='COPIED';}catch{$('online-message').textContent='Room code: '+$('online-code').textContent;}};
const localHost=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
$('server-address').value=location.port==='2567'?location.origin.replace(/^http/,'ws'):localHost?'ws://127.0.0.1:2567':'';
try{$('player-name').value=localStorage.getItem('dead-signal-name')||'Recruit';$('server-address').value=localStorage.getItem('dead-signal-server')||$('server-address').value;}catch{}
addEventListener('pagehide',()=>network?.leave());
addEventListener('beforeunload',e=>{if(mode==='playing'||mode==='paused'||mode==='locking'){e.preventDefault();e.returnValue='';}});

fetch(new URL('multiplayer-config.json',location.href),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(config=>{
  if(config?.sameOrigin)$('server-address').value=location.origin.replace(/^http/,'ws');
  else if(config?.server){connectionConfig=config;$('server-address').value=config.server;}
}).catch(()=>{});
const invitedRoom=new URL(location.href).searchParams.get('room');
if(invitedRoom&&/^[A-Fa-f0-9]{8}$/.test(invitedRoom)){$('room-code').value=invitedRoom.toUpperCase();openOnline();}
