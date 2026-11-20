/**
 * UR TASK - js/dashboard.js
 * Logika halaman dashboard: statistik progres tugas, ringkasan deadline, dan tambah tugas cepat.
 */
(function () {
  'use strict';

  var currentSession = null;

  document.addEventListener('DOMContentLoaded', function () {
    // Validasi sesi aktif
    currentSession = URAuth.checkAuth();
    if (!currentSession) return;

    // Tampilkan sapaan nama pengguna
    var greetingEl = document.getElementById('greeting-name');
    if (greetingEl) {
      greetingEl.innerHTML = 'Halo, <span class="italic font-normal">' + _escapeHTML(currentSession.name) + '</span>';
    }

    var initials = URAuth.getInitials(currentSession.name);
    var asideAvatar = document.getElementById('user-avatar-initials-aside');
    if (asideAvatar) asideAvatar.textContent = initials;
    var topAvatar = document.getElementById('user-avatar-initials-top');
    if (topAvatar) topAvatar.textContent = initials;

    // Render data dashboard
    renderDashboard();

    // Inisialisasi tombol toggle tema
    if (typeof URTheme !== 'undefined' && URTheme.initThemeToggleButtons) {
      URTheme.initThemeToggleButtons();
    }
  });

  function renderDashboard() {
    if (!currentSession) return;
    var userId = currentSession.id;

    var projects = URStorage.getProjects(userId);
    var allTasks = URStorage.getAllUserTasks(userId);

    var projectMap = {};
    projects.forEach(function (p) { projectMap[p.id] = p; });

    // Kartu 1: Total Proyek Aktif
    var projectCountEl = document.getElementById('stat-project-count');
    var projectDescEl = document.getElementById('stat-project-desc');
    if (projectCountEl) projectCountEl.textContent = projects.length;
    if (projectDescEl) {
      if (projects.length === 0) {
        projectDescEl.textContent = 'Belum ada proyek aktif. Silakan buat di menu Proyek.';
      } else {
        var names = projects.slice(0, 2).map(function (p) { return p.name; }).join(', ');
        projectDescEl.textContent = names + (projects.length > 2 ? ' +' + (projects.length - 2) + ' lainnya' : '.');
      }
    }

    // Kartu 2: Distribusi Status Tugas
    var todoTasks = allTasks.filter(function (t) { return t.status === 'To-do'; });
    var progressTasks = allTasks.filter(function (t) { return t.status === 'In-Progress'; });
    var doneTasks = allTasks.filter(function (t) { return t.status === 'Done'; });

    var totalTasks = allTasks.length;
    var todoCountEl = document.getElementById('stat-todo-count');
    var progressCountEl = document.getElementById('stat-progress-count');
    var doneCountEl = document.getElementById('stat-done-count');
    var totalTasksBadgeEl = document.getElementById('stat-total-tasks-badge');
    var completionPctEl = document.getElementById('stat-completion-pct');

    if (todoCountEl) todoCountEl.textContent = todoTasks.length;
    if (progressCountEl) progressCountEl.textContent = progressTasks.length;
    if (doneCountEl) doneCountEl.textContent = doneTasks.length;
    if (totalTasksBadgeEl) totalTasksBadgeEl.textContent = totalTasks + ' Total Tugas';

    var donePct = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;
    var progressPct = totalTasks > 0 ? Math.round((progressTasks.length / totalTasks) * 100) : 0;
    var todoPct = totalTasks > 0 ? (100 - donePct - progressPct) : 0;

    if (completionPctEl) completionPctEl.textContent = donePct + '% Selesai';

    var barDone = document.getElementById('bar-done');
    var barProgress = document.getElementById('bar-progress');
    var barTodo = document.getElementById('bar-todo');

    if (barDone) barDone.style.width = (totalTasks > 0 ? donePct : 0) + '%';
    if (barProgress) barProgress.style.width = (totalTasks > 0 ? progressPct : 0) + '%';
    if (barTodo) barTodo.style.width = (totalTasks > 0 ? todoPct : 0) + '%';

    // Kartu 3: Tugas Mendesak & Lewat Deadline
    var openTasks = allTasks.filter(function (t) { return t.status !== 'Done'; });
    var urgentCount = 0;
    var overdueCount = 0;

    openTasks.forEach(function (t) {
      if (t.deadline) {
        var fmt = URUI.formatDeadline(t.deadline);
        if (fmt.isOverdue) overdueCount++;
        else if (fmt.daysLeft <= 3) urgentCount++;
      }
    });

    var urgentTotal = overdueCount + urgentCount;
    var urgentCountEl = document.getElementById('stat-urgent-count');
    var urgentBadgeEl = document.getElementById('stat-urgent-badge');
    var urgentDescEl = document.getElementById('stat-urgent-desc');
    var urgentStatusEl = document.getElementById('stat-urgent-status');

    if (urgentCountEl) urgentCountEl.textContent = urgentTotal;
    if (urgentBadgeEl) {
      if (overdueCount > 0) {
        urgentBadgeEl.innerHTML = '<span>' + overdueCount + ' TERLAMBAT</span>';
        urgentBadgeEl.className = 'inline-flex items-center px-2 py-0.5 rounded whitespace-nowrap shrink-0 text-[10px] font-semibold tracking-wider uppercase bg-error text-on-error';
      } else if (urgentCount > 0) {
        urgentBadgeEl.innerHTML = '<span>' + urgentCount + ' MENDESAK</span>';
        urgentBadgeEl.className = 'inline-flex items-center px-2 py-0.5 rounded whitespace-nowrap shrink-0 text-[10px] font-semibold tracking-wider uppercase bg-secondary text-on-secondary';
      } else {
        urgentBadgeEl.innerHTML = '<span>TERKENDALI</span>';
        urgentBadgeEl.className = 'inline-flex items-center px-2 py-0.5 rounded whitespace-nowrap shrink-0 text-[10px] font-semibold tracking-wider uppercase bg-emerald-700 text-white';
      }
    }
    if (urgentDescEl) {
      if (overdueCount > 0) {
        urgentDescEl.textContent = overdueCount + ' tugas punya deadline yang sudah lewat!';
      } else if (urgentCount > 0) {
        urgentDescEl.textContent = urgentCount + ' tugas punya deadline kurang dari 3 hari lagi.';
      } else {
        urgentDescEl.textContent = 'Semua tugas saat ini berjalan sesuai jadwal dan terkendali.';
      }
    }
    if (urgentStatusEl) {
      urgentStatusEl.textContent = overdueCount > 0 ? 'Perlu tindakan perbaikan segera' : (urgentCount > 0 ? 'Segera selesaikan minggu ini' : 'Alur kerja optimal');
    }

    // Dropdown pilihan proyek
    populateProjectDropdowns(projects);

    // Proyek unggulan
    renderFeaturedProject(projects, allTasks);

    // Daftar deadline terdekat
    renderDeadlineTasks(allTasks, projectMap);
  }

  function populateProjectDropdowns(projects) {
    var quickSelect = document.getElementById('quick-task-project-select');
    var modalSelect = document.getElementById('modal-task-project');

    var optionsHTML = '<option value="" disabled selected>Pilih Proyek...</option>';
    if (projects.length === 0) {
      optionsHTML = '<option value="" disabled selected>Belum ada proyek (Buat proyek dulu)</option>';
    } else {
      projects.forEach(function (p) {
        optionsHTML += '<option value="' + _escapeHTML(p.id) + '">' + _escapeHTML(p.name) + '</option>';
      });
    }

    if (quickSelect) quickSelect.innerHTML = optionsHTML;
    if (modalSelect) modalSelect.innerHTML = optionsHTML;
  }

  function renderFeaturedProject(projects, allTasks) {
    var nameEl = document.getElementById('featured-project-name');
    var descEl = document.getElementById('featured-project-desc');
    var pctEl = document.getElementById('featured-project-pct');
    var barEl = document.getElementById('featured-project-bar');
    var countEl = document.getElementById('featured-project-task-count');
    var badgeEl = document.getElementById('featured-project-badge');

    if (projects.length === 0) {
      if (nameEl) nameEl.textContent = 'Belum Ada Proyek Aktif';
      if (descEl) descEl.textContent = 'Mulai susun inisiatif atau proyek baru kamu sekarang.';
      if (pctEl) pctEl.textContent = '0%';
      if (barEl) barEl.style.width = '0%';
      if (countEl) countEl.textContent = '0 Tugas';
      if (badgeEl) badgeEl.textContent = 'Kosong';
      return;
    }

    var featured = projects[0];
    var projectTasks = allTasks.filter(function (t) { return t.projectId === featured.id; });
    var doneTasks = projectTasks.filter(function (t) { return t.status === 'Done'; });
    var pct = projectTasks.length > 0 ? Math.round((doneTasks.length / projectTasks.length) * 100) : 0;

    if (nameEl) nameEl.textContent = featured.name;
    if (descEl) descEl.textContent = featured.description || 'Belum ada deskripsi.';
    if (pctEl) pctEl.textContent = pct + '%';
    if (barEl) barEl.style.width = pct + '%';
    if (countEl) countEl.textContent = projectTasks.length + ' Tugas Terhubung (' + doneTasks.length + ' Selesai)';
    if (badgeEl) badgeEl.textContent = featured.status || 'Aktif';
  }

  function renderDeadlineTasks(allTasks, projectMap) {
    var container = document.getElementById('deadline-tasks-container');
    if (!container) return;
    container.innerHTML = '';

    var pendingTasks = allTasks.filter(function (t) { return t.status !== 'Done'; });

    if (pendingTasks.length === 0) {
      URUI.showEmptyState({
        container: container,
        icon: 'task_alt',
        title: 'Tidak Ada Tugas Mendesak',
        message: 'Semua tugas telah diselesaikan atau belum ada tugas aktif. Waktunya bersantai!'
      });
      return;
    }

    pendingTasks.sort(function (a, b) {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });

    var topTasks = pendingTasks.slice(0, 6);

    topTasks.forEach(function (task) {
      var project = projectMap[task.projectId] || { name: 'Proyek Tidak Ditemukan' };
      var deadlineInfo = URUI.formatDeadline(task.deadline);

      var card = document.createElement('div');
      card.className = 'task-card rounded-lg bg-surface-container-lowest p-space-md border border-outline-variant/20 dark:border-[#2a2c36] shadow-[0_4px_16px_rgba(54,46,38,0.04)] hover:shadow-md transition-all flex items-start gap-space-sm group';
      card.setAttribute('data-task-id', task.id);

      var isDone = task.status === 'Done';
      var checkedClass = isDone ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-transparent hover:border-primary hover:text-primary';

      card.innerHTML = `
        <button aria-label="Tandai selesai" class="w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all shrink-0 ${checkedClass}" onclick="toggleTaskStatusFromDashboard('${task.id}')">
          <span class="material-symbols-outlined text-[14px]">check</span>
        </button>
        <div class="flex flex-col flex-grow min-w-0">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="font-label-sm text-label-sm text-secondary uppercase tracking-widest font-semibold truncate">
              ${_escapeHTML(project.name)}
            </span>
            ${URUI.getStatusBadgeHTML(task.status)}
          </div>
          <h3 class="task-title font-body-lg text-body-lg text-primary font-medium tracking-tight truncate transition-all">
            ${_escapeHTML(task.title)}
          </h3>
          <div class="flex items-center gap-3 mt-2 text-on-surface-variant font-body-sm text-body-sm flex-wrap">
            <span class="flex items-center gap-1 ${deadlineInfo.isOverdue ? 'text-error font-semibold' : 'text-on-surface-variant'}">
              <span class="material-symbols-outlined text-[15px]">${deadlineInfo.isOverdue ? 'warning' : 'event'}</span>
              ${deadlineInfo.text}
            </span>
            ${task.attachmentMeta ? `
              <span class="text-outline-variant/60">/</span>
              <span class="flex items-center gap-1 text-secondary">
                <span class="material-symbols-outlined text-[15px]">attachment</span>
                ${_escapeHTML(task.attachmentMeta.name)}
              </span>
            ` : ''}
            <span class="text-outline-variant/60">/</span>
            <a href="projects.html" class="text-secondary hover:text-primary transition-colors font-medium">Buka Proyek →</a>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  // Pengubah status selesai langsung dari kartu dashboard
  window.toggleTaskStatusFromDashboard = function (taskId) {
    var task = URStorage.getTaskById(taskId);
    if (!task) return;
    var newStatus = task.status === 'Done' ? 'To-do' : 'Done';
    URStorage.updateTaskStatus(taskId, newStatus);
    URUI.showToast('Tugas ditandai sebagai ' + newStatus + '!', 'success');
    renderDashboard();
  };

  // Submit tugas cepat dari baris input
  window.handleQuickTaskSubmit = function (e) {
    e.preventDefault();
    if (!currentSession) return;

    var titleInput = document.getElementById('quick-task-title');
    var projectSelect = document.getElementById('quick-task-project-select');
    var deadlineInput = document.getElementById('quick-task-deadline');

    var title = titleInput ? titleInput.value.trim() : '';
    var projectId = projectSelect ? projectSelect.value : '';
    var deadline = deadlineInput ? deadlineInput.value : '';

    if (!title) {
      URUI.showToast('Judul tugas tidak boleh kosong.', 'error');
      return;
    }
    if (!projectId) {
      URUI.showToast('Silakan pilih proyek terlebih dahulu.', 'error');
      return;
    }

    var newTask = {
      projectId: projectId,
      userId: currentSession.id,
      title: title,
      description: '',
      deadline: deadline || null,
      status: 'To-do',
      attachmentMeta: null
    };

    URStorage.saveTask(newTask);
    URUI.showToast('Tugas baru berhasil ditambahkan!', 'success');

    if (titleInput) titleInput.value = '';
    if (deadlineInput) deadlineInput.value = '';

    renderDashboard();
  };

  // Submit modal tugas cepat
  window.handleModalQuickTaskSubmit = function (e) {
    e.preventDefault();
    if (!currentSession) return;

    var title = document.getElementById('modal-task-title').value.trim();
    var projectId = document.getElementById('modal-task-project').value;
    var deadline = document.getElementById('modal-task-deadline').value;
    var status = document.getElementById('modal-task-status').value || 'To-do';

    if (!title || !projectId) {
      URUI.showToast('Harap lengkapi judul dan proyek tugas.', 'error');
      return;
    }

    var newTask = {
      projectId: projectId,
      userId: currentSession.id,
      title: title,
      description: '',
      deadline: deadline || null,
      status: status,
      attachmentMeta: null
    };

    URStorage.saveTask(newTask);
    URUI.showToast('Tugas berhasil dibuat!', 'success');

    var modal = document.getElementById('modal-quick-task');
    if (modal) modal.close();

    document.getElementById('modal-quick-task-form').reset();
    renderDashboard();
  };

  window.openQuickTaskModal = function () {
    var modal = document.getElementById('modal-quick-task');
    if (modal) {
      if (window.URUI && URUI.syncStatusPills) {
        URUI.syncStatusPills('modal-quick-task-status-selector', 'To-do');
      }
      modal.showModal();
    }
  };

  function _escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
