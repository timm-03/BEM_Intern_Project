/**
 * UR TASK - ui.js
 * Komponen antarmuka pengguna: toast notifikasi, dialog konfirmasi, state kosong, badge status, dan format tanggal.
 */
(function () {
  'use strict';

  // ── Notifikasi Toast ──
  var _toastContainer = null;

  function _ensureToastContainer() {
    if (_toastContainer && document.body.contains(_toastContainer)) {
      return _toastContainer;
    }
    _toastContainer = document.createElement('div');
    _toastContainer.id              = 'urtask-toast-container';
    _toastContainer.setAttribute('aria-live', 'polite');
    _toastContainer.setAttribute('aria-atomic', 'false');
    _toastContainer.style.cssText   = [
      'position:fixed',
      'bottom:88px',
      'left:50%',
      'transform:translateX(-50%)',
      'z-index:9999',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'gap:8px',
      'pointer-events:none',
      'width:max-content',
      'max-width:calc(100vw - 32px)',
    ].join(';');
    document.body.appendChild(_toastContainer);
    return _toastContainer;
  }

  var _TOAST_ICONS = {
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    info:    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };

  var _TOAST_COLORS = {
    success: { bg: '#1a7a4a', color: '#ffffff' },
    error:   { bg: '#ba1a1a', color: '#ffffff' },
    info:    { bg: '#1565c0', color: '#ffffff' },
  };

  // Tampilkan pesan toast
  function showToast(message, type) {
    type = type || 'success';
    var container = _ensureToastContainer();
    var colors    = _TOAST_COLORS[type] || _TOAST_COLORS.info;
    var icon      = _TOAST_ICONS[type]  || _TOAST_ICONS.info;

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:10px',
      'padding:12px 18px',
      'border-radius:12px',
      'background:' + colors.bg,
      'color:' + colors.color,
      'font-size:14px',
      'font-weight:500',
      'line-height:1.4',
      'box-shadow:0 4px 20px rgba(0,0,0,0.25)',
      'pointer-events:all',
      'max-width:360px',
      'animation:slideInToast 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
    ].join(';');

    var iconWrap = document.createElement('span');
    iconWrap.style.cssText = 'flex-shrink:0;display:flex;align-items:center;';
    iconWrap.innerHTML     = icon;

    var text = document.createElement('span');
    text.textContent = message;

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML     = '&#x2715;';
    closeBtn.style.cssText = [
      'flex-shrink:0',
      'background:transparent',
      'border:none',
      'color:inherit',
      'cursor:pointer',
      'font-size:14px',
      'padding:0 0 0 8px',
      'opacity:0.75',
      'line-height:1',
    ].join(';');
    closeBtn.setAttribute('aria-label', 'Tutup notifikasi');
    closeBtn.addEventListener('click', function () { _dismissToast(toast); });

    toast.appendChild(iconWrap);
    toast.appendChild(text);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    var timer = setTimeout(function () { _dismissToast(toast); }, 3000);
    toast._dismissTimer = timer;
  }

  function _dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    clearTimeout(toast._dismissTimer);
    toast.style.animation = 'slideOutToast 0.25s ease-in forwards';
    toast.addEventListener('animationend', function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, { once: true });
  }

  // ── Dialog Modal Konfirmasi ──
  var _confirmDialog = null;

  function _ensureConfirmDialog() {
    if (_confirmDialog && document.body.contains(_confirmDialog)) return _confirmDialog;

    var dialog = document.createElement('dialog');
    dialog.id  = 'urtask-confirm-dialog';
    dialog.innerHTML = [
      '<div class="confirm-modal" style="',
        'padding:28px 24px;',
        'border-radius:20px;',
        'background:var(--color-surface-container-low);',
        'color:var(--color-on-surface);',
        'max-width:400px;',
        'width:90vw;',
        'font-family:inherit;',
      '">',
        '<h2 id="confirm-modal-title" style="',
          'margin:0 0 10px;',
          'font-size:18px;',
          'font-weight:700;',
          'color:var(--color-on-surface);',
        '"></h2>',
        '<p id="confirm-modal-message" style="',
          'margin:0 0 24px;',
          'font-size:14px;',
          'line-height:1.6;',
          'color:var(--color-on-surface-variant);',
        '"></p>',
        '<div style="display:flex;gap:12px;justify-content:flex-end;">',
          '<button id="confirm-modal-cancel" style="',
            'padding:10px 20px;',
            'border-radius:999px;',
            'border:1px solid var(--color-outline-variant);',
            'background:transparent;',
            'color:var(--color-on-surface);',
            'font-size:14px;',
            'font-weight:600;',
            'cursor:pointer;',
            'transition:background 0.15s;',
          '">Batal</button>',
          '<button id="confirm-modal-confirm" style="',
            'padding:10px 20px;',
            'border-radius:999px;',
            'border:none;',
            'background:var(--color-primary);',
            'color:var(--color-on-primary);',
            'font-size:14px;',
            'font-weight:600;',
            'cursor:pointer;',
            'transition:opacity 0.15s;',
          '">Konfirmasi</button>',
        '</div>',
      '</div>',
    ].join('');

    dialog.style.cssText = [
      'border:none',
      'border-radius:20px',
      'padding:0',
      'background:transparent',
      'max-width:none',
    ].join(';');

    document.body.appendChild(dialog);
    _confirmDialog = dialog;
    return dialog;
  }

  function showConfirmModal(opts) {
    opts = opts || {};
    var dialog = _ensureConfirmDialog();

    var titleEl   = dialog.querySelector('#confirm-modal-title');
    var msgEl     = dialog.querySelector('#confirm-modal-message');
    var cancelBtn = dialog.querySelector('#confirm-modal-cancel');
    var confirmBtn = dialog.querySelector('#confirm-modal-confirm');

    if (titleEl)   titleEl.textContent   = opts.title   || 'Konfirmasi';
    if (msgEl)     msgEl.textContent     = opts.message  || 'Apakah kamu yakin?';
    if (cancelBtn)  cancelBtn.textContent  = opts.cancelText  || 'Batal';
    if (confirmBtn) confirmBtn.textContent = opts.confirmText || 'Konfirmasi';

    if (confirmBtn) {
      if (opts.isDanger) {
        confirmBtn.style.background = 'var(--color-error)';
        confirmBtn.style.color      = 'var(--color-on-error)';
      } else {
        confirmBtn.style.background = 'var(--color-primary)';
        confirmBtn.style.color      = 'var(--color-on-primary)';
      }
    }

    function _replace(btn) {
      if (!btn) return btn;
      var clone = btn.cloneNode(true);
      btn.parentNode.replaceChild(clone, btn);
      return clone;
    }

    cancelBtn  = _replace(cancelBtn);
    confirmBtn = _replace(confirmBtn);

    var newCancel  = dialog.querySelector('#confirm-modal-cancel');
    var newConfirm = dialog.querySelector('#confirm-modal-confirm');

    function _close(action) {
      dialog.close();
      if (action === 'confirm' && typeof opts.onConfirm === 'function') opts.onConfirm();
      if (action === 'cancel'  && typeof opts.onCancel  === 'function') opts.onCancel();
    }

    if (newCancel)  newCancel.addEventListener('click',  function () { _close('cancel'); });
    if (newConfirm) newConfirm.addEventListener('click', function () { _close('confirm'); });

    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) _close('cancel');
    }, { once: true });

    dialog.showModal();
    return dialog;
  }

  // ── Tampilan Data Kosong (Empty State) ──
  var EMPTY_STATE_CLASS = 'urtask-empty-state';

  function showEmptyState(opts) {
    if (!opts || !opts.container) return;
    clearEmptyState(opts.container);

    var wrap = document.createElement('div');
    wrap.className = EMPTY_STATE_CLASS;
    wrap.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'padding:48px 24px',
      'text-align:center',
      'gap:12px',
      'color:var(--color-on-surface-variant)',
    ].join(';');

    if (opts.icon) {
      var iconEl = document.createElement('span');
      iconEl.className = 'material-symbols-outlined';
      iconEl.style.cssText = 'font-size:48px;line-height:1;margin-bottom:6px;color:var(--color-outline);display:inline-block;';
      iconEl.textContent   = opts.icon;
      wrap.appendChild(iconEl);
    }

    if (opts.title) {
      var titleEl = document.createElement('h3');
      titleEl.style.cssText   = 'margin:0;font-size:17px;font-weight:700;color:var(--color-on-surface);';
      titleEl.textContent     = opts.title;
      wrap.appendChild(titleEl);
    }

    if (opts.message) {
      var msgEl = document.createElement('p');
      msgEl.style.cssText = 'margin:0;font-size:14px;line-height:1.6;max-width:280px;';
      msgEl.textContent   = opts.message;
      wrap.appendChild(msgEl);
    }

    if (opts.actionText && typeof opts.onAction === 'function') {
      var btn = document.createElement('button');
      btn.textContent   = opts.actionText;
      btn.style.cssText = [
        'margin-top:8px',
        'padding:10px 24px',
        'border-radius:4px',
        'border:none',
        'background:var(--color-primary)',
        'color:var(--color-on-primary)',
        'font-size:14px',
        'font-weight:600',
        'cursor:pointer',
        'transition:opacity 0.15s',
      ].join(';');
      btn.addEventListener('click', opts.onAction);
      wrap.appendChild(btn);
    }

    opts.container.appendChild(wrap);
  }

  function clearEmptyState(container) {
    if (!container) return;
    var existing = container.querySelector('.' + EMPTY_STATE_CLASS);
    if (existing) existing.parentNode.removeChild(existing);
  }

  // ── Badge Status Tugas & Proyek ──
  var _BADGE_STYLES = {
    'To-do':       { bg: 'var(--color-surface-container-highest)', color: 'var(--color-on-surface-variant)', label: 'To-do' },
    'In-Progress': { bg: 'rgba(21,101,192,0.12)',                  color: '#1565c0',                         label: 'In Progress' },
    'Done':        { bg: 'rgba(26,122,74,0.12)',                   color: '#1a7a4a',                         label: 'Selesai' },
    'Aktif':       { bg: 'rgba(26,122,74,0.12)',                   color: '#1a7a4a',                         label: 'Aktif' },
    'Tertunda':    { bg: 'rgba(230,120,0,0.12)',                   color: '#e67800',                         label: 'Tertunda' },
    'Selesai':     { bg: 'rgba(26,122,74,0.12)',                   color: '#1a7a4a',                         label: 'Selesai' },
    'Diarsipkan':  { bg: 'var(--color-surface-container-highest)', color: 'var(--color-on-surface-variant)', label: 'Diarsipkan' },
  };

  function getStatusBadgeHTML(status) {
    var style = _BADGE_STYLES[status] || {
      bg:    'var(--color-surface-container)',
      color: 'var(--color-on-surface-variant)',
      label: status || '-',
    };
    return '<span style="' + [
      'display:inline-flex',
      'align-items:center',
      'padding:3px 10px',
      'border-radius:4px',
      'font-size:11px',
      'font-weight:600',
      'letter-spacing:0.02em',
      'white-space:nowrap',
      'background:' + style.bg,
      'color:' + style.color,
    ].join(';') + '">' + _escapeHTML(style.label) + '</span>';
  }

  // ── Format Tanggal Deadline (Bahasa Indonesia) ──
  function formatDeadline(dateStr) {
    if (!dateStr) return { text: 'Tidak ada deadline', isOverdue: false, daysLeft: null };

    var today    = new Date();
    today.setHours(0, 0, 0, 0);

    var parts    = dateStr.split('-');
    var deadline = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    );
    deadline.setHours(0, 0, 0, 0);

    var diffMs   = deadline - today;
    var daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

    var text, isOverdue;

    if (daysLeft < 0) {
      isOverdue = true;
      var daysLate = Math.abs(daysLeft);
      if (daysLate === 1) {
        text = 'Kemarin (Terlambat)';
      } else {
        text = daysLate + ' hari lalu (Terlambat)';
      }
    } else if (daysLeft === 0) {
      isOverdue = false;
      text      = 'Hari ini';
    } else if (daysLeft === 1) {
      isOverdue = false;
      text      = 'Besok';
    } else if (daysLeft <= 7) {
      isOverdue = false;
      text      = daysLeft + ' hari lagi';
    } else if (daysLeft <= 30) {
      var weeks = Math.floor(daysLeft / 7);
      isOverdue = false;
      text      = weeks === 1 ? '1 minggu lagi' : weeks + ' minggu lagi';
    } else {
      var months = Math.floor(daysLeft / 30);
      isOverdue  = false;
      text       = months === 1 ? '1 bulan lagi' : months + ' bulan lagi';
    }

    return { text: text, isOverdue: isOverdue, daysLeft: daysLeft };
  }

  function _escapeHTML(str) {
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  // ── Helper Pemilih Status Pill (Modal Proyek & Tugas) ──
  var PILL_ACTIVE_CLASSES = [
    'bg-[#1c1c19]',
    'text-white',
    'border-[#1c1c19]',
    'dark:bg-[#f4efe6]',
    'dark:text-[#0e0f12]',
    'dark:border-[#f4efe6]'
  ];
  var PILL_INACTIVE_CLASSES = [
    'bg-surface-container-lowest',
    'text-on-surface-variant',
    'border-outline-variant/30',
    'dark:bg-[#1f2029]',
    'dark:text-[#9e9a92]',
    'dark:border-[#2a2c36]'
  ];

  function syncStatusPills(containerOrId, activeValue) {
    var container = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
    if (!container) return;

    var hiddenInputId = container.getAttribute('data-hidden-input');
    var hiddenInput = hiddenInputId ? document.getElementById(hiddenInputId) : container.querySelector('input[type="hidden"]');
    if (!hiddenInput && container.previousElementSibling && container.previousElementSibling.type === 'hidden') {
      hiddenInput = container.previousElementSibling;
    }

    var targetVal = (activeValue || (hiddenInput ? hiddenInput.value : '') || '').trim().toLowerCase();
    var buttons = container.querySelectorAll('.status-pill-btn, button[data-status-val]');

    buttons.forEach(function (btn) {
      var btnVal = (btn.getAttribute('data-status-val') || btn.textContent.trim()).toLowerCase();
      var isSelected = (btnVal === targetVal) ||
                       (targetVal && btnVal.indexOf(targetVal) !== -1) ||
                       (targetVal && targetVal.indexOf(btnVal) !== -1);

      if (isSelected) {
        PILL_INACTIVE_CLASSES.forEach(function (c) { btn.classList.remove(c); });
        PILL_ACTIVE_CLASSES.forEach(function (c) { btn.classList.add(c); });
        btn.setAttribute('aria-pressed', 'true');
        if (hiddenInput) {
          hiddenInput.value = btn.getAttribute('data-status-val') || btn.textContent.trim();
        }
      } else {
        PILL_ACTIVE_CLASSES.forEach(function (c) { btn.classList.remove(c); });
        PILL_INACTIVE_CLASSES.forEach(function (c) { btn.classList.add(c); });
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  // Delegasi klik untuk tombol pill status form
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.status-pill-btn, [data-status-val]');
    if (!btn) return;
    var container = btn.closest('[data-status-selector], [data-hidden-input], #project-status-selector, #task-status-selector, #modal-quick-task-status-selector');
    if (!container) return;

    e.preventDefault();
    var val = btn.getAttribute('data-status-val') || btn.textContent.trim();
    syncStatusPills(container, val);
  });

  // Ekspor modul UI
  window.URUI = {
    showToast:          showToast,
    showConfirmModal:   showConfirmModal,
    showEmptyState:     showEmptyState,
    clearEmptyState:    clearEmptyState,
    getStatusBadgeHTML: getStatusBadgeHTML,
    formatDeadline:     formatDeadline,
    syncStatusPills:    syncStatusPills,
  };
}());
