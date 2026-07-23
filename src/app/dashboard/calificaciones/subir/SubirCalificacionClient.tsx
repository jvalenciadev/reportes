'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/utils/supabase/client'
import {
  Building2, Users, GraduationCap, ChevronRight, Save,
  Database, Info, AlertTriangle, CheckCircle, Calculator, Copy, Check, X
} from 'lucide-react'

export default function SubirCalificacionClient({
  departamentos,
  userDeptId,
  userRole,
  facilitadorGroups,
  currentUser
}: any) {
  const supabase = createClient()

  // Dropdown States
  const [selectedDept, setSelectedDept] = useState(userDeptId || '')
  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [programs, setPrograms] = useState<any[]>([])
  const [selectedProgram, setSelectedProgram] = useState('')
  const [modules, setModules] = useState<any[]>([])
  const [selectedModule, setSelectedModule] = useState('')

  // Main Grade States
  const [participants, setParticipants] = useState<any[]>([])
  const [gradeData, setGradeData] = useState<Record<string, {
    autoformacion: number;
    practica_guiada: number;
    asistencia: number;
    evaluacion: number;
  }>>({})
  const [initialGradeData, setInitialGradeData] = useState<Record<string, any>>({})

  // UI Status
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isTableMissing, setIsTableMissing] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; title: string; text: string } | null>(null)
  const [copiedSql, setCopiedSql] = useState(false)
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false)

  const isDirty = JSON.stringify(gradeData) !== JSON.stringify(initialGradeData)

  const showNotif = (type: 'success' | 'error' | 'info', title: string, text: string) => {
    setNotification({ type, title, text })
    setTimeout(() => setNotification(null), 5000)
  }

  // 1. Initial table existence check
  useEffect(() => {
    const checkTable = async () => {
      const { error } = await supabase.from('calificaciones').select('id').limit(1)
      if (error && error.code === 'PGRST205') {
        setIsTableMissing(true)
      } else {
        setIsTableMissing(false)
      }
    }
    checkTable()
  }, [])

  // 2. Load Groups based on selected department (for non-facilitadores)
  useEffect(() => {
    if (userRole === 'facilitador') {
      setGroups(facilitadorGroups)
      if (facilitadorGroups.length > 0) {
        setSelectedGroup(facilitadorGroups[0].id)
      }
      return
    }

    const fetchGroups = async () => {
      if (!selectedDept) {
        setGroups([])
        return
      }
      const { data } = await supabase
        .from('grupos')
        .select('*, departamentos(name)')
        .eq('departamento_id', selectedDept)
        .order('name')
      setGroups(data || [])
    }
    fetchGroups()
  }, [selectedDept, userRole, facilitadorGroups])

  // 3. Load Programs
  useEffect(() => {
    const fetchPrograms = async () => {
      const { data } = await supabase
        .from('programas')
        .select('*')
        .order('titulo')
      setPrograms(data || [])
      if (data && data.length > 0) {
        setSelectedProgram(data[0].id)
      }
    }
    fetchPrograms()
  }, [])

  // 4. Load Modules when Program is selected
  useEffect(() => {
    const fetchModules = async () => {
      if (!selectedProgram) {
        setModules([])
        return
      }
      const { data } = await supabase
        .from('programa_modulos')
        .select('*')
        .eq('programa_id', selectedProgram)
        .order('grupo', { ascending: true })
        .order('orden', { ascending: true })

      const sortedData = data || []
      const todayStr = new Date().toISOString().split('T')[0]
      // Filtrar para mostrar solo el módulo actual e iniciados anteriormente (ocultar módulos futuros)
      const visibleData = sortedData.filter(m => todayStr >= m.fecha_inicio)
      setModules(visibleData)

      if (visibleData.length > 0) {
        // Seleccionar automáticamente el módulo en curso
        const currentModule = visibleData.find(m => todayStr >= m.fecha_inicio && todayStr <= m.fecha_fin)
        if (currentModule) {
          setSelectedModule(currentModule.id)
        } else {
          // Si no hay módulo en curso, seleccionar el más reciente de los iniciados
          setSelectedModule(visibleData[visibleData.length - 1].id)
        }
      } else {
        setSelectedModule('')
      }
    }
    fetchModules()
  }, [selectedProgram])

  // 5. Load Participants and their Grades
  const loadGradesData = async () => {
    if (!selectedGroup || !selectedModule) return
    setLoading(true)

    try {
      // Fetch all participants registered in this group and program (Only active 'inscritos')
      const { data: inscripcionesData, error: iErr } = await supabase
        .from('inscripciones')
        .select('estado, participantes(id, nombre, apellido, ci)')
        .eq('grupo_id', selectedGroup)
        .eq('programa_id', selectedProgram)
        .eq('estado', 'inscrito')

      if (iErr) throw iErr

      const list = inscripcionesData
        ?.map((i: any) => i.participantes)
        .filter(Boolean)
        .sort((a: any, b: any) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)) || []

      setParticipants(list)

      if (list.length === 0) {
        setGradeData({})
        setInitialGradeData({})
        setLoading(false)
        return
      }

      const participantIds = list.map((p: any) => p.id)

      // Fetch existing grades
      const { data: grades, error: gErr } = await supabase
        .from('calificaciones')
        .select('*')
        .eq('modulo_id', selectedModule)
        .in('participante_id', participantIds)

      if (gErr) throw gErr

      // Map existing grades or suggest defaults (asistencia is filled manually, default is 0)
      const mappedGrades: Record<string, any> = {}

      list.forEach((p: any) => {
        const existing = grades?.find((g: any) => g.participante_id === p.id)
        if (existing) {
          mappedGrades[p.id] = {
            autoformacion: Number(existing.autoformacion),
            practica_guiada: Number(existing.practica_guiada),
            // asistencia siempre como entero sin decimales
            asistencia: Math.round(Number(existing.asistencia)),
            evaluacion: Number(existing.evaluacion),
          }
        } else {
          mappedGrades[p.id] = {
            autoformacion: 0,
            practica_guiada: 0,
            asistencia: 0,
            evaluacion: 0,
          }
        }
      })

      setGradeData(mappedGrades)
      setInitialGradeData(JSON.parse(JSON.stringify(mappedGrades)))
    } catch (err: any) {
      console.error(err)
      showNotif('error', 'Error al cargar notas', err.message || 'No se pudieron recuperar las notas del servidor.')
    } finally {
      setLoading(false)
    }
  }

  // Load when selections change
  useEffect(() => {
    loadGradesData()
  }, [selectedGroup, selectedModule])

  // Handle value change inside row
  const handleValueChange = (participantId: string, field: 'autoformacion' | 'practica_guiada' | 'asistencia' | 'evaluacion', val: string) => {
    if (val === '') {
      setGradeData(prev => ({
        ...prev,
        [participantId]: {
          ...prev[participantId],
          [field]: '' as any
        }
      }))
      return
    }

    let num = Number(val)
    if (isNaN(num)) num = 0

    // Limit ranges according to prompt rules
    const maxVal = {
      autoformacion: 40,
      practica_guiada: 20,
      asistencia: 10,
      evaluacion: 30
    }[field]

    if (num < 0) num = 0
    if (num > maxVal) num = maxVal

    // Asistencia es siempre entero (sin decimales)
    if (field === 'asistencia') {
      num = Math.round(num)
    }

    setGradeData(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        [field]: num
      }
    }))
  }

  // Save/Upsert Grades
  const saveAllGrades = async () => {
    if (participants.length === 0 || !selectedModule) return
    setSaving(true)

    const payload = Object.entries(gradeData).map(([pId, scores]) => {
      const auto = Number(scores.autoformacion) || 0
      const prac = Number(scores.practica_guiada) || 0
      const asist = Number(scores.asistencia) || 0
      const evalN = Number(scores.evaluacion) || 0
      const total = auto + prac + asist + evalN
      return {
        participante_id: pId,
        modulo_id: selectedModule,
        autoformacion: auto,
        practica_guiada: prac,
        asistencia: asist,
        evaluacion: evalN,
        total: Math.min(100, Math.round(total * 100) / 100)
      }
    })

    const { error } = await supabase
      .from('calificaciones')
      .upsert(payload, { onConflict: 'participante_id,modulo_id' })

    if (error) {
      showNotif('error', 'Error al guardar notas', error.message)
    } else {
      showNotif('success', 'Notas Guardadas', 'Las calificaciones del módulo se han guardado con éxito.')
      setInitialGradeData(JSON.parse(JSON.stringify(gradeData)))
    }
    setSaving(false)
  }

  const copySqlCode = () => {
    const sql = `-- MÓDULO DE CALIFICACIONES (PROFE v2.1)
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

ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on calificaciones" ON public.calificaciones FOR ALL USING (true);

CREATE POLICY "Facilitadores can manage calificaciones of their groups"
ON public.calificaciones FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.facilitador_grupos fg
        JOIN public.inscripciones i ON i.grupo_id = fg.grupo_id
        WHERE fg.profile_id = auth.uid()
        AND i.participante_id = calificaciones.participante_id
    )
);`
    navigator.clipboard.writeText(sql)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 3000)
  }

  // Helper to check deadline status
  const checkModuleDeadline = (fechaFinStr: string) => {
    if (!fechaFinStr) return { isAllowed: true, showWarning: false, daysRemaining: 0, deadlineStr: '' };

    const fechaFin = new Date(fechaFinStr + 'T00:00:00');
    const today = new Date();

    // Set both to midnight to compare only calendar days
    const d1 = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate());
    const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // The deadline is 8 days after fecha_fin (inclusive: day 8 is still allowed)
    const deadlineDate = new Date(fechaFin.getTime() + 11 * 24 * 60 * 60 * 1000);
    const deadlineStr = deadlineDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const daysRemaining = 11 - diffDays;

    if (diffDays > 11) {
      return {
        isAllowed: false,
        showWarning: false,
        daysRemaining: 0,
        deadlineStr
      };
    } else if (diffDays >= 1) {
      return {
        isAllowed: true,
        showWarning: true,
        daysRemaining: Math.max(0, daysRemaining),
        deadlineStr
      };
    } else {
      return {
        isAllowed: true,
        showWarning: false,
        daysRemaining,
        deadlineStr
      };
    }
  };

  const selectedModuleObj = modules.find(m => m.id === selectedModule);

  // Real deadline status
  const realDeadlineStatus = selectedModuleObj
    ? checkModuleDeadline(selectedModuleObj.fecha_fin)
    : { isAllowed: true, showWarning: false, daysRemaining: 0, deadlineStr: '' };

  // Effective deadline status (bypassed for admins)
  const deadlineStatus = userRole === 'administrador'
    ? { isAllowed: true, showWarning: false, daysRemaining: 0, deadlineStr: realDeadlineStatus.deadlineStr }
    : realDeadlineStatus;

  // Calculate statistics for UI
  const totalStudents = participants.length
  let totalPassing = 0
  let averageScore = 0

  if (totalStudents > 0) {
    let sum = 0
    Object.values(gradeData).forEach(g => {
      const tot = (Number(g.autoformacion) || 0) + (Number(g.practica_guiada) || 0) + (Number(g.asistencia) || 0) + (Number(g.evaluacion) || 0)
      sum += tot
      if (tot >= 51) totalPassing++
    })
    averageScore = Math.round((sum / totalStudents) * 10) / 10
  }

  return (
    <div style={{ position: 'relative' }}>

      {/* Dynamic Toast Notification */}
      {notification && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            background: notification.type === 'success' ? 'var(--success-light)' : notification.type === 'error' ? 'var(--danger-light)' : 'var(--primary-light)',
            borderLeft: `5px solid ${notification.type === 'success' ? 'var(--success)' : notification.type === 'error' ? 'var(--danger)' : 'var(--primary)'}`,
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
            color: 'var(--foreground)',
            maxWidth: '350px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <h4 style={{ fontWeight: 800, margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>{notification.title}</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>{notification.text}</p>
        </div>
      )}

      {/* SQL Setup Modal (Resilient fallback for missing Supabase table) */}
      {isTableMissing && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '1rem',
          padding: '2rem',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--danger)',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
                Falta Configuración de Base de Datos
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                La tabla de <strong>calificaciones</strong> aún no está creada en Supabase. Para habilitar este módulo, por favor ejecuta la siguiente sentencia SQL en el <strong>SQL Editor</strong> de tu panel de Supabase.
              </p>
            </div>
          </div>

          <div style={{
            position: 'relative',
            background: '#1e1e2e',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid var(--border)'
          }}>
            <pre style={{
              margin: 0,
              fontSize: '0.8rem',
              color: '#cdd6f4',
              overflowX: 'auto',
              lineHeight: '1.6',
              fontFamily: 'monospace'
            }}>
              {`CREATE TABLE IF NOT EXISTS public.calificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participante_id UUID REFERENCES public.participantes(id) ON DELETE CASCADE,
    modulo_id UUID REFERENCES public.programa_modulos(id) ON DELETE CASCADE,
    autoformacion NUMERIC(5,2) DEFAULT 0 CHECK (autoformacion >= 0 AND autoformacion <= 40),
    practica_guiada NUMERIC(5,2) DEFAULT 0 CHECK (practica_guiada >= 0 AND practica_guiada <= 20),
    asistencia NUMERIC(5,2) DEFAULT 0 CHECK (asistencia >= 0 AND asistencia <= 10),
    evaluacion NUMERIC(5,2) DEFAULT 0 CHECK (evaluacion >= 0 AND evaluacion <= 30),
    total NUMERIC(5,2) DEFAULT 0 CHECK (total >= 0 AND total <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(participante_id, modulo_id)
);`}
            </pre>
            <button
              onClick={copySqlCode}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: 'none',
                padding: '0.4rem 0.75rem',
                borderRadius: '0.4rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'background 0.2s'
              }}
            >
              {copiedSql ? <Check size={14} /> : <Copy size={14} />}
              {copiedSql ? 'Copiado' : 'Copiar SQL'}
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>
            Una vez ejecutado, recarga esta página y el módulo se desbloqueará de inmediato.
          </p>
        </div>
      )}

      {/* Selectors Panel */}
      <div className="card shadow-lg animate-fade-in" style={{ padding: '1.75rem', borderRadius: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>

          {/* Department Selection (For non-facilitadores) */}
          {userRole !== 'facilitador' && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: 'var(--foreground-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                <Building2 size={14} /> Departamento
              </label>
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value)
                  setSelectedGroup('')
                }}
                disabled={!!userDeptId}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', outline: 'none', fontWeight: 600 }}
              >
                <option value="">Selecciona un departamento</option>
                {departamentos.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Group Selection */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: 'var(--foreground-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
              <Users size={14} /> Grupo Académico
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', outline: 'none', fontWeight: 600 }}
            >
              {userRole !== 'facilitador' && <option value="">Selecciona un grupo</option>}
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name} {g.departamentos?.name ? `(${g.departamentos.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Program Selection */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: 'var(--foreground-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
              <GraduationCap size={14} /> Programa
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => {
                setSelectedProgram(e.target.value)
                setSelectedModule('')
              }}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', outline: 'none', fontWeight: 600 }}
            >
              {programs.map((p: any) => (
                <option key={p.id} value={p.id}>{p.titulo}</option>
              ))}
            </select>
          </div>

          {/* Module Selection */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: 'var(--foreground-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
              <ChevronRight size={14} /> Módulo del Programa
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', outline: 'none', fontWeight: 600 }}
            >
              {modules.length === 0 && <option value="">No hay módulos</option>}
              {modules.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.grupo === 1 ? 'LENGUAJE - ' : m.grupo === 2 ? 'MATEMATICA - ' : ''}{m.titulo_modulo}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Deadline Banners */}
      {userRole === 'administrador' && selectedGroup && selectedModule && !isTableMissing && (!realDeadlineStatus.isAllowed || realDeadlineStatus.showWarning) && (
        <div className="animate-fade-in" style={{
          padding: '1.25rem 1.75rem',
          borderRadius: '1rem',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          display: 'flex',
          gap: '1.25rem',
          alignItems: 'center',
          marginBottom: '2rem',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
            padding: '0.75rem',
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Info size={24} />
          </div>
          <div>
            <h4 style={{ fontWeight: 900, color: 'var(--foreground)', fontSize: '0.95rem', margin: '0 0 0.25rem 0' }}>
              Modo Administrador: Plazo Ampliado
            </h4>
            <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--muted)', lineHeight: '1.5' }}>
              El plazo oficial de gracia para subir calificaciones de este módulo {!realDeadlineStatus.isAllowed ? 'venció' : 'vence'} el <strong>{realDeadlineStatus.deadlineStr}</strong>. Al tener rol de administrador, puedes registrar y editar las calificaciones sin restricciones de fecha.
            </p>
          </div>
        </div>
      )}
      {selectedGroup && selectedModule && !isTableMissing && deadlineStatus.showWarning && (
        <div className="animate-fade-in" style={{
          padding: '1.25rem 1.75rem',
          borderRadius: '1rem',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          display: 'flex',
          gap: '1.25rem',
          alignItems: 'center',
          marginBottom: '2rem',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#d97706',
            padding: '0.75rem',
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 style={{ fontWeight: 900, color: 'var(--foreground)', fontSize: '0.95rem', margin: '0 0 0.25rem 0' }}>
              Plazo de Calificaciones Próximo a Vencer
            </h4>
            <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--muted)', lineHeight: '1.5' }}>
              El plazo límite de gracia para subir o editar calificaciones de este módulo vence el <strong>{deadlineStatus.deadlineStr}</strong>. Quedan <strong>{deadlineStatus.daysRemaining} días</strong> para finalizar el registro.
            </p>
          </div>
        </div>
      )}

      {selectedGroup && selectedModule && !isTableMissing && !deadlineStatus.isAllowed && (
        <div className="animate-fade-in" style={{
          padding: '1.25rem 1.75rem',
          borderRadius: '1rem',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'flex',
          gap: '1.25rem',
          alignItems: 'center',
          marginBottom: '2rem',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--danger)',
            padding: '0.75rem',
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <X size={24} />
          </div>
          <div>
            <h4 style={{ fontWeight: 900, color: 'var(--foreground)', fontSize: '0.95rem', margin: '0 0 0.25rem 0' }}>
              Plazo de Registro Vencido
            </h4>
            <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--muted)', lineHeight: '1.5' }}>
              El plazo límite de gracia para este módulo venció el <strong>{deadlineStatus.deadlineStr}</strong>. El registro y edición de calificaciones están deshabilitados. Por favor, póngase en contacto con el administrador del departamento para cualquier consulta.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid View */}
      {selectedGroup && selectedModule && !isTableMissing && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>

          {/* Main Grade Card Table */}
          <div className="card shadow-lg" style={{ borderRadius: '1.25rem', overflow: 'hidden', padding: 0 }}>
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(90deg, rgba(var(--primary-rgb), 0.05) 0%, transparent 100%)'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--foreground)' }}>Calificaciones Modulares</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.1rem 0 0 0' }}>
                  Escala de evaluación sobre 100 puntos oficiales.
                </p>
              </div>

              {isDirty && (
                <span className="animate-fade-in" style={{
                  fontSize: '0.75rem',
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: 'var(--warning)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '99px',
                  fontWeight: 800
                }}>
                  Cambios sin guardar
                </span>
              )}
            </div>

            {/* Warning callout for Asistencia */}
            {!loading && participants.length > 0 && (
              <div className="animate-fade-in" style={{
                margin: '1.25rem 1.75rem 0 1.75rem',
                padding: '0.85rem 1.25rem',
                borderRadius: '0.75rem',
                background: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <Info size={18} color="#c26f10ff" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                <div>
                  <strong style={{ color: '#d97706', fontSize: '0.8rem', display: 'block', marginBottom: '0.15rem' }}>
                    Nota Aclaratoria de Asistencia:
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--foreground-3)', lineHeight: 1.45 }}>
                    La nota ingresada en la columna de <strong>Asist. (10)</strong> debe ser digitada manualmente tomando como referencia obligatoria los datos y porcentajes reportados en el <strong>PDF de Asistencia</strong> del respectivo módulo académico.
                  </p>
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700 }}>Cargando participantes y notas...</span>
              </div>
            ) : participants.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
                <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <h4 style={{ fontWeight: 800, color: 'var(--foreground)' }}>No hay participantes</h4>
                <p style={{ fontSize: '0.85rem', maxWidth: '300px', margin: '0.5rem auto' }}>
                  No se encontraron estudiantes activos para este grupo y programa.
                </p>
              </div>
            ) : (
              <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr style={{ background: 'transparent' }}>
                      <th>Participante</th>
                      <th style={{ textAlign: 'center', width: '90px' }}>Autoform. (40)</th>
                      <th style={{ textAlign: 'center', width: '90px' }}>Prácticas (20)</th>
                      <th style={{ textAlign: 'center', width: '90px', background: 'rgba(245, 158, 11, 0.08)', color: '#b45309', borderBottom: '2px solid rgba(245, 158, 11, 0.25)' }}>Asist. (10)</th>
                      <th style={{ textAlign: 'center', width: '90px' }}>Evaluac. (30)</th>
                      <th style={{ textAlign: 'center', width: '100px' }}>Total (100)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => {
                      const scores = gradeData[p.id] || { autoformacion: 0, practica_guiada: 0, asistencia: 0, evaluacion: 0 }
                      const total = (Number(scores.autoformacion) || 0) + (Number(scores.practica_guiada) || 0) + (Number(scores.asistencia) || 0) + (Number(scores.evaluacion) || 0)
                      const isPassing = total >= 51

                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 800, color: 'var(--foreground)' }}>{p.apellido}, {p.nombre}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                              <span>CI: {p.ci}</span>
                            </div>
                          </td>

                          {/* Autoformacion 40 */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max="40"
                              step="0.5"
                              value={scores.autoformacion ?? ''}
                              onChange={(e) => handleValueChange(p.id, 'autoformacion', e.target.value)}
                              placeholder="0"
                              disabled={!deadlineStatus.isAllowed}
                              style={{
                                width: '68px',
                                padding: '0.4rem',
                                borderRadius: '0.4rem',
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                color: 'var(--foreground)',
                                textAlign: 'center',
                                fontWeight: 700,
                                outline: 'none',
                                opacity: deadlineStatus.isAllowed ? 1 : 0.6,
                                cursor: deadlineStatus.isAllowed ? 'text' : 'not-allowed'
                              }}
                            />
                          </td>

                          {/* Practicas 20 */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              value={scores.practica_guiada ?? ''}
                              onChange={(e) => handleValueChange(p.id, 'practica_guiada', e.target.value)}
                              placeholder="0"
                              disabled={!deadlineStatus.isAllowed}
                              style={{
                                width: '68px',
                                padding: '0.4rem',
                                borderRadius: '0.4rem',
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                color: 'var(--foreground)',
                                textAlign: 'center',
                                fontWeight: 700,
                                outline: 'none',
                                opacity: deadlineStatus.isAllowed ? 1 : 0.6,
                                cursor: deadlineStatus.isAllowed ? 'text' : 'not-allowed'
                              }}
                            />
                          </td>

                          {/* Asistencia 10 - Solo enteros, ingresada manualmente */}
                          <td style={{ textAlign: 'center', background: 'rgba(245, 158, 11, 0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="1"
                                value={scores.asistencia ?? ''}
                                onChange={(e) => handleValueChange(p.id, 'asistencia', e.target.value)}
                                onBlur={(e) => handleValueChange(p.id, 'asistencia', e.target.value)}
                                placeholder="0"
                                disabled={!deadlineStatus.isAllowed}
                                style={{
                                  width: '68px',
                                  padding: '0.4rem',
                                  borderRadius: '0.4rem',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  background: 'var(--surface)',
                                  color: 'var(--foreground)',
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  outline: 'none',
                                  opacity: deadlineStatus.isAllowed ? 1 : 0.6,
                                  cursor: deadlineStatus.isAllowed ? 'text' : 'not-allowed'
                                }}
                              />
                            </div>
                          </td>

                          {/* Evaluacion 30 */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max="30"
                              step="0.5"
                              value={scores.evaluacion ?? ''}
                              onChange={(e) => handleValueChange(p.id, 'evaluacion', e.target.value)}
                              placeholder="0"
                              disabled={!deadlineStatus.isAllowed}
                              style={{
                                width: '68px',
                                padding: '0.4rem',
                                borderRadius: '0.4rem',
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                color: 'var(--foreground)',
                                textAlign: 'center',
                                fontWeight: 700,
                                outline: 'none',
                                opacity: deadlineStatus.isAllowed ? 1 : 0.6,
                                cursor: deadlineStatus.isAllowed ? 'text' : 'not-allowed'
                              }}
                            />
                          </td>

                          {/* Total 100 */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '60px',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '0.5rem',
                              fontWeight: 900,
                              fontSize: '0.95rem',
                              background: isPassing ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: isPassing ? '#10b981' : 'var(--danger)',
                              border: `1px solid ${isPassing ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                            }}>
                              {Math.round(total * 10) / 10}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {participants.length > 0 && (
              <div style={{
                padding: '1.25rem 1.75rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--surface)'
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>
                  Nota de aprobación: <strong>51 puntos</strong> o más.
                </span>

                <button
                  className="btn btn-primary"
                  onClick={() => setShowSaveConfirmModal(true)}
                  disabled={saving || loading || !deadlineStatus.isAllowed}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.75rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    opacity: deadlineStatus.isAllowed ? 1 : 0.5,
                    cursor: deadlineStatus.isAllowed ? 'pointer' : 'not-allowed'
                  }}
                >
                  <Save size={16} />
                  {saving ? 'Guardando...' : 'Guardar Calificaciones'}
                </button>
              </div>
            )}
          </div>

          {/* Right Statistics Summary panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Stat Box: Summary */}
            <div className="card shadow-lg" style={{ borderRadius: '1.25rem', padding: '1.5rem' }}>
              <h4 style={{ fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-3)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calculator size={15} /> Estadísticas del Módulo
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700 }}>PROMEDIO DEL GRUPO</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                    <span style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--primary)' }}>
                      {averageScore}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 800 }}>/ 100</span>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.25rem 0' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700 }}>APROBADOS</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10b981' }}>
                      {totalPassing}
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700, marginLeft: '0.2rem' }}>
                        ({totalStudents > 0 ? Math.round((totalPassing / totalStudents) * 100) : 0}%)
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700 }}>REPROBADOS</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--danger)' }}>
                      {totalStudents - totalPassing}
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700, marginLeft: '0.2rem' }}>
                        ({totalStudents > 0 ? Math.round(((totalStudents - totalPassing) / totalStudents) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Rules card */}
            <div className="card shadow-lg" style={{ borderRadius: '1.25rem', padding: '1.5rem', background: 'linear-gradient(180deg, rgba(var(--primary-rgb), 0.02) 0%, transparent 100%)' }}>
              <h4 style={{ fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-3)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Info size={15} /> Reglas de Calificación
              </h4>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: '1.5' }}>
                <li><strong>Autoformación (40 pt max)</strong>: Tareas, investigaciones y aprendizaje autónomo.</li>
                <li><strong>Prácticas Guiadas (20 pt max)</strong>: Proyectos guiados y trabajo práctico.</li>
                <li style={{ padding: '0.35rem 0.5rem', borderRadius: '0.4rem', background: 'rgba(245, 158, 11, 0.08)', color: '#b45309' }}>
                  <strong>Asistencia (10 pt max)</strong>: Registro manual de la nota de asistencia obtenida del reporte de <strong>Asistencia PDF</strong>.
                </li>
                <li><strong>Evaluación (30 pt max)</strong>: Cuestionario o prueba final modular.</li>
                <li><strong>Aprobación (51 pt o más)</strong>: Requisito de suficiencia.</li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* Select instructions */}
      {(!selectedGroup || !selectedModule) && !isTableMissing && (
        <div className="animate-fade-in" style={{
          textAlign: 'center',
          padding: '5rem 2rem',
          background: 'linear-gradient(180deg, rgba(var(--primary-rgb), 0.02) 0%, transparent 100%)',
          borderRadius: '1.25rem',
          border: '1px dashed var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          marginTop: '1rem'
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '1.25rem',
            background: 'rgba(var(--primary-rgb), 0.1)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(var(--primary-rgb), 0.1)'
          }}>
            <Calculator size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--foreground)', marginBottom: '0.5rem' }}>
              Registro de Calificaciones Modulares
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto', lineHeight: '1.6' }}>
              Selecciona un **Grupo Académico**, **Programa** y **Módulo** en el panel superior para cargar la planilla de participantes y registrar sus notas sobre 100 puntos.
            </p>
          </div>
        </div>
      )}

      {/* Save Confirmation Modal */}
      {showSaveConfirmModal && typeof window !== 'undefined' && document.body && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(3, 4, 11, 0.75)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1.5rem'
        }}>
          <div style={{
            position: 'relative',
            width: '460px',
            maxWidth: '100%',
            padding: '2.5rem 2rem 2.2rem 2rem',
            borderRadius: '1.25rem',
            border: '1px solid var(--border-strong)',
            background: 'var(--card-solid)',
            boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.2rem',
            animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowSaveConfirmModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--foreground-3)',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--foreground)';
                e.currentTarget.style.background = 'var(--surface-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--foreground-3)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <X size={18} />
            </button>

            {/* Warning Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(187, 151, 58, 0.12)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AlertTriangle size={32} />
            </div>

            {/* Title / Header */}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--foreground)', marginBottom: '0.6rem' }}>
                ¿Confirmar Registro de Calificaciones?
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--foreground-2)', lineHeight: '1.5', margin: '0' }}>
                ¿Está seguro de haber completado correctamente las calificaciones de este módulo? Recuerde que la nota de asistencia se debe haber copiado del reporte PDF de asistencia.
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              <button
                onClick={() => setShowSaveConfirmModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border-strong)',
                  cursor: 'pointer',
                  background: 'var(--surface)',
                  color: 'var(--foreground-2)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-hover)';
                  e.currentTarget.style.color = 'var(--foreground)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--surface)';
                  e.currentTarget.style.color = 'var(--foreground-2)';
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowSaveConfirmModal(false)
                  saveAllGrades()
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  borderRadius: '0.75rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'var(--primary)',
                  color: 'white',
                  boxShadow: '0 4px 12px var(--primary-glow)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px var(--primary-glow)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px var(--primary-glow)';
                }}
              >
                Sí, Guardar Notas
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
