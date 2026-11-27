const panel=document.getElementById('share-panel'),trigger=document.getElementById('share-game'),address=document.getElementById('share-address'),status=document.getElementById('share-status');
const link=new URL(location.href);link.search='';link.hash='';
address.value=link.href;
function close(){panel.hidden=true;trigger.focus();}
trigger.addEventListener('click',()=>{panel.hidden=false;status.textContent='';document.getElementById('copy-game-link').focus();});
document.getElementById('close-share').addEventListener('click',close);
document.getElementById('copy-game-link').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(link.href);status.textContent='Link copied. Send it to your squad.';}
  catch{address.focus();address.select();status.textContent='Select the link and press Ctrl+C to copy.';}
});
const native=document.getElementById('native-share');native.hidden=!navigator.share;
native.addEventListener('click',async()=>{try{await navigator.share({title:'Dead Signal',text:'A 100% browser FPS. No download required. Bring your squad.',url:link.href});}catch(e){if(e.name!=='AbortError')status.textContent='Use Copy Link to share this game.';}});
panel.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.stopPropagation();close();return;}
  if(event.key==='Tab'){const controls=[...panel.querySelectorAll('button,input')].filter(el=>!el.hidden&&!el.disabled);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
});
