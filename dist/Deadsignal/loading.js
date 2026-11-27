const $=id=>document.getElementById(id),screen=$('boot-screen'),canvas=$('boot-animation'),ctx=canvas.getContext('2d');
const gated=[...document.body.children].filter(el=>el.id!=='boot-screen'&&el.tagName!=='SCRIPT'&&!el.inert);for(const el of gated)el.inert=true;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,start=performance.now();
let ready=false,failed=false,finished=false,finalAt=null,drawEnemy=null,lastProgress=0;
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
function paint(time){if(finished)return;const t=(time-start)/1000;if(ready&&finalAt===null&&t>=(reduced ? 0.4 : 4.2))finalAt=time;const ending=finalAt===null?-1:(time-finalAt)/1000;
  if(ctx){ctx.clearRect(0,0,960,400);ctx.fillStyle='#24382b';ctx.fillRect(0,290,960,110);ctx.strokeStyle='#7c8e6880';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,290);ctx.lineTo(960,290);ctx.stroke();
    for(const [x,y,w,h] of [[95,228,95,62],[755,214,100,76]]){ctx.fillStyle='#64704b';ctx.strokeStyle='#17241f';ctx.lineWidth=5;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y+h);ctx.moveTo(x+w,y);ctx.lineTo(x,y+h);ctx.stroke();}
    ctx.fillStyle='#101f1680';ctx.beginPath();ctx.ellipse(480,345,300,15,0,0,Math.PI*2);ctx.fill();
    const hit=reduced?0:ease((t-1.55)/.65),advance=reduced?1:ease((t-2.8)/1.1),blueX=300+advance*180;
    soldier(685,330,.72,1,hit*1.5,hit>.15);
    soldier(blueX,340,.76+advance*.12,0,0,false,ending>=0&&ending<.2);
    if(!reduced&&t>.6&&t<1.65){ctx.save();ctx.translate(blueX+22,244);ctx.fillStyle='#6b7765';ctx.strokeStyle='#17241f';ctx.lineWidth=5;ctx.fillRect(0,0,130,21);ctx.strokeRect(0,0,130,21);ctx.fillStyle='#99724b';ctx.fillRect(15,21,25,25);ctx.strokeRect(15,21,25,25);ctx.restore();if(t>1.25){burst(blueX+165,252,26);ctx.strokeStyle='#ffcf63';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(blueX+185,252);ctx.lineTo(665,252);ctx.stroke();}}
    ctx.textAlign='center';ctx.font='bold 13px monospace';ctx.fillStyle='#9dd4ec';ctx.fillText('BLUE SQUAD',blueX,375);ctx.fillStyle='#ffd39a';if(hit<.2)ctx.fillText('ORANGE SQUAD',685,375);
    if(ending>=0&&!reduced){const flash=ending<.17;const size=35+ease(ending/.32)*170;burst(480,190,size);if(ending>.12)cracks();if(flash){ctx.fillStyle='#fff1b5';ctx.globalAlpha=.22;ctx.fillRect(0,0,960,400);ctx.globalAlpha=1;}}
    if(failed){ctx.fillStyle='#17241fbb';ctx.fillRect(0,0,960,400);}
  }
  if(!failed&&ending>(reduced ? 0.2 : 1.05)){finished=true;removeEventListener('error',bootError);for(const el of gated)el.inert=false;document.body.classList.remove('booting');screen.classList.add('leaving');setTimeout(()=>screen.remove(),reduced?0:700);return;}
  if(!failed)requestAnimationFrame(paint);
}
requestAnimationFrame(paint);
async function boot(){try{progress(5,'Opening the training ground…');const art=await import('./enemy-art.js?v=accounts-1');drawEnemy=art.drawEnemy;progress(15,'Loading the game modules…');await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await Promise.all([import('./game.js?v=intro-1'),import('./share.js?v=menu-1')]);if(failed)return;progress(100,'Signal established. Get ready.');ready=true;}catch(error){fail(error);}}
boot();
