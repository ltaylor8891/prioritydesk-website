// Oakfield: an 80 x 80 metre town with streets, enterable buildings, a plaza and open lots.
const DOOR=2.8,WALL=.6;
const palettes={
  brick:[.7,.44,.36],cream:[.86,.78,.6],blue:[.45,.58,.66],green:[.5,.62,.48],yellow:[.9,.76,.42],grey:[.62,.64,.62],red:[.76,.36,.3]
};
// door: side the doorway faces (n = north / -z, s = south / +z, e = +x, w = -x).
const BUILDINGS=[
  {x:-20,z:-20,w:12,d:9,h:5,door:'s',name:'OAKFIELD BANK',sub:'EST. 1921',c:'cream',roof:[.36,.4,.42]},
  {x:-32,z:-10,w:8,d:8,h:4,door:'e',name:'CAFE',sub:'COFFEE / CAKE',c:'yellow',roof:[.55,.3,.25]},
  {x:-10,z:-12,w:6,d:6,h:4,door:'s',name:'GENERAL STORE',sub:'',c:'green',roof:[.4,.3,.26]},
  {x:-32,z:-27,w:10,d:8,h:5,door:'s',name:'WAREHOUSE',sub:'GOODS IN / OUT',c:'grey',roof:[.34,.38,.4]},
  {x:22,z:-20,w:14,d:10,h:7.5,door:'w',name:'GRAND HOTEL',sub:'ROOMS AVAILABLE',c:'red',roof:[.3,.3,.34]},
  {x:10,z:-12,w:6,d:6,h:4,door:'s',name:'PHARMACY',sub:'',c:'blue',roof:[.34,.4,.38]},
  {x:33,z:-8,w:8,d:9,h:4,door:'s',name:'GARAGE',sub:'REPAIRS',c:'grey',roof:[.5,.34,.28]},
  {x:-8,z:-27,w:10,d:7,h:5,door:'s',name:'LIBRARY',sub:'QUIET PLEASE',c:'cream',roof:[.38,.34,.4]},
  {x:9.5,z:-27,w:9,d:7,h:5.5,door:'s',name:'TOWN HALL',sub:'',c:'brick',roof:[.3,.36,.4]},
  {x:-24,z:17,w:10,d:14,h:7,door:'e',name:'',sub:'',c:'cream',roof:[.45,.3,.28]},
  {x:-20,z:29,w:14,d:7,h:5,door:'n',name:'OAKFIELD SCHOOL',sub:'',c:'brick',roof:[.34,.36,.4]},
  {x:-34,z:3,w:6,d:6,h:3.6,door:'e',name:'',sub:'',c:'yellow',roof:[.5,.28,.24]},
  {x:34,z:4,w:6,d:6,h:3.6,door:'w',name:'',sub:'',c:'green',roof:[.5,.28,.24]},
  {x:-12,z:14,w:8,d:8,h:7,door:'n',name:'APARTMENTS',sub:'',c:'blue',roof:[.36,.36,.4]},
  {x:22,z:22,w:14,d:10,h:4.5,door:'n',name:'SUPERMARKET',sub:'FRESH DAILY',c:'green',roof:[.3,.34,.36]},
  {x:12,z:14,w:7,d:6,h:3.6,door:'w',name:'DINER',sub:'OPEN 24H',c:'red',roof:[.34,.34,.36]},
  {x:33,z:28,w:6,d:5,h:3.4,door:'w',name:'GAS',sub:'',c:'yellow',roof:[.36,.3,.3]},
  {x:-8.5,z:26,w:7,d:6,h:3.8,door:'n',name:'BAKERY',sub:'',c:'yellow',roof:[.5,.32,.26]},
  {x:9,z:27,w:8,d:6,h:3.8,door:'n',name:'HARDWARE',sub:'',c:'blue',roof:[.4,.32,.28]}
];
const COVER=[
  {x:0,z:0,w:3.6,d:3.6,h:.95,kind:'fountain'},{x:-8,z:8,w:2.4,d:2.4,h:9,kind:'clock'},
  {x:-33,z:13,w:3,d:3,h:11,kind:'bell'},{x:33,z:14,w:2.6,d:2.6,h:9,kind:'water'},
  {x:5,z:5,w:3,d:1.6,h:1.4,kind:'stall'},{x:-5,z:-5,w:3,d:1.6,h:1.4,kind:'stall'},
  {x:5,z:-5.5,w:2.6,d:.8,h:1.05,kind:'barrier'},{x:-5.5,z:4.5,w:.8,d:2.6,h:1.05,kind:'barrier'},
  {x:30,z:22,w:.8,d:.8,h:1.5,kind:'pump'},{x:33,z:22,w:.8,d:.8,h:1.5,kind:'pump'},{x:36,z:22,w:.8,d:.8,h:1.5,kind:'pump'},
  {x:3,z:-18,w:1.9,d:4.2,h:1.25,kind:'car',c:[.83,.42,.3]},{x:2.8,z:19,w:1.9,d:4.2,h:1.25,kind:'car',c:[.35,.56,.76]},
  {x:1,z:-31.5,w:1.9,d:4.2,h:1.25,kind:'car',c:[.9,.8,.4]},{x:-3,z:12,w:1.9,d:4.2,h:1.25,kind:'car',c:[.55,.7,.45]},
  {x:-20,z:2.6,w:4.2,d:1.9,h:1.25,kind:'car',c:[.88,.76,.35]},{x:-29,z:-2.4,w:4.2,d:1.9,h:1.25,kind:'car',c:[.78,.38,.34]},
  {x:19,z:-2.8,w:4.2,d:1.9,h:1.25,kind:'car',c:[.4,.55,.7]},{x:28,z:2.8,w:4.2,d:1.9,h:1.25,kind:'car',c:[.82,.82,.78]},
  {x:15,z:-8,w:2.4,d:.9,h:1.05,kind:'barrier'},{x:-16,z:-9,w:.9,d:2.4,h:1.05,kind:'barrier'},
  {x:20,z:7,w:1.4,d:1.4,h:1.2,kind:'crate'},{x:-18,z:8,w:1.4,d:1.4,h:1.2,kind:'crate'},{x:-1,z:25,w:2.2,d:1,h:1.1,kind:'barrier'},
  ...[[-6,-20],[6,-20],[-6,22],[6,22],[-36,-20],[36,-20],[36,20],[-36,22],[20,-6],[-20,6],[36,-31],[-36,-33]].map(([x,z])=>({x,z,w:.55,d:.55,h:3,kind:'tree'}))
];
export function townBuildingWalls(b){
  const segs=[],t=WALL,{x,z,w,d,h,door}=b,gap=DOOR;
  const along=(cx,cz,length,horizontal,doorHere)=>{
    if(!doorHere){segs.push(horizontal?{x:cx,z:cz,w:length,d:t,h}:{x:cx,z:cz,w:t,d:length,h});return;}
    const side=(length-gap)/2;
    for(const sign of [-1,1]){
      const centre=sign*(gap/2+side/2);
      segs.push(horizontal?{x:cx+centre,z:cz,w:side,d:t,h}:{x:cx,z:cz+centre,w:t,d:side,h});
    }
  };
  along(x,z-d/2+t/2,w,true,door==='n');along(x,z+d/2-t/2,w,true,door==='s');
  along(x-w/2+t/2,z,d-2*t,false,door==='w');along(x+w/2-t/2,z,d-2*t,false,door==='e');
  return segs;
}
export function townObstacles(){
  const cover=[];
  for(const b of BUILDINGS){
    cover.push(...townBuildingWalls(b));
    // A counter inside every larger building gives fighters something to hold.
    if(b.w>=8&&b.d>=7)cover.push({x:b.x,z:b.z,w:Math.min(4,b.w*.4),d:.9,h:1.1});
  }
  for(const c of COVER)cover.push({x:c.x,z:c.z,w:c.w,d:c.d,h:c.h});
  return cover;
}
export const TOWN_WORLD={id:'town',name:'Oakfield',subtitle:'TOWN CENTRE',half:40,
  cover:townObstacles(),
  walls:[{x:0,z:-40,w:81,d:1,h:4},{x:0,z:40,w:81,d:1,h:4},{x:-40,z:0,w:1,d:80,h:4},{x:40,z:0,w:1,d:80,h:4}],
  spawns:[[-24,35],[-8,36],[8,36],[24,35],[-24,-35],[-8,-36],[8,-36],[24,-35]],
  routes:[[-26,0],[-1,-20],[26,0],[1,20],[-18,-12],[18,-8],[-18,6],[20,10]],
  zones:[[-24,2],[0,0],[24,-2]],
  menu:{camera:{x:5,y:2.4,z:33,yaw:-.1,pitch:.03},actors:[{x:2,z:23,variant:0,yaw:-.25,phase:0,flash:0},{x:-3,z:14,variant:1,yaw:-.5,phase:1,flash:0},{x:6,z:7,variant:2,yaw:0,phase:2,flash:0}]},
  views:[{x:0,y:10,z:38.5,yaw:0,pitch:-.34},{x:-37,y:13,z:-37,yaw:2.356,pitch:-.42},{x:37,y:13,z:-37,yaw:-2.356,pitch:-.42}],
  viewNames:['SOUTH GATE','NORTH-WEST ROOF','NORTH-EAST ROOF'],gridStep:10,
  labels:[['PLAZA',0,.14],['MAIN ST',.1,-.62],['BANK',-.4,-.5],['HOTEL',.55,-.5],['SUPERMARKET',.55,.55],['CHURCH',-.6,.45]]};

const ink=[.12,.16,.12];
export function buildTown(rawBox,quad){
  const geometry=[],lines=[],decals=[];
  const line=(a,b,c=ink)=>{for(const p of [a,b])lines.push(...p,...c,0,0);};
  const box=(x,y,z,w,h,d,c,outline=true)=>{
    rawBox(geometry,x,y,z,w,h,d,c);
    if(!outline)return;
    const a=x-w/2,b=x+w/2,l=z-d/2,r=z+d/2,t=y+h;
    for(const yy of [y,t]){line([a,yy,l],[b,yy,l]);line([b,yy,l],[b,yy,r]);line([b,yy,r],[a,yy,r]);line([a,yy,r],[a,yy,l]);}
    for(const xx of [a,b])for(const zz of [l,r])line([xx,y,zz],[xx,t,zz]);
  };
  const flat=(x,z,w,d,c,y=.012)=>quad(geometry,[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]],c);
  const sign=(x,y,z,text,sub='',w=3.5,h=.8,yaw=0)=>decals.push({x,y,z,w,h,yaw,kind:'sign',text,sub});
  const glass=[.45,.63,.7],dark=[.26,.22,.2],wood=[.51,.39,.25];
  // Ground, streets, pavements and the central plaza.
  box(0,-.2,0,96,.2,96,[.52,.64,.4],false);
  flat(0,0,8,80,[.36,.38,.37],.016);flat(0,0,80,8,[.36,.38,.37],.017);
  for(const s of [-5,5]){flat(s,0,2,80,[.76,.73,.64],.013);flat(0,s,80,2,[.76,.73,.64],.014);}
  flat(0,0,17,17,[.82,.75,.6],.02);flat(0,0,10,10,[.72,.66,.54],.022);
  for(let i=-36;i<=36;i+=4){
    if(Math.abs(i)>9){flat(0,i,.22,1.8,[.93,.88,.66],.024);flat(i,0,1.8,.22,[.93,.88,.66],.024);}
  }
  for(const o of [-9.5,9.5]){for(let k=-3;k<=3;k++){flat(k*1.1,o,.55,1.5,[.92,.92,.88],.025);flat(o,k*1.1,1.5,.55,[.92,.92,.88],.025);}}
  for(let i=0;i<120;i++){const x=Math.sin(i*91.3)*38,z=Math.cos(i*57.9)*38;if(Math.abs(x)<5||Math.abs(z)<5)continue;flat(x,z,.8+(i%4)*.5,.6+(i%3)*.4,[.46,.58,.36],.014);}
  // Buildings: hollow shells with real doorways, window panes and a roof slab.
  for(const b of BUILDINGS){
    const wall=palettes[b.c],t=WALL;
    for(const s of townBuildingWalls(b))box(s.x,0,s.z,s.w,s.h,s.d,wall);
    flat(b.x,b.z,b.w-2*t,b.d-2*t,[.62,.52,.4],.03);
    // Lintel above the doorway.
    const dx=b.door==='e'?b.x+b.w/2-t/2:b.door==='w'?b.x-b.w/2+t/2:b.x,dz=b.door==='n'?b.z-b.d/2+t/2:b.door==='s'?b.z+b.d/2-t/2:b.z;
    const ns=b.door==='n'||b.door==='s';
    box(dx,2.5,dz,ns?DOOR:t,Math.max(.2,b.h-2.5),ns?t:DOOR,wall);
    // Windows on every outer face, skipping the doorway.
    const windows=(len,fixed,horizontal,outward,doorFace)=>{
      for(let u=-len/2+1.8;u<=len/2-1.2;u+=2.6){
        if(doorFace&&Math.abs(u)<DOOR/2+.9)continue;
        for(let y=1.2;y+1.3<b.h-.2&&y<5.2;y+=2.6){
          horizontal?box(b.x+u,y,fixed+outward*.03,1.2,1.1,.07,glass):box(fixed+outward*.03,y,b.z+u,.07,1.1,1.2,glass);
        }
      }
    };
    windows(b.w,b.z-b.d/2,true,-1,b.door==='n');windows(b.w,b.z+b.d/2,true,1,b.door==='s');
    windows(b.d,b.x-b.w/2,false,-1,b.door==='w');windows(b.d,b.x+b.w/2,false,1,b.door==='e');
    box(b.x,b.h,b.z,b.w+.6,.3,b.d+.6,b.roof);
    if(b.name)sign(b.x,Math.max(2.9,b.h-1.15),b.z+b.d/2+.06,b.name,b.sub,Math.min(5,b.w-.8),b.sub?.9:.7);
  }
  // Props: fountain, clock tower, church spire, water tank, cars, stalls and trees.
  const props={
    fountain:c=>{box(c.x,0,c.z,c.w,c.h,c.d,[.74,.72,.66]);flat(c.x,c.z,c.w-.8,c.d-.8,[.4,.66,.78],c.h+.012);box(c.x,c.h,c.z,.5,1.4,.5,[.78,.76,.7]);},
    clock:c=>{box(c.x,0,c.z,c.w,c.h,c.d,[.62,.5,.4]);box(c.x,c.h,c.z,c.w+.6,.4,c.d+.6,[.36,.3,.3]);box(c.x,c.h+.4,c.z,.2,1.2,.2,dark);
      for(const [dxx,dzz,yaw] of [[0,c.d/2+.05,0],[0,-c.d/2-.05,0]])sign(c.x+dxx,c.h-2.3,c.z+dzz,'12','',1.5,1.5,yaw);},
    bell:c=>{box(c.x,0,c.z,c.w,c.h,c.d,[.82,.76,.62]);box(c.x,c.h,c.z,c.w+.5,.3,c.d+.5,[.4,.3,.28]);box(c.x,c.h+.3,c.z,.5,2.4,.5,[.4,.3,.28]);
      for(const o of [-1.1,1.1])box(c.x+o*.01,8.2,c.z+o,.9,1.4,.3,dark,false);},
    water:c=>{box(c.x,0,c.z,c.w,c.h,c.d,wood);box(c.x,c.h,c.z,5,3,5,[.58,.62,.55]);box(c.x,c.h+3,c.z,5.4,.25,5.4,[.3,.36,.3]);},
    stall:c=>{box(c.x,0,c.z,c.w,.9,c.d,wood);for(const o of [-1.3,1.3])box(c.x+o,.9,c.z,.1,1.6,.1,wood);box(c.x,2.4,c.z,c.w+.4,.12,c.d+.5,[.8,.3,.25]);},
    barrier:c=>{box(c.x,0,c.z,c.w,c.h,c.d,[.7,.7,.66]);},
    pump:c=>{box(c.x,0,c.z,c.w,c.h,c.d,[.8,.3,.25]);box(c.x,c.h,c.z,c.w*.8,.3,c.d*.8,dark);},
    crate:c=>{box(c.x,0,c.z,c.w,c.h,c.d,[.64,.48,.29]);},
    car:c=>{const longZ=c.d>c.w;box(c.x,.28,c.z,c.w,.72,c.d,c.c);box(c.x,.98,c.z,longZ?c.w*.92:c.w*.5,.5,longZ?c.d*.5:c.d*.92,[.82,.88,.86]);
      for(const a of [-1,1])for(const b of [-1,1])box(c.x+(longZ?a*(c.w/2-.05):b*(c.w*.32)),0,c.z+(longZ?b*(c.d*.32):a*(c.d/2-.05)),longZ?.22:.6,.38,longZ?.6:.22,dark,false);},
    tree:c=>{box(c.x,0,c.z,c.w,c.h,c.d,wood);box(c.x,2.4,c.z,3.1,2.7,3.1,[.36,.52,.3]);box(c.x+.2,4.4,c.z,2.2,1.6,2.2,[.45,.6,.33]);}
  };
  for(const c of COVER)props[c.kind](c);
  // Gas-station canopy (visual only, above head height) and street furniture.
  box(33.7,3.8,22,8,.3,6,[.82,.3,.26]);
  for(const [x,z] of [[-5.1,-2],[5.1,2],[-5.1,-16],[5.1,16],[-5.1,24],[5.1,-24],[-14,-5.1],[14,5.1],[-26,5.1],[26,-5.1]]){box(x,0,z,.14,3.6,.14,dark);box(x,3.5,z,.5,.2,.5,[.92,.84,.5],false);}
  // Boundary: brick wall with a coping stone along the top.
  for(const [x,z,w,d] of [[0,-40,81,1],[0,40,81,1],[-40,0,1,80],[40,0,1,80]]){box(x,0,z,w,4,d,[.6,.42,.34]);box(x,4,z,w+.4,.3,d+.4,[.42,.34,.3]);}
  // Distant hills and painted clouds beyond the wall.
  for(let i=-8;i<=8;i++){
    const h=9+Math.abs((i*7)%5)*3,p=i*12,off=58+Math.sin(i)*5;
    for(const [x,z,ns] of [[p,-off,true],[p,off,true],[-off,p,false],[off,p,false]]){
      const a=ns?[[x-8,0,z],[x+8,0,z],[x+2,h,z],[x-2,h-1,z]]:[[x,0,z-8],[x,0,z+8],[x,h,z+2],[x,h-1,z-2]];
      quad(geometry,a,[.5,.58,.45]);
    }
  }
  for(const [x,y,z,w] of [[-26,18,-52,14],[16,21,-58,16],[34,16,-48,11],[-8,19,52,15],[28,17,50,12]])decals.push({x,y,z,w,h:w*.3,yaw:0,kind:'cloud'});
  return {geometry,lines,decals};
}
