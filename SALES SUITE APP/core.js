// Shared bootstrap: Firebase init, auth, user profile, active-company context,
// top-level nav, and the company-settings modal. quotes.js and oa.js register
// callbacks here rather than touching Firebase directly.
(function (global) {
  const COMPANIES = [
    { id: 'chemsol-limited', label: 'Chemsol Limited' },
    { id: 'chemsol-scientific', label: 'Chemsol Scientific' },
    { id: 'labmall-scientific', label: 'Labmall Scientific' }
  ];
  const ACTIVE_COMPANY_KEY = 'sales-suite-active-company-v1';

  const el = (id) => document.getElementById(id);

  const loginScreen = el('loginScreen');
  const loginForm = el('loginForm');
  const loginEmailInput = el('loginEmailInput');
  const loginPasswordInput = el('loginPasswordInput');
  const loginErrorText = el('loginErrorText');
  const loginSubmitBtn = el('loginSubmitBtn');

  const gateScreen = el('gateScreen');
  const gateMessageText = el('gateMessageText');
  const gateSignOutBtn = el('gateSignOutBtn');

  const appShell = el('appShell');
  const topBarUserText = el('topBarUserText');
  const companySwitcherWrap = el('companySwitcherWrap');
  const companySwitcherSelect = el('companySwitcherSelect');
  const settingsBtn = el('settingsBtn');
  const signOutBtn = el('signOutBtn');

  const navQuotesBtn = el('navQuotesBtn');
  const navAcknowledgementsBtn = el('navAcknowledgementsBtn');
  const navCatalogBtn = el('navCatalogBtn');
  const quotesSection = el('quotesSection');
  const acknowledgementsSection = el('acknowledgementsSection');
  const catalogSection = el('catalogSection');

  const settingsModal = el('settingsModal');
  const settingsModalClose = el('settingsModalClose');
  const companyNameInput = el('companyNameInput');
  const companyAddressInput = el('companyAddressInput');
  const companyPhoneInput = el('companyPhoneInput');
  const companyEmailInput = el('companyEmailInput');
  const saveSettingsBtn = el('saveSettingsBtn');
  const settingsStatusText = el('settingsStatusText');

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const state = {
    auth: null,
    db: null,
    configured: false,
    user: null,        // { uid, email }
    profile: null,      // { displayName, companyId, role }
    activeCompanyId: null,
    company: null,       // active company's letterhead doc data
    companyUnsub: null
  };

  const companyChangeCallbacks = [];
  function onCompanyChange(cb) { companyChangeCallbacks.push(cb); }

  function isAdmin() { return !!(state.profile && state.profile.role === 'admin'); }

  // ---------- Firebase init ----------
  function initFirebase() {
    if (typeof firebaseConfig === 'undefined' || !firebaseConfig.apiKey || firebaseConfig.apiKey.indexOf('YOUR_') === 0) {
      state.configured = false;
      showLogin('Sales Suite isn’t connected to Firebase yet. See SETUP.md to create a project and fill in firebase-config.js.');
      return;
    }
    state.configured = true;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    state.auth = firebase.auth();
    state.db = firebase.firestore();
    state.auth.onAuthStateChanged(handleAuthChange);
  }

  function handleAuthChange(user) {
    if (!user) {
      state.user = null;
      state.profile = null;
      showLogin();
      return;
    }
    state.user = { uid: user.uid, email: user.email };
    state.db.collection('users').doc(user.uid).get()
      .then((doc) => {
        if (!doc.exists) {
          showGate('Your account (' + user.email + ') is signed in, but not yet set up. Ask your admin to add you — see SETUP.md.');
          return;
        }
        state.profile = doc.data();
        bootApp();
      })
      .catch(() => {
        showGate('Could not load your account profile. Check your connection and try reloading.');
      });
  }

  function bootApp() {
    const savedCompany = localStorage.getItem(ACTIVE_COMPANY_KEY);
    if (isAdmin()) {
      state.activeCompanyId = (savedCompany && COMPANIES.some((c) => c.id === savedCompany))
        ? savedCompany
        : COMPANIES[0].id;
    } else {
      state.activeCompanyId = state.profile.companyId;
    }
    showApp();
    renderTopBar();
    attachCompanyListener();
  }

  // ---------- view switching ----------
  function showLogin(message) {
    loginScreen.style.display = '';
    gateScreen.style.display = 'none';
    appShell.style.display = 'none';
    loginErrorText.classList.remove('show');
    if (message) {
      loginErrorText.textContent = message;
      loginErrorText.classList.add('show');
    }
  }

  function showGate(message) {
    loginScreen.style.display = 'none';
    appShell.style.display = 'none';
    gateScreen.style.display = '';
    gateMessageText.textContent = message;
  }

  function showApp() {
    loginScreen.style.display = 'none';
    gateScreen.style.display = 'none';
    appShell.style.display = '';
  }

  function renderTopBar() {
    topBarUserText.innerHTML = `<strong>${escapeHtml(state.profile.displayName || state.user.email)}</strong>` +
      (isAdmin() ? ' <span class="badge admin">admin</span>' : '');

    if (isAdmin()) {
      companySwitcherWrap.style.display = '';
      companySwitcherSelect.innerHTML = COMPANIES.map((c) =>
        `<option value="${c.id}" ${c.id === state.activeCompanyId ? 'selected' : ''}>${escapeHtml(c.label)}</option>`
      ).join('');
    } else {
      companySwitcherWrap.style.display = 'none';
    }
  }

  companySwitcherSelect.addEventListener('change', () => {
    const next = companySwitcherSelect.value;
    if (next === state.activeCompanyId) return;
    state.activeCompanyId = next;
    localStorage.setItem(ACTIVE_COMPANY_KEY, next);
    attachCompanyListener();
  });

  // ---------- active company letterhead ----------
  function attachCompanyListener() {
    if (state.companyUnsub) { state.companyUnsub(); state.companyUnsub = null; }
    const ref = state.db.collection('companies').doc(state.activeCompanyId);
    state.companyUnsub = ref.onSnapshot((doc) => {
      state.company = doc.exists ? doc.data() : { name: companyLabel(state.activeCompanyId) };
      companyChangeCallbacks.forEach((cb) => cb(state.activeCompanyId, state.company));
    }, () => {
      state.company = { name: companyLabel(state.activeCompanyId) };
      companyChangeCallbacks.forEach((cb) => cb(state.activeCompanyId, state.company));
    });
  }

  function companyLabel(id) {
    const found = COMPANIES.find((c) => c.id === id);
    return found ? found.label : id;
  }

  // ---------- login form ----------
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.configured) return;
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;
    if (!email || !password) return;
    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = 'Signing in…';
    loginErrorText.classList.remove('show');
    state.auth.signInWithEmailAndPassword(email, password)
      .catch((err) => {
        loginErrorText.textContent = friendlyAuthError(err);
        loginErrorText.classList.add('show');
      })
      .finally(() => {
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = 'Sign in';
      });
  });

  function friendlyAuthError(err) {
    const code = err && err.code;
    if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      return 'Incorrect email or password.';
    }
    if (code === 'auth/too-many-requests') return 'Too many attempts — try again in a moment.';
    if (code === 'auth/network-request-failed') return 'Network error — check your connection.';
    return 'Sign-in failed: ' + (err && err.message ? err.message : 'unknown error');
  }

  function doSignOut() {
    if (state.auth) state.auth.signOut();
  }
  signOutBtn.addEventListener('click', doSignOut);
  gateSignOutBtn.addEventListener('click', doSignOut);

  // ---------- top-level nav ----------
  function switchTopNav(view) {
    quotesSection.style.display = view === 'quotes' ? '' : 'none';
    acknowledgementsSection.style.display = view === 'acknowledgements' ? '' : 'none';
    catalogSection.style.display = view === 'catalog' ? '' : 'none';
    navQuotesBtn.classList.toggle('active', view === 'quotes');
    navAcknowledgementsBtn.classList.toggle('active', view === 'acknowledgements');
    navCatalogBtn.classList.toggle('active', view === 'catalog');
  }
  navQuotesBtn.addEventListener('click', () => switchTopNav('quotes'));
  navAcknowledgementsBtn.addEventListener('click', () => switchTopNav('acknowledgements'));
  navCatalogBtn.addEventListener('click', () => switchTopNav('catalog'));

  // ---------- settings modal (company letterhead) ----------
  settingsBtn.addEventListener('click', () => {
    const c = state.company || {};
    companyNameInput.value = c.name || '';
    companyAddressInput.value = c.address || '';
    companyPhoneInput.value = c.phone || '';
    companyEmailInput.value = c.email || '';
    settingsStatusText.textContent = 'Editing letterhead for ' + companyLabel(state.activeCompanyId) + '.';
    settingsModal.classList.add('open');
  });
  settingsModalClose.addEventListener('click', () => settingsModal.classList.remove('open'));
  settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.remove('open'); });

  saveSettingsBtn.addEventListener('click', () => {
    const data = {
      name: companyNameInput.value.trim(),
      address: companyAddressInput.value.trim(),
      phone: companyPhoneInput.value.trim(),
      email: companyEmailInput.value.trim()
    };
    saveSettingsBtn.disabled = true;
    state.db.collection('companies').doc(state.activeCompanyId).set(data, { merge: true })
      .then(() => { settingsModal.classList.remove('open'); })
      .catch(() => { settingsStatusText.textContent = 'Save failed — you may not have permission to edit this company.'; })
      .finally(() => { saveSettingsBtn.disabled = false; });
  });

  global.Core = {
    state,
    COMPANIES,
    escapeHtml,
    uid,
    todayIso,
    fmt,
    isAdmin,
    onCompanyChange,
    companyLabel
  };

  initFirebase();
})(window);
