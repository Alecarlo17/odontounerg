/* =============================================
   CONTROLLERS/DIAGNOSIS-CONTROLLER.JS
   Módulo de diagnóstico inicial del paciente
   (Adaptado para Supabase)
   ============================================= */
const db = require('../config/database');

/** Calcular prioridad automáticamente por nivel de dolor */
function calcPrioridad(nivelDolor) {
  if (nivelDolor >= 7) return 'alta';
  if (nivelDolor >= 4) return 'media';
  return 'baja';
}

/** Crear diagnóstico inicial */
async function createDiagnosis(req, res) {
  const { patientId, motivoConsulta, problemaPrincipal, sintomas, tiempoEvolucion,
          especialidadRequerida, nivelDolor, observaciones } = req.body;

  if (!patientId || !problemaPrincipal) {
    return res.status(400).json({ success: false, message: 'El problema principal es obligatorio' });
  }

  const nivel = parseInt(nivelDolor) || 5;
  const prioridad = calcPrioridad(nivel);

  try {
    // Desactivar diagnósticos anteriores activos
    await db.supabase
      .from('initial_diagnosis')
      .update({ activo: false })
      .eq('patient_id', patientId)
      .eq('activo', true);

    // Contar casos previos para numero_caso
    const { count } = await db.supabase
      .from('initial_diagnosis')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patientId);

    const casoNumero = (count || 0) + 1;

    // Insertar el nuevo diagnóstico
    const { data, error } = await db.supabase
      .from('initial_diagnosis')
      .insert([{
        patient_id: patientId,
        motivo_consulta: motivoConsulta || null,
        problema_principal: problemaPrincipal,
        sintomas: sintomas || null,
        tiempo_evolucion: tiempoEvolucion || null,
        especialidad_requerida: especialidadRequerida || null,
        nivel_dolor: nivel,
        observaciones: observaciones || null,
        prioridad: prioridad,
        caso_numero: casoNumero,
        activo: true
      }])
      .select('id')
      .single();

    if (error) throw error;

    // Activar el paciente en búsqueda (accepts_requests = true)
    await db.supabase
      .from('patients')
      .update({ accepts_requests: true, consultation_reason: especialidadRequerida || null })
      .eq('id', patientId);

    return res.json({ success: true, id: data.id, prioridad, casoNumero });
  } catch (e) {
    console.error('Error en createDiagnosis:', e);
    return res.status(500).json({ success: false, message: 'Error al registrar diagnóstico' });
  }
}

/** Obtener diagnóstico activo de un paciente */
async function getDiagnosis(req, res) {
  const { patientId } = req.params;
  try {
    const { data, error } = await db.supabase
      .from('initial_diagnosis')
      .select('*')
      .eq('patient_id', patientId)
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return res.json({ success: true, data: data || null });
  } catch (e) {
    console.error('Error en getDiagnosis:', e);
    return res.status(500).json({ success: false, data: null });
  }
}

/** Iniciar nuevo caso tras alta médica */
async function startNewCase(req, res) {
  const { patientId } = req.params;
  try {
    // Reiniciar accepts_requests temporalmente en 0 hasta nuevo diagnóstico
    await db.supabase
      .from('patients')
      .update({ accepts_requests: false })
      .eq('id', patientId);
      
    return res.json({ success: true, message: 'Puedes registrar un nuevo diagnóstico inicial' });
  } catch (e) {
    return res.status(500).json({ success: false });
  }
}

/** Cerrar caso sin nuevo diagnóstico */
async function closeCase(req, res) {
  const { patientId } = req.params;
  try {
    await db.supabase
      .from('initial_diagnosis')
      .update({ activo: false })
      .eq('patient_id', patientId)
      .eq('activo', true);

    await db.supabase
      .from('patients')
      .update({ accepts_requests: false })
      .eq('id', patientId);

    return res.json({ success: true, message: 'Caso cerrado. Puedes activar un nuevo caso desde tu perfil.' });
  } catch(e) {
    return res.status(500).json({ success: false });
  }
}

module.exports = { createDiagnosis, getDiagnosis, startNewCase, closeCase };
