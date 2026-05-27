'use client'

import { useState, useRef } from 'react'
import {
  Upload, FileText, CheckCircle, AlertCircle,
  Users, Shield, Building, ArrowRight, Loader2,
  Download, Database, Link as LinkIcon, Activity,
  GraduationCap
} from 'lucide-react'
import StatusModal, { StatusType } from '../components/StatusModal'
import { createSystemUser, assignFacilitatorGroup } from '../usuarios/actions'
import { migrateParticipant, updateParticipantFieldsByCI } from '../inscripciones/actions'

export default function MigrationClient({
  roles = [],
  departamentos = []
}: {
  roles: any[],
  departamentos: any[]
}) {
  const [activeTab, setActiveTab] = useState<'users' | 'assignments' | 'participants' | 'update_fields'>('users')
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<{ name: string; status: 'success' | 'error'; message?: string }[]>([])
  const [notif, setNotif] = useState({ show: false, type: 'info' as StatusType, title: '', message: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
      setResults([])
    }
  }

  const downloadTemplate = () => {
    let headers = ''
    let example = ''
    let filename = ''

    if (activeTab === 'users') {
      headers = 'nombre,apellidos,ci,correo,password,role,departamento\n'
      example = 'Juan,Perez,1234567 LP,juan.perez@profe.gob.bo,Password123,facilitador,La Paz\n'
      filename = 'plantilla_migracion_usuarios.csv'
    } else if (activeTab === 'assignments') {
      headers = 'facilitador_email,grupo_nombre\n'
      example = 'juan.perez@profe.gob.bo,Grupo A - Nivelacion\n'
      filename = 'plantilla_asignacion_grupos.csv'
    } else if (activeTab === 'participants') {
      headers = 'nombre,apellido,ci,correo,celular,grupo_nombre,programa_titulo\n'
      example = 'Maria,Garcia,8765432 SC,maria.garcia@gmail.com,70010203,LPZ-G1,Programa Puente\n'
      filename = 'plantilla_migracion_participantes.csv'
    } else {
      headers = 'ci,formalizacion,zona\n'
      example = '8765432 SC,SI,rural\n'
      filename = 'plantilla_actualizacion_participantes.csv'
    }

    const blob = new Blob([headers + example], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  const processMigration = async () => {
    if (!file) return
    setIsProcessing(true)
    setResults([])

    try {
      // 1. Robust encoding detection (UTF-8 vs Windows-1252)
      const arrayBuffer = await file.arrayBuffer()
      let cleanText = ''

      try {
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true })
        cleanText = utf8Decoder.decode(arrayBuffer)
      } catch (e) {
        // If UTF-8 fails, try Windows-1252 (Common in Excel Spanish exports)
        const winDecoder = new TextDecoder('windows-1252')
        cleanText = winDecoder.decode(arrayBuffer)
      }

      cleanText = cleanText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')

      // 2. Robust CSV Parser for quoted fields
      const parseCSVLine = (line: string, delimiter: string) => {
        const result = []
        let current = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"'
              i++
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === delimiter && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }

      const allLines = cleanText.split('\n').filter(l => l.trim() !== '')
      if (allLines.length < 2) throw new Error('El archivo CSV está vacío.')

      const delimiter = allLines[0].includes(';') ? ';' : ','
      const headers = parseCSVLine(allLines[0], delimiter).map(h => h.trim().toLowerCase())
      const dataRows = allLines.slice(1)

      const newResults: typeof results = []

      for (const row of dataRows) {
        const values = parseCSVLine(row, delimiter)
        const rowData: any = {}
        headers.forEach((header, i) => {
          rowData[header] = values[i]
        })

        try {
          if (activeTab === 'users') {
            const email = rowData.correo || rowData.email
            const nombre = rowData.nombre || rowData.full_name
            if (!email || !nombre || !rowData.password || !rowData.role) throw new Error('Faltan campos obligatorios')
            const depto = departamentos.find(d => d.name.toLowerCase() === (rowData.departamento || '').toLowerCase())
            const formData = new FormData()
            formData.append('nombre', nombre); formData.append('apellidos', rowData.apellidos || '');
            formData.append('ci', rowData.ci || ''); formData.append('correo', email);
            formData.append('email', email); formData.append('password', rowData.password);
            formData.append('role', rowData.role.toLowerCase()); formData.append('departamento_id', depto?.id || '');
            const res = await createSystemUser(formData)
            if (res?.error) throw new Error(res.error)
            newResults.push({ name: `${nombre} (${email})`, status: 'success' })
          } else if (activeTab === 'assignments') {
            const f_email = rowData.facilitador_email || rowData.email
            const g_name = rowData.grupo_nombre || rowData.grupo
            if (!f_email || !g_name) throw new Error('Faltan campos')
            const res = await assignFacilitatorGroup(f_email, g_name)
            if (res?.error) throw new Error(res.error)
            newResults.push({ name: `${f_email} -> ${g_name}`, status: 'success' })
          } else if (activeTab === 'participants') {
            // Participants Migration
            if (!rowData.nombre || !rowData.ci || !rowData.grupo_nombre || !rowData.programa_titulo) {
              throw new Error('Faltan campos (nombre, ci, grupo_nombre, programa_titulo)')
            }
            const res = await migrateParticipant({
              nombre: rowData.nombre,
              apellido: rowData.apellido || '',
              ci: rowData.ci,
              correo: rowData.correo || '',
              celular: rowData.celular || '',
              grupo_nombre: rowData.grupo_nombre,
              programa_titulo: rowData.programa_titulo
            })
            if (res?.error) throw new Error(res.error)
            newResults.push({ name: `${rowData.nombre} ${rowData.apellido} (CI: ${rowData.ci})`, status: 'success' })
          } else {
            // Update fields by CI
            if (!rowData.ci || !rowData.formalizacion) {
              throw new Error('Faltan campos (ci, formalizacion)')
            }
            const isFormalizado = rowData.formalizacion.toUpperCase() === 'SI'
            const zonaVal = (rowData.zona || 'urbano').toLowerCase().trim()
            if (zonaVal && zonaVal !== 'urbano' && zonaVal !== 'rural') {
              throw new Error('El campo zona debe ser "urbano" o "rural"')
            }

            const res = await updateParticipantFieldsByCI(rowData.ci, {
              formalizado: isFormalizado,
              ...(zonaVal ? { zona: zonaVal } : {})
            })
            if (res?.error) throw new Error(res.error)
            newResults.push({ name: `CI: ${rowData.ci} (Formalizado: ${isFormalizado ? 'SI' : 'NO'}, Zona: ${zonaVal})`, status: 'success' })
          }
        } catch (err: any) {
          newResults.push({ name: rowData.nombre || rowData.ci || 'Error', status: 'error', message: err.message })
        }
        setResults([...newResults])
      }

      const errors = newResults.filter(r => r.status === 'error').length
      setNotif({
        show: true, type: errors === 0 ? 'success' : 'info', title: 'Migración Finalizada',
        message: `Éxitos: ${newResults.length - errors}, Errores: ${errors}.`
      })
    } catch (err: any) {
      setNotif({ show: true, type: 'error', title: 'Error', message: err.message })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2.5rem' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.75rem', background: 'var(--surface)', padding: '0.4rem', borderRadius: '1.25rem', width: 'fit-content', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
          <button
            className={`btn ${activeTab === 'users' ? 'btn-primary' : ''}`}
            style={{ borderRadius: '1rem', background: activeTab === 'users' ? 'var(--primary)' : 'transparent', color: activeTab === 'users' ? 'white' : 'var(--foreground-2)', padding: '0.6rem 1.25rem' }}
            onClick={() => { setActiveTab('users'); setFile(null); setResults([]); }}
          >
            <Users size={16} /> Usuarios
          </button>
          <button
            className={`btn ${activeTab === 'assignments' ? 'btn-primary' : ''}`}
            style={{ borderRadius: '1rem', background: activeTab === 'assignments' ? 'var(--primary)' : 'transparent', color: activeTab === 'assignments' ? 'white' : 'var(--foreground-2)', padding: '0.6rem 1.25rem' }}
            onClick={() => { setActiveTab('assignments'); setFile(null); setResults([]); }}
          >
            <LinkIcon size={16} /> Asignaciones
          </button>
          <button
            className={`btn ${activeTab === 'participants' ? 'btn-primary' : ''}`}
            style={{ borderRadius: '1rem', background: activeTab === 'participants' ? 'var(--primary)' : 'transparent', color: activeTab === 'participants' ? 'white' : 'var(--foreground-2)', padding: '0.6rem 1.25rem' }}
            onClick={() => { setActiveTab('participants'); setFile(null); setResults([]); }}
          >
            <GraduationCap size={16} /> Participantes
          </button>
          <button
            className={`btn ${activeTab === 'update_fields' ? 'btn-primary' : ''}`}
            style={{ borderRadius: '1rem', background: activeTab === 'update_fields' ? 'var(--primary)' : 'transparent', color: activeTab === 'update_fields' ? 'white' : 'var(--foreground-2)', padding: '0.6rem 1.25rem' }}
            onClick={() => { setActiveTab('update_fields'); setFile(null); setResults([]); }}
          >
            <Activity size={16} /> Actualizar Datos
          </button>
        </div>

        {/* Upload Card */}
        <div className="card glass" style={{ padding: '3.5rem 2rem', textAlign: 'center', border: '2px dashed var(--border)', background: 'transparent' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '2.25rem',
            background: activeTab === 'participants' ? 'var(--info-light)' : (activeTab === 'users' ? 'var(--primary-light)' : (activeTab === 'assignments' ? 'var(--success-light)' : 'rgba(245, 158, 11, 0.1)')),
            color: activeTab === 'participants' ? 'var(--info)' : (activeTab === 'users' ? 'var(--primary)' : (activeTab === 'assignments' ? 'var(--success)' : '#f59e0b')),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 2rem', boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
          }}>
            {activeTab === 'participants' ? <GraduationCap size={40} /> : (activeTab === 'users' ? <Upload size={40} /> : (activeTab === 'assignments' ? <Database size={40} /> : <Activity size={40} />))}
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--foreground)', marginBottom: '1rem' }}>
            {activeTab === 'participants' ? 'Migrar Participantes' : (activeTab === 'users' ? 'Migrar Usuarios' : (activeTab === 'assignments' ? 'Asignar Grupos' : 'Actualizar Datos por CI'))}
          </h2>
          <p style={{ color: 'var(--foreground-2)', marginBottom: '2.5rem', maxWidth: '500px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
            {activeTab === 'participants'
              ? 'Sube un CSV para inscribir participantes masivamente en grupos y programas.'
              : (activeTab === 'users' ? 'Crea cuentas de acceso administrativo masivamente.' : (activeTab === 'assignments' ? 'Vincula facilitadores con sus grupos académicos.' : 'Actualiza formalización (SI/NO) y zona (urbano/rural) masivamente usando el CI.'))}
          </p>

          <input type="file" accept=".csv" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()} disabled={isProcessing} style={{ padding: '0.75rem 1.5rem' }}>
              <FileText size={18} /> {file ? file.name : 'Seleccionar CSV'}
            </button>
            <button className="btn btn-primary" onClick={processMigration} disabled={!file || isProcessing} style={{ padding: '0.75rem 2rem' }}>
              {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
              {isProcessing ? 'Procesando...' : 'Iniciar Proceso'}
            </button>
          </div>

          <div style={{ marginTop: '2.5rem' }}>
            <button onClick={downloadTemplate} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
              <Download size={14} /> Descargar Plantilla Específica
            </button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="card glass animate-fade-up">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Activity size={20} color="var(--primary)" /> Detalle de Migración
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {results.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {r.status === 'success' ? <CheckCircle size={18} color="var(--success)" /> : <AlertCircle size={18} color="var(--danger)" />}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{r.name}</div>
                      {r.message && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>{r.message}</div>}
                    </div>
                  </div>
                  <span className="badge" style={{ background: r.status === 'success' ? 'var(--success-light)' : 'var(--danger-light)', color: r.status === 'success' ? 'var(--success)' : 'var(--danger)' }}>
                    {r.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'sticky', top: '2rem' }}>
        <div className="card glass" style={{ padding: '2.25rem', borderTop: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '1.5rem' }}>Formato Requerido</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Columnas del CSV</div>
              <code style={{ fontSize: '0.75rem', color: 'var(--foreground-2)', wordBreak: 'break-all' }}>
                {activeTab === 'users' && 'nombre, apellidos, ci, correo, password, role, departamento'}
                {activeTab === 'assignments' && 'facilitador_email, grupo_nombre'}
                {activeTab === 'participants' && 'nombre, apellido, ci, correo, celular, grupo_nombre, programa_titulo'}
                {activeTab === 'update_fields' && 'ci, formalizacion, zona'}
              </code>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--foreground-2)', lineHeight: 1.6 }}>
              {activeTab === 'participants'
                ? 'El sistema buscará automáticamente el grupo y el programa por su nombre exacto para realizar la inscripción.'
                : (activeTab === 'update_fields'
                  ? 'El sistema actualizará el estado de formalización (SI = formalizado, NO = pendiente) y la zona (urbano/rural) del participante asociado a cada CI.'
                  : 'Asegúrate de que los correos electrónicos sean únicos en el sistema.')}
            </p>
          </div>
        </div>
      </div>

      <StatusModal show={notif.show} type={notif.type} title={notif.title} message={notif.message} onClose={() => setNotif({ ...notif, show: false })} />
    </div>
  )
}
