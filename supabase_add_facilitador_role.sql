-- AGREGAR ROL DE FACILITADOR (PROFE v2.1)
-- Asegura que el rol de facilitador esté disponible para asignación

INSERT INTO public.roles (name)
VALUES ('facilitador')
ON CONFLICT (name) DO NOTHING;

-- Comentario: El rol 'facilitador' es esencial para el módulo de asistencia 
-- y para las políticas RLS que restringen el acceso por facilitador_id.
