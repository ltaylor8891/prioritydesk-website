import {cover,walls,world,visible,features,ladders} from './core.js?v=permanent-2';
import {angleDifference,headingTo} from './actor-motion.js?v=permanent-2';
const COLORS=['#73c5ef','#ffae67'];
export function mapActors(actors,viewer,{spectator=false,preview=false,ffa=false}={}){
  return actors.filter(a=>a.hp!==0&&(spectator||preview||(!ffa&&viewer.team!==undefined&&a.team===viewer.team)||
    (visible(viewer,a)&&Math.abs(angleDifference(headingTo(viewer,a),viewer.yaw))<.7)));
}
export function drawMinimap(ctx,viewer,actors,{spectator=false,preview=false,meds=[],targets=[],ffa=false,zones=[]}={}){
  const size=ctx.canvas.width,pad=22,scale=(size-pad*2)/(world.half*2),point=p=>[size/2+p.x*scale,size/2+p.z*scale];
  ctx.clearRect(0,0,size,size);ctx.fillStyle='#1e3027';ctx.fillRect(0,0,size,size);
  ctx.strokeStyle='#b7c8a71d';ctx.lineWidth=1;
  for(let n=-world.half;n<=world.half;n+=world.gridStep){const k=size/2+n*scale;ctx.beginPath();ctx.moveTo(pad,k);ctx.lineTo(size-pad,k);ctx.moveTo(k,pad);ctx.lineTo(k,size-pad);ctx.stroke();}
  for(const f of features){
    const [x,y]=point(f),w=f.w*scale,d=f.d*scale;
    if(f.kind==='ramp'){const g=f.axis==='x'?ctx.createLinearGradient(x-w/2,0,x+w/2,0):ctx.createLinearGradient(0,y-d/2,0,y+d/2);g.addColorStop(0,f.from<f.to?'#0b140f':'#b9a56d');g.addColorStop(1,f.from<f.to?'#b9a56d':'#0b140f');ctx.fillStyle=g;}
    else ctx.fillStyle=f.h<0?'#0b140f':'#a8b88d';
    ctx.fillRect(x-w/2,y-d/2,w,d);ctx.strokeStyle='#e8c36b66';ctx.lineWidth=1;ctx.strokeRect(x-w/2,y-d/2,w,d);
  }
  ctx.strokeStyle='#e8c36b';ctx.lineWidth=2;for(const L of ladders){const [x,y]=point(L);ctx.beginPath();ctx.moveTo(x-Math.abs(L.fz)*3,y-Math.abs(L.fx)*3);ctx.lineTo(x+Math.abs(L.fz)*3,y+Math.abs(L.fx)*3);ctx.stroke();}
  ctx.fillStyle='#879779';ctx.strokeStyle='#17251d';ctx.lineWidth=1;
  for(const b of [...cover,...walls]){const [x,z]=point(b);ctx.fillRect(x-b.w/2*scale,z-b.d/2*scale,b.w*scale,b.d*scale);ctx.strokeRect(x-b.w/2*scale,z-b.d/2*scale,b.w*scale,b.d*scale);}
  zones.forEach((z,i)=>{const [x,y]=point(z),col=z.contested?'#ff6a5a':z.owner===null?'#e8e2c9':COLORS[z.owner];ctx.globalAlpha=.28;ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,z.r*scale,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=col;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#17251d';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText('ABC'[i],x,y+4);});
  ctx.fillStyle='#dbc89a';for(const t of targets){const [x,z]=point(t);ctx.fillRect(x-3,z-2,6,3);}
  ctx.fillStyle='#a9e5bc';for(const m of meds){const [x,z]=point(m);ctx.fillRect(x-1,z-4,2,8);ctx.fillRect(x-4,z-1,8,2);}
  const [vx,vz]=point(viewer);
  if(viewer.hp!==0){ctx.fillStyle='#fff4cf18';ctx.beginPath();ctx.moveTo(vx,vz);ctx.arc(vx,vz,45,viewer.yaw-Math.PI/2-.59,viewer.yaw-Math.PI/2+.59);ctx.closePath();ctx.fill();}
  const arrow=(p,heading,color,r)=>{const [x,z]=point(p);ctx.save();ctx.translate(x,z);ctx.rotate(heading);ctx.fillStyle=color;ctx.strokeStyle='#101c17';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.7,r*.65);ctx.lineTo(0,r*.3);ctx.lineTo(-r*.7,r*.65);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();};
  for(const a of mapActors(actors,viewer,{spectator,preview,ffa})){if(a===viewer)continue;arrow(a,a.heading??a.yaw+Math.PI,ffa?'#f3dd6b':COLORS[a.team]||COLORS[1],7);}
  if(viewer.hp!==0)arrow(viewer,viewer.yaw,'#fff4cf',8);
  ctx.fillStyle='#f2dfb5';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillText('N',size/2,14);ctx.fillText('S',size/2,size-5);ctx.fillText('W',10,size/2+4);ctx.fillText('E',size-10,size/2+4);
  ctx.font='8px Arial';ctx.fillStyle='#cfddba';for(const [text,fx,fy] of world.labels||[])ctx.fillText(text,size/2+fx*size/2,size/2+fy*size/2);
}
