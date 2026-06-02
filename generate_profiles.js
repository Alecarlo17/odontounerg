const db = require('./config/database');

async function generateOfflineData() {
  console.log('Generando perfiles offline en SQLite...');
  
  const created_at = new Date().toISOString();
  
  // Estudiantes
  const estudiantes = [
    { id: 'est-1', email: 'estudiante1@unerg.edu.ve', full_name: 'Ana Pérez', role: 'student', phone: '04121112233', disp: 'disponible', year: '3', section: 'A' },
    { id: 'est-2', email: 'estudiante2@unerg.edu.ve', full_name: 'Carlos Ruiz', role: 'student', phone: '04145556677', disp: 'disponible', year: '4', section: 'B' }
  ];

  for (const est of estudiantes) {
    // profile
    await db.runSQLite(
      'INSERT OR REPLACE INTO profiles (id, full_name, email, role, phone, disponibilidad, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [est.id, est.full_name, est.email, est.role, est.phone, est.disp, created_at, created_at]
    );
    // student
    await db.runSQLite(
      'INSERT OR REPLACE INTO students (id, user_id, academic_year, section, student_id_card, treatments_needed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [est.id, est.id, est.year, est.section, 'V-25000000', 'Limpieza, Caries', created_at]
    );
  }

  // Pacientes
  const pacientes = [
    { id: 'pac-1', email: 'paciente1@gmail.com', full_name: 'María Gómez', role: 'patient', phone: '04161112233', disp: 'disponible', age: 30, reason: 'Dolor de muela' },
    { id: 'pac-2', email: 'paciente2@gmail.com', full_name: 'José López', role: 'patient', phone: '04245556677', disp: 'ocupado', age: 45, reason: 'Limpieza dental' },
    { id: 'pac-3', email: 'paciente3@gmail.com', full_name: 'Luis Fernández', role: 'patient', phone: '04129998877', disp: 'disponible', age: 22, reason: 'Revisión general' }
  ];

  for (const pac of pacientes) {
    // profile
    await db.runSQLite(
      'INSERT OR REPLACE INTO profiles (id, full_name, email, role, phone, disponibilidad, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [pac.id, pac.full_name, pac.email, pac.role, pac.phone, pac.disp, created_at, created_at]
    );
    // patient
    await db.runSQLite(
      'INSERT OR REPLACE INTO patients (id, user_id, full_name, phone, consultation_reason, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [pac.id, pac.id, pac.full_name, pac.phone, pac.reason, created_at]
    );
  }
  
  console.log('Datos generados exitosamente.');
}

generateOfflineData().catch(console.error);
