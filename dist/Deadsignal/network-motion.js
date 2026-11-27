import {clamp,move,groundAt,ladders,ladderGeometry} from './core.js?v=accounts-1';
import {updateWalk} from './actor-motion.js?v=accounts-1';
import {WEAPONS} from './weapons.js?v=accounts-1';

export const NETWORK_VERSION=6;
export const INPUT_DT=1/30;
// Eye heights, jump and speeds shared by local play, the server and client prediction.
export const PLAYER={eye:1.65,crouchDrop:.62,jumpSpeed:6.6,gravity:21,walk:3.8,sprint:6,crouch:2,crouchRate:9,aimSlow:.75,adsTime:.18};
export function cleanInput(raw){
  if(!raw||!Number.isSafeInteger(raw.seq)||raw.seq<1||
    !['yaw','pitch','forward','strafe'].every(k=>Number.isFinite(raw[k])))return null;
  return {seq:raw.seq,yaw:Math.atan2(Math.sin(raw.yaw),Math.cos(raw.yaw)),pitch:clamp(raw.pitch,-.85,.85),
    forward:clamp(raw.forward,-1,1),strafe:clamp(raw.strafe,-1,1),sprint:raw.sprint===true,
    fire:raw.fire===true,reload:raw.reload===true,crouch:raw.crouch===true,jump:raw.jump===true,aim:raw.aim===true,
    weapon:Number.isInteger(raw.weapon)&&raw.weapon>=0&&raw.weapon<WEAPONS.length?raw.weapon:0};
}
// Identical fixed-step movement on the server and in local prediction. Clients
// send intent, never a position, health value, damage amount or frame duration.
const SNAP=.3,CLIMB_SPEED=2.4;
// Ladders: face one and walk forward to climb (or walk onto the top edge facing away to climb down).
// While on a ladder, forward moves you the way you face relative to the wall.
function stepClimb(actor,input,dt){
  if(!ladders.length)return false;
  const fwd={x:Math.sin(input.yaw),z:-Math.cos(input.yaw)};
  if(actor.climb>0){
    const L=ladders[actor.climb-1],g=ladderGeometry(L);
    if(input.jump){actor.climb=0;actor.vy=2.5;actor.x=g.c.x-L.fx*.35;actor.z=g.c.z-L.fz*.35;return false;}
    const dir=(fwd.x*L.fx+fwd.z*L.fz)>=0?1:-1,move=input.forward*dir;
    actor.x=g.c.x;actor.z=g.c.z;actor.vy=0;
    actor.fy=clamp(actor.fy+move*CLIMB_SPEED*dt,L.bottom,L.top);
    if(actor.fy>=L.top-1e-6&&move>0){actor.x=g.e.x;actor.z=g.e.z;actor.fy=L.top;actor.climb=0;}
    else if(actor.fy<=L.bottom+1e-6&&move<0){actor.fy=L.bottom;actor.climb=0;}
    return true;
  }
  if(input.forward>0&&!(actor.lift>.05)&&!(actor.vy>0)){
    for(let i=0;i<ladders.length;i++){
      const L=ladders[i],g=ladderGeometry(L),face=fwd.x*L.fx+fwd.z*L.fz;
      const at=(p,lat,dep)=>{const px=actor.x-p.x,pz=actor.z-p.z;return Math.abs(px*g.t.x+pz*g.t.z)<lat&&Math.abs(px*L.fx+pz*L.fz)<dep;};
      const bottom=face>.3&&at(g.c,.6,.75)&&actor.fy<=L.bottom+.4,top=face<-.3&&at(g.e,.7,1)&&Math.abs(actor.fy-L.top)<.4;
      if(bottom||top){actor.climb=i+1;actor.x=g.c.x;actor.z=g.c.z;actor.vy=0;if(top)actor.fy=L.top-.05;return true;}
    }
  }
  return false;
}
export function moveFromInput(actor,input,dt=INPUT_DT){
  actor.yaw=input.yaw;actor.heading=input.yaw;actor.pitch=input.pitch;
  const before={x:actor.x,z:actor.z};
  if(actor.fy===undefined)actor.fy=groundAt(actor.x,actor.z);
  if(actor.hp>0){
    const want=input.crouch?1:0,crouch=actor.crouch||0;
    actor.crouch=crouch+clamp(want-crouch,-PLAYER.crouchRate*dt,PLAYER.crouchRate*dt);
    actor.ads=(actor.ads||0)+clamp((input.aim?1:0)-(actor.ads||0),-dt/PLAYER.adsTime,dt/PLAYER.adsTime);
    if(!stepClimb(actor,input,dt)){
      const wasGrounded=!(actor.lift>.001)&&!((actor.vy||0)>0);
      const norm=Math.max(1,Math.hypot(input.forward,input.strafe));
      // Aiming slows you by a quarter and rules out sprinting.
      const base=actor.crouch>.5?PLAYER.crouch:input.sprint&&!input.aim&&actor.crouch<.2?PLAYER.sprint:PLAYER.walk;
      const speed=base*(input.aim?PLAYER.aimSlow:1)*dt/norm;
      move(actor,(Math.sin(input.yaw)*input.forward+Math.cos(input.yaw)*input.strafe)*speed,
        (-Math.cos(input.yaw)*input.forward+Math.sin(input.yaw)*input.strafe)*speed);
      const ground=groundAt(actor.x,actor.z);
      let grounded=wasGrounded;
      // On the ground you follow slopes and small steps; walking off a real edge starts a fall.
      if(wasGrounded){if(actor.fy>ground+SNAP)grounded=false;else actor.fy=ground;}
      if(input.jump&&grounded&&actor.crouch<.4){actor.vy=PLAYER.jumpSpeed;grounded=false;actor.fy+=1e-4;}
      if(!grounded){
        actor.vy=(actor.vy||0)-PLAYER.gravity*dt;actor.fy+=actor.vy*dt;
        if(actor.fy<=ground&&actor.vy<=0){actor.fy=ground;actor.vy=0;}
      }
    }
  }
  updateWalk(actor,before,dt);
  actor.lift=Math.max(0,actor.fy-groundAt(actor.x,actor.z));
  const onGround=!(actor.lift>0)&&!(actor.climb>0);
  actor.y=actor.fy+PLAYER.eye-(actor.crouch||0)*PLAYER.crouchDrop+(actor.moving&&onGround?Math.sin(actor.walkPhase*Math.PI/4)*.035*(1-(actor.crouch||0)):0);
}
export function reconcilePlayer(authoritative,pending){
  const result={...authoritative};
  for(const input of pending)moveFromInput(result,input);
  return result;
}
