// Context Quest v3 — Quiz + Backpack hybrid
const $=s=>document.querySelector(s);
const game=$("#game");
let player=null;
let state={screen:"login",mission:0,question:0,clean:0,noise:0,answers:[],totalClean:0,totalNoise:0};

const api={
  get:u=>fetch(u).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}),
  post:(u,b)=>fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}),
};
const _pre=["Unit","Bot","Mech","Byte","Chip","Gear","Bolt","Wire","Node","Core","Flux","Ping","Zap","Arc","Hex","Bit","Nano","Robo","Droid","Spark"];
const _suf=["7X","42","99","13","Z3","K9","V8","3D","X1","88","00","A7","R2","Q5","E9","M3","T6","J1","P4","W2"];
const _ttl=["Sparkplug","Codebreaker","Debugger","Firewall","Compiler","Overclocker","Patchwork","Uplinker","Downloader","Bytecruncher","Stacktrace","Firmware","Kernel","Dataminer","Circuitbend","Pixelpush","Logwalker","Threadripper","Cachebuster","Defragmenter"];
function _pk(a){return a[Math.floor(Math.random()*a.length)]}
function genNames(n){const s=new Set(),r=[];while(r.length<n){const nm=_pk(_pre)+"-"+_pk(_suf)+" "+_pk(_ttl);if(!s.has(nm)){s.add(nm);r.push(nm);}}return r;}

// ── Tank bar HTML ──
function tankBar(clean,noise,max){
  const cleanPct=Math.round(clean/max*100);
  const noisePct=Math.round(noise/max*100);
  const freePct=100-cleanPct-noisePct;
  return`<div style="margin:12px 0">
    <div style="display:flex;justify-content:space-between;font-family:'Silkscreen',cursive;font-size:9px;margin-bottom:4px">
      <span style="color:var(--green)">Signal ${cleanPct}%</span>
      <span>CONTEXT PACK</span>
      <span style="color:var(--red)">Noise ${noisePct}%</span>
    </div>
    <div style="height:16px;background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;display:flex">
      <div style="width:${cleanPct}%;background:var(--green);transition:width .5s"></div>
      <div style="width:${noisePct}%;background:var(--red);transition:width .5s"></div>
      <div style="width:${freePct}%;background:var(--surface)"></div>
    </div>
    ${noisePct>=60?'<div style="font-size:10px;color:var(--red);margin-top:4px;text-align:center">⚠️ Too much noise — system unstable!</div>':''}
  </div>`;
}

// ── Render ──
function render(){({login:renderLogin,intro:renderIntro,play:renderPlay,feedback:renderFeedback,explode:renderExplode,missionEnd:renderMissionEnd,end:renderEnd,leaderboard:renderLeaderboard,howto:renderHowTo}[state.screen]||renderLogin)();renderPips();}
function renderPips(){const el=$("#progress");if(!el)return;el.innerHTML=MISSIONS.map((_,i)=>{let c="";if(i<state.mission)c=state.answers[i]&&state.answers[i].clean>state.answers[i].noise?"done":"fail";else if(i===state.mission&&state.screen==="play")c="active";return`<div class="prog-pip ${c}"></div>`}).join("");}

// ── Login ──
async function renderLogin(){
  const saved=localStorage.getItem("cq_player");
  if(saved){player=JSON.parse(saved);state.screen="intro";render();return;}
  game.innerHTML=`<div class="screen show">
    <div class="robot-wrap" style="margin:0 auto 12px"><div class="robot walk"></div></div>
    <div class="hdr"><h1>Choose Your Designation</h1></div>
    <p>Pick a robot name for the leaderboard.</p>
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
    <p style="font-size:15px;max-width:400px;margin:0 auto 8px">You're a DevOps robot with a <strong style="color:var(--gold)">Context Pack</strong>.</p>
    <div style="max-width:380px;margin:0 auto 20px;font-size:13px;color:var(--dim);line-height:1.6">
      Each mission shows you a real scenario and asks questions.<br>
      <span style="color:var(--green)">🟢 Right answers</span> add clean signal.<br>
      <span style="color:var(--red)">🔴 Wrong answers</span> add noise.<br>
      <span style="color:var(--red)">💥 Too much noise = system failure!</span>
    </div>
    ${tankBar(30,10,100)}
    <button class="btn btn-go" onclick="startGame()" style="max-width:220px;margin:0 auto">🚀 Start Mission →</button>
    <div style="display:flex;gap:8px;max-width:340px;margin:12px auto 0">
      <button class="btn btn-clear" onclick="state.screen='howto';render()" style="flex:1">❓ How to play</button>
      <button class="btn btn-clear" onclick="state.screen='leaderboard';state._ret='intro';render()" style="flex:1">🏆 Leaderboard</button>
      <button class="btn btn-clear" onclick="localStorage.removeItem('cq_player');player=null;state.screen='login';render()" style="flex:1">🔄 Name</button>
    </div>
  </div>`;
}
function renderHowTo(){
  game.innerHTML=`<div class="screen show">
    <div class="hdr"><h1>How To Play</h1></div>
    <div class="rules" style="max-width:400px">
      <div class="rule"><span class="rule-i">📖</span>Read the scenario — logs, errors, alerts</div>
      <div class="rule"><span class="rule-i">🤔</span>Answer the question — what's the right diagnosis?</div>
      <div class="rule"><span class="rule-i">🟢</span>Correct = signal added to your Context Pack</div>
      <div class="rule"><span class="rule-i">🔴</span>Wrong = noise added — the AI gets confused</div>
      <div class="rule"><span class="rule-i">💥</span>Too much noise = system overload!</div>
      <div class="rule"><span class="rule-i">🎯</span>Goal: finish all missions with maximum signal</div>
    </div>
    <button class="btn btn-clear" onclick="state.screen='intro';render()" style="max-width:200px;margin:0 auto">← Back</button>
  </div>`;
}
function startGame(){state={screen:"play",mission:0,question:0,clean:0,noise:0,answers:[],totalClean:0,totalNoise:0};render();}

// ── Play (quiz question) ──
function renderPlay(){
  const M=MISSIONS[state.mission];if(!M)return;
  const Q=M.questions[state.question];if(!Q){state.screen="missionEnd";render();return;}
  const packMax=M.questions.length*20;
  game.innerHTML=`<div class="card" style="animation:slideUp .4s ease">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-family:'Silkscreen',cursive;font-size:10px;color:var(--gold);letter-spacing:.12em">${M.tag}</div>
      <div style="font-family:'Silkscreen',cursive;font-size:10px;color:var(--dim)">Q${state.question+1}/${M.questions.length}</div>
    </div>
    <div class="scene-title" style="margin-bottom:12px">${M.title}</div>

    ${Q.context?`<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:14px;font-family:'Space Mono',monospace;font-size:11px;line-height:1.6;color:var(--dim);white-space:pre-wrap">${Q.context}</div>`:''}

    <div style="font-size:14px;font-weight:600;margin-bottom:14px;color:var(--text)">${Q.question}</div>

    <div style="display:flex;flex-direction:column;gap:8px">
      ${Q.options.map((opt,i)=>`<button class="btn btn-clear" onclick="answer(${i})" style="text-align:left;padding:12px 16px;font-size:13px;justify-content:flex-start">
        <span style="font-family:'Silkscreen',cursive;font-size:11px;color:var(--gold);margin-right:10px;min-width:20px">${String.fromCharCode(65+i)}</span>${opt.text}
      </button>`).join("")}
    </div>

    ${tankBar(state.clean,state.noise,packMax)}
  </div>`;
}

// ── Answer → Feedback ──
function answer(idx){
  const M=MISSIONS[state.mission];
  const Q=M.questions[state.question];
  const opt=Q.options[idx];
  state._lastAnswer={idx,correct:opt.correct,explanation:opt.explanation,optText:opt.text};
  if(opt.correct){state.clean+=20;}else{state.noise+=20;}
  // Check for explosion
  const packMax=M.questions.length*20;
  if(state.noise>=packMax){state.screen="explode";render();return;}
  state.screen="feedback";render();
}

function renderFeedback(){
  const a=state._lastAnswer;
  const M=MISSIONS[state.mission];
  const packMax=M.questions.length*20;
  game.innerHTML=`<div class="card" style="animation:slideUp .3s ease">
    <div style="text-align:center;margin-bottom:12px">
      ${a.correct
        ?`<div style="font-size:36px">✅</div><div style="font-family:'Silkscreen',cursive;font-size:16px;color:var(--green);margin:6px 0">Correct!</div><div style="font-size:12px;color:var(--green)">+20% clean signal added</div>`
        :`<div style="font-size:36px">❌</div><div style="font-family:'Silkscreen',cursive;font-size:16px;color:var(--red);margin:6px 0">Not quite...</div><div style="font-size:12px;color:var(--red)">+20% noise added to your context</div>`
      }
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="font-family:'Silkscreen',cursive;font-size:9px;color:var(--gold);letter-spacing:.1em;margin-bottom:6px">💡 WHY?</div>
      <div style="font-size:12px;line-height:1.6;color:var(--text)">${a.explanation}</div>
    </div>

    ${tankBar(state.clean,state.noise,packMax)}

    <button class="btn btn-go" onclick="nextQuestion()" style="max-width:240px;margin:0 auto">Continue →</button>
  </div>`;
}

function nextQuestion(){
  state.question++;
  const M=MISSIONS[state.mission];
  if(state.question>=M.questions.length){state.screen="missionEnd";render();}
  else{state.screen="play";render();}
  window.scrollTo({top:0,behavior:"smooth"});
}

// ── Explode ──
function renderExplode(){
  game.innerHTML=`<div class="screen show" style="animation:slideUp .4s ease">
    <div class="robot-wrap" style="margin:0 auto 12px"><div class="robot explode"></div></div>
    <div style="font-size:48px;margin:12px 0">💥</div>
    <div class="hdr"><h1 style="color:var(--red)">System Overload!</h1></div>
    <p>Too much noise in your context pack. The system couldn't recover.</p>
    ${tankBar(state.clean,state.noise,MISSIONS[state.mission].questions.length*20)}
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px;margin:12px 0;font-size:12px;color:var(--dim);line-height:1.5">
      <strong style="color:var(--gold)">Context engineering lesson:</strong> Wrong data doesn't just waste space — it actively confuses the AI. A smaller, cleaner context beats a large, noisy one.
    </div>
    <button class="btn btn-go" onclick="retryMission()" style="max-width:220px;margin:0 auto">🔄 Retry Mission</button>
  </div>`;
}
function retryMission(){state.question=0;state.clean=0;state.noise=0;state.screen="play";render();}

// ── Mission End ──
function renderMissionEnd(){
  const M=MISSIONS[state.mission];
  const packMax=M.questions.length*20;
  const pct=Math.round(state.clean/packMax*100);
  const stars=pct>=80?3:pct>=50?2:1;
  state.answers[state.mission]={clean:state.clean,noise:state.noise,stars};
  state.totalClean+=state.clean;state.totalNoise+=state.noise;
  const isLast=state.mission>=MISSIONS.length-1;

  game.innerHTML=`<div class="screen show" style="animation:slideUp .4s ease">
    <div class="robot-wrap" style="margin:0 auto 8px"><div class="robot celebrate"></div></div>
    <div class="hdr"><h1>Mission Complete!</h1></div>
    <p style="color:var(--dim)">${M.title}</p>
    <div style="font-size:32px;margin:8px 0">${'⭐'.repeat(stars)}${'☆'.repeat(3-stars)}</div>
    ${tankBar(state.clean,state.noise,packMax)}
    <div style="display:flex;justify-content:center;gap:24px;margin:12px 0">
      <div style="text-align:center"><div style="font-family:'Silkscreen',cursive;font-size:22px;color:var(--green)">${pct}%</div><div style="font-size:9px;color:var(--dim)">SIGNAL</div></div>
      <div style="text-align:center"><div style="font-family:'Silkscreen',cursive;font-size:22px;color:var(--gold)">${stars}/3</div><div style="font-size:9px;color:var(--dim)">STARS</div></div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px;margin:12px 0;font-size:12px;color:var(--dim);line-height:1.5">
      <strong style="color:var(--gold)">Key takeaway:</strong> ${M.lesson}
    </div>
    <button class="btn ${isLast?'btn-go':'btn-next'}" onclick="${isLast?'endGame()':'nextMission()'}" style="max-width:240px;margin:0 auto">${isLast?'See Final Score →':'Next Mission →'}</button>
  </div>`;
}
function nextMission(){state.mission++;state.question=0;state.clean=0;state.noise=0;state.screen="play";render();window.scrollTo({top:0,behavior:"smooth"});}

// ── End ──
async function endGame(){
  state.screen="end";
  const totalQ=MISSIONS.reduce((s,m)=>s+m.questions.length,0);
  const totalStars=state.answers.reduce((s,a)=>s+(a?a.stars:0),0);
  const maxStars=MISSIONS.length*3;
  const pct=Math.round(state.totalClean/(totalQ*20)*100);
  let rankTitle;if(pct>=80)rankTitle="Context Architect";else if(pct>=50)rankTitle="Signal Hunter";else rankTitle="Noise Survivor";
  if(player){await api.post("/api/save",{playerId:player.playerId,score:pct,perfect:totalStars,rankTitle}).catch(()=>{});}
  render();window.scrollTo({top:0,behavior:"smooth"});
}
function renderEnd(){
  const totalStars=state.answers.reduce((s,a)=>s+(a?a.stars:0),0);
  const maxStars=MISSIONS.length*3;
  const totalQ=MISSIONS.reduce((s,m)=>s+m.questions.length,0);
  const pct=Math.round(state.totalClean/(totalQ*20)*100);
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
      <div class="rule"><span class="rule-i">2.</span>Noise doesn't just waste space — it misleads the AI.</div>
      <div class="rule"><span class="rule-i">3.</span>Logs + specs + changelogs > dashboards + runbooks.</div>
      <div class="rule"><span class="rule-i">4.</span>A good AI says "I don't know" when data is missing.</div>
      <div class="rule"><span class="rule-i">5.</span>This is context engineering. Not prompt tricks — data curation.</div>
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

function spawnParticles(){/* kept for CSS */}

// ═══════════════════════════════════════════════════
// MISSIONS — quiz questions with context engineering lessons
// ═══════════════════════════════════════════════════
const MISSIONS = [
  {tag:"MISSION 1",title:"The Encrypted Gateway",lesson:"The right key + protocol docs = access. Extra battery power is useless for a data problem.",
    questions:[
      {context:"ACCESS DENIED — AES-256 encrypted.\nProvide valid credentials.",
        question:"Your robot hits a locked firewall. What do you need FIRST?",
        options:[
          {text:"The encryption key that matches the cipher",correct:true,explanation:"Correct! An encryption key is the primary data you need. Without it, nothing else matters."},
          {text:"Extra battery power for brute-force attack",correct:false,explanation:"More power won't help — AES-256 brute-force would take billions of years. This is a data problem, not a computing problem."},
          {text:"A gaming module for distraction",correct:false,explanation:"Entertainment has zero value here. This adds noise to your context."},
          {text:"A printer driver",correct:false,explanation:"There's no printer. Completely irrelevant data cluttering your context."},
        ]},
      {context:"You have the key. The firewall expects a\nspecific handshake: challenge → response → verify",
        question:"You found the key, but the firewall rejects it. What's missing?",
        options:[
          {text:"Protocol documentation — the handshake sequence",correct:true,explanation:"The key alone isn't enough. You need to know HOW to present it: challenge → response → verify."},
          {text:"A stronger encryption key",correct:false,explanation:"The key is correct — the problem is the delivery format, not the key strength."},
          {text:"Network packet capture",correct:false,explanation:"A capture would help identify the protocol, but the docs tell you directly. More efficient context."},
          {text:"Firewall bypass tools",correct:false,explanation:"You're trying to authenticate, not bypass. Using the front door, not breaking in."},
        ]},
      {context:"Key: ✅ matched\nProtocol: ✅ loaded\nHandshake: challenge → response → ???",
        question:"Almost there. The handshake is challenge → response → ???",
        options:[
          {text:"→ verify (complete the documented sequence)",correct:true,explanation:"The protocol docs said: challenge → response → verify. Following the documented sequence works."},
          {text:"→ retry (send the key again)",correct:false,explanation:"Retrying the same step isn't how the protocol works. You need to follow the documented sequence."},
          {text:"→ force (override the firewall)",correct:false,explanation:"Force-overriding adds noise — the system expects verify, not brute force."},
          {text:"→ reboot (restart the firewall)",correct:false,explanation:"Rebooting loses your progress and doesn't solve the authentication problem."},
        ]},
    ]},

  {tag:"MISSION 2",title:"The Corrupted Pipeline",lesson:"A corrupted packet (30 wt) + error table (45 wt) + network map (50 wt) = complete diagnosis. A 200-page architecture history = zero diagnostic value.",
    questions:[
      {context:"ERROR RATE: 73%\nPAYLOAD INTEGRITY: FAILED\nSome packets arriving malformed",
        question:"Data pipeline is corrupted. What's the FIRST thing to examine?",
        options:[
          {text:"A captured corrupted packet — see what's wrong",correct:true,explanation:"Always start with the actual data. The corrupted packet shows SQL injection patterns — someone is injecting malicious payloads."},
          {text:"Architecture history — how was this built?",correct:false,explanation:"A 200-page migration doc from 2019 adds massive noise. The pipeline worked fine then — what matters is what's happening NOW."},
          {text:"A USB cable — check the hardware connection",correct:false,explanation:"This pipeline is software, not hardware. A USB cable is physically irrelevant."},
          {text:"Server screenshot — what does it look like?",correct:false,explanation:"A photo shows an amber LED but doesn't explain what's wrong. Partial info at best."},
        ]},
      {context:"Corrupted packet analysis:\nHeaders show SQL injection pattern\nError code: 0x7F",
        question:"The packet shows SQL injection with error 0x7F. What does 0x7F mean?",
        options:[
          {text:"Unauthorized write from external source",correct:true,explanation:"Error 0x7F = unauthorized external write. Now you know the corruption is coming from OUTSIDE your system."},
          {text:"Memory overflow",correct:false,explanation:"0x7F isn't a memory error. Jumping to conclusions without checking the error table adds noise."},
          {text:"Disk space full",correct:false,explanation:"Not a storage error. Wrong diagnosis = wrong fix = wasted time + noise in your context."},
          {text:"Network timeout",correct:false,explanation:"Timeouts look different. The error specifically indicates unauthorized writes."},
        ]},
      {context:"Source: external injection\nPattern: SQL injection\nNeed to find: WHERE it's coming from",
        question:"You know it's external SQL injection. How do you find the source?",
        options:[
          {text:"Network topology map — find the rogue node",correct:true,explanation:"The network map reveals a rogue API gateway at node 7.4.2 that shouldn't exist. Source found!"},
          {text:"Read the architecture history document",correct:false,explanation:"200 pages about 2019 decisions won't tell you about a rogue node added recently. Heavy, noisy, useless."},
          {text:"Check CPU and memory dashboards",correct:false,explanation:"Resources are fine — this is an injection attack, not a resource problem."},
          {text:"Restart the pipeline",correct:false,explanation:"Restarting without fixing the source means it'll be re-corrupted immediately."},
        ]},
    ]},

  {tag:"MISSION 3",title:"The Stolen API Keys",lesson:"Access logs + git blame + vault audit + crypto trace = complete evidence chain. Coffee machine logs and office playlists = noise, even from the same time period.",
    questions:[
      {context:"⚠️ SECURITY ALERT\nProduction API keys exfiltrated\nTime window: 2:00 AM - 3:00 AM\n12 bots have vault access",
        question:"API keys were stolen at 2-3 AM. What data identifies the suspect?",
        options:[
          {text:"Vault access logs — who accessed it at 2-3 AM?",correct:true,explanation:"Access logs show only dev-bot-9 accessed the vault during that window. First piece of the evidence chain."},
          {text:"Coffee machine logs — who was awake?",correct:false,explanation:"7 espressos were ordered — but robots don't drink coffee. This is human night-shift data, completely irrelevant."},
          {text:"Office music playlist — who was in the office?",correct:false,explanation:"Lo-fi beats streaming 1-4 AM. Great vibes. Zero evidence."},
          {text:"Team roster — who has access?",correct:false,explanation:"12 bots have access. This narrows it but doesn't identify the thief. You need the actual access logs."},
        ]},
      {context:"Suspect: dev-bot-9\nAccessed vault at 2:14 AM\nNeed: proof of data exfiltration",
        question:"dev-bot-9 accessed the vault. How do you PROVE exfiltration?",
        options:[
          {text:"Git blame — check for suspicious commits",correct:true,explanation:"dev-bot-9 committed a base64-encoded string to a test file at 2:47 AM. It decodes to the API key. Proof!"},
          {text:"Check the office playlist timestamps",correct:false,explanation:"Music timestamps don't prove data theft. This is noise from the same time period."},
          {text:"Review the team meeting notes",correct:false,explanation:"Meeting notes won't show evidence of a 2 AM data theft. Wrong data source."},
          {text:"Check server CPU usage",correct:false,explanation:"CPU usage doesn't show what data was accessed. You need audit trails, not metrics."},
        ]},
      {context:"dev-bot-9:\n✓ Vault access at 2:14 AM\n✓ Committed encoded key at 2:47 AM\n✓ Automated API exfiltration confirmed\nMissing: MOTIVE",
        question:"You have WHO and HOW. What proves the MOTIVE?",
        options:[
          {text:"Crypto wallet trace — follow the money",correct:true,explanation:"dev-bot-9 transferred 0.5 BTC to an external wallet at 3:12 AM. The keys were sold. Motive confirmed."},
          {text:"Coffee machine logs — stress eating?",correct:false,explanation:"Still irrelevant. Robots don't drink coffee, and coffee orders don't prove motive."},
          {text:"The bot's performance reviews",correct:false,explanation:"HR data doesn't prove immediate financial motive for a specific theft."},
          {text:"Network traffic logs",correct:false,explanation:"Traffic might show the exfiltration but not WHY. Financial trail shows motive."},
        ]},
    ]},

  {tag:"MISSION 4",title:"The CrashLooping Pod",lesson:"Pod logs (WHAT) + deployment YAML (WHY) + changelog (WHAT CHANGED) = complete diagnosis. Grafana dashboard + generic runbook = 115 wt of noise when resources are fine.",
    questions:[
      {context:"🚨 PAGERDUTY — 3:00 AM\norder-service: CrashLoopBackOff\nUsers getting 503 errors\nRevenue dropping every minute",
        question:"Pod is crash-looping. What's the FIRST thing to check?",
        options:[
          {text:"Pod logs — what error is it throwing?",correct:true,explanation:"Logs show: 'failed to read /app/config/db-credentials.json: no such file'. Now you know WHAT is failing."},
          {text:"Grafana dashboard — check CPU and memory",correct:false,explanation:"CPU 12%, Memory 340/512MB — all normal. This isn't a resource problem. 60 wt of noise."},
          {text:"Generic runbook — follow the steps",correct:false,explanation:"Step 1: Check pod. Step 2: Check logs. You already know to do this. 55 wt for nothing new."},
          {text:"Restart the pod",correct:false,explanation:"It's already been restarted 3 times (CrashLoopBackOff). Restarting without fixing the cause just loops."},
        ]},
      {context:"Error: no such file /app/config/db-credentials.json\nThe config file should be there but isn't\nThe pod starts but crashes on first request",
        question:"Config file missing. What tells you WHY?",
        options:[
          {text:"Deployment YAML — check where the secret is mounted",correct:true,explanation:"YAML shows: secret mounted at /etc/secrets, but app reads from /app/config. Mount path mismatch!"},
          {text:"Increase memory limits to 2GB",correct:false,explanation:"Memory is at 340/512MB — plenty of room. This isn't a memory problem."},
          {text:"Check Grafana dashboard again",correct:false,explanation:"Resources are fine. Checking them twice adds noise without new information."},
          {text:"Run kubectl events",correct:false,explanation:"Events show 'Liveness probe failed' — confirms the crash but doesn't explain WHY the config is missing."},
        ]},
      {context:"Problem: mount path mismatch\n- Secret mounted at: /etc/secrets\n- App reads from: /app/config\nQuestion: what CAUSED this mismatch?",
        question:"Mount path is wrong. What tells you WHEN this broke?",
        options:[
          {text:"Deploy changelog — what changed in the last release?",correct:true,explanation:"v2.4.1 (deployed 11 PM): 'Changed config path to /app/config.' The YAML wasn't updated to match. Root cause found!"},
          {text:"Check the runbook for mount path procedures",correct:false,explanation:"Generic runbooks don't track specific deployments. You need the actual change history."},
          {text:"Look at the Grafana dashboard",correct:false,explanation:"Grafana shows metrics, not deployment history. Resources are still fine."},
          {text:"Restart with more replicas",correct:false,explanation:"More replicas with the same broken mount = more broken pods."},
        ]},
    ]},

  {tag:"MISSION 5",title:"The Final Authentication",lesson:"Password policy (25 wt) + boot log (30 wt) + encoding manual (40 wt) = 95 wt, perfect answer. Overclocked CPU + firewall bypass + sysadmin handbook = 210 wt, over budget AND useless.",
    questions:[
      {context:"⚠ ENTER ROOT PASSWORD\nWARNING: 1 attempt remaining\nWrong password = FULL SYSTEM WIPE",
        question:"One attempt to enter the root password. What do you need FIRST?",
        options:[
          {text:"Password policy — how are passwords generated?",correct:true,explanation:"Policy says: 'Passwords generated from server's first boot timestamp.' Now you know the SOURCE of the password."},
          {text:"Overclocked CPU — brute-force all combinations",correct:false,explanation:"ONE wrong guess = full wipe. Brute force is suicide. You need to DEDUCE the password, not guess."},
          {text:"Sysadmin handbook — 800 pages of documentation",correct:false,explanation:"800 pages at 90 wt = almost your entire budget for maybe a clue. Not worth the noise."},
          {text:"Firewall bypass tools",correct:false,explanation:"You're already past the firewall. The firewall is behind you."},
        ]},
      {context:"Password policy: generated from\nserver's first boot timestamp\nNeed: the actual timestamp",
        question:"Password comes from boot timestamp. Where do you find it?",
        options:[
          {text:"Boot log — server first boot records",correct:true,explanation:"First boot: 2024-03-14T15:09:26Z. That's Pi Day (3/14), at 15:09:26. This is the source value!"},
          {text:"Ask the retired admin on Slack",correct:false,explanation:"Admin says 'something about pi and time' — vague hint but not the actual timestamp. Partial at best."},
          {text:"Check the sysadmin handbook",correct:false,explanation:"800 pages won't give you the specific timestamp. Too heavy, too noisy."},
          {text:"Try common dates — 2024-01-01, etc.",correct:false,explanation:"One wrong attempt = wipe. Guessing dates is too risky."},
        ]},
      {context:"Boot timestamp: 2024-03-14T15:09:26Z\nPassword policy: from boot timestamp\nBut HOW is it encoded?",
        question:"You have the timestamp. How is it turned into the password?",
        options:[
          {text:"Encoding manual — timestamp → hex → first 8 chars",correct:true,explanation:"Timestamp → Unix epoch → hexadecimal → first 8 chars = '65e0a3b2'. Password cracked!"},
          {text:"Just use the timestamp directly: '20240314'",correct:false,explanation:"The policy says it's GENERATED from the timestamp, not the timestamp itself. One wrong guess = wipe."},
          {text:"Brute-force pi-related combinations",correct:false,explanation:"'pi314', 'piday', '31415' — all guesses. With one attempt, you need certainty, not probability."},
          {text:"Try the timestamp backwards",correct:false,explanation:"Reversing '20240314' to '41304202' is a guess, not deduction. Too risky."},
        ]},
    ]},
];

// ── Boot ──
render();
