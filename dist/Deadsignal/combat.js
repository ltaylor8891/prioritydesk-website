import {turnActor,headingTo,facingTarget} from './actor-motion.js?v=permanent-1';
import {wallDistance} from './core.js?v=permanent-1';
export const ENEMY_GUNS=[{range:17,delay:2.8,speed:12,damage:8},{range:12,delay:3.5,speed:10,damage:5},{range:19,delay:2.5,speed:14,damage:7}];
export function readyEnemyShot(e,player,dt,wave,hasSight){
  e.fire=Math.max(0,(e.fire||0)-dt);e.attack=Math.max(0,e.attack-dt);
  const gun=ENEMY_GUNS[e.variant],distance=Math.hypot(e.x-player.x,e.z-player.z);
  e.heading??=e.yaw-Math.PI;const aimPoint=e.aim>0?e.target:player;
  if(hasSight)turnActor(e,headingTo(e,aimPoint),dt);
  const facing=facingTarget(e,aimPoint);
  if(e.aim>0){
    if(!hasSight||distance>gun.range){e.aim=0;e.attack=.5;return null;}
    e.aim=Math.max(0,e.aim-dt);
    if(e.aim===0&&!facing){e.aim=.01;return null;}
    if(e.aim===0){
      e.attack=gun.delay;e.fire=.16;
      const origin={x:e.x+Math.sin(e.heading)*.15,y:.91,z:e.z-Math.cos(e.heading)*.15};
      const dx=e.target.x-origin.x,dy=e.target.y-origin.y,dz=e.target.z-origin.z,n=Math.hypot(dx,dy,dz)||1;
      return {...origin,dx:dx/n,dy:dy/n,dz:dz/n,speed:gun.speed,damage:gun.damage+Math.max(0,wave-1),life:2.5};
    }
  }else if(e.attack<=0&&hasSight&&facing&&distance<gun.range){e.aim=.85;e.target={x:player.x,y:1.05,z:player.z};}
  return null;
}
export function raySphere(origin,dir,center,radius){
  const x=origin.x-center.x,y=origin.y-center.y,z=origin.z-center.z,b=x*dir.x+y*dir.y+z*dir.z,c=x*x+y*y+z*z-radius*radius;
  if(c<=0)return 0;const disc=b*b-c;if(disc<0)return Infinity;const t=-b-Math.sqrt(disc);return t>=0?t:Infinity;
}
export function stepProjectile(b,player,dt){
  const dir={x:b.dx,y:b.dy,z:b.dz},travel=b.speed*dt;
  const wall=wallDistance(b,dir),hit=raySphere(b,dir,{x:player.x,y:1.05,z:player.z},.48);
  if(wall<=travel&&wall<=hit)return 'wall';
  if(hit<=travel)return 'player';
  b.x+=b.dx*travel;b.y+=b.dy*travel;b.z+=b.dz*travel;b.life-=dt;
  return b.life<=0?'expired':'flying';
}

export function enemyVolley(b,variant){
  if(variant!==1)return [b];
  return [-.055,0,.055].map(angle=>({...b,dx:b.dx*Math.cos(angle)+b.dz*Math.sin(angle),dz:b.dz*Math.cos(angle)-b.dx*Math.sin(angle)}));
}
