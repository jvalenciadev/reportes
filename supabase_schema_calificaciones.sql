-- MÓDULO DE CALIFICACIONES (PROFE v2.1)
-- Implementación de calificaciones individuales por participante y módulo

CREATE TABLE IF NOT EXISTS public.calificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participante_id UUID REFERENCES public.participantes(id) ON DELETE CASCADE,
    modulo_id UUID REFERENCES public.programa_modulos(id) ON DELETE CASCADE,
    autoformacion NUMERIC(5,2) DEFAULT 0 CHECK (autoformacion >= 0 AND autoformacion <= 40),
    practica_guiada NUMERIC(5,2) DEFAULT 0 CHECK (practica_guiada >= 0 AND practica_guiada <= 20),
    asistencia NUMERIC(5,2) DEFAULT 0 CHECK (asistencia >= 0 AND asistencia <= 10),
    evaluacion NUMERIC(5,2) DEFAULT 0 CHECK (evaluacion >= 0 AND evaluacion <= 30),
    total NUMERIC(5,2) DEFAULT 0 CHECK (total >= 0 AND total <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(participante_id, modulo_id)
);

-- RLS POLICIES FOR CALIFICACIONES

ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;

-- Admins/Department: Full Access
CREATE POLICY "Admins full access on calificaciones" ON public.calificaciones FOR ALL USING (true);

-- Facilitadores: Can manage calificaciones of their assigned groups
CREATE POLICY "Facilitadores can manage calificaciones of their groups"
ON public.calificaciones
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.facilitador_grupos fg
        JOIN public.inscripciones i ON i.grupo_id = fg.grupo_id
        WHERE fg.profile_id = auth.uid()
        AND i.participante_id = calificaciones.participante_id
    )
);

-- Index for optimization
CREATE INDEX idx_calificaciones_participante ON public.calificaciones(participante_id);
CREATE INDEX idx_calificaciones_modulo ON public.calificaciones(modulo_id);
