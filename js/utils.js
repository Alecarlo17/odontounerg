/* =============================================
   UTILS.JS - Funciones utilitarias
   ============================================= */

/**
 * Mostrar notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
 */
function showToast(message, type = 'info') {
  // Crear contenedor si no existe
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Iconos según el tipo
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  // Crear toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
  `;

  container.appendChild(toast);

  // Auto-remover después de 4 segundos
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

/**
 * Mostrar/ocultar loading overlay
 * @param {boolean} show - Mostrar o ocultar
 */
function showLoading(show = true) {
  let overlay = document.getElementById('loading-overlay');
  if (show) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
  } else if (overlay) {
    overlay.style.display = 'none';
  }
}

/**
 * Formatear fecha
 * @param {string} dateStr - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formatear fecha y hora
 * @param {string} dateStr - Fecha en formato ISO
 * @returns {string} Fecha y hora formateada
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calcular edad a partir de fecha de nacimiento
 * @param {string} birthDateString - Fecha en formato ISO o YYYY-MM-DD
 * @returns {number} Edad
 */
function calculateAge(birthDateString) {
  if (!birthDateString) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
  }
  return age;
}

/**
 * Formatear hora relativa (hace X minutos/horas)
 * @param {string} dateStr - Fecha en formato ISO
 * @returns {string}
 */
function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Justo ahora';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} d`;
  return formatDate(dateStr);
}

/**
 * Obtener iniciales de un nombre
 * @param {string} name - Nombre completo
 * @returns {string} Iniciales
 */
function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

/**
 * Formatear nombre corto (Primer nombre y primer apellido)
 * @param {string} fullName - Nombre completo
 * @returns {string} Nombre corto
 */
function formatShortName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1]}`;
}

/**
 * Comprimir imagen usando Canvas
 * @param {File} file - Archivo de imagen original
 * @param {number} maxWidth - Ancho máximo (ej. 800)
 * @param {number} maxHeight - Alto máximo (ej. 800)
 * @param {number} quality - Calidad (0 a 1)
 * @returns {Promise<Blob>} Blob de la imagen comprimida
 */
function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height *= maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width *= maxHeight / height));
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(blob => {
          resolve(blob);
        }, 'image/jpeg', quality);
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Validar formato de correo electrónico
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validar cédula (7-8 dígitos)
 * @param {string} cedula
 * @returns {boolean}
 */
function isValidCedula(cedula) {
  return /^\d{7,8}$/.test(cedula);
}

/**
 * Validar contraseña (mínimo 8 caracteres)
 * @param {string} password
 * @returns {boolean}
 */
function isValidPassword(password) {
  return password && password.length >= 8;
}

/**
 * Redirigir a una página
 * @param {string} page - Ruta de la página
 */
function navigateTo(page) {
  window.location.href = page;
}

/**
 * Obtener parámetro de URL
 * @param {string} name - Nombre del parámetro
 * @returns {string|null}
 */
function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Generar avatar placeholder HTML
 * @param {string} name - Nombre
 * @param {string} size - Clase de tamaño
 * @returns {string} HTML
 */
function avatarHTML(name, url, size = '') {
  if (url && url !== 'null') {
    return `<img src="${url}" alt="${name}" class="avatar ${size}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="avatar avatar-placeholder ${size}" style="display:none">${getInitials(name)}</span>`;
  }
  return `<span class="avatar avatar-placeholder ${size}">${getInitials(name)}</span>`;
}

/**
 * Traducir estado de solicitud
 * @param {string} status
 * @returns {object} {text, class}
 */
function getStatusInfo(status) {
  const map = {
    pending:      { text: 'Pendiente',       class: 'badge-warning' },
    accepted:     { text: 'Aceptada',        class: 'badge-success' },
    active: { text: 'En Tratamiento',  class: 'badge-primary' },
    rejected:     { text: 'Rechazada',       class: 'badge-error' },
    cancelled:    { text: 'Cancelada',       class: 'badge-gray' },
    abandoned:    { text: 'Abandonada',      class: 'badge-error' },
    active:       { text: 'Activa',          class: 'badge-primary' },
    completed:    { text: 'Completada',      class: 'badge-success' },
    proposed:     { text: 'Propuesta',       class: 'badge-warning' },
    confirmed:    { text: 'Confirmada',      class: 'badge-success' }
  };
  return map[status] || { text: status, class: 'badge-gray' };
}

/**
 * Traducir disponibilidad de paciente con badge visual y emoji
 * @param {string} status 
 * @returns {string} HTML del badge
 */
function getPatientStatusBadge(status) {
  const norm = (status || '').toLowerCase().trim();
  const map = {
    'disponible': { emoji: '🟢', text: 'Disponible', class: 'badge-success' },
    'activo': { emoji: '🟢', text: 'Activo', class: 'badge-success' },
    'asignado': { emoji: '🟡', text: 'Asignado', class: 'badge-warning' },
    'en_tratamiento': { emoji: '🔵', text: 'En tratamiento', class: 'badge-primary' },
    'alta_medica': { emoji: '⚫', text: 'Alta médica', class: 'badge-gray' },
    'suspendido': { emoji: '🔴', text: 'Suspendido', class: 'badge-error' }
  };
  const s = map[norm] || { emoji: '🟢', text: status || 'Activo', class: 'badge-success' };
  return `<span class="badge ${s.class}">${s.emoji} ${s.text}</span>`;
}

/**
 * Escapar HTML para evitar XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Debounce para búsquedas
 * @param {Function} func
 * @param {number} wait - Milisegundos
 * @returns {Function}
 */
function debounce(func, wait = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Confirmar acción con modal
 * @param {string} title
 * @param {string} message
 * @returns {Promise<boolean>}
 */
function confirmAction(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" id="confirm-close">✕</button>
        </div>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${message}</p>
        <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
          <button class="btn btn-secondary" id="confirm-cancel">Cancelar</button>
          <button class="btn btn-primary" id="confirm-ok">Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('#confirm-close').onclick = () => { overlay.remove(); resolve(false); };
  });
}

/* =============================================
   CERRAR MODAL AL CLICKEAR AFUERA
   ============================================= */
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

/* =============================================
   DARK MODE
   ============================================= */

/**
 * Inicializar dark mode según preferencia guardada
 */
function initDarkMode() {
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
  }
  updateDarkModeIcon();
}

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
  document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', document.body.classList.contains('dark'));
  updateDarkModeIcon();
}

/**
 * Actualizar ícono del toggle
 */
function updateDarkModeIcon() {
  const isDark = document.body.classList.contains('dark');
  const icon = document.getElementById('dark-mode-icon');
  if (icon) {
    icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  document.querySelectorAll('.dark-mode-toggle').forEach(btn => {
    btn.title = isDark ? 'Modo claro' : 'Modo oscuro';
  });
}

// Inicializar dark mode al cargar
document.addEventListener('DOMContentLoaded', initDarkMode);

/* =============================================
   EXPORTAR A CSV
   ============================================= */

/**
 * Exportar datos a CSV
 * @param {Array<object>} data - Array de objetos
 * @param {Array<{key: string, label: string}>} columns - Definición de columnas
 * @param {string} filename - Nombre del archivo
 */
function exportToCSV(data, columns, filename = 'reporte') {
  if (!data || data.length === 0) {
    showToast('No hay datos para exportar', 'warning');
    return;
  }

  // Encabezados
  const headers = columns.map(c => c.label);
  const rows = data.map(row => {
    return columns.map(c => {
      let value = c.key.split('.').reduce((obj, key) => obj?.[key], row);
      if (value === null || value === undefined) value = '';
      // Escapar comillas y envolver en comillas si contiene comas
      value = String(value).replace(/"/g, '""');
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value}"`;
      }
      return value;
    });
  });

  // Metadatos de identificación
  const dateStr = new Date().toLocaleString('es-VE');
  const titleStr = filename.replace(/_/g, ' ').toUpperCase();
  const metadata = [
    ['"UNIVERSIDAD NACIONAL EXPERIMENTAL RÓMULO GALLEGOS"'],
    ['"Área de Odontología - Plataforma OdontoUNERG"'],
    ['"Reporte:"', `"${titleStr}"`],
    ['"Generado el:"', `"${dateStr}"`],
    [] // Fila vacía separadora
  ];

  // BOM para UTF-8
  const BOM = '\uFEFF';
  const metadataCsv = metadata.map(r => r.join(',')).join('\n');
  const dataCsv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const csv = BOM + metadataCsv + '\n' + dataCsv;

  // Descargar
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Archivo CSV descargado', 'success');
}

/**
 * Scroll al final de un contenedor de mensajes
 */
function scrollToBottom() {
  const container = document.getElementById('chat-messages');
  if (container) {
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 100);
  }
}

/* =============================================
   SIDEBAR MÓVIL - Con overlay y transición suave
   ============================================= */

/**
 * Abrir o cerrar el sidebar lateral (hamburguesa)
 * Activa el overlay oscuro al abrir en móvil
 */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;

  const isOpen = sidebar.classList.contains('open');

  if (isOpen) {
    // Cerrar sidebar
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = ''; // Restaurar scroll
  } else {
    // Abrir sidebar
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevenir scroll de fondo
  }
}

/**
 * Cerrar el sidebar al presionar el overlay (fuera del panel)
 * Esta función se llama desde el onclick del #sidebar-overlay
 */
function closeSidebarOverlay() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = ''; // Restaurar scroll
}

/**
 * Cerrar sidebar automáticamente al cambiar el tamaño de ventana
 * (por si el usuario pasa de móvil a desktop con el sidebar abierto)
 */
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
});

/**
 * Establecer link activo en el sidebar basado en el onclick handler
 * @param {string} sectionName 
 */
function setActiveSidebarLink(sectionName) {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.remove('active');
  });
  // Buscar el link que llama a showSection con ese nombre
  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(link => {
    const onclick = link.getAttribute('onclick') || '';
    if (onclick.includes(`'${sectionName}'`) || onclick.includes(`"${sectionName}"`)) {
      link.classList.add('active');
    }
  });
}

