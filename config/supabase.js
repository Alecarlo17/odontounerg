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

// Clave de servicio (Service Role Key) para saltar RLS en el backend
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yb3pjdmhwd3Bnc2ZzaXBlbG1oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk5MjQ3OCwiZXhwIjoyMDkwNTY4NDc4fQ.Lps-OHlQ5F3g_qHnYVamgdSEWhwNqWV0tEUtYRtoTWw';

// Crear cliente de Supabase para el servidor
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Exportar el cliente para uso en modelos y controladores
module.exports = supabase;
