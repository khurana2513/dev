# TalentHub Live — Developer Setup & Operations Guide

> **Last updated:** April 2026  
> **Maintainer:** Ayush Khurana  
> **Status:** Production live at th.blackmonkey.in

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Git Branch Strategy](#2-git-branch-strategy)
3. [First-Time Setup on Any Machine](#3-first-time-setup-on-any-machine)
4. [Environment Variables Reference](#4-environment-variables-reference)
5. [Mac Mini as Dev Server (Always-On)](#5-mac-mini-as-dev-server-always-on)
6. [Cloudflare Tunnel Setup](#6-cloudflare-tunnel-setup)
7. [Dev Database Setup (Neon — Free)](#7-dev-database-setup-neon--free)
8. [Frontend: Vercel Setup](#8-frontend-vercel-setup)
9. [Daily Development Workflows](#9-daily-development-workflows)
10. [Resuming from MacBook (Away from Home)](#10-resuming-from-macbook-away-from-home)
11. [Railway Production Reference](#11-railway-production-reference)
12. [Google OAuth Setup](#12-google-oauth-setup)
13. [Database Migrations](#13-database-migrations)
14. [Common Commands Cheatsheet](#14-common-commands-cheatsheet)
15. [Troubleshooting](#15-troubleshooting)
16. [Cost Breakdown](#16-cost-breakdown)

---

## 1. Architecture Overview

```
╔══════════════════════════════════════════════════════════════════╗
║  PRODUCTION  (th.blackmonkey.in)                  ← NEVER TOUCH  ║
╠══════════════════════════════════════════════════════════════════╣
║  Frontend:  Vercel (main branch)                                  ║
║    VITE_API_BASE = https://hi-test.up.railway.app                 ║
║  Backend:   Railway "hi" service (main branch)                    ║
║    URL:     https://hi-test.up.railway.app                        ║
║  Database:  Railway PostgreSQL (production data, real users)      ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  DEVELOPMENT  (dev.th.blackmonkey.in / dev.blackmonkey.in)        ║
╠══════════════════════════════════════════════════════════════════╣
║  Frontend:  Vercel Preview (dev branch)                           ║
║    VITE_API_BASE = https://dev-api.blackmonkey.in                 ║
║  Backend:   Mac Mini running FastAPI on port 5000                 ║
║    URL:     https://dev-api.blackmonkey.in                        ║
║             (via Cloudflare Tunnel → localhost:5000)              ║
║  Database:  Neon PostgreSQL free tier (dev data only)             ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  LOCAL  (when hacking on MacBook away from home)                  ║
╠══════════════════════════════════════════════════════════════════╣
║  Frontend:  localhost:5173  (npm run dev)                         ║
║    VITE_API_BASE = http://localhost:5000                           ║
║  Backend:   localhost:5000  (uvicorn, same Neon dev DB)           ║
║  Database:  Neon dev DB (cloud, accessible from anywhere)         ║
╚══════════════════════════════════════════════════════════════════╝
```

### Why this architecture

| Concern | Solution | Cost |
|---|---|---|
| Don't break production | Separate DB, separate backend, separate branch | Free |
| Real domain testing | Cloudflare Tunnel exposes Mac Mini publicly | Free |
| Railway budget ($5/mo, $2 used) | Mac Mini = dev backend, Neon = dev DB | $0 extra |
| Seamless MacBook/Mac Mini switch | Both connect to same Neon dev DB | — |
| Always-on dev server | Mac Mini + launchd auto-start | — |

---

## 2. Git Branch Strategy

```
main    ──── production (Railway auto-deploys) ← only merge here when feature is done
  │
  └── dev ──── development (Mac Mini runs this) ← all daily work here
        │
        ├── feature/leaderboard-page
        ├── feature/subscription-gate
        └── fix/burst-mode-scoring
```

### Rules

- `main` = production. **Never develop directly on main.** Only merge from `dev` when a feature is complete and tested.
- `dev` = your working branch. Push here freely. Mac Mini auto-pulls (if cron is set up).
- Feature branches = optional but recommended for larger changes. Branch from `dev`, PR back into `dev`.
- **Never** `git push origin main` directly from a half-finished state.

### How to create the `dev` branch (first time)

```bash
# From your repo root
git checkout -b dev
git push -u origin dev
```

### Merging dev → main (when feature is ready)

```bash
git checkout main
git merge dev
git push origin main
# Railway auto-deploys within ~2 minutes
```

---

## 3. First-Time Setup on Any Machine

Run this once on a new Mac Mini or MacBook:

```bash
# 1. Clone the repo
git clone https://github.com/mysteryguy47/talenthubtest.git
cd talenthubtest

# 2. Run setup script
bash scripts/setup-new-machine.sh

# 3. Fill in env files (see Section 4)
nano backend/.env
nano frontend/.env.local
```

**What `setup-new-machine.sh` does:**
- Installs Python 3.12, Node, PostgreSQL (local), cloudflared via Homebrew
- Creates Python venv at `.venv/`
- Installs all backend pip dependencies
- Installs Playwright Chromium (for PDF generation)
- Runs `npm install` in frontend
- Creates `backend/.env` and `frontend/.env.local` from examples

---

## 4. Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Production (Railway) | Development (Mac Mini) | Local MacBook |
|---|---|---|---|
| `APP_ENV` | `production` | `development` | `development` |
| `DATABASE_URL` | Railway PostgreSQL URL | Neon dev URL | Neon dev URL |
| `SECRET_KEY` | Railway secret (unique) | Any 32+ char string (different from prod) | Same as dev |
| `GOOGLE_CLIENT_ID` | Your Google OAuth ID | Same | Same |
| `GOOGLE_CLIENT_SECRET` | Your Google secret | Same | Same |
| `ALLOWED_ORIGINS` | `https://th.blackmonkey.in` | `https://dev-api.blackmonkey.in,http://localhost:5173` | `http://localhost:5173` |
| `ADMIN_EMAILS` | comma-separated | Same | Same |
| `LOG_LEVEL` | `INFO` | `DEBUG` | `DEBUG` |
| `PLAYWRIGHT_BROWSERS_PATH` | `0` (Railway-specific) | (leave unset) | (leave unset) |

**⚠️ Secret Key Rule:** Dev and prod MUST use different `SECRET_KEY` values. If they share a key, a dev session token would be valid on production — a security hole.

**Backend `.env` for Mac Mini/dev:**
```env
APP_ENV=development
DATABASE_URL=postgresql://neondb_owner:PASSWORD@NEON_HOST.neon.tech/neondb?sslmode=require
SECRET_KEY=dev_secret_key_replace_with_openssl_rand_hex_32_output
GOOGLE_CLIENT_ID=193498438302-xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxx
ALLOWED_ORIGINS=https://dev.th.blackmonkey.in,https://dev-api.blackmonkey.in,http://localhost:5173
ADMIN_EMAILS=ayushkhurana47@gmail.com,sunitakhurana15061977@gmail.com
LOG_LEVEL=DEBUG
```

### Frontend (`frontend/.env.local`)

| Variable | Production Vercel | Dev branch Vercel | Local |
|---|---|---|---|
| `VITE_API_BASE` | `https://hi-test.up.railway.app` | `https://dev-api.blackmonkey.in` | `http://localhost:5000` |
| `VITE_GOOGLE_CLIENT_ID` | Your Google Client ID | Same | Same |

**For local development only** (`frontend/.env.local`):
```env
VITE_API_BASE=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=193498438302-xxxx.apps.googleusercontent.com
```

### Vercel Environment Variables (set in Vercel dashboard)

Go to: Vercel → Project → Settings → Environment Variables

| Variable | Environment | Value |
|---|---|---|
| `VITE_API_BASE` | Production | `https://hi-test.up.railway.app` |
| `VITE_API_BASE` | Preview (dev branch) | `https://dev-api.blackmonkey.in` |
| `VITE_GOOGLE_CLIENT_ID` | All | Your Google Client ID |

**To make the Preview branch (dev) use the dev API:**  
In Vercel: Environment Variables → Add `VITE_API_BASE` → set to Preview only → value = `https://dev-api.blackmonkey.in`.

---

## 5. Mac Mini as Dev Server (Always-On)

### How it works
- Mac Mini runs the FastAPI backend on port 5000 continuously  
- Cloudflare Tunnel exposes port 5000 as `https://dev-api.blackmonkey.in`
- When you push to `dev` branch, Mac Mini auto-pulls and restarts (via cron)
- When MacBook opens Vercel dev frontend → it calls `https://dev-api.blackmonkey.in` → hits Mac Mini

### Start backend manually

```bash
./scripts/mac-mini-start.sh
```

Logs go to `logs/backend-dev.log`. Stop with:

```bash
./scripts/mac-mini-stop.sh
```

### Auto-start on Mac Mini login (launchd)

```bash
# 1. Edit the plist — replace /PATH/TO/REPO with actual path
nano scripts/com.talenthub.dev-backend.plist
# Example: /Users/ayush/Desktop/talenthublive-main

# 2. Install it
cp scripts/com.talenthub.dev-backend.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.talenthub.dev-backend.plist

# 3. Verify
launchctl list | grep talenthub
# Should show:  -   0   com.talenthub.dev-backend
```

After this, the backend starts automatically whenever you log in to the Mac Mini, and restarts if it crashes.

### Auto-pull when you push to dev (cron)

```bash
# Open crontab
crontab -e

# Add this line (checks for new commits every 2 minutes):
*/2 * * * * /Users/YOUR_USERNAME/Desktop/talenthublive-main/scripts/dev-pull-restart.sh >> /Users/YOUR_USERNAME/Desktop/talenthublive-main/logs/cron.log 2>&1
```

Now whenever you push to `dev` branch (from MacBook or anywhere), within 2 minutes the Mac Mini pulls the changes and restarts the backend.

### Check what's running

```bash
# Is backend alive?
curl http://localhost:5000/health

# See live logs
tail -f logs/backend-dev.log

# What's on port 5000?
lsof -i tcp:5000

# Is the tunnel up?
curl https://dev-api.blackmonkey.in/health
```

---

## 6. Cloudflare Tunnel Setup

**Run these commands once on the Mac Mini. Never need to repeat.**

```bash
# 1. Install cloudflared
brew install cloudflared

# 2. Log in (opens browser, select blackmonkey.in)
cloudflared tunnel login

# 3. Create the tunnel
cloudflared tunnel create talenthub-dev
# Output: Created tunnel talenthub-dev with id abc123-def456-...
# A credentials JSON file is saved to ~/.cloudflared/

# 4. Set up the config file
#    Find the credentials file path printed in step 3, then:
cp scripts/cloudflare-tunnel-config.yml ~/.cloudflared/config.yml
# Edit the file: replace YOUR_USERNAME and update credentials-file path
nano ~/.cloudflared/config.yml

# 5. Add DNS record (creates CNAME in Cloudflare automatically)
cloudflared tunnel route dns talenthub-dev dev-api.blackmonkey.in

# 6. Test it manually (keep backend running first)
cloudflared tunnel run talenthub-dev
# In another terminal: curl https://dev-api.blackmonkey.in/health

# 7. Install as system service (auto-starts on boot)
sudo cloudflared service install
sudo launchctl start com.cloudflare.cloudflared
```

**Verify:**
```
https://dev-api.blackmonkey.in/health  →  should return {"status":"ok","db_latency_ms":...}
```

**Cloudflare Dashboard to verify:**  
cloudflare.com → blackmonkey.in → DNS → should see CNAME `dev-api` pointing to your tunnel.

---

## 7. Dev Database Setup (Neon — Free)

**Neon gives you a free PostgreSQL database forever. No credit card needed for the free tier.**

### Create Neon account and database

1. Go to **neon.tech** → Sign up (free)
2. Create a new project → Name: `talenthub-dev`
3. Database name: `neondb` (default is fine)
4. Region: `AWS ap-south-1` (Mumbai — lowest latency from India)
5. Copy the connection string from the dashboard:  
   `postgresql://neondb_owner:PASSWORD@HOST.neon.tech/neondb?sslmode=require`

### Initialize the dev database

```bash
# Make sure backend/.env has the Neon DATABASE_URL set
source .venv/bin/activate
cd backend

# Run migrations to create all tables
python railway_migrate.py
# OR use Alembic:
# alembic upgrade head

# Seed initial data (point rules, badge definitions, reward rules)
python seed_point_rules.py
python seed_reward_data.py
```

### Copy production data to dev (optional)

If you want real user data for testing (anonymized or as-is):

```bash
# Dump from Railway production DB (get DATABASE_PUBLIC_URL from Railway)
pg_dump "postgresql://postgres:PASSWORD@switchback.proxy.rlwy.net:51498/railway" \
  --no-acl --no-owner -f /tmp/prod_dump.sql

# Restore to Neon dev DB
psql "postgresql://neondb_owner:PASSWORD@HOST.neon.tech/neondb?sslmode=require" \
  < /tmp/prod_dump.sql
```

**⚠️ This copies real user data including emails and PII. Only do this if needed for specific testing.**

### Neon free tier limits

| Limit | Value | Enough for? |
|---|---|---|
| Storage | 512 MB | Yes — dev data is tiny |
| Compute | 0.25 vCPU / 1 GB RAM | Yes — on-demand startup |
| Projects | 1 | Yes |
| Auto-suspend | After 5 min inactivity | Yes (wakes in ~1s on first query) |
| Branches | 10 | Can create staging branch too |

---

## 8. Frontend: Vercel Setup

### Current setup
- Production: Vercel connected to GitHub `main` branch → deploys to `th.blackmonkey.in`
- Preview: Vercel auto-generates preview URLs for every branch and PR

### Setting up dev branch on Vercel (custom domain)

1. In Vercel dashboard → your project → Settings → Domains
2. Add domain: `dev.th.blackmonkey.in` → set to preview deployments from `dev` branch
3. Vercel will give you DNS records → add them in Cloudflare for blackmonkey.in

### Setting API base per environment

In Vercel → Project → Settings → Environment Variables:

```
VITE_API_BASE
  Production  → https://hi-test.up.railway.app
  Preview     → https://dev-api.blackmonkey.in    ← this targets Mac Mini

VITE_GOOGLE_CLIENT_ID
  All         → 193498438302-apr7tr3mskq4cmhm564mloa2hi0p2hoq.apps.googleusercontent.com
```

**This is the key config.** When you push to `dev` branch, Vercel builds the frontend with `VITE_API_BASE=https://dev-api.blackmonkey.in`, which hits your Mac Mini. When you push to `main`, it builds with the Railway URL.

### Build settings in Vercel

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node Version | 20.x |

---

## 9. Daily Development Workflows

### Scenario A: Working on Mac Mini (ideal)

```bash
# 1. Make sure you're on dev branch
git checkout dev

# 2. Pull latest
git pull origin dev

# 3. Backend is already running (launchd started it on boot)
#    If not: ./scripts/mac-mini-start.sh

# 4. Start frontend
cd frontend && npm run dev
# Opens http://localhost:5173 → calls http://localhost:5000 (local backend)
# For testing with public URL, open https://dev.th.blackmonkey.in instead

# 5. Write code...

# 6. Push changes (commits to dev branch, never main)
git add .
git commit -m "feat: add leaderboard page"
git push origin dev
# ↑ Vercel picks this up and builds dev.th.blackmonkey.in within ~1 min
# ↑ Mac Mini cron pulls changes within 2 min and restarts backend
```

### Scenario B: Working on MacBook at home (on same network)

Same as Scenario A. MacBook runs frontend locally, backend is on Mac Mini.  
You can optionally run backend locally too with `./scripts/local-dev.sh` (see Section 10).

### Scenario C: Feature branch workflow

```bash
# Create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/leaderboard-page

# Work...
git add .
git commit -m "feat: replace LeaderboardComingSoon with real page"

# Push feature branch (Vercel creates a unique preview URL for it)
git push -u origin feature/leaderboard-page

# When done, merge back into dev
git checkout dev
git merge feature/leaderboard-page
git push origin dev
git branch -d feature/leaderboard-page
git push origin --delete feature/leaderboard-page
```

### Scenario D: Ship a feature to production

```bash
# Ensure dev is fully tested
git checkout dev
git pull origin dev

# Merge to main
git checkout main
git pull origin main
git merge dev
git push origin main

# Railway auto-deploys main within ~2 minutes
# Monitor: https://railway.app → "hi" service → Deployments tab
```

---

## 10. Resuming from MacBook (Away from Home)

When you're away and Mac Mini is running at home:

### Option A: Use Mac Mini backend remotely (recommended)

The Cloudflare Tunnel is running on Mac Mini. `dev-api.blackmonkey.in` is accessible from anywhere.

```bash
# On MacBook: clone repo if needed, set frontend to use remote dev API
cd frontend
cat .env.local
# Should have VITE_API_BASE=https://dev-api.blackmonkey.in
# If not: echo "VITE_API_BASE=https://dev-api.blackmonkey.in" > .env.local

npm run dev
# Now localhost:5173 → https://dev-api.blackmonkey.in → Mac Mini backend
```

Push code, Mac Mini's cron picks it up within 2 minutes and restarts.

### Option B: Run everything locally on MacBook

Use when Mac Mini is off, or for fully local work:

```bash
# Terminal 1: Backend
./scripts/local-dev.sh
# Runs backend at localhost:5000, points to Neon dev DB

# Terminal 2: Frontend
cd frontend
# Ensure .env.local has: VITE_API_BASE=http://localhost:5000
npm run dev
# Opens localhost:5173 → localhost:5000 → Neon cloud dev DB
```

### Sync your .env files between machines

The `.env` files are gitignored. You need to keep them in sync manually. Recommended approaches:

**Option 1: Private GitHub Gist**  
Create a secret gist at gist.github.com with your `.env` content. Copy when setting up a new machine.

**Option 2: iCloud Drive**  
Save `backend-env.txt` and `frontend-env.txt` in iCloud. Copy to the right path on each machine.

**Option 3: 1Password / Bitwarden Secure Notes**  
Store env contents as secure notes. Free and syncs everywhere.

**DO NOT** commit `.env` or `.env.local` to git. They are rightly ignored.

---

## 11. Railway Production Reference

**Production service: `hi`**  
URL: `https://hi-test.up.railway.app`  
Repo: `mysteryguy47/talenthubtest`, branch: `main`  

Build command: `pip install -r requirements.txt && playwright install chromium`  
Start command: `sh -c "uvicorn main:app --host 0.0.0.0 --port $PORT"`  

### Railway environment variables (set in Railway dashboard)

| Variable | Value |
|---|---|
| `APP_ENV` | `production` |
| `DATABASE_URL` | Railway PostgreSQL internal URL (auto-shared) |
| `SECRET_KEY` | The 64-char hex key (already set) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `ALLOWED_ORIGINS` | `https://th.blackmonkey.in` |
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `NIXPACKS_PYTHON_VERSION` | `3.12` |
| `PLAYWRIGHT_BROWSERS_PATH` | `0` |

### Railway database backup

```bash
# Dump production DB (use DATABASE_PUBLIC_URL shown in Railway Postgres → Variables)
pg_dump "postgresql://postgres:PASSWORD@switchback.proxy.rlwy.net:51498/railway" \
  --no-acl --no-owner \
  -f backups/prod_$(date +%Y%m%d).sql
```

Do this before any major migration. Railway also has built-in daily backups (check Postgres → Backups tab).

### Redeploy production without code change

```bash
# In Railway dashboard → "hi" service → Deployments → Redeploy
# OR push an empty commit:
git checkout main
git commit --allow-empty -m "trigger deploy"
git push origin main
```

---

## 12. Google OAuth Setup

Both dev and production use the same Google OAuth credentials.  
You need to add the dev domain to the authorised list.

1. Go to **console.cloud.google.com** → APIs & Services → Credentials
2. Click your OAuth 2.0 Client ID
3. Under **Authorised JavaScript Origins**, add:
   - `https://th.blackmonkey.in` (production — already there)
   - `https://dev.th.blackmonkey.in` (dev frontend)
   - `http://localhost:5173` (local dev)
4. Under **Authorised redirect URIs**, add:
   - `https://th.blackmonkey.in`
   - `https://dev.th.blackmonkey.in`
   - `http://localhost:5173`
5. Save. Changes take up to 5 minutes to propagate.

---

## 13. Database Migrations

The project uses both manual migration scripts and Alembic.

### Adding a new table or column

```bash
# 1. Edit backend/models.py (add your table/column)
# 2. Create a migration
cd backend
source ../.venv/bin/activate
alembic revision --autogenerate -m "add_my_new_table"
# Review the generated file in backend/alembic/versions/

# 3. Apply to DEV database
alembic upgrade head

# 4. Test thoroughly on dev

# 5. When merging to main, Railway's start command does NOT auto-run migrations.
#    You must run it manually against production DB:
DATABASE_URL="postgresql://postgres:PASSWORD@switchback.proxy.rlwy.net:51498/railway" \
  alembic upgrade head
# OR use the Railway CLI:
# railway run --service hi python -c "from models import Base, engine; Base.metadata.create_all(engine)"
```

**⚠️ Always run migrations on dev first. Never apply an untested migration to production.**

### Production migration via Railway CLI

```bash
# Install Railway CLI
brew install railway

# Log in
railway login

# Run a migration command against production
railway run --service hi alembic upgrade head
```

---

## 14. Common Commands Cheatsheet

### Git

```bash
git checkout dev                   # switch to dev branch
git checkout main                  # switch to main (production)
git pull origin dev                # pull latest dev changes
git push origin dev                # push your changes to dev
git merge dev                      # (from main) merge dev into main
git log --oneline -10              # last 10 commits
git status                         # what's changed
git stash                          # save dirty work temporarily
git stash pop                      # restore stashed work
```

### Backend

```bash
# Start locally (Mac Mini or MacBook)
./scripts/local-dev.sh

# Mac Mini server mode
./scripts/mac-mini-start.sh
./scripts/mac-mini-stop.sh
./scripts/dev-pull-restart.sh      # pull latest + restart

# View backend logs (Mac Mini server mode)
tail -f logs/backend-dev.log

# Run in virtualenv
source .venv/bin/activate
cd backend && uvicorn main:app --host 0.0.0.0 --port 5000 --reload

# Install/update dependencies
source .venv/bin/activate && pip install -r backend/requirements.txt

# Run migrations
cd backend && alembic upgrade head

# Seed initial data
cd backend && python seed_point_rules.py && python seed_reward_data.py

# Check backend is alive
curl http://localhost:5000/health
curl https://dev-api.blackmonkey.in/health   # via tunnel
```

### Frontend

```bash
cd frontend

# Dev server (hot reload)
npm run dev

# Build (produces dist/ folder)
npm run build

# Preview the production build locally
npm run preview

# Install dependencies
npm install
```

### Cloudflare Tunnel

```bash
cloudflared tunnel list                         # list tunnels
cloudflared tunnel run talenthub-dev            # run manually
sudo launchctl start com.cloudflare.cloudflared # start service
sudo launchctl stop com.cloudflare.cloudflared  # stop service
cloudflared tunnel info talenthub-dev           # check status
```

### PostgreSQL (local, if needed)

```bash
brew services start postgresql@17              # start local Postgres
brew services stop postgresql@17               # stop
psql -U postgres                               # open psql
createdb talenthub_dev                         # create local dev DB
psql -U postgres talenthub_dev                 # connect to dev DB
```

### Railway CLI

```bash
brew install railway
railway login
railway status
railway logs --service hi                      # view production backend logs
railway run --service hi python seed_reward_data.py   # run script in prod
```

---

## 15. Troubleshooting

### "dev-api.blackmonkey.in returns 502"
- Mac Mini is off, or Cloudflare Tunnel is not running
- SSH into Mac Mini or turn it on
- Check tunnel: `sudo launchctl list | grep cloudflare`
- Start tunnel: `sudo launchctl start com.cloudflare.cloudflared`
- Start backend: `./scripts/mac-mini-start.sh`

### "Google login fails on dev site"
- `dev.th.blackmonkey.in` is not in Google OAuth "Authorised JavaScript Origins"
- Go to Google Cloud Console → add it (see Section 12)

### "Backend starts but DB connection fails"
- Check `backend/.env` has correct `DATABASE_URL`
- For Neon: ensure the URL ends with `?sslmode=require`
- Test: `psql "postgresql://..."` from terminal

### "npm run dev builds but frontend shows blank/white"
- Open browser DevTools → Console tab — likely an env var is missing
- Check `frontend/.env.local` has `VITE_API_BASE` set
- Check the backend is running and accessible from CORS

### "Changes pushed to dev but dev.th.blackmonkey.in doesn't update"
- Vercel build might be running — check Vercel dashboard → Deployments
- If build failed, check Vercel build logs
- For backend changes: Mac Mini cron runs every 2 minutes. Wait or run `./scripts/dev-pull-restart.sh` manually

### "Production (th.blackmonkey.in) broke after merging dev → main"
- Check Railway deployment logs: Railway → "hi" service → Deployments
- Rollback: Railway → "hi" service → Deployments → click previous deploy → Redeploy
- Fix in dev branch, then merge to main again

### "Port 5000 already in use"
```bash
lsof -ti tcp:5000 | xargs kill -9
```

### "Module not found / import errors in backend"
```bash
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### "Vite build fails with type errors"
```bash
cd frontend && npm run build 2>&1 | head -50
# Fix the TypeScript errors shown, then rebuild
```

---

## 16. Cost Breakdown

| Service | Plan | Monthly Cost | Purpose |
|---|---|---|---|
| Railway "hi" (backend) | Hobby $5 | ~$1.50 | Production backend |
| Railway PostgreSQL | Hobby (included) | ~$0.50 | Production database |
| Vercel | Free | $0 | Frontend hosting |
| Neon PostgreSQL | Free | $0 | Dev database |
| Cloudflare (domain + tunnel) | Free | $0 | DNS + dev tunnel |
| Mac Mini electricity | — | ~₹200 | Dev server |
| **Total** | | **~$2/month** | |

**Remaining Railway budget:** ~$3/month unused → plenty of headroom.  
Neon free tier covers dev database at zero cost.  
Cloudflare Tunnel is free (no egress limits for tunnels).

---

## Quick Reference Card

```
PRODUCTION:
  Frontend:  th.blackmonkey.in (Vercel, main branch)
  Backend:   hi-test.up.railway.app (Railway)
  DB:        Railway PostgreSQL (production data)
  Deploy:    git push origin main → auto-deploys

DEVELOPMENT:
  Frontend:  dev.th.blackmonkey.in (Vercel, dev branch)
  Backend:   dev-api.blackmonkey.in → Mac Mini port 5000
  DB:        Neon dev (cloud PostgreSQL, free)
  Deploy:    git push origin dev → Vercel rebuilds + Mac Mini cron pulls

LOCAL:
  Frontend:  localhost:5173  (npm run dev in frontend/)
  Backend:   localhost:5000  (./scripts/local-dev.sh)
  DB:        Neon dev (same cloud DB — works from anywhere)

KEY FILES:
  backend/.env          → never commit, has DB URL + secrets
  frontend/.env.local   → never commit, has VITE_API_BASE
  scripts/              → all helper shell scripts

KEY SCRIPTS:
  ./scripts/setup-new-machine.sh    → first-time setup
  ./scripts/local-dev.sh            → start backend locally
  ./scripts/mac-mini-start.sh       → start Mac Mini server mode
  ./scripts/mac-mini-stop.sh        → stop Mac Mini server mode
  ./scripts/dev-pull-restart.sh     → pull latest + restart (used by cron)
```
