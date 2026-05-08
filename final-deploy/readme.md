# Psychiatry Intern Curriculum — Multi-User Setup Guide

## What Changed & Why

The original app stored all data in **localStorage** — meaning each browser/device had its own isolated copy. Profiles couldn't be shared, admins couldn't see student progress, and progress was lost when switching devices.

This version uses **Supabase** (a free cloud database) as the backend. Now:
- Every user's profile and progress is saved in the cloud
- Users can log in from any device and see the same progress
- The administrator can see **all** students' real-time progress
- Multiple admin accounts are supported

---

## Setup (one-time, ~5 minutes)

### Step 1 — Create a free Supabase project

1. Go to https://supabase.com and sign up (free)
2. Click **New Project** → give it a name (e.g. `psych-intern`) → choose a region
3. Wait ~1 minute for the project to be ready

### Step 2 — Run the database schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Paste the entire SQL block from the top of `db.js` (between the `/* ... */` comment markers)
3. Click **Run** — you should see "Success. No rows returned"

### Step 3 — Get your API keys

1. In Supabase, go to **Settings → API**
2. Copy your **Project URL** (looks like `https://abcxyz.supabase.co`)
3. Copy your **anon public** key (long string starting with `eyJ...`)

### Step 4 — Paste keys into db.js

Open `db.js` and replace the two placeholders at the very top of the file:

```javascript
const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';  // ← your URL here
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';                   // ← your key here
```

### Step 5 — Deploy to Netlify

1. Zip the entire project folder
2. Go to https://app.netlify.com → **Add new site → Deploy manually**
3. Drag and drop the zip file
4. Your site will be live in ~30 seconds at a `.netlify.app` URL

---

## How the Admin Account Works

On the login screen, click the **👑 Admin** tab:
- Fill in name, email, password
- Enter the admin access code: `PSYCH-ADMIN-2024`
- Click **Create Admin Account**

You'll land on the Admin Dashboard showing all student progress.

**Change the admin code** (recommended before sharing the site):
- Log in as admin → **👑 Admin** → **Admin Settings** → enter new code → **Save**

Students register normally through the **Create Account** tab.

---

## Admin Dashboard Features

- Real-time stats for every student: completion %, lessons, quizzes, sims, XP
- At-risk flagging (students below 30% completion)
- Last active timestamp per student
- Admin code management

---

## File Reference

| File | Purpose |
|------|---------|
| `index.html` | Main HTML + all CSS |
| `content.js` | All curriculum content |
| `db.js` | **NEW** — Supabase backend layer |
| `app.js` | UI and app logic (updated for async) |
| `netlify.toml` | Netlify config |
