
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

// ── Game Levels (public = no responses) ──
const LEVELS = [
  {
    tag:"LEVEL 1 — THE CAVE",title:"The Locked Door",
    desc:"A door blocks your path. Symbols are carved into it.",
    goal:"Open the ancient door",heroEmoji:"🧙",capacity:150,
    items:[
      {id:"a",emoji:"🗺️",name:"Symbol Map",wt:40,type:"signal",tip:"Maps each symbol to a meaning"},
      {id:"b",emoji:"🔮",name:"Crystal Ball",wt:50,type:"noise",tip:"Shows your horoscope"},
      {id:"c",emoji:"📜",name:"Door Inscription",wt:35,type:"signal",tip:"The actual symbols on the door"},
      {id:"d",emoji:"⚔️",name:"Rusty Sword",wt:60,type:"noise",tip:"Good for fighting, useless for reading"},
      {id:"e",emoji:"📖",name:"Wizard's Notes",wt:40,type:"signal",tip:"Sequence matters — read left to right"},
      {id:"f",emoji:"🧪",name:"Potion Recipes",wt:55,type:"noise",tip:"46 potion recipes, none about doors"},
    ],
    responses:{
      perfect:{keys:["a","c","e"],text:'<span class="ok">Deciphered!</span> Reading left-to-right:\n\n"Speak the name of the mountain at dawn."\n\n<span class="ok">The door rumbles open.</span>',score:100},
      good:{keys:["a","c"],text:'<span class="ok">I can read the symbols.</span> "Speak the name of the mountain..."\n\n<span class="maybe">Not sure of the reading order.</span>',score:65},
      partial:{keys:["c"],text:'I see symbols but <span class="maybe">without a key, I can\'t decode them.</span>',score:30},
      hallucination:{keys:["b","d"],text:'<span class="hall">The crystal ball says doors open on Tuesdays!</span>',score:5},
      empty:{keys:[],text:'<span class="hall">Try "Open Sesame"?</span>',score:0},
    },
    lesson:'<strong>Lesson:</strong> A sword and crystal ball are powerful — but useless for reading. Context engineering = right data for the right problem.',
  },
  {
    tag:"LEVEL 2 — THE FOREST",title:"The Poisoned River",
    desc:"The river glows green. Gather clues to find the source.",
    goal:"Identify the poison source and cure the river",heroEmoji:"🧝",capacity:180,
    items:[
      {id:"a",emoji:"💧",name:"Water Sample",wt:30,type:"signal",tip:"Sulfur + herbs"},
      {id:"b",emoji:"🌿",name:"Herb Guide",wt:45,type:"signal",tip:"Nightshade matches sulfur"},
      {id:"c",emoji:"🗺️",name:"River Map",wt:50,type:"signal",tip:"Witch's hut upstream"},
      {id:"d",emoji:"🦴",name:"Animal Bones",wt:40,type:"partial",tip:"Dead fish near tributary"},
      {id:"e",emoji:"📚",name:"History of the Forest",wt:80,type:"noise",tip:"300-page book. Very heavy."},
      {id:"f",emoji:"🧲",name:"Magic Compass",wt:35,type:"noise",tip:"Points north. Irrelevant."},
    ],
    responses:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">Found it.</span> Nightshade potion waste from <span class="ok">witch\'s hut upstream</span>.\n\n<span class="ok">Cure: charcoal filtration.</span>',score:100},
      good:{keys:["a","b"],text:'<span class="ok">Nightshade + sulfur</span> — potion waste.\n\n<span class="maybe">Where from? Need a map.</span>',score:65},
      partial:{keys:["a","d"],text:'Contaminated. Dead fish confirm upstream.\n\n<span class="maybe">Can\'t identify compound without reference.</span>',score:35},
      hallucination:{keys:["e","f"],text:'<span class="hall">History says cursed by a dragon.</span>\n\n<span class="hall">Try a fire spell?</span>',score:5},
      empty:{keys:[],text:'<span class="hall">Try boiling the water?</span>',score:0},
    },
    lesson:'<strong>Lesson:</strong> History book (80 wt!) = zero value. Water (30) + herbs (45) + map (50) = 125 wt, complete answer. Heavy ≠ valuable.',
  },
  {
    tag:"LEVEL 3 — THE CASTLE",title:"The Stolen Crown",
    desc:"Crown vanished at the feast. Pick evidence.",
    goal:"Identify the thief",heroEmoji:"🕵️",capacity:200,
    items:[
      {id:"a",emoji:"👁️",name:"Guard's Testimony",wt:35,type:"signal",tip:"Only the Duke left"},
      {id:"b",emoji:"🧤",name:"Glove (found)",wt:30,type:"signal",tip:"Duke's crest at vault"},
      {id:"c",emoji:"🔑",name:"Vault Lock Report",wt:40,type:"signal",tip:"Lock picked"},
      {id:"d",emoji:"📋",name:"Guest List",wt:50,type:"partial",tip:"48 guests, 4 near vault"},
      {id:"e",emoji:"🍷",name:"Wine Menu",wt:45,type:"noise",tip:"Burgundy was excellent."},
      {id:"f",emoji:"🎵",name:"Music Playlist",wt:40,type:"noise",tip:"Bard played 8 songs."},
      {id:"g",emoji:"💎",name:"Duke's Debt Record",wt:40,type:"signal",tip:"10,000 gold due next week"},
    ],
    responses:{
      perfect:{keys:["a","b","c","g"],text:'<span class="ok">The Duke stole the crown.</span>\n\n• <span class="ok">Only one who left</span>\n• <span class="ok">Glove at vault</span>\n• <span class="ok">Lock picked</span>\n• <span class="ok">10,000 gold motive</span>',score:100},
      good:{keys:["a","b","c"],text:'Strong case: <span class="ok">the Duke</span>.\n\n<span class="maybe">What\'s his motive?</span>',score:70},
      partial:{keys:["a","d"],text:'Duke left. <span class="maybe">Need physical evidence.</span>',score:35},
      hallucination:{keys:["e","f"],text:'<span class="hall">Wine was drugged! Song #5 was the signal!</span>',score:5},
      empty:{keys:[],text:'<span class="hall">Usually the jester.</span>',score:0},
    },
    lesson:'<strong>Lesson:</strong> Wine + music = 85 wt, zero evidence. Debt record (40 wt) completed the chain.',
  },
  {
    tag:"LEVEL 4 — THE SKY",title:"The Falling Airship",
    desc:"Engine sputters. Fix it mid-flight.",
    goal:"Diagnose engine failure",heroEmoji:"👩‍🔧",capacity:200,
    items:[
      {id:"a",emoji:"📊",name:"Engine Gauges",wt:35,type:"signal",tip:"Pressure LOW, steam intermittent"},
      {id:"b",emoji:"🔧",name:"Maintenance Log",wt:45,type:"signal",tip:"Model B valve instead of A"},
      {id:"c",emoji:"📐",name:"Engine Blueprint",wt:50,type:"signal",tip:"A=200PSI, B=120PSI"},
      {id:"d",emoji:"🌤️",name:"Weather Report",wt:60,type:"noise",tip:"Partly cloudy, 15 knots"},
      {id:"e",emoji:"📦",name:"Cargo Manifest",wt:55,type:"noise",tip:"3,200 lbs cargo"},
      {id:"f",emoji:"🧰",name:"Spare Parts List",wt:40,type:"partial",tip:"2x Model A valves on board"},
    ],
    responses:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">Found it.</span> <span class="ok">Model B valve (120 PSI) can\'t handle 200 PSI.</span>\n\n<span class="ok">Swap Model A valve. 15 min fix.</span>',score:100},
      good:{keys:["a","b"],text:'<span class="ok">Low pressure + wrong valve.</span>\n\n<span class="maybe">Need specs to confirm PSI.</span>',score:65},
      partial:{keys:["a","f"],text:'Pressure low. Parts available.\n\n<span class="maybe">WHY is it low? Need maintenance log.</span>',score:35},
      hallucination:{keys:["d","e"],text:'<span class="hall">Headwind + cargo = too much drag. Dump the books!</span>',score:5},
      empty:{keys:[],text:'<span class="hall">Increase throttle.</span>',score:0},
    },
    lesson:'<strong>Lesson:</strong> Weather (60) + cargo (55) = red herrings. Maintenance log (45 wt) was the smoking gun.',
  },
  {
    tag:"LEVEL 5 — THE FINAL DUNGEON",title:"The Dragon's Riddle",
    desc:"Answer correctly or become toast.",
    goal:'Answer: "What is my true name?"',heroEmoji:"⚔️",capacity:180,
    items:[
      {id:"a",emoji:"🐉",name:"Dragon's Scale",wt:25,type:"signal",tip:'"I am called by what I protect"'},
      {id:"b",emoji:"💎",name:"Treasure Inventory",wt:30,type:"signal",tip:"Guards: The Starfire Gem"},
      {id:"c",emoji:"📖",name:"Naming Lore",wt:40,type:"signal",tip:"Dragons take treasure's name"},
      {id:"d",emoji:"🗡️",name:"Legendary Sword",wt:65,type:"noise",tip:"Dragon said NO FIGHTING."},
      {id:"e",emoji:"🛡️",name:"Fire Shield",wt:55,type:"noise",tip:"Won't help if wrong."},
      {id:"f",emoji:"📚",name:"Dragon Encyclopedia",wt:90,type:"noise",tip:"500 pages. Way too heavy."},
      {id:"g",emoji:"👤",name:"Hermit's Whisper",wt:20,type:"partial",tip:"Stars and fire..."},
    ],
    responses:{
      perfect:{keys:["a","b","c"],text:'<span class="ok">The dragon\'s name is Starfire.</span>\n\n• <span class="ok">"Called by what I protect"</span>\n• <span class="ok">The Starfire Gem</span>\n• <span class="ok">Dragons take treasure\'s name</span>\n\n<span class="ok">The dragon bows. You pass.</span>',score:100},
      good:{keys:["a","b"],text:'Protects <span class="ok">Starfire Gem</span> → <span class="ok">"Starfire"</span>.\n\n<span class="maybe">Without lore, not 100% sure.</span>',score:70},
      partial:{keys:["a","g"],text:'Stars and fire... <span class="maybe">"Starfire"? Guessing.</span>',score:40},
      hallucination:{keys:["d","e","f"],text:'<span class="hall">Encyclopedia says "Ignis." Fight if wrong.</span>',score:5},
      empty:{keys:[],text:'<span class="hall">Try "Smaug"?</span>',score:0},
    },
    lesson:'<strong>Lesson:</strong> Sword + Shield + Encyclopedia = 210 wt, over budget AND useless. Scale + Treasure + Lore = 95 wt, perfect answer. That\'s context engineering.',
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