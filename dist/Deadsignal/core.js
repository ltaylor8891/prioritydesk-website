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
export const CAMP_WORLD={id:'camp',name:'Camp Paper',subtitle:'TRAINING GROUND',half:16,
  cover:[
    {x:-7,z:-6,w:4,d:2,h:2.8},{x:6,z:-7,w:3,d:4,h:3.8},
    {x:-8,z:3,w:3,d:3,h:1.3},{x:7,z:4,w:4,d:2,h:2.6},
    {x:0,z:0,w:2.4,d:2.4,h:4.8},{x:-1,z:-11,w:3,d:1.2,h:1.15},
    {x:-4,z:9,w:2,d:2,h:1.5},{x:10,z:-1,w:1.5,d:2,h:1.4}
  ],
  walls:[{x:0,z:-16,w:33,d:1,h:5},{x:0,z:16,w:33,d:1,h:5},{x:-16,z:0,w:1,d:32,h:5},{x:16,z:0,w:1,d:32,h:5}],
  spawns:[[-12,12],[-6,13],[1,13],[11,12],[-12,-12],[-5,-13],[3,-13],[12,-12]],
  routes:[[-12,5],[-11,-2],[-3,-4],[2,6],[11,7],[12,-4],[0,11],[0,-13]],
  zones:[[-11,3],[0,0],[11,-3]],
  menu:{camera:{x:8,y:2.3,z:13,yaw:-.4,pitch:.03},actors:[{x:8,z:8,variant:0,yaw:-.25,phase:0,flash:0},{x:12,z:1,variant:1,yaw:-.5,phase:1,flash:0},{x:-10,z:-8,variant:2,yaw:0,phase:2,flash:0}]},
  views:[{x:2.8,y:1.75,z:12,yaw:-.16,pitch:.04},{x:-12,y:1.75,z:-5,yaw:0,pitch:0},{x:11.5,y:1.75,z:10,yaw:-.18,pitch:.02}],
  viewNames:['COVER DRILL','TARGET LANES','SUPPLY YARD'],gridStep:4,labels:[['RANGE',0,-.84],['YARD',.62,.66]]};
// The live map. Arrays are changed in place, so every module sees the active world.
export const cover=[...CAMP_WORLD.cover],walls=[...CAMP_WORLD.walls],obstacles=[...cover,...walls];
export const world={...CAMP_WORLD};
// ---- terrain: pits, ramps and raised ground (later features win), plus ladders between levels
export const features=[],ladders=[];
export const STEP=.55;
// Ground heights come from a per-world lookup: pits, ramps and plateaus (aligned to whole metres, later features win)
// laid over gently rolling open ground. Rolling ground fades to flat near structures, flag circles and the boundary.
const flatGround={at:()=>0,base:()=>0,flat:true};
const rolling=(x,z)=>.5*Math.sin(x*.42+Math.sin(z*.31)*1.4)+.35*Math.sin(z*.37-x*.21+1.3)+.2*Math.sin((x+z)*.61+.7)+.12*Math.sin(x*1.3+z*.9)*Math.sin(z*1.1-x*.7);
const rectDistance=(x,z,r)=>Math.hypot(Math.max(Math.abs(x-r.x)-r.w/2,0),Math.max(Math.abs(z-r.z)-r.d/2,0));
const groundCacheByWorld=new WeakMap();
export function makeGround(def){
  const feats=def.features||[];
  if(!feats.length)return flatGround;
  if(groundCacheByWorld.has(def))return groundCacheByWorld.get(def);
  const half=def.half,pad=4,min=-half-pad,N=2*(half+pad),lut=new Int16Array(N*N).fill(-1);
  feats.forEach((f,i)=>{
    for(let z=Math.floor(f.z-f.d/2);z<f.z+f.d/2;z++)for(let x=Math.floor(f.x-f.w/2);x<f.x+f.w/2;x++){const cx=x-min,cz=z-min;if(cx>=0&&cz>=0&&cx<N&&cz<N)lut[cz*N+cx]=i;}
  });
  const R=def.rolling,flats=[...feats,...(def.flat||[])],V=N+1,verts=new Float32Array(V*V);
  if(R)for(let vz=0;vz<V;vz++)for(let vx=0;vx<V;vx++){
    const x=min+vx,z=min+vz;let d=Infinity;
    for(const r of flats)d=Math.min(d,rectDistance(x,z,r));
    d=Math.min(d,half-2-Math.max(Math.abs(x),Math.abs(z)));
    const t=Math.max(0,Math.min(1,d/R.fade)),fade=t*t*(3-2*t);
    verts[vz*V+vx]=R.amp*rolling(x,z)*fade;
  }
  const base=(x,z)=>{
    const fx=x-min,fz=z-min;if(fx<0||fz<0||fx>=N||fz>=N)return 0;
    const ix=Math.floor(fx),iz=Math.floor(fz),tx=fx-ix,tz=fz-iz,i=iz*V+ix;
    return (verts[i]*(1-tx)+verts[i+1]*tx)*(1-tz)+(verts[i+V]*(1-tx)+verts[i+V+1]*tx)*tz;
  };
  const featureAt=(f,x,z)=>f.kind==='ramp'?f.from+(f.to-f.from)*Math.max(0,Math.min(1,f.axis==='x'?(x-(f.x-f.w/2))/f.w:(z-(f.z-f.d/2))/f.d)):f.h;
  const at=(x,z)=>{
    const cx=Math.floor(x-min),cz=Math.floor(z-min);
    if(cx>=0&&cz>=0&&cx<N&&cz<N){const i=lut[cz*N+cx];if(i>=0)return featureAt(feats[i],x,z);}
    return base(x,z);
  };
  const ground={at,base,featureAt,cellFeature:(x,z)=>{const cx=x-min,cz=z-min;return cx>=0&&cz>=0&&cx<N&&cz<N?lut[cz*N+cx]:-1;},flat:false};
  groundCacheByWorld.set(def,ground);return ground;
}
let ground=flatGround;
export function groundAt(x,z){return ground.at(x,z);}
export const groundBase=(x,z)=>ground.base(x,z);
// Where you stand to climb (c), where you step off at the top (e) and the sideways direction (t).
export function ladderGeometry(L){return {c:{x:L.x-L.fx*.45,z:L.z-L.fz*.45},e:{x:L.x+L.fx*.7,z:L.z+L.fz*.7},t:{x:-L.fz,z:L.fx}};}
export function nearestLadder(a,reach=1.5){
  let best=null,bd=reach;
  for(const L of ladders){const g=ladderGeometry(L);for(const p of [g.c,g.e]){const d=Math.hypot(a.x-p.x,a.z-p.z);if(d<bd&&Math.abs((a.fy??0)-(p===g.c?L.bottom:L.top))<.6){bd=d;best=L;}}}
  return best;
}
let activeDef=CAMP_WORLD;
const worldCaches=new WeakMap([[CAMP_WORLD,{}]]);
export function setWorld(def){
  if(activeDef===def)return;
  activeDef=def;
  cover.length=0;cover.push(...def.cover);walls.length=0;walls.push(...def.walls);
  obstacles.length=0;obstacles.push(...cover,...walls);Object.assign(world,def);
  features.length=0;features.push(...(def.features||[]));ladders.length=0;ladders.push(...(def.ladders||[]));
  ground=makeGround(def);
  if(!worldCaches.has(def))worldCaches.set(def,{});
}
export function blocked(x,z,r=.3) {
  const gh=features.length?groundAt(x,z):0;
  return obstacles.some(b=>x+r>b.x-b.w/2&&x-r<b.x+b.w/2&&z+r>b.z-b.d/2&&z-r<b.z+b.d/2&&(!features.length||(b.h>gh+.3&&(b.y0??0)<gh+1.8)));
}
// Walking cannot climb a ledge taller than STEP, but dropping down is always allowed.
export function move(body,dx,dz,r=.3) {
  const fy=body.fy??0,terrain=features.length>0,
    // The whole body, not just its centre, must stay clear of ledges, so the camera never ends up inside a pit wall.
    level=(x,z)=>groundAt(x,z)-fy<=STEP&&groundAt(x+r,z)-fy<=STEP&&groundAt(x-r,z)-fy<=STEP&&groundAt(x,z+r)-fy<=STEP&&groundAt(x,z-r)-fy<=STEP,
    ok=(x,z)=>!blocked(x,z,r)&&(!terrain||level(x,z));
  if(ok(body.x+dx,body.z))body.x+=dx;if(ok(body.x,body.z+dz))body.z+=dz;
}
export function rayBox(origin,dir,b) {
  let near=0,far=Infinity;
  for(const [axis,min,max] of [['x',b.x-b.w/2,b.x+b.w/2],['y',b.y0??0,b.h],['z',b.z-b.d/2,b.z+b.d/2]]) {
    if(Math.abs(dir[axis])<1e-8) {if(origin[axis]<min||origin[axis]>max)return Infinity;}
    else {let a=(min-origin[axis])/dir[axis],c=(max-origin[axis])/dir[axis];if(a>c)[a,c]=[c,a];near=Math.max(near,a);far=Math.min(far,c);if(near>far)return Infinity;}
  } return near;
}
// First point where a ray dips below the ground (pit walls, ramps, plateaus), found by marching then bisecting.
export function terrainDistance(origin,dir,maxT=Infinity){
  if(!features.length)return Infinity;
  const limit=Math.min(maxT,160),step=.3,below=t=>origin.y+dir.y*t<groundAt(origin.x+dir.x*t,origin.z+dir.z*t)-1e-6;
  if(below(0))return 0;
  let prev=0;
  for(let t=step;;t+=step){
    const tt=Math.min(t,limit);
    if(below(tt)){let lo=prev,hi=tt;for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(below(mid))hi=mid;else lo=mid;}return hi;}
    prev=tt;if(tt>=limit)return Infinity;
  }
}
export function wallDistance(origin,dir) {return Math.min(terrainDistance(origin,dir),...obstacles.map(b=>rayBox(origin,dir,b)));}
export function visible(a,b) {
  const ay=(a.fy??0)+1,by=(b.fy??0)+1,dx=b.x-a.x,dz=b.z-a.z,dy=by-ay,d=Math.hypot(dx,dy,dz);
  return d<.01||wallDistance({x:a.x,y:ay,z:a.z},{x:dx/d,y:dy/d,z:dz/d})>d;
}
// Grid flow field lets sentries navigate around cover instead of getting stuck. Cells whose centre is blocked, and
// steps taller than a ramp (a pit wall or ladder face), are not walkable. Blocked and height grids are built once per
// world, so a search is just a flood fill over a few typed arrays.
class FlowField{
  constructor(min,size,dist){this.min=min;this.size_=size;this.dist=dist;}
  at(x,z){const i=x-this.min,j=z-this.min;if(i<0||j<0||i>=this.size_||j>=this.size_)return undefined;const d=this.dist[j*this.size_+i];return d<0?undefined:d;}
  get(key){const [x,z]=key.split(',').map(Number);return this.at(x,z);}
  has(key){return this.get(key)!==undefined;}
}
function walkGrid(){
  const c=worldCaches.get(activeDef);if(c.grid)return c.grid;
  const min=-world.half,size=2*world.half+1,blockedCells=new Uint8Array(size*size),heights=new Float32Array(size*size);
  // A cell is only walkable if a bot's whole body fits: no obstacle within its radius and no ledge taller than a
  // ramp within reach of it. This keeps routes off ramp edges and trench corners, where bots used to jam.
  const probes=[[.45,0],[-.45,0],[0,.45],[0,-.45],[.32,.32],[-.32,.32],[.32,-.32],[-.32,-.32]];
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){
    const x=min+i,z=min+j,g=features.length?groundAt(x,z):0;let bad=blocked(x,z,.42);
    if(!bad&&features.length)for(const [ox,oz] of probes)if(Math.abs(groundAt(x+ox,z+oz)-g)>.6){bad=true;break;}
    blockedCells[j*size+i]=bad?1:0;heights[j*size+i]=g;
  }
  return c.grid={min,size,blockedCells,heights};
}
export function flowField(target) {
  const {min,size,blockedCells,heights}=walkGrid(),limit=world.half-1,terrain=features.length>0;
  const dist=new Int32Array(size*size).fill(-1),queue=new Int32Array(size*size);
  const tx=Math.round(target.x),tz=Math.round(target.z),start=(tz-min)*size+(tx-min);
  if(tx<min||tz<min||tx-min>=size||tz-min>=size)return new FlowField(min,size,dist);
  dist[start]=0;queue[0]=start;let head=0,tail=1;
  while(head<tail){
    const cur=queue[head++],i=cur%size,j=(cur-i)/size,d=dist[cur];
    for(let k=0;k<4;k++){
      const ni=k===0?i+1:k===1?i-1:i,nj=k===2?j+1:k===3?j-1:j;
      if(ni<0||nj<0||ni>=size||nj>=size)continue;
      const next=nj*size+ni;
      if(dist[next]>=0||blockedCells[next]||Math.abs(min+ni)>limit||Math.abs(min+nj)>limit)continue;
      if(terrain&&Math.abs(heights[next]-heights[cur])>.6)continue;
      dist[next]=d+1;queue[tail++]=next;
    }
  }
  return new FlowField(min,size,dist);
}
// True if a straight walk between two points crosses only walkable cells and never a ledge.
export function walkableLine(a,b){
  const {min,size,blockedCells,heights}=walkGrid(),dx=b.x-a.x,dz=b.z-a.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.5));
  let prev=null;
  for(let k=0;k<=n;k++){
    const i=Math.round(a.x+dx*k/n)-min,j=Math.round(a.z+dz*k/n)-min;
    if(i<0||j<0||i>=size||j>=size)return false;
    const c=j*size+i;
    if(k>0&&blockedCells[c])return false;
    if(prev!==null&&Math.abs(heights[c]-heights[prev])>.6)return false;
    prev=c;
  }
  return true;
}
export function nextStep(body,field) {
  const x=Math.round(body.x),z=Math.round(body.z);let best=null,dist=Infinity;
  for(const [nx,nz] of [[x,z],[x+1,z],[x-1,z],[x,z+1],[x,z-1]]){const d=field.at(nx,nz);if(d!==undefined&&d<dist){dist=d;best={x:nx,z:nz};}}
  if(!best){
    // Off the map of reachable cells (squeezed against something): head for the nearest cell that does connect.
    for(let r=2;r<=3&&!best;r++)for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
      if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;
      // only cells the body can actually step to: not across a pit wall or a ledge
      const cx=x+dx,cz=z+dz,d=field.at(cx,cz),{min,size,heights}=walkGrid(),i=cx-min,j=cz-min;
      if(d!==undefined&&d<dist&&i>=0&&j>=0&&i<size&&j<size&&Math.abs(heights[j*size+i]-(body.fy??0))<=STEP+.05){dist=d;best={x:cx,z:cz};}
    }
  }
  return best;
}
