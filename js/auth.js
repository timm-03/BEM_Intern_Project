/**
 * UR TASK — auth.js
 * Modul autentikasi: proteksi sesi, login, registrasi, dan logout.
 */
(function () {
  'use strict';

  // Inisial nama untuk avatar pengguna
  function getInitials(name) {
    if (!name) return '??';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
  }

  // Pengecekan sesi aktif pengguna
  function checkAuth() {
    var session = URStorage.getSession();
    if (!session) {
      window.location.href = 'auth.html';
      return null;
    }
    return session;
  }

  // Keluar dari sesi login
  function logout() {
    URStorage.clearSession();
    window.location.href = 'auth.html';
  }

  // Inisialisasi logika pada halaman autentikasi
  function initAuthPage() {
    // Jika sudah memiliki sesi login, langsung arahkan ke dashboard
    if (URStorage.getSession()) {
      window.location.href = 'dashboard.html';
      return;
    }

    var tabLogin      = document.getElementById('tab-login') || document.getElementById('tab-login-btn');
    var tabRegister   = document.getElementById('tab-register') || document.getElementById('tab-register-btn');
    var panelLogin    = document.getElementById('panel-login');
    var panelRegister = document.getElementById('panel-register');

    var loginForm     = document.getElementById('form-login');
    var registerForm  = document.getElementById('form-register');

    // Penggantian tab form (Masuk / Daftar)
    function activateTab(tab) {
      var isLogin = (tab === 'login');

      if (tabLogin) {
        tabLogin.classList.toggle('active', isLogin);
        tabLogin.setAttribute('aria-selected', isLogin ? 'true' : 'false');
      }
      if (tabRegister) {
        tabRegister.classList.toggle('active', !isLogin);
        tabRegister.setAttribute('aria-selected', !isLogin ? 'true' : 'false');
      }
      if (panelLogin)    panelLogin.hidden    = !isLogin;
      if (panelRegister) panelRegister.hidden = isLogin;
    }

    if (tabLogin) {
      tabLogin.addEventListener('click', function () { activateTab('login'); });
    }
    if (tabRegister) {
      tabRegister.addEventListener('click', function () { activateTab('register'); });
    }

    activateTab('login');

    var toRegisterLinks = document.querySelectorAll('[data-goto="register"]');
    var toLoginLinks    = document.querySelectorAll('[data-goto="login"]');
    toRegisterLinks.forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); activateTab('register'); });
    });
    toLoginLinks.forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); activateTab('login'); });
    });

    // Validasi format email
    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function setFieldError(fieldEl, message) {
      if (!fieldEl) return;
      fieldEl.classList.add('input--error');
      var errId  = fieldEl.id + '-error';
      var errEl  = document.getElementById(errId);
      if (!errEl) {
        errEl = document.createElement('p');
        errEl.id        = errId;
        errEl.className = 'field-error';
        errEl.setAttribute('role', 'alert');
        fieldEl.parentNode.insertBefore(errEl, fieldEl.nextSibling);
      }
      errEl.textContent = message;
      fieldEl.setAttribute('aria-describedby', errId);
    }

    function clearFieldError(fieldEl) {
      if (!fieldEl) return;
      fieldEl.classList.remove('input--error');
      var errEl = document.getElementById(fieldEl.id + '-error');
      if (errEl) errEl.textContent = '';
    }

    function clearAllErrors(form) {
      if (!form) return;
      form.querySelectorAll('.input--error').forEach(function (el) {
        el.classList.remove('input--error');
      });
      form.querySelectorAll('.field-error').forEach(function (el) {
        el.textContent = '';
      });
    }

    // Toggle visibilitas kata sandi
    document.querySelectorAll('[data-password-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.getAttribute('data-password-toggle');
        var input    = document.getElementById(targetId);
        if (!input) return;
        if (input.type === 'password') {
          input.type = 'text';
          btn.setAttribute('aria-label', 'Sembunyikan password');
        } else {
          input.type = 'password';
          btn.setAttribute('aria-label', 'Tampilkan password');
        }
      });
    });

    // Penanganan form login
    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearAllErrors(loginForm);

        var emailEl    = document.getElementById('login-email');
        var passwordEl = document.getElementById('login-password');
        var submitBtn  = loginForm.querySelector('[type="submit"]');

        var email    = emailEl    ? emailEl.value.trim()    : '';
        var password = passwordEl ? passwordEl.value        : '';

        var hasError = false;

        if (!email) {
          setFieldError(emailEl, 'Email wajib diisi.');
          hasError = true;
        } else if (!isValidEmail(email)) {
          setFieldError(emailEl, 'Format email tidak valid.');
          hasError = true;
        }

        if (!password) {
          setFieldError(passwordEl, 'Password wajib diisi.');
          hasError = true;
        }

        if (hasError) return;

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Memproses…'; }

        var result = URStorage.loginUser({ email: email, password: password });

        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Masuk'; }

        if (result.success) {
          URUI.showToast('Selamat datang kembali, ' + result.user.name + '!', 'success');
          setTimeout(function () { window.location.href = 'dashboard.html'; }, 800);
        } else {
          URUI.showToast(result.error, 'error');
          if (result.error.toLowerCase().includes('password')) {
            setFieldError(passwordEl, result.error);
          } else {
            setFieldError(emailEl, result.error);
          }
        }
      });

      loginForm.querySelectorAll('input').forEach(function (input) {
        input.addEventListener('input', function () { clearFieldError(input); });
      });
    }

    // Penanganan form registrasi
    if (registerForm) {
      registerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearAllErrors(registerForm);

        var nameEl     = document.getElementById('register-name');
        var emailEl    = document.getElementById('register-email');
        var passwordEl = document.getElementById('register-password');
        var submitBtn  = registerForm.querySelector('[type="submit"]');

        var name     = nameEl     ? nameEl.value.trim()     : '';
        var email    = emailEl    ? emailEl.value.trim()    : '';
        var password = passwordEl ? passwordEl.value        : '';

        var hasError = false;

        if (!name) {
          setFieldError(nameEl, 'Nama lengkap wajib diisi.');
          hasError = true;
        }

        if (!email) {
          setFieldError(emailEl, 'Email wajib diisi.');
          hasError = true;
        } else if (!isValidEmail(email)) {
          setFieldError(emailEl, 'Format email tidak valid.');
          hasError = true;
        }

        if (!password) {
          setFieldError(passwordEl, 'Password wajib diisi.');
          hasError = true;
        } else if (password.length < 6) {
          setFieldError(passwordEl, 'Password minimal 6 karakter.');
          hasError = true;
        }

        if (hasError) return;

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Mendaftar…'; }

        var result = URStorage.registerUser({ name: name, email: email, password: password });

        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Daftar'; }

        if (result.success) {
          URUI.showToast('Akun berhasil dibuat! Selamat datang, ' + result.user.name + '!', 'success');
          setTimeout(function () { window.location.href = 'dashboard.html'; }, 900);
        } else {
          URUI.showToast(result.error, 'error');
          if (result.error.toLowerCase().includes('email')) {
            setFieldError(emailEl, result.error);
          } else if (result.error.toLowerCase().includes('password')) {
            setFieldError(passwordEl, result.error);
          } else if (result.error.toLowerCase().includes('nama')) {
            setFieldError(nameEl, result.error);
          }
        }
      });

      registerForm.querySelectorAll('input').forEach(function (input) {
        input.addEventListener('input', function () { clearFieldError(input); });
      });
    }
  }

  // Ekspor API publik
  window.URAuth = {
    checkAuth:    checkAuth,
    logout:       logout,
    initAuthPage: initAuthPage,
    getInitials:  getInitials,
    login:        function(opts) { return URStorage.loginUser(opts); },
    register:     function(opts) { return URStorage.registerUser(opts); },
  };
}());
