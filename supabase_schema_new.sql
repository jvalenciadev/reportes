-- 1. ENUMS & TYPES (Optional for now, but good for consistency)
-- DROP PREVIOUS TABLES IF THEY EXIST TO START CLEAN
DROP TABLE IF EXISTS public.asistencias CASCADE;
DROP TABLE IF EXISTS public.confirmaciones_participantes CASCADE;
DROP TABLE IF EXISTS public.participantes CASCADE;

-- 2. NEW AGGREGATE TABLES

-- Resumen de Asistencia Diaria (Agregado por Grupo)
CREATE TABLE public.asistencia_diaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    asistieron INTEGER DEFAULT 0,
    atraso INTEGER DEFAULT 0,
    falta INTEGER DEFAULT 0,
    permiso INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(grupo_id, fecha)
);

-- Resumen de Inscripciones (Totales por Grupo)
CREATE TABLE public.inscripciones_resumen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE,
    total_inscritos INTEGER DEFAULT 0,
    total_confirmados INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(grupo_id)
);

-- 3. RLS POLICIES FOR NEW TABLES

ALTER TABLE public.asistencia_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripciones_resumen ENABLE ROW LEVEL SECURITY;

-- Admins: Full Access
CREATE POLICY "Admins full access" ON public.asistencia_diaria FOR ALL USING (is_admin());
CREATE POLICY "Admins full access" ON public.inscripciones_resumen FOR ALL USING (is_admin());

-- Visualizadores/Reporte: Read Access
CREATE POLICY "Read access for roles" ON public.asistencia_diaria FOR SELECT USING (has_role('visualizador') OR has_role('reporte') OR has_role('administrador'));
CREATE POLICY "Read access for roles" ON public.inscripciones_resumen FOR SELECT USING (has_role('visualizador') OR has_role('reporte') OR has_role('administrador'));

-- Departamentos: can update their own data
-- We check if the group belongs to the user's departamento
CREATE POLICY "Department users can update their groups data" ON public.asistencia_diaria 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.grupos g ON g.departamento_id = p.departamento_id
    WHERE p.id = auth.uid() AND g.id = asistencia_diaria.grupo_id
  )
);

CREATE POLICY "Department users can update their groups inscripciones" ON public.inscripciones_resumen 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.grupos g ON g.departamento_id = p.departamento_id
    WHERE p.id = auth.uid() AND g.id = inscripciones_resumen.grupo_id
  )
);

-- 4. INDEXES
CREATE INDEX idx_asistencia_diaria_fecha ON public.asistencia_diaria(fecha);
CREATE INDEX idx_asistencia_diaria_grupo ON public.asistencia_diaria(grupo_id);
CREATE INDEX idx_inscripciones_resumen_grupo ON public.inscripciones_resumen(grupo_id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
