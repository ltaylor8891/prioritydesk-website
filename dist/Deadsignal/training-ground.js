import {cover,walls} from './core.js?v=feedback-1';
export const TRAINING_TARGETS=[{x:-12,z:-12.8,yaw:0},{x:-6,z:-12.8,yaw:0},{x:5,z:-12.8,yaw:0},{x:11,z:-12.8,yaw:0}];
const sand=[.73,.65,.46],wood=[.51,.39,.25],olive=[.44,.49,.29],ink=[.12,.16,.12];
export function buildTrainingGround(rawBox,quad){
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
  const sign=(x,y,z,text,sub='',w=3.5,h=1.1,yaw=0)=>decals.push({x,y,z,w,h,yaw,kind:'sign',text,sub});
  box(0,-.2,0,35,.2,35,sand,false);
  // Broad painted training routes and irregular dusty patches replace the tile grid.
  flat(0,5,4,19,[.8,.72,.53]);flat(-8,-9.6,12,5,[.67,.59,.42]);flat(8,-9.6,12,5,[.67,.59,.42]);
  for(let i=0;i<90;i++){const x=Math.sin(i*93.17)*15,z=Math.cos(i*72.61)*15;flat(x,z,.2+(i%5)*.08,.12,[.62,.56,.4],.014);}
  for(const x of [-13,-10,-7,-4,4,7,10,13])flat(x,-9,.06,5,[.91,.85,.65],.02);
  flat(0,-6.5,28,.11,[.91,.85,.65],.022);
  for(let z=5;z<=13;z+=1.3){flat(-1.7,z,.12,.65,[.9,.76,.42],.024);flat(1.7,z,.12,.65,[.9,.76,.42],.024);}
  // Perimeter berm, timber fence, and individually outlined posts.
  for(const b of walls)box(b.x,0,b.z,b.w,.9,b.d,[.57,.5,.34]);
  for(let i=-15;i<=15;i+=2.5){
    for(const z of [-15.45,15.45]){box(i,.8,z,.16,2.3,.16,wood);}
    for(const x of [-15.45,15.45]){box(x,.8,i,.16,2.3,.16,wood);}
  }
  for(const y of [1.5,2.7]){box(0,y,-15.45,31,.12,.15,wood);box(0,y,15.45,31,.12,.15,wood);box(-15.45,y,0,.15,.12,31,wood);box(15.45,y,0,.15,.12,31,wood);}
  for(let x=-15;x<15;x+=1){line([x,.95,-15.43],[Math.min(x+2,15),2.65,-15.43],[.34,.39,.29]);line([x,2.65,-15.43],[Math.min(x+2,15),.95,-15.43],[.34,.39,.29]);}
  // Cover footprints and cast shadows make the volume of the props readable.
  for(const b of cover)flat(b.x+.45,b.z+.5,b.w+.9,b.d+1,[.54,.49,.34],.018);
  const crate=(x,z,w,h,d,y=0)=>{
    box(x,y,z,w,h,d,[.64,.48,.29]);
    for(const xx of [x-w/2+.12,x+w/2-.12])box(xx,y+.06,z+d/2+.035,.16,h-.12,.09,[.37,.31,.2]);
    for(const yy of [y+.15,y+h-.15])box(x,yy,z+d/2+.06,w,.15,.1,[.74,.6,.36]);
    line([x-w*.38,y+.3,z+d/2+.12],[x+w*.38,y+h-.3,z+d/2+.12]);
    line([x+w*.38,y+.3,z+d/2+.12],[x-w*.38,y+h-.3,z+d/2+.12]);
  };
  const bags=(b)=>{
    for(let y=0;y<b.h;y+=.42)for(let x=b.x-b.w/2+.45;x<b.x+b.w/2;x+=.9){
      box(x+(Math.round(y/.42)%2?.08:0),y,b.z,.86,Math.min(.4,b.h-y),b.d,[.66+(y*.025),.61,.4]);
      line([x-.32,y+Math.min(.24,(b.h-y)/2),b.z+b.d/2+.006],[x+.32,y+Math.min(.24,(b.h-y)/2),b.z+b.d/2+.006],[.36,.35,.23]);
    }
  };
  for(const [i,b] of cover.entries()){
    if(i===0){
      box(b.x,0,b.z,b.w,b.h,b.d,olive);
      for(let x=b.x-b.w/2+.3;x<b.x+b.w/2;x+=.5)line([x,.1,b.z+b.d/2+.01],[x,b.h-.05,b.z+b.d/2+.01]);
      box(b.x,b.h-.03,b.z,b.w+.5,.22,b.d+.6,[.27,.33,.23]);
      box(b.x-.7,.03,b.z+b.d/2+.02,.85,1.9,.06,[.28,.32,.22]);
      box(b.x+.8,1.25,b.z+b.d/2+.04,.95,.65,.08,[.24,.37,.37]);
      sign(b.x,2.1,b.z+b.d/2+.11,'RANGE OFFICE','CHECK IN / KIT UP',2.8,.55);
    }else if(i===2||i===5){bags({...b,h:i===2?1.3:1.15});
    }else if(i===4){
      box(b.x,0,b.z,b.w,2.65,b.d,olive);
      for(const x of [-1,1])for(const z of [-1,1])box(x,2.6,z,.18,2.2,.18,wood);
      box(0,3.5,0,3.2,.2,3.2,wood);box(0,4.8,0,3.8,.22,3.8,[.27,.34,.23]);
      for(const y of [3.8,4.3]){box(0,y,1.5,3,.1,.1,wood);box(-1.5,y,0,.1,.1,3,wood);box(1.5,y,0,.1,.1,3,wood);}
      for(let y=.3;y<3.6;y+=.35)box(-1.28,y,.2,.12,.06,.8,[.68,.57,.35]);
      box(0,5.02,0,.08,1.5,.08,wood);quad(geometry,[[0,6.5,0],[1.2,6.3,0],[1.1,5.7,0],[0,5.8,0]],[.84,.38,.22]);
      sign(0,1.5,1.225,'07','CONTROL',1.4,.8);
    }else if(i===7){
      box(b.x,0,b.z,b.w,b.h,b.d,[.31,.42,.34]);
      for(const y of [.2,.85,1.35])box(b.x,y,b.z,b.w+.05,.09,b.d+.05,[.15,.22,.18]);
      sign(b.x,.55,b.z+b.d/2+.04,'SUPPLY','',1.2,.5);
    }else{crate(b.x,b.z,b.w,b.h,b.d);}
  }
  // Tall freestanding training boards behind the target line.
  for(const [i,x] of [-12,-6,5,11].entries()){
    box(x,0,-14.3,3.3,2.8,.25,[.5,.4,.27]);
    for(let xx=x-1.5;xx<x+1.6;xx+=.5)line([xx,.1,-14.155],[xx,2.7,-14.155]);
    sign(x,2.1,-14.1,`0${i+1}`,'FIRING LANE',2.4,.6);
  }
  sign(-8,.6,4.52,'COVER DRILL','MOVE • AIM • RELOAD',3.4,.75);
  sign(7,1.65,5.03,'SUPPLY YARD','KEEP THE LANE CLEAR',3,.65);
  sign(0,2.35,-15.3,'CAMP PAPER / TRAINING GROUND','LIVE DRILL IN PROGRESS',9,1);
  // Barracks and a water tower outside the playable fence give the camp a larger setting.
  for(const x of [-23,23]){
    box(x,0,-8,8,4,13,[.47,.5,.31]);box(x,4,-8,9,.35,14,[.29,.35,.23]);
    for(const z of [-12,-8,-4])box(x+(x<0?4.02:-4.02),1.5,z,.08,1.2,2,[.22,.32,.31]);
  }
  for(const x of [21,24])for(const z of [-24,-21])box(x,0,z,.25,9,.25,wood);
  box(22.5,7,-22.5,4,3,4,[.53,.6,.47]);box(22.5,10,-22.5,4.4,.2,4.4,olive);
  for(let i=0;i<17;i++){
    const x=-48+i*6,z=-43-Math.sin(i)*5,h=8+(i%4)*3;
    quad(geometry,[[x-7,0,z],[x+7,0,z],[x+2,h,z],[x-2,h-1,z]],[.51,.57,.44]);
    quad(geometry,[[x-2,h-1,z],[x+2,h,z],[x+7,0,z],[x+2,0,z]],[.42,.49,.39]);
  }
  for(const [x,z] of [[-19,10],[-22,-19],[20,13],[19,-18],[-25,4],[26,7]]){
    box(x,0,z,.5,4,.5,wood);box(x,2.3,z,3,2.8,3,olive);box(x+.4,4,z,2.2,1.6,2.2,[.55,.59,.34]);
  }
  // Painted cloud cutouts sit far beyond the fence, never on the playable floor.
  for(const [x,y,z,w] of [[-18,14,-39,12],[12,17,-46,15],[30,12,-34,10]])decals.push({x,y,z,w,h:w*.3,yaw:0,kind:'cloud'});
  return {geometry,lines,decals};
}
export function drawDecal(ctx,d){
  const w=ctx.canvas.width,h=ctx.canvas.height;
  if(d.kind==='cloud'){
    ctx.fillStyle='#f6eed5';for(const [x,y,r] of [[.23,.65,.2],[.46,.45,.29],[.7,.62,.22]]){ctx.beginPath();ctx.ellipse(w*x,h*y,w*r,h*.35,0,0,Math.PI*2);ctx.fill();}return;
  }
  ctx.fillStyle='#202b20';ctx.fillRect(0,0,w,h);ctx.fillStyle='#e5d5a7';ctx.fillRect(7,7,w-14,h-14);ctx.strokeStyle='#202b20';ctx.lineWidth=3;ctx.strokeRect(13,13,w-26,h-26);
  ctx.fillStyle='#263022';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${Math.min(h*.4,w/(d.text.length*.65))}px Arial`;ctx.fillText(d.text,w/2,h*(d.sub?.4:.53));
  if(d.sub){ctx.font=`bold ${Math.min(h*.19,w/(d.sub.length*.7))}px monospace`;ctx.fillText(d.sub,w/2,h*.76);}
}
export function drawTarget(ctx,hit=false){
  ctx.lineJoin='round';ctx.lineWidth=7;ctx.strokeStyle='#222a20';
  const p=new Path2D('M 53 183 L 53 149 L 26 149 L 26 73 Q 26 50 47 49 L 47 30 Q 47 9 64 9 Q 82 9 82 30 L 82 49 Q 103 50 103 73 L 103 149 L 75 149 L 75 183 Z');
  ctx.fillStyle=hit?'#d49b52':'#c7ac75';ctx.fill(p);ctx.stroke(p);
  for(const [r,c] of [[29,'#584e36'],[21,'#e5d4a5'],[12,'#b45d3b'],[5,'#292f25']]){ctx.beginPath();ctx.arc(64,94,r,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();}
}
