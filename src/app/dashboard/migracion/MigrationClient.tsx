'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Upload, FileText, CheckCircle, AlertCircle,
  Users, Shield, Building, ArrowRight, Loader2,
  Download, Database, Link as LinkIcon, Activity,
  GraduationCap, FileSpreadsheet
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { createClient } from '@/utils/supabase/client'
import StatusModal, { StatusType } from '../components/StatusModal'
import { createSystemUser, assignFacilitatorGroup } from '../usuarios/actions'
import { migrateParticipant, updateParticipantFieldsByCI, transferParticipantsGroup } from '../inscripciones/actions'
import { migrateTutor } from '../tutores/actions'

export default function MigrationClient({
  roles = [],
  departamentos = []
}: {
  roles: any[],
  departamentos: any[]
}) {
  const [activeTab, setActiveTab] = useState<'users' | 'assignments' | 'participants' | 'update_fields' | 'tutores' | 'unify_groups' | 'export_excel'>('users')
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<{ name: string; status: 'success' | 'error'; message?: string }[]>([])
  const [notif, setNotif] = useState({ show: false, type: 'info' as StatusType, title: '', message: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()
  const [programs, setPrograms] = useState<any[]>([])
  const [selectedProgram, setSelectedProgram] = useState('')
  const [groups, setGroups] = useState<any[]>([])
  const [selectedSourceGroup, setSelectedSourceGroup] = useState('')
  const [selectedTargetGroup, setSelectedTargetGroup] = useState('')
  const [sourceParticipants, setSourceParticipants] = useState<any[]>([])
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [isUnifying, setIsUnifying] = useState(false)

  // Export Excel state
  const [exportPrograms, setExportPrograms] = useState<any[]>([])
  const [exportDepartamentos, setExportDepartamentos] = useState<any[]>([])
  const [exportSelectedProgram, setExportSelectedProgram] = useState('')
  const [exportSelectedDepto, setExportSelectedDepto] = useState('')
  const [exportSelectedArea, setExportSelectedArea] = useState('all_consolidated')
  const [isExporting, setIsExporting] = useState(false)
  const [exportPreview, setExportPreview] = useState<any[]>([])

  useEffect(() => {
    if (activeTab === 'unify_groups') {
      const fetchBaseData = async () => {
        const { data: prog } = await supabase.from('programas').select('*').eq('estado', 'activo')
        setPrograms(prog || [])
        if (prog && prog.length > 0) setSelectedProgram(prog[0].id)

        const { data: grps } = await supabase.from('grupos').select('*').order('name')
        setGroups(grps || [])
      }
      fetchBaseData()
    }
    if (activeTab === 'export_excel') {
      const fetchExportData = async () => {
        const { data: prog } = await supabase.from('programas').select('*').order('titulo')
        setExportPrograms(prog || [])
        if (prog && prog.length > 0) setExportSelectedProgram(prog[0].id)
        const { data: deptos } = await supabase.from('departamentos').select('*').order('name')
        setExportDepartamentos(deptos || [])
      }
      fetchExportData()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'unify_groups' && selectedSourceGroup && selectedProgram) {
      const fetchSourceParticipants = async () => {
        setLoadingParticipants(true)
        const { data, error } = await supabase
          .from('inscripciones')
          .select('*, participantes(*)')
          .eq('grupo_id', selectedSourceGroup)
          .eq('programa_id', selectedProgram)
          .eq('estado', 'inscrito')

        if (error) {
          console.error('Error loading source participants:', error)
        } else {
          setSourceParticipants(data || [])
          setSelectedParticipants((data || []).map((p: any) => p.participante_id))
        }
        setLoadingParticipants(false)
      }
      fetchSourceParticipants()
    } else {
      setSourceParticipants([])
      setSelectedParticipants([])
    }
  }, [activeTab, selectedSourceGroup, selectedProgram])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
      setResults([])
    }
  }

  // ─── Excel Export Logic ─────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (!exportSelectedProgram) return
    setIsExporting(true)
    setExportPreview([])
    try {
      // 1. Obtener módulos del programa
      const { data: modulos, error: mErr } = await supabase
        .from('programa_modulos')
        .select('id, titulo_modulo, orden, grupo')
        .eq('programa_id', exportSelectedProgram)
        .order('orden', { ascending: true })

      if (mErr || !modulos || modulos.length === 0) {
        throw new Error('El programa seleccionado no tiene módulos registrados.')
      }

      // 2. Construir query de inscripciones con paginación
      let inscripciones: any[] = []
      let fromInsc = 0
      let hasMoreInsc = true

      while (hasMoreInsc) {
        let q = supabase
          .from('inscripciones')
          .select('participante_id, grupo_id, grupos(id, name, departamento_id, departamentos(name)), participantes(id, nombre, apellido, ci)')
          .eq('programa_id', exportSelectedProgram)
          .eq('estado', 'inscrito')
          .range(fromInsc, fromInsc + 999)

        if (exportSelectedDepto) {
          const { data: gruposDepto } = await supabase
            .from('grupos')
            .select('id')
            .eq('departamento_id', exportSelectedDepto)
          const grupoIds = (gruposDepto || []).map((g: any) => g.id)
          if (grupoIds.length > 0) {
            q = q.in('grupo_id', grupoIds)
          }
        }

        const { data, error } = await q
        if (error) throw error
        if (!data || data.length === 0) {
          hasMoreInsc = false
        } else {
          inscripciones = inscripciones.concat(data)
          if (data.length < 1000) {
            hasMoreInsc = false
          } else {
            fromInsc += 1000
          }
        }
      }

      if (inscripciones.length === 0) {
        throw new Error('No hay participantes inscritos para los filtros seleccionados.')
      }

      const participanteIds = inscripciones.map((i: any) => i.participante_id)
      const moduloIds = modulos.map((m: any) => m.id)

      // 3. Obtener todas las asistencias con paginación
      let asistencias: any[] = []
      let fromAsis = 0
      let hasMoreAsis = true

      while (hasMoreAsis) {
        const { data, error } = await supabase
          .from('asistencias')
          .select('participante_id, modulo_id, dia, estado')
          .in('modulo_id', moduloIds)
          .range(fromAsis, fromAsis + 999)

        if (error) throw error
        if (!data || data.length === 0) {
          hasMoreAsis = false
        } else {
          asistencias = asistencias.concat(data)
          if (data.length < 1000) {
            hasMoreAsis = false
          } else {
            fromAsis += 1000
          }
        }
      }

      // 4. Obtener todas las calificaciones con paginación
      let calificaciones: any[] = []
      let fromCal = 0
      let hasMoreCal = true

      while (hasMoreCal) {
        const { data, error } = await supabase
          .from('calificaciones')
          .select('participante_id, modulo_id, total')
          .in('modulo_id', moduloIds)
          .range(fromCal, fromCal + 999)

        if (error) throw error
        if (!data || data.length === 0) {
          hasMoreCal = false
        } else {
          calificaciones = calificaciones.concat(data)
          if (data.length < 1000) {
            hasMoreCal = false
          } else {
            fromCal += 1000
          }
        }
      }

      // Filtrar en memoria por participante_id
      const asistenciasList = asistencias.filter((a: any) => participanteIds.includes(a.participante_id))
      const calificacionesList = calificaciones.filter((c: any) => participanteIds.includes(c.participante_id))

      // Helper para calcular métricas por subset de módulos y agregar columnas dinámicas
      const buildRowWithModuleStats = (insc: any, targetMods: any[], areaLabel: string, allProgramModsForHeaders?: any[]) => {
        const p = (insc as any).participantes
        const g = (insc as any).grupos

        const row: any = {
          'CI': p?.ci || '',
          'Nombre': p?.nombre || '',
          'Apellido': p?.apellido || '',
          'Grupo': g?.name || '',
          'Área/Depto': (g as any)?.departamentos?.name || '',
        }

        const modsForColumns = allProgramModsForHeaders || targetMods

        let totalDaysSum = 0
        let totalAsistido = 0
        let totalGradesSum = 0
        let gradesCount = 0

        modsForColumns.forEach(mod => {
          const isTarget = targetMods.some(tm => tm.id === mod.id)

          if (isTarget) {
            // Calcular asistencia del módulo
            const groupPartIds = inscripciones.filter((i: any) => i.grupo_id === insc.grupo_id).map((i: any) => i.participante_id)
            const registeredDays = new Set(
              asistenciasList
                .filter((a: any) => a.modulo_id === mod.id && groupPartIds.includes(a.participante_id))
                .map((a: any) => a.dia)
            )
            const totalDays = registeredDays.size

            // Conteo individual por estado
            const asistioCount = asistenciasList.filter(
              (a: any) => a.participante_id === insc.participante_id && a.modulo_id === mod.id && a.estado === 'asistio'
            ).length

            const atrasoCount = asistenciasList.filter(
              (a: any) => a.participante_id === insc.participante_id && a.modulo_id === mod.id && a.estado === 'atraso'
            ).length

            const faltaCount = asistenciasList.filter(
              (a: any) => a.participante_id === insc.participante_id && a.modulo_id === mod.id && a.estado === 'falta'
            ).length

            const permisoCount = asistenciasList.filter(
              (a: any) => a.participante_id === insc.participante_id && a.modulo_id === mod.id && a.estado === 'permiso'
            ).length

            // Calificación del módulo (obtenido directamente de la tabla calificaciones)
            const gradeRec = calificacionesList.find(
              (c: any) => c.participante_id === insc.participante_id && c.modulo_id === mod.id
            )
            const grade = gradeRec ? Number(gradeRec.total || 0) : 0

            row[mod.titulo_modulo] = grade
            row[`Asistió ${mod.titulo_modulo}`] = asistioCount
            row[`Atraso ${mod.titulo_modulo}`] = atrasoCount
            row[`Falta ${mod.titulo_modulo}`] = faltaCount
            row[`Permiso ${mod.titulo_modulo}`] = permisoCount

            totalDaysSum += totalDays
            totalAsistido += (asistioCount + atrasoCount)
            totalGradesSum += grade
            gradesCount++
          } else {
            row[mod.titulo_modulo] = ''
            row[`Asistió ${mod.titulo_modulo}`] = ''
            row[`Atraso ${mod.titulo_modulo}`] = ''
            row[`Falta ${mod.titulo_modulo}`] = ''
            row[`Permiso ${mod.titulo_modulo}`] = ''
          }
        })

        const pctAsistenciaGral = totalDaysSum > 0 ? Math.round((totalAsistido / totalDaysSum) * 100) : 0
        const calificacionPromedio = gradesCount > 0 ? Math.round(totalGradesSum / gradesCount) : 0

        row['Promedio Final'] = calificacionPromedio
        row['Asistencia General %'] = `${pctAsistenciaGral}%`
        row['Área'] = areaLabel

        return row
      }

      // 5. Construir filas del Excel
      const rows: any[] = []

      for (const insc of inscripciones) {
        const p = (insc as any).participantes
        if (!p) continue

        if (exportSelectedArea === '1' || exportSelectedArea === '2') {
          const areaLabel = exportSelectedArea === '1' ? 'Lenguaje' : 'Matemática'
          const targetMods = modulos.filter(m => String(m.grupo) === exportSelectedArea)
          const row = buildRowWithModuleStats(insc, targetMods, areaLabel)
          rows.push(row)
        } else if (exportSelectedArea === 'all_split') {
          // Registro de Lenguaje (Grupo 1)
          const targetModsL = modulos.filter(m => String(m.grupo) === '1')
          if (targetModsL.length > 0) {
            const rowL = buildRowWithModuleStats(insc, targetModsL, 'Lenguaje', modulos)
            rows.push(rowL)
          }

          // Registro de Matemática (Grupo 2)
          const targetModsM = modulos.filter(m => String(m.grupo) === '2')
          if (targetModsM.length > 0) {
            const rowM = buildRowWithModuleStats(insc, targetModsM, 'Matemática', modulos)
            rows.push(rowM)
          }
        } else {
          // all_consolidated
          const row = buildRowWithModuleStats(insc, modulos, 'Consolidado General')
          rows.push(row)
        }
      }

      // Ordenar por grupo, luego por apellido
      rows.sort((a, b) => {
        if (a['Grupo'] !== b['Grupo']) return a['Grupo'].localeCompare(b['Grupo'])
        return a['Apellido'].localeCompare(b['Apellido'])
      })

      setExportPreview(rows.slice(0, 5))

      // 6. Generar Excel
      const ws = XLSX.utils.json_to_sheet(rows)

      const colWidths = Object.keys(rows[0] || {}).map(key => ({
        wch: Math.max(key.length + 2, 14)
      }))
      ws['!cols'] = colWidths

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Asistencia y Notas')

      const programa = exportPrograms.find(p => p.id === exportSelectedProgram)
      const deptoName = exportSelectedDepto
        ? exportDepartamentos.find(d => d.id === exportSelectedDepto)?.name || 'todos'
        : 'todos'
      const areaName = exportSelectedArea === '1' ? 'Lenguaje' : exportSelectedArea === '2' ? 'Matematica' : 'Consolidado'
      const filename = `reporte_${programa?.titulo || 'programa'}_${deptoName}_${areaName}_${new Date().toISOString().split('T')[0]}.xlsx`
        .replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '')

      XLSX.writeFile(wb, filename)

      setNotif({
        show: true, type: 'success', title: 'Exportación Exitosa',
        message: `Se exportaron ${rows.length} registros en formato Excel.`
      })
    } catch (err: any) {
      setNotif({ show: true, type: 'error', title: 'Error al Exportar', message: err.message })
    } finally {
      setIsExporting(false)
    }
  }
  // ────────────────────────────────────────────────────────────────────

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
    } else if (activeTab === 'tutores') {
      headers = 'nombre,apellido,rol,grupo_nombre,ci,correo,password\n'
      example = 'Juan,Perez,tutor,LPZ-G1,1234567,juan.perez@tutor.gob.bo,TutorPass123\n'
      filename = 'plantilla_migracion_tutores.csv'
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
          } else if (activeTab === 'tutores') {
            if (!rowData.nombre || !rowData.apellido || !rowData.grupo_nombre) {
              throw new Error('Faltan campos (nombre, apellido, grupo_nombre)')
            }
            const res = await migrateTutor({
              nombre: rowData.nombre,
              apellido: rowData.apellido,
              rol: rowData.rol || 'tutor',
              grupo_nombre: rowData.grupo_nombre,
              ci: rowData.ci || '',
              correo: rowData.correo || '',
              password: rowData.password || ''
            })
            if (res?.error) throw new Error(res.error)
            newResults.push({ name: `${rowData.nombre} ${rowData.apellido} (Grupo: ${rowData.grupo_nombre})`, status: 'success' })
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
        <div style={{ display: 'flex', gap: '0.75rem', background: 'var(--surface)', padding: '0.4rem', borderRadius: '1.25rem', width: 'fit-content', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', flexWrap: 'wrap' }}>
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
            className={`btn ${activeTab === 'tutores' ? 'btn-primary' : ''}`}
            style={{ borderRadius: '1rem', background: activeTab === 'tutores' ? 'var(--primary)' : 'transparent', color: activeTab === 'tutores' ? 'white' : 'var(--foreground-2)', padding: '0.6rem 1.25rem' }}
            onClick={() => { setActiveTab('tutores'); setFile(null); setResults([]); }}
          >
            <Users size={16} /> Tutores
          </button>
          <button
            className={`btn ${activeTab === 'update_fields' ? 'btn-primary' : ''}`}
            style={{ borderRadius: '1rem', background: activeTab === 'update_fields' ? 'var(--primary)' : 'transparent', color: activeTab === 'update_fields' ? 'white' : 'var(--foreground-2)', padding: '0.6rem 1.25rem' }}
            onClick={() => { setActiveTab('update_fields'); setFile(null); setResults([]); }}
          >
            <Activity size={16} /> Actualizar Datos
          </button>
          <button
            className={`btn ${activeTab === 'unify_groups' ? 'btn-primary' : ''}`}
            style={{ borderRadius: '1rem', background: activeTab === 'unify_groups' ? 'var(--primary)' : 'transparent', color: activeTab === 'unify_groups' ? 'white' : 'var(--foreground-2)', padding: '0.6rem 1.25rem' }}
            onClick={() => { setActiveTab('unify_groups'); setFile(null); setResults([]); }}
          >
            <Building size={16} /> Unificar Grupos
          </button>
          <button
            className={`btn ${activeTab === 'export_excel' ? 'btn-primary' : ''}`}
            style={{ borderRadius: '1rem', background: activeTab === 'export_excel' ? '#16a34a' : 'transparent', color: activeTab === 'export_excel' ? 'white' : 'var(--foreground-2)', padding: '0.6rem 1.25rem' }}
            onClick={() => { setActiveTab('export_excel'); setFile(null); setResults([]); setExportPreview([]); }}
          >
            <FileSpreadsheet size={16} /> Exportar Excel
          </button>
        </div>

        {activeTab === 'export_excel' ? (
          <div className="card glass animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--foreground)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileSpreadsheet size={28} color="#16a34a" /> Exportar Asistencia y Calificaciones
              </h2>
              <p style={{ color: 'var(--foreground-2)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Genera un archivo Excel con el porcentaje de asistencia y la calificación total acumulada por área o de forma consolidada.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', background: 'var(--surface)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Programa Académico *</label>
                <select value={exportSelectedProgram} onChange={e => { setExportSelectedProgram(e.target.value); setExportPreview([]); }} style={{ width: '100%' }}>
                  <option value="">Seleccionar programa...</option>
                  {exportPrograms.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Departamento / Sede (opcional)</label>
                <select value={exportSelectedDepto} onChange={e => { setExportSelectedDepto(e.target.value); setExportPreview([]); }} style={{ width: '100%' }}>
                  <option value="">Todos los departamentos</option>
                  {exportDepartamentos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Seleccionar Área / Filtro</label>
                <select value={exportSelectedArea} onChange={e => { setExportSelectedArea(e.target.value); setExportPreview([]); }} style={{ width: '100%' }}>
                  <option value="all_consolidated">Todo en conjunto (Fila Única - Promedio Global)</option>
                  <option value="all_split">Todas las áreas (Una fila por cada una: Lenguaje y Matemática)</option>
                  <option value="1">Área de Lenguaje (Grupo 1)</option>
                  <option value="2">Área de Matemática (Grupo 2)</option>
                </select>
              </div>
            </div>

            {/* Preview de columnas */}
            <div style={{ padding: '1.25rem', background: 'var(--bg)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#16a34a', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Columnas del archivo Excel</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(exportPreview.length > 0
                  ? Object.keys(exportPreview[0])
                  : ['CI', 'Nombre', 'Apellido', 'Grupo', 'Área/Depto', 'Módulos (Notas/Asistencias)', 'Promedio Final', 'Asistencia General %', 'Área']
                ).map((col, i) => (
                  <span key={i} style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', background: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)', color: 'var(--foreground-2)', fontWeight: 600 }}>
                    {col}
                  </span>
                ))}
              </div>
            </div>

            {/* Preview de datos */}
            {exportPreview.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Vista previa (primeros 5 registros)</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      {Object.keys(exportPreview[0]).map(col => (
                        <th key={col} style={{ padding: '0.5rem 0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', fontWeight: 800, whiteSpace: 'nowrap', textAlign: 'left' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exportPreview.map((row, ri) => (
                      <tr key={ri}>
                        {Object.values(row).map((val: any, ci) => (
                          <td key={ci} style={{ padding: '0.4rem 0.75rem', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                            {String(val ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                disabled={!exportSelectedProgram || isExporting}
                onClick={handleExportExcel}
                style={{ padding: '0.85rem 2.5rem', background: '#16a34a', borderColor: '#16a34a', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}
              >
                {isExporting ? <Loader2 className="animate-spin" size={20} /> : <FileSpreadsheet size={20} />}
                {isExporting ? 'Generando...' : 'Descargar Excel'}
              </button>
            </div>
          </div>
        ) : activeTab === 'unify_groups' ? (
          <div className="card glass animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--foreground)', marginBottom: '0.5rem' }}>
              Unificar / Transferir Participantes
            </h2>
            <p style={{ color: 'var(--foreground-2)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Selecciona el programa académico, el grupo origen y el grupo de destino. Podrás seleccionar qué participantes trasladar. Sus fechas de asistencia se actualizarán automáticamente.
            </p>

            {/* Selectores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', background: 'var(--surface)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Programa Académico</label>
                <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Seleccionar programa...</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Grupo de Origen</label>
                <select value={selectedSourceGroup} onChange={(e) => { setSelectedSourceGroup(e.target.value); setSelectedTargetGroup(''); }} style={{ width: '100%' }}>
                  <option value="">Seleccionar origen...</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Grupo de Destino</label>
                <select
                  value={selectedTargetGroup}
                  onChange={(e) => setSelectedTargetGroup(e.target.value)}
                  disabled={!selectedSourceGroup}
                  style={{ width: '100%' }}
                >
                  <option value="">Seleccionar destino...</option>
                  {groups.filter(g => g.id !== selectedSourceGroup).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Participantes del origen */}
            {selectedSourceGroup && selectedProgram && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                    Participantes en Grupo Origen ({sourceParticipants.length})
                  </h3>
                  {sourceParticipants.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        id="select-all-participants"
                        checked={selectedParticipants.length === sourceParticipants.length && sourceParticipants.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParticipants(sourceParticipants.map(p => p.participante_id))
                          } else {
                            setSelectedParticipants([])
                          }
                        }}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <label htmlFor="select-all-participants" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Seleccionar Todos</label>
                    </div>
                  )}
                </div>

                {loadingParticipants ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                  </div>
                ) : sourceParticipants.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--surface)', borderRadius: '1rem', border: '1px dashed var(--border)', color: 'var(--muted)' }}>
                    No hay participantes activos en este grupo para el programa seleccionado.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {sourceParticipants.map((i) => {
                      const isChecked = selectedParticipants.includes(i.participante_id)
                      return (
                        <div
                          key={i.id}
                          onClick={() => {
                            setSelectedParticipants(prev =>
                              prev.includes(i.participante_id)
                                ? prev.filter(id => id !== i.participante_id)
                                : [...prev, i.participante_id]
                            )
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '1rem',
                            background: isChecked ? 'rgba(59, 130, 246, 0.05)' : 'var(--surface)',
                            borderRadius: '1rem',
                            border: `1.5px solid ${isChecked ? 'var(--primary)' : 'var(--border)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => { }} // handled by parent div onClick
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                              {i.participantes?.apellido}, {i.participantes?.nombre}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                              <span>CI: {i.participantes?.ci}</span>
                              {i.participantes?.correo && <span>Correo: {i.participantes.correo}</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Botón de acción */}
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button
                    className="btn btn-primary"
                    disabled={selectedParticipants.length === 0 || !selectedTargetGroup || isUnifying}
                    onClick={async () => {
                      setIsUnifying(true)
                      try {
                        const targetGroupName = groups.find(g => g.id === selectedTargetGroup)?.name || 'destino'
                        const confirmTransfer = window.confirm(`¿Está seguro de que desea trasladar ${selectedParticipants.length} participante(s) al grupo "${targetGroupName}"? Se actualizarán sus fechas de asistencia.`)
                        if (!confirmTransfer) {
                          setIsUnifying(false)
                          return
                        }

                        const res = await transferParticipantsGroup({
                          participantIds: selectedParticipants,
                          targetGroupId: selectedTargetGroup,
                          programaId: selectedProgram
                        })

                        if (res.error) throw new Error(res.error)

                        setNotif({
                          show: true,
                          type: 'success',
                          title: 'Unificación Exitosa',
                          message: `Se trasladaron ${selectedParticipants.length} participantes al grupo "${targetGroupName}" correctamente y sus asistencias fueron sincronizadas.`
                        })

                        // Limpiar selección y recargar
                        setSelectedParticipants([])
                        setSelectedSourceGroup('')
                        setSelectedTargetGroup('')
                      } catch (err: any) {
                        setNotif({
                          show: true,
                          type: 'error',
                          title: 'Error de Transferencia',
                          message: err.message
                        })
                      } finally {
                        setIsUnifying(false)
                      }
                    }}
                    style={{ padding: '0.75rem 2rem' }}
                  >
                    {isUnifying ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                    {isUnifying ? 'Procesando...' : `Unificar / Transferir (${selectedParticipants.length})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Upload Card */
          <div className="card glass" style={{ padding: '3.5rem 2rem', textAlign: 'center', border: '2px dashed var(--border)', background: 'transparent' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '2.25rem',
              background: activeTab === 'participants' ? 'var(--info-light)' : (activeTab === 'users' ? 'var(--primary-light)' : (activeTab === 'assignments' ? 'var(--success-light)' : (activeTab === 'tutores' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)'))),
              color: activeTab === 'participants' ? 'var(--info)' : (activeTab === 'users' ? 'var(--primary)' : (activeTab === 'assignments' ? 'var(--success)' : (activeTab === 'tutores' ? '#8b5cf6' : '#f59e0b'))),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 2rem', boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
            }}>
              {activeTab === 'participants' ? <GraduationCap size={40} /> : (activeTab === 'users' ? <Upload size={40} /> : (activeTab === 'assignments' ? <Database size={40} /> : (activeTab === 'tutores' ? <Users size={40} /> : <Activity size={40} />)))}
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--foreground)', marginBottom: '1rem' }}>
              {activeTab === 'participants' ? 'Migrar Participantes' : (activeTab === 'users' ? 'Migrar Usuarios' : (activeTab === 'assignments' ? 'Asignar Grupos' : (activeTab === 'tutores' ? 'Migrar Tutores' : 'Actualizar Datos por CI')))}
            </h2>
            <p style={{ color: 'var(--foreground-2)', marginBottom: '2.5rem', maxWidth: '500px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
              {activeTab === 'participants'
                ? 'Sube un CSV para inscribir participantes masivamente en grupos y programas.'
                : (activeTab === 'users' ? 'Crea cuentas de acceso administrativo masivamente.' : (activeTab === 'assignments' ? 'Vincula facilitadores con sus grupos académicos.' : (activeTab === 'tutores' ? 'Crea y vincula tutores a sus grupos académicos.' : 'Actualiza formalización (SI/NO) y zona (urbano/rural) masivamente usando el CI.')))}
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
        )}

        {/* Results */}
        {!isUnifying && activeTab !== 'unify_groups' && activeTab !== 'export_excel' && results.length > 0 && (
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
          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '1.5rem' }}>
            {activeTab === 'unify_groups' ? 'Instrucciones de Unificación' : 'Formato Requerido'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {activeTab === 'unify_groups' ? (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--foreground-2)', lineHeight: 1.6 }}>
                  Esta herramienta realiza un traspaso limpio de participantes:
                </p>
                <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Acciones Automáticas</div>
                  <ul style={{ fontSize: '0.75rem', color: 'var(--foreground-2)', paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li><strong>Inscripción:</strong> Se actualiza el grupo en su inscripción del programa activo.</li>
                    <li><strong>Asistencia:</strong> Se alinean las fechas de sus asistencias del módulo para coincidir con las del grupo destino.</li>
                    <li><strong>Calificaciones:</strong> Se conservan intactas, asociadas a los respectivos módulos del participante.</li>
                  </ul>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--foreground-2)', lineHeight: 1.6 }}>
                  Si el grupo de destino no tiene participantes con asistencia registrada, se conservarán las fechas de asistencia del grupo origen como referencia inicial.
                </p>
              </>
            ) : (
              <>
                <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Columnas del CSV</div>
                  <code style={{ fontSize: '0.75rem', color: 'var(--foreground-2)', wordBreak: 'break-all' }}>
                    {activeTab === 'users' && 'nombre, apellidos, ci, correo, password, role, departamento'}
                    {activeTab === 'assignments' && 'facilitador_email, grupo_nombre'}
                    {activeTab === 'participants' && 'nombre, apellido, ci, correo, celular, grupo_nombre, programa_titulo'}
                    {activeTab === 'tutores' && 'nombre, apellido, rol, grupo_nombre, [ci], [correo], [password]'}
                    {activeTab === 'update_fields' && 'ci, formalizacion, zona'}
                  </code>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--foreground-2)', lineHeight: 1.6 }}>
                  {activeTab === 'participants'
                    ? 'El sistema buscará automáticamente el grupo y el programa por su nombre exacto para realizar la inscripción.'
                    : (activeTab === 'tutores'
                      ? 'El sistema creará las cuentas de tutor y las asociará al grupo indicado por nombre exacto.'
                      : (activeTab === 'update_fields'
                        ? 'El sistema actualizará el estado de formalización (SI = formalizado, NO = pendiente) y la zona (urbano/rural) del participante asociado a cada CI.'
                        : 'Asegúrate de que los correos electrónicos sean únicos en el sistema.'))}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <StatusModal show={notif.show} type={notif.type} title={notif.title} message={notif.message} onClose={() => setNotif({ ...notif, show: false })} />
    </div>
  )
}
