import {clamp,move} from './core.js?v=permanent-1';
import {updateWalk} from './actor-motion.js?v=permanent-1';

export const NETWORK_VERSION=2;
export const INPUT_DT=1/30;
export function cleanInput(raw){
  if(!raw||!Number.isSafeInteger(raw.seq)||raw.seq<1||
    !['yaw','pitch','forward','strafe'].every(k=>Number.isFinite(raw[k])))return null;
  return {seq:raw.seq,yaw:Math.atan2(Math.sin(raw.yaw),Math.cos(raw.yaw)),pitch:clamp(raw.pitch,-.85,.85),
    forward:clamp(raw.forward,-1,1),strafe:clamp(raw.strafe,-1,1),sprint:raw.sprint===true,
    fire:raw.fire===true,reload:raw.reload===true,
    weapon:Number.isInteger(raw.weapon)&&raw.weapon>=0&&raw.weapon<3?raw.weapon:0};
}
// Identical fixed-step movement on the server and in local prediction. Clients
// send intent, never a position, health value, damage amount or frame duration.
export function moveFromInput(actor,input){
  actor.yaw=input.yaw;actor.heading=input.yaw;actor.pitch=input.pitch;
  const before={x:actor.x,z:actor.z};
  if(actor.hp>0){
    const norm=Math.max(1,Math.hypot(input.forward,input.strafe)),speed=(input.sprint?6:3.8)*INPUT_DT/norm;
    move(actor,(Math.sin(input.yaw)*input.forward+Math.cos(input.yaw)*input.strafe)*speed,
      (-Math.cos(input.yaw)*input.forward+Math.sin(input.yaw)*input.strafe)*speed);
  }
  updateWalk(actor,before,INPUT_DT);
  actor.y=1.65+(actor.moving?Math.sin(actor.walkPhase*Math.PI/4)*.035:0);
}
export function reconcilePlayer(authoritative,pending){
  const result={...authoritative};
  for(const input of pending)moveFromInput(result,input);
  return result;
}
