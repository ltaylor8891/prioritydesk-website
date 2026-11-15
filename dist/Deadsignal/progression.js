// Rank is the hook for future experience levels: raise a weapon's unlockLevel in weapons.js and the loadout screen
// locks it (with its rank shown) until playerLevel() reaches it. Until XP exists everything is available at rank 1.
export const unlockLevel=w=>w?.unlockLevel??1;
export function playerLevel(){try{const v=Number(localStorage.getItem('dead-signal-level'));return Number.isInteger(v)&&v>=1?v:1;}catch{return 1;}}
export const isUnlocked=(w,level=playerLevel())=>unlockLevel(w)<=level;
