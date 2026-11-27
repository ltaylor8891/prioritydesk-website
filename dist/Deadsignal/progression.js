import {WEAPONS,cleanLoadout} from './weapons.js?v=season-1';
export const XP_PER_LEVEL=500;
export const STARTER_KITS=[[0,2,6,7],[1,2,6,8],[3,2,7,8]];
export const starterKit=avatar=>[...(STARTER_KITS[avatar]||STARTER_KITS[0])];
export const seasonKey=(now=Date.now())=>new Date(now).toISOString().slice(0,7);
export function seasonInfo(now=Date.now()){const d=new Date(now),season=seasonKey(now);return {season,resetsAt:new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1)).toISOString()};}
export const levelForXp=xp=>1+Math.floor(Math.max(0,Number(xp)||0)/XP_PER_LEVEL);
export const unlockLevel=w=>w?.unlockLevel??1;
let current=null;
export function setProgress(value){current=value?.season===seasonKey()?value:null;}
export function playerLevel(){return current?.season===seasonKey()?current.level:1;}
export const isUnlocked=(w,level=playerLevel(),avatar=null)=>unlockLevel(w)<=level||(Number.isInteger(avatar)&&STARTER_KITS[avatar]?.includes(WEAPONS.findIndex(item=>item.short===w?.short)));
export function allowedLoadout(raw,level=1,avatar=null){const kit=cleanLoadout(raw),used=new Set();return kit.map((w,i)=>{const allowed=n=>!used.has(n)&&isUnlocked(WEAPONS[n],level,avatar);if(!allowed(w))w=(i<2?starterKit(avatar).slice(0,2):starterKit(avatar).slice(2)).find(allowed);used.add(w);return w;});}
