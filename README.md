# 🎒 Context Quest

**An interactive game that teaches context engineering through adventure.**

> *"The AI is only as good as the data you feed it."*

A context engineering training tool.

## How it works

You're a robot with a backpack (= AI context window). Each level is a
tech puzzle. Pick data fragments to carry, but stay under the weight limit.
Right items → the AI solves the problem. Wrong items → 💥 the robot explodes.

**Zero LLM calls.** All AI responses are pre-crafted decision trees.
Zero cost, zero latency, works offline.

### Login & Leaderboard

Players pick a **robot designation** (generated client-side, e.g. "Bot-42 Codebreaker") —
no personal data collected. Scores are saved to a Turso database and displayed
on a live leaderboard.

## Architecture

```
context-quest/
├── netlify.toml                       # Build config + redirects
├── package.json                       # Dependencies (@libsql/client)
├── netlify/functions/
│   ├── shared.js                      # DB client, game data, scoring
│   ├── names.js          GET          # Generate robot designations
│   ├── login.js          POST         # Register player
│   ├── levels.js         GET          # Level data (no answers)
│   ├── submit.js         POST         # Evaluate backpack → AI response
│   ├── save.js           POST         # Save score to leaderboard
│   ├── leaderboard.js    GET          # Top 20 players
│   └── stats.js          GET          # Aggregate statistics
├── src/                               # Static frontend (published)
│   ├── index.html
│   ├── css/style.css
│   ├── js/app.js                      # Game engine + offline fallback
│   └── img/robot_strip.png            # 9-frame sprite sheet
└── README.md
```

**Stack:** Netlify (hosting + functions) + Turso (SQLite-as-a-service).
Both have generous free tiers. Total cost: $0.

## Deploy to Netlify + Turso (10 minutes)

### Step 1: Create a Turso database (free)

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup
turso db create context-quest
turso db show context-quest --url
turso db tokens create context-quest
```

### Step 2: Push to GitHub

```bash
git init
git add .
git commit -m "Context Quest v1.0"
gh repo create context-quest --public --push
```

### Step 3: Deploy on Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. **"Add new site"** → **"Import an existing project"** → connect GitHub repo
3. Netlify auto-detects `netlify.toml` — no config needed
4. **Site settings** → **Environment variables** → add:

| Key                  | Value                                        |
|----------------------|----------------------------------------------|
| `TURSO_URL`          | `libsql://context-quest-YOURNAME.turso.io`   |
| `TURSO_AUTH_TOKEN`   | `eyJhb...` (the token from step 1)           |

5. **Deploy**. Done!

## Run locally

```bash
npm install
npm install -g netlify-cli
netlify dev
# → http://localhost:8888
```

Or just open `src/index.html` directly — the game works fully offline
(leaderboard requires Turso).

## API

| Endpoint           | Method | Description                         |
|--------------------|--------|-------------------------------------|
| `/api/names`       | GET    | 4 random robot designations         |
| `/api/login`       | POST   | Register `{name}` → `{playerId}`   |
| `/api/levels`      | GET    | Level data (no answers)             |
| `/api/submit`      | POST   | Evaluate `{level, bag}`             |
| `/api/save`        | POST   | Save completed game                 |
| `/api/leaderboard` | GET    | Top 20 by best score                |
| `/api/stats`       | GET    | Aggregate stats                     |

## The 5 Levels

| # | Setting | Puzzle | Lesson |
|---|---------|--------|--------|
| 1 | 🔐 Firewall | Crack encrypted gateway | Right data for the right problem |
| 2 | 💾 Data Stream | Trace corrupted pipeline | Heavy docs ≠ useful data |
| 3 | 🔓 Breach | Find API key thief | Follow the money (source authority) |
| 4 | ☸️ Cluster | Fix CrashLooping pod | Logs + spec + changelog > dashboards |
| 5 | 🖥️ Mainframe | Deduce root password | Small + specific > large + generic |

## Privacy

Zero personal data. Robot designations only. Database stores: designation, score, timestamp.

---

Created by [Velmira Georgieva](https://github.com/VelmiraPetkova) — a context engineering training tool.