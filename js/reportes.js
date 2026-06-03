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

async function sendChatImage(file, conversationId, senderId) {
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('La imagen no puede exceder 5MB', 'error');
    return;
  }

  if (!file.type.startsWith('image/')) {
    showToast('Solo se permiten archivos de imagen', 'error');
    return;
  }

  showLoading(true);
  try {
    const client = window.supabaseClient || supabase;
    const fileExt = file.name.split('.').pop();
    const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await client.storage
      .from('chat_images')
      .upload(fileName, file);

    if (uploadError) throw new Error('Error subiendo imagen');

    const { data: urlData } = client.storage
      .from('chat_images')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, senderId, content: `[Imagen] ${imageUrl}` })
    });
    const json = await res.json();
    if (!json.success) throw new Error();
    
    showToast('Imagen enviada', 'success');
  } catch (err) {
    showToast('Error al procesar la imagen', 'error');
  } finally {
    showLoading(false);
  }
}

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
          <th>Fecha</th>
        </tr></thead>
        <tbody>
          ${reports.map(r => {
            const sl = statusLabels[r.status] || { text: r.status, class: 'badge-gray' };
            return `<tr>
              <td>${escapeHTML(r.created_by || r.reporter_id || '-')}</td>
              <td>${escapeHTML(r.reported_id || '-')}</td>
              <td>${motivoLabels[r.motivo] || r.motivo || '-'}</td>
              <td>${r.content ? escapeHTML(r.content).substring(0, 50) : '-'}</td>
              <td><span class="badge ${sl.class}">${sl.text}</span></td>
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
