/* =============================================
   SUPABASE-CONFIG.JS
   Configuración de conexión a Supabase

   Opciones de autenticación:
   - persistSession: mantiene la sesión en localStorage
   - autoRefreshToken: renueva el token automáticamente
   - detectSessionInUrl: detecta tokens en la URL (para magic links)
   ============================================= */

// URL del proyecto Supabase
const SUPABASE_URL = 'https://mrozcvhpwpgsfsipelmh.supabase.co';

// Clave pública (anon key) de Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yb3pjdmhwd3Bnc2ZzaXBlbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5OTI0NzgsImV4cCI6MjA5MDU2ODQ3OH0.PIXUEJVN9RMhYCA9-xgfyfswdQIMMVqu1QUG2Gcje3A';

// Inicializar cliente de Supabase con opciones de autenticación
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,       // Guarda la sesión en localStorage
    autoRefreshToken: true,     // Renueva el token automáticamente antes de que expire
    detectSessionInUrl: true,   // Detecta tokens en la URL (magic links / recovery)
    storageKey: 'odontounerg-session' // Clave única para evitar conflictos
  }
});

// Exportar para uso global
window.supabaseClient = supabase;

