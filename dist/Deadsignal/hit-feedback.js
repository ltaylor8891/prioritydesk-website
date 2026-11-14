import {clamp,wallDistance} from './core.js?v=permanent-1';

export const HEALTH_BAR_SECONDS=1;
export const DAMAGE_NUMBER_SECONDS=.9;
export function createHitFeedback(){return {numbers:[],bars:new Map(),serial:0};}
export function healthBarOpacity(age){return age<0||age>=HEALTH_BAR_SECONDS?0:clamp((1-age)/.3,0,1);}
export function recordHit(feedback,actor,amount,time,{shooter=0,position=actor}={}){
  if(!Number.isFinite(amount)||amount<=0)return;
  const key=actor.id??actor;
  // Pellets from one trigger pull add into one readable total per target.
  const last=feedback.numbers.findLast(n=>n.key===key&&n.shooter===shooter&&time-n.time<.06);
  if(last){last.amount+=amount;last.lethal=actor.hp<=0;}
  else{
    feedback.numbers.push({key,shooter,amount,time,x:position.x,z:position.z,y:1.9,
      drift:((feedback.serial++%3)-1)*.15,lethal:actor.hp<=0});
    if(feedback.numbers.length>64)feedback.numbers.shift();
  }
  if(actor.hp>0)feedback.bars.set(key,{actor,time});else feedback.bars.delete(key);
}
export function pruneFeedback(feedback,time){
  feedback.numbers=feedback.numbers.filter(n=>time-n.time<DAMAGE_NUMBER_SECONDS);
  for(const [key,b] of feedback.bars)if(time-b.time>=HEALTH_BAR_SECONDS||b.actor.hp<=0)feedback.bars.delete(key);
}
export function clearActorFeedback(feedback,key){feedback.bars.delete(key);feedback.numbers=feedback.numbers.filter(n=>n.key!==key);}
export function projectWorld(matrix,p,width,height){
  const clip=[0,0,0,0];for(let row=0;row<4;row++)clip[row]=matrix[row]*p.x+matrix[row+4]*p.y+matrix[row+8]*p.z+matrix[row+12];
  const w=clip[3];if(w<=.07||Math.abs(clip[0])>w*1.1||Math.abs(clip[1])>w*1.1||Math.abs(clip[2])>w)return null;
  return {x:(clip[0]/w*.5+.5)*width,y:(.5-clip[1]/w*.5)*height,depth:w};
}
export function feedbackVisible(camera,position){
  const dx=position.x-camera.x,dy=1.35-camera.y,dz=position.z-camera.z,d=Math.hypot(dx,dy,dz);
  return d>.15&&wallDistance(camera,{x:dx/d,y:dy/d,z:dz/d})>=d-.05;
}
export function drawHitFeedback(ctx,feedback,time,matrix,camera,width,height){
  pruneFeedback(feedback,time);ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  for(const {actor,time:hitTime} of feedback.bars.values()){
    if(!feedbackVisible(camera,actor))continue;
    const p=projectWorld(matrix,{x:actor.x,y:2.92,z:actor.z},width,height);if(!p)continue;
    const w=clamp(650/p.depth,42,86),h=7,ratio=clamp(actor.hp/(actor.maxHp??100),0,1);
    ctx.globalAlpha=healthBarOpacity(time-hitTime);ctx.fillStyle='#14231ef2';ctx.strokeStyle='#f6e6bd';ctx.lineWidth=1.5;
    ctx.fillRect(p.x-w/2-2,p.y-h/2-2,w+4,h+4);ctx.strokeRect(p.x-w/2-2,p.y-h/2-2,w+4,h+4);
    ctx.fillStyle=ratio>.5?'#a2e39a':ratio>.25?'#ffd56b':'#ff8064';ctx.fillRect(p.x-w/2,p.y-h/2,w*ratio,h);
  }
  for(const n of feedback.numbers){
    const age=time-n.time;if(!feedbackVisible(camera,n))continue;
    const p=projectWorld(matrix,{x:n.x+n.drift*age,y:n.y+age*.85,z:n.z},width,height);if(!p)continue;
    ctx.globalAlpha=clamp((DAMAGE_NUMBER_SECONDS-age)/.3,0,1);ctx.font=`900 ${Math.round(clamp(230/p.depth,17,27))}px Arial`;
    ctx.lineWidth=4;ctx.lineJoin='round';ctx.strokeStyle='#17231e';ctx.fillStyle=n.lethal?'#ffb06c':'#fff0bd';
    const label=String(Math.round(n.amount));ctx.strokeText(label,p.x,p.y);ctx.fillText(label,p.x,p.y);
  }
  ctx.restore();
}
