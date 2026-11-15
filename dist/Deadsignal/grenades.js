import {obstacles,wallDistance,groundAt,features} from './core.js?v=permanent-3';

export const GRENADE={
  speed:12,lift:2,gravity:16,radius:.12,
  fuse:{frag:2.4,flash:1.6,smoke:1.1},
  fragRadius:6,fragDamage:140,
  flashFull:3,flashRange:6,flashHold:3,flashFade:3,flashViewCos:.6,
  smokeRadius:4.5,smokeLife:15,smokeGrow:1.4,smokeFade:3,smokeHeight:1.4
};
const R=GRENADE.radius;

export function aimDirection(yaw,pitch){const c=Math.cos(pitch);return {x:Math.sin(yaw)*c,y:Math.sin(pitch),z:-Math.cos(yaw)*c};}
const solidAt=g=>{for(const b of obstacles)if(Math.abs(g.x-b.x)<b.w/2+R&&Math.abs(g.z-b.z)<b.d/2+R&&g.y-R<b.h&&g.y+R>(b.y0??0))return b;return null;};
// A pit wall or plateau edge taller than a roll-over acts like a wall.
const terrainWall=g=>features.length>0&&groundAt(g.x,g.z)-(g.y-R)>.35;

export function createGrenade(id,kind,owner,origin,yaw,pitch){
  const dir=aimDirection(yaw,pitch);
  let g={id,kind,owner,x:origin.x+dir.x*.45,y:origin.y-.15+dir.y*.45,z:origin.z+dir.z*.45,
    vx:dir.x*GRENADE.speed,vy:dir.y*GRENADE.speed+GRENADE.lift,vz:dir.z*GRENADE.speed,fuse:GRENADE.fuse[kind],age:0};
  // Throwing from against a wall must not start the grenade inside it.
  if(solidAt(g)){g.x=origin.x;g.y=origin.y-.15;g.z=origin.z;}
  return g;
}
// Bounces off walls and cover (which have real heights), lands on top of low cover, and rolls to a stop on the ground.
export function stepGrenade(g,dt){
  const steps=Math.max(1,Math.ceil(dt/.016)),h=dt/steps;
  for(let i=0;i<steps;i++){
    g.vy-=GRENADE.gravity*h;
    g.x+=g.vx*h;if(solidAt(g)||terrainWall(g)){g.x-=g.vx*h;g.vx*=-.45;g.vz*=.85;}
    g.z+=g.vz*h;if(solidAt(g)||terrainWall(g)){g.z-=g.vz*h;g.vz*=-.45;g.vx*=.85;}
    const before=g.y;g.y+=g.vy*h;
    const top=solidAt(g);
    if(top){
      if(before-R>=top.h-1e-6){g.y=top.h+R;land(g);}else{g.y=before;g.vy=-g.vy*.3;}
    }else{const floor=features.length?groundAt(g.x,g.z):0;if(g.y<floor+R){g.y=floor+R;land(g);}}
  }
  g.age+=dt;
}
function land(g){
  if(Math.abs(g.vy)>1.2)g.vy=-g.vy*.32;else g.vy=0;
  g.vx*=.6;g.vz*=.6;
}

// 3 m or closer is a full flash, fading linearly to nothing at 6 m.
export function flashStrength(distance){
  if(distance<=GRENADE.flashFull)return 1;
  if(distance>=GRENADE.flashRange)return 0;
  return (GRENADE.flashRange-distance)/(GRENADE.flashRange-GRENADE.flashFull);
}
// Whether a point is inside the viewer's field of view (a cone about the view direction).
export function inFieldOfView(viewer,eye,point){
  const yaw=viewer.human?viewer.yaw:viewer.heading,f=aimDirection(Number.isFinite(yaw)?yaw:0,viewer.pitch||0);
  const dx=point.x-eye.x,dy=point.y-eye.y,dz=point.z-eye.z,d=Math.hypot(dx,dy,dz);
  if(d<.05)return true;
  return (f.x*dx+f.y*dy+f.z*dz)/d>=GRENADE.flashViewCos;
}
export function actorEye(a){return {x:a.x,y:a.human?(a.y??1.65):(a.fy||0)+1.35,z:a.z};}
export function clearLine(from,to){
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,d=Math.hypot(dx,dy,dz);
  return d<.05||wallDistance(from,{x:dx/d,y:dy/d,z:dz/d})>=d-.1;
}
// Full white for 3 s then a 3 s fade at full strength; weaker flashes scale both phases down together.
export function flashDurations(strength){return {hold:GRENADE.flashHold*strength,fade:GRENADE.flashFade*strength};}
export function blindOpacity(actor,time){
  const age=time-actor.blindStart;
  if(!(age>=0))return 0;
  if(age<actor.blindHold)return 1;
  if(age<actor.blindHold+actor.blindFade)return 1-(age-actor.blindHold)/actor.blindFade;
  return 0;
}
// A blinded bot cannot see until the white has mostly faded.
export const isBlind=(actor,time)=>time>=actor.blindStart&&time<actor.blindStart+actor.blindHold+actor.blindFade*.5;

export const fragDamageAt=distance=>distance>=GRENADE.fragRadius?0:Math.round(GRENADE.fragDamage*(1-distance/GRENADE.fragRadius));

export function cloudRadius(c){return GRENADE.smokeRadius*Math.min(1,c.age/GRENADE.smokeGrow);}
export function cloudOpacity(c){return Math.max(0,Math.min(1,(c.life-c.age)/GRENADE.smokeFade));}
export function createCloud(id,x,z){return {id,x,y:GRENADE.smokeHeight+groundAt(x,z),z,age:0,life:GRENADE.smokeLife};}
// Smoke blocks line of sight for anything that looks through the cloud's sphere.
export function smokeBlocks(clouds,a,b){
  for(const c of clouds){
    const r=cloudRadius(c)*(cloudOpacity(c)>.3?1:0);
    if(r<=.2)continue;
    const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len2=dx*dx+dy*dy+dz*dz||1e-9;
    const t=Math.max(0,Math.min(1,((c.x-a.x)*dx+(c.y-a.y)*dy+(c.z-a.z)*dz)/len2));
    if(Math.hypot(a.x+dx*t-c.x,a.y+dy*t-c.y,a.z+dz*t-c.z)<r)return true;
  }
  return false;
}
// Deterministic puff layout so every client draws the same cloud from just its id.
export function cloudPuffs(c,count=18){
  const puffs=[];let s=(c.id*2654435761)>>>0;
  const rand=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  for(let i=0;i<count;i++){
    const a=rand()*Math.PI*2,d=Math.sqrt(rand())*GRENADE.smokeRadius*.62;
    puffs.push({dx:Math.cos(a)*d,dy:(rand()-.35)*2.1,dz:Math.sin(a)*d,size:3.4+rand()*2,spin:rand()*6.28});
  }
  return puffs;
}
