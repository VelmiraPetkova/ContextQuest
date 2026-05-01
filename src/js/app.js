// Context Quest — Full UX Rewrite
const $ = (s) => document.querySelector(s);
const game = $("#game");
let levels = [];
let player = null;
let state = { screen:"login", level:0, bag:[], scores:[], phase:"pick", lastResult:null, hintUsed:false };

const api = {
  get: (u) => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
  post: (u, b) => fetch(u, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(b) }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
};

const _pre=["Unit","Bot","Mech","Byte","Chip","Gear","Bolt","Wire","Node","Core","Flux","Ping","Zap","Arc","Hex","Bit","Nano","Robo","Droid","Spark"];
const _suf=["7X","42","99","13","Z3","K9","V8","3D","X1","88","00","A7","R2","Q5","E9","M3","T6","J1","P4","W2"];
const _ttl=["Sparkplug","Codebreaker","Debugger","Firewall","Compiler","Overclocker","Patchwork","Uplinker","Downloader","Bytecruncher","Stacktrace","Firmware","Kernel","Dataminer","Circuitbend","Pixelpush","Logwalker","Threadripper","Cachebuster","Defragmenter"];
function _pk(a){return a[Math.floor(Math.random()*a.length)]}
function genRobotNames(n){const s=new Set(),r=[];while(r.length<n){const nm=_pk(_pre)+"-"+_pk(_suf)+" "+_pk(_ttl);if(!s.has(nm)){s.add(nm);r.push(nm);}}return r;}

render();

function render(){
  const screens={login:renderLogin,intro:renderIntro,play:renderLevel,end:renderEnd,leaderboard:renderLeaderboard};
  (screens[state.screen]||renderLogin)();
  renderPips();
}
function renderPips(){
  const el=$("#progress");
  const totalLevels = Math.max(levels.length, OFFLINE_LEVELS.length);
  if(!el||!totalLevels){if(el)el.innerHTML="";return;}
  el.innerHTML=Array.from({length:totalLevels},(_,i)=>{let c="";if(i<state.level)c=state.scores[i]>=60?"done":"fail";else if(i===state.level&&state.screen==="play")c="active";return`<div class="prog-pip ${c}"></div>`;}).join("");
}

// ── LOGIN ──
async function renderLogin(){
  const saved=localStorage.getItem("cq_player");
  if(saved){player=JSON.parse(saved);state.screen="intro";try{levels=await api.get("/api/levels")}catch(e){levels=OFFLINE_LEVELS}if(!levels||!levels.length)levels=OFFLINE_LEVELS;render();return;}
  game.innerHTML=`<div class="screen show">
    <div class="robot-wrap" style="margin:0 auto 12px"><div class="robot walk"></div></div>
    <div class="hdr"><h1>Choose Your Designation</h1></div>
    <p>Every robot needs a designation. Pick one — this is how you'll appear on the leaderboard.</p>
    <div id="name-options" style="display:flex;flex-direction:column;gap:8px;max-width:320px;margin:0 auto 16px"></div>
    <button class="btn btn-clear" onclick="refreshNames()" style="max-width:200px;margin:0 auto 12px;display:block">🎲 Roll new names</button>
    <div style="text-align:center;margin-top:8px"><button class="btn btn-clear" onclick="showLeaderboardFromLogin()" style="max-width:200px;margin:0 auto">🏆 View Leaderboard</button></div>
  </div>`;
  loadNames();
}
function loadNames(){const names=genRobotNames(4);const el=$("#name-options");if(!el)return;el.innerHTML=names.map(n=>`<button class="btn btn-go" onclick="pickName('${n.replace(/'/g,"\\'")}')" style="margin:0">${n}</button>`).join("");}
function refreshNames(){loadNames();}
function showLeaderboardFromLogin(){state.screen="leaderboard";state._returnTo="login";render();}
function changeName(){localStorage.removeItem("cq_player");player=null;state.screen="login";render();}
async function pickName(name){let id="local-"+Math.random().toString(36).slice(2);try{const res=await api.post("/api/login",{name});id=res.playerId}catch(e){}player={playerId:id,name};localStorage.setItem("cq_player",JSON.stringify(player));try{levels=await api.get("/api/levels")}catch(e){levels=OFFLINE_LEVELS}if(!levels||!levels.length)levels=OFFLINE_LEVELS;state.screen="intro";render();}

// ── INTRO ──
function renderIntro(){
  game.innerHTML=`<div class="screen show">
    <div class="robot-wrap" style="margin:0 auto 12px"><div class="robot walk"></div></div>
    <div class="hdr"><h1>Ready, ${player?player.name.split(" ")[0]:"Robot"}?</h1></div>
    <p style="font-size:14px;color:var(--text);max-width:440px;margin:0 auto 16px;line-height:1.6">
      You're a robot with a backpack. Your backpack represents an AI's context window — the data it can see when solving a problem.<br><br>
      Each level describes a situation and gives you several data items. Pick the ones that help solve the problem, but watch the weight — your backpack has a limit!
    </p>
    <div class="rules">
      <div style="font-family:'Silkscreen',cursive;font-size:9px;color:var(--gold);letter-spacing:.15em;margin-bottom:10px">HOW TO PLAY</div>
      <div class="rule"><span class="rule-i">📖</span>Read the situation briefing to understand the problem</div>
      <div class="rule"><span class="rule-i">🔍</span>Read each item's description — is it useful or junk?</div>
      <div class="rule"><span class="rule-i">👆</span>Click items to add or remove them from your backpack</div>
      <div class="rule"><span class="rule-i">⚖️</span>Stay under the weight limit (heavy ≠ valuable!)</div>
      <div class="rule"><span class="rule-i">🤖</span>The AI only sees what's in your backpack — choose wisely</div>
      <div class="rule"><span class="rule-i">💡</span>Stuck? Hit the Hint button for a nudge</div>
    </div>
    <p style="font-size:12px;color:var(--dim);max-width:400px;margin:0 auto 16px">Level 0 is a tutorial — it walks you through the mechanics step by step.</p>
    <button class="btn btn-go" onclick="startGame()" style="max-width:220px;margin:0 auto">Start Tutorial →</button>
    <div style="display:flex;gap:8px;max-width:300px;margin:12px auto 0">
      <button class="btn btn-clear" onclick="state.screen='leaderboard';state._returnTo='intro';render()" style="flex:1">🏆 Leaderboard</button>
      <button class="btn btn-clear" onclick="changeName()" style="flex:1">🔄 Change Name</button>
    </div>
  </div>`;
}
function startGame(){state={screen:"play",level:0,bag:[],scores:[],phase:"pick",lastResult:null,hintUsed:false};render();}

// ── LEVEL ──
function renderLevel(){
  const L=levels[state.level];if(!L)return;
  const offL = getOfflineLevel(state.level);
  // Merge longer tips from offline data
  const items = L.items.map(item => {
    const offItem = offL && offL.items ? offL.items.find(oi => oi.id === item.id) : null;
    return { ...item, tip: (offItem && offItem.tip && offItem.tip.length > (item.tip||'').length) ? offItem.tip : item.tip };
  });
  const usedWt=state.bag.reduce((s,id)=>s+items.find(i=>i.id===id).wt,0);
  const pct=Math.min(usedWt/L.capacity*100,100);
  const over=usedWt>L.capacity;
  const fillColor=over?"var(--red)":pct>75?"var(--orange)":"var(--gold)";
  let robotClass="walk";
  if(state.phase==="done"&&state.lastResult){robotClass=state.lastResult.score>=60?"celebrate":state.lastResult.score<=10?"explode":"idle";}else if(over){robotClass="heavy";}
  const typeMap={};if(state.lastResult&&state.lastResult.items)state.lastResult.items.forEach(it=>typeMap[it.id]=it.type);
  const shelfItems=items.filter(i=>!state.bag.includes(i.id));
  const bagItems=items.filter(i=>state.bag.includes(i.id));
  const offL = getOfflineLevel(state.level);
  const isTutorial = L.tutorial === true || (offL && offL.tutorial === true);

  let html=`<div class="scene">
    <div class="scene-top"><div class="robot-wrap">
      <div class="bp-bar"><div class="bp-fill" style="width:${pct}%;background:${fillColor}"></div></div>
      <div class="robot ${robotClass}"></div>
      <div class="explosion ${robotClass==='explode'?'show':''}" id="particles"></div>
    </div></div>
    <div class="scene-ground"></div>
    <div class="scene-info"><div class="scene-level">${L.tag}</div><div class="scene-title">${L.title}</div></div>
  </div>`;

  // Briefing
  html+=`<div class="card" style="margin-bottom:12px">
    <div style="font-family:'Silkscreen',cursive;font-size:9px;color:var(--gold);letter-spacing:.15em;margin-bottom:8px">📋 SITUATION BRIEFING</div>
    <div style="font-size:13px;line-height:1.6;color:var(--text)">${L.briefing || (offL && offL.briefing) || L.desc}</div>
    <div style="margin-top:10px;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
      <div style="font-family:'Silkscreen',cursive;font-size:8px;color:var(--green);letter-spacing:.1em;margin-bottom:4px">🎯 YOUR MISSION</div>
      <div style="font-size:13px;font-weight:600;color:var(--green)">${L.goal}</div>
    </div>
  </div>`;

  // Backpack
  html+=`<div class="backpack ${over?"overweight":""}" id="backpack" ondragover="onDragOver(event)" ondragleave="onDragLeave(event)" ondrop="onDropBag(event)">
    <span class="bp-label">🎒 BACKPACK</span>
    <span class="bp-weight ${over?"over":""}">${usedWt} / ${L.capacity} wt</span>
    ${bagItems.length===0?'<div class="bp-empty">👆 Click items below to add them here</div>':""}
    ${bagItems.map(i=>itemHTML(i,true,typeMap,state.phase==="done",isTutorial)).join("")}
  </div>`;

  // Items
  html+=`<div class="shelf-label">📦 AVAILABLE DATA — read each description, then decide</div>
  <div class="shelf" id="shelf" ondragover="onDragOver(event)" ondragleave="onDragLeave(event)" ondrop="onDropShelf(event)">
    ${shelfItems.length===0?'<div class="bp-empty">All items packed!</div>':""}
    ${shelfItems.map(i=>itemHTML(i,false,typeMap,state.phase==="done",isTutorial)).join("")}
  </div>`;

  // Actions
  if(state.phase==="pick"){
    html+=`<div class="actions">
      <button class="btn btn-clear" onclick="state.bag=[];render()">Clear</button>
      <button class="btn btn-clear" onclick="showHint()" style="color:var(--gold);border-color:var(--gold)">💡 Hint</button>
      <button class="btn btn-go" ${!state.bag.length||over?"disabled":""} onclick="doSubmit()">🤖 Ask the AI →</button>
    </div>`;
    html+=`<div id="hint-box" style="display:none;margin-bottom:14px"></div>`;
  }
  html+=`<div class="result ${state.phase==="done"?"show":""}" id="result"></div>`;
  html+=`<div class="verdict ${state.phase==="done"?"show":""}" id="verdict"></div>`;
  game.innerHTML=html;
  if(state.phase==="done"&&state.lastResult){fillResponse(state.lastResult);fillVerdict(state.lastResult);}
}

function itemHTML(item,inBag,typeMap,locked,isTutorial){
  let cls=inBag?"in-bag":"";if(locked&&typeMap[item.id])cls=typeMap[item.id];if(locked)cls+=" locked";
  let tutTag="";
  if(isTutorial&&!locked){
    if(item.type==="signal")tutTag=`<div style="font-family:'Silkscreen',cursive;font-size:8px;color:var(--green);margin-top:4px">✦ THIS LOOKS RELEVANT</div>`;
    else if(item.type==="noise")tutTag=`<div style="font-family:'Silkscreen',cursive;font-size:8px;color:var(--red);margin-top:4px">✕ PROBABLY NOT USEFUL</div>`;
  }
  return`<div class="item ${cls}" draggable="${!locked}" ondragstart="onDragStart(event,'${item.id}')" onclick="toggleItem('${item.id}')" style="flex-direction:column;align-items:flex-start;width:100%">
    <div style="display:flex;align-items:center;gap:6px;width:100%">
      <span class="emoji">${item.emoji}</span><span style="flex:1;font-weight:700">${item.name}</span><span class="wt">${item.wt} wt</span>
    </div>
    <div style="font-size:11px;color:var(--dim);margin-top:4px;line-height:1.4;padding-left:28px">${item.tip}</div>
    ${tutTag}
  </div>`;
}

function getOfflineLevel(idx) {
  const L = levels[idx];
  if (!L) return OFFLINE_LEVELS[idx];
  // Match by tag name, not index (server levels may not have tutorial)
  const match = OFFLINE_LEVELS.find(ol => ol.tag === L.tag);
  if (match) return match;
  // If no tag match, try offset (server has no tutorial, so offset by 1)
  const hasServerTutorial = levels.some(l => l.tag === "TUTORIAL");
  if (!hasServerTutorial && OFFLINE_LEVELS[0] && OFFLINE_LEVELS[0].tutorial) {
    return OFFLINE_LEVELS[idx + 1];
  }
  return OFFLINE_LEVELS[idx];
}

function showHint(){
  const L=levels[state.level];
  const offL = getOfflineLevel(state.level);
  const hint = (L && L.hint) || (offL && offL.hint);
  if(!hint)return;
  state.hintUsed=true;
  const box=$("#hint-box");if(!box)return;
  box.style.display="block";
  box.innerHTML=`<div class="card" style="border-color:var(--gold)">
    <div style="font-family:'Silkscreen',cursive;font-size:9px;color:var(--gold);letter-spacing:.1em;margin-bottom:6px">💡 HINT</div>
    <div style="font-size:12px;color:var(--text);line-height:1.5">${hint}</div>
  </div>`;
  box.scrollIntoView({behavior:"smooth",block:"center"});
}

// ── Drag & Drop ──
let dragId=null;
function onDragStart(e,id){if(state.phase!=="pick")return;dragId=id;e.dataTransfer.effectAllowed="move";}
function onDragOver(e){e.preventDefault();e.currentTarget.classList.add("over");}
function onDragLeave(e){e.currentTarget.classList.remove("over");}
function onDropBag(e){e.preventDefault();e.currentTarget.classList.remove("over");if(dragId&&!state.bag.includes(dragId)){state.bag.push(dragId);render();}dragId=null;}
function onDropShelf(e){e.preventDefault();e.currentTarget.classList.remove("over");if(dragId&&state.bag.includes(dragId)){state.bag=state.bag.filter(x=>x!==dragId);render();}dragId=null;}
function toggleItem(id){if(state.phase!=="pick")return;state.bag.includes(id)?state.bag=state.bag.filter(x=>x!==id):state.bag.push(id);render();}

// ── Submit ──
async function doSubmit(){
  const L=levels[state.level];const wt=state.bag.reduce((s,id)=>s+L.items.find(i=>i.id===id).wt,0);
  if(wt>L.capacity||!state.bag.length)return;
  state.phase="responded";render();
  $("#result").innerHTML=`<div class="r-card"><div class="r-head"><span class="r-avatar">🤖</span><span class="r-who">AI COMPANION</span></div><div style="display:flex;gap:5px;padding:8px 0"><span style="width:6px;height:6px;border-radius:50%;background:var(--dim);animation:blink 1.2s infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:var(--dim);animation:blink 1.2s infinite .2s"></span><span style="width:6px;height:6px;border-radius:50%;background:var(--dim);animation:blink 1.2s infinite .4s"></span></div></div>`;
  $("#result").classList.add("show");
  let result;try{result=await api.post("/api/submit",{level:state.level,bag:state.bag})}catch(e){result=localEvaluate(state.level,state.bag)}
  state.lastResult=result;state.scores.push(result.score);state.phase="done";render();
  if(result.score<=10)spawnParticles();
  setTimeout(()=>{const v=$("#verdict");if(v)v.scrollIntoView({behavior:"smooth",block:"center"})},200);
}

function fillResponse(r){
  const cls=r.score>=70?"good":r.score>=30?"mid":"bad";
  $("#result").innerHTML=`<div class="r-card ${cls}"><div class="r-head"><span class="r-avatar">🤖</span><span class="r-who">AI COMPANION</span></div><div class="r-text">${r.responseText}</div></div>`;
}

function fillVerdict(r){
  const L=levels[state.level];const sc=r.score;
  let icon,title;
  if(sc>=90){icon="🏆";title="Perfect Pack!";}else if(sc>=60){icon="✨";title="Good Choices";}else if(sc>=25){icon="⚠️";title="Incomplete";}else{icon="💥";title="BOOM!";}
  const typeMap = {}; if (r.items) r.items.forEach(it => typeMap[it.id] = it.type);
  const offL2 = getOfflineLevel(state.level);
  const verdictItems = L.items.map(item => {
    const offItem = offL2 && offL2.items ? offL2.items.find(oi => oi.id === item.id) : null;
    return { ...item, type: typeMap[item.id] || (offItem && offItem.type) || item.type };
  });
  const sig = verdictItems.filter(i => state.bag.includes(i.id) && typeMap[i.id] === "signal").length;
  const totSig = verdictItems.filter(i => typeMap[i.id] === "signal").length;
  const noi = verdictItems.filter(i => state.bag.includes(i.id) && typeMap[i.id] === "noise").length;
  const wt = state.bag.reduce((s, id) => s + L.items.find(i => i.id === id).wt, 0);
  const isLast=state.level>=levels.length-1;
  $("#verdict").innerHTML=`<div class="v-card">
    <div class="v-icon">${icon}</div><div class="v-title">${title}</div>
    <div class="v-desc">${sc>=70?"Your backpack had the right stuff!":sc>=25?"Close, but missing critical items.":"Noise overloaded the robot. KABOOM! 💥"}</div>
    <div class="v-stats">
      <div class="v-stat"><div class="v-stat-v" style="color:var(--gold)">${sc}</div><div class="v-stat-l">Score</div></div>
      <div class="v-stat"><div class="v-stat-v" style="color:var(--green)">${sig}/${totSig}</div><div class="v-stat-l">Signal</div></div>
      <div class="v-stat"><div class="v-stat-v" style="color:var(--red)">${noi}</div><div class="v-stat-l">Noise</div></div>
      <div class="v-stat"><div class="v-stat-v">${wt}</div><div class="v-stat-l">Weight</div></div>
    </div>
    <div class="v-lesson">${r.lesson}</div>
    <button class="btn ${isLast?"btn-go":"btn-next"}" onclick="${isLast?"endGame()":"nextLevel()"}">${isLast?"See Final Score →":"Next Level →"}</button>
  </div>`;
}

function nextLevel(){state.level++;state.bag=[];state.phase="pick";state.lastResult=null;state.hintUsed=false;render();window.scrollTo({top:0,behavior:"smooth"});}

// ── END ──
async function endGame(){
  state.screen="end";
  const total=state.scores.reduce((a,b)=>a+b,0);const avg=Math.round(total/levels.length);const perf=state.scores.filter(s=>s>=90).length;
  let rankTitle;if(avg>=90)rankTitle="Context Architect";else if(avg>=65)rankTitle="Signal Hunter";else if(avg>=35)rankTitle="Noise Survivor";else rankTitle="Hallucination Machine";
  if(player){await api.post("/api/save",{playerId:player.playerId,score:total,perfect:perf,rankTitle}).catch(()=>{});}
  render();window.scrollTo({top:0,behavior:"smooth"});
}

function renderEnd(){
  const total=state.scores.reduce((a,b)=>a+b,0);const avg=Math.round(total/levels.length);const perf=state.scores.filter(s=>s>=90).length;
  let rank,rc;
  if(avg>=90){rank="🏆 Context Architect";rc="var(--gold)";}else if(avg>=65){rank="✨ Signal Hunter";rc="var(--green)";}else if(avg>=35){rank="⚠️ Noise Survivor";rc="var(--orange)";}else{rank="💀 Hallucination Machine";rc="var(--red)";}
  game.innerHTML=`<div class="screen show">
    <div class="robot-wrap" style="margin:0 auto 8px"><div class="robot ${avg>=60?'celebrate':'explode'}"></div></div>
    <div class="hdr"><h1>Quest Complete</h1></div>
    <p style="font-size:15px;color:${rc};font-weight:700">${rank}</p>
    <p style="font-size:13px;color:var(--dim)">${player?player.name:"Robot"} scored ${total} / ${levels.length*100}</p>
    <div class="final-grid">
      <div class="f-cell"><div class="f-val" style="color:var(--gold)">${avg}</div><div class="f-label">AVG SCORE</div></div>
      <div class="f-cell"><div class="f-val" style="color:var(--green)">${perf}</div><div class="f-label">PERFECT</div></div>
      <div class="f-cell"><div class="f-val">${levels.length}</div><div class="f-label">LEVELS</div></div>
    </div>
    <div class="rules" style="margin-top:20px">
      <div style="font-family:'Silkscreen',cursive;font-size:9px;color:var(--purple);letter-spacing:.2em;margin-bottom:10px">WHAT YOU LEARNED</div>
      <div class="rule"><span class="rule-i">1.</span>Heavy ≠ valuable. Small, specific data beats encyclopedias.</div>
      <div class="rule"><span class="rule-i">2.</span>Noise doesn't just waste space — it actively misleads.</div>
      <div class="rule"><span class="rule-i">3.</span>First-party evidence > third-party opinions.</div>
      <div class="rule"><span class="rule-i">4.</span>A good AI says "I don't know" when data is missing.</div>
      <div class="rule"><span class="rule-i">5.</span>This is context engineering. Not prompt tricks — data curation.</div>
    </div>
    <div style="display:flex;gap:8px;max-width:400px;margin:16px auto 0">
      <button class="btn btn-go" onclick="startGame()">Play Again</button>
      <button class="btn btn-next" onclick="state.screen='leaderboard';state._returnTo='end';render()">🏆 Leaderboard</button>
    </div>
    <div class="credit">A context engineering training tool</div>
  </div>`;
  renderPips();
}

// ── LEADERBOARD ──
async function renderLeaderboard(){
  game.innerHTML=`<div class="screen show"><div style="font-size:48px;margin-bottom:4px">🏆</div><div class="hdr"><h1>Leaderboard</h1></div><div id="lb-content"><div class="bp-empty">Loading...</div></div><div id="lb-stats" style="margin-top:16px"></div><button class="btn btn-clear" onclick="state.screen=state._returnTo||'intro';render()" style="max-width:200px;margin:16px auto 0;display:block">← Back</button></div>`;
  let entries=[],stats={totalPlayers:0,totalGames:0,avgScore:0,topScore:0};
  try{[entries,stats]=await Promise.all([api.get("/api/leaderboard"),api.get("/api/stats")])}catch(e){const lbEl=$("#lb-content");if(lbEl)lbEl.innerHTML=`<div class="bp-empty">Leaderboard needs Turso database.<br>Play the game first — scores are tracked locally!</div>`;return;}
  const lbEl=$("#lb-content");
  if(!entries.length){lbEl.innerHTML=`<div class="bp-empty">No quests completed yet. Be the first!</div>`}else{
    lbEl.innerHTML=`<div style="max-width:440px;margin:0 auto">${entries.map(e=>{const medals=["👑","🥈","🥉"];const medal=e.rank<=3?medals[e.rank-1]:`<span style="color:var(--dim)">#${e.rank}</span>`;const isMe=player&&e.name===player.name;return`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${isMe?"var(--gold-g)":"var(--panel)"};border:1px solid ${isMe?"var(--gold)":"var(--border)"};border-radius:10px;margin-bottom:6px"><span style="font-size:18px;width:28px;text-align:center">${medal}</span><span style="flex:1;font-weight:600;font-size:13px;${isMe?"color:var(--gold)":""}">${e.name}</span><span style="font-family:'Silkscreen',cursive;font-size:12px;color:var(--gold)">${e.score}</span><span style="font-size:10px;color:var(--dim);min-width:50px;text-align:right">${e.perfect}⭐</span></div>`}).join("")}</div>`}
  const stEl=$("#lb-stats");stEl.innerHTML=`<div style="display:flex;justify-content:center;gap:20px;font-size:11px;color:var(--dim)"><span>👥 ${stats.totalPlayers} players</span><span>🎮 ${stats.totalGames} games</span><span>📊 avg ${stats.avgScore} pts</span></div>`;
}

function spawnParticles(){const el=$("#particles");if(!el)return;const colors=["#ff5c5c","#ffd700","#ff8c00","#fff","#ff4444"];el.innerHTML="";for(let i=0;i<16;i++){const a=Math.random()*360,d=30+Math.random()*40;const x=Math.cos(a*Math.PI/180)*d,y=Math.sin(a*Math.PI/180)*d;const c=colors[Math.floor(Math.random()*colors.length)];const s=3+Math.random()*5;const p=document.createElement("div");p.style.cssText=`position:absolute;width:${s}px;height:${s}px;border-radius:50%;background:${c}`;el.appendChild(p);p.animate([{transform:"translate(0,0) scale(1)",opacity:1},{transform:`translate(${x}px,${y}px) scale(0.3)`,opacity:0}],{duration:600+Math.random()*400,easing:"ease-out",fill:"forwards"});}}

// ═══════════════════════════════════════════════════
// OFFLINE LEVELS — with briefings, hints, tutorial
// ═══════════════════════════════════════════════════
const OFFLINE_LEVELS = [
  {tag:"TUTORIAL",title:"Robot Boot Camp",tutorial:true,
    briefing:"Your robot companion needs to connect to WiFi, but it doesn't know the password. You have 3 data items. <strong>Some contain the info needed, some don't.</strong><br><br>Read each item's description carefully. Pick only the ones that help solve the problem. Items marked <span style='color:var(--green)'>✦ RELEVANT</span> are signal. Items marked <span style='color:var(--red)'>✕ NOT USEFUL</span> are noise.<br><br><em>This is a tutorial — the annotations will disappear in real levels!</em>",
    goal:"Help the robot find the WiFi password",heroEmoji:"🤖",capacity:100,
    hint:"The WiFi password is what you need. Which items contain it or help find it?",
    items:[
      {id:"a",emoji:"📋",name:"WiFi Config File",wt:30,type:"signal",tip:"Contains SSID: 'RobotNet' and password: 'b33p-b00p-2024'. This is exactly what you need."},
      {id:"b",emoji:"🍕",name:"Pizza Menu",wt:40,type:"noise",tip:"Today's special: Margherita. Delicious but won't help connect to WiFi."},
      {id:"c",emoji:"📡",name:"Router Location",wt:25,type:"signal",tip:"Router is in Room 3B, signal strength is best within 10 meters. Helps confirm the right network."},
    ],_r:{
      perfect:{keys:["a","c"],text:'<span class="ok">Connected!</span> Password from config: <span class="ok">b33p-b00p-2024</span>. Router in Room 3B — right network confirmed.\n\n<span class="ok">WiFi connected. Signal: excellent.</span>',score:100},
      good:{keys:["a"],text:'<span class="ok">Password found: b33p-b00p-2024.</span> Connected!\n\n<span class="maybe">Didn\'t verify router location. Could be a spoofed network.</span>',score:75},
      partial:{keys:["c"],text:'Router is in Room 3B, but <span class="maybe">without the password, I can\'t connect.</span>',score:25},
      hall:{text:'<span class="hall">Pizza menu says "Margherita" — maybe that\'s the password?</span>\n\n<span class="hall">Trying "margherita2024"... failed.</span>',score:5},
      empty:{text:'<span class="hall">Guessing: "password123"... nope. "admin"... nope.</span>',score:0},
    },lesson:'<strong>Tutorial complete!</strong> You just did context engineering. The WiFi config (30 wt) had the answer. The pizza menu (40 wt) was heavier AND useless. In real AI systems, choosing the right data for the context window works exactly like this.'},

  {tag:"LEVEL 1 — THE FIREWALL",title:"The Encrypted Gateway",
    briefing:'Your robot reaches a locked firewall. The terminal shows: <code style="background:var(--surface);padding:2px 6px;border-radius:4px">ACCESS DENIED — AES-256 encrypted. Provide valid credentials.</code><br><br>You have 6 data items. Some contain encryption keys and protocol info. Others are random tech junk. <strong>Find items that relate to the encryption — the key, the protocol, and how to use them together.</strong>',
    goal:"Bypass the encrypted firewall",heroEmoji:"🤖",capacity:150,
    hint:"You need: the key itself, the protocol it uses, and the handshake sequence. Ignore items that add power or entertainment — this is a data problem, not a computing problem.",
    items:[
      {id:"a",emoji:"🔑",name:"Encryption Key",wt:40,type:"signal",tip:"An AES-256 key fragment matching the firewall's cipher suite. Part of what you need to decrypt."},
      {id:"b",emoji:"🎮",name:"Gaming Module",wt:50,type:"noise",tip:"Plays retro arcade games. Great for downtime, but encryption doesn't care about your high score."},
      {id:"c",emoji:"📡",name:"Packet Capture",wt:35,type:"signal",tip:"A captured network handshake showing the exact encryption protocol the firewall uses."},
      {id:"d",emoji:"🔋",name:"Extra Battery",wt:60,type:"noise",tip:"Extends battery by 4 hours. More power won't crack encryption."},
      {id:"e",emoji:"📋",name:"Protocol Docs",wt:40,type:"signal",tip:"Handshake sequence documentation: challenge → response → verify. Without this, you might send the key wrong."},
      {id:"f",emoji:"🖨️",name:"Printer Driver",wt:55,type:"noise",tip:"Driver v3.2.1 for a LaserJet 4000. No printer here. Completely irrelevant."},
    ],_r:{
      perfect:{keys:["a","c","e"],text:'<span class="ok">Firewall bypassed!</span> Matched key to handshake, followed challenge→response→verify.\n\n<span class="ok">Access granted. Gateway opens.</span>',score:100},
      good:{keys:["a","c"],text:'<span class="ok">Key matches the captured protocol.</span>\n\n<span class="maybe">Not sure about handshake sequence. Might trigger alarm.</span>',score:65},
      partial:{keys:["c"],text:'I can see encrypted packets but <span class="maybe">without the key, can only observe.</span>',score:30},
      hall:{text:'<span class="hall">Extra battery + gaming module = brute force!</span>\n\n<span class="hall">Estimated: 4.7 billion years.</span>',score:5},
      empty:{text:'<span class="hall">Have you tried turning it off and on again?</span>',score:0},
    },lesson:'<strong>Lesson:</strong> Battery (60 wt) + gaming module (50 wt) = useless for decryption. Protocol docs (40 wt) mattered more than extra power. Context engineering = right data for the right problem.'},

  {tag:"LEVEL 2 — THE DATA STREAM",title:"The Corrupted Pipeline",
    briefing:'Data packets arriving corrupted. Monitoring shows: <code style="background:var(--surface);padding:2px 6px;border-radius:4px">ERROR RATE: 73% — PAYLOAD INTEGRITY FAILED</code><br><br>Something upstream is injecting bad data. You need: <strong>what</strong> the corruption is, <strong>where</strong> it comes from, and <strong>how</strong> to fix it.',
    goal:"Find the corruption source and fix the pipeline",heroEmoji:"🤖",capacity:180,
    hint:"You need: a corrupted sample (identify the attack), an error reference (decode the error), and a network map (find the source). History docs and cables won't help.",
    items:[
      {id:"a",emoji:"💾",name:"Corrupted Packet",wt:30,type:"signal",tip:"Captured malformed packet. Headers show SQL injection pattern — someone injecting malicious payloads upstream."},
      {id:"b",emoji:"📊",name:"Error Code Table",wt:45,type:"signal",tip:"Error 0x7F = unauthorized write from external source. The corruption is from outside your system."},
      {id:"c",emoji:"🗺️",name:"Network Topology",wt:50,type:"signal",tip:"Map of all nodes. Shows a rogue API gateway at node 7.4.2 that shouldn't exist."},
      {id:"d",emoji:"📸",name:"Server Selfie",wt:40,type:"partial",tip:"Screenshot of server rack. LED on node 7 is amber. Confirms something wrong but doesn't explain what."},
      {id:"e",emoji:"📚",name:"Architecture History",wt:80,type:"noise",tip:"200-page doc about why we migrated from monolith in 2019. Fascinating. Zero diagnostic value."},
      {id:"f",emoji:"🔌",name:"USB Cable",wt:35,type:"noise",tip:"USB Type-C cable. The pipeline is virtual software, not hardware. Connects to nothing useful."},
    ],_r:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">Source identified.</span> SQL injection + 0x7F = <span class="ok">rogue gateway at node 7.4.2</span>.\n\n<span class="ok">Fix: isolate node, revoke API key, flush pipeline.</span>',score:100},
      good:{keys:["a","b"],text:'<span class="ok">SQL injection + unauthorized write.</span> Malicious injection.\n\n<span class="maybe">From where? Need network topology.</span>',score:65},
      partial:{keys:["a","d"],text:'Corrupted packets. Amber LED on node 7.\n\n<span class="maybe">Can\'t confirm without error codes or network map.</span>',score:35},
      hall:{text:'<span class="hall">Architecture doc says pipeline was fine in 2019. Revert to monolith?</span>',score:5},
      empty:{text:'<span class="hall">Clear the cache?</span>',score:0},
    },lesson:'<strong>Lesson:</strong> Architecture history (80 wt!) = almost half your budget, zero diagnostic value. Packet (30) + errors (45) + topology (50) = 125 wt. Heavy docs ≠ useful data.'},

  {tag:"LEVEL 3 — THE BREACH",title:"The Stolen API Keys",
    briefing:'⚠️ <strong>SECURITY ALERT</strong> — Production API keys exfiltrated last night between 2-3 AM. Keys grant full access to customer data.<br><br>Identify <strong>who</strong> did it, <strong>how</strong>, and <strong>why</strong> (motive). 7 data items available — some are evidence, some are noise from the same time period.',
    goal:"Identify who stole the API keys and prove it",heroEmoji:"🤖",capacity:200,
    hint:"Build an evidence chain: access logs = WHO, git history = HOW, vault audit = METHOD, financial records = MOTIVE. Coffee and music aren't evidence.",
    items:[
      {id:"a",emoji:"📋",name:"Access Logs",wt:35,type:"signal",tip:"Only dev-bot-9 accessed the secret vault between 2-3 AM. No other bot active in that system."},
      {id:"b",emoji:"🔍",name:"Git Blame",wt:30,type:"signal",tip:"dev-bot-9 committed a suspicious base64 string to a test file at 2:47 AM. It decodes to an API key."},
      {id:"c",emoji:"🔐",name:"Vault Audit Trail",wt:40,type:"signal",tip:"Secret read via automated API call, not console. Scripted — deliberate, automated exfiltration."},
      {id:"d",emoji:"📊",name:"Team Roster",wt:50,type:"partial",tip:"12 bots have vault access. 4 were running jobs that night. Narrows suspects but doesn't identify the thief."},
      {id:"e",emoji:"☕",name:"Coffee Machine Logs",wt:45,type:"noise",tip:"7 espressos between midnight and 3 AM. Robots don't drink coffee — human night shift data."},
      {id:"f",emoji:"🎵",name:"Office Playlist",wt:40,type:"noise",tip:"Lo-fi playlist streaming 1-4 AM. Vibes were immaculate. Not evidence of anything."},
      {id:"g",emoji:"💰",name:"Crypto Wallet Trace",wt:40,type:"signal",tip:"dev-bot-9 transferred 0.5 BTC to external wallet at 3:12 AM — right after exfiltration. Payment."},
    ],_r:{
      perfect:{keys:["a","b","c","g"],text:'<span class="ok">dev-bot-9 stole the keys.</span>\n\n• <span class="ok">Only vault access at 2-3AM</span>\n• <span class="ok">Encoded keys in git</span>\n• <span class="ok">Automated exfiltration</span>\n• <span class="ok">0.5 BTC = sold them</span>',score:100},
      good:{keys:["a","b","c"],text:'Strong case: <span class="ok">dev-bot-9</span>.\n\n<span class="maybe">Motive? Need financial trail.</span>',score:70},
      partial:{keys:["a","d"],text:'dev-bot-9 accessed vault. 4 bots active.\n\n<span class="maybe">Circumstantial. Need forensics.</span>',score:35},
      hall:{text:'<span class="hall">7 espressos = all-nighter! Cross-reference playlist!</span>',score:5},
      empty:{text:'<span class="hall">It\'s always the intern.</span>',score:0},
    },lesson:'<strong>Lesson:</strong> Coffee + playlist = 85 wt of noise from the same time period. Crypto trace (40 wt) proved the motive. In incident response, follow the money.'},

  {tag:"LEVEL 4 — THE CLUSTER",title:"The CrashLooping Pod",
    briefing:'🚨 <strong>PAGERDUTY</strong> — 3 AM. order-service in CrashLoopBackOff. Users getting 503s.<br><br><code style="background:var(--surface);padding:2px 6px;border-radius:4px">order-service-84b9b6956-r8gpj: CrashLoopBackOff (3 restarts)</code><br><br>6 data sources. You need: <strong>what\'s failing</strong>, <strong>why</strong>, and <strong>what changed</strong>.',
    goal:"Find root cause and provide the exact fix",heroEmoji:"🤖",capacity:200,
    hint:"Three questions: WHAT (pod logs = error), WHY (deployment YAML = misconfiguration), WHAT CHANGED (changelog = when it broke). Dashboards and runbooks give info you already have.",
    items:[
      {id:"a",emoji:"📋",name:"Pod Logs",wt:35,type:"signal",tip:"'ERROR: failed to read /app/config/db-credentials.json: no such file or directory' — repeated on every restart."},
      {id:"b",emoji:"📄",name:"Deployment YAML",wt:45,type:"signal",tip:"volumeMount: /etc/secrets, but app reads from /app/config. Secret mounted in wrong place."},
      {id:"c",emoji:"📝",name:"Deploy Changelog",wt:50,type:"signal",tip:"v2.4.1 (11 PM): 'Changed config path from /etc/secrets to /app/config.' YAML wasn't updated."},
      {id:"d",emoji:"📈",name:"Grafana Dashboard",wt:60,type:"noise",tip:"CPU 12%. Memory 340/512MB. Network nominal. All resources normal — not a resource problem."},
      {id:"e",emoji:"📖",name:"Runbook (generic)",wt:55,type:"noise",tip:"Step 1: Check pod. Step 2: Check logs. You already did that. 55 wt for nothing new."},
      {id:"f",emoji:"🧰",name:"kubectl Events",wt:40,type:"partial",tip:"Pulled image OK. Started container. Warning: Liveness probe failed. Confirms crash, not why."},
    ],_r:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">Root cause: mount path mismatch after v2.4.1.</span>\n\nApp reads /app/config, secret at /etc/secrets.\n\n<span class="ok">Fix: kubectl patch deployment — update volumeMount to /app/config</span>',score:100},
      good:{keys:["a","b"],text:'<span class="ok">Mount path mismatch.</span> App wants /app/config, secret at /etc/secrets.\n\n<span class="maybe">What triggered this? Recent deploy?</span>',score:65},
      partial:{keys:["a","f"],text:'Can\'t read config. Liveness failing.\n\n<span class="maybe">WHAT fails — yes. WHY — need deployment spec.</span>',score:35},
      hall:{text:'<span class="hall">Memory 340/512MB — increase to 2GB! Also try restarting.</span>',score:5},
      empty:{text:'<span class="hall">kubectl delete pod. Usually works.</span>',score:0},
    },lesson:'<strong>Lesson:</strong> Grafana (60) + runbook (55) = 115 wt noise. Resources were fine — problem was config. Changelog (50 wt) completed the chain. Logs + spec + changelog > dashboards + runbooks.'},

  {tag:"LEVEL 5 — THE MAINFRAME",title:"The Final Authentication",
    briefing:'The mainframe screen flashes:<br><br><code style="background:var(--surface);padding:6px 12px;border-radius:4px;display:block;margin:8px 0;color:var(--red)">⚠ ENTER ROOT PASSWORD<br>WARNING: 1 attempt remaining. Wrong password = FULL SYSTEM WIPE.</code><br><br>You must <strong>deduce</strong> the password from available data. 7 items, but most are red herrings.',
    goal:"Deduce the root password (one chance only)",heroEmoji:"🤖",capacity:180,
    hint:"Logic puzzle, not brute-force. Need: PASSWORD POLICY (how generated), SOURCE DATA (what value), ENCODING METHOD (how transformed). Weapons and thick manuals are distractions.",
    items:[
      {id:"a",emoji:"🧩",name:"Password Policy",wt:25,type:"signal",tip:"Internal policy: 'All root passwords are generated from the server's first boot timestamp.'"},
      {id:"b",emoji:"⏱️",name:"Boot Log",wt:30,type:"signal",tip:"First boot: 2024-03-14T15:09:26Z. That's Pi Day (3/14), at 15:09:26."},
      {id:"c",emoji:"📖",name:"Encoding Manual",wt:40,type:"signal",tip:"'Timestamps → Unix epoch → hexadecimal. First 8 chars of hex string = password.'"},
      {id:"d",emoji:"⚡",name:"Overclocked CPU",wt:65,type:"noise",tip:"Tries billions of passwords/second. But ONE wrong guess = full wipe. Brute force is suicide."},
      {id:"e",emoji:"🛡️",name:"Firewall Bypass",wt:55,type:"noise",tip:"Bypass tools for the firewall. But you're already past it — the firewall is behind you."},
      {id:"f",emoji:"📚",name:"Sysadmin Handbook",wt:90,type:"noise",tip:"800-page manual covering every OS. Might have a clue somewhere. At 90 wt = almost entire budget. Not worth it."},
      {id:"g",emoji:"💬",name:"Slack Message",wt:20,type:"partial",tip:"Retired admin: 'The password has something to do with pi and time... that's all I remember.'"},
    ],_r:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">Password cracked: 65e0a3b2</span>\n\n• <span class="ok">Generated from boot timestamp</span>\n• <span class="ok">Boot: 2024-03-14T15:09:26Z (Pi Day!)</span>\n• <span class="ok">Timestamp → epoch → hex → first 8 chars</span>\n\n<span class="ok">Mainframe unlocked.</span>',score:100},
      good:{keys:["a","b"],text:'From boot timestamp: <span class="ok">Pi Day 2024</span>.\n\n<span class="maybe">How encoded? Hex? Base64? One wrong guess wipes everything.</span>',score:70},
      partial:{keys:["a","g"],text:'From timestamp. Slack says "about pi."\n\n<span class="maybe">"pi314"? "piday2024"? Guessing without boot log.</span>',score:40},
      hall:{text:'<span class="hall">Overclocked CPU = brute-force in 3 hours!</span>\n\n<span class="hall">Starting with "password1"... wait, one wrong attempt wipes everything? Oops.</span>',score:5},
      empty:{text:'<span class="hall">Try "root"? One attempt remaining... maybe not.</span>',score:0},
    },lesson:'<strong>Lesson:</strong> CPU (65) + Firewall (55) + Handbook (90) = 210 wt. Over budget AND useless — this was a logic puzzle. Policy (25) + Boot (30) + Encoding (40) = 95 wt, perfect answer. The best context is small, specific, and directly relevant.'},
];

// ── Client-side scoring ──
function localEvaluate(levelIdx, bag) {
  const level = OFFLINE_LEVELS[levelIdx];
  if (!level) return { responseText: "Invalid level.", score: 0, quality: "empty", items: [], lesson: "" };
  const totalWt = bag.reduce((s, id) => { const it = level.items.find(i => i.id === id); return s + (it ? it.wt : 0); }, 0);
  if (totalWt > level.capacity) return { responseText: "Backpack too heavy! 💥", score: 0, quality: "overweight", items: level.items.map(i => ({id:i.id,type:i.type})), lesson: "" };
  const r = level._r, bagSet = new Set(bag);
  let resp;
  if (bag.length === 0) resp = {...r.empty, quality:"empty"};
  else if (r.perfect.keys.length === bag.length && r.perfect.keys.every(k => bagSet.has(k))) resp = {...r.perfect, quality:"perfect"};
  else if (r.good.keys.every(k => bagSet.has(k)) && r.good.keys.length > 0) resp = {...r.good, quality:"good"};
  else { let sig=0,noi=0; for(const id of bag){const it=level.items.find(i=>i.id===id);if(it?.type==="signal")sig++;if(it?.type==="noise")noi++;} if(noi>=sig)resp={...r.hall,quality:"hallucination"};else if(r.partial.keys&&r.partial.keys.some(k=>bagSet.has(k)))resp={...r.partial,quality:"partial"};else resp={...r.hall,quality:"hallucination"}; }
  return { responseText: resp.text, score: resp.score, quality: resp.quality, items: level.items.map(i => ({id:i.id,type:i.type})), lesson: level.lesson };
}
