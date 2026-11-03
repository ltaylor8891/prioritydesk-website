// Gameplay starts only after the browser confirms exclusive mouse capture.
export function createPointerLock(element, doc, onState) {
  let state='idle', attempt=0;
  const set=(next,error)=>{state=next;onState(next,error);};
  const fail=error=>{if(state==='requesting')set('blocked',error);};
  doc.addEventListener('pointerlockchange',()=>{
    if(doc.pointerLockElement===element) {
      if(state==='requesting'||state==='locked')set('locked');
      else doc.exitPointerLock(); // A request completed after pause or loss of focus.
    } else if(state==='locked')set('idle');
  });
  doc.addEventListener('pointerlockerror',()=>fail(new Error('The browser denied mouse capture.')));
  return {
    request() {
      if(state==='requesting'||state==='locked')return;
      const current=++attempt;
      set('requesting');
      try {
        if(!element.requestPointerLock)throw new Error('This browser does not support mouse capture.');
        const result=element.requestPointerLock();
        result?.catch(error=>{if(current===attempt)fail(error);});
      } catch(error) { fail(error); }
    },
    release() {
      attempt++;
      set('idle');
      if(doc.pointerLockElement===element)doc.exitPointerLock();
    }
  };
}
