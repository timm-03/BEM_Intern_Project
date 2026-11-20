/**
 * UR TASK - js/layout.js
 * Sinkronisasi komponen navigasi, avatar inisial pengguna, dan tema antar halaman.
 */
(function () {
  'use strict';

  window.URLayout = {
    init: function () {
      // Sinkronisasi inisial avatar pengguna
      var session = null;
      if (typeof URStorage !== 'undefined' && URStorage.getSession) {
        session = URStorage.getSession();
      }

      if (session && session.name) {
        var initials = (typeof URAuth !== 'undefined' && typeof URAuth.getInitials === 'function')
          ? URAuth.getInitials(session.name)
          : session.name.charAt(0).toUpperCase();

        var asideAvatar = document.getElementById('user-avatar-initials-aside');
        if (asideAvatar) asideAvatar.textContent = initials;
        var topAvatar = document.getElementById('user-avatar-initials-top');
        if (topAvatar) topAvatar.textContent = initials;
      }

      // Sinkronisasi tombol tema
      if (typeof URTheme !== 'undefined' && URTheme.initThemeToggleButtons) {
        URTheme.initThemeToggleButtons();
      }
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    URLayout.init();
  });
})();
