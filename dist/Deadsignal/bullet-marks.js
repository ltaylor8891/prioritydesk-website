import {obstacles,features,terrainDistance,groundAt} from './core.js?v=permanent-3';

export const MAX_MARKS=180;
export const createMarks=()=>({list:[],serial:0});
export function clearMarks(marks){marks.list.length=0;}

// Nearest world surface along a ray (cover, boundary walls or ground), with its outward normal.
export function surfaceHit(origin,dir,maxDistance=Infinity){
  let best=null;
  for(const b of obstacles){
    let near=0,far=Infinity,axisHit=null,sign=0;
    for(const [axis,min,max] of [['x',b.x-b.w/2,b.x+b.w/2],['y',b.y0??0,b.h],['z',b.z-b.d/2,b.z+b.d/2]]){
      if(Math.abs(dir[axis])<1e-8){if(origin[axis]<min||origin[axis]>max){near=Infinity;break;}continue;}
      let a=(min-origin[axis])/dir[axis],c=(max-origin[axis])/dir[axis],s=dir[axis]>0?-1:1;
      if(a>c){[a,c]=[c,a];}
      if(a>near){near=a;axisHit=axis;sign=s;}
      far=Math.min(far,c);if(near>far){near=Infinity;break;}
    }
    // near===0 means the ray starts inside the box: ignore it, there is no face to mark.
    if(near>0&&near<Infinity&&axisHit&&(!best||near<best.t))best={t:near,axis:axisHit,sign};
  }
  if(features.length){const t=terrainDistance(origin,dir,maxDistance+.5);if(t<Infinity&&(!best||t<best.t))best={t,terrain:true};}
  else if(dir.y<-1e-8){const t=-origin.y/dir.y;if(t>0&&(!best||t<best.t))best={t,axis:'y',sign:1};}
  if(!best||best.t>maxDistance)return null;
  let normal={x:0,y:0,z:0};
  if(best.terrain){
    // The slope of the ground at the impact point gives the surface normal (flat ground up, pit walls sideways).
    const px=origin.x+dir.x*best.t,pz=origin.z+dir.z*best.t,e=.25,gx=(groundAt(px+e,pz)-groundAt(px-e,pz))/(2*e),gz=(groundAt(px,pz+e)-groundAt(px,pz-e))/(2*e),l=Math.hypot(gx,1,gz);
    normal={x:-gx/l,y:1/l,z:-gz/l};
  }else normal[best.axis]=best.sign;
  return {t:best.t,normal,point:{x:origin.x+dir.x*best.t,y:origin.y+dir.y*best.t,z:origin.z+dir.z*best.t}};
}

export function addMark(marks,hit,{size=.22,random=Math.random}={}){
  if(!hit)return null;
  const mark={point:hit.point,normal:hit.normal,size:size*(.8+random()*.5),spin:random()*Math.PI*2,variant:marks.serial++%3};
  marks.list.push(mark);if(marks.list.length>MAX_MARKS)marks.list.shift();
  return mark;
}

// World-space corners (same winding as the sprite quads) for one mark lying on its surface.
export function markCorners(mark){
  const n=mark.normal,h=mark.size/2;
  let u,v;
  if(Math.abs(n.y)>.5){u=[1,0,0];v=[0,0,1];}
  else{const l=Math.hypot(n.x,n.z)||1;u=[-n.z/l,0,n.x/l];v=[0,1,0];}
  const c=Math.cos(mark.spin),s=Math.sin(mark.spin);
  const ru=u.map((x,i)=>x*c+v[i]*s),rv=v.map((x,i)=>-u[i]*s+x*c);
  const lift=.012,o=[mark.point.x+n.x*lift,mark.point.y+n.y*lift,mark.point.z+n.z*lift];
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>[0,1,2].map(i=>o[i]+ru[i]*a*h+rv[i]*b*h));
}

// A cartoon bullet hole: dark centre, scorched ring and a few chipped-paper cracks.
export function drawMarkTexture(ctx,variant=0){
  const w=ctx.canvas.width,c=w/2;ctx.clearRect(0,0,w,w);
  const g=ctx.createRadialGradient(c,c,w*.04,c,c,w*.48);g.addColorStop(0,'rgba(24,22,18,.88)');g.addColorStop(.5,'rgba(48,40,30,.55)');g.addColorStop(1,'rgba(48,40,30,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,w,w);
  ctx.strokeStyle='rgba(32,28,22,.85)';ctx.lineCap='round';ctx.lineWidth=w*.025;
  for(let i=0;i<5+variant;i++){const a=i*(Math.PI*2/(5+variant))+variant*.7,r1=w*.1,r2=w*(.2+((i*37+variant*11)%10)/60);ctx.beginPath();ctx.moveTo(c+Math.cos(a)*r1,c+Math.sin(a)*r1);ctx.lineTo(c+Math.cos(a+.15)*r2,c+Math.sin(a+.15)*r2);ctx.stroke();}
  ctx.fillStyle='#0f0e0b';ctx.beginPath();ctx.ellipse(c,c,w*.09,w*.085,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,246,214,.55)';ctx.beginPath();ctx.arc(c-w*.025,c-w*.03,w*.02,0,Math.PI*2);ctx.fill();
}
