// Pure gesture logic, separate from camera and rendering for reproducible checks.
function readHands(pose) {
  const get = name => pose?.keypoints?.find(k => k.name === name && (k.confidence ?? k.score ?? 0) > .25);
  const left = get('left_shoulder'), right = get('right_shoulder');
  const threshold = left && right ? Math.max(12, Math.min(30, Math.abs(left.x-right.x)*.12)) : 18;
  return ['left','right'].map(side => {
    const s=get(side+'_shoulder'), w=get(side+'_wrist');
    // Anchor answer to shoulder side, so crossing a wrist does not change the answer.
    const choice=s && left && right ? (s.x>=(left.x+right.x)/2?'yes':'no') : '';
    return {s,w,threshold,choice,raised:!!(s&&w&&w.y<s.y-threshold)};
  });
}
function advanceGesture(state,hands,t,active) {
  const raised=hands.filter(h=>h.raised), bothVisible=hands.length===2&&hands.every(h=>h.s&&h.w);
  let hint='Raise one wrist above the yellow shoulder line', candidate='', answer=null;
  if(state.locked){
    if(bothVisible&&!raised.length){state.lowered ||= t;if(t-state.lowered>=300)state.locked=false;}else state.lowered=0;
    hint='Recorded. Lower both hands before the next answer.';
    return {hint,candidate,answer};
  }
  if(!active){state.candidate='';return {hint:'Waiting for the next checkpoint',candidate,answer};}
  if(raised.length===2){state.candidate='';return {hint:'Both hands raised. Please raise only one.',candidate,answer};}
  const g=raised.length===1?raised[0].choice:'';
  if(g){
    if(g!==state.candidate||t-state.last>220){state.candidate=g;state.since=t;}
    state.last=t;candidate=g;
    const progress=Math.min(100,Math.floor((t-state.since)/7));
    hint=(g==='yes'?'COMPLETED':'NOT YET')+' · Hold steady '+progress+'%';
    if(t-state.since>=700){answer=g;state.locked=true;state.lowered=0;state.candidate='';hint='Recorded. Lower both hands.';}
  }else{
    if(t-state.last>220)state.candidate='';
    hint=bothVisible?'Wrists detected. Raise one above the yellow line.':'Wrists not visible. Step back; keep hands and shoulders in frame.';
  }
  return {hint,candidate,answer};
}
if(typeof module!=='undefined')module.exports={readHands,advanceGesture};
