/**
 * UR TASK - storage.js
 * Manajemen penyimpanan data aplikasi: LocalStorage & IndexedDB (File Attachments).
 */
(function () {
  'use strict';

  // Kunci penyimpanan LocalStorage
  var KEYS = {
    users:    'urtask_users',
    session:  'urtask_session',
    projects: 'urtask_projects',
    tasks:    'urtask_tasks',
  };

  var IDB_DB_NAME    = 'urtask_attachments';
  var IDB_STORE_NAME = 'files';
  var IDB_VERSION    = 1;

  // Utilitas pembacaan dan penyimpanan LocalStorage
  function _get(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function _now() {
    return new Date().toISOString();
  }

  function _daysFromNow(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  // ── IndexedDB untuk Lampiran File ──
  var _db = null;

  function initDB() {
    return new Promise(function (resolve, reject) {
      if (_db) { resolve(_db); return; }
      if (!window.indexedDB) { resolve(null); return; }

      var req = window.indexedDB.open(IDB_DB_NAME, IDB_VERSION);

      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME, { keyPath: 'key' });
        }
      };

      req.onsuccess = function (e) {
        _db = e.target.result;
        resolve(_db);
      };

      req.onerror = function (e) {
        reject(e.target.error);
      };
    });
  }

  function saveAttachment(key, blob) {
    return initDB().then(function (db) {
      if (!db) return;
      return new Promise(function (resolve, reject) {
        var tx   = db.transaction(IDB_STORE_NAME, 'readwrite');
        var store = tx.objectStore(IDB_STORE_NAME);
        var req  = store.put({ key: key, blob: blob });
        req.onsuccess = function () { resolve(); };
        req.onerror   = function (e) { reject(e.target.error); };
      });
    });
  }

  function getAttachment(key) {
    return initDB().then(function (db) {
      if (!db) return null;
      return new Promise(function (resolve, reject) {
        var tx    = db.transaction(IDB_STORE_NAME, 'readonly');
        var store = tx.objectStore(IDB_STORE_NAME);
        var req   = store.get(key);
        req.onsuccess = function (e) {
          resolve(e.target.result ? e.target.result.blob : null);
        };
        req.onerror = function (e) { reject(e.target.error); };
      });
    });
  }

  function deleteAttachment(key) {
    return initDB().then(function (db) {
      if (!db) return;
      return new Promise(function (resolve, reject) {
        var tx    = db.transaction(IDB_STORE_NAME, 'readwrite');
        var store = tx.objectStore(IDB_STORE_NAME);
        var req   = store.delete(key);
        req.onsuccess = function () { resolve(); };
        req.onerror   = function (e) { reject(e.target.error); };
      });
    });
  }

  // ── Manajemen Pengguna & Sesi ──
  function getUsers() {
    return _get(KEYS.users) || [];
  }

  function saveUsers(users) {
    _set(KEYS.users, users);
  }

  function findUserByEmail(email) {
    var users = getUsers();
    return users.find(function (u) {
      return u.email.toLowerCase() === email.toLowerCase();
    }) || null;
  }

  function getSession() {
    return _get(KEYS.session);
  }

  function saveSession(user) {
    _set(KEYS.session, {
      id:    user.id,
      name:  user.name,
      email: user.email,
    });
  }

  function clearSession() {
    try {
      localStorage.removeItem(KEYS.session);
    } catch (_) {}
  }

  function registerUser(opts) {
    var name     = (opts.name     || '').trim();
    var email    = (opts.email    || '').trim().toLowerCase();
    var password = (opts.password || '');

    if (!name)                        return { success: false, error: 'Nama wajib diisi.' };
    if (!email || !/\S+@\S+\.\S+/.test(email)) return { success: false, error: 'Email tidak valid.' };
    if (password.length < 6)          return { success: false, error: 'Password minimal 6 karakter.' };

    if (findUserByEmail(email)) {
      return { success: false, error: 'Email sudah terdaftar.' };
    }

    var users = getUsers();
    var user  = {
      id:        generateId(),
      name:      name,
      email:     email,
      password:  password,
      createdAt: _now(),
    };
    users.push(user);
    saveUsers(users);
    saveSession(user);
    return { success: true, user: user };
  }

  function loginUser(opts) {
    var email    = (opts.email    || '').trim().toLowerCase();
    var password = (opts.password || '');

    if (!email)    return { success: false, error: 'Email wajib diisi.' };
    if (!password) return { success: false, error: 'Password wajib diisi.' };

    var user = findUserByEmail(email);
    if (!user)                      return { success: false, error: 'Email tidak ditemukan.' };
    if (user.password !== password) return { success: false, error: 'Password salah.' };

    saveSession(user);
    return { success: true, user: user };
  }

  // ── Manajemen Proyek ──
  function _getAllProjects() {
    return _get(KEYS.projects) || [];
  }

  function _saveAllProjects(projects) {
    _set(KEYS.projects, projects);
  }

  function getAllProjects(userId) {
    if (!userId) return _getAllProjects();
    return _getAllProjects().filter(function (p) { return p.userId === userId; });
  }

  function getProjects(userId) {
    if (!userId) return _getAllProjects().filter(function (p) { return !p.isArchived; });
    return getAllProjects(userId).filter(function (p) { return !p.isArchived; });
  }

  function getArchivedProjects(userId) {
    if (!userId) return _getAllProjects().filter(function (p) { return !!p.isArchived; });
    return getAllProjects(userId).filter(function (p) { return !!p.isArchived; });
  }

  function getProjectById(projectId) {
    return _getAllProjects().find(function (p) { return p.id === projectId; }) || null;
  }

  function saveProject(project) {
    var all = _getAllProjects();
    var idx = all.findIndex(function (p) { return p.id === project.id; });
    if (idx >= 0) {
      all[idx] = project;
    } else {
      if (!project.id)        project.id        = generateId();
      if (!project.createdAt) project.createdAt = _now();
      if (project.isArchived  === undefined) project.isArchived = false;
      all.push(project);
    }
    _saveAllProjects(all);
    return project;
  }

  function deleteProject(projectId, userId) {
    // Hapus lampiran pada semua tugas di proyek ini
    var tasks = getTasks(projectId);
    tasks.forEach(function (task) {
      if (task.attachmentMeta && task.attachmentMeta.key) {
        deleteAttachment(task.attachmentMeta.key).catch(function () {});
      }
    });

    // Hapus daftar tugas terkait
    var allTasks = _get(KEYS.tasks) || [];
    _set(KEYS.tasks, allTasks.filter(function (t) { return t.projectId !== projectId; }));

    // Hapus proyek
    var all = _getAllProjects().filter(function (p) {
      return !(p.id === projectId && p.userId === userId);
    });
    _saveAllProjects(all);
  }

  function archiveProject(projectId, userId) {
    var all = _getAllProjects();
    var idx = all.findIndex(function (p) { return p.id === projectId && p.userId === userId; });
    if (idx < 0) return null;
    all[idx].isArchived = true;
    all[idx].archivedAt = _now();
    _saveAllProjects(all);
    return all[idx];
  }

  function unarchiveProject(projectId, userId) {
    var all = _getAllProjects();
    var idx = all.findIndex(function (p) { return p.id === projectId && p.userId === userId; });
    if (idx < 0) return null;
    all[idx].isArchived = false;
    delete all[idx].archivedAt;
    _saveAllProjects(all);
    return all[idx];
  }

  // ── Manajemen Tugas ──
  function _getAllTasks() {
    return _get(KEYS.tasks) || [];
  }

  function _saveAllTasks(tasks) {
    _set(KEYS.tasks, tasks);
  }

  function getTasks(projectId) {
    return _getAllTasks().filter(function (t) { return t.projectId === projectId; });
  }

  function getAllUserTasks(userId) {
    if (!userId) return _getAllTasks();
    var userProjectIds = getAllProjects(userId).map(function (p) { return p.id; });
    return _getAllTasks().filter(function (t) { return userProjectIds.indexOf(t.projectId) >= 0; });
  }

  function getTaskById(taskId) {
    return _getAllTasks().find(function (t) { return t.id === taskId; }) || null;
  }

  function saveTask(task) {
    var all = _getAllTasks();
    var idx = all.findIndex(function (t) { return t.id === task.id; });
    if (idx >= 0) {
      all[idx] = task;
    } else {
      if (!task.id)             task.id             = generateId();
      if (!task.createdAt)      task.createdAt      = _now();
      if (task.attachmentMeta  === undefined) task.attachmentMeta = null;
      all.push(task);
    }
    _saveAllTasks(all);
    return task;
  }

  function deleteTask(taskId) {
    var task = getTaskById(taskId);
    if (!task) return;
    if (task.attachmentMeta && task.attachmentMeta.key) {
      deleteAttachment(task.attachmentMeta.key).catch(function () {});
    }
    _saveAllTasks(_getAllTasks().filter(function (t) { return t.id !== taskId; }));
  }

  function updateTaskStatus(taskId, newStatus) {
    var all = _getAllTasks();
    var idx = all.findIndex(function (t) { return t.id === taskId; });
    if (idx < 0) return null;
    all[idx].status = newStatus;
    _saveAllTasks(all);
    return all[idx];
  }

  // Data demo untuk pengguna baru jika diperlukan
  function seedDemoData(userId) {
    var p1 = saveProject({
      id:          generateId(),
      userId:      userId,
      name:        'Redesign Website',
      description: 'Perombakan total tampilan dan UX website perusahaan.',
      deadline:    _daysFromNow(14),
      status:      'Aktif',
      isArchived:  false,
      createdAt:   _now(),
    });

    saveTask({
      id:             generateId(),
      projectId:      p1.id,
      userId:         userId,
      title:          'Riset kompetitor & benchmark',
      description:    'Analisis 5 kompetitor utama dan buat laporan perbandingan.',
      deadline:       _daysFromNow(-3),
      status:         'Done',
      attachmentMeta: null,
      createdAt:      _now(),
    });

    saveTask({
      id:             generateId(),
      projectId:      p1.id,
      userId:         userId,
      title:          'Wireframe halaman utama',
      description:    'Buat wireframe low-fidelity untuk halaman landing.',
      deadline:       _daysFromNow(1),
      status:         'In-Progress',
      attachmentMeta: null,
      createdAt:      _now(),
    });

    saveTask({
      id:             generateId(),
      projectId:      p1.id,
      userId:         userId,
      title:          'Desain UI mockup',
      description:    'Konversi wireframe ke mockup hi-fi di Figma.',
      deadline:       _daysFromNow(7),
      status:         'To-do',
      attachmentMeta: null,
      createdAt:      _now(),
    });
  }

  // Ekspor modul
  window.URStorage = {
    generateId:          generateId,
    getUsers:            getUsers,
    saveUsers:           saveUsers,
    getSession:          getSession,
    saveSession:         saveSession,
    clearSession:        clearSession,
    findUserByEmail:     findUserByEmail,
    registerUser:        registerUser,
    loginUser:           loginUser,
    getProjects:         getProjects,
    getAllProjects:      getAllProjects,
    getArchivedProjects: getArchivedProjects,
    saveProject:         saveProject,
    deleteProject:       deleteProject,
    archiveProject:      archiveProject,
    unarchiveProject:    unarchiveProject,
    getProjectById:      getProjectById,
    getTasks:            getTasks,
    getAllUserTasks:     getAllUserTasks,
    saveTask:            saveTask,
    deleteTask:          deleteTask,
    getTaskById:         getTaskById,
    updateTaskStatus:    updateTaskStatus,
    seedDemoData:        seedDemoData,
    initDB:              initDB,
    saveAttachment:      saveAttachment,
    getAttachment:       getAttachment,
    deleteAttachment:    deleteAttachment,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initDB().catch(function () {}); });
  } else {
    initDB().catch(function () {});
  }
}());
