// Context Quest — Frontend with Login & Leaderboard


const $ = (s) => document.querySelector(s);
const game = $("#game");

let levels = [];
let player = null; // {playerId, name}
let state = { screen: "login", level: 0, bag: [], scores: [], phase: "pick", lastResult: null };

// ── API helpers (with error handling) ──

const api = {
  get: (url) => fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
  post: (url, body) => fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
};

// ── Robot Name Generator (client-side, instant) ──
const _pre = ["Unit","Bot","Mech","Byte","Chip","Gear","Bolt","Wire","Node","Core",
  "Flux","Ping","Zap","Arc","Hex","Bit","Nano","Robo","Droid","Spark"];
const _suf = ["7X","42","99","13","Z3","K9","V8","3D","X1","88",
  "00","A7","R2","Q5","E9","M3","T6","J1","P4","W2"];
const _ttl = ["Sparkplug","Codebreaker","Debugger","Firewall","Compiler",
  "Overclocker","Patchwork","Uplinker","Downloader","Bytecruncher",
  "Stacktrace","Firmware","Kernel","Dataminer","Circuitbend",
  "Pixelpush","Logwalker","Threadripper","Cachebuster","Defragmenter"];
function _pk(a){return a[Math.floor(Math.random()*a.length)]}
function genRobotNames(n){
  const s=new Set(),r=[];
  while(r.length<n){const nm=_pk(_pre)+"-"+_pk(_suf)+" "+_pk(_ttl);if(!s.has(nm)){s.add(nm);r.push(nm);}}
  return r;
}

// ── INIT ──
render();

// ── RENDER ──

function render() {
  const screens = { login: renderLogin, intro: renderIntro, play: renderLevel, end: renderEnd, leaderboard: renderLeaderboard };
  (screens[state.screen] || renderLogin)();
  renderPips();
}

function renderPips() {
  const el = $("#progress");
  if (!el || !levels.length) { if (el) el.innerHTML = ""; return; }
  el.innerHTML = levels.map((_, i) => {
    let c = "";
    if (i < state.level) c = state.scores[i] >= 60 ? "done" : "fail";
    else if (i === state.level && state.screen === "play") c = "active";
    return `<div class="prog-pip ${c}"></div>`;
  }).join("");
}

// ── LOGIN: Robot Name Picker ──

async function renderLogin() {
  const saved = localStorage.getItem("cq_player");
  if (saved) {
    player = JSON.parse(saved);
    state.screen = "intro";
    try { levels = await api.get("/api/levels"); } catch(e) { levels = OFFLINE_LEVELS; }
    if (!levels || !levels.length) levels = OFFLINE_LEVELS;
    render();
    return;
  }

  game.innerHTML = `
    <div class="screen show">
      <div class="robot-wrap" style="margin:0 auto 12px"><div class="robot walk"></div></div>
      <div class="hdr"><h1>Choose Your Designation</h1></div>
      <p>Every robot needs a designation. Pick one — this is how you'll appear on the leaderboard.</p>
      <div id="name-options" style="display:flex;flex-direction:column;gap:8px;max-width:320px;margin:0 auto 16px">
      </div>
      <button class="btn btn-clear" onclick="refreshNames()" style="max-width:200px;margin:0 auto 12px;display:block">🎲 Roll new names</button>
      <div style="text-align:center;margin-top:8px">
        <button class="btn btn-clear" onclick="showLeaderboardFromLogin()" style="max-width:200px;margin:0 auto">🏆 View Leaderboard</button>
      </div>
    </div>`;
  loadNames();
}

function loadNames() {
  const names = genRobotNames(4);
  const el = $("#name-options");
  if (!el) return;
  el.innerHTML = names.map(n => `
    <button class="btn btn-go" onclick="pickName('${n.replace(/'/g,"\\'")}')" style="margin:0">${n}</button>
  `).join("");
}

function refreshNames() { loadNames(); }

async function pickName(name) {
  let id = "local-" + Math.random().toString(36).slice(2);
  try { const res = await api.post("/api/login", { name }); id = res.playerId; } catch(e) {}
  player = { playerId: id, name };
  localStorage.setItem("cq_player", JSON.stringify(player));
  try { levels = await api.get("/api/levels"); } catch(e) { levels = OFFLINE_LEVELS; }
  if (!levels || !levels.length) levels = OFFLINE_LEVELS;
  state.screen = "intro";
  render();
}

function showLeaderboardFromLogin() {
  state.screen = "leaderboard";
  state._returnTo = "login";
  render();
}

function changeName() {
  localStorage.removeItem("cq_player");
  player = null;
  state.screen = "login";
  render();
}

// ── INTRO ──

function renderIntro() {
  game.innerHTML = `
    <div class="screen show">
      <div class="robot-wrap" style="margin:0 auto 12px"><div class="robot walk"></div></div>
      <div class="hdr"><h1>Ready, ${player ? player.name.split(" ")[0] : "Adventurer"}?</h1></div>
      <p>Your backpack is your AI's context window. Every item you carry is data the AI can use. But the backpack has a weight limit — carry too much junk and the robot explodes! 💥</p>
      <div class="rules">
        <div class="rule"><span class="rule-i">🎒</span>Drag items into your backpack — each has a weight cost</div>
        <div class="rule"><span class="rule-i">⚖️</span>Stay under the weight limit or you can't proceed</div>
        <div class="rule"><span class="rule-i">✨</span>Some items are signal — they help solve the puzzle</div>
        <div class="rule"><span class="rule-i">💀</span>Some items are noise — they waste space and mislead</div>
        <div class="rule"><span class="rule-i">🤖</span>The AI answers based ONLY on what's in your backpack</div>
      </div>
      <button class="btn btn-go" onclick="startGame()" style="max-width:220px;margin:0 auto">Begin Quest →</button>
      <div style="display:flex;gap:8px;max-width:300px;margin:12px auto 0">
        <button class="btn btn-clear" onclick="state.screen='leaderboard';state._returnTo='intro';render()" style="flex:1">🏆 Leaderboard</button>
        <button class="btn btn-clear" onclick="changeName()" style="flex:1">🔄 Change Name</button>
      </div>
    </div>`;
}

function startGame() {
  state = { screen: "play", level: 0, bag: [], scores: [], phase: "pick", lastResult: null };
  render();
}

// ── LEVEL ──

function renderLevel() {
  const L = levels[state.level];
  if (!L) return;
  const usedWt = state.bag.reduce((s, id) => s + L.items.find((i) => i.id === id).wt, 0);
  const pct = Math.min((usedWt / L.capacity) * 100, 100);
  const over = usedWt > L.capacity;
  const fillColor = over ? "var(--red)" : pct > 75 ? "var(--orange)" : "var(--gold)";

  let robotClass = "walk";
  if (state.phase === "done" && state.lastResult) {
    robotClass = state.lastResult.score >= 60 ? "celebrate" : state.lastResult.score <= 10 ? "explode" : "idle";
  } else if (over) { robotClass = "heavy"; }

  const typeMap = {};
  if (state.lastResult && state.lastResult.items) state.lastResult.items.forEach((it) => (typeMap[it.id] = it.type));

  const shelfItems = L.items.filter((i) => !state.bag.includes(i.id));
  const bagItems = L.items.filter((i) => state.bag.includes(i.id));

  let html = `
    <div class="scene">
      <div class="scene-top">
        <div class="robot-wrap">
          <div class="bp-bar"><div class="bp-fill" style="width:${pct}%;background:${fillColor}"></div></div>
          <div class="robot ${robotClass}"></div>
          <div class="explosion ${robotClass === 'explode' ? 'show' : ''}" id="particles"></div>
        </div>
      </div>
      <div class="scene-ground"></div>
      <div class="scene-info">
        <div class="scene-level">${L.tag}</div>
        <div class="scene-title">${L.title}</div>
        <div class="scene-obj">🎯 ${L.goal}</div>
      </div>
    </div>
    <div class="backpack ${over ? "overweight" : ""}" id="backpack"
      ondragover="onDragOver(event)" ondragleave="onDragLeave(event)" ondrop="onDropBag(event)">
      <span class="bp-label">🎒 BACKPACK</span>
      <span class="bp-weight ${over ? "over" : ""}">${usedWt} / ${L.capacity} wt</span>
      ${bagItems.length === 0 ? '<div class="bp-empty">Drag items here...</div>' : ""}
      ${bagItems.map((i) => itemHTML(i, true, typeMap, state.phase === "done")).join("")}
    </div>
    <div class="shelf-label">AVAILABLE ITEMS</div>
    <div class="shelf" id="shelf" ondragover="onDragOver(event)" ondragleave="onDragLeave(event)" ondrop="onDropShelf(event)">
      ${shelfItems.length === 0 ? '<div class="bp-empty">All items packed!</div>' : ""}
      ${shelfItems.map((i) => itemHTML(i, false, typeMap, state.phase === "done")).join("")}
    </div>`;

  if (state.phase === "pick") {
    html += `<div class="actions">
      <button class="btn btn-clear" onclick="state.bag=[];render()">Clear</button>
      <button class="btn btn-go" ${state.bag.length === 0 || over ? "disabled" : ""} onclick="doSubmit()">🤖 Ask the AI →</button>
    </div>`;
  }
  html += `<div class="result ${state.phase === "done" ? "show" : ""}" id="result"></div>`;
  html += `<div class="verdict ${state.phase === "done" ? "show" : ""}" id="verdict"></div>`;
  game.innerHTML = html;
  if (state.phase === "done" && state.lastResult) { fillResponse(state.lastResult); fillVerdict(state.lastResult); }
}

function itemHTML(item, inBag, typeMap, locked) {
  let cls = inBag ? "in-bag" : "";
  if (locked && typeMap[item.id]) cls = typeMap[item.id];
  if (locked) cls += " locked";
  return `<div class="item ${cls}" draggable="${!locked}" ondragstart="onDragStart(event,'${item.id}')" onclick="toggleItem('${item.id}')" title="${item.tip}">
    <span class="emoji">${item.emoji}</span>${item.name}<span class="wt">${item.wt}</span></div>`;
}

// ── Drag & Drop ──
let dragId = null;
function onDragStart(e, id) { if (state.phase !== "pick") return; dragId = id; e.dataTransfer.effectAllowed = "move"; }
function onDragOver(e) { e.preventDefault(); e.currentTarget.classList.add("over"); }
function onDragLeave(e) { e.currentTarget.classList.remove("over"); }
function onDropBag(e) { e.preventDefault(); e.currentTarget.classList.remove("over"); if (dragId && !state.bag.includes(dragId)) { state.bag.push(dragId); render(); } dragId = null; }
function onDropShelf(e) { e.preventDefault(); e.currentTarget.classList.remove("over"); if (dragId && state.bag.includes(dragId)) { state.bag = state.bag.filter((x) => x !== dragId); render(); } dragId = null; }
function toggleItem(id) { if (state.phase !== "pick") return; state.bag.includes(id) ? (state.bag = state.bag.filter((x) => x !== id)) : state.bag.push(id); render(); }

// ── Submit ──
async function doSubmit() {
  const L = levels[state.level];
  const wt = state.bag.reduce((s, id) => s + L.items.find((i) => i.id === id).wt, 0);
  if (wt > L.capacity || !state.bag.length) return;

  state.phase = "responded";
  render();
  $("#result").innerHTML = `<div class="r-card"><div class="r-head"><span class="r-avatar">🤖</span><span class="r-who">AI COMPANION</span></div><div style="display:flex;gap:5px;padding:8px 0"><span style="width:6px;height:6px;border-radius:50%;background:var(--dim);animation:blink 1.2s infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:var(--dim);animation:blink 1.2s infinite .2s"></span><span style="width:6px;height:6px;border-radius:50%;background:var(--dim);animation:blink 1.2s infinite .4s"></span></div></div>`;
  $("#result").classList.add("show");

  let result;
  try {
    result = await api.post("/api/submit", { level: state.level, bag: state.bag });
  } catch(e) {
    // Offline fallback: score client-side
    result = localEvaluate(state.level, state.bag);
  }
  state.lastResult = result;
  state.scores.push(result.score);
  state.phase = "done";
  render();
  if (result.score <= 10) spawnParticles();
  setTimeout(() => { const v = $("#verdict"); if (v) v.scrollIntoView({ behavior: "smooth", block: "center" }); }, 200);
}

function fillResponse(r) {
  const cls = r.score >= 70 ? "good" : r.score >= 30 ? "mid" : "bad";
  $("#result").innerHTML = `<div class="r-card ${cls}"><div class="r-head"><span class="r-avatar">🤖</span><span class="r-who">AI COMPANION</span></div><div class="r-text">${r.responseText}</div></div>`;
}

function fillVerdict(r) {
  const L = levels[state.level]; const sc = r.score;
  let icon, title;
  if (sc >= 90) { icon = "🏆"; title = "Perfect Pack!"; }
  else if (sc >= 60) { icon = "✨"; title = "Good Choices"; }
  else if (sc >= 25) { icon = "⚠️"; title = "Incomplete"; }
  else { icon = "💥"; title = "BOOM!"; }

  const typeMap = {}; if (r.items) r.items.forEach((it) => (typeMap[it.id] = it.type));
  const sig = L.items.filter((i) => state.bag.includes(i.id) && typeMap[i.id] === "signal").length;
  const totSig = L.items.filter((i) => typeMap[i.id] === "signal").length;
  const noi = L.items.filter((i) => state.bag.includes(i.id) && typeMap[i.id] === "noise").length;
  const wt = state.bag.reduce((s, id) => s + L.items.find((i) => i.id === id).wt, 0);
  const isLast = state.level >= levels.length - 1;

  $("#verdict").innerHTML = `<div class="v-card">
    <div class="v-icon">${icon}</div><div class="v-title">${title}</div>
    <div class="v-desc">${sc >= 70 ? "Your backpack had the right stuff!" : sc >= 25 ? "Close, but missing critical items." : "Noise overloaded the robot. KABOOM! 💥"}</div>
    <div class="v-stats">
      <div class="v-stat"><div class="v-stat-v" style="color:var(--gold)">${sc}</div><div class="v-stat-l">Score</div></div>
      <div class="v-stat"><div class="v-stat-v" style="color:var(--green)">${sig}/${totSig}</div><div class="v-stat-l">Signal</div></div>
      <div class="v-stat"><div class="v-stat-v" style="color:var(--red)">${noi}</div><div class="v-stat-l">Noise</div></div>
      <div class="v-stat"><div class="v-stat-v">${wt}</div><div class="v-stat-l">Weight</div></div>
    </div>
    <div class="v-lesson">${r.lesson}</div>
    <button class="btn ${isLast ? "btn-go" : "btn-next"}" onclick="${isLast ? "endGame()" : "nextLevel()"}">${isLast ? "See Final Score →" : "Next Level →"}</button>
  </div>`;
}

function nextLevel() { state.level++; state.bag = []; state.phase = "pick"; state.lastResult = null; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }

// ── END SCREEN + Save to leaderboard ──

async function endGame() {
  state.screen = "end";

  const total = state.scores.reduce((a, b) => a + b, 0);
  const avg = Math.round(total / levels.length);
  const perf = state.scores.filter((s) => s >= 90).length;
  let rankTitle;
  if (avg >= 90) rankTitle = "Context Architect";
  else if (avg >= 65) rankTitle = "Signal Hunter";
  else if (avg >= 35) rankTitle = "Noise Survivor";
  else rankTitle = "Hallucination Machine";

  // Save to server
  if (player) {
    await api.post("/api/save", {
      playerId: player.playerId, score: total, perfect: perf, rankTitle,
    }).catch(() => {});
  }

  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderEnd() {
  const total = state.scores.reduce((a, b) => a + b, 0);
  const avg = Math.round(total / levels.length);
  const perf = state.scores.filter((s) => s >= 90).length;
  let rank, rc;
  if (avg >= 90) { rank = "🏆 Context Architect"; rc = "var(--gold)"; }
  else if (avg >= 65) { rank = "✨ Signal Hunter"; rc = "var(--green)"; }
  else if (avg >= 35) { rank = "⚠️ Noise Survivor"; rc = "var(--orange)"; }
  else { rank = "💀 Hallucination Machine"; rc = "var(--red)"; }

  game.innerHTML = `<div class="screen show">
    <div class="robot-wrap" style="margin:0 auto 8px"><div class="robot ${avg >= 60 ? 'celebrate' : 'explode'}"></div></div>
    <div class="hdr"><h1>Quest Complete</h1></div>
    <p style="font-size:15px;color:${rc};font-weight:700">${rank}</p>
    <p style="font-size:13px;color:var(--dim)">${player ? player.name : "Adventurer"} scored ${total} / ${levels.length * 100}</p>
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

async function renderLeaderboard() {
  game.innerHTML = `<div class="screen show">
    <div style="font-size:48px;margin-bottom:4px">🏆</div>
    <div class="hdr"><h1>Leaderboard</h1></div>
    <div id="lb-content"><div class="bp-empty">Loading...</div></div>
    <div id="lb-stats" style="margin-top:16px"></div>
    <button class="btn btn-clear" onclick="state.screen=state._returnTo||'intro';render()" style="max-width:200px;margin:16px auto 0;display:block">← Back</button>
  </div>`;

  let entries = [], stats = { totalPlayers: 0, totalGames: 0, avgScore: 0, topScore: 0 };
  try {
    [entries, stats] = await Promise.all([api.get("/api/leaderboard"), api.get("/api/stats")]);
  } catch(e) {
    const lbEl = $("#lb-content");
    if (lbEl) lbEl.innerHTML = `<div class="bp-empty">Leaderboard needs Turso database.<br>Play the game first — scores are tracked locally!</div>`;
    return;
  }

  const lbEl = $("#lb-content");
  if (!entries.length) {
    lbEl.innerHTML = `<div class="bp-empty">No quests completed yet. Be the first!</div>`;
  } else {
    lbEl.innerHTML = `<div style="max-width:440px;margin:0 auto">${entries.map((e) => {
      const medals = ["👑", "🥈", "🥉"];
      const medal = e.rank <= 3 ? medals[e.rank - 1] : `<span style="color:var(--dim)">#${e.rank}</span>`;
      const isMe = player && e.name === player.name;
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${isMe ? "var(--gold-g)" : "var(--panel)"};border:1px solid ${isMe ? "var(--gold)" : "var(--border)"};border-radius:10px;margin-bottom:6px">
        <span style="font-size:18px;width:28px;text-align:center">${medal}</span>
        <span style="flex:1;font-weight:600;font-size:13px;${isMe ? "color:var(--gold)" : ""}">${e.name}</span>
        <span style="font-family:'Silkscreen',cursive;font-size:12px;color:var(--gold)">${e.score}</span>
        <span style="font-size:10px;color:var(--dim);min-width:50px;text-align:right">${e.perfect}⭐</span>
      </div>`;
    }).join("")}</div>`;
  }

  const stEl = $("#lb-stats");
  stEl.innerHTML = `<div style="display:flex;justify-content:center;gap:20px;font-size:11px;color:var(--dim)">
    <span>👥 ${stats.totalPlayers} players</span>
    <span>🎮 ${stats.totalGames} games</span>
    <span>📊 avg ${stats.avgScore} pts</span>
  </div>`;
}

// ── Explosion Particles ──
function spawnParticles() {
  const el = $("#particles");
  if (!el) return;
  const colors = ["#ff5c5c","#ffd700","#ff8c00","#fff","#ff4444"];
  el.innerHTML = "";
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * 360, d = 30 + Math.random() * 40;
    const x = Math.cos(a * Math.PI / 180) * d, y = Math.sin(a * Math.PI / 180) * d;
    const c = colors[Math.floor(Math.random() * colors.length)];
    const s = 3 + Math.random() * 5;
    const p = document.createElement("div");
    p.style.cssText = `position:absolute;width:${s}px;height:${s}px;border-radius:50%;background:${c}`;
    el.appendChild(p);
    p.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${x}px,${y}px) scale(0.3)`, opacity: 0 }
    ], { duration: 600 + Math.random() * 400, easing: "ease-out", fill: "forwards" });
  }
}

// ═══════════════════════════════════════════════════
// OFFLINE DATA — full levels + client-side scoring
// Works without any backend (open index.html directly)
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// OFFLINE DATA — full levels + client-side scoring
// Works without any backend (open index.html directly)
// ═══════════════════════════════════════════════════

const OFFLINE_LEVELS = [
  {tag:"LEVEL 1 — THE FIREWALL",title:"The Encrypted Gateway",desc:"A locked firewall blocks access to the next sector. Crack the encryption.",goal:"Bypass the encrypted firewall",heroEmoji:"🤖",capacity:150,
    items:[
      {id:"a",emoji:"🔑",name:"Encryption Key",wt:40,type:"signal",tip:"AES-256 key fragment matching the firewall cipher"},
      {id:"b",emoji:"🎮",name:"Gaming Module",wt:50,type:"noise",tip:"Plays retro games. Fun but useless here."},
      {id:"c",emoji:"📡",name:"Packet Capture",wt:35,type:"signal",tip:"Intercepted handshake showing encryption protocol"},
      {id:"d",emoji:"🔋",name:"Extra Battery",wt:60,type:"noise",tip:"More power won't crack encryption"},
      {id:"e",emoji:"📋",name:"Protocol Docs",wt:40,type:"signal",tip:"Handshake sequence: challenge → response → verify"},
      {id:"f",emoji:"🖨️",name:"Printer Driver",wt:55,type:"noise",tip:"v3.2.1 for LaserJet. Completely irrelevant."},
    ],_r:{
      perfect:{keys:["a","c","e"],text:'<span class="ok">Firewall bypassed!</span> Matched key to handshake, followed protocol.\n\n<span class="ok">Access granted. Gateway opens.</span>',score:100},
      good:{keys:["a","c"],text:'<span class="ok">Key matches the captured protocol.</span>\n\n<span class="maybe">Not sure about handshake sequence. Might trigger alarm.</span>',score:65},
      partial:{keys:["c"],text:'I can see encrypted packets but <span class="maybe">without the key, can only observe.</span>',score:30},
      hall:{text:'<span class="hall">Extra battery + gaming module = brute force attack!</span>\n\n<span class="hall">Estimated time: 4.7 billion years.</span>',score:5},
      empty:{text:'<span class="hall">Have you tried turning it off and on again?</span>',score:0},
    },lesson:'<strong>Lesson:</strong> A battery and gaming module are useful tech — but useless for decryption. Protocol docs (40 wt) mattered more than extra power (60 wt). Context engineering = right data for the right problem.'},

  {tag:"LEVEL 2 — THE DATA STREAM",title:"The Corrupted Pipeline",desc:"Data packets arriving corrupted. Something upstream is injecting bad data.",goal:"Find the corruption source and fix the pipeline",heroEmoji:"🤖",capacity:180,
    items:[
      {id:"a",emoji:"💾",name:"Corrupted Packet",wt:30,type:"signal",tip:"Malformed payload — SQL injection pattern in headers"},
      {id:"b",emoji:"📊",name:"Error Code Table",wt:45,type:"signal",tip:"Error 0x7F = unauthorized write from external source"},
      {id:"c",emoji:"🗺️",name:"Network Topology",wt:50,type:"signal",tip:"Shows rogue API gateway at node 7.4.2"},
      {id:"d",emoji:"📸",name:"Server Selfie",wt:40,type:"partial",tip:"Screenshot — LED on node 7 is amber"},
      {id:"e",emoji:"📚",name:"Architecture History",wt:80,type:"noise",tip:"200-page migration doc. Fascinating. Useless."},
      {id:"f",emoji:"🔌",name:"USB Cable",wt:35,type:"noise",tip:"Type-C. The pipeline is virtual."},
    ],_r:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">Source identified.</span> SQL injection + error 0x7F = <span class="ok">rogue gateway at node 7.4.2</span>.\n\n<span class="ok">Fix: isolate node, revoke API key, flush pipeline.</span>',score:100},
      good:{keys:["a","b"],text:'<span class="ok">SQL injection + unauthorized write.</span> Malicious injection detected.\n\n<span class="maybe">From where? Need network topology.</span>',score:65},
      partial:{keys:["a","d"],text:'Corrupted packets confirmed. Server photo shows amber LED on node 7.\n\n<span class="maybe">Can\'t confirm without error codes or network map.</span>',score:35},
      hall:{text:'<span class="hall">Architecture doc says pipeline was fine in 2019.</span>\n\n<span class="hall">Revert to monolith?</span>',score:5},
      empty:{text:'<span class="hall">Have you tried clearing the cache?</span>',score:0},
    },lesson:'<strong>Lesson:</strong> Architecture history (80 wt!) = zero diagnostic value. Packet (30) + errors (45) + topology (50) = 125 wt, complete diagnosis. Heavy docs ≠ useful data.'},

  {tag:"LEVEL 3 — THE BREACH",title:"The Stolen API Keys",desc:"Someone exfiltrated production API keys. Find the insider.",goal:"Identify who stole the keys and how",heroEmoji:"🤖",capacity:200,
    items:[
      {id:"a",emoji:"📋",name:"Access Logs",wt:35,type:"signal",tip:"Only dev-bot-9 accessed vault at 2-3AM"},
      {id:"b",emoji:"🔍",name:"Git Blame",wt:30,type:"signal",tip:"dev-bot-9 committed base64-encoded string to test file"},
      {id:"c",emoji:"🔐",name:"Vault Audit Trail",wt:40,type:"signal",tip:"Key read via API, not console — automated exfiltration"},
      {id:"d",emoji:"📊",name:"Team Roster",wt:50,type:"partial",tip:"12 bots with vault access, 4 active that night"},
      {id:"e",emoji:"☕",name:"Coffee Machine Logs",wt:45,type:"noise",tip:"7 espressos ordered. Robots don't drink coffee."},
      {id:"f",emoji:"🎵",name:"Office Playlist",wt:40,type:"noise",tip:"Lo-fi beats to hack to. Not evidence."},
      {id:"g",emoji:"💰",name:"Crypto Wallet Trace",wt:40,type:"signal",tip:"dev-bot-9 transferred 0.5 BTC to external wallet"},
    ],_r:{
      perfect:{keys:["a","b","c","g"],text:'<span class="ok">dev-bot-9 stole the keys.</span>\n\n• <span class="ok">Only vault access at 2-3AM</span>\n• <span class="ok">Committed encoded keys to repo</span>\n• <span class="ok">Automated API exfiltration</span>\n• <span class="ok">0.5 BTC transfer = sold the keys</span>',score:100},
      good:{keys:["a","b","c"],text:'Strong case: <span class="ok">dev-bot-9</span> — vault access, git commit, automated extraction.\n\n<span class="maybe">What was the motive? Need financial trail.</span>',score:70},
      partial:{keys:["a","d"],text:'dev-bot-9 accessed vault at 2AM. 4 bots active.\n\n<span class="maybe">Suspicious but circumstantial. Need forensics.</span>',score:35},
      hall:{text:'<span class="hall">7 espressos = someone was up all night!</span>\n\n<span class="hall">Cross-reference with playlist timestamps!</span>',score:5},
      empty:{text:'<span class="hall">It\'s always the intern.</span>',score:0},
    },lesson:'<strong>Lesson:</strong> Coffee logs + playlist = 85 wt of atmosphere, zero evidence. Crypto trace (40 wt) proved the motive. In incident response, follow the money.'},

  {tag:"LEVEL 4 — THE CLUSTER",title:"The CrashLooping Pod",desc:"Production pod in CrashLoopBackOff. Users getting 503s.",goal:"Find root cause and fix the pod",heroEmoji:"🤖",capacity:200,
    items:[
      {id:"a",emoji:"📋",name:"Pod Logs",wt:35,type:"signal",tip:"ERROR: failed to read /app/config/db-creds.json — no such file"},
      {id:"b",emoji:"📄",name:"Deployment YAML",wt:45,type:"signal",tip:"volumeMount: /etc/secrets — app reads /app/config"},
      {id:"c",emoji:"📝",name:"Deploy Changelog",wt:50,type:"signal",tip:"v2.4.1: changed config path to /app/config"},
      {id:"d",emoji:"📈",name:"Grafana Dashboard",wt:60,type:"noise",tip:"CPU 12%, Memory 340/512MB. Resources fine."},
      {id:"e",emoji:"📖",name:"Runbook (generic)",wt:55,type:"noise",tip:"Step 1: Check pod. Step 2: Check logs. Already did that."},
      {id:"f",emoji:"🧰",name:"kubectl Events",wt:40,type:"partial",tip:"Normal: Pulled image. Warning: Liveness probe failed."},
    ],_r:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">Root cause: mount path mismatch after v2.4.1.</span>\n\nApp reads /app/config, secret mounted at /etc/secrets.\n\n<span class="ok">Fix: kubectl patch — update volumeMount to /app/config</span>',score:100},
      good:{keys:["a","b"],text:'<span class="ok">Mount path mismatch.</span> App wants /app/config, secret at /etc/secrets.\n\n<span class="maybe">What triggered this? Recent deploy?</span>',score:65},
      partial:{keys:["a","f"],text:'Pod can\'t read config. Liveness probe failing.\n\n<span class="maybe">WHAT is failing — yes. WHY — need deployment spec.</span>',score:35},
      hall:{text:'<span class="hall">Memory 340/512MB — almost full! Increase to 2GB.</span>\n\n<span class="hall">Also: have you tried restarting?</span>',score:5},
      empty:{text:'<span class="hall">kubectl delete pod. Usually works.</span>',score:0},
    },lesson:'<strong>Lesson:</strong> Grafana (60 wt) + runbook (55 wt) = 115 wt of noise. Changelog (50 wt) completed the diagnosis. In incidents: logs + spec + changelog > dashboards + runbooks.'},

  {tag:"LEVEL 5 — THE MAINFRAME",title:"The Final Authentication",desc:"The mainframe asks for the root password. One wrong attempt = full system wipe.",goal:'Deduce the root password',heroEmoji:"🤖",capacity:180,
    items:[
      {id:"a",emoji:"🧩",name:"Password Policy",wt:25,type:"signal",tip:'"Passwords generated from server boot timestamp"'},
      {id:"b",emoji:"⏱️",name:"Boot Log",wt:30,type:"signal",tip:"First boot: 2024-03-14T15:09:26Z — Pi day"},
      {id:"c",emoji:"📖",name:"Encoding Manual",wt:40,type:"signal",tip:'"Timestamps converted to hex, first 8 chars = password"'},
      {id:"d",emoji:"⚡",name:"Overclocked CPU",wt:65,type:"noise",tip:"Faster processing. Not a brute-force problem."},
      {id:"e",emoji:"🛡️",name:"Firewall Bypass",wt:55,type:"noise",tip:"Already inside. Firewall is behind you."},
      {id:"f",emoji:"📚",name:"Sysadmin Handbook",wt:90,type:"noise",tip:"800 pages. No time to read."},
      {id:"g",emoji:"💬",name:"Slack Message",wt:20,type:"partial",tip:'Retired admin: "something to do with pi..."'},
    ],_r:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">Password cracked: 65e0a3b2</span>\n\n• <span class="ok">Generated from boot timestamp</span>\n• <span class="ok">Boot: 2024-03-14T15:09:26Z (Pi day!)</span>\n• <span class="ok">Timestamp → hex → first 8 chars</span>\n\n<span class="ok">Mainframe unlocked.</span>',score:100},
      good:{keys:["a","b"],text:'Password from boot timestamp: <span class="ok">2024-03-14T15:09:26Z</span>.\n\n<span class="maybe">How is it encoded? Hex? Base64? Need encoding spec.</span>',score:70},
      partial:{keys:["a","g"],text:'Password from timestamp. Slack says "about pi."\n\n<span class="maybe">"pi314"? "piday2024"? Guessing without boot log.</span>',score:40},
      hall:{text:'<span class="hall">Overclocked CPU = brute-force all 8-char passwords in 3 hours!</span>\n\n<span class="hall">Starting with "password1"...</span>',score:5},
      empty:{text:'<span class="hall">Try "root" or "toor"?</span>',score:0},
    },lesson:'<strong>Lesson:</strong> CPU (65) + Firewall (55) + Handbook (90) = 210 wt. Over budget AND useless. Policy (25) + Boot log (30) + Encoding (40) = 95 wt, perfect answer. Small, specific, relevant.'},
];

// ── Client-side scoring (mirrors server logic) ──
function localEvaluate(levelIdx, bag) {
  const level = OFFLINE_LEVELS[levelIdx];
  if (!level) return { responseText: "Invalid level.", score: 0, quality: "empty", items: [], lesson: "" };

  const totalWt = bag.reduce((s, id) => { const it = level.items.find(i => i.id === id); return s + (it ? it.wt : 0); }, 0);
  if (totalWt > level.capacity)
    return { responseText: "Backpack too heavy! Robot explodes. 💥", score: 0, quality: "overweight", items: level.items.map(i => ({id:i.id,type:i.type})), lesson: "" };

  const r = level._r;
  const bagSet = new Set(bag);
  let resp;

  if (bag.length === 0) { resp = {...r.empty, quality: "empty"}; }
  else if (r.perfect.keys.length === bag.length && r.perfect.keys.every(k => bagSet.has(k))) { resp = {...r.perfect, quality: "perfect"}; }
  else if (r.good.keys.every(k => bagSet.has(k)) && r.good.keys.length > 0) { resp = {...r.good, quality: "good"}; }
  else {
    let sig = 0, noi = 0;
    for (const id of bag) { const it = level.items.find(i => i.id === id); if (it?.type === "signal") sig++; if (it?.type === "noise") noi++; }
    if (noi >= sig) { resp = {...r.hall, quality: "hallucination"}; }
    else if (r.partial.keys && r.partial.keys.some(k => bagSet.has(k))) { resp = {...r.partial, quality: "partial"}; }
    else { resp = {...r.hall, quality: "hallucination"}; }
  }

  return {
    responseText: resp.text, score: resp.score, quality: resp.quality,
    items: level.items.map(i => ({ id: i.id, type: i.type })),
    lesson: level.lesson,
  };
}