/* =============================================
   REPORTES.JS - Generación de Reportes PDF (MVC)
   + Reporte de Usuarios + Envío de Imágenes
   ============================================= */

/* =============================================
   REPORTE DE USUARIOS EN CHAT
   ============================================= */

function openReportModal(userId, conversationId) {
  document.getElementById('report-user-id').value = userId;
  document.getElementById('report-conversation-id').value = conversationId;
  document.getElementById('report-motivo').value = '';
  document.getElementById('report-observacion').value = '';
  document.getElementById('modal-reportar').classList.add('active');
}

async function handleReportUser(event) {
  event.preventDefault();
  
  const reporterId = currentUser.user.id;
  const reportedId = document.getElementById('report-user-id').value;
  const conversationId = document.getElementById('report-conversation-id').value;
  const motivo = document.getElementById('report-motivo').value;
  const observacion = document.getElementById('report-observacion').value;

  if (!motivo) {
    showToast('Seleccione un motivo para el reporte', 'error');
    return;
  }

  try {
    const res = await fetch('/api/chat/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reporterId, reportedId, conversationId, motivo, observacion })
    });
    const json = await res.json();
    if (!json.success) throw new Error();
    
    showToast('Reporte enviado correctamente', 'success');
    closeModal('modal-reportar');
  } catch (e) {
    showToast('Error al enviar el reporte', 'error');
  }
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove('active');
}

/* =============================================
   ENVÍO DE IMÁGENES EN CHAT
   ============================================= */

/* =============================================
   REPORTES ADMIN - Tabla de reportes
   ============================================= */

async function loadUserReports() {
  try {
    const res = await fetch('/api/chat/reports');
    const json = await res.json();
    const reports = json.data || [];

    const container = document.getElementById('reports-table');
    if (!container) return;

    if (reports.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="flag"></i></div><p class="empty-state-title">Sin reportes</p><p class="empty-state-text">No hay reportes de usuarios</p></div>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    const motivoLabels = {
      'comportamiento_inapropiado': 'Comportamiento inapropiado',
      'spam': 'Spam',
      'lenguaje_ofensivo': 'Lenguaje ofensivo',
      'otro': 'Otro'
    };

    const statusLabels = {
      'pendiente': { text: 'Pendiente', class: 'badge-warning' },
      'revisado': { text: 'Revisado', class: 'badge-primary' },
      'resuelto': { text: 'Resuelto', class: 'badge-success' }
    };

    container.innerHTML = `
      <table class="data-table">
        <thead><tr>
          <th>Reportador</th>
          <th>Reportado</th>
          <th>Motivo</th>
          <th>Observación</th>
          <th>Estado</th>
          <th>Acciones</th>
          <th>Fecha</th>
        </tr></thead>
        <tbody>
          ${reports.map(r => {
            const sl = statusLabels[r.status] || { text: r.status, class: 'badge-gray' };
            return `<tr>
              <td>${escapeHTML(r.reporter?.full_name || r.reporter_id || '-')}</td>
              <td>${escapeHTML(r.reported?.full_name || r.reported_id || '-')}</td>
              <td>${motivoLabels[r.motivo] || r.motivo || '-'}</td>
              <td>${r.observacion ? escapeHTML(r.observacion).substring(0, 50) : '-'}</td>
              <td><span class="badge ${sl.class}" id="status-badge-${r.id}">${sl.text}</span></td>
              <td>
                <select class="form-input" style="padding: 4px; font-size: 0.8rem; width: auto;" onchange="updateReportStatus('${r.id}', this.value)">
                  <option value="pendiente" ${r.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                  <option value="revisado" ${r.status === 'revisado' ? 'selected' : ''}>Revisado</option>
                  <option value="resuelto" ${r.status === 'resuelto' ? 'selected' : ''}>Resuelto</option>
                </select>
              </td>
              <td>${formatDate(r.created_at)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    console.error('Error al cargar reportes:', e);
  }
}

async function updateReportStatus(id, status) {
  try {
    const res = await fetch(`/api/chat/reports/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const json = await res.json();
    if (json.success) {
      showToast('Estado actualizado', 'success');
      // Update badge locally
      const statusLabels = {
        'pendiente': { text: 'Pendiente', class: 'badge-warning' },
        'revisado': { text: 'Revisado', class: 'badge-primary' },
        'resuelto': { text: 'Resuelto', class: 'badge-success' }
      };
      const badge = document.getElementById(`status-badge-${id}`);
      if (badge && statusLabels[status]) {
        badge.className = `badge ${statusLabels[status].class}`;
        badge.textContent = statusLabels[status].text;
      }
    } else {
      showToast(json.message || 'Error al actualizar', 'error');
    }
  } catch (e) {
    showToast('Error de red', 'error');
  }
}

/* =============================================
   GENERACIÓN DE REPORTES PDF
   ============================================= */

async function generateAppointmentsReport(appointments, userName) {
  await loadJsPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text('OdontoUNERG', 20, 20);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Universidad Nacional Experimental Rómulo Gallegos', 20, 28);

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Reporte de Citas', 20, 42);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Usuario: ${userName}`, 20, 50);
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-VE')}`, 20, 56);

  doc.setDrawColor(226, 232, 240);
  doc.line(20, 60, 190, 60);

  let y = 68;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('FECHA', 20, y);
  doc.text('HORA', 60, y);
  doc.text('DURACIÓN', 90, y);
  doc.text('LUGAR', 120, y);
  doc.text('ESTADO', 160, y);

  y += 8;
  doc.setTextColor(30, 41, 59);

  appointments.forEach(a => {
    if (y > 270) { doc.addPage(); y = 20; }
    const date = new Date(a.date);
    doc.text(formatDate(a.date), 20, y);
    doc.text(date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }), 60, y);
    doc.text(`${a.duration_minutes} min`, 90, y);
    doc.text(a.location || '-', 120, y);
    const statusMap = { proposed: 'Propuesta', confirmed: 'Confirmada', completed: 'Finalizada', cancelled: 'Cancelada' };
    doc.text(statusMap[a.status] || a.status, 160, y);
    y += 7;
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${pageCount}`, 170, 290);
    doc.text('OdontoUNERG - Plataforma Odontológica UNERG', 20, 290);
  }

  doc.save(`reporte_citas_${new Date().toISOString().split('T')[0]}.pdf`);
  showToast('Reporte generado exitosamente', 'success');
}

async function generateTreatmentsReport(treatments, userName) {
  await loadJsPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text('OdontoUNERG', 20, 20);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Universidad Nacional Experimental Rómulo Gallegos', 20, 28);

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Historial de Tratamientos', 20, 42);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Usuario: ${userName}`, 20, 50);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-VE')}`, 20, 56);

  doc.line(20, 60, 190, 60);

  let y = 68;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('TRATAMIENTO', 20, y);
  doc.text('FECHA', 80, y);
  doc.text('ESTADO', 110, y);
  doc.text('OBSERVACIONES', 140, y);

  y += 8;
  doc.setTextColor(30, 41, 59);

  treatments.forEach(t => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(t.tratamiento || '-', 20, y);
    doc.text(formatDate(t.fecha), 80, y);
    const estados = { pendiente: 'Pendiente', en_proceso: 'En proceso', finalizado: 'Finalizado' };
    doc.text(estados[t.estado] || t.estado, 110, y);
    doc.text((t.observaciones || '-').substring(0, 30), 140, y);
    y += 7;
  });

  doc.save(`reporte_tratamientos_${new Date().toISOString().split('T')[0]}.pdf`);
  showToast('Reporte generado', 'success');
}

function loadJsPDF() {
  return new Promise((resolve) => {
    if (window.jspdf) { resolve(); return; }
    const script = document.createElement('script');
    script.src = '/js/libs/jspdf.umd.min.js'; // URL LOCAL OFFLINE
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

/* =============================================
   CERTIFICADO DE ALTA MÉDICA (BACKEND NODE.JS)
   ============================================= */
async function generateMedicalCertificate(requestId) {
  showLoading(true);
  try {
    const res = await fetch(`/api/certificates/generate/${requestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const json = await res.json();
    
    if (!json.success) {
      showToast(json.message || 'Error: El certificado requiere el alta médica', 'error');
      return;
    }

    showToast('Certificado generado exitosamente', 'success');
    
    // Abrir el PDF en una nueva pestaña
    if (json.url) {
      window.open(json.url, '_blank');
    }
  } catch (e) {
    console.error(e);
    showToast('Error al generar el certificado PDF', 'error');
  } finally {
    showLoading(false);
  }
}
