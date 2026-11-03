import {blocked,move,visible,cover,flowField,nextStep,wallDistance,raySprite,ENEMY_SIZE} from './core.js?v=teams-1';
import {WEAPONS,createArsenal,stepWeapon,fireWeapon,startReload} from './weapons.js?v=teams-1';
import {raySphere} from './combat.js?v=teams-1';

export const MATCH_RULES={teamSize:4,scoreLimit:30,timeLimit:300,respawn:3,protection:1.5};
export const TEAM_NAMES=['BLUE','ORANGE'];
export const TEAM_COLORS=['#73c5ef','#ffae67'];
const names=[['You','Patch','Scout','Beans'],['Brick','Pip','Moss','Rook']];
const spawns=[[-12,12],[-6,13],[1,13],[11,12],[-12,-12],[-5,-13],[3,-13],[12,-12]];
const routes=[[-12,5],[-11,-2],[-3,-4],[2,6],[11,7],[12,-4],[0,11],[0,-13]];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const bearing=(a,b)=>Math.atan2(b.x-a.x,a.z-b.z);
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function createMatch({spectator=false,random=Math.random}={}){
  const match={actors:[],scores:[0,0],elapsed:0,ended:false,winner:null,events:[],feed:[],random,spectator};
  for(let team=0;team<2;team++)for(let slot=0;slot<4;slot++){
    const id=team*4+slot,arsenal=createArsenal();arsenal.selected=slot%3;
    const a={id,team,name:slot===0&&team===0&&spectator?'Finch':names[team][slot],human:!spectator&&id===0,
      x:spawns[id][0],z:spawns[id][1],y:1.65,yaw:team===0?0:Math.PI,pitch:0,
      heading:team===0?0:Math.PI,variant:slot%3,phase:random()*6,flash:0,fire:0,aim:0,
      hp:100,kills:0,deaths:0,respawn:0,protection:MATCH_RULES.protection,arsenal,
      targetId:null,memory:null,reaction:0,think:0,route:id,goal:null,path:null,pathTimer:0,
      burst:0,rest:0,strafe:slot%2?1:-1,state:'PATROL',lastAttacker:null,flankGoal:null};
    match.actors.push(a);
  }
  return match;
}
export function endMatch(match){
  match.ended=true;match.winner=match.scores[0]===match.scores[1]?null:match.scores[0]>match.scores[1]?0:1;
}
export function applyDamage(match,victim,shooter,amount){
  if(match.ended||victim.hp<=0||victim.protection>0||victim.team===shooter.team)return false;
  victim.hp=Math.max(0,victim.hp-amount);victim.flash=.15;victim.lastAttacker=shooter.id;
  match.events.push({type:'hit',victim:victim.id,shooter:shooter.id,amount});
  if(victim.hp===0){
    victim.deaths++;victim.respawn=MATCH_RULES.respawn;victim.state='RESPAWNING';victim.aim=0;
    shooter.kills++;match.scores[shooter.team]++;
    match.feed.unshift({text:`${shooter.name} → ${victim.name}`,team:shooter.team,time:match.elapsed});match.feed=match.feed.slice(0,4);
    match.events.push({type:'kill',victim:victim.id,shooter:shooter.id});
    if(match.scores[shooter.team]>=MATCH_RULES.scoreLimit)endMatch(match);
  }
  return true;
}
// The furthest, least exposed available spawn is chosen at each respawn.
export function chooseSpawn(match,actor){
  let best=null,bestScore=-Infinity;
  for(const [x,z] of spawns){
    const p={x,z};let score=100;
    for(const other of match.actors){
      if(other===actor||other.hp<=0)continue;
      if(other.team!==actor.team)score=Math.min(score,distance(p,other)-(visible(p,other)?8:0));
      else if(distance(p,other)<1.4)score-=30;
    }
    if(score>bestScore){bestScore=score;best=p;}
  }
  return best;
}
function respawnActor(match,a){
  const p=chooseSpawn(match,a),selected=a.arsenal.selected;
  Object.assign(a,p,{hp:100,protection:MATCH_RULES.protection,respawn:0,yaw:p.z>0?0:Math.PI,pitch:0,
    heading:p.z>0?0:Math.PI,arsenal:createArsenal(),targetId:null,memory:null,goal:null,path:null,
    reaction:0,burst:0,rest:.5,think:0,aim:0,fire:0,flash:0,state:'PATROL',flankGoal:null});
  a.arsenal.selected=selected;match.events.push({type:'respawn',actor:a.id});
}
export function canSee(observer,target){
  if(target.hp<=0||observer.team===target.team)return false;
  const d=distance(observer,target);
  return d<26&&(d<2.5||Math.abs(angleDiff(bearing(observer,target),observer.heading))<Math.PI*.34)&&visible(observer,target);
}
// Sound gives an approximate location, never a live target through a wall.
export function hearShot(match,shooter){
  for(const a of match.actors){
    if(a.human||a.hp<=0||a.team===shooter.team||a.targetId!==null)continue;
    const d=distance(a,shooter);
    if(d<(visible(a,shooter)?16:8)){
      a.memory={x:Math.round(shooter.x/2)*2,z:Math.round(shooter.z/2)*2,until:match.elapsed+3};
      a.state='INVESTIGATE';a.think=0;
    }
  }
}
export function fireMatchWeapon(match,shooter,yaw,pitch=0,extraSpread=0){
  if(match.ended||shooter.hp<=0||!fireWeapon(shooter.arsenal))return false;
  shooter.protection=0;shooter.fire=.12;hearShot(match,shooter);
  const w=WEAPONS[shooter.arsenal.selected],origin={x:shooter.x,y:shooter.human?shooter.y:1.35,z:shooter.z};
  for(let n=0;n<w.pellets;n++){
    const y=yaw+(match.random()-.5)*2*(w.spread+extraSpread),p=pitch+(match.random()-.5)*2*(w.spread+extraSpread);
    const dir={x:Math.sin(y)*Math.cos(p),y:Math.sin(p),z:-Math.cos(y)*Math.cos(p)};
    let near=Math.min(w.range,wallDistance(origin,dir)),victim=null;
    for(const other of match.actors){
      if(other===shooter||other.hp<=0)continue;
      const d=other.human?raySphere(origin,dir,{x:other.x,y:1.25,z:other.z},.62):raySprite(origin,dir,other,ENEMY_SIZE,0);
      if(d<near){near=d;victim=other;}
    }
    if(victim)applyDamage(match,victim,shooter,w.damage);
    match.events.push({type:'shot',shooter:shooter.id,team:shooter.team,a:{...origin},b:{x:origin.x+dir.x*near,y:origin.y+dir.y*near,z:origin.z+dir.z*near}});
  }
  return true;
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
  return routes.map(([x,z])=>({x,z})).filter(p=>distance(p,a)>2&&distance(p,known)>3&&distance(p,known)<12
    &&Math.abs(angleDiff(bearing(a,p),heading))>.45&&!blocked(p.x,p.z,.42))
    .sort((p,q)=>(distance(a,p)+distance(p,known))-(distance(a,q)+distance(q,known)))[0]||null;
}
function travel(match,a,goal,dt,speed=3.0){
  if(!goal)return;
  if(!a.goal||distance(goal,a.goal)>1||a.pathTimer<=0){a.goal={...goal};a.path=flowField(goal);a.pathTimer=.7;}
  a.pathTimer-=dt;
  const dest=visible(a,goal)?goal:nextStep(a,a.path);
  if(!dest)return;
  let dx=dest.x-a.x,dz=dest.z-a.z,n=Math.hypot(dx,dz);if(n<.15)return;
  dx/=n;dz/=n;
  for(const o of match.actors){if(o===a||o.hp<=0)continue;const d=distance(a,o);if(d>.01&&d<.9){dx+=(a.x-o.x)/d;dz+=(a.z-o.z)/d;}}
  n=Math.hypot(dx,dz)||1;move(a,dx/n*speed*dt,dz/n*speed*dt,.38);
  if(a.targetId===null)a.heading+=Math.max(-dt*2.2,Math.min(dt*2.2,angleDiff(Math.atan2(dx,-dz),a.heading)));
}
function botTick(match,a,dt){
  stepWeapon(a.arsenal,dt);a.rest=Math.max(0,a.rest-dt);a.think-=dt;
  if(a.think<=0){
    a.think=.16+match.random()*.12;
    const seen=match.actors.filter(t=>canSee(a,t)).sort((b,c)=>distance(a,b)-distance(a,c));
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
  const sight=target&&canSee(a,target);
  if(a.memory?.until<match.elapsed){a.memory=null;a.flankGoal=null;}
  if(a.arsenal.ammo[a.arsenal.selected]===0)startReload(a.arsenal);
  if(a.arsenal.reload>0||(a.hp<35&&sight&&a.rest>0)){
    a.state=a.arsenal.reload>0?'RELOADING':'FALL BACK';a.aim=0;
    const goal=a.memory&&coverGoal(match,a,a.memory);if(goal)travel(match,a,goal,dt,3.5);
    return;
  }
  if(sight){
    a.state='ENGAGE';a.flankGoal=null;a.reaction=Math.max(0,a.reaction-dt);a.aim=a.reaction;
    const desired=bearing(a,target);a.heading+=Math.max(-dt*3,Math.min(dt*3,angleDiff(desired,a.heading)));
    const d=distance(a,target),w=WEAPONS[a.arsenal.selected],preferred=a.variant===1?7:12;
    if(d>Math.min(w.range*.75,preferred+3)){travel(match,a,target,dt);}
    else{
      // Short lateral steps and reversals, with collision and squad separation.
      if(match.random()<dt*.6)a.strafe*=-1;
      move(a,Math.cos(desired)*a.strafe*dt*1.3,Math.sin(desired)*a.strafe*dt*1.3,.38);
    }
    if(a.reaction===0&&a.rest===0&&Math.abs(angleDiff(desired,a.heading))<.16&&d<w.range){
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
      if(a.flankGoal){a.state='FLANK';travel(match,a,a.flankGoal,dt,3.4);}
      else if(distance(a,a.memory)<1.2){a.heading+=dt*1.5;}else travel(match,a,a.memory,dt);
    }else{
      const [x,z]=routes[a.route%routes.length],goal={x,z};
      if(distance(a,goal)<1.2){a.route=(a.route+(a.team?3:1))%routes.length;a.goal=null;}
      travel(match,a,goal,dt);
      if(a.arsenal.ammo[a.arsenal.selected]<WEAPONS[a.arsenal.selected].capacity*.4)startReload(a.arsenal);
    }
  }
}
export function tickMatch(match,dt){
  if(match.ended)return;
  match.elapsed+=dt;
  for(const a of match.actors){
    a.flash=Math.max(0,a.flash-dt);a.fire=Math.max(0,a.fire-dt);a.protection=Math.max(0,a.protection-dt);
    if(a.hp<=0){a.respawn=Math.max(0,a.respawn-dt);if(a.respawn===0)respawnActor(match,a);continue;}
    if(!a.human)botTick(match,a,dt);
    if(match.ended)break;
  }
  match.feed=match.feed.filter(e=>match.elapsed-e.time<7);
  if(match.elapsed>=MATCH_RULES.timeLimit)endMatch(match);
}
