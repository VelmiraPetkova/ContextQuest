// Context Quest — v2 UX rewrite
// Zero-click start, guided tutorial, contextual hints
const $=s=>document.querySelector(s);
const game=$("#game");
let levels=[];
let player=null;
let state={screen:"login",level:0,bag:[],scores:[],phase:"pick",lastResult:null,hintUsed:false,tutStep:0};

const api={
  get:u=>fetch(u).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}),
  post:(u,b)=>fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}),
};

const _pre=["Unit","Bot","Mech","Byte","Chip","Gear","Bolt","Wire","Node","Core","Flux","Ping","Zap","Arc","Hex","Bit","Nano","Robo","Droid","Spark"];
const _suf=["7X","42","99","13","Z3","K9","V8","3D","X1","88","00","A7","R2","Q5","E9","M3","T6","J1","P4","W2"];
const _ttl=["Sparkplug","Codebreaker","Debugger","Firewall","Compiler","Overclocker","Patchwork","Uplinker","Downloader","Bytecruncher","Stacktrace","Firmware","Kernel","Dataminer","Circuitbend","Pixelpush","Logwalker","Threadripper","Cachebuster","Defragmenter"];
function _pk(a){return a[Math.floor(Math.random()*a.length)]}
function genRobotNames(n){const s=new Set(),r=[];while(r.length<n){const nm=_pk(_pre)+"-"+_pk(_suf)+" "+_pk(_ttl);if(!s.has(nm)){s.add(nm);r.push(nm);}}return r;}

// ── Render ──
function render(){
  const screens={login:renderLogin,intro:renderIntro,play:renderLevel,end:renderEnd,leaderboard:renderLeaderboard,howto:renderHowTo};
  (screens[state.screen]||renderLogin)();
  renderPips();
}
function renderPips(){
  const el=$("#progress");
  const total=Math.max(levels.length,OFFLINE_LEVELS.length);
  if(!el||!total){if(el)el.innerHTML="";return;}
  el.innerHTML=Array.from({length:total},(_,i)=>{let c="";if(i<state.level)c=state.scores[i]>=60?"done":"fail";else if(i===state.level&&state.screen==="play")c="active";return`<div class="prog-pip ${c}"></div>`}).join("");
}

// ── Login ──
async function renderLogin(){
  const saved=localStorage.getItem("cq_player");
  if(saved){player=JSON.parse(saved);state.screen="intro";try{levels=await api.get("/api/levels")}catch(e){levels=OFFLINE_LEVELS}if(!levels||!levels.length)levels=OFFLINE_LEVELS;render();return;}
  game.innerHTML=`<div class="screen show">
    <div class="robot-wrap" style="margin:0 auto 12px"><div class="robot walk"></div></div>
    <div class="hdr"><h1>Choose Your Designation</h1></div>
    <p>Pick a robot name for the leaderboard.</p>
    <div id="name-options" style="display:flex;flex-direction:column;gap:8px;max-width:320px;margin:0 auto 16px"></div>
    <button class="btn btn-clear" onclick="refreshNames()" style="max-width:200px;margin:0 auto 12px;display:block">🎲 Roll new names</button>
    <div style="text-align:center;margin-top:8px"><button class="btn btn-clear" onclick="showLeaderboardFromLogin()" style="max-width:200px;margin:0 auto">🏆 Leaderboard</button></div>
  </div>`;
  loadNames();
}
function loadNames(){const names=genRobotNames(4);const el=$("#name-options");if(!el)return;el.innerHTML=names.map(n=>`<button class="btn btn-go" onclick="pickName('${n.replace(/'/g,"\\'")}')" style="margin:0">${n}</button>`).join("");}
function refreshNames(){loadNames();}
function showLeaderboardFromLogin(){state.screen="leaderboard";state._returnTo="login";render();}
function changeName(){localStorage.removeItem("cq_player");player=null;state.screen="login";render();}
async function pickName(name){let id="local-"+Math.random().toString(36).slice(2);try{const res=await api.post("/api/login",{name});id=res.playerId}catch(e){}player={playerId:id,name};localStorage.setItem("cq_player",JSON.stringify(player));try{levels=await api.get("/api/levels")}catch(e){levels=OFFLINE_LEVELS}if(!levels||!levels.length)levels=OFFLINE_LEVELS;state.screen="intro";render();}

// ── Intro (minimal — skip to game fast) ──
function renderIntro(){
  game.innerHTML=`<div class="screen show">
    <div class="robot-wrap" style="margin:0 auto 12px"><div class="robot walk"></div></div>
    <div class="hdr"><h1>Hey, ${player?player.name.split(" ")[0]:"Robot"}!</h1></div>
    <p style="font-size:15px;color:var(--text);max-width:400px;margin:0 auto 20px;line-height:1.6">
      Pick the right data. The AI solves the puzzle — or explodes trying. 💥
    </p>
    <button class="btn btn-go" onclick="startGame()" style="max-width:220px;margin:0 auto">Start →</button>
    <div style="display:flex;gap:8px;max-width:340px;margin:12px auto 0">
      <button class="btn btn-clear" onclick="state.screen='howto';render()" style="flex:1">❓ How to play</button>
      <button class="btn btn-clear" onclick="state.screen='leaderboard';state._returnTo='intro';render()" style="flex:1">🏆 Leaderboard</button>
      <button class="btn btn-clear" onclick="changeName()" style="flex:1">🔄 Name</button>
    </div>
  </div>`;
}

// ── How To Play (moved to separate screen) ──
function renderHowTo(){
  game.innerHTML=`<div class="screen show">
    <div class="hdr"><h1>How To Play</h1></div>
    <div class="rules" style="max-width:440px">
      <div class="rule"><span class="rule-i">📖</span>Read the situation — what problem needs solving?</div>
      <div class="rule"><span class="rule-i">🔍</span>Read each item's description — is it useful or junk?</div>
      <div class="rule"><span class="rule-i">👆</span>Tap items to pack them in your backpack</div>
      <div class="rule"><span class="rule-i">⚖️</span>Stay under the weight limit (heavy ≠ valuable!)</div>
      <div class="rule"><span class="rule-i">🤖</span>The AI solves the problem using ONLY your backpack</div>
      <div class="rule"><span class="rule-i">💡</span>Stuck? Hit the Hint button</div>
    </div>
    <p style="font-size:12px;color:var(--dim);max-width:380px;margin:0 auto 16px">The first level is a guided tutorial that walks you through step by step.</p>
    <button class="btn btn-clear" onclick="state.screen='intro';render()" style="max-width:200px;margin:0 auto">← Back</button>
  </div>`;
}

function startGame(){
  if(levels.length&&levels[0].tag!=="TUTORIAL"){const tut=OFFLINE_LEVELS.find(l=>l.tutorial===true);if(tut)levels.unshift(tut);}
  if(!levels.length)levels=OFFLINE_LEVELS;
  state={screen:"play",level:0,bag:[],scores:[],phase:"pick",lastResult:null,hintUsed:false,tutStep:0};
  render();
}

// ── Helper: get offline level by tag match ──
function getOfflineLevel(idx){
  const L=levels[idx];if(!L)return OFFLINE_LEVELS[idx];
  const match=OFFLINE_LEVELS.find(ol=>ol.tag===L.tag);
  if(match)return match;
  const hasServerTut=levels.some(l=>l.tag==="TUTORIAL");
  if(!hasServerTut&&OFFLINE_LEVELS[0]&&OFFLINE_LEVELS[0].tutorial)return OFFLINE_LEVELS[idx+1];
  return OFFLINE_LEVELS[idx];
}

// ── Level Render ──
function renderLevel(){
  const L=levels[state.level];if(!L)return;
  const offL=getOfflineLevel(state.level);
  const items=L.items.map(item=>{const oi=offL&&offL.items?offL.items.find(o=>o.id===item.id):null;return{...item,tip:(oi&&oi.tip&&oi.tip.length>(item.tip||'').length)?oi.tip:item.tip};});
  const usedWt=state.bag.reduce((s,id)=>s+items.find(i=>i.id===id).wt,0);
  const pct=Math.min(usedWt/L.capacity*100,100);
  const over=usedWt>L.capacity;
  const fillColor=over?"var(--red)":pct>75?"var(--orange)":"var(--gold)";
  let robotClass="walk";
  if(state.phase==="done"&&state.lastResult){robotClass=state.lastResult.score>=60?"celebrate":state.lastResult.score<=10?"explode":"idle";}else if(over){robotClass="heavy";}
  const typeMap={};if(state.lastResult&&state.lastResult.items)state.lastResult.items.forEach(it=>typeMap[it.id]=it.type);
  const shelfItems=items.filter(i=>!state.bag.includes(i.id));
  const bagItems=items.filter(i=>state.bag.includes(i.id));
  const isTutorial=L.tutorial===true||(offL&&offL.tutorial===true);
  const offItems=offL&&offL.items?offL.items:items;
  const signalCount=offItems.filter(i=>i.type==="signal").length;
  const totalItems=items.length;

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
    <div style="font-family:'Silkscreen',cursive;font-size:9px;color:var(--gold);letter-spacing:.15em;margin-bottom:8px">📋 SITUATION</div>
    <div style="font-size:13px;line-height:1.6;color:var(--text)">${L.briefing||(offL&&offL.briefing)||L.desc}</div>
    <div style="margin-top:10px;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
      <div style="font-family:'Silkscreen',cursive;font-size:8px;color:var(--green);letter-spacing:.1em;margin-bottom:4px">🎯 MISSION</div>
      <div style="font-size:13px;font-weight:600;color:var(--green)">${L.goal}</div>
    </div>
  </div>`;

  // Items FIRST, then backpack (more natural flow)
  html+=`<div class="shelf-label">📦 PICK ${signalCount} OF ${totalItems} — tap to pack, tap again to remove</div>
  <div class="shelf" id="shelf" ondragover="onDragOver(event)" ondragleave="onDragLeave(event)" ondrop="onDropShelf(event)">
    ${shelfItems.length===0?'<div class="bp-empty">All items packed!</div>':""}
    ${shelfItems.map(i=>itemHTML(i,false,typeMap,state.phase==="done",isTutorial)).join("")}
  </div>`;

  // Backpack
  html+=`<div class="backpack ${over?"overweight":""}" id="backpack" ondragover="onDragOver(event)" ondragleave="onDragLeave(event)" ondrop="onDropBag(event)">
    <span class="bp-label">🎒 PACKED (${bagItems.length})</span>
    <span class="bp-weight ${over?"over":""}">${usedWt} / ${L.capacity} wt</span>
    ${bagItems.length===0?'<div class="bp-empty">⬆️ Tap items above to pack them</div>':""}
    ${bagItems.map(i=>itemHTML(i,true,typeMap,state.phase==="done",isTutorial)).join("")}
  </div>`;

  // Actions
  if(state.phase==="pick"){
    html+=`<div class="actions">
      <button class="btn btn-clear" onclick="state.bag=[];render()">Clear</button>
      <button class="btn btn-clear" onclick="showHint()" style="color:var(--gold);border-color:var(--gold)">💡 Hint</button>
      <button class="btn btn-go" ${!state.bag.length||over?"disabled":""} onclick="doSubmit()">🤖 Ask the AI →</button>
    </div>`;
    // Contextual tooltip under button
    html+=`<div style="text-align:center;font-size:11px;color:var(--dim);margin:-8px 0 12px">The AI will try to solve the problem using <strong>only</strong> what's in your backpack</div>`;
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
    if(item.type==="signal")tutTag=`<div style="font-family:'Silkscreen',cursive;font-size:8px;color:var(--green);margin-top:4px">✦ LOOKS USEFUL</div>`;
    else if(item.type==="noise")tutTag=`<div style="font-family:'Silkscreen',cursive;font-size:8px;color:var(--red);margin-top:4px">✕ PROBABLY JUNK</div>`;
  }
  return`<div class="item ${cls}" draggable="${!locked}" ondragstart="onDragStart(event,'${item.id}')" onclick="toggleItem('${item.id}')" style="flex-direction:column;align-items:flex-start;width:100%">
    <div style="display:flex;align-items:center;gap:6px;width:100%">
      <span class="emoji">${item.emoji}</span><span style="flex:1;font-weight:700">${item.name}</span><span class="wt">${item.wt} wt</span>
    </div>
    <div style="font-size:11px;color:var(--dim);margin-top:4px;line-height:1.4;padding-left:28px">${item.tip}</div>
    ${tutTag}
  </div>`;
}

function showHint(){
  const L=levels[state.level];const offL=getOfflineLevel(state.level);
  const hint=(L&&L.hint)||(offL&&offL.hint);if(!hint)return;
  state.hintUsed=true;const box=$("#hint-box");if(!box)return;
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

// ── Submit with correct server index ──
async function doSubmit(){
  const L=levels[state.level];const wt=state.bag.reduce((s,id)=>s+L.items.find(i=>i.id===id).wt,0);
  if(wt>L.capacity||!state.bag.length)return;
  state.phase="responded";render();
  $("#result").innerHTML=`<div class="r-card"><div class="r-head"><span class="r-avatar">🤖</span><span class="r-who">AI COMPANION</span></div><div style="display:flex;gap:5px;padding:8px 0"><span style="width:6px;height:6px;border-radius:50%;background:var(--dim);animation:blink 1.2s infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:var(--dim);animation:blink 1.2s infinite .2s"></span><span style="width:6px;height:6px;border-radius:50%;background:var(--dim);animation:blink 1.2s infinite .4s"></span></div></div>`;
  $("#result").classList.add("show");
  let result;
  if(L.tutorial){
    result=localEvaluate(state.level,state.bag);
  } else {
    const serverIdx=state.level-(levels[0]&&levels[0].tutorial?1:0);
    try{result=await api.post("/api/submit",{level:serverIdx,bag:state.bag})}catch(e){result=localEvaluate(state.level,state.bag)}
  }
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
  const typeMap={};if(r.items)r.items.forEach(it=>typeMap[it.id]=it.type);
  const offL2=getOfflineLevel(state.level);
  const verdictItems=L.items.map(item=>{const oi=offL2&&offL2.items?offL2.items.find(o=>o.id===item.id):null;return{...item,type:typeMap[item.id]||(oi&&oi.type)||item.type};});
  const sig=verdictItems.filter(i=>state.bag.includes(i.id)&&typeMap[i.id]==="signal").length;
  const totSig=verdictItems.filter(i=>typeMap[i.id]==="signal").length;
  const noi=verdictItems.filter(i=>state.bag.includes(i.id)&&typeMap[i.id]==="noise").length;
  const wt=state.bag.reduce((s,id)=>s+L.items.find(i=>i.id===id).wt,0);
  const isLast=state.level>=levels.length-1;
  const isTutOrL1=state.level<=1;

  // Simplified verdict for tutorial + L1, full for rest
  let statsHtml="";
  if(isTutOrL1){
    statsHtml=`<div class="v-stats"><div class="v-stat"><div class="v-stat-v" style="color:var(--gold)">${sc}</div><div class="v-stat-l">Score</div></div></div>`;
    if(sc<100) statsHtml+=`<div style="font-size:11px;color:var(--dim);margin-bottom:12px">Tip: pick only what's needed — extra items add noise</div>`;
  } else {
    statsHtml=`<div class="v-stats">
      <div class="v-stat"><div class="v-stat-v" style="color:var(--gold)">${sc}</div><div class="v-stat-l">Score</div></div>
      <div class="v-stat"><div class="v-stat-v" style="color:var(--green)">${sig}/${totSig}</div><div class="v-stat-l">Signal</div></div>
      <div class="v-stat"><div class="v-stat-v" style="color:var(--red)">${noi}</div><div class="v-stat-l">Noise</div></div>
      <div class="v-stat"><div class="v-stat-v">${wt}</div><div class="v-stat-l">Weight</div></div>
    </div>`;
  }

  $("#verdict").innerHTML=`<div class="v-card">
    <div class="v-icon">${icon}</div><div class="v-title">${title}</div>
    <div class="v-desc">${sc>=70?"Your backpack had the right stuff!":sc>=25?"Close, but missing critical items.":"Noise overloaded the robot. KABOOM! 💥"}</div>
    ${statsHtml}
    <div class="v-lesson">${r.lesson}</div>
    <button class="btn ${isLast?"btn-go":"btn-next"}" onclick="${isLast?"endGame()":"nextLevel()"}">${isLast?"See Final Score →":"Next Level →"}</button>
  </div>`;
}

function nextLevel(){state.level++;state.bag=[];state.phase="pick";state.lastResult=null;state.hintUsed=false;render();window.scrollTo({top:0,behavior:"smooth"});}

// ── End (exclude tutorial from score display) ──
async function endGame(){
  state.screen="end";
  const gameScores=state.scores.slice(1); // exclude tutorial
  const total=gameScores.reduce((a,b)=>a+b,0);
  const avg=gameScores.length?Math.round(total/gameScores.length):0;
  const perf=gameScores.filter(s=>s>=90).length;
  let rankTitle;if(avg>=90)rankTitle="Context Architect";else if(avg>=65)rankTitle="Signal Hunter";else if(avg>=35)rankTitle="Noise Survivor";else rankTitle="Hallucination Machine";
  if(player){await api.post("/api/save",{playerId:player.playerId,score:total,perfect:perf,rankTitle}).catch(()=>{});}
  render();window.scrollTo({top:0,behavior:"smooth"});
}

function renderEnd(){
  const gameScores=state.scores.slice(1);
  const total=gameScores.reduce((a,b)=>a+b,0);
  const avg=gameScores.length?Math.round(total/gameScores.length):0;
  const perf=gameScores.filter(s=>s>=90).length;
  let rank,rc;
  if(avg>=90){rank="🏆 Context Architect";rc="var(--gold)";}else if(avg>=65){rank="✨ Signal Hunter";rc="var(--green)";}else if(avg>=35){rank="⚠️ Noise Survivor";rc="var(--orange)";}else{rank="💀 Hallucination Machine";rc="var(--red)";}
  game.innerHTML=`<div class="screen show">
    <div class="robot-wrap" style="margin:0 auto 8px"><div class="robot ${avg>=60?'celebrate':'explode'}"></div></div>
    <div class="hdr"><h1>Quest Complete</h1></div>
    <p style="font-size:15px;color:${rc};font-weight:700">${rank}</p>
    <p style="font-size:13px;color:var(--dim)">${player?player.name:"Robot"} scored ${total} / ${gameScores.length*100}</p>
    <div class="final-grid">
      <div class="f-cell"><div class="f-val" style="color:var(--gold)">${avg}</div><div class="f-label">AVG SCORE</div></div>
      <div class="f-cell"><div class="f-val" style="color:var(--green)">${perf}</div><div class="f-label">PERFECT</div></div>
      <div class="f-cell"><div class="f-val">${gameScores.length}</div><div class="f-label">LEVELS</div></div>
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

// ── Leaderboard ──
async function renderLeaderboard(){
  game.innerHTML=`<div class="screen show"><div style="font-size:48px;margin-bottom:4px">🏆</div><div class="hdr"><h1>Leaderboard</h1></div><div id="lb-content"><div class="bp-empty">Loading...</div></div><div id="lb-stats" style="margin-top:16px"></div><button class="btn btn-clear" onclick="state.screen=state._returnTo||'intro';render()" style="max-width:200px;margin:16px auto 0;display:block">← Back</button></div>`;
  let entries=[],stats={totalPlayers:0,totalGames:0,avgScore:0,topScore:0};
  try{[entries,stats]=await Promise.all([api.get("/api/leaderboard"),api.get("/api/stats")])}catch(e){const lbEl=$("#lb-content");if(lbEl)lbEl.innerHTML=`<div class="bp-empty">Leaderboard unavailable offline.<br>Play the game — scores save when online!</div>`;return;}
  const lbEl=$("#lb-content");
  if(!entries.length){lbEl.innerHTML=`<div class="bp-empty">No quests completed yet. Be the first!</div>`}else{
    lbEl.innerHTML=`<div style="max-width:440px;margin:0 auto">${entries.map(e=>{const medals=["👑","🥈","🥉"];const medal=e.rank<=3?medals[e.rank-1]:`<span style="color:var(--dim)">#${e.rank}</span>`;const isMe=player&&e.name===player.name;return`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${isMe?"var(--gold-g)":"var(--panel)"};border:1px solid ${isMe?"var(--gold)":"var(--border)"};border-radius:10px;margin-bottom:6px"><span style="font-size:18px;width:28px;text-align:center">${medal}</span><span style="flex:1;font-weight:600;font-size:13px;${isMe?"color:var(--gold)":""}">${e.name}</span><span style="font-family:'Silkscreen',cursive;font-size:12px;color:var(--gold)">${e.score}</span><span style="font-size:10px;color:var(--dim);min-width:50px;text-align:right">${e.perfect}⭐</span></div>`}).join("")}</div>`}
  const stEl=$("#lb-stats");stEl.innerHTML=`<div style="display:flex;justify-content:center;gap:20px;font-size:11px;color:var(--dim)"><span>👥 ${stats.totalPlayers} players</span><span>🎮 ${stats.totalGames} games</span><span>📊 avg ${stats.avgScore} pts</span></div>`;
}

function spawnParticles(){const el=$("#particles");if(!el)return;const colors=["#ff5c5c","#ffd700","#ff8c00","#fff","#ff4444"];el.innerHTML="";for(let i=0;i<16;i++){const a=Math.random()*360,d=30+Math.random()*40;const x=Math.cos(a*Math.PI/180)*d,y=Math.sin(a*Math.PI/180)*d;const c=colors[Math.floor(Math.random()*colors.length)];const s=3+Math.random()*5;const p=document.createElement("div");p.style.cssText=`position:absolute;width:${s}px;height:${s}px;border-radius:50%;background:${c}`;el.appendChild(p);p.animate([{transform:"translate(0,0) scale(1)",opacity:1},{transform:`translate(${x}px,${y}px) scale(0.3)`,opacity:0}],{duration:600+Math.random()*400,easing:"ease-out",fill:"forwards"});}}

// ═══════════════════════════════════════════════════
// OFFLINE LEVELS
// ═══════════════════════════════════════════════════
const OFFLINE_LEVELS = [
  {tag:"TUTORIAL",title:"Robot Boot Camp",tutorial:true,
    briefing:"Your robot needs WiFi. You have 3 data items — some help, some don't.<br><br>Items marked <span style='color:var(--green)'>✦ LOOKS USEFUL</span> are likely what you need. Items marked <span style='color:var(--red)'>✕ PROBABLY JUNK</span> are noise.<br><br><em>These hints disappear in real levels!</em>",
    goal:"Find the WiFi password",heroEmoji:"🤖",capacity:100,
    hint:"Which item literally contains a password?",
    items:[
      {id:"a",emoji:"📋",name:"WiFi Config File",wt:30,type:"signal",tip:"Contains SSID: 'RobotNet' and password: 'b33p-b00p-2024'."},
      {id:"b",emoji:"🍕",name:"Pizza Menu",wt:40,type:"noise",tip:"Today's special: Margherita. Delicious. Useless."},
      {id:"c",emoji:"📡",name:"Router Location",wt:25,type:"signal",tip:"Router is in Room 3B — helps confirm the right network."},
    ],_r:{
      perfect:{keys:["a","c"],text:'<span class="ok">Connected!</span> Password: <span class="ok">b33p-b00p-2024</span>. Router in Room 3B confirmed.\n\n<span class="ok">WiFi connected. Signal: excellent.</span>',score:100},
      good:{keys:["a"],text:'<span class="ok">Password found: b33p-b00p-2024.</span> Connected!\n\n<span class="maybe">Didn\'t verify router — could be a spoofed network.</span>',score:75},
      partial:{keys:["c"],text:'Router is in Room 3B, but <span class="maybe">without the password, can\'t connect.</span>',score:25},
      hall:{text:'<span class="hall">"Margherita" as password? Trying... failed.</span>',score:5},
      empty:{text:'<span class="hall">Guessing "password123"... nope.</span>',score:0},
    },lesson:'<strong>Tutorial done!</strong> The WiFi config (30 wt) had the answer. The pizza menu (40 wt) was heavier AND useless. This is context engineering — choosing the right data matters more than having lots of data.'},

  {tag:"LEVEL 1 — THE FIREWALL",title:"The Encrypted Gateway",
    briefing:'Your robot hits a firewall: <code style="background:var(--surface);padding:2px 6px;border-radius:4px">ACCESS DENIED — AES-256</code><br><br>Some items have encryption data. Others are random tech junk.',
    goal:"Bypass the encrypted firewall",heroEmoji:"🤖",capacity:150,
    hint:"You need: the key, the protocol, and the handshake sequence. Power and entertainment don't help.",
    items:[
      {id:"a",emoji:"🔑",name:"Encryption Key",wt:40,type:"signal",tip:"AES-256 key fragment matching the firewall's cipher."},
      {id:"b",emoji:"🎮",name:"Gaming Module",wt:50,type:"noise",tip:"Retro arcade games. Fun, but encryption doesn't care."},
      {id:"c",emoji:"📡",name:"Packet Capture",wt:35,type:"signal",tip:"Captured handshake showing the encryption protocol used."},
      {id:"d",emoji:"🔋",name:"Extra Battery",wt:60,type:"noise",tip:"More power. But this is a data problem, not power."},
      {id:"e",emoji:"📋",name:"Protocol Docs",wt:40,type:"signal",tip:"Handshake docs: challenge → response → verify sequence."},
      {id:"f",emoji:"🖨️",name:"Printer Driver",wt:55,type:"noise",tip:"LaserJet driver v3.2.1. No printer here."},
    ],_r:{
      perfect:{keys:["a","c","e"],text:'<span class="ok">Firewall bypassed!</span> Key + handshake + protocol sequence.\n\n<span class="ok">Access granted.</span>',score:100},
      good:{keys:["a","c"],text:'<span class="ok">Key matches protocol.</span>\n\n<span class="maybe">Missing handshake sequence — might trigger alarm.</span>',score:65},
      partial:{keys:["c"],text:'Can see encrypted packets but <span class="maybe">without the key, can only watch.</span>',score:30},
      hall:{text:'<span class="hall">Battery + gaming module = brute force!</span>\n\n<span class="hall">ETA: 4.7 billion years.</span>',score:5},
      empty:{text:'<span class="hall">Have you tried rebooting?</span>',score:0},
    },lesson:'<strong>Lesson:</strong> Battery (60 wt) + gaming (50 wt) = useless for decryption. Protocol docs (40 wt) mattered more than power. Right data > more data.'},

  {tag:"LEVEL 2 — THE DATA STREAM",title:"The Corrupted Pipeline",
    briefing:'Data arriving corrupted: <code style="background:var(--surface);padding:2px 6px;border-radius:4px">ERROR RATE: 73%</code><br><br>Something upstream is injecting bad data. Find what, where, and how to fix it.',
    goal:"Find the corruption source and fix it",heroEmoji:"🤖",capacity:180,
    hint:"Need: a sample (identify attack), error reference (decode it), network map (find source). History docs and cables won't help.",
    items:[
      {id:"a",emoji:"💾",name:"Corrupted Packet",wt:30,type:"signal",tip:"Malformed payload with SQL injection pattern in headers."},
      {id:"b",emoji:"📊",name:"Error Code Table",wt:45,type:"signal",tip:"Error 0x7F = unauthorized write from external source."},
      {id:"c",emoji:"🗺️",name:"Network Topology",wt:50,type:"signal",tip:"Shows a rogue API gateway at node 7.4.2."},
      {id:"d",emoji:"📸",name:"Server Selfie",wt:40,type:"partial",tip:"LED on node 7 is amber. Confirms issue, doesn't explain it."},
      {id:"e",emoji:"📚",name:"Architecture History",wt:80,type:"noise",tip:"200-page migration doc from 2019. Zero diagnostic value."},
      {id:"f",emoji:"🔌",name:"USB Cable",wt:35,type:"noise",tip:"Type-C. The pipeline is software, not hardware."},
    ],_r:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">Found it.</span> SQL injection + 0x7F = <span class="ok">rogue gateway at node 7.4.2</span>.\n\n<span class="ok">Fix: isolate node, revoke key, flush pipeline.</span>',score:100},
      good:{keys:["a","b"],text:'<span class="ok">SQL injection + unauthorized write.</span>\n\n<span class="maybe">From where? Need network map.</span>',score:65},
      partial:{keys:["a","d"],text:'Corrupted packets + amber LED on node 7.\n\n<span class="maybe">Can\'t pinpoint without error codes or map.</span>',score:35},
      hall:{text:'<span class="hall">Architecture doc says it worked in 2019. Revert to monolith?</span>',score:5},
      empty:{text:'<span class="hall">Clear the cache?</span>',score:0},
    },lesson:'<strong>Lesson:</strong> Architecture history (80 wt!) = almost half your budget, zero value. Packet (30) + errors (45) + map (50) = 125 wt, complete fix. Heavy ≠ valuable.'},

  {tag:"LEVEL 3 — THE BREACH",title:"The Stolen API Keys",
    briefing:'⚠️ <strong>SECURITY ALERT</strong> — API keys exfiltrated between 2-3 AM.<br><br>Find WHO, HOW, and WHY. Some items are evidence, some are noise from the same time.',
    goal:"Identify the thief and prove it",heroEmoji:"🤖",capacity:200,
    hint:"Evidence chain: access logs = WHO, git = HOW, vault audit = METHOD, crypto trace = MOTIVE. Coffee and music aren't evidence.",
    items:[
      {id:"a",emoji:"📋",name:"Access Logs",wt:35,type:"signal",tip:"Only dev-bot-9 accessed the vault between 2-3 AM."},
      {id:"b",emoji:"🔍",name:"Git Blame",wt:30,type:"signal",tip:"dev-bot-9 committed a base64-encoded API key at 2:47 AM."},
      {id:"c",emoji:"🔐",name:"Vault Audit Trail",wt:40,type:"signal",tip:"Key read via automated API — scripted exfiltration."},
      {id:"d",emoji:"📊",name:"Team Roster",wt:50,type:"partial",tip:"12 bots with access, 4 active that night. Narrows it down."},
      {id:"e",emoji:"☕",name:"Coffee Machine Logs",wt:45,type:"noise",tip:"7 espressos ordered. Robots don't drink coffee."},
      {id:"f",emoji:"🎵",name:"Office Playlist",wt:40,type:"noise",tip:"Lo-fi beats streaming 1-4 AM. Great vibes, zero evidence."},
      {id:"g",emoji:"💰",name:"Crypto Wallet Trace",wt:40,type:"signal",tip:"dev-bot-9 sent 0.5 BTC externally at 3:12 AM. Payment."},
    ],_r:{
      perfect:{keys:["a","b","c","g"],text:'<span class="ok">dev-bot-9 stole the keys.</span>\n\n• <span class="ok">Only vault access at 2-3AM</span>\n• <span class="ok">Encoded keys in git</span>\n• <span class="ok">Automated exfiltration</span>\n• <span class="ok">0.5 BTC payment</span>',score:100},
      good:{keys:["a","b","c"],text:'Strong case: <span class="ok">dev-bot-9</span>.\n\n<span class="maybe">But what\'s the motive? Need financial trail.</span>',score:70},
      partial:{keys:["a","d"],text:'dev-bot-9 accessed vault. 4 bots active.\n\n<span class="maybe">Circumstantial without forensics.</span>',score:35},
      hall:{text:'<span class="hall">7 espressos = someone pulled an all-nighter!</span>',score:5},
      empty:{text:'<span class="hall">Blame the intern.</span>',score:0},
    },lesson:'<strong>Lesson:</strong> Coffee + playlist = 85 wt, zero evidence. Crypto trace (40 wt) proved the motive. Follow the money.'},

  {tag:"LEVEL 4 — THE CLUSTER",title:"The CrashLooping Pod",
    briefing:'🚨 3 AM — pod in CrashLoopBackOff, users getting 503s.<br><br><code style="background:var(--surface);padding:2px 6px;border-radius:4px">order-service: CrashLoopBackOff (3 restarts)</code><br><br>Find WHAT failed, WHY, and WHAT CHANGED.',
    goal:"Find root cause + exact fix command",heroEmoji:"🤖",capacity:200,
    hint:"WHAT = pod logs, WHY = deployment YAML, WHAT CHANGED = changelog. Dashboards show resources are fine. Runbooks tell you what you already know.",
    items:[
      {id:"a",emoji:"📋",name:"Pod Logs",wt:35,type:"signal",tip:"ERROR: /app/config/db-credentials.json — no such file. Repeated."},
      {id:"b",emoji:"📄",name:"Deployment YAML",wt:45,type:"signal",tip:"Secret mounted at /etc/secrets — but app reads /app/config."},
      {id:"c",emoji:"📝",name:"Deploy Changelog",wt:50,type:"signal",tip:"v2.4.1: changed app config path to /app/config. YAML not updated."},
      {id:"d",emoji:"📈",name:"Grafana Dashboard",wt:60,type:"noise",tip:"CPU 12%, Memory 340/512MB. All fine. Not a resource problem."},
      {id:"e",emoji:"📖",name:"Runbook (generic)",wt:55,type:"noise",tip:"Step 1: Check pod. Step 2: Check logs. You already did that."},
      {id:"f",emoji:"🧰",name:"kubectl Events",wt:40,type:"partial",tip:"Liveness probe failed. Confirms crash but not cause."},
    ],_r:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">Mount path mismatch after v2.4.1.</span>\n\nApp reads /app/config, secret at /etc/secrets.\n\n<span class="ok">Fix: kubectl patch deployment — update volumeMount to /app/config</span>',score:100},
      good:{keys:["a","b"],text:'<span class="ok">Mount mismatch found.</span>\n\n<span class="maybe">What triggered this? Recent deploy?</span>',score:65},
      partial:{keys:["a","f"],text:'Config missing. Liveness failing.\n\n<span class="maybe">WHAT = yes. WHY = need deployment spec.</span>',score:35},
      hall:{text:'<span class="hall">Memory 340/512MB — increase to 2GB! Also try restarting.</span>',score:5},
      empty:{text:'<span class="hall">kubectl delete pod.</span>',score:0},
    },lesson:'<strong>Lesson:</strong> Grafana (60) + runbook (55) = 115 wt noise. Resources were fine. Changelog (50 wt) completed the chain. Logs + spec + changelog > dashboards + runbooks.'},

  {tag:"LEVEL 5 — THE MAINFRAME",title:"The Final Authentication",
    briefing:'<code style="background:var(--surface);padding:6px 12px;border-radius:4px;display:block;margin:8px 0;color:var(--red)">⚠ ENTER ROOT PASSWORD — 1 attempt. Wrong = FULL WIPE.</code><br><br>Deduce the password from data. No guessing.',
    goal:"Deduce the root password",heroEmoji:"🤖",capacity:180,
    hint:"Logic puzzle, not brute-force. Need: how passwords are GENERATED, the SOURCE value, and how it's ENCODED.",
    items:[
      {id:"a",emoji:"🧩",name:"Password Policy",wt:25,type:"signal",tip:"Passwords generated from server's first boot timestamp."},
      {id:"b",emoji:"⏱️",name:"Boot Log",wt:30,type:"signal",tip:"First boot: 2024-03-14T15:09:26Z. Pi Day, 15:09:26."},
      {id:"c",emoji:"📖",name:"Encoding Manual",wt:40,type:"signal",tip:"Timestamp → Unix epoch → hex. First 8 chars = password."},
      {id:"d",emoji:"⚡",name:"Overclocked CPU",wt:65,type:"noise",tip:"Brute-force speed. But ONE wrong guess = full wipe."},
      {id:"e",emoji:"🛡️",name:"Firewall Bypass",wt:55,type:"noise",tip:"Bypass tools. You're already past the firewall."},
      {id:"f",emoji:"📚",name:"Sysadmin Handbook",wt:90,type:"noise",tip:"800 pages. At 90 wt that's half your budget for maybe a clue."},
      {id:"g",emoji:"💬",name:"Slack Message",wt:20,type:"partial",tip:"Retired admin: 'something about pi and time...'"},
    ],_r:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">Password: 65e0a3b2</span>\n\n• <span class="ok">From boot timestamp</span>\n• <span class="ok">Pi Day: 2024-03-14T15:09:26Z</span>\n• <span class="ok">Epoch → hex → first 8 chars</span>\n\n<span class="ok">Mainframe unlocked.</span>',score:100},
      good:{keys:["a","b"],text:'From boot: <span class="ok">Pi Day 2024</span>.\n\n<span class="maybe">How encoded? One wrong guess wipes everything.</span>',score:70},
      partial:{keys:["a","g"],text:'From timestamp. Slack says "pi and time."\n\n<span class="maybe">"pi314"? Guessing is dangerous here.</span>',score:40},
      hall:{text:'<span class="hall">Brute-force! Starting with "password1"...</span>\n\n<span class="hall">Wait, one wrong attempt = wipe? Oops.</span>',score:5},
      empty:{text:'<span class="hall">Try "root"? ...maybe not.</span>',score:0},
    },lesson:'<strong>Lesson:</strong> CPU (65) + Firewall (55) + Handbook (90) = 210 wt — over budget AND useless. Policy (25) + Boot (30) + Encoding (40) = 95 wt, perfect answer. Small + specific + relevant.'},
];

// ── Client-side scoring (improved: extra items degrade gracefully) ──
function localEvaluate(levelIdx, bag) {
  const level = OFFLINE_LEVELS[levelIdx];
  if (!level) return { responseText: "Invalid level.", score: 0, quality: "empty", items: [], lesson: "" };
  const totalWt = bag.reduce((s, id) => { const it = level.items.find(i => i.id === id); return s + (it ? it.wt : 0); }, 0);
  if (totalWt > level.capacity) return { responseText: "Backpack too heavy! 💥", score: 0, quality: "overweight", items: level.items.map(i => ({id:i.id,type:i.type})), lesson: "" };
  const r = level._r, bagSet = new Set(bag);
  let resp;
  if (bag.length === 0) {
    resp = {...r.empty, quality:"empty"};
  } else if (r.perfect.keys.every(k => bagSet.has(k))) {
    // Perfect if you have all perfect keys (extras OK if all signal/partial)
    const extras = bag.filter(id => !r.perfect.keys.includes(id));
    const extraNoise = extras.some(id => { const it = level.items.find(i => i.id === id); return it && it.type === "noise"; });
    if (extraNoise) {
      resp = {...r.good, quality:"good"};
    } else if (extras.length === 0) {
      resp = {...r.perfect, quality:"perfect"};
    } else {
      // Has extra signal/partial — still good, slightly less than perfect
      resp = {...r.good, quality:"good"};
    }
  } else if (r.good.keys.every(k => bagSet.has(k)) && r.good.keys.length > 0) {
    resp = {...r.good, quality:"good"};
  } else {
    let sig=0, noi=0;
    for (const id of bag) { const it = level.items.find(i => i.id === id); if (it?.type === "signal") sig++; if (it?.type === "noise") noi++; }
    if (noi >= sig) resp = {...r.hall, quality:"hallucination"};
    else if (r.partial.keys && r.partial.keys.some(k => bagSet.has(k))) resp = {...r.partial, quality:"partial"};
    else resp = {...r.hall, quality:"hallucination"};
  }
  return { responseText: resp.text, score: resp.score, quality: resp.quality, items: level.items.map(i => ({id:i.id,type:i.type})), lesson: level.lesson };
}

// ── Boot ──
render();