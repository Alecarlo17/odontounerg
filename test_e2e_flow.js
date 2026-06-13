const supabase = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = 'https://mrozcvhpwpgsfsipelmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yb3pjdmhwd3Bnc2ZzaXBlbG1oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk5MjQ3OCwiZXhwIjoyMDkwNTY4NDc4fQ.Lps-OHlQ5F3g_qHnYVamgdSEWhwNqWV0tEUtYRtoTWw';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const API_BASE = 'http://localhost:3000/api';

async function runTest() {
  console.log('=== INICIANDO PRUEBA DE FLUJO E2E ===');
  try {
    // 1. Crear Estudiante
    const studentEmail = `test_student_${Date.now()}@test.com`;
    console.log(`\n1. Registrando estudiante: ${studentEmail}`);
    const { data: studentData, error: studentError } = await client.auth.signUp({
      email: studentEmail,
      password: 'Password123!',
      options: { data: { full_name: 'Test Student', role: 'student' } }
    });
    if (studentError) throw studentError;
    const studentId = studentData.user.id;
    
    await client.from('profiles').insert({ id: studentId, full_name: 'Test Student', email: studentEmail, role: 'student' });
    await client.from('students').insert({ id: studentId, student_id_card: '12345678' });
    console.log('✅ Estudiante registrado exitosamente.');

    // 2. Crear Paciente
    const patientEmail = `test_patient_${Date.now()}@test.com`;
    console.log(`\n2. Registrando paciente: ${patientEmail}`);
    const { data: patientData, error: patientError } = await client.auth.signUp({
      email: patientEmail,
      password: 'Password123!',
      options: { data: { full_name: 'Test Patient', role: 'patient' } }
    });
    if (patientError) throw patientError;
    const patientId = patientData.user.id;
    
    await client.from('profiles').insert({ id: patientId, full_name: 'Test Patient', email: patientEmail, role: 'patient' });
    await client.from('patients').insert({ id: patientId, accepts_requests: true, consultation_reason: 'Dolor Molar' });
    console.log('✅ Paciente registrado exitosamente.');

    // 3. Crear Diagnóstico (Paciente)
    console.log(`\n3. Paciente crea diagnóstico inicial`);
    const diagRes = await fetch(`${API_BASE}/diagnosis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId,
        problemaPrincipal: 'Dolor severo en la muela de juicio',
        nivelDolor: 8
      })
    }).then(r => r.json());
    if (!diagRes.success) throw new Error(diagRes.message);
    console.log('✅ Diagnóstico registrado.');

    // 4. Estudiante envía solicitud a Paciente
    console.log(`\n4. Estudiante envía solicitud al paciente`);
    const reqRes = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        patientId,
        message: 'Hola, me gustaría tratar tu caso.',
        senderRole: 'student'
      })
    }).then(r => r.json());
    if (!reqRes.success) throw new Error(reqRes.message);
    console.log('✅ Solicitud enviada correctamente.');

    // 5. Estudiante intenta obtener solicitudes pendientes
    console.log(`\n5. Estudiante verifica solicitudes`);
    const getReqs = await fetch(`${API_BASE}/requests/student/${studentId}`).then(r => r.json());
    const requestId = getReqs.data[0].id;
    console.log(`✅ Solicitud encontrada. ID: ${requestId}`);

    // 6. Paciente acepta solicitud
    console.log(`\n6. Paciente acepta la solicitud`);
    const acceptRes = await fetch(`${API_BASE}/requests/${requestId}/accept`, { method: 'PUT' }).then(r => r.json());
    if (!acceptRes.success) throw new Error(acceptRes.message || 'Fallo aceptar');
    console.log('✅ Solicitud aceptada.');

    // 7. Estudiante agenda cita
    console.log(`\n7. Estudiante agenda una cita`);
    const apptRes = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        proposedBy: studentId,
        date: new Date().toISOString(),
        duration: 60,
        location: 'Silla 3, Clínica 1'
      })
    }).then(r => r.json());
    if (!apptRes.success) throw new Error(apptRes.message);
    console.log('✅ Cita propuesta.');

    // 8. Obtener Cita y confirmar
    const getAppts = await fetch(`${API_BASE}/appointments/user/${patientId}`).then(r => r.json());
    const apptId = getAppts.data[0].id;
    console.log(`\n8. Paciente confirma la cita (ID: ${apptId})`);
    const confirmRes = await fetch(`${API_BASE}/appointments/${apptId}/confirm`, { method: 'PUT' }).then(r => r.json());
    if (!confirmRes.success) throw new Error(confirmRes.message);
    console.log('✅ Cita confirmada.');

    // 9. Completar Cita
    console.log(`\n9. Estudiante marca la cita como finalizada`);
    const compApptRes = await fetch(`${API_BASE}/appointments/${apptId}/complete`, { method: 'PUT' }).then(r => r.json());
    if (!compApptRes.success) throw new Error(compApptRes.message);
    console.log('✅ Cita finalizada.');

    // 10. Estudiante registra tratamiento
    console.log(`\n10. Estudiante registra el tratamiento en historial clínico`);
    const treatRes = await fetch(`${API_BASE}/dashboard/treatments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        patientId,
        tratamiento: 'Extracción de muela',
        estado: 'finalizado'
      })
    }).then(r => r.json());
    if (!treatRes.success) throw new Error(treatRes.message);
    console.log('✅ Tratamiento registrado exitosamente.');

    // 11. Dar de alta al paciente
    console.log(`\n11. Estudiante da de alta al paciente`);
    const dischargeRes = await fetch(`${API_BASE}/requests/${requestId}/discharge`, { method: 'PUT' }).then(r => r.json());
    if (!dischargeRes.success) throw new Error(dischargeRes.message);
    console.log('✅ Paciente dado de alta. Flujo completado con éxito.');

    // Opcional: Limpieza de la base de datos de los datos de prueba
    console.log('\n--- Flujo probado exitosamente ---');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error.message || error);
    process.exit(1);
  }
}

runTest();
