export const WEAPONS=[
  {name:'FIELD CARBINE',short:'CARBINE',capacity:24,interval:.15,reload:1.5,pellets:1,spread:.004,range:48,automatic:true},
  {name:'DRILL SHOTGUN',short:'SHOTGUN',capacity:6,interval:.8,reload:1.9,pellets:7,spread:.065,range:19,automatic:false},
  {name:'SERVICE SIDEARM',short:'SIDEARM',capacity:12,interval:.28,reload:1.1,pellets:1,spread:.002,range:38,automatic:false}
];
export function createArsenal(){return {selected:0,ammo:WEAPONS.map(w=>w.capacity),cooldown:0,reload:0};}
export function selectWeapon(a,index){if(index<0||index>=WEAPONS.length||index===a.selected)return false;a.selected=index;a.reload=0;a.cooldown=Math.max(a.cooldown,.2);return true;}
export function startReload(a){const w=WEAPONS[a.selected];if(a.reload>0||a.ammo[a.selected]===w.capacity)return false;a.reload=w.reload;return true;}
export function stepWeapon(a,dt){a.cooldown=Math.max(0,a.cooldown-dt);if(a.reload>0){a.reload=Math.max(0,a.reload-dt);if(a.reload===0){a.ammo[a.selected]=WEAPONS[a.selected].capacity;return true;}}return false;}
export function fireWeapon(a){if(a.reload>0||a.cooldown>0||a.ammo[a.selected]===0)return false;a.ammo[a.selected]--;a.cooldown=WEAPONS[a.selected].interval;return true;}

export function drawPlayerWeapon(ctx,width,height,{selected=0,recoil=0,reload=0,bob=0,time=0}={}){
  const ink='#161c18',wood='#99724b',metal='#667363',dark='#39483f',skin='#e2d4af';
  const scale=Math.min(width/1000,height/760)*1.13;
  ctx.save();ctx.translate(width*.5-250*scale+bob,height-400*scale+recoil*24+Math.sin(reload/WEAPONS[selected].reload*Math.PI)*190);
  ctx.scale(scale,scale);ctx.rotate(-recoil*.025);
  const p=(d,fill,line=ink,w=9)=>{ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=w;const path=new Path2D(d);if(fill){ctx.fillStyle=fill;ctx.fill(path);}if(line){ctx.strokeStyle=line;ctx.stroke(path);}};
  // The same round sleeves and mitten hands as the enemy illustrations.
  p('M 50 408 L 112 309 Q 148 287 173 321 L 187 400 Z','#687345');
  p('M 112 313 Q 106 273 143 254 Q 167 246 179 269 L 201 303 Q 184 336 156 340 Z',skin);
  p('M 345 402 L 323 324 Q 351 292 381 309 L 448 408 Z','#687345');
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
  }else{
    p('M 218 168 L 266 168 L 299 282 L 199 282 Z',dark);
    p('M 218 167 L 266 167 L 268 193 L 214 193 Z',metal);
    p('M 239 167 L 241 151 L 251 151 L 254 167 Z','#e2c482',ink,5);
    p('M 199 264 L 300 264 L 321 317 L 191 317 Z',metal);
    p('M 216 268 L 215 247 L 235 247 L 237 269 M 268 268 L 269 247 L 286 247 L 290 269',dark,ink,6);
    p('M 215 316 L 294 316 L 320 400 L 212 405 Z',wood);
    for(let y=337;y<393;y+=15)p(`M 231 ${y} L 287 ${y}`,null,'#614e37',4);
    p('M 284 313 Q 337 335 307 365 L 296 341',null,ink,9);
  }
  p('M 320 323 Q 347 296 369 317 L 388 351 Q 381 380 352 382 L 321 362 Z',skin);
  p('M 339 329 Q 350 321 359 334 M 344 347 Q 358 339 366 352',null,'#a89c7c',4);
  if(recoil>.45){const y=selected===2?147:selected===1?65:44;p(`M 240 ${y} L 208 ${y-28} L 234 ${y-22} L 248 ${y-67} L 261 ${y-24} L 292 ${y-35} L 270 ${y-3} L 250 ${y+5} Z`,'#ffd572',ink,5);p(`M 242 ${y-6} L 248 ${y-38} L 262 ${y-3} Z`,'#fff4bc',null);}
  ctx.restore();
}
