// Procedural sound effects built from filtered noise and sweeping oscillators (no audio files).
// Every effect is layered like a real recording: a sharp transient, a body, a low thump and a reverberant tail.
// Effects placed in the world are quieter, duller, more reverberant and panned according to where they happen.

// Per-gun layers: crack [highpass Hz, seconds, volume], body [from Hz, to Hz, seconds, volume], thump [from Hz, to Hz, seconds, volume], tail [seconds, volume]
export const GUN_SOUNDS=[
  {crack:[3200,.04,.7],body:[1900,420,.16,.8],thump:[150,48,.13,.9],tail:[.45,.28],pitch:1},        // carbine
  {crack:[1800,.07,.9],body:[2600,140,.32,1.25],thump:[95,30,.28,1.2],tail:[.9,.5],pitch:1},        // shotgun
  {crack:[3800,.03,.8],body:[2200,700,.1,.75],thump:[190,75,.09,.7],tail:[.3,.22],pitch:1},         // sidearm
  {crack:[3400,.025,.55],body:[2400,800,.07,.6],thump:[210,95,.06,.55],tail:[.22,.16],pitch:1},     // smg
  {crack:[2200,.06,1],body:[1100,150,.34,1.1],thump:[105,34,.32,1.1],tail:[1.1,.55],pitch:1},       // marksman
  {crack:[2000,.06,1],body:[1300,120,.34,1.2],thump:[85,28,.34,1.3],tail:[.95,.5],pitch:1}          // magnum
];
GUN_SOUNDS[9]={...GUN_SOUNDS[2],pitch:1.1};
GUN_SOUNDS[10]={crack:[1500,.018,.12],body:[420,130,.14,.5],thump:[90,50,.08,.16],tail:[.16,.06],pitch:1};
// Reload layout per gun: when (as a fraction of the reload) each mechanical sound happens.
const RELOADS=[
  [['clack',.08,.9],['slide',.2,.5],['clunk',.62,1],['clack',.94,.8]],
  [['clack',.06,.7],['shell',.2,.8],['shell',.38,.8],['shell',.56,.8],['shell',.72,.8],['pump',.92,1]],
  [['clack',.1,.8],['clunk',.55,.9],['clack',.92,.9]],
  [['clack',.07,.9],['slide',.18,.5],['clunk',.6,1],['clack',.93,.8]],
  [['clack',.08,.9],['slide',.3,.5],['clunk',.6,1],['bolt',.85,1]],
  [['clack',.06,1],['ejector',.25,1],['shell',.45,.7],['shell',.6,.7],['clack',.9,1]]
];

RELOADS[9]=[['clack',.1,.7],['clunk',.35,.7],['clunk',.68,.7],['clack',.95,.7]];
RELOADS[10]=[['slide',.12,.45],['bolt',.65,.7],['clack',.95,.4]];

export function createSound({context,muted=()=>false,listener=()=>({x:0,z:0,yaw:0})}){
  let ctx=null,master=null,reverb=null,noiseBuffer=null;

  function build(){
    master=ctx.createDynamicsCompressor();
    master.threshold.value=-16;master.knee.value=18;master.ratio.value=6;master.attack.value=.002;master.release.value=.25;
    master.connect(ctx.destination);
    const rate=ctx.sampleRate;
    noiseBuffer=ctx.createBuffer(1,rate*2,rate);
    const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    // A synthetic open-air reverb: noise that fades out, a little darker as it dies.
    const length=Math.floor(rate*1.8),impulse=ctx.createBuffer(2,length,rate);
    for(let c=0;c<2;c++){const d=impulse.getChannelData(c);let lp=0;for(let i=0;i<length;i++){const f=1-i/length;lp+=((Math.random()*2-1)-lp)*(.25+.6*f);d[i]=lp*f*f*f;}}
    reverb=ctx.createConvolver();reverb.buffer=impulse;
    const wet=ctx.createGain();wet.gain.value=.6;reverb.connect(wet);wet.connect(master);
  }
  function ready(){
    if(muted())return null;
    const c=context();if(!c)return null;
    if(c!==ctx){ctx=c;build();}
    if(ctx.state==='suspended')ctx.resume?.();
    return ctx;
  }

  // Everything one effect plays goes through one "bus" that applies distance, panning and reverb.
  function bus(o,wet){
    const dx=(o.x??listener().x)-listener().x,dz=(o.z??listener().z)-listener().z;
    const spatial=o.x!==undefined&&o.z!==undefined;
    const distance=spatial?Math.hypot(dx,dz):0;
    const input=ctx.createGain();input.gain.value=(o.vol??1)/(1+distance/7);
    const lowpass=ctx.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=Math.max(1200,18000/(1+distance/9));
    input.connect(lowpass);
    let out=lowpass;
    if(spatial&&distance>.5&&ctx.createStereoPanner){
      const yaw=listener().yaw||0,right=(dx*Math.cos(yaw)+dz*Math.sin(yaw))/distance;
      const panner=ctx.createStereoPanner();panner.pan.value=Math.max(-.9,Math.min(.9,right*.9));lowpass.connect(panner);out=panner;
    }
    out.connect(master);
    const send=ctx.createGain();send.gain.value=Math.min(1.2,wet*(.5+Math.min(1,distance/25)));
    lowpass.connect(send);send.connect(reverb);
    // Sound travels at 343 m/s; stretched a little so distant blasts clearly arrive late.
    return {node:input,delay:spatial?Math.min(.9,distance/260):0,distance};
  }

  const envelope=(t,dur,vol,attack)=>{
    const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+Math.min(attack,dur*.5));
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);return g;
  };
  function noise(out,t,{dur,type='lowpass',from,to=from,q=.7,vol=1,attack=.002}){
    const s=ctx.createBufferSource();s.buffer=noiseBuffer;s.loop=true;
    const f=ctx.createBiquadFilter();f.type=type;f.Q.value=q;
    f.frequency.setValueAtTime(from,t);f.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+dur);
    const g=envelope(t,dur,vol,attack);s.connect(f);f.connect(g);g.connect(out);
    s.start(t,Math.random()*1.5);s.stop(t+dur+.05);
  }
  function tone(out,t,{dur,type='sine',from,to=from,vol=1,attack=.003}){
    const o=ctx.createOscillator();o.type=type;
    o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(Math.max(10,to),t+dur);
    const g=envelope(t,dur,vol,attack);o.connect(g);g.connect(out);o.start(t);o.stop(t+dur+.05);
  }

  // ---- individual effects: each takes the bus input node, a start time and options ----
  const effects={
    gun(out,t,o){
      const s=GUN_SOUNDS[o.weapon]??GUN_SOUNDS[0],v=.94+Math.random()*.12;
      noise(out,t,{type:'highpass',from:s.crack[0]*v,dur:s.crack[1],vol:s.crack[2],q:.5,attack:.0005});
      noise(out,t,{type:'bandpass',from:s.body[0]*v,to:s.body[1],dur:s.body[2],vol:s.body[3],q:.9,attack:.001});
      tone(out,t,{type:'sine',from:s.thump[0]*v,to:s.thump[1],dur:s.thump[2],vol:s.thump[3],attack:.001});
      noise(out,t+.01,{type:'lowpass',from:1100,to:160,dur:s.tail[0],vol:s.tail[1],attack:.02});
    },
    reload(out,t,o){
      const total=o.duration??1.5;
      for(const [kind,at,vol] of RELOADS[o.weapon]??RELOADS[0])mech(out,t+total*at,kind,vol);
    },
    empty(out,t){mech(out,t,'clack',.7);},
    switch(out,t){
      noise(out,t,{type:'bandpass',from:1800,to:900,dur:.09,vol:.18,q:.8,attack:.02});
      mech(out,t+.07,'slide',.7);
    },
    throw(out,t,o){
      const p=o.power??.5;
      mech(out,t,'pin',.9);
      // The harder the throw, the louder and higher the whoosh of the arm.
      noise(out,t+.05,{type:'bandpass',from:350+p*350,to:1100+p*1800,dur:.22+p*.12,vol:.25+p*.35,q:.8,attack:.07});
    },
    bounce(out,t,o){
      const f=o.force??.5;
      tone(out,t,{type:'triangle',from:2300,to:1500,dur:.09,vol:.12+f*.2});
      noise(out,t,{type:'bandpass',from:3200,to:1200,dur:.05,vol:.2+f*.25,q:1.5});
      tone(out,t,{type:'sine',from:170,to:70,dur:.09,vol:.25+f*.35});
    },
    frag(out,t){
      noise(out,t,{type:'highpass',from:1400,dur:.09,vol:1.5,q:.5,attack:.0005});
      noise(out,t,{type:'lowpass',from:1800,to:70,dur:1.2,vol:1.7,q:.6,attack:.004});
      tone(out,t,{type:'sine',from:78,to:22,dur:1.3,vol:1.9,attack:.003});
      // Shrapnel and debris pattering down afterwards.
      for(let i=0;i<14;i++)noise(out,t+.12+Math.random()*.9,{type:'bandpass',from:1500+Math.random()*3500,to:900,dur:.04,vol:.15+Math.random()*.2,q:2});
      noise(out,t+.05,{type:'lowpass',from:900,to:120,dur:1.8,vol:.45,attack:.15});
    },
    flash(out,t){
      noise(out,t,{type:'highpass',from:700,dur:.16,vol:1.5,q:.4,attack:.0005});
      tone(out,t,{type:'square',from:2400,to:900,dur:.12,vol:.35,attack:.001});
      tone(out,t,{type:'sine',from:140,to:50,dur:.25,vol:.9,attack:.002});
      noise(out,t+.02,{type:'lowpass',from:3000,to:300,dur:.7,vol:.55,attack:.01});
    },
    smoke(out,t){
      tone(out,t,{type:'sine',from:210,to:80,dur:.12,vol:.5,attack:.002});
      noise(out,t,{type:'bandpass',from:1500,to:900,dur:.1,vol:.5,q:.7,attack:.001});
      // A long hiss as the canister vents.
      noise(out,t+.05,{type:'bandpass',from:5200,to:2600,dur:3.2,vol:.38,q:.45,attack:.25});
      noise(out,t+.05,{type:'lowpass',from:900,to:250,dur:2.2,vol:.18,attack:.3});
    },
    ring(out,t,o){
      // Tinnitus after a close flashbang; a stronger flash rings louder and longer.
      const s=o.strength??1,dur=1.5+2.5*s;
      tone(out,t,{type:'sine',from:3150,to:3050,dur,vol:.05+.06*s,attack:.05});
      tone(out,t,{type:'sine',from:3230,to:3120,dur:dur*.8,vol:.03+.04*s,attack:.08});
    },
    hitmark(out,t,o){
      tone(out,t,{type:'triangle',from:o.kill?900:1900,to:o.kill?500:1300,dur:.07,vol:.3});
      tone(out,t+.035,{type:'sine',from:o.kill?700:2700,to:o.kill?400:2200,dur:.06,vol:.15});
      if(o.kill)tone(out,t+.09,{type:'triangle',from:600,to:300,dur:.1,vol:.25});
    },
    hurt(out,t,o){
      const s=Math.min(1,(o.amount??25)/60);
      tone(out,t,{type:'sine',from:120,to:42,dur:.22,vol:.6+s*.5,attack:.002});
      noise(out,t,{type:'lowpass',from:900,to:200,dur:.18,vol:.45+s*.3,attack:.002});
      noise(out,t+.02,{type:'bandpass',from:420,to:260,dur:.28,vol:.2,q:1.4,attack:.03});
    },
    target(out,t){
      tone(out,t,{type:'triangle',from:1500,to:1200,dur:.25,vol:.28});
      tone(out,t,{type:'sine',from:3000,to:2800,dur:.18,vol:.1});
      noise(out,t,{type:'bandpass',from:2500,to:1500,dur:.05,vol:.3,q:2});
    },
    pickup(out,t){
      tone(out,t,{type:'sine',from:660,to:665,dur:.14,vol:.4});
      tone(out,t+.08,{type:'sine',from:880,to:885,dur:.14,vol:.4});
      tone(out,t+.16,{type:'sine',from:1320,to:1330,dur:.3,vol:.4});
    },
    capture(out,t){
      [523,659,784,1047].forEach((f,i)=>{
        tone(out,t+i*.09,{type:'triangle',from:f,to:f*1.005,dur:.4,vol:.28});
        tone(out,t+i*.09,{type:'sine',from:f*2,to:f*2,dur:.3,vol:.08});
      });
    },
    reloadDone(out,t){mech(out,t,'clack',.5);}
  };
  // Small metal and plastic mechanical sounds used by reloads, pins and switching.
  function mech(out,t,kind,vol=1){
    switch(kind){
      case 'clack':noise(out,t,{type:'bandpass',from:2800,to:1600,dur:.035,vol:.5*vol,q:2,attack:.0005});tone(out,t,{type:'square',from:1600,to:900,dur:.02,vol:.08*vol,attack:.0005});break;
      case 'clunk':noise(out,t,{type:'lowpass',from:1500,to:300,dur:.07,vol:.7*vol,attack:.001});tone(out,t,{type:'sine',from:210,to:90,dur:.08,vol:.5*vol,attack:.001});break;
      case 'slide':noise(out,t,{type:'bandpass',from:1500,to:3200,dur:.11,vol:.3*vol,q:1.2,attack:.03});break;
      case 'shell':tone(out,t,{type:'triangle',from:1100,to:800,dur:.05,vol:.18*vol});noise(out,t,{type:'bandpass',from:1800,to:900,dur:.05,vol:.35*vol,q:1.4});break;
      case 'pump':noise(out,t,{type:'bandpass',from:900,to:1500,dur:.08,vol:.45*vol,q:1,attack:.01});mech(out,t+.1,'clack',vol);break;
      case 'bolt':mech(out,t,'slide',vol);mech(out,t+.12,'clack',vol);mech(out,t+.2,'clunk',vol*.8);break;
      case 'ejector':tone(out,t,{type:'triangle',from:2600,to:1700,dur:.06,vol:.2*vol});noise(out,t,{type:'bandpass',from:3500,to:1800,dur:.04,vol:.3*vol,q:2});break;
      case 'pin':noise(out,t,{type:'bandpass',from:4200,to:2800,dur:.03,vol:.5*vol,q:3,attack:.0005});tone(out,t+.035,{type:'triangle',from:3400,to:2400,dur:.12,vol:.14*vol});mech(out,t+.07,'clack',vol*.6);break;
    }
  }

  // Wet (reverb) amount per effect: loud blasts are heard in the open; UI and close handling stay dry.
  const WET={gun:.5,frag:.9,flash:.6,smoke:.3,bounce:.25,throw:.1,reload:.05,empty:.02,switch:.02,ring:0,hitmark:0,hurt:.05,target:.15,pickup:.05,capture:.1,reloadDone:.05};

  function play(name,o={}){
    const effect=effects[name];if(!effect||!ready())return;
    try{
      const b=bus(o,WET[name]??.1);
      effect(b.node,ctx.currentTime+.005+b.delay+(o.delay||0),o);
    }catch(error){console.warn('Sound failed:',name,error);}
  }
  return {play,gun:(weapon,o={})=>play('gun',{...o,weapon})};
}
