import {Client} from './colyseus-client.js?v=permanent-1';
import {NETWORK_VERSION,reconcilePlayer} from './network-motion.js?v=permanent-1';

export function serverAddress(value){
  const url=new URL(value);
  if(!['ws:','wss:','http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)
    throw new Error('Enter a server address such as ws://127.0.0.1:2567.');
  url.protocol=url.protocol==='https:'||url.protocol==='wss:'?'wss:':'ws:';
  if(location.protocol==='https:'&&url.protocol!=='wss:')throw new Error('This HTTPS page needs a secure wss:// server. For local testing, open http://127.0.0.1:2567/.');
  return url.href.replace(/\/$/,'');
}
export class NetworkGame{
  constructor(room,onSnapshot,onDisconnect){
    // Slots return to bots immediately. Rejoining is explicit in this version;
    // do not replay buffered inputs through the SDK's automatic reconnect path.
    room.reconnection.enabled=false;
    this.room=room;this.pending=[];this.seq=0;this.latest=null;this.closed=false;this.ping=0;
    room.onMessage('snapshot',data=>{
      if(this.latest&&this.latest.selfId!==data.selfId)this.pending=[];
      this.latest=data;this.pending=this.pending.filter(i=>i.seq>data.ack);
      onSnapshot(data);
    });
    room.onMessage('pong',sent=>{this.ping=Math.round(performance.now()-sent);});
    room.onMessage('setup-error',message=>{this.onSetupError?.(message);});
    room.onLeave(()=>{if(!this.closed){this.closed=true;clearInterval(this.timer);onDisconnect();}});
    room.onError((_code,message)=>{this.lastError=message;});
    this.timer=setInterval(()=>{if(!this.closed)room.send('ping',performance.now());},2000);
    room.send('ready');
  }
  static async connect({address,name,code,team=null,onSnapshot,onDisconnect}){
    const client=new Client(serverAddress(address)),options={name,team,version:NETWORK_VERSION};
    const room=code?await client.joinById(code.trim().toUpperCase(),options):await client.create('training',options);
    return new NetworkGame(room,onSnapshot,onDisconnect);
  }
  send(input){
    if(this.closed||this.pending.length>=12)return null;
    const packet={...input,seq:++this.seq};this.pending.push(packet);this.room.send('input',packet);return packet;
  }
  predicted(){
    if(!this.latest)return null;
    return reconcilePlayer(this.latest.actors[this.latest.selfId],this.pending);
  }
  stop(){if(!this.closed)this.room.send('stop');this.pending=[];}
  start(){if(!this.closed)this.room.send('start');}
  chooseTeam(team){if(!this.closed)this.room.send('team',team);}
  setAi(enabled){if(!this.closed)this.room.send('ai',enabled);}
  leave(){this.closed=true;clearInterval(this.timer);return this.room.leave();}
}
