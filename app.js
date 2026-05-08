// ============================================================
// Psychiatry Intern Curriculum — Web App
// Backend powered by Supabase (see db.js for setup).
// Auth, Progress, and XPSystem are defined in db.js.
// ============================================================

// ── Rendering helpers ─────────────────────────────────────────
function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'disabled') { if (v) e.setAttribute('disabled', ''); }
    else if (k === 'checked') { if (v) e.setAttribute('checked', ''); }
    else if (v != null && v !== false) e.setAttribute(k, v);
  }
  function appendChild(c) {
    if (c == null || c === false || c === undefined) return;
    if (Array.isArray(c)) { c.forEach(appendChild); return; }
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  children.forEach(appendChild);
  return e;
}

// Markdown renderer — escapes text inline, preserves structure
function renderMarkdown(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const out = [];
  let inList = false, inOl = false;

  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function fmt(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g,'<em>$1</em>')
      .replace(/`([^`]+)`/g,'<code>$1</code>');
  }
  function closeBlocks() {
    if (inList) { out.push('</ul>'); inList = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  }

  for (const line of lines) {
    const t = line.trim();
    if (!t) { closeBlocks(); continue; }
    if (t.startsWith('## ')) { closeBlocks(); out.push(`<h2>${fmt(t.slice(3))}</h2>`); }
    else if (t.startsWith('### ')) { closeBlocks(); out.push(`<h3>${fmt(t.slice(4))}</h3>`); }
    else if (/^\d+\.\s/.test(t)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push(`<li>${fmt(t.replace(/^\d+\.\s/,''))}</li>`);
    } else if (t.startsWith('- ') || t.startsWith('\u2022 ')) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${fmt(t.slice(2))}</li>`);
    } else {
      closeBlocks();
      out.push(`<p>${fmt(t)}</p>`);
    }
  }
  closeBlocks();
  return out.join('');
}

// Markdown renderer that also handles pipe tables
function renderMarkdownWithPipeTables(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const out = [];
  let i = 0;

  function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmt(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g,'<em>$1</em>')
      .replace(/`([^`]+)`/g,'<code>$1</code>');
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect pipe table: line starts and ends with | or has multiple |
    if (trimmed.startsWith('|') && trimmed.includes('|', 1)) {
      // Check if next line is a separator (|---|---|)
      const nextLine = (lines[i+1] || '').trim();
      const isSeparator = /^[|:\-\s]+$/.test(nextLine);

      if (isSeparator) {
        // Parse table
        const tableLines = [];
        tableLines.push(line); // header
        i++; // skip separator
        i++;
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }

        const parseRow = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
        const headers = parseRow(tableLines[0]);
        const rows = tableLines.slice(1).map(parseRow);

        let table = '<div class="table-scroll"><table class="content-table"><thead><tr>';
        headers.forEach(h => { table += `<th>${fmt(h)}</th>`; });
        table += '</tr></thead><tbody>';
        rows.forEach(row => {
          table += '<tr>';
          row.forEach(cell => { table += `<td>${fmt(cell)}</td>`; });
          table += '</tr>';
        });
        table += '</tbody></table></div>';
        out.push(table);
        continue;
      }
    }

    // Regular markdown line
    if (!trimmed) { i++; continue; }
    if (trimmed.startsWith('## ')) { out.push(`<h2>${fmt(trimmed.slice(3))}</h2>`); }
    else if (trimmed.startsWith('### ')) { out.push(`<h3>${fmt(trimmed.slice(4))}</h3>`); }
    else if (trimmed.startsWith('#### ')) { out.push(`<h4 style="font-size:.9rem;font-weight:700;margin:12px 0 6px;color:var(--text2)">${fmt(trimmed.slice(5))}</h4>`); }
    else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) { out.push(`<li style="margin-bottom:4px">${fmt(trimmed.slice(2))}</li>`); }
    else if (/^\d+\.\s/.test(trimmed)) { out.push(`<li style="margin-bottom:4px">${fmt(trimmed.replace(/^\d+\.\s/,''))}</li>`); }
    else { out.push(`<p>${fmt(trimmed)}</p>`); }
    i++;
  }
  // Wrap consecutive li items in ul
  let html = out.join('\n');
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, '<ul style="padding-left:20px;margin:8px 0">$1</ul>');
  return html;
}

// ── Toast ────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'xp') {
  let t = document.getElementById('xp-toast');
  if (!t) { t = document.createElement('div'); t.id = 'xp-toast'; document.body.appendChild(t); }
  t.className = 'xp-toast';
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3000);
}

// ── App State ────────────────────────────────────────────────
const App = {
  user: null,
  page: 'auth',
  subPage: null,
  subPageData: null,
  
  async init() {
    // Show a loading screen while we check for an existing session
    const app = document.getElementById('app');
    app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px;color:var(--text3)"><div style="font-size:2rem">🧠</div><div style="font-family:var(--font-head);font-size:1.1rem">Loading…</div></div>';

    const user = Auth.getCurrentUser();
    if (user) {
      this.user = user;
      // Pre-load this user's progress and XP into cache
      await Promise.all([
        Progress.load(user.id),
        XPSystem.load(user.id)
      ]);
      this.render();
      this.navigate('dashboard');
    } else {
      this.render();
      this.showAuth();
    }
  },
  
  render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    if (!this.user) {
      app.appendChild(this.renderAuthScreen());
    } else {
      app.appendChild(this.renderNav());
      const main = document.createElement('div');
      main.className = 'main-content';
      main.id = 'main-content';
      app.appendChild(main);
      this.renderPage();
    }
  },
  
  renderNav() {
    const xp = XPSystem.getProfile(this.user.id);
    const nav = el('nav', {class:'app-nav'},
      el('div', {class:'nav-brand'}, '🧠 Psych ', el('span', {}, 'Intern')),
      el('div', {class:'nav-links'},
        el('div', {class:`nav-link${this.page==='dashboard'?' active':''}`, onClick:()=>this.navigate('dashboard')}, 'Dashboard'),
        el('div', {class:`nav-link${this.page==='modules'?' active':''}`, onClick:()=>this.navigate('modules')}, 'Modules'),
        el('div', {class:`nav-link${this.page==='simulations'?' active':''}`, onClick:()=>this.navigate('simulations')}, 'Simulations'),
        el('div', {class:`nav-link${this.page==='podcasts'?' active':''}`, onClick:()=>this.navigate('podcasts')}, 'Podcasts'),
        el('a', {class:'nav-link', href:'quizzes/index.html'}, 'Quizzes'),
        el('div', {class:`nav-link${this.page==='xp'?' active':''}`, onClick:()=>this.navigate('xp')}, `⚡ ${xp.totalXP} XP`),
        this.user.isAdmin ? el('div', {class:`nav-link${this.page==='admin'?' active':''}`, onClick:()=>this.navigate('admin')}, '👑 Admin') : null,
        el('div', {class:'nav-user'},
          el('div', {class:'nav-avatar', onClick:()=>this.navigate('profile'), title:'Profile'}, this.user.fullName.charAt(0).toUpperCase())
        )
      )
    );
    return nav;
  },
  
  navigate(page, data = null) {
    this.page = page;
    this.subPage = null;
    this.subPageData = data;
    // Update nav active states
    const nav = document.querySelector('.app-nav');
    if (nav) {
      const oldNav = nav;
      oldNav.replaceWith(this.renderNav());
    }
    this.renderPage();
    window.scrollTo(0, 0);
  },
  
  navigateTo(subPage, data) {
    this.subPage = subPage;
    this.subPageData = data;
    this.renderPage();
    window.scrollTo(0, 0);
  },
  
  async renderPage() {
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3)">Loading…</div>';
    try {
      let pageEl = null;
      if (this.subPage === 'lesson') { pageEl = await this.renderLesson(this.subPageData); }
      else if (this.subPage === 'quiz') { pageEl = await this.renderQuiz(this.subPageData); }
      else if (this.subPage === 'simulation') { pageEl = await this.renderSimulation(this.subPageData); }
      else if (this.subPage === 'module') { pageEl = await this.renderModulePage(this.subPageData); }
      else {
        switch (this.page) {
          case 'dashboard':   pageEl = await this.renderDashboard(); break;
          case 'modules':     pageEl = await this.renderModulesPage(); break;
          case 'simulations': pageEl = await this.renderSimulationsPage(); break;
          case 'podcasts':    pageEl = this.renderPodcastsPage(); break;
          case 'xp':          pageEl = this.renderXPPage(); break;
          case 'admin':       pageEl = await this.renderAdminPage(); break;
          case 'profile':     pageEl = this.renderProfilePage(); break;
          default:            pageEl = await this.renderDashboard();
        }
      }
      main.innerHTML = '';
      if (pageEl) main.appendChild(pageEl);
    } catch(err) {
      console.error('Page render error:', err);
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'padding:32px;color:#ef4444;font-family:monospace;font-size:.85rem;white-space:pre-wrap;background:#1a0000;border:1px solid #ef4444;border-radius:8px;margin:20px';
      errDiv.textContent = 'Render error: ' + err.message + '\n\nStack: ' + (err.stack || '');
      main.innerHTML = '';
      main.appendChild(errDiv);
    }
  },
  
  showAuth() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(this.renderAuthScreen());
  },
  
  // ── Auth Screen ──────────────────────────────────────────
  renderAuthScreen() {
    const wrap = el('div', {class:'auth-screen'},
      el('div', {class:'auth-bg'}),
      el('div', {class:'auth-card', id:'auth-card'})
    );
    this.renderAuthForm(wrap.querySelector('#auth-card'), 'login');
    return wrap;
  },
  
  renderAuthForm(card, mode) {
    card.innerHTML = '';
    const isAdmin = mode === 'admin';
    
    card.appendChild(el('div', {class:'auth-logo'}, '🧠 Psych', el('span',{},' Intern')));
    card.appendChild(el('div', {class:'auth-subtitle'}, 'Incoming Psychiatry Intern Curriculum'));
    
    if (!isAdmin) {
      const tabs = el('div', {class:'auth-tabs'},
        el('div', {class:`auth-tab${mode==='login'?' active':''}`, onClick:()=>this.renderAuthForm(card,'login')}, 'Sign In'),
        el('div', {class:`auth-tab${mode==='register'?' active':''}`, onClick:()=>this.renderAuthForm(card,'register')}, 'Create Account'),
        el('div', {class:'auth-tab', onClick:()=>this.renderAuthForm(card,'admin')}, '👑 Admin')
      );
      card.appendChild(tabs);
    } else {
      card.appendChild(el('div', {style:'margin-bottom:16px'},
        el('button', {class:'back-btn', onClick:()=>this.renderAuthForm(card,'login')}, '← Back to Sign In')
      ));
      card.appendChild(el('h3', {style:'font-family:var(--font-head);font-size:1rem;margin-bottom:20px;color:var(--text)'}, '👑 Administrator Setup'));
    }
    
    const errDiv = el('div', {class:'form-error', id:'auth-err', style:'margin-bottom:12px;display:none'});
    card.appendChild(errDiv);
    
    const showErr = (msg) => { errDiv.textContent = msg; errDiv.style.display = 'block'; };
    
    if (mode === 'login') {
      const emailIn = el('input', {class:'form-input', type:'email', placeholder:'Email address', id:'l-email'});
      const passIn = el('input', {class:'form-input', type:'password', placeholder:'Password', id:'l-pass'});
      card.appendChild(el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Email'), emailIn));
      card.appendChild(el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Password'), passIn));
      const btn = el('button', {class:'btn btn-primary btn-full', onClick:async () => {
        btn.disabled = true; btn.textContent = 'Signing in…';
        const r = await Auth.login(emailIn.value.trim(), passIn.value);
        if (r.error) { showErr(r.error); btn.disabled = false; btn.textContent = 'Sign In'; return; }
        App.user = r.user;
        await Promise.all([Progress.load(r.user.id), XPSystem.load(r.user.id)]);
        App.render();
        App.navigate('dashboard');
      }}, 'Sign In');
      card.appendChild(btn);
      // Demo hint
      card.appendChild(el('div', {class:'text-muted text-xs', style:'text-align:center;margin-top:12px'}, 'New here? Create an account above.'));
    }
    
    else if (mode === 'register') {
      const nameIn = el('input', {class:'form-input', type:'text', placeholder:'Full Name'});
      const emailIn = el('input', {class:'form-input', type:'email', placeholder:'Email address'});
      const passIn = el('input', {class:'form-input', type:'password', placeholder:'Password (min 6 chars)'});
      const programIn = el('input', {class:'form-input', type:'text', placeholder:'e.g. Psychiatry PGY-1'});
      const siteIn = el('input', {class:'form-input', type:'text', placeholder:'e.g. General Hospital'});
      const dateIn = el('input', {class:'form-input', type:'date'});
      
      card.appendChild(el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Full Name'), nameIn));
      card.appendChild(el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Email'), emailIn));
      card.appendChild(el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Password'), passIn));
      card.appendChild(el('div', {class:'form-row'},
        el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Program'), programIn),
        el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Site'), siteIn)
      ));
      card.appendChild(el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Start Date'), dateIn));
      
      card.appendChild(el('button', {class:'btn btn-primary btn-full', onClick:async function() {
        if (!nameIn.value.trim()) { showErr('Full name required'); return; }
        if (!emailIn.value.trim()) { showErr('Email required'); return; }
        if (passIn.value.length < 6) { showErr('Password must be at least 6 characters'); return; }
        this.disabled = true; this.textContent = 'Creating account…';
        const r = await Auth.register(emailIn.value.trim(), passIn.value, nameIn.value.trim(), programIn.value, siteIn.value, dateIn.value);
        if (r.error) { showErr(r.error); this.disabled = false; this.textContent = 'Create Account'; return; }
        Auth.setCurrentUser(r.user);
        App.user = r.user;
        await Promise.all([Progress.load(r.user.id), XPSystem.load(r.user.id)]);
        App.render();
        App.navigate('dashboard');
        showToast('🎉 Welcome! Account created successfully.');
      }}, 'Create Account'));
    }
    
    else if (mode === 'admin') {
      card.appendChild(el('div', {class:'alert alert-info', style:'margin-bottom:16px'}, '⚡ Create an administrator account to monitor all student progress.'));
      const nameIn = el('input', {class:'form-input', type:'text', placeholder:'Admin Full Name'});
      const emailIn = el('input', {class:'form-input', type:'email', placeholder:'Admin Email'});
      const passIn = el('input', {class:'form-input', type:'password', placeholder:'Admin Password'});
      const codeIn = el('input', {class:'form-input', type:'password', placeholder:'Admin access code'});
      
      card.appendChild(el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Full Name'), nameIn));
      card.appendChild(el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Email'), emailIn));
      card.appendChild(el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Password'), passIn));
      card.appendChild(el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Admin Access Code'), codeIn, el('div', {class:'form-hint'}, 'Default code: PSYCH-ADMIN-2024')));
      
      card.appendChild(el('button', {class:'btn btn-primary btn-full', onClick:async function() {
        this.disabled = true; this.textContent = 'Verifying…';
        const adminCode = await AppSettings.get('admin_code', 'PSYCH-ADMIN-2024');
        if (codeIn.value !== adminCode) { showErr('Invalid admin access code'); this.disabled = false; this.textContent = 'Create Admin Account'; return; }
        if (!nameIn.value.trim()) { showErr('Full name required'); this.disabled = false; this.textContent = 'Create Admin Account'; return; }
        if (passIn.value.length < 6) { showErr('Password must be at least 6 characters'); this.disabled = false; this.textContent = 'Create Admin Account'; return; }
        const r = await Auth.register(emailIn.value.trim(), passIn.value, nameIn.value.trim(), 'Administrator', 'Admin', '', true);
        if (r.error) { showErr(r.error); this.disabled = false; this.textContent = 'Create Admin Account'; return; }
        Auth.setCurrentUser(r.user);
        App.user = r.user;
        await Promise.all([Progress.load(r.user.id), XPSystem.load(r.user.id)]);
        App.render();
        App.navigate('admin');
        showToast('👑 Admin account created successfully!');
      }}, 'Create Admin Account'));
    }
  },
  
  // ── Dashboard ─────────────────────────────────────────────
  async renderDashboard() {
    await Promise.all([Progress.load(this.user.id), XPSystem.load(this.user.id)]);
    const dash = Progress.getDashboard(this.user.id);
    const xp = XPSystem.getProfile(this.user.id);
    const p = Progress.get(this.user.id);
    
    const wrap = document.createElement('div');
    
    // Hero
    const hero = el('div', {class:'dashboard-hero'},
      el('div', {class:'hero-greeting'}, `Good ${getTimeOfDay()},`),
      el('div', {class:'hero-name'}, this.user.fullName.split(' ')[0]),
      el('div', {class:'hero-stats'},
        el('div', {class:'hero-stat'}, el('div', {class:'hero-stat-val'}, `${Math.round(dash.totalCompletion)}%`), el('div', {class:'hero-stat-label'}, 'Overall')),
        el('div', {class:'hero-stat'}, el('div', {class:'hero-stat-val'}, `${xp.level}`), el('div', {class:'hero-stat-label'}, 'Level')),
        el('div', {class:'hero-stat'}, el('div', {class:'hero-stat-val'}, `${xp.totalXP}`), el('div', {class:'hero-stat-label'}, 'XP')),
        el('div', {class:'hero-stat'}, el('div', {class:'hero-stat-val'}, Object.keys(p.simulations).length + '/' + CONTENT_DATA.simulations.length), el('div', {class:'hero-stat-label'}, 'Sims'))
      ),
      el('div', {class:'xp-bar-wrap'},
        el('div', {class:'xp-bar-header'},
          el('span', {}, `Level ${xp.level} • ${xp.current} / ${xp.next} XP`),
          el('span', {}, `Level ${xp.level + 1}`)
        ),
        el('div', {class:'xp-bar'}, el('div', {class:'xp-fill', style:`width:${Math.min(100, xp.next > 0 ? xp.current / xp.next * 100 : 0)}%`}))
      )
    );
    wrap.appendChild(hero);
    
    // Module progress grid
    const h2 = el('div', {class:'section-header'},
      el('div', {class:'section-title-lg'}, 'Module Progress'),
      el('button', {class:'btn btn-outline btn-sm', onClick:()=>this.navigate('modules')}, 'View All →')
    );
    wrap.appendChild(h2);
    
    const grid = el('div', {class:'grid-3'});
    for (const mod of dash.moduleProgress) {
      const fullMod = CONTENT_DATA.modules.find(m => m.id === mod.moduleId);
      const card = el('div', {class:'module-card', style:`--module-color:${mod.color}`, onClick:()=>this.navigateTo('module', mod.moduleId)},
        el('div', {class:'module-icon'}, mod.icon),
        el('div', {class:'module-title'}, mod.title),
        el('div', {style:'margin:10px 0'},
          el('div', {style:'display:flex;justify-content:space-between;font-size:.8rem;color:var(--text3);margin-bottom:4px'},
            el('span', {}, `${mod.lessonsCompleted}/${mod.totalLessons} lessons`),
            el('span', {style:`color:${mod.completion >= 70 ? 'var(--green)' : mod.completion > 30 ? 'var(--yellow)' : 'var(--text3)'}`}, `${Math.round(mod.completion)}%`)
          ),
          el('div', {class:'progress-bar'}, el('div', {class:`progress-fill ${mod.completion >= 70 ? 'green' : ''}`, style:`width:${mod.completion}%`}))
        ),
        el('div', {class:'module-stats'},
          el('span', {}, `📝 ${mod.quizPassed}/${mod.quizTotal} passed`)
        )
      );
      grid.appendChild(card);
    }
    wrap.appendChild(grid);
    
    // Recent activity
    if (p.activity.length > 0) {
      wrap.appendChild(el('div', {class:'divider'}));
      wrap.appendChild(el('div', {class:'section-header'}, el('div', {class:'section-title-lg'}, 'Recent Activity')));
      const actList = el('div');
      for (const act of p.activity.slice(0, 5)) {
        const icon = act.type === 'lesson_complete' ? '✅' : act.type === 'quiz_attempt' ? '📝' : act.type === 'simulation' ? '🎮' : '👁️';
        const label = act.type === 'lesson_complete' ? `Completed lesson` : act.type === 'quiz_attempt' ? `Quiz attempt — ${act.details?.score}%${act.details?.passed ? ' ✓' : ''}` : act.type === 'simulation' ? `Simulation — ${act.details?.pct}%` : 'Viewed lesson';
        actList.appendChild(el('div', {class:'lesson-item', style:'cursor:default'},
          el('div', {style:'font-size:1.1rem'}, icon),
          el('div', {class:'lesson-title'}, label),
          el('div', {class:'text-muted text-xs'}, timeAgo(act.at))
        ));
      }
      wrap.appendChild(actList);
    }
    
    return wrap;
  },
  
  // ── Modules Page ─────────────────────────────────────────
  async renderModulesPage() {
    await Progress.load(this.user.id);
    const dash = Progress.getDashboard(this.user.id);
    const wrap = document.createElement('div');
    wrap.appendChild(el('div', {class:'section-header'},
      el('div', {class:'section-title-lg'}, 'Curriculum Modules'),
      el('div', {class:'text-muted text-sm'}, `${CONTENT_DATA.modules.length} modules • ${CONTENT_DATA.modules.reduce((s,m)=>s+m.lessons.length,0)} lessons`)
    ));
    
    const grid = el('div', {class:'grid-3'});
    for (const mod of CONTENT_DATA.modules) {
      const mp = dash.moduleProgress.find(m => m.moduleId === mod.id);
      const card = el('div', {class:'module-card', style:`--module-color:${mod.color}`, onClick:()=>this.navigateTo('module', mod.id)},
        el('div', {class:'module-icon'}, mod.icon),
        el('div', {class:'module-title'}, mod.title),
        el('div', {class:'module-desc'}, mod.description),
        el('div', {style:'margin:10px 0'},
          el('div', {style:'display:flex;justify-content:space-between;font-size:.8rem;color:var(--text3);margin-bottom:4px'},
            el('span', {}, `${mp?.lessonsCompleted || 0}/${mp?.totalLessons || mod.lessons.length} lessons`),
            el('span', {}, `${Math.round(mp?.completion || 0)}%`)
          ),
          el('div', {class:'progress-bar'}, el('div', {class:`progress-fill${(mp?.completion||0) >= 70 ? ' green' : ''}`, style:`width:${mp?.completion || 0}%`}))
        ),
        el('div', {class:'module-stats'},
          el('span', {}, `${mod.lessons.length} lessons`),
          el('span', {}, `${mod.lessons.filter(l => l.quizQuestions?.length > 0).length} quizzes`)
        )
      );
      grid.appendChild(card);
    }
    wrap.appendChild(grid);
    return wrap;
  },
  
  // ── Module Detail Page ────────────────────────────────────
  async renderModulePage(moduleId) {
    await Progress.load(this.user.id);
    const mod = CONTENT_DATA.modules.find(m => m.id === moduleId);
    if (!mod) return el('div', {}, 'Module not found');
    const p = Progress.get(this.user.id);
    const mp = Progress.getDashboard(this.user.id).moduleProgress.find(m => m.moduleId === moduleId);
    
    const wrap = document.createElement('div');
    wrap.appendChild(el('div', {class:'back-btn', onClick:()=>this.navigate('modules')}, '← All Modules'));
    
    // Header
    const headerCard = el('div', {class:'card card-lg', style:`border-top:3px solid ${mod.color};margin-bottom:24px`},
      el('div', {style:'display:flex;align-items:center;gap:16px;margin-bottom:12px'},
        el('div', {style:'font-size:2.5rem'}, mod.icon),
        el('div', {},
          el('h1', {style:'font-family:var(--font-head);font-size:1.6rem;font-weight:800'}, mod.title),
          el('div', {class:'text-muted text-sm', style:'margin-top:4px'}, mod.description)
        )
      ),
      el('div', {style:'display:flex;gap:20px;flex-wrap:wrap;margin-top:16px;padding-top:16px;border-top:1px solid var(--border)'},
        el('div', {}, el('div', {style:'font-size:1.2rem;font-weight:800;font-family:var(--font-head);color:var(--accent2)'}, `${Math.round(mp?.completion || 0)}%`), el('div', {class:'text-xs text-muted'}, 'Complete')),
        el('div', {}, el('div', {style:'font-size:1.2rem;font-weight:800;font-family:var(--font-head);color:var(--text)'}, `${mp?.lessonsCompleted||0}/${mp?.totalLessons||0}`), el('div', {class:'text-xs text-muted'}, 'Lessons')),
        el('div', {}, el('div', {style:'font-size:1.2rem;font-weight:800;font-family:var(--font-head);color:var(--text)'}, `${mp?.quizPassed||0}/${mp?.quizTotal||0}`), el('div', {class:'text-xs text-muted'}, 'Quizzes Passed'))
      )
    );
    wrap.appendChild(headerCard);
    
    // Lessons
    const lessonsTitle = el('h3', {style:'font-family:var(--font-head);font-size:1rem;font-weight:700;margin-bottom:12px;color:var(--text2)'}, 'Lessons');
    wrap.appendChild(lessonsTitle);
    
    for (const lesson of mod.lessons) {
      const done = p.lessons[lesson.id]?.completed;
      const quizData = p.quizzes[lesson.id];
      const hasQuiz = lesson.quizQuestions?.length > 0;
      
      const row = el('div', {class:'lesson-item'},
        el('div', {class:`lesson-check${done ? ' done' : ''}`}, done ? '✓' : ''),
        el('div', {style:'flex:1;min-width:0'},
          el('div', {class:'lesson-title', onClick:()=>this.navigateTo('lesson', {lessonId: lesson.id, moduleId: mod.id})}, lesson.title),
          el('div', {class:'lesson-meta', style:'margin-top:2px'},
            `⏱ ${lesson.estimatedMinutes} min`,
            hasQuiz ? ` • 📝 Quiz${quizData ? ` — Best: ${Math.round(quizData.bestScore)}%${quizData.passed ? ' ✓' : ''}` : ''}` : ''
          )
        ),
        el('div', {style:'display:flex;gap:6px;flex-shrink:0'},
          el('button', {class:'btn btn-outline btn-sm', onClick:()=>this.navigateTo('lesson', {lessonId: lesson.id, moduleId: mod.id})}, done ? '↺ Review' : '→ Start'),
          hasQuiz ? el('button', {class:'btn btn-outline btn-sm', onClick:()=>this.navigateTo('quiz', {lessonId: lesson.id, moduleId: mod.id})}, '📝 Quiz') : null
        )
      );
      wrap.appendChild(row);
    }
    
    // Simulations for this module
    // Match sims: by relatedModules field, or by ID substring matching
    const modSims = CONTENT_DATA.simulations.filter(s => {
      if (s.relatedModules && s.relatedModules.includes(moduleId)) return true;
      const shortId = moduleId.replace('mod-','').replace(/^0+/,'');
      if (s.id.includes(shortId)) return true;
      // Special cases
      if (moduleId === 'mod-interviewing' && (s.id === 'sim-patient-interview' || s.id === 'sim-suicide-risk')) return true;
      if (moduleId === 'mod-07-emergencies' && (s.id === 'sim-agitation-risk' || s.id === 'sim-alcohol-withdrawal')) return true;
      if (moduleId === 'mod-antipsychotics' && s.id === 'sim-medication-management') return true;
      return false;
    });
    if (modSims.length > 0) {
      wrap.appendChild(el('h3', {style:'font-family:var(--font-head);font-size:1rem;font-weight:700;margin:20px 0 12px;color:var(--text2)'}, 'Clinical Simulations'));
      for (const sim of modSims) {
        const simRes = p.simulations[sim.id];
        const row = el('div', {class:'lesson-item'},
          el('div', {class:`lesson-check${simRes ? ' done' : ''}`}, simRes ? '✓' : '🎮'),
          el('div', {style:'flex:1'},
            el('div', {class:'lesson-title'}, sim.title),
            el('div', {class:'lesson-meta'}, `⏱ ${sim.estimatedMinutes} min${simRes ? ` • Best: ${simRes.bestPct}%` : ''}`)
          ),
          el('button', {class:'btn btn-outline btn-sm', onClick:()=>this.navigateTo('simulation', sim.id)}, simRes ? '↺ Redo' : '▶ Start')
        );
        wrap.appendChild(row);
      }
    }
    
    // Related podcasts for this module
    const modPods = CONTENT_DATA.podcasts.filter(pod =>
      pod.relatedModules?.includes(moduleId) ||
      (pod.tags || []).some(tag => (mod.title || '').toLowerCase().includes(tag.toLowerCase()))
    );
    if (modPods.length > 0) {
      wrap.appendChild(el('h3', {style:'font-family:var(--font-head);font-size:1rem;font-weight:700;margin:20px 0 12px;color:var(--text2)'}, '🎙️ Related Podcasts'));
      for (const pod of modPods) {
        const row = el('div', {class:'podcast-card'},
          el('div', {class:'podcast-thumb'}, '🎙️'),
          el('div', {class:'podcast-info'},
            el('div', {class:'podcast-title'}, pod.title),
            el('div', {class:'podcast-meta'}, [pod.episode && `${pod.episode}`, pod.duration].filter(Boolean).join(' • ')),
            pod.description && el('div', {style:'font-size:.8rem;color:var(--text3);margin-top:4px;line-height:1.5'}, pod.description)
          ),
          pod.url ? el('a', {href:pod.url, target:'_blank', class:'btn btn-outline btn-sm', style:'flex-shrink:0;align-self:center'}, '▶ Listen') : null
        );
        wrap.appendChild(row);
      }
    }

    return wrap;
  },
  
  // ── Lesson View ──────────────────────────────────────────
  async renderLesson(data) {
    const { lessonId, moduleId } = data;
    const mod = CONTENT_DATA.modules.find(m => m.id === moduleId);
    const lesson = mod?.lessons.find(l => l.id === lessonId);
    if (!lesson) return el('div', {}, 'Lesson not found');
    
    await Progress.load(this.user.id);
    const p = Progress.get(this.user.id);
    Progress.markLessonViewed(this.user.id, lessonId, moduleId); // fire and forget
    
    const wrap = el('div', {class:'lesson-content'});
    wrap.appendChild(el('div', {class:'back-btn', onClick:()=>this.navigateTo('module', moduleId)}, `← ${mod.title}`));
    
    // Header
    const isCompleted = p.lessons[lessonId]?.completed;
    const headerDiv = el('div', {class:'lesson-header'},
      el('div', {style:'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px'},
        el('span', {class:'badge badge-blue'}, mod.title),
        lesson.tags?.map(t => el('span', {class:'badge badge-gray'}, t))
      ),
      el('h1', {style:'font-family:var(--font-head);font-size:1.8rem;font-weight:800;margin-bottom:8px'}, lesson.title),
      el('div', {class:'text-muted text-sm'}, `⏱ ${lesson.estimatedMinutes} min estimated`),
      lesson.objectives && el('details', {style:'margin-top:16px'},
        el('summary', {style:'cursor:pointer;color:var(--accent2);font-size:.875rem;font-weight:600'}, 'Learning Objectives'),
        el('ul', {class:'objectives-list', style:'margin-top:10px'},
          ...lesson.objectives.map(o => el('li', {}, o))
        )
      )
    );
    wrap.appendChild(headerDiv);
    
    // Sections
    for (const section of (lesson.sections || [])) {
      const secDiv = el('div', {class:'lesson-section'});
      
      if (section.type === 'case') {
        const box = el('div', {class:'case-box'},
          el('div', {class:'case-label'}, '📋 Clinical Case'),
          el('div', {class:'lesson-text'})
        );
        box.querySelector('.lesson-text').innerHTML = renderMarkdownWithPipeTables(section.content);
        secDiv.appendChild(box);
      } else if (section.type === 'text') {
        secDiv.appendChild(el('div', {class:'section-title'}, section.title));
        const textDiv = el('div', {class:'lesson-text'});
        textDiv.innerHTML = renderMarkdownWithPipeTables(section.content);
        secDiv.appendChild(textDiv);
      } else if (section.type === 'table') {
        secDiv.appendChild(el('div', {class:'section-title'}, section.title));
        secDiv.appendChild(this.renderTable(section));
      } else if (section.type === 'interactive') {
        secDiv.appendChild(el('div', {class:'section-title'}, section.title));
        secDiv.appendChild(this.renderInteractive(section));
      }
      
      wrap.appendChild(secDiv);
    }
    
    // Clinical Pearls
    if (lesson.clinicalPearls?.length > 0) {
      const pearlsBox = el('div', {class:'pearls-box'},
        el('div', {class:'pearls-title'}, '💎 Clinical Pearls'),
        ...lesson.clinicalPearls.map(p => el('div', {class:'pearl-item'}, p))
      );
      wrap.appendChild(pearlsBox);
    }
    
    // Key Takeaways
    if (lesson.keyTakeaways?.length > 0) {
      const takeDiv = el('div', {class:'card', style:'margin-bottom:20px'},
        el('div', {class:'card-title', style:'margin-bottom:12px'}, '🎯 Key Takeaways'),
        ...lesson.keyTakeaways.map(t => el('div', {class:'takeaway-item'},
          el('div', {class:'takeaway-icon'}, '→'),
          el('div', {class:'takeaway-text'}, t)
        ))
      );
      wrap.appendChild(takeDiv);
    }
    
    // Related Podcasts
    if (lesson.podcastIds?.length > 0) {
      const relPods = lesson.podcastIds.map(pid => CONTENT_DATA.podcasts.find(p => p.id === pid)).filter(Boolean);
      if (relPods.length > 0) {
        const podSection = el('div', {class:'card', style:'margin-bottom:20px;border-left:3px solid var(--purple)'});
        podSection.appendChild(el('div', {style:'font-weight:700;color:var(--purple);font-size:.9rem;margin-bottom:12px'}, '🎙️ Related Podcasts'));
        for (const pod of relPods) {
          const row = el('div', {class:'podcast-card', style:'margin-bottom:8px;padding:12px'});
          row.appendChild(el('div', {class:'podcast-thumb', style:'width:44px;height:44px;font-size:1.2rem'}, '🎙️'));
          const info = el('div', {class:'podcast-info'});
          info.appendChild(el('div', {class:'podcast-title', style:'font-size:.875rem'}, pod.title));
          info.appendChild(el('div', {class:'podcast-meta'}, [pod.episode && `${pod.episode}`, pod.duration].filter(Boolean).join(' • ')));
          if (pod.description) info.appendChild(el('div', {style:'font-size:.78rem;color:var(--text3);margin-top:3px;line-height:1.45'}, pod.description));
          row.appendChild(info);
          if (pod.url) {
            const link = el('a', {href: pod.url, target:'_blank', class:'btn btn-outline btn-sm', style:'flex-shrink:0;align-self:center;white-space:nowrap'}, '▶ Listen');
            row.appendChild(link);
          }
          podSection.appendChild(row);
        }
        wrap.appendChild(podSection);
      }
    }

    // References
    if (lesson.references?.length > 0) {
      const refDiv = el('details', {style:'margin-bottom:20px'},
        el('summary', {style:'cursor:pointer;color:var(--text3);font-size:.85rem;font-weight:600'}, `📚 References (${lesson.references.length})`),
        el('div', {style:'margin-top:10px;padding-left:16px'},
          ...lesson.references.map(r => el('div', {style:'font-size:.8rem;color:var(--text3);margin-bottom:4px;font-family:var(--font-mono)'}, r))
        )
      );
      wrap.appendChild(refDiv);
    }
    
    // Mark complete / Quiz buttons
    const btnRow = el('div', {style:'display:flex;gap:10px;flex-wrap:wrap;margin-top:28px;padding-top:20px;border-top:1px solid var(--border)'});
    
    if (!isCompleted) {
      const completeBtn = el('button', {class:'btn btn-success', onClick:async () => {
        completeBtn.disabled = true;
        const wasNew = await Progress.markLessonCompleted(this.user.id, lessonId, moduleId);
        if (wasNew) {
          const result = await XPSystem.awardLesson(this.user.id, lessonId);
          if (result.xpAwarded > 0) showToast(`✅ Lesson complete! +${result.xpAwarded} XP`);
          const newBadges = await XPSystem.checkBadges(this.user.id);
          for (const b of newBadges) showToast(`🏆 Badge unlocked: ${b.name} +${b.xp} XP`);
        }
        completeBtn.textContent = '✓ Completed!';
        completeBtn.style.opacity = '0.7';
      }}, '✓ Mark Complete');
      btnRow.appendChild(completeBtn);
    } else {
      btnRow.appendChild(el('div', {class:'badge badge-green', style:'padding:8px 16px;font-size:.875rem'}, '✓ Completed'));
    }
    
    if (lesson.quizQuestions?.length > 0) {
      btnRow.appendChild(el('button', {class:'btn btn-outline', onClick:()=>this.navigateTo('quiz', {lessonId, moduleId})}, '📝 Take Quiz'));
    }
    
    btnRow.appendChild(el('button', {class:'btn btn-ghost', onClick:()=>this.navigateTo('module', moduleId)}, 'Back to Module'));
    
    wrap.appendChild(btnRow);
    
    return wrap;
  },
  
  renderTable(section) {
    const wrap = document.createElement('div');

    // Case 1: structured tableData with headers/rows
    if (section.tableData && section.tableData.headers) {
      const td = section.tableData;
      const tableWrap = el('div', {style:'overflow-x:auto;margin-bottom:10px'});
      const table = el('table', {class:'content-table'});
      table.appendChild(el('thead', {}, el('tr', {}, ...td.headers.map(h => el('th', {}, h)))));
      const tbody = document.createElement('tbody');
      for (const row of td.rows) {
        const tr = document.createElement('tr');
        for (const cell of row) {
          const td2 = document.createElement('td');
          td2.innerHTML = renderMarkdown(String(cell));
          tr.appendChild(td2);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      tableWrap.appendChild(table);
      wrap.appendChild(tableWrap);
      // Also render any extra content below the table
      if (section.content) {
        const textDiv = el('div', {class:'lesson-text', style:'margin-top:12px'});
        textDiv.innerHTML = renderMarkdownWithPipeTables(section.content);
        wrap.appendChild(textDiv);
      }
      return wrap;
    }

    // Case 2: content-only table (markdown text, possibly with pipe tables)
    if (section.content) {
      const textDiv = el('div', {class:'lesson-text'});
      textDiv.innerHTML = renderMarkdownWithPipeTables(section.content);
      wrap.appendChild(textDiv);
      return wrap;
    }

    wrap.appendChild(el('div', {class:'text-muted text-sm'}, 'No content available'));
    return wrap;
  },
  
  renderInteractive(section) {
    const type = section.interactiveType;
    const data = section.activityData;
    const container = el('div', {class:'activity-container'});

    // If no activityData, fall back to rendering section content
    if (!data) {
      if (section.content) {
        const textDiv = el('div', {class:'lesson-text'});
        textDiv.innerHTML = renderMarkdownWithPipeTables(section.content);
        container.appendChild(textDiv);
      } else {
        container.appendChild(el('div', {class:'text-muted text-sm'}, `Activity coming soon.`));
      }
      return container;
    }

    if (data.instructions) container.appendChild(el('div', {class:'activity-instructions'}, data.instructions));
    if (data.hint) container.appendChild(el('div', {class:'activity-hint'}, '💡 ' + data.hint));

    if (type === 'classify' || type === 'drag-classify') {
      container.appendChild(this.renderClassifyActivity(data));
    } else if (type === 'match') {
      container.appendChild(this.renderMatchActivity(data));
    } else if (type === 'scenario-pick' || type === 'spot-diagnosis') {
      container.appendChild(this.renderScenarioActivity(data, section));
    } else if (type === 'sequence') {
      container.appendChild(this.renderSequenceActivity(data));
    } else if (type === 'risk-rank') {
      container.appendChild(this.renderRiskRankActivity(data));
    } else if (type === 'mse-builder') {
      container.appendChild(this.renderMseBuilderActivity(data));
    } else {
      container.appendChild(el('div', {class:'text-muted text-sm'}, `Interactive activity: ${type}`));
    }
    return container;
  },
  
  renderClassifyActivity(data) {
    const wrap = document.createElement('div');
    let selectedItem = null;
    const classified = {};
    
    // Items pool
    const poolDiv = el('div', {style:'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px'});
    const items = [...(data.items || [])];
    
    const render = () => {
      poolDiv.innerHTML = '';
      const remaining = items.filter(item => !classified[item.id]);
      if (remaining.length === 0) {
        poolDiv.appendChild(el('div', {class:'text-muted text-sm'}, 'All items classified!'));
      }
      for (const item of remaining) {
        const div = el('div', {class:`classify-item${selectedItem?.id === item.id ? ' selected' : ''}`, onClick:() => {
          selectedItem = selectedItem?.id === item.id ? null : item;
          render();
        }}, item.text || item.label);
        poolDiv.appendChild(div);
      }
      // Check if complete
      if (remaining.length === 0) {
        let correct = 0;
        for (const [id, catId] of Object.entries(classified)) {
          const item = items.find(i => i.id === id);
          if (item?.correct === catId || item?.correctCategory === catId || item?.category === catId) correct++;
        }
        const total = items.length;
        const resDiv = wrap.querySelector('.activity-result-area');
        if (resDiv) { resDiv.className = `activity-result ${correct === total ? 'pass' : 'fail'}`; resDiv.textContent = `${correct}/${total} correct — ${correct === total ? 'Well done! ✓' : 'Some items need review.'}`; }
      }
    };
    
    const gridDiv = el('div', {class:'classify-grid'});
    for (const cat of (data.categories || [])) {
      const zone = el('div', {class:'classify-zone', style:`border-color:${cat.color || 'var(--border)'}20`},
        el('div', {class:'classify-zone-title', style:`color:${cat.color}`}, `${cat.icon || ''} ${cat.label}`),
        el('div', {class:'zone-items'})
      );
      zone.onclick = () => {
        if (!selectedItem) return;
        const item = selectedItem;
        classified[item.id] = cat.id;
        const isCorrect = item.correct === cat.id || item.correctCategory === cat.id || item.category === cat.id;
        const zoneItems = zone.querySelector('.zone-items');
        const chip = el('div', {class:'classify-item', style:`cursor:default;font-size:.8rem;border-color:${isCorrect ? 'var(--green)' : 'var(--red)'};opacity:.9`}, item.text || item.label || '');
        if (item.hint) chip.title = item.hint;
        zoneItems.appendChild(chip);
        selectedItem = null;
        render();
      };
      gridDiv.appendChild(zone);
    }
    
    wrap.appendChild(poolDiv);
    wrap.appendChild(gridDiv);
    wrap.appendChild(el('div', {class:'activity-result-area', style:'margin-top:10px'}));
    render();
    return wrap;
  },
  
  renderMatchActivity(data) {
    const wrap = document.createElement('div');
    let selectedLeft = null;
    const matched = {};
    const wrongPairs = new Set();
    
    const render = () => {
      wrap.innerHTML = '';
      const grid = el('div', {class:'match-grid'});
      const leftCol = el('div', {});
      const rightCol = el('div', {});
      
      for (const item of (data.leftItems || [])) {
        const isMatched = matched[item.id];
        const div = el('div', {class:`match-item${selectedLeft?.id === item.id ? ' selected-left' : ''}${isMatched ? ' matched' : ''}`, onClick:() => {
          if (isMatched) return;
          selectedLeft = selectedLeft?.id === item.id ? null : item;
          render();
        }}, item.text);
        leftCol.appendChild(div);
      }
      
      for (const item of (data.rightItems || [])) {
        const isMatched = Object.values(matched).includes(item.id);
        const isWrong = wrongPairs.has(item.id);
        const div = el('div', {class:`match-item${isMatched ? ' matched' : ''}${isWrong ? ' wrong' : ''}`, onClick:() => {
          if (!selectedLeft || isMatched) return;
          const leftItem = selectedLeft;
          if (leftItem.matchId === item.id || item.matchId === leftItem.id) {
            matched[leftItem.id] = item.id;
            wrongPairs.delete(item.id);
          } else {
            wrongPairs.add(item.id);
            setTimeout(() => { wrongPairs.delete(item.id); render(); }, 1000);
          }
          selectedLeft = null;
          render();
        }}, item.text);
        rightCol.appendChild(div);
      }
      
      grid.appendChild(leftCol);
      grid.appendChild(rightCol);
      wrap.appendChild(grid);
      
      const totalLeft = (data.leftItems || []).length;
      const done = Object.keys(matched).length;
      if (done === totalLeft && totalLeft > 0) {
        wrap.appendChild(el('div', {class:'activity-result pass', style:'margin-top:12px'}, `✓ All ${totalLeft} matches correct! Well done.`));
      } else if (done > 0) {
        wrap.appendChild(el('div', {class:'text-muted text-xs', style:'margin-top:8px'}, `${done}/${totalLeft} matched`));
      }
    };
    
    render();
    return wrap;
  },
  
  renderScenarioActivity(data, section) {
    const wrap = document.createElement('div');
    let answered = null;
    const scenarios = data.scenarios || data.cases || data.items || [];
    let currentIdx = 0;

    const renderScenario = () => {
      wrap.innerHTML = '';
      if (scenarios.length === 0) { wrap.appendChild(el('div', {class:'text-muted'}, 'No scenarios available')); return; }
      const s = scenarios[currentIdx];

      wrap.appendChild(el('div', {style:'font-size:.8rem;color:var(--text3);margin-bottom:8px'}, `Scenario ${currentIdx + 1} of ${scenarios.length}`));

      // Vignette box
      if (s.vignette || s.stem || s.content || s.text) {
        const vigBox = el('div', {style:'background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:10px;font-size:.9rem;line-height:1.7;color:var(--text2)'});
        vigBox.innerHTML = renderMarkdown(s.vignette || s.stem || s.content || s.text || '');
        wrap.appendChild(vigBox);
      }

      // Question prompt
      if (s.question) {
        wrap.appendChild(el('div', {style:'font-weight:600;font-size:.9rem;margin-bottom:10px;color:var(--text)'}, s.question));
      }

      // Options — data uses 'options' array with {id, text, correct, explanation}
      const options = s.options || s.choices || [];
      for (const opt of options) {
        const isSelected = answered?.id === opt.id;
        const isCorrect = opt.correct === true;
        let cls = 'quiz-option';
        if (answered) {
          if (isCorrect) cls += ' correct';
          else if (isSelected) cls += ' incorrect';
          cls += ' disabled';
        } else if (isSelected) cls += ' selected';

        const div = el('div', {class: cls, onClick:() => {
          if (answered) return;
          answered = opt;
          renderScenario();
        }},
          el('div', {class:`quiz-radio${isSelected ? ' filled' : ''}`}),
          el('span', {}, opt.text || opt.label || '')
        );
        wrap.appendChild(div);
      }

      if (answered) {
        const isRight = answered.correct === true;
        const fb = el('div', {class:'explanation-box', style:`border-left:3px solid ${isRight ? 'var(--green)' : 'var(--red)'};margin-top:8px`},
          el('strong', {}, isRight ? '✓ Correct! ' : '✗ Not quite. '),
          answered.explanation || ''
        );
        wrap.appendChild(fb);

        if (currentIdx < scenarios.length - 1) {
          wrap.appendChild(el('button', {class:'btn btn-outline btn-sm', style:'margin-top:10px', onClick:() => {
            currentIdx++; answered = null; renderScenario();
          }}, 'Next Scenario →'));
        } else {
          wrap.appendChild(el('div', {class:'text-green text-sm', style:'margin-top:10px;font-weight:600'}, '✓ All scenarios complete!'));
        }
      }
    };

    renderScenario();
    return wrap;
  },
  
  renderSequenceActivity(data) {
    const wrap = document.createElement('div');
    const items = data.items || data.steps || [];
    // Sort items by position for the answer key
    const correctOrder = [...items].sort((a, b) => (a.position || a.order || 0) - (b.position || b.order || 0));
    // Start shuffled
    let order = [...items].sort(() => Math.random() - 0.5);
    const label = data.orderedLabel || 'Correct Order';

    const render = () => {
      wrap.innerHTML = '';
      wrap.appendChild(el('div', {style:'font-size:.8rem;color:var(--text3);margin-bottom:10px'}, `Use ▲ ▼ to reorder into the correct sequence — then click Check.`));
      
      const listDiv = el('div', {style:'display:flex;flex-direction:column;gap:6px'});
      order.forEach((item, idx) => {
        const row = el('div', {style:'display:flex;align-items:center;gap:8px'},
          el('span', {style:'background:var(--surface);width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;flex-shrink:0;color:var(--accent2)'}, String(idx+1)),
          el('div', {style:'flex:1;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.875rem;line-height:1.5;color:var(--text2)'}, item.text || item.label || String(item)),
          el('div', {style:'display:flex;flex-direction:column;gap:2px'},
            el('button', {class:'btn btn-ghost', style:'padding:2px 8px', onClick:() => {
              if (idx > 0) { [order[idx-1], order[idx]] = [order[idx], order[idx-1]]; render(); }
            }}, '▲'),
            el('button', {class:'btn btn-ghost', style:'padding:2px 8px', onClick:() => {
              if (idx < order.length-1) { [order[idx], order[idx+1]] = [order[idx+1], order[idx]]; render(); }
            }}, '▼')
          )
        );
        listDiv.appendChild(row);
      });
      wrap.appendChild(listDiv);

      wrap.appendChild(el('button', {class:'btn btn-outline btn-sm', style:'margin-top:12px', onClick:() => {
        let correct = 0;
        order.forEach((item, i) => { if (item.id === correctOrder[i]?.id) correct++; });
        const total = items.length;
        const passed = correct === total;
        const resDiv = el('div', {class:`activity-result ${passed ? 'pass' : 'fail'}`, style:'margin-top:10px'}, 
          passed ? `✓ Perfect! Correct order.` : `${correct}/${total} in correct position.`
        );
        if (!passed) {
          const hint = document.createElement('div');
          hint.style.cssText = 'margin-top:8px;font-size:.8rem';
          hint.innerHTML = `<strong style="color:var(--text2)">${label}:</strong><ol style="margin-top:6px;padding-left:20px;color:var(--text3)">` +
            correctOrder.map(it => `<li style="margin-bottom:3px">${it.text || it.label || ''}</li>`).join('') + '</ol>';
          resDiv.appendChild(hint);
        }
        const existing = wrap.querySelector('.activity-result');
        if (existing) existing.replaceWith(resDiv);
        else wrap.appendChild(resDiv);
      }}, 'Check Order'));
    };

    render();
    return wrap;
  },
  
  renderRiskRankActivity(data) {
    const wrap = document.createElement('div');
    const items = [...(data.items || [])].sort(() => Math.random() - 0.5);
    // Build rank labels: rankLabels array e.g. ['Lowest Risk', 'Moderate', 'Highest Risk']
    const rankLabels = data.rankLabels || ['Low', 'Moderate', 'High'];

    // Sort items by rank for answer key
    const sortedByRank = [...items].sort((a, b) => (a.rank || 0) - (b.rank || 0));

    wrap.appendChild(el('div', {style:'margin-bottom:12px'},
      el('div', {class:'text-sm', style:'color:var(--text2);margin-bottom:6px'}, data.instructions || 'Rank each case:'),
      el('div', {style:'display:flex;gap:8px;flex-wrap:wrap'},
        ...rankLabels.map((label, i) => el('span', {class:'badge badge-gray'}, `${i+1}. ${label}`))
      )
    ));

    // Draggable ranking list
    let order = [...items];
    const listDiv = el('div', {id:'rr-list', style:'display:flex;flex-direction:column;gap:6px;margin-bottom:12px'});

    const renderList = () => {
      listDiv.innerHTML = '';
      order.forEach((item, idx) => {
        const row = el('div', {style:'display:flex;align-items:flex-start;gap:8px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px'},
          el('div', {style:'display:flex;flex-direction:column;gap:2px;flex-shrink:0'},
            el('button', {class:'btn btn-ghost', style:'padding:2px 6px;font-size:.75rem', onClick:() => {
              if (idx > 0) { [order[idx-1], order[idx]] = [order[idx], order[idx-1]]; renderList(); }
            }}, '▲'),
            el('button', {class:'btn btn-ghost', style:'padding:2px 6px;font-size:.75rem', onClick:() => {
              if (idx < order.length - 1) { [order[idx], order[idx+1]] = [order[idx+1], order[idx]]; renderList(); }
            }}, '▼')
          ),
          el('div', {style:'flex:1;font-size:.875rem;color:var(--text2);line-height:1.55'}, item.text || item.label || '')
        );
        listDiv.appendChild(row);
      });
    };
    renderList();
    wrap.appendChild(listDiv);

    wrap.appendChild(el('button', {class:'btn btn-outline btn-sm', onClick:() => {
      // Check if order matches correct rank order
      const correctOrder = [...items].sort((a, b) => (a.rank||0) - (b.rank||0));
      let correct = 0;
      order.forEach((item, i) => { if (item.id === correctOrder[i].id) correct++; });
      const total = items.length;
      const pct = Math.round(correct / total * 100);
      const resDiv = document.createElement('div');
      resDiv.className = `activity-result ${pct >= 60 ? 'pass' : 'fail'}`;
      resDiv.style.marginTop = '10px';
      resDiv.innerHTML = `${pct >= 60 ? '✓' : '✗'} ${correct}/${total} in correct position — `;

      // Show correct order with rationales
      const details = document.createElement('div');
      details.style.cssText = 'margin-top:10px;font-size:.8rem;color:var(--text3)';
      details.innerHTML = '<strong style="color:var(--text2)">Correct order:</strong>';
      correctOrder.forEach((item, i) => {
        const d = document.createElement('div');
        d.style.cssText = 'padding:6px 0;border-bottom:1px solid var(--border)';
        d.innerHTML = `<span style="color:var(--accent2)">${i+1}. ${rankLabels[i] || ''}</span> — ${item.text}<br><span style="font-size:.75rem;color:var(--text3)">${item.rationale || ''}</span>`;
        details.appendChild(d);
      });
      resDiv.appendChild(details);

      const existing = wrap.querySelector('.activity-result');
      if (existing) existing.replaceWith(resDiv);
      else wrap.appendChild(resDiv);
    }}, 'Check Ranking'));

    return wrap;
  },
  
  renderMseBuilderActivity(data) {
    const wrap = document.createElement('div');
    const domains = data.domains || [];
    wrap.appendChild(el('div', {class:'text-muted text-xs', style:'margin-bottom:10px'}, 'Match observations to MSE domains:'));
    
    const observations = data.observations || data.items || [];
    for (const obs of observations) {
      const row = el('div', {style:'display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap'});
      row.appendChild(el('div', {style:'flex:1;min-width:200px;font-size:.875rem;color:var(--text2)'}, obs.text || obs.label));
      const sel = el('select', {class:'form-input', style:'width:auto;flex-shrink:0;padding:6px 10px'},
        el('option', {value:''}, '— Select domain —'),
        ...domains.map(d => el('option', {value:d.id||d}, d.label||d))
      );
      sel.onchange = () => {
        const correct = obs.domain || obs.category;
        const isRight = sel.value === correct;
        sel.style.borderColor = isRight ? 'var(--green)' : 'var(--red)';
      };
      row.appendChild(sel);
      wrap.appendChild(row);
    }
    return wrap;
  },
  
  // ── Quiz ──────────────────────────────────────────────────
  async renderQuiz(data) {
    const { lessonId, moduleId } = data;
    const mod = CONTENT_DATA.modules.find(m => m.id === moduleId);
    const lesson = mod?.lessons.find(l => l.id === lessonId);
    const questions = lesson?.quizQuestions || [];
    
    if (questions.length === 0) return el('div', {}, 'No quiz available');
    
    const wrap = el('div', {class:'quiz-container'});
    wrap.appendChild(el('div', {class:'back-btn', onClick:()=>this.navigateTo('lesson', data)}, `← ${lesson.title}`));
    wrap.appendChild(el('h1', {style:'font-family:var(--font-head);font-size:1.4rem;font-weight:800;margin-bottom:4px'}, '📝 Quiz'));
    wrap.appendChild(el('div', {class:'text-muted text-sm', style:'margin-bottom:24px'}, `${questions.length} questions • Pass: 70%`));
    
    const state = { answers: {}, submitted: false, startTime: Date.now() };
    
    const renderQuestions = () => {
      const qWrap = document.getElementById('quiz-questions');
      if (!qWrap) return;
      qWrap.innerHTML = '';
      
      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];
        const qDiv = el('div', {class:'quiz-question'},
          el('div', {style:'font-size:.8rem;color:var(--text3);margin-bottom:6px;font-family:var(--font-mono)'}, `Q${qi + 1} of ${questions.length}`),
          el('div', {class:'quiz-stem'}, q.stem)
        );
        
        for (const opt of q.options) {
          const userAns = state.answers[q.id];
          const isSelected = userAns === opt.id;
          const isCorrect = q.correct.includes(opt.id);
          let cls = 'quiz-option';
          if (state.submitted) {
            if (isCorrect) cls += ' correct';
            else if (isSelected && !isCorrect) cls += ' incorrect';
            cls += ' disabled';
          } else if (isSelected) cls += ' selected';
          
          const optDiv = el('div', {class: cls, onClick:() => {
            if (state.submitted) return;
            state.answers[q.id] = opt.id;
            renderQuestions();
          }},
            el('div', {class:`quiz-radio${isSelected ? ' filled' : ''}`}),
            el('span', {}, opt.text)
          );
          qDiv.appendChild(optDiv);
        }
        
        if (state.submitted && q.explanation) {
          const exp = el('div', {class:'explanation-box'}, q.explanation);
          qDiv.appendChild(exp);
        }
        
        qWrap.appendChild(qDiv);
      }
      
      // Submit / results area
      const actDiv = document.getElementById('quiz-action');
      if (!actDiv) return;
      actDiv.innerHTML = '';
      
      if (!state.submitted) {
        const answered = Object.keys(state.answers).length;
        const submitBtn = el('button', {class:'btn btn-primary', disabled: answered < questions.length, onClick:async () => {
          submitBtn.disabled = true; submitBtn.textContent = 'Saving…';
          state.submitted = true;
          const timeSpent = Math.round((Date.now() - state.startTime) / 1000);
          let correct = 0;
          for (const q of questions) {
            if (q.correct.includes(state.answers[q.id])) correct++;
          }
          const score = Math.round((correct / questions.length) * 100);
          const passed = score >= 70;
          const isPerfect = score === 100;
          
          await Progress.submitQuiz(this.user.id, lessonId, moduleId, score, questions.length, correct, passed, Object.entries(state.answers).map(([qId, ans]) => ({ questionId: qId, selected: [ans], correct: questions.find(q => q.id === qId)?.correct.includes(ans) || false })));
          const xpResult = await XPSystem.awardQuiz(this.user.id, lessonId, score, isPerfect);
          showToast(`📝 Quiz complete! ${score}% ${passed ? '✓ Passed' : '✗ Failed'} • +${xpResult.xpAwarded} XP`);
          const newBadges = await XPSystem.checkBadges(this.user.id);
          for (const b of newBadges) showToast(`🏆 Badge: ${b.name} +${b.xp} XP`);
          
          renderQuestions();
        }}, `Submit Quiz (${answered}/${questions.length} answered)`);
        if (answered >= questions.length) submitBtn.removeAttribute('disabled');
        actDiv.appendChild(submitBtn);
      } else {
        let correct = 0;
        for (const q of questions) if (q.correct.includes(state.answers[q.id])) correct++;
        const score = Math.round((correct / questions.length) * 100);
        const passed = score >= 70;
        
        const resDiv = el('div', {class:'sim-score-display'},
          el('div', {style:`font-size:3rem;font-weight:800;font-family:var(--font-head);color:${passed ? 'var(--green)' : 'var(--red)'}`}, `${score}%`),
          el('div', {style:'color:var(--text2);margin:8px 0'}, `${correct} / ${questions.length} correct`),
          el('div', {class:`badge ${passed ? 'badge-green' : 'badge-red'}`, style:'font-size:.9rem;padding:6px 16px;margin:12px 0'}, passed ? '✓ PASSED' : '✗ NEEDS REVIEW'),
          el('div', {style:'display:flex;gap:10px;justify-content:center;margin-top:16px'},
            el('button', {class:'btn btn-outline', onClick:() => {
              state.answers = {}; state.submitted = false; state.startTime = Date.now(); renderQuestions();
            }}, '↺ Retake'),
            el('button', {class:'btn btn-ghost', onClick:()=>this.navigateTo('lesson', data)}, 'Back to Lesson')
          )
        );
        actDiv.appendChild(resDiv);
      }
    };
    
    const qWrap = el('div', {id:'quiz-questions'});
    const actDiv = el('div', {id:'quiz-action', style:'margin-top:20px'});
    wrap.appendChild(qWrap);
    wrap.appendChild(actDiv);
    renderQuestions();
    
    return wrap;
  },
  
  // ── Simulations ──────────────────────────────────────────
  async renderSimulationsPage() {
    await Progress.load(this.user.id);
    const p = Progress.get(this.user.id);
    const wrap = document.createElement('div');
    wrap.appendChild(el('div', {class:'section-header'},
      el('div', {class:'section-title-lg'}, 'Clinical Simulations'),
      el('div', {class:'text-muted text-sm'}, 'Branching case scenarios that simulate real clinical decisions')
    ));
    
    const grid = el('div', {class:'grid-2'});
    for (const sim of CONTENT_DATA.simulations) {
      const res = p.simulations[sim.id];
      const card = el('div', {class:'card', style:'cursor:pointer', onClick:()=>this.navigateTo('simulation', sim.id)},
        el('div', {style:'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px'},
          el('div', {class:'badge badge-blue'}, sim.type.replace(/-/g,' ').toUpperCase()),
          res ? el('div', {class:`badge ${res.bestPct >= 70 ? 'badge-green' : 'badge-yellow'}`}, `Best: ${res.bestPct}%`) : null
        ),
        el('div', {class:'card-title', style:'margin-bottom:8px'}, sim.title),
        el('div', {class:'text-muted text-sm', style:'margin-bottom:14px;line-height:1.55'}, sim.description),
        el('div', {style:'display:flex;gap:12px;font-size:.8rem;color:var(--text3)'},
          el('span', {}, `⏱ ${sim.estimatedMinutes} min`),
          el('span', {}, `${Object.keys(sim.nodes).length} decision points`)
        ),
        el('button', {class:'btn btn-primary btn-sm', style:'margin-top:14px'}, res ? '↺ Redo Simulation' : '▶ Start Simulation')
      );
      grid.appendChild(card);
    }
    wrap.appendChild(grid);
    return wrap;
  },
  
  async renderSimulation(simId) {
    const sim = CONTENT_DATA.simulations.find(s => s.id === simId);
    if (!sim) return el('div', {}, 'Simulation not found');
    await Progress.load(this.user.id);
    
    const wrap = el('div', {class:'sim-stage'});
    wrap.appendChild(el('div', {class:'back-btn', onClick:()=>this.navigate('simulations')}, '← Simulations'));
    wrap.appendChild(el('h1', {style:'font-family:var(--font-head);font-size:1.4rem;font-weight:800;margin-bottom:8px'}, sim.title));
    
    const state = { nodeId: sim.startNodeId, score: 0, history: [], choices: {}, completed: false };
    
    wrap.appendChild(el('div', {class:'sim-header'},
      el('div', {class:'badge badge-blue', style:'margin-bottom:8px'}, '📋 Case Vignette'),
      el('div', {class:'sim-vignette'}, sim.caseVignette)
    ));
    
    const stageDiv = el('div', {id:'sim-stage'});
    wrap.appendChild(stageDiv);
    
    const renderNode = () => {
      stageDiv.innerHTML = '';
      if (state.completed) {
        const maxScore = sim.scoringRubric?.maxScore || 100;
        const pct = Math.round((state.score / maxScore) * 100);
        const passed = pct >= 70;
        
        // Submit results
        Progress.submitSimulation(this.user.id, simId, state.score, maxScore, { history: state.history });
        XPSystem.awardSim(this.user.id, simId, pct).then(xpRes => {
          showToast(`🎮 Simulation complete! ${pct}% • +${xpRes.xpAwarded} XP`);
        });
        XPSystem.checkBadges(this.user.id).then(newBadges => {
          for (const b of newBadges) setTimeout(() => showToast(`🏆 Badge: ${b.name}`), 1500);
        });
        
        const scoreDiv = el('div', {class:'sim-score-display'},
          el('div', {style:`font-size:3.5rem;font-weight:800;font-family:var(--font-head);color:${passed ? 'var(--green)' : 'var(--red)'}`}, `${pct}%`),
          el('div', {style:'color:var(--text2);margin:8px 0'}, `Score: ${state.score} / ${maxScore}`),
          el('div', {class:`badge ${passed ? 'badge-green' : 'badge-yellow'}`, style:'font-size:.9rem;padding:6px 16px;margin:12px 0'}, passed ? '✓ PASSED' : '⚠ NEEDS IMPROVEMENT'),
          sim.scoringRubric?.categories && el('div', {style:'margin:16px 0;text-align:left;max-width:400px;margin-left:auto;margin-right:auto'},
            ...sim.scoringRubric.categories.map(cat => el('div', {style:'display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:.85rem'},
              el('span', {style:'color:var(--text2)'}, cat.label),
              el('span', {class:'text-accent'}, `${cat.weight}%`)
            ))
          ),
          el('div', {style:'display:flex;gap:10px;justify-content:center;margin-top:20px'},
            el('button', {class:'btn btn-outline', onClick:() => {
              state.nodeId = sim.startNodeId; state.score = 0; state.history = []; state.choices = {}; state.completed = false;
              renderNode();
            }}, '↺ Retry'),
            el('button', {class:'btn btn-ghost', onClick:()=>this.navigate('simulations')}, 'All Simulations')
          )
        );
        stageDiv.appendChild(scoreDiv);
        return;
      }
      
      const node = sim.nodes[state.nodeId];
      if (!node) { state.completed = true; renderNode(); return; }
      
      const nodeDiv = el('div', {class:'sim-node'});
      
      // History (collapsed)
      if (state.history.length > 0) {
        const histDiv = el('details', {style:'margin-bottom:12px'},
          el('summary', {style:'cursor:pointer;font-size:.8rem;color:var(--text3);margin-bottom:8px'}, `📋 Decision history (${state.history.length})`),
          el('div', {style:'padding:8px 12px;background:var(--bg3);border-radius:var(--radius-sm);font-size:.8rem;color:var(--text3)'},
            ...state.history.map(h => el('div', {style:'margin-bottom:4px'}, `→ ${h}`))
          )
        );
        nodeDiv.appendChild(histDiv);
      }
      
      const contentDiv = el('div', {class:'sim-content'});
      contentDiv.innerHTML = renderMarkdown(node.content || '');
      nodeDiv.appendChild(contentDiv);
      
      if (node.type === 'outcome' || node.type === 'feedback') {
        // Terminal or intermediate feedback node
        const isEnd = node.type === 'outcome' || !node.choices?.length;
        if (isEnd) { state.completed = true; }
        
        if (node.choices?.length > 0) {
          for (let ci = 0; ci < node.choices.length; ci++) {
            const choice = node.choices[ci];
            const btn = el('div', {class:'sim-choice', onClick:() => {
              if (choice.score) state.score += choice.score;
              if (choice.feedback) state.history.push(choice.feedback);
              state.nodeId = choice.nextNodeId;
              renderNode();
            }},
              el('div', {class:'sim-choice-num'}, String.fromCharCode(65 + ci)),
              el('span', {}, choice.label)
            );
            nodeDiv.appendChild(btn);
          }
        } else {
          nodeDiv.appendChild(el('button', {class:'btn btn-primary btn-sm', style:'margin-top:12px', onClick:() => {
            state.completed = true; renderNode();
          }}, 'View Results →'));
        }
      } else if (node.type === 'retrieval') {
        // Knowledge check node
        if (node.choices?.length > 0) {
          for (let ci = 0; ci < node.choices.length; ci++) {
            const choice = node.choices[ci];
            const already = state.choices[node.id];
            const btn = el('div', {class:`sim-choice${already ? ' disabled' : ''}`, onClick:() => {
              if (already) return;
              state.choices[node.id] = choice.id;
              if (choice.score) state.score += choice.score;
              const fb = el('div', {class:`sim-feedback ${choice.score > 0 ? 'positive' : choice.score < 0 ? 'negative' : 'neutral'}`}, choice.feedback || '');
              btn.after(fb);
              btn.style.opacity = '0.7';
              // Show continue button
              const nextBtn = el('button', {class:'btn btn-outline btn-sm', style:'margin-top:12px', onClick:() => {
                state.nodeId = choice.nextNodeId; renderNode();
              }}, 'Continue →');
              nodeDiv.appendChild(nextBtn);
              nodeDiv.querySelectorAll('.sim-choice:not(.chosen)').forEach(b => b.style.pointerEvents='none');
              btn.classList.add('chosen');
            }},
              el('div', {class:'sim-choice-num'}, String.fromCharCode(65 + ci)),
              el('span', {}, choice.label)
            );
            nodeDiv.appendChild(btn);
          }
        }
      } else {
        // Choice or patient node
        const choices = node.choices || [];
        for (let ci = 0; ci < choices.length; ci++) {
          const choice = choices[ci];
          const already = state.choices[node.id];
          const btn = el('div', {class:`sim-choice${already === choice.id ? ' chosen' : ''}${already ? ' disabled' : ''}`, onClick:() => {
            if (already) return;
            state.choices[node.id] = choice.id;
            if (choice.score) state.score += choice.score;
            btn.classList.add('chosen');
            
            if (choice.feedback) {
              const isPositive = (choice.score || 0) >= 0;
              const fb = el('div', {class:`sim-feedback ${isPositive ? 'positive' : 'negative'}`}, choice.feedback);
              btn.after(fb);
            }
            
            nodeDiv.querySelectorAll('.sim-choice:not(.chosen)').forEach(b => { b.style.pointerEvents='none'; b.style.opacity='0.5'; });
            
            const nextBtn = el('button', {class:'btn btn-outline btn-sm', style:'margin-top:14px', onClick:() => {
              state.nodeId = choice.nextNodeId;
              if (choice.feedback) state.history.push(choice.feedback.substring(0, 80) + (choice.feedback.length > 80 ? '...' : ''));
              renderNode();
            }}, 'Continue →');
            nodeDiv.appendChild(nextBtn);
          }},
            el('div', {class:'sim-choice-num'}, String.fromCharCode(65 + ci)),
            el('span', {}, choice.label)
          );
          nodeDiv.appendChild(btn);
        }
      }
      
      stageDiv.appendChild(nodeDiv);
    };
    
    renderNode();
    return wrap;
  },
  
  // ── Podcasts ─────────────────────────────────────────────
  renderPodcastsPage() {
    const wrap = document.createElement('div');

    // Header
    wrap.appendChild(el('div', {class:'section-header'},
      el('div', {},
        el('div', {class:'section-title-lg'}, '🎙️ PsychRounds Episode Library'),
        el('div', {class:'text-muted text-sm', style:'margin-top:4px'},
          `${CONTENT_DATA.podcasts.length} curated episodes from PsychRounds: The Psychiatry Podcast`)
      ),
      el('a', {
        href:'https://podcasts.apple.com/us/podcast/psychrounds-the-psychiatry-podcast/id1719888462',
        target:'_blank',
        class:'btn btn-outline btn-sm',
        style:'align-self:center;white-space:nowrap'
      }, '📱 Full Catalog →')
    ));

    // Module filter definitions
    const MODULE_FILTERS = [
      { id: 'all',                    label: 'All Episodes',        emoji: '🎙️' },
      { id: 'mod-interviewing',       label: 'Interviewing & MSE',  emoji: '🩺' },
      { id: 'mod-antipsychotics',     label: 'Antipsychotics',      emoji: '💊' },
      { id: 'mod-antidepressants',    label: 'Antidepressants',     emoji: '🧠' },
      { id: 'mod-mood-stabilizers',   label: 'Mood Stabilizers',    emoji: '⚖️' },
      { id: 'mod-anxiolytics',        label: 'Anxiolytics & Sleep', emoji: '😴' },
      { id: 'mod-06-substance-use',   label: 'Substance Use',       emoji: '🔬' },
      { id: 'mod-07-emergencies',     label: 'Emergencies',         emoji: '🚨' },
      { id: 'mod-08-special-populations', label: 'Special Pops',   emoji: '👥' },
    ];

    let activeModule = 'all';

    // Filter chips
    const filterBar = el('div', {style:'display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 12px'});
    const chipEls = {};
    for (const f of MODULE_FILTERS) {
      const count = f.id === 'all'
        ? CONTENT_DATA.podcasts.length
        : CONTENT_DATA.podcasts.filter(p => p.relatedModules?.includes(f.id)).length;
      if (count === 0) continue;
      const chip = el('button', {
        style: `display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:20px;border:1.5px solid var(--border);background:${f.id==='all'?'var(--accent)':'var(--surface)'};color:${f.id==='all'?'#fff':'var(--text2)'};font-size:.78rem;font-weight:600;cursor:pointer;transition:all .15s`,
        onClick: () => {
          activeModule = f.id;
          for (const [id, c] of Object.entries(chipEls)) {
            const active = id === f.id;
            c.style.background = active ? 'var(--accent)' : 'var(--surface)';
            c.style.color = active ? '#fff' : 'var(--text2)';
            c.style.borderColor = active ? 'var(--accent)' : 'var(--border)';
          }
          renderList(searchIn.value.toLowerCase());
        }
      }, `${f.emoji} ${f.label}`, el('span', {style:'background:rgba(0,0,0,.15);border-radius:10px;padding:1px 6px;font-size:.7rem'}, String(count)));
      chipEls[f.id] = chip;
      filterBar.appendChild(chip);
    }
    wrap.appendChild(filterBar);

    // Search
    const searchIn = el('input', {class:'search-input', type:'text', placeholder:'Search episodes by title or topic...'});
    const searchWrap = el('div', {class:'search-wrap'}, el('span', {class:'search-icon'}, '🔍'), searchIn);
    wrap.appendChild(searchWrap);

    // Results count label
    const countLabel = el('div', {style:'font-size:.78rem;color:var(--text3);margin:8px 0 4px'});
    wrap.appendChild(countLabel);

    const listDiv = el('div', {id:'podcast-list'});
    wrap.appendChild(listDiv);

    const renderList = (filter = '') => {
      listDiv.innerHTML = '';
      let pods = activeModule === 'all'
        ? [...CONTENT_DATA.podcasts]
        : CONTENT_DATA.podcasts.filter(p => p.relatedModules?.includes(activeModule));

      if (filter) {
        pods = pods.filter(p =>
          p.title.toLowerCase().includes(filter) ||
          (p.description || '').toLowerCase().includes(filter) ||
          (p.tags || []).some(t => t.includes(filter))
        );
      }

      // Sort: newest first if publishDate available
      pods.sort((a, b) => {
        if (a.publishDate && b.publishDate) return b.publishDate.localeCompare(a.publishDate);
        return 0;
      });

      countLabel.textContent = `Showing ${pods.length} episode${pods.length !== 1 ? 's' : ''}`;

      if (pods.length === 0) {
        listDiv.appendChild(el('div', {class:'empty-state'},
          el('div', {class:'empty-state-icon'}, '🎙️'),
          el('div', {class:'empty-state-title'}, 'No episodes found'),
          el('div', {class:'empty-state-sub'}, 'Try a different filter or search term')
        ));
        return;
      }

      for (const pod of pods) {
        // Module badges
        const modBadges = el('div', {style:'display:flex;gap:4px;flex-wrap:wrap;margin-top:6px'});
        for (const modId of (pod.relatedModules || [])) {
          const modDef = MODULE_FILTERS.find(f => f.id === modId);
          if (modDef) {
            modBadges.appendChild(el('span', {
              style:'font-size:.68rem;padding:2px 7px;border-radius:10px;background:var(--surface2);color:var(--text3);font-weight:600'
            }, `${modDef.emoji} ${modDef.label}`));
          }
        }

        // Tag chips
        const tagRow = el('div', {style:'display:flex;gap:4px;flex-wrap:wrap;margin-top:5px'});
        for (const tag of (pod.tags || []).slice(0, 4)) {
          tagRow.appendChild(el('span', {
            style:'font-size:.65rem;padding:2px 6px;border-radius:8px;background:rgba(var(--accent-rgb,99,102,241),.1);color:var(--accent);font-weight:500'
          }, tag));
        }

        const card = el('div', {class:'podcast-card', style:'align-items:flex-start;gap:14px'},
          el('div', {class:'podcast-thumb', style:'flex-shrink:0;font-size:1.4rem;width:48px;height:48px'}, '🎙️'),
          el('div', {class:'podcast-info', style:'flex:1;min-width:0'},
            el('div', {class:'podcast-title', style:'font-size:.9rem;font-weight:700;line-height:1.3'}, pod.title),
            el('div', {class:'podcast-meta', style:'margin-top:3px'},
              [pod.episode, pod.duration && `⏱ ${pod.duration}`,
               pod.publishDate && new Date(pod.publishDate).toLocaleDateString('en-US',{month:'short',year:'numeric'})
              ].filter(Boolean).join(' • ')
            ),
            pod.description && el('div', {style:'font-size:.78rem;color:var(--text3);margin-top:5px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden'}, pod.description),
            modBadges,
            tagRow
          ),
          pod.url ? el('a', {
            href: pod.url, target:'_blank',
            class:'btn btn-outline btn-sm',
            style:'flex-shrink:0;align-self:center;white-space:nowrap'
          }, '▶ Listen') : null
        );
        listDiv.appendChild(card);
      }
    };

    searchIn.oninput = () => renderList(searchIn.value.toLowerCase());
    renderList();
    return wrap;
  },
  
  // ── XP / Achievements Page ────────────────────────────────
  renderXPPage() {
    const xp = XPSystem.getProfile(this.user.id);
    const wrap = document.createElement('div');
    
    wrap.appendChild(el('div', {class:'section-title-lg', style:'margin-bottom:20px'}, '⚡ XP & Achievements'));
    
    // XP card
    const xpCard = el('div', {class:'card card-lg', style:'margin-bottom:24px'},
      el('div', {style:'display:flex;align-items:center;gap:20px;margin-bottom:16px'},
        el('div', {style:'background:linear-gradient(135deg,var(--accent),var(--purple));width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.8rem;flex-shrink:0'}, '⚡'),
        el('div', {},
          el('div', {style:'font-size:.85rem;color:var(--text3)'}, 'Total XP Earned'),
          el('div', {style:'font-family:var(--font-head);font-size:2.5rem;font-weight:800;color:var(--text);line-height:1'}, xp.totalXP.toLocaleString()),
          el('div', {class:'badge badge-purple', style:'margin-top:6px'}, `Level ${xp.level}`)
        )
      ),
      el('div', {class:'xp-bar-header', style:'margin-bottom:6px'},
        el('span', {}, `Progress to Level ${xp.level + 1}`),
        el('span', {}, `${xp.current} / ${xp.next} XP`)
      ),
      el('div', {class:'xp-bar', style:'height:10px'}, el('div', {class:'xp-fill', style:`width:${Math.min(100, xp.next > 0 ? xp.current / xp.next * 100 : 100)}%`}))
    );
    wrap.appendChild(xpCard);
    
    // Badges
    wrap.appendChild(el('h3', {style:'font-family:var(--font-head);font-size:1.1rem;font-weight:700;margin-bottom:14px'}, '🏆 Badges'));
    const badgesGrid = el('div', {class:'badges-grid', style:'margin-bottom:28px'});
    for (const badge of XPSystem.ALL_BADGES) {
      const earned = xp.earned?.find(e => e.id === badge.id);
      const card = el('div', {class:`badge-card${earned ? ' earned' : ' locked'}`},
        el('div', {class:'badge-emoji'}, badge.icon),
        el('div', {class:'badge-name'}, badge.name),
        el('div', {class:'badge-desc'}, badge.desc),
        el('div', {class:'badge-xp'}, `+${badge.xp} XP`),
        earned ? el('div', {style:'font-size:.65rem;color:var(--text3)'}, timeAgo(earned.at)) : el('div', {style:'font-size:.7rem;color:var(--text3)'}, '🔒 Locked')
      );
      badgesGrid.appendChild(card);
    }
    wrap.appendChild(badgesGrid);
    
    // Recent XP
    if (xp.transactions?.length > 0) {
      wrap.appendChild(el('h3', {style:'font-family:var(--font-head);font-size:1.1rem;font-weight:700;margin-bottom:14px'}, 'Recent XP'));
      for (const tx of xp.transactions.slice().reverse().slice(0, 10)) {
        wrap.appendChild(el('div', {class:'lesson-item', style:'cursor:default'},
          el('div', {style:'font-size:1rem;flex-shrink:0'}, tx.type === 'lesson' ? '📚' : tx.type === 'quiz' ? '📝' : tx.type === 'sim' ? '🎮' : '🏆'),
          el('div', {class:'lesson-title'}, tx.note || tx.type),
          el('div', {class:'text-green fw-700'}, `+${tx.amount}`),
          el('div', {class:'text-muted text-xs'}, timeAgo(tx.at))
        ));
      }
    }
    
    return wrap;
  },
  
  // ── Admin Page ───────────────────────────────────────────
  async renderAdminPage() {
    if (!this.user.isAdmin) return el('div', {}, 'Access denied');
    const wrap = document.createElement('div');
    wrap.appendChild(el('div', {class:'section-header'},
      el('div', {class:'section-title-lg'}, '👑 Administrator Dashboard'),
      el('div', {class:'text-muted text-sm'}, 'Monitor student progress and engagement')
    ));
    
    // Load all students and their progress in parallel
    const students = await Auth.getAllStudents();
    await Promise.all(students.map(s => Promise.all([
      Progress.load(s.id),
      XPSystem.load(s.id)
    ])));
    
    // Summary stats
    const statsGrid = el('div', {class:'grid-4', style:'margin-bottom:24px'});
    const totalStudents = students.length;
    const avgCompletion = students.length > 0 ? Math.round(students.reduce((sum, s) => {
      const dash = Progress.getDashboard(s.id);
      return sum + dash.totalCompletion;
    }, 0) / students.length) : 0;
    const atRisk = students.filter(s => {
      const dash = Progress.getDashboard(s.id);
      return dash.totalCompletion < 30;
    }).length;
    
    for (const [label, val, cls] of [
      ['Total Students', totalStudents, ''],
      ['Avg Completion', avgCompletion + '%', ''],
      ['At Risk', atRisk, atRisk > 0 ? 'color:var(--red)' : ''],
      ['On Track', totalStudents - atRisk, 'color:var(--green)']
    ]) {
      statsGrid.appendChild(el('div', {class:'card', style:'text-align:center'},
        el('div', {style:`font-family:var(--font-head);font-size:2rem;font-weight:800;${cls}`}, String(val)),
        el('div', {class:'text-muted text-sm'}, label)
      ));
    }
    wrap.appendChild(statsGrid);
    
    // Students table
    const panel = el('div', {class:'admin-panel'});
    panel.appendChild(el('h3', {style:'font-family:var(--font-head);font-size:1rem;margin-bottom:16px'}, `Students (${students.length})`));
    
    if (students.length === 0) {
      panel.appendChild(el('div', {class:'empty-state'},
        el('div', {class:'empty-state-icon'}, '👥'),
        el('div', {class:'empty-state-title'}, 'No students yet'),
        el('div', {class:'text-muted text-sm'}, 'Students will appear here once they create accounts.')
      ));
    } else {
      const tableWrap = el('div', {class:'admin-table-wrap'});
      const table = el('table', {class:'admin-table'});
      table.appendChild(el('thead', {}, el('tr', {},
        ...['Name', 'Email', 'Program', 'Site', 'Overall', 'Lessons', 'Quizzes', 'Sims', 'XP', 'Status', 'Last Active'].map(h => el('th', {}, h))
      )));
      const tbody = el('tbody');
      for (const student of students) {
        const dash = Progress.getDashboard(student.id);
        const xp = XPSystem.getProfile(student.id);
        const p = Progress.get(student.id);
        const lessonsTotal = CONTENT_DATA.modules.reduce((s, m) => s + m.lessons.filter(l => !l.comingSoon).length, 0);
        const lessonsDone = Object.values(p.lessons).filter(l => l.completed).length;
        const quizzesDone = Object.values(p.quizzes).filter(q => q.passed).length;
        const simsDone = Object.keys(p.simulations).length;
        const isAtRisk = dash.totalCompletion < 30;
        const lastActive = timeAgo(student.lastActive);
        
        tbody.appendChild(el('tr', {},
          el('td', {style:'font-weight:600'}, student.fullName),
          el('td', {}, student.email),
          el('td', {}, student.program || '—'),
          el('td', {}, student.site || '—'),
          el('td', {}, el('div', {style:'display:flex;align-items:center;gap:8px'},
            el('div', {class:'progress-bar', style:'width:60px'}, el('div', {class:`progress-fill${dash.totalCompletion >= 70 ? ' green' : ''}`, style:`width:${dash.totalCompletion}%`})),
            el('span', {style:'font-size:.8rem'}, `${Math.round(dash.totalCompletion)}%`)
          )),
          el('td', {}, `${lessonsDone}/${lessonsTotal}`),
          el('td', {}, `${quizzesDone}`),
          el('td', {}, `${simsDone}/${CONTENT_DATA.simulations.length}`),
          el('td', {}, `⚡ ${xp.totalXP}`),
          el('td', {}, isAtRisk ? el('span', {class:'at-risk'}, '⚠ At Risk') : el('span', {class:'on-track'}, '✓ On Track')),
          el('td', {class:'text-muted text-xs'}, lastActive)
        ));
      }
      table.appendChild(tbody);
      tableWrap.appendChild(table);
      panel.appendChild(tableWrap);
    }
    
    wrap.appendChild(panel);
    
    // Admin settings
    const settingsPanel = el('div', {class:'admin-panel'});
    settingsPanel.appendChild(el('h3', {style:'font-family:var(--font-head);font-size:1rem;margin-bottom:16px'}, '⚙ Admin Settings'));
    const adminCode = await AppSettings.get('admin_code', 'PSYCH-ADMIN-2024');
    settingsPanel.appendChild(el('div', {class:'form-group'},
      el('label', {class:'form-label'}, 'Admin Access Code'),
      el('input', {class:'form-input', value:adminCode, id:'admin-code-input', style:'max-width:300px'}),
      el('div', {class:'form-hint'}, 'Share this with instructors who need admin access')
    ));
    settingsPanel.appendChild(el('button', {class:'btn btn-outline btn-sm', onClick:async () => {
      const val = document.getElementById('admin-code-input').value.trim();
      if (val) { await AppSettings.set('admin_code', val); showToast('✓ Admin code updated'); }
    }}, 'Save Settings'));
    wrap.appendChild(settingsPanel);
    
    return wrap;
  },
  
  // ── Profile Page ─────────────────────────────────────────
  renderProfilePage() {
    const wrap = document.createElement('div');
    wrap.appendChild(el('div', {class:'section-title-lg', style:'margin-bottom:24px'}, '👤 My Profile'));
    
    const card = el('div', {class:'card card-lg', style:'max-width:560px'});
    const nameIn = el('input', {class:'form-input', value:this.user.fullName});
    const programIn = el('input', {class:'form-input', value:this.user.program || ''});
    const siteIn = el('input', {class:'form-input', value:this.user.site || ''});
    
    card.appendChild(el('div', {style:'display:flex;align-items:center;gap:16px;margin-bottom:24px'},
      el('div', {class:'nav-avatar', style:'width:56px;height:56px;font-size:1.4rem'}, this.user.fullName.charAt(0).toUpperCase()),
      el('div', {},
        el('div', {style:'font-family:var(--font-head);font-size:1.1rem;font-weight:700'}, this.user.fullName),
        el('div', {class:'text-muted text-sm'}, this.user.email),
        el('div', {class:'badge badge-blue', style:'margin-top:6px'}, this.user.isAdmin ? '👑 Administrator' : '🩺 Intern')
      )
    ));
    
    card.appendChild(el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Full Name'), nameIn));
    card.appendChild(el('div', {class:'form-row'},
      el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Program'), programIn),
      el('div', {class:'form-group'}, el('label', {class:'form-label'}, 'Site'), siteIn)
    ));
    
    const errDiv = el('div', {class:'form-error', style:'display:none'});
    card.appendChild(errDiv);
    
    card.appendChild(el('div', {style:'display:flex;gap:10px;margin-top:16px'},
      el('button', {class:'btn btn-primary', onClick:async function() {
        if (!nameIn.value.trim()) { errDiv.textContent='Name required'; errDiv.style.display='block'; return; }
        this.disabled = true; this.textContent = 'Saving…';
        const updated = await Auth.updateProfile(App.user.id, { fullName: nameIn.value.trim(), program: programIn.value, site: siteIn.value });
        App.user = updated;
        showToast('✓ Profile updated');
        this.disabled = false; this.textContent = 'Save Changes';
        App.render();
        App.navigate('profile');
      }}, 'Save Changes'),
      el('button', {class:'btn btn-outline', onClick:() => {
        Auth.logout();
        App.user = null;
        App.render();
      }}, 'Sign Out')
    ));
    
    wrap.appendChild(card);
    
    // Danger zone
    wrap.appendChild(el('div', {class:'card', style:'max-width:560px;margin-top:20px;border-color:rgba(239,68,68,.3)'},
      el('div', {style:'font-weight:700;color:var(--red);margin-bottom:8px'}, '⚠ Danger Zone'),
      el('div', {class:'text-muted text-sm', style:'margin-bottom:12px'}, 'Deleting your account will permanently remove all your progress data.'),
      el('button', {class:'btn btn-danger btn-sm', onClick:async function() {
        if (confirm('Are you sure? All your progress will be permanently deleted.')) {
          this.disabled = true; this.textContent = 'Deleting…';
          await Auth.deleteAccount(App.user.id, App.user.email);
          App.user = null;
          App.render();
        }
      }}, 'Delete Account')
    ));
    
    return wrap;
  }
};

// ── Utility functions ────────────────────────────────────────
function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

// ── Scroll to top button ─────────────────────────────────────
window.addEventListener('scroll', () => {
  let btn = document.getElementById('scroll-top');
  if (!btn) {
    btn = el('div', {class:'scroll-top-btn', id:'scroll-top', onClick:()=>window.scrollTo({top:0,behavior:'smooth'})}, '↑');
    document.body.appendChild(btn);
  }
  btn.className = 'scroll-top-btn' + (window.scrollY > 300 ? ' visible' : '');
});

// ── Init ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => App.init());
