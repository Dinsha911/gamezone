(() => {
const canvas=document.getElementById("gameCanvas"), ctx=canvas.getContext("2d");
const wrap=document.getElementById("gameWrap");
const startOverlay=document.getElementById("startOverlay"), pauseOverlay=document.getElementById("pauseOverlay"), over=document.getElementById("gameOverOverlay");
const scoreEl=document.getElementById("score"), fuelEl=document.getElementById("fuel"), livesEl=document.getElementById("lives"), rescuedEl=document.getElementById("rescued");
const finalScore=document.getElementById("finalScore"), overTitle=document.getElementById("overTitle"), overText=document.getElementById("overText");
let W=900,H=520,dpr=1,raf=0,last=0,running=false,paused=false;
let score=0,lives=3,rescued=0,fuel=100,player={x:150,y:220,vy:0},camera=0,worldX=150;
let survivors=[],buildings=[],fuels=[],clouds=[],particles=[];
let keys={},touching=false,touchY=0,seed=42;

function rnd(){seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296}
function resize(){

    dpr = Math.min(devicePixelRatio || 1, 2);

    W = Math.max(320, wrap.clientWidth);

    H = Math.max(
        230,
        wrap.clientHeight || Math.min(560, W * 0.58)
    );

    canvas.width = W * dpr;
    canvas.height = H * dpr;

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize",resize); resize();

function resetWorld(){
 score=0;lives=3;rescued=0;fuel=100;worldX=150;camera=0;player={x:150,y:H*.45,vy:0};
 survivors=[];buildings=[];fuels=[];particles=[];clouds=[];
 seed=42;
 for(let x=400;x<9000;x+=250+rnd()*230){
   buildings.push({x,h:55+rnd()*125,w:45+rnd()*45});
   if(rnd()>.25) survivors.push({x:x+30+rnd()*70,y:H-72,got:false});
   if(rnd()>.5) fuels.push({x:x+110,y:100+rnd()*(H-180),got:false});
 }
 for(let i=0;i<25;i++)clouds.push({x:rnd()*9000,y:35+rnd()*170,s:.5+rnd()*.9});
}

function start(){resetWorld();running=true;paused=false;startOverlay.classList.add("hidden");over.classList.add("hidden");pauseOverlay.classList.add("hidden");last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
function pause(){if(!running)return;paused=true;pauseOverlay.classList.remove("hidden")}
function resume(){if(!running)return;paused=false;pauseOverlay.classList.add("hidden");last=performance.now();raf=requestAnimationFrame(loop)}
function finish(win=false){running=false;paused=false;over.classList.remove("hidden");overTitle.textContent=win?"MISSION COMPLETE":"MISSION FAILED";overText.textContent=win?"You rescued everyone. Bring that score back for another run!":"Your rescue flight is over. Refuel, dodge better and try again.";finalScore.textContent=score.toLocaleString()}
document.getElementById("startBtn").onclick=start; document.getElementById("restartBtn").onclick=start; document.getElementById("pauseBtn").onclick=()=>paused?resume():pause();document.getElementById("resumeBtn").onclick=resume;

addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(["arrowup","arrowdown"," "].includes(e.key.toLowerCase()))e.preventDefault();if(e.key==="p")paused?resume():pause()});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
function control(y){player.y=Math.max(55,Math.min(H-85,y))}
canvas.addEventListener("pointerdown",e=>{touching=true;touchY=e.clientY;canvas.setPointerCapture?.(e.pointerId)});
canvas.addEventListener("pointermove",e=>{if(touching)control(player.y+(e.clientY-touchY)*1.15),touchY=e.clientY});
canvas.addEventListener("pointerup",()=>touching=false);canvas.addEventListener("pointercancel",()=>touching=false);
document.getElementById("upBtn").onpointerdown=()=>keys["arrowup"]=true;document.getElementById("upBtn").onpointerup=()=>keys["arrowup"]=false;
document.getElementById("downBtn").onpointerdown=()=>keys["arrowdown"]=true;document.getElementById("downBtn").onpointerup=()=>keys["arrowdown"]=false;

function burst(x,y,n=10){for(let i=0;i<n;i++)particles.push({x,y,vx:(rnd()-.5)*3,vy:(rnd()-.5)*3-1,life:.5+rnd()*.5})}
function hit(){lives--;burst(player.x,player.y,24);player.y=H*.45;player.vy=0;score=Math.max(0,score-150);if(lives<=0)finish(false);else fuel=Math.max(fuel,35)}
function update(dt){
 let up=keys["arrowup"]||keys["w"],down=keys["arrowdown"]||keys["s"];
 player.vy+=(up?-0.9:down?0.9:0.22)*dt*60;player.vy*=Math.pow(.90,dt*60);player.vy=Math.max(-5.8,Math.min(5.8,player.vy));player.y+=player.vy*dt*60;
 if(player.y<42){player.y=42;player.vy=.5} if(player.y>H-88){player.y=H-88;player.vy=-.5}
 worldX+=2.8*dt*60;camera=Math.max(0,worldX-150);fuel-=.55*dt;
 if(fuel<=0){fuel=0;finish(false);return}
 const px=worldX;
 survivors.forEach(s=>{if(!s.got&&Math.abs(s.x-px)<42&&Math.abs(s.y-player.y)<65){s.got=true;rescued++;score+=500;burst(player.x,player.y+20,18);if(rescued>=10)finish(true)}});
 fuels.forEach(f=>{if(!f.got&&Math.abs(f.x-px)<38&&Math.abs(f.y-player.y)<60){f.got=true;fuel=Math.min(100,fuel+28);score+=100;burst(player.x,player.y,12)}});
 buildings.forEach(b=>{if(Math.abs((b.x+b.w/2)-px)<b.w/2+18 && player.y>H-b.h-65)hit()});
 if(Math.floor(worldX/100)!==Math.floor((worldX-2.8*dt*60)/100))score+=10;
 particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=dt});particles=particles.filter(p=>p.life>0);
 scoreEl.textContent=Math.floor(score).toLocaleString();fuelEl.textContent=Math.ceil(fuel)+"%";livesEl.textContent=lives;rescuedEl.textContent=rescued+"/10";
}
function draw(){
 ctx.clearRect(0,0,W,H);
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#123a59");g.addColorStop(1,"#86b8bd");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.fillStyle="rgba(255,255,255,.18)";clouds.forEach(c=>{let x=c.x-camera*.35;if(x>-100&&x<W+100){ctx.beginPath();ctx.ellipse(x,c.y,55*c.s,18*c.s,0,0,Math.PI*2);ctx.fill()}});
 ctx.fillStyle="#244a3a";ctx.fillRect(0,H-45,W,45);
 buildings.forEach(b=>{let x=b.x-camera;if(x>-100&&x<W+100){ctx.fillStyle="#253746";ctx.fillRect(x,H-45-b.h,b.w,b.h);ctx.fillStyle="#ffd95a";for(let yy=H-30-b.h;yy<H-50;yy+=24)for(let xx=x+8;xx<x+b.w-5;xx+=18)ctx.fillRect(xx,yy,7,8)}});
 survivors.forEach(s=>{let x=s.x-camera;if(!s.got&&x>-30&&x<W+30){ctx.fillStyle="#ffcf55";ctx.beginPath();ctx.arc(x,s.y,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,s.y+9);ctx.lineTo(x,s.y+25);ctx.moveTo(x-10,s.y+14);ctx.lineTo(x+10,s.y+14);ctx.stroke()}});
 fuels.forEach(f=>{let x=f.x-camera;if(!f.got&&x>-30&&x<W+30){ctx.fillStyle="#45f1a5";ctx.fillRect(x-10,f.y-14,20,28);ctx.fillStyle="#082018";ctx.font="bold 15px sans-serif";ctx.fillText("F",x-5,f.y+5)}});
 // helicopter
 const hx=player.x,hy=player.y;ctx.save();ctx.translate(hx,hy);ctx.fillStyle="#e9f7ff";ctx.beginPath();ctx.ellipse(0,0,34,15,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#35e8ff";ctx.beginPath();ctx.arc(18,-2,12,0,Math.PI*2);ctx.fill();ctx.fillStyle="#0a2430";ctx.fillRect(-30,-2,10,5);ctx.strokeStyle="#d8f7ff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-5,-15);ctx.lineTo(0,-27);ctx.moveTo(-27,-27);ctx.lineTo(27,-27);ctx.stroke();ctx.fillStyle="#ffd54a";ctx.fillRect(-18,10,7,5);ctx.restore();
 particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle="#ffd54a";ctx.fillRect(p.x-camera,p.y,4,4);ctx.globalAlpha=1});
 // progress
 ctx.fillStyle="rgba(4,15,24,.55)";ctx.fillRect(14,14,W-28,5);ctx.fillStyle="#38e8ff";ctx.fillRect(14,14,(W-28)*Math.min(1,worldX/2600),5);
}
function loop(t){if(!running||paused)return;const dt=Math.min(.035,(t-last)/1000);last=t;update(dt);draw();raf=requestAnimationFrame(loop)}
draw();
})();
