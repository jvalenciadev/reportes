-- 1. ENUMS & TYPES
CREATE TYPE public.asistencia_estado AS ENUM ('asistencia', 'atraso', 'falta', 'permiso');

-- 2. TABLES

-- Roles
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Departamentos
CREATE TABLE public.departamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Grupos
CREATE TABLE public.grupos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    departamento_id UUID REFERENCES public.departamentos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Participantes
CREATE TABLE public.participantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asistencias
CREATE TABLE public.asistencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participante_id UUID REFERENCES public.participantes(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    estado public.asistencia_estado NOT NULL DEFAULT 'asistencia',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(participante_id, fecha)
);

-- Confirmaciones Participantes
CREATE TABLE public.confirmaciones_participantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participante_id UUID REFERENCES public.participantes(id) ON DELETE CASCADE,
    confirmado BOOLEAN DEFAULT false,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(participante_id, fecha)
);

-- Perfiles de Usuario (Extensión de auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role_id UUID REFERENCES public.roles(id),
    departamento_id UUID REFERENCES public.departamentos(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. INITIAL DATA
INSERT INTO public.roles (name) VALUES ('administrador'), ('visualizador'), ('reporte');

-- 4. FUNCTIONS & TRIGGERS

-- Trigger to create profile on auth.user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role_id)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', (SELECT id FROM public.roles WHERE name = 'visualizador'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. ROW LEVEL SECURITY (RLS)

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmaciones_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name = 'administrador'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has role
CREATE OR REPLACE FUNCTION has_role(role_name TEXT) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for other tables (Example: Administrador can do everything)
CREATE POLICY "Admins have full access" ON public.departamentos FOR ALL USING (is_admin());
CREATE POLICY "Admins have full access" ON public.grupos FOR ALL USING (is_admin());
CREATE POLICY "Admins have full access" ON public.participantes FOR ALL USING (is_admin());
CREATE POLICY "Admins have full access" ON public.asistencias FOR ALL USING (is_admin());
CREATE POLICY "Admins have full access" ON public.confirmaciones_participantes FOR ALL USING (is_admin());

-- Visualizador: Read-only access
CREATE POLICY "Visualizadores have read access" ON public.departamentos FOR SELECT USING (has_role('visualizador') OR has_role('reporte') OR has_role('administrador'));
CREATE POLICY "Visualizadores have read access" ON public.grupos FOR SELECT USING (has_role('visualizador') OR has_role('reporte') OR has_role('administrador'));
CREATE POLICY "Visualizadores have read access" ON public.participantes FOR SELECT USING (has_role('visualizador') OR has_role('reporte') OR has_role('administrador'));
CREATE POLICY "Visualizadores have read access" ON public.asistencias FOR SELECT USING (has_role('visualizador') OR has_role('reporte') OR has_role('administrador'));
CREATE POLICY "Visualizadores have read access" ON public.confirmaciones_participantes FOR SELECT USING (has_role('visualizador') OR has_role('reporte') OR has_role('administrador'));

-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX idx_participantes_grupo_id ON public.participantes(grupo_id);
CREATE INDEX idx_grupos_departamento_id ON public.grupos(departamento_id);
CREATE INDEX idx_asistencias_participante_id ON public.asistencias(participante_id);
CREATE INDEX idx_asistencias_fecha ON public.asistencias(fecha);
CREATE INDEX idx_confirmaciones_participante_id ON public.confirmaciones_participantes(participante_id);
