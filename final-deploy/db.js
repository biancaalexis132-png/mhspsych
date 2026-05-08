// ============================================================
// db.js — Supabase Backend Layer
// Replaces localStorage with real persistent cloud storage.
// All user profiles, progress, and XP are stored in Supabase
// so every device and every admin sees the same live data.
//
// SETUP INSTRUCTIONS (one-time, ~5 minutes):
//  1. Go to https://supabase.com → create a free project
//  2. In your Supabase project → SQL Editor → run SCHEMA below
//  3. Go to Settings → API → copy "Project URL" and "anon key"
//  4. Paste them into SUPABASE_URL and SUPABASE_ANON_KEY below
//  5. Deploy to Netlify — done!
// ============================================================

// ── !! PASTE YOUR KEYS HERE !! ─────────────────────────────
const SUPABASE_URL      = 'https://eskqgxdelphisgxbcykk.supabase.co';
// IMPORTANT: Use the LEGACY anon key (starts with eyJ...), NOT sb_publishable_...
// Find it: Supabase → Settings → API → "Legacy anon, service_role API keys" tab → anon
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVza3FneGRlbHBoaXNneGJjeWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjEyNzUsImV4cCI6MjA4ODMzNzI3NX0.EzRsrWIza1TVHe3-RZjD2-6iIgjV2ybQUZtR8DpnQjk';
// ───────────────────────────────────────────────────────────

// ── SQL SCHEMA (run once in Supabase SQL Editor) ─────────────
/*
-- Users table
create table if not exists users (
  id          text primary key,
  email       text unique not null,
  password    text not null,
  full_name   text not null,
  program     text default '',
  site        text default '',
  start_date  text default '',
  is_admin    boolean default false,
  created_at  timestamptz default now(),
  last_active timestamptz default now()
);

-- Progress table (one row per user, JSON blob)
create table if not exists progress (
  user_id   text primary key references users(id) on delete cascade,
  data      jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- XP table (one row per user, JSON blob)
create table if not exists xp_data (
  user_id   text primary key references users(id) on delete cascade,
  data      jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- App settings (admin code, etc.)
create table if not exists app_settings (
  key   text primary key,
  value text not null
);

-- Insert default admin code
insert into app_settings (key, value)
values ('admin_code', 'PSYCH-ADMIN-2024')
on conflict (key) do nothing;

-- Row Level Security: allow anon reads/writes (app handles auth)
alter table users enable row level security;
alter table progress enable row level security;
alter table xp_data enable row level security;
alter table app_settings enable row level security;

create policy "allow_all_users"       on users        for all using (true) with check (true);
create policy "allow_all_progress"    on progress     for all using (true) with check (true);
create policy "allow_all_xp"          on xp_data      for all using (true) with check (true);
create policy "allow_all_settings"    on app_settings for all using (true) with check (true);
*/

// ── Supabase REST helpers ─────────────────────────────────────
const SB = {
  headers() {
    return {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Prefer':        'return=representation'
    };
  },

  async get(table, filters = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
    for (const [k, v] of Object.entries(filters)) {
      url += `&${k}=eq.${encodeURIComponent(v)}`;
    }
    const r = await fetch(url, { headers: this.headers() });
    if (!r.ok) { console.error('SB.get error', await r.text()); return null; }
    const rows = await r.json();
    return rows;
  },

  async getOne(table, filters = {}) {
    const rows = await this.get(table, filters);
    return (rows && rows.length > 0) ? rows[0] : null;
  },

  async upsert(table, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method:  'POST',
      headers: { ...this.headers(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body:    JSON.stringify(data)
    });
    if (!r.ok) { console.error('SB.upsert error', await r.text()); return null; }
    const rows = await r.json();
    return Array.isArray(rows) ? rows[0] : rows;
  },

  async update(table, filters, data) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?`;
    for (const [k, v] of Object.entries(filters)) url += `${k}=eq.${encodeURIComponent(v)}&`;
    const r = await fetch(url, {
      method:  'PATCH',
      headers: this.headers(),
      body:    JSON.stringify(data)
    });
    if (!r.ok) { console.error('SB.update error', await r.text()); return null; }
    return true;
  },

  async delete(table, filters) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?`;
    for (const [k, v] of Object.entries(filters)) url += `${k}=eq.${encodeURIComponent(v)}&`;
    const r = await fetch(url, { method: 'DELETE', headers: this.headers() });
    if (!r.ok) { console.error('SB.delete error', await r.text()); return null; }
    return true;
  }
};

// ── Session (current user stored in sessionStorage only) ──────
const Session = {
  get()    { try { const v = sessionStorage.getItem('currentUser'); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(u)   { try { sessionStorage.setItem('currentUser', JSON.stringify(u)); } catch {} },
  clear()  { try { sessionStorage.removeItem('currentUser'); } catch {} }
};

// ── Auth ──────────────────────────────────────────────────────
const Auth = {
  getCurrentUser: () => Session.get(),
  setCurrentUser: (u) => Session.set(u),
  logout: () => Session.clear(),

  async register(email, password, fullName, program, site, startDate, isAdmin = false) {
    const existing = await SB.getOne('users', { email });
    if (existing) return { error: 'Email already registered' };

    const id   = 'u_' + Date.now() + Math.random().toString(36).slice(2, 7);
    const user = {
      id, email, password, full_name: fullName,
      program: program || '', site: site || '',
      start_date: startDate || '', is_admin: isAdmin,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString()
    };
    const saved = await SB.upsert('users', user);
    if (!saved) return { error: 'Failed to create account. Please try again.' };

    // Init progress + XP rows
    await SB.upsert('progress', { user_id: id, data: { lessons: {}, quizzes: {}, simulations: {}, activity: [] } });
    await SB.upsert('xp_data',  { user_id: id, data: { totalXP: 0, level: 1, earned: [], transactions: [] } });

    const userObj = Auth._rowToUser(saved);
    return { user: userObj };
  },

  async login(email, password) {
    const row = await SB.getOne('users', { email });
    if (!row) return { error: 'No account found with that email' };
    if (row.password !== password) return { error: 'Incorrect password' };

    await SB.update('users', { id: row.id }, { last_active: new Date().toISOString() });
    const userObj = Auth._rowToUser({ ...row, last_active: new Date().toISOString() });
    Auth.setCurrentUser(userObj);
    return { user: userObj };
  },

  async updateProfile(id, data) {
    const updateData = {};
    if (data.fullName  !== undefined) updateData.full_name   = data.fullName;
    if (data.program   !== undefined) updateData.program     = data.program;
    if (data.site      !== undefined) updateData.site        = data.site;
    updateData.last_active = new Date().toISOString();
    await SB.update('users', { id }, updateData);
    const row = await SB.getOne('users', { id });
    if (!row) return null;
    const userObj = Auth._rowToUser(row);
    Auth.setCurrentUser(userObj);
    return userObj;
  },

  async deleteAccount(userId, email) {
    await SB.delete('progress', { user_id: userId });
    await SB.delete('xp_data',  { user_id: userId });
    await SB.delete('users',    { id: userId });
    Auth.logout();
  },

  async promoteToAdmin(email) {
    return await SB.update('users', { email }, { is_admin: true });
  },

  async getAllStudents() {
    const rows = await SB.get('users') || [];
    return rows.filter(r => !r.is_admin).map(Auth._rowToUser);
  },

  async getAllUsers() {
    const rows = await SB.get('users') || [];
    return rows.map(Auth._rowToUser);
  },

  _rowToUser(row) {
    return {
      id:         row.id,
      email:      row.email,
      password:   row.password,
      fullName:   row.full_name,
      program:    row.program   || '',
      site:       row.site      || '',
      startDate:  row.start_date || '',
      isAdmin:    row.is_admin  || false,
      createdAt:  row.created_at,
      lastActive: row.last_active
    };
  }
};

// ── Progress ──────────────────────────────────────────────────
const Progress = {
  _cache: {},   // userId → { data, dirty }

  async _load(userId) {
    if (this._cache[userId]) return this._cache[userId];
    const row = await SB.getOne('progress', { user_id: userId });
    const data = row ? row.data : { lessons: {}, quizzes: {}, simulations: {}, activity: [] };
    this._cache[userId] = data;
    return data;
  },

  async _save(userId) {
    const data = this._cache[userId];
    if (!data) return;
    await SB.upsert('progress', { user_id: userId, data, updated_at: new Date().toISOString() });
  },

  // Synchronous get — returns cache if available, empty otherwise
  // All callers that need fresh data should await _load first
  get(userId) {
    return this._cache[userId] || { lessons: {}, quizzes: {}, simulations: {}, activity: [] };
  },

  async load(userId) {
    return await this._load(userId);
  },

  async markLessonViewed(userId, lessonId, moduleId) {
    const p = await this._load(userId);
    if (!p.lessons[lessonId]) p.lessons[lessonId] = { moduleId, firstViewed: new Date().toISOString(), lastViewed: new Date().toISOString(), completed: false };
    else p.lessons[lessonId].lastViewed = new Date().toISOString();
    p.activity.unshift({ type: 'lesson_view', entityId: lessonId, details: { moduleId }, at: new Date().toISOString() });
    if (p.activity.length > 50) p.activity = p.activity.slice(0, 50);
    await this._save(userId);
  },

  async markLessonCompleted(userId, lessonId, moduleId) {
    const p = await this._load(userId);
    if (!p.lessons[lessonId]) p.lessons[lessonId] = { moduleId, firstViewed: new Date().toISOString() };
    if (p.lessons[lessonId].completed) return false;
    p.lessons[lessonId].completed    = true;
    p.lessons[lessonId].completedAt  = new Date().toISOString();
    p.lessons[lessonId].lastViewed   = new Date().toISOString();
    p.activity.unshift({ type: 'lesson_complete', entityId: lessonId, details: { moduleId }, at: new Date().toISOString() });
    if (p.activity.length > 50) p.activity = p.activity.slice(0, 50);
    await this._save(userId);
    return true;
  },

  async submitQuiz(userId, lessonId, moduleId, score, total, correct, passed, answers) {
    const p = await this._load(userId);
    if (!p.quizzes[lessonId]) p.quizzes[lessonId] = { moduleId, attempts: [] };
    const attempt = { score, total, correct, passed, answers, at: new Date().toISOString(), num: p.quizzes[lessonId].attempts.length + 1 };
    p.quizzes[lessonId].attempts.push(attempt);
    p.quizzes[lessonId].bestScore = Math.max(score, p.quizzes[lessonId].bestScore || 0);
    p.quizzes[lessonId].passed    = p.quizzes[lessonId].passed || passed;
    p.activity.unshift({ type: 'quiz_attempt', entityId: lessonId, details: { score, passed }, at: new Date().toISOString() });
    if (p.activity.length > 50) p.activity = p.activity.slice(0, 50);
    await this._save(userId);
    return attempt;
  },

  async submitSimulation(userId, simId, score, maxScore, details) {
    const p = await this._load(userId);
    if (!p.simulations[simId]) p.simulations[simId] = { results: [] };
    const pct    = Math.round(score / maxScore * 100);
    const result = { score, maxScore, pct, details, at: new Date().toISOString() };
    p.simulations[simId].results.push(result);
    p.simulations[simId].bestPct = Math.max(pct, p.simulations[simId].bestPct || 0);
    p.activity.unshift({ type: 'simulation', entityId: simId, details: { score, maxScore, pct }, at: new Date().toISOString() });
    if (p.activity.length > 50) p.activity = p.activity.slice(0, 50);
    await this._save(userId);
    return result;
  },

  getDashboard(userId) {
    const p       = this.get(userId);
    const modules = CONTENT_DATA.modules;
    const moduleProgress = modules.map(mod => {
      const lessons     = mod.lessons.filter(l => !l.comingSoon);
      const completed   = lessons.filter(l => p.lessons[l.id]?.completed).length;
      const quizLessons = lessons.filter(l => l.quizQuestions?.length > 0);
      const quizPassed  = quizLessons.filter(l => p.quizzes[l.id]?.passed).length;
      const lessonPct   = lessons.length > 0 ? (completed / lessons.length) * 100 : 0;
      const quizPct     = quizLessons.length > 0 ? (quizPassed / quizLessons.length) * 100 : 100;
      const simPct      = p.simulations[mod.id]?.bestPct || 0;
      const wL = 0.3, wQ = 0.4, wS = 0.3;
      let weighted = lessonPct * wL, totalW = wL;
      if (quizLessons.length > 0) { weighted += quizPct * wQ; totalW += wQ; }
      if (p.simulations[mod.id])  { weighted += simPct * wS;  totalW += wS; }
      const completion  = Math.min(100, totalW > 0 ? weighted / totalW : lessonPct);
      const quizScores  = quizLessons.map(l => p.quizzes[l.id]?.bestScore || 0).filter(s => s > 0);
      return {
        moduleId: mod.id, title: mod.title, icon: mod.icon, color: mod.color,
        completion: Math.round(completion * 10) / 10,
        lessonsCompleted: completed, totalLessons: lessons.length,
        quizPassed, quizTotal: quizLessons.length,
        bestScore: quizScores.length > 0 ? Math.max(...quizScores) : null
      };
    });
    const totalCompletion = moduleProgress.length > 0
      ? moduleProgress.reduce((s, m) => s + m.completion, 0) / moduleProgress.length : 0;
    const nextRecommended = [...moduleProgress].sort((a, b) => a.completion - b.completion)[0];
    return {
      totalCompletion: Math.round(totalCompletion * 10) / 10,
      moduleProgress,
      nextRecommended: nextRecommended?.moduleId || null
    };
  }
};

// ── XP System ──────────────────────────────────────────────────
const XP_REWARDS    = { lesson: 10, quiz_pass: 25, quiz_perfect: 50, sim_pass: 50, sim_any: 25, badge: 0 };
const XP_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000];

function xpToLevel(xp) {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) if (xp >= XP_THRESHOLDS[i]) return i + 1;
  return 1;
}
function xpProgress(xp) {
  const level = xpToLevel(xp);
  const cur   = XP_THRESHOLDS[level - 1] || 0;
  const next  = XP_THRESHOLDS[level] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  return { level, current: xp - cur, next: next - cur, totalXP: xp };
}

const XPSystem = {
  _cache: {},   // userId → xp data

  async _load(userId) {
    if (this._cache[userId]) return this._cache[userId];
    const row  = await SB.getOne('xp_data', { user_id: userId });
    const data = row ? row.data : { totalXP: 0, level: 1, earned: [], transactions: [] };
    this._cache[userId] = data;
    return data;
  },

  async _save(userId) {
    const data = this._cache[userId];
    if (!data) return;
    await SB.upsert('xp_data', { user_id: userId, data, updated_at: new Date().toISOString() });
  },

  // Sync get from cache (must call load(userId) first for fresh data)
  getProfile(userId) {
    const data = this._cache[userId] || { totalXP: 0, level: 1, earned: [], transactions: [] };
    return { ...xpProgress(data.totalXP), earned: data.earned, transactions: data.transactions.slice(-20) };
  },

  async load(userId) {
    return await this._load(userId);
  },

  async award(userId, amount, type, sourceId, note) {
    const data      = await this._load(userId);
    data.totalXP   += amount;
    data.level      = xpToLevel(data.totalXP);
    data.transactions.push({ amount, type, sourceId, note, at: new Date().toISOString() });
    if (data.transactions.length > 100) data.transactions = data.transactions.slice(-100);
    await this._save(userId);
    return { xpAwarded: amount, newTotal: data.totalXP, level: data.level };
  },

  async alreadyAwarded(userId, type, sourceId) {
    const data = await this._load(userId);
    return data.transactions.some(t => t.type === type && t.sourceId === sourceId);
  },

  async awardLesson(userId, lessonId) {
    if (await this.alreadyAwarded(userId, 'lesson', lessonId)) return { xpAwarded: 0 };
    return this.award(userId, XP_REWARDS.lesson, 'lesson', lessonId, 'Lesson completed');
  },

  async awardQuiz(userId, lessonId, score, isPerfect) {
    const xp = isPerfect ? XP_REWARDS.quiz_perfect : (score >= 70 ? XP_REWARDS.quiz_pass : 10);
    return this.award(userId, xp, 'quiz', lessonId + '_' + Date.now(), isPerfect ? 'Perfect quiz!' : `Quiz ${score}%`);
  },

  async awardSim(userId, simId, pct) {
    const xp = pct >= 70 ? XP_REWARDS.sim_pass : XP_REWARDS.sim_any;
    return this.award(userId, xp, 'sim', simId + '_' + Date.now(), `Simulation ${pct}%`);
  },

  async checkBadges(userId) {
    const data = await this._load(userId);
    const p    = Progress.get(userId);
    const newBadges = [];

    const BADGES = [
      { id: 'safety-hawk',      name: 'Safety Hawk',       icon: '🦅', xp: 100, check: () => p.quizzes['lesson-suicide-risk']?.bestScore >= 100 },
      { id: 'rapport-builder',  name: 'Rapport Builder',   icon: '🤝', xp:  75, check: () => { const m = CONTENT_DATA.modules.find(m => m.id === 'mod-interviewing'); return m?.lessons.filter(l => !l.comingSoon).every(l => p.lessons[l.id]?.completed); }},
      { id: 'mse-master',       name: 'MSE Master',        icon: '🧠', xp: 100, check: () => p.quizzes['lesson-mse']?.bestScore >= 100 },
      { id: 'consult-whisperer',name: 'Consult Whisperer', icon: '📋', xp: 150, check: () => Object.keys(p.simulations).length >= 5 },
      { id: 'first-responder',  name: 'First Responder',   icon: '🚨', xp:  75, check: () => { const m = CONTENT_DATA.modules.find(m => m.id === 'mod-07-emergencies'); return m?.lessons.filter(l => !l.comingSoon).every(l => p.lessons[l.id]?.completed); }},
      { id: 'risk-ace',         name: 'Risk Ace',          icon: '🎯', xp: 200, check: () => ['sim-suicide-risk','sim-agitation-risk','sim-alcohol-withdrawal'].every(id => (p.simulations[id]?.bestPct || 0) >= 80) },
      { id: 'streak-7',         name: '7-Day Streak',      icon: '🔥', xp:  70, check: () => false },
      { id: 'perfectionist',    name: 'Perfectionist',     icon: '⭐', xp: 125, check: () => Object.values(p.quizzes).filter(q => q.bestScore >= 100).length >= 5 },
    ];

    for (const badge of BADGES) {
      if (data.earned.find(e => e.id === badge.id)) continue;
      if (badge.check()) {
        data.earned.push({ id: badge.id, name: badge.name, icon: badge.icon, at: new Date().toISOString() });
        if (badge.xp > 0) { data.totalXP += badge.xp; data.level = xpToLevel(data.totalXP); }
        newBadges.push(badge);
      }
    }
    await this._save(userId);
    return newBadges;
  },

  ALL_BADGES: [
    { id: 'safety-hawk',       name: 'Safety Hawk',       icon: '🦅', xp: 100, desc: 'Score 100% on the Suicide Risk Assessment quiz',      category: 'clinical' },
    { id: 'rapport-builder',   name: 'Rapport Builder',   icon: '🤝', xp:  75, desc: 'Complete all lessons in Psychiatric Interviewing',     category: 'clinical' },
    { id: 'mse-master',        name: 'MSE Master',        icon: '🧠', xp: 100, desc: 'Score 100% on the Mental Status Examination quiz',     category: 'clinical' },
    { id: 'consult-whisperer', name: 'Consult Whisperer', icon: '📋', xp: 150, desc: 'Complete all 5 clinical simulations',                  category: 'achievement' },
    { id: 'first-responder',   name: 'First Responder',   icon: '🚨', xp:  75, desc: 'Complete the Psychiatric Emergencies module',          category: 'achievement' },
    { id: 'risk-ace',          name: 'Risk Ace',          icon: '🎯', xp: 200, desc: 'Score 80%+ on all three risk assessment simulations',  category: 'elite' },
    { id: 'streak-7',          name: '7-Day Streak',      icon: '🔥', xp:  70, desc: 'Study 7 days in a row',                               category: 'commitment' },
    { id: 'perfectionist',     name: 'Perfectionist',     icon: '⭐', xp: 125, desc: 'Get 100% on any 5 quiz lessons',                      category: 'achievement' },
  ]
};

// ── App Settings ──────────────────────────────────────────────
const AppSettings = {
  async get(key, def = null) {
    const row = await SB.getOne('app_settings', { key });
    return row ? row.value : def;
  },
  async set(key, value) {
    await SB.upsert('app_settings', { key, value });
  }
};