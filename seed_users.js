const db = require('./config/database');

async function seed() {
  console.log("Iniciando seed de perfiles locales...");

  // Esperar a que la base de datos se inicialice
  await new Promise(resolve => setTimeout(resolve, 1000));

  const students = [
    { id: 'std-1', email: 'estudiante1@unerg.edu.ve', name: 'Carlos bolivar', role: 'student', phone: '0412-1111111', year: '4to año', bio: 'Me especializo en endodoncia.' },
    { id: 'std-2', email: 'estudiante2@unerg.edu.ve', name: 'Maria Lopez', role: 'student', phone: '0414-2222222', year: '5to año', bio: 'Busco pacientes para prostodoncia.' },
    { id: 'std-3', email: 'estudiante3@unerg.edu.ve', name: 'Jose Martinez', role: 'student', phone: '0416-3333333', year: '3er año', bio: 'Atención general.' }
  ];

  const patients = [
    { id: 'pat-1', email: 'paciente1@gmail.com', name: 'Ana sevilla', role: 'patient', phone: '0424-4444444', age: 30, reason: 'Ortodoncia' },
    { id: 'pat-2', email: 'paciente2@gmail.com', name: 'Luis Gomez', role: 'patient', phone: '0412-5555555', age: 45, reason: 'Extracción' },
    { id: 'pat-3', email: 'paciente3@gmail.com', name: 'Carmen Ruiz', role: 'patient', phone: '0414-6666666', age: 55, reason: 'Prótesis' }
  ];

  const now = new Date().toISOString();

  try {
    for (const s of students) {
      await db.runSQLite(
        'INSERT OR REPLACE INTO profiles (id, full_name, email, role, phone, disponibilidad, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [s.id, s.name, s.email, s.role, s.phone, 'disponible', now, now]
      );
      await db.runSQLite(
        'INSERT OR REPLACE INTO students (id, user_id, section, academic_year, treatments_needed, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [s.id, s.id, 'Sección 1', s.year, '[]', now]
      );
    }

    for (const p of patients) {
      await db.runSQLite(
        'INSERT OR REPLACE INTO profiles (id, full_name, email, role, phone, disponibilidad, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [p.id, p.name, p.email, p.role, p.phone, 'disponible', now, now]
      );
      await db.runSQLite(
        'INSERT OR REPLACE INTO patients (id, user_id, full_name, phone, address, medical_history, consultation_reason, accepts_requests, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [p.id, p.id, p.name, p.phone, 'San Juan de los Morros', 'Ninguno', p.reason, 1, now]
      );
    }

    // Seed tratamientos dummy
    await db.runSQLite(
      'INSERT OR REPLACE INTO treatments (id, patient_id, student_id, tratamiento, fecha, estado, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['t-1', 'pat-1', 'std-1', 'Ortodoncia', now, 'finalizado', now]
    );
    await db.runSQLite(
      'INSERT OR REPLACE INTO treatments (id, patient_id, student_id, tratamiento, fecha, estado, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['t-2', 'pat-2', 'std-2', 'Extracción', now, 'en_proceso', now]
    );

    console.log("Seed completado exitosamente.");
    process.exit(0);
  } catch (err) {
    console.error("Error al sembrar datos:", err);
    process.exit(1);
  }
}

seed();
