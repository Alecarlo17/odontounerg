/* =============================================
   DASHBOARD-ADMIN.JS
   Lógica del panel administrativo
   ============================================= */

let currentUser = null;
let allUsers = [];

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
      <div class="stat-card"><div class="stat-icon red"><i data-lucide="clock"></i></div><div class="stat-info"><div class="stat-label">Solicitudes Pendientes</div><div class="stat-value">${stats.pendingRequests || 0}</div></div></div>
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
  document.querySelectorAll('.page-content > section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`section-${name}`).classList.remove('hidden');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  event.target.closest('.sidebar-link')?.classList.add('active');

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
  document.getElementById('users-table').innerHTML = `
    <table class="data-table">
      <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Disponibilidad</th><th>Fecha Registro</th><th>Acciones</th></tr></thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td style="display:flex;align-items:center;gap:0.5rem">
              <span class="avatar avatar-sm avatar-placeholder">${getInitials(u.full_name)}</span>
              ${escapeHTML(u.full_name || '-')}
            </td>
            <td>${escapeHTML(u.email)}</td>
            <td><span class="badge badge-primary">${roleLabels[u.role] || u.role}</span></td>
            <td>${u.disponibilidad || '-'}</td>
            <td>${formatDate(u.created_at)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Eliminar</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function loadStudentsTable() {
  try {
    const res = await fetch('/api/admin/students');
    const json = await res.json();
    const data = json.data || [];
    document.getElementById('students-table').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Nombre</th><th>Cédula</th><th>Sección</th><th>Año</th><th>Estado</th></tr></thead>
        <tbody>${data.map(s => `
          <tr>
            <td>${escapeHTML(s.full_name)}</td>
            <td>${escapeHTML(s.students?.student_id_card || '-')}</td>
            <td>${escapeHTML(s.students?.section || '-')}</td>
            <td>${escapeHTML(s.students?.academic_year || '-')}</td>
            <td>${s.disponibilidad || '-'}</td>
          </tr>
        `).join('')}</tbody>
      </table>
    `;
  } catch(e) {}
}

async function loadPatientsTable() {
  try {
    const res = await fetch('/api/admin/patients');
    const json = await res.json();
    const data = json.data || [];
    document.getElementById('patients-table').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Nombre</th><th>Edad</th><th>Teléfono</th><th>Problema</th><th>Estado</th></tr></thead>
        <tbody>${data.map(p => `
          <tr>
            <td>${escapeHTML(p.full_name)}</td>
            <td>${p.patients?.age || '-'}</td>
            <td>${p.phone || p.patients?.phone || '-'}</td>
            <td>${escapeHTML(p.patients?.consultation_reason || '-')}</td>
            <td>${p.disponibilidad || '-'}</td>
          </tr>
        `).join('')}</tbody>
      </table>
    `;
  } catch(e) {}
}

async function loadAllRequests() {
  try {
    const res = await fetch('/api/admin/requests');
    const json = await res.json();
    const data = json.data || [];
    document.getElementById('all-requests-table').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Estudiante</th><th>Paciente</th><th>Estado</th><th>Fecha</th></tr></thead>
        <tbody>${data.map(r => {
          const si = getStatusInfo(r.status);
          return `<tr>
            <td>${escapeHTML(r.student?.full_name || '-')}</td>
            <td>${escapeHTML(r.patient?.full_name || '-')}</td>
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
    document.getElementById('all-appointments-table').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Estudiante</th><th>Paciente</th><th>Fecha</th><th>Estado</th></tr></thead>
        <tbody>${data.map(a => {
          const si = getStatusInfo(a.status);
          return `<tr>
            <td>${escapeHTML(a.request?.student?.full_name || '-')}</td>
            <td>${escapeHTML(a.request?.patient?.full_name || '-')}</td>
            <td>${formatDateTime(a.date)}</td>
            <td><span class="badge ${si.class}">${si.text}</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    `;
  } catch(e) {}
}

async function deleteUser(userId) {
  const ok = await confirmAction('Eliminar Usuario', '¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer.');
  if (!ok) return;
  try {
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error();
    showToast('Usuario eliminado', 'success');
    loadAllUsers();
    loadAdminStats();
  } catch (error) {
    showToast('Error al eliminar usuario', 'error');
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
 * Exportar usuarios a CSV
 */
async function handleExportUsers() {
  if (!allUsers || allUsers.length === 0) {
    showToast('No hay usuarios para exportar', 'warning');
    return;
  }
  const roleLabels = { student: 'Estudiante', patient: 'Paciente', admin: 'Administrador' };
  const exportData = allUsers.map(u => ({
    ...u,
    role_label: roleLabels[u.role] || u.role
  }));
  exportToCSV(exportData, [
    { key: 'full_name', label: 'Nombre' },
    { key: 'email', label: 'Correo' },
    { key: 'role_label', label: 'Rol' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'disponibilidad', label: 'Disponibilidad' },
    { key: 'created_at', label: 'Fecha Registro' }
  ], 'usuarios_odontounerg');
}
