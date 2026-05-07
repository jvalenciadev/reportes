'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Save, Search, UserPlus, CheckCircle, LayoutGrid,
  AlertCircle, Contact, Mail, Phone, MapPin,
  Calendar, Trash2, UserCheck
} from 'lucide-react'
import StatusModal, { StatusType } from '../components/StatusModal'

export default function InscriptionsClient({
  departamentos,
  userDeptId
}: {
  departamentos: any[],
  userDeptId?: string
}) {
  const supabase = createClient()

  // Notification State
  const [notif, setNotif] = useState({ show: false, type: 'info' as StatusType, title: '', message: '' })
  const showNotif = (type: StatusType, title: string, message: string) => {
    setNotif({ show: true, type, title, message })
  }

  // State
  const [selectedDepto, setSelectedDepto] = useState(userDeptId || '')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')
  const [groups, setGroups] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [enrolledParticipants, setEnrolledParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'list' | 'add'>('list')

  // Form State for New Participant
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    ci: '',
    correo: '',
    celular: '',
    fecha_nacimiento: '',
    localidad_vive: '',
    estado_inscripcion: 'inscrito'
  })

  // Load Initial Data
  useEffect(() => {
    const fetchBaseData = async () => {
      const { data: prog } = await supabase.from('programas').select('*').eq('estado', 'activo')
      setPrograms(prog || [])
      if (prog && prog.length > 0) setSelectedProgram(prog[0].id)
    }
    fetchBaseData()
  }, [])

  // Load Groups when Depto changes
  useEffect(() => {
    if (!selectedDepto) return
    const fetchGroups = async () => {
      const { data } = await supabase.from('grupos').select('*').eq('departamento_id', selectedDepto)
      setGroups(data || [])
    }
    fetchGroups()
  }, [selectedDepto])

  // Load Enrolled Participants when Group/Program changes
  const loadParticipants = async () => {
    if (!selectedGroup || !selectedProgram) return
    setLoading(true)
    const { data } = await supabase
      .from('inscripciones')
      .select('*, participantes(*)')
      .eq('grupo_id', selectedGroup)
      .eq('programa_id', selectedProgram)
    setEnrolledParticipants(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadParticipants()
  }, [selectedGroup, selectedProgram])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroup || !selectedProgram) {
      alert('Selecciona programa y grupo primero')
      return
    }
    setSaving(true)

    try {
      // 1. Create or Get Participant (Upsert by CI)
      const { data: part, error: pErr } = await supabase
        .from('participantes')
        .upsert({
          nombre: form.nombre,
          apellido: form.apellido,
          ci: form.ci,
          correo: form.correo,
          celular: form.celular,
          fecha_nacimiento: form.fecha_nacimiento || null,
          localidad_vive: form.localidad_vive
        }, { onConflict: 'ci' })
        .select()
        .single()

      if (pErr) throw pErr

      // 2. Create Enrollment
      const { error: iErr } = await supabase
        .from('inscripciones')
        .upsert({
          participante_id: part.id,
          grupo_id: selectedGroup,
          programa_id: selectedProgram,
          estado: form.estado_inscripcion
        }, { onConflict: 'participante_id,programa_id' })

      if (iErr) throw iErr

      // Success
      setForm({ nombre: '', apellido: '', ci: '', correo: '', celular: '', fecha_nacimiento: '', localidad_vive: '', estado_inscripcion: 'inscrito' })
      setView('list')
      loadParticipants()
      showNotif('success', '¡Registro Exitoso!', `${form.nombre} ha sido inscrito correctamente en el programa.`)
    } catch (err: any) {
      showNotif('error', 'Error en el Proceso', `No se pudo completar la inscripción: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const deleteEnrollment = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta inscripción?')) return
    await supabase.from('inscripciones').delete().eq('id', id)
    loadParticipants()
  }

  return (
    <>
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Global Selectors */}
      <div className="card glass" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="form-group">
          <label>Programa Académico</label>
          <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)}>
            {programs.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Departamento</label>
          <select value={selectedDepto} onChange={(e) => setSelectedDepto(e.target.value)} disabled={!!userDeptId}>
            <option value="">Seleccionar...</option>
            {departamentos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Grupo</label>
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} disabled={!selectedDepto}>
            <option value="">Seleccionar Grupo</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      {selectedGroup && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '1rem', background: 'var(--surface)', padding: '0.4rem', borderRadius: '0.75rem' }}>
              <button
                className={`btn ${view === 'list' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setView('list')}
                style={{ padding: '0.5rem 1.5rem' }}
              >
                <LayoutGrid size={18} /> Lista de Inscritos
              </button>
              <button
                className={`btn ${view === 'add' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setView('add')}
                style={{ padding: '0.5rem 1.5rem' }}
              >
                <UserPlus size={18} /> Nuevo Participante
              </button>
            </div>
            <div className="badge" style={{ padding: '0.75rem 1.25rem', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 800 }}>
              {enrolledParticipants.length} INSCRITOS EN TOTAL
            </div>
          </div>

          {view === 'add' ? (
            <div className="card glass animate-slide-in" style={{ borderTop: '4px solid var(--primary)' }}>
              <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Contact color="var(--primary)" /> Registro de Nuevo Participante
              </h3>
              <form onSubmit={handleRegister} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label>Nombre(s)</label>
                  <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Juan" />
                </div>
                <div className="form-group">
                  <label>Apellido(s)</label>
                  <input required value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} placeholder="Ej: Pérez" />
                </div>
                <div className="form-group">
                  <label>Cédula de Identidad (CI)</label>
                  <input required value={form.ci} onChange={e => setForm({ ...form, ci: e.target.value })} placeholder="Ej: 1234567 LP" />
                </div>
                <div className="form-group">
                  <label>Correo Electrónico</label>
                  <input type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} placeholder="correo@ejemplo.com" />
                </div>
                <div className="form-group">
                  <label>Celular</label>
                  <input value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })} placeholder="70000000" />
                </div>
                <div className="form-group">
                  <label>Fecha de Nacimiento</label>
                  <input type="date" value={form.fecha_nacimiento} onChange={e => setForm({ ...form, fecha_nacimiento: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Localidad donde vive</label>
                  <input value={form.localidad_vive} onChange={e => setForm({ ...form, localidad_vive: e.target.value })} placeholder="Ej: El Alto" />
                </div>
                <div className="form-group">
                  <label>Estado Inicial</label>
                  <select value={form.estado_inscripcion} onChange={e => setForm({ ...form, estado_inscripcion: e.target.value })}>
                    <option value="inscrito">Inscrito (Pendiente)</option>
                    <option value="confirmado">Confirmado (Activo)</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} disabled={saving}>
                    {saving ? 'Procesando...' : <><Save size={20} /> Finalizar Inscripción</>}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card glass animate-fade-in" style={{ borderTop: '4px solid var(--success)' }}>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Participante</th>
                      <th>Identidad</th>
                      <th>Contacto</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledParticipants.length > 0 ? enrolledParticipants.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <div style={{ fontWeight: 800 }}>{i.participantes.nombre} {i.participantes.apellido}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <MapPin size={10} /> {i.participantes.localidad_vive || 'Sin localidad'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{i.participantes.ci}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem' }}><Mail size={12} style={{ verticalAlign: 'middle' }} /> {i.participantes.correo || '-'}</div>
                          <div style={{ fontSize: '0.8rem' }}><Phone size={12} style={{ verticalAlign: 'middle' }} /> {i.participantes.celular || '-'}</div>
                        </td>
                        <td>
                          <span className="badge" style={{
                            background: i.estado === 'confirmado' ? 'rgba(16, 217, 139, 0.1)' : 'rgba(255,255,255,0.05)',
                            color: i.estado === 'confirmado' ? 'var(--success)' : 'var(--foreground-2)'
                          }}>
                            {i.estado.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-outline" onClick={() => deleteEnrollment(i.id)} style={{ color: 'var(--danger)', borderColor: 'var(--danger-light)' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                          <Search size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                          <div>No hay participantes inscritos en este grupo</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    <StatusModal
        show={notif.show}
        type={notif.type}
        title={notif.title}
        message={notif.message}
        onClose={() => setNotif({ ...notif, show: false })}
      />
    </>
  )
}
