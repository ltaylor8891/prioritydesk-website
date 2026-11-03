// Relative motion keeps aim independent of cursor position and screen edges.
export function mouseDelta(event, locked) {
  return locked ? {x:event.movementX||0,y:event.movementY||0} : {x:0,y:0};
}
