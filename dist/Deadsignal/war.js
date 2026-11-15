import {townBuildingWalls} from './town.js?v=permanent-3';
import {makeGround} from './core.js?v=permanent-3';

// Ashen Front: a 144 m battlefield. A ring of trenches with forward saps surrounds a cratered no-man's-land of
// ruined buildings, wrecks and rubble; ramps, ladders and four raised command posts connect the levels, and the
// ground rolls gently. Everything is point-symmetric (x,z -> -x,-z) so blue and orange start with the same advantages.
// All terrain edges sit on whole metres so the ground can be a gap-free grid of 1 m cells.
const TRENCH=-2.2,CRATER=-1.2,POST=3.2;
const flat=(x,z,w,d,h)=>({kind:'flat',x,z,w,d,h});
const ramp=(x,z,w,d,axis,from,to)=>({kind:'ramp',x,z,w,d,axis,from,to});
const turn=r=>r.kind==='ramp'?{...r,x:-r.x,z:-r.z,from:r.to,to:r.from}:{...r,x:-r.x,z:-r.z};
const ladder=(x,z,fx,fz,bottom,top)=>({x,z,fx,fz,bottom,top});
const flipDoor={n:'s',s:'n',e:'w',w:'e'};

const halfFeatures=[
  flat(0,38,108,4,TRENCH),flat(-52,0,4,76,TRENCH),                       // south trench and west trench (north and east by symmetry)
  flat(-24,25,4,22,TRENCH),flat(24,25,4,22,TRENCH),                      // forward saps
  flat(-12,-12,4,4,CRATER),flat(-40,-14,4,4,CRATER),flat(-18,-28,4,4,CRATER),flat(10,-20,4,4,CRATER),flat(36,-24,4,4,CRATER),flat(-24,-4,4,4,CRATER),
  flat(-32,-2,4,4,POST),flat(-4,-26,4,4,POST),                           // raised command posts
  ramp(-44,44,4,8,'z',TRENCH,0),ramp(-8,44,4,8,'z',TRENCH,0),ramp(16,44,4,8,'z',TRENCH,0),ramp(44,44,4,8,'z',TRENCH,0),   // out of the south trench to the rear
  ramp(-44,32,4,8,'z',0,TRENCH),ramp(0,32,4,8,'z',0,TRENCH),ramp(40,32,4,8,'z',0,TRENCH),                                     // from the island into it
  ramp(-8,-12,4,4,'x',CRATER,0),ramp(-40,-10,4,4,'z',CRATER,0),ramp(-18,-32,4,4,'z',0,CRATER),ramp(6,-20,4,4,'x',0,CRATER),ramp(32,-24,4,4,'x',0,CRATER),ramp(-20,-4,4,4,'x',CRATER,0)
];
const features=[...halfFeatures,...halfFeatures.map(turn)];
// A ladder's (x,z) is the wall face on the low side; (fx,fz) points up and over the wall.
const halfLadders=[
  ladder(-12,36,0,-1,TRENCH,0),ladder(12,36,0,-1,TRENCH,0),ladder(-24,40,0,1,TRENCH,0),ladder(24,40,0,1,TRENCH,0),
  ladder(-24,14,0,-1,TRENCH,0),ladder(24,14,0,-1,TRENCH,0),
  ladder(-50,12,1,0,TRENCH,0),ladder(-54,-20,-1,0,TRENCH,0),
  ladder(-32,0,0,-1,0,POST),ladder(-4,-24,0,-1,0,POST)
];
const ladders=[...halfLadders,...halfLadders.map(l=>({...l,x:-l.x,z:-l.z,fx:-l.fx,fz:-l.fz}))];

// ---- hand-placed structures (half of the map; mirrored below)
const house=(x,z,w,d,h,door,name='')=>({kind:'house',x,z,w,d,h,door,name});
const traverse=(x,z,w,d)=>({kind:'traverse',x,z,w,d,y0:TRENCH,h:TRENCH+1.4});
const parapet=(x,z,w,d)=>({kind:'parapet',x,z,w,d,y0:POST,h:POST+1.1});
const hand=[
  house(-34,-24,9,7,3.4,'s','FARMHOUSE'),house(-2,-8,8,6,3.2,'e'),house(-46,22,8,10,5,'e','CHAPEL'),house(-16,12,7,6,3.2,'n'),house(-16,31,7,5,3,'w'),
  house(-56,52,10,8,3.4,'e'),house(-30,54,8,6,3.2,'n'),house(28,50,9,7,3.4,'w'),house(60,56,9,8,3.2,'w'),house(0,54,14,8,4.4,'n','BARN'),house(-62,28,7,6,3,'e'),house(-58,-14,8,6,3.2,'w'),
  {kind:'wreck',x:4,z:-1,w:6,d:3,h:2},{kind:'wreck',x:-28,z:-10,w:6,d:3,h:2},{kind:'wreck',x:14,z:30,w:3,d:6,h:2},
  // trench traverses, alternating sides so the trench zig-zags
  ...[-34,-18,-4,10,26,34].map((x,i)=>traverse(x,i%2?39.25:36.75,.8,1.5)),
  ...[-26,-8,10,26].map((z,i)=>traverse(i%2?-53.25:-50.75,z,1.5,.8)),
  traverse(-25.3,22,1.4,.8),traverse(-22.7,30,1.4,.8),traverse(-25.3,18,1.4,.8),
  // sandbag parapets round the command posts, leaving the ladder side open
  parapet(-32,-3.7,4,.5),parapet(-33.75,-2,.5,3.4),parapet(-30.25,-2,.5,3.4),
  parapet(-4,-27.7,4,.5),parapet(-5.75,-26,.5,3.4),parapet(-2.25,-26,.5,3.4)
];
const spin=b=>{const o={...b,x:-b.x,z:-b.z};if(b.door)o.door=flipDoor[b.door];return o;};

const spawns=[[-48,62],[-16,64],[16,64],[48,62],[48,-62],[16,-64],[-16,-64],[-48,-62]];
const zoneCentres=[[-38,6],[0,0],[38,-6]];
const ladderEnds=l=>{const cx=l.x-l.fx*.45,cz=l.z-l.fz*.45,ex=l.x+l.fx*.7,ez=l.z+l.fz*.7;return [[cx,cz],[ex,ez]];};

// ---- procedural cover, placed deterministically (same on every client and the server)
function generateCover(structures){
  let seed=20241114;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
  const rects=[];
  const add=(x,z,w,d,m)=>rects.push({x,z,w:w+2*m,d:d+2*m});
  for(const f of features)add(f.x,f.z,f.w,f.d,1.8);
  for(const l of ladders)for(const [x,z] of ladderEnds(l))add(x,z,1,1,1.6);
  for(const [x,z] of spawns)add(x,z,2,2,3);
  for(const b of structures)add(b.x,b.z,b.w,b.d,b.kind==='house'?2.6:.8);
  const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.z-b.z)<(a.d+b.d)/2;
  const out=[];
  const place=(kind,count,make)=>{
    for(let n=0,tries=0;n<count&&tries<count*60;tries++){
      const item=make();
      const box={x:item.x,z:item.z,w:item.w+1,d:item.d+1},mirror={x:-item.x,z:-item.z,w:item.w+1,d:item.d+1};
      if(Math.abs(item.x)>67||item.z<2||item.z>67)continue;
      if(rects.some(r=>overlap(r,box)||overlap(r,mirror))||overlap(box,mirror))continue;
      rects.push(box,mirror);out.push({kind,...item});n++;
    }
  };
  const span=()=>[(rnd()*2-1)*66,3+rnd()*64];
  const turnBox=(w,d)=>rnd()<.5?[w,d]:[d,w];
  place('bags',16,()=>{const [x,z]=span(),[w,d]=turnBox(3+rnd()*2,1);return {x,z,w,d,h:1.2};});
  place('rubble',14,()=>{const [x,z]=span(),[w,d]=turnBox(2+rnd()*1.6,1.8+rnd()*1.4);return {x,z,w,d,h:.8+rnd()*.8};});
  place('blocks',12,()=>{const [x,z]=span();return {x,z,w:1.3,d:1.3,h:1.1};});
  place('wreck',6,()=>{const [x,z]=span(),[w,d]=turnBox(2.2,4.4);return {x,z,w,d,h:1.5};});
  place('tree',12,()=>{const [x,z]=span();return {x,z,w:.7,d:.7,h:3.7};});
  place('wire',9,()=>{const [x,z]=span(),[w,d]=turnBox(4+rnd()*2,.3);return {x,z,w,d,h:.9};});
  return out;
}
const structures=[...hand,...hand.map(spin)];
const scatter=generateCover(structures);
export const WAR_DECOR=[...structures,...scatter,...scatter.map(spin)];

const decorSolids=()=>{
  const out=[];
  for(const b of WAR_DECOR){
    if(b.kind==='house')out.push(...townBuildingWalls(b));
    else out.push({x:b.x,z:b.z,w:b.w,d:b.d,h:b.h,...(b.y0!==undefined?{y0:b.y0}:{})});
  }
  return out;
};
// Ground fades to dead flat around everything standing on it, so props never float or sink.
const flatZones=[
  ...WAR_DECOR.filter(b=>b.y0===undefined).map(b=>({x:b.x,z:b.z,w:b.w+3,d:b.d+3})),
  ...zoneCentres.concat(zoneCentres.map(([x,z])=>[-x,-z])).map(([x,z])=>({x,z,w:10,d:10})),
  ...spawns.map(([x,z])=>({x,z,w:8,d:8}))
];

export const WAR_WORLD={id:'war',name:'Ashen Front',subtitle:'NO MAN\'S LAND',half:72,sight:20,
  features,ladders,cover:decorSolids(),flat:flatZones,rolling:{amp:.45,fade:3.5},
  walls:[{x:0,z:-72,w:145,d:1,h:4},{x:0,z:72,w:145,d:1,h:4},{x:-72,z:0,w:1,d:144,h:4},{x:72,z:0,w:1,d:144,h:4}],
  spawns,
  routes:[[-52,0],[52,0],[-30,38],[30,-38],[0,48],[0,-48],[-24,25],[24,-25]],
  zones:zoneCentres,
  fog:{start:3,range:36,max:.95,color:[.66,.63,.56]},
  menu:{camera:{x:14,y:2.3,z:68,yaw:-.1,pitch:.03},actors:[{x:6,z:60,variant:0,yaw:-.25,phase:0,flash:0},{x:-4,z:56,variant:1,yaw:-.5,phase:1,flash:0},{x:14,z:56,variant:2,yaw:0,phase:2,flash:0}]},
  views:[{x:0,y:22,z:69,yaw:0,pitch:-.5},{x:-66,y:18,z:-62,yaw:2.2,pitch:-.4},{x:66,y:18,z:-62,yaw:-2.2,pitch:-.4}],
  viewNames:['SOUTH LINES','NORTH-WEST RIDGE','NORTH-EAST RIDGE'],gridStep:20,
  labels:[['NO MAN\'S LAND',0,.0],['BLUE LINE',0,.64],['ORANGE LINE',0,-.64]]};

const ink=[.12,.14,.1];
export function buildWar(rawBox,quad){
  const geometry=[],lines=[],decals=[];
  const line=(a,b,c=ink)=>{for(const p of [a,b])lines.push(...p,...c,0,0);};
  const box=(x,y,z,w,h,d,c,outline=true)=>{
    rawBox(geometry,x,y,z,w,h,d,c);
    if(!outline)return;
    const a=x-w/2,b=x+w/2,l=z-d/2,r=z+d/2,t=y+h;
    for(const yy of [y,t]){line([a,yy,l],[b,yy,l]);line([b,yy,l],[b,yy,r]);line([b,yy,r],[a,yy,r]);line([a,yy,r],[a,yy,l]);}
    for(const xx of [a,b])for(const zz of [l,r])line([xx,y,zz],[xx,t,zz]);
  };
  const sign=(x,y,z,text,sub='',w=3.5,h=.8,yaw=0)=>decals.push({x,y,z,w,h,yaw,kind:'sign',text,sub});
  const ground=makeGround(WAR_WORLD),half=WAR_WORLD.half,pad=4,min=-half-pad,N=2*(half+pad);
  const earth=[.5,.44,.31],mud=[.38,.32,.24],wallColour=[.43,.34,.25],plank=[.55,.42,.27],bag=[.66,.6,.42],iron=[.34,.37,.33];
  const hash=(a,b)=>{const v=Math.sin(a*127.1+b*311.7)*43758.5453;return v-Math.floor(v);};
  // The ground is one grid of 1 m cells. Each cell is a pit/ramp/plateau cell or rolling ground; wherever two
  // neighbouring cells disagree on height along their shared edge, an earth wall closes the gap, so it is watertight.
  const surface=(cx,cz)=>{
    const i=ground.cellFeature(min+cx,min+cz);
    return i>=0?{f:features[i],h:(x,z)=>ground.featureAt(features[i],x,z)}:{f:null,h:ground.base};
  };
  const cells=[];
  for(let cz=0;cz<N;cz++){cells.push([]);for(let cx=0;cx<N;cx++)cells[cz].push(surface(cx,cz));}
  for(let cz=0;cz<N;cz++)for(let cx=0;cx<N;cx++){
    const {f,h}=cells[cz][cx],x0=min+cx,z0=min+cz,x1=x0+1,z1=z0+1;
    let colour=earth;
    if(f){colour=f.kind==='ramp'?[.47,.4,.28]:f.h<0?mud:[.46,.4,.28];}
    else{const v=hash(Math.floor(cx/5),Math.floor(cz/5))*.65+hash(cx,cz)*.35;colour=[earth[0]+(v-.5)*.07,earth[1]+(v-.5)*.065,earth[2]+(v-.5)*.05];}
    quad(geometry,[[x0,h(x0,z0),z0],[x1,h(x1,z0),z0],[x1,h(x1,z1),z1],[x0,h(x0,z1),z1]],colour);
    const wall=(ax,az,bx,bz,other)=>{
      const ho=other.h,a0=h(ax,az),a1=h(bx,bz),b0=ho(ax,az),b1=ho(bx,bz);
      if(Math.abs(a0-b0)<.02&&Math.abs(a1-b1)<.02)return;
      const lo0=Math.min(a0,b0),hi0=Math.max(a0,b0),lo1=Math.min(a1,b1),hi1=Math.max(a1,b1);
      quad(geometry,[[ax,lo0,az],[bx,lo1,bz],[bx,hi1,bz],[ax,hi0,az]],hi0>0&&lo0>=-.05?[.55,.5,.4]:wallColour);
      line([ax,hi0,az],[bx,hi1,bz]);
    };
    if(cx+1<N)wall(x1,z0,x1,z1,cells[cz][cx+1]);
    if(cz+1<N)wall(x0,z1,x1,z1,cells[cz+1][cx]);
  }
  // beyond the grid the world is flat
  const far=240;
  for(const [a,b,c,d] of [[-far,-far,far,min],[-far,-min,far,far],[-far,min,min,-min],[-min,min,far,-min]])quad(geometry,[[a,0,b],[c,0,b],[c,0,d],[a,0,d]],earth);
  // ramp grooves and duckboards
  for(const f of features){
    if(f.kind!=='ramp')continue;
    const x0=f.x-f.w/2,z0=f.z-f.d/2,n=Math.round(f.axis==='x'?f.w:f.d);
    for(let k=1;k<n;k++){const t=k/n,h=f.from+(f.to-f.from)*t;if(f.axis==='x')line([x0+f.w*t,h+.03,z0],[x0+f.w*t,h+.03,z0+f.d],[.3,.25,.18]);else line([x0,h+.03,z0+f.d*t],[x0+f.w,h+.03,z0+f.d*t],[.3,.25,.18]);}
  }
  const board=(x0,z0,x1,z1)=>quad(geometry,[[x0,TRENCH+.05,z0],[x1,TRENCH+.05,z0],[x1,TRENCH+.05,z1],[x0,TRENCH+.05,z1]],plank);
  for(const z of [38,-38])board(-53,z-.7,53,z+.7);
  for(const x of [-52,52])board(x-.7,-37,x+.7,37);
  for(const [x,z] of [[-24,25],[24,25],[24,-25],[-24,-25]])board(x-.7,z-10.5,x+.7,z+10.5);
  // Ladders against their wall faces.
  for(const L of ladders){
    const tx=-L.fz,tz=L.fx,bx=L.x-L.fx*.12,bz=L.z-L.fz*.12,top=L.top+.9,hgt=top-L.bottom;
    for(const s of [-.34,.34])box(bx+tx*s,L.bottom,bz+tz*s,Math.abs(tx)*.08+.08,hgt,Math.abs(tz)*.08+.08,[.58,.43,.26]);
    for(let y=L.bottom+.3;y<top;y+=.38)box(bx,y,bz,Math.abs(tx)*.68+.06,.07,Math.abs(tz)*.68+.06,[.5,.37,.22],false);
  }
  // Props and cover.
  for(const b of WAR_DECOR){
    if(b.kind==='bags'){
      const along=b.w>=b.d,len=along?b.w:b.d;
      for(let y=0;y<b.h-.05;y+=.4)for(let k=.45;k<len;k+=.9){
        const off=(Math.round(y/.4)%2?.2:0),p=-len/2+k+off;if(p>len/2)continue;
        box(b.x+(along?p:0),y,b.z+(along?0:p),along?.86:b.w,.38,along?b.d:.86,[bag[0]+y*.04,bag[1],bag[2]]);
      }
    }else if(b.kind==='wreck'){
      const along=b.w>=b.d,l=along?b.w:b.d,w=along?b.d:b.w,ax=(u,v)=>along?[b.x+u,b.z+v]:[b.x+v,b.z+u];
      const hull=ax(0,0);box(hull[0],.25,hull[1],along?l:w,1,along?w:l,[.32,.34,.3]);
      if(b.h>1.8){const t=ax(-.5,0);box(t[0],1.25,t[1],along?2.6:w-.5,.75,along?w-.5:2.6,[.36,.38,.33]);const g=ax(2,0);box(g[0],1.5,g[1],along?3.2:.3,.22,along?.3:3.2,iron,false);}
      else{const t=ax(-.4,0);box(t[0],1.25,t[1],along?l*.5:w*.8,.4,along?w*.8:l*.5,[.28,.3,.27]);}
      for(const s of [-1,1]){const tr=ax(0,s*(w/2+.1));box(tr[0],0,tr[1],along?l+.4:.4,.5,along?.4:l+.4,[.2,.21,.19]);}
    }else if(b.kind==='wire'){
      const along=b.w>=b.d,len=along?b.w:b.d;
      for(let k=-len/2;k<=len/2;k+=1.2)box(b.x+(along?k:0),0,b.z+(along?0:k),.1,1.1,.1,[.3,.26,.2]);
      for(const y of [.35,.7,1])line(along?[b.x-len/2,y,b.z]:[b.x,y,b.z-len/2],along?[b.x+len/2,y,b.z]:[b.x,y,b.z+len/2],[.2,.2,.2]);
    }else if(b.kind==='rubble'){
      box(b.x,0,b.z,b.w,b.h*.7,b.d,[.5,.46,.4]);box(b.x-b.w*.15,b.h*.5,b.z+b.d*.1,b.w*.5,b.h*.5,b.d*.5,[.44,.4,.35]);box(b.x+b.w*.2,b.h*.3,b.z-b.d*.2,b.w*.35,b.h*.7,b.d*.4,[.56,.5,.42]);
    }else if(b.kind==='blocks'){
      box(b.x,0,b.z,b.w,b.h,b.d,[.6,.6,.57]);line([b.x-b.w/2,b.h*.5,b.z+b.d/2+.01],[b.x+b.w/2,b.h*.5,b.z+b.d/2+.01],[.35,.35,.33]);
    }else if(b.kind==='tree'){
      box(b.x,-.2,b.z,.45,b.h,.45,[.26,.22,.18]);box(b.x+.35,2.4,b.z,1.7,.15,.15,[.26,.22,.18],false);box(b.x-.4,2.9,b.z+.1,1.3,.15,.15,[.26,.22,.18],false);box(b.x,3.1,b.z-.4,.15,.15,1.2,[.26,.22,.18],false);
    }else if(b.kind==='traverse'){box(b.x,b.y0,b.z,b.w,b.h-b.y0,b.d,[.45,.36,.26]);box(b.x,b.h-.1,b.z,b.w+.2,.2,b.d+.2,plank);}
    else if(b.kind==='parapet')box(b.x,b.y0,b.z,b.w,b.h-b.y0,b.d,bag);
    else if(b.kind==='house'){
      const shell=[.55,.5,.42];
      for(const s of townBuildingWalls(b)){
        const broken=.55+((Math.abs(s.x*3+s.z*5)*7)%5)*.1;
        box(s.x,-.5,s.z,s.w,s.h*broken+.5,s.d,shell);
      }
      if(b.name)sign(b.x,Math.max(2.4,b.h-1.3),b.z+b.d/2+.06,b.name,'',Math.min(4,b.w-1),.7);
    }
  }
  // Perimeter, scorched trees and a ridge line in the haze.
  for(const [x,z,w,d] of [[0,-72,145,1],[0,72,145,1],[-72,0,1,144],[72,0,1,144]]){box(x,-.5,z,w,4.5,d,[.5,.4,.33]);box(x,4,z,w+.4,.25,d+.4,[.36,.32,.28]);}
  for(let i=-10;i<=10;i++){
    const h=9+Math.abs((i*5)%6)*3,p=i*16,off=96+Math.sin(i)*6;
    for(const [x,z,ns] of [[p,-off,true],[p,off,true],[-off,p,false],[off,p,false]]){
      const a=ns?[[x-11,0,z],[x+11,0,z],[x+3,h,z],[x-3,h-1,z]]:[[x,0,z-11],[x,0,z+11],[x,h,z+3],[x,h-1,z-3]];
      quad(geometry,a,[.46,.43,.36]);
    }
  }
  sign(0,2.2,-71.4,'ASHEN FRONT','MIND THE HOLES',10,1.1);sign(0,2.2,71.4,'BLUE LINES','',8,1,Math.PI);
  for(const [x,y,z,w] of [[-40,22,-90,22],[30,26,-100,26],[70,20,-85,18],[-14,24,92,24],[56,22,88,20]])decals.push({x,y,z,w,h:w*.3,yaw:0,kind:'cloud'});
  // Drifting ground mist: soft low patches (positions only; the game animates and draws them).
  const mist=[];
  for(let i=0;i<46;i++){const a=hash(i,1),b=hash(i,2);mist.push({x:(a*2-1)*64,z:(b*2-1)*64,size:9+hash(i,3)*9,phase:hash(i,4)*6.28,speed:.04+hash(i,5)*.05,rise:.5+hash(i,6)*.8});}
  return {geometry,lines,decals,mist,fog:WAR_WORLD.fog};
}
