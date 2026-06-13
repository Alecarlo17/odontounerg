-- ==============================================================================
-- MIGRACIÓN DE ESQUEMA SUPABASE (Grado 2.3)
-- (Script optimizado excluyendo las tablas que ya tienes creadas)
-- ==============================================================================

-- 1. Diagnóstico Inicial
CREATE TABLE IF NOT EXISTS public.initial_diagnosis (
    id uuid default gen_random_uuid() not null primary key,
    patient_id uuid not null,
    motivo_consulta text,
    problema_principal text not null,
    sintomas text,
    tiempo_evolucion text,
    especialidad_requerida text,
    nivel_dolor integer default 5,
    observaciones text,
    prioridad text default 'media',
    caso_numero integer default 1,
    activo boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    constraint fk_initial_diagnosis_patient foreign key (patient_id) references public.profiles (id) on delete cascade
);

-- 2. Sesiones de Tratamiento
CREATE TABLE IF NOT EXISTS public.treatment_sessions (
    id uuid default gen_random_uuid() not null primary key,
    treatment_id uuid not null,
    numero_sesion integer,
    fecha timestamp with time zone,
    procedimiento text not null,
    observaciones text,
    recomendaciones text,
    estado text default 'pendiente',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    constraint fk_sessions_treatment foreign key (treatment_id) references public.treatments (id) on delete cascade
);

-- 3. Registro de Actividades (Auditoría Backend)
CREATE TABLE IF NOT EXISTS public.activity_log (
    id uuid default gen_random_uuid() not null primary key,
    user_id uuid,
    user_name text,
    accion text not null,
    modulo text,
    detalle text,
    ip text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    constraint fk_activity_log_user foreign key (user_id) references public.profiles (id) on delete set null
);

-- 4. Certificados de Alta Médica
CREATE TABLE IF NOT EXISTS public.discharge_certificates (
    id uuid default gen_random_uuid() not null primary key,
    patient_id uuid not null,
    student_id uuid not null,
    treatment_id uuid,
    pdf_url text not null,
    generated_at timestamp with time zone default timezone('utc'::text, now()),
    created_at timestamp with time zone default timezone('utc'::text, now()),
    constraint fk_certificates_patient foreign key (patient_id) references public.profiles (id) on delete cascade,
    constraint fk_certificates_student foreign key (student_id) references public.profiles (id) on delete cascade,
    constraint fk_certificates_treatment foreign key (treatment_id) references public.treatments (id) on delete set null
);

-- ====================================================
-- CREACIÓN DE ÍNDICES DE RENDIMIENTO
-- ====================================================
CREATE INDEX IF NOT EXISTS idx_initial_diagnosis_patient ON public.initial_diagnosis(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_treatment ON public.treatment_sessions(treatment_id);
CREATE INDEX IF NOT EXISTS idx_certificates_patient ON public.discharge_certificates(patient_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON public.discharge_certificates(student_id);

-- ====================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================
ALTER TABLE public.initial_diagnosis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discharge_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access initial_diagnosis for authenticated users" ON public.initial_diagnosis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Access treatment_sessions for authenticated users" ON public.treatment_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Access activity_log for authenticated users" ON public.activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Access discharge_certificates for authenticated users" ON public.discharge_certificates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Service Role Full Access initial_diagnosis" ON public.initial_diagnosis FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access treatment_sessions" ON public.treatment_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access activity_log" ON public.activity_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access discharge_certificates" ON public.discharge_certificates FOR ALL TO service_role USING (true) WITH CHECK (true);
