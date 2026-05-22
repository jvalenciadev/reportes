'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  GraduationCap, Search, User, Calendar, Award, FileText, 
  CheckCircle2, Clock, XCircle, AlertCircle, ArrowLeft, BookOpen,
  Layers, BadgeCheck, Check, HelpCircle
} from 'lucide-react'
import Link from 'next/link'

export default function ConsultaClient() {
  const supabase = createClient()
  const [ci, setCi] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [participant, setParticipant] = useState<any | null>(null)
  
  // Structured academic data
  const [academicData, setAcademicData] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ci.trim()) return

    setLoading(true)
    setErrorMsg('')
    setSearched(true)
    setParticipant(null)
    setAcademicData([])

    try {
      // 1. Fetch Participant by CI
      const { data: partData, error: partError } = await supabase
        .from('participantes')
        .select('*')
        .eq('ci', ci.trim())
        .maybeSingle()

      if (partError) throw partError

      if (!partData) {
        setLoading(false)
        return
      }

      setParticipant(partData)

      // 2. Fetch Enrollments (Inscripciones)
      const { data: inscData, error: inscError } = await supabase
        .from('inscripciones')
        .select(`
          id,
          grupo_id,
          programa_id,
          estado,
          grupos (
            name
          ),
          programas (
            id,
            titulo
          )
        `)
        .eq('participante_id', partData.id)

      if (inscError) throw inscError

      if (!inscData || inscData.length === 0) {
        setAcademicData([])
        setLoading(false)
        return
      }

      // 3. Fetch Grades (Calificaciones)
      const { data: califData, error: califError } = await supabase
        .from('calificaciones')
        .select('*')
        .eq('participante_id', partData.id)

      if (califError) throw califError

      // 4. Fetch Attendances (Asistencias)
      const { data: asistData, error: asistError } = await supabase
        .from('asistencias')
        .select('*')
        .eq('participante_id', partData.id)
        .order('dia', { ascending: true })

      if (asistError) throw asistError

      // 5. Fetch Modules for enrolled programs to ensure we show modules that might not have grades yet
      const programIds = inscData.map((i: any) => i.programa_id)
      const { data: modulesData, error: modulesError } = await supabase
        .from('programa_modulos')
        .select('*')
        .in('programa_id', programIds)
        .order('grupo', { ascending: true })
        .order('orden', { ascending: true })

      if (modulesError) throw modulesError

      // 6. Build a beautiful consolidated academic structure
      const consolidated = inscData.map((insc: any) => {
        const prog = insc.programas
        const groupName = insc.grupos?.name || 'Sin Grupo'
        
        // Find modules belonging to this program
        const progModules = modulesData?.filter((m: any) => m.programa_id === prog.id) || []
        
        const modulesWithData = progModules.map((mod: any) => {
          // Find grade registered for this module
          const grade = califData?.find((g: any) => g.modulo_id === mod.id)
          
          // Filter attendances for this module
          const moduleAsists = asistData?.filter((a: any) => a.modulo_id === mod.id) || []
          
          // Compute attendance stats
          const totalSessions = moduleAsists.length
          const countAsistio = moduleAsists.filter((a: any) => a.estado === 'asistio').length
          const countAtraso = moduleAsists.filter((a: any) => a.estado === 'atraso').length
          const countFalta = moduleAsists.filter((a: any) => a.estado === 'falta').length
          const countPermiso = moduleAsists.filter((a: any) => a.estado === 'permiso').length
          
          // Calculate net score for attendance based on official academic logic:
          // - Asistió: 100% (1.0)
          // - Permiso: 100% (1.0)
          // - Atraso (Tarde): 80% (0.8)
          // - Falta: 0% (0.0)
          let attendancePercentage = 0
          let calculatedAsistenciaPoints = 0
          if (totalSessions > 0) {
            const scoreSum = (countAsistio * 1.0) + (countPermiso * 1.0) + (countAtraso * 0.8) + (countFalta * 0.0)
            attendancePercentage = Math.round((scoreSum / totalSessions) * 100)
            calculatedAsistenciaPoints = Math.round((scoreSum / totalSessions) * 10)
          }

          return {
            id: mod.id,
            titulo: (mod.grupo === 1 ? 'LENGUAJE - ' : mod.grupo === 2 ? 'MATEMATICA - ' : '') + mod.titulo_modulo,
            grade: grade ? {
              autoformacion: grade.autoformacion,
              practica_guiada: grade.practica_guiada,
              asistencia: Math.round(Number(grade.asistencia)),
              evaluacion: grade.evaluacion,
              total: grade.total,
              hasGrade: true
            } : {
              autoformacion: 0,
              practica_guiada: 0,
              asistencia: calculatedAsistenciaPoints,
              evaluacion: 0,
              total: 0,
              hasGrade: false
            },
            asistenciaStats: {
              totalSessions,
              countAsistio,
              countAtraso,
              countFalta,
              countPermiso,
              attendancePercentage,
              records: moduleAsists
            }
          }
        })

        return {
          programId: prog.id,
          programTitle: prog.titulo,
          groupName,
          status: insc.estado,
          modules: modulesWithData
        }
      })

      setAcademicData(consolidated)

    } catch (err: any) {
      console.error(err)
      setErrorMsg('Ocurrió un error al consultar los datos. Por favor, intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%)',
      color: '#f8fafc',
      padding: '2.5rem 1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Glow Elements */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '45%',
        height: '45%',
        background: 'radial-gradient(circle, rgba(187, 151, 58, 0.15) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '45%',
        height: '45%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none'
      }} />

      {/* Main Container */}
      <div style={{ maxWidth: '960px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* Navigation / Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              background: 'linear-gradient(135deg, #bb973a 0%, #d4af37 100%)',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(187, 151, 58, 0.3)'
            }}>
              <GraduationCap size={22} color="white" />
            </div>
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>PROFE</span>
              <span style={{ fontSize: '0.6rem', display: 'block', color: '#bb973a', fontWeight: 800, letterSpacing: '0.1em' }}>MINISTERIO DE EDUCACIÓN</span>
            </div>
          </div>

          <Link href="/login" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#94a3b8',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.75rem',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            background: 'rgba(30, 41, 59, 0.4)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease'
          }}>
            <ArrowLeft size={14} /> Acceso Administrativo
          </Link>
        </div>

        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '-0.03em', color: '#fff' }}>
            Portal de Consulta <span style={{ color: '#bb973a' }}>Académica</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.6 }}>
            Acceda de forma transparente a su registro de asistencia y calificaciones ingresando únicamente su Cédula de Identidad (C.I.).
          </p>
        </div>

        {/* Search Panel Card */}
        <div className="glass" style={{
          padding: '2rem',
          borderRadius: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(30, 41, 59, 0.3)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          marginBottom: '3rem'
        }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Ingrese su Cédula de Identidad (ej. 12773116)"
                value={ci}
                onChange={(e) => setCi(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1.1rem 1.1rem 1.1rem 3.2rem',
                  borderRadius: '1rem',
                  border: '1px solid rgba(187, 151, 58, 0.25)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
                  transition: 'all 0.2s ease'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0 2.2rem',
                height: '56px',
                borderRadius: '1rem',
                background: 'linear-gradient(135deg, #bb973a 0%, #a17f2c 100%)',
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 10px 20px -5px rgba(187, 151, 58, 0.4)',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Consultando...' : 'Consultar Notas'}
            </button>
          </form>

          {errorMsg && (
            <div style={{
              marginTop: '1rem',
              padding: '0.8rem 1.2rem',
              borderRadius: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem'
            }}>
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}
        </div>

        {/* Results Presentation */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div className="animate-spin" style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(187, 151, 58, 0.1)',
              borderTopColor: '#bb973a',
              borderRadius: '50%',
              margin: '0 auto 1.5rem'
            }} />
            <p style={{ color: '#94a3b8', fontWeight: 600 }}>Buscando su historial académico oficial...</p>
          </div>
        )}

        {searched && !loading && !participant && (
          <div className="glass animate-fade-in" style={{
            textAlign: 'center',
            padding: '3.5rem 2rem',
            borderRadius: '1.5rem',
            background: 'rgba(30, 41, 59, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(239, 68, 68, 0.08)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              border: '1px solid rgba(239, 68, 68, 0.25)'
            }}>
              <AlertCircle size={28} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>C.I. No Encontrado</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto', lineHeight: 1.6 }}>
              No se ha encontrado ningún participante registrado con el C.I. <strong style={{ color: '#fff' }}>"{ci}"</strong>. Por favor, asegúrese de escribir el número correctamente sin espacios ni letras adicionales.
            </p>
          </div>
        )}

        {/* Student Active Info Panel */}
        {searched && !loading && participant && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* Student Header Card */}
            <div style={{
              padding: '1.75rem 2rem',
              borderRadius: '1.5rem',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(187, 151, 58, 0.2)',
              boxShadow: '0 15px 30px rgba(0,0,0,0.3)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.5rem',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(187, 151, 58, 0.1)',
                  border: '1px solid rgba(187, 151, 58, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={26} color="#bb973a" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
                    {participant.apellido.toUpperCase()}, {participant.nombre.toUpperCase()}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>C.I. <strong style={{ color: '#f1f5f9' }}>{participant.ci}</strong></span>
                    {participant.celular && (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Celular: <strong style={{ color: '#f1f5f9' }}>{participant.celular}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(187, 151, 58, 0.1)',
                border: '1px solid rgba(187, 151, 58, 0.3)',
                padding: '0.4rem 1.2rem',
                borderRadius: '2rem',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#bb973a',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                PARTICIPANTE ACTIVO
              </div>
            </div>

            {/* If no enrollments registered */}
            {academicData.length === 0 && (
              <div className="glass" style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                borderRadius: '1.5rem',
                background: 'rgba(30, 41, 59, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <HelpCircle size={36} color="#64748b" style={{ marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>Sin Inscripciones Activas</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Aún no se ha registrado ninguna inscripción oficial en ningún programa académico para este participante.</p>
              </div>
            )}

            {/* List Programs Enrolled */}
            {academicData.map((prog: any) => (
              <div key={prog.programId} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Program Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '2px solid rgba(187, 151, 58, 0.2)', paddingBottom: '0.5rem' }}>
                  <Layers size={18} color="#bb973a" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#bb973a', textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>
                    {prog.programTitle}
                  </h3>
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#94a3b8',
                    background: 'rgba(30, 41, 59, 0.6)',
                    padding: '0.2rem 0.8rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    Grupo: {prog.groupName}
                  </span>
                </div>

                {/* Modules Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {prog.modules.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>No se han definido módulos para este programa académico.</p>
                  ) : (
                    prog.modules.map((mod: any) => (
                      <div key={mod.id} className="glass" style={{
                        background: 'rgba(30, 41, 59, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '1.25rem',
                        overflow: 'hidden',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
                      }}>
                        
                        {/* Module header */}
                        <div style={{
                          background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
                          padding: '1.25rem 1.5rem',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '1rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '0.5rem',
                              background: 'rgba(187, 151, 58, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid rgba(187, 151, 58, 0.2)'
                            }}>
                              <BookOpen size={16} color="#bb973a" />
                            </div>
                            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                              {mod.titulo}
                            </h4>
                          </div>

                          {/* Pass/Fail Badges */}
                          {mod.grade.hasGrade ? (
                            <div style={{
                              background: mod.grade.total >= 51 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              border: mod.grade.total >= 51 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                              color: mod.grade.total >= 51 ? '#34d399' : '#f87171',
                              padding: '0.3rem 0.9rem',
                              borderRadius: '2rem',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}>
                              {mod.grade.total >= 51 ? <BadgeCheck size={14} /> : <AlertCircle size={14} />}
                              {mod.grade.total >= 51 ? 'APROBADO' : 'REPROBADO'}
                            </div>
                          ) : (
                            <span style={{
                              background: 'rgba(148, 163, 184, 0.08)',
                              border: '1px solid rgba(148, 163, 184, 0.15)',
                              color: '#94a3b8',
                              padding: '0.3rem 0.9rem',
                              borderRadius: '2rem',
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}>
                              SIN REGISTRO FINAL
                            </span>
                          )}
                        </div>

                        {/* Module Body containing Grades & Attendance split */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1px', background: 'rgba(255, 255, 255, 0.06)' }}>
                          
                          {/* Grades breakdown column */}
                          <div style={{ padding: '1.5rem', background: 'rgba(30, 41, 59, 0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                              <Award size={16} color="#bb973a" />
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Calificaciones Consolidadas
                              </span>
                            </div>

                            {mod.grade.hasGrade ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Autoformación:</span>
                                  <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{mod.grade.autoformacion} <span style={{ color: '#64748b', fontSize: '0.7rem' }}>/ 40 pts</span></strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Prácticas Guiadas:</span>
                                  <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{mod.grade.practica_guiada} <span style={{ color: '#64748b', fontSize: '0.7rem' }}>/ 20 pts</span></strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Asistencia Modular:</span>
                                  <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{mod.grade.asistencia} <span style={{ color: '#64748b', fontSize: '0.7rem' }}>/ 10 pts</span></strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Evaluación de Módulo:</span>
                                  <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{mod.grade.evaluacion} <span style={{ color: '#64748b', fontSize: '0.7rem' }}>/ 30 pts</span></strong>
                                </div>

                                <div style={{
                                  marginTop: '0.5rem',
                                  padding: '0.8rem 1rem',
                                  borderRadius: '0.75rem',
                                  background: mod.grade.total >= 51 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                  border: mod.grade.total >= 51 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f1f5f9' }}>NOTA TOTAL:</span>
                                  <span style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 950,
                                    color: mod.grade.total >= 51 ? '#34d399' : '#f87171'
                                  }}>
                                    {mod.grade.total} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>/ 100</span>
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '170px',
                                background: 'rgba(0,0,0,0.1)',
                                borderRadius: '0.75rem',
                                border: '1px dashed rgba(255,255,255,0.05)',
                                padding: '1rem',
                                textAlign: 'center'
                              }}>
                                <FileText size={24} color="#64748b" style={{ marginBottom: '0.5rem' }} />
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Sin Calificaciones Oficiales</span>
                                <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.25rem' }}>El facilitador aún no ha publicado el registro consolidado final de este módulo.</span>
                              </div>
                            )}
                          </div>

                          {/* Attendance control column */}
                          <div style={{ padding: '1.5rem', background: 'rgba(30, 41, 59, 0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={16} color="#64748b" />
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Control de Asistencia
                                </span>
                              </div>
                              {mod.asistenciaStats.totalSessions > 0 && (
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  color: mod.asistenciaStats.attendancePercentage >= 80 ? '#34d399' : '#f87171',
                                  background: mod.asistenciaStats.attendancePercentage >= 80 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '0.35rem'
                                }}>
                                  {mod.asistenciaStats.attendancePercentage}% Asistencia
                                </span>
                              )}
                            </div>

                            {mod.asistenciaStats.totalSessions > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                
                                {/* Micro Grid Stats */}
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(4, 1fr)',
                                  gap: '0.4rem',
                                  background: 'rgba(0,0,0,0.15)',
                                  padding: '0.5rem',
                                  borderRadius: '0.5rem',
                                  textAlign: 'center'
                                }}>
                                  <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#34d399' }}>{mod.asistenciaStats.countAsistio}</div>
                                    <div style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 700 }}>ASISTIÓ</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#fbbf24' }}>{mod.asistenciaStats.countAtraso}</div>
                                    <div style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 700 }}>ATRASOS</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#f87171' }}>{mod.asistenciaStats.countFalta}</div>
                                    <div style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 700 }}>FALTAS</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#60a5fa' }}>{mod.asistenciaStats.countPermiso}</div>
                                    <div style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 700 }}>PERMISOS</div>
                                  </div>
                                </div>

                                {/* Sessions Timeline list */}
                                <div style={{
                                  maxHeight: '120px',
                                  overflowY: 'auto',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.4rem',
                                  paddingRight: '0.2rem'
                                }}>
                                  {mod.asistenciaStats.records.map((rec: any) => {
                                    let pillColor = 'rgba(16, 185, 129, 0.1)'
                                    let pillBorder = 'rgba(16, 185, 129, 0.25)'
                                    let textColor = '#34d399'
                                    let labelText = 'Asistió'
                                    let icon = <CheckCircle2 size={12} />

                                    if (rec.estado === 'atraso') {
                                      pillColor = 'rgba(251, 191, 36, 0.1)'
                                      pillBorder = 'rgba(251, 191, 36, 0.25)'
                                      textColor = '#fbbf24'
                                      labelText = 'Atraso'
                                      icon = <Clock size={12} />
                                    } else if (rec.estado === 'falta') {
                                      pillColor = 'rgba(239, 68, 68, 0.1)'
                                      pillBorder = 'rgba(239, 68, 68, 0.25)'
                                      textColor = '#f87171'
                                      labelText = 'Falta'
                                      icon = <XCircle size={12} />
                                    } else if (rec.estado === 'permiso') {
                                      pillColor = 'rgba(96, 165, 250, 0.1)'
                                      pillBorder = 'rgba(96, 165, 250, 0.25)'
                                      textColor = '#60a5fa'
                                      labelText = 'Permiso'
                                      icon = <Calendar size={12} />
                                    }

                                    return (
                                      <div key={rec.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.35rem 0.6rem',
                                        borderRadius: '0.5rem',
                                        background: 'rgba(0,0,0,0.1)',
                                        border: '1px solid rgba(255,255,255,0.02)'
                                      }}>
                                        <span style={{ fontSize: '0.75rem', color: '#f1f5f9', fontWeight: 600 }}>
                                          Día {rec.dia} <span style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 500 }}>({new Date(rec.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })})</span>
                                        </span>
                                        
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.3rem',
                                          background: pillColor,
                                          border: `1px solid ${pillBorder}`,
                                          color: textColor,
                                          fontSize: '0.65rem',
                                          fontWeight: 800,
                                          padding: '0.15rem 0.5rem',
                                          borderRadius: '0.25rem'
                                        }}>
                                          {icon}
                                          {labelText}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '170px',
                                background: 'rgba(0,0,0,0.1)',
                                borderRadius: '0.75rem',
                                border: '1px dashed rgba(255,255,255,0.05)',
                                padding: '1rem',
                                textAlign: 'center'
                              }}>
                                <Clock size={24} color="#64748b" style={{ marginBottom: '0.5rem' }} />
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Sin Registros de Asistencia</span>
                                <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.25rem' }}>Aún no se han tomado asistencias oficiales para este módulo académico.</span>
                              </div>
                            )}
                          </div>

                        </div>

                      </div>
                    ))
                  )}
                </div>

                {/* Program Summary Card with Final Average Grade */}
                {(() => {
                  const modulesWithGrades = prog.modules.filter((m: any) => m.grade.hasGrade);
                  const totalModules = prog.modules.length;
                  const gradedCount = modulesWithGrades.length;
                  const averageGrade = gradedCount > 0 
                    ? Math.round(modulesWithGrades.reduce((sum: number, m: any) => sum + Number(m.grade.total), 0) / gradedCount) 
                    : 0;

                  return (
                    <div style={{
                      marginTop: '2rem',
                      padding: '1.75rem 2rem',
                      borderRadius: '1.25rem',
                      background: 'linear-gradient(135deg, rgba(187, 151, 58, 0.15) 0%, rgba(30, 41, 59, 0.4) 100%)',
                      border: '1px solid rgba(187, 151, 58, 0.3)',
                      boxShadow: '0 15px 30px rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'rgba(187, 151, 58, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(187, 151, 58, 0.4)'
                        }}>
                          <BadgeCheck size={24} color="#bb973a" />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                            PROMEDIO GENERAL DEL PROGRAMA
                          </h4>
                          <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
                            Calculado sobre {gradedCount} de {totalModules} módulo(s) calificado(s)
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        {/* Attendance Overall Program Average */}
                        {(() => {
                          const modulesWithAsist = prog.modules.filter((m: any) => m.asistenciaStats.totalSessions > 0);
                          const totalAsistPercentage = modulesWithAsist.length > 0
                            ? Math.round(modulesWithAsist.reduce((sum: number, m: any) => sum + m.asistenciaStats.attendancePercentage, 0) / modulesWithAsist.length)
                            : 0;
                          
                          if (modulesWithAsist.length === 0) return null;

                          return (
                            <div style={{ textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: '1.5rem' }}>
                              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', display: 'block', letterSpacing: '0.05em' }}>
                                ASISTENCIA PROMEDIO
                              </span>
                              <strong style={{ fontSize: '1.15rem', color: totalAsistPercentage >= 80 ? '#34d399' : '#f87171', fontWeight: 900 }}>
                                {totalAsistPercentage}%
                              </strong>
                            </div>
                          );
                        })()}

                        {/* Final Score Promedio */}
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', display: 'block', letterSpacing: '0.05em' }}>
                            NOTA FINAL PROMEDIO
                          </span>
                          <strong style={{
                            fontSize: '1.75rem',
                            fontWeight: 950,
                            color: averageGrade >= 51 ? '#34d399' : gradedCount > 0 ? '#f87171' : '#94a3b8'
                          }}>
                            {gradedCount > 0 ? averageGrade : 'S/R'} <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>/ 100</span>
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  )
}
