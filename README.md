# 🎒 Context Quest

**An interactive game that teaches context engineering through adventure.**

> *"The AI is only as good as the data you feed it."*

Built as an [exercise in context engineering and understanding]

## How it works

You're an adventurer with a robot companion and a backpack (= AI context
window). Pick items to carry, stay under the weight limit. Right items →
the AI solves the puzzle. Wrong items → 💥 the robot explodes.

**Zero LLM calls.** Pre-crafted decision trees. Zero cost, zero latency.

## Architecture

```
context-quest/
├── netlify.toml                       # Build config + redirects
├── package.json                       # Dependencies (@libsql/client)
├── netlify/functions/
│   ├── shared.js                      # DB client, game data, scoring
│   ├── names.js          GET          # Generate elvish names
│   ├── login.js          POST         # Register player
│   ├── levels.js         GET          # Level data (no answers)
│   ├── submit.js         POST         # Evaluate backpack → AI response
│   ├── save.js           POST         # Save score to leaderboard
│   ├── leaderboard.js    GET          # Top 20 players
│   └── stats.js          GET          # Aggregate statistics
├── src/                               # Static frontend (published)
│   ├── index.html
│   ├── css/style.css
│   ├── js/app.js
│   └── img/robot_strip.png
└── README.md
```

**Stack:** Netlify (hosting + functions) + Turso (SQLite-as-a-service).
Both have generous free tiers. Total cost: $0.

## Deploy to Netlify + Turso (10 minutes)

### Step 1: Create a Turso database (free)

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Sign up & create database
turso auth signup
turso db create context-quest
turso db show context-quest --url
# → libsql://context-quest-YOURNAME.turso.io

turso db tokens create context-quest
# → eyJhb... (save this token)
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
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repo
4. Netlify auto-detects `netlify.toml` — no config needed
5. Go to **Site settings** → **Environment variables** and add:

| Key                  | Value                                        |
|----------------------|----------------------------------------------|
| `TURSO_URL`          | `libsql://context-quest-YOURNAME.turso.io`   |
| `TURSO_AUTH_TOKEN`   | `eyJhb...` (the token from step 1)           |

6. Click **Deploy**. Done! You get a URL like `context-quest.netlify.app`

### Step 4 (optional): Custom domain

In Netlify: **Domain settings** → **Add custom domain** → follow DNS instructions.

## Run locally

```bash
npm install

# Option A: With Netlify CLI (recommended)
npm install -g netlify-cli
netlify dev
# → http://localhost:8888

# Option B: Without Turso (uses local SQLite file)
# Just don't set TURSO_URL — shared.js falls back to file:local.db
```

## API

All endpoints are at `/api/*` and redirect to Netlify Functions.

| Endpoint           | Method | Description                         |
|--------------------|--------|-------------------------------------|
| `/api/names`       | GET    | 4 random elvish names               |
| `/api/login`       | POST   | Register `{name}` → `{playerId}`   |
| `/api/levels`      | GET    | Level data (no answers)             |
| `/api/submit`      | POST   | Evaluate `{level, bag}`             |
| `/api/save`        | POST   | Save completed game                 |
| `/api/leaderboard` | GET    | Top 20 by best score                |
| `/api/stats`       | GET    | Aggregate stats                     |

## The 5 Levels

| # | Setting | Puzzle | Lesson |
|---|---------|--------|--------|
| 1 | 🧙 Cave | Decode a locked door | Right data for the right problem |
| 2 | 🧝 Forest | Find the poison source | Heavy ≠ valuable |
| 3 | 🕵️ Castle | Solve a theft | Source authority matters |
| 4 | 👩‍🔧 Sky | Fix a failing airship | Check what changed recently |
| 5 | ⚔️ Dungeon | Answer a dragon's riddle | Small + specific > large + generic |

## Privacy

Zero personal data. Elvish names only. Database stores: name, score, timestamp.

## License

MIT

---

Created by [Velmira Georgieva](https://github.com/VelmiraPetkova)
