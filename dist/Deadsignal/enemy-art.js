// Original, ink-outlined cartoon cutouts. Drawn at 256 x 384, with transparent backgrounds.
export const CHARACTER_WIDTH=256;
export const CHARACTER_HEIGHT=384;
export const CHARACTER_NAMES=['The Rookie','The Old Hand','The Operator'];
const palettes=[
  {cloth:'#677044',shade:'#4c5637',skin:'#e2d4af',accent:'#b6a475',boots:'#514a40'},
  {cloth:'#928062',shade:'#72644e',skin:'#ddc9a4',accent:'#cbb584',boots:'#51453b'},
  {cloth:'#526f7e',shade:'#3b5361',skin:'#eee0c4',accent:'#a6bfc0',boots:'#404b50'}
];
export function drawEnemy(ctx,frame=0,variant=0){
  const c=palettes[variant%palettes.length],ink='#141713',step=Math.sin(frame*Math.PI/2),bob=Math.abs(step)*2;
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=9;ctx.strokeStyle=ink;
  const shape=(d,fill,stroke=ink,width=9)=>{const p=new Path2D(d);ctx.fillStyle=fill;if(fill)ctx.fill(p);if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke(p);}};
  const oval=(x,y,rx,ry,fill,stroke=ink,width=9)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}};
  const line=(d,width=7,color=ink)=>shape(d,null,color,width);
  // Soft trousers and chunky boots alternate their stride without changing the silhouette's scale.
  ctx.save();ctx.translate(0,step*5);
  shape('M 77 280 L 121 284 L 118 348 Q 101 362 74 346 Z',c.shade);
  shape('M 76 336 Q 97 341 118 337 L 120 366 Q 99 375 66 369 Q 58 356 76 349 Z',c.boots);
  line('M 75 361 L 105 363',4,'#a49b83');ctx.restore();
  ctx.save();ctx.translate(0,-step*5);
  shape('M 137 284 L 179 280 L 184 346 Q 158 361 138 348 Z',c.shade);
  shape('M 138 337 Q 162 341 182 336 L 184 349 Q 201 355 193 369 Q 162 375 137 366 Z',c.boots);
  line('M 150 363 L 180 361',4,'#a49b83');ctx.restore();
  ctx.save();ctx.translate(0,bob);
  // Rounded sleeves and mitten hands, with a small opposing arm swing.
  ctx.save();ctx.translate(0,-step*6);
  shape('M 78 192 Q 45 188 34 219 L 24 261 Q 34 278 57 267 L 82 227 Z',c.cloth);
  oval(36,276,19,22,c.skin);line('M 28 268 Q 37 266 40 274',4);ctx.restore();
  ctx.save();ctx.translate(0,step*6);
  shape('M 178 192 Q 212 189 223 220 L 233 261 Q 219 278 199 267 L 175 228 Z',c.cloth);
  oval(220,276,19,22,c.skin);line('M 228 268 Q 219 266 216 274',4);ctx.restore();
  // A simple tunic, collar, belt and two oversized pockets.
  shape('M 83 180 Q 126 168 173 180 Q 187 211 185 256 L 188 308 Q 164 318 129 306 Q 95 320 68 309 L 71 250 Q 69 210 83 180 Z',c.cloth);
  shape('M 104 183 L 128 220 L 152 183 Z',c.accent,ink,6);
  line('M 128 220 L 128 283',5);
  shape('M 83 231 L 111 231 L 110 253 Q 97 262 84 253 Z',c.shade,ink,4);
  shape('M 145 231 L 172 231 L 171 253 Q 158 262 146 253 Z',c.shade,ink,4);
  shape('M 70 277 Q 126 288 186 277 L 187 295 Q 127 306 69 295 Z','#4c4438',ink,6);
  shape('M 116 283 L 141 283 L 141 300 L 116 300 Z',c.accent,ink,5);
  line('M 126 291 L 134 291',4);
  // The head is deliberately oversized, with an imperfect round contour.
  shape('M 42 113 C 38 66 76 33 127 34 C 182 32 218 64 215 115 C 222 166 182 202 129 203 C 77 205 37 168 42 113 Z',c.skin,ink,10);
  if(variant===0){
    // Low olive helmet and a few unruly locks.
    shape('M 41 91 C 40 39 77 17 125 18 C 180 16 216 43 215 92 Q 229 94 226 108 Q 180 91 127 92 Q 76 85 31 105 Q 24 94 41 91 Z',c.cloth,ink,10);
    line('M 63 56 Q 85 32 110 32',5,'#8e9462');
    shape('M 101 94 Q 99 109 87 111 Q 108 117 118 100 Q 119 116 135 115 Q 128 107 132 96',ink,null);
    oval(94,133,9,11,ink,null);oval(163,135,9,11,ink,null);
    line('M 81 113 Q 91 106 104 112',6);line('M 151 112 Q 164 107 175 116',6);
    for(const [x,y] of [[67,149],[77,157],[85,148],[178,150],[187,158],[194,148]])oval(x,y,2.8,3,ink,null);
    shape('M 108 158 Q 130 168 153 157 Q 150 184 129 184 Q 113 180 108 158 Z',ink,ink,5);
    shape('M 124 179 Q 133 167 147 175 Q 137 186 124 179 Z',c.skin,null);
  }else if(variant===1){
    // A battered soft field cap and a sideways, unimpressed expression.
    shape('M 44 92 L 51 47 Q 103 15 169 37 L 202 75 L 211 98 Q 153 79 44 92 Z',c.cloth,ink,10);
    shape('M 74 86 Q 152 77 215 96 Q 211 111 185 112 Q 138 95 74 101 Z',c.shade,ink,7);
    shape('M 113 47 L 135 47 L 135 65 L 113 65 Z',c.accent,ink,4);
    line('M 77 124 Q 93 112 111 120',8);line('M 149 118 L 176 126',8);
    oval(98,137,8,10,ink,null);oval(159,139,8,10,ink,null);
    line('M 105 173 Q 130 180 151 164',7);line('M 148 160 L 158 168',5);
    for(const [x,y] of [[80,165],[89,178],[101,186],[157,183],[169,171]])line(`M ${x} ${y} l 2 4`,3,'#857759');
  }else{
    // Radio headset, expressive brows and a little dark hair curl.
    line('M 40 115 C 28 11 226 9 219 119',17);
    line('M 43 89 C 54 20 197 23 213 89',6,'#8d9895');
    oval(43,125,22,33,'#56605c',ink,9);oval(214,125,22,33,'#56605c',ink,9);
    line('M 44 107 Q 57 123 47 143',5,'#89948a');
    line('M 216 143 Q 226 178 169 177',8);oval(166,177,11,6,'#59665f',ink,4);
    line('M 116 65 Q 111 39 132 48',8);
    line('M 77 118 L 108 111',8);line('M 150 109 Q 163 103 176 116',8);
    oval(95,133,9,11,ink,null);oval(161,132,9,11,ink,null);
    shape('M 111 170 Q 125 151 147 164 Q 132 164 120 175 Z',ink,ink,5);
    shape('M 168 233 L 184 233 L 184 266 L 168 266 Z','#343f3d',ink,4);
    line('M 179 232 L 182 218',4);line('M 173 242 L 180 242 M 173 249 L 180 249',3,c.accent);
  }
  ctx.restore();ctx.restore();
}
