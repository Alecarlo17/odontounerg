/* =============================================
   MODEL: USERS.JS
   Modelo de datos para usuarios y perfiles
   ============================================= */

const db = require('../config/database');

/**
 * Obtener perfil de un usuario por su ID
 */
async function getProfileById(userId) {
  try {
    const { data, error } = await db.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data || null;
  } catch (e) {
    console.error('Error en getProfileById:', e);
    return null;
  }
}

/**
 * Obtener todos los perfiles (para administración)
 */
async function getAllProfiles(role = null) {
  try {
    let query = db.supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error en getAllProfiles:', e);
    return [];
  }
}

/**
 * Actualizar perfil de un usuario
 */
async function updateUserProfile(userId, profileData) {
  const updated_at = new Date().toISOString();
  try {
    const { error } = await db.supabase
      .from('profiles')
      .update({
        full_name: profileData.fullName,
        phone: profileData.phone,
        disponibilidad: profileData.disponibilidad,
        updated_at: updated_at
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Error en updateUserProfile:', e);
    return false;
  }
}

/**
 * Contar usuarios por rol
 */
async function countByRole(role) {
  try {
    const { count, error } = await db.supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', role);
      
    if (error) throw error;
    return count || 0;
  } catch (e) {
    console.error('Error en countByRole:', e);
    return 0;
  }
}

/**
 * Suspender perfil de un usuario
 */
async function suspendProfile(userId, reason) {
  try {
    const { error } = await db.supabase
      .from('profiles')
      .update({ 
        is_suspended: true,
        suspension_reason: reason 
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Error en suspendProfile:', e);
    return false;
  }
}

module.exports = {
  getProfileById,
  getAllProfiles,
  updateUserProfile,
  countByRole,
  suspendProfile
};
