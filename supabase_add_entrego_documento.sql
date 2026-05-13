-- Agregar campo entrego_documento a inscripciones
ALTER TABLE public.inscripciones ADD COLUMN IF NOT EXISTS entrego_documento BOOLEAN DEFAULT false;
