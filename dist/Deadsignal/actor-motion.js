export const WALK_FRAMES=8;
export const AIM_TOLERANCE=.10;
export const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export const headingTo=(a,b)=>Math.atan2(b.x-a.x,a.z-b.z);
export function turnActor(actor,desired,dt,rate=3){
  actor.heading=(actor.heading??actor.yaw-Math.PI)+Math.max(-rate*dt,Math.min(rate*dt,angleDifference(desired,actor.heading??actor.yaw-Math.PI)));
  // Sprite front normal is (-sin(yaw), cos(yaw)); game forward is (sin(heading), -cos(heading)).
  if(!actor.human)actor.yaw=actor.heading+Math.PI;
}
export function facingTarget(actor,target,tolerance=AIM_TOLERANCE){
  const facing=actor.human?actor.yaw:actor.heading;
  return Number.isFinite(facing)&&Math.abs(angleDifference(headingTo(actor,target),facing))<=tolerance;
}
export function updateWalk(actor,previous,dt){
  const travelled=Math.hypot(actor.x-previous.x,actor.z-previous.z);
  actor.moving=actor.hp!==0&&travelled>.0005&&travelled<1;
  actor.walkSpeed=actor.moving?travelled/Math.max(dt,.001):0;
  if(actor.moving)actor.walkPhase=((actor.walkPhase||0)+travelled/1.7*WALK_FRAMES)%WALK_FRAMES;
  else actor.walkPhase=0;
}
export function walkFrame(actor){return actor.moving?Math.floor(actor.walkPhase||0)%WALK_FRAMES:0;}
export function showsBack(actor,camera){
  if(!Number.isFinite(actor.heading))return false;
  return (camera.x-actor.x)*Math.sin(actor.heading)-(camera.z-actor.z)*Math.cos(actor.heading)<0;
}
