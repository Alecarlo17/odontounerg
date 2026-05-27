/* =============================================
   CONFIG/SUPABASE.JS
   Configuración de conexión a Supabase (Backend)
   
   Este archivo establece la conexión con Supabase
   desde el servidor Node.js para operaciones
   que requieren validación del lado del servidor.
   ============================================= */

const { createClient } = require('@supabase/supabase-js');

// URL del proyecto Supabase
const SUPABASE_URL = 'https://mrozcvhpwpgsfsipelmh.supabase.co';

// Clave pública (anon key) de Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yb3pjdmhwd3Bnc2ZzaXBlbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5OTI0NzgsImV4cCI6MjA5MDU2ODQ3OH0.PIXUEJVN9RMhYCA9-xgfyfswdQIMMVqu1QUG2Gcje3A';

// Crear cliente de Supabase para el servidor
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportar el cliente para uso en modelos y controladores
module.exports = supabase;
