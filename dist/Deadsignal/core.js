export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export const ENEMY_SIZE = 2.3;
export function spriteCorners(e,yaw,size=ENEMY_SIZE,base=0) {
  const x=Math.cos(yaw)*size*.34,z=Math.sin(yaw)*size*.34;
  return [[e.x-x,base,e.z-z],[e.x+x,base,e.z+z],[e.x+x,base+size,e.z+z],[e.x-x,base+size,e.z-z]];
}
// Intersect the same two-sided plane used for rendering, including its orientation.
export function raySprite(origin,dir,e,size=ENEMY_SIZE,base=0) {
  const c=Math.cos(e.yaw),s=Math.sin(e.yaw),denom=-s*dir.x+c*dir.z;
  if(Math.abs(denom)<1e-8)return Infinity;
  const t=(-s*(e.x-origin.x)+c*(e.z-origin.z))/denom;
  if(t<=0)return Infinity;
  const along=(origin.x+dir.x*t-e.x)*c+(origin.z+dir.z*t-e.z)*s;
  const y=origin.y+dir.y*t;
  return Math.abs(along)<=size*.34&&y>=base&&y<=base+size?t:Infinity;
}
export const cover = [
  {x:-7,z:-6,w:4,d:2,h:2.8},{x:6,z:-7,w:3,d:4,h:3.8},
  {x:-8,z:3,w:3,d:3,h:1.3},{x:7,z:4,w:4,d:2,h:2.6},
  {x:0,z:0,w:2.4,d:2.4,h:4.8},{x:-1,z:-11,w:3,d:1.2,h:1.15},
  {x:-4,z:9,w:2,d:2,h:1.5},{x:10,z:-1,w:1.5,d:2,h:1.4}
];
export const walls = [{x:0,z:-16,w:33,d:1,h:5},{x:0,z:16,w:33,d:1,h:5},{x:-16,z:0,w:1,d:32,h:5},{x:16,z:0,w:1,d:32,h:5}];
export const obstacles = [...cover,...walls];
export function blocked(x,z,r=.3) {return obstacles.some(b=>x+r>b.x-b.w/2&&x-r<b.x+b.w/2&&z+r>b.z-b.d/2&&z-r<b.z+b.d/2);}
export function move(body,dx,dz,r=.3) {if(!blocked(body.x+dx,body.z,r))body.x+=dx;if(!blocked(body.x,body.z+dz,r))body.z+=dz;}
export function rayBox(origin,dir,b) {
  let near=0,far=Infinity;
  for(const [axis,min,max] of [['x',b.x-b.w/2,b.x+b.w/2],['y',0,b.h],['z',b.z-b.d/2,b.z+b.d/2]]) {
    if(Math.abs(dir[axis])<1e-8) {if(origin[axis]<min||origin[axis]>max)return Infinity;}
    else {let a=(min-origin[axis])/dir[axis],c=(max-origin[axis])/dir[axis];if(a>c)[a,c]=[c,a];near=Math.max(near,a);far=Math.min(far,c);if(near>far)return Infinity;}
  } return near;
}
export function wallDistance(origin,dir) {return Math.min(...obstacles.map(b=>rayBox(origin,dir,b)));}
export function visible(a,b) {const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);return d<.01||wallDistance({x:a.x,y:1,z:a.z},{x:dx/d,y:0,z:dz/d})>d;}
// Grid flow field lets sentries navigate around cover instead of getting stuck.
export function flowField(target) {
  const field=new Map(),tx=Math.round(target.x),tz=Math.round(target.z),queue=[[tx,tz]];
  field.set(`${tx},${tz}`,0);
  for(let i=0;i<queue.length;i++){const [x,z]=queue[i],d=field.get(`${x},${z}`);for(const [nx,nz] of [[x+1,z],[x-1,z],[x,z+1],[x,z-1]]){const key=`${nx},${nz}`;if(Math.abs(nx)>15||Math.abs(nz)>15||blocked(nx,nz,.42)||field.has(key))continue;field.set(key,d+1);queue.push([nx,nz]);}}
  return field;
}
export function nextStep(body,field) {
  const x=Math.round(body.x),z=Math.round(body.z);let best=null,dist=Infinity;
  for(const [nx,nz] of [[x,z],[x+1,z],[x-1,z],[x,z+1],[x,z-1]]){const d=field.get(`${nx},${nz}`);if(d!==undefined&&d<dist){dist=d;best={x:nx,z:nz};}}
  return best;
}
