/**
 * UR TASK - js/projects.js
 * Manajemen proyek dan tugas: CRUD, HTML5 Drag & Drop Kanban, lampiran file IndexedDB, serta filter pencarian.
 */

(function () {
  'use strict';

  var currentSession = null;
  var activeProjectId = null;
  var currentViewMode = 'kanban'; // 'kanban' or 'list'
  var currentStatusFilter = 'all'; // 'all', 'To-do', 'In-Progress', 'Done'
  var currentSearchQuery = '';
  var currentKanbanProjectFilter = 'all';

  // Temporary attachment state for task modal
  var tempSelectedFile = null;
  var tempRemoveAttachmentFlag = false;

  document.addEventListener('DOMContentLoaded', function () {
    // 1. Validasi sesi aktif
    currentSession = URAuth.checkAuth();
    if (!currentSession) return;

    // 2. Inisial avatar pengguna
    var initials = URAuth.getInitials(currentSession.name);
    var asideAvatar = document.getElementById('user-avatar-initials-aside');
    if (asideAvatar) asideAvatar.textContent = initials;
    var topAvatar = document.getElementById('user-avatar-initials-top');
    if (topAvatar) topAvatar.textContent = initials;

    // 3. Inisialisasi drag and drop kolom Kanban
    initKanbanDragAndDrop();

    // 4. Render awal
    renderAll();

    // 5. Inisialisasi tombol toggle tema
    if (typeof URTheme !== 'undefined' && URTheme.initThemeToggleButtons) {
      URTheme.initThemeToggleButtons();
    }
  });

  // ── Render Utama ──
  function renderAll() {
    if (!currentSession) return;
    var userId = currentSession.id;

    var projects = URStorage.getProjects(userId);
    var allTasks = URStorage.getAllUserTasks(userId);

    // Jika proyek aktif belum dipilih, gunakan proyek pertama
    if ((!activeProjectId || !projects.some(function (p) { return p.id === activeProjectId; })) && projects.length > 0) {
      activeProjectId = projects[0].id;
    }

    // Perbarui ringkasan statistik header
    updateHeaderStats(projects, allTasks);

    // Render tampilan aktif
    renderProjectsList(projects, allTasks);
    renderKanban(projects, allTasks);
    renderTasksList(projects, allTasks);

    // Perbarui opsi proyek di modal
    populateModalProjectSelects(projects);
  }

  function updateHeaderStats(projects, allTasks) {
    var pCountEl = document.getElementById('header-stat-projects');
    var tCountEl = document.getElementById('header-stat-tasks');
    var cPctEl = document.getElementById('header-stat-completion');

    if (pCountEl) pCountEl.textContent = projects.length;
    if (tCountEl) tCountEl.textContent = allTasks.length;

    var doneTasks = allTasks.filter(function (t) { return t.status === 'Done'; });
    var pct = allTasks.length > 0 ? Math.round((doneTasks.length / allTasks.length) * 100) : 0;
    if (cPctEl) cPctEl.textContent = pct + '%';
  }

  function populateModalProjectSelects(projects) {
    var taskProjSelect = document.getElementById('input-task-project');
    if (!taskProjSelect) return;

    var html = '<option value="" disabled selected>Pilih salah satu proyek...</option>';
    projects.forEach(function (p) {
      html += '<option value="' + _escapeHTML(p.id) + '">' + _escapeHTML(p.name) + '</option>';
    });
    taskProjSelect.innerHTML = html;
  }

  // ── Penggantian Tampilan (Kanban & List) ──
  window.switchViewMode = function (mode) {
    currentViewMode = mode;
    var kanbanContainer = document.getElementById('view-kanban-container');
    var listContainer = document.getElementById('view-list-container');
    var btnKanban = document.getElementById('view-mode-kanban');
    var btnList = document.getElementById('view-mode-list');

    if (mode === 'kanban') {
      kanbanContainer.classList.remove('hidden');
      listContainer.classList.add('hidden');

      btnKanban.className = 'flex items-center gap-1 px-3 py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wider bg-primary text-on-primary shadow-sm transition-all';
      btnList.className = 'flex items-center gap-1 px-3 py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition-all';
    } else {
      kanbanContainer.classList.add('hidden');
      listContainer.classList.remove('hidden');

      btnList.className = 'flex items-center gap-1 px-3 py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wider bg-primary text-on-primary shadow-sm transition-all';
      btnKanban.className = 'flex items-center gap-1 px-3 py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition-all';
    }
  };

  // ── Logika Pencarian & Filter ──
  window.handleSearchInput = function (e) {
    currentSearchQuery = (e.target.value || '').toLowerCase().trim();
    renderAll();
  };

  window.clearSearch = function () {
    var input = document.getElementById('task-search-input');
    if (input) input.value = '';
    currentSearchQuery = '';
    renderAll();
  };

  window.setFilterStatus = function (status) {
    currentStatusFilter = status;
    document.querySelectorAll('.status-filter-btn').forEach(function (btn) {
      var isCurrent = btn.getAttribute('data-status-filter') === status;
      var baseClasses = 'status-filter-btn px-3 py-1.5 rounded-full font-label-sm text-[10px] sm:text-[11px] uppercase tracking-[0.06em] font-semibold transition-colors whitespace-nowrap ';
      if (isCurrent) {
        btn.className = baseClasses + 'bg-primary text-on-primary dark:bg-[#f4efe6] dark:text-[#0e0f12] shadow-sm';
      } else {
        btn.className = baseClasses + 'text-on-surface-variant hover:text-on-surface dark:hover:text-[#f4efe6]';
      }
    });
    renderAll();
  };

  window.handleKanbanProjectFilter = function (e) {
    currentKanbanProjectFilter = e.target.value;
    var projects = URStorage.getProjects(currentSession.id);
    var allTasks = URStorage.getAllUserTasks(currentSession.id);
    renderKanban(projects, allTasks);
  };

  // ── Papan Kanban dengan HTML5 Drag & Drop ──
  function renderKanban(projects, allTasks) {
    var filterSelect = document.getElementById('kanban-project-filter');
    if (filterSelect) {
      var currentVal = filterSelect.value || currentKanbanProjectFilter;
      var selectHtml = '<option value="all"' + (currentVal === 'all' ? ' selected' : '') + '>Semua Proyek</option>';
      projects.forEach(function (p) {
        selectHtml += '<option value="' + _escapeHTML(p.id) + '"' + (currentVal === p.id ? ' selected' : '') + '>' + _escapeHTML(p.name) + '</option>';
      });
      filterSelect.innerHTML = selectHtml;
    }

    var projectMap = {};
    projects.forEach(function (p) { projectMap[p.id] = p; });

    // Filter tugas untuk kanban
    var filteredTasks = allTasks.filter(function (task) {
      // 1. Filter proyek
      if (currentKanbanProjectFilter !== 'all' && task.projectId !== currentKanbanProjectFilter) {
        return false;
      }
      // 2. Filter status
      if (currentStatusFilter !== 'all' && task.status !== currentStatusFilter) {
        return false;
      }
      // 3. Kata kunci pencarian
      if (currentSearchQuery) {
        var matchTitle = (task.title || '').toLowerCase().includes(currentSearchQuery);
        var matchDesc = (task.description || '').toLowerCase().includes(currentSearchQuery);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });

    var todoZone = document.getElementById('kanban-zone-todo');
    var progressZone = document.getElementById('kanban-zone-progress');
    var doneZone = document.getElementById('kanban-zone-done');

    todoZone.innerHTML = '';
    progressZone.innerHTML = '';
    doneZone.innerHTML = '';

    var todoCount = 0;
    var progressCount = 0;
    var doneCount = 0;

    filteredTasks.forEach(function (task) {
      var card = createKanbanCardElement(task, projectMap[task.projectId]);
      if (task.status === 'To-do') {
        todoZone.appendChild(card);
        todoCount++;
      } else if (task.status === 'In-Progress') {
        progressZone.appendChild(card);
        progressCount++;
      } else if (task.status === 'Done') {
        doneZone.appendChild(card);
        doneCount++;
      }
    });

    var cTodoEl = document.getElementById('kanban-count-todo');
    var cProgEl = document.getElementById('kanban-count-progress');
    var cDoneEl = document.getElementById('kanban-count-done');

    if (cTodoEl) cTodoEl.textContent = todoCount;
    if (cProgEl) cProgEl.textContent = progressCount;
    if (cDoneEl) cDoneEl.textContent = doneCount;
  }

  function createKanbanCardElement(task, project) {
    var card = document.createElement('article');
    card.className = 'task-card p-space-sm rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low transition-all shadow-sm border border-outline-variant/15 flex flex-col gap-2 cursor-grab active:cursor-grabbing select-none group';
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-task-id', task.id);

    // Event dragstart HTML5
    card.addEventListener('dragstart', function (e) {
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('opacity-40');
    });

    card.addEventListener('dragend', function () {
      card.classList.remove('opacity-40');
    });

    var projectName = project ? project.name : 'Proyek Bebas';
    var deadlineInfo = URUI.formatDeadline(task.deadline);

    card.innerHTML = `
      <div class="flex items-center justify-between gap-1">
        <span class="font-label-sm text-[10px] uppercase tracking-wider text-secondary font-semibold truncate max-w-[170px]" title="${_escapeHTML(projectName)}">
          ${_escapeHTML(projectName)}
        </span>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onclick="openTaskModal('${task.id}', '${task.projectId}')" class="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface" title="Ubah Tugas">
            <span class="material-symbols-outlined text-[15px]">edit</span>
          </button>
          <button type="button" onclick="triggerDeleteTask('${task.id}')" class="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-error" title="Hapus Tugas">
            <span class="material-symbols-outlined text-[15px]">delete</span>
          </button>
        </div>
      </div>

      <h4 class="font-body-md text-on-surface font-medium leading-snug line-clamp-2">
        ${_escapeHTML(task.title)}
      </h4>

      ${task.description ? `
        <p class="font-body-sm text-[12px] text-on-surface-variant line-clamp-2">
          ${_escapeHTML(task.description)}
        </p>
      ` : ''}

      <div class="flex items-center justify-between gap-1 pt-1 border-t border-surface-container/60 text-[11px] text-on-surface-variant">
        <span class="flex items-center gap-0.5 ${deadlineInfo.isOverdue ? 'text-error font-semibold' : ''}">
          <span class="material-symbols-outlined text-[14px]">${deadlineInfo.isOverdue ? 'warning' : 'schedule'}</span>
          <span>${deadlineInfo.text}</span>
        </span>

        ${task.attachmentMeta ? `
          <button type="button" onclick="downloadAttachment('${task.attachmentMeta.key}', '${_escapeHTML(task.attachmentMeta.name)}')" class="flex items-center gap-1 text-secondary hover:text-primary transition-colors font-medium px-2 py-0.5 rounded bg-surface-container text-xs" title="Unduh Berkas Lampiran">
            <span class="material-symbols-outlined text-[13px]">attachment</span>
            <span class="truncate max-w-[90px]">${_escapeHTML(task.attachmentMeta.name)}</span>
          </button>
        ` : ''}
      </div>
    `;

    return card;
  }

  function initKanbanDragAndDrop() {
    var cols = document.querySelectorAll('.kanban-col');
    cols.forEach(function (col) {
      col.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', function (e) {
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove('drag-over');
        }
      });

      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('drag-over');

        var taskId = e.dataTransfer.getData('text/plain');
        var targetStatus = col.getAttribute('data-status');

        if (!taskId || !targetStatus) return;

        var task = URStorage.getTaskById(taskId);
        if (!task) return;

        if (task.status !== targetStatus) {
          URStorage.updateTaskStatus(taskId, targetStatus);
          URUI.showToast('Status tugas dipindahkan ke ' + targetStatus + '!', 'success');
          renderAll();
        }
      });
    });
  }

  // ── Daftar Proyek (Kolom Kiri Tampilan List) ──
  function renderProjectsList(projects, allTasks) {
    var container = document.getElementById('projects-list-container');
    var badgeEl = document.getElementById('project-list-count-badge');
    if (badgeEl) badgeEl.textContent = projects.length + ' Aktif';

    if (!container) return;
    container.innerHTML = '';

    if (projects.length === 0) {
      URUI.showEmptyState({
        container: container,
        icon: 'folder_open',
        title: 'Belum Ada Proyek',
        message: 'Mulai dengan menambahkan proyek baru untuk memetakan tugas studio Anda.',
        actionText: '+ Buat Proyek Pertama',
        onAction: openProjectModal
      });
      return;
    }

    projects.forEach(function (project, idx) {
      var projectTasks = allTasks.filter(function (t) { return t.projectId === project.id; });
      var doneTasks = projectTasks.filter(function (t) { return t.status === 'Done'; });
      var pct = projectTasks.length > 0 ? Math.round((doneTasks.length / projectTasks.length) * 100) : 0;
      var isActive = project.id === activeProjectId;

      var card = document.createElement('article');
      card.className = 'project-card relative group p-space-md rounded-3xl transition-colors cursor-pointer border ' +
        (isActive
          ? 'bg-surface-container-lowest dark:bg-[#1f2029] border-primary dark:border-[#f4efe6] shadow-sm'
          : 'bg-surface-container-low dark:bg-[#16171d] hover:bg-surface-container-lowest dark:hover:bg-[#1f2029] border-outline-variant/15 dark:border-[#2a2c36] shadow-sm');
      card.setAttribute('data-project-id', project.id);

      card.addEventListener('click', function () {
        selectProject(project.id);
      });

      card.innerHTML = `
        <div class="flex items-start justify-between gap-space-sm mb-space-xs">
          <div class="flex items-center gap-space-xs">
            <span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-semibold">
              ${idx + 1} / PROYEK
            </span>
            <span class="text-outline-variant/60 text-xs">/</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant font-medium">${_escapeHTML(project.status || 'Aktif')}</span>
          </div>
          <div class="flex items-center gap-1" onclick="event.stopPropagation()">
            <button class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors" onclick="openProjectModal('${project.id}')" title="Ubah Proyek" type="button">
              <span class="material-symbols-outlined text-[17px]">edit</span>
            </button>
            <button class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-secondary transition-colors" onclick="triggerArchiveProject('${project.id}')" title="Arsipkan Proyek" type="button">
              <span class="material-symbols-outlined text-[17px]">archive</span>
            </button>
            <button class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-error transition-colors" onclick="triggerDeleteProject('${project.id}')" title="Hapus Proyek" type="button">
              <span class="material-symbols-outlined text-[17px]">delete</span>
            </button>
          </div>
        </div>

        <div class="flex items-baseline justify-between mb-space-xs">
          <h3 class="font-headline-sm text-headline-sm text-primary tracking-tight">
            ${_escapeHTML(project.name)}
          </h3>
          <span class="w-6 h-6 rounded-full ${isActive ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'} flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
          </span>
        </div>

        <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mb-space-sm">
          ${_escapeHTML(project.description || 'Belum ada deskripsi.')}
        </p>

        <div class="flex items-center justify-between pt-space-xs bg-surface-container/60 p-2.5 rounded-2xl">
          <div class="flex items-center gap-space-xs">
            <span class="material-symbols-outlined text-[16px] text-secondary">checklist</span>
            <span class="font-label-md text-label-md text-on-surface font-semibold">${projectTasks.length} Tugas</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-16 h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
              <span class="block h-full bg-secondary rounded-full" style="width: ${pct}%"></span>
            </span>
            <span class="font-label-sm text-label-sm text-secondary font-semibold">${pct}%</span>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  function selectProject(projectId) {
    activeProjectId = projectId;
    var projects = URStorage.getProjects(currentSession.id);
    var allTasks = URStorage.getAllUserTasks(currentSession.id);
    renderProjectsList(projects, allTasks);
    renderTasksList(projects, allTasks);
  }

  // ── Daftar Tugas (Kolom Kanan Tampilan List) ──
  function renderTasksList(projects, allTasks) {
    var titleEl = document.getElementById('active-project-title');
    var descEl = document.getElementById('active-project-desc');
    var container = document.getElementById('tasks-list-container');
    if (!container) return;

    container.innerHTML = '';

    var activeProject = projects.find(function (p) { return p.id === activeProjectId; });

    if (!activeProject) {
      if (titleEl) titleEl.textContent = 'Pilih Proyek';
      if (descEl) descEl.textContent = 'Silakan pilih proyek di sebelah kiri untuk melihat daftar tugas.';
      URUI.showEmptyState({
        container: container,
        icon: 'folder_open',
        title: 'Tidak Ada Proyek Terpilih',
        message: 'Pilih salah satu proyek dari daftar aktif di samping.'
      });
      return;
    }

    if (titleEl) titleEl.textContent = 'Tugas: ' + activeProject.name;
    if (descEl) descEl.textContent = activeProject.description || 'Kelola seluruh tugas dan lampiran terkait proyek ini.';

    // Filter tugas pada proyek aktif
    var projectTasks = allTasks.filter(function (t) { return t.projectId === activeProject.id; });

    // Terapkan filter status dan pencarian
    var displayTasks = projectTasks.filter(function (t) {
      if (currentStatusFilter !== 'all' && t.status !== currentStatusFilter) return false;
      if (currentSearchQuery) {
        var matchTitle = (t.title || '').toLowerCase().includes(currentSearchQuery);
        var matchDesc = (t.description || '').toLowerCase().includes(currentSearchQuery);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });

    if (displayTasks.length === 0) {
      URUI.showEmptyState({
        container: container,
        icon: 'task_alt',
        title: 'Belum Ada Tugas di Kategori Ini',
        message: 'Tambahkan tugas baru untuk proyek ' + activeProject.name + ' sekarang.',
        actionText: '+ Tambah Tugas Baru',
        onAction: function () { openTaskModal(null, activeProject.id); }
      });
      return;
    }

    displayTasks.forEach(function (task) {
      var isDone = task.status === 'Done';
      var deadlineInfo = URUI.formatDeadline(task.deadline);

      var card = document.createElement('article');
      card.className = 'task-card p-space-md rounded-3xl bg-surface-container-low hover:bg-surface-container-lowest transition-all shadow-sm border border-outline-variant/15 flex flex-col gap-2 group';

      card.innerHTML = `
        <div class="flex items-start justify-between gap-space-sm mb-space-xs">
          <div class="flex items-center gap-space-xs flex-wrap">
            <button class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-transparent hover:border-primary hover:text-primary'}" onclick="toggleTaskCompletion('${task.id}')" title="Tandai Selesai" type="button">
              <span class="material-symbols-outlined text-[14px]">check</span>
            </button>
            <span class="font-label-sm text-[10px] font-semibold tracking-[0.05em] uppercase px-2 py-0.5 rounded ${isDone ? 'bg-surface-container-highest dark:bg-[#282932] text-on-surface-variant dark:text-[#9e9a92]' : 'bg-secondary-fixed dark:bg-[#1f2029] text-on-secondary-fixed dark:text-[#c8a97e]'}">
              ${_escapeHTML(task.status)}
            </span>
            <span class="font-label-sm text-label-sm ${deadlineInfo.isOverdue ? 'text-error font-semibold' : 'text-on-surface-variant'} flex items-center gap-0.5">
              <span class="material-symbols-outlined text-[14px]">${deadlineInfo.isOverdue ? 'warning' : 'schedule'}</span>
              ${deadlineInfo.text}
            </span>
          </div>

          <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button class="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors" onclick="openTaskModal('${task.id}', '${task.projectId}')" title="Ubah Tugas" type="button">
              <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
            <button class="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-error transition-colors" onclick="triggerDeleteTask('${task.id}')" title="Hapus Tugas" type="button">
              <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>

        <div class="pl-8 mb-space-xs">
          <h3 class="font-headline-sm text-[18px] leading-[24px] text-primary font-medium tracking-tight mb-1 ${isDone ? 'line-through opacity-60' : ''}">
            ${_escapeHTML(task.title)}
          </h3>
          ${task.description ? `
            <p class="font-body-sm text-body-sm text-on-surface-variant ${isDone ? 'opacity-60' : ''}">
              ${_escapeHTML(task.description)}
            </p>
          ` : ''}
        </div>

        <div class="pl-8 flex flex-wrap items-center justify-between gap-space-sm pt-space-xs border-t border-surface-container/60">
          <!-- Attachment Capsule -->
          ${task.attachmentMeta ? `
            <button type="button" onclick="downloadAttachment('${task.attachmentMeta.key}', '${_escapeHTML(task.attachmentMeta.name)}')" class="flex items-center gap-space-xs px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface" title="Klik untuk mengunduh lampiran">
              <span class="material-symbols-outlined text-[16px] text-secondary">attachment</span>
              <span class="font-label-sm text-label-sm font-medium tracking-wide truncate max-w-[150px]">${_escapeHTML(task.attachmentMeta.name)}</span>
              <span class="font-label-sm text-[10px] text-on-surface-variant">${_formatFileSize(task.attachmentMeta.size)}</span>
            </button>
          ` : '<span class="text-[11px] text-outline italic">Tidak ada lampiran</span>'}

          <!-- Inline Status Buttons Switcher -->
          <div class="flex items-center p-0.5 rounded-full bg-surface-container dark:bg-[#1f2029] border border-transparent dark:border-[#2a2c36]">
            <button class="px-2.5 py-1 rounded-full font-label-sm text-[10px] font-semibold tracking-[0.04em] uppercase transition-colors whitespace-nowrap ${task.status === 'To-do' ? 'bg-primary text-on-primary dark:bg-[#f4efe6] dark:text-[#0e0f12] shadow-sm' : 'text-on-surface-variant hover:text-on-surface dark:hover:text-[#f4efe6]'}" onclick="changeTaskStatusInline('${task.id}', 'To-do')" type="button">
              To-Do
            </button>
            <button class="px-2.5 py-1 rounded-full font-label-sm text-[10px] font-semibold tracking-[0.04em] uppercase transition-colors whitespace-nowrap ${task.status === 'In-Progress' ? 'bg-primary text-on-primary dark:bg-[#f4efe6] dark:text-[#0e0f12] shadow-sm' : 'text-on-surface-variant hover:text-on-surface dark:hover:text-[#f4efe6]'}" onclick="changeTaskStatusInline('${task.id}', 'In-Progress')" type="button">
              In-Progress
            </button>
            <button class="px-2.5 py-1 rounded-full font-label-sm text-[10px] font-semibold tracking-[0.04em] uppercase transition-colors whitespace-nowrap ${task.status === 'Done' ? 'bg-primary text-on-primary dark:bg-[#f4efe6] dark:text-[#0e0f12] shadow-sm' : 'text-on-surface-variant hover:text-on-surface dark:hover:text-[#f4efe6]'}" onclick="changeTaskStatusInline('${task.id}', 'Done')" type="button">
              Done
            </button>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  window.toggleTaskCompletion = function (taskId) {
    var task = URStorage.getTaskById(taskId);
    if (!task) return;
    var newStatus = task.status === 'Done' ? 'To-do' : 'Done';
    URStorage.updateTaskStatus(taskId, newStatus);
    URUI.showToast('Status tugas diubah ke ' + newStatus, 'success');
    renderAll();
  };

  window.changeTaskStatusInline = function (taskId, newStatus) {
    var task = URStorage.getTaskById(taskId);
    if (!task) return;
    if (task.status !== newStatus) {
      URStorage.updateTaskStatus(taskId, newStatus);
      URUI.showToast('Status tugas diubah ke ' + newStatus, 'success');
      renderAll();
    }
  };

  // ── Modal & Aksi CRUD Proyek ──
  window.openProjectModal = function (projectId) {
    var modal = document.getElementById('modal-project');
    var form = document.getElementById('form-project');
    var titleEl = document.getElementById('modal-project-title');
    var idInput = document.getElementById('form-project-id');
    var nameInput = document.getElementById('input-project-name');
    var deadlineInput = document.getElementById('input-project-deadline');
    var descInput = document.getElementById('input-project-desc');
    var dangerZone = document.getElementById('modal-project-danger-zone');

    form.reset();

    if (projectId) {
      var project = URStorage.getProjectById(projectId);
      if (project) {
        titleEl.textContent = 'Edit Proyek';
        idInput.value = project.id;
        nameInput.value = project.name;
        deadlineInput.value = project.deadline || '';
        descInput.value = project.description || '';

        if (window.URUI && URUI.syncStatusPills) {
          URUI.syncStatusPills('project-status-selector', project.status || 'Aktif');
        }

        if (dangerZone) dangerZone.classList.remove('hidden');
      }
    } else {
      titleEl.textContent = 'Tambah Proyek Baru';
      idInput.value = '';
      if (window.URUI && URUI.syncStatusPills) {
        URUI.syncStatusPills('project-status-selector', 'Aktif');
      }
      if (dangerZone) dangerZone.classList.add('hidden');
    }

    modal.showModal();
  };

  window.handleArchiveFromModal = function () {
    var id = document.getElementById('form-project-id').value;
    if (!id) return;
    document.getElementById('modal-project').close();
    triggerArchiveProject(id);
  };

  window.handleDeleteFromModal = function () {
    var id = document.getElementById('form-project-id').value;
    if (!id) return;
    document.getElementById('modal-project').close();
    triggerDeleteProject(id);
  };

  window.openEditProjectModalCurrent = function () {
    if (activeProjectId) openProjectModal(activeProjectId);
  };

  window.openTaskForActiveProject = function () {
    openTaskModal(null, activeProjectId);
  };

  window.handleProjectFormSubmit = function (e) {
    e.preventDefault();
    if (!currentSession) return;

    var id = document.getElementById('form-project-id').value;
    var name = document.getElementById('input-project-name').value.trim();
    var deadline = document.getElementById('input-project-deadline').value;
    var desc = document.getElementById('input-project-desc').value.trim();
    var statusInput = document.getElementById('input-project-status');
    var statusRadio = document.querySelector('input[name="project-status"]:checked');
    var status = (statusInput && statusInput.value) ? statusInput.value : (statusRadio ? statusRadio.value : 'Aktif');

    if (!name) {
      URUI.showToast('Nama proyek wajib diisi.', 'error');
      return;
    }

    var projectData = {
      userId: currentSession.id,
      name: name,
      deadline: deadline || null,
      description: desc,
      status: status
    };
    if (id) projectData.id = id;

    var saved = URStorage.saveProject(projectData);
    if (!id) activeProjectId = saved.id;

    URUI.showToast('Proyek berhasil disimpan!', 'success');
    document.getElementById('modal-project').close();
    renderAll();
  };

  window.triggerDeleteProject = function (projectId) {
    var project = URStorage.getProjectById(projectId);
    if (!project) return;

    URUI.showConfirmModal({
      title: 'Hapus Proyek?',
      message: 'Apakah Anda yakin ingin menghapus proyek "' + project.name + '"? Semua tugas dan berkas lampiran yang terhubung akan dihapus permanen (Cascade Delete).',
      confirmText: 'Hapus Proyek',
      isDanger: true,
      onConfirm: async function () {
        await URStorage.deleteProject(projectId, currentSession.id);
        URUI.showToast('Proyek dan seluruh tugas berhasil dihapus.', 'info');
        renderAll();
      }
    });
  };

  window.triggerArchiveProject = function (projectId) {
    var project = URStorage.getProjectById(projectId);
    if (!project) return;

    URUI.showConfirmModal({
      title: 'Arsipkan Proyek?',
      message: 'Proyek "' + project.name + '" akan dipindahkan ke halaman Arsip. Anda dapat memulihkannya kapan saja.',
      confirmText: 'Arsipkan',
      isDanger: false,
      onConfirm: function () {
        URStorage.archiveProject(projectId, currentSession.id);
        URUI.showToast('Proyek berhasil diarsipkan.', 'success');
        renderAll();
      }
    });
  };

  // ── Modal & Aksi CRUD Tugas dan Lampiran File ──
  window.openTaskModal = function (taskId, defaultProjectId, defaultStatus) {
    var modal = document.getElementById('modal-task');
    var form = document.getElementById('form-task');
    var titleEl = document.getElementById('modal-task-title');
    var idInput = document.getElementById('form-task-id');
    var taskTitleInput = document.getElementById('input-task-title');
    var projectSelect = document.getElementById('input-task-project');
    var deadlineInput = document.getElementById('input-task-deadline');
    var statusSelect = document.getElementById('input-task-status');
    var descInput = document.getElementById('input-task-desc');

    var existingAttachContainer = document.getElementById('existing-attachment-container');
    var fileLabelText = document.getElementById('file-upload-label-text');

    form.reset();
    tempSelectedFile = null;
    tempRemoveAttachmentFlag = false;
    if (fileLabelText) fileLabelText.textContent = 'Pilih berkas dari perangkat';

    // Isi opsi dropdown proyek
    var projects = URStorage.getProjects(currentSession.id);
    populateModalProjectSelects(projects);

    if (taskId) {
      var task = URStorage.getTaskById(taskId);
      if (task) {
        titleEl.textContent = 'Edit Tugas';
        idInput.value = task.id;
        taskTitleInput.value = task.title;
        projectSelect.value = task.projectId;
        deadlineInput.value = task.deadline || '';
        if (statusSelect) statusSelect.value = task.status;
        if (window.URUI && URUI.syncStatusPills) {
          URUI.syncStatusPills('task-status-selector', task.status || 'To-do');
        }
        descInput.value = task.description || '';

        if (task.attachmentMeta) {
          existingAttachContainer.classList.remove('hidden');
          existingAttachContainer.classList.add('flex');
          document.getElementById('existing-attachment-name').textContent = task.attachmentMeta.name;
          document.getElementById('existing-attachment-size').textContent = '(' + _formatFileSize(task.attachmentMeta.size) + ')';
        } else {
          existingAttachContainer.classList.add('hidden');
          existingAttachContainer.classList.remove('flex');
        }
      }
    } else {
      titleEl.textContent = 'Tambah Tugas Baru';
      idInput.value = '';
      if (defaultProjectId) projectSelect.value = defaultProjectId;
      else if (activeProjectId) projectSelect.value = activeProjectId;
      if (defaultStatus && statusSelect) statusSelect.value = defaultStatus;
      if (window.URUI && URUI.syncStatusPills) {
        URUI.syncStatusPills('task-status-selector', defaultStatus || 'To-do');
      }

      existingAttachContainer.classList.add('hidden');
      existingAttachContainer.classList.remove('flex');
    }

    modal.showModal();
  };

  window.handleFileSelection = function (e) {
    var file = e.target.files[0];
    if (!file) return;

    // Validasi ukuran file (maksimal 5MB)
    if (file.size > 5 * 1024 * 1024) {
      URUI.showToast('Ukuran file maksimal adalah 5MB.', 'error');
      e.target.value = '';
      tempSelectedFile = null;
      return;
    }

    tempSelectedFile = file;
    tempRemoveAttachmentFlag = false;
    var fileLabelText = document.getElementById('file-upload-label-text');
    if (fileLabelText) fileLabelText.textContent = file.name + ' (' + _formatFileSize(file.size) + ')';
  };

  window.removeCurrentTaskAttachment = function () {
    tempRemoveAttachmentFlag = true;
    tempSelectedFile = null;
    var container = document.getElementById('existing-attachment-container');
    if (container) {
      container.classList.add('hidden');
      container.classList.remove('flex');
    }
    URUI.showToast('Lampiran akan dihapus saat disimpan.', 'info');
  };

  window.handleTaskFormSubmit = async function (e) {
    e.preventDefault();
    if (!currentSession) return;

    var taskId = document.getElementById('form-task-id').value;
    var title = document.getElementById('input-task-title').value.trim();
    var projectId = document.getElementById('input-task-project').value;
    var deadline = document.getElementById('input-task-deadline').value;
    var status = document.getElementById('input-task-status').value;
    var desc = document.getElementById('input-task-desc').value.trim();

    if (!title || !projectId) {
      URUI.showToast('Judul dan proyek tugas wajib diisi.', 'error');
      return;
    }

    var taskData = {
      userId: currentSession.id,
      projectId: projectId,
      title: title,
      deadline: deadline || null,
      status: status || 'To-do',
      description: desc
    };

    var existingTask = taskId ? URStorage.getTaskById(taskId) : null;
    if (existingTask) {
      taskData.id = existingTask.id;
      taskData.attachmentMeta = existingTask.attachmentMeta || null;
    }

    // Proses perubahan file lampiran
    if (tempRemoveAttachmentFlag && taskData.attachmentMeta) {
      await URStorage.deleteAttachment(taskData.attachmentMeta.key);
      taskData.attachmentMeta = null;
    }

    if (tempSelectedFile) {
      // Hapus lampiran lama jika diganti
      if (taskData.attachmentMeta && taskData.attachmentMeta.key) {
        await URStorage.deleteAttachment(taskData.attachmentMeta.key);
      }

      var key = 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      await URStorage.saveAttachment(key, tempSelectedFile);
      taskData.attachmentMeta = {
        key: key,
        name: tempSelectedFile.name,
        type: tempSelectedFile.type,
        size: tempSelectedFile.size
      };
    }

    URStorage.saveTask(taskData);
    URUI.showToast('Tugas berhasil disimpan!', 'success');
    document.getElementById('modal-task').close();
    renderAll();
  };

  window.triggerDeleteTask = function (taskId) {
    var task = URStorage.getTaskById(taskId);
    if (!task) return;

    URUI.showConfirmModal({
      title: 'Hapus Tugas?',
      message: 'Apakah Anda yakin ingin menghapus tugas "' + task.title + '"? Berkas lampiran juga akan dihapus.',
      confirmText: 'Hapus Tugas',
      isDanger: true,
      onConfirm: async function () {
        await URStorage.deleteTask(taskId);
        URUI.showToast('Tugas berhasil dihapus.', 'info');
        renderAll();
      }
    });
  };

  window.downloadAttachment = async function (key, filename) {
    try {
      var blob = await URStorage.getAttachment(key);
      if (!blob) {
        URUI.showToast('Berkas lampiran tidak ditemukan di penyimpanan lokal.', 'error');
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename || 'lampiran';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      URUI.showToast('Mengunduh berkas lampiran...', 'info');
    } catch (err) {
      URUI.showToast('Gagal mengunduh lampiran.', 'error');
    }
  };

  // ── Utilitas ──
  function _formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function _escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
