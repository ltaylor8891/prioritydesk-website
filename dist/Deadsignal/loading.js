import {introFrame} from './intro-director.js?v=cinema-1';
const $=id=>document.getElementById(id),screen=$('boot-screen'),canvas=$('boot-animation'),ctx=canvas.getContext('2d');
const gated=[...document.body.children].filter(el=>el.id!=='boot-screen'&&el.tagName!=='SCRIPT'&&!el.inert);for(const el of gated)el.inert=true;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,start=performance.now();
let ready=false,failed=false,finished=false,finalAt=null,drawEnemy=null,lastProgress=0,game=null;
const sprites=new Map(),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t);return t*t*(3-2*t);};
function progress(value,message){if(failed)return;lastProgress=Math.max(lastProgress,value);$('boot-progress-fill').style.width=lastProgress+'%';$('boot-percent').textContent=lastProgress+'%';screen.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',lastProgress);$('boot-status').textContent=message;}
function fail(error){if(finished||failed)return;failed=true;document.body.dataset.bootFailed='true';screen.classList.add('failed');$('boot-status').textContent=error?.message==='WebGL unavailable'?'This game needs WebGL. Enable hardware acceleration or try another desktop browser.':'Could not finish loading the game. Check your connection and try again.';$('boot-retry').hidden=false;console.error('Dead Signal startup failed:',error);}
$('boot-retry').onclick=()=>location.reload();
addEventListener('dead-signal-boot',event=>progress(event.detail.progress,event.detail.message));
const bootError=event=>fail(event.error||new Error(event.message||'Startup failed.'));
addEventListener('error',bootError);
function sprite(team,dead=false,firing=false){const key=[team,dead,firing].join(':');if(!sprites.has(key)){const image=document.createElement('canvas');image.width=256;image.height=384;drawEnemy(image.getContext('2d'),0,team===0?0:1,firing,team,false,dead);sprites.set(key,image);}return sprites.get(key);}
function soldier(x,y,scale,team,angle=0,dead=false,firing=false){if(!drawEnemy)return;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.drawImage(sprite(team,dead,firing),-128,-384);ctx.restore();}
function burst(x,y,size){ctx.save();ctx.translate(x,y);ctx.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8,r=i%2?size*.42:size;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fillStyle='#ffcf63';ctx.strokeStyle='#17241f';ctx.lineWidth=4;ctx.fill();ctx.stroke();ctx.fillStyle='#fff5c9';ctx.beginPath();ctx.arc(0,0,size*.28,0,Math.PI*2);ctx.fill();ctx.restore();}
function cracks(){ctx.save();ctx.strokeStyle='#f5e9cc';ctx.lineWidth=2;ctx.globalAlpha=.65;for(let i=0;i<11;i++){const a=i*2.399,reach=100+(i%4)*65;ctx.beginPath();ctx.moveTo(480,190);ctx.lineTo(480+Math.cos(a+.1)*reach*.4,190+Math.sin(a+.1)*reach*.4);ctx.lineTo(480+Math.cos(a)*reach,190+Math.sin(a)*reach);ctx.stroke();}ctx.fillStyle='#15271f';ctx.beginPath();ctx.arc(480,190,9,0,Math.PI*2);ctx.fill();ctx.restore();}
function paint(time){
  if(finished)return;
  if(ready&&finalAt===null){finalAt=time;document.body.classList.add('cinematic');document.querySelector('.boot-kicker').textContent='CAMP PAPER / TRAINING GROUND';}
  if(ready){
    const shot=introFrame((time-finalAt)/1000,{reduced});game.setBootScene(shot);
    const w=innerWidth,h=innerHeight;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.clearRect(0,0,w,h);
    const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#091710dd');shade.addColorStop(.24,'#09171000');shade.addColorStop(.7,'#09171000');shade.addColorStop(1,'#091710ee');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#0b1814';ctx.fillRect(0,0,w,12);ctx.fillRect(0,h-12,w,12);
    ctx.font='bold 12px monospace';ctx.textAlign='left';ctx.fillStyle='#efad5e';ctx.fillText(shot.phase,30,h*.36);ctx.fillStyle='#f5e9cc';ctx.font='11px monospace';ctx.fillText('BLUE SQUAD / 4 vs 4',30,h*.36+23);
    if(shot.time>1.52&&shot.time<3.1&&!reduced){ctx.fillStyle='#ffcf79';ctx.font='bold 17px monospace';ctx.fillText('HOSTILE DOWN',30,h*.36+58);ctx.font='12px monospace';ctx.fillText('100 DAMAGE  /  ELIMINATION',30,h*.36+79);}
    if(!reduced){
      ctx.fillStyle='#f5dba6';for(let i=0;i<18;i++){const x=(i*173+shot.time*(8+i%3*5))%w,y=(i*113+Math.sin(shot.time*.4+i)*12)%h;ctx.globalAlpha=.1+(i%3)*.05;ctx.fillRect(x,y,2,2);}ctx.globalAlpha=1;
      if(shot.impact>=0){const hit=shot.impact,x=w*.5,y=h*.49;ctx.save();ctx.translate(x,y);if(hit<.22){const glow=ctx.createRadialGradient(0,0,3,0,0,w*.35);glow.addColorStop(0,'#fff1b5cc');glow.addColorStop(1,'#ffd77b00');ctx.fillStyle=glow;ctx.fillRect(-w/2,-h/2,w,h);burst(0,0,30+Math.min(hit/.12,1)*95);}
        ctx.lineJoin='round';for(let i=0;i<13;i++){const a=i*2.399,r=(i%3+1)*Math.min(w,h)*.26;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a+.13)*r*.3,Math.sin(a+.13)*r*.3);ctx.lineTo(Math.cos(a-.08)*r*.65,Math.sin(a-.08)*r*.65);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.strokeStyle='#10241ccc';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#f5e9ccbb';ctx.lineWidth=1;ctx.stroke();}
        ctx.fillStyle='#101b16';ctx.beginPath();for(let i=0;i<14;i++){const a=i*Math.PI/7,r=i%2?14:25;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.strokeStyle='#f5e9cc';ctx.lineWidth=2;ctx.stroke();ctx.restore();
      }
    }
    if(shot.done&&!failed){finished=true;removeEventListener('error',bootError);game.setBootScene(null);for(const el of gated)el.inert=false;document.body.classList.remove('booting');screen.classList.add('leaving');setTimeout(()=>{screen.remove();document.body.classList.remove('cinematic');},reduced?0:700);return;}
  }else if(ctx){
    ctx.clearRect(0,0,960,400);ctx.fillStyle='#24382b';ctx.fillRect(0,300,960,100);soldier(350,340,.76,0);soldier(650,340,.76,1);ctx.strokeStyle='#efad5e55';ctx.beginPath();ctx.moveTo(80,300);ctx.lineTo(880,300);ctx.stroke();
  }
  if(!failed)requestAnimationFrame(paint);
}
requestAnimationFrame(paint);
async function boot(){try{if(!document.querySelector('link[rel=stylesheet]').sheet)throw new Error('Game styles could not load.');progress(5,'Opening the training ground…');const art=await import('./enemy-art.js?v=season-1');drawEnemy=art.drawEnemy;progress(15,'Loading the game modules…');await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));[game]=await Promise.all([import('./game.js?v=cinema-1'),import('./share.js?v=menu-1')]);if(failed)return;progress(100,'Signal established. Get ready.');ready=true;}catch(error){fail(error);}}
boot();
