// Side-on weapon illustrations for menus, drawn in the same inked cartoon style as the first-person art.
// Everything is drawn in a 320 x 128 box, pointing right; canvases of any size scale to fit.
export const ICON_WIDTH=320,ICON_HEIGHT=128;
const ink='#161c18',wood='#99724b',woodDark='#6f5236',metal='#667363',dark='#39483f',light='#93a082',brass='#e1c379';

export function drawWeaponIcon(ctx,index){
  const w=ctx.canvas.width,h=ctx.canvas.height,s=Math.min(w/ICON_WIDTH,h/ICON_HEIGHT);
  ctx.clearRect(0,0,w,h);ctx.save();ctx.translate((w-ICON_WIDTH*s)/2,(h-ICON_HEIGHT*s)/2);ctx.scale(s,s);
  ctx.lineJoin='round';ctx.lineCap='round';
  const p=(d,fill,line=ink,width=5)=>{const path=new Path2D(d);ctx.lineWidth=width;if(fill){ctx.fillStyle=fill;ctx.fill(path);}if(line){ctx.strokeStyle=line;ctx.stroke(path);}};
  const circle=(x,y,r,fill,line=ink,width=4)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.lineWidth=width;if(fill){ctx.fillStyle=fill;ctx.fill();}if(line){ctx.strokeStyle=line;ctx.stroke();}};
  const art={
    // 0 FIELD CARBINE: full stock, wooden handguard, curved magazine.
    0:()=>{
      p('M 16 54 L 80 48 L 84 80 L 30 92 Z',wood);
      p('M 80 44 L 196 44 L 196 74 L 80 78 Z',metal);
      p('M 196 47 L 256 49 L 256 69 L 196 71 Z',wood);
      p('M 256 54 L 300 54 L 300 62 L 256 62 Z',dark);p('M 292 50 L 310 50 L 310 66 L 292 66 Z',metal);
      p('M 264 38 L 270 38 L 270 54 L 264 54 Z',dark,ink,4);p('M 116 34 L 134 34 L 134 44 L 116 44 Z',dark,ink,4);
      p('M 120 74 L 152 74 L 146 108 Q 132 112 118 106 Z',dark);p('M 128 84 L 144 84',null,'#1f2a24',4);
      p('M 86 78 L 108 78 L 102 108 L 84 108 Z',wood);p('M 112 78 Q 122 98 142 78',null,ink,5);
      p('M 150 52 L 186 52 L 186 66 L 150 66 Z',light,ink,3);
    },
    // 1 DRILL SHOTGUN: long barrel over a magazine tube, pump forend.
    1:()=>{
      p('M 10 52 L 86 46 L 90 82 L 24 94 Z',wood);
      p('M 86 42 L 144 42 L 144 76 L 86 78 Z',metal);
      p('M 144 44 L 312 44 L 312 52 L 144 52 Z',dark);p('M 144 56 L 296 56 L 296 63 L 144 63 Z',metal);
      p('M 176 58 L 246 58 L 246 80 L 176 80 Z',wood);p('M 184 62 L 238 62 M 184 70 L 238 70',null,woodDark,3);
      p('M 300 40 L 316 40 L 316 54 L 300 54 Z',metal,ink,4);p('M 290 36 L 296 36 L 296 44 L 290 44 Z',brass,ink,3);
      p('M 96 78 L 118 78 L 112 108 L 94 108 Z',wood);p('M 122 78 Q 132 98 152 78',null,ink,5);
      circle(128,56,8,brass,ink,3);
    },
    // 2 SERVICE SIDEARM: slide, grip and trigger guard.
    2:()=>{
      p('M 100 38 L 252 38 L 252 62 L 100 62 Z',metal);p('M 120 44 L 126 56 M 136 44 L 142 56 M 152 44 L 158 56',null,dark,3);
      p('M 252 42 L 280 42 L 280 58 L 252 58 Z',dark);p('M 262 32 L 268 32 L 268 42 L 262 42 Z',dark,ink,3);p('M 104 30 L 114 30 L 114 38 L 104 38 Z',dark,ink,3);
      p('M 104 62 L 160 62 L 150 112 L 98 112 Z',wood);p('M 114 76 L 148 76 M 112 88 L 146 88 M 110 100 L 144 100',null,woodDark,3);
      p('M 164 64 Q 190 64 188 84 L 170 80',null,ink,5);p('M 156 66 L 166 66 L 166 74 L 156 74 Z',dark,ink,3);
    },
    // 3 RAPID SMG: boxy body, straight magazine, folded-wire stock.
    3:()=>{
      p('M 12 54 L 70 50 M 12 54 L 12 78 L 70 72',null,ink,6);
      p('M 70 42 L 224 42 L 224 76 L 70 76 Z',metal);p('M 90 50 L 190 50 L 190 62 L 90 62 Z',light,ink,3);
      p('M 224 46 L 290 46 L 290 66 L 224 66 Z',dark);p('M 282 42 L 304 42 L 304 70 L 282 70 Z',metal);
      p('M 232 66 L 256 66 L 256 90 L 232 90 Z',wood);
      p('M 128 76 L 160 76 L 160 120 L 128 120 Z',dark);p('M 134 92 L 156 92 M 134 104 L 156 104',null,'#1f2a24',3);
      p('M 82 76 L 106 76 L 100 108 L 80 108 Z',wood);p('M 70 36 L 84 36 L 84 42 L 70 42 Z',dark,ink,3);
    },
    // 4 MARKSMAN RIFLE: long barrel, scope and wooden stock.
    4:()=>{
      p('M 6 56 L 92 48 L 96 84 L 22 98 Z',wood);p('M 14 64 L 70 58',null,woodDark,3);
      p('M 92 48 L 176 48 L 176 74 L 92 78 Z',metal);
      p('M 176 54 L 314 54 L 314 61 L 176 61 Z',dark);p('M 304 50 L 318 50 L 318 65 L 304 65 Z',metal);
      p('M 104 24 L 190 24 L 190 40 L 104 40 Z',dark);circle(104,32,10,'#8fb3bf',ink,4);circle(190,32,8,'#8fb3bf',ink,4);
      p('M 120 40 L 128 48 M 168 40 L 176 48',null,ink,5);
      p('M 176 61 L 230 61 L 230 70 L 176 70 Z',wood);
      p('M 100 78 L 122 78 L 116 108 L 98 108 Z',wood);p('M 126 78 Q 136 96 154 78',null,ink,5);
      p('M 196 66 L 206 66 L 214 92 L 204 94 Z',dark,ink,3);
    },
    // 5 MAGNUM REVOLVER: heavy barrel, chambered cylinder, hammer.
    5:()=>{
      p('M 150 42 L 284 42 L 284 62 L 150 62 Z',dark);p('M 150 62 L 250 62 L 250 72 L 150 72 Z',metal);
      p('M 276 36 L 282 36 L 282 42 L 276 42 Z',brass,ink,3);
      p('M 98 36 L 160 36 L 160 76 L 98 76 Z',metal);
      circle(128,54,26,light,ink,5);for(const [dx,dy] of [[0,-14],[12,-7],[12,7],[0,14],[-12,7],[-12,-7]])circle(128+dx,54+dy,5,dark,ink,3);
      p('M 92 30 L 112 18 L 120 30 L 104 40 Z',dark,ink,5);
      p('M 96 76 L 144 76 L 130 118 L 84 110 Z',wood);p('M 102 90 L 136 94 M 98 102 L 128 108',null,woodDark,3);
      p('M 150 78 Q 180 80 176 100 L 154 94',null,ink,5);
    },
    // 6 FRAG GRENADE: ridged body, fuse, safety lever and pin ring.
    6:()=>{
      p('M 110 74 Q 110 28 160 28 Q 210 28 210 74 Q 210 116 160 120 Q 110 116 110 74 Z','#5d6b3c');
      p('M 118 52 L 202 52 M 114 76 L 206 76 M 120 100 L 200 100 M 138 32 L 138 116 M 160 28 L 160 120 M 182 32 L 182 116',null,'#3f4a29',3);
      p('M 144 16 L 176 16 L 176 30 L 144 30 Z',metal);p('M 176 18 Q 232 12 238 62 L 226 66 Q 222 30 178 28 Z','#b8b8a8',ink,4);
      circle(138,10,9,null,brass,5);
    },
    // 7 FLASH GRENADE: pale canister with a yellow warning band.
    7:()=>{
      p('M 124 34 L 196 34 L 196 112 Q 160 122 124 112 Z','#d8dbd4');
      p('M 124 62 L 196 62 L 196 86 L 124 86 Z','#f2d35c');p('M 134 70 L 186 70 M 134 78 L 186 78',null,ink,3);
      p('M 130 18 L 190 18 L 190 34 L 130 34 Z',metal);p('M 190 20 Q 240 14 244 64 L 232 68 Q 228 34 192 30 Z','#b8b8a8',ink,4);
      circle(138,10,9,null,brass,5);p('M 152 104 L 168 104',null,ink,5);
    },
    // 8 SMOKE GRENADE: grey-green canister with a vented cap.
    8:()=>{
      p('M 124 34 L 196 34 L 196 112 Q 160 122 124 112 Z','#7e8f86');
      p('M 124 60 L 196 60 L 196 84 L 124 84 Z','#c9d8d1');p('M 130 66 L 190 66 M 130 78 L 190 78',null,'#4b5a53',3);
      p('M 130 18 L 190 18 L 190 34 L 130 34 Z',metal);p('M 142 20 L 142 32 M 154 20 L 154 32 M 166 20 L 166 32 M 178 20 L 178 32',null,ink,3);
      p('M 190 20 Q 240 14 244 64 L 232 68 Q 228 34 192 30 Z','#b8b8a8',ink,4);circle(138,10,9,null,brass,5);
      p('M 96 112 Q 120 96 112 80 M 224 112 Q 252 98 240 80',null,'#c9d8d1',6);
    }
  };
  (art[index]||art[0])();
  ctx.restore();
}
