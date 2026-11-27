/* No camera images leave this page. Only stamp state is sent to the projector. */
const projection = new URLSearchParams(location.search).has('projector');
const channel = new BroadcastChannel('life-audit-v1');
const $ = id => document.getElementById(id);
const questions = ['Have you completed your education?', 'Are you currently employed?', 'Are you married?', 'Do you have children?'];
const stampAssets = {};
for (const [key, src] of Object.entries({approved:'assets/approved-stamp-green-v1.png',pending:'assets/pending-stamp-v1.png'})) {
 const img = new Image(); img.src = src; stampAssets[key] = img;
}
const steps = ['Education', 'Employment', 'Marriage', 'Parenthood'];
let mode = 'idle', video, model, poses = [], lastPose = 0, loading = false;
let phase = 'waiting', step = 0, stamps = [], entered = 0, absent = 0, stampedAt = 0;
let chest = {x:.5,y:.5}, gesture = '', gestureAt = 0, receivedAt = 0, remote;
let handState = {candidate:'',since:0,last:0,locked:false,lowered:0}, handHint = '';
let sound, controls = {px:.5,py:.5,size:.22,gain:.6,grid:false,tracking:false,flip:false};
const now = () => performance.now();
function reset(){phase='waiting';step=0;stamps=[];entered=0;gesture='';absent=0;handState={candidate:'',since:0,last:0,locked:false,lowered:0};}
function audioStart(){sound ||= new AudioContext();sound.resume();}
function thump(){if(!sound)return;const o=sound.createOscillator(),g=sound.createGain();o.frequency.setValueAtTime(140,sound.currentTime);o.frequency.exponentialRampToValueAtTime(40,sound.currentTime+.12);g.gain.setValueAtTime(.18,sound.currentTime);g.gain.exponentialRampToValueAtTime(.001,sound.currentTime+.15);o.connect(g);g.connect(sound.destination);o.start();o.stop(sound.currentTime+.16);}
function answer(yes){if(phase!=='question')return;stamps.push({label:yes?'APPROVED':'PENDING',subject:steps[step],yes});phase='stamp';stampedAt=now();gesture='';thump();}
function stopCamera(){if(model)model.detectStop();if(video){video.elt.srcObject?.getTracks().forEach(t=>t.stop());video.remove();video=null;}poses=[];}
function point(p,name){return p?.keypoints?.find(k=>k.name===name&&(k.confidence ?? k.score ?? 0)>.25);}
function torso(p){let l=point(p,'left_shoulder'),r=point(p,'right_shoulder');if(!l||!r)return null;let lh=point(p,'left_hip'),rh=point(p,'right_hip');return {x:1-(l.x+r.x)/1280,y:(lh&&rh?((l.y+r.y)/2*.65+(lh.y+rh.y)/2*.35):(l.y+r.y)/2+55)/480};}
function stamp(p,s,x,y,w,angle=0){const asset=stampAssets[s.yes?'approved':'pending'];if(s.label!=='ALIGN' && asset.complete && asset.naturalWidth){p.push();p.translate(x,y);p.rotate(angle);const h=w*asset.naturalHeight/asset.naturalWidth;p.drawingContext.drawImage(asset,-w/2,-h/2,w,h);p.pop();return;}p.push();p.translate(x,y);p.rotate(angle);p.stroke(s.yes?'#a4f9af':'#ff665e');p.strokeWeight(3);p.noFill();p.rectMode(p.CENTER);p.rect(0,0,w,w*.48);p.noStroke();p.fill(s.yes?'#a4f9af':'#ff665e');p.textAlign(p.CENTER,p.CENTER);p.textSize(Math.min(w*.19,w*.82/Math.max(s.label.length*.65,1)));p.text(s.label,0,-w*.035);p.textSize(w*.065);p.text(s.subject+' / LIFE AUDIT',0,w*.15);p.pop();}
if(projection){document.body.className='projector';document.body.innerHTML='';channel.onmessage=e=>{remote=e.data;receivedAt=now();};new p5(p=>{p.setup=()=>p.createCanvas(innerWidth,innerHeight);p.windowResized=()=>p.resizeCanvas(innerWidth,innerHeight);p.doubleClicked=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{});};p.draw=()=>{p.background(0);if(!remote||now()-receivedAt>1500)return;let c=remote.controls;if(c.grid){p.stroke(45);for(let i=1;i<10;i++){p.line(i*p.width/10,0,i*p.width/10,p.height);p.line(0,i*p.height/10,p.width,i*p.height/10);}stamp(p,{label:'ALIGN',subject:'CHEST CENTER',yes:true},c.px*p.width,c.py*p.height,c.size*p.width);return;}if(!remote.present)return;let x=c.px,y=c.py;if(c.tracking){x+=(remote.chest.x-.5)*c.gain*(c.flip?-1:1);y+=(remote.chest.y-.5)*c.gain;}remote.stamps.forEach((s,i)=>stamp(p,s,x*p.width+(i%2?1:-1)*c.size*p.width*.12,y*p.height+i*c.size*p.width*.24,c.size*p.width,(i%2?1:-1)*.08));};});}
else new p5(p=>{
 p.setup=()=>{p.createCanvas(640,480).parent('stage');p.textFont('sans-serif');
 $('demo').onclick=()=>{if(loading)return;stopCamera();mode='demo';document.body.dataset.mode='demo';reset();audioStart();$('status').textContent='DEMO · Move pointer into frame; answer Y / N';};
 $('camera').onclick=async()=>{if(loading||mode==='camera')return;loading=true;audioStart();$('camera').disabled=true;$('demo').disabled=true;$('status').textContent='Opening camera and loading body tracking…';try{if(!window.ml5)throw Error('ml5.js did not load. Check your connection and refresh');video=p.createCapture({video:{width:640,height:480},audio:false});video.size(640,480);video.hide();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Camera unavailable. Check permissions or other apps using it')),20000);const check=()=>{if(video?.elt.readyState>=2){clearTimeout(timer);resolve();}else if(video)setTimeout(check,100);};check();});model=await ml5.bodyPose('MoveNet');model.detectStart(video,result=>{poses=result;lastPose=now();});mode='camera';document.body.dataset.mode='camera';reset();$('status').textContent='CAMERA ON · Keep shoulders and upper body in frame';}catch(e){stopCamera();mode='idle';$('status').textContent='Startup failed: '+e.message+'. You can use demo mode.';}finally{loading=false;$('camera').disabled=false;$('demo').disabled=false;}};
 $('project').onclick=()=>{const w=window.open('?projector=1','life-audit-projector','popup,width=960,height=600');if(!w)$('status').textContent='Projection window blocked. Allow pop-ups and try again.';};
 $('yes').onclick=()=>answer(true);$('no').onclick=()=>answer(false);$('reset').onclick=reset;
 Object.keys(controls).forEach(k=>$(k).oninput=()=>controls[k]=$(k).type==='checkbox'?$(k).checked:Number($(k).value));
 window.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.key.toLowerCase()==='y')answer(true);if(e.key.toLowerCase()==='n')answer(false);if(e.key.toLowerCase()==='r')reset();});
 };
 p.draw=()=>{document.body.dataset.phase=phase;document.querySelectorAll('.steps > span').forEach((el,i)=>{el.classList.toggle('active',i===step&&phase!=='complete');el.classList.toggle('done',i<step||phase==='complete');});const seal=document.querySelector('.pending-seal');if(seal){const latest=stamps.at(-1);const key=latest?(latest.yes?'approved':'pending'):'waiting';if(seal.dataset.stamp!==key){seal.dataset.stamp=key;seal.replaceChildren();if(latest){const img=document.createElement('img');img.src=stampAssets[key].src;img.alt=latest.label;seal.append(img);}else seal.textContent='AWAITING';}}let t=now(),pose=poses[0],body=mode==='camera'&&t-lastPose<700?torso(pose):null;
 if(mode==='demo'&&p.mouseX>=0&&p.mouseX<640&&p.mouseY>=0&&p.mouseY<480)body={x:p.mouseX/640,y:p.mouseY/480};
 let present=!!body,inZone=present&&body.x>.25&&body.x<.75;
 if(body){chest.x+=(body.x-chest.x)*.25;chest.y+=(body.y-chest.y)*.25;absent=0;}else {absent ||=t;if(t-absent>2000&&phase!=='waiting')reset();}
 if(phase==='waiting'){if(inZone){entered ||=t;if(t-entered>1500){phase='question';gesture='';}}else entered=0;}
 if(phase==='stamp'&&t-stampedAt>1800){step++;phase=step>=steps.length?'complete':'question';gesture='';}
 const fresh=mode==='camera'&&t-lastPose<500;
 const hands=fresh?readHands(pose):[];
 if(mode==='camera'){
   const result=advanceGesture(handState,hands,t,phase==='question'&&!!body);
   handHint=!fresh?'Waiting for body tracking':!body?'Keep both shoulders in frame':result.hint;
   gesture=result.candidate;gestureAt=handState.since;
   if(result.answer!==null)answer(result.answer==='yes');
 }

 p.background(14,28,32);if(video&&mode==='camera'){p.push();p.translate(640,0);p.scale(-1,1);p.image(video,0,0,640,480);p.pop();}
 if(mode==='demo'&&body){p.noFill();p.stroke(130);p.ellipse(chest.x*640,chest.y*480-70,50);p.rect(chest.x*640-65,chest.y*480-40,130,155);}
 if(mode==='camera'&&fresh){
   p.push();p.textSize(13);p.textAlign(p.CENTER,p.CENTER);
   hands.forEach(h=>{if(!h.s)return;const sx=640-h.s.x,sy=h.s.y;p.stroke('#ffdf70');p.strokeWeight(2);p.line(sx-45,sy-h.threshold,sx+45,sy-h.threshold);p.circle(sx,sy,12);
     if(h.w){const wx=640-h.w.x,wy=h.w.y;p.stroke(h.raised?'#a4f9af':'#ffdf70');p.line(sx,sy,wx,wy);p.fill(h.raised?'#a4f9af':'#ffdf70');p.circle(wx,wy,16);p.noStroke();p.rect(wx-42,wy-40,84,22);p.fill(0);p.text(h.choice==='yes'?'YES / Y':'NO / N',wx,wy-29);}
   });p.pop();
 }
 p.noFill();p.stroke(inZone?'#a4f9af':'#768076');p.drawingContext.setLineDash([8,8]);p.rect(160,35,320,410);p.drawingContext.setLineDash([]);
 if(body){p.stroke('#a4f9af');p.line(chest.x*640-10,chest.y*480,chest.x*640+10,chest.y*480);p.line(chest.x*640,chest.y*480-10,chest.x*640,chest.y*480+10);stamps.forEach((s,i)=>stamp(p,s,chest.x*640+(i%2?15:-15),chest.y*480+i*56,190,(i%2?1:-1)*.08));}
 p.noStroke();p.fill('#fff');p.textSize(13);p.text('LIVE / '+(mode==='demo'?'SIMULATION':mode.toUpperCase()),18,25);if(entered&&phase==='waiting')p.text('POSITION CHECK '+Math.min(100,Math.floor((t-entered)/15))+'%',18,460);
 $('yes').disabled=$('no').disabled=phase!=='question';
 $('question').textContent=phase==='waiting'?'Awaiting participant':phase==='complete'?'Your audit is not over.':phase==='stamp'?stamps.at(-1).label:`${step+1} / 4 · ${questions[step]}`;
 $('detail').textContent=phase==='complete'?'More requirements will follow. You may leave the inspection zone.':phase==='stamp'?'Result recorded. Moving to the next checkpoint…':'Follow the instructions. Every milestone must be accounted for.';
 $('instruction').textContent=mode==='camera'?(phase==='waiting'?'Stand in the center for 1.5s · '+handHint:phase==='complete'?'Session finished. Leave or restart.':handHint):!present?'Awaiting entry · Leave for 2s to reset':phase==='waiting'?'Stand in the center for 1.5s':'DEMO: press Y / N to answer';
 $('log').textContent=stamps.map((s,i)=>`${String(i+1).padStart(2,'0')}  ${s.subject} → ${s.label}`).join('\n');$('log').style.whiteSpace='pre-line';
 channel.postMessage({controls,chest,stamps,present,phase});
 };
});
window.addEventListener('beforeunload',()=>{stopCamera();channel.close();});
