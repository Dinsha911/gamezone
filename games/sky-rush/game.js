(()=>{"use strict";
const c=document.getElementById("gameCanvas"),x=c.getContext("2d",{alpha:false}),$=id=>document.getElementById(id);
let W=960,H=540,dpr=1,state="menu",raf=0,last=0,score=0,coins=0,distance=0,elapsed=0,speed=260,spawn=0,coinSpawn=0;
let best=Number(localStorage.getItem("gamezoneSkyRushBest")||0),obs=[],items=[],parts=[],clouds=[],keys=new Set();
let touchActive=false,touchStartY=0,touchCurrentY=0,turbo=false,turboEnergy=100,turboCooldown=0;
let lives=3,combo=1,comboTimer=0,nearMissFlash=0,nearMissText="",shake=0;
let audioCtx=null,engineGain=null,engineOsc=null;
const p={x:130,y:270,vy:0,rot:0,shield:0};
function audioInit(){
 try{
  if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==="suspended") audioCtx.resume();
 }catch(e){}
}
function tone(freq,dur,type="sine",vol=.05,slide=0){
 if(!audioCtx)return;
 try{const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.linearRampToValueAtTime(Math.max(40,freq+slide),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(audioCtx.destination);o.start(t);o.stop(t+dur+.02)}catch(e){}
}
function sfx(name){
 audioInit();
 if(name==="coin"){tone(880,.08,"triangle",.07,260);setTimeout(()=>tone(1320,.09,"triangle",.045,180),45)}
 else if(name==="near"){tone(520,.09,"square",.045,300);setTimeout(()=>tone(980,.16,"triangle",.06,240),55)}
 else if(name==="turbo"){tone(180,.22,"sawtooth",.06,520);setTimeout(()=>tone(760,.14,"triangle",.045,180),80)}
 else if(name==="shield"){tone(420,.12,"sine",.05,300);setTimeout(()=>tone(720,.18,"sine",.05,260),70)}
 else if(name==="hit"){tone(110,.22,"sawtooth",.08,-70);setTimeout(()=>tone(70,.25,"square",.05,-25),60)}
}
function startEngine(){
 audioInit(); if(!audioCtx||engineOsc)return;
 try{engineOsc=audioCtx.createOscillator();engineGain=audioCtx.createGain();engineOsc.type="sawtooth";engineOsc.frequency.value=85;engineGain.gain.value=.012;engineOsc.connect(engineGain).connect(audioCtx.destination);engineOsc.start()}catch(e){}
}
function stopEngine(){if(engineOsc){try{engineOsc.stop()}catch(e){}engineOsc=null;engineGain=null}}
function updateEngine(){if(engineOsc&&engineGain){engineOsc.frequency.setTargetAtTime(turbo?145:85,audioCtx.currentTime,.08);engineGain.gain.setTargetAtTime(turbo?.025:.012,audioCtx.currentTime,.08)}}
function resize(){let r=c.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=Math.max(320,r.width);H=Math.max(260,r.height);c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0)}addEventListener("resize",resize);resize();
function hud(){
 $("score").textContent=Math.floor(score);$("coins").textContent=coins;$("shield").textContent=p.shield>0?Math.ceil(p.shield)+"s":"—";$("bestScore").textContent=best;
 $("lives").textContent="❤️".repeat(lives)+"🖤".repeat(Math.max(0,3-lives));$("combo").textContent="x"+combo;
 $("turboBar").style.width=Math.max(0,Math.min(100,turboEnergy))+"%";$("turboReady").textContent=turbo?"ACTIVE":turboCooldown>0?Math.ceil(turboCooldown)+"s":turboEnergy>=25?"READY":"CHARGING";
}
function reset(){score=coins=distance=elapsed=0;speed=260;spawn=.8;coinSpawn=.6;obs=[];items=[];parts=[];clouds=[];lives=3;combo=1;comboTimer=0;nearMissFlash=0;nearMissText="";turbo=false;turboEnergy=100;turboCooldown=0;shake=0;p.x=W*.16;p.y=H*.5;p.vy=0;p.rot=0;p.shield=0;for(let i=0;i<7;i++)clouds.push({x:Math.random()*W,y:40+Math.random()*H*.65,s:.5+Math.random()*1.2,a:.05+Math.random()*.08});hud()}
function start(){audioInit();startEngine();reset();state="play";$("startScreen").classList.add("hidden");$("gameOverScreen").classList.add("hidden");$("pauseScreen").classList.add("hidden");last=performance.now();raf=requestAnimationFrame(loop)}
function over(){stopEngine();sfx("hit");state="over";let f=Math.floor(score),old=best;if(f>best){best=f;localStorage.setItem("gamezoneSkyRushBest",best)}$("finalScore").textContent=f;$("finalCoins").textContent=coins;$("finalDistance").textContent=Math.floor(distance)+"m";$("finalBest").textContent=best;$("newBest").classList.toggle("hidden",f<=old);$("gameOverScreen").classList.remove("hidden");burst(p.x,p.y,30,"#ffb34a");hud()}
function pause(){if(state==="play"){state="paused";turbo=false;updateEngine();$("pauseScreen").classList.remove("hidden")}}function resume(){if(state==="paused"){audioInit();startEngine();state="play";$("pauseScreen").classList.add("hidden");last=performance.now();raf=requestAnimationFrame(loop)}}
function addGate(){let gap=Math.max(130,195-elapsed*2.2),cy=90+Math.random()*(H-180),w=44+Math.random()*26;obs.push({x:W+30,w,top:Math.max(28,cy-gap/2),bottom:Math.min(H-28,cy+gap/2),passed:false,near:false})}
function addItem(){items.push({x:W+20,y:65+Math.random()*(H-130),r:9,spin:Math.random()*6.28,shield:Math.random()<.09})}
function burst(a,b,n,col){for(let i=0;i<n;i++)parts.push({x:a,y:b,vx:(Math.random()-.5)*250,vy:(Math.random()-.5)*250,life:.35+Math.random()*.5,col})}
function dir(){if(keys.has("ArrowUp")||keys.has("w")||keys.has("W"))return-1;if(keys.has("ArrowDown")||keys.has("s")||keys.has("S"))return 1;if(touchActive){const dy=touchCurrentY-touchStartY;if(Math.abs(dy)<8)return 0;return dy<0?-1:1}return 0}
function activateTurbo(){if(state!=="play"||turboCooldown>0||turboEnergy<25)return;turbo=true;turboCooldown=1.6;sfx("turbo");if(navigator.vibrate)navigator.vibrate([30,20,50]);burst(p.x-20,p.y,12,"#7fe8ff")}
function endTurbo(){turbo=false}
function loseLife(){lives--;combo=1;sfx("hit");if(navigator.vibrate)navigator.vibrate([60,30,80]);comboTimer=0;shake=.35;burst(p.x,p.y,20,"#ff7777");if(lives<=0){over();return false}p.x=W*.16;p.y=Math.max(50,Math.min(H-50,H*.5));p.vy=0;p.shield=2;obs=obs.filter(o=>o.x>W*.25);nearMissText="LIFE LOST";nearMissFlash=1;return true}
function awardNearMiss(){combo=Math.min(8,combo+1);comboTimer=3;const bonus=50*combo;score+=bonus;nearMissText="NEAR MISS  +"+bonus;nearMissFlash=1.1;shake=.18;sfx("near");if(navigator.vibrate)navigator.vibrate(25);burst(p.x+10,p.y,18,"#ffd34d")}
function update(dt){
 elapsed+=dt;let baseSpeed=260+Math.min(240,elapsed*7);speed=baseSpeed*(turbo?1.7:1);score+=dt*(14+elapsed*.6)*(turbo?1.25:1);distance+=dt*speed/9;spawn-=dt;coinSpawn-=dt;
 if(spawn<=0){addGate();spawn=Math.max(.68,1.35-elapsed*.012)*(.85+Math.random()*.3)}if(coinSpawn<=0){addItem();coinSpawn=.5+Math.random()*.8}
 let d=dir();p.vy+=(d<0?-760:d>0?620:180)*dt;p.vy*=Math.pow(.09,dt);p.y+=p.vy*dt;p.y=Math.max(24,Math.min(H-24,p.y));p.rot=Math.max(-.42,Math.min(.42,p.vy/650));
 if(turbo){turboEnergy-=42*dt;if(turboEnergy<=0)endTurbo()}else{turboEnergy=Math.min(100,turboEnergy+10*dt)}if(turboCooldown>0)turboCooldown-=dt;
 if(comboTimer>0){comboTimer-=dt;if(comboTimer<=0)combo=1}if(nearMissFlash>0)nearMissFlash-=dt;if(shake>0)shake-=dt;
 obs.forEach(o=>o.x-=speed*dt);items.forEach(i=>{i.x-=speed*dt;i.spin+=dt*6});
 for(const o of obs){
  if(!o.passed&&o.x+o.w<p.x){o.passed=true;score+=35*combo}
  const playerBox={a:p.x-20,b:p.y-11,w:40,h:22};
  const topHit=hit(playerBox.a,playerBox.b,playerBox.w,playerBox.h,o.x,0,o.w,o.top),bottomHit=hit(playerBox.a,playerBox.b,playerBox.w,playerBox.h,o.x,o.bottom,o.w,H-o.bottom);
  if(!o.near&&!o.passed&&o.x< p.x+34&&o.x+o.w>p.x-34){const safeTop=o.top+18,safeBottom=o.bottom-18;if(p.y>safeTop&&p.y<safeBottom){o.near=true;awardNearMiss()}}
  if(topHit||bottomHit){if(p.shield>0){p.shield=0;sfx("shield");if(navigator.vibrate)navigator.vibrate(30);o.x=-200;shake=.12;burst(p.x,p.y,20,"#6de1ff")}else{if(!loseLife())return;break}}
 }
 obs=obs.filter(o=>o.x>-70);items=items.filter(i=>i.x>-50);
 for(let i=items.length-1;i>=0;i--){let q=items[i];if(Math.hypot(p.x-q.x,p.y-q.y)<26){if(q.shield){p.shield=8;score+=80*combo;sfx("shield");if(navigator.vibrate)navigator.vibrate(35);burst(q.x,q.y,16,"#6de1ff")}else{coins++;combo=Math.min(8,combo+1);comboTimer=3;score+=60*combo;sfx("coin");if(navigator.vibrate)navigator.vibrate(18);burst(q.x,q.y,12,"#ffd34d")}items.splice(i,1)}}
 if(p.shield>0)p.shield-=dt;updateEngine();parts.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=160*dt;q.life-=dt});parts=parts.filter(q=>q.life>0);hud()
}
function hit(a,b,w,h,A,B,W2,H2){return a<A+W2&&a+w>A&&b<B+H2&&b+h>B}
function draw(){
 x.save();
 if(shake>0){const m=shake*12;x.translate((Math.random()-.5)*m,(Math.random()-.5)*m)}
 let g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,"#092846");g.addColorStop(.55,"#147d9f");g.addColorStop(1,"#092e48");x.fillStyle=g;x.fillRect(0,0,W,H);let s=x.createRadialGradient(W*.78,H*.2,3,W*.78,H*.2,90);s.addColorStop(0,"rgba(255,244,180,.5)");s.addColorStop(1,"rgba(255,244,180,0)");x.fillStyle=s;x.fillRect(0,0,W,H);
 clouds.forEach(q=>{q.x-=speed*.012*q.s;if(q.x<-180)q.x=W+100;x.fillStyle=`rgba(255,255,255,${q.a})`;cloud(q.x,q.y,80*q.s)});x.fillStyle="rgba(8,52,67,.45)";x.beginPath();x.moveTo(0,H);x.lineTo(0,H*.82);for(let z=0;z<=W;z+=90)x.lineTo(z,H*.72-Math.sin(z*.012)*35);x.lineTo(W,H);x.fill();
 obs.forEach(o=>{gate(o.x,0,o.w,o.top);gate(o.x,o.bottom,o.w,H-o.bottom)});items.forEach(q=>{x.save();x.translate(q.x,q.y);x.rotate(q.spin);if(q.shield){x.strokeStyle="#78e4ff";x.lineWidth=4;x.beginPath();x.arc(0,0,13,0,Math.PI*2);x.stroke();x.fillStyle="#bff5ff";x.font="bold 12px system-ui";x.textAlign="center";x.textBaseline="middle";x.fillText("S",0,1)}else{x.fillStyle="#ffd34d";x.beginPath();x.arc(0,0,9,0,Math.PI*2);x.fill();x.strokeStyle="#fff0a1";x.stroke();x.fillStyle="#98650c";x.font="bold 9px system-ui";x.textAlign="center";x.textBaseline="middle";x.fillText("G",0,1)}x.restore()});plane();parts.forEach(q=>{x.globalAlpha=Math.max(0,q.life);x.fillStyle=q.col;x.beginPath();x.arc(q.x,q.y,2.5,0,Math.PI*2);x.fill();x.globalAlpha=1});
 if(nearMissFlash>0){x.save();x.globalAlpha=Math.min(1,nearMissFlash);x.fillStyle="#ffd34d";x.font="900 20px system-ui";x.textAlign="center";x.fillText(nearMissText,W/2,H*.18);x.restore()}
 x.restore();
}
function cloud(a,b,s){x.beginPath();x.arc(a,b,s*.32,0,6.28);x.arc(a+s*.25,b-s*.16,s*.4,0,6.28);x.arc(a+s*.57,b,s*.3,0,6.28);x.fill()}
function gate(a,b,w,h){if(h<=0)return;let g=x.createLinearGradient(a,0,a+w,0);g.addColorStop(0,"#142235");g.addColorStop(.5,"#294461");g.addColorStop(1,"#0d1827");x.fillStyle=g;x.fillRect(a,b,w,h);x.fillStyle="#63c6ff";x.fillRect(a-4,b+h-5,w+8,5);x.fillStyle="rgba(100,205,255,.12)";x.fillRect(a+7,b,4,h)}
function plane(){x.save();x.translate(p.x,p.y);x.rotate(p.rot);if(p.shield>0){x.strokeStyle="rgba(95,220,255,.75)";x.lineWidth=4;x.beginPath();x.arc(0,0,35+Math.sin(elapsed*8)*3,0,6.28);x.stroke()}if(turbo){for(let i=0;i<3;i++){x.globalAlpha=.35-i*.08;x.fillStyle="#7fe8ff";x.beginPath();x.arc(-35-i*10,(Math.random()-.5)*8,5+i*2,0,6.28);x.fill()}x.globalAlpha=1}
 x.fillStyle=turbo?"#ffdf5e":"#ffb43b";x.beginPath();x.moveTo(-27,0);x.lineTo(-45,-6-Math.random()*5);x.lineTo(-31,5);x.closePath();x.fill();x.fillStyle="#e9f3ff";x.beginPath();x.moveTo(29,0);x.lineTo(3,-12);x.lineTo(-20,-9);x.lineTo(-10,0);x.lineTo(-20,9);x.lineTo(3,12);x.closePath();x.fill();x.fillStyle=turbo?"#ff8a4d":"#55b9ff";x.beginPath();x.moveTo(5,0);x.lineTo(-5,-19);x.lineTo(-12,-18);x.lineTo(-8,-2);x.closePath();x.fill();x.fillStyle="#234a73";x.beginPath();x.ellipse(9,-2,7,4,0,0,6.28);x.fill();x.restore()}
function loop(t){if(state!=="play")return;let dt=Math.min(.035,(t-last)/1000);last=t;update(dt);draw();if(state==="play")raf=requestAnimationFrame(loop)}
$("startBtn").onclick=start;$("restartBtn").onclick=start;$("pauseBtn").onclick=pause;$("resumeBtn").onclick=resume;$("turboBtn").onclick=()=>{if(turbo)endTurbo();else activateTurbo()};
addEventListener("keydown",e=>{keys.add(e.key);if(["ArrowUp","ArrowDown"," "].includes(e.key))e.preventDefault();if((e.key===" "||e.key==="Shift")&&state==="play")activateTurbo();if(e.key==="Escape"&&state==="play")pause();else if(e.key==="Escape"&&state==="paused")resume()});addEventListener("keyup",e=>{keys.delete(e.key);if((e.key===" "||e.key==="Shift")&&turbo)endTurbo()});
c.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse")return;e.preventDefault();touchActive=true;touchStartY=e.clientY;touchCurrentY=e.clientY;c.setPointerCapture?.(e.pointerId)},{passive:false});
c.addEventListener("pointermove",e=>{if(!touchActive)return;e.preventDefault();touchCurrentY=e.clientY},{passive:false});
c.addEventListener("pointerup",e=>{if(!touchActive)return;e.preventDefault();touchActive=false},{passive:false});c.addEventListener("pointercancel",()=>touchActive=false);
c.addEventListener("touchstart",e=>e.preventDefault(),{passive:false});c.addEventListener("touchmove",e=>e.preventDefault(),{passive:false});c.addEventListener("touchend",e=>e.preventDefault(),{passive:false});
reset();draw();
})();
