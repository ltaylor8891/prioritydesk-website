import {clamp,cover,walls,blocked,move,wallDistance,visible,flowField,nextStep,ENEMY_SIZE,spriteCorners,raySprite} from './core.js?v=teams-1';
import {drawEnemy,CHARACTER_WIDTH,CHARACTER_HEIGHT} from './enemy-art.js?v=teams-1';
import {WEAPONS,createArsenal,selectWeapon,startReload,stepWeapon,fireWeapon,drawPlayerWeapon} from './weapons.js?v=teams-1';
import {readyEnemyShot,stepProjectile,ENEMY_GUNS,enemyVolley} from './combat.js?v=teams-1';
import {buildTrainingGround,drawDecal,drawTarget,TRAINING_TARGETS} from './training-ground.js?v=teams-1';
import {mouseDelta} from './mouse-look.js';
import {createPointerLock} from './pointer-lock.js';
import {createMatch,tickMatch,fireMatchWeapon,MATCH_RULES,TEAM_NAMES,TEAM_COLORS} from './team-match.js?v=teams-1';
const $=id=>document.getElementById(id),canvas=$('world'),gl=canvas.getContext('webgl',{antialias:true,alpha:false});
if(!gl){$('unsupported').hidden=false;throw new Error('WebGL unavailable');}
const vertex=`attribute vec3 aPos;attribute vec3 aColor;attribute vec2 aUV;uniform mat4 uVP;varying vec3 vColor;varying vec2 vUV;varying float vDepth;void main(){gl_Position=uVP*vec4(aPos,1.0);vColor=aColor;vUV=aUV;vDepth=gl_Position.w;}`;
const fragment=`precision mediump float;varying vec3 vColor;varying vec2 vUV;varying float vDepth;uniform sampler2D uTexture;uniform float uSprite;uniform float uFlash;void main(){vec4 tex=mix(vec4(1.0),texture2D(uTexture,vUV),uSprite);if(tex.a<0.5)discard;vec3 color=mix(vColor*tex.rgb,vec3(1.0,0.65,0.35),uFlash);float fog=clamp((vDepth-14.0)/65.0,0.0,0.82);gl_FragColor=vec4(mix(color,vec3(0.69,0.75,0.64),fog),1.0);}`;
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const loc=Object.fromEntries(['uVP','uTexture','uSprite','uFlash'].map(n=>[n,gl.getUniformLocation(program,n)]));
const attrs=['aPos','aColor','aUV'].map(n=>gl.getAttribLocation(program,n));
function bind(buffer){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);attrs.forEach((a,i)=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,i===2?2:3,gl.FLOAT,false,32,[0,12,24][i]);});}
function quad(out,points,color,uv=[[0,0],[1,0],[1,1],[0,1]]){for(const i of [0,1,2,0,2,3])out.push(...points[i],...color,...uv[i]);}
function box(out,x,y,z,w,h,d,c){const a=x-w/2,b=x+w/2,l=z-d/2,r=z+d/2,t=y+h;quad(out,[[a,y,r],[b,y,r],[b,t,r],[a,t,r]],c.map(v=>v*.8));quad(out,[[b,y,l],[a,y,l],[a,t,l],[b,t,l]],c.map(v=>v*.6));quad(out,[[a,y,l],[a,y,r],[a,t,r],[a,t,l]],c.map(v=>v*.65));quad(out,[[b,y,r],[b,y,l],[b,t,l],[b,t,r]],c.map(v=>v*.9));quad(out,[[a,t,r],[b,t,r],[b,t,l],[a,t,l]],c);quad(out,[[a,y,l],[b,y,l],[b,y,r],[a,y,r]],c.map(v=>v*.5));}
const trainingGround=buildTrainingGround(box,quad),geometry=trainingGround.geometry;
const worldBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,worldBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geometry),gl.STATIC_DRAW);
const lineBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,lineBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(trainingGround.lines),gl.STATIC_DRAW);
const spriteBuffer=gl.createBuffer();
function texture(draw,width=32,height=48,smooth=false){const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');draw(ctx);const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,smooth?gl.LINEAR:gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,smooth?gl.LINEAR:gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return tex;}
const enemyTextures=[0,1,2].map(variant=>[0,1,2,3].map(frame=>texture(c=>drawEnemy(c,frame,variant),CHARACTER_WIDTH,CHARACTER_HEIGHT,true)));
const firingTextures=[0,1,2].map(variant=>texture(c=>drawEnemy(c,0,variant,true),CHARACTER_WIDTH,CHARACTER_HEIGHT,true));
const teamTextures=[0,1].map(team=>[0,1,2].map(variant=>[0,1,2,3].map(frame=>texture(c=>drawEnemy(c,frame,variant,false,team),CHARACTER_WIDTH,CHARACTER_HEIGHT,true))));
const teamFiringTextures=[0,1].map(team=>[0,1,2].map(variant=>texture(c=>drawEnemy(c,0,variant,true,team),CHARACTER_WIDTH,CHARACTER_HEIGHT,true)));
const teamMarkers=TEAM_COLORS.map((color,i)=>texture(c=>{c.fillStyle=color;c.strokeStyle='#17241f';c.lineWidth=6;c.fillRect(3,3,122,42);c.strokeRect(3,3,122,42);c.fillStyle='#17241f';c.font='bold 21px Arial';c.textAlign='center';c.fillText(TEAM_NAMES[i],64,32);},128,48,true));
const targetTextures=[false,true].map(hit=>texture(c=>drawTarget(c,hit),128,192,true));
const warningTexture=texture(c=>{c.fillStyle='#ffd66b';c.strokeStyle='#20291d';c.lineWidth=5;c.beginPath();c.moveTo(32,3);c.lineTo(61,57);c.lineTo(3,57);c.closePath();c.fill();c.stroke();c.fillStyle='#20291d';c.font='bold 38px Arial';c.textAlign='center';c.fillText('!',32,47);},64,64,true);
const projectileTexture=texture(c=>{c.fillStyle='#ffbd51';c.strokeStyle='#342f21';c.lineWidth=5;c.beginPath();c.arc(16,16,12,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#fff2ad';c.beginPath();c.arc(13,12,5,0,Math.PI*2);c.fill();},32,32,true);
const decalTextures=trainingGround.decals.map(d=>texture(c=>drawDecal(c,d),512,Math.max(64,Math.round(512*d.h/d.w)),true));
const medTexture=texture(c=>{c.fillStyle='#172e32';c.fillRect(4,16,24,22);c.fillStyle='#c8d9b0';c.fillRect(6,17,20,18);c.fillStyle='#ff7849';c.fillRect(13,19,6,14);c.fillRect(9,23,14,6);});
const weaponCanvas=$('weapon'),wc=weaponCanvas.getContext('2d'),map=$('map').getContext('2d');
let arsenal=createArsenal(),projectiles=[],tracers=[],targets=TRAINING_TARGETS.map(t=>({...t,flash:0})),targetHits=0,tourView=0;
let width=0,height=0,now=0,last=0,mode='menu',wave=0,enemies=[],meds=[],kills=0,health=100,recoil=0,hurt=0,hit=0,noticeTime=0,waveWait=0,flow=new Map(),flowTimer=0,elapsed=0,muted=false,audio=null,mouseDown=false;
let match=null,selectedMode='teams';
const keys=new Set();let player={x:0,y:1.65,z:12,yaw:0,pitch:0};
const pointerCapture=createPointerLock(canvas,document,captureState);
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];}
function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function view(p){const s=Math.sin(p.yaw),c=Math.cos(p.yaw),sp=Math.sin(p.pitch),cp=Math.cos(p.pitch),right=[c,0,s],up=[-s*sp,cp,c*sp],back=[-s*cp,-sp,c*cp];return [right[0],up[0],back[0],0,right[1],up[1],back[1],0,right[2],up[2],back[2],0,-right[0]*p.x-right[2]*p.z,-up[0]*p.x-up[1]*p.y-up[2]*p.z,-back[0]*p.x-back[1]*p.y-back[2]*p.z,1];}
function tone(freq,duration,type='square',volume=.035,end=freq){if(muted||!audio)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(1,end),audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);}
function notify(message,time=2){$('notice').textContent=message;noticeTime=time;}
function updateHud(){
  $('health').textContent=Math.ceil(health);$('healthbar').style.width=health+'%';
  $('ammo').textContent=String(arsenal.ammo[arsenal.selected]).padStart(2,'0');$('ammo-max').textContent=WEAPONS[arsenal.selected].capacity;
  $('weapon-state').textContent=arsenal.reload>0?'RELOADING…':WEAPONS[arsenal.selected].name;
  $('wave').textContent=mode==='tour'?'TRAINING GROUND / PREVIEW':`DRILL ${String(wave).padStart(2,'0')} / 05`;
  $('remaining').textContent=mode==='tour'?'EXPLORE THE RANGE':`${enemies.length} HOSTILES · ${targetHits} TARGET HITS`;
  if(match&&mode!=='tour'){
    const seconds=Math.max(0,Math.ceil(MATCH_RULES.timeLimit-match.elapsed));
    $('wave').textContent=`4 vs 4 · ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} · FIRST TO ${MATCH_RULES.scoreLimit}`;
    $('remaining').textContent=`BLUE ${match.scores[0]} — ${match.scores[1]} ORANGE`;
    $('team-status').textContent=match.spectator?'BOT MATCH · SPECTATING · ESC TO EXIT':player.hp<=0?`RESPAWNING IN ${Math.ceil(player.respawn)}…`:player.protection>0?'BLUE TEAM · SPAWN SHIELD':'BLUE TEAM · FRIENDLY FIRE OFF';
    $('kill-feed').replaceChildren(...match.feed.map(e=>{const row=document.createElement('div');row.textContent=e.text;row.style.color=TEAM_COLORS[e.team];return row;}));
    $('score-rows').replaceChildren(...[...match.actors].sort((a,b)=>a.team-b.team||b.kills-a.kills).map(a=>{const row=document.createElement('div');row.className='score-row';row.style.color=TEAM_COLORS[a.team];for(const text of [a.name+(a.human?' (YOU)':' [BOT]'),a.hp<=0?'RESPAWNING':a.human?'PLAYING':a.state,a.kills,a.deaths]){const cell=document.createElement('span');cell.textContent=text;row.append(cell);}return row;}));
  }
  $('team-status').hidden=!match||mode==='tour';$('kill-feed').hidden=!match||mode==='tour';
  $('scoreboard').hidden=!match||(!keys.has('Tab')&&mode!=='ended');
  document.querySelectorAll('[data-weapon]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.weapon)===arsenal.selected));
}
function spawnWave(){wave++;const spots=[[-12,-12],[12,-12],[-12,11],[12,11],[0,-13],[-13,0],[13,0],[5,12],[-5,-13],[11,9],[4,-13],[-12,6]];enemies=[];for(let i=0;i<3+wave;i++){let [x,z]=spots[(i+wave-1)%spots.length];if(Math.hypot(x-player.x,z-player.z)<5){x=-x;z=-z;}enemies.push({x,z,variant:i%enemyTextures.length,yaw:Math.atan2(-x,z),hp:wave>3?3:2,phase:Math.random()*6,attack:1.2+i*.45,aim:0,fire:0,flash:0});}notify(`WAVE ${String(wave).padStart(2,'0')}\nCLEAR THE TRAINING GROUND`,2.5);tone(320,.25,'sine',.045,640);updateHud();}
function begin(spectator=false){
  spectator=spectator===true;document.body.classList.toggle('spectating',spectator);document.body.classList.remove('previewing');match=null;player={x:0,y:1.65,z:12,yaw:0,pitch:0};health=100;arsenal=createArsenal();projectiles=[];tracers=[];targetHits=0;targets=TRAINING_TARGETS.map(t=>({...t,flash:0}));wave=0;kills=0;elapsed=0;meds=[];waveWait=0;hurt=0;hit=0;recoil=0;flowTimer=0;keys.clear();mouseDown=false;mode=spectator?'spectating':'paused';
  $('tour-controls').hidden=!spectator;$('menu').hidden=true;$('end').hidden=true;$('pause').hidden=true;$('hud').hidden=false;
  if(selectedMode==='teams'||spectator){match=createMatch({spectator});if(!spectator){player=match.actors[0];arsenal=player.arsenal;}enemies=match.actors.filter(a=>!a.human);notify(spectator?'BLUE vs ORANGE · BOT MATCH':'BLUE TEAM\nFIRST TO 30 · TAB FOR SCOREBOARD',3);updateHud();}else spawnWave();
  if(spectator)document.body.classList.add('previewing');else lock();
}
function captureState(state,error){
  keys.clear();mouseDown=false;
  document.body.classList.toggle('mouse-captured',state==='locked');
  if(mode==='menu'||mode==='ended'||mode==='tour'||mode==='spectating')return;
  if(state==='locked'){mode='playing';$('pause').hidden=true;return;}
  mode=state==='requesting'?'locking':'paused';$('pause').hidden=false;
  $('resume').disabled=state==='requesting';
  $('capture-help').hidden=state!=='blocked';
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
function reloadGun(){if(mode!=='playing'||(match&&player.hp<=0)||!startReload(arsenal))return;tone(160,.15,'triangle',.06,300);updateHud();}
function switchGun(index){if(selectWeapon(arsenal,index)){recoil=.3;tone(220,.08,'triangle',.03,320);updateHud();}}
function shoot(){
  if(match){
    if(mode!=='playing'||player.hp<=0)return;
    if(arsenal.ammo[arsenal.selected]===0){reloadGun();return;}
    if(fireMatchWeapon(match,player,player.yaw,player.pitch)){recoil=1;tone(arsenal.selected===1?95:170,.15,'sawtooth',.06,32);}
    return;
  }
  if(mode!=='playing')return;if(arsenal.ammo[arsenal.selected]===0){reloadGun();return;}if(!fireWeapon(arsenal))return;
  const weapon=WEAPONS[arsenal.selected];recoil=1;tone(arsenal.selected===1?95:170,.15,'sawtooth',.06,32);
  for(let pellet=0;pellet<weapon.pellets;pellet++){
    const yaw=player.yaw+(Math.random()-.5)*weapon.spread*2,pitch=player.pitch+(Math.random()-.5)*weapon.spread*2,cp=Math.cos(pitch);
    const dir={x:Math.sin(yaw)*cp,y:Math.sin(pitch),z:-Math.cos(yaw)*cp};let nearest=Math.min(weapon.range,wallDistance(player,dir)),target=null,board=null;
    for(const e of enemies){const t=raySprite(player,dir,e,ENEMY_SIZE,Math.sin(now*5+e.phase)*.025);if(t<nearest){nearest=t;target=e;}}
    for(const b of targets){const t=raySprite(player,dir,b,2.2,0);if(t<nearest){nearest=t;target=null;board=b;}}
    if(target){target.hp--;target.flash=.12;hit=.16;if(target.hp<=0){kills++;enemies=enemies.filter(e=>e!==target);if(kills%4===0)meds.push({x:target.x,z:target.z});}}
    if(board){board.flash=.2;targetHits++;hit=.16;tone(580,.08,'triangle',.025,280);}
    tracers.push({a:{x:player.x+Math.cos(player.yaw)*.18,y:player.y-.18,z:player.z+Math.sin(player.yaw)*.18},b:{x:player.x+dir.x*nearest,y:player.y+dir.y*nearest,z:player.z+dir.z*nearest},life:.065});
  }
  updateHud();
}
function damage(amount){health=Math.max(0,health-amount);hurt=.6;tone(70,.15,'sawtooth',.05,30);updateHud();if(health<=0)finish(false);}
function tick(dt){
  if(match&&(mode==='playing'||mode==='spectating')){tickTeams(dt);return;}
  if(mode!=='playing')return;if(document.pointerLockElement!==canvas){pause();return;}
  elapsed+=dt;recoil=Math.max(0,recoil-dt*7);hurt=Math.max(0,hurt-dt);hit=Math.max(0,hit-dt);
  if(stepWeapon(arsenal,dt)){tone(300,.1,'square',.025,500);updateHud();}
  if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').textContent='';}
  if(keys.has('ArrowLeft'))player.yaw-=dt*1.8;if(keys.has('ArrowRight'))player.yaw+=dt*1.8;
  if(keys.has('ArrowUp'))player.pitch=clamp(player.pitch+dt,-.85,.85);if(keys.has('ArrowDown'))player.pitch=clamp(player.pitch-dt,-.85,.85);
  let forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),strafe=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  const norm=Math.hypot(forward,strafe)||1,speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?6:3.8)*dt;forward/=norm;strafe/=norm;
  move(player,(Math.sin(player.yaw)*forward+Math.cos(player.yaw)*strafe)*speed,(-Math.cos(player.yaw)*forward+Math.sin(player.yaw)*strafe)*speed);
  player.y=1.65+(forward||strafe?Math.sin(elapsed*11)*.035:0);
  if((mouseDown||keys.has('Space'))&&WEAPONS[arsenal.selected].automatic)shoot();
  flowTimer-=dt;if(flowTimer<=0){flow=flowField(player);flowTimer=.6;}
  for(const e of enemies){
    e.flash=Math.max(0,e.flash-dt);const d=Math.hypot(player.x-e.x,player.z-e.z),sight=visible(e,player);
    const bullet=readyEnemyShot(e,player,dt,wave,sight);if(bullet){projectiles.push(...enemyVolley(bullet,e.variant));tone(105+e.variant*35,.08,'square',.02,60);}
    // Hold a readable firing stance; move into range when cover blocks a shot.
    if(!e.aim&&e.fire<=0&&(!sight||d>ENEMY_GUNS[e.variant].range*.65)){
      const dest=sight?player:nextStep(e,flow);
      if(dest){let dx=dest.x-e.x,dz=dest.z-e.z;const n=Math.hypot(dx,dz)||1,pace=(1.05+wave*.1)*dt;dx/=n;dz/=n;
        for(const other of enemies){if(other===e)continue;const sep=Math.hypot(e.x-other.x,e.z-other.z);if(sep>0&&sep<.85){dx+=(e.x-other.x)/sep*.6;dz+=(e.z-other.z)/sep*.6;}}
        move(e,dx*pace,dz*pace,.38);
      }
    }
  }
  projectiles=projectiles.filter(b=>{const result=stepProjectile(b,player,dt);if(result==='player'&&mode==='playing')damage(b.damage);return result==='flying';});
  if(mode!=='playing')return;
  tracers=tracers.filter(t=>(t.life-=dt)>0);for(const target of targets)target.flash=Math.max(0,target.flash-dt);
  meds=meds.filter(m=>{if(Math.hypot(m.x-player.x,m.z-player.z)<1&&health<100){health=Math.min(100,health+28);notify('+28 HEALTH',1.2);tone(700,.2,'sine',.05,1000);updateHud();return false;}return true;});
  if(!enemies.length){if(!waveWait){waveWait=3;projectiles=[];notify(wave===5?'TRAINING COMPLETE':'DRILL CLEARED · REARMING',3);arsenal.ammo=WEAPONS.map(w=>w.capacity);arsenal.reload=0;health=Math.min(100,health+15);updateHud();}waveWait-=dt;if(waveWait<=0){waveWait=0;if(wave===5)finish(true);else spawnWave();}}
}
function tickTeams(dt){
  if(mode==='playing'&&document.pointerLockElement!==canvas){pause();return;}
  elapsed+=dt;recoil=Math.max(0,recoil-dt*7);hurt=Math.max(0,hurt-dt);hit=Math.max(0,hit-dt);
  if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').textContent='';}
  if(!match.spectator&&player.hp>0){
    stepWeapon(arsenal,dt);
    if(keys.has('ArrowLeft'))player.yaw-=dt*1.8;if(keys.has('ArrowRight'))player.yaw+=dt*1.8;
    if(keys.has('ArrowUp'))player.pitch=clamp(player.pitch+dt,-.85,.85);if(keys.has('ArrowDown'))player.pitch=clamp(player.pitch-dt,-.85,.85);
    let forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),strafe=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
    const norm=Math.hypot(forward,strafe)||1,speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?6:3.8)*dt;
    move(player,(Math.sin(player.yaw)*forward+Math.cos(player.yaw)*strafe)*speed/norm,(-Math.cos(player.yaw)*forward+Math.sin(player.yaw)*strafe)*speed/norm);
    player.y=1.65+(forward||strafe?Math.sin(elapsed*11)*.035:0);player.heading=player.yaw;
    if((mouseDown||keys.has('Space'))&&WEAPONS[arsenal.selected].automatic)shoot();
  }
  tickMatch(match,dt);
  for(const e of match.events){
    if(e.type==='shot'){tracers.push({...e,life:.08});if(e.shooter!==0||match.spectator)tone(120,.06,'square',.012,60);}
    if(e.type==='hit'&&e.shooter===0&&!match.spectator)hit=.16;
    if(e.type==='hit'&&e.victim===0&&!match.spectator){hurt=.6;tone(70,.15,'sawtooth',.05,30);}
    if(e.type==='respawn'&&e.actor===0&&!match.spectator){arsenal=player.arsenal;mouseDown=false;keys.clear();notify('BACK IN · BLUE TEAM',1);}
    if(e.type==='kill'&&e.victim===0&&!match.spectator){mouseDown=false;keys.clear();}
  }
  match.events.length=0;health=match.spectator?100:player.hp;enemies=match.actors.filter(a=>!a.human&&a.hp>0);
  tracers=tracers.filter(t=>(t.life-=dt)>0);updateHud();
  if(match.ended){
    mode='ended';mouseDown=false;keys.clear();$('end').hidden=false;$('hud').hidden=true;$('tour-controls').hidden=true;
    $('end-label').textContent='MATCH COMPLETE';$('end-title').textContent=match.winner===null?'DRAW.':`${TEAM_NAMES[match.winner]} WINS.`;
    $('end-description').textContent=`Blue ${match.scores[0]} — ${match.scores[1]} Orange. ${match.spectator?'Bot match complete.':`You: ${player.kills} eliminations / ${player.deaths} deaths.`} First to 30, five-minute limit.`;
    $('scoreboard').hidden=true;pointerCapture.release();
  }
}
function drawSprite(e,tex,camera,size=ENEMY_SIZE,base=0,flash=0){const data=[];quad(data,spriteCorners(e,e.yaw??camera.yaw,size,base),[1,1,1],[[0,1],[1,1],[1,0],[0,0]]);bind(spriteBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1f(loc.uFlash,flash);gl.drawArrays(gl.TRIANGLES,0,6);}
function drawWeapon(){wc.clearRect(0,0,width,height);if(mode==='menu'||mode==='ended'||mode==='spectating'||(match&&player.hp<=0))return;const moving=mode==='playing'&&(keys.has('KeyW')||keys.has('KeyS')||keys.has('KeyA')||keys.has('KeyD'));drawPlayerWeapon(wc,width,height,{selected:arsenal.selected,recoil,reload:arsenal.reload,bob:moving?Math.sin(elapsed*10)*4:0,time:now});}
function drawDecalPlane(d,tex){const c=Math.cos(d.yaw)*d.w/2,s=Math.sin(d.yaw)*d.w/2,data=[];quad(data,[[d.x-c,d.y,d.z-s],[d.x+c,d.y,d.z+s],[d.x+c,d.y+d.h,d.z+s],[d.x-c,d.y+d.h,d.z-s]],[1,1,1],[[0,1],[1,1],[1,0],[0,0]]);bind(spriteBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1f(loc.uFlash,0);gl.drawArrays(gl.TRIANGLES,0,6);}
function showTour(){document.body.classList.remove('spectating');match=null;mode='tour';document.body.classList.add('previewing');$('menu').hidden=true;$('pause').hidden=true;$('hud').hidden=false;$('tour-controls').hidden=false;$('notice').textContent='';health=100;arsenal=createArsenal();updateHud();}
function exitTour(){document.body.classList.remove('spectating');match=null;enemies=[];tracers=[];mode='menu';document.body.classList.remove('previewing');$('menu').hidden=false;$('hud').hidden=true;$('tour-controls').hidden=true;}
function drawMap(camera=player,actors=enemies){map.clearRect(0,0,150,150);map.fillStyle='#a6b49e55';for(const b of [...cover,...walls])map.fillRect(75+(b.x-b.w/2)*4,75+(b.z-b.d/2)*4,b.w*4,b.d*4);for(const e of actors){if(match&&!match.spectator&&e.team!==player.team&&!visible(player,e))continue;map.fillStyle=e.team===undefined?'#ff7950':TEAM_COLORS[e.team];map.fillRect(73+e.x*4,73+e.z*4,4,4);}map.fillStyle='#68e4c2';for(const m of meds)map.fillRect(73+m.x*4,73+m.z*4,4,4);map.save();map.translate(75+camera.x*4,75+camera.z*4);map.rotate(camera.yaw);map.fillStyle='#f5edcc';map.beginPath();map.moveTo(0,-5);map.lineTo(4,4);map.lineTo(0,2);map.lineTo(-4,4);map.fill();map.restore();}
function render(time){
  now=time/1000;const dt=Math.min(now-last,.04);last=now;
  if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;canvas.width=Math.round(width*Math.min(devicePixelRatio,1.5));canvas.height=Math.round(height*Math.min(devicePixelRatio,1.5));weaponCanvas.width=width;weaponCanvas.height=height;gl.viewport(0,0,canvas.width,canvas.height);}
  tick(dt);if(mode==='tour')recoil=Math.max(0,recoil-dt*7);
  const views=[{x:2.8,y:1.75,z:12,yaw:-.16,pitch:.04},{x:-12,y:1.75,z:-5,yaw:0,pitch:0},{x:11.5,y:1.75,z:10,yaw:-.18,pitch:.02}];
  const camera=mode==='menu'?{x:8+Math.sin(now*.035),y:2.3,z:13,yaw:-.4,pitch:.03}:mode==='tour'||mode==='spectating'?views[tourView]:player;
  gl.clearColor(.69,.75,.64,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);
  gl.uniformMatrix4fv(loc.uVP,false,multiply(perspective(1.18,width/height,.07,110),view(camera)));
  gl.uniform1f(loc.uSprite,0);gl.uniform1f(loc.uFlash,0);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);
  bind(worldBuffer);gl.drawArrays(gl.TRIANGLES,0,geometry.length/8);gl.disable(gl.POLYGON_OFFSET_FILL);
  bind(lineBuffer);gl.lineWidth(1.5);gl.drawArrays(gl.LINES,0,trainingGround.lines.length/8);
  gl.uniform1f(loc.uSprite,1);for(const [i,d] of trainingGround.decals.entries())drawDecalPlane(d,decalTextures[i]);
  for(const t of targets)drawSprite(t,targetTextures[t.flash>0?1:0],camera,2.2,0);
  const actors=mode==='menu'||mode==='tour'?[{x:8,z:8,variant:0,yaw:-.25,phase:0,flash:0},{x:12,z:1,variant:1,yaw:-.5,phase:1,flash:0},{x:-10,z:-8,variant:2,yaw:0,phase:2,flash:0}].map((a,i)=>({...a,team:mode==='menu'&&selectedMode==='teams'?(i===0?0:1):undefined})):enemies;
  for(const e of actors){
    const frame=e.aim>0?0:Math.floor(now*5+e.phase)%4;const tex=e.team===undefined?(e.fire>0?firingTextures[e.variant]:enemyTextures[e.variant??0][frame]):(e.fire>0?teamFiringTextures[e.team][e.variant]:teamTextures[e.team][e.variant][frame]);
    drawSprite(e,tex,camera,ENEMY_SIZE,Math.sin(now*5+e.phase)*.025,e.flash>0?.65:0);
    if(e.team!==undefined)drawDecalPlane({x:e.x,y:2.4,z:e.z,w:.85,h:.32,yaw:camera.yaw},teamMarkers[e.team]);
    if(e.aim>0&&e.team===undefined)drawDecalPlane({x:e.x,y:2.5,z:e.z,w:.42,h:.42,yaw:camera.yaw},warningTexture);
  }
  for(const b of projectiles)drawDecalPlane({x:b.x,y:b.y-.1,z:b.z,w:.2,h:.2,yaw:camera.yaw},projectileTexture);
  for(const m of meds)drawSprite(m,medTexture,camera,1.1,.1+Math.sin(now*3)*.1);
  if(tracers.length){const data=[];for(const t of tracers)for(const p of [t.a,t.b])data.push(p.x,p.y,p.z,1,.83,.42,0,0);gl.uniform1f(loc.uSprite,0);gl.uniform1f(loc.uFlash,0);bind(spriteBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);gl.drawArrays(gl.LINES,0,data.length/8);}
  drawWeapon();if(mode==='playing'||mode==='tour'||mode==='spectating')drawMap(camera,actors);$('damage').style.opacity=hurt;$('hitmarker').style.opacity=hit>0?1:0;
requestAnimationFrame(render);
}
$('start').onclick=begin;$('retry').onclick=begin;$('restart').onclick=begin;$('resume').onclick=lock;$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'SOUND OFF':'SOUND ON';};
addEventListener('keydown',e=>{if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'){if(mode==='tour'||mode==='spectating')exitTour();else if(mode==='playing'||mode==='locking')pause();return;}if(mode==='playing'||mode==='tour'){const slot=['Digit1','Digit2','Digit3'].indexOf(e.code);if(slot>=0)switchGun(slot);}if(mode!=='playing')return;keys.add(e.code);if(e.code==='Space'&&!e.repeat)shoot();if(e.code==='KeyR')reloadGun();});addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Tab')updateHud();});
canvas.addEventListener('mousedown',e=>{if(mode!=='playing'||document.pointerLockElement!==canvas||e.button!==0)return;mouseDown=true;shoot();});
addEventListener('mouseup',()=>{mouseDown=false;});
addEventListener('mousemove',e=>{if(mode!=='playing')return;const delta=mouseDelta(e,document.pointerLockElement===canvas);player.yaw+=delta.x*.0023;player.pitch=clamp(player.pitch-delta.y*.0023,-.85,.85);});
addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('play-url').value=location.href;
$('copy-url').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('copy-url').textContent='COPIED';}catch{$('play-url').focus();$('play-url').select();$('copy-url').textContent='PRESS CTRL+C';}};
$('watch').onclick=()=>begin(true);
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{selectedMode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(item=>item.classList.toggle('selected',item===b));$('start').innerHTML=(selectedMode==='teams'?'JOIN BLUE TEAM':'START THE DRILL')+' <span>↗</span>';$('mode-description').textContent=selectedMode==='teams'?'You + 3 bots vs 4 bots · 30 eliminations · 5 minutes':'Solo survival · five waves · health pickups';});
$('tour').onclick=showTour;$('tour-exit').onclick=exitTour;document.querySelectorAll('[data-weapon]').forEach(b=>b.onclick=()=>switchGun(Number(b.dataset.weapon)));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{tourView=Number(b.dataset.view);});
requestAnimationFrame(render);
