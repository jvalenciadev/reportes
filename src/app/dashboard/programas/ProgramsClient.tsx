'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Plus, Save, Trash2, Calendar, BookOpen,
  ChevronRight, Layout, CheckCircle2, Clock
} from 'lucide-react'
import StatusModal, { StatusType } from '../components/StatusModal'

export default function ProgramsClient({ initialPrograms }: { initialPrograms: any[] }) {
  const supabase = createClient()
  const [programs, setPrograms] = useState(initialPrograms)
  const [loading, setLoading] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<any>(null)

  // Notification State
  const [notif, setNotif] = useState({ show: false, type: 'info' as StatusType, title: '', message: '' })

  const showNotif = (type: StatusType, title: string, message: string) => {
    setNotif({ show: true, type, title, message })
  }

  // New Program Form
  const [newProgram, setNewProgram] = useState({
    titulo: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'activo'
  })

  // New Module Form
  const [newModule, setNewModule] = useState({
    titulo_modulo: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'activo'
  })

  const addProgram = async () => {
    if (!newProgram.titulo || !newProgram.fecha_inicio || !newProgram.fecha_fin) {
      showNotif('info', 'Campos Incompletos', 'Por favor complete todos los campos (Título y Fechas) antes de guardar.')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.from('programas').insert([newProgram]).select()

    if (error) {
      console.error('Error adding program:', error)
      showNotif('error', 'Error al Guardar', `No se pudo guardar el programa: ${error.message}. Verifica que tengas permisos suficientes.`)
    } else {
      setPrograms([data[0], ...programs])
      setNewProgram({ titulo: '', fecha_inicio: '', fecha_fin: '', estado: 'activo' })
      showNotif('success', '¡Éxito!', 'El programa académico ha sido registrado correctamente.')
    }
    setLoading(false)
  }

  const addModule = async () => {
    if (!newModule.titulo_modulo || !newModule.fecha_inicio || !newModule.fecha_fin || !selectedProgram) {
      showNotif('info', 'Faltan Datos', 'Complete el nombre del módulo y sus fechas de vigencia para continuar.')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.from('programa_modulos').insert([{
      ...newModule,
      programa_id: selectedProgram.id
    }]).select()

    if (error) {
      console.error('Error adding module:', error)
      showNotif('error', 'Error en Módulo', `Hubo un fallo al registrar el módulo: ${error.message}`)
    } else {
      const updated = programs.map(p => {
        if (p.id === selectedProgram.id) {
          return { ...p, programa_modulos: [...(p.programa_modulos || []), data[0]] }
        }
        return p
      })
      setPrograms(updated)
      setSelectedProgram(updated.find(p => p.id === selectedProgram.id))
      setNewModule({ titulo_modulo: '', fecha_inicio: '', fecha_fin: '', estado: 'activo' })
      showNotif('success', 'Módulo Agregado', 'La etapa académica se ha vinculado correctamente al programa.')
    }
    setLoading(false)
  }

  const deleteProgram = async (id: string) => {
    if (!confirm('¿Seguro? Se borrarán todos los módulos asociados.')) return
    const { error } = await supabase.from('programas').delete().eq('id', id)
    if (!error) setPrograms(programs.filter(p => p.id !== id))
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr 420px', 
      gap: '2.5rem',
      alignItems: 'start' 
    }}>
      
      {/* List of Programs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="card glass animate-fade-up" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--foreground)' }}>
                <Plus size={24} color="var(--primary)" /> Nuevo Programa Académico
              </h3>
              <p style={{ color: 'var(--foreground-2)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Define la oferta y las fechas de vigencia</p>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={addProgram} 
              disabled={loading}
              style={{ padding: '0.8rem 1.5rem', borderRadius: '1rem' }}
            >
              <Save size={18} /> Guardar
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-3)', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Título del Programa</label>
              <input 
                value={newProgram.titulo} 
                onChange={e => setNewProgram({ ...newProgram, titulo: e.target.value })} 
                placeholder="Ej: Programa de Nivelación..." 
                style={{ background: 'var(--bg)', borderRadius: '0.85rem' }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-3)', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Fecha Inicio</label>
              <input 
                type="date" 
                value={newProgram.fecha_inicio} 
                onChange={e => setNewProgram({ ...newProgram, fecha_inicio: e.target.value })} 
                style={{ background: 'var(--bg)', borderRadius: '0.85rem' }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-3)', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Fecha Fin</label>
              <input 
                type="date" 
                value={newProgram.fecha_fin} 
                onChange={e => setNewProgram({ ...newProgram, fecha_fin: e.target.value })} 
                style={{ background: 'var(--bg)', borderRadius: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.75rem' }}>
          {programs.map((p, idx) => (
            <div
              key={p.id}
              className={`card glass row-hover animate-fade-up ${selectedProgram?.id === p.id ? 'active-program-card' : ''}`}
              style={{ 
                cursor: 'pointer', 
                padding: '1.75rem',
                borderLeft: `4px solid ${selectedProgram?.id === p.id ? 'var(--primary)' : 'var(--border)'}`,
                animationDelay: `${idx * 0.05}s`
              }}
              onClick={() => setSelectedProgram(p)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--foreground)', lineHeight: 1.3 }}>{p.titulo}</h4>
                </div>
                <button 
                  className="btn-icon" 
                  style={{ 
                    background: 'var(--danger-light)', 
                    color: 'var(--danger)',
                    border: 'none',
                    borderRadius: '0.75rem',
                    cursor: 'pointer'
                  }} 
                  onClick={(e) => { e.stopPropagation(); deleteProgram(p.id); }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--foreground-2)' }}>
                  <Calendar size={14} color="var(--primary)" />
                  {new Date(p.fecha_inicio).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--foreground-2)' }}>
                  <Clock size={14} color="var(--primary)" />
                  {new Date(p.fecha_fin).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen size={14} color="var(--primary)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    {p.programa_modulos?.length || 0} Módulos
                  </span>
                </div>
                <span style={{ 
                  fontSize: '0.65rem', 
                  fontWeight: 900, 
                  textTransform: 'uppercase', 
                  padding: '0.35rem 0.75rem', 
                  borderRadius: '0.5rem',
                  background: p.estado === 'activo' ? 'var(--success-light)' : 'var(--surface)',
                  color: p.estado === 'activo' ? 'var(--success)' : 'var(--foreground-3)',
                  letterSpacing: '0.05em'
                }}>
                  {p.estado}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Module Management Panel */}
      <div style={{ position: 'sticky', top: '2rem' }}>
        {selectedProgram ? (
          <div className="card glass animate-scale-in" style={{ padding: '2.25rem', borderTop: '4px solid var(--primary)' }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                <Layout size={20} />
                <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gestión de Módulos</span>
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--foreground)', lineHeight: 1.2 }}>{selectedProgram.titulo}</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-3)', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Nombre del Módulo</label>
                <input 
                  value={newModule.titulo_modulo} 
                  onChange={e => setNewModule({ ...newModule, titulo_modulo: e.target.value })} 
                  placeholder="Ej: Fundamentos de Redacción" 
                  style={{ background: 'var(--bg)', borderRadius: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-3)', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Inicio</label>
                  <input type="date" value={newModule.fecha_inicio} onChange={e => setNewModule({ ...newModule, fecha_inicio: e.target.value })} style={{ background: 'var(--bg)', borderRadius: '0.85rem' }} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-3)', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Fin</label>
                  <input type="date" value={newModule.fecha_fin} onChange={e => setNewModule({ ...newModule, fecha_fin: e.target.value })} style={{ background: 'var(--bg)', borderRadius: '0.85rem' }} />
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', borderRadius: '1rem' }} onClick={addModule} disabled={loading}>
                <Plus size={20} /> Agregar a la Oferta
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-3)', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Estructura Académica</label>
              {selectedProgram.programa_modulos?.map((m: any, idx: number) => (
                <div 
                  key={m.id} 
                  className="animate-fade-up"
                  style={{ 
                    padding: '1.25rem', 
                    background: 'var(--bg)', 
                    borderRadius: '1rem', 
                    border: '1px solid var(--border)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    animationDelay: `${idx * 0.1}s`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '0.6rem', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900 }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--foreground)' }}>{m.titulo_modulo}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--foreground-2)', marginTop: '0.1rem' }}>
                        {new Date(m.fecha_inicio).toLocaleDateString()} - {new Date(m.fecha_fin).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <CheckCircle2 size={18} color="var(--success)" style={{ opacity: 0.6 }} />
                </div>
              ))}
              {(!selectedProgram.programa_modulos || selectedProgram.programa_modulos.length === 0) && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg)', borderRadius: '1.5rem', border: '2px dashed var(--border)', color: 'var(--foreground-3)', fontSize: '0.85rem' }}>
                  <Layout size={32} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <div>No hay módulos definidos.</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card glass animate-scale-in" style={{ textAlign: 'center', padding: '6rem 2rem', border: '2px dashed var(--border)', background: 'transparent' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '2rem', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', color: 'var(--foreground-3)' }}>
              <Layout size={32} />
            </div>
            <h4 style={{ fontWeight: 800, color: 'var(--foreground)', marginBottom: '0.5rem' }}>Panel de Detalles</h4>
            <p style={{ color: 'var(--foreground-2)', fontSize: '0.9rem' }}>Selecciona un programa para configurar su malla curricular</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .active-program-card {
          background: var(--bg-2) !important;
          border-color: var(--primary) !important;
          box-shadow: 0 0 30px var(--primary-glow) !important;
          transform: translateY(-4px);
        }
      `}</style>

      <StatusModal 
        show={notif.show}
        type={notif.type}
        title={notif.title}
        message={notif.message}
        onClose={() => setNotif({ ...notif, show: false })}
      />
    </div>
  )
}
