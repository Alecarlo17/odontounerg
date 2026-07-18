/* =============================================
   DASHBOARD-ADMIN.JS
   Lógica del panel administrativo
   ============================================= */

let currentUser = null;
let allUsers = [];
let allStudents = [];
let allPatients = [];
let currentSection = 'inicio';

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;
  if (currentUser.profile?.role !== 'admin') {
    redirectByRole(currentUser.profile.role);
    return;
  }
  await loadAdminStats();
  await loadAdminCharts();
});

async function loadAdminStats() {
  showLoading(true);
  try {
    const res = await fetch('/api/dashboard/admin');
    const json = await res.json();
    const stats = json.data || {};

    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card"><div class="stat-icon blue"><i data-lucide="users"></i></div><div class="stat-info"><div class="stat-label">Total Usuarios</div><div class="stat-value">${stats.totalUsers || 0}</div></div></div>
      <div class="stat-card"><div class="stat-icon green"><i data-lucide="graduation-cap"></i></div><div class="stat-info"><div class="stat-label">Estudiantes</div><div class="stat-value">${stats.totalStudents || 0}</div></div></div>
      <div class="stat-card"><div class="stat-icon cyan"><i data-lucide="heart"></i></div><div class="stat-info"><div class="stat-label">Pacientes</div><div class="stat-value">${stats.totalPatients || 0}</div></div></div>
      <div class="stat-card"><div class="stat-icon orange"><i data-lucide="mail"></i></div><div class="stat-info"><div class="stat-label">Solicitudes</div><div class="stat-value">${stats.totalRequests || 0}</div></div></div>
      <div class="stat-card"><div class="stat-icon blue"><i data-lucide="calendar"></i></div><div class="stat-info"><div class="stat-label">Citas</div><div class="stat-value">${stats.totalAppointments || 0}</div></div></div>
      <div class="stat-card"><div class="stat-icon red"><i data-lucide="user-x"></i></div><div class="stat-info"><div class="stat-label">Usuarios Suspendidos</div><div class="stat-value">${stats.suspendedUsers || 0}</div></div></div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch(e) {
    console.error(e);
  }
  showLoading(false);
}

/* =============================================
   GRÁFICOS CON CHART.JS
   ============================================= */
const chartColors = {
  blue:    'rgba(37, 99, 235, 0.8)',
  green:   'rgba(16, 185, 129, 0.8)',
  orange:  'rgba(245, 158, 11, 0.8)',
  red:     'rgba(239, 68, 68, 0.8)',
  cyan:    'rgba(6, 182, 212, 0.8)',
  purple:  'rgba(139, 92, 246, 0.8)',
  pink:    'rgba(236, 72, 153, 0.8)',
  indigo:  'rgba(99, 102, 241, 0.8)',
};
const chartInstances = {};

function destroyChart(name) {
  if (chartInstances[name]) { chartInstances[name].destroy(); }
}

async function loadAdminCharts() {
  if (typeof Chart === 'undefined') return;
  try {
    const res = await fetch('/api/dashboard/admin');
    const json = await res.json();
    const stats = json.data || {};

    renderUsersChart(stats.totalStudents, stats.totalPatients, stats.totalUsers - stats.totalStudents - stats.totalPatients);
    renderRequestsChart(stats.chartRequests || []);
    renderAppointmentsChart(stats.chartAppointments || []);
    renderTreatmentsChart(); // Se simplificó para no bloquear
  } catch(e) {
    console.error(e);
  }
}

function renderUsersChart(students, patients, admins) {
  destroyChart('users');
  chartInstances['users'] = new Chart(document.getElementById('chart-users'), {
    type: 'doughnut',
    data: {
      labels: ['Estudiantes', 'Pacientes', 'Administradores'],
      datasets: [{
        data: [students || 0, patients || 0, admins || 0],
        backgroundColor: [chartColors.blue, chartColors.green, chartColors.orange],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true, font: { size: 12 } } }
      }
    }
  });
}

function renderRequestsChart(chartData) {
  const statuses = ['pending', 'accepted', 'rejected', 'active'];
  const labels = ['Pendientes', 'Aceptadas', 'Rechazadas', 'Activas'];
  const colors = [chartColors.orange, chartColors.green, chartColors.red, chartColors.blue];
  const counts = statuses.map(s => {
    const item = chartData.find(d => d.status === s);
    return item ? item.count : 0;
  });

  destroyChart('requests');
  chartInstances['requests'] = new Chart(document.getElementById('chart-requests'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Solicitudes',
        data: counts,
        backgroundColor: colors,
        borderRadius: 8,
        barThickness: 40
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderAppointmentsChart(chartData) {
  const statuses = ['proposed', 'confirmed', 'completed', 'cancelled'];
  const labels = ['Propuestas', 'Confirmadas', 'Finalizadas', 'Canceladas'];
  const colors = [chartColors.cyan, chartColors.blue, chartColors.green, chartColors.red];
  const counts = statuses.map(s => {
    const item = chartData.find(d => d.status === s);
    return item ? item.count : 0;
  });

  destroyChart('appointments');
  chartInstances['appointments'] = new Chart(document.getElementById('chart-appointments'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true, font: { size: 12 } } }
      }
    }
  });
}

async function renderTreatmentsChart() {
  try {
    const res = await fetch('/api/admin/patients');
    const json = await res.json();
    const patients = json.data || [];
    
    const treatmentCounts = {};
    patients.forEach(p => {
      const reason = p.patients?.consultation_reason || 'No especificado';
      treatmentCounts[reason] = (treatmentCounts[reason] || 0) + 1;
    });

    const labels = Object.keys(treatmentCounts);
    const data = Object.values(treatmentCounts);
    const allColors = [chartColors.blue, chartColors.green, chartColors.orange, chartColors.red, chartColors.cyan, chartColors.purple, chartColors.pink, chartColors.indigo];

    destroyChart('treatments');
    chartInstances['treatments'] = new Chart(document.getElementById('chart-treatments'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Pacientes',
          data,
          backgroundColor: labels.map((_, i) => allColors[i % allColors.length]),
          borderRadius: 8,
          barThickness: 35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } },
          y: { grid: { display: false } }
        }
      }
    });
  } catch(e) {}
}

function showSection(name) {
  currentSection = name;
  document.querySelectorAll('.page-content > section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`section-${name}`).classList.remove('hidden');
  
  const btnExportPdf = document.getElementById('btn-export-pdf');
  if (btnExportPdf) {
    if (['usuarios', 'estudiantes', 'pacientes'].includes(name)) {
      btnExportPdf.style.display = '';
    } else {
      btnExportPdf.style.display = 'none';
    }
  }

  if (typeof setActiveSidebarLink === 'function') {
    setActiveSidebarLink(name);
  }

  // Cerrar sidebar en móvil al cambiar de sección
  if (window.innerWidth <= 768 && typeof closeSidebarOverlay === 'function') {
    closeSidebarOverlay();
  }

  const titles = {
    inicio: ['Panel Administrativo', 'Supervisión general'],
    usuarios: ['Usuarios', 'Gestión de usuarios'],
    estudiantes: ['Estudiantes', 'Lista de estudiantes'],
    pacientes: ['Pacientes', 'Lista de pacientes'],
    solicitudes: ['Solicitudes', 'Supervisar solicitudes'],
    citas: ['Citas', 'Supervisar citas'],
    reportes: ['Reportes', 'Reportes de usuarios']
  };
  const [t, s] = titles[name] || ['', ''];
  document.getElementById('page-title').textContent = t;
  document.getElementById('page-subtitle').textContent = s;

  switch (name) {
    case 'usuarios': loadAllUsers(); break;
    case 'estudiantes': loadStudentsTable(); break;
    case 'pacientes': loadPatientsTable(); break;
    case 'solicitudes': loadAllRequests(); break;
    case 'citas': loadAllAppointments(); break;
    case 'reportes': loadUserReports(); break;
    case 'actividad': loadActivityLog(); break;
    case 'tratamientos': loadAdminTreatments(); break;
    case 'inicio': loadAdminStats(); break;
  }
}

async function loadAllUsers() {
  const role = document.getElementById('filter-role')?.value || 'all';
  try {
    const res = await fetch('/api/admin/users');
    const json = await res.json();
    let users = json.data || [];
    if (role !== 'all') users = users.filter(u => u.role === role);
    allUsers = users;
    renderUsersTable(allUsers);
  } catch(e) {}
}

function filterUsers() {
  const term = document.getElementById('search-users').value.toLowerCase();
  const filtered = allUsers.filter(u => u.full_name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
  renderUsersTable(filtered);
}

function renderUsersTable(users) {
  const roleLabels = { student: 'Estudiante', patient: 'Paciente', admin: 'Admin' };
  document.getElementById('users-list').innerHTML = `
    <table class="data-table">
      <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Disponibilidad</th><th>Fecha Registro</th><th>Acciones</th></tr></thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td style="display:flex;align-items:center;gap:0.5rem">
              <span class="avatar avatar-sm avatar-placeholder">${getInitials(u.full_name)}</span>
              ${escapeHTML(formatShortName(u.full_name) || '-')}
            </td>
            <td>${escapeHTML(u.email)}</td>
            <td><span class="badge badge-primary">${roleLabels[u.role] || u.role}</span></td>
            <td>${u.disponibilidad || '-'}</td>
            <td>${formatDate(u.created_at)}</td>
            <td>
              ${u.role !== 'admin' 
                ? (u.is_suspended 
                    ? `<button class="btn btn-success btn-sm" onclick="reactivateUser('${u.id}')">Reactivar</button>` 
                    : `<button class="btn btn-danger btn-sm" onclick="openSuspendModal('${u.id}')">Suspender</button>`) 
                : `<span style="font-size:0.85rem;color:var(--text-muted)">N/A</span>`
              }
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function reactivateUser(id) {
  if (!confirm('¿Estás seguro de reactivar a este usuario?')) return;
  try {
    const res = await fetch(`/api/admin/users/${id}/reactivate`, {
      method: 'PUT'
    });
    const json = await res.json();
    if (json.success) {
      showToast('Usuario reactivado correctamente', 'success');
      loadAllUsers();
    } else {
      showToast(json.message || 'Error al reactivar usuario', 'error');
    }
  } catch(e) {
    showToast('Error de red al reactivar', 'error');
  }
}

async function loadStudentsTable() {
  try {
    const res = await fetch('/api/admin/students');
    const json = await res.json();
    allStudents = json.data || [];
    const data = allStudents;
    document.getElementById('students-list').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Cédula</th><th>Nombre</th><th>Teléfono</th><th>Año/Sección</th><th>Estado</th><th>Historial</th></tr></thead>
        <tbody>${data.map(s => {
          const comp = s.stats ? s.stats.completed : 0;
          const aban = s.stats ? s.stats.abandoned : 0;
          return `
          <tr>
            <td>${s.students?.student_id_card || '-'}</td>
            <td>${escapeHTML(formatShortName(s.full_name))}</td>
            <td>${s.phone || '-'}</td>
            <td>${s.students?.academic_year || '-'}/${s.students?.section || '-'}</td>
            <td>${typeof getPatientStatusBadge === 'function' ? getPatientStatusBadge(s.disponibilidad) : (s.disponibilidad || '-')}</td>
            <td>
              <span class="badge" style="background-color: var(--success-color); color: white;">${comp} C</span>
              <span class="badge" style="background-color: var(--danger-color); color: white;">${aban} A</span>
            </td>
          </tr>
        `}).join('')}</tbody>
      </table>
    `;
  } catch(e) {}
}

async function loadPatientsTable() {
  try {
    const res = await fetch('/api/admin/patients');
    const json = await res.json();
    allPatients = json.data || [];
    const data = allPatients;
    document.getElementById('patients-list').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Nombre</th><th>Edad</th><th>Teléfono</th><th>Problema</th><th>Estado</th></tr></thead>
        <tbody>${data.map(p => {
          const age = p.patients?.birth_date ? calculateAge(p.patients.birth_date) : (p.patients?.age || '-');
          let reason = p.patients?.consultation_reason || '-';
          if (p.patients && p.patients.accepts_requests === false) {
             reason = '<span style="color:var(--success-color);font-weight:600">Alta Médica</span>';
          }
          return `
          <tr>
            <td>${escapeHTML(formatShortName(p.full_name))}</td>
            <td>${age}</td>
            <td>${p.phone || p.patients?.phone || '-'}</td>
            <td>${reason === '<span style="color:var(--success-color);font-weight:600">Alta Médica</span>' ? reason : escapeHTML(reason)}</td>
            <td>${typeof getPatientStatusBadge === 'function' ? getPatientStatusBadge(p.disponibilidad) : p.disponibilidad}</td>
          </tr>
        `}).join('')}</tbody>
      </table>
    `;
  } catch(e) {}
}

async function loadAllRequests() {
  try {
    const res = await fetch('/api/admin/requests');
    const json = await res.json();
    const data = json.data || [];
    document.getElementById('all-requests-list').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Estudiante</th><th>Paciente</th><th>Estado</th><th>Fecha</th></tr></thead>
        <tbody>${data.map(r => {
          const si = getStatusInfo(r.status);
          return `<tr>
            <td>${escapeHTML(formatShortName(r.student?.full_name) || '-')}</td>
            <td>${escapeHTML(formatShortName(r.patient?.full_name) || '-')}</td>
            <td><span class="badge ${si.class}">${si.text}</span></td>
            <td>${formatDate(r.created_at)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    `;
  } catch(e) {}
}

async function loadAllAppointments() {
  try {
    const res = await fetch('/api/admin/appointments');
    const json = await res.json();
    const data = json.data || [];
    document.getElementById('all-appointments-list').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Estudiante</th><th>Paciente</th><th>Fecha</th><th>Estado</th></tr></thead>
        <tbody>${data.map(a => {
          const si = getStatusInfo(a.status);
          return `<tr>
            <td>${escapeHTML(formatShortName(a.request?.student?.full_name) || '-')}</td>
            <td>${escapeHTML(formatShortName(a.request?.patient?.full_name) || '-')}</td>
            <td>${formatDateTime(a.date)}</td>
            <td><span class="badge ${si.class}">${si.text}</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    `;
  } catch(e) {}
}

/**
 * Cargar registro de actividad
 */
async function loadActivityLog() {
  const container = document.getElementById('activity-list');
  const dateFilter = document.getElementById('activity-date-filter')?.value || 'todos';
  container.innerHTML = '<div class="empty-state"><p>Cargando...</p></div>';
  try {
    const res = await fetch(`/api/admin/activity-log?dateFilter=${dateFilter}`);
    const json = await res.json();
    const logs = json.data || [];
    if (logs.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="activity"></i></div><p class="empty-state-title">Sin actividad registrada</p></div>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }
    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Usuario</th><th>Acción</th><th>Módulo</th><th>Detalle</th><th>Fecha</th></tr></thead>
          <tbody>${logs.map(l => `<tr>
            <td><strong>${escapeHTML(l.user_name || 'Sistema')}</strong></td>
            <td>${escapeHTML(l.accion)}</td>
            <td><span class="badge badge-primary">${escapeHTML(l.modulo || '-')}</span></td>
            <td style="font-size:0.8rem;color:var(--text-secondary)">${escapeHTML(l.detalle || '-')}</td>
            <td>${formatDateTime(l.created_at)}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    `;
  } catch(e) {
    container.innerHTML = '<div class="empty-state"><p class="empty-state-text">Error al cargar actividad</p></div>';
  }
}

/**
 * Cargar tratamientos en el admin
 */
async function loadAdminTreatments() {
  const container = document.getElementById('treatments-list');
  container.innerHTML = '<div class="empty-state"><p>Cargando...</p></div>';
  try {
    const res = await fetch('/api/admin/treatments');
    const json = await res.json();
    const data = json.data || [];
    if (data.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="stethoscope"></i></div><p class="empty-state-title">Sin tratamientos</p></div>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }
    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Paciente</th><th>Estudiante</th><th>Tratamiento</th><th>Sesiones</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>${data.map(t => {
            const stateMap = {
              'pendiente': { text: 'Pendiente', class: 'badge-warning' },
              'en_proceso': { text: 'En proceso', class: 'badge-primary' },
              'finalizado': { text: 'Finalizado', class: 'badge-success' },
              'completed': { text: 'Completado', class: 'badge-success' },
              'accepted': { text: 'Asignado', class: 'badge-success' },
              'active': { text: 'En tratamiento', class: 'badge-primary' },
              'cancelled': { text: 'Cancelado', class: 'badge-gray' }
            };
            const sInfo = stateMap[t.estado] || { text: t.estado, class: 'badge-gray' };
            return `<tr>
              <td>${escapeHTML(t.patient_name || '-')}</td>
              <td>${escapeHTML(t.student_name || '-')}</td>
              <td><strong>${escapeHTML(t.tratamiento)}</strong></td>
              <td>${t.sesiones_count || 0}</td>
              <td><span class="badge ${sInfo.class}">${sInfo.text}</span></td>
              <td>${formatDate(t.created_at)}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
    `;
  } catch(e) {
    container.innerHTML = '<div class="empty-state"><p class="empty-state-text">Error al cargar tratamientos</p></div>';
  }
}

function openSuspendModal(userId) {
  document.getElementById('suspend-user-id').value = userId;
  document.getElementById('suspend-reason').value = '';
  document.getElementById('modal-suspender').classList.add('active');
}

async function handleSuspendSubmit(event) {
  event.preventDefault();
  const userId = document.getElementById('suspend-user-id').value;
  const reason = document.getElementById('suspend-reason').value;
  
  try {
    const res = await fetch(`/api/admin/users/${userId}/suspend`, { 
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    const json = await res.json();
    if (!json.success) throw new Error();
    showToast('Usuario suspendido', 'success');
    closeModal('modal-suspender');
    loadAllUsers();
    loadAdminStats();
  } catch (error) {
    showToast('Error al suspender usuario', 'error');
  }
}

function confirmAction(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `<div class="modal"><div class="modal-header"><h3 class="modal-title">${title}</h3><button class="modal-close" id="c-close">✕</button></div><p style="color:var(--text-secondary);margin-bottom:1.5rem">${message}</p><div style="display:flex;gap:0.75rem;justify-content:flex-end"><button class="btn btn-secondary" id="c-cancel">Cancelar</button><button class="btn btn-danger" id="c-ok">Confirmar</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#c-ok').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('#c-cancel').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('#c-close').onclick = () => { overlay.remove(); resolve(false); };
  });
}

/**
 * Exportar a PDF según la sección actual
 */
async function handleExportUsers() {
  let exportData = [];
  let tableHead = [];
  let title = '';
  let filename = '';

  if (currentSection === 'estudiantes') {
    if (!allStudents || allStudents.length === 0) {
      showToast('No hay estudiantes para exportar', 'warning');
      return;
    }
    title = 'Reporte de Estudiantes';
    filename = `estudiantes_odontounerg_${new Date().toISOString().split('T')[0]}.pdf`;
    tableHead = [['Nombre', 'Cédula', 'Sección', 'Año', 'Estado']];
    exportData = allStudents.map(s => [
      s.full_name || '-',
      s.students?.student_id_card || '-',
      s.students?.section || '-',
      s.students?.academic_year || '-',
      s.disponibilidad || '-'
    ]);
  } else if (currentSection === 'pacientes') {
    if (!allPatients || allPatients.length === 0) {
      showToast('No hay pacientes para exportar', 'warning');
      return;
    }
    title = 'Reporte de Pacientes';
    filename = `pacientes_odontounerg_${new Date().toISOString().split('T')[0]}.pdf`;
    tableHead = [['Nombre', 'Edad', 'Teléfono', 'Problema', 'Estado']];
    exportData = allPatients.map(p => {
      const age = p.patients?.birth_date ? (typeof calculateAge === 'function' ? calculateAge(p.patients.birth_date) : '') : (p.patients?.age || '-');
      // Limpiar html tags de badge
      let estado = p.disponibilidad || '-';
      return [
        p.full_name || '-',
        age,
        p.phone || p.patients?.phone || '-',
        p.patients?.consultation_reason || '-',
        estado
      ];
    });
  } else {
    // Por defecto exportamos todos los usuarios (o los filtrados en "usuarios")
    if (!allUsers || allUsers.length === 0) {
      showToast('No hay usuarios para exportar', 'warning');
      return;
    }
    title = 'Reporte de Usuarios del Sistema';
    filename = `usuarios_odontounerg_${new Date().toISOString().split('T')[0]}.pdf`;
    const roleLabels = { student: 'Estudiante', patient: 'Paciente', admin: 'Administrador' };
    tableHead = [['Nombre Completo', 'Correo Electrónico', 'Rol', 'Teléfono', 'Disponibilidad', 'Fecha Registro']];
    exportData = allUsers.map(u => [
      u.full_name || '-',
      u.email || '-',
      roleLabels[u.role] || u.role,
      u.phone || '-',
      u.disponibilidad || '-',
      (typeof formatDate === 'function' ? formatDate(u.created_at) : u.created_at) || '-'
    ]);
  }
  
  showLoading(true);
  try {
    if (typeof loadJsPDF === 'function') await loadJsPDF();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    const getBase64Image = (url) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } catch(e) {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    const logoUnerg = await getBase64Image('/assets/Unerg-1.png');
    const logoOdonto = await getBase64Image('/assets/logo%202.png');

    if (logoUnerg) doc.addImage(logoUnerg, 'PNG', 15, 10, 20, 20);
    if (logoOdonto) doc.addImage(logoOdonto, 'PNG', 260, 10, 20, 20);

    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text('Universidad Nacional Experimental Rómulo Gallegos', 148, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.text('Área de Odontología - OdontoUNERG', 148, 25, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(title, 148, 35, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-VE')}`, 15, 45);

    if (typeof doc.autoTable === 'function') {
      doc.autoTable({
        startY: 50,
        head: tableHead,
        body: exportData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 15, right: 15 }
      });
    } else {
      throw new Error("El plugin autoTable no está cargado correctamente.");
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${i} de ${pageCount}`, 280, 200, { align: 'right' });
    }

    doc.save(filename);
    showToast('Reporte PDF generado exitosamente', 'success');
  } catch (error) {
    console.error("Error PDF:", error);
    showToast('Error al generar PDF: ' + (error.message || error), 'error');
  } finally {
    showLoading(false);
  }
}
