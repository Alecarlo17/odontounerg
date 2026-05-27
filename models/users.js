/* =============================================
   MODEL: USERS.JS
   Modelo de datos para usuarios y perfiles
   
   Este modelo encapsula las consultas a Supabase
   relacionadas con la gestión de usuarios,
   perfiles y autenticación.
   ============================================= */

const supabase = require('../config/supabase');

/**
 * Obtener perfil de un usuario por su ID
 * @param {string} userId - ID del usuario
 * @returns {object|null} Datos del perfil
 */
async function getProfileById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Obtener todos los perfiles (para administración)
 * @param {string} role - Filtrar por rol (opcional)
 * @returns {Array} Lista de perfiles
 */
async function getAllProfiles(role = null) {
  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (role && role !== 'all') {
    query = query.eq('role', role);
  }

  const { data } = await query;
  return data || [];
}

/**
 * Actualizar perfil de un usuario
 * @param {string} userId - ID del usuario
 * @param {object} profileData - Datos a actualizar
 * @returns {boolean} Éxito de la operación
 */
async function updateUserProfile(userId, profileData) {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: profileData.fullName,
      phone: profileData.phone,
      disponibilidad: profileData.disponibilidad,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  return !error;
}

/**
 * Contar usuarios por rol
 * @param {string} role - Rol del usuario
 * @returns {number} Cantidad de usuarios
 */
async function countByRole(role) {
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', role);

  return count || 0;
}

/**
 * Eliminar perfil de un usuario
 * @param {string} userId - ID del usuario
 * @returns {boolean} Éxito de la operación
 */
async function deleteProfile(userId) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  return !error;
}

// Exportar funciones del modelo
module.exports = {
  getProfileById,
  getAllProfiles,
  updateUserProfile,
  countByRole,
  deleteProfile
};
