import {turnActor,facingTarget,angleDifference,updateWalk} from './actor-motion.js?v=season-1';
import {makeCorpse,CORPSE_LIFETIME,recoverHealth} from './life-effects.js?v=season-1';
import {world,groundAt,walkableLine,blocked,move,visible,cover,flowField,nextStep,wallDistance,raySprite,ENEMY_SIZE} from './core.js?v=season-1';
import {WEAPONS,aimSpread,bloomSpread,createArsenal,stepWeapon,fireWeapon,startReload} from './weapons.js?v=season-1';
import {raySphere} from './combat.js?v=season-1';
import {createGrenade,stepGrenade,flashStrength,flashDurations,inFieldOfView,actorEye,clearLine,isBlind,fragDamageAt,GRENADE,createCloud,smokeBlocks} from './grenades.js?v=season-1';

export const MATCH_RULES={teamSize:4,scoreLimit:30,timeLimit:300,respawn:3,protection:1.5};
// tdm: two squads to 30. ffa: eight players, everyone is an enemy, first to 20. ctf: hold flag circles.
export const MODES={
  tdm:{name:'TEAM DEATHMATCH',short:'4 vs 4',scoreLimit:30,timeLimit:300},
  ffa:{name:'FREE FOR ALL',short:'FREE FOR ALL',scoreLimit:20,timeLimit:300},
  ctf:{name:'CAPTURE THE FLAG',short:'CAPTURE THE FLAG',scoreLimit:Infinity,timeLimit:300}
};
export const ZONE_RADIUS=4,CAPTURE_SECONDS=10;
export const FFA_COLORS=['#73c5ef','#ffae67','#a5e08a','#e58ad0','#f3dd6b','#b69cf2','#7fe0d2','#f08a80'];
export const sameSide=(match,a,b)=>match.mode==='ffa'?a.id===b.id:a.team===b.team;
export const TEAM_NAMES=['BLUE','ORANGE'];
export const TEAM_COLORS=['#73c5ef','#ffae67'];
const names=[['You','Patch','Scout','Beans'],['Brick','Pip','Moss','Rook']];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const bearing=(a,b)=>Math.atan2(b.x-a.x,a.z-b.z);
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function createMatch({spectator=false,random=Math.random,mode='tdm'}={}){
  if(!MODES[mode])throw new Error('Unknown game mode.');
  const match={actors:[],corpses:[],scores:[0,0],elapsed:0,ended:false,winner:null,events:[],feed:[],random,spectator,mode,timeLimit:MODES[mode].timeLimit,
    grenades:[],clouds:[],bolts:[],nextId:1,
    zones:mode==='ctf'?(world.zones||[]).map(([x,z])=>({x,z,r:ZONE_RADIUS,owner:null,capturer:null,progress:0,contested:false,present:[0,0]})):[],held:[0,0]};
  for(let team=0;team<2;team++)for(let slot=0;slot<4;slot++){
    const id=team*4+slot,arsenal=createArsenal();arsenal.selected=slot%3;
    const a={id,team,name:slot===0&&team===0&&spectator?'Finch':names[team][slot],human:!spectator&&id===0,
      x:world.spawns[id][0],z:world.spawns[id][1],y:1.65+groundAt(world.spawns[id][0],world.spawns[id][1]),fy:groundAt(world.spawns[id][0],world.spawns[id][1]),climb:0,yaw:team===0?0:Math.PI,pitch:0,
      heading:team===0?0:Math.PI,variant:slot%3,phase:random()*6,flash:0,fire:0,aim:0,
      hp:100,maxHp:100,lastDamage:-Infinity,recovering:false,kills:0,deaths:0,respawn:0,protection:MATCH_RULES.protection,arsenal,
      targetId:null,memory:null,reaction:0,think:0,route:id,goal:null,path:null,pathTimer:0,
      burst:0,rest:0,strafe:slot%2?1:-1,state:'PATROL',lastAttacker:null,flankGoal:null,crouch:0,lift:0,vy:0,ads:0,bloom:0,blindStart:-100,blindHold:0,blindFade:0};
    if(!a.human)a.yaw=a.heading+Math.PI;Object.assign(a,{moving:false,walkPhase:0});match.actors.push(a);
  }
  return match;
}
export const flagCounts=match=>[0,1].map(t=>match.zones.filter(z=>z.owner===t).length);
export function endMatch(match){
  match.ended=true;
  if(match.mode==='ffa'){
    const best=Math.max(...match.actors.filter(a=>!a.disabled).map(a=>a.kills)),leaders=match.actors.filter(a=>!a.disabled&&a.kills===best);
    match.winner=best>0&&leaders.length===1?leaders[0].id:null;return;
  }
  if(match.mode==='ctf'){
    // Most flags at the final whistle wins; held time breaks a tie.
    const flags=flagCounts(match),held=match.held.map(s=>Math.round(s*10));
    match.winner=flags[0]!==flags[1]?(flags[0]>flags[1]?0:1):held[0]!==held[1]?(held[0]>held[1]?0:1):null;return;
  }
  match.winner=match.scores[0]===match.scores[1]?null:match.scores[0]>match.scores[1]?0:1;
}
// Standing alone in a circle for ten seconds takes it. Opposing players freeze it; an empty circle slowly resets.
export function tickZones(match,dt){
  match.zones.forEach((z,i)=>{
    const n=[0,0];
    for(const a of match.actors)if(a.hp>0&&!a.disabled&&Math.hypot(a.x-z.x,a.z-z.z)<=z.r)n[a.team]++;
    z.present=n;z.contested=n[0]>0&&n[1]>0;
    if(!z.contested&&n[0]+n[1]>0){
      const team=n[0]>0?0:1;
      if(z.owner===team){z.progress=0;z.capturer=null;}
      else{
        if(z.capturer!==team){z.capturer=team;z.progress=0;}
        z.progress+=dt;
        if(z.progress>=CAPTURE_SECONDS-1e-9){z.owner=team;z.progress=0;z.capturer=null;match.events.push({type:'capture',zone:i,team});}
      }
    }else if(!z.contested){z.progress=Math.max(0,z.progress-dt);if(z.progress===0)z.capturer=null;}
    if(z.owner!==null)match.held[z.owner]+=dt;
  });
}
export function applyDamage(match,victim,shooter,amount,label=null){
  if(match.ended||victim.hp<=0||victim.protection>0||sameSide(match,victim,shooter))return false;
  const dealt=Math.min(victim.hp,amount);
  victim.hp=Math.max(0,victim.hp-amount);victim.flash=.15;victim.lastAttacker=shooter.id;
  victim.lastDamage=match.elapsed;victim.recovering=false;
  match.events.push({type:'hit',victim:victim.id,shooter:shooter.id,amount:dealt,x:victim.x,z:victim.z,fy:victim.fy||0});
  if(victim.hp===0){
    match.corpses.push(makeCorpse(victim,match.elapsed));
    victim.deaths++;victim.respawn=MATCH_RULES.respawn;victim.state='RESPAWNING';victim.aim=0;
    shooter.kills++;match.scores[shooter.team]++;
    match.feed.unshift({text:`${shooter.name} → ${victim.name}`,killer:shooter.name,victim:victim.name,
      weapon:label||WEAPONS[shooter.arsenal.selected].short,team:shooter.team,victimTeam:victim.team,time:match.elapsed});match.feed=match.feed.slice(0,4);
    match.events.push({type:'kill',victim:victim.id,shooter:shooter.id});
    if(match.mode==='ffa'?shooter.kills>=MODES.ffa.scoreLimit:match.scores[shooter.team]>=MODES[match.mode].scoreLimit)endMatch(match);
  }
  return true;
}
// The furthest, least exposed available spawn is chosen at each respawn.
export function chooseSpawn(match,actor){
  let best=null,bestScore=-Infinity;
  for(const [x,z] of world.spawns){
    const p={x,z,fy:groundAt(x,z)};let score=100;
    for(const other of match.actors){
      if(other===actor||other.hp<=0)continue;
      if(!sameSide(match,other,actor))score=Math.min(score,distance(p,other)-(visible(p,other)?8:0));
      else if(distance(p,other)<1.4)score-=30;
    }
    if(score>bestScore){bestScore=score;best=p;}
  }
  return best;
}
function respawnActor(match,a){
  const p=chooseSpawn(match,a),selected=a.arsenal.selected;
  Object.assign(a,{x:p.x,z:p.z,fy:p.fy,y:p.fy+1.65,climb:0},{hp:100,lastDamage:-Infinity,recovering:false,protection:MATCH_RULES.protection,respawn:0,yaw:p.z>0?0:Math.PI,pitch:0,
    heading:p.z>0?0:Math.PI,arsenal:createArsenal(),targetId:null,memory:null,goal:null,path:null,
    reaction:0,burst:0,rest:.5,think:0,aim:0,fire:0,flash:0,state:'PATROL',flankGoal:null,crouch:0,lift:0,vy:0,ads:0,bloom:0,blindStart:-100,blindHold:0,blindFade:0});
  a.arsenal.selected=selected;if(!a.human)a.yaw=a.heading+Math.PI;a.moving=false;a.walkPhase=0;match.events.push({type:'respawn',actor:a.id});
}
export function canSee(observer,target,match=null){
  if(target.hp<=0||(match?.mode==='ffa'?observer.id===target.id:observer.team===target.team))return false;
  if(match&&(isBlind(observer,match.elapsed)||(match.clouds?.length&&smokeBlocks(match.clouds,actorEye(observer),actorEye(target)))))return false;
  const d=distance(observer,target);
  return d<(world.sight??26)&&(d<2.5||Math.abs(angleDiff(bearing(observer,target),observer.heading))<Math.PI*.34)&&visible(observer,target);
}
// Sound gives an approximate location, never a live target through a wall.
export function hearShot(match,shooter){
  for(const a of match.actors){
    if(a.human||a.hp<=0||sameSide(match,a,shooter)||a.targetId!==null)continue;
    const d=distance(a,shooter);
    if(d<(visible(a,shooter)?16:8)){
      a.memory={x:Math.round(shooter.x/2)*2,z:Math.round(shooter.z/2)*2,until:match.elapsed+3};
      a.state='INVESTIGATE';a.think=0;
    }
  }
}
export function fireMatchWeapon(match,shooter,yaw,pitch=0,extraSpread=0,power=GRENADE.defaultPower){
  const facing=shooter.human?shooter.yaw:shooter.heading;
  if(!Number.isFinite(facing)||Math.abs(angleDifference(yaw,facing))>.10)return false;
  if(!shooter.human&&Math.abs(angleDifference(shooter.yaw,shooter.heading+Math.PI))>.001)return false;
  if(match.ended||shooter.hp<=0||shooter.climb>0||!fireWeapon(shooter.arsenal))return false;
  const w=WEAPONS[shooter.arsenal.selected],origin={x:shooter.x,y:shooter.human?shooter.y:(shooter.fy||0)+1.35,z:shooter.z};
  shooter.protection=0;
  if(w.type==='grenade'){
    match.grenades.push(createGrenade(match.nextId++,w.kind,shooter.id,origin,yaw,pitch,power));
    match.events.push({type:'throw',shooter:shooter.id,kind:w.kind,power:Number.isFinite(power)?Math.max(0,Math.min(1,power)):GRENADE.defaultPower,x:origin.x,y:origin.y,z:origin.z});
    return true;
  }
  shooter.fire=.12;if(!w.projectile)hearShot(match,shooter);
  if(w.projectile){const spread=shooter.human?aimSpread(w,shooter.ads):w.spread;yaw+=(match.random()-.5)*2*spread;pitch+=(match.random()-.5)*2*spread;const dir={x:Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)};match.bolts.push({id:match.nextId++,owner:shooter.id,...origin,vx:dir.x*48,vy:dir.y*48,vz:dir.z*48,remaining:w.range});match.events.push({type:'bolt-launch',shooter:shooter.id,weapon:10,a:{...origin},b:{x:origin.x+dir.x,y:origin.y+dir.y,z:origin.z+dir.z}});return true;}
  const bloomNow=shooter.bloom||0;
  shooter.lastShot=match.elapsed;
  if(shooter.human&&w.bloom)shooter.bloom=Math.min(1,bloomNow+w.bloom.perShot);
  for(let n=0;n<w.pellets;n++){
    const base=shooter.human&&w.hip!==undefined?aimSpread(w,shooter.ads)+bloomSpread(w,bloomNow,shooter.ads):w.spread;
    const y=yaw+(match.random()-.5)*2*(base+extraSpread),p=pitch+(match.random()-.5)*2*(base+extraSpread);
    const dir={x:Math.sin(y)*Math.cos(p),y:Math.sin(p),z:-Math.cos(y)*Math.cos(p)};
    let near=Math.min(w.range,wallDistance(origin,dir)),victim=null;
    for(const other of match.actors){
      if(other===shooter||other.hp<=0)continue;
      const d=other.human&&!match.network?raySphere(origin,dir,{x:other.x,y:(other.fy||0)+1.25-(other.crouch||0)*.35,z:other.z},.62):raySprite(origin,dir,other.human?{...other,yaw:other.yaw+Math.PI}:other,ENEMY_SIZE*(1-.28*(other.crouch||0)),other.fy||0);
      if(d<near){near=d;victim=other;}
    }
    if(victim)applyDamage(match,victim,shooter,w.damage);
    match.events.push({type:'shot',shooter:shooter.id,team:shooter.team,weapon:shooter.arsenal.selected,a:{...origin},b:{x:origin.x+dir.x*near,y:origin.y+dir.y*near,z:origin.z+dir.z*near}});
  }
  return true;
}
export function stepBolts(match,dt){
  match.bolts=match.bolts.filter(b=>{if(match.ended)return false;const shooter=match.actors[b.owner],speed=Math.hypot(b.vx,b.vy,b.vz),dir={x:b.vx/speed,y:b.vy/speed,z:b.vz/speed},origin={x:b.x,y:b.y,z:b.z},travel=Math.min(speed*dt,b.remaining),wall=wallDistance(origin,dir);let near=Math.min(travel,wall),victim=null;
    for(const other of match.actors){if(other===shooter||other.hp<=0||other.disabled)continue;const d=other.human&&!match.network?raySphere(origin,dir,{x:other.x,y:(other.fy||0)+1.25-(other.crouch||0)*.35,z:other.z},.62):raySprite(origin,dir,other.human?{...other,yaw:other.yaw+Math.PI}:other,ENEMY_SIZE*(1-.28*(other.crouch||0)),other.fy||0);if(d<near){near=d;victim=other;}}
    b.x+=dir.x*near;b.y+=dir.y*near;b.z+=dir.z*near;b.remaining-=near;b.vy-=2*dt;
    if(victim||wall<=travel||b.remaining<=0){if(victim)applyDamage(match,victim,shooter,100,'CROSSBOW');match.events.push({type:'bolt-impact',a:origin,b:{x:b.x,y:b.y,z:b.z}});return false;}return true;
  });
}
function detonate(match,g){
  const thrower=match.actors[g.owner];
  match.events.push({type:'explode',kind:g.kind,x:g.x,y:g.y,z:g.z});
  if(g.kind==='smoke'){match.clouds.push(createCloud(match.nextId++,g.x,g.z));return;}
  for(const a of match.actors){
    if(a.disabled||a.hp<=0)continue;
    if(g.kind==='frag'){
      const chest={x:a.x,y:.95+(a.fy||0)-(a.crouch||0)*.3,z:a.z},d=Math.hypot(chest.x-g.x,chest.y-g.y,chest.z-g.z),dmg=fragDamageAt(d);
      if(dmg>0&&thrower&&clearLine({x:g.x,y:Math.max(g.y,.5),z:g.z},chest))applyDamage(match,a,thrower,dmg,'FRAG');
    }else{
      const eye=actorEye(a),d=Math.hypot(eye.x-g.x,eye.y-g.y,eye.z-g.z),strength=flashStrength(d);
      if(strength<=0||!inFieldOfView(a,eye,g)||!clearLine(g,eye))continue;
      const {hold,fade}=flashDurations(strength);
      // A weaker flash never shortens one still running.
      if(match.elapsed+hold+fade>a.blindStart+a.blindHold+a.blindFade){a.blindStart=match.elapsed;a.blindHold=hold;a.blindFade=fade;}
    }
  }
}
export function stepGrenades(match,dt){
  for(const g of match.grenades){
    g.fuse-=dt;stepGrenade(g,dt);
    if(g.impact>2&&g.fuse>0)match.events.push({type:'bounce',kind:g.kind,x:g.x,y:g.y,z:g.z,force:Math.min(1,g.impact/10)});
  }
  const live=[];
  for(const g of match.grenades){if(g.fuse<=0)detonate(match,g);else live.push(g);}
  match.grenades=live;
  for(const c of match.clouds)c.age+=dt;
  match.clouds=match.clouds.filter(c=>c.age<c.life);
}
function coverGoal(match,a,threat){
  let best=null,score=Infinity;
  for(const c of cover){
    if(c.h<1.5)continue;
    for(const [x,z] of [[c.x-c.w/2-.9,c.z],[c.x+c.w/2+.9,c.z],[c.x,c.z-c.d/2-.9],[c.x,c.z+c.d/2+.9]]){
      const p={x,z};if(blocked(x,z,.42)||visible(p,threat))continue;
      const crowded=match.actors.some(o=>o!==a&&o.hp>0&&distance(o,p)<1.4);
      const value=distance(a,p)+(crowded?10:0);
      if(value<score){score=value;best=p;}
    }
  }
  return best;
}
export function chooseFlankGoal(a,known){
  const heading=bearing(a,known);
  return world.routes.map(([x,z])=>({x,z})).filter(p=>distance(p,a)>2&&distance(p,known)>3&&distance(p,known)<(world.half>20?26:12)
    &&Math.abs(angleDiff(bearing(a,p),heading))>.45&&!blocked(p.x,p.z,.42))
    .sort((p,q)=>(distance(a,p)+distance(p,known))-(distance(a,q)+distance(q,known)))[0]||null;
}
// Bots in capture mode head for a circle their team does not hold; with all three held they defend them.
function zoneSpot(z,a){
  for(const r of [2.6,1.8,3.4])for(let k=0;k<8;k++){
    const t=(k+a.id)*Math.PI/4,p={x:z.x+Math.cos(t)*r,z:z.z+Math.sin(t)*r};
    if(!blocked(p.x,p.z,.5)&&!blocked(Math.round(p.x),Math.round(p.z),.42))return p;
  }
  return {x:z.x,z:z.z};
}
export function zoneGoal(match,a){
  if(!match.zones.length)return null;
  const needing=match.zones.filter(z=>z.owner!==a.team),pool=needing.length?needing:match.zones;
  const z=pool[((a.id%4)+(a.zoneShift||0))%pool.length];
  return {zone:z,spot:zoneSpot(z,a),inside:Math.hypot(a.x-z.x,a.z-z.z)<z.r-.9};
}
// Walks towards a goal along the flow field. Returns false when there is no way there (an unreachable goal such as a
// command post, or a bot that has been jammed in place), so the caller can drop the goal and pick another.
function travel(match,a,goal,dt,speed=3.0){
  if(!goal)return false;
  if(!a.goal||distance(goal,a.goal)>1||a.pathTimer<=0){a.goal={...goal};a.path=flowField(goal);a.pathTimer=world.half>20?1.8:.7;}
  a.pathTimer-=dt;
  // A straight dash is only allowed where the line is both clear and level (sight alone would walk bots off ledges).
  const dest=visible(a,goal)&&walkableLine(a,goal)?goal:nextStep(a,a.path);
  if(!dest)return false;
  const now=match.elapsed;
  if(!a.watch||now-a.watch.t>1.5){
    const jammed=a.watch&&Math.hypot(a.x-a.watch.x,a.z-a.watch.z)<.35&&distance(a,goal)>1.2;
    a.jams=jammed?(a.jams||0)+1:0;
    if(jammed){a.pathTimer=0;a.goal=null;}
    a.watch={x:a.x,z:a.z,t:now};
    if(a.jams>=2){a.jams=0;return false;}
  }
  let dx=dest.x-a.x,dz=dest.z-a.z,n=Math.hypot(dx,dz);if(n<.15)return true;
  dx/=n;dz/=n;
  // Two bots meeting head-on in a narrow lane would shove each other forever; the lower id waits a moment.
  let blocking=false;
  for(const o of match.actors){
    if(o===a||o.hp<=0||!o.vel)continue;
    if(distance(a,o)<1.7&&(dx*o.vel.x+dz*o.vel.z)<-.4&&((o.x-a.x)*dx+(o.z-a.z)*dz)>0&&a.id<o.id){blocking=true;break;}
  }
  if(blocking&&(a.yielded=(a.yielded||0)+dt)<1.2){a.vel={x:0,z:0};return true;}
  if(!blocking)a.yielded=0;
  a.vel={x:dx,z:dz};
  for(const o of match.actors){if(o===a||o.hp<=0)continue;const d=distance(a,o);if(d>.01&&d<.9){dx+=(a.x-o.x)/d;dz+=(a.z-o.z)/d;}}
  n=Math.hypot(dx,dz)||1;move(a,dx/n*speed*dt,dz/n*speed*dt,.38);
  if(a.targetId===null)turnActor(a,Math.atan2(dx,-dz),dt,2.2);
  return true;
}
function botTick(match,a,dt){
  stepWeapon(a.arsenal,dt);a.rest=Math.max(0,a.rest-dt);a.think-=dt;
  if(a.think<=0){
    a.think=.16+match.random()*.12;
    const seen=match.actors.filter(t=>canSee(a,t,match)).sort((b,c)=>distance(a,b)-distance(a,c));
    const target=seen.find(t=>t.id===a.targetId)||seen[0];
    if(target){
      if(a.targetId!==target.id){a.reaction=.35+match.random()*.4;a.burst=0;}
      a.targetId=target.id;a.memory={x:target.x,z:target.z,until:match.elapsed+4};
    }else{
      if(a.targetId!==null&&a.memory&&a.id%2===0)a.flankGoal=chooseFlankGoal(a,a.memory);
      a.targetId=null;a.aim=0;
    }
  }
  const target=match.actors.find(t=>t.id===a.targetId&&t.hp>0);
  // A fresh LOS check is required before every shot, even between perception updates.
  const sight=target&&canSee(a,target,match);
  if(a.memory?.until<match.elapsed){a.memory=null;a.flankGoal=null;}
  if(a.arsenal.ammo[a.arsenal.selected]===0)startReload(a.arsenal);
  if(a.arsenal.reload>0||(a.hp<35&&sight&&a.rest>0)){
    a.state=a.arsenal.reload>0?'RELOADING':'FALL BACK';a.aim=0;
    const goal=a.memory&&coverGoal(match,a,a.memory);if(goal)travel(match,a,goal,dt,3.5);
    return;
  }
  if(sight){
    a.state='ENGAGE';a.flankGoal=null;a.reaction=Math.max(0,a.reaction-dt);a.aim=a.reaction;
    const desired=bearing(a,target);turnActor(a,desired,dt);
    const d=distance(a,target),w=WEAPONS[a.arsenal.selected],preferred=a.variant===1?7:12;
    if(d>Math.min(w.range*.75,preferred+3)){travel(match,a,target,dt);}
    else{
      // Short lateral steps and reversals, with collision and squad separation.
      if(match.random()<dt*.6)a.strafe*=-1;
      move(a,Math.cos(desired)*a.strafe*dt*1.3,Math.sin(desired)*a.strafe*dt*1.3,.38);
    }
    if(a.reaction===0&&a.rest===0&&facingTarget(a,target)&&d<w.range){
      if(a.burst===0)a.burst=2+Math.floor(match.random()*3);
      // Aim at the observed body, with finite error that grows while moving or hurt.
      if(fireMatchWeapon(match,a,a.heading,0,.025+(a.hp<40?.025:.01))){
        a.burst--;if(a.burst===0){a.rest=.5+match.random()*.8;if(a.hp<35)startReload(a.arsenal);}
      }
    }
  }else{
    a.aim=0;a.state=a.memory?'SEARCH':'PATROL';
    if(a.memory){
      if(a.flankGoal&&distance(a,a.flankGoal)<1.2)a.flankGoal=null;
      if(a.flankGoal){a.state='FLANK';if(!travel(match,a,a.flankGoal,dt,3.4))a.flankGoal=null;}
      else if(distance(a,a.memory)<1.2){turnActor(a,a.heading+dt*1.5,dt);}else if(!travel(match,a,a.memory,dt))a.memory=null;
    }else{
      const hold=match.mode==='ctf'?zoneGoal(match,a):null;
      if(hold){
        if(!travel(match,a,hold.spot,dt)){a.zoneShift=(a.zoneShift||0)+1;a.goal=null;}
        if(hold.inside)turnActor(a,a.heading+dt*1.2,dt);
        if(a.arsenal.ammo[a.arsenal.selected]<WEAPONS[a.arsenal.selected].capacity*.4)startReload(a.arsenal);
        return;
      }
      const [x,z]=world.routes[a.route%world.routes.length],goal={x,z};
      if(distance(a,goal)<1.2){a.route=(a.route+(a.team?3:1))%world.routes.length;a.goal=null;}
      if(!travel(match,a,goal,dt)){a.route=(a.route+(a.team?3:1))%world.routes.length;a.goal=null;}
      if(a.arsenal.ammo[a.arsenal.selected]<WEAPONS[a.arsenal.selected].capacity*.4)startReload(a.arsenal);
    }
  }
}
export function tickMatch(match,dt){
  if(match.ended)return;
  match.elapsed+=dt;
  for(const a of match.actors){
    if(a.disabled)continue;
    // Spread only starts to settle a moment after the last shot, so sustained fire keeps widening it.
    if(a.bloom>0&&match.elapsed-(a.lastShot??-9)>.22){const decay=WEAPONS[a.arsenal.selected].bloom?.decay??2;a.bloom=Math.max(0,a.bloom-decay*dt);}
    a.flash=Math.max(0,a.flash-dt);a.fire=Math.max(0,a.fire-dt);a.protection=Math.max(0,a.protection-dt);
    if(a.hp<=0){a.respawn=Math.max(0,a.respawn-dt);if(a.respawn===0)respawnActor(match,a);continue;}
    const before=a.hp;a.hp=recoverHealth(a.hp,a.lastDamage,match.elapsed,dt,a.maxHp);a.recovering=a.hp>before;
    if(!a.human){const previous={x:a.x,z:a.z};botTick(match,a,dt);updateWalk(a,previous,dt);a.fy=groundAt(a.x,a.z);}
    if(match.ended)break;
  }
  match.feed=match.feed.filter(e=>match.elapsed-e.time<7);
  match.corpses=match.corpses.filter(c=>match.elapsed-c.diedAt<CORPSE_LIFETIME);
  stepGrenades(match,dt);
  stepBolts(match,dt);
  if(match.mode==='ctf')tickZones(match,dt);
  if(!match.ended&&match.elapsed>=match.timeLimit)endMatch(match);
}
