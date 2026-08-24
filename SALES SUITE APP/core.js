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

  const navDashboardBtn = el('navDashboardBtn');
  const navQuotesBtn = el('navQuotesBtn');
  const navAcknowledgementsBtn = el('navAcknowledgementsBtn');
  const navCatalogBtn = el('navCatalogBtn');
  const navReportsBtn = el('navReportsBtn');
  const dashboardSection = el('dashboardSection');
  const quotesSection = el('quotesSection');
  const acknowledgementsSection = el('acknowledgementsSection');
  const catalogSection = el('catalogSection');
  const reportsSection = el('reportsSection');
  const dashboardGreetingText = el('dashboardGreetingText');
  const dashboardGrid = document.querySelector('.dashboard-grid');

  const settingsModal = el('settingsModal');
  const settingsModalClose = el('settingsModalClose');
  const companyNameInput = el('companyNameInput');
  const companyAddressInput = el('companyAddressInput');
  const companyPhoneInput = el('companyPhoneInput');
  const companyEmailInput = el('companyEmailInput');
  const companyTaxIdInput = el('companyTaxIdInput');
  const companyBrandColorInput = el('companyBrandColorInput');
  const companyLogoInput = el('companyLogoInput');
  const companyLogoPreview = el('companyLogoPreview');
  const companyLogoRemoveBtn = el('companyLogoRemoveBtn');
  const companySaleConditionsInput = el('companySaleConditionsInput');
  const companyOaNotesInput = el('companyOaNotesInput');
  const saveSettingsBtn = el('saveSettingsBtn');
  const settingsStatusText = el('settingsStatusText');
  let pendingLogoDataUrl = undefined; // undefined = unchanged, null = removed, string = new upload

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

  // Sensible defaults for the boilerplate sections on exported PDFs — shown pre-filled
  // in Settings (so staff can see and edit them) and used as a fallback if a company
  // hasn't customized them yet, so every document carries them even before anyone
  // opens Settings.
  function defaultSaleConditions(companyName) {
    const name = companyName || 'the Company';
    return [
      '1. This quotation is valid for 30 days from the date of issue, unless a different validity date is stated above.',
      '2. Prices are quoted in the currency shown and exclude VAT unless otherwise stated; VAT is applied at the prevailing statutory rate.',
      '3. This quotation does not constitute a binding order. An order is confirmed only once we issue a written Order Acknowledgement.',
      '4. Delivery lead times are estimates only and commence from the date of order confirmation.',
      '5. Special-order and imported items may not be cancelled, amended, or returned once an order has been confirmed.',
      '6. Goods remain the property of ' + name + ' until paid for in full.'
    ].join('\n');
  }

  // Sampled from each company's actual logo (Quotation template/*.xlsm embedded images) —
  // Chemsol Limited's mark is a deep purple (not the flat blue used before), Chemsol
  // Scientific's is a dark green, Labmall Scientific's is blue.
  const DEFAULT_BRAND_COLORS = {
    'chemsol-limited': '#412D73',
    'chemsol-scientific': '#17493C',
    'labmall-scientific': '#1F3E78'
  };
  function defaultBrandColor(companyId) {
    return DEFAULT_BRAND_COLORS[companyId] || '#27376C';
  }

  function defaultOaNotes() {
    return [
      '1. Please check the product descriptions, quantities, prices and delivery details above carefully.',
      '2. If we do not receive written notice of any discrepancy within 48 hours of the date of this Acknowledgement, the order will be treated as confirmed and correct in every respect.',
      '3. Once confirmed, special-order and imported items cannot be cancelled, amended or returned.',
      '4. Lead times quoted are estimates and may be affected by supplier or freight delays outside our control.',
      '5. Please quote the Acknowledgement Number above in all correspondence relating to this order.'
    ].join('\n');
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

  // Merges in per-company defaults (brand colour, sale conditions, standard OA notes)
  // for whatever the company doc hasn't customized yet — so PDFs look right (correct
  // brand colour, not just a generic one) even before anyone has opened Settings.
  function companyForPdf() {
    const c = Object.assign({}, state.company);
    const label = c.name || companyLabel(state.activeCompanyId);
    if (!c.brandColor) c.brandColor = defaultBrandColor(state.activeCompanyId);
    if (!c.saleConditions) c.saleConditions = defaultSaleConditions(label);
    if (!c.oaStandardNotes) c.oaStandardNotes = defaultOaNotes();
    return c;
  }

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
    const displayName = state.profile.displayName || state.user.email;
    topBarUserText.innerHTML = `<strong>${escapeHtml(displayName)}</strong>` +
      (isAdmin() ? ' <span class="badge admin">admin</span>' : '');
    const firstName = displayName.split(/\s+/)[0];
    dashboardGreetingText.textContent = 'Welcome back, ' + firstName;

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
    dashboardSection.style.display = view === 'dashboard' ? '' : 'none';
    quotesSection.style.display = view === 'quotes' ? '' : 'none';
    acknowledgementsSection.style.display = view === 'acknowledgements' ? '' : 'none';
    catalogSection.style.display = view === 'catalog' ? '' : 'none';
    reportsSection.style.display = view === 'reports' ? '' : 'none';
    navDashboardBtn.classList.toggle('active', view === 'dashboard');
    navQuotesBtn.classList.toggle('active', view === 'quotes');
    navAcknowledgementsBtn.classList.toggle('active', view === 'acknowledgements');
    navCatalogBtn.classList.toggle('active', view === 'catalog');
    navReportsBtn.classList.toggle('active', view === 'reports');
  }
  navDashboardBtn.addEventListener('click', () => switchTopNav('dashboard'));
  navQuotesBtn.addEventListener('click', () => switchTopNav('quotes'));
  navAcknowledgementsBtn.addEventListener('click', () => switchTopNav('acknowledgements'));
  navCatalogBtn.addEventListener('click', () => switchTopNav('catalog'));
  navReportsBtn.addEventListener('click', () => switchTopNav('reports'));

  // ---------- dashboard quick actions ----------
  // Each card just jumps to the relevant tab/sub-view (Editor or History) by forwarding a
  // click to that section's own nav button, reusing its existing switchView logic rather
  // than duplicating it here.
  dashboardGrid.addEventListener('click', (e) => {
    const card = e.target.closest('[data-dash-action]');
    if (!card) return;
    switch (card.dataset.dashAction) {
      case 'new-quote':
        switchTopNav('quotes');
        el('quoteNavEditorBtn').click();
        break;
      case 'new-oa':
        switchTopNav('acknowledgements');
        el('oaNavEditorBtn').click();
        break;
      case 'quote-history':
        switchTopNav('quotes');
        el('quoteNavHistoryBtn').click();
        break;
      case 'oa-history':
        switchTopNav('acknowledgements');
        el('oaNavHistoryBtn').click();
        break;
      case 'catalog':
        switchTopNav('catalog');
        break;
      case 'reports':
        switchTopNav('reports');
        break;
    }
  });

  // ---------- settings modal (company letterhead) ----------
  function renderLogoPreview(dataUrl) {
    if (dataUrl) {
      companyLogoPreview.src = dataUrl;
      companyLogoPreview.style.display = '';
      companyLogoRemoveBtn.style.display = '';
    } else {
      companyLogoPreview.removeAttribute('src');
      companyLogoPreview.style.display = 'none';
      companyLogoRemoveBtn.style.display = 'none';
    }
  }

  settingsBtn.addEventListener('click', () => {
    const c = state.company || {};
    companyNameInput.value = c.name || '';
    companyAddressInput.value = c.address || '';
    companyPhoneInput.value = c.phone || '';
    companyEmailInput.value = c.email || '';
    companyTaxIdInput.value = c.taxId || '';
    companyBrandColorInput.value = c.brandColor || defaultBrandColor(state.activeCompanyId);
    companySaleConditionsInput.value = c.saleConditions || defaultSaleConditions(c.name || companyLabel(state.activeCompanyId));
    companyOaNotesInput.value = c.oaStandardNotes || defaultOaNotes();
    pendingLogoDataUrl = undefined;
    companyLogoInput.value = '';
    renderLogoPreview(c.logoDataUrl || null);
    settingsStatusText.textContent = 'Editing letterhead for ' + companyLabel(state.activeCompanyId) + '.';
    settingsModal.classList.add('open');
  });
  settingsModalClose.addEventListener('click', () => settingsModal.classList.remove('open'));
  settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.remove('open'); });

  companyLogoInput.addEventListener('change', () => {
    const file = companyLogoInput.files && companyLogoInput.files[0];
    if (!file) return;
    if (file.size > 900 * 1024) {
      settingsStatusText.textContent = 'That image is too large (max ~900KB) — please use a smaller/compressed logo.';
      companyLogoInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      pendingLogoDataUrl = reader.result;
      renderLogoPreview(pendingLogoDataUrl);
    };
    reader.readAsDataURL(file);
  });

  companyLogoRemoveBtn.addEventListener('click', () => {
    pendingLogoDataUrl = null;
    companyLogoInput.value = '';
    renderLogoPreview(null);
  });

  saveSettingsBtn.addEventListener('click', () => {
    const data = {
      name: companyNameInput.value.trim(),
      address: companyAddressInput.value.trim(),
      phone: companyPhoneInput.value.trim(),
      email: companyEmailInput.value.trim(),
      taxId: companyTaxIdInput.value.trim(),
      brandColor: companyBrandColorInput.value || defaultBrandColor(state.activeCompanyId),
      saleConditions: companySaleConditionsInput.value.trim(),
      oaStandardNotes: companyOaNotesInput.value.trim()
    };
    if (pendingLogoDataUrl !== undefined) {
      data.logoDataUrl = pendingLogoDataUrl; // string = new logo, null = removed
    }
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
    companyLabel,
    defaultSaleConditions,
    defaultOaNotes,
    defaultBrandColor,
    companyForPdf
  };

  initFirebase();
})(window);
