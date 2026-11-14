/**
 * AutoHotKeyboard - Complete Frontend Multi-Module Engine
 * Modules: Text Expander (Multiline), Key Remapper, Window Manager, App Launcher, Auto Clicker
 */

(function () {
  'use strict';

  // Application State
  const initialTheme = (() => {
    try {
      if (window.__INITIAL_CONFIG__ && window.__INITIAL_CONFIG__.theme) {
        const t = window.__INITIAL_CONFIG__.theme;
        if (t.bgColor && t.accentColor) {
          return {
            bgColor: t.bgColor,
            accentColor: t.accentColor,
            radius: typeof t.radius !== 'undefined' ? parseInt(t.radius, 10) : 5,
            distance: typeof t.distance !== 'undefined' ? parseInt(t.distance, 10) : 3,
            lightIntensity: typeof t.lightIntensity !== 'undefined' ? parseInt(t.lightIntensity, 10) : (typeof t.intensity !== 'undefined' ? parseInt(t.intensity, 10) : 22),
            darkIntensity: typeof t.darkIntensity !== 'undefined' ? parseInt(t.darkIntensity, 10) : (typeof t.intensity !== 'undefined' ? parseInt(t.intensity, 10) : 6),
            intensity: typeof t.intensity !== 'undefined' ? parseInt(t.intensity, 10) : 14,
            blur: typeof t.blur !== 'undefined' ? parseInt(t.blur, 10) : 10,
            customPresets: Array.isArray(t.customPresets) ? t.customPresets : []
          };
        }
      }
      const cached = localStorage.getItem('ahk_theme');
      let cachedCustom = [];
      try {
        const cPresets = localStorage.getItem('ahk_custom_theme_presets');
        if (cPresets) cachedCustom = JSON.parse(cPresets) || [];
      } catch (e) { }

      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.bgColor === '#b85d68' || !parsed.bgColor)) {
          parsed.bgColor = '#e8dfd5';
          parsed.accentColor = '#d97706';
          parsed.radius = 5;
          parsed.distance = 3;
          parsed.lightIntensity = 22;
          parsed.darkIntensity = 6;
          parsed.intensity = 14;
          parsed.blur = 10;
          try { localStorage.setItem('ahk_theme', JSON.stringify(parsed)); } catch (e) { }
        }
        if (parsed && parsed.bgColor && parsed.accentColor) {
          return {
            bgColor: parsed.bgColor,
            accentColor: parsed.accentColor,
            radius: typeof parsed.radius !== 'undefined' ? parseInt(parsed.radius, 10) : 5,
            distance: typeof parsed.distance !== 'undefined' ? parseInt(parsed.distance, 10) : 3,
            lightIntensity: typeof parsed.lightIntensity !== 'undefined' ? parseInt(parsed.lightIntensity, 10) : 22,
            darkIntensity: typeof parsed.darkIntensity !== 'undefined' ? parseInt(parsed.darkIntensity, 10) : 6,
            intensity: typeof parsed.intensity !== 'undefined' ? parseInt(parsed.intensity, 10) : 14,
            blur: typeof parsed.blur !== 'undefined' ? parseInt(parsed.blur, 10) : 10,
            customPresets: Array.isArray(parsed.customPresets) ? parsed.customPresets : cachedCustom
          };
        }
      }
    } catch (e) { }
    return { bgColor: '#e8dfd5', accentColor: '#d97706', radius: 5, distance: 3, lightIntensity: 22, darkIntensity: 6, intensity: 14, blur: 10, customPresets: [] };
  })();

  let isInitialized = false;

  let state = {
    enabled: true,
    activeTab: 'textExpander',
    autoClickerRunning: false,
    config: {
      enabled: true,
      activeTab: 'textExpander',
      textExpander: {
        enabled: true,
        items: [
          { id: 'te-1', input: '@@1', output: 'myemail@gmail.com', multiline: false },
          { id: 'te-2', input: '@@sig', output: "Best regards,\nYour Name\nSenior Engineer", multiline: true }
        ]
      },
      keyRemapper: {
        enabled: true,
        items: [
          { id: 'kr-1', source: 'CapsLock', target: 'Control', name: 'CapsLock to Control' },
          { id: 'kr-2', source: '^!m', target: 'MuteAudio', name: 'Mute Master Audio (Ctrl+Alt+M)' }
        ]
      },
      windowManager: {
        enabled: true,
        alwaysOnTopHotkey: '^SPACE',
        centerWindowHotkey: '^!c',
        hideWindowHotkey: '^!h',
        transparencyWheel: true,
        opacity: 215
      },
      appLauncher: {
        enabled: true,
        items: [
          { id: 'al-1', trigger: '@calc', triggerType: 'string', target: 'calc.exe', name: 'Calculator' },
          { id: 'al-2', trigger: '@yt', triggerType: 'string', target: 'https://www.youtube.com', name: 'YouTube' },
          { id: 'al-3', trigger: '@gh', triggerType: 'string', target: 'https://github.com', name: 'GitHub' }
        ]
      },
      autoClicker: {
        enabled: true,
        hotkey: 'F8',
        button: 'Left',
        clickType: 'Single',
        cps: 20,
        limit: 0
      },
      macroRecorder: {
        enabled: true,
        items: [
          {
            id: 'macro-1',
            name: 'Fast Reload Combo',
            trigger: 'F9',
            playbackMode: 'NoRepeat',
            repeatInterval: 50,
            enabled: 1,
            steps: [
              { action: 'Down', key: 'r', delay: 40 },
              { action: 'Up', key: 'r', delay: 100 },
              { action: 'Down', key: '1', delay: 40 },
              { action: 'Up', key: '1', delay: 50 }
            ]
          }
        ]
      },
      theme: initialTheme,
      window: { width: 1320, height: 760 }
    },
    editingTeId: null,
    isMultiline: false
  };

  if (window.__INITIAL_CONFIG__) {
    state.config = { ...state.config, ...window.__INITIAL_CONFIG__ };
    if (window.__INITIAL_CONFIG__.activeTab) state.activeTab = window.__INITIAL_CONFIG__.activeTab;
    if (typeof window.__INITIAL_CONFIG__.enabled === 'boolean') state.enabled = window.__INITIAL_CONFIG__.enabled;
    isInitialized = true;
  }

  // DOM Elements
  const dragHeader = document.getElementById('dragHeader');
  const appCard = document.getElementById('appCard');
  const btnClose = document.getElementById('btnClose');
  const btnMinimize = document.getElementById('btnMinimize');
  const btnRefresh = document.getElementById('btnRefresh');
  const btnTheme = document.getElementById('btnTheme');
  const themeModal = document.getElementById('themeModal');
  const btnCloseThemeModal = document.getElementById('btnCloseThemeModal');
  const btnResetTheme = document.getElementById('btnResetTheme');
  const btnSaveTheme = document.getElementById('btnSaveTheme');
  const themeBgColorPicker = document.getElementById('themeBgColorPicker');
  const themeBgHex = document.getElementById('themeBgHex');
  const themeAccentColorPicker = document.getElementById('themeAccentColorPicker');
  const themeAccentHex = document.getElementById('themeAccentHex');
  const bgSwatchesGrid = document.getElementById('bgSwatchesGrid');
  const accentSwatchesGrid = document.getElementById('accentSwatchesGrid');
  const themeSliderRadius = document.getElementById('themeSliderRadius');
  const badgeRadius = document.getElementById('badgeRadius');
  const themeSliderDistance = document.getElementById('themeSliderDistance');
  const badgeDistance = document.getElementById('badgeDistance');
  const themeSliderLightIntensity = document.getElementById('themeSliderLightIntensity');
  const badgeLightIntensity = document.getElementById('badgeLightIntensity');
  const themeSliderDarkIntensity = document.getElementById('themeSliderDarkIntensity');
  const badgeDarkIntensity = document.getElementById('badgeDarkIntensity');
  const themeSliderBlur = document.getElementById('themeSliderBlur');
  const badgeBlur = document.getElementById('badgeBlur');
  const customPresetsGrid = document.getElementById('customPresetsGrid');
  const inputCustomPresetName = document.getElementById('inputCustomPresetName');
  const btnSaveCustomPreset = document.getElementById('btnSaveCustomPreset');
  const segmentedBar = document.getElementById('segmentedBar');
  const mainEngineSwitch = document.getElementById('mainEngineSwitch');
  const switchCaptionText = document.getElementById('switchCaptionText');
  const statusSubtitle = document.getElementById('statusSubtitle');
  const activeCountBadge = document.getElementById('activeCountBadge');
  const profileSelect = document.getElementById('profileSelect');
  const btnAddProfile = document.getElementById('btnAddProfile');
  const btnRenameProfile = document.getElementById('btnRenameProfile');
  const btnDeleteProfile = document.getElementById('btnDeleteProfile');
  const profileModal = document.getElementById('profileModal');
  const profileModalTitle = document.getElementById('profileModalTitle');
  const profileModalDesc = document.getElementById('profileModalDesc');
  const profileNameInput = document.getElementById('profileNameInput');
  const btnConfirmProfileModal = document.getElementById('btnConfirmProfileModal');
  const btnCancelProfileModal = document.getElementById('btnCancelProfileModal');
  const btnCloseProfileModal = document.getElementById('btnCloseProfileModal');
  const gaugeCircle = document.getElementById('gaugeCircle');
  const radialDotsDial = document.getElementById('radialDotsDial');
  const btnExport = document.getElementById('btnExport');
  const btnHelp = document.getElementById('btnHelp');

  // Text Expander Elements
  const teInputTrigger = document.getElementById('teInputTrigger');
  const teInputOutput = document.getElementById('teInputOutput');
  const teTextareaOutput = document.getElementById('teTextareaOutput');
  const teOutputContainer = document.getElementById('teOutputContainer');
  const teToggleMultiline = document.getElementById('teToggleMultiline');
  const teBtnSubmit = document.getElementById('teBtnSubmit');
  const teBtnSubmitText = document.getElementById('teBtnSubmitText');
  const teSearchFilter = document.getElementById('teSearchFilter');
  const teShortcutsContainer = document.getElementById('teShortcutsContainer');

  // Key Remapper Elements (Pure Key Combination Recorders)
  const krInputSource = document.getElementById('krInputSource');
  const krInputTarget = document.getElementById('krInputTarget');
  const krSourceBox = document.getElementById('krSourceBox');
  const krTargetBox = document.getElementById('krTargetBox');
  const krBtnClearSource = document.getElementById('krBtnClearSource');
  const krBtnClearTarget = document.getElementById('krBtnClearTarget');
  const krBtnSubmit = document.getElementById('krBtnSubmit');
  const krRemapsContainer = document.getElementById('krRemapsContainer');

  // Window Manager Elements
  const wmOpacitySlider = document.getElementById('wmOpacitySlider');
  const wmOpacityValue = document.getElementById('wmOpacityValue');
  const wmAppVolumeSlider = document.getElementById('wmAppVolumeSlider');
  const wmAppVolumeValue = document.getElementById('wmAppVolumeValue');
  const wmAppTargetBadge = document.getElementById('wmAppTargetBadge');
  const wmBtnMuteActiveApp = document.getElementById('wmBtnMuteActiveApp');
  const wmBtnMuteActiveAppText = document.getElementById('wmBtnMuteActiveAppText');

  let activeAppState = {
    pid: 0,
    name: '',
    volume: 100,
    muted: false
  };

  // App Launcher Elements
  const alTriggerTypeSelector = document.getElementById('alTriggerTypeSelector');
  const alTypeString = document.getElementById('alTypeString');
  const alTypeHotkey = document.getElementById('alTypeHotkey');
  const alTriggerIcon = document.getElementById('alTriggerIcon');
  const alInputTrigger = document.getElementById('alInputTrigger');
  const alInputTarget = document.getElementById('alInputTarget');
  const alOutputBox = document.getElementById('alOutputBox');
  const alBtnBrowse = document.getElementById('alBtnBrowse');
  const alInputName = document.getElementById('alInputName');
  const alBtnSubmit = document.getElementById('alBtnSubmit');
  const alBtnSubmitText = document.getElementById('alBtnSubmitText');
  const alHintTag = document.getElementById('alHintTag');
  const alLaunchersContainer = document.getElementById('alLaunchersContainer');

  // Auto Clicker Elements
  const acButtonSelector = document.getElementById('acButtonSelector');
  const acTypeSelector = document.getElementById('acTypeSelector');
  const acCpsSlider = document.getElementById('acCpsSlider');
  const acCpsValue = document.getElementById('acCpsValue');
  const acToggleBtn = document.getElementById('acToggleBtn');
  const acToggleBtnText = document.getElementById('acToggleBtnText');
  const acStatusHint = document.getElementById('acStatusHint');

  // Helper: Post message to AutoHotkey host with resilient offline queue
  let ahkMsgQueue = [];
  function sendToAhk(action, data = {}) {
    if (window.chrome && window.chrome.webview) {
      window.chrome.webview.postMessage(JSON.stringify({ action, ...data }));
    } else {
      ahkMsgQueue.push({ action, data });
    }
  }

  function flushAhkQueue() {
    if (window.chrome && window.chrome.webview && ahkMsgQueue.length > 0) {
      const queue = [...ahkMsgQueue];
      ahkMsgQueue = [];
      queue.forEach(item => {
        try {
          window.chrome.webview.postMessage(JSON.stringify({ action: item.action, ...item.data }));
        } catch (e) { }
      });
    }
  }

  function syncConfig() {
    if (!isInitialized) {
      // Never overwrite saved config in AHK before initial state is received!
      return;
    }
    saveCurrentProfileState();
    state.config.enabled = state.enabled;
    state.config.activeTab = state.activeTab;
    sendToAhk('saveState', { config: state.config });
    updateGlobalIndicators();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Global Toast Notification System
  function showToast(message, type = 'info', duration = 2500) {
    if (!message) return;
    try {
      let container = document.getElementById('toastContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = `toast-item toast-${type}`;

      let iconSvg = '';
      const lower = String(message).toLowerCase();
      if (type === 'error' || lower.includes('please') || lower.includes('error')) {
        toast.classList.add('toast-warning');
        iconSvg = `<svg viewBox="0 0 24 24" class="toast-icon-svg" fill="none" stroke="#f59e0b" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
      } else if (lower.includes('created') || lower.includes('updated') || lower.includes('saved')) {
        toast.classList.add('toast-success');
        iconSvg = `<svg viewBox="0 0 24 24" class="toast-icon-svg" fill="none" stroke="var(--accent-primary)" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="9 12 11 14 15 10"></polyline></svg>`;
      } else {
        iconSvg = `<svg viewBox="0 0 24 24" class="toast-icon-svg" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
      }

      toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
      container.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.add('show');
      });

      const removeTimer = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          if (toast.parentElement) toast.parentElement.removeChild(toast);
        }, 300);
      }, duration);

      toast.addEventListener('click', () => {
        clearTimeout(removeTimer);
        toast.classList.remove('show');
        setTimeout(() => {
          if (toast.parentElement) toast.parentElement.removeChild(toast);
        }, 200);
      });
    } catch (err) {
      console.warn('Toast display failed:', err);
    }
  }

  // ============================================================================
  // Profile Management System
  // ============================================================================

  function ensureProfilesConfig(cfg) {
    if (!cfg) return;
    if (!cfg.profiles || typeof cfg.profiles !== 'object') {
      cfg.profiles = {};
    }
    if (!cfg.activeProfile || typeof cfg.activeProfile !== 'string') {
      cfg.activeProfile = 'Default';
    }
    if (!cfg.profiles['Default']) {
      cfg.profiles['Default'] = {
        textExpander: JSON.parse(JSON.stringify(cfg.textExpander || { enabled: 1, items: [] })),
        keyRemapper: JSON.parse(JSON.stringify(cfg.keyRemapper || { enabled: 1, items: [] })),
        appLauncher: JSON.parse(JSON.stringify(cfg.appLauncher || { enabled: 1, items: [] })),
        macroRecorder: JSON.parse(JSON.stringify(cfg.macroRecorder || { enabled: 1, items: [] })),
        windowManager: JSON.parse(JSON.stringify(cfg.windowManager || {})),
        autoClicker: JSON.parse(JSON.stringify(cfg.autoClicker || {}))
      };
    }

    // Ensure all items across all modules in all profiles have an enabled property
    Object.keys(cfg.profiles).forEach(pName => {
      const p = cfg.profiles[pName];
      ['textExpander', 'keyRemapper', 'appLauncher', 'macroRecorder'].forEach(m => {
        if (p[m] && Array.isArray(p[m].items)) {
          p[m].items.forEach(item => {
            if (typeof item.enabled === 'undefined') {
              item.enabled = (pName === 'Default') ? 1 : 0;
            }
          });
        }
      });
    });

    const activeName = cfg.activeProfile;
    if (!cfg.profiles[activeName]) {
      cfg.activeProfile = 'Default';
    }
    const activeProf = cfg.profiles[cfg.activeProfile];
    cfg.textExpander = activeProf.textExpander;
    cfg.keyRemapper = activeProf.keyRemapper;
    cfg.appLauncher = activeProf.appLauncher;
    cfg.macroRecorder = activeProf.macroRecorder;
    cfg.windowManager = activeProf.windowManager;
    cfg.autoClicker = activeProf.autoClicker;
  }

  function saveCurrentProfileState() {
    if (!state.config) return;
    const currentProf = state.config.activeProfile || 'Default';
    if (!state.config.profiles) state.config.profiles = {};
    state.config.profiles[currentProf] = {
      textExpander: JSON.parse(JSON.stringify(state.config.textExpander || { enabled: 1, items: [] })),
      keyRemapper: JSON.parse(JSON.stringify(state.config.keyRemapper || { enabled: 1, items: [] })),
      appLauncher: JSON.parse(JSON.stringify(state.config.appLauncher || { enabled: 1, items: [] })),
      macroRecorder: JSON.parse(JSON.stringify(state.config.macroRecorder || { enabled: 1, items: [] })),
      windowManager: JSON.parse(JSON.stringify(state.config.windowManager || {})),
      autoClicker: JSON.parse(JSON.stringify(state.config.autoClicker || {}))
    };
  }

  function getProfileIconHtml(pName, prof) {
    const isDefault = (pName === 'Default');
    if (isDefault) {
      return `<svg class="profile-card-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>`;
    }

    const targetExe = (prof && prof.targetExe) ? prof.targetExe.trim() : '';
    const firstExe = targetExe ? targetExe.split(',')[0].trim().replace(/\.exe$/i, '') : '';
    const iconSrc = firstExe ? `icons/${encodeURIComponent(firstExe)}.png` : '';

    if (iconSrc) {
      return `
        <img class="profile-card-img" src="${iconSrc}" alt="${escapeHtml(pName)}"
             onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
        <div class="profile-card-fallback-badge" style="display:none;">
          <span>${escapeHtml(pName.charAt(0).toUpperCase())}</span>
        </div>`;
    }

    return `
      <div class="profile-card-fallback-badge">
        <span>${escapeHtml(pName.charAt(0).toUpperCase())}</span>
      </div>`;
  }

  function renderProfilesRibbon() {
    const track = document.getElementById('lgsProfilesTrack');
    const defaultSlot = document.getElementById('lgsDefaultProfileSlot');
    const select = document.getElementById('profileSelect');
    if (!track) return;

    const currentProfName = (state.config && state.config.activeProfile) || 'Default';
    const profiles = (state.config && state.config.profiles) ? state.config.profiles : { 'Default': {} };
    const allProfileNames = Object.keys(profiles);

    if (select) {
      select.innerHTML = '';
      allProfileNames.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        if (p === currentProfName) opt.selected = true;
        select.appendChild(opt);
      });
    }

    const queryInput = document.getElementById('profileSearchInput');
    const query = (queryInput ? queryInput.value : '').trim().toLowerCase();

    const btnDelete = document.getElementById('btnDeleteProfile');
    if (btnDelete) {
      const canDelete = (currentProfName !== 'Default' && allProfileNames.length > 1);
      btnDelete.disabled = !canDelete;
      btnDelete.classList.toggle('is-disabled', !canDelete);
      btnDelete.title = canDelete ? `Delete Profile "${currentProfName}"` : 'Cannot delete Default profile';
    }

    function createProfileCard(pName, isDef) {
      const prof = profiles[pName] || {};
      const isActive = (pName === currentProfName);
      const card = document.createElement('div');
      card.className = `lgs-profile-card ${isDef ? 'is-default' : ''} ${isActive ? 'active' : ''}`;
      card.setAttribute('data-profile', pName);
      card.title = isDef ? 'Default Profile (System Fallback)' : (prof.targetExe ? `${pName} (${prof.targetExe})` : pName);

      const iconBox = document.createElement('div');
      iconBox.className = 'lgs-icon-box';
      iconBox.innerHTML = getProfileIconHtml(pName, prof);

      const infoCol = document.createElement('div');
      infoCol.className = 'lgs-profile-info';

      const nameEl = document.createElement('div');
      nameEl.className = 'lgs-profile-name';
      nameEl.textContent = pName;

      const exeEl = document.createElement('div');
      exeEl.className = 'lgs-profile-exe';
      exeEl.textContent = isDef ? 'Default (System)' : (prof.targetExe ? prof.targetExe.split(',')[0].trim() : 'Manual Switch');

      infoCol.appendChild(nameEl);
      infoCol.appendChild(exeEl);

      card.appendChild(iconBox);
      card.appendChild(infoCol);

      if (isActive) {
        const activeTag = document.createElement('span');
        activeTag.className = 'profile-active-tag';
        activeTag.textContent = 'ACTIVE';
        card.appendChild(activeTag);
      }

      card.addEventListener('click', () => {
        if (state.config.activeProfile !== pName) {
          switchProfile(pName);
        }
      });

      card.addEventListener('dblclick', () => {
        openProfileModal('edit');
      });

      return card;
    }

    // 1. Render Fixed Default Profile Slot
    if (defaultSlot) {
      defaultSlot.innerHTML = '';
      if (!query || 'default'.includes(query) || ((profiles['Default'] && profiles['Default'].targetExe) || '').toLowerCase().includes(query)) {
        defaultSlot.style.display = 'flex';
        defaultSlot.appendChild(createProfileCard('Default', true));
      } else {
        defaultSlot.style.display = 'none';
      }
    }

    // 2. Render App Profiles Track
    track.innerHTML = '';
    const otherNames = allProfileNames.filter(n => n !== 'Default');
    otherNames.forEach(pName => {
      const prof = profiles[pName] || {};
      const targetLower = (prof.targetExe || '').toLowerCase();
      if (query && !pName.toLowerCase().includes(query) && !targetLower.includes(query)) {
        return;
      }
      track.appendChild(createProfileCard(pName, false));
    });
  }

  function renderProfileSelect() {
    renderProfilesRibbon();
  }

  function switchProfile(name) {
    if (!state.config.profiles || !state.config.profiles[name]) return;
    saveCurrentProfileState();
    state.config.activeProfile = name;

    const prof = state.config.profiles[name];
    state.config.textExpander = prof.textExpander;
    state.config.keyRemapper = prof.keyRemapper;
    state.config.appLauncher = prof.appLauncher;
    state.config.macroRecorder = prof.macroRecorder;
    state.config.windowManager = prof.windowManager;
    state.config.autoClicker = prof.autoClicker;

    renderProfileSelect();
    renderTextExpander();
    renderKeyRemapper();
    initWindowManager();
    renderAppLauncher();
    renderMacroRecorder();
    updateAutoClickerUI();
    updateGlobalIndicators();

    syncConfig();
    showToast(`Profile: ${name}`);
  }

  function createNewProfile(name, targetExe = '', switchOnHover = false, showOsdIcon = true) {
    name = (name || '').trim();
    if (!name) return false;
    if (state.config.profiles && state.config.profiles[name]) {
      showToast(`Profile "${name}" already exists!`);
      return false;
    }
    saveCurrentProfileState();

    const cloneItems = (items) => (items || []).map(i => ({ ...JSON.parse(JSON.stringify(i)), enabled: 0 }));

    const curWm = state.config.windowManager || {};
    const newWm = JSON.parse(JSON.stringify(curWm));
    ['alwaysOnTopEnabled', 'appVolumeMuteEnabled', 'appVolumeWheel', 'borderlessEnabled',
      'centerWindowEnabled', 'clickThroughGhost', 'hideWindowEnabled', 'transparencyWheel', 'windowShadeEnabled'].forEach(k => {
        newWm[k] = 0;
      });

    const curAc = state.config.autoClicker || {};
    const newAc = { ...JSON.parse(JSON.stringify(curAc)), enabled: 0 };

    const newProfile = {
      targetExe: targetExe,
      switchOnHover: Boolean(switchOnHover),
      showOsdIcon: Boolean(showOsdIcon),
      textExpander: {
        enabled: 1,
        items: cloneItems(state.config.textExpander && state.config.textExpander.items)
      },
      keyRemapper: {
        enabled: 1,
        items: cloneItems(state.config.keyRemapper && state.config.keyRemapper.items)
      },
      appLauncher: {
        enabled: 1,
        items: cloneItems(state.config.appLauncher && state.config.appLauncher.items)
      },
      macroRecorder: {
        enabled: 1,
        items: cloneItems(state.config.macroRecorder && state.config.macroRecorder.items),
        useStandardDelays: (state.config.macroRecorder && state.config.macroRecorder.useStandardDelays) || 1
      },
      windowManager: newWm,
      autoClicker: newAc
    };

    if (!state.config.profiles) state.config.profiles = {};
    state.config.profiles[name] = newProfile;
    switchProfile(name);
    showToast(`Created & switched to profile "${name}"`);
    return true;
  }

  function updateProfileSettings(name, targetExe, switchOnHover, showOsdIcon) {
    name = (name || '').trim();
    if (!name || !state.config.profiles || !state.config.profiles[name]) return false;
    saveCurrentProfileState();
    const prof = state.config.profiles[name];
    prof.targetExe = targetExe;
    prof.switchOnHover = Boolean(switchOnHover);
    prof.showOsdIcon = Boolean(showOsdIcon);
    syncConfig();
    showToast(`Updated settings for "${name}"`);
    return true;
  }

  function renameProfile(oldName, newName) {
    newName = (newName || '').trim();
    if (!newName || newName === oldName) return false;
    if (state.config.profiles[newName]) {
      showToast(`Profile "${newName}" already exists!`);
      return false;
    }
    saveCurrentProfileState();
    state.config.profiles[newName] = state.config.profiles[oldName];
    delete state.config.profiles[oldName];
    if (state.config.activeProfile === oldName) {
      state.config.activeProfile = newName;
    }
    renderProfileSelect();
    syncConfig();
    showToast(`Renamed profile to "${newName}"`);
    return true;
  }

  function deleteProfile(name) {
    const profileNames = Object.keys(state.config.profiles || {});
    if (profileNames.length <= 1) {
      showToast('Cannot delete the only profile!');
      return false;
    }
    delete state.config.profiles[name];
    if (state.config.activeProfile === name) {
      const remaining = Object.keys(state.config.profiles);
      const fallback = remaining.includes('Default') ? 'Default' : remaining[0];
      switchProfile(fallback);
    } else {
      renderProfileSelect();
      syncConfig();
    }
    showToast(`Profile "${name}" deleted`);
    return true;
  }

  function addItemAcrossProfiles(moduleName, item) {
    if (state.config && state.config.profiles) {
      const currentProf = state.config.activeProfile || 'Default';
      Object.keys(state.config.profiles).forEach(pName => {
        if (pName !== currentProf) {
          const prof = state.config.profiles[pName];
          if (prof && prof[moduleName] && Array.isArray(prof[moduleName].items)) {
            if (!prof[moduleName].items.some(i => i.id === item.id)) {
              prof[moduleName].items.unshift({ ...JSON.parse(JSON.stringify(item)), enabled: 0 });
            }
          }
        }
      });
    }
  }

  function deleteItemAcrossProfiles(moduleName, itemId) {
    if (state.config && state.config.profiles) {
      Object.keys(state.config.profiles).forEach(pName => {
        const prof = state.config.profiles[pName];
        if (prof && prof[moduleName] && Array.isArray(prof[moduleName].items)) {
          prof[moduleName].items = prof[moduleName].items.filter(i => i.id !== itemId);
        }
      });
    }
  }

  function updateItemAcrossProfiles(moduleName, updatedItem) {
    if (state.config && state.config.profiles) {
      const currentProf = state.config.activeProfile || 'Default';
      Object.keys(state.config.profiles).forEach(pName => {
        if (pName !== currentProf) {
          const prof = state.config.profiles[pName];
          if (prof && prof[moduleName] && Array.isArray(prof[moduleName].items)) {
            const idx = prof[moduleName].items.findIndex(i => i.id === updatedItem.id);
            if (idx !== -1) {
              const prevEnabled = prof[moduleName].items[idx].enabled;
              prof[moduleName].items[idx] = { ...JSON.parse(JSON.stringify(updatedItem)), enabled: prevEnabled };
            }
          }
        }
      });
    }
  }

  function updateAutoClickerUI() {
    const ac = (state.config && state.config.autoClicker) || {};
    if (acCpsSlider) {
      acCpsSlider.value = ac.cps || 20;
      if (acCpsValue) acCpsValue.textContent = `${ac.cps || 20} CPS`;
      updateSliderProgress(acCpsSlider);
    }
    if (acButtonSelector) {
      acButtonSelector.querySelectorAll('.ac-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.val === ac.button);
      });
    }
    if (acTypeSelector) {
      acTypeSelector.querySelectorAll('.ac-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.val === ac.clickType);
      });
    }
    if (acHotkeyInput) {
      acHotkeyInput.value = ac.hotkey || 'F8';
    }
  }

  let profileModalMode = 'add'; // 'add' | 'edit' | 'rename' | 'delete'
  let cachedRunningApps = [];

  function openProfileModal(mode) {
    profileModalMode = mode;
    const curName = (state.config && state.config.activeProfile) || 'Default';
    if (!profileModal) return;

    const profileConfigCard = document.getElementById('profileConfigCard');
    const profileDeleteNotice = document.getElementById('profileDeleteNotice');
    const profileNameGroup = document.getElementById('profileNameGroup');
    const defaultProfileBadgeNotice = document.getElementById('defaultProfileBadgeNotice');
    const profileExeGroup = document.getElementById('profileExeGroup');
    const profHoverRow = document.getElementById('profHoverRow');
    const profOsdRow = document.getElementById('profOsdRow');
    const profileAppsColumn = document.getElementById('profileAppsColumn');
    const profileInfoTip = document.getElementById('profileInfoTip');

    const profInputExe = document.getElementById('profInputExe');
    const profSwitchOnHover = document.getElementById('profSwitchOnHover');
    const profSwitchOsdIcon = document.getElementById('profSwitchOsdIcon');
    const runningAppsFilterInput = document.getElementById('runningAppsFilterInput');

    if (runningAppsFilterInput) runningAppsFilterInput.value = '';

    const isCompact = (mode === 'delete' || mode === 'rename');
    profileModal.classList.toggle('has-mode-delete', isCompact);

    if (mode === 'delete') {
      if (profileConfigCard) profileConfigCard.classList.add('mode-delete');
      if (profileModalTitle) profileModalTitle.textContent = 'DELETE PROFILE';
      if (profileDeleteNotice) profileDeleteNotice.classList.remove('hidden-field');
      if (profileModalDesc) profileModalDesc.textContent = `Are you sure you want to delete profile "${curName}"?`;
      if (profileNameGroup) profileNameGroup.classList.add('hidden-field');
      if (defaultProfileBadgeNotice) defaultProfileBadgeNotice.classList.add('hidden-field');
      if (profileExeGroup) profileExeGroup.classList.add('hidden-field');
      if (profHoverRow) profHoverRow.classList.add('hidden-field');
      if (profOsdRow) profOsdRow.classList.add('hidden-field');
      if (profileAppsColumn) profileAppsColumn.classList.add('hidden-field');
      if (profileInfoTip) profileInfoTip.classList.add('hidden-field');
      if (btnConfirmProfileModal) {
        btnConfirmProfileModal.textContent = 'Delete Profile';
        btnConfirmProfileModal.classList.add('danger');
      }
    } else {
      if (profileConfigCard) profileConfigCard.classList.toggle('mode-delete', isCompact);
      if (profileDeleteNotice) profileDeleteNotice.classList.add('hidden-field');
      if (profileNameGroup) profileNameGroup.classList.remove('hidden-field');
      if (profileExeGroup) profileExeGroup.classList.remove('hidden-field');
      if (profHoverRow) profHoverRow.classList.remove('hidden-field');
      if (profOsdRow) profOsdRow.classList.remove('hidden-field');
      if (profileAppsColumn) profileAppsColumn.classList.remove('hidden-field');
      if (profileInfoTip) profileInfoTip.classList.remove('hidden-field');
      if (btnConfirmProfileModal) {
        btnConfirmProfileModal.classList.remove('danger');
      }

      const isDefault = (mode === 'edit' && curName === 'Default');
      if (defaultProfileBadgeNotice) {
        defaultProfileBadgeNotice.classList.toggle('hidden-field', !isDefault);
      }
      if (profileExeGroup) {
        profileExeGroup.style.display = isDefault ? 'none' : 'flex';
      }
      if (profileAppsColumn) {
        profileAppsColumn.style.display = isDefault ? 'none' : 'flex';
      }

      if (mode === 'add') {
        if (profileModalTitle) profileModalTitle.textContent = 'CREATE APP PROFILE';
        if (profileNameInput) {
          profileNameInput.value = '';
          profileNameInput.disabled = false;
          profileNameInput.placeholder = 'e.g. Chrome, Blender, Gaming, VS Code...';
        }
        if (profInputExe) {
          profInputExe.value = '';
          profInputExe.disabled = false;
        }
        if (profSwitchOnHover) profSwitchOnHover.checked = false;
        if (profSwitchOsdIcon) profSwitchOsdIcon.checked = true;
        if (btnConfirmProfileModal) btnConfirmProfileModal.textContent = 'Create Profile';
      } else if (mode === 'edit') {
        if (profileModalTitle) profileModalTitle.textContent = `CONFIGURE PROFILE: ${curName}`;
        if (profileNameInput) {
          profileNameInput.value = curName;
          profileNameInput.disabled = isDefault;
        }
        const prof = (state.config.profiles && state.config.profiles[curName]) || {};
        if (profInputExe) {
          profInputExe.value = prof.targetExe || '';
          profInputExe.disabled = isDefault;
        }
        if (profSwitchOnHover) {
          profSwitchOnHover.checked = Boolean(prof.switchOnHover);
        }
        if (profSwitchOsdIcon) {
          profSwitchOsdIcon.checked = typeof prof.showOsdIcon !== 'undefined' ? Boolean(prof.showOsdIcon) : true;
        }
        if (btnConfirmProfileModal) btnConfirmProfileModal.textContent = 'Save Changes';
      } else if (mode === 'rename') {
        if (profileModalTitle) profileModalTitle.textContent = 'RENAME PROFILE';
        if (profileNameInput) {
          profileNameInput.value = curName;
          profileNameInput.disabled = false;
        }
        if (profileExeGroup) profileExeGroup.classList.add('hidden-field');
        if (profHoverRow) profHoverRow.classList.add('hidden-field');
        if (profOsdRow) profOsdRow.classList.add('hidden-field');
        if (profileAppsColumn) profileAppsColumn.classList.add('hidden-field');
        if (profileInfoTip) profileInfoTip.classList.add('hidden-field');
        if (btnConfirmProfileModal) btnConfirmProfileModal.textContent = 'Rename';
      }

      // Render immediately if cached running apps exist, then request fresh scan
      if (cachedRunningApps && cachedRunningApps.length > 0) {
        renderRunningAppsList();
      }
      sendToAhk('getRunningApps');
    }

    profileModal.classList.remove('hidden-field');
    if (mode === 'add' && profileNameInput) {
      setTimeout(() => profileNameInput.focus(), 60);
    }
  }

  function closeProfileModal() {
    if (profileModal) profileModal.classList.add('hidden-field');
  }

  function handleProfileModalConfirm() {
    const curName = (state.config && state.config.activeProfile) || 'Default';
    const profInputExe = document.getElementById('profInputExe');
    const profSwitchOnHover = document.getElementById('profSwitchOnHover');
    const profSwitchOsdIcon = document.getElementById('profSwitchOsdIcon');

    const targetExe = profInputExe ? profInputExe.value.trim() : '';
    const switchOnHover = profSwitchOnHover ? profSwitchOnHover.checked : false;
    const showOsdIcon = profSwitchOsdIcon ? profSwitchOsdIcon.checked : true;

    if (profileModalMode === 'add') {
      const name = profileNameInput ? profileNameInput.value.trim() : '';
      if (!name) {
        if (profileNameInput) profileNameInput.focus();
        showToast('Please enter a name for the profile');
        return;
      }
      if (createNewProfile(name, targetExe, switchOnHover, showOsdIcon)) {
        closeProfileModal();
      }
    } else if (profileModalMode === 'edit') {
      const newName = profileNameInput ? profileNameInput.value.trim() : curName;
      if (curName !== 'Default' && newName && newName !== curName) {
        renameProfile(curName, newName);
      }
      const actualName = (curName !== 'Default' && newName) ? newName : curName;
      if (updateProfileSettings(actualName, targetExe, switchOnHover, showOsdIcon)) {
        closeProfileModal();
      }
    } else if (profileModalMode === 'rename') {
      const name = profileNameInput ? profileNameInput.value.trim() : '';
      if (!name) {
        if (profileNameInput) profileNameInput.focus();
        return;
      }
      if (renameProfile(curName, name)) {
        closeProfileModal();
      }
    } else if (profileModalMode === 'delete') {
      if (deleteProfile(curName)) {
        closeProfileModal();
      }
    }
  }

  function renderRunningAppsList(apps) {
    if (Array.isArray(apps)) cachedRunningApps = apps;
    const container = document.getElementById('runningAppsList');
    if (!container) return;

    const filterInput = document.getElementById('runningAppsFilterInput');
    const filter = (filterInput ? filterInput.value : '').trim().toLowerCase();

    const profInputExe = document.getElementById('profInputExe');
    const rawExeVal = profInputExe ? profInputExe.value : '';
    const selectedExes = rawExeVal.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    const filtered = (cachedRunningApps || []).filter(app => {
      if (!filter) return true;
      const t = (app.title || '').toLowerCase();
      const p = (app.process || '').toLowerCase();
      return t.includes(filter) || p.includes(filter);
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="apps-empty-state">${cachedRunningApps.length === 0 ? 'No open eligible application windows found.' : 'No open windows match filter.'}</div>`;
      return;
    }

    container.innerHTML = '';
    filtered.forEach(app => {
      const cleanProc = (app.process || '').replace(/\.exe$/i, '');
      const isSelected = selectedExes.includes((app.process || '').toLowerCase());

      const card = document.createElement('div');
      card.className = `running-app-item-card ${isSelected ? 'is-selected' : ''}`;
      card.setAttribute('data-process', (app.process || '').toLowerCase());
      card.title = `${app.title}\nExecutable: ${app.process}\nClick to toggle binding for this profile`;

      card.innerHTML = `
        <div class="app-icon-thumb-box">
          <img class="app-icon-thumb-img" src="icons/${encodeURIComponent(cleanProc)}.png" alt="${cleanProc}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
          <div class="app-icon-thumb-fallback" style="display: none;">
            <svg class="icon-svg-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
        </div>
        <div class="app-item-info">
          <div class="app-item-title-row">
            <span class="app-item-title">${escapeHtml(app.title || cleanProc)}</span>
            <span class="app-item-badge-assigned">
              <svg class="icon-svg-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg> Assigned
            </span>
          </div>
          <span class="app-item-exe-name">${escapeHtml(app.process || '')}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        if (!profInputExe || profInputExe.disabled) return;
        const curList = profInputExe.value.split(',').map(s => s.trim()).filter(Boolean);
        const lowerList = curList.map(s => s.toLowerCase());
        const procLower = (app.process || '').toLowerCase();

        if (lowerList.includes(procLower)) {
          const updated = curList.filter(s => s.toLowerCase() !== procLower);
          profInputExe.value = updated.join(', ');
          card.classList.remove('is-selected');
        } else {
          curList.push(app.process);
          profInputExe.value = curList.join(', ');
          card.classList.add('is-selected');
        }

        // Auto-fill profile name if it's currently empty and in create mode
        if (profileModalMode === 'add' && profileNameInput && !profileNameInput.value.trim()) {
          profileNameInput.value = cleanProc.charAt(0).toUpperCase() + cleanProc.slice(1);
        }
      });

      container.appendChild(card);
    });
  }

  // ============================================================================
  // Tab Management
  // ============================================================================

  function updateSegmentedGlider(instant = false) {
    const segmentedBar = document.getElementById('segmentedBar');
    const glider = document.getElementById('segmentedGlider');
    if (!segmentedBar || !glider) return;

    const activeBtn = segmentedBar.querySelector('.segment-btn.active');
    if (!activeBtn) {
      glider.style.opacity = '0';
      return;
    }

    const barRect = segmentedBar.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    if (btnRect.width === 0) {
      requestAnimationFrame(() => updateSegmentedGlider(instant));
      return;
    }

    const left = btnRect.left - barRect.left;
    const width = btnRect.width;

    if (instant) {
      glider.style.transition = 'none';
    } else {
      glider.style.transition = 'transform 0.32s cubic-bezier(0.25, 1, 0.5, 1), width 0.32s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease';
    }

    glider.style.transform = `translateX(${left}px)`;
    glider.style.width = `${width}px`;
    glider.style.opacity = '1';

    if (instant) {
      glider.offsetHeight;
      glider.style.transition = '';
    }
  }

  function switchTab(tabName, shouldSync = true) {
    state.activeTab = tabName;
    document.querySelectorAll('.segment-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.module-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${tabName}`);
    });
    if (tabName === 'windowManager') {
      sendToAhk('getActiveAppVolume');
    }
    updateSegmentedGlider(false);
    if (shouldSync && isInitialized) {
      syncConfig();
    }
  }

  // ============================================================================
  // Module 1: Text Expander (with Multiline Support)
  // ============================================================================

  function toggleMultiline(force) {
    state.isMultiline = typeof force === 'boolean' ? force : !state.isMultiline;
    teToggleMultiline.classList.toggle('active', state.isMultiline);

    if (state.isMultiline) {
      teOutputContainer.classList.add('multiline-active');
      teInputOutput.classList.add('hidden-field');
      teTextareaOutput.classList.remove('hidden-field');
      if (teInputOutput.value && !teTextareaOutput.value) {
        teTextareaOutput.value = teInputOutput.value;
      }
      teTextareaOutput.focus();
    } else {
      teOutputContainer.classList.remove('multiline-active');
      teTextareaOutput.classList.add('hidden-field');
      teInputOutput.classList.remove('hidden-field');
      if (teTextareaOutput.value && !teInputOutput.value) {
        teInputOutput.value = teTextareaOutput.value.replace(/\n/g, ' ');
      }
      teInputOutput.focus();
    }
  }

  function renderTextExpander() {
    teShortcutsContainer.innerHTML = '';
    const items = state.config.textExpander.items || [];
    const query = (teSearchFilter.value || '').toLowerCase();

    const filtered = items.filter(item => {
      if (!query) return true;
      return item.input.toLowerCase().includes(query) || item.output.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      teShortcutsContainer.innerHTML = `
        <div class="empty-state">
          <span>No text expanders configured</span>
          <span style="font-size: 11px;">Type trigger & snippet above and click GO</span>
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      const isEnabled = item.enabled !== false && item.enabled !== 0;
      const card = document.createElement('div');
      card.className = `shortcut-card ${state.editingTeId === item.id ? 'editing' : ''}`;
      card.className = `shortcut-card ${isEnabled ? '' : 'is-disabled'} ${state.editingTeId === item.id ? 'editing' : ''}`;

      const isMulti = item.multiline || item.output.includes('\n');
      const previewText = item.output.replace(/\n/g, ' \\n ');

      card.innerHTML = `
        <div class="card-info">
          <span class="trigger-badge ${isEnabled ? '' : 'is-disabled'}">${escapeHtml(item.input)}</span>
          <span class="arrow-divider"><svg class="arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></span>
          <span class="expansion-text" title="${escapeHtml(item.output)}">${escapeHtml(previewText)}</span>
          ${isMulti ? '<span class="multiline-badge">Multiline</span>' : ''}
        </div>
        <div class="card-actions">
          <button class="card-btn btn-copy" title="Copy Replacement" data-id="${item.id}">
            <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="card-btn btn-edit" title="Edit Snippet" data-id="${item.id}">
            <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="card-btn btn-delete" title="Delete Snippet" data-id="${item.id}">
            <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          <div class="toggle-wrapper" title="Enable / Disable Text Expander">
            <input class="toggle-checkbox te-switch" type="checkbox" ${isEnabled ? 'checked' : ''}>
            <div class="toggle-container">
              <div class="toggle-button"></div>
            </div>
          </div>
        </div>
      `;

      card.querySelector('.btn-copy').addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(item.output);
      });

      card.querySelector('.btn-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        startEditTe(item);
      });

      card.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTe(item.id);
      });

      // Toggle switch logic
      const sw = card.querySelector('.te-switch');
      const badge = card.querySelector('.trigger-badge');
      sw.addEventListener('change', () => {
        const isChecked = sw.checked;
        item.enabled = isChecked ? 1 : 0;
        card.classList.toggle('is-disabled', !isChecked);
        if (badge) badge.classList.toggle('is-disabled', !isChecked);
        syncConfig();
        updateGlobalIndicators();
      });

      card.addEventListener('click', (e) => {
        if (
          e.target.closest('.card-btn') ||
          e.target.closest('.toggle-wrapper')
        ) return;
        sw.checked = !sw.checked;
        sw.dispatchEvent(new Event('change'));
      });

      teShortcutsContainer.appendChild(card);
    });
  }

  function submitTextExpander() {
    const trigger = teInputTrigger.value.trim();
    const output = state.isMultiline ? teTextareaOutput.value : teInputOutput.value;

    if (!trigger) {
      teInputTrigger.focus();
      return;
    }
    if (!output) {
      if (state.isMultiline) teTextareaOutput.focus();
      else teInputOutput.focus();
      return;
    }

    const items = state.config.textExpander.items;
    const isMulti = state.isMultiline || output.includes('\n');

    if (state.editingTeId) {
      const idx = items.findIndex(s => s.id === state.editingTeId);
      if (idx !== -1) {
        items[idx].input = trigger;
        items[idx].output = output;
        items[idx].multiline = isMulti;
        updateItemAcrossProfiles('textExpander', items[idx]);
      }
      state.editingTeId = null;
      teBtnSubmitText.textContent = 'GO';
    } else {
      const exists = items.find(s => s.input.toLowerCase() === trigger.toLowerCase());
      if (exists) {
        exists.output = output;
        exists.multiline = isMulti;
        updateItemAcrossProfiles('textExpander', exists);
      } else {
        const newItem = {
          id: 'te-' + Date.now(),
          input: trigger,
          output: output,
          multiline: isMulti,
          enabled: 1
        };
        items.unshift(newItem);
        addItemAcrossProfiles('textExpander', newItem);
      }
    }

    teInputTrigger.value = '';
    teInputOutput.value = '';
    teTextareaOutput.value = '';
    toggleMultiline(false);
    teInputTrigger.focus();

    renderTextExpander();
    syncConfig();
  }

function startEditTe(item) {
  state.editingTeId = item.id;
  teInputTrigger.value = item.input;
  if (item.multiline || item.output.includes('\n')) {
    toggleMultiline(true);
    teTextareaOutput.value = item.output;
    teTextareaOutput.focus();
  } else {
    toggleMultiline(false);
    teInputOutput.value = item.output;
    teInputOutput.focus();
  }
  teBtnSubmitText.textContent = 'SAVE';
  renderTextExpander();
}

function deleteTe(id) {
  deleteItemAcrossProfiles('textExpander', id);
  state.config.textExpander.items = state.config.textExpander.items.filter(s => s.id !== id);
  if (state.editingTeId === id) {
    state.editingTeId = null;
    teInputTrigger.value = '';
    teInputOutput.value = '';
    teTextareaOutput.value = '';
    teBtnSubmitText.textContent = 'GO';
  }
  renderTextExpander();
  syncConfig();
}

// ============================================================================
// Module 2: Key Remapper
// ============================================================================

function renderKeyRemapper() {
  krRemapsContainer.innerHTML = '';
  const items = state.config.keyRemapper.items || [];

  if (items.length === 0) {
    krRemapsContainer.innerHTML = `
        <div class="empty-state">
          <span>No key remaps configured</span>
          <span style="font-size: 11px;">Enter source key & target above</span>
        </div>
      `;
    return;
  }

  items.forEach(item => {
    const isEnabled = item.enabled !== false && item.enabled !== 0;
    const card = document.createElement('div');
    card.className = 'shortcut-card';
    card.className = `shortcut-card ${isEnabled ? '' : 'is-disabled'}`;
    card.innerHTML = `
        <div class="card-info">
          <span class="trigger-badge">${escapeHtml(item.source)}</span>
          <span class="trigger-badge ${isEnabled ? '' : 'is-disabled'}">${escapeHtml(item.source)}</span>
          <span class="arrow-divider"><svg class="arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></span>
          <span class="expansion-text"><strong>${escapeHtml(item.target)}</strong> — ${escapeHtml(item.name || 'Remap')}</span>
        </div>
        <div class="card-actions">
          <button class="card-btn btn-delete" title="Delete Remap" data-id="${item.id}">
            <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          <div class="toggle-wrapper" title="Enable / Disable Key Remap">
            <input class="toggle-checkbox kr-switch" type="checkbox" ${isEnabled ? 'checked' : ''}>
            <div class="toggle-container">
              <div class="toggle-button"></div>
            </div>
          </div>
        </div>
      `;

    card.querySelector('.btn-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteKr(item.id);
    });

    // Toggle switch logic
    const sw = card.querySelector('.kr-switch');
    const badge = card.querySelector('.trigger-badge');
    sw.addEventListener('change', () => {
      const isChecked = sw.checked;
      item.enabled = isChecked ? 1 : 0;
      card.classList.toggle('is-disabled', !isChecked);
      if (badge) badge.classList.toggle('is-disabled', !isChecked);
      syncConfig();
      updateGlobalIndicators();
    });

    card.addEventListener('click', (e) => {
      if (
        e.target.closest('.card-btn') ||
        e.target.closest('.toggle-wrapper')
      ) return;
      sw.checked = !sw.checked;
      sw.dispatchEvent(new Event('change'));
    });

    krRemapsContainer.appendChild(card);
  });
}

function setupKeyCombinationBox(boxEl, inputEl, clearBtn, nextBox, onCommit) {
  if (!boxEl || !inputEl) return;

  let isRecording = false;
  let pendingModifier = null;

  function startRecording() {
    isRecording = true;
    pendingModifier = null;
    boxEl.classList.add('is-recording');
    inputEl.placeholder = 'Press keys...';
  }

  function stopRecording() {
    isRecording = false;
    pendingModifier = null;
    boxEl.classList.remove('is-recording');
    if (!inputEl.value) {
      inputEl.placeholder = 'Click to record...';
    }
    updateClearButton();
  }

  function updateClearButton() {
    if (clearBtn) {
      if (inputEl.value.trim()) {
        clearBtn.classList.remove('hidden-field');
      } else {
        clearBtn.classList.add('hidden-field');
      }
    }
  }

  boxEl.addEventListener('click', (e) => {
    if (e.target === clearBtn) return;
    inputEl.focus();
    startRecording();
  });

  inputEl.addEventListener('focus', () => {
    startRecording();
  });

  inputEl.addEventListener('blur', () => {
    stopRecording();
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      inputEl.value = '';
      inputEl.placeholder = 'Click to record...';
      updateClearButton();
      inputEl.blur();
    });
  }

  inputEl.addEventListener('keydown', (e) => {
    if (!isRecording) startRecording();

    if (e.key === 'Tab') return;

    e.preventDefault();
    e.stopPropagation();

    // Backspace or Delete clears the combination
    if ((e.key === 'Backspace' || e.key === 'Delete') && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      inputEl.value = '';
      updateClearButton();
      return;
    }

    // Enter key commits or advances
    if (e.key === 'Enter') {
      if (inputEl.value.trim()) {
        stopRecording();
        if (nextBox) {
          const nextInput = nextBox.querySelector('input');
          if (nextInput) nextInput.focus();
        } else if (onCommit) {
          onCommit();
        }
      }
      return;
    }

    const isModifier = ['Control', 'Alt', 'Shift', 'Meta', 'OS'].includes(e.key);

    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Win');

    // Standalone modifier press
    if (isModifier) {
      pendingModifier = e.key === 'Control' ? 'Control' : (e.key === 'Shift' ? 'Shift' : (e.key === 'Alt' ? 'Alt' : 'Win'));
      inputEl.value = parts.join(' + ') + ' + ...';
      return;
    }

    pendingModifier = null;

    let key = e.key;
    if (e.code && e.code.startsWith('Key')) {
      key = e.code.slice(3).toUpperCase();
    } else if (e.code && e.code.startsWith('Digit')) {
      key = e.code.slice(5);
    } else if (e.code && e.code.startsWith('Numpad')) {
      key = e.code;
    } else if (key === ' ') {
      key = 'Space';
    } else if (key === 'Escape' || key === 'Esc') {
      key = 'Escape';
    } else if (key === 'ArrowUp') {
      key = 'Up';
    } else if (key === 'ArrowDown') {
      key = 'Down';
    } else if (key === 'ArrowLeft') {
      key = 'Left';
    } else if (key === 'ArrowRight') {
      key = 'Right';
    } else if (key === 'PageUp') {
      key = 'PgUp';
    } else if (key === 'PageDown') {
      key = 'PgDn';
    } else if (e.code === 'Minus') {
      key = '-';
    } else if (e.code === 'Equal') {
      key = '=';
    } else if (e.code === 'BracketLeft') {
      key = '[';
    } else if (e.code === 'BracketRight') {
      key = ']';
    } else if (e.code === 'Backslash') {
      key = '\\';
    } else if (e.code === 'Semicolon') {
      key = ';';
    } else if (e.code === 'Quote') {
      key = "'";
    } else if (e.code === 'Backquote') {
      key = '`';
    } else if (e.code === 'Comma') {
      key = ',';
    } else if (e.code === 'Period') {
      key = '.';
    } else if (e.code === 'Slash') {
      key = '/';
    } else if (key.length === 1) {
      key = key.toUpperCase();
    }

    if (!parts.includes(key)) {
      parts.push(key);
    }

    const combo = parts.join('+');
    inputEl.value = combo;
    updateClearButton();
    stopRecording();

    if (nextBox) {
      const nextInput = nextBox.querySelector('input');
      if (nextInput) {
        setTimeout(() => nextInput.focus(), 50);
      }
    }
  });

  inputEl.addEventListener('keyup', (e) => {
    if (isRecording && pendingModifier) {
      inputEl.value = pendingModifier;
      updateClearButton();
      stopRecording();
      pendingModifier = null;
      if (nextBox) {
        const nextInput = nextBox.querySelector('input');
        if (nextInput) {
          setTimeout(() => nextInput.focus(), 50);
        }
      }
    }
  });

  updateClearButton();
}

function submitKeyRemapper() {
  const src = krInputSource ? krInputSource.value.trim() : '';
  const tgt = krInputTarget ? krInputTarget.value.trim() : '';

  if (!src) {
    if (krInputSource) krInputSource.focus();
    return;
  }
  if (!tgt) {
    if (krInputTarget) krInputTarget.focus();
    return;
  }

    const newItem = {
      id: 'kr-' + Date.now(),
      source: src,
      target: tgt,
      name: `${src} → ${tgt}`,
      enabled: 1
    };
    state.config.keyRemapper.items.unshift(newItem);
    addItemAcrossProfiles('keyRemapper', newItem);

    if (krInputSource) {
      krInputSource.value = '';
      if (krBtnClearSource) krBtnClearSource.classList.add('hidden-field');
    }
    if (krInputTarget) {
      krInputTarget.value = '';
      if (krBtnClearTarget) krBtnClearTarget.classList.add('hidden-field');
    }

    renderKeyRemapper();
    syncConfig();
  }

function deleteKr(id) {
  deleteItemAcrossProfiles('keyRemapper', id);
  state.config.keyRemapper.items = state.config.keyRemapper.items.filter(s => s.id !== id);
  renderKeyRemapper();
  syncConfig();
}

// ============================================================================
// Module 3: Window Management
// ============================================================================

function updateSliderProgress(slider) {
  if (!slider) return;
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 100;
  const val = parseFloat(slider.value) || 0;
  const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  slider.style.setProperty('--progress', `${pct}%`);
}

function initWindowManager() {
  if (!state.config.windowManager) {
    state.config.windowManager = {};
  }
  const wm = state.config.windowManager;
  if (wmOpacitySlider) {
    wmOpacitySlider.value = wm.opacity || 215;
    updateWmOpacityLabel();
    updateSliderProgress(wmOpacitySlider);

    if (!wmOpacitySlider.dataset.bound) {
      wmOpacitySlider.dataset.bound = 'true';
      wmOpacitySlider.addEventListener('input', () => {
        updateWmOpacityLabel();
        updateSliderProgress(wmOpacitySlider);
      });

      wmOpacitySlider.addEventListener('change', () => {
        state.config.windowManager.opacity = parseInt(wmOpacitySlider.value, 10);
        updateSliderProgress(wmOpacitySlider);
        syncConfig();
      });
    }
  }

  // Wire individual option switches (Uiverse rude-stingray-22)
  const switchDefinitions = [
    { id: 'wmSwitchAlwaysOnTop', badgeId: 'wmBadgeAlwaysOnTop', key: 'alwaysOnTopEnabled' },
    { id: 'wmSwitchCenterWindow', badgeId: 'wmBadgeCenterWindow', key: 'centerWindowEnabled' },
    { id: 'wmSwitchHideWindow', badgeId: 'wmBadgeHideWindow', key: 'hideWindowEnabled' },
    { id: 'wmSwitchTransparencyWheel', badgeId: 'wmBadgeTransparencyWheel', key: 'transparencyWheel' },
    { id: 'wmSwitchAppVolumeWheel', badgeId: 'wmBadgeAppVolumeWheel', key: 'appVolumeWheel' },
    { id: 'wmSwitchAppVolumeMute', badgeId: 'wmBadgeAppVolumeMute', key: 'appVolumeMuteEnabled' },
    { id: 'wmSwitchWindowShade', badgeId: 'wmBadgeWindowShade', key: 'windowShadeEnabled' },
    { id: 'wmSwitchBorderless', badgeId: 'wmBadgeBorderless', key: 'borderlessEnabled' }
  ];

  switchDefinitions.forEach(({ id, badgeId, key }) => {
    const sw = document.getElementById(id);
    const badge = document.getElementById(badgeId);
    if (!sw) return;

    const currWm = (state.config && state.config.windowManager) ? state.config.windowManager : {};
    const isEnabled = (currWm[key] !== false && currWm[key] !== 0);
    sw.checked = isEnabled;
    const card = sw.closest('.wm-card');
    const iconBadge = card ? card.querySelector('.wm-icon-badge') : null;
    if (card) {
      card.classList.toggle('is-disabled', !isEnabled);
    }
    if (badge) {
      badge.classList.toggle('is-disabled', !isEnabled);
    }
    if (iconBadge) {
      iconBadge.classList.toggle('is-disabled', !isEnabled);
    }

    if (!sw.dataset.bound) {
      sw.dataset.bound = 'true';
      sw.addEventListener('change', () => {
        if (!state.config.windowManager) {
          state.config.windowManager = {};
        }
        const isChecked = sw.checked;
        state.config.windowManager[key] = isChecked ? 1 : 0;
        if (card) {
          card.classList.toggle('is-disabled', !isChecked);
        }
        if (badge) {
          badge.classList.toggle('is-disabled', !isChecked);
        }
        if (iconBadge) {
          iconBadge.classList.toggle('is-disabled', !isChecked);
        }
        syncConfig();
      });
    }

    if (card && !card.dataset.cardBound) {
      card.dataset.cardBound = 'true';
      card.addEventListener('click', (e) => {
        // If clicked inside the toggle switch itself, let the switch handle it naturally
        if (e.target.closest('.toggle-wrapper')) return;
        // If clicked inside the ghost sub-checkbox or its label, let ghost mode handle it
        if (e.target.closest('.wm-sub-option') || e.target.closest('.uiverse-checkbox-wrap')) return;

        sw.checked = !sw.checked;
        sw.dispatchEvent(new Event('change'));
      });
    }
  });

  // Wire Uiverse bright-rat-5 round checkbox for Click-Through Ghost Mode
  const wmCheckboxGhostMode = document.getElementById('wmCheckboxGhostMode');
  if (wmCheckboxGhostMode) {
    const currWm = (state.config && state.config.windowManager) ? state.config.windowManager : {};
    const isGhost = (currWm.clickThroughGhost === 1 || currWm.clickThroughGhost === true);
    wmCheckboxGhostMode.checked = isGhost;
    const ghostBadge = document.getElementById('wmBadgeGhostMode');
    if (ghostBadge) ghostBadge.classList.toggle('is-disabled', !isGhost);

    if (!wmCheckboxGhostMode.dataset.bound) {
      wmCheckboxGhostMode.dataset.bound = 'true';
      wmCheckboxGhostMode.addEventListener('change', () => {
        if (!state.config.windowManager) state.config.windowManager = {};
        state.config.windowManager.clickThroughGhost = wmCheckboxGhostMode.checked ? 1 : 0;
        if (ghostBadge) ghostBadge.classList.toggle('is-disabled', !wmCheckboxGhostMode.checked);
        syncConfig();
      });
    }
  }

  if (wmAppVolumeSlider) {
    updateSliderProgress(wmAppVolumeSlider);

    if (!wmAppVolumeSlider.dataset.bound) {
      wmAppVolumeSlider.dataset.bound = 'true';
      wmAppVolumeSlider.addEventListener('input', () => {
        const val = parseInt(wmAppVolumeSlider.value, 10);
        if (wmAppVolumeValue) wmAppVolumeValue.textContent = `${val}%`;
        updateSliderProgress(wmAppVolumeSlider);
        sendToAhk('setActiveAppVolume', { volume: val, pid: activeAppState.pid });
      });

      wmAppVolumeSlider.addEventListener('change', () => {
        const val = parseInt(wmAppVolumeSlider.value, 10);
        updateSliderProgress(wmAppVolumeSlider);
        sendToAhk('setActiveAppVolume', { volume: val, pid: activeAppState.pid });
      });
    }
  }

  if (wmBtnMuteActiveApp && !wmBtnMuteActiveApp.dataset.bound) {
    wmBtnMuteActiveApp.dataset.bound = 'true';
    wmBtnMuteActiveApp.addEventListener('click', () => {
      sendToAhk('toggleMuteActiveApp', { pid: activeAppState.pid });
    });
  }

  sendToAhk('getActiveAppVolume');
}

function updateWmOpacityLabel() {
  if (!wmOpacitySlider || !wmOpacityValue) return;
  const pct = Math.round((wmOpacitySlider.value / 255) * 100);
  wmOpacityValue.textContent = `${pct}%`;
}

// ============================================================================
// Module 4: App Launcher (Text String & Key Combination Support)
// ============================================================================

let currentAlType = 'string'; // 'string' | 'hotkey'
let editingAlId = null;

function setAlTriggerType(type) {
  currentAlType = (type === 'hotkey') ? 'hotkey' : 'string';
  if (currentAlType === 'hotkey') {
    if (alTypeHotkey) alTypeHotkey.classList.add('active');
    if (alTypeString) alTypeString.classList.remove('active');
    if (alTriggerIcon) {
      alTriggerIcon.innerHTML = `
          <rect x="2" y="4" width="20" height="16" rx="2"></rect>
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"></path>
        `;
    }
    if (alInputTrigger) {
      alInputTrigger.placeholder = 'Press keys (e.g. Ctrl+Alt+C) or type...';
    }
    if (alHintTag) {
      alHintTag.textContent = 'Pressing key combination anywhere in Windows opens target instantly';
    }
  } else {
    if (alTypeString) alTypeString.classList.add('active');
    if (alTypeHotkey) alTypeHotkey.classList.remove('active');
    if (alTriggerIcon) {
      alTriggerIcon.innerHTML = `
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        `;
    }
    if (alInputTrigger) {
      alInputTrigger.placeholder = 'Trigger (e.g. @calc, @yt)';
    }
    if (alHintTag) {
      alHintTag.textContent = 'Typing trigger string anywhere in Windows opens apps, websites, or commands instantly';
    }
  }
}

function handleAlTriggerKeydown(e) {
  if (currentAlType === 'hotkey') {
    if (e.key === 'Tab') return;
    if (e.key === 'Enter') {
      if (!alInputTarget.value.trim()) alInputTarget.focus();
      else submitAppLauncher();
      return;
    }

    const isModifier = ['Control', 'Alt', 'Shift', 'Meta', 'OS'].includes(e.key);
    const hasModifier = e.ctrlKey || e.altKey || e.metaKey || (e.shiftKey && (e.ctrlKey || e.altKey || e.metaKey));
    const isSpecialKey = [
      'Escape', 'CapsLock', 'Space', 'Backspace', 'Delete', 'Insert',
      'Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'Tab', 'NumLock', 'ScrollLock', 'PrintScreen'
    ].includes(e.key) || /^F\d{1,2}$/i.test(e.key);

    if ((e.key === 'Backspace' || e.key === 'Delete') && !hasModifier && !e.shiftKey) {
      alInputTrigger.value = '';
      e.preventDefault();
      return;
    }

    if (hasModifier || isModifier || isSpecialKey) {
      e.preventDefault();

      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Win');

      if (isModifier) {
        if (parts.length > 0) {
          alInputTrigger.value = parts.join('+');
        }
        return;
      }

      let key = e.key;
      if (e.code && e.code.startsWith('Key')) {
        key = e.code.slice(3).toUpperCase();
      } else if (e.code && e.code.startsWith('Digit')) {
        key = e.code.slice(5);
      } else if (e.code && e.code.startsWith('Numpad')) {
        key = e.code;
      } else if (key === ' ') {
        key = 'Space';
      } else if (key === 'Escape' || key === 'Esc') {
        key = 'Escape';
      } else if (key === 'ArrowUp') {
        key = 'Up';
      } else if (key === 'ArrowDown') {
        key = 'Down';
      } else if (key === 'ArrowLeft') {
        key = 'Left';
      } else if (key === 'ArrowRight') {
        key = 'Right';
      } else if (key === 'PageUp') {
        key = 'PgUp';
      } else if (key === 'PageDown') {
        key = 'PgDn';
      } else if (key.length === 1) {
        key = key.toUpperCase();
      }

      if (!parts.includes(key)) {
        parts.push(key);
      }

      alInputTrigger.value = parts.join('+');
    }
  } else {
    if (e.key === 'Enter') {
      if (!alInputTarget.value.trim()) alInputTarget.focus();
      else submitAppLauncher();
    }
  }
}

function renderAppLauncher() {
  alLaunchersContainer.innerHTML = '';
  const items = state.config.appLauncher.items || [];

  if (items.length === 0) {
    alLaunchersContainer.innerHTML = `
        <div class="empty-state">
          <span>No quick launchers configured</span>
          <span style="font-size: 11px;">Configure a text trigger or key combination above</span>
        </div>
      `;
    return;
  }

  items.forEach(item => {
    const isHotkey = item.triggerType === 'hotkey';
    const isEnabled = item.enabled !== false && item.enabled !== 0;
    const card = document.createElement('div');
    card.className = 'shortcut-card';
    card.className = `shortcut-card ${isEnabled ? '' : 'is-disabled'}`;

    const badgeIcon = isHotkey
      ? `<svg class="badge-key-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"></path></svg>`
      : '';

    const typeBadge = isHotkey
      ? `<span class="multiline-badge hotkey-tag">KEY COMBO</span>`
      : `<span class="multiline-badge">STRING</span>`;

    card.innerHTML = `
        <div class="card-info">
          <span class="trigger-badge ${isHotkey ? 'trigger-badge-hotkey' : ''}">${badgeIcon}${escapeHtml(item.trigger)}</span>
          <span class="trigger-badge ${isHotkey ? 'trigger-badge-hotkey' : ''} ${isEnabled ? '' : 'is-disabled'}">${badgeIcon}${escapeHtml(item.trigger)}</span>
          <span class="arrow-divider"><svg class="arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></span>
          <span class="expansion-text"><strong>${escapeHtml(item.name || 'Launch')}</strong>: ${escapeHtml(item.target)}</span>
          ${typeBadge}
        </div>
        <div class="card-actions">
          <button class="card-btn btn-run" title="Test Launch" data-target="${escapeHtml(item.target)}">
            <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
          <button class="card-btn btn-edit" title="Edit Launcher" data-id="${item.id}">
            <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button class="card-btn btn-delete" title="Delete Launcher" data-id="${item.id}">
            <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          <div class="toggle-wrapper" title="Enable / Disable App Launcher">
            <input class="toggle-checkbox al-switch" type="checkbox" ${isEnabled ? 'checked' : ''}>
            <div class="toggle-container">
              <div class="toggle-button"></div>
            </div>
          </div>
        </div>
      `;

    card.querySelector('.btn-run').addEventListener('click', (e) => {
      e.stopPropagation();
      sendToAhk('runLauncher', { target: item.target });
    });

    card.querySelector('.btn-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      editAl(item);
    });

    card.querySelector('.btn-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteAl(item.id);
    });

    // Toggle switch logic
    const sw = card.querySelector('.al-switch');
    const badge = card.querySelector('.trigger-badge');
    sw.addEventListener('change', () => {
      const isChecked = sw.checked;
      item.enabled = isChecked ? 1 : 0;
      card.classList.toggle('is-disabled', !isChecked);
      if (badge) badge.classList.toggle('is-disabled', !isChecked);
      syncConfig();
      updateGlobalIndicators();
    });

    card.addEventListener('click', (e) => {
      if (
        e.target.closest('.card-btn') ||
        e.target.closest('.toggle-wrapper')
      ) return;
      sw.checked = !sw.checked;
      sw.dispatchEvent(new Event('change'));
    });

    alLaunchersContainer.appendChild(card);
  });
}

function editAl(item) {
  editingAlId = item.id;
  setAlTriggerType(item.triggerType || 'string');
  alInputTrigger.value = item.trigger || '';
  alInputTarget.value = item.target || '';
  if (alInputName) alInputName.value = item.name || '';
  if (alBtnSubmitText) alBtnSubmitText.textContent = 'SAVE';
  alInputTrigger.focus();
}

function submitAppLauncher() {
  const trigger = alInputTrigger.value.trim();
  const target = alInputTarget.value.trim();
  const name = (alInputName && alInputName.value.trim()) ? alInputName.value.trim() : (target || trigger);
  const triggerType = currentAlType;

  if (!trigger) {
    alInputTrigger.focus();
    return;
  }
  if (!target) {
    alInputTarget.focus();
    return;
  }

  if (editingAlId) {
    const idx = state.config.appLauncher.items.findIndex(s => s.id === editingAlId);
    if (idx !== -1) {
      state.config.appLauncher.items[idx] = {
        ...state.config.appLauncher.items[idx],
        trigger: trigger,
        triggerType: triggerType,
        target: target,
        name: name
      };
      updateItemAcrossProfiles('appLauncher', state.config.appLauncher.items[idx]);
    }
    editingAlId = null;
    if (alBtnSubmitText) alBtnSubmitText.textContent = 'ADD';
    } else {
      const newItem = {
        id: 'al-' + Date.now(),
        trigger: trigger,
        triggerType: triggerType,
        target: target,
        name: name,
        enabled: 1
      };
      state.config.appLauncher.items.unshift(newItem);
      addItemAcrossProfiles('appLauncher', newItem);
    }

    alInputTrigger.value = '';
    alInputTarget.value = '';
    if (alInputName) alInputName.value = '';
    renderAppLauncher();
    syncConfig();
  }

function deleteAl(id) {
  if (editingAlId === id) {
    editingAlId = null;
    if (alBtnSubmitText) alBtnSubmitText.textContent = 'ADD';
    alInputTrigger.value = '';
    alInputTarget.value = '';
    if (alInputName) alInputName.value = '';
  }
  deleteItemAcrossProfiles('appLauncher', id);
  state.config.appLauncher.items = state.config.appLauncher.items.filter(s => s.id !== id);
  renderAppLauncher();
  syncConfig();
}

// ============================================================================
// Module 5: Auto Clicker
// ============================================================================

function initAutoClicker() {
  const ac = state.config.autoClicker;
  acCpsSlider.value = ac.cps || 20;
  acCpsValue.textContent = `${ac.cps || 20} CPS`;
  updateSliderProgress(acCpsSlider);

  // Button selector
  acButtonSelector.querySelectorAll('.ac-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === ac.button);
    btn.addEventListener('click', () => {
      acButtonSelector.querySelectorAll('.ac-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.config.autoClicker.button = btn.dataset.val;
      syncConfig();
    });
  });

  // Click Type selector
  acTypeSelector.querySelectorAll('.ac-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === ac.clickType);
    btn.addEventListener('click', () => {
      acTypeSelector.querySelectorAll('.ac-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.config.autoClicker.clickType = btn.dataset.val;
      syncConfig();
    });
  });

  // CPS slider
  acCpsSlider.addEventListener('input', () => {
    acCpsValue.textContent = `${acCpsSlider.value} CPS`;
    updateSliderProgress(acCpsSlider);
  });

  acCpsSlider.addEventListener('change', () => {
    state.config.autoClicker.cps = parseInt(acCpsSlider.value, 10);
    updateSliderProgress(acCpsSlider);
    syncConfig();
  });

  // Toggle Button
  acToggleBtn.addEventListener('click', () => {
    sendToAhk('toggleAutoClicker');
  });

  updateAutoClickerUi(state.autoClickerRunning);
}

function updateAutoClickerUi(isRunning) {
  state.autoClickerRunning = isRunning;
  acToggleBtn.classList.toggle('running', isRunning);
  acToggleBtnText.textContent = isRunning ? 'STOP (F8)' : 'START (F8)';
  acStatusHint.textContent = isRunning
    ? 'Auto-Clicker is RUNNING! Press F8 anywhere to STOP.'
    : 'Ready - Press F8 anywhere in Windows to start or stop clicking.';

  // Animate radial dots if present
  if (radialDotsDial) {
    radialDotsDial.classList.toggle('spinning', isRunning);
  }
}

// ============================================================================
// Module 6: Macro Recording & Sequencer
// ============================================================================

const macroState = {
  isRecording: false,
  useStandardDelays: true,
  standardDelay: 50,
  playbackMode: 'NoRepeat',
  steps: [],
  editingId: null
};

const macroInputName = document.getElementById('macroInputName');
const macroTriggerBox = document.getElementById('macroTriggerBox');
const macroInputTrigger = document.getElementById('macroInputTrigger');
const macroBtnClearTrigger = document.getElementById('macroBtnClearTrigger');
const macroModeSelector = document.getElementById('macroModeSelector');
const macroIntervalBox = document.getElementById('macroIntervalBox');
const macroInputInterval = document.getElementById('macroInputInterval');
const macroBtnSubmit = document.getElementById('macroBtnSubmit');
const macroBtnSubmitText = document.getElementById('macroBtnSubmitText');
const macroBtnRecordToggle = document.getElementById('macroBtnRecordToggle');
const macroBtnRecordText = document.getElementById('macroBtnRecordText');
const macroRecDot = document.getElementById('macroRecDot');
const macroStatusPill = document.getElementById('macroStatusPill');
const macroStatusText = document.getElementById('macroStatusText');
const macroBtnAddLClick = document.getElementById('macroBtnAddLClick');
const macroBtnAddRClick = document.getElementById('macroBtnAddRClick');
const macroBtnAddMClick = document.getElementById('macroBtnAddMClick');
const macroBtnAddDelay = document.getElementById('macroBtnAddDelay');
const macroChkStandardDelays = document.getElementById('macroChkStandardDelays');
const macroBtnTestPlay = document.getElementById('macroBtnTestPlay');
const macroBtnClearSteps = document.getElementById('macroBtnClearSteps');
const macroTimelineTrack = document.getElementById('macroTimelineTrack');
const macroTimelineEmpty = document.getElementById('macroTimelineEmpty');
const macroCountBadge = document.getElementById('macroCountBadge');
const macroListContainer = document.getElementById('macroListContainer');

// Drag & drop state for macro sequencer
let macroDragSourceIndex = null;
let macroDragInjectItem = null;

function renderMacroTimeline() {
  if (!macroTimelineTrack) return;
  macroTimelineTrack.innerHTML = '';

  if (!macroState.steps || macroState.steps.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'macro-timeline-empty';
    emptyDiv.innerHTML = 'No sequence steps recorded yet. Click <strong>RECORD</strong> or <strong>drag &amp; drop buttons</strong> here.';
    macroTimelineTrack.appendChild(emptyDiv);
    return;
  }

  macroState.steps.forEach((step, idx) => {
    const chip = document.createElement('div');
    chip.className = 'macro-step-chip';
    chip.setAttribute('draggable', 'true');
    chip.dataset.index = idx;

    let dirClass = 'down';
    let dirSymbol = '↓';
    if (step.action === 'Up') {
      dirClass = 'up';
      dirSymbol = '↑';
    } else if (step.action === 'Click') {
      dirClass = 'click';
      dirSymbol = '🖱';
    } else if (step.action === 'Delay') {
      dirClass = 'delay';
      dirSymbol = '⏱';
    }

    chip.innerHTML = `
        <span class="macro-step-drag-grip" title="Drag to reorder">
          <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
            <circle cx="8" cy="6" r="1.5"/><circle cx="16" cy="6" r="1.5"/>
            <circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/>
            <circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/>
          </svg>
        </span>
        <span class="macro-step-dir ${dirClass}">${dirSymbol}</span>
        <span class="macro-step-key">${escapeHtml(step.key || 'Delay')}</span>
        <span class="macro-step-delay" title="Click to edit delay">${step.delay || 50}ms</span>
        <button type="button" class="btn-remove-step" title="Remove step">&times;</button>
      `;

    // Drag Start
    chip.addEventListener('dragstart', (e) => {
      macroDragSourceIndex = idx;
      macroDragInjectItem = null;
      chip.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'reorder', fromIndex: idx }));
      } catch (err) { }
      e.stopPropagation();
    });

    // Drag End
    chip.addEventListener('dragend', () => {
      chip.classList.remove('is-dragging');
      macroDragSourceIndex = null;
      macroDragInjectItem = null;
      if (macroTimelineTrack) {
        macroTimelineTrack.querySelectorAll('.macro-step-chip').forEach(c => {
          c.classList.remove('drag-over-left', 'drag-over-right');
        });
      }
    });

    // Drag Over Chip
    chip.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';

      const rect = chip.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const isAfter = e.clientX > midX;

      chip.classList.toggle('drag-over-left', !isAfter);
      chip.classList.toggle('drag-over-right', isAfter);
    });

    // Drag Leave Chip
    chip.addEventListener('dragleave', (e) => {
      if (!chip.contains(e.relatedTarget)) {
        chip.classList.remove('drag-over-left', 'drag-over-right');
      }
    });

    // Drop on Chip
    chip.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      chip.classList.remove('drag-over-left', 'drag-over-right');

      const rect = chip.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const isAfter = e.clientX > midX;
      let targetIndex = isAfter ? idx + 1 : idx;

      let data = null;
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) data = JSON.parse(raw);
      } catch (err) { }

      if (!data) {
        if (macroDragSourceIndex !== null) {
          data = { type: 'reorder', fromIndex: macroDragSourceIndex };
        } else if (macroDragInjectItem) {
          data = macroDragInjectItem;
        }
      }

      if (data && data.type === 'reorder') {
        const fromIdx = data.fromIndex;
        if (fromIdx === undefined || fromIdx === null) return;
        if (fromIdx === targetIndex || (fromIdx === targetIndex - 1 && isAfter)) {
          return;
        }
        const [movedStep] = macroState.steps.splice(fromIdx, 1);
        if (fromIdx < targetIndex) {
          targetIndex--;
        }
        macroState.steps.splice(targetIndex, 0, movedStep);
        renderMacroTimeline();
      } else if (data && data.type === 'inject') {
        macroState.steps.splice(targetIndex, 0, {
          action: data.action,
          key: data.key,
          delay: data.delay || 50
        });
        renderMacroTimeline();
      }
    });

    // Click to edit delay
    const delayEl = chip.querySelector('.macro-step-delay');
    if (delayEl) {
      delayEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const current = step.delay || 50;
        const entered = prompt('Enter delay in milliseconds (5 - 5000):', current);
        if (entered !== null) {
          const parsed = parseInt(entered, 10);
          if (!isNaN(parsed) && parsed >= 5 && parsed <= 5000) {
            step.delay = parsed;
            renderMacroTimeline();
          }
        }
      });
    }

    // Remove step button
    const removeBtn = chip.querySelector('.btn-remove-step');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        macroState.steps.splice(idx, 1);
        renderMacroTimeline();
      });
    }

    macroTimelineTrack.appendChild(chip);
  });
}

function addMacroStep(action, key, delay = 50) {
  if (!macroState.steps) macroState.steps = [];
  const stepDelay = (typeof delay === 'number' && !isNaN(delay)) ? Math.max(5, Math.round(delay)) : (parseInt(delay, 10) || 50);
  macroState.steps.push({
    action: action || 'Down',
    key: key || '',
    delay: stepDelay
  });
  renderMacroTimeline();
}

function startMacroRecording() {
  if (macroChkStandardDelays) {
    macroState.useStandardDelays = macroChkStandardDelays.checked;
  }
  macroState.isRecording = true;
  if (macroBtnRecordToggle) {
    macroBtnRecordToggle.classList.add('is-recording');
  }
  if (macroBtnRecordText) {
    macroBtnRecordText.textContent = 'STOP RECORDING';
  }
  if (macroStatusText) {
    macroStatusText.textContent = 'Recording live keystrokes...';
  }
  if (macroStatusPill) {
    macroStatusPill.style.color = '#ef4444';
  }
  sendToAhk('startMacroRecording', {
    options: {
      defDelay: macroState.standardDelay,
      realDelays: !macroState.useStandardDelays
    },
    defDelay: macroState.standardDelay,
    realDelays: !macroState.useStandardDelays
  });
}

function stopMacroRecording() {
  macroState.isRecording = false;
  if (macroBtnRecordToggle) {
    macroBtnRecordToggle.classList.remove('is-recording');
  }
  if (macroBtnRecordText) {
    macroBtnRecordText.textContent = 'RECORD';
  }
  if (macroStatusText) {
    macroStatusText.textContent = 'Ready to record';
  }
  if (macroStatusPill) {
    macroStatusPill.style.color = '';
  }
  sendToAhk('stopMacroRecording');
}

function toggleMacroRecording() {
  if (macroState.isRecording) {
    stopMacroRecording();
  } else {
    startMacroRecording();
  }
}

function testCurrentMacro() {
  if (!macroState.steps || macroState.steps.length === 0) {
    showToast('Record or add some steps before testing playback!');
    return;
  }
  sendToAhk('testMacro', {
    macro: {
      steps: macroState.steps,
      playbackMode: 'NoRepeat'
    }
  });
  showToast('Executing macro preview...');
}

function renderMacroRecorder() {
  if (!macroListContainer) return;
  macroListContainer.innerHTML = '';

  if (!state.config.macroRecorder) {
    state.config.macroRecorder = { enabled: true, items: [] };
  }

  if (typeof state.config.macroRecorder.useStandardDelays === 'boolean') {
    macroState.useStandardDelays = state.config.macroRecorder.useStandardDelays;
    if (macroChkStandardDelays) {
      macroChkStandardDelays.checked = macroState.useStandardDelays;
    }
  }

  const items = state.config.macroRecorder.items || [];

  if (macroCountBadge) {
    macroCountBadge.textContent = items.length;
  }

  if (items.length === 0) {
    macroListContainer.innerHTML = `
        <div class="empty-state">
          <span>No macros recorded yet</span>
          <p>Create your first macro above using the live keystroke recorder or mouse click injectors.</p>
        </div>
      `;
    return;
  }

  items.forEach((item, itemIdx) => {
    const isEnabled = (item.enabled !== false && item.enabled !== 0);
    const card = document.createElement('div');
    card.className = `shortcut-card macro-card ${isEnabled ? '' : 'is-disabled'}`;
    card.dataset.id = item.id;
    card.setAttribute('draggable', 'true');
    const stepsCount = (item.steps && Array.isArray(item.steps)) ? item.steps.length : 0;

    let modeTag = 'Once';
    let modeClass = '';
    if (item.playbackMode === 'RepeatWhileHolding') {
      modeTag = 'Hold to Loop';
      modeClass = 'mode-hold';
    } else if (item.playbackMode === 'Toggle') {
      modeTag = 'Toggle Loop';
      modeClass = 'mode-toggle';
    }

    card.innerHTML = `
        <div class="macro-card-info">
          <div class="wm-icon-badge" style="width:36px;height:36px;border-radius:var(--radius-btn);">
            <svg class="wm-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <div class="macro-card-text">
            <div class="macro-card-top">
              <span class="macro-title">${escapeHtml(item.name || 'Untitled Macro')}</span>
              <span class="wm-hotkey-badge ${isEnabled ? '' : 'is-disabled'}">${escapeHtml(item.trigger || 'Unassigned')}</span>
            </div>
            <div class="macro-card-meta">
              <span class="macro-steps-tag">${stepsCount} steps</span>
              <span class="macro-mode-tag ${modeClass}">${modeTag}</span>
              ${(item.playbackMode !== 'NoRepeat' && item.repeatInterval) ? `<span class="macro-steps-tag">${item.repeatInterval}ms int</span>` : ''}
            </div>
          </div>
        </div>

        <div class="card-actions">
          <button class="card-btn btn-test-run" title="Test Run Macro">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
          <button class="card-btn btn-edit" title="Edit Macro">
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="card-btn btn-delete" title="Delete Macro">
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          <div class="toggle-wrapper" title="Enable / Disable Macro">
            <input class="toggle-checkbox macro-switch" type="checkbox" ${isEnabled ? 'checked' : ''}>
            <div class="toggle-container">
              <div class="toggle-button"></div>
            </div>
          </div>
        </div>
      `;

    // Drag reordering for macro cards in list
    card.addEventListener('dragstart', (e) => {
      card.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'macroCard', id: item.id }));
      } catch (err) { }
      e.stopPropagation();
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      if (macroListContainer) {
        macroListContainer.querySelectorAll('.macro-card').forEach(c => {
          c.classList.remove('drag-over-top', 'drag-over-bottom');
        });
      }
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = card.getBoundingClientRect();
      const isBottom = e.clientY > (rect.top + rect.height / 2);
      card.classList.toggle('drag-over-top', !isBottom);
      card.classList.toggle('drag-over-bottom', isBottom);
    });

    card.addEventListener('dragleave', (e) => {
      if (!card.contains(e.relatedTarget)) {
        card.classList.remove('drag-over-top', 'drag-over-bottom');
      }
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over-top', 'drag-over-bottom');
      let data = null;
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) data = JSON.parse(raw);
      } catch (err) { }

      if (data && data.type === 'macroCard' && data.id !== item.id) {
        const items = state.config.macroRecorder.items;
        const fromIdx = items.findIndex(m => m.id === data.id);
        let toIdx = items.findIndex(m => m.id === item.id);
        if (fromIdx !== -1 && toIdx !== -1) {
          const rect = card.getBoundingClientRect();
          if (e.clientY > (rect.top + rect.height / 2)) toIdx++;
          const [moved] = items.splice(fromIdx, 1);
          if (fromIdx < toIdx) toIdx--;
          items.splice(toIdx, 0, moved);
          renderMacroRecorder();
          syncConfig();
        }
      }
    });

    // Test Run
    card.querySelector('.btn-test-run').addEventListener('click', (e) => {
      e.stopPropagation();
      sendToAhk('testMacro', { macro: item });
      showToast(`Running "${item.name}"...`);
    });

    // Edit
    card.querySelector('.btn-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      editMacro(item);
    });

    // Delete
    card.querySelector('.btn-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteMacro(item.id);
    });

    // Toggle Switch
    const sw = card.querySelector('.macro-switch');
    const badge = card.querySelector('.wm-hotkey-badge');
    const iconBadge = card.querySelector('.wm-icon-badge');
    if (iconBadge) {
      iconBadge.classList.toggle('is-disabled', !isEnabled);
    }
    sw.addEventListener('change', () => {
      const isChecked = sw.checked;
      item.enabled = isChecked ? 1 : 0;
      card.classList.toggle('is-disabled', !isChecked);
      if (badge) badge.classList.toggle('is-disabled', !isChecked);
      if (iconBadge) iconBadge.classList.toggle('is-disabled', !isChecked);
      syncConfig();
    });

    card.addEventListener('click', (e) => {
      if (
        e.target.closest('.card-btn') ||
        e.target.closest('.toggle-wrapper') ||
        card.classList.contains('is-dragging')
      ) return;
      sw.checked = !sw.checked;
      sw.dispatchEvent(new Event('change'));
    });

    macroListContainer.appendChild(card);
  });
}

function submitMacro() {
  try {
    const name = macroInputName ? macroInputName.value.trim() : '';
    const trig = macroInputTrigger ? macroInputTrigger.value.trim() : '';
    const interval = macroInputInterval ? parseInt(macroInputInterval.value, 10) || 50 : 50;

    if (!name) {
      if (macroInputName) macroInputName.focus();
      showToast('Please enter a name for the macro');
      return;
    }
    if (!trig) {
      if (macroInputTrigger) macroInputTrigger.focus();
      showToast('Please record a trigger hotkey');
      return;
    }
    if (!macroState.steps || macroState.steps.length === 0) {
      showToast('Please record or add at least one step in the sequence');
      return;
    }

    if (!state.config.macroRecorder) {
      state.config.macroRecorder = { enabled: 1, items: [] };
    }
    if (!Array.isArray(state.config.macroRecorder.items)) {
      state.config.macroRecorder.items = [];
    }

    if (macroState.editingId) {
      const idx = state.config.macroRecorder.items.findIndex(m => m.id === macroState.editingId);
      if (idx !== -1) {
        state.config.macroRecorder.items[idx] = {
          ...state.config.macroRecorder.items[idx],
          name: name,
          trigger: trig,
          playbackMode: macroState.playbackMode,
          repeatInterval: interval,
          steps: JSON.parse(JSON.stringify(macroState.steps))
        };
        updateItemAcrossProfiles('macroRecorder', state.config.macroRecorder.items[idx]);
      }
      macroState.editingId = null;
      if (macroBtnSubmitText) macroBtnSubmitText.textContent = 'ADD';
      showToast(`Updated macro "${name}"`);
    } else {
      const newMacro = {
        id: 'macro-' + Date.now(),
        name: name,
        trigger: trig,
        playbackMode: macroState.playbackMode,
        repeatInterval: interval,
        enabled: 1,
        steps: JSON.parse(JSON.stringify(macroState.steps))
      };
      state.config.macroRecorder.items.unshift(newMacro);
      addItemAcrossProfiles('macroRecorder', newMacro);
      showToast(`Created macro "${name}"`);
    }

    if (macroInputName) macroInputName.value = '';
    if (macroInputTrigger) {
      macroInputTrigger.value = '';
      macroInputTrigger.placeholder = 'Click to record...';
    }
    if (macroBtnClearTrigger) macroBtnClearTrigger.classList.add('hidden-field');
    macroState.steps = [];
    renderMacroTimeline();
    renderMacroRecorder();
    syncConfig();
  } catch (err) {
    console.error('Error submitting macro:', err);
    showToast('Error saving macro: ' + err.message, 'error');
  }
}

function editMacro(item) {
  macroState.editingId = item.id;
  if (macroInputName) macroInputName.value = item.name || '';
  if (macroInputTrigger) {
    macroInputTrigger.value = item.trigger || '';
    if (macroBtnClearTrigger) macroBtnClearTrigger.classList.remove('hidden-field');
  }
  if (macroInputInterval) {
    macroInputInterval.value = item.repeatInterval || 50;
  }

  setMacroPlaybackMode(item.playbackMode || 'NoRepeat');

  macroState.steps = (item.steps && Array.isArray(item.steps)) ? JSON.parse(JSON.stringify(item.steps)) : [];
  renderMacroTimeline();

  if (macroBtnSubmitText) macroBtnSubmitText.textContent = 'SAVE';
  if (macroInputName) macroInputName.focus();
  showToast(`Editing "${item.name}"`);
}

function deleteMacro(id) {
  if (!state.config.macroRecorder) return;
  deleteItemAcrossProfiles('macroRecorder', id);
  state.config.macroRecorder.items = state.config.macroRecorder.items.filter(m => m.id !== id);
  if (macroState.editingId === id) {
    macroState.editingId = null;
    if (macroBtnSubmitText) macroBtnSubmitText.textContent = 'ADD';
  }
  renderMacroRecorder();
  syncConfig();
  showToast('Macro deleted');
}

function setMacroPlaybackMode(mode) {
  macroState.playbackMode = mode;
  if (macroModeSelector) {
    macroModeSelector.querySelectorAll('.macro-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }
  if (macroIntervalBox) {
    macroIntervalBox.classList.toggle('is-hidden', mode === 'NoRepeat');
  }
}

function initMacroRecorder() {
  setupKeyCombinationBox(macroTriggerBox, macroInputTrigger, macroBtnClearTrigger, null, submitMacro);

  if (macroInputName) {
    macroInputName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (macroInputTrigger && !macroInputTrigger.value.trim()) {
          if (macroTriggerBox) macroTriggerBox.click();
        } else {
          submitMacro();
        }
      }
    });
  }

  if (macroModeSelector) {
    macroModeSelector.querySelectorAll('.macro-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setMacroPlaybackMode(btn.dataset.mode);
      });
    });
  }

  if (macroInputInterval) {
    macroInputInterval.addEventListener('input', () => {
      const val = parseInt(macroInputInterval.value, 10);
      if (!isNaN(val)) macroState.repeatInterval = Math.max(5, val);
    });
  }

  if (macroChkStandardDelays) {
    macroChkStandardDelays.addEventListener('change', () => {
      macroState.useStandardDelays = macroChkStandardDelays.checked;
      if (!state.config.macroRecorder) {
        state.config.macroRecorder = { enabled: true, items: [] };
      }
      state.config.macroRecorder.useStandardDelays = macroChkStandardDelays.checked;
      syncConfig();
      sendToAhk('setMacroRecordingOptions', {
        defDelay: macroState.standardDelay,
        realDelays: !macroState.useStandardDelays
      });
    });
  }

  if (macroBtnSubmit) {
    macroBtnSubmit.addEventListener('click', submitMacro);
  }

  if (macroBtnRecordToggle) {
    macroBtnRecordToggle.addEventListener('click', toggleMacroRecording);
  }

  // Quick Action Injectors with Click & Drag-and-Drop
  function wireInjectButton(btn, action, key, delay = 50) {
    if (!btn) return;
    btn.setAttribute('draggable', 'true');
    btn.addEventListener('click', () => {
      addMacroStep(action, key, delay);
    });
    btn.addEventListener('dragstart', (e) => {
      macroDragSourceIndex = null;
      macroDragInjectItem = { type: 'inject', action, key, delay };
      btn.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'copyMove';
      try {
        e.dataTransfer.setData('text/plain', JSON.stringify(macroDragInjectItem));
      } catch (err) { }
      e.stopPropagation();
    });
    btn.addEventListener('dragend', () => {
      btn.classList.remove('is-dragging');
      macroDragInjectItem = null;
    });
  }

  wireInjectButton(macroBtnAddLClick, 'Click', 'LButton', 50);
  wireInjectButton(macroBtnAddRClick, 'Click', 'RButton', 50);
  wireInjectButton(macroBtnAddMClick, 'Click', 'MButton', 50);
  wireInjectButton(macroBtnAddDelay, 'Delay', 'Sleep', 50);

  // Timeline track drop zone for empty background drops
  if (macroTimelineTrack) {
    macroTimelineTrack.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      macroTimelineTrack.classList.add('track-drag-over');
    });

    macroTimelineTrack.addEventListener('dragleave', (e) => {
      if (!macroTimelineTrack.contains(e.relatedTarget)) {
        macroTimelineTrack.classList.remove('track-drag-over');
      }
    });

    macroTimelineTrack.addEventListener('drop', (e) => {
      macroTimelineTrack.classList.remove('track-drag-over');
      if (e.target === macroTimelineTrack || e.target.classList.contains('macro-timeline-empty')) {
        e.preventDefault();
        let data = null;
        try {
          const raw = e.dataTransfer.getData('text/plain');
          if (raw) data = JSON.parse(raw);
        } catch (err) { }

        if (!data) {
          if (macroDragSourceIndex !== null) data = { type: 'reorder', fromIndex: macroDragSourceIndex };
          else if (macroDragInjectItem) data = macroDragInjectItem;
        }

        if (data && data.type === 'reorder') {
          const fromIdx = data.fromIndex;
          if (fromIdx !== undefined && fromIdx !== null && fromIdx < macroState.steps.length) {
            const [movedStep] = macroState.steps.splice(fromIdx, 1);
            macroState.steps.push(movedStep);
            renderMacroTimeline();
          }
        } else if (data && data.type === 'inject') {
          addMacroStep(data.action, data.key, data.delay || 50);
        }
      }
    });
  }

  if (macroBtnTestPlay) {
    macroBtnTestPlay.addEventListener('click', testCurrentMacro);
  }
  if (macroBtnClearSteps) {
    macroBtnClearSteps.addEventListener('click', () => {
      macroState.steps = [];
      renderMacroTimeline();
    });
  }

  setMacroPlaybackMode('NoRepeat');
  renderMacroTimeline();
  renderMacroRecorder();
}

// ============================================================================
// Master Engine Switch & Indicators
// ============================================================================

function toggleMasterEngine() {
  state.enabled = !state.enabled;
  updateSwitchUi();
  syncConfig();
}

  function updateSwitchUi() {
    if (state.enabled) {
      if (mainEngineSwitch) {
        mainEngineSwitch.classList.remove('is-off');
        mainEngineSwitch.classList.add('is-on');
      }
      if (switchCaptionText) switchCaptionText.textContent = 'ACTIVE';
      if (statusSubtitle) statusSubtitle.innerHTML = 'Engine: <span class="status-indicator-text online">Active</span>';
    } else {
      if (mainEngineSwitch) {
        mainEngineSwitch.classList.remove('is-on');
        mainEngineSwitch.classList.add('is-off');
      }
      if (switchCaptionText) switchCaptionText.textContent = 'SUSPENDED';
      if (statusSubtitle) statusSubtitle.innerHTML = 'Engine: <span class="status-indicator-text offline">Suspended</span>';
    }
  }

  function updateGlobalIndicators() {
    let totalItems = 0;
    const isEngActive = state.enabled && state.config && state.config.enabled !== false && state.config.enabled !== 0;

    if (isEngActive && state.config) {
      if (state.config.textExpander && state.config.textExpander.enabled !== false && state.config.textExpander.items) {
        totalItems += state.config.textExpander.items.filter(i => i.enabled !== false && i.enabled !== 0).length;
      }
      if (state.config.keyRemapper && state.config.keyRemapper.enabled !== false && state.config.keyRemapper.items) {
        totalItems += state.config.keyRemapper.items.filter(i => i.enabled !== false && i.enabled !== 0).length;
      }
      if (state.config.appLauncher && state.config.appLauncher.enabled !== false && state.config.appLauncher.items) {
        totalItems += state.config.appLauncher.items.filter(i => i.enabled !== false && i.enabled !== 0).length;
      }
      if (state.config.macroRecorder && state.config.macroRecorder.enabled !== false && state.config.macroRecorder.items) {
        totalItems += state.config.macroRecorder.items.filter(i => i.enabled !== false && i.enabled !== 0).length;
      }
      if (state.config.windowManager && state.config.windowManager.enabled !== false) {
        const wm = state.config.windowManager;
        const wmKeys = ['alwaysOnTopEnabled', 'centerWindowEnabled', 'hideWindowEnabled', 'borderlessEnabled', 'windowShadeEnabled', 'appVolumeWheel', 'appVolumeMuteEnabled', 'transparencyWheel', 'clickThroughGhost'];
        for (const k of wmKeys) {
          if (wm[k] === 1 || wm[k] === true) totalItems++;
        }
      }
    }

    if (activeCountBadge) {
      activeCountBadge.textContent = totalItems;
    }

    if (gaugeCircle) {
      const maxItems = 15;
      const progress = Math.min(totalItems / maxItems, 1);
      const circumference = 150.79;
      const offset = circumference - (progress * circumference * 0.75);
      gaugeCircle.style.strokeDashoffset = offset;
    }
  }

        // ============================================================================
        // Theme Engine (Primary Background & Secondary Elements Colors)
        // ============================================================================
        // Theme Engine (Primary Background & Secondary Elements Colors)
        // ============================================================================

        function hexToRgb(hex) {
          let c = hex.replace('#', '').trim();
          if (c.length === 3) c = c.split('').map(x => x + x).join('');
          const num = parseInt(c, 16);
          return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
          };
        }

        function rgbToHex(r, g, b) {
          const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
          return '#' + [clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('');
        }

        function hexToHsl(hex) {
          let c = hex.replace('#', '').trim();
          if (c.length === 3) c = c.split('').map(x => x + x).join('');
          const r = parseInt(c.substring(0, 2), 16) / 255;
          const g = parseInt(c.substring(2, 4), 16) / 255;
          const b = parseInt(c.substring(4, 6), 16) / 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          let h, s, l = (max + min) / 2;
          if (max === min) {
            h = s = 0;
          } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
          }
          return { h, s, l };
        }

        function hslToHex(h, s, l) {
          l = Math.max(0, Math.min(1, l));
          s = Math.max(0, Math.min(1, s));
          let r, g, b;
          if (s === 0) {
            r = g = b = l;
          } else {
            function hue2rgb(p, q, t) {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1 / 6) return p + (q - p) * 6 * t;
              if (t < 1 / 2) return q;
              if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
              return p;
            }
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
          }
          const toHex = x => {
            const hex = Math.round(Math.max(0, Math.min(255, x * 255))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          };
          return '#' + toHex(r) + toHex(g) + toHex(b);
        }

        // Hand-crafted Neumorphic Theme Presets with balanced light/dark shadows, varied radii & high contrast
        // Hand-crafted Neumorphic Theme Presets: Rich, diverse, colorful clay base palettes (28 modern palettes)
        const THEME_PRESETS = {
          'ocean-azure': {
            name: 'Ocean Azure',
            bgColor: '#1e3a5f',
            accentColor: '#38bdf8',
            radius: 14,
            distance: 3,
            lightIntensity: 20,
            darkIntensity: 30,
            blur: 8
          },
          'forest-emerald': {
            name: 'Forest Emerald',
            bgColor: '#1b4332',
            accentColor: '#52b788',
            radius: 10,
            distance: 3,
            lightIntensity: 20,
            darkIntensity: 30,
            blur: 7
          },
          'sunset-terracotta': {
            name: 'Sunset Terracotta',
            bgColor: '#8c3a27',
            accentColor: '#fcd34d',
            radius: 12,
            distance: 3,
            lightIntensity: 22,
            darkIntensity: 28,
            blur: 8
          },
          'royal-violet': {
            name: 'Royal Violet',
            bgColor: '#442759',
            accentColor: '#f472b6',
            radius: 16,
            distance: 4,
            lightIntensity: 20,
            darkIntensity: 32,
            blur: 9
          },
          'laguna-teal': {
            name: 'Laguna Teal',
            bgColor: '#134e4a',
            accentColor: '#2dd4bf',
            radius: 12,
            distance: 3,
            lightIntensity: 20,
            darkIntensity: 30,
            blur: 8
          },
          'desert-caramel': {
            name: 'Desert Caramel',
            bgColor: '#c68b59',
            accentColor: '#451a03',
            radius: 8,
            distance: 3,
            lightIntensity: 25,
            darkIntensity: 22,
            blur: 7
          },
          'vintage-rose': {
            name: 'Vintage Rose',
            bgColor: '#b85d68',
            accentColor: '#ffe4e6',
            radius: 14,
            distance: 3,
            lightIntensity: 22,
            darkIntensity: 24,
            blur: 8
          },
          'nordic-slate': {
            name: 'Nordic Slate',
            bgColor: '#334155',
            accentColor: '#60a5fa',
            radius: 10,
            distance: 3,
            lightIntensity: 20,
            darkIntensity: 28,
            blur: 8
          },
          'soft-gray': {
            name: 'Warm Clay (Default)',
            bgColor: '#e8dfd5',
            accentColor: '#d97706',
            radius: 5,
            distance: 3,
            lightIntensity: 22,
            darkIntensity: 14,
            blur: 10
          },
          'sage-mint': {
            name: 'Sage Mint',
            bgColor: '#c8d6c0',
            accentColor: '#166534',
            radius: 18,
            distance: 3,
            lightIntensity: 24,
            darkIntensity: 18,
            blur: 7
          },
          'retro-sharp': {
            name: 'Retro Paper',
            bgColor: '#f2efe9',
            accentColor: '#e11d48',
            radius: 4,
            distance: 3,
            lightIntensity: 50,
            darkIntensity: 16,
            blur: 0
          },
          'midnight-onyx': {
            name: 'Midnight Onyx',
            bgColor: '#18181b',
            accentColor: '#a855f7',
            radius: 12,
            distance: 3,
            lightIntensity: 16,
            darkIntensity: 45,
            blur: 7
          },
          'tokyo-night': {
            name: 'Tokyo Night',
            bgColor: '#1a1b26',
            accentColor: '#7aa2f7',
            radius: 12,
            distance: 3,
            lightIntensity: 18,
            darkIntensity: 38,
            blur: 8
          },
          'catppuccin-mocha': {
            name: 'Catppuccin Mocha',
            bgColor: '#1e1e2e',
            accentColor: '#cba6f7',
            radius: 14,
            distance: 3,
            lightIntensity: 20,
            darkIntensity: 35,
            blur: 8
          },
          'dracula-classic': {
            name: 'Dracula Classic',
            bgColor: '#282a36',
            accentColor: '#ff79c6',
            radius: 10,
            distance: 3,
            lightIntensity: 20,
            darkIntensity: 32,
            blur: 7
          },
          'cyberpunk-neon': {
            name: 'Cyberpunk Neon',
            bgColor: '#12131a',
            accentColor: '#fcee0a',
            radius: 6,
            distance: 3,
            lightIntensity: 15,
            darkIntensity: 45,
            blur: 6
          },
          'synthwave-sunset': {
            name: 'Synthwave Sunset',
            bgColor: '#262335',
            accentColor: '#ff7b00',
            radius: 14,
            distance: 4,
            lightIntensity: 20,
            darkIntensity: 32,
            blur: 9
          },
          'matcha-cream': {
            name: 'Matcha Cream',
            bgColor: '#dbe4d2',
            accentColor: '#3f5622',
            radius: 16,
            distance: 3,
            lightIntensity: 26,
            darkIntensity: 18,
            blur: 8
          },
          'peach-fuzz': {
            name: 'Peach Fuzz',
            bgColor: '#fed7aa',
            accentColor: '#c2410c',
            radius: 16,
            distance: 3,
            lightIntensity: 28,
            darkIntensity: 16,
            blur: 7
          },
          'lavender-dream': {
            name: 'Lavender Dream',
            bgColor: '#e2d9f3',
            accentColor: '#6b21a8',
            radius: 14,
            distance: 3,
            lightIntensity: 28,
            darkIntensity: 18,
            blur: 8
          },
          'electric-cobalt': {
            name: 'Electric Cobalt',
            bgColor: '#1d3557',
            accentColor: '#34d399',
            radius: 10,
            distance: 3,
            lightIntensity: 20,
            darkIntensity: 30,
            blur: 8
          },
          'espresso-mocha': {
            name: 'Espresso Mocha',
            bgColor: '#2b1d14',
            accentColor: '#f59e0b',
            radius: 10,
            distance: 3,
            lightIntensity: 18,
            darkIntensity: 36,
            blur: 7
          },
          'sakura-blossom': {
            name: 'Sakura Blossom',
            bgColor: '#fce7f3',
            accentColor: '#be123c',
            radius: 18,
            distance: 3,
            lightIntensity: 30,
            darkIntensity: 14,
            blur: 8
          },
          'nord-frost': {
            name: 'Nord Frost',
            bgColor: '#e5e9f0',
            accentColor: '#5e81ac',
            radius: 8,
            distance: 3,
            lightIntensity: 32,
            darkIntensity: 16,
            blur: 7
          },
          'solarized-cream': {
            name: 'Solarized Cream',
            bgColor: '#fdf6e3',
            accentColor: '#b58900',
            radius: 6,
            distance: 3,
            lightIntensity: 32,
            darkIntensity: 14,
            blur: 6
          },
          'matrix-terminal': {
            name: 'Matrix Terminal',
            bgColor: '#0f1712',
            accentColor: '#22c55e',
            radius: 4,
            distance: 3,
            lightIntensity: 14,
            darkIntensity: 46,
            blur: 6
          },
          'monokai-charcoal': {
            name: 'Monokai Charcoal',
            bgColor: '#2d2a2e',
            accentColor: '#ffd866',
            radius: 10,
            distance: 3,
            lightIntensity: 18,
            darkIntensity: 34,
            blur: 7
          },
          'aqua-marine': {
            name: 'Aqua Marine',
            bgColor: '#cffafe',
            accentColor: '#0369a1',
            radius: 16,
            distance: 3,
            lightIntensity: 30,
            darkIntensity: 16,
            blur: 8
          },
          'custom-default': {
            name: 'Warm Clay (Default)',
            bgColor: '#e8dfd5',
            accentColor: '#d97706',
            radius: 5,
            distance: 3,
            lightIntensity: 22,
            darkIntensity: 6,
            blur: 10
          },
          'brutalist-amber': {
            name: 'Brutalist Amber',
            bgColor: '#f59e0b',
            accentColor: '#1e1b4b',
            radius: 2,
            distance: 6,
            lightIntensity: 65,
            darkIntensity: 75,
            blur: 0
          },
          'marshmallow-indigo': {
            name: 'Marshmallow Indigo',
            bgColor: '#4f46e5',
            accentColor: '#fde047',
            radius: 42,
            distance: 8,
            lightIntensity: 40,
            darkIntensity: 48,
            blur: 18
          },
          'porcelain-ceramic': {
            name: 'Porcelain Ceramic',
            bgColor: '#f1f5f9',
            accentColor: '#2563eb',
            radius: 28,
            distance: 7,
            lightIntensity: 85,
            darkIntensity: 20,
            blur: 16
          },
          'solar-tangerine': {
            name: 'Solar Tangerine',
            bgColor: '#ea580c',
            accentColor: '#fef08a',
            radius: 34,
            distance: 5,
            lightIntensity: 38,
            darkIntensity: 42,
            blur: 12
          },
          'matrix-terminal': {
            name: 'Matrix CRT',
            bgColor: '#052e16',
            accentColor: '#22c55e',
            radius: 4,
            distance: 2,
            lightIntensity: 40,
            darkIntensity: 70,
            blur: 2
          },
          'cyber-cyan': {
            name: 'Cyber Cyan',
            bgColor: '#0891b2',
            accentColor: '#fef08a',
            radius: 18,
            distance: 4,
            lightIntensity: 35,
            darkIntensity: 32,
            blur: 6
          },
          'brutalist-concrete': {
            name: 'Brutalist Concrete',
            bgColor: '#78716c',
            accentColor: '#f97316',
            radius: 3,
            distance: 5,
            lightIntensity: 50,
            darkIntensity: 60,
            blur: 1
          },
          'midnight-violet': {
            name: 'Midnight Violet',
            bgColor: '#3b0764',
            accentColor: '#f43f5e',
            radius: 24,
            distance: 6,
            lightIntensity: 32,
            darkIntensity: 65,
            blur: 14
          },
          'spearmint-gelato': {
            name: 'Spearmint Gelato',
            bgColor: '#6ee7b7',
            accentColor: '#831843',
            radius: 38,
            distance: 6,
            lightIntensity: 48,
            darkIntensity: 28,
            blur: 14
          },
          'garnet-obsidian': {
            name: 'Garnet Obsidian',
            bgColor: '#450a0a',
            accentColor: '#fb7185',
            radius: 8,
            distance: 4,
            lightIntensity: 24,
            darkIntensity: 70,
            blur: 9
          },
          'abyssal-ocean': {
            name: 'Abyssal Ocean',
            bgColor: '#0e2a47',
            accentColor: '#38bdf8',
            radius: 16,
            distance: 4,
            lightIntensity: 22,
            darkIntensity: 55,
            blur: 10
          },
          'roasted-cocoa': {
            name: 'Roasted Cocoa',
            bgColor: '#351c14',
            accentColor: '#fbbf24',
            radius: 10,
            distance: 3,
            lightIntensity: 22,
            darkIntensity: 60,
            blur: 5
          },
          'bubblegum-magenta': {
            name: 'Bubblegum Magenta',
            bgColor: '#db2777',
            accentColor: '#fef08a',
            radius: 30,
            distance: 7,
            lightIntensity: 42,
            darkIntensity: 38,
            blur: 15
          },
          'lilac-cloud': {
            name: 'Lilac Cloud',
            bgColor: '#c4b5fd',
            accentColor: '#4c1d95',
            radius: 22,
            distance: 4,
            lightIntensity: 36,
            darkIntensity: 22,
            blur: 11
          },
          'matte-titanium': {
            name: 'Matte Titanium',
            bgColor: '#1e293b',
            accentColor: '#06b6d4',
            radius: 12,
            distance: 3,
            lightIntensity: 22,
            darkIntensity: 45,
            blur: 7
          }
        };

      function deriveRealisticShadows(bgColor, lightIntensity = 20, darkIntensity = 20) {
        const rgb = hexToRgb(bgColor);
        const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255.0;

        // Realistic specular light highlight (blended with pure white)
        let lFactor;
        if (lum < 0.25) {
          lFactor = (lightIntensity / 100.0) * 0.45;
        } else if (lum < 0.55) {
          lFactor = (lightIntensity / 100.0) * 0.65;
        } else {
          lFactor = (lightIntensity / 100.0) * 0.95;
        }
        lFactor = Math.min(0.95, Math.max(0.03, lFactor));

        const lightR = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * lFactor));
        const lightG = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * lFactor));
        const lightB = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * lFactor));

        // Realistic ambient occlusion shadow (blended with pure black)
        let dFactor;
        if (lum < 0.25) {
          dFactor = (darkIntensity / 100.0) * 0.75;
        } else if (lum < 0.55) {
          dFactor = (darkIntensity / 100.0) * 0.95;
        } else {
          dFactor = (darkIntensity / 100.0) * 1.15;
        }
        dFactor = Math.min(0.95, Math.max(0.03, dFactor));

        const darkR = Math.max(0, Math.round(rgb.r * (1.0 - dFactor)));
        const darkG = Math.max(0, Math.round(rgb.g * (1.0 - dFactor)));
        const darkB = Math.max(0, Math.round(rgb.b * (1.0 - dFactor)));

        const deepFactor = Math.min(0.98, dFactor * 1.35);
        const deepR = Math.max(0, Math.round(rgb.r * (1.0 - deepFactor)));
        const deepG = Math.max(0, Math.round(rgb.g * (1.0 - deepFactor)));
        const deepB = Math.max(0, Math.round(rgb.b * (1.0 - deepFactor)));

        return {
          shadowLight: rgbToHex(lightR, lightG, lightB),
          shadowDark: rgbToHex(darkR, darkG, darkB),
          shadowDarkDeep: rgbToHex(deepR, deepG, deepB)
        };
      }

      function computePresetShadow(bgColor, lightIntensity = 20, darkIntensity = 20, distance = 3, blur = 8) {
        const d = Math.max(2, Math.round(distance * 0.75));
        const b = blur;
        const darkAlpha = Math.min(0.55, Math.max(0.12, (darkIntensity / 100.0) * 1.1));
        const lightAlpha = Math.min(0.65, Math.max(0.10, (lightIntensity / 100.0) * 1.1));
        if (blur === 0) {
          return `${d}px ${d}px 0px rgba(0, 0, 0, ${darkAlpha.toFixed(2)}), -${d}px -${d}px 0px rgba(255, 255, 255, ${lightAlpha.toFixed(2)})`;
        }
        return `${d}px ${d}px ${b}px rgba(0, 0, 0, ${darkAlpha.toFixed(2)}), -${d}px -${d}px ${b}px rgba(255, 255, 255, ${lightAlpha.toFixed(2)})`;
      }

      function lightenHex(hex, percent) {
        const rgb = hexToRgb(hex);
        const factor = percent / 100;
        return rgbToHex(
          rgb.r + (255 - rgb.r) * factor,
          rgb.g + (255 - rgb.g) * factor,
          rgb.b + (255 - rgb.b) * factor
        );
      }

      function darkenHex(hex, percent) {
        const rgb = hexToRgb(hex);
        const factor = 1 - (percent / 100);
        return rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
      }

      function getLuminance(r, g, b) {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      }

      function getContrastRatio(lum1, lum2) {
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      function deriveHarmonicTypography(bgHex) {
        const rgb = hexToRgb(bgHex);
        const bgLum = getLuminance(rgb.r, rgb.g, rgb.b);
        const hsl = hexToHsl(bgHex);

        const contrastWhite = (1.0 + 0.05) / (bgLum + 0.05);
        const contrastBlack = (bgLum + 0.05) / (0.0 + 0.05);

        // Harmonic undertone saturation (keeps text naturally keyed to the base clay)
        const harmSat = Math.min(0.22, Math.max(0.06, hsl.s * 0.45));
        const useDarkText = contrastBlack >= contrastWhite;

        let textPrimary, textSecondary, textMuted, textDisabled;

        if (useDarkText) {
          // Dark text mode (on light, beige, caramel, mint backgrounds)
          textPrimary = hslToHex(hsl.h, harmSat, 0.09);

          // Search lightness for secondary text (minimum contrast 5.5:1)
          let secL = 0.09;
          for (let l = 12; l <= 45; l++) {
            const testHex = hslToHex(hsl.h, harmSat, l / 100);
            const testRgb = hexToRgb(testHex);
            const testLum = getLuminance(testRgb.r, testRgb.g, testRgb.b);
            if (getContrastRatio(bgLum, testLum) >= 5.5) {
              secL = l / 100;
            } else {
              break;
            }
          }
          textSecondary = hslToHex(hsl.h, harmSat, secL);

          // Search lightness for muted text (guaranteed WCAG AA >= 4.5:1)
          let mutedL = secL;
          for (let l = Math.round(secL * 100); l <= 55; l++) {
            const testHex = hslToHex(hsl.h, harmSat, l / 100);
            const testRgb = hexToRgb(testHex);
            const testLum = getLuminance(testRgb.r, testRgb.g, testRgb.b);
            if (getContrastRatio(bgLum, testLum) >= 4.5) {
              mutedL = l / 100;
            } else {
              break;
            }
          }
          textMuted = hslToHex(hsl.h, harmSat, mutedL);

          // Search lightness for disabled text (minimum contrast 2.4:1)
          let disL = mutedL;
          for (let l = Math.round(mutedL * 100); l <= 75; l++) {
            const testHex = hslToHex(hsl.h, harmSat, l / 100);
            const testRgb = hexToRgb(testHex);
            const testLum = getLuminance(testRgb.r, testRgb.g, testRgb.b);
            if (getContrastRatio(bgLum, testLum) >= 2.4) {
              disL = l / 100;
            } else {
              break;
            }
          }
          textDisabled = hslToHex(hsl.h, harmSat, disL);
        } else {
          // Light text mode (on dark, navy, emerald, terracotta, violet backgrounds)
          textPrimary = hslToHex(hsl.h, harmSat * 0.5, 0.96);

          // Search lightness for secondary text (minimum contrast 5.5:1)
          let secL = 0.96;
          for (let l = 92; l >= 50; l--) {
            const testHex = hslToHex(hsl.h, harmSat, l / 100);
            const testRgb = hexToRgb(testHex);
            const testLum = getLuminance(testRgb.r, testRgb.g, testRgb.b);
            if (getContrastRatio(bgLum, testLum) >= 5.5) {
              secL = l / 100;
            } else {
              break;
            }
          }
          textSecondary = hslToHex(hsl.h, harmSat, secL);

          // Search lightness for muted text (guaranteed WCAG AA >= 4.5:1)
          let mutedL = secL;
          for (let l = Math.round(secL * 100); l >= 40; l--) {
            const testHex = hslToHex(hsl.h, harmSat, l / 100);
            const testRgb = hexToRgb(testHex);
            const testLum = getLuminance(testRgb.r, testRgb.g, testRgb.b);
            if (getContrastRatio(bgLum, testLum) >= 4.5) {
              mutedL = l / 100;
            } else {
              break;
            }
          }
          textMuted = hslToHex(hsl.h, harmSat, mutedL);

          // Search lightness for disabled text (minimum contrast 2.4:1)
          let disL = mutedL;
          for (let l = Math.round(mutedL * 100); l >= 20; l--) {
            const testHex = hslToHex(hsl.h, harmSat, l / 100);
            const testRgb = hexToRgb(testHex);
            const testLum = getLuminance(testRgb.r, testRgb.g, testRgb.b);
            if (getContrastRatio(bgLum, testLum) >= 2.4) {
              disL = l / 100;
            } else {
              break;
            }
          }
          textDisabled = hslToHex(hsl.h, harmSat, disL);
        }

        return {
          textPrimary,
          textSecondary,
          textMuted,
          textDisabled
        };
      }

      function applyTheme(bgColor, accentColor, save = false, neo = null) {
        if (!bgColor) bgColor = '#e8dfd5';
        if (!accentColor) accentColor = '#d97706';
        if (!bgColor.startsWith('#')) bgColor = '#' + bgColor;
        if (!accentColor.startsWith('#')) accentColor = '#' + accentColor;

        // Resolve Neumorphism Parameters (Radius, Distance, Light/Dark Intensity, Blur)
        const radius = (neo && typeof neo.radius !== 'undefined')
          ? parseInt(neo.radius, 10)
          : ((state.config && state.config.theme && typeof state.config.theme.radius !== 'undefined') ? parseInt(state.config.theme.radius, 10) : 5);

        const distance = (neo && typeof neo.distance !== 'undefined')
          ? parseInt(neo.distance, 10)
          : ((state.config && state.config.theme && typeof state.config.theme.distance !== 'undefined') ? parseInt(state.config.theme.distance, 10) : 3);

        const lightIntensity = (neo && typeof neo.lightIntensity !== 'undefined')
          ? parseInt(neo.lightIntensity, 10)
          : ((state.config && state.config.theme && typeof state.config.theme.lightIntensity !== 'undefined')
            ? parseInt(state.config.theme.lightIntensity, 10)
            : ((state.config && state.config.theme && typeof state.config.theme.intensity !== 'undefined')
              ? parseInt(state.config.theme.intensity, 10) : 22));

        const darkIntensity = (neo && typeof neo.darkIntensity !== 'undefined')
          ? parseInt(neo.darkIntensity, 10)
          : ((state.config && state.config.theme && typeof state.config.theme.darkIntensity !== 'undefined')
            ? parseInt(state.config.theme.darkIntensity, 10)
            : ((state.config && state.config.theme && typeof state.config.theme.intensity !== 'undefined')
              ? parseInt(state.config.theme.intensity, 10) : 6));

        const blur = (neo && typeof neo.blur !== 'undefined')
          ? parseInt(neo.blur, 10)
          : ((state.config && state.config.theme && typeof state.config.theme.blur !== 'undefined') ? parseInt(state.config.theme.blur, 10) : 10);

        const avgIntensity = Math.round((lightIntensity + darkIntensity) / 2);

        // Compute Chromatic Shadows: exact lighter tint for top and darker shade for bottom
        const chromatic = deriveRealisticShadows(bgColor, lightIntensity, darkIntensity);
        const shadowLight = chromatic.shadowLight;
        const shadowDark = chromatic.shadowDark;
        const shadowDarkDeep = chromatic.shadowDarkDeep;

        // Dynamic WCAG-compliant harmonic typography system (guaranteed >= 4.5:1 contrast)
        const typography = deriveHarmonicTypography(bgColor);
        const textPrimary = typography.textPrimary;
        const textSecondary = typography.textSecondary;
        const textMuted = typography.textMuted;
        const textDisabled = typography.textDisabled;

        // Derived accent color shades
        const accRgb = hexToRgb(accentColor);
        const accLight = lightenHex(accentColor, 20);
        const accPastel = lightenHex(accentColor, 45);
        const accSuperPastel = lightenHex(accentColor, 60);
        const accDark = darkenHex(accentColor, 18);
        const accDeep = darkenHex(accentColor, 35);
        const deepRgb = hexToRgb(accDeep);

        const accGlow = `0 4px 16px rgba(${accRgb.r}, ${accRgb.g}, ${accRgb.b}, 0.45)`;
        const accGradient = `linear-gradient(135deg, ${accLight} 0%, ${accentColor} 100%)`;
        const accTroughGrad = accentColor;
        const accTroughShadow = `inset 0 2px 4px rgba(0, 0, 0, 0.35), 0 0 10px ${accentColor}`;

        const root = document.documentElement;
        root.style.setProperty('--bg-color', bgColor);
        root.style.setProperty('--surface-color', bgColor);
        root.style.setProperty('--shadow-light', shadowLight);
        root.style.setProperty('--shadow-dark', shadowDark);
        root.style.setProperty('--shadow-dark-deep', shadowDarkDeep);
        root.style.setProperty('--text-primary', textPrimary);
        root.style.setProperty('--text-secondary', textSecondary);
        root.style.setProperty('--text-muted', textMuted);
        root.style.setProperty('--text-disabled', textDisabled);

        root.style.setProperty('--accent-primary', accentColor);
        root.style.setProperty('--accent-light', accLight);
        root.style.setProperty('--accent-pastel', accPastel);
        root.style.setProperty('--accent-dark', accDark);
        root.style.setProperty('--accent-deep', accDeep);
        root.style.setProperty('--accent-glow', accGlow);
        root.style.setProperty('--accent-gradient', accGradient);
        root.style.setProperty('--accent-trough-gradient', accTroughGrad);
        root.style.setProperty('--accent-trough-shadow', accTroughShadow);

        // Apply dynamic Neumorphism core parameters
        root.style.setProperty('--neo-radius', `${radius}px`);
        root.style.setProperty('--neo-dist', `${distance}px`);
        root.style.setProperty('--neo-blur', `${blur}px`);
        root.style.setProperty('--neo-light-intensity', `${lightIntensity}%`);
        root.style.setProperty('--neo-dark-intensity', `${darkIntensity}%`);
        root.style.setProperty('--neo-intensity', `${avgIntensity}%`);

        // Sync state
        if (!state.config.theme) {
          state.config.theme = {};
        }
        state.config.theme.bgColor = bgColor;
        state.config.theme.accentColor = accentColor;
        state.config.theme.radius = radius;
        state.config.theme.distance = distance;
        state.config.theme.lightIntensity = lightIntensity;
        state.config.theme.darkIntensity = darkIntensity;
        state.config.theme.intensity = avgIntensity;
        state.config.theme.blur = blur;

        // Persist to localStorage immediately
        try {
          localStorage.setItem('ahk_theme', JSON.stringify({
            bgColor,
            accentColor,
            radius,
            distance,
            lightIntensity,
            darkIntensity,
            intensity: avgIntensity,
            blur
          }));
        } catch (e) { }

        // Sync input controls if present
        if (themeBgColorPicker) themeBgColorPicker.value = bgColor;
        if (themeBgHex) themeBgHex.value = bgColor.toUpperCase();
        if (themeAccentColorPicker) themeAccentColorPicker.value = accentColor;
        if (themeAccentHex) themeAccentHex.value = accentColor.toUpperCase();

        if (themeSliderRadius) {
          themeSliderRadius.value = radius;
          updateSliderProgress(themeSliderRadius);
          if (badgeRadius) badgeRadius.textContent = `${radius}px`;
        }
        if (themeSliderDistance) {
          themeSliderDistance.value = distance;
          updateSliderProgress(themeSliderDistance);
          if (badgeDistance) badgeDistance.textContent = `${distance}px`;
        }
        if (themeSliderLightIntensity) {
          themeSliderLightIntensity.value = lightIntensity;
          updateSliderProgress(themeSliderLightIntensity);
          if (badgeLightIntensity) badgeLightIntensity.textContent = `${lightIntensity}%`;
        }
        if (themeSliderDarkIntensity) {
          themeSliderDarkIntensity.value = darkIntensity;
          updateSliderProgress(themeSliderDarkIntensity);
          if (badgeDarkIntensity) badgeDarkIntensity.textContent = `${darkIntensity}%`;
        }
        if (themeSliderBlur) {
          themeSliderBlur.value = blur;
          updateSliderProgress(themeSliderBlur);
          if (badgeBlur) badgeBlur.textContent = `${blur}px`;
        }

        updateActivePresetChips();

        if (save) {
          syncConfig();
        }
      }

      function getCurrentThemeColors() {
        const bg = (state.config && state.config.theme && state.config.theme.bgColor)
          || document.documentElement.style.getPropertyValue('--bg-color')
          || '#e8dfd5';
        const acc = (state.config && state.config.theme && state.config.theme.accentColor)
          || document.documentElement.style.getPropertyValue('--accent-primary')
          || '#d97706';
        const radius = (state.config && state.config.theme && typeof state.config.theme.radius !== 'undefined')
          ? parseInt(state.config.theme.radius, 10) : 5;
        const distance = (state.config && state.config.theme && typeof state.config.theme.distance !== 'undefined')
          ? parseInt(state.config.theme.distance, 10) : 3;
        const lightIntensity = (state.config && state.config.theme && typeof state.config.theme.lightIntensity !== 'undefined')
          ? parseInt(state.config.theme.lightIntensity, 10)
          : ((state.config && state.config.theme && typeof state.config.theme.intensity !== 'undefined') ? parseInt(state.config.theme.intensity, 10) : 22);
        const darkIntensity = (state.config && state.config.theme && typeof state.config.theme.darkIntensity !== 'undefined')
          ? parseInt(state.config.theme.darkIntensity, 10)
          : ((state.config && state.config.theme && typeof state.config.theme.intensity !== 'undefined') ? parseInt(state.config.theme.intensity, 10) : 6);
        const blur = (state.config && state.config.theme && typeof state.config.theme.blur !== 'undefined')
          ? parseInt(state.config.theme.blur, 10) : 10;
        return {
          bg: bg.trim(),
          acc: acc.trim(),
          radius,
          distance,
          lightIntensity,
          darkIntensity,
          intensity: Math.round((lightIntensity + darkIntensity) / 2),
          blur
        };
      }

      function getNeoSliderValues() {
        return {
          radius: themeSliderRadius ? parseInt(themeSliderRadius.value, 10) : 22,
          distance: themeSliderDistance ? parseInt(themeSliderDistance.value, 10) : 3,
          lightIntensity: themeSliderLightIntensity ? parseInt(themeSliderLightIntensity.value, 10) : 18,
          darkIntensity: themeSliderDarkIntensity ? parseInt(themeSliderDarkIntensity.value, 10) : 18,
          blur: themeSliderBlur ? parseInt(themeSliderBlur.value, 10) : 8
        };
      }

      function getCustomThemePresets() {
        if (state.config && state.config.theme && Array.isArray(state.config.theme.customPresets)) {
          return state.config.theme.customPresets;
        }
        try {
          const cached = localStorage.getItem('ahk_custom_theme_presets');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              if (!state.config.theme) state.config.theme = {};
              state.config.theme.customPresets = parsed;
              return parsed;
            }
          }
        } catch (e) { }
        return [];
      }

      function updateActivePresetChips() {
        const currentColors = getCurrentThemeColors();
        const currentSliders = getNeoSliderValues();

        // Check built-in swatches
        document.querySelectorAll('#bgSwatchesGrid .theme-swatch-chip').forEach(chip => {
          const presetKey = chip.dataset.preset;
          const preset = presetKey ? THEME_PRESETS[presetKey] : null;
          let isMatch = false;
          if (preset) {
            isMatch = (
              preset.bgColor.toLowerCase() === currentColors.bg.toLowerCase() &&
              (preset.accentColor || currentColors.acc).toLowerCase() === currentColors.acc.toLowerCase() &&
              parseInt(preset.radius, 10) === currentSliders.radius &&
              parseInt(preset.distance, 10) === currentSliders.distance &&
              parseInt(preset.blur, 10) === currentSliders.blur &&
              parseInt(preset.lightIntensity, 10) === currentSliders.lightIntensity &&
              parseInt(preset.darkIntensity, 10) === currentSliders.darkIntensity
            );
            chip.style.backgroundColor = preset.bgColor;
            chip.style.borderColor = preset.accentColor;
            chip.style.color = preset.accentColor;
            chip.style.borderRadius = `${Math.min(22, Math.max(4, preset.radius))}px`;
            chip.style.boxShadow = computePresetShadow(preset.bgColor, preset.lightIntensity, preset.darkIntensity, preset.distance, preset.blur);
          } else if (chip.dataset.color) {
            isMatch = (chip.dataset.color.toLowerCase() === currentColors.bg.toLowerCase());
          }
          chip.classList.toggle('active', isMatch);
        });

        document.querySelectorAll('#accentSwatchesGrid .theme-swatch-chip').forEach(chip => {
          chip.classList.toggle('active', chip.dataset.color.toLowerCase() === currentColors.acc.toLowerCase());
        });

        // Check custom presets
        const presets = getCustomThemePresets();
        document.querySelectorAll('#customPresetsGrid .custom-preset-chip').forEach(chip => {
          const p = presets.find(item => item.id === chip.dataset.presetId);
          if (!p) {
            chip.classList.remove('active');
            return;
          }
          const isMatch = (
            p.bgColor.toLowerCase() === currentColors.bg.toLowerCase() &&
            p.accentColor.toLowerCase() === currentColors.acc.toLowerCase() &&
            parseInt(p.radius, 10) === currentSliders.radius &&
            parseInt(p.distance, 10) === currentSliders.distance &&
            parseInt(p.blur, 10) === currentSliders.blur &&
            (typeof p.lightIntensity === 'undefined' || parseInt(p.lightIntensity, 10) === currentSliders.lightIntensity) &&
            (typeof p.darkIntensity === 'undefined' || parseInt(p.darkIntensity, 10) === currentSliders.darkIntensity)
          );
          chip.classList.toggle('active', isMatch);
        });
      }

      function renderCustomPresets() {
        const grid = document.getElementById('customPresetsGrid');
        if (!grid) return;

        const presets = getCustomThemePresets();
        grid.innerHTML = '';

        if (presets.length === 0) {
          grid.innerHTML = '<span class="empty-custom-presets-hint">No custom presets saved yet. Adjust colors & sliders above, name your preset, and click Save Preset!</span>';
          return;
        }

        const currentColors = getCurrentThemeColors();
        const currentSliders = getNeoSliderValues();

        presets.forEach(p => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'theme-swatch-chip theme-card-chip custom-preset-chip';
          chip.dataset.presetId = p.id;
          chip.title = `${p.name} (Background: ${p.bgColor}, Accent: ${p.accentColor}, Radius: ${p.radius}px, Blur: ${p.blur}px)`;
          chip.setAttribute('aria-label', p.name);
          chip.style.backgroundColor = p.bgColor;
          chip.style.borderColor = p.accentColor;
          chip.style.color = p.accentColor;
          chip.style.borderRadius = `${Math.min(22, Math.max(4, p.radius || 10))}px`;
          chip.style.boxShadow = computePresetShadow(
            p.bgColor,
            (typeof p.lightIntensity !== 'undefined') ? p.lightIntensity : 20,
            (typeof p.darkIntensity !== 'undefined') ? p.darkIntensity : 20,
            (typeof p.distance !== 'undefined') ? p.distance : 3,
            (typeof p.blur !== 'undefined') ? p.blur : 8
          );

          const isMatch = (
            p.bgColor.toLowerCase() === currentColors.bg.toLowerCase() &&
            p.accentColor.toLowerCase() === currentColors.acc.toLowerCase() &&
            parseInt(p.radius, 10) === currentSliders.radius &&
            parseInt(p.distance, 10) === currentSliders.distance &&
            parseInt(p.blur, 10) === currentSliders.blur &&
            (typeof p.lightIntensity === 'undefined' || parseInt(p.lightIntensity, 10) === currentSliders.lightIntensity) &&
            (typeof p.darkIntensity === 'undefined' || parseInt(p.darkIntensity, 10) === currentSliders.darkIntensity)
          );

          if (isMatch) {
            chip.classList.add('active');
          }

          chip.innerHTML = `
        <svg class="theme-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span class="btn-delete-preset" data-delete-id="${p.id}" title="Delete preset">&times;</span>
      `;

          chip.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete-preset')) return;

            applyTheme(p.bgColor, p.accentColor, true, {
              radius: p.radius,
              distance: p.distance,
              lightIntensity: p.lightIntensity,
              darkIntensity: p.darkIntensity,
              blur: p.blur
            });

            updateActivePresetChips();
          });

          const btnDelete = chip.querySelector('.btn-delete-preset');
          if (btnDelete) {
            btnDelete.addEventListener('click', (e) => {
              e.stopPropagation();
              deleteCustomPreset(p.id);
            });
          }

          grid.appendChild(chip);
        });
      }

      function saveCurrentCustomPreset() {
        const input = document.getElementById('inputCustomPresetName');
        const nameVal = input ? input.value.trim() : '';

        if (!state.config.theme) state.config.theme = {};
        let presets = getCustomThemePresets();

        const name = nameVal || `Custom Theme ${presets.length + 1}`;
        const current = getCurrentThemeColors();
        const sliders = getNeoSliderValues();

        const existingIndex = presets.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
        const newPreset = {
          id: (existingIndex >= 0) ? presets[existingIndex].id : ('custom_' + Date.now()),
          name: name,
          bgColor: current.bg,
          accentColor: current.acc,
          radius: sliders.radius,
          distance: sliders.distance,
          lightIntensity: sliders.lightIntensity,
          darkIntensity: sliders.darkIntensity,
          blur: sliders.blur
        };

        if (existingIndex >= 0) {
          presets[existingIndex] = newPreset;
        } else {
          presets.push(newPreset);
        }

        state.config.theme.customPresets = presets;

        try {
          localStorage.setItem('ahk_custom_theme_presets', JSON.stringify(presets));
        } catch (e) { }

        syncConfig();

        if (input) input.value = '';

        renderCustomPresets();
        updateActivePresetChips();

        const btnSave = document.getElementById('btnSaveCustomPreset');
        if (btnSave) {
          const origText = btnSave.innerHTML;
          btnSave.classList.add('btn-saved');
          btnSave.innerHTML = '<span>SAVED!</span>';
          setTimeout(() => {
            btnSave.classList.remove('btn-saved');
            btnSave.innerHTML = origText;
          }, 1200);
        }
      }

      function deleteCustomPreset(id) {
        if (!state.config.theme) state.config.theme = {};
        let presets = getCustomThemePresets();
        presets = presets.filter(p => p.id !== id);
        state.config.theme.customPresets = presets;

        try {
          localStorage.setItem('ahk_custom_theme_presets', JSON.stringify(presets));
        } catch (e) { }

        syncConfig();
        renderCustomPresets();
        updateActivePresetChips();
      }

      // ============================================================================
      // Event Listeners & Initialization
      // ============================================================================

      function initListeners() {
        // Master Switch
        mainEngineSwitch.addEventListener('click', toggleMasterEngine);
        if (mainEngineSwitch) {
          mainEngineSwitch.addEventListener('click', toggleMasterEngine);
        }

        // Profile Management Listeners
        if (profileSelect) {
          profileSelect.addEventListener('change', (e) => {
            switchProfile(e.target.value);
          });
        }
        if (btnAddProfile) {
          btnAddProfile.addEventListener('click', () => {
            openProfileModal('add');
          });
        }
        const btnEditProfile = document.getElementById('btnEditProfile');
        if (btnEditProfile) {
          btnEditProfile.addEventListener('click', () => {
            openProfileModal('edit');
          });
        }
        if (btnRenameProfile) {
          btnRenameProfile.addEventListener('click', () => {
            openProfileModal('rename');
          });
        }
        if (btnDeleteProfile) {
          btnDeleteProfile.addEventListener('click', () => {
            openProfileModal('delete');
          });
        }
        const btnScrollProfilesLeft = document.getElementById('btnScrollProfilesLeft');
        const btnScrollProfilesRight = document.getElementById('btnScrollProfilesRight');
        const lgsProfilesTrack = document.getElementById('lgsProfilesTrack');
        if (btnScrollProfilesLeft && lgsProfilesTrack) {
          btnScrollProfilesLeft.addEventListener('click', () => {
            lgsProfilesTrack.scrollBy({ left: -220, behavior: 'smooth' });
          });
        }
        if (btnScrollProfilesRight && lgsProfilesTrack) {
          btnScrollProfilesRight.addEventListener('click', () => {
            lgsProfilesTrack.scrollBy({ left: 220, behavior: 'smooth' });
          });
        }
        if (lgsProfilesTrack) {
          lgsProfilesTrack.addEventListener('wheel', (e) => {
            if (e.deltaY) {
              e.preventDefault();
              lgsProfilesTrack.scrollLeft += e.deltaY;
            }
          }, { passive: false });
        }
        const profileSearchInput = document.getElementById('profileSearchInput');
        if (profileSearchInput) {
          profileSearchInput.addEventListener('input', () => {
            renderProfilesRibbon();
          });
        }
        const btnBrowseProfileExe = document.getElementById('btnBrowseProfileExe');
        if (btnBrowseProfileExe) {
          btnBrowseProfileExe.addEventListener('click', () => {
            sendToAhk('browseProfileApp');
          });
        }
        const btnRescanRunningApps = document.getElementById('btnRescanRunningApps');
        if (btnRescanRunningApps) {
          btnRescanRunningApps.addEventListener('click', () => {
            const list = document.getElementById('runningAppsList');
            if (list) list.innerHTML = '<div class="apps-empty-state">Rescanning open windows...</div>';
            sendToAhk('getRunningApps');
          });
        }
        const runningAppsFilterInput = document.getElementById('runningAppsFilterInput');
        if (runningAppsFilterInput) {
          runningAppsFilterInput.addEventListener('input', () => {
            renderRunningAppsList();
          });
        }
        if (btnConfirmProfileModal) {
          btnConfirmProfileModal.addEventListener('click', handleProfileModalConfirm);
        }
        if (btnCancelProfileModal) {
          btnCancelProfileModal.addEventListener('click', closeProfileModal);
        }
        if (btnCloseProfileModal) {
          btnCloseProfileModal.addEventListener('click', closeProfileModal);
        }
        if (profileNameInput) {
          profileNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleProfileModalConfirm();
            else if (e.key === 'Escape') closeProfileModal();
          });
        }

        // Tab Bar
        segmentedBar.addEventListener('click', (e) => {
          const btn = e.target.closest('.segment-btn');
          if (!btn) return;
          switchTab(btn.dataset.tab);
        });

        window.addEventListener('resize', () => {
          updateSegmentedGlider(true);
        });

        // Text Expander Listeners
        teBtnSubmit.addEventListener('click', submitTextExpander);
        teToggleMultiline.addEventListener('click', () => toggleMultiline());
        teSearchFilter.addEventListener('input', renderTextExpander);

        teInputTrigger.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            if (state.isMultiline) teTextareaOutput.focus();
            else if (!teInputOutput.value.trim()) teInputOutput.focus();
            else submitTextExpander();
          }
        });

        teInputOutput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') submitTextExpander();
        });

        // Key Remapper Pure Key Combination Recorders
        krBtnSubmit.addEventListener('click', submitKeyRemapper);
        setupKeyCombinationBox(krSourceBox, krInputSource, krBtnClearSource, krTargetBox, submitKeyRemapper);
        setupKeyCombinationBox(krTargetBox, krInputTarget, krBtnClearTarget, null, submitKeyRemapper);

        // App Launcher Listeners
        if (alTypeString) {
          alTypeString.addEventListener('click', () => setAlTriggerType('string'));
        }
        if (alTypeHotkey) {
          alTypeHotkey.addEventListener('click', () => setAlTriggerType('hotkey'));
        }
        if (alBtnSubmit) {
          alBtnSubmit.addEventListener('click', submitAppLauncher);
        }
        if (alInputTrigger) {
          alInputTrigger.addEventListener('keydown', handleAlTriggerKeydown);
        }
        if (alBtnBrowse) {
          alBtnBrowse.addEventListener('click', (e) => {
            e.preventDefault();
            sendToAhk('browseApp');
          });
        }

        if (alOutputBox) {
          alOutputBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            alOutputBox.style.boxShadow = 'var(--inset-deep), inset 0 0 0 1.5px var(--accent-primary)';
          });
          alOutputBox.addEventListener('dragleave', () => {
            alOutputBox.style.boxShadow = '';
          });
          alOutputBox.addEventListener('drop', (e) => {
            e.preventDefault();
            alOutputBox.style.boxShadow = '';
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
              const file = e.dataTransfer.files[0];
              if (file.path) {
                alInputTarget.value = file.path;
                const nameNoExt = file.name.replace(/\.[^/.]+$/, '');
                if (!alInputName.value.trim()) {
                  alInputName.value = nameNoExt;
                }
                alInputTarget.focus();
              }
            }
          });
        }

        if (alInputTarget) {
          alInputTarget.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitAppLauncher();
          });
        }

        if (alInputName) {
          alInputName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitAppLauncher();
          });
        }

        // Window Dragging
        function handleDragStart(e) {
          if (
            e.target.closest('button') ||
            e.target.closest('input') ||
            e.target.closest('textarea') ||
            e.target.closest('select') ||
            e.target.closest('.resize-handle') ||
            e.target.closest('.shortcut-card') ||
            e.target.closest('.macro-step-chip') ||
            e.target.closest('.macro-timeline-track') ||
            e.target.closest('.macro-inject-btn') ||
            e.target.closest('[draggable="true"]') ||
            e.target.closest('#mainEngineSwitch') ||
            e.target.closest('.vertical-rocker') ||
            e.target.closest('.lgs-profile-card') ||
            e.target.closest('.lgs-profiles-bar')
          ) return;
          sendToAhk('startDrag');
        }

        dragHeader.addEventListener('mousedown', handleDragStart);
        appCard.addEventListener('mousedown', (e) => {
          if (
            e.target === appCard ||
            e.target.classList.contains('inputs-section') ||
            e.target.classList.contains('input-hints') ||
            e.target.classList.contains('list-section') ||
            e.target.classList.contains('modules-container')
          ) {
            handleDragStart(e);
          }
        });

        // Window Resizing via handles
        document.querySelectorAll('.resize-handle').forEach(handle => {
          handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sendToAhk('startResize', { dir: handle.dataset.direction });
          });
        });

        // Window Controls
        btnMinimize.addEventListener('click', () => sendToAhk('minimize'));
        btnClose.addEventListener('click', () => sendToAhk('close'));
        btnRefresh.addEventListener('click', () => sendToAhk('reload'));
        if (btnExport) {
          btnExport.addEventListener('click', () => sendToAhk('openConfig'));
        }
        if (btnHelp) {
          btnHelp.addEventListener('click', () => {
            const modal = document.getElementById('infoModal');
            if (modal) modal.classList.remove('hidden-field');
          });
        }

        const btnCloseModal = document.getElementById('btnCloseModal');
        if (btnCloseModal) {
          btnCloseModal.addEventListener('click', () => {
            const modal = document.getElementById('infoModal');
            if (modal) modal.classList.add('hidden-field');
          });
        }

        const infoModal = document.getElementById('infoModal');
        if (infoModal) {
          infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) {
              infoModal.classList.add('hidden-field');
            }
          });
        }

        // Theme Settings Listeners
        if (btnTheme) {
          btnTheme.addEventListener('click', () => {
            if (themeModal) {
              const current = getCurrentThemeColors();
              if (themeBgColorPicker) themeBgColorPicker.value = current.bg;
              if (themeBgHex) themeBgHex.value = current.bg.toUpperCase();
              if (themeAccentColorPicker) themeAccentColorPicker.value = current.acc;
              if (themeAccentHex) themeAccentHex.value = current.acc.toUpperCase();

              if (themeSliderRadius) {
                themeSliderRadius.value = current.radius;
                updateSliderProgress(themeSliderRadius);
                if (badgeRadius) badgeRadius.textContent = `${current.radius}px`;
              }
              if (themeSliderDistance) {
                themeSliderDistance.value = current.distance;
                updateSliderProgress(themeSliderDistance);
                if (badgeDistance) badgeDistance.textContent = `${current.distance}px`;
              }
              if (themeSliderLightIntensity) {
                themeSliderLightIntensity.value = current.lightIntensity;
                updateSliderProgress(themeSliderLightIntensity);
                if (badgeLightIntensity) badgeLightIntensity.textContent = `${current.lightIntensity}%`;
              }
              if (themeSliderDarkIntensity) {
                themeSliderDarkIntensity.value = current.darkIntensity;
                updateSliderProgress(themeSliderDarkIntensity);
                if (badgeDarkIntensity) badgeDarkIntensity.textContent = `${current.darkIntensity}%`;
              }
              if (themeSliderBlur) {
                themeSliderBlur.value = current.blur;
                updateSliderProgress(themeSliderBlur);
                if (badgeBlur) badgeBlur.textContent = `${current.blur}px`;
              }

              updateActivePresetChips();
              renderCustomPresets();

              themeModal.classList.remove('hidden-field');
            }
          });
        }

        if (btnCloseThemeModal) {
          btnCloseThemeModal.addEventListener('click', () => {
            syncConfig();
            if (themeModal) themeModal.classList.add('hidden-field');
          });
        }

        if (themeModal) {
          themeModal.addEventListener('click', (e) => {
            if (e.target === themeModal) {
              syncConfig();
              themeModal.classList.add('hidden-field');
            }
          });
        }

        // Background Swatches - Auto-save immediately with curated preset parameters
        if (bgSwatchesGrid) {
          bgSwatchesGrid.addEventListener('click', (e) => {
            const chip = e.target.closest('.theme-swatch-chip');
            if (!chip) return;
            const presetKey = chip.dataset.preset;
            const preset = presetKey ? THEME_PRESETS[presetKey] : null;
            const current = getCurrentThemeColors();
            if (preset) {
              applyTheme(preset.bgColor, preset.accentColor || current.acc, true, {
                radius: preset.radius,
                distance: preset.distance,
                lightIntensity: preset.lightIntensity,
                darkIntensity: preset.darkIntensity,
                blur: preset.blur
              });
            } else if (chip.dataset.color) {
              applyTheme(chip.dataset.color, current.acc, true, getNeoSliderValues());
            }
          });
        }

        // Custom Background Color Picker
        if (themeBgColorPicker) {
          themeBgColorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            const current = getCurrentThemeColors();
            applyTheme(color, current.acc, false, getNeoSliderValues());
          });
          themeBgColorPicker.addEventListener('change', (e) => {
            const color = e.target.value;
            const current = getCurrentThemeColors();
            applyTheme(color, current.acc, true, getNeoSliderValues());
          });
        }

        if (themeBgHex) {
          themeBgHex.addEventListener('change', (e) => {
            let val = e.target.value.trim();
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
              const current = getCurrentThemeColors();
              applyTheme(val, current.acc, true, getNeoSliderValues());
            }
          });
        }

        // Accent Swatches - Auto-save immediately
        if (accentSwatchesGrid) {
          accentSwatchesGrid.addEventListener('click', (e) => {
            const chip = e.target.closest('.theme-swatch-chip');
            if (!chip) return;
            const color = chip.dataset.color;
            const current = getCurrentThemeColors();
            applyTheme(current.bg, color, true, getNeoSliderValues());
          });
        }

        // Custom Accent Color Picker
        if (themeAccentColorPicker) {
          themeAccentColorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            const current = getCurrentThemeColors();
            applyTheme(current.bg, color, false, getNeoSliderValues());
          });
          themeAccentColorPicker.addEventListener('change', (e) => {
            const color = e.target.value;
            const current = getCurrentThemeColors();
            applyTheme(current.bg, color, true, getNeoSliderValues());
          });
        }

        if (themeAccentHex) {
          themeAccentHex.addEventListener('change', (e) => {
            let val = e.target.value.trim();
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
              const current = getCurrentThemeColors();
              applyTheme(current.bg, val, true, getNeoSliderValues());
            }
          });
        }

        // Neumorphism Sliders Listeners (Live Preview on Input, Save on Change)
        if (themeSliderRadius) {
          themeSliderRadius.addEventListener('input', () => {
            const val = parseInt(themeSliderRadius.value, 10);
            if (badgeRadius) badgeRadius.textContent = `${val}px`;
            updateSliderProgress(themeSliderRadius);
            const current = getCurrentThemeColors();
            applyTheme(current.bg, current.acc, false, { ...getNeoSliderValues(), radius: val });
          });
          themeSliderRadius.addEventListener('change', () => {
            const current = getCurrentThemeColors();
            applyTheme(current.bg, current.acc, true, getNeoSliderValues());
          });
        }

        if (themeSliderDistance) {
          themeSliderDistance.addEventListener('input', () => {
            const val = parseInt(themeSliderDistance.value, 10);
            if (badgeDistance) badgeDistance.textContent = `${val}px`;
            updateSliderProgress(themeSliderDistance);
            const current = getCurrentThemeColors();
            applyTheme(current.bg, current.acc, false, { ...getNeoSliderValues(), distance: val });
          });
          themeSliderDistance.addEventListener('change', () => {
            const current = getCurrentThemeColors();
            applyTheme(current.bg, current.acc, true, getNeoSliderValues());
          });
        }

        if (themeSliderLightIntensity) {
          themeSliderLightIntensity.addEventListener('input', () => {
            const val = parseInt(themeSliderLightIntensity.value, 10);
            if (badgeLightIntensity) badgeLightIntensity.textContent = `${val}%`;
            updateSliderProgress(themeSliderLightIntensity);
            const current = getCurrentThemeColors();
            applyTheme(current.bg, current.acc, false, { ...getNeoSliderValues(), lightIntensity: val });
          });
          themeSliderLightIntensity.addEventListener('change', () => {
            const current = getCurrentThemeColors();
            applyTheme(current.bg, current.acc, true, getNeoSliderValues());
          });
        }

        if (themeSliderDarkIntensity) {
          themeSliderDarkIntensity.addEventListener('input', () => {
            const val = parseInt(themeSliderDarkIntensity.value, 10);
            if (badgeDarkIntensity) badgeDarkIntensity.textContent = `${val}%`;
            updateSliderProgress(themeSliderDarkIntensity);
            const current = getCurrentThemeColors();
            applyTheme(current.bg, current.acc, false, { ...getNeoSliderValues(), darkIntensity: val });
          });
          themeSliderDarkIntensity.addEventListener('change', () => {
            const current = getCurrentThemeColors();
            applyTheme(current.bg, current.acc, true, getNeoSliderValues());
          });
        }

        if (themeSliderBlur) {
          themeSliderBlur.addEventListener('input', () => {
            const val = parseInt(themeSliderBlur.value, 10);
            if (badgeBlur) badgeBlur.textContent = `${val}px`;
            updateSliderProgress(themeSliderBlur);
            const current = getCurrentThemeColors();
            applyTheme(current.bg, current.acc, false, { ...getNeoSliderValues(), blur: val });
          });
          themeSliderBlur.addEventListener('change', () => {
            const current = getCurrentThemeColors();
            applyTheme(current.bg, current.acc, true, getNeoSliderValues());
          });
        }

        // Reset Theme to Default Preset (Warm Clay)
        if (btnResetTheme) {
          btnResetTheme.addEventListener('click', () => {
            const def = THEME_PRESETS['custom-default'] || THEME_PRESETS['soft-gray'];
            applyTheme(def.bgColor, def.accentColor, true, {
              radius: def.radius,
              distance: def.distance,
              lightIntensity: def.lightIntensity,
              darkIntensity: def.darkIntensity,
              blur: def.blur
            });
          });
        }

        // Save / Apply Theme
        if (btnSaveTheme) {
          btnSaveTheme.addEventListener('click', () => {
            const current = getCurrentThemeColors();
            applyTheme(current.bg, current.acc, true, getNeoSliderValues());
            if (themeModal) themeModal.classList.add('hidden-field');
          });
        }

        // Save Custom Theme Preset Listeners
        if (btnSaveCustomPreset) {
          btnSaveCustomPreset.addEventListener('click', saveCurrentCustomPreset);
        }
        if (inputCustomPresetName) {
          inputCustomPresetName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveCurrentCustomPreset();
            }
          });
        }

        initMacroRecorder();
      }

      // Handle IPC Messages from AHK
      function onAhkMessage(event) {
        try {
          const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

          if (msg.type === 'init' || msg.type === 'updateState') {
            if (typeof msg.enabled === 'boolean') state.enabled = msg.enabled;
            if (msg.config) {
              state.config = msg.config;
              ensureProfilesConfig(state.config);
              if (msg.config.activeTab) state.activeTab = msg.config.activeTab;
              if (msg.config.theme && msg.config.theme.bgColor && msg.config.theme.accentColor) {
                applyTheme(
                  msg.config.theme.bgColor,
                  msg.config.theme.accentColor,
                  false,
                  {
                    radius: msg.config.theme.radius,
                    distance: msg.config.theme.distance,
                    lightIntensity: msg.config.theme.lightIntensity,
                    darkIntensity: msg.config.theme.darkIntensity,
                    intensity: msg.config.theme.intensity,
                    blur: msg.config.theme.blur
                  }
                );
                renderCustomPresets();
                try {
                  localStorage.setItem('ahk_theme', JSON.stringify({
                    bgColor: msg.config.theme.bgColor,
                    accentColor: msg.config.theme.accentColor,
                    radius: msg.config.theme.radius,
                    distance: msg.config.theme.distance,
                    lightIntensity: msg.config.theme.lightIntensity,
                    darkIntensity: msg.config.theme.darkIntensity,
                    intensity: msg.config.theme.intensity,
                    blur: msg.config.theme.blur,
                    customPresets: msg.config.theme.customPresets || []
                  }));
                  if (Array.isArray(msg.config.theme.customPresets)) {
                    localStorage.setItem('ahk_custom_theme_presets', JSON.stringify(msg.config.theme.customPresets));
                  }
                } catch (e) { }
              }
            }
            if (typeof msg.autoClickerRunning === 'boolean') {
              updateAutoClickerUi(msg.autoClickerRunning);
            }
            isInitialized = true;
            renderAll(false);
          } else if (msg.type === 'runningAppsList') {
            renderRunningAppsList(msg.apps || []);
          } else if (msg.type === 'profileAppSelected') {
            const profInputExe = document.getElementById('profInputExe');
            if (profInputExe && msg.exe) {
              const cur = profInputExe.value.split(',').map(s => s.trim()).filter(Boolean);
              if (!cur.some(x => x.toLowerCase() === msg.exe.toLowerCase())) {
                cur.push(msg.exe);
                profInputExe.value = cur.join(', ');
              }
              if (profileModalMode === 'add' && profileNameInput && !profileNameInput.value.trim() && msg.name) {
                profileNameInput.value = msg.name.charAt(0).toUpperCase() + msg.name.slice(1);
              }
              renderRunningAppsList();
            }
          } else if (msg.type === 'profileAutoSwitched') {
            if (msg.activeProfile && state.config && state.config.profiles && state.config.profiles[msg.activeProfile]) {
              state.config.activeProfile = msg.activeProfile;
              const prof = state.config.profiles[msg.activeProfile];
              state.config.textExpander = prof.textExpander;
              state.config.keyRemapper = prof.keyRemapper;
              state.config.appLauncher = prof.appLauncher;
              state.config.macroRecorder = prof.macroRecorder;
              state.config.windowManager = prof.windowManager;
              state.config.autoClicker = prof.autoClicker;
              renderProfileSelect();
              renderTextExpander();
              renderKeyRemapper();
              initWindowManager();
              renderAppLauncher();
              renderMacroRecorder();
              updateAutoClickerUI();
              updateGlobalIndicators();
              showToast(`Switched Profile: ${msg.activeProfile}` + (msg.triggerExe ? ` (${msg.triggerExe})` : ''));
            }
          } else if (msg.type === 'autoClickerState') {
            updateAutoClickerUi(msg.running);
          } else if (msg.type === 'appSelected') {
            if (msg.path && alInputTarget) {
              alInputTarget.value = msg.path;
              if (alInputName && (!alInputName.value.trim() || alInputName.value === 'Launch') && msg.name) {
                alInputName.value = msg.name;
              }
              alInputTarget.focus();
            }
          } else if (msg.type === 'activeAppVolumeChanged') {
            if (msg.name) {
              activeAppState.name = msg.name;
              if (wmAppTargetBadge) {
                wmAppTargetBadge.textContent = `Active: ${msg.name}`;
              }
            }
            if (msg.pid) {
              activeAppState.pid = msg.pid;
            }
            if (typeof msg.volume === 'number') {
              if (msg.volume >= 0) {
                activeAppState.volume = msg.volume;
                if (wmAppVolumeSlider) {
                  wmAppVolumeSlider.value = msg.volume;
                  updateSliderProgress(wmAppVolumeSlider);
                }
                if (wmAppVolumeValue) {
                  wmAppVolumeValue.textContent = `${msg.volume}%`;
                }
              } else if (msg.volume === -1 && wmAppVolumeValue) {
                wmAppVolumeValue.textContent = 'No Audio';
              }
            }
            if (typeof msg.muted !== 'undefined') {
              activeAppState.muted = Boolean(msg.muted);
              if (wmBtnMuteActiveAppText) {
                wmBtnMuteActiveAppText.textContent = activeAppState.muted ? 'Unmute App' : 'Mute App';
              }
              if (wmBtnMuteActiveApp) {
                wmBtnMuteActiveApp.classList.toggle('is-muted', activeAppState.muted);
              }
            }
          } else if (msg.type === 'macroStepRecorded') {
            if (macroState.isRecording) {
              const delay = macroState.useStandardDelays
                ? macroState.standardDelay
                : ((typeof msg.delay === 'number' && !isNaN(msg.delay)) ? msg.delay : 50);
              addMacroStep(msg.action, msg.key, delay);
            }
          } else if (msg.type === 'macroRecordingStopped') {
            if (macroState.isRecording) {
              stopMacroRecording();
            }
          }
        } catch (err) {
          console.error('Error handling AHK message:', err);
        }
      }

      // Resilient AHK Bridge Initializer with Polling & Queue Flushing
      function initAhkBridge() {
        function tryConnect() {
          if (window.chrome && window.chrome.webview) {
            if (!window.__ahkBridgeReady) {
              window.__ahkBridgeReady = true;
              window.chrome.webview.addEventListener('message', onAhkMessage);
              flushAhkQueue();
              sendToAhk('getInitialState');
            }
            return true;
          }
          return false;
        }

        if (!tryConnect()) {
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            if (tryConnect() || attempts > 60) {
              clearInterval(interval);
            }
          }, 50);
        }
      }

      function renderAll(shouldSync = false) {
        ensureProfilesConfig(state.config);
        if (state.config && state.config.theme) {
          applyTheme(
            state.config.theme.bgColor,
            state.config.theme.accentColor,
            false,
            {
              radius: state.config.theme.radius,
              distance: state.config.theme.distance,
              lightIntensity: state.config.theme.lightIntensity,
              darkIntensity: state.config.theme.darkIntensity,
              intensity: state.config.theme.intensity,
              blur: state.config.theme.blur
            }
          );
        }
        renderProfileSelect();
        updateSwitchUi();
        switchTab(state.activeTab || 'textExpander', shouldSync);
        renderTextExpander();
        renderKeyRemapper();
        initWindowManager();
        renderAppLauncher();
        initAutoClicker();
        renderMacroRecorder();
        updateGlobalIndicators();
        renderCustomPresets();
      }

      // Startup
      initListeners();
      renderAll(false);
      requestAnimationFrame(() => {
        updateSegmentedGlider(true);
      });
      initAhkBridge();

    }) ();
