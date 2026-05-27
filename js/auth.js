/* =============================================
   AUTH.JS - Sistema de Autenticación
   Login, Registro, Recuperación, Logout
   ============================================= */

/**
 * Verificar si el usuario está autenticado
 * Redirigir al dashboard correspondiente si ya tiene sesión
 */
async function checkAuthAndRedirect() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data: profile } = await supabase
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
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    showLoading(false);
    showToast('Inicio de sesión exitoso', 'success');

    setTimeout(() => {
      if (profile) {
        redirectByRole(profile.role);
      }
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
    showToast('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }
  if (formData.password !== formData.confirmPassword) {
    showToast('Las contraseñas no coinciden', 'error');
    return;
  }

  showLoading(true);
  try {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email.trim(),
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          role: 'student'
        }
      }
    });

    if (authError) {
      showLoading(false);
      showToast('Error en registro: ' + authError.message, 'error');
      return;
    }

    if (!authData.user) {
      showLoading(false);
      showToast('El correo electrónico ya está registrado o es inválido.', 'error');
      return;
    }

    const userId = authData.user.id;

    // 2. Crear perfil
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: formData.fullName,
      email: formData.email.trim(),
      role: 'student',
      phone: formData.phone || null,
      disponibilidad: 'disponible'
    });

    if (profileError) {
      console.error('Error profile:', profileError);
      throw new Error('Error al crear perfil: ' + profileError.message);
    }

    // 3. Crear datos de estudiante
    const { error: studentError } = await supabase.from('students').upsert({
      id: userId,
      student_id_card: formData.cedula,
      section: formData.section || null,
      academic_year: formData.academicYear || null,
      university: 'Universidad Rómulo Gallegos',
      treatments_needed: formData.treatments || [],
      bio: formData.bio || null
    });

    if (studentError) {
      console.error('Error student:', studentError);
      throw new Error('Error al crear datos de estudiante: ' + studentError.message);
    }

    showLoading(false);
    showToast('Registro exitoso. Verifique su correo electrónico o inicie sesión.', 'success');
    
    // Redirigir al login después de 2 segundos
    setTimeout(() => {
      navigateTo('/login');
    }, 2000);

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
    showToast('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }
  if (formData.password !== formData.confirmPassword) {
    showToast('Las contraseñas no coinciden', 'error');
    return;
  }

  showLoading(true);
  try {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email.trim(),
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          role: 'patient'
        }
      }
    });

    if (authError) {
      showLoading(false);
      showToast('Error en registro: ' + authError.message, 'error');
      return;
    }

    if (!authData.user) {
      showLoading(false);
      showToast('El correo electrónico ya está registrado o es inválido.', 'error');
      return;
    }

    const userId = authData.user.id;

    // 2. Crear perfil
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: formData.fullName,
      email: formData.email.trim(),
      role: 'patient',
      phone: formData.phone || null,
      disponibilidad: 'disponible'
    });

    if (profileError) {
      console.error('Error profile:', profileError);
      throw new Error('Error al crear perfil: ' + profileError.message);
    }

    // 3. Crear datos de paciente
    const { error: patientError } = await supabase.from('patients').upsert({
      id: userId,
      cedula: formData.cedula,
      age: formData.age || null,
      phone: formData.phone || null,
      direccion: formData.direccion || null,
      medical_history: formData.medicalHistory || null,
      consultation_reason: formData.consultationReason || null,
      gender: formData.gender || null,
      accepts_requests: true
    });

    if (patientError) {
      console.error('Error patient:', patientError);
      throw new Error('Error al crear datos de paciente: ' + patientError.message);
    }

    showLoading(false);
    showToast('Registro exitoso. Verifique su correo electrónico o inicie sesión.', 'success');
    
    setTimeout(() => {
      navigateTo('/login');
    }, 2000);

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
  if (!email || !isValidEmail(email)) {
    showToast('Ingrese un correo electrónico válido', 'error');
    return;
  }

  showLoading(true);
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
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
  showLoading(true);
  try {
    await supabase.auth.signOut();
    showLoading(false);
    // Redirigir al login
    navigateTo('/login');
  } catch (err) {
    showLoading(false);
    showToast('Error al cerrar sesión', 'error');
  }
}

/**
 * Verificar sesión activa en páginas protegidas
 * Redirigir al login si no hay sesión
 * @returns {object|null} - Datos del usuario o null
 */
async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    navigateTo('/login');
    return null;
  }

  // Obtener perfil completo
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return { user: session.user, profile };
}

/**
 * Obtener datos completos del usuario actual
 * @returns {object|null}
 */
async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  // Obtener datos específicos del rol
  let roleData = null;
  if (profile?.role === 'student') {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('id', session.user.id)
      .single();
    roleData = data;
  } else if (profile?.role === 'patient') {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('id', session.user.id)
      .single();
    roleData = data;
  }

  return { user: session.user, profile, roleData };
}
