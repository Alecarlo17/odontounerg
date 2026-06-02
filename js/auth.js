/* =============================================
   AUTH.JS - Sistema de Autenticación
   Login, Registro, Recuperación, Logout
   
   Incluye:
   - Verificación y redirección por rol
   - Protección de rutas con requireAuth()
   - Session watcher con auto-logout
   - Token de 1 hora con alerta de expiración
   ============================================= */

/**
 * Verificar si el usuario está autenticado
 * Redirigir al dashboard correspondiente si ya tiene sesión
 */
async function checkAuthAndRedirect() {
  const offlineSession = localStorage.getItem('offline_session');
  if (offlineSession) {
    try {
      const data = JSON.parse(offlineSession);
      if (data.user && data.user.role) {
        redirectByRole(data.user.role);
        return;
      }
    } catch (e) {}
  }

  const client = window.supabaseClient || supabase;
  const { data: { session } } = await client.auth.getSession();
  if (session) {
    const { data: profile } = await client
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      redirectByRole(profile.role);
    }
  }
}

/**
 * Redirigir según el rol del usuario
 * @param {string} role - Rol del usuario
 */
function redirectByRole(role) {
  switch (role) {
    case 'student':
      navigateTo('/dashboard-estudiante');
      break;
    case 'patient':
      navigateTo('/dashboard-paciente');
      break;
    case 'admin':
      navigateTo('/dashboard-admin');
      break;
    default:
      navigateTo('/dashboard-paciente');
  }
}

/**
 * Iniciar sesión con correo y contraseña
 * @param {string} email
 * @param {string} password
 */
async function loginUser(email, password) {
  const client = window.supabaseClient || supabase;
  // Validaciones
  if (!email || !password) {
    showToast('Por favor complete todos los campos', 'warning');
    return;
  }
  if (!isValidEmail(email)) {
    showToast('Ingrese un correo electrónico válido', 'error');
    return;
  }

  showLoading(true);

  // INTENTAR MODO LOCAL SIEMPRE PRIMERO PARA EVITAR LENTITUD
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if (data.success) {
      showLoading(false);
      showToast('Inicio de sesión exitoso', 'success');
      localStorage.setItem('offline_session', JSON.stringify({ user: data.user }));
      setTimeout(() => redirectByRole(data.user.role), 500);
      return;
    }
  } catch(err) {
    console.warn('Fallback al modo local falló, intentando online');
  }

  // SI FALLA EL MODO LOCAL, INTENTAR ONLINE
  if (!navigator.onLine) {
    showLoading(false);
    showToast('Modo offline: Usuario no encontrado localmente', 'error');
    return;
  }

  // MODO ONLINE NORMAL
  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if (error) {
      showLoading(false);
      if (error.message.includes('Invalid login')) {
        showToast('Correo o contraseña incorrectos', 'error');
      } else if (error.message.includes('Email not confirmed')) {
        showToast('Debe confirmar su correo electrónico', 'warning');
      } else {
        showToast('Error al iniciar sesión: ' + error.message, 'error');
      }
      return;
    }

    // Obtener rol del usuario
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      showLoading(false);
      showToast('Error: Perfil de usuario no encontrado', 'error');
      console.error('Profile fetch error:', profileError);
      return;
    }

    // Sincronizar perfil localmente para modo offline
    try {
      fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
    } catch (e) {
      console.warn('No se pudo sincronizar el perfil offline', e);
    }

    showLoading(false);
    showToast('Inicio de sesión exitoso', 'success');

    // Remove offline session if it exists
    localStorage.removeItem('offline_session');

    setTimeout(() => {
      redirectByRole(profile.role);
    }, 500);

  } catch (err) {
    showLoading(false);
    showToast('Error inesperado. Intente de nuevo.', 'error');
    console.error('Login error:', err);
  }
}

/**
 * Registrar nuevo estudiante
 * @param {object} formData - Datos del formulario
 */
async function registerStudent(formData) {
  // Validaciones
  if (!formData.fullName || !formData.email || !formData.password || !formData.cedula) {
    showToast('Complete todos los campos obligatorios', 'warning');
    return;
  }
  if (!isValidEmail(formData.email)) {
    showToast('Correo electrónico inválido', 'error');
    return;
  }
  if (!isValidCedula(formData.cedula)) {
    showToast('La cédula debe tener entre 7 y 8 dígitos', 'error');
    return;
  }
  if (!isValidPassword(formData.password)) {
    showToast('La contraseña debe tener al menos 8 caracteres', 'error');
    return;
  }
  if (formData.password !== formData.confirmPassword) {
    showToast('Las contraseñas no coinciden', 'error');
    return;
  }

  showLoading(true);
  try {
    const res = await fetch('/api/auth/register-offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: formData.fullName,
        email: formData.email.trim(),
        password: formData.password,
        role: 'student',
        cedula: formData.cedula,
        academicYear: formData.academicYear || null,
        section: formData.section || null,
        treatments: formData.treatments || []
      })
    });
    
    const json = await res.json();
    showLoading(false);
    
    if (!json.success) {
      showToast('Error en registro: ' + json.message, 'error');
      return;
    }

    showToast('Registro exitoso. Iniciando sesión...', 'success');
    
    // Auto-login
    setTimeout(async () => {
      await loginUser(formData.email.trim(), formData.password);
    }, 1500);

  } catch (err) {
    showLoading(false);
    showToast('Error: ' + err.message, 'error');
    console.error('Register error:', err);
  }
}

/**
 * Registrar nuevo paciente
 * @param {object} formData - Datos del formulario
 */
async function registerPatient(formData) {
  // Validaciones
  if (!formData.fullName || !formData.email || !formData.password || !formData.cedula) {
    showToast('Complete todos los campos obligatorios', 'warning');
    return;
  }
  if (!isValidEmail(formData.email)) {
    showToast('Correo electrónico inválido', 'error');
    return;
  }
  if (!isValidCedula(formData.cedula)) {
    showToast('La cédula debe tener entre 7 y 8 dígitos', 'error');
    return;
  }
  if (!isValidPassword(formData.password)) {
    showToast('La contraseña debe tener al menos 8 caracteres', 'error');
    return;
  }
  if (formData.password !== formData.confirmPassword) {
    showToast('Las contraseñas no coinciden', 'error');
    return;
  }

  showLoading(true);
  try {
    const res = await fetch('/api/auth/register-offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: formData.fullName,
        email: formData.email.trim(),
        password: formData.password,
        role: 'patient',
        cedula: formData.cedula,
        age: formData.age || null,
        phone: formData.phone || null,
        direccion: formData.direccion || null,
        medical_history: formData.medicalHistory || null,
        consultation_reason: formData.consultationReason || null,
        gender: formData.gender || null
      })
    });
    
    const json = await res.json();
    showLoading(false);
    
    if (!json.success) {
      showToast('Error en registro: ' + json.message, 'error');
      return;
    }

    showToast('Registro exitoso. Iniciando sesión...', 'success');
    
    // Auto-login
    setTimeout(async () => {
      await loginUser(formData.email.trim(), formData.password);
    }, 1500);

  } catch (err) {
    showLoading(false);
    showToast('Error: ' + err.message, 'error');
    console.error('Register error:', err);
  }
}

/**
 * Recuperar contraseña
 * @param {string} email
 */
async function recoverPassword(email) {
  const client = window.supabaseClient || supabase;
  if (!email || !isValidEmail(email)) {
    showToast('Ingrese un correo electrónico válido', 'error');
    return;
  }

  showLoading(true);
  try {
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/recuperar-clave'
    });

    showLoading(false);
    if (error) {
      showToast('Error al enviar correo de recuperación', 'error');
    } else {
      showToast('Se envió un enlace de recuperación a su correo', 'success');
    }
  } catch (err) {
    showLoading(false);
    showToast('Error inesperado', 'error');
  }
}

/**
 * Cerrar sesión
 */
async function logout() {
  const client = window.supabaseClient || supabase;
  showLoading(true);
  try {
    // Limpiar el watcher de sesión
    if (window._sessionWatcherInterval) {
      clearInterval(window._sessionWatcherInterval);
    }
    
    // Limpiar sesión offline
    localStorage.removeItem('offline_session');

    await client.auth.signOut();
    showLoading(false);
    navigateTo('/login');
  } catch (err) {
    showLoading(false);
    showToast('Error al cerrar sesión', 'error');
  }
}

/**
 * Verificar sesión activa en páginas protegidas.
 * Redirige al login si no hay sesión o si el token expiró.
 * También inicia el session watcher para logout automático.
 * @returns {object|null} - Datos del usuario o null
 */
async function requireAuth() {
  const offlineSession = localStorage.getItem('offline_session');
  
  // Si existe una sesión local, la respetamos como prioritaria
  if (offlineSession) {
    try {
      const data = JSON.parse(offlineSession);
      return { user: data.user, profile: data.user, roleData: null };
    } catch (e) {
      console.warn('Error parsing offline session', e);
    }
  }

  if (!navigator.onLine) {
    navigateTo('/login');
    return null;
  }

  const client = window.supabaseClient || supabase;
  const { data: { session } } = await client.auth.getSession();

  if (!session) {
    navigateTo('/login');
    return null;
  }

  // Verificar expiración del token (1 hora = 3600 segundos)
  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at < now) {
    showToast('Su sesión ha expirado. Inicie sesión nuevamente.', 'warning');
    await client.auth.signOut();
    navigateTo('/login');
    return null;
  }

  // Iniciar vigilante de sesión (verifica cada 60 segundos)
  setupSessionWatcher(session);

  // Obtener perfil completo
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile) {
    showToast('Error: Perfil no configurado. Inicie sesión nuevamente.', 'error');
    await client.auth.signOut();
    navigateTo('/login');
    return null;
  }

  return { user: session.user, profile };
}

/**
 * Vigilante de sesión (Session Watcher)
 * - Verifica cada 60 segundos si el token sigue válido
 * - Muestra alerta 5 minutos antes de que expire
 * - Cierra sesión automáticamente al expirar
 * @param {object} session - Sesión actual de Supabase
 */
function setupSessionWatcher(session) {
  const client = window.supabaseClient || supabase;
  // Evitar múltiples watchers activos
  if (window._sessionWatcherInterval) {
    clearInterval(window._sessionWatcherInterval);
  }

  let warningShown = false;

  window._sessionWatcherInterval = setInterval(async () => {
    const { data: { session: currentSession } } = await client.auth.getSession();

    if (!currentSession) {
      clearInterval(window._sessionWatcherInterval);
      showToast('Su sesión ha expirado. Será redirigido.', 'warning');
      setTimeout(() => navigateTo('/login'), 1500);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = currentSession.expires_at;

    if (!expiresAt) return;

    const remainingSeconds = expiresAt - now;

    // Alerta 5 minutos antes de expirar
    if (remainingSeconds <= 300 && remainingSeconds > 0 && !warningShown) {
      warningShown = true;
      showToast('⚠️ Su sesión expirará en 5 minutos. Guarde su trabajo.', 'warning');
    }

    // Cierre automático al expirar
    if (remainingSeconds <= 0) {
      clearInterval(window._sessionWatcherInterval);
      showToast('Su sesión ha expirado. Será redirigido al inicio.', 'warning');
      setTimeout(async () => {
        await client.auth.signOut();
        navigateTo('/login');
      }, 1500);
    }

  }, 60000); // Verificar cada 60 segundos

  // Escuchar eventos de autenticación de Supabase (como SIGNED_OUT desde otro tab)
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      clearInterval(window._sessionWatcherInterval);
      navigateTo('/login');
    }
    if (event === 'TOKEN_REFRESHED') {
      warningShown = false; // Reiniciar advertencia al refrescar token
    }
  });
}

/**
 * Obtener datos completos del usuario actual
 * @returns {object|null}
 */
async function getCurrentUser() {
  const offlineSession = localStorage.getItem('offline_session');
  
  // 1. PRIORIDAD MÁXIMA: MODO LOCAL (SQLite)
  // Si existe una sesión local, se usa de inmediato para evitar retrasos
  if (offlineSession) {
    try {
      const sessionData = JSON.parse(offlineSession);
      const userId = sessionData.user.id;
      const role = sessionData.user.role;
      
      let roleData = null;
      let profile = null;
      if (role === 'patient') {
        const res = await fetch(`/api/patients/${userId}`);
        const json = await res.json();
        if (json.success && json.data) {
          profile = json.data;
          roleData = {
            age: json.data.age,
            direccion: json.data.address,
            consultation_reason: json.data.consultation_reason,
            medical_history: json.data.medical_history,
            gender: json.data.gender
          };
        }
      } else if (role === 'student') {
        const res = await fetch(`/api/profiles/${userId}/public-student`);
        const json = await res.json();
        if (json.success && json.data) {
          profile = json.data.profile;
          roleData = json.data.student;
        }
      } else {
        profile = sessionData.user;
      }
      return { user: sessionData.user, profile, roleData };
    } catch (e) {
      console.warn('Fallo al obtener usuario localmente', e);
      // Falla silenciosa, intentará Supabase abajo si hay red
    }
  }

  // 2. FALLBACK: MODO ONLINE (Supabase)
  if (!navigator.onLine) return null;

  const client = window.supabaseClient || supabase;
  const { data: { session } } = await client.auth.getSession();
  if (!session) return null;

  const { data: profile } = await client
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  // Obtener datos específicos del rol
  let roleData = null;
  if (profile?.role === 'student') {
    const { data } = await client
      .from('students')
      .select('*')
      .eq('id', session.user.id)
      .single();
    roleData = data;
  } else if (profile?.role === 'patient') {
    const { data } = await client
      .from('patients')
      .select('*')
      .eq('id', session.user.id)
      .single();
    roleData = data;
  }

  return { user: session.user, profile, roleData };
}
