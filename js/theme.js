/**
 * UR TASK - theme.js
 * Pengatur tema tampilan (Mode Terang & Mode Gelap) dan sinkronisasi tombol toggle.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'urtask_theme';
  var DARK_VALUE  = 'dark';
  var LIGHT_VALUE = 'light';

  // Ikon SVG bulan dan matahari
  var ICON_MOON = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  var ICON_SUN = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

  // Pembacaan dan penyimpanan tema di localStorage
  function _read() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (_) {
      return null;
    }
  }

  function _save(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (_) {}
  }

  // Terapkan atribut tema ke elemen html
  function _apply(theme) {
    if (theme === DARK_VALUE) {
      document.documentElement.setAttribute('data-theme', DARK_VALUE);
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.remove('dark');
    }
  }

  // Perbarui tampilan tombol toggle
  function _updateButtons(theme) {
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    buttons.forEach(function (btn) {
      btn.innerHTML = theme === DARK_VALUE ? ICON_SUN : ICON_MOON;
      btn.setAttribute(
        'aria-label',
        theme === DARK_VALUE ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'
      );
      btn.setAttribute('title',
        theme === DARK_VALUE ? 'Mode Terang' : 'Mode Gelap'
      );
    });
  }

  // Inisialisasi tema sebelum render
  function init() {
    var saved = _read();
    if (!saved) {
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      saved = prefersDark ? DARK_VALUE : LIGHT_VALUE;
    }
    _apply(saved);
    return saved;
  }

  // Dapatkan status tema saat ini
  function getCurrent() {
    var attr = document.documentElement.getAttribute('data-theme');
    return attr === DARK_VALUE ? DARK_VALUE : LIGHT_VALUE;
  }

  // Ganti tema (toggle)
  function toggle() {
    var current = getCurrent();
    var next    = current === DARK_VALUE ? LIGHT_VALUE : DARK_VALUE;
    _apply(next);
    _save(next);
    _updateButtons(next);
    try {
      window.dispatchEvent(new CustomEvent('urtask:themechange', { detail: { theme: next } }));
    } catch (_) {}
    return next;
  }

  // Hubungkan event click ke tombol-tombol toggle tema
  function initThemeToggleButtons() {
    var current = getCurrent();
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    buttons.forEach(function (btn) {
      btn.innerHTML = current === DARK_VALUE ? ICON_SUN : ICON_MOON;
      btn.setAttribute(
        'aria-label',
        current === DARK_VALUE ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'
      );
      btn.setAttribute('title', current === DARK_VALUE ? 'Mode Terang' : 'Mode Gelap');

      if (!btn.dataset.themeToggleBound) {
        btn.dataset.themeToggleBound = '1';
        btn.addEventListener('click', function () {
          toggle();
        });
      }
    });
  }

  // Ekspor API
  window.URTheme = {
    init:                   init,
    toggle:                 toggle,
    getCurrent:             getCurrent,
    initThemeToggleButtons: initThemeToggleButtons,
  };

  init();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeToggleButtons);
  } else {
    initThemeToggleButtons();
  }

  // Sinkronisasi jika preferensi tema sistem operasi berubah
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      var stored = _read();
      if (!stored) {
        var newTheme = e.matches ? DARK_VALUE : LIGHT_VALUE;
        _apply(newTheme);
        _updateButtons(newTheme);
      }
    });
  }
}());
