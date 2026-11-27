const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);},mix=(a,b,t)=>a+(b-a)*t;
export const INTRO_DURATION=5.8;
export function introFrame(time,{reduced=false}={}){
  const t=reduced?3.9:Math.max(0,time),turn=smooth((t-2.15)/1.45),dolly=smooth((t-1.95)/2.2);
  const camera={x:mix(8,3.15,dolly),y:mix(2.1,1.6,dolly),z:mix(12,9.7,dolly),yaw:mix(-.38,0,dolly),pitch:mix(-.03,-.11,dolly)};
  const blue={x:3.15,z:7.4-smooth(t/.8)*.4,variant:0,team:0,heading:mix(Math.atan2(4.85,2),Math.PI,turn),moving:t<.8,walkPhase:t*8,fire:0,flash:0};blue.yaw=blue.heading+Math.PI;
  const orange={x:8,z:5,variant:1,team:1,heading:-2,dead:!reduced&&t>=1.52,diedAt:1.52,fy:0,fire:0,flash:!reduced&&t>=1.52&&t<1.68?1:0};orange.yaw=orange.heading+Math.PI;
  const shot=!reduced&&((t>=1.14&&t<1.23)||(t>=1.48&&t<1.59)||(t>=4.55&&t<4.69)),finalShot=!reduced&&t>=4.55;
  const muzzle=shot?{x:blue.x+Math.sin(blue.heading)*.48,y:1.4,z:blue.z-Math.cos(blue.heading)*.48}:null;blue.fire=shot ? .15 : 0;
  const traces=muzzle?[{a:muzzle,b:finalShot?{x:camera.x,y:camera.y,z:camera.z-.2}:{x:8,y:1.4,z:5}}]:[];
  const kick=finalShot?Math.exp(-(t-4.55)*8)*Math.sin((t-4.55)*65):0;
  camera.x+=kick*.055;camera.y+=kick*.04;camera.yaw+=kick*.018;
  return {time:t,camera,actors:[blue,orange],muzzle,traces,impact:finalShot?t-4.55:-1,phase:t<1?'ENTER CAMP PAPER':t<2.15?'LIVE-FIRE EXERCISE':t<4.15?'3D WORLD. 2D THREATS.':'YOU’RE NEXT.',done:reduced?time>.6:time>INTRO_DURATION};
}
