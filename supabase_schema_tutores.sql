-- MÓDULO DE TUTORES (PROFE v2.2)
-- Reutilización de profiles y roles para evitar creación innecesaria de tablas de tutor

-- 1. Insertar el rol 'tutor' si no existe
INSERT INTO public.roles (name)
SELECT 'tutor'
WHERE NOT EXISTS (
    SELECT 1 FROM public.roles WHERE name = 'tutor'
);

-- 2. Tabla de Vinculación Tutor <-> Grupos
CREATE TABLE IF NOT EXISTS public.tutor_grupos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(profile_id, grupo_id)
);

-- 3. Tabla de Asistencia de Tutores (Vinculada al profile_id del tutor)
CREATE TABLE IF NOT EXISTS public.asistencias_tutores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    modulo_id UUID REFERENCES public.programa_modulos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    dia INTEGER NOT NULL,
    estado TEXT DEFAULT 'asistio' CHECK (estado IN ('asistio', 'atraso', 'falta', 'permiso')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tutor_id, modulo_id, fecha)
);

-- RLS para las tablas
ALTER TABLE public.tutor_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias_tutores ENABLE ROW LEVEL SECURITY;

-- Admins/Facilitadores/Personal: Full Access (matches calificaciones logic)
CREATE POLICY "Admins full access on tutor_grupos" ON public.tutor_grupos FOR ALL USING (true);
CREATE POLICY "Admins full access on asistencias_tutores" ON public.asistencias_tutores FOR ALL USING (true);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_tutor_grupos_profile ON public.tutor_grupos(profile_id);
CREATE INDEX IF NOT EXISTS idx_tutor_grupos_grupo ON public.tutor_grupos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_tutores_fecha ON public.asistencias_tutores(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_tutores_tutor ON public.asistencias_tutores(tutor_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_tutores_modulo ON public.asistencias_tutores(modulo_id);
