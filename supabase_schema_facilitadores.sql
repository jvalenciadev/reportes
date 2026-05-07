-- MÓDULO DE FACILITADORES (PROFE v2.1)
-- Implementación de seguridad y asignación de grupos por facilitador

-- 1. Actualizar roles permitidos (Si no se hizo ya)
-- DO $$ BEGIN
--     ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'facilitador';
-- EXCEPTION
--     WHEN others THEN NULL;
-- END $$;

-- 2. Tabla de Vinculación Facilitador <-> Grupos (Relación N:M)
CREATE TABLE IF NOT EXISTS public.facilitador_grupos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(profile_id, grupo_id)
);

-- 3. RLS para Facilitadores (Seguridad a nivel de fila)
-- Un facilitador solo puede ver/editar asistencias de sus grupos asignados

ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Facilitadores pueden insertar asistencias de sus grupos"
ON public.asistencias
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.facilitador_grupos fg
        JOIN public.inscripciones i ON i.grupo_id = fg.grupo_id
        WHERE fg.profile_id = auth.uid()
        AND i.participante_id = asistencias.participante_id
    )
);

CREATE POLICY "Facilitadores pueden ver asistencias de sus grupos"
ON public.asistencias
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.facilitador_grupos fg
        JOIN public.inscripciones i ON i.grupo_id = fg.grupo_id
        WHERE fg.profile_id = auth.uid()
        AND i.participante_id = asistencias.participante_id
    )
);

-- Índices para optimizar el filtrado por facilitador
CREATE INDEX idx_facilitador_grupos_profile ON public.facilitador_grupos(profile_id);
CREATE INDEX idx_facilitador_grupos_grupo ON public.facilitador_grupos(grupo_id);
