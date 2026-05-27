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
  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: totalStudents } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
  const { count: totalPatients } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'patient');
  const { count: totalRequests } = await supabase.from('requests').select('*', { count: 'exact', head: true });
  const { count: totalAppointments } = await supabase.from('appointments').select('*', { count: 'exact', head: true });
  const { count: pendingRequests } = await supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="stat-icon blue"><i data-lucide="users"></i></div><div class="stat-info"><div class="stat-label">Total Usuarios</div><div class="stat-value">${totalUsers || 0}</div></div></div>
    <div class="stat-card"><div class="stat-icon green"><i data-lucide="graduation-cap"></i></div><div class="stat-info"><div class="stat-label">Estudiantes</div><div class="stat-value">${totalStudents || 0}</div></div></div>
    <div class="stat-card"><div class="stat-icon cyan"><i data-lucide="heart"></i></div><div class="stat-info"><div class="stat-label">Pacientes</div><div class="stat-value">${totalPatients || 0}</div></div></div>
    <div class="stat-card"><div class="stat-icon orange"><i data-lucide="mail"></i></div><div class="stat-info"><div class="stat-label">Solicitudes</div><div class="stat-value">${totalRequests || 0}</div></div></div>
    <div class="stat-card"><div class="stat-icon blue"><i data-lucide="calendar"></i></div><div class="stat-info"><div class="stat-label">Citas</div><div class="stat-value">${totalAppointments || 0}</div></div></div>
    <div class="stat-card"><div class="stat-icon red"><i data-lucide="clock"></i></div><div class="stat-info"><div class="stat-label">Solicitudes Pendientes</div><div class="stat-value">${pendingRequests || 0}</div></div></div>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
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
  await Promise.all([
    renderUsersChart(),
    renderRequestsChart(),
    renderAppointmentsChart(),
    renderTreatmentsChart()
  ]);
}

async function renderUsersChart() {
  const { count: students } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
  const { count: patients } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'patient');
  const { count: admins } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
  
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

async function renderRequestsChart() {
  const statuses = ['pending', 'accepted', 'rejected', 'active'];
  const labels = ['Pendientes', 'Aceptadas', 'Rechazadas', 'Activas'];
  const colors = [chartColors.orange, chartColors.green, chartColors.red, chartColors.blue];
  const counts = [];

  for (const s of statuses) {
    const { count } = await supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', s);
    counts.push(count || 0);
  }

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

async function renderAppointmentsChart() {
  const statuses = ['proposed', 'confirmed', 'completed', 'cancelled'];
  const labels = ['Propuestas', 'Confirmadas', 'Finalizadas', 'Canceladas'];
  const colors = [chartColors.cyan, chartColors.blue, chartColors.green, chartColors.red];
  const counts = [];

  for (const s of statuses) {
    const { count } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', s);
    counts.push(count || 0);
  }

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
  const { data: patients } = await supabase.from('patients').select('consultation_reason');
  const treatmentCounts = {};
  (patients || []).forEach(p => {
    const reason = p.consultation_reason || 'No especificado';
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
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (role !== 'all') query = query.eq('role', role);
  const { data: users } = await query;
  allUsers = users || [];
  renderUsersTable(allUsers);
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
  const { data } = await supabase.from('profiles').select('*, students(*)').eq('role', 'student').order('created_at', { ascending: false });
  document.getElementById('students-table').innerHTML = `
    <table class="data-table">
      <thead><tr><th>Nombre</th><th>Cédula</th><th>Sección</th><th>Año</th><th>Estado</th></tr></thead>
      <tbody>${(data || []).map(s => `
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
}

async function loadPatientsTable() {
  const { data } = await supabase.from('profiles').select('*, patients(*)').eq('role', 'patient').order('created_at', { ascending: false });
  document.getElementById('patients-table').innerHTML = `
    <table class="data-table">
      <thead><tr><th>Nombre</th><th>Edad</th><th>Teléfono</th><th>Problema</th><th>Estado</th></tr></thead>
      <tbody>${(data || []).map(p => `
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
}

async function loadAllRequests() {
  const { data } = await supabase.from('requests').select('*, student:student_id(full_name), patient:patient_id(full_name)').order('created_at', { ascending: false });
  document.getElementById('all-requests-table').innerHTML = `
    <table class="data-table">
      <thead><tr><th>Estudiante</th><th>Paciente</th><th>Estado</th><th>Fecha</th></tr></thead>
      <tbody>${(data || []).map(r => {
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
}

async function loadAllAppointments() {
  const { data } = await supabase.from('appointments').select('*, request:request_id(student:student_id(full_name), patient:patient_id(full_name))').order('date', { ascending: false });
  document.getElementById('all-appointments-table').innerHTML = `
    <table class="data-table">
      <thead><tr><th>Estudiante</th><th>Paciente</th><th>Fecha</th><th>Estado</th></tr></thead>
      <tbody>${(data || []).map(a => {
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
}

async function deleteUser(userId) {
  const ok = await confirmAction('Eliminar Usuario', '¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer.');
  if (!ok) return;
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) { showToast('Error al eliminar usuario', 'error'); return; }
  showToast('Usuario eliminado', 'success');
  loadAllUsers();
  loadAdminStats();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

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
  const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (!users || users.length === 0) {
    showToast('No hay usuarios para exportar', 'warning');
    return;
  }
  const roleLabels = { student: 'Estudiante', patient: 'Paciente', admin: 'Administrador' };
  const exportData = users.map(u => ({
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

