/* =============================================
   CONFIG/DATABASE.JS
   Gestor Híbrido de Base de Datos
   Maneja la conexión a Supabase u offline (SQLite)
   ============================================= */

const dns = require('dns');
const path = require('path');
const Database = require('better-sqlite3');
const supabase = require('./supabase');

// Cache para el estado de conexión
let isOnline = false;
let lastCheck = 0;
const CACHE_TTL = 30000; // 30 segundos de caché

// Inicializar SQLite
const dbPath = path.join(__dirname, '..', 'database.sqlite');
let sqliteDb;
try {
  sqliteDb = new Database(dbPath);
  console.log('Conexión establecida con la base de datos local (SQLite).');
  _initializeSQLiteSchema();
} catch (err) {
  console.error('Error al abrir la base de datos local (SQLite):', err.message);
}

/**
 * Función para verificar la conexión a internet con timeout rápido (1s)
 */
function checkInternetConnection() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 1000);
    dns.lookup('google.com', (err) => {
      clearTimeout(timeout);
      resolve(!err);
    });
  });
}

/**
 * Verifica el estado de la conexión sin bloquear (cacheado)
 */
async function getStatus() {
  const now = Date.now();
  if (now - lastCheck > CACHE_TTL) {
    lastCheck = now;
    // Actualización en segundo plano sin bloquear el hilo
    checkInternetConnection().then(status => {
      if (isOnline !== status) {
        console.log(`[Red] Cambio de estado: ${status ? 'Online' : 'Offline'}`);
      }
      isOnline = status;
    });
  }
  return isOnline;
}

/**
 * Inicializa el esquema de tablas en SQLite si no existe.
 */
function _initializeSQLiteSchema() {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      full_name TEXT,
      email TEXT,
      role TEXT,
      phone TEXT,
      disponibilidad TEXT,
      avatar_url TEXT,
      created_at TEXT,
      updated_at TEXT,
      password_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      academic_year TEXT,
      section TEXT,
      student_id_card TEXT,
      treatments_needed TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      full_name TEXT,
      dni TEXT,
      phone TEXT,
      address TEXT,
      birth_date TEXT,
      age INTEGER,
      gender TEXT,
      medical_history TEXT,
      consultation_reason TEXT,
      accepts_requests INTEGER DEFAULT 1,
      dental_status TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      request_id TEXT,
      proposed_by TEXT,
      date TEXT,
      duration_minutes INTEGER,
      location TEXT,
      status TEXT,
      notes TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      student_id TEXT,
      patient_id TEXT,
      status TEXT,
      message TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      sender_id TEXT,
      receiver_id TEXT,
      message TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      created_by TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS treatments (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      student_id TEXT,
      tratamiento TEXT,
      fecha TEXT,
      estado TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      tipo TEXT,
      titulo TEXT,
      mensaje TEXT,
      referencia_id TEXT,
      leida INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      student_id TEXT,
      patient_id TEXT,
      rating INTEGER,
      comment TEXT,
      created_at TEXT
    );

    -- Índices para mejorar rendimiento
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
    CREATE INDEX IF NOT EXISTS idx_requests_patient ON requests(patient_id);
    CREATE INDEX IF NOT EXISTS idx_requests_student ON requests(student_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_req ON appointments(request_id);
    CREATE INDEX IF NOT EXISTS idx_chats_users ON chats(sender_id, receiver_id);
    CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_treatments_student ON treatments(student_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_student ON ratings(student_id);
  `);
}

/**
 * Ejecuta una consulta SQLite genérica que devuelve múltiples filas.
 */
function querySQLite(sql, params = []) {
  try {
    const stmt = sqliteDb.prepare(sql);
    return Promise.resolve(stmt.all(params));
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Ejecuta una consulta SQLite que devuelve una sola fila.
 */
function getSQLite(sql, params = []) {
  try {
    const stmt = sqliteDb.prepare(sql);
    return Promise.resolve(stmt.get(params));
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Ejecuta un comando SQLite (INSERT, UPDATE, DELETE).
 */
function runSQLite(sql, params = []) {
  try {
    const stmt = sqliteDb.prepare(sql);
    const info = stmt.run(params);
    return Promise.resolve({ lastID: info.lastInsertRowid, changes: info.changes });
  } catch (err) {
    return Promise.reject(err);
  }
}

module.exports = {
  supabase,
  sqliteDb,
  getStatus,
  querySQLite,
  getSQLite,
  runSQLite,
  get isOnline() {
    return isOnline;
  }
};
