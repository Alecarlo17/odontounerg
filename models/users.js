/* =============================================
   MODEL: USERS.JS
   Modelo de datos para usuarios y perfiles
   SQLite como Principal
   ============================================= */

const db = require('../config/database');

/**
 * Obtener perfil de un usuario por su ID
 */
async function getProfileById(userId) {
  try {
    const data = await db.getSQLite('SELECT * FROM profiles WHERE id = ?', [userId]);
    return data || null;
  } catch (e) {
    return null;
  }
}

/**
 * Obtener todos los perfiles (para administración)
 */
async function getAllProfiles(role = null) {
  try {
    let sql = 'SELECT * FROM profiles';
    let params = [];
    if (role && role !== 'all') {
      sql += ' WHERE role = ?';
      params.push(role);
    }
    sql += ' ORDER BY created_at DESC';
    const data = await db.querySQLite(sql, params);
    return data || [];
  } catch (e) {
    return [];
  }
}

/**
 * Actualizar perfil de un usuario
 */
async function updateUserProfile(userId, profileData) {
  const updated_at = new Date().toISOString();
  try {
    await db.runSQLite(
      'UPDATE profiles SET full_name = ?, phone = ?, disponibilidad = ?, updated_at = ? WHERE id = ?',
      [profileData.fullName, profileData.phone, profileData.disponibilidad, updated_at, userId]
    );

    if (await db.getStatus()) {
      db.supabase.from('profiles').update({
        full_name: profileData.fullName,
        phone: profileData.phone,
        disponibilidad: profileData.disponibilidad,
        updated_at: updated_at
      }).eq('id', userId).then(()=>{}).catch(()=>{});
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Contar usuarios por rol
 */
async function countByRole(role) {
  try {
    const data = await db.getSQLite('SELECT COUNT(*) as count FROM profiles WHERE role = ?', [role]);
    return data ? data.count : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Eliminar perfil de un usuario
 */
async function deleteProfile(userId) {
  try {
    await db.runSQLite('DELETE FROM profiles WHERE id = ?', [userId]);

    if (await db.getStatus()) {
      db.supabase.from('profiles').delete().eq('id', userId).then(()=>{}).catch(()=>{});
    }
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  getProfileById,
  getAllProfiles,
  updateUserProfile,
  countByRole,
  deleteProfile
};
