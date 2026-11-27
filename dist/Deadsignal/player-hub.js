import {setProgress} from './progression.js?v=season-1';
// Credentials stay in an HttpOnly server cookie; no passwords or tokens in storage.
const $=id=>document.getElementById(id);
let profile=null,busy=false,joining=false,server='';
const endpoint=()=>{const u=new URL($('server-address').value||location.origin);u.protocol=u.protocol==='wss:'?'https:':u.protocol==='ws:'?'http:':u.protocol;return u.origin;};
async function api(path,data){const response=await fetch(endpoint()+'/api/'+path,{method:data?'POST':'GET',credentials:'include',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error||'Server unavailable.'),{status:response.status});return result;}
function message(text){$('account-message').textContent=text;}
function button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>perform(action);return b;}
function render(){
  setProgress(profile?.progress);window.dispatchEvent(new CustomEvent('dead-signal-progress',{detail:profile?.progress||null}));
  $('account-login').hidden=!!profile;$('account-profile').hidden=!profile;
  if(!profile)return;
  $('account-name').textContent=profile.user.name;const p=profile.progress;$('season-progress').textContent=p?`LEVEL ${p.level} · ${p.xp} XP · ${p.xpToNext} XP TO NEXT LEVEL`:'LEVEL 1';$('season-xp').value=p?.xpIntoLevel||0;$('season-reset').textContent=p?`SEASON ${p.season} · Resets ${new Date(p.resetsAt).toLocaleDateString()} at 00:00 UTC. Server matches earn XP; offline practice does not.`:'';
  const list=$('friends-list');list.replaceChildren();
  for(const friend of profile.friends){const row=document.createElement('div'),label=document.createElement('span');label.textContent=`${friend.name} · ${friend.status.toUpperCase()}`;row.append(label,button('REMOVE',async()=>{profile=await api('friends',{action:'remove',id:friend.id});}));list.append(row);}
  if(!profile.friends.length){const p=document.createElement('p');p.textContent='Add friends by their username. Accepted friends can see when you are online.';list.append(p);}
  for(const request of profile.requests){const row=document.createElement('div'),label=document.createElement('span');label.textContent=request.name+(request.incoming?' · FRIEND REQUEST':' · REQUEST SENT');row.append(label);if(request.incoming)row.append(button('ACCEPT',async()=>{profile=await api('friends',{action:'accept',id:request.id});}),button('DECLINE',async()=>{profile=await api('friends',{action:'decline',id:request.id});}));else row.append(button('CANCEL',async()=>{profile=await api('friends',{action:'remove',id:request.id});}));list.append(row);}
  const q=profile.queue,waiting=q.state==='waiting';$('queue-find').hidden=waiting||q.state==='ready';$('queue-cancel').hidden=q.state==='idle';$('queue-mode').disabled=q.state!=='idle';
  $('queue-status').textContent=waiting?`${q.count} / ${q.required} PLAYERS · WAITING FOR A FULL LOBBY`:q.state==='ready'?'LOBBY FILLED · JOINING MATCH…':'Eight players · automatic teams · no bots · Camp Paper';
  if(q.state==='ready'&&!joining){joining=true;window.dispatchEvent(new CustomEvent('dead-signal-match',{detail:q}));}
  if(q.state==='idle')joining=false;
}
async function perform(action){if(busy)return;busy=true;try{await action();message('');render();}catch(e){message(e.message);}finally{busy=false;}}
export async function createPlayTicket(){try{return (await api('play-ticket',{})).ticket;}catch(e){if(e.status===401)return null;throw e;}}
export async function cancelQueue(){if(profile&&profile.queue.state!=='idle'){profile=await api('queue',{cancel:true});joining=false;render();}}
$('account-form').onsubmit=e=>{e.preventDefault();perform(async()=>{const result=await api(e.submitter?.id==='account-register'?'register':'login',{name:$('account-username').value.trim(),password:$('account-password').value});$('account-password').value='';profile=await api('profile');$('player-name').value=result.user.name;});};
$('account-logout').onclick=()=>perform(async()=>{await api('logout',{});profile=null;});
$('friend-form').onsubmit=e=>{e.preventDefault();perform(async()=>{profile=await api('friends',{action:'add',name:$('friend-name').value.trim()});$('friend-name').value='';});};
$('queue-find').onclick=()=>perform(async()=>{profile=await api('queue',{mode:$('queue-mode').value});});
$('queue-cancel').onclick=()=>perform(async()=>{profile=await api('queue',{cancel:true});joining=false;});
addEventListener('dead-signal-match-error',e=>{joining=true;message(e.detail);$('queue-status').textContent='Could not enter the match. Cancel and queue again.';});
async function refresh(){if(busy||!$('server-address').value)return;try{const current=endpoint();if(server&&server!==current){profile=null;joining=false;}server=current;profile=await api('profile');render();}catch(e){if(e.status===401){profile=null;render();}else if(!$('online-panel').hidden)message('Account server unavailable. Check the server connection.');}}
setInterval(refresh,10000);setTimeout(refresh,1200);
document.getElementById('online').addEventListener('click',refresh);

const board=$('leaderboard-panel');let boardTrigger=null;
async function showBoard(event){if(event?.currentTarget)boardTrigger=event.currentTarget;else boardTrigger||=$('leaderboard');board.hidden=false;$('leaderboard-message').textContent='Loading standings…';$('leaderboard-close').focus();try{const result=await api('leaderboard'+($('leaderboard-season').value?'?season='+encodeURIComponent($('leaderboard-season').value):''));$('leaderboard-season').value=result.season;$('leaderboard-season').max=new Date().toISOString().slice(0,7);$('leaderboard-rows').replaceChildren(...result.rows.map(row=>{const tr=document.createElement('tr');for(const value of [row.rank,row.name,row.level,row.xp,row.kills+'/'+row.deaths,row.wins]){const td=document.createElement('td');td.textContent=value;tr.append(td);}return tr;}));$('leaderboard-message').textContent=result.rows.length?'Ranked by XP, then wins and kills. Monthly resets at 00:00 UTC on the first.':'No scores this month yet. Log in and play a server match to join the board.';}catch(e){$('leaderboard-message').textContent=e.message;}}
for(const b of document.querySelectorAll('[data-leaderboard]'))b.onclick=showBoard;
$('leaderboard-season').onchange=()=>showBoard();
function closeBoard(){board.hidden=true;boardTrigger?.focus();}
$('leaderboard-close').onclick=closeBoard;board.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeBoard();}});
