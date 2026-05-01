// Context Quest v4 — 3 missions × 2 questions + narrative
const $=s=>document.querySelector(s);
const game=$("#game");
let player=null;
let state={screen:"login",mission:0,step:0,clean:0,noise:0,results:[],totalClean:0,totalNoise:0};

const api={
  get:u=>fetch(u).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}),
  post:(u,b)=>fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}),
};
const _pre=["Unit","Bot","Mech","Byte","Chip","Gear","Bolt","Wire","Node","Core","Flux","Ping","Zap","Arc","Hex","Bit","Nano","Robo","Droid","Spark"];
const _suf=["7X","42","99","13","Z3","K9","V8","3D","X1","88","00","A7","R2","Q5","E9","M3","T6","J1","P4","W2"];
const _ttl=["Sparkplug","Codebreaker","Debugger","Firewall","Compiler","Overclocker","Patchwork","Uplinker","Downloader","Bytecruncher","Stacktrace","Firmware","Kernel","Dataminer","Circuitbend","Pixelpush","Logwalker","Threadripper","Cachebuster","Defragmenter"];
function _pk(a){return a[Math.floor(Math.random()*a.length)]}
function genNames(n){const s=new Set(),r=[];while(r.length<n){const nm=_pk(_pre)+"-"+_pk(_suf)+" "+_pk(_ttl);if(!s.has(nm)){s.add(nm);r.push(nm);}}return r;}

function tankBar(clean,noise,max){
  const cp=Math.round(clean/max*100),np=Math.round(noise/max*100),fp=Math.max(0,100-cp-np);
  return`<div style="margin:14px 0">
    <div style="display:flex;justify-content:space-between;font-family:'Silkscreen',cursive;font-size:9px;margin-bottom:4px">
      <span style="color:var(--green)">🟢 Signal ${cp}%</span>
      <span style="color:var(--dim)">CONTEXT PACK</span>
      <span style="color:var(--red)">Noise ${np}% 🔴</span>
    </div>
    <div style="height:18px;background:var(--surface);border:2px solid var(--border);border-radius:10px;overflow:hidden;display:flex">
      <div style="width:${cp}%;background:linear-gradient(90deg,#2ea043,#3fb950);transition:width .6s ease"></div>
      <div style="width:${np}%;background:linear-gradient(90deg,#da3633,#f85149);transition:width .6s ease"></div>
    </div>
    ${np>=50?'<div style="font-size:10px;color:var(--red);margin-top:4px;text-align:center;animation:blink 1s infinite">⚠️ Context pack destabilizing!</div>':''}
  </div>`;
}

function render(){({login:renderLogin,intro:renderIntro,narrative:renderNarrative,play:renderPlay,feedback:renderFeedback,explode:renderExplode,missionEnd:renderMissionEnd,end:renderEnd,leaderboard:renderLeaderboard,howto:renderHowTo}[state.screen]||renderLogin)();renderPips();}
function renderPips(){const el=$("#progress");if(!el)return;el.innerHTML=MISSIONS.map((_,i)=>{let c="";if(i<state.mission)c=(state.results[i]&&state.results[i].clean>state.results[i].noise)?"done":"fail";else if(i===state.mission&&["play","narrative","feedback"].includes(state.screen))c="active";return`<div class="prog-pip ${c}"></div>`}).join("");}

// ── Login ──
async function renderLogin(){
  const saved=localStorage.getItem("cq_player");
  if(saved){player=JSON.parse(saved);state.screen="intro";render();return;}
  game.innerHTML=`<div class="screen show">
    <div class="robot-wrap" style="margin:0 auto 12px"><div class="robot walk"></div></div>
    <div class="hdr"><h1>Choose Your Designation</h1></div>
    <p>Pick a name for the leaderboard.</p>
    <div id="names" style="display:flex;flex-direction:column;gap:8px;max-width:320px;margin:0 auto 16px"></div>
    <button class="btn btn-clear" onclick="loadNames()" style="max-width:200px;margin:0 auto 12px;display:block">🎲 Reroll</button>
  </div>`;
  loadNames();
}
function loadNames(){const el=$("#names");if(!el)return;el.innerHTML=genNames(4).map(n=>`<button class="btn btn-go" onclick="pickName('${n.replace(/'/g,"\\'")}')" style="margin:0">${n}</button>`).join("");}
async function pickName(name){let id="local-"+Math.random().toString(36).slice(2);try{const r=await api.post("/api/login",{name});id=r.playerId}catch(e){}player={playerId:id,name};localStorage.setItem("cq_player",JSON.stringify(player));state.screen="intro";render();}

// ── Intro ──
function renderIntro(){
  game.innerHTML=`<div class="screen show">
    <div class="robot-wrap" style="margin:0 auto 12px"><div class="robot walk"></div></div>
    <div class="hdr"><h1>Hey, ${player?player.name.split(" ")[0]:"Robot"}!</h1></div>
    <p style="font-size:15px;max-width:420px;margin:0 auto 12px;line-height:1.6">
      You're a DevOps robot on a mission. At each step you'll face a choice — <span style="color:var(--green)">right choices</span> add signal, <span style="color:var(--red)">wrong ones</span> add noise.
    </p>
    <p style="font-size:13px;color:var(--dim);max-width:380px;margin:0 auto 20px">Too much noise and your system overloads. 💥<br>3 missions. ~5 minutes. Let's go.</p>
    <button class="btn btn-go" onclick="startGame()" style="max-width:220px;margin:0 auto">🚀 Start Mission →</button>
    <div style="display:flex;gap:8px;max-width:340px;margin:12px auto 0">
      <button class="btn btn-clear" onclick="state.screen='howto';render()" style="flex:1">❓ How</button>
      <button class="btn btn-clear" onclick="state.screen='leaderboard';state._ret='intro';render()" style="flex:1">🏆 Board</button>
      <button class="btn btn-clear" onclick="localStorage.removeItem('cq_player');player=null;state.screen='login';render()" style="flex:1">🔄 Name</button>
    </div>
  </div>`;
}
function renderHowTo(){
  game.innerHTML=`<div class="screen show">
    <div class="hdr"><h1>How It Works</h1></div>
    <div class="rules" style="max-width:400px">
      <div class="rule"><span class="rule-i">📖</span>You'll see a real DevOps scenario</div>
      <div class="rule"><span class="rule-i">🤔</span>Make a choice — what would you do?</div>
      <div class="rule"><span class="rule-i">🟢</span>Good choice = signal in your context pack</div>
      <div class="rule"><span class="rule-i">🔴</span>Bad choice = noise (the AI gets confused)</div>
      <div class="rule"><span class="rule-i">💥</span>Too much noise = system overload!</div>
    </div>
    <button class="btn btn-clear" onclick="state.screen='intro';render()" style="max-width:200px;margin:0 auto">← Back</button>
  </div>`;
}
function startGame(){state={screen:"narrative",mission:0,step:0,clean:0,noise:0,results:[],totalClean:0,totalNoise:0};render();}

// ── Narrative (story beat between questions) ──
function renderNarrative(){
  const M=MISSIONS[state.mission];if(!M)return;
  const S=M.steps[state.step];if(!S)return;
  const packMax=M.steps.length*25;

  game.innerHTML=`<div class="card" style="animation:slideUp .4s ease">
    <div style="font-family:'Silkscreen',cursive;font-size:10px;color:var(--gold);letter-spacing:.12em;margin-bottom:6px">${M.tag}</div>
    <div class="scene-title" style="margin-bottom:14px">${M.title}</div>

    <div style="background:var(--surface);border-left:3px solid var(--gold);padding:14px 16px;border-radius:0 10px 10px 0;margin-bottom:16px">
      <div style="font-size:13px;line-height:1.7;color:var(--text)">${S.narrative}</div>
    </div>

    ${S.context?`<div style="background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px 14px;margin-bottom:16px;font-family:'Space Mono',monospace;font-size:11px;line-height:1.6;color:#c9d1d9;white-space:pre-wrap">${S.context}</div>`:''}

    ${tankBar(state.clean,state.noise,packMax)}

    <button class="btn btn-go" onclick="state.screen='play';render()" style="max-width:260px;margin:0 auto">${S.actionLabel||'What do you do? →'}</button>
  </div>`;
}

// ── Play (choice) ──
function renderPlay(){
  const M=MISSIONS[state.mission];
  const S=M.steps[state.step];
  const packMax=M.steps.length*25;

  game.innerHTML=`<div class="card" style="animation:slideUp .3s ease">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div style="font-family:'Silkscreen',cursive;font-size:10px;color:var(--gold)">${M.tag}</div>
      <div style="font-family:'Silkscreen',cursive;font-size:10px;color:var(--dim)">Step ${state.step+1}/${M.steps.length}</div>
    </div>

    <div style="font-size:15px;font-weight:700;margin-bottom:16px;color:var(--text);line-height:1.4">${S.question}</div>

    <div style="display:flex;flex-direction:column;gap:8px">
      ${S.options.map((opt,i)=>`<button class="btn btn-clear" onclick="answer(${i})" style="text-align:left;padding:14px 16px;font-size:13px;line-height:1.4;justify-content:flex-start">
        <span style="font-family:'Silkscreen',cursive;font-size:11px;color:var(--gold);margin-right:10px;min-width:20px">${String.fromCharCode(65+i)}</span>${opt.text}
      </button>`).join("")}
    </div>

    ${tankBar(state.clean,state.noise,packMax)}
  </div>`;
}

function answer(idx){
  const M=MISSIONS[state.mission];
  const S=M.steps[state.step];
  const opt=S.options[idx];
  state._last={correct:opt.correct,explanation:opt.explanation,result:opt.result};
  if(opt.correct){state.clean+=25}else{state.noise+=25}
  const packMax=M.steps.length*25;
  if(state.noise>=packMax){state.screen="explode";render();return;}
  state.screen="feedback";render();
}

// ── Feedback (narrative consequence) ──
function renderFeedback(){
  const a=state._last;
  const M=MISSIONS[state.mission];
  const packMax=M.steps.length*25;

  game.innerHTML=`<div class="card" style="animation:slideUp .3s ease">
    <div style="text-align:center;margin-bottom:14px">
      ${a.correct
        ?`<div style="font-size:32px">✅</div><div style="font-family:'Silkscreen',cursive;font-size:14px;color:var(--green);margin:6px 0">Signal Added</div>`
        :`<div style="font-size:32px">❌</div><div style="font-family:'Silkscreen',cursive;font-size:14px;color:var(--red);margin:6px 0">Noise Added</div>`
      }
    </div>

    <div style="background:var(--surface);border-left:3px solid ${a.correct?'var(--green)':'var(--red)'};padding:14px 16px;border-radius:0 10px 10px 0;margin-bottom:14px">
      <div style="font-size:13px;line-height:1.7;color:var(--text)">${a.result}</div>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:12px">
      <div style="font-family:'Silkscreen',cursive;font-size:8px;color:var(--gold);letter-spacing:.1em;margin-bottom:4px">💡 CONTEXT ENGINEERING</div>
      <div style="font-size:12px;line-height:1.5;color:var(--dim)">${a.explanation}</div>
    </div>

    ${tankBar(state.clean,state.noise,packMax)}

    <button class="btn btn-go" onclick="nextStep()" style="max-width:240px;margin:0 auto">Continue →</button>
  </div>`;
}

function nextStep(){
  state.step++;
  const M=MISSIONS[state.mission];
  if(state.step>=M.steps.length){state.screen="missionEnd";render();}
  else{state.screen="narrative";render();}
  window.scrollTo({top:0,behavior:"smooth"});
}

// ── Explode ──
function renderExplode(){
  game.innerHTML=`<div class="screen show" style="animation:slideUp .4s ease">
    <div class="robot-wrap" style="margin:0 auto 12px"><div class="robot explode"></div></div>
    <div style="font-size:48px;margin:12px 0">💥</div>
    <div class="hdr"><h1 style="color:var(--red)">System Overload!</h1></div>
    <p style="color:var(--dim)">Too much noise. The AI couldn't find the signal.</p>
    ${tankBar(state.clean,state.noise,MISSIONS[state.mission].steps.length*25)}
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px;margin:12px auto;max-width:400px;font-size:12px;color:var(--dim);line-height:1.5">
      <strong style="color:var(--gold)">Lesson:</strong> Wrong data doesn't just waste space — it actively confuses. A small, clean context beats a large, noisy one.
    </div>
    <button class="btn btn-go" onclick="retryMission()" style="max-width:220px;margin:0 auto">🔄 Retry Mission</button>
  </div>`;
}
function retryMission(){state.step=0;state.clean=0;state.noise=0;state.screen="narrative";render();}

// ── Mission End ──
function renderMissionEnd(){
  const M=MISSIONS[state.mission];
  const packMax=M.steps.length*25;
  const pct=Math.round(state.clean/packMax*100);
  const stars=pct>=80?3:pct>=50?2:1;
  state.results[state.mission]={clean:state.clean,noise:state.noise,stars};
  state.totalClean+=state.clean;state.totalNoise+=state.noise;
  const isLast=state.mission>=MISSIONS.length-1;

  game.innerHTML=`<div class="screen show" style="animation:slideUp .4s ease">
    <div class="robot-wrap" style="margin:0 auto 8px"><div class="robot celebrate"></div></div>
    <div class="hdr"><h1>Mission Complete!</h1></div>
    <p style="color:var(--dim)">${M.title}</p>
    <div style="font-size:32px;margin:8px 0">${'⭐'.repeat(stars)}${'☆'.repeat(3-stars)}</div>
    ${tankBar(state.clean,state.noise,packMax)}

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px;margin:12px auto;max-width:400px;font-size:12px;color:var(--dim);line-height:1.5">
      <strong style="color:var(--gold)">Key takeaway:</strong> ${M.lesson}
    </div>

    <button class="btn ${isLast?'btn-go':'btn-next'}" onclick="${isLast?'endGame()':'nextMission()'}" style="max-width:240px;margin:0 auto">${isLast?'See Final Score →':'Next Mission →'}</button>
  </div>`;
}
function nextMission(){state.mission++;state.step=0;state.clean=0;state.noise=0;state.screen="narrative";render();window.scrollTo({top:0,behavior:"smooth"});}

// ── End ──
async function endGame(){
  state.screen="end";
  const totalStars=state.results.reduce((s,a)=>s+(a?a.stars:0),0);
  const totalQ=MISSIONS.reduce((s,m)=>s+m.steps.length,0);
  const pct=Math.round(state.totalClean/(totalQ*25)*100);
  let rankTitle;if(pct>=80)rankTitle="Context Architect";else if(pct>=50)rankTitle="Signal Hunter";else rankTitle="Noise Survivor";
  if(player){await api.post("/api/save",{playerId:player.playerId,score:pct,perfect:totalStars,rankTitle}).catch(()=>{});}
  render();window.scrollTo({top:0,behavior:"smooth"});
}
function renderEnd(){
  const totalStars=state.results.reduce((s,a)=>s+(a?a.stars:0),0);
  const maxStars=MISSIONS.length*3;
  const totalQ=MISSIONS.reduce((s,m)=>s+m.steps.length,0);
  const pct=Math.round(state.totalClean/(totalQ*25)*100);
  let rank,rc;
  if(pct>=80){rank="🏆 Context Architect";rc="var(--gold)";}else if(pct>=50){rank="✨ Signal Hunter";rc="var(--green)";}else{rank="⚠️ Noise Survivor";rc="var(--orange)";}
  game.innerHTML=`<div class="screen show">
    <div class="robot-wrap" style="margin:0 auto 8px"><div class="robot ${pct>=50?'celebrate':'explode'}"></div></div>
    <div class="hdr"><h1>Quest Complete</h1></div>
    <p style="font-size:15px;color:${rc};font-weight:700">${rank}</p>
    <p style="font-size:13px;color:var(--dim)">${player?player.name:"Robot"}</p>
    <div class="final-grid">
      <div class="f-cell"><div class="f-val" style="color:var(--green)">${pct}%</div><div class="f-label">SIGNAL</div></div>
      <div class="f-cell"><div class="f-val" style="color:var(--gold)">${totalStars}/${maxStars}</div><div class="f-label">STARS</div></div>
      <div class="f-cell"><div class="f-val">${MISSIONS.length}</div><div class="f-label">MISSIONS</div></div>
    </div>
    <div class="rules" style="margin-top:20px">
      <div style="font-family:'Silkscreen',cursive;font-size:9px;color:var(--purple);letter-spacing:.2em;margin-bottom:10px">WHAT YOU LEARNED</div>
      <div class="rule"><span class="rule-i">1.</span>Right data > more data. Signal beats volume.</div>
      <div class="rule"><span class="rule-i">2.</span>Noise actively misleads — it's worse than having nothing.</div>
      <div class="rule"><span class="rule-i">3.</span>This is context engineering: curating what the AI sees.</div>
    </div>
    <div style="display:flex;gap:8px;max-width:400px;margin:16px auto 0">
      <button class="btn btn-go" onclick="startGame()">Play Again</button>
      <button class="btn btn-next" onclick="state.screen='leaderboard';state._ret='end';render()">🏆 Leaderboard</button>
    </div>
    <div class="credit">A context engineering training tool</div>
  </div>`;
  renderPips();
}

// ── Leaderboard ──
async function renderLeaderboard(){
  game.innerHTML=`<div class="screen show"><div style="font-size:48px;margin-bottom:4px">🏆</div><div class="hdr"><h1>Leaderboard</h1></div><div id="lb"><div class="bp-empty">Loading...</div></div><button class="btn btn-clear" onclick="state.screen=state._ret||'intro';render()" style="max-width:200px;margin:16px auto 0;display:block">← Back</button></div>`;
  let entries=[];try{entries=await api.get("/api/leaderboard")}catch(e){$("#lb").innerHTML=`<div class="bp-empty">Offline — play to save scores!</div>`;return;}
  if(!entries.length){$("#lb").innerHTML=`<div class="bp-empty">No scores yet!</div>`;return;}
  $("#lb").innerHTML=`<div style="max-width:440px;margin:0 auto">${entries.map(e=>{const medals=["👑","🥈","🥉"];const medal=e.rank<=3?medals[e.rank-1]:`#${e.rank}`;const isMe=player&&e.name===player.name;return`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${isMe?"var(--gold-g)":"var(--panel)"};border:1px solid ${isMe?"var(--gold)":"var(--border)"};border-radius:10px;margin-bottom:6px"><span style="font-size:18px;width:28px;text-align:center">${medal}</span><span style="flex:1;font-weight:600;font-size:13px;${isMe?"color:var(--gold)":""}">${e.name}</span><span style="font-family:'Silkscreen',cursive;font-size:12px;color:var(--gold)">${e.score}%</span><span style="font-size:10px;color:var(--dim)">${e.perfect}⭐</span></div>`}).join("")}</div>`;
}

// ═══════════════════════════════════════════════════
// 3 MISSIONS × 2 STEPS — with narrative transitions
// ═══════════════════════════════════════════════════
const MISSIONS = [
  // ── MISSION 1: The Firewall ──
  {tag:"MISSION 1",title:"The Encrypted Gateway",
    lesson:"Encryption is a data problem, not a power problem. The right key + the right protocol = access. Extra computing power is useless without the right data.",
    steps:[
      {narrative:"Your robot approaches a corporate network gateway. The terminal flickers to life with a harsh red glow.",
        context:"$ connect gateway.corp.internal\n\n[FIREWALL] ACCESS DENIED\n[FIREWALL] Cipher: AES-256-GCM\n[FIREWALL] Provide valid credentials\n[FIREWALL] Brute-force protection: ENABLED",
        actionLabel:"You need to get through →",
        question:"The firewall demands AES-256 credentials. You scan the area and find data fragments. What do you grab first?",
        options:[
          {text:"🔑 An encryption key fragment matching AES-256",correct:true,
            result:"The key fragment lights up as your scanner confirms: cipher match. It slots into your context pack with a clean green glow. You're halfway there.",
            explanation:"The key directly matches the firewall's cipher. This is signal — data that's specifically relevant to the problem at hand."},
          {text:"🔋 Extra battery pack for more processing power",correct:false,
            result:"Your robot's power gauge jumps to 200%... but the terminal still shows ACCESS DENIED. More power doesn't help when you don't have the right key. The battery buzzes uselessly.",
            explanation:"This is a classic context engineering mistake: adding more resources when the problem requires specific data. Power ≠ knowledge."},
          {text:"🎮 A gaming module with GPU acceleration",correct:false,
            result:"The GPU spins up, ready to crunch numbers. But AES-256 brute-force would take billions of years even at full speed. The terminal doesn't care about your framerate.",
            explanation:"GPU acceleration sounds relevant to encryption, but brute-force is not viable for AES-256. This data is noise — it sounds related but doesn't help."},
          {text:"🖨️ A printer driver found on the floor",correct:false,
            result:"LaserJet 4000 driver v3.2.1. Your robot stares at it. There's no printer anywhere in sight. This is literal garbage data.",
            explanation:"Completely irrelevant data. In context engineering, this is pure noise — it takes up space and adds nothing."},
        ]},
      {narrative:"With the key fragment loaded, your robot approaches the terminal again. But the firewall rejects the key — it expects a specific handshake protocol.",
        context:"$ authenticate --key fragment.aes\n\n[FIREWALL] Key format: VALID\n[FIREWALL] Handshake: FAILED\n[FIREWALL] Expected sequence: ???→???→???\n[FIREWALL] 1 attempt remaining",
        actionLabel:"One attempt left →",
        question:"The key is right but the handshake fails. You need the protocol sequence. What helps?",
        options:[
          {text:"📋 Protocol documentation: challenge → response → verify",correct:true,
            result:"The docs reveal the sequence: challenge → response → verify. Your robot sends the key in the right format. The terminal flashes green.\n\n🟢 ACCESS GRANTED\n\nThe gateway opens. You're through.",
            explanation:"The protocol docs complete the picture: you had the right KEY (what) and now the right METHOD (how). Together they form a complete, clean context."},
          {text:"⚡ Overclock the CPU to try faster handshakes",correct:false,
            result:"Your robot tries random handshake sequences at lightning speed. After 3 failed patterns, the firewall locks permanently.\n\n🔴 LOCKED OUT — Too many invalid attempts.",
            explanation:"Speed doesn't help when you don't know the sequence. Trying faster is still guessing. You needed the specific protocol documentation, not more computing power."},
          {text:"🛡️ Firewall bypass toolkit",correct:false,
            result:"The bypass tool scans for vulnerabilities but finds none — this is a properly configured firewall. Meanwhile, your one remaining attempt is still unused.",
            explanation:"Bypassing is a different approach than authenticating. You already have the key — you just need to know how to present it correctly."},
          {text:"📚 A 500-page networking textbook",correct:false,
            result:"Your robot starts scanning the textbook. Chapter 1... Chapter 2... Chapter 47 mentions AES but in a different context. Too much data, too little relevance.",
            explanation:"A massive reference has the answer buried somewhere, but at enormous cost. In context engineering, a specific doc beats a general encyclopedia every time."},
        ]},
    ]},

  // ── MISSION 2: The Breach ──
  {tag:"MISSION 2",title:"The Stolen API Keys",
    lesson:"Evidence chains need WHO + HOW + WHY. Access logs identify the suspect, forensics prove the method, and financial records establish motive. Atmospheric data (coffee, music) from the same time period is noise.",
    steps:[
      {narrative:"Alarms blare through the operations center. The security dashboard floods with red alerts. Someone exfiltrated production API keys overnight — keys that grant full access to customer data.",
        context:"⚠️  SECURITY INCIDENT — SEVERITY: CRITICAL\n\nTime window: 02:00 — 03:00 AM\nAsset: Production API keys (vault/prod/api-*)\nImpact: Full customer data access\nSuspects: 12 bots with vault permissions\n\nIncident commander: YOU",
        actionLabel:"Start the investigation →",
        question:"12 bots had vault access. What data helps you identify the suspect?",
        options:[
          {text:"📋 Vault access logs — who accessed what, when",correct:true,
            result:"The logs are clear: only dev-bot-9 accessed the production vault between 02:00 and 03:00 AM. All other bots were idle or working on non-vault systems.\n\nYou have your first lead.",
            explanation:"Access logs are the most direct evidence for WHO. They narrow 12 suspects to 1 with a single data source. High signal, low noise."},
          {text:"☕ Coffee machine logs — who was awake?",correct:false,
            result:"7 espressos ordered between midnight and 3 AM. Interesting, but... robots don't drink coffee. This is human night-shift data. Completely irrelevant to your investigation.",
            explanation:"This data is from the right TIME PERIOD but the wrong DOMAIN. Time correlation ≠ relevance. This is a common context engineering trap."},
          {text:"🎵 Office playlist — who was in the building?",correct:false,
            result:"Lo-fi beats were streaming from 1-4 AM. Great atmosphere for a heist, but this tells you nothing about vault access. The music doesn't know who stole the keys.",
            explanation:"Another time-correlated but irrelevant data source. In incident response, you need system logs, not environmental data."},
          {text:"📊 Team roster — check everyone's permissions",correct:false,
            result:"12 bots have vault access. 4 were running jobs that night. This narrows the field but still leaves 4 suspects. You need more specific data to identify the one.",
            explanation:"The roster is partial signal — it helps but doesn't solve. Access logs would give you the specific answer directly."},
        ]},
      {narrative:"dev-bot-9 is your prime suspect. But suspicion isn't proof. The incident commander needs a complete evidence chain before taking action.",
        context:"SUSPECT: dev-bot-9\nEVIDENCE SO FAR:\n  ✓ Vault access at 02:14 AM\n  ? Method of exfiltration\n  ? Motive\n\nCommander: \"I need proof, not suspicion.\n  Show me HOW and WHY.\"",
        actionLabel:"Build the evidence chain →",
        question:"You need to prove HOW the keys were stolen AND establish a motive. What's the strongest evidence?",
        options:[
          {text:"🔍 Git blame + 💰 Crypto wallet trace",correct:true,
            result:"Git blame reveals: dev-bot-9 committed a base64-encoded string to a test file at 02:47 AM. Decoded, it's the API key.\n\nCrypto trace shows: dev-bot-9 transferred 0.5 BTC to an external wallet at 03:12 AM.\n\nHOW: Automated exfiltration via git commit.\nWHY: Sold the keys for Bitcoin.\n\n🟢 Evidence chain complete. Case closed.",
            explanation:"Git blame proves the METHOD (encoded keys in a commit) and the crypto trace proves the MOTIVE (payment). Together with access logs, you have WHO + HOW + WHY — a complete evidence chain."},
          {text:"☕ Coffee logs + 🎵 Playlist timestamps",correct:false,
            result:"Cross-referencing coffee orders with playlist changes reveals... absolutely nothing useful. Robots don't drink coffee, and music taste isn't evidence of data theft.",
            explanation:"Doubling down on irrelevant data doesn't make it relevant. Two noise sources combined still equal noise. In context engineering, quantity of bad data doesn't improve quality."},
          {text:"📊 Performance reviews + 📋 Meeting notes",correct:false,
            result:"dev-bot-9's reviews are average. Meeting notes mention nothing unusual. HR data doesn't prove a specific technical crime on a specific night.",
            explanation:"This data is about the suspect but not about the incident. You need forensic evidence (git, vault audit) and financial evidence (money trail), not HR records."},
          {text:"🔐 Run a full system security audit",correct:false,
            result:"A full audit takes 48 hours and produces 10,000 pages of reports. Somewhere in there is probably evidence, but the commander needs answers NOW, not next week.",
            explanation:"A comprehensive audit is too broad. In context engineering, specificity beats thoroughness. You need targeted evidence, not a data dump."},
        ]},
    ]},

  // ── MISSION 3: The CrashLoop ──
  {tag:"MISSION 3",title:"The CrashLooping Pod",
    lesson:"In production incidents: Pod logs tell you WHAT's failing. Deployment YAML tells you WHY. The changelog tells you WHAT CHANGED. Dashboards and runbooks are noise when resources are fine.",
    steps:[
      {narrative:"3:00 AM. PagerDuty screams. The order-service is down and customers are getting errors. Revenue is dropping every minute you don't fix this.",
        context:"🚨 PAGERDUTY ALERT — CRITICAL\n\n  Service:  order-service\n  Status:   CrashLoopBackOff (5 restarts)\n  Duration: 12 minutes\n  Impact:   503 errors for all customers\n  Revenue:  -$2,400/minute\n\n  On-call engineer: YOU",
        actionLabel:"Start troubleshooting →",
        question:"The pod keeps crashing. What's the FIRST thing you check?",
        options:[
          {text:"📋 Pod logs — what error is it throwing?",correct:true,
            result:"The logs tell the story immediately:\n\nERROR: failed to read config from\n  /app/config/db-credentials.json\n  No such file or directory\n\nThe pod starts, tries to read its config file, fails, and crashes. Every single restart, same error.\n\nYou know WHAT's failing. Now you need to know WHY.",
            explanation:"Logs are the most direct diagnostic data. They tell you exactly WHAT is happening. In context engineering, start with the most specific data source available."},
          {text:"📈 Grafana dashboard — check CPU and memory",correct:false,
            result:"CPU: 12%. Memory: 340MB/512MB. Network: nominal. Disk: plenty of space.\n\nEverything looks perfectly healthy. The dashboard is all green. But the pod is still crashing.\n\nYou just spent 3 minutes checking resources that were never the problem.",
            explanation:"When everything is green on the dashboard, the dashboard isn't useful. This is noise — it answers a question nobody asked. The problem is configuration, not resources."},
          {text:"📖 Generic troubleshooting runbook",correct:false,
            result:"Step 1: Check pod status. ✓ (You know it's CrashLoopBackOff)\nStep 2: Check logs. (You should have started here)\nStep 3: Check resources. (They're fine)\n\nThe runbook tells you what you already know, in the order you should have already done it.",
            explanation:"A generic runbook is process documentation, not diagnostic data. It tells you HOW to investigate, not WHAT's wrong. In an active incident, you need data, not procedures."},
          {text:"🔄 Just restart the pod again",correct:false,
            result:"kubectl delete pod order-service-84b9...\n\nThe pod restarts... and crashes again 8 seconds later. CrashLoopBackOff. Same error.\n\nRestarting without understanding the cause = repeating the failure.",
            explanation:"'Have you tried turning it off and on again?' doesn't work when the configuration is broken. The 5 previous restarts already proved this."},
        ]},
      {narrative:"The logs reveal the error: the pod can't find /app/config/db-credentials.json. But that file should exist — it worked yesterday. Something changed.",
        context:"ERROR: /app/config/db-credentials.json\n  → No such file or directory\n\nBut the secret exists in the cluster:\n  $ kubectl get secret db-creds -n prod\n  NAME       TYPE     DATA   AGE\n  db-creds   Opaque   1      45d\n\nThe secret is there. The pod can't see it.\nSomething is wrong with how it's mounted.",
        actionLabel:"Find the root cause →",
        question:"The secret exists but the pod can't find it. You need to find WHAT CHANGED. What's the most useful data?",
        options:[
          {text:"📄 Deployment YAML + 📝 Last deploy changelog",correct:true,
            result:"Deployment YAML shows:\n  volumeMount: /etc/secrets  ← mounted HERE\n\nBut the app reads from:\n  /app/config  ← looks HERE\n\nChangelog for v2.4.1 (deployed 11:00 PM):\n  \"Changed config path from /etc/secrets\n   to /app/config in application code\"\n\n💡 The app was updated to read from /app/config,\nbut the YAML still mounts at /etc/secrets.\n\n🟢 ROOT CAUSE: Mount path mismatch after deploy.\n\nFix: kubectl patch deployment order-service\n  --type=json -p='[{\"op\":\"replace\",\n  \"path\":\"/spec/.../mountPath\",\n  \"value\":\"/app/config\"}]'",
            explanation:"The deployment YAML + changelog together reveal: the code changed WHERE it reads config, but the infrastructure wasn't updated to match. This is the classic context engineering lesson: you need WHAT's wrong + WHY it changed + WHEN it broke."},
          {text:"📈 Check Grafana dashboard again",correct:false,
            result:"CPU: still 12%. Memory: still fine. Network: still nominal.\n\nThe dashboard hasn't changed because the problem was never about resources. You already checked this. Checking again adds noise to your investigation timeline.",
            explanation:"Repeating a failed diagnostic approach doesn't make it work. In context engineering, doubling down on irrelevant data is worse than having no data — it wastes time and adds noise."},
          {text:"📖 Escalate to the runbook's next steps",correct:false,
            result:"Step 4: 'Check recent deployments and config changes.'\n\nThe runbook finally points you in the right direction — but it took you through 3 unnecessary steps first. The changelog and YAML would have given you the answer directly.",
            explanation:"The runbook eventually gets there, but it's a generic process. In a revenue-losing incident, you need to go directly to the most likely cause: what changed recently?"},
          {text:"🧰 Run a full cluster diagnostic",correct:false,
            result:"Running cluster-wide diagnostics...\n\n10 minutes later: 847 lines of output. Node health: OK. Network policies: OK. DNS: OK. The answer is buried on line 612: 'volumeMount mismatch detected.'\n\nYou could have found this in 30 seconds by checking the YAML directly.",
            explanation:"A broad diagnostic finds the answer eventually, but at massive cost — 10 minutes of revenue loss. Targeted investigation (YAML + changelog) would have taken 30 seconds."},
        ]},
    ]},
];

// ── Boot ──
render();
