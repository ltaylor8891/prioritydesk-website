import {clamp,ENEMY_SIZE} from './core.js?v=permanent-2';

export const DEATH_TIMING={fall:.45,hold:2,fade:.65};
export const CORPSE_LIFETIME=DEATH_TIMING.fall+DEATH_TIMING.hold+DEATH_TIMING.fade;
export const RECOVERY={delay:3,perSecond:10};
export function makeCorpse(actor,time){
  return {x:actor.x,z:actor.z,yaw:actor.human?actor.yaw+Math.PI:actor.yaw,
    heading:actor.human?actor.yaw:actor.heading,variant:actor.variant??0,team:actor.team,diedAt:time};
}
export function corpseOpacity(age){return age<0?0:age<=DEATH_TIMING.fall+DEATH_TIMING.hold?1:clamp((CORPSE_LIFETIME-age)/DEATH_TIMING.fade,0,1);}
export function corpseCorners(corpse,time){
  const t=clamp((time-corpse.diedAt)/DEATH_TIMING.fall,0,1),angle=t*t*Math.PI/2;
  const yaw=corpse.yaw,c=Math.cos(yaw),s=Math.sin(yaw),half=ENEMY_SIZE*.34;
  // The feet stay planted while the flat character falls backwards, face up.
  const up={x:s*Math.sin(angle)*ENEMY_SIZE,y:Math.cos(angle)*ENEMY_SIZE,z:-c*Math.sin(angle)*ENEMY_SIZE};
  const floor=.045;
  return [[corpse.x-c*half,floor,corpse.z-s*half],[corpse.x+c*half,floor,corpse.z+s*half],
    [corpse.x+c*half+up.x,floor+up.y,corpse.z+s*half+up.z],[corpse.x-c*half+up.x,floor+up.y,corpse.z-s*half+up.z]];
}
export function recoverHealth(hp,lastDamage,time,dt,maxHp=100){
  if(hp<=0||hp>=maxHp||dt<=0)return hp;
  const duration=Math.max(0,time-Math.max(time-dt,lastDamage+RECOVERY.delay));
  return Math.min(maxHp,hp+duration*RECOVERY.perSecond);
}
export function damageOpacity(hp,flash=0){
  return clamp(Math.pow(1-clamp(hp/100,0,1),1.25)*.82+Math.max(0,flash)*.4,0,.95);
}
