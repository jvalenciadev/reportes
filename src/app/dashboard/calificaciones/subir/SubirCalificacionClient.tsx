'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Building2, Users, GraduationCap, ChevronRight, Save,
  Database, Info, AlertTriangle, CheckCircle, Calculator, Copy, Check
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
      setModules(data || [])
      if (data && data.length > 0) {
        setSelectedModule(data[0].id)
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

            {loading ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700 }}>Cargando participantes y notas...</span>
              </div>
            ) : participants.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
                <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <h4 style={{ fontWeight: 800, color: 'var(--foreground)' }}>No hay participantes</h4>
                <p style={{ fontSize: '0.85rem', maxWidth: '300px', margin: '0.5rem auto' }}>
                  No se encontraron estudiantes inscritos para este grupo y programa.
                </p>
              </div>
            ) : (
              <>
                <div className="animate-fade-in" style={{
                  margin: '1rem 1.5rem',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px dashed rgba(59, 130, 246, 0.4)',
                  color: 'var(--primary)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  boxShadow: '0 2px 5px rgba(59, 130, 246, 0.05)'
                }}>
                  <Info size={18} style={{ flexShrink: 0, color: 'var(--primary)' }} />
                  <span><strong>Importante:</strong> La asistencia tiene que llenar del pdf asistencia.</span>
                </div>

                <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                  <table>
                    <thead>
                      <tr style={{ background: 'transparent' }}>
                        <th>Participante</th>
                        <th style={{ textAlign: 'center', width: '90px' }}>Autoform. (40)</th>
                        <th style={{ textAlign: 'center', width: '90px' }}>Prácticas (20)</th>
                        <th style={{
                          textAlign: 'center',
                          width: '110px',
                          background: 'rgba(var(--primary-rgb), 0.15)',
                          color: 'var(--primary)',
                          borderLeft: '1px solid rgba(var(--primary-rgb), 0.25)',
                          borderRight: '1px solid rgba(var(--primary-rgb), 0.25)',
                          fontWeight: 900
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem' }}>
                            <span>Asist. (10)</span>
                            <span style={{ fontSize: '0.55rem', opacity: 0.85, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Llenar del PDF</span>
                          </div>
                        </th>
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
                                style={{
                                  width: '68px',
                                  padding: '0.4rem',
                                  borderRadius: '0.4rem',
                                  border: '1px solid var(--border)',
                                  background: 'var(--surface)',
                                  color: 'var(--foreground)',
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  outline: 'none'
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
                                style={{
                                  width: '68px',
                                  padding: '0.4rem',
                                  borderRadius: '0.4rem',
                                  border: '1px solid var(--border)',
                                  background: 'var(--surface)',
                                  color: 'var(--foreground)',
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  outline: 'none'
                                }}
                              />
                            </td>

                            {/* Asistencia 10 - Solo enteros, ingresada manualmente */}
                            <td style={{
                              textAlign: 'center',
                              background: 'rgba(var(--primary-rgb), 0.05)',
                              borderLeft: '1px solid rgba(var(--primary-rgb), 0.1)',
                              borderRight: '1px solid rgba(var(--primary-rgb), 0.1)'
                            }}>
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
                                  style={{
                                    width: '68px',
                                    padding: '0.4rem',
                                    borderRadius: '0.4rem',
                                    border: '1.5px solid rgba(var(--primary-rgb), 0.4)',
                                    background: 'var(--surface)',
                                    color: 'var(--primary)',
                                    textAlign: 'center',
                                    fontWeight: 800,
                                    outline: 'none',
                                    boxShadow: '0 0 4px rgba(var(--primary-rgb), 0.1)'
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
                                style={{
                                  width: '68px',
                                  padding: '0.4rem',
                                  borderRadius: '0.4rem',
                                  border: '1px solid var(--border)',
                                  background: 'var(--surface)',
                                  color: 'var(--foreground)',
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  outline: 'none'
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
              </>
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
                  onClick={saveAllGrades}
                  disabled={saving || loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.75rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem'
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
                <li><strong>Asistencia (10 pt max)</strong>: Registro manual de la nota de asistencia del participante (0 a 10 puntos).</li>
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

    </div>
  )
}
