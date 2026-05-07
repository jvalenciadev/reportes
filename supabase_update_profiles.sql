-- ACTUALIZACIÓN DE PERFILES DE USUARIO (PROFE v2.1)
-- Añadiendo campos granulares para una mejor gestión de identidad

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nombre TEXT,
ADD COLUMN IF NOT EXISTS apellidos TEXT,
ADD COLUMN IF NOT EXISTS ci TEXT,
ADD COLUMN IF NOT EXISTS correo TEXT;

-- Comentario: Estos campos permiten separar el nombre completo en partes 
-- y almacenar el documento de identidad de los encargados/facilitadores.
