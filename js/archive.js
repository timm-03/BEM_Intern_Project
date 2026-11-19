/**
 * UR TASK — js/archive.js
 * Manajemen arsip proyek dan tugas serta ekspor data ke format JSON dan CSV.
 */

(function () {
  'use strict';

  var currentSession = null;
  var currentSearchQuery = '';

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

    // 3. Render daftar arsip
    renderArchive();

    // 4. Inisialisasi tombol toggle tema
    if (typeof URTheme !== 'undefined' && URTheme.initThemeToggleButtons) {
      URTheme.initThemeToggleButtons();
    }
  });

  // ── Render Halaman Arsip ──
  function renderArchive() {
    if (!currentSession) return;
    var userId = currentSession.id;

    var archivedProjects = URStorage.getArchivedProjects(userId);
    var container = document.getElementById('archived-projects-container');
    var statProjCountEl = document.getElementById('stat-archived-projects-count');
    var statTasksCountEl = document.getElementById('stat-archived-tasks-count');
    var subtitleBadgeEl = document.getElementById('archived-subtitle-badge');

    if (statProjCountEl) statProjCountEl.textContent = archivedProjects.length;
    if (subtitleBadgeEl) subtitleBadgeEl.textContent = '(' + archivedProjects.length + ' Riwayat)';

    var totalArchivedTasks = 0;
    archivedProjects.forEach(function (p) {
      var tasks = URStorage.getTasks(p.id);
      totalArchivedTasks += tasks.length;
    });
    if (statTasksCountEl) statTasksCountEl.textContent = totalArchivedTasks;

    if (!container) return;
    container.innerHTML = '';

    // Filter berdasarkan kata kunci pencarian
    var filteredProjects = archivedProjects.filter(function (p) {
      if (!currentSearchQuery) return true;
      var matchName = (p.name || '').toLowerCase().includes(currentSearchQuery);
      var matchDesc = (p.description || '').toLowerCase().includes(currentSearchQuery);
      return matchName || matchDesc;
    });

    if (filteredProjects.length === 0) {
      URUI.showEmptyState({
        container: container,
        icon: 'inventory_2',
        title: archivedProjects.length === 0 ? 'Belum Ada Proyek yang Diarsipkan' : 'Pencarian Tidak Ditemukan',
        message: archivedProjects.length === 0
          ? 'Proyek yang telah tuntas atau ingin Anda simpan dari dashboard aktif dapat diarsipkan di halaman Proyek.'
          : 'Tidak ada proyek arsip yang cocok dengan kata kunci "' + _escapeHTML(currentSearchQuery) + '".',
        actionText: archivedProjects.length === 0 ? 'Buka Manajemen Proyek' : 'Reset Pencarian',
        onAction: function () {
          if (archivedProjects.length === 0) {
            window.location.href = 'projects.html';
          } else {
            var searchInput = document.getElementById('archive-search-input');
            if (searchInput) searchInput.value = '';
            currentSearchQuery = '';
            renderArchive();
          }
        }
      });
      return;
    }

    filteredProjects.forEach(function (project) {
      var tasks = URStorage.getTasks(project.id);
      var doneTasks = tasks.filter(function (t) { return t.status === 'Done'; });
      var pct = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 100;
      var card = createArchivedProjectCard(project, tasks, pct);
      container.appendChild(card);
    });
  }

  function createArchivedProjectCard(project, tasks, pct) {
    var card = document.createElement('div');
    card.className = 'bg-surface-container-low rounded-3xl p-space-lg shadow-[0_16px_36px_-10px_rgba(54,46,38,0.06)] border border-outline-variant/15 flex flex-col justify-between hover:shadow-md transition-all';
    card.setAttribute('data-archived-project-id', project.id);

    var archivedDateStr = 'Diarsipkan';
    if (project.archivedAt) {
      try {
        var d = new Date(project.archivedAt);
        archivedDateStr = 'Diarsipkan ' + d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (_) {}
    }

    var tasksListId = 'archived-tasks-list-' + project.id;

    card.innerHTML = `
      <div class="flex flex-col gap-space-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-space-xs">
            <span class="px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm uppercase tracking-widest font-semibold">
              DIARSIPKAN
            </span>
            <span class="px-space-sm py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
              ${_escapeHTML(project.status || 'Selesai')}
            </span>
          </div>
          <div class="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-[12px]">
            <span class="material-symbols-outlined text-[15px]">history</span>
            <span>${archivedDateStr}</span>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <h3 class="font-headline-sm text-headline-sm text-primary tracking-tight font-medium">
            ${_escapeHTML(project.name)}
          </h3>
          <p class="font-body-md text-body-md text-on-surface-variant line-clamp-3">
            ${_escapeHTML(project.description || 'Belum ada deskripsi.')}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-space-xs p-space-sm rounded-2xl bg-surface-container-lowest/80 border border-outline-variant/15 mt-1">
          <div class="flex flex-col">
            <span class="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant">Tugas Terhubung</span>
            <span class="font-label-lg text-label-lg text-primary font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px] text-secondary">checklist</span>
              ${tasks.length} Tugas (${doneTasksCount(tasks)} Selesai)
            </span>
          </div>
          <div class="flex flex-col">
            <span class="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant">Penyelesaian Akhir</span>
            <span class="font-label-lg text-label-lg text-primary font-semibold flex items-center gap-1">
              <span class="w-2 h-2 rounded-full ${pct === 100 ? 'bg-emerald-600' : 'bg-secondary'}"></span>
              ${pct}% Rampung
            </span>
          </div>
        </div>

        <!-- Accordion for tasks -->
        <div class="pt-2">
          <button type="button" onclick="toggleArchivedTasksAccordion('${tasksListId}', this)" class="text-secondary hover:text-primary font-label-md text-label-md uppercase tracking-wider flex items-center gap-1 transition-colors">
            <span class="material-symbols-outlined text-[18px]">expand_more</span>
            <span>Lihat Rincian Tugas (${tasks.length})</span>
          </button>
          
          <div id="${tasksListId}" class="hidden flex-col gap-1.5 mt-2.5 pt-2 border-t border-surface-container">
            ${renderArchivedTaskListHTML(tasks)}
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between pt-space-md mt-space-md border-t border-surface-container">
        <button type="button" onclick="triggerUnarchiveProject('${project.id}')" class="flex items-center gap-1.5 px-space-md py-2 rounded-full bg-primary text-on-primary hover:bg-secondary font-label-md text-label-md uppercase tracking-wider font-semibold transition-all shadow-sm">
          <span class="material-symbols-outlined text-[16px]">unarchive</span>
          <span>Pulihkan Proyek</span>
        </button>

        <button type="button" onclick="triggerPermanentDeleteProject('${project.id}')" class="flex items-center gap-1 px-3 py-2 rounded-full text-error hover:bg-error-container hover:text-error transition-colors font-label-md text-label-md uppercase tracking-wider" title="Hapus permanen">
          <span class="material-symbols-outlined text-[16px]">delete_forever</span>
          <span>Hapus</span>
        </button>
      </div>
    `;

    return card;
  }

  function doneTasksCount(tasks) {
    return tasks.filter(function (t) { return t.status === 'Done'; }).length;
  }

  function renderArchivedTaskListHTML(tasks) {
    if (tasks.length === 0) {
      return '<p class="text-[12px] text-outline italic py-1">Tidak ada tugas dalam proyek ini.</p>';
    }

    return tasks.map(function (t) {
      var isDone = t.status === 'Done';
      return `
        <div class="flex items-center justify-between p-2 rounded-xl bg-surface-container/60 text-body-sm">
          <div class="flex items-center gap-2 truncate">
            <span class="material-symbols-outlined text-[16px] ${isDone ? 'text-primary' : 'text-outline'}">
              ${isDone ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            <span class="truncate ${isDone ? 'line-through text-on-surface-variant' : 'text-on-surface'}">${_escapeHTML(t.title)}</span>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${isDone ? 'bg-surface-container-highest text-on-surface-variant' : 'bg-secondary-fixed text-on-secondary-fixed'} shrink-0 ml-2">
            ${_escapeHTML(t.status)}
          </span>
        </div>
      `;
    }).join('');
  }

  window.toggleArchivedTasksAccordion = function (listId, btn) {
    var list = document.getElementById(listId);
    if (!list) return;

    var isHidden = list.classList.contains('hidden');
    var icon = btn.querySelector('.material-symbols-outlined');

    if (isHidden) {
      list.classList.remove('hidden');
      list.classList.add('flex');
      if (icon) icon.textContent = 'expand_less';
    } else {
      list.classList.add('hidden');
      list.classList.remove('flex');
      if (icon) icon.textContent = 'expand_more';
    }
  };

  // ── Buka Arsip & Hapus Permanen ──
  window.triggerUnarchiveProject = function (projectId) {
    var project = URStorage.getProjectById(projectId);
    if (!project) return;

    URStorage.unarchiveProject(projectId, currentSession.id);
    URUI.showToast('Proyek "' + project.name + '" berhasil dipulihkan ke daftar aktif!', 'success');
    renderArchive();
  };

  window.triggerPermanentDeleteProject = function (projectId) {
    var project = URStorage.getProjectById(projectId);
    if (!project) return;

    URUI.showConfirmModal({
      title: 'Hapus Proyek Permanen?',
      message: 'PERINGATAN: Tindakan ini tidak dapat dibatalkan. Proyek "' + project.name + '" beserta seluruh tugas dan berkas lampirannya akan dihapus selamanya dari penyimpanan browser Anda.',
      confirmText: 'Hapus Permanen',
      isDanger: true,
      onConfirm: async function () {
        await URStorage.deleteProject(projectId, currentSession.id);
        URUI.showToast('Proyek dan tugas telah dihapus permanen.', 'info');
        renderArchive();
      }
    });
  };

  // ── Pencarian Arsip ──
  window.handleArchiveSearch = function (e) {
    currentSearchQuery = (e.target.value || '').toLowerCase().trim();
    renderArchive();
  };

  // ── Ekspor Data (JSON & CSV) ──
  window.toggleExportMenu = function () {
    URUI.showConfirmModal({
      title: 'Pilih Format Ekspor',
      message: 'Pilih format berkas untuk mencadangkan seluruh data proyek dan riwayat tugas Anda:',
      confirmText: 'Ekspor JSON',
      cancelText: 'Ekspor CSV',
      isDanger: false,
      onConfirm: function () {
        exportJSON();
      },
      onCancel: function () {
        exportCSV();
      }
    });
  };
  window.exportJSON = function () {
    if (!currentSession) return;
    var userId = currentSession.id;

    var allProjects = URStorage.getAllProjects(userId);
    var exportPayload = {
      app: 'UR TASK by Tim',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      user: {
        name: currentSession.name,
        email: currentSession.email
      },
      projects: allProjects.map(function (p) {
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          deadline: p.deadline,
          isArchived: !!p.isArchived,
          archivedAt: p.archivedAt || null,
          createdAt: p.createdAt,
          tasks: URStorage.getTasks(p.id).map(function (t) {
            return {
              id: t.id,
              title: t.title,
              description: t.description,
              status: t.status,
              deadline: t.deadline,
              hasAttachment: !!t.attachmentMeta,
              attachmentName: t.attachmentMeta ? t.attachmentMeta.name : null,
              createdAt: t.createdAt
            };
          })
        };
      })
    };

    var jsonStr = JSON.stringify(exportPayload, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    var filename = 'urtask_backup_' + _getDateSlug() + '.json';

    _downloadFile(blob, filename);
    URUI.showToast('Data lengkap berhasil diekspor ke format JSON!', 'success');
  };

  window.exportCSV = function () {
    if (!currentSession) return;
    var userId = currentSession.id;

    var allProjects = URStorage.getAllProjects(userId);

    // Header kolom CSV
    var rows = [
      ['Nama Proyek', 'Status Proyek', 'Deadline Proyek', 'Status Arsip', 'Judul Tugas', 'Status Tugas', 'Deadline Tugas', 'Lampiran', 'Dibuat Pada']
    ];

    allProjects.forEach(function (p) {
      var tasks = URStorage.getTasks(p.id);
      var isArchivedText = p.isArchived ? 'Diarsipkan' : 'Aktif';

      if (tasks.length === 0) {
        rows.push([
          p.name || '',
          p.status || '',
          p.deadline || '',
          isArchivedText,
          '(Tidak ada tugas)',
          '',
          '',
          '',
          p.createdAt || ''
        ]);
      } else {
        tasks.forEach(function (t) {
          rows.push([
            p.name || '',
            p.status || '',
            p.deadline || '',
            isArchivedText,
            t.title || '',
            t.status || '',
            t.deadline || '',
            t.attachmentMeta ? t.attachmentMeta.name : 'Tidak ada',
            t.createdAt || ''
          ]);
        });
      }
    });

    var csvContent = rows.map(function (row) {
      return row.map(function (field) {
        var str = String(field == null ? '' : field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(',');
    }).join('\r\n');

    // Tambahkan UTF-8 BOM agar terbaca sempurna di Microsoft Excel
    var blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    var filename = 'urtask_export_' + _getDateSlug() + '.csv';

    _downloadFile(blob, filename);
    URUI.showToast('Data berhasil diekspor ke format CSV!', 'success');
  };

  function _downloadFile(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function _getDateSlug() {
    var d = new Date();
    return d.toISOString().split('T')[0];
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
