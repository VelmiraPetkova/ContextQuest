// Context Quest — Frontend with Login & Leaderboard

const $ = (s) => document.querySelector(s);
const game = $("#game");

let levels = [];
let player = null; // {playerId, name}
let state = { screen: "login", level: 0, bag: [], scores: [], phase: "pick", lastResult: null };

// ── API helpers ──

const api = {
  get: (url) => fetch(url).then((r) => r.json()),
  post: (url, body) => fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json()),
};

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

// ── LOGIN: Elvish Name Picker ──

async function renderLogin() {
  // Check localStorage for returning player
  const saved = localStorage.getItem("cq_player");
  if (saved) {
    player = JSON.parse(saved);
    state.screen = "intro";
    levels = await api.get("/api/levels");
    render();
    return;
  }

  game.innerHTML = `
    <div class="screen show">
      <div style="font-size:64px;margin-bottom:8px">🧝</div>
      <div class="hdr"><h1>Choose Your Name</h1></div>
      <p>Every adventurer needs an elvish name. Pick one — this is how you'll appear on the leaderboard.</p>
      <div id="name-options" style="display:flex;flex-direction:column;gap:8px;max-width:320px;margin:0 auto 16px">
        <div class="bp-empty">Loading names...</div>
      </div>
      <button class="btn btn-clear" onclick="refreshNames()" style="max-width:200px;margin:0 auto 12px;display:block">🎲 Roll new names</button>
      <div style="text-align:center;margin-top:8px">
        <button class="btn btn-clear" onclick="showLeaderboardFromLogin()" style="max-width:200px;margin:0 auto">🏆 View Leaderboard</button>
      </div>
    </div>`;
  loadNames();
}

async function loadNames() {
  const names = await api.get("/api/names");
  const el = $("#name-options");
  if (!el) return;
  el.innerHTML = names.map((n) => `
    <button class="btn btn-go" onclick="pickName('${n.replace(/'/g, "\\'")}')" style="margin:0">${n}</button>
  `).join("");
}

async function refreshNames() { loadNames(); }

async function pickName(name) {
  const res = await api.post("/api/login", { name });
  player = { playerId: res.playerId, name: res.name };
  localStorage.setItem("cq_player", JSON.stringify(player));
  levels = await api.get("/api/levels");
  state.screen = "intro";
  render();
}

function showLeaderboardFromLogin() {
  state.screen = "leaderboard";
  state._returnTo = "login";
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
      <div style="margin-top:12px;text-align:center">
        <button class="btn btn-clear" onclick="state.screen='leaderboard';state._returnTo='intro';render()" style="max-width:180px;margin:0 auto">🏆 Leaderboard</button>
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

  const result = await api.post("/api/submit", { level: state.level, bag: state.bag });
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
    <div class="credit">Built for <a href="https://cloudnativedays.ro">CloudNativeDays Romania 2026</a></div>
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

  const [entries, stats] = await Promise.all([api.get("/api/leaderboard"), api.get("/api/stats")]);

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
