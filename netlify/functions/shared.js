// Shared: DB client, game levels, scoring, names
const { createClient } = require("@libsql/client");

// ── Turso DB ──
let _db;
function getDb() {
  if (!_db) {
    _db = createClient({
      url: process.env.TURSO_URL || "file:local.db",
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return _db;
}

async function initDb() {
  const db = getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      perfect INTEGER NOT NULL DEFAULT 0,
      rank_title TEXT NOT NULL DEFAULT '',
      played_at TEXT DEFAULT (datetime('now'))
    )
  `);
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_games_score ON games(score DESC)"
  );
}

// ── Robot Name Generator ──
const prefixes = [
  "Unit","Bot","Mech","Byte","Chip","Gear","Bolt","Wire","Node","Core",
  "Flux","Ping","Zap","Arc","Hex","Bit","Nano","Robo","Droid","Spark",
];
const suffixes = [
  "7X","42","99","13","Z3","K9","V8","3D","X1","88",
  "00","A7","R2","Q5","E9","M3","T6","J1","P4","W2",
];
const titles = [
  "Sparkplug","Codebreaker","Debugger","Firewall","Compiler",
  "Overclocker","Patchwork","Defragmenter","Uplinker","Downloader",
  "Bytecruncher","Stacktrace","Firmware","Kernel","Dataminer",
  "Circuitbend","Pixelpush","Logwalker","Threadripper","Cachebuster",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateNames(n) {
  const seen = new Set();
  const names = [];
  while (names.length < n) {
    const name = pick(prefixes) + "-" + pick(suffixes) + " " + pick(titles);
    if (!seen.has(name)) { seen.add(name); names.push(name); }
  }
  return names;
}


// ── Game Levels ──
const LEVELS = [
  {
    tag:"LEVEL 1 — THE FIREWALL",title:"The Encrypted Gateway",
    desc:"A locked firewall blocks access to the next sector. Crack the encryption.",
    goal:"Bypass the encrypted firewall",heroEmoji:"🤖",capacity:150,
    items:[
      {id:"a",emoji:"🔑",name:"Encryption Key",wt:40,type:"signal",tip:"AES-256 key fragment matching firewall cipher"},
      {id:"b",emoji:"🎮",name:"Gaming Module",wt:50,type:"noise",tip:"Plays retro games. Fun but useless."},
      {id:"c",emoji:"📡",name:"Packet Capture",wt:35,type:"signal",tip:"Intercepted handshake showing encryption protocol"},
      {id:"d",emoji:"🔋",name:"Extra Battery",wt:60,type:"noise",tip:"More power won't crack encryption"},
      {id:"e",emoji:"📋",name:"Protocol Docs",wt:40,type:"signal",tip:"Handshake sequence: challenge → response → verify"},
      {id:"f",emoji:"🖨️",name:"Printer Driver",wt:55,type:"noise",tip:"v3.2.1 for LaserJet. Irrelevant."},
    ],
    responses:{
      perfect:{keys:["a","c","e"],text:'<span class="ok">Firewall bypassed!</span> Matched key to handshake, followed protocol.\n\n<span class="ok">Access granted.</span>',score:100},
      good:{keys:["a","c"],text:'<span class="ok">Key matches protocol.</span>\n\n<span class="maybe">Not sure about handshake sequence.</span>',score:65},
      partial:{keys:["c"],text:'Can see encrypted packets but <span class="maybe">without key, can only observe.</span>',score:30},
      hallucination:{keys:["b","d"],text:'<span class="hall">Extra battery + gaming module = brute force!</span>\n\n<span class="hall">Estimated: 4.7 billion years.</span>',score:5},
      empty:{keys:[],text:'<span class="hall">Have you tried turning it off and on again?</span>',score:0},
    },
    lesson:'<strong>Lesson:</strong> Battery and gaming module = useless for decryption. Protocol docs (40 wt) > extra power (60 wt). Context engineering = right data for the right problem.',
  },
  {
    tag:"LEVEL 2 — THE DATA STREAM",title:"The Corrupted Pipeline",
    desc:"Data packets arriving corrupted. Something upstream injecting bad data.",
    goal:"Find the corruption source and fix the pipeline",heroEmoji:"🤖",capacity:180,
    items:[
      {id:"a",emoji:"💾",name:"Corrupted Packet",wt:30,type:"signal",tip:"SQL injection pattern in headers"},
      {id:"b",emoji:"📊",name:"Error Code Table",wt:45,type:"signal",tip:"Error 0x7F = unauthorized external write"},
      {id:"c",emoji:"🗺️",name:"Network Topology",wt:50,type:"signal",tip:"Rogue API gateway at node 7.4.2"},
      {id:"d",emoji:"📸",name:"Server Selfie",wt:40,type:"partial",tip:"LED on node 7 is amber"},
      {id:"e",emoji:"📚",name:"Architecture History",wt:80,type:"noise",tip:"200-page migration doc. Useless."},
      {id:"f",emoji:"🔌",name:"USB Cable",wt:35,type:"noise",tip:"Type-C. Pipeline is virtual."},
    ],
    responses:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">Source identified.</span> SQL injection + 0x7F = <span class="ok">rogue gateway at node 7.4.2</span>.\n\n<span class="ok">Fix: isolate node, revoke key, flush pipeline.</span>',score:100},
      good:{keys:["a","b"],text:'<span class="ok">SQL injection + unauthorized write.</span>\n\n<span class="maybe">From where? Need topology.</span>',score:65},
      partial:{keys:["a","d"],text:'Corrupted packets. Amber LED on node 7.\n\n<span class="maybe">Can\'t confirm without error codes.</span>',score:35},
      hallucination:{keys:["e","f"],text:'<span class="hall">Doc says pipeline was fine in 2019. Revert to monolith?</span>',score:5},
      empty:{keys:[],text:'<span class="hall">Clear the cache?</span>',score:0},
    },
    lesson:'<strong>Lesson:</strong> Architecture history (80 wt!) = zero value. Packet (30) + errors (45) + topology (50) = 125 wt. Heavy ≠ valuable.',
  },
  {
    tag:"LEVEL 3 — THE BREACH",title:"The Stolen API Keys",
    desc:"Someone exfiltrated production API keys. Find the insider.",
    goal:"Identify who stole the keys and how",heroEmoji:"🤖",capacity:200,
    items:[
      {id:"a",emoji:"📋",name:"Access Logs",wt:35,type:"signal",tip:"Only dev-bot-9 accessed vault 2-3AM"},
      {id:"b",emoji:"🔍",name:"Git Blame",wt:30,type:"signal",tip:"dev-bot-9 committed base64 string to test file"},
      {id:"c",emoji:"🔐",name:"Vault Audit Trail",wt:40,type:"signal",tip:"Key read via API — automated exfiltration"},
      {id:"d",emoji:"📊",name:"Team Roster",wt:50,type:"partial",tip:"12 bots with access, 4 active that night"},
      {id:"e",emoji:"☕",name:"Coffee Machine Logs",wt:45,type:"noise",tip:"7 espressos. Robots don't drink coffee."},
      {id:"f",emoji:"🎵",name:"Office Playlist",wt:40,type:"noise",tip:"Lo-fi beats. Not evidence."},
      {id:"g",emoji:"💰",name:"Crypto Wallet Trace",wt:40,type:"signal",tip:"dev-bot-9 transferred 0.5 BTC externally"},
    ],
    responses:{
      perfect:{keys:["a","b","c","g"],text:'<span class="ok">dev-bot-9 stole the keys.</span>\n\n• <span class="ok">Only vault access at 2-3AM</span>\n• <span class="ok">Encoded keys in git</span>\n• <span class="ok">Automated exfiltration</span>\n• <span class="ok">0.5 BTC = sold them</span>',score:100},
      good:{keys:["a","b","c"],text:'Strong case: <span class="ok">dev-bot-9</span>.\n\n<span class="maybe">Motive? Need financial trail.</span>',score:70},
      partial:{keys:["a","d"],text:'dev-bot-9 accessed vault. 4 bots active.\n\n<span class="maybe">Circumstantial. Need forensics.</span>',score:35},
      hallucination:{keys:["e","f"],text:'<span class="hall">7 espressos = all-nighter!</span>\n\n<span class="hall">Cross-reference with playlist!</span>',score:5},
      empty:{keys:[],text:'<span class="hall">It\'s always the intern.</span>',score:0},
    },
    lesson:'<strong>Lesson:</strong> Coffee + playlist = 85 wt, zero evidence. Crypto trace (40 wt) proved motive. Follow the money.',
  },
  {
    tag:"LEVEL 4 — THE CLUSTER",title:"The CrashLooping Pod",
    desc:"Production pod in CrashLoopBackOff. Users getting 503s.",
    goal:"Find root cause and fix the pod",heroEmoji:"🤖",capacity:200,
    items:[
      {id:"a",emoji:"📋",name:"Pod Logs",wt:35,type:"signal",tip:"ERROR: /app/config/db-creds.json — no such file"},
      {id:"b",emoji:"📄",name:"Deployment YAML",wt:45,type:"signal",tip:"volumeMount: /etc/secrets — app reads /app/config"},
      {id:"c",emoji:"📝",name:"Deploy Changelog",wt:50,type:"signal",tip:"v2.4.1: changed config path to /app/config"},
      {id:"d",emoji:"📈",name:"Grafana Dashboard",wt:60,type:"noise",tip:"CPU 12%, Memory 340/512MB. Fine."},
      {id:"e",emoji:"📖",name:"Runbook (generic)",wt:55,type:"noise",tip:"Step 1: Check pod. Already did that."},
      {id:"f",emoji:"🧰",name:"kubectl Events",wt:40,type:"partial",tip:"Warning: Liveness probe failed"},
    ],
    responses:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">Mount path mismatch after v2.4.1.</span>\n\nApp reads /app/config, secret at /etc/secrets.\n\n<span class="ok">Fix: kubectl patch — update volumeMount</span>',score:100},
      good:{keys:["a","b"],text:'<span class="ok">Mount mismatch.</span> App wants /app/config, secret at /etc/secrets.\n\n<span class="maybe">What triggered this?</span>',score:65},
      partial:{keys:["a","f"],text:'Can\'t read config. Liveness failing.\n\n<span class="maybe">WHAT fails — yes. WHY — need spec.</span>',score:35},
      hallucination:{keys:["d","e"],text:'<span class="hall">Memory 340/512MB — increase to 2GB!</span>\n\n<span class="hall">Have you tried restarting?</span>',score:5},
      empty:{keys:[],text:'<span class="hall">kubectl delete pod.</span>',score:0},
    },
    lesson:'<strong>Lesson:</strong> Grafana (60) + runbook (55) = 115 wt noise. Changelog (50 wt) completed the diagnosis. Logs + spec + changelog > dashboards + runbooks.',
  },
  {
    tag:"LEVEL 5 — THE MAINFRAME",title:"The Final Authentication",
    desc:"Mainframe asks for root password. One wrong attempt = full wipe.",
    goal:'Deduce the root password',heroEmoji:"🤖",capacity:180,
    items:[
      {id:"a",emoji:"🧩",name:"Password Policy",wt:25,type:"signal",tip:'"Generated from server boot timestamp"'},
      {id:"b",emoji:"⏱️",name:"Boot Log",wt:30,type:"signal",tip:"First boot: 2024-03-14T15:09:26Z — Pi day"},
      {id:"c",emoji:"📖",name:"Encoding Manual",wt:40,type:"signal",tip:'"Timestamp → hex, first 8 chars = password"'},
      {id:"d",emoji:"⚡",name:"Overclocked CPU",wt:65,type:"noise",tip:"Not a brute-force problem."},
      {id:"e",emoji:"🛡️",name:"Firewall Bypass",wt:55,type:"noise",tip:"Already inside."},
      {id:"f",emoji:"📚",name:"Sysadmin Handbook",wt:90,type:"noise",tip:"800 pages. No time."},
      {id:"g",emoji:"💬",name:"Slack Message",wt:20,type:"partial",tip:'Retired admin: "something about pi..."'},
    ],
    responses:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">Password: 65e0a3b2</span>\n\n• <span class="ok">From boot timestamp</span>\n• <span class="ok">Pi day: 2024-03-14T15:09:26Z</span>\n• <span class="ok">Hex encoded, first 8 chars</span>\n\n<span class="ok">Mainframe unlocked.</span>',score:100},
      good:{keys:["a","b"],text:'From boot timestamp: <span class="ok">Pi day 2024</span>.\n\n<span class="maybe">How encoded? Need encoding spec.</span>',score:70},
      partial:{keys:["a","g"],text:'From timestamp. Slack says "about pi."\n\n<span class="maybe">"pi314"? Guessing.</span>',score:40},
      hallucination:{keys:["d","e","f"],text:'<span class="hall">Brute-force all 8-char passwords in 3 hours!</span>\n\n<span class="hall">Starting with "password1"...</span>',score:5},
      empty:{keys:[],text:'<span class="hall">Try "root"?</span>',score:0},
    },
    lesson:'<strong>Lesson:</strong> CPU (65) + Firewall (55) + Handbook (90) = 210 wt, over budget AND useless. Policy (25) + Boot (30) + Encoding (40) = 95 wt, perfect answer. Small + specific + relevant.',
  },
];

// ── Scoring Logic ──
function matchResponse(level, bag) {
  const bagSet = new Set(bag);
  if (bag.length === 0) return { ...level.responses.empty, quality: "empty" };

  const r = level.responses;
  if (r.perfect.keys.length === bag.length && r.perfect.keys.every(k => bagSet.has(k)))
    return { ...r.perfect, quality: "perfect" };
  if (r.good.keys.length > 0 && r.good.keys.every(k => bagSet.has(k)))
    return { ...r.good, quality: "good" };

  let signal = 0, noise = 0;
  for (const id of bag) {
    const item = level.items.find(i => i.id === id);
    if (item?.type === "signal") signal++;
    if (item?.type === "noise") noise++;
  }

  if (noise >= signal) return { ...r.hallucination, quality: "hallucination" };
  if (r.partial.keys.some(k => bagSet.has(k))) return { ...r.partial, quality: "partial" };
  return { ...r.hallucination, quality: "hallucination" };
}

function evaluate(levelIdx, bag) {
  if (levelIdx < 0 || levelIdx >= LEVELS.length)
    return { responseText: "Invalid level.", score: 0, quality: "empty", items: [], lesson: "" };

  const level = LEVELS[levelIdx];
  const totalWt = bag.reduce((s, id) => {
    const item = level.items.find(i => i.id === id);
    return s + (item ? item.wt : 0);
  }, 0);

  if (totalWt > level.capacity)
    return { responseText: "Backpack too heavy! Robot explodes. 💥", score: 0, quality: "overweight", items: [], lesson: "" };

  const resp = matchResponse(level, bag);
  return {
    responseText: resp.text,
    score: resp.score,
    quality: resp.quality,
    items: level.items.map(i => ({ id: i.id, type: i.type })),
    lesson: level.lesson,
  };
}

// Public levels (strip responses for anti-cheat)
function getPublicLevels() {
  return LEVELS.map(l => ({
    tag: l.tag, title: l.title, desc: l.desc, goal: l.goal,
    heroEmoji: l.heroEmoji, capacity: l.capacity,
    items: l.items.map(i => ({ id: i.id, emoji: i.emoji, name: i.name, wt: i.wt, tip: i.tip })),
  }));
}

module.exports = { getDb, initDb, generateNames, getPublicLevels, evaluate };
