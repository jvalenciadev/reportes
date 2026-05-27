-- ARQUITECTURA BI GRANULAR (PROFE v2.0)
-- Migración a sistema basado en registros individuales de participantes

-- 1. Programas Académicos
CREATE TABLE IF NOT EXISTS public.programas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'finalizado', 'suspendido')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Módulos por Programa
CREATE TABLE IF NOT EXISTS public.programa_modulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programa_id UUID REFERENCES public.programas(id) ON DELETE CASCADE,
    titulo_modulo TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'finalizado', 'pendiente')),
    orden INTEGER,
    grupo INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Entidad Participantes (Maestro)
CREATE TABLE IF NOT EXISTS public.participantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    ci TEXT UNIQUE NOT NULL,
    correo TEXT,
    celular TEXT,
    fecha_nacimiento DATE,
    localidad_vive TEXT,
    formalizado BOOLEAN DEFAULT false,
    zona TEXT DEFAULT 'urbano' CHECK (zona IN ('rural', 'urbano')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Inscripciones Individuales
CREATE TABLE IF NOT EXISTS public.inscripciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participante_id UUID REFERENCES public.participantes(id) ON DELETE CASCADE,
    grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE,
    programa_id UUID REFERENCES public.programas(id) ON DELETE CASCADE,
    estado TEXT DEFAULT 'inscrito' CHECK (estado IN ('inscrito', 'confirmado', 'baja', 'permiso')),
    entrego_documento BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(participante_id, programa_id) -- Un participante solo se inscribe una vez por programa
);

-- 5. Registro de Asistencia por Participante
CREATE TABLE IF NOT EXISTS public.asistencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participante_id UUID REFERENCES public.participantes(id) ON DELETE CASCADE,
    modulo_id UUID REFERENCES public.programa_modulos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    dia INTEGER NOT NULL,
    estado TEXT DEFAULT 'asistio' CHECK (estado IN ('asistio', 'atraso', 'falta', 'permiso')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(participante_id, modulo_id, fecha) -- Evitar duplicidad de asistencia el mismo día para el mismo módulo
);

-- 6. Limpieza de Tablas Obsoletas (Legacy Totals)
-- DROP TABLE IF EXISTS public.inscripciones_resumen;
-- DROP TABLE IF EXISTS public.asistencia_diaria;

-- 7. Vistas BI para facilitar el reporte (Abstracción de complejidad)
-- Esta vista emula el comportamiento de las tablas anteriores para no romper el dashboard inmediatamente
CREATE OR REPLACE VIEW public.v_asistencia_consolidada AS
SELECT 
    a.fecha,
    a.dia,
    i.grupo_id,
    COUNT(CASE WHEN a.estado = 'asistio' THEN 1 END) as asistieron,
    COUNT(CASE WHEN a.estado = 'atraso' THEN 1 END) as atraso,
    COUNT(CASE WHEN a.estado = 'falta' THEN 1 END) as falta,
    COUNT(CASE WHEN a.estado = 'permiso' THEN 1 END) as permiso
FROM public.asistencias a
JOIN public.inscripciones i ON a.participante_id = i.participante_id
GROUP BY a.fecha, a.dia, i.grupo_id;

CREATE OR REPLACE VIEW public.v_inscripciones_consolidada AS
SELECT 
    grupo_id,
    COUNT(*) as total_inscritos,
    COUNT(CASE WHEN estado = 'confirmado' THEN 1 END) as total_confirmados
FROM public.inscripciones
GROUP BY grupo_id;

-- Índices para Performance
CREATE INDEX idx_participantes_ci ON public.participantes(ci);
CREATE INDEX idx_asistencias_fecha ON public.asistencias(fecha);
CREATE INDEX idx_inscripciones_grupo ON public.inscripciones(grupo_id);
