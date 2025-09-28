// === Emergency spawner (guarantees you see fighters) ===
function ensureFighters(){
  if (!p1 || !p2) {
    // loud colors so they're obvious
    p1 = P(BASE_W * 0.35, +1, "#ff5252");
    p2 = P(BASE_W * 0.65, -1, "#4dd2ff");
    ST.kind = "cpu";
    ST.mode = "fight";
    ST.started = true;
    hideMenu();
    updateBars();
  }
}

// === Splash + watermark guard (credit stays intact) ===
(function(){
  const AUTHOR = "KhaosArKnight (Karree J. Howell, 06/09/2025)";
  function adler32(str){ let a=1,b=0; for(let i=0;i<str.length;i++){ a=(a+str.charCodeAt(i))%65521; b=(b+a)%65521; } return ((b<<16)|a)>>>0; }
  const EXPECT = adler32(AUTHOR).toString(16);
  const wm = document.getElementById('wm') || (()=>{ const d=document.createElement('div'); d.id='wm'; d.innerHTML='<div class="inner"><div class="tag">© '+AUTHOR+'</div></div>'; document.body.appendChild(d); return d; })();
  const ok = () => document.body.getAttribute('data-auth') === "S2hhb3NBcktuaWdodHwgS2FycmVlIEouIEhvd2VsbHwgMDYvMDkvMjAyNQ==";
  setInterval(()=>{ if(!ok()) wm.classList.add('on'); }, 1500);
  setTimeout(()=>{ const s=document.getElementById('splash'); if(s){ s.classList.add('fadeout'); setTimeout(()=>s.style.display='none',520);} }, 2000);
})();

// === Save system (localStorage) ===
const SB = (()=> {
  const KEY = "stickbrawl_save_v1";
  const defaults = () => ({
    settings: { leftHanded:false, lowGraphics:false, model1:"attacker", model2:"random", color1:"#e6e9ef", color2:"#e6e9ef", stage:"dojo" },
    stats: { matches:0, wins:0 }
  });
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || defaults(); } catch { return defaults(); } };
  const save = (data) => localStorage.setItem(KEY, JSON.stringify(data));
  return { load, save, defaults };
})();

// === Canvas / state ===
const BASE_W = 960, BASE_H = 540;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let DPR = Math.min(2, window.devicePixelRatio||1);
function fit(){
  const w = Math.min(window.innerWidth, window.innerHeight*(BASE_W/BASE_H));
  canvas.style.width = w+'px';
  canvas.style.height = (w*(BASE_H/BASE_W))+'px';
  canvas.width = BASE_W*DPR; canvas.height = BASE_H*DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener('resize', fit, {passive:true}); fit();

const ST = { mode:"menu", kind:null, started:false };
const $ = (id)=>document.getElementById(id);

// Load saved settings into menu
(function initMenu(){
  const d = SB.load();
  $("model1").value = d.settings.model1;
  $("model2").value = d.settings.model2;
  $("color1").value = d.settings.color1;
  $("color2").value = d.settings.color2;
  $("stage").value  = d.settings.stage;
  $("leftHanded").checked = d.settings.leftHanded;
  $("lowGraphics").checked = d.settings.lowGraphics;
  updateStatsRow();
})();

function updateStatsRow(){
  const d = SB.load();
  $("statMatches").textContent = d.stats.matches;
  $("statWins").textContent    = d.stats.wins;
  $("statLosses").textContent  = (d.stats.matches - d.stats.wins);
}

// Persist UI
["change","input"].forEach(ev=>{
  $("model1").addEventListener(ev,()=>{ let d=SB.load(); d.settings.model1=$("model1").value; SB.save(d); });
  $("model2").addEventListener(ev,()=>{ let d=SB.load(); d.settings.model2=$("model2").value; SB.save(d); });
  $("color1").addEventListener(ev,()=>{ let d=SB.load(); d.settings.color1=$("color1").value; SB.save(d); });
  $("color2").addEventListener(ev,()=>{ let d=SB.load(); d.settings.color2=$("color2").value; SB.save(d); });
  $("stage").addEventListener(ev,()=>{ let d=SB.load(); d.settings.stage=$("stage").value; SB.save(d); });
  $("leftHanded").addEventListener(ev,()=>{ let d=SB.load(); d.settings.leftHanded=$("leftHanded").checked; SB.save(d); });
  $("lowGraphics").addEventListener(ev,()=>{ let d=SB.load(); d.settings.lowGraphics=$("lowGraphics").checked; SB.save(d); });
});
$("resetDataBtn").addEventListener("click",()=>{ if(confirm("Reset local saved data on this device?")){ SB.save(SB.defaults()); location.reload(); } });

// Buttons
document.addEventListener("DOMContentLoaded", ()=>{
  $("btnCpu")?.addEventListener("click", ()=> startMatch("cpu"));
  $("btnLocal")?.addEventListener("click", ()=> startMatch("local"));
  $("btnTrain")?.addEventListener("click", ()=> startMatch("train"));
  $("startTutorial")?.addEventListener("click", ()=> startMatch("tutorial"));
  $("pauseBtn")?.addEventListener("click", ()=> ST.mode = (ST.mode==="paused"?"fight":"paused"));
  $("helpBtn")?.addEventListener("click", ()=> alert(
    "Move: A/D or ←/→\nJump: W or ↑\nLight/Heavy: J/K\nBlock: L   Special: I"
  ));
});

// === Fighters ===
const P = (x,facing,color)=>({ x, y:BASE_H-100, vx:0, vy:0, facing, hp:100, maxhp:100, meter:0, h:90, color });
let p1, p2;

function startMatch(kind){
  const d = SB.load();
  p1 = P(BASE_W*0.35, +1, d.settings.color1);
  p2 = P(BASE_W*0.65, -1, d.settings.color2);
  $("p1name").textContent = d.settings.model1.toUpperCase()+" (P1)";
  $("p2name").textContent = (d.settings.model2==="random"?"CPU":d.settings.model2.toUpperCase());
  ST.kind = kind; ST.mode="fight"; ST.started=true;
  hideMenu(); updateBars();
}
function hideMenu(){ $("menu").style.display="none"; }
function showMenu(){ $("menu").style.display=""; ST.mode="menu"; ST.started=false; }

function updateBars(){
  $("hp1").style.width = Math.max(0,(p1.hp/p1.maxhp)*100)+"%";
  $("hp2").style.width = Math.max(0,(p2.hp/p2.maxhp)*100)+"%";
  $("m1").style.width = (p1.meter||0)+"%";
  $("m2").style.width = (p2.meter||0)+"%";
}

// Input
const Keys={};
addEventListener('keydown', e=> Keys[e.key.toLowerCase()]=true);
addEventListener('keyup',   e=> Keys[e.key.toLowerCase()]=false);

function inputsP1(){ return {
  left: Keys["a"]||Keys["arrowleft"],
  right: Keys["d"]||Keys["arrowright"],
  jump: Keys["w"]||Keys["arrowup"],
  block: Keys["l"],
  light: Keys["j"],
  heavy: Keys["k"],
  special: Keys["i"],
  dash: Keys["shift"]
};}
function inputsCPU(){
  const r=Math.random();
  return { left:(p2.x>p1.x && r<.35), right:(p2.x<p1.x && r<.35),
    jump:false, block:r<.02, light:r<.08, heavy:r<.03, special:false, dash:false };
}

// Step + hit
function stepFighter(f, inp){
  const spd = 2.2;
  if (inp.left)  f.x -= spd;
  if (inp.right) f.x += spd;
  f.x = Math.max(40, Math.min(BASE_W-40, f.x));
  if (inp.light && dist(p1,p2)<42) hit(f===p1?p2:p1, 6);
  if (inp.heavy && dist(p1,p2)<54) hit(f===p1?p2:p1, 10);
}
function dist(a,b){ return Math.hypot(a.x-b.x, (a.y-a.h)-(b.y-b.h)); }
function hit(target, dmg){
  target.hp = Math.max(0, target.hp - dmg);
  target.meter = Math.min(100, target.meter + 3);
  updateBars();
  if (target.hp<=0){
    const d = SB.load();
    d.stats.matches++;
    if (target===p2) d.stats.wins++;
    SB.save(d); updateStatsRow();
    setTimeout(()=> showMenu(), 1200);
  }
}

// Stage render
function drawStage(){
  const g = ctx.createLinearGradient(0,0,0,BASE_H);
  g.addColorStop(0,'#0b0f1c'); g.addColorStop(1,'#16223a');
  ctx.fillStyle=g; ctx.fillRect(0,0,BASE_W,BASE_H);
  // ground
  ctx.fillStyle='#0a0f17'; ctx.fillRect(0, BASE_H-80+1, BASE_W, 80);
  // ground line (visible)
  ctx.strokeStyle = '#3c4259';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, BASE_H-80);
  ctx.lineTo(BASE_W, BASE_H-80);
  ctx.stroke();
}

// Single, bold drawStick
function drawStick(f){
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = f.color;
  ctx.fillStyle = f.color;
  // head (filled)
  ctx.beginPath();
  ctx.arc(f.x, f.y - f.h - 12, 12, 0, Math.PI*2);
  ctx.fill();
  // spine
  ctx.beginPath();
  ctx.moveTo(f.x, f.y - f.h);
  ctx.lineTo(f.x, f.y - 32);
  // arms
  ctx.moveTo(f.x, f.y - f.h + 20);
  ctx.lineTo(f.x + f.facing*18, f.y - f.h + 10);
  ctx.moveTo(f.x, f.y - f.h + 32);
  ctx.lineTo(f.x - f.facing*14, f.y - f.h + 22);
  // legs
  ctx.moveTo(f.x, f.y - 32);
  ctx.lineTo(f.x - 12, f.y);
  ctx.moveTo(f.x, f.y - 32);
  ctx.lineTo(f.x + 12, f.y);
  ctx.stroke();
  ctx.restore();
}

function lowHpBlink(){
  const p1low = (p1.hp/p1.maxhp)<=0.2, p2low = (p2.hp/p2.maxhp)<=0.2;
  $("hp1").parentElement.className = "hp" + (p1low? " low":"");
  $("hp2").parentElement.className = "hp" + (p2low? " low":"");
}

// --- DEBUG toggle ---
const DEBUG = true; // flip to false after you verify visuals

// Main loop (ensureFighters + debug paint/markers)
function loop(){
  // bail early if not started / paused
  if (!ST.started) { requestAnimationFrame(loop); return; }
  if (ST.mode === "paused") { requestAnimationFrame(loop); return; }

  // make sure fighters exist (emergency spawn if missing)
  ensureFighters();

  // DEBUG: obvious background
  if (DEBUG){
    ctx.fillStyle = "#102a43";
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  // stage (gradient + ground + ground line)
  drawStage();

  // inputs
  const in1 = inputsP1();
  const in2 = (ST.kind === "cpu") ? inputsCPU() : inputsP1(); // mirror for local/train

  // simulate
  stepFighter(p1, in1);
  stepFighter(p2, in2);

  // DEBUG: foot markers so we can locate fighters
  if (DEBUG){
    ctx.fillStyle = "#ff3b3b"; ctx.fillRect(p1.x - 3, p1.y - 3, 6, 6); // P1
    ctx.fillStyle = "#4dd2ff"; ctx.fillRect(p2.x - 3, p2.y - 3, 6, 6); // P2
  }

  // draw
  drawStick(p1);
  drawStick(p2);

  lowHpBlink();
  requestAnimationFrame(loop);
}

// kick everything off
updateBars();
loop();
window.addEventListener("load", () => { if (!ST.started) startMatch("cpu"); });
