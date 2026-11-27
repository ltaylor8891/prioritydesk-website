export const WEAPONS=[
  {unlockLevel:1,name:'FIELD CARBINE',short:'CARBINE',capacity:24,interval:.15,reload:1.5,pellets:1,damage:25,spread:.004,range:48,automatic:true,hip:.034,ads:.004,zoom:1.3,style:'ALL-ROUNDER · STEADY CLIMB',recoil:{up:.018,side:.008,recover:.6,rate:.45,delay:.25},bloom:{max:.03,perShot:.1,decay:1.2}},
  {unlockLevel:1,name:'DRILL SHOTGUN',short:'SHOTGUN',capacity:6,interval:.8,reload:1.9,pellets:7,damage:12,spread:.065,range:19,automatic:false,hip:.095,ads:.05,zoom:1.12,style:'CLOSE RANGE · HEAVY KICK',recoil:{up:.08,side:.012,recover:.9,rate:.8,delay:.3},bloom:{max:.02,perShot:.5,decay:1.5}},
  {unlockLevel:1,name:'SERVICE SIDEARM',short:'SIDEARM',capacity:12,interval:.28,reload:1.1,pellets:1,damage:34,spread:.002,range:38,automatic:false,hip:.028,ads:.002,zoom:1.18,style:'SNAPPY · LIGHT KICK',recoil:{up:.03,side:.006,recover:.9,rate:1.3,delay:.18},bloom:{max:.02,perShot:.3,decay:3}},
  {unlockLevel:1,name:'RAPID SMG',short:'SMG',capacity:32,interval:.075,reload:1.7,pellets:1,damage:14,spread:.022,range:30,automatic:true,hip:.058,ads:.012,zoom:1.2,style:'RAPID · SIDE-TO-SIDE DRIFT',recoil:{up:.011,side:.012,recover:.5,rate:.4,delay:.25},bloom:{max:.05,perShot:.06,decay:1.1}},
  {unlockLevel:1,name:'MARKSMAN RIFLE',short:'MARKSMAN',capacity:8,interval:.75,reload:2.2,pellets:1,damage:70,spread:.0008,range:80,automatic:false,hip:.08,ads:.0008,zoom:2.6,style:'LONG RANGE · HEAVY KICK',recoil:{up:.10,side:.008,recover:.9,rate:.8,delay:.35},bloom:{max:.05,perShot:1,decay:1.2}},
  {unlockLevel:1,name:'MAGNUM REVOLVER',short:'MAGNUM',capacity:6,interval:.55,reload:2.4,pellets:1,damage:55,spread:.004,range:40,automatic:false,hip:.045,ads:.004,zoom:1.25,style:'HAND CANNON · MASSIVE KICK',recoil:{up:.12,side:.016,recover:.9,rate:.8,delay:.35},bloom:{max:.04,perShot:.7,decay:1.5}},
  // Grenades share the weapon lineup: 'capacity' is how many you carry, firing throws one, and they never reload.
  {unlockLevel:1,name:'FRAG GRENADE',short:'FRAG',type:'grenade',kind:'frag',style:'LETHAL TO 5 M · WOUNDS TO 15 M',capacity:2,interval:1,reload:0,pellets:0,damage:0,spread:0,range:0,automatic:false},
  {unlockLevel:1,name:'FLASH GRENADE',short:'FLASH',type:'grenade',kind:'flash',style:'BLINDS · FULL 3 M, FADES BY 6 M',capacity:2,interval:1,reload:0,pellets:0,damage:0,spread:0,range:0,automatic:false},
  {unlockLevel:1,name:'SMOKE GRENADE',short:'SMOKE',type:'grenade',kind:'smoke',style:'COVER · 5 M CLOUD',capacity:2,interval:1,reload:0,pellets:0,damage:0,spread:0,range:0,automatic:false}
];
// A loadout is two different guns (slots 1-2) and two different grenades (slots 3-4).
export const DEFAULT_LOADOUT=[0,2,6,7];
export function cleanLoadout(raw){
  if(!Array.isArray(raw)||raw.length!==4)return [...DEFAULT_LOADOUT];
  const [a,b,c,d]=raw,gun=x=>Number.isInteger(x)&&x>=0&&x<6,nade=x=>Number.isInteger(x)&&x>=6&&x<9;
  return gun(a)&&gun(b)&&a!==b&&nade(c)&&nade(d)&&c!==d?[a,b,c,d]:[...DEFAULT_LOADOUT];
}
// Hip fire is loose; aiming down the sights (ads 0 to 1) tightens it to the gun's aimed spread.
export const aimSpread=(w,ads)=>w.hip+(w.ads-w.hip)*Math.max(0,Math.min(1,ads||0));
// Sustained fire widens the spread (bloom 0 to 1); aiming halves the penalty but never removes it.
export const bloomSpread=(w,bloom,ads)=>w.bloom?w.bloom.max*Math.max(0,Math.min(1,bloom||0))*(1-.5*Math.max(0,Math.min(1,ads||0))):0;
export const aimZoom=(w,ads)=>1+((w?.zoom||1)-1)*Math.max(0,Math.min(1,ads||0));
export const isGrenade=i=>WEAPONS[i]?.type==='grenade';
// Step through the lineup (scroll wheel), skipping slots the caller says are unavailable.
export function stepSelection(current,delta,allowed=()=>true){
  const n=WEAPONS.length;let i=current;
  for(let k=0;k<n;k++){i=(i+(delta<0?-1:1)+n)%n;if(allowed(i))return i;}
  return current;
}
export function createArsenal(){return {selected:0,ammo:WEAPONS.map(w=>w.capacity),cooldown:0,reload:0};}
export function selectWeapon(a,index){if(index<0||index>=WEAPONS.length||index===a.selected)return false;a.selected=index;a.reload=0;a.cooldown=Math.max(a.cooldown,.2);return true;}
export function startReload(a){const w=WEAPONS[a.selected];if(w.type==='grenade'||a.reload>0||a.ammo[a.selected]===w.capacity)return false;a.reload=w.reload;return true;}
export function stepWeapon(a,dt){a.cooldown=Math.max(0,a.cooldown-dt);if(a.reload>0){a.reload=Math.max(0,a.reload-dt);if(a.reload===0){a.ammo[a.selected]=WEAPONS[a.selected].capacity;return true;}}return false;}
export function fireWeapon(a){if(a.reload>0||a.cooldown>0||a.ammo[a.selected]===0)return false;a.ammo[a.selected]--;a.cooldown=WEAPONS[a.selected].interval;return true;}

export function weaponMotion({selected=0,recoil=0,reload=0,run=0,sprint=0,walkPhase=0,shotAge=9,time=0}={}){
  // Pure offsets so run/fire animation can be tested without a canvas.
  const stride=walkPhase*Math.PI/4,weapon=WEAPONS[selected],kick=selected===1?1.55:selected===2?.8:selected===4?1.7:selected===5?1.9:selected===3?.55:selected>=6?-1.4:1;
  const idle=Math.sin(time*1.6)*2.2*(1-run);
  const swayX=Math.sin(stride)*13*run*(1+sprint*.9)+idle;
  const bounce=Math.abs(Math.cos(stride))*17*run*(1+sprint*.7)+Math.sin(time*1.3)*1.6*(1-run);
  const dip=sprint*62;
  const reloadDip=weapon.reload>0?Math.sin(reload/weapon.reload*Math.PI)*190:0;
  const pumpT=selected===1?Math.max(0,Math.min(1,(shotAge-.22)/.5)):0;
  const pump=selected===1&&pumpT>0&&pumpT<1?Math.sin(pumpT*Math.PI)*46:0;
  return {x:swayX+sprint*-26,y:bounce+dip+reloadDip+recoil*24*kick,
    angle:-recoil*.025*kick+Math.sin(stride)*.03*run+sprint*.2-(selected===1?recoil*.05:0),pump,
    casing:selected!==1&&selected<6&&shotAge<.45?shotAge/.45:-1};
}
export function drawPlayerWeapon(ctx,width,height,{selected=0,recoil=0,reload=0,bob=0,time=0,run=0,sprint=0,walkPhase=0,shotAge=9,colors={},ammo=1,ads=0}={}){
  const ink='#161c18',wood='#99724b',metal='#667363',dark='#39483f',skin=colors.skin||'#e2d4af',sleeve=colors.cloth||'#687345';
  const scale=Math.min(width/1000,height/760)*1.13,m=weaponMotion({selected,recoil,reload,run,sprint,walkPhase,shotAge,time});
  // Aiming steadies the gun, brings it larger and lifts it towards the line of sight.
  const steady=1-.75*ads,big=1+.14*ads;
  ctx.save();
  if(selected===4)ctx.globalAlpha=1-Math.max(0,Math.min(1,(ads-.55)/.3));
  // While aiming, the front sight is parked just below the crosshair so the gun never covers what you are shooting at.
  const tip=[47,68,151,92,36,142][selected]??60,hipY=height-400*scale+m.y*scale,aimY=height*.5+Math.max(26,height*.035)-tip*scale*big;
  ctx.translate(width*.5-250*scale*big+(bob+m.x*scale)*steady,hipY+(aimY-hipY)*ads);
  ctx.scale(scale*big,scale*big);ctx.rotate(m.angle*steady);
  const p=(d,fill,line=ink,w=9)=>{ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=w;const path=new Path2D(d);if(fill){ctx.fillStyle=fill;ctx.fill(path);}if(line){ctx.strokeStyle=line;ctx.stroke(path);}};
  // The same round sleeves and mitten hands as the enemy illustrations.
  p('M 50 408 L 112 309 Q 148 287 173 321 L 187 400 Z',sleeve);
  p('M 112 313 Q 106 273 143 254 Q 167 246 179 269 L 201 303 Q 184 336 156 340 Z',skin);
  p('M 345 402 L 323 324 Q 351 292 381 309 L 448 408 Z',sleeve);
  if(selected===0){
    p('M 217 175 L 228 70 L 264 70 L 278 176 Z',dark);
    p('M 225 83 L 225 58 L 266 58 L 267 83 Z',metal);
    p('M 236 64 L 238 47 L 253 47 L 255 64 Z','#e1c379',ink,6);
    p('M 204 173 L 278 173 L 318 282 L 185 281 Z',wood);
    for(let y=195;y<255;y+=20)p(`M 210 ${y} L 283 ${y}`,null,'#604c34',5);
    p('M 186 266 L 315 266 L 344 361 L 170 361 Z',metal);
    p('M 207 275 L 269 275 L 289 341 L 197 341 Z','#93a082',ink,6);
    p('M 181 358 L 342 358 L 363 416 L 167 416 Z',dark);
    p('M 222 274 L 224 248 L 259 248 L 263 274',null,ink,9);
    p('M 230 259 L 252 259',null,'#e3c477',5);
    p('M 301 293 L 328 300 L 338 325 L 307 318 Z',wood,ink,6);
    p('M 215 368 L 269 368 L 279 414 L 207 414 Z',wood,ink,7);
  }else if(selected===1){
    p('M 211 229 L 219 89 Q 243 73 263 89 L 278 228 Z',dark);
    p('M 219 90 Q 240 78 262 90 L 264 114 Q 240 103 217 114 Z',metal);
    p('M 240 86 L 240 68',null,'#d6bd7a',7);
    p('M 197 209 L 281 209 L 308 286 L 181 286 Z',wood);
    for(let y=223;y<280;y+=14)p(`M 203 ${y} L ${279+(y-223)*.3} ${y}`,null,'#594b33',5);
    p('M 183 286 L 305 286 L 330 350 L 173 350 Z',metal);
    p('M 195 302 L 277 302 L 292 334 L 190 334 Z','#a4a98a',ink,5);
    p('M 173 348 L 326 348 L 355 412 L 159 412 Z',wood);
    p('M 293 297 L 325 306 L 331 331 L 302 323 Z',dark,ink,6);
  }else if(selected===2){
    p('M 218 168 L 266 168 L 299 282 L 199 282 Z',dark);
    p('M 218 167 L 266 167 L 268 193 L 214 193 Z',metal);
    p('M 239 167 L 241 151 L 251 151 L 254 167 Z','#e2c482',ink,5);
    p('M 199 264 L 300 264 L 321 317 L 191 317 Z',metal);
    p('M 216 268 L 215 247 L 235 247 L 237 269 M 268 268 L 269 247 L 286 247 L 290 269',dark,ink,6);
    p('M 215 316 L 294 316 L 320 400 L 212 405 Z',wood);
    for(let y=337;y<393;y+=15)p(`M 231 ${y} L 287 ${y}`,null,'#614e37',4);
    p('M 284 313 Q 337 335 307 365 L 296 341',null,ink,9);
  }else if(selected===3){
    p('M 222 200 L 232 118 L 258 118 L 266 200 Z',dark);
    p('M 226 132 L 228 104 L 258 104 L 260 132 Z',metal);
    p('M 238 108 L 240 92 L 250 92 L 252 108 Z','#e1c379',ink,5);
    p('M 200 196 L 284 196 L 306 292 L 190 292 Z',metal);
    p('M 214 212 L 276 212 L 292 262 L 208 262 Z','#93a082',ink,6);
    p('M 232 290 L 288 290 L 296 410 L 226 410 Z',dark);
    p('M 238 306 L 288 306 M 236 340 L 290 340 M 234 374 L 292 374',null,'#1f2a24',5);
    p('M 190 286 L 306 286 L 330 338 L 178 338 Z',wood);
  }else if(selected===4){
    p('M 228 250 L 232 40 L 252 40 L 256 250 Z',dark);
    p('M 226 62 L 228 36 L 256 36 L 258 62 Z',metal);
    p('M 200 128 L 284 128 L 284 180 L 200 180 Z','#2a3430');
    p('M 194 124 L 290 124 L 290 140 L 194 140 Z',metal);
    p('M 214 144 L 270 144 L 270 168 L 214 168 Z','#8fb3bf',ink,5);
    p('M 204 240 L 280 240 L 304 330 L 190 330 Z',wood);
    p('M 186 320 L 316 320 L 340 410 L 172 410 Z',metal);
    p('M 212 332 L 280 332 L 296 404 L 206 404 Z','#7a5a3a',ink,6);
  }else if(selected===5){
    p('M 214 160 L 270 160 L 292 270 L 196 270 Z',dark);
    p('M 214 160 L 270 160 L 272 188 L 212 188 Z',metal);
    p('M 236 162 L 238 142 L 248 142 L 250 162 Z','#e2c482',ink,5);
    p('M 190 258 L 310 258 L 322 332 L 184 332 Z',metal);
    p('M 202 272 L 226 272 L 226 322 L 202 322 Z M 238 272 L 262 272 L 262 322 L 238 322 Z M 274 272 L 298 272 L 298 322 L 274 322 Z','#93a082',ink,5);
    p('M 292 250 L 312 226 L 322 246 L 306 262 Z',dark,ink,6);
    p('M 206 330 L 296 330 L 322 410 L 200 414 Z',wood);
    p('M 290 318 Q 346 340 316 372 L 304 346',null,ink,9);
  }else if(ammo>0&&shotAge>.5){
    // Grenades: a fused body held up in front, with the safety lever and pin ring.
    const cyl=(body,band)=>{
      p('M 215 170 L 295 170 L 295 312 Q 255 326 215 312 Z',body);
      p('M 215 218 L 295 218 L 295 250 L 215 250 Z',band,ink,6);
      p('M 222 152 L 288 152 L 288 172 L 222 172 Z',metal);
    };
    if(selected===6){
      p('M 205 232 Q 205 168 255 168 Q 305 168 305 232 Q 305 300 255 312 Q 205 300 205 232 Z','#5d6b3c');
      p('M 214 200 L 296 200 M 211 236 L 299 236 M 217 272 L 293 272 M 233 174 L 233 306 M 255 170 L 255 310 M 277 174 L 277 306',null,'#3f4a29',5);
      p('M 238 150 L 272 150 L 272 176 L 238 176 Z',metal);
    }else if(selected===7)cyl('#cfd2cc','#f2d35c');
    else cyl('#7e8f86','#c9d8d1');
    p('M 268 158 Q 322 150 328 204 L 316 208 Q 310 172 270 170 Z','#b8b8a8',ink,6);
    p('M 244 140 Q 230 118 250 112 Q 270 120 258 142',null,'#d6bd7a',7);
  }
  ctx.save();ctx.translate(0,-m.pump);
  p('M 320 323 Q 347 296 369 317 L 388 351 Q 381 380 352 382 L 321 362 Z',skin);
  p('M 339 329 Q 350 321 359 334 M 344 347 Q 358 339 366 352',null,'#a89c7c',4);
  ctx.restore();
  if(m.casing>=0){const t=m.casing,x=290+t*70,y=(selected===2?262:236)-Math.sin(t*Math.PI)*70+t*t*60;ctx.save();ctx.translate(x,y);ctx.rotate(t*9);ctx.globalAlpha=1-t*t;p('M -7 -4 L 7 -4 L 7 4 L -7 4 Z','#e1c379',ink,3);ctx.restore();}
  if(recoil>.45&&selected<6){const y=[44,65,147,96,24,138][selected];p(`M 240 ${y} L 208 ${y-28} L 234 ${y-22} L 248 ${y-67} L 261 ${y-24} L 292 ${y-35} L 270 ${y-3} L 250 ${y+5} Z`,'#ffd572',ink,5);p(`M 242 ${y-6} L 248 ${y-38} L 262 ${y-3} Z`,'#fff4bc',null);}
  ctx.restore();
  if(selected===4&&ads>.35){
    const a=Math.min(1,(ads-.35)/.45),r=Math.min(width,height)*.34;
    ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#050805';
    ctx.beginPath();ctx.rect(0,0,width,height);ctx.arc(width/2,height/2,r,0,Math.PI*2,true);ctx.fill('evenodd');
    ctx.strokeStyle='#050805';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(width/2-r,height/2);ctx.lineTo(width/2+r,height/2);ctx.moveTo(width/2,height/2-r);ctx.lineTo(width/2,height/2+r);ctx.stroke();
    ctx.lineWidth=5;ctx.strokeStyle='#050805';ctx.beginPath();ctx.arc(width/2,height/2,r,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
}
