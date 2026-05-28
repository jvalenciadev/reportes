'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  LineChart, Line, ComposedChart, Scatter, LabelList, ReferenceLine,
  ScatterChart, ReferenceArea, ZAxis
} from 'recharts'
import {
  FileDown, LayoutDashboard, Users, CheckSquare, TrendingUp,
  Activity, Building2, Database, PieChart as PieIcon,
  BarChart3, Calendar, ArrowUpRight, ArrowDownRight,
  Filter, Layers, Group, AlertTriangle, Zap, Target, MousePointer2, UserCheck,
  Search, ClipboardCheck
} from 'lucide-react'
import * as XLSX from 'xlsx'

// ─── MODULE MULTI-SELECT (Fixed Portal Pattern) ─────────────────────────────
// ─── MODULE MULTI-SELECT (Fixed Portal Pattern) ─────────────────────────────
function ModuleMultiSelect({
  moduleList,
  selectedModules,
  setSelectedModules,
  buttonWidth = 180
}: {
  moduleList: string[]
  selectedModules: string[]
  setSelectedModules: (v: string[]) => void
  buttonWidth?: number
}) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 380 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const updatePosition = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const dropWidth = Math.max(r.width, 380)

      // Prevent overflowing the right edge of the screen
      let left = r.left
      if (typeof window !== 'undefined') {
        const padding = 16
        if (left + dropWidth > window.innerWidth - padding) {
          left = Math.max(padding, window.innerWidth - dropWidth - padding)
        }
      }

      setDropPos({
        top: r.bottom + 6,
        left,
        width: dropWidth
      })
    }
  }, [])

  const toggle = useCallback(() => {
    if (!open) {
      updatePosition()
    }
    setOpen(v => !v)
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  // Helper to format module names creatively and compactly
  const formatModuleName = (name: string) => {
    if (!name) return { prefix: 'Módulo', title: '', short: '' }
    const match = name.match(/Módulo\s*(\d+):?\s*(.*)/i)
    if (match) {
      const num = match[1]
      const rest = match[2]
      return {
        prefix: `Módulo ${num}`,
        title: rest,
        short: `M${num}: ${rest.length > 18 ? rest.substring(0, 16) + '...' : rest}`
      }
    }
    return {
      prefix: 'Módulo',
      title: name,
      short: name.length > 20 ? name.substring(0, 18) + '...' : name
    }
  }

  const label = selectedModules.length === 0
    ? 'Todos los Módulos'
    : selectedModules.length === 1
      ? formatModuleName(selectedModules[0]).short
      : `${selectedModules.length} Módulos`

  const fullTooltip = selectedModules.length === 0
    ? 'Todos los Módulos Académicos Seleccionados'
    : selectedModules.length === 1
      ? selectedModules[0]
      : selectedModules.join(', ')

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        title={fullTooltip}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: '0.8rem',
          fontWeight: 800,
          color: 'var(--foreground)',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 0,
          gap: '0.4rem'
        }}
      >
        <span
          style={{
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            flex: 1,
            color: selectedModules.length === 0 ? 'var(--primary)' : 'var(--foreground)'
          }}
        >
          {selectedModules.length === 0 ? '✨ ' : ''}{label}
        </span>

        {/* Sleek Counter Badge */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: selectedModules.length === 0 ? 'rgba(187, 151, 58, 0.15)' : 'var(--primary)',
          color: selectedModules.length === 0 ? 'var(--primary)' : 'white',
          borderRadius: '2rem',
          fontSize: '0.62rem',
          fontWeight: 900,
          padding: '0.05rem 0.35rem',
          minWidth: '18px',
          height: '14px',
          flexShrink: 0
        }}>
          {selectedModules.length === 0 ? 'ALL' : selectedModules.length}
        </span>

        <span style={{ fontSize: '0.55rem', color: 'var(--muted)', flexShrink: 0, marginLeft: '0.15rem' }}>▼</span>
      </button>

      {open && typeof window !== 'undefined' && document.body && createPortal(
        <>
          {/* Backdrop to close on outside click */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998
            }}
          />
          {/* Floating dropdown rendered at fixed coordinates */}
          <div
            style={{
              position: 'fixed',
              top: dropPos.top,
              left: dropPos.left,
              width: dropPos.width,
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: '320px',
              overflowY: 'auto',
              zIndex: 9999,
              borderRadius: '0.85rem',
              border: '1px solid var(--border-strong)',
              padding: '0.6rem',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              background: 'var(--card-solid)',
              backdropFilter: 'blur(16px)'
            }}
          >
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--foreground-3)', padding: '0.2rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Selección de Módulo Temático
            </div>

            {/* Todos los módulos */}
            <div
              onClick={() => { setSelectedModules([]); setOpen(false) }}
              style={{
                padding: '0.55rem 0.8rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: selectedModules.length === 0 ? 'rgba(187, 151, 58, 0.15)' : 'transparent',
                color: selectedModules.length === 0 ? 'var(--primary)' : 'var(--foreground-2)',
                border: selectedModules.length === 0 ? '1px solid rgba(187, 151, 58, 0.25)' : '1px solid transparent',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (selectedModules.length !== 0) e.currentTarget.style.background = 'var(--surface-hover)'
              }}
              onMouseLeave={(e) => {
                if (selectedModules.length !== 0) e.currentTarget.style.background = 'transparent'
              }}
            >
              <input
                type="checkbox"
                checked={selectedModules.length === 0}
                readOnly
                style={{ pointerEvents: 'none', accentColor: 'var(--primary)', width: '14px', height: '14px' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                ✨ <span>Todos los Módulos Académicos</span>
              </span>
            </div>

            <div style={{ height: '1px', background: 'var(--border)', margin: '0.3rem 0' }} />

            {/* Modules List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', overflowY: 'auto' }}>
              {moduleList.map(m => {
                const isSelected = selectedModules.includes(m)
                const parsed = formatModuleName(m)
                return (
                  <div
                    key={m}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedModules(selectedModules.filter(x => x !== m))
                      } else {
                        setSelectedModules([...selectedModules, m])
                      }
                    }}
                    style={{
                      padding: '0.5rem 0.8rem',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'start',
                      gap: '0.6rem',
                      background: isSelected ? 'rgba(187, 151, 58, 0.08)' : 'transparent',
                      color: isSelected ? 'var(--primary)' : 'var(--foreground-2)',
                      border: isSelected ? '1px solid rgba(187, 151, 58, 0.15)' : '1px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--surface-hover)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      style={{ pointerEvents: 'none', accentColor: 'var(--primary)', marginTop: '2px', width: '13px', height: '13px', flexShrink: 0 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: isSelected ? 'var(--primary)' : 'var(--muted)' }}>
                        {parsed.prefix}
                      </span>
                      <span style={{ fontSize: '0.76rem', lineHeight: '1.3', color: isSelected ? 'var(--foreground)' : 'var(--foreground-2)', wordBreak: 'break-word' }}>
                        {parsed.title}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}


// Custom Tooltip for Recharts to match our premium design
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // For ScatterChart, the name is in payload[0].payload.name
    const data = payload[0].payload;
    const title = data.name || label;
    const isPresencial = data.diaNumber === 6 || data.dia === 6 || (typeof title === 'string' && title.includes('Presencial'));

    return (
      <div className="glass" style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.6rem' }}>
          <p style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: 'var(--primary)' }}>
            {title}
          </p>
          {isPresencial && (
            <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem', borderRadius: '1rem', background: 'rgba(187,151,58,0.15)', color: 'var(--primary)', fontWeight: 800, flexShrink: 0 }}>
              🏢 PRESENCIAL
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: entry.color }} />
                <span style={{ color: 'var(--foreground-2)', fontWeight: 500 }}>{entry.name}:</span>
              </div>
              <span style={{ fontWeight: 800, color: 'var(--foreground)' }}>
                {typeof entry.value === 'number' ? Math.round(entry.value) : entry.value}{entry.unit || ''}
              </span>
            </div>
          ))}
          {data.size && (
            <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.4rem', paddingTop: '0.4rem', fontSize: '0.65rem', color: 'var(--foreground-3)' }}>
              Población Base: <b>{data.size} activos</b>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}

export default function ReportsClient({
  attendanceData = [],
  enrollmentData = [],
  attendanceByModulesData = [],
  gradesData = []
}: {
  attendanceData: any[],
  enrollmentData: any[],
  attendanceByModulesData?: any[],
  gradesData?: any[]
}) {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<'resumen' | 'control_progreso' | 'inscripcion' | 'analisis' | 'operativo' | 'asistencia_modulos' | 'calificaciones_modulos'>('resumen')
  const [selectedDept, setSelectedDept] = useState('all')
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all')
  const [selectedDay, setSelectedDay] = useState<'all' | number>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [localCategory, setLocalCategory] = useState<'all' | 'asistencia' | 'inscripcion'>('all')
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  // --- MATRIX CONTROLS ---
  const [matrixDimension, setMatrixDimension] = useState<'grupo' | 'sede' | 'modulo'>('grupo')
  const [quadrantMode, setQuadrantMode] = useState<'mean' | 'median' | 'fixed'>('mean')

  useEffect(() => { setMounted(true) }, [])

  // --- DESIGN TOKENS ---
  const COLORS = {
    primary: '#bb973a',
    success: '#10d98b',
    warning: '#f5a623',
    danger: '#f74f6b',
    purple: '#a78bfa',
    info: '#0ea5e9',
    muted: '#7070a0',
    gold: '#bb973a'
  }

  const GRADIENTS = {
    primary: ['#bb973a', '#9e7f30'],
    success: ['#10d98b', '#059669'],
    warning: ['#f5a623', '#d97706']
  }

  // --- ADVANCED DATA DERIVATION ---
  const deptoList = useMemo(() => {
    const depts = [...new Set([...attendanceData.map(a => a.dept_name), ...enrollmentData.map(e => e.dept_name)])]
    return depts.filter(d => d && d !== 'S/D').sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [attendanceData, enrollmentData])

  const dayList = useMemo(() => {
    return [...new Set(attendanceData.map(a => a.dia))].sort((a, b) => a - b)
  }, [attendanceData])

  const groupList = useMemo(() => {
    let data = enrollmentData
    if (selectedDept !== 'all') {
      data = data.filter(e => e.dept_name === selectedDept)
    }
    return [...new Set(data.map(g => g.group_name))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  }, [enrollmentData, selectedDept])

  const filteredAttendance = useMemo(() => {
    let data = attendanceData
    if (selectedDept !== 'all') {
      data = data.filter(a => a.dept_name === selectedDept)
    }
    if (selectedGroupFilter !== 'all') {
      data = data.filter(a => a.group_name === selectedGroupFilter)
    }
    if (selectedDay !== 'all') {
      data = data.filter(a => a.dia === selectedDay)
    }
    return data
  }, [attendanceData, selectedDept, selectedGroupFilter, selectedDay])

  const resolvedAttendanceData = useMemo(() => {
    let data = selectedModules.length > 0 ? (attendanceByModulesData || []) : attendanceData
    if (selectedDept !== 'all') {
      data = data.filter(a => a.dept_name === selectedDept)
    }
    if (selectedGroupFilter !== 'all') {
      data = data.filter(a => a.group_name === selectedGroupFilter)
    }
    if (selectedDay !== 'all') {
      data = data.filter(a => a.dia === selectedDay)
    }
    if (selectedModules.length > 0) {
      data = data.filter(a => selectedModules.includes(a.modulo_name))
    }
    return data
  }, [attendanceData, attendanceByModulesData, selectedDept, selectedGroupFilter, selectedDay, selectedModules])

  const filteredEnrollment = useMemo(() => {
    let data = enrollmentData
    if (selectedDept !== 'all') {
      data = data.filter(e => e.dept_name === selectedDept)
    }
    if (selectedGroupFilter !== 'all') {
      data = data.filter(e => e.group_name === selectedGroupFilter)
    }
    return data
  }, [enrollmentData, selectedDept, selectedGroupFilter])

  const moduleList = useMemo(() => {
    const list = [...new Set([
      ...(attendanceByModulesData || []).map(a => a.modulo_name),
      ...(gradesData || []).map(g => g.modulo_name)
    ])].filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    return list
  }, [attendanceByModulesData, gradesData])

  const filteredAttendanceByModules = useMemo(() => {
    let data = attendanceByModulesData || []
    if (selectedDept !== 'all') {
      data = data.filter(a => a.dept_name === selectedDept)
    }
    if (selectedGroupFilter !== 'all') {
      data = data.filter(a => a.group_name === selectedGroupFilter)
    }
    if (selectedDay !== 'all') {
      data = data.filter(a => a.dia === selectedDay)
    }
    if (selectedModules.length > 0) {
      data = data.filter(a => selectedModules.includes(a.modulo_name))
    }
    return data
  }, [attendanceByModulesData, selectedDept, selectedGroupFilter, selectedDay, selectedModules])

  const filteredGrades = useMemo(() => {
    let data = gradesData || []
    if (selectedDept !== 'all') {
      data = data.filter(g => g.dept_name === selectedDept)
    }
    if (selectedGroupFilter !== 'all') {
      data = data.filter(g => g.group_name === selectedGroupFilter)
    }
    if (selectedModules.length > 0) {
      data = data.filter(g => selectedModules.includes(g.modulo_name))
    }
    return data
  }, [gradesData, selectedDept, selectedGroupFilter, selectedModules])

  // --- DEDICATED MATRIX DATASETS (dept + group + day, conditional module/day filters) ---
  const activeModulesForSelectedDay = useMemo(() => {
    if (selectedDay === 'all') return null
    const dayAtt = (attendanceByModulesData || []).filter(a => a.dia === selectedDay)
    return [...new Set(dayAtt.map(a => a.modulo_name))].filter(Boolean)
  }, [attendanceByModulesData, selectedDay])

  const matrixAttendanceData = useMemo(() => {
    let data = selectedModules.length > 0 ? (attendanceByModulesData || []) : attendanceData
    if (selectedDept !== 'all') data = data.filter(a => a.dept_name === selectedDept)
    if (selectedGroupFilter !== 'all') data = data.filter(a => a.group_name === selectedGroupFilter)
    if (selectedDay !== 'all') data = data.filter(a => a.dia === selectedDay)

    if (matrixDimension !== 'modulo' && selectedModules.length > 0) {
      data = data.filter(a => selectedModules.includes(a.modulo_name))
    }
    return data
  }, [attendanceData, attendanceByModulesData, selectedDept, selectedGroupFilter, selectedDay, selectedModules, matrixDimension])

  const matrixAttendanceByModulesData = useMemo(() => {
    let data = attendanceByModulesData || []
    if (selectedDept !== 'all') data = data.filter(a => a.dept_name === selectedDept)
    if (selectedGroupFilter !== 'all') data = data.filter(a => a.group_name === selectedGroupFilter)
    if (selectedDay !== 'all') data = data.filter(a => a.dia === selectedDay)

    if (matrixDimension !== 'modulo' && selectedModules.length > 0) {
      data = data.filter(a => selectedModules.includes(a.modulo_name))
    }
    return data
  }, [attendanceByModulesData, selectedDept, selectedGroupFilter, selectedDay, selectedModules, matrixDimension])

  const matrixGradesData = useMemo(() => {
    let data = gradesData || []
    if (selectedDept !== 'all') data = data.filter(g => g.dept_name === selectedDept)
    if (selectedGroupFilter !== 'all') data = data.filter(g => g.group_name === selectedGroupFilter)

    if (matrixDimension !== 'modulo' && selectedModules.length > 0) {
      data = data.filter(g => selectedModules.includes(g.modulo_name))
    }

    if (selectedDay !== 'all' && activeModulesForSelectedDay && activeModulesForSelectedDay.length > 0) {
      data = data.filter(g => activeModulesForSelectedDay.includes(g.modulo_name))
    }
    return data
  }, [gradesData, selectedDept, selectedGroupFilter, selectedModules, selectedDay, activeModulesForSelectedDay, matrixDimension])

  const filteredAttendanceByModulesSearched = useMemo(() => {
    const filtered = filteredAttendanceByModules.filter(row => {
      const term = searchTerm.toLowerCase()
      return row.group_name?.toLowerCase().includes(term) ||
        row.modulo_name?.toLowerCase().includes(term) ||
        row.dept_name?.toLowerCase().includes(term)
    })
    return [...filtered].sort((a, b) => {
      const deptCompare = (a.dept_name || '').localeCompare(b.dept_name || '', undefined, { sensitivity: 'base' })
      if (deptCompare !== 0) return deptCompare

      const groupCompare = (a.group_name || '').localeCompare(b.group_name || '', undefined, { numeric: true, sensitivity: 'base' })
      if (groupCompare !== 0) return groupCompare

      const moduloCompare = (a.modulo_name || '').localeCompare(b.modulo_name || '', undefined, { sensitivity: 'base' })
      if (moduloCompare !== 0) return moduloCompare

      const diaA = typeof a.dia === 'number' ? a.dia : parseInt(a.dia) || 0
      const diaB = typeof b.dia === 'number' ? b.dia : parseInt(b.dia) || 0
      return diaA - diaB
    })
  }, [filteredAttendanceByModules, searchTerm])

  const filteredGradesSearched = useMemo(() => {
    const filtered = filteredGrades.filter(row => {
      const term = searchTerm.toLowerCase()
      return row.group_name?.toLowerCase().includes(term) ||
        row.modulo_name?.toLowerCase().includes(term) ||
        row.dept_name?.toLowerCase().includes(term)
    })
    return [...filtered].sort((a, b) => {
      const deptCompare = (a.dept_name || '').localeCompare(b.dept_name || '', undefined, { sensitivity: 'base' })
      if (deptCompare !== 0) return deptCompare

      const groupCompare = (a.group_name || '').localeCompare(b.group_name || '', undefined, { numeric: true, sensitivity: 'base' })
      if (groupCompare !== 0) return groupCompare

      return (a.modulo_name || '').localeCompare(b.modulo_name || '', undefined, { sensitivity: 'base' })
    })
  }, [filteredGrades, searchTerm])

  const getShortModuleName = useCallback((fullName: string) => {
    if (!fullName) return ''
    const isLeng = fullName.toLowerCase().includes('lenguaje')
    const isMat = fullName.toLowerCase().includes('matemática') || fullName.toLowerCase().includes('matematica')
    const match = fullName.match(/Módulo\s*(\d+)/i)
    const modNum = match ? `M${match[1]}` : ''
    let prefix = ''
    if (isLeng) prefix = 'Leng.'
    else if (isMat) prefix = 'Mat.'
    else prefix = fullName.split(':')[0].substring(0, 8)
    return `${prefix} ${modNum}`.trim() || fullName.substring(0, 10)
  }, [])

  // --- CONTROL DE PROGRESO Y CUMPLIMIENTO ENGINE ---
  const controlProgresoData = useMemo(() => {
    return enrollmentData.map(group => {
      const groupGrades = (gradesData || []).filter(g => g.group_name === group.group_name)
      const groupAttendance = (attendanceByModulesData || []).filter(a => a.group_name === group.group_name)

      const modulesProgress = moduleList.map(modName => {
        const modGrade = groupGrades.find(g => g.modulo_name === modName)
        const totalCalificados = modGrade ? modGrade.total_calificados : 0

        const modAtt = groupAttendance.filter(a => a.modulo_name === modName)

        // Calcular asistencias por día exacto
        const daysMap: Record<number, { total: number; asistieron: number; atraso: number; falta: number; permiso: number }> = {}
        modAtt.forEach(attRecord => {
          const diaNum = Number(attRecord.dia)
          const totalDayRecords = (attRecord.asistieron || 0) + (attRecord.atraso || 0) + (attRecord.falta || 0) + (attRecord.permiso || 0)
          daysMap[diaNum] = {
            total: totalDayRecords,
            asistieron: attRecord.asistieron || 0,
            atraso: attRecord.atraso || 0,
            falta: attRecord.falta || 0,
            permiso: attRecord.permiso || 0
          }
        })

        const activeDays = modAtt.map(a => a.dia)
        const filledDays = [...new Set(activeDays)].sort((a, b) => a - b)

        return {
          modulo_name: modName,
          total_calificados: totalCalificados,
          filledDays,
          daysMap
        }
      })

      return {
        ...group,
        modulesProgress
      }
    })
  }, [enrollmentData, gradesData, attendanceByModulesData, moduleList])

  const filteredControlProgresoData = useMemo(() => {
    let data = controlProgresoData
    if (selectedDept !== 'all') {
      data = data.filter(g => g.dept_name === selectedDept)
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      data = data.filter(g =>
        g.group_name.toLowerCase().includes(term) ||
        g.dept_name.toLowerCase().includes(term)
      )
    }
    return data
  }, [controlProgresoData, selectedDept, searchTerm])


  // --- SENIOR METRICS ENGINE ---
  const metrics = useMemo(() => {
    const att = resolvedAttendanceData
    const enr = filteredEnrollment

    const total_inscritos = enr.reduce((acc, curr) => acc + (curr.total_inscritos || 0), 0)
    const total_confirmados = enr.reduce((acc, curr) => acc + (curr.total_confirmados || 0), 0)
    const total_docs_pre = enr.reduce((acc, curr) => acc + (curr.preinscritos_entrego || 0), 0)
    const total_docs_ins = enr.reduce((acc, curr) => acc + (curr.inscritos_entrego || 0), 0)

    const total_asistieron = att.reduce((acc, curr) => acc + (curr.asistieron || 0), 0)
    const total_atrasos = att.reduce((acc, curr) => acc + (curr.atraso || 0), 0)
    const total_faltas = att.reduce((acc, curr) => acc + (curr.falta || 0), 0)
    const total_permisos = att.reduce((acc, curr) => acc + (curr.permiso || 0), 0)

    const total_esperado = total_asistieron + total_atrasos + total_faltas + total_permisos
    const attendance_rate = total_esperado > 0 ? (total_asistieron / total_esperado) * 100 : 0
    const confirmation_rate = total_inscritos > 0 ? (total_confirmados / total_inscritos) * 100 : 0

    // Efficiency Index: Combines confirmation and attendance
    const efficiency_score = (confirmation_rate * (attendance_rate / 100))

    const activeDays = [...new Set(att.map(a => a.dia))]
    const avg_per_day = selectedDay === 'all'
      ? Math.round(total_asistieron / (activeDays.length || 1))
      : total_asistieron

    return {
      total_inscritos,
      total_confirmados,
      total_docs_pre,
      total_docs_ins,
      total_asistieron,
      total_atrasos,
      total_faltas,
      total_permisos,
      attendance_rate: Math.round(attendance_rate).toString(),
      confirmation_rate: Math.round(confirmation_rate).toString(),
      efficiency_score: Math.round(efficiency_score).toString(),
      dropout_rate: Math.round(100 - attendance_rate).toString(),
      avg_per_day: avg_per_day
    }
  }, [resolvedAttendanceData, filteredEnrollment, selectedDay])

  // --- CHART DATA GENERATION ---

  // 1. Attendance Distribution (Pie)
  const attendanceDistribution = useMemo(() => [
    { name: 'Asistencias', value: metrics.total_asistieron },
    { name: 'Atrasos', value: metrics.total_atrasos },
    { name: 'Faltas', value: metrics.total_faltas },
    { name: 'Permisos', value: metrics.total_permisos }
  ].filter(i => i.value > 0), [metrics])

  // 2. Departmental Comparison (Stacked Bar)
  const departmentalComparison = useMemo(() => {
    return deptoList.map(dept => {
      const deptEnr = enrollmentData.filter(e => e.dept_name === dept)
      const inscritos = deptEnr.reduce((acc, curr) => acc + (curr.total_inscritos || 0), 0)
      const confirmados = deptEnr.reduce((acc, curr) => acc + (curr.total_confirmados || 0), 0)
      const docs_pre = deptEnr.reduce((acc, curr) => acc + (curr.preinscritos_entrego || 0), 0)
      const docs_ins = deptEnr.reduce((acc, curr) => acc + (curr.inscritos_entrego || 0), 0)
      return {
        name: dept,
        Inscritos: confirmados,
        Pendientes: Math.max(0, inscritos - confirmados),
        Docs_Pre: docs_pre,
        Docs_Ins: docs_ins
      }
    })
  }, [enrollmentData, deptoList])

  const getDayLabel = useCallback((dia: number, shortModName?: string) => {
    const sem = dia <= 2 ? 1 : dia <= 4 ? 2 : 3
    const isPresencial = dia === 6
    const label = `Sem ${sem} - D${dia}${isPresencial ? ' (Presencial)' : ''}`
    if (shortModName) {
      return `${shortModName} (${label})`
    }
    return label
  }, [])

  // 3. Daily Attendance Trend (Area Chart) - Shows overall days context with specific day highlighted
  const dailyTrend = useMemo(() => {
    let baseData = (attendanceByModulesData || [])

    if (selectedDept !== 'all') {
      baseData = baseData.filter(a => a.dept_name === selectedDept)
    }
    if (selectedGroupFilter !== 'all') {
      baseData = baseData.filter(a => a.group_name === selectedGroupFilter)
    }

    if (selectedModules.length > 0) {
      // Show days for only the selected modules
      const filtered = baseData.filter(a => selectedModules.includes(a.modulo_name))
      const days = [...new Set(filtered.map(a => a.dia))].sort((a, b) => a - b)

      if (selectedModules.length === 1) {
        return days.map(dia => {
          const dayData = filtered.filter(a => a.dia === dia)
          return {
            name: getDayLabel(dia),
            diaNumber: dia,
            Asistieron: dayData.reduce((acc, curr) => acc + (curr.asistieron || 0), 0),
            Atrasos: dayData.reduce((acc, curr) => acc + (curr.atraso || 0), 0),
            Faltas: dayData.reduce((acc, curr) => acc + (curr.falta || 0), 0),
            Permisos: dayData.reduce((acc, curr) => acc + (curr.permiso || 0), 0),
            Total: dayData.reduce((acc, curr) => acc + (curr.asistieron + curr.atraso + curr.falta + curr.permiso), 0)
          }
        })
      } else {
        // Group by both module and day
        const uniqueKeys = new Map<string, { modulo_name: string, dia: number }>()
        filtered.forEach(a => {
          if (a.modulo_name) {
            const key = `${a.modulo_name}|||${a.dia}`
            uniqueKeys.set(key, { modulo_name: a.modulo_name, dia: a.dia })
          }
        })

        const combos = Array.from(uniqueKeys.values())

        combos.sort((a, b) => {
          const modComp = a.modulo_name.localeCompare(b.modulo_name, undefined, { sensitivity: 'base' })
          if (modComp !== 0) return modComp
          return a.dia - b.dia
        })

        return combos.map(combo => {
          const comboData = filtered.filter(a => a.modulo_name === combo.modulo_name && a.dia === combo.dia)

          const isLeng = combo.modulo_name.toLowerCase().includes('lenguaje')
          const isMat = combo.modulo_name.toLowerCase().includes('matemática') || combo.modulo_name.toLowerCase().includes('matematica')
          const match = combo.modulo_name.match(/Módulo\s*(\d+)/i)
          const modNum = match ? `M${match[1]}` : ''
          let prefix = ''
          if (isLeng) prefix = 'Leng.'
          else if (isMat) prefix = 'Mat.'
          else prefix = combo.modulo_name.split(':')[0].substring(0, 8)

          const shortName = `${prefix} ${modNum}`.trim()

          return {
            name: getDayLabel(combo.dia, shortName),
            diaNumber: combo.dia,
            modulo_name: combo.modulo_name,
            Asistieron: comboData.reduce((acc, curr) => acc + (curr.asistieron || 0), 0),
            Atrasos: comboData.reduce((acc, curr) => acc + (curr.atraso || 0), 0),
            Faltas: comboData.reduce((acc, curr) => acc + (curr.falta || 0), 0),
            Permisos: comboData.reduce((acc, curr) => acc + (curr.permiso || 0), 0),
            Total: comboData.reduce((acc, curr) => acc + (curr.asistieron + curr.atraso + curr.falta + curr.permiso), 0)
          }
        })
      }
    } else {
      // Group by both module and day
      const uniqueKeys = new Map<string, { modulo_name: string, dia: number }>()
      baseData.forEach(a => {
        if (a.modulo_name) {
          const key = `${a.modulo_name}|||${a.dia}`
          uniqueKeys.set(key, { modulo_name: a.modulo_name, dia: a.dia })
        }
      })

      const combos = Array.from(uniqueKeys.values())

      // Sort combos by modulo_name first, then by dia
      combos.sort((a, b) => {
        const modComp = a.modulo_name.localeCompare(b.modulo_name, undefined, { sensitivity: 'base' })
        if (modComp !== 0) return modComp
        return a.dia - b.dia
      })

      // Generate chart data for each combo
      return combos.map(combo => {
        const comboData = baseData.filter(a => a.modulo_name === combo.modulo_name && a.dia === combo.dia)

        // Short module name
        const isLeng = combo.modulo_name.toLowerCase().includes('lenguaje')
        const isMat = combo.modulo_name.toLowerCase().includes('matemática') || combo.modulo_name.toLowerCase().includes('matematica')
        const match = combo.modulo_name.match(/Módulo\s*(\d+)/i)
        const modNum = match ? `M${match[1]}` : ''
        let prefix = ''
        if (isLeng) prefix = 'Leng.'
        else if (isMat) prefix = 'Mat.'
        else prefix = combo.modulo_name.split(':')[0].substring(0, 8)

        const shortName = `${prefix} ${modNum}`.trim()

        return {
          name: getDayLabel(combo.dia, shortName),
          diaNumber: combo.dia,
          modulo_name: combo.modulo_name,
          Asistieron: comboData.reduce((acc, curr) => acc + (curr.asistieron || 0), 0),
          Atrasos: comboData.reduce((acc, curr) => acc + (curr.atraso || 0), 0),
          Faltas: comboData.reduce((acc, curr) => acc + (curr.falta || 0), 0),
          Permisos: comboData.reduce((acc, curr) => acc + (curr.permiso || 0), 0),
          Total: comboData.reduce((acc, curr) => acc + (curr.asistieron + curr.atraso + curr.falta + curr.permiso), 0)
        }
      })
    }
  }, [attendanceByModulesData, selectedDept, selectedGroupFilter, selectedModules])


  // --- ANOMALY DETECTION (Senior Feature) ---
  const anomalies = useMemo(() => {
    const groupStats = [...new Set(resolvedAttendanceData.map(a => a.group_name))].map(gn => {
      const gData = resolvedAttendanceData.filter(a => a.group_name === gn)
      const ok = gData.reduce((acc, curr) => acc + curr.asistieron, 0)
      const err = gData.reduce((acc, curr) => acc + curr.falta, 0)
      const total = ok + err || 1
      return { name: gn, rate: (ok / total) * 100, count: gData.length }
    })
    return groupStats.filter(g => g.rate < 60 && g.count > 0).sort((a, b) => a.rate - b.rate).slice(0, 5)
  }, [resolvedAttendanceData])

  // --- COMPARATIVE PERFORMANCE (Dimensional Scatter Plot) ---
  // Uses dedicated matrix datasets that are NOT affected by selectedModuleFilter,
  // so the matrix always has full coverage across all dimensions (grupo/sede/modulo).
  const performanceMatrix = useMemo(() => {
    if (matrixDimension === 'grupo') {
      return filteredEnrollment.map(g => {
        // Use matrixAttendanceData: main attendance filtered by dept+group+day only
        const gAtt = matrixAttendanceData.filter(a => a.group_name === g.group_name)
        const ok = gAtt.reduce((acc, curr) => acc + curr.asistieron, 0)
        const total = gAtt.reduce((acc, curr) => acc + (curr.asistieron + curr.atraso + curr.falta + curr.permiso), 0)
        // Use matrixGradesData: grades filtered by dept+group only (no module filter)
        const gGrades = matrixGradesData.filter(gr => gr.group_name === g.group_name)
        const totalCalificados = gGrades.reduce((acc, curr) => acc + (curr.total_calificados || 0), 0)
        const aprobados = gGrades.reduce((acc, curr) => acc + (curr.aprobados || 0), 0)
        const sumaTotal = gGrades.reduce((acc, curr) => acc + (curr.suma_total || 0), 0)
        const asistenciaRate = total > 0 ? (ok / total) * 100 : 0
        const notaPromedio = totalCalificados > 0 ? (sumaTotal / totalCalificados) : 0
        const tasaAprobacion = totalCalificados > 0 ? (aprobados / totalCalificados) * 100 : 0
        return {
          name: g.group_name,
          dept: g.dept_name,
          asistencia: Math.round(asistenciaRate),
          nota: Math.round(notaPromedio),
          aprobacion: Math.round(tasaAprobacion),
          size: g.total_confirmados || 1
        }
      }).filter(item => item.asistencia > 0 || item.nota > 0)
    }

    if (matrixDimension === 'sede') {
      const depts = [...new Set(filteredEnrollment.map(e => e.dept_name))].filter(Boolean)
      return depts.map(dept => {
        const dEnr = filteredEnrollment.filter(e => e.dept_name === dept)
        const dAtt = matrixAttendanceData.filter(a => a.dept_name === dept)
        const ok = dAtt.reduce((acc, curr) => acc + curr.asistieron, 0)
        const total = dAtt.reduce((acc, curr) => acc + (curr.asistieron + curr.atraso + curr.falta + curr.permiso), 0)
        const dGrades = matrixGradesData.filter(gr => gr.dept_name === dept)
        const totalCalificados = dGrades.reduce((acc, curr) => acc + (curr.total_calificados || 0), 0)
        const sumaTotal = dGrades.reduce((acc, curr) => acc + (curr.suma_total || 0), 0)
        const aprobados = dGrades.reduce((acc, curr) => acc + (curr.aprobados || 0), 0)
        const size = dEnr.reduce((acc, curr) => acc + (curr.total_confirmados || 0), 0)
        return {
          name: dept,
          dept,
          asistencia: Math.round(total > 0 ? ((ok / total) * 100) : 0),
          nota: Math.round(totalCalificados > 0 ? (sumaTotal / totalCalificados) : 0),
          aprobacion: Math.round(totalCalificados > 0 ? ((aprobados / totalCalificados) * 100) : 0),
          size: size || 1
        }
      }).filter(item => item.asistencia > 0 || item.nota > 0)
    }

    // matrixDimension === 'modulo'
    // Uses matrixGradesData + matrixAttendanceByModulesData (NO module filter applied)
    // so ALL modules are visible regardless of the global module selector
    const mods = [...new Set(matrixGradesData.map(g => g.modulo_name))].filter(Boolean)
    return mods.map(mod => {
      const mGrades = matrixGradesData.filter(gr => gr.modulo_name === mod)
      const mAtt = matrixAttendanceByModulesData.filter(a => a.modulo_name === mod)
      const ok = mAtt.reduce((acc, curr) => acc + curr.asistieron, 0)
      const total = mAtt.reduce((acc, curr) => acc + (curr.asistieron + curr.atraso + curr.falta + curr.permiso), 0)
      const totalCalificados = mGrades.reduce((acc, curr) => acc + (curr.total_calificados || 0), 0)
      const sumaTotal = mGrades.reduce((acc, curr) => acc + (curr.suma_total || 0), 0)
      const aprobados = mGrades.reduce((acc, curr) => acc + (curr.aprobados || 0), 0)
      return {
        name: mod,
        dept: '',
        asistencia: Math.round(total > 0 ? ((ok / total) * 100) : 0),
        nota: Math.round(totalCalificados > 0 ? (sumaTotal / totalCalificados) : 0),
        aprobacion: Math.round(totalCalificados > 0 ? ((aprobados / totalCalificados) * 100) : 0),
        size: totalCalificados || 1
      }
    }).filter(item => item.asistencia > 0 || item.nota > 0)
  }, [filteredEnrollment, matrixAttendanceData, matrixAttendanceByModulesData, matrixGradesData, matrixDimension])

  // --- ADVANCED STATISTICAL ENGINE ---
  const matrixStats = useMemo(() => {
    const data = performanceMatrix
    const n = data.length
    if (n === 0) return {
      meanAsistencia: 75, meanNota: 70,
      medianAsistencia: 75, medianNota: 70,
      stdAsistencia: 0, stdNota: 0,
      pearsonR: 0, rSquared: 0,
      regressionLine: [] as { x: number, y: number }[],
      interpretation: 'Sin datos suficientes'
    }

    // Means
    const sumA = data.reduce((acc, d) => acc + d.asistencia, 0)
    const sumN = data.reduce((acc, d) => acc + d.nota, 0)
    const meanA = sumA / n
    const meanN = sumN / n

    // Medians
    const sortedA = [...data].sort((a, b) => a.asistencia - b.asistencia).map(d => d.asistencia)
    const sortedN = [...data].sort((a, b) => a.nota - b.nota).map(d => d.nota)
    const midA = Math.floor(n / 2)
    const midN = Math.floor(n / 2)
    const medianA = n % 2 !== 0 ? sortedA[midA] : (sortedA[midA - 1] + sortedA[midA]) / 2
    const medianN = n % 2 !== 0 ? sortedN[midN] : (sortedN[midN - 1] + sortedN[midN]) / 2

    // Standard Deviations
    const varA = data.reduce((acc, d) => acc + Math.pow(d.asistencia - meanA, 2), 0) / n
    const varN = data.reduce((acc, d) => acc + Math.pow(d.nota - meanN, 2), 0) / n
    const stdA = Math.sqrt(varA)
    const stdN = Math.sqrt(varN)

    // Pearson Correlation Coefficient
    const covAN = data.reduce((acc, d) => acc + (d.asistencia - meanA) * (d.nota - meanN), 0) / n
    const pearsonR = (stdA > 0 && stdN > 0) ? covAN / (stdA * stdN) : 0
    const rSquared = pearsonR * pearsonR

    // Linear Regression: y = m*x + b
    const sxx = data.reduce((acc, d) => acc + Math.pow(d.asistencia - meanA, 2), 0)
    const sxy = data.reduce((acc, d) => acc + (d.asistencia - meanA) * (d.nota - meanN), 0)
    const m = sxx > 0 ? sxy / sxx : 0
    const b = meanN - m * meanA

    // Generate 12 points for the regression line across x domain
    const xMin = Math.max(0, Math.min(...data.map(d => d.asistencia)) - 5)
    const xMax = Math.min(100, Math.max(...data.map(d => d.asistencia)) + 5)
    const step = (xMax - xMin) / 11
    const regressionLine = Array.from({ length: 12 }, (_, i) => {
      const x = parseFloat((xMin + i * step).toFixed(1))
      const y = parseFloat(Math.min(100, Math.max(0, m * x + b)).toFixed(1))
      return { x, y }
    })

    // Semantic interpretation of Pearson R
    let interpretation = ''
    const absR = Math.abs(pearsonR)
    if (absR >= 0.7) interpretation = pearsonR > 0 ? 'Correlación positiva fuerte: la asistencia predice sólidamente el rendimiento académico.' : 'Correlación negativa fuerte: a mayor asistencia, menor nota (paradoja o sesgo en datos).'
    else if (absR >= 0.4) interpretation = pearsonR > 0 ? 'Correlación positiva moderada: la asistencia influye parcialmente en las notas.' : 'Correlación negativa moderada: revisar grupos de alto absentismo y buenas notas.'
    else if (absR >= 0.2) interpretation = 'Correlación débil: otros factores (calidad docente, modalidad) dominan el rendimiento.'
    else interpretation = 'Correlación nula o muy baja: la asistencia no explica las diferencias de nota en este cohorte.'

    return {
      meanAsistencia: Math.round(meanA),
      meanNota: Math.round(meanN),
      medianAsistencia: Math.round(medianA),
      medianNota: Math.round(medianN),
      stdAsistencia: Math.round(stdA),
      stdNota: Math.round(stdN),
      pearsonR: parseFloat(pearsonR.toFixed(3)),
      rSquared: parseFloat(rSquared.toFixed(3)),
      regressionLine,
      interpretation
    }
  }, [performanceMatrix])

  const gradesPerformanceData = useMemo(() => {
    const data = filteredGrades
    const groupByField = selectedModules.length === 1 ? 'group_name' : 'modulo_name'
    const uniqueKeys = [...new Set(data.map(g => g[groupByField]))].filter(Boolean)
    return uniqueKeys.map(key => {
      const groupData = data.filter(g => g[groupByField] === key)
      const calificados = groupData.reduce((acc, curr) => acc + (curr.total_calificados || 0), 0)
      const aprobados = groupData.reduce((acc, curr) => acc + (curr.aprobados || 0), 0)
      const reprobados = groupData.reduce((acc, curr) => acc + (curr.reprobados || 0), 0)
      const conNota = groupData.reduce((acc, curr) => acc + (curr.total_con_nota || 0), 0)
      const suma_total_con_nota = groupData.reduce((acc, curr) => acc + (curr.suma_total_con_nota || 0), 0)
      const promedio = conNota > 0 ? (suma_total_con_nota / conNota) : 0
      return {
        name: key,
        Aprobados: aprobados,
        Reprobados: reprobados,
        Calificados: calificados,
        Promedio: Math.round(promedio)
      }
    })
  }, [filteredGrades, selectedModules])

  if (!mounted) return null

  const exportAll = () => {
    const ws1 = XLSX.utils.json_to_sheet(attendanceData)
    const ws2 = XLSX.utils.json_to_sheet(enrollmentData)
    const ws3 = XLSX.utils.json_to_sheet(attendanceByModulesData)
    const ws4 = XLSX.utils.json_to_sheet(gradesData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, "Asistencias")
    XLSX.utils.book_append_sheet(wb, ws2, "Inscripciones")
    XLSX.utils.book_append_sheet(wb, ws3, "Asistencias por Módulos")
    XLSX.utils.book_append_sheet(wb, ws4, "Calificaciones por Módulos")
    XLSX.writeFile(wb, `PROFE_Master_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Dynamic Navigation Bar */}
      <div className="glass card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--surface)', padding: '0.3rem', borderRadius: '0.85rem' }}>
          <TabBtn active={tab === 'resumen'} onClick={() => setTab('resumen')} icon={LayoutDashboard} label="Dashboard" />
          <TabBtn active={tab === 'analisis'} onClick={() => setTab('analisis')} icon={Zap} label="Análisis Estratégico" />
          <TabBtn active={tab === 'operativo'} onClick={() => setTab('operativo')} icon={Layers} label="Ficha Operativa" />
          <TabBtn active={tab === 'asistencia_modulos'} onClick={() => setTab('asistencia_modulos')} icon={CheckSquare} label="Asistencia por Módulos" />
          <TabBtn active={tab === 'calificaciones_modulos'} onClick={() => setTab('calificaciones_modulos')} icon={TrendingUp} label="Calificaciones por Módulos" />
          <TabBtn active={tab === 'control_progreso'} onClick={() => setTab('control_progreso')} icon={ClipboardCheck} label="Control de Progreso" />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="glass" style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)' }}>
            <Filter size={16} color="var(--primary)" />
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value)
                setSelectedGroupFilter('all')
              }}
              style={{ border: 'none', background: 'transparent', fontWeight: 700, outline: 'none', color: 'var(--foreground)' }}
            >
              <option value="all">Filtro Nacional</option>
              {deptoList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={exportAll}>
            <FileDown size={18} /> Master Export
          </button>
        </div>
      </div>

      {/* Centralized Slice & Dice BI Control Panel */}
      {(tab === 'resumen' || tab === 'analisis') && (
        <div className="glass card animate-fade-up" style={{
          padding: '1.25rem 1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          borderLeft: '4px solid var(--primary)',
          background: 'linear-gradient(to right, var(--surface), transparent)',
          boxShadow: 'var(--shadow-md)',
          borderRadius: '1rem',
          marginTop: '-0.5rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--foreground-3)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building2 size={13} color="var(--primary)" /> Sede (Departamento)
            </span>
            <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value)
                  setSelectedGroupFilter('all')
                }}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)', cursor: 'pointer' }}
              >
                <option value="all">Todas las Sedes (Nacional)</option>
                {deptoList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--foreground-3)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Group size={13} color="var(--success)" /> Grupo de Alumnos
            </span>
            <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)', cursor: 'pointer' }}
              >
                <option value="all">Todos los Grupos</option>
                {groupList.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--foreground-3)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={13} color="var(--info)" /> Módulo Temático
            </span>
            <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <ModuleMultiSelect
                moduleList={moduleList}
                selectedModules={selectedModules}
                setSelectedModules={setSelectedModules}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--foreground-3)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={13} color="var(--warning)" /> Jornada de Día
            </span>
            <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)', cursor: 'pointer' }}
              >
                <option value="all">Todas las Jornadas (Promedio)</option>
                {dayList.map(d => <option key={d} value={d}>Día {d}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main KPI Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <KPI title="Activos Total" value={metrics.total_confirmados} icon={UserCheck} color={COLORS.success} subtitle="Activos confirmados" />
        <KPI title="Tasa de Inscripción" value={`${metrics.confirmation_rate}%`} icon={Target} color={COLORS.info} subtitle="Compromiso inicial" />
        <KPI title="Docs (Activos)" value={metrics.total_docs_ins} icon={CheckSquare} color={COLORS.success} subtitle="Entregados por activos" />
        <KPI title="Efectividad de Asistencia" value={`${metrics.attendance_rate}%`} icon={Zap} color={COLORS.success} subtitle="Asistencia real vs esperada" />
        <KPI title="Score de Eficiencia" value={metrics.efficiency_score} icon={MousePointer2} color={COLORS.gold} subtitle="Cálculo algorítmico" />
      </div>

      {tab === 'resumen' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '2rem' }}>


          {/* Daily Trend with Anomaly Highlight */}
          <ChartCard title="Tendencia de Participación Diaria" icon={Activity}>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--chart-text)" fontSize={11} axisLine={false} tickLine={false} label={{ value: 'Cantidad de Asistencias', angle: -90, position: 'insideLeft', style: { fill: 'var(--chart-text)', fontSize: 10, fontWeight: 700 } }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '10px' }} />
                <Line type="monotone" dataKey="Asistieron" name="Asistencias (incl. Atrasos)" stroke={COLORS.success} strokeWidth={3} dot={{ r: 4, fill: COLORS.success }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Faltas" name="Faltas" stroke={COLORS.danger} strokeWidth={2} dot={{ r: 3, fill: COLORS.danger }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Permisos" name="Permisos" stroke={COLORS.muted} strokeWidth={2} dot={{ r: 3, fill: COLORS.muted }} activeDot={{ r: 5 }} />
                {selectedDay !== 'all' && dailyTrend
                  .filter(d => d.diaNumber === selectedDay)
                  .map(d => (
                    <ReferenceLine
                      key={d.name}
                      x={d.name}
                      stroke={COLORS.purple}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{ position: 'top', value: `D${selectedDay}`, fill: COLORS.purple, fontSize: 9, fontWeight: 900 }}
                    />
                  ))
                }
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Rendimiento Académico por Módulo / Grupo */}
          <ChartCard
            title={
              selectedModules.length === 1
                ? `Rendimiento Académico: ${selectedModules[0]} (por Grupo)`
                : selectedModules.length > 1
                  ? `Rendimiento Académico: ${selectedModules.length} Módulos (por Grupo)`
                  : 'Rendimiento Académico por Módulo'
            }
            icon={Target}
          >
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={gradesPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" stroke="var(--chart-text)" fontSize={11} axisLine={false} tickLine={false} label={{ value: 'Estudiantes', angle: -90, position: 'insideLeft', style: { fill: 'var(--chart-text)', fontSize: 10, fontWeight: 700 } }} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--chart-text)" fontSize={11} axisLine={false} tickLine={false} domain={[0, 100]} label={{ value: 'Promedio Nota', angle: 90, position: 'insideRight', style: { fill: 'var(--chart-text)', fontSize: 10, fontWeight: 700 } }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '10px' }} />
                <Bar yAxisId="left" dataKey="Aprobados" name="Aprobados" stackId="g" fill={COLORS.success} barSize={30} />
                <Bar yAxisId="left" dataKey="Reprobados" name="Reprobados" stackId="g" fill={COLORS.danger} />
                <Line yAxisId="right" type="monotone" dataKey="Promedio" name="Nota Promedio" stroke={COLORS.primary} strokeWidth={3} dot={{ r: 5, fill: COLORS.primary }} activeDot={{ r: 7 }} unit="/100" />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Anomaly Alerts Table */}
          <ChartCard title="Alertas de Deserción Crítica (Grupos < 60%)" icon={AlertTriangle}>
            <div className="table-container" style={{ maxHeight: '300px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Grupo Crítico</th>
                    <th>Asistencia %</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((a, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{a.name}</td>
                      <td style={{ color: COLORS.danger, fontWeight: 900 }}>{Math.round(a.rate)}%</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: COLORS.danger }}>ACCIÓN URGENTE</span>
                      </td>
                    </tr>
                  ))}
                  {anomalies.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--success)' }}>No se detectan anomalías críticas.</td></tr>}
                </tbody>
              </table>
            </div>
          </ChartCard>

          {/* KPI Distribution */}
          <ChartCard title="Balance Operativo Global" icon={PieIcon}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={attendanceDistribution} innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                  {attendanceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % 8]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>
      ) : tab === 'analisis' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

          {/* Strategic Insight Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="glass card" style={{ padding: '1.5rem', borderLeft: `6px solid ${COLORS.success}` }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--success-light)', color: COLORS.success, borderRadius: '0.5rem' }}><Zap size={20} /></div>
                <h4 style={{ margin: 0, fontWeight: 800 }}>Líder de Eficiencia</h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--foreground-2)' }}>
                El departamento de <b>{departmentalComparison[0]?.name}</b> lidera la conversión con un <b>{Math.round((departmentalComparison[0]?.Inscritos / metrics.total_inscritos) * 100)}%</b> del total nacional.
              </p>
            </div>
            <div className="glass card" style={{ padding: '1.5rem', borderLeft: `6px solid ${COLORS.danger}` }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--danger-light)', color: COLORS.danger, borderRadius: '0.5rem' }}><AlertTriangle size={20} /></div>
                <h4 style={{ margin: 0, fontWeight: 800 }}>Zona de Riesgo</h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--foreground-2)' }}>
                Se detectan <b>{anomalies.length} grupos</b> en zona crítica. La correlación sugiere que una baja inscripción (&lt;40%) predice deserción masiva.
              </p>
            </div>
          </div>

          {/* ===== PERFORMANCE BUBBLE MATRIX - SENIOR UPGRADE ===== */}
          <ChartCard
            title="Matriz de Rendimiento Estratégico (Bubble View)"
            icon={Target}
            span={2}
            extra={
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Dimension Selector */}
                <div className="glass" style={{ padding: '0.3rem 0.7rem', borderRadius: '0.5rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={13} color="var(--primary)" />
                  <select
                    value={matrixDimension}
                    onChange={(e) => setMatrixDimension(e.target.value as any)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.72rem', fontWeight: 800, color: 'var(--foreground)', cursor: 'pointer' }}
                  >
                    <option value="grupo">Por Grupo</option>
                    <option value="sede">Por Sede</option>
                    <option value="modulo">Por Módulo</option>
                  </select>
                </div>
                {/* Quadrant Mode Selector */}
                <div className="glass" style={{ padding: '0.3rem 0.7rem', borderRadius: '0.5rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Target size={13} color="var(--warning)" />
                  <select
                    value={quadrantMode}
                    onChange={(e) => setQuadrantMode(e.target.value as any)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.72rem', fontWeight: 800, color: 'var(--foreground)', cursor: 'pointer' }}
                  >
                    <option value="mean">Límites: Media (μ)</option>
                    <option value="median">Límites: Mediana (Md)</option>
                    <option value="fixed">Límites: Fijos (80%/70)</option>
                  </select>
                </div>
                {/* Day selector */}
                <div className="glass" style={{ padding: '0.3rem 0.7rem', borderRadius: '0.5rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={13} color="var(--success)" />
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.72rem', fontWeight: 800, color: 'var(--foreground)', cursor: 'pointer' }}
                  >
                    <option value="all">Consolidado Total</option>
                    {dayList.map(d => <option key={d} value={d}>Día {d}</option>)}
                  </select>
                </div>
              </div>
            }
          >
            {/* Description banner */}
            <div style={{ padding: '0.85rem 1.1rem', borderRadius: '0.75rem', background: 'rgba(79, 142, 247, 0.05)', border: '1px solid rgba(79, 142, 247, 0.15)', marginBottom: '1.5rem', fontSize: '0.82rem', color: 'var(--foreground-2)', lineHeight: '1.5' }}>
              <b style={{ color: 'var(--primary)' }}>Análisis Bidimensional de Cohorte</b> · Eje X = Asistencia Promedio (%) · Eje Y = Nota Promedio (pts) · Tamaño = Población inscrita confirmada.
              {' '}Las líneas discontinuas son los límites de cuadrante (<b>{quadrantMode === 'mean' ? `Media μ` : quadrantMode === 'median' ? 'Mediana Md' : 'Fijos'}</b>).
              {' '}La línea diagonal punteada es la <b>recta de regresión lineal OLS</b> (mínimos cuadrados).
            </div>

            {/* Main Grid: Chart (70%) + Stats Panel (30%) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }}>

              {/* === SCATTER CHART === */}
              <div style={{ background: 'var(--surface)', borderRadius: '1rem', padding: '1rem' }}>
                {(() => {
                  // Compute active thresholds
                  const threshA = quadrantMode === 'mean' ? matrixStats.meanAsistencia
                    : quadrantMode === 'median' ? matrixStats.medianAsistencia
                      : 80
                  const threshN = quadrantMode === 'mean' ? matrixStats.meanNota
                    : quadrantMode === 'median' ? matrixStats.medianNota
                      : 70
                  const threshLabel = quadrantMode === 'mean'
                    ? `μ = ${threshA}%`
                    : quadrantMode === 'median'
                      ? `Md = ${threshA}%`
                      : `Fijo = 80%`
                  const threshLabelN = quadrantMode === 'mean'
                    ? `μ = ${threshN} pts`
                    : quadrantMode === 'median'
                      ? `Md = ${threshN} pts`
                      : `Fijo = 70 pts`

                  return (
                    <ResponsiveContainer width="100%" height={480}>
                      <ScatterChart margin={{ top: 24, right: 24, left: 10, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" opacity={0.35} />
                        <XAxis
                          type="number" dataKey="asistencia" name="Asistencia" unit="%"
                          domain={[0, 100]} stroke="var(--chart-text)" fontSize={11}
                          label={{ value: 'Asistencia Promedio (%)', position: 'bottom', offset: 10, style: { fill: 'var(--chart-text)', fontSize: 10, fontWeight: 700 } }}
                        />
                        <YAxis
                          type="number" dataKey="nota" name="Nota Promedio"
                          domain={[0, 100]} stroke="var(--chart-text)" fontSize={11}
                          label={{ value: 'Nota Promedio (pts)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: 'var(--chart-text)', fontSize: 10, fontWeight: 700 } }}
                        />
                        <ZAxis type="number" dataKey="size" range={[60, 700]} name="Activos" />

                        {/* Quadrant background fills */}
                        <ReferenceArea x1={threshA} x2={100} y1={threshN} y2={100} fill="rgba(16,217,139,0.06)" stroke="none" />
                        <ReferenceArea x1={0} x2={threshA} y1={0} y2={threshN} fill="rgba(247,79,107,0.06)" stroke="none" />
                        <ReferenceArea x1={threshA} x2={100} y1={0} y2={threshN} fill="rgba(245,166,35,0.06)" stroke="none" />
                        <ReferenceArea x1={0} x2={threshA} y1={threshN} y2={100} fill="rgba(14,165,233,0.06)" stroke="none" />

                        {/* Quadrant corner labels */}
                        <ReferenceLine x={threshA} stroke="rgba(255,255,255,0.15)" strokeDasharray="6 3" strokeWidth={1.5}
                          label={{ position: 'top', value: threshLabel, fill: 'var(--foreground-3)', fontSize: 9, fontWeight: 900 }}
                        />
                        <ReferenceLine y={threshN} stroke="rgba(255,255,255,0.15)" strokeDasharray="6 3" strokeWidth={1.5}
                          label={{ position: 'right', value: threshLabelN, fill: 'var(--foreground-3)', fontSize: 9, fontWeight: 900 }}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        {/* Regression line as a Scatter with line shape */}
                        {matrixStats.regressionLine.length > 1 && (
                          <Scatter
                            name="Tendencia OLS"
                            data={matrixStats.regressionLine.map(p => ({ asistencia: p.x, nota: p.y, size: 0 }))}
                            line={{ stroke: COLORS.primary, strokeWidth: 2, strokeDasharray: '6 3' }}
                            lineType="joint"
                            shape={() => null as any}
                            fill="transparent"
                          />
                        )}

                        {/* Data bubbles */}
                        <Scatter name="Datos" data={performanceMatrix} fill={COLORS.primary}>
                          {performanceMatrix.map((entry, index) => {
                            const isLeader = entry.asistencia >= threshA && entry.nota >= threshN
                            const isRisk = entry.asistencia < threshA && entry.nota < threshN
                            const isStruggler = entry.asistencia >= threshA && entry.nota < threshN
                            const color = isLeader ? COLORS.success : isRisk ? COLORS.danger : isStruggler ? COLORS.warning : COLORS.info
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={color}
                                fillOpacity={0.75}
                                stroke={color}
                                strokeWidth={2.5}
                                style={{ cursor: 'pointer', filter: `drop-shadow(0 0 6px ${color}55)` }}
                              />
                            )
                          })}
                          <LabelList
                            dataKey="name"
                            content={(props: any) => {
                              const { x, y, value } = props
                              if (!x || !y) return null
                              let cleanLabel = String(value)
                              // Strip redundant prefixes to make labels fit better
                              cleanLabel = cleanLabel.replace(/^(LENGUAJE|MATEMÁTICA)\s*-\s*/i, '')
                              const isLargeDataset = performanceMatrix.length > 15
                              const displayValue = isLargeDataset && cleanLabel.length > 18
                                ? cleanLabel.slice(0, 16) + '…'
                                : cleanLabel
                              return (
                                <text x={x} y={(y as number) - 12} fill="var(--foreground)" fontSize={8.5} fontWeight={900} textAnchor="middle" style={{ textShadow: '0 1.5px 3px rgba(0,0,0,0.8)' }}>
                                  {displayValue}
                                </text>
                              )
                            }}
                          />
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  )
                })()}
              </div>

              {/* === STATISTICAL SCORECARD PANEL === */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Correlation Card */}
                <div style={{ padding: '1.1rem', borderRadius: '1rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--foreground-3)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Correlación de Pearson</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <span style={{
                      fontSize: '2.2rem', fontWeight: 900,
                      color: Math.abs(matrixStats.pearsonR) >= 0.7 ? COLORS.success : Math.abs(matrixStats.pearsonR) >= 0.4 ? COLORS.warning : COLORS.danger
                    }}>
                      {matrixStats.pearsonR > 0 ? '+' : ''}{matrixStats.pearsonR}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--foreground-3)', fontWeight: 700 }}>r</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--foreground-2)', lineHeight: '1.4' }}>{matrixStats.interpretation}</div>
                </div>

                {/* R² Card */}
                <div style={{ padding: '1.1rem', borderRadius: '1rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--foreground-3)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Coef. Determinación (R²)</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: COLORS.purple }}>{Math.round(matrixStats.rSquared * 100)}%</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--foreground-2)', lineHeight: '1.4', marginTop: '0.25rem' }}>
                    La asistencia explica el <b>{Math.round(matrixStats.rSquared * 100)}%</b> de la variación en notas.
                  </div>
                </div>

                {/* Dispersion σ */}
                <div style={{ padding: '1.1rem', borderRadius: '1rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--foreground-3)', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>Dispersión (σ)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--foreground-3)' }}>σ Asistencia</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 900, color: COLORS.info }}>±{matrixStats.stdAsistencia}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--foreground-3)' }}>σ Nota</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 900, color: COLORS.gold }}>±{matrixStats.stdNota} pts</span>
                    </div>
                  </div>
                </div>

                {/* Threshold Summary */}
                <div style={{ padding: '1.1rem', borderRadius: '1rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--foreground-3)', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>Límites Activos</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {(['mean', 'median'] as const).map(mode => (
                      <div key={mode} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span style={{ color: 'var(--foreground-3)' }}>{mode === 'mean' ? 'μ Media' : 'Md Mediana'} Asist.</span>
                        <span style={{ fontWeight: 800, color: mode === 'mean' ? COLORS.primary : COLORS.info }}>
                          {mode === 'mean' ? matrixStats.meanAsistencia : matrixStats.medianAsistencia}%
                        </span>
                      </div>
                    ))}
                    {(['mean', 'median'] as const).map(mode => (
                      <div key={mode + 'n'} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span style={{ color: 'var(--foreground-3)' }}>{mode === 'mean' ? 'μ Media' : 'Md Mediana'} Nota</span>
                        <span style={{ fontWeight: 800, color: mode === 'mean' ? COLORS.primary : COLORS.info }}>
                          {mode === 'mean' ? matrixStats.meanNota : matrixStats.medianNota} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Population */}
                <div style={{ padding: '1.1rem', borderRadius: '1rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--foreground-3)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Puntos Analizados</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: COLORS.success }}>{performanceMatrix.length}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--foreground-3)' }}>
                    {matrixDimension === 'grupo' ? 'grupos' : matrixDimension === 'sede' ? 'sedes' : 'módulos'} con datos
                  </div>
                </div>
              </div>
            </div>

            {/* ===== INTELLIGENT COHORT LEGEND ===== */}
            {(() => {
              const threshA = quadrantMode === 'mean' ? matrixStats.meanAsistencia
                : quadrantMode === 'median' ? matrixStats.medianAsistencia : 80
              const threshN = quadrantMode === 'mean' ? matrixStats.meanNota
                : quadrantMode === 'median' ? matrixStats.medianNota : 70

              const leaders = performanceMatrix.filter(d => d.asistencia >= threshA && d.nota >= threshN)
              const strugglers = performanceMatrix.filter(d => d.asistencia >= threshA && d.nota < threshN)
              const outliers = performanceMatrix.filter(d => d.asistencia < threshA && d.nota >= threshN)
              const critical = performanceMatrix.filter(d => d.asistencia < threshA && d.nota < threshN)

              const ZoneBadge = ({ items, color, label, sublabel }: { items: any[], color: string, label: string, sublabel: string }) => (
                <div style={{ padding: '1rem', borderRadius: '0.85rem', border: `1px solid ${color}30`, background: `${color}08`, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 900, color, fontSize: '0.73rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                      {label}
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color }}>{items.length}</span>
                  </div>
                  <div style={{ fontSize: '0.67rem', color: 'var(--foreground-3)', fontStyle: 'italic' }}>{sublabel}</div>
                  {items.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.1rem' }}>
                      {items.slice(0, 8).map((d, i) => (
                        <span key={i} style={{
                          fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.5rem',
                          borderRadius: '999px', background: `${color}18`, color, border: `1px solid ${color}40`
                        }}>{d.name}</span>
                      ))}
                      {items.length > 8 && <span style={{ fontSize: '0.6rem', color: 'var(--foreground-3)', alignSelf: 'center' }}>+{items.length - 8} más</span>}
                    </div>
                  )}
                </div>
              )

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
                  <ZoneBadge items={leaders} color={COLORS.success} label="ZONA A · Alto Rendimiento" sublabel={`Asistencia ≥ ${threshA}% y Nota ≥ ${threshN} pts. Alta retención y éxito académico.`} />
                  <ZoneBadge items={strugglers} color={COLORS.warning} label="ZONA B · Refuerzo Académico" sublabel={`Asistencia ≥ ${threshA}% pero Nota < ${threshN} pts. Presentes pero con rezago.`} />
                  <ZoneBadge items={outliers} color={COLORS.info} label="ZONA C · Independientes" sublabel={`Asistencia < ${threshA}% pero Nota ≥ ${threshN} pts. Baja asistencia pero buen rendimiento.`} />
                  <ZoneBadge items={critical} color={COLORS.danger} label="ZONA D · Riesgo Crítico" sublabel={`Asistencia < ${threshA}% y Nota < ${threshN} pts. Deserción inminente. Intervención urgente.`} />
                </div>
              )
            })()}
          </ChartCard>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
            <ChartCard title="Benchmark Regional (Inscripciones y Docs)" icon={Building2}>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={departmentalComparison} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="var(--chart-text)" fontSize={11} width={100} fontWeight={700} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '10px', marginBottom: '10px' }} />
                  <Bar dataKey="Inscritos" fill={COLORS.info} radius={[0, 4, 4, 0]} stackId="a">
                    <LabelList dataKey="Inscritos" position="right" style={{ fill: 'var(--foreground)', fontSize: '0.7rem', fontWeight: 800 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Ranking de Efectividad Operativa" icon={Activity}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {deptoList.map(d => {
                  const att = attendanceData.filter(a => a.dept_name === d)
                  const ok = att.reduce((acc, curr) => acc + curr.asistieron, 0)
                  const total = att.reduce((acc, curr) => acc + (curr.asistieron + curr.retraso + curr.falta + curr.permiso), 0)
                  const rate = total > 0 ? (ok / total) * 100 : 0
                  return { name: d, rate }
                })
                  .sort((a, b) => b.rate - a.rate)
                  .slice(0, 6)
                  .map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '0.75rem' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: idx < 3 ? 'var(--primary-light)' : 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: idx < 3 ? 'var(--primary)' : 'var(--foreground-3)' }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, fontWeight: 700, fontSize: '0.85rem' }}>{item.name}</div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, color: item.rate > 80 ? COLORS.success : item.rate > 60 ? COLORS.warning : COLORS.danger }}>{Math.round(item.rate)}%</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--foreground-3)', textTransform: 'uppercase' }}>Efectividad</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </ChartCard>
          </div>
        </div>
      ) : tab === 'operativo' ? (
        /* Ficha Operativa Detallada */
        <div className="glass card" style={{ padding: 0 }}>
          <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, var(--surface), transparent)' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Estatus Operativo de Grupos</h2>
            <p style={{ color: 'var(--foreground-3)', fontSize: '0.9rem' }}>Vista granulada para supervisores de campo</p>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Identificador Grupo</th>
                  <th>Sede</th>
                  <th>Preinscritos</th>
                  <th>Inscritos</th>
                  <th>Docs (Ins)</th>
                  <th>Inscripción %</th>
                  <th>Asistencia Prom.</th>
                  <th>Score Final</th>
                </tr>
              </thead>
              <tbody>
                {/* Header Totals Row */}
                <tr style={{ background: 'var(--card-solid)', fontWeight: 900, borderBottom: '2px solid var(--border-strong)' }}>
                  <td colSpan={2} style={{ color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Resumen de Selección</td>
                  <td style={{ fontSize: '1rem' }}>{filteredEnrollment.reduce((acc, g) => acc + (g.total_inscritos || 0), 0).toLocaleString()}</td>
                  <td style={{ fontSize: '1rem', color: COLORS.info }}>{filteredEnrollment.reduce((acc, g) => acc + (g.total_confirmados || 0), 0).toLocaleString()}</td>
                  <td style={{ fontSize: '1rem', color: COLORS.purple }}>{filteredEnrollment.reduce((acc, g) => acc + (g.inscritos_entrego || 0), 0).toLocaleString()}</td>
                  <td>{metrics.confirmation_rate}%</td>
                  <td style={{ color: COLORS.success }}>{metrics.avg_per_day}</td>
                  <td>
                    <span className="badge" style={{ background: 'var(--primary)', color: 'white' }}>
                      {metrics.efficiency_score}
                    </span>
                  </td>
                </tr>

                {filteredEnrollment.map((g, i) => {
                  const gAtt = filteredAttendance.filter(a => a.group_name === g.group_name)
                  const conf_rate = g.total_inscritos > 0 ? (g.total_confirmados / g.total_inscritos) * 100 : 0
                  const avg_att = gAtt.length > 0 ? (gAtt.reduce((acc, curr) => acc + curr.asistieron, 0) / gAtt.length) : 0
                  const score = Math.round(conf_rate * (avg_att / (g.total_confirmados || 1))).toString()

                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 800 }}>{g.group_name}</td>
                      <td style={{ color: 'var(--foreground-3)' }}>{g.dept_name}</td>
                      <td style={{ fontWeight: 700 }}>{g.total_inscritos}</td>
                      <td style={{ color: COLORS.info, fontWeight: 700 }}>{g.total_confirmados}</td>
                      <td style={{ color: COLORS.purple, fontWeight: 700 }}>{g.inscritos_entrego || 0}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '4px', background: 'var(--surface)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${conf_rate}%`, height: '100%', background: COLORS.info }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{Math.round(conf_rate)}%</span>
                        </div>
                      </td>
                      <td style={{ color: COLORS.success, fontWeight: 700 }}>{Math.round(avg_att)}</td>
                      <td>
                        <span className="badge" style={{
                          background: parseFloat(score) > 80 ? 'var(--success-light)' : parseFloat(score) > 50 ? 'var(--warning-light)' : 'var(--danger-light)',
                          color: parseFloat(score) > 80 ? 'var(--success)' : parseFloat(score) > 50 ? 'var(--warning)' : 'var(--danger)',
                          fontWeight: 900
                        }}>
                          {score}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                <tr style={{ background: 'var(--card-solid)', fontWeight: 900, borderTop: '2px solid var(--border-strong)' }}>
                  <td colSpan={2} style={{ textAlign: 'right', color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Totales de Selección</td>
                  <td style={{ fontSize: '1rem' }}>{filteredEnrollment.reduce((acc, g) => acc + (g.total_inscritos || 0), 0).toLocaleString()}</td>
                  <td style={{ fontSize: '1rem', color: COLORS.info }}>{filteredEnrollment.reduce((acc, g) => acc + (g.total_confirmados || 0), 0).toLocaleString()}</td>
                  <td style={{ fontSize: '1rem', color: COLORS.purple }}>{filteredEnrollment.reduce((acc, g) => acc + (g.inscritos_entrego || 0), 0).toLocaleString()}</td>
                  <td>{metrics.confirmation_rate}%</td>
                  <td style={{ color: COLORS.success }}>{metrics.avg_per_day}</td>
                  <td>
                    <span className="badge" style={{ background: 'var(--primary)', color: 'white' }}>
                      {metrics.efficiency_score}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : tab === 'asistencia_modulos' ? (
        /* Asistencia por Módulos */
        <div className="glass card" style={{ padding: 0 }}>
          <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, var(--surface), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ marginBottom: '0.5rem' }}>Reporte de Asistencia por Módulos</h2>
              <p style={{ color: 'var(--foreground-3)', fontSize: '0.9rem' }}>Detalle de asistencia diaria agrupada por módulo académico</p>
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--primary)' }}>
                <Zap size={12} />
                <span>Solo participantes con estado "Inscrito" y documentos entregados.</span>
              </div>
            </div>
            {/* Local Toolbar */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Sede selector */}
              <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={14} color="var(--primary)" />
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value)
                    setSelectedGroupFilter('all')
                  }}
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.75rem', fontWeight: 800, color: 'var(--foreground)', cursor: 'pointer' }}
                >
                  <option value="all">Todas las Sedes</option>
                  {deptoList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={14} color="var(--primary)" />
                <div style={{ width: '160px' }}>
                  <ModuleMultiSelect
                    moduleList={moduleList}
                    selectedModules={selectedModules}
                    setSelectedModules={setSelectedModules}
                  />
                </div>
              </div>

              <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={14} color="var(--primary)" />
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.75rem', fontWeight: 800, color: 'var(--foreground)', cursor: 'pointer' }}
                >
                  <option value="all">Todos los Días</option>
                  {dayList.map(d => <option key={d} value={d}>Día {d}</option>)}
                </select>
              </div>

              {/* Search Bar */}
              <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={14} color="var(--primary)" />
                <input
                  type="text"
                  placeholder="Buscar cohorte..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.75rem', color: 'var(--foreground)', width: '100px' }}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 900 }}>×</button>
                )}
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Sede</th>
                  <th>Módulo</th>
                  <th style={{ textAlign: 'center' }}>Día</th>
                  <th style={{ textAlign: 'center' }}>Asistió / Atraso</th>
                  <th style={{ textAlign: 'center' }}>Falta</th>
                  <th style={{ textAlign: 'center' }}>Permiso</th>
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>% Asist.</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totAsistieron = filteredAttendanceByModulesSearched.reduce((acc, r) => acc + r.asistieron, 0)
                  const totAtraso = filteredAttendanceByModulesSearched.reduce((acc, r) => acc + r.atraso, 0)
                  const totAsistióYAtraso = totAsistieron + totAtraso
                  const totFalta = filteredAttendanceByModulesSearched.reduce((acc, r) => acc + r.falta, 0)
                  const totPermiso = filteredAttendanceByModulesSearched.reduce((acc, r) => acc + r.permiso, 0)
                  const totExpected = totAsistióYAtraso + totFalta + totPermiso
                  const overallRate = totExpected > 0 ? (totAsistióYAtraso / totExpected) * 100 : 0

                  return (
                    <tr style={{ background: 'var(--card-solid)', fontWeight: 900, borderBottom: '2px solid var(--border-strong)' }}>
                      <td colSpan={3} style={{ color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Resumen de Selección</td>
                      <td style={{ textAlign: 'center' }}>-</td>
                      <td style={{ textAlign: 'center', color: COLORS.success }}>{totAsistióYAtraso}</td>
                      <td style={{ textAlign: 'center', color: COLORS.danger }}>{totFalta}</td>
                      <td style={{ textAlign: 'center', color: COLORS.muted }}>{totPermiso}</td>
                      <td style={{ textAlign: 'center', fontWeight: 900 }}>{totExpected}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{
                          background: overallRate >= 80 ? 'var(--success-light)' : overallRate >= 60 ? 'var(--warning-light)' : 'var(--danger-light)',
                          color: overallRate >= 80 ? 'var(--success)' : overallRate >= 60 ? 'var(--warning)' : 'var(--danger)',
                          fontWeight: 900
                        }}>
                          {Math.round(overallRate)}%
                        </span>
                      </td>
                    </tr>
                  )
                })()}

                {filteredAttendanceByModulesSearched.map((row, idx) => {
                  const totalRow = row.asistieron + row.atraso + row.falta + row.permiso
                  const asistioYAtraso = row.asistieron + row.atraso
                  const rowRate = totalRow > 0 ? (asistioYAtraso / totalRow) * 100 : 0

                  return (
                    <tr key={idx} className="hover-row">
                      <td style={{ fontWeight: 800 }}>{row.group_name}</td>
                      <td style={{ color: 'var(--foreground-3)' }}>{row.dept_name}</td>
                      <td style={{ fontWeight: 600 }}>{row.modulo_name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>Día {row.dia}</td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: COLORS.success }}>{asistioYAtraso}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--foreground-3)' }}>
                          {totalRow > 0 ? `${Math.round((asistioYAtraso / totalRow) * 100)}%` : '0%'}
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: COLORS.danger }}>{row.falta}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--foreground-3)' }}>
                          {totalRow > 0 ? `${Math.round((row.falta / totalRow) * 100)}%` : '0%'}
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: COLORS.muted }}>{row.permiso}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--foreground-3)' }}>
                          {totalRow > 0 ? `${Math.round((row.permiso / totalRow) * 100)}%` : '0%'}
                        </div>
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{totalRow}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{
                          background: rowRate >= 80 ? 'var(--success-light)' : rowRate >= 60 ? 'var(--warning-light)' : 'var(--danger-light)',
                          color: rowRate >= 80 ? 'var(--success)' : rowRate >= 60 ? 'var(--warning)' : 'var(--danger)',
                          fontWeight: 900
                        }}>
                          {Math.round(rowRate)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}

                {filteredAttendanceByModulesSearched.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--foreground-3)' }}>
                      No se encontraron registros de asistencia para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'calificaciones_modulos' ? (
        /* Calificaciones por Módulos */
        <div className="glass card" style={{ padding: 0 }}>
          <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, var(--surface), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ marginBottom: '0.5rem' }}>Reporte de Calificaciones por Módulos</h2>
              <p style={{ color: 'var(--foreground-3)', fontSize: '0.9rem' }}>Detalle de rendimiento académico agrupado por módulo y grupo</p>
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--primary)' }}>
                <Zap size={12} />
                <span>Solo participantes con estado "Inscrito" y documentos entregados.</span>
              </div>
            </div>
            {/* Local Toolbar */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Sede selector */}
              <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={14} color="var(--primary)" />
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value)
                    setSelectedGroupFilter('all')
                  }}
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.75rem', fontWeight: 800, color: 'var(--foreground)', cursor: 'pointer' }}
                >
                  <option value="all">Todas las Sedes</option>
                  {deptoList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={14} color="var(--primary)" />
                <div style={{ width: '160px' }}>
                  <ModuleMultiSelect
                    moduleList={moduleList}
                    selectedModules={selectedModules}
                    setSelectedModules={setSelectedModules}
                  />
                </div>
              </div>

              {/* Search Bar */}
              <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={14} color="var(--primary)" />
                <input
                  type="text"
                  placeholder="Buscar cohorte..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.75rem', color: 'var(--foreground)', width: '100px' }}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 900 }}>×</button>
                )}
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Sede</th>
                  <th>Módulo</th>
                  <th style={{ textAlign: 'center' }}>Total Calificados</th>
                  <th style={{ textAlign: 'center' }}>Aprobados (Nro / %)</th>
                  <th style={{ textAlign: 'center' }}>Reprobados (Nro / %)</th>
                  <th style={{ textAlign: 'center', color: 'var(--warning)' }}>Abandonos</th>
                  <th style={{ textAlign: 'center' }}>Promedio Módulo</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totCalificados = filteredGradesSearched.reduce((acc, r) => acc + r.total_calificados, 0)
                  const totAprobados = filteredGradesSearched.reduce((acc, r) => acc + r.aprobados, 0)
                  const totReprobados = filteredGradesSearched.reduce((acc, r) => acc + r.reprobados, 0)
                  const totAbandonos = filteredGradesSearched.reduce((acc, r) => acc + (r.abandonos || 0), 0)
                  const totConNota = filteredGradesSearched.reduce((acc, r) => acc + (r.total_con_nota || 0), 0)
                  const sumConNota = filteredGradesSearched.reduce((acc, r) => acc + (r.suma_total_con_nota || 0), 0)
                  const avgNota = totConNota > 0 ? sumConNota / totConNota : 0
                  const overallPassRate = totCalificados > 0 ? (totAprobados / totCalificados) * 100 : 0
                  const overallFailRate = totCalificados > 0 ? (totReprobados / totCalificados) * 100 : 0
                  const overallAbandonRate = totCalificados > 0 ? (totAbandonos / totCalificados) * 100 : 0

                  return (
                    <tr style={{ background: 'var(--card-solid)', fontWeight: 900, borderBottom: '2px solid var(--border-strong)' }}>
                      <td colSpan={3} style={{ color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Resumen de Selección</td>
                      <td style={{ textAlign: 'center', fontWeight: 900 }}>{totCalificados}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 900, color: COLORS.success }}>{totAprobados}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--foreground-3)' }}>
                          {totCalificados > 0 ? `${Math.round(overallPassRate)}%` : '0%'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 900, color: COLORS.danger }}>{totReprobados}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--foreground-3)' }}>
                          {totCalificados > 0 ? `${Math.round(overallFailRate)}%` : '0%'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 900, color: COLORS.warning }}>{totAbandonos}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--foreground-3)' }}>
                          {totCalificados > 0 ? `${Math.round(overallAbandonRate)}%` : '0%'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ background: 'var(--primary)', color: 'white', fontWeight: 900 }}>
                          {Math.round(avgNota)} / 100
                        </span>
                      </td>
                    </tr>
                  )
                })()}

                {filteredGradesSearched.map((row, idx) => {
                  const passRate = row.total_calificados > 0 ? (row.aprobados / row.total_calificados) * 100 : 0
                  const failRate = row.total_calificados > 0 ? (row.reprobados / row.total_calificados) * 100 : 0
                  const abandonos = row.abandonos || 0
                  const abandonRate = row.total_calificados > 0 ? (abandonos / row.total_calificados) * 100 : 0
                  const conNota = row.total_con_nota || 0
                  const avgRowNota = conNota > 0 ? (row.suma_total_con_nota || 0) / conNota : 0

                  return (
                    <tr key={idx} className="hover-row">
                      <td style={{ fontWeight: 800 }}>{row.group_name}</td>
                      <td style={{ color: 'var(--foreground-3)' }}>{row.dept_name}</td>
                      <td style={{ fontWeight: 600 }}>{row.modulo_name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{row.total_calificados}</td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: COLORS.success }}>{row.aprobados}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--foreground-3)' }}>
                          {Math.round(passRate)}%
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: COLORS.danger }}>{row.reprobados}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--foreground-3)' }}>
                          {Math.round(failRate)}%
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: COLORS.warning }}>{abandonos}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--foreground-3)' }}>
                          {Math.round(abandonRate)}%
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{
                          background: avgRowNota >= 70 ? 'rgba(16, 217, 139, 0.1)' : avgRowNota >= 51 ? 'rgba(245, 166, 35, 0.1)' : 'rgba(247, 79, 107, 0.1)',
                          color: avgRowNota >= 70 ? COLORS.success : avgRowNota >= 51 ? COLORS.warning : COLORS.danger,
                          fontWeight: 900
                        }}>
                          {Math.round(avgRowNota)}
                        </span>
                      </td>
                    </tr>
                  )
                })}

                {filteredGradesSearched.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--foreground-3)' }}>
                      No se encontraron registros de calificaciones para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tablero de Control de Progreso y Cumplimiento */
        <div className="glass card animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '0', minHeight: '600px' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.6rem', borderRadius: '0.8rem', background: 'rgba(187, 151, 58, 0.15)', color: 'var(--primary)' }}>
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Matriz de Control de Progreso</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--foreground-3)' }}>Auditoría y control de cumplimiento académico por grupo y módulo</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', minWidth: '300px' }}>
                <div className="glass" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <Search size={16} color="var(--primary)" />
                  <input
                    type="text"
                    placeholder="Buscar grupo o sede..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '0.82rem', color: 'var(--foreground)', fontWeight: 600 }}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 800, fontSize: '0.7rem' }}>LIMPIAR</button>
                  )}
                </div>
                <div style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', fontWeight: 700, color: 'var(--foreground-3)' }}>
                  Grupos: <span style={{ color: 'var(--primary)' }}>{filteredControlProgresoData.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: '150px' }}>Grupo / Sede</th>
                  <th style={{ minWidth: '160px' }}>Formalización (Inscritos)</th>
                  <th style={{ minWidth: '140px' }}>Distribución Demográfica</th>
                  <th style={{ minWidth: '220px', textAlign: 'center' }}>Calificaciones (Llenado por Módulo)</th>
                  <th style={{ minWidth: '320px', textAlign: 'center' }}>Asistencia (Días 1-6 por Módulo)</th>
                </tr>
              </thead>
              <tbody>
                {filteredControlProgresoData.map((row, idx) => {
                  const formalizationRate = row.total_confirmados > 0
                    ? Math.round((row.total_formalizados / row.total_confirmados) * 100)
                    : 0;

                  return (
                    <tr key={idx} className="hover-row">
                      {/* Grupo y Sede */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 800, color: 'var(--foreground)', fontSize: '0.9rem' }}>{row.group_name}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--foreground-3)', fontWeight: 600 }}>📍 {row.dept_name}</span>
                        </div>
                      </td>

                      {/* Formalización */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
                            <span style={{ color: 'var(--foreground-2)' }}>{row.total_formalizados} de {row.total_confirmados} act.</span>
                            <span style={{ color: formalizationRate === 100 ? COLORS.success : 'var(--primary)' }}>{formalizationRate}%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'var(--surface)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${formalizationRate}%`,
                              height: '100%',
                              background: formalizationRate === 100 ? COLORS.success : COLORS.primary,
                              borderRadius: '3px',
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                        </div>
                      </td>

                      {/* Zona Demográfica */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--foreground-3)' }}>
                            <span>🌳 Rural:</span>
                            <span style={{ fontWeight: 700, color: COLORS.success }}>{row.total_rural} ({row.total_inscritos > 0 ? Math.round((row.total_rural / row.total_inscritos) * 100) : 0}%)</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--foreground-3)' }}>
                            <span>🏢 Urbano:</span>
                            <span style={{ fontWeight: 700, color: COLORS.info }}>{row.total_urbano} ({row.total_inscritos > 0 ? Math.round((row.total_urbano / row.total_inscritos) * 100) : 0}%)</span>
                          </div>
                        </div>
                      </td>

                      {/* Calificaciones por Módulo */}
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {row.modulesProgress.map((mod: any, mIdx: number) => {
                            const califRate = row.total_confirmados > 0
                              ? Math.round((mod.total_calificados / row.total_confirmados) * 100)
                              : 0;

                            const isComplete = califRate >= 100 && row.total_confirmados > 0;
                            const isPartial = califRate > 0 && califRate < 100;

                            return (
                              <div
                                key={mIdx}
                                title={`${mod.modulo_name}: ${mod.total_calificados}/${row.total_confirmados} estudiantes calificados (${califRate}%)`}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.15rem',
                                  padding: '0.35rem 0.55rem',
                                  borderRadius: '0.5rem',
                                  background: isComplete ? 'rgba(16, 217, 139, 0.08)' : isPartial ? 'rgba(245, 166, 35, 0.08)' : 'rgba(247, 79, 107, 0.08)',
                                  border: `1px solid ${isComplete ? 'rgba(16, 217, 139, 0.25)' : isPartial ? 'rgba(245, 166, 35, 0.25)' : 'rgba(247, 79, 107, 0.25)'}`,
                                  minWidth: '70px',
                                  boxShadow: 'var(--shadow-sm)'
                                }}
                              >
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--foreground-2)' }}>
                                  {getShortModuleName(mod.modulo_name)}
                                </span>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 900,
                                  color: isComplete ? COLORS.success : isPartial ? COLORS.warning : COLORS.danger
                                }}>
                                  {califRate}%
                                </span>
                                <span style={{ fontSize: '0.58rem', color: 'var(--foreground-3)', fontWeight: 700 }}>
                                  ({mod.total_calificados}/{row.total_confirmados})
                                </span>
                              </div>
                            )
                          })}
                          {row.modulesProgress.length === 0 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--foreground-3)' }}>Sin módulos registrados</span>
                          )}
                        </div>
                      </td>

                      {/* Asistencias por Módulo (1-6 días) */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center' }}>
                          {row.modulesProgress.map((mod: any, mIdx: number) => {
                            const shortName = getShortModuleName(mod.modulo_name);

                            // Un día de asistencia está "completo" si el total de registros de ese día
                            // es exactamente igual a la cantidad de participantes activos.
                            let completedDaysCount = 0;

                            return (
                              <div key={mIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--foreground-3)', width: '60px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={mod.modulo_name}>
                                  {shortName}
                                </span>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  {[1, 2, 3, 4, 5, 6].map(day => {
                                    const dayData = mod.daysMap[day];
                                    const registeredCount = dayData ? dayData.total : 0;

                                    const isComplete = registeredCount === row.total_confirmados && row.total_confirmados > 0;
                                    const isPartial = registeredCount > 0 && registeredCount < row.total_confirmados;

                                    if (isComplete) {
                                      completedDaysCount++;
                                    }

                                    const tooltipText = dayData
                                      ? `${mod.modulo_name} - Día ${day}\nRegistrados: ${registeredCount} de ${row.total_confirmados} activos\n(Asistió: ${dayData.asistieron}, Atraso: ${dayData.atraso}, Falta: ${dayData.falta}, Permiso: ${dayData.permiso})`
                                      : `${mod.modulo_name} - Día ${day}\nSin registros oficiales (0 de ${row.total_confirmados} activos)`;

                                    return (
                                      <div
                                        key={day}
                                        title={tooltipText}
                                        style={{
                                          width: '20px',
                                          height: '20px',
                                          borderRadius: '4px',
                                          background: isComplete ? COLORS.success : isPartial ? COLORS.warning : 'rgba(247, 79, 107, 0.08)',
                                          border: isComplete ? `1px solid ${COLORS.success}` : isPartial ? `1px solid ${COLORS.warning}` : `1px dashed ${COLORS.danger}`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '0.62rem',
                                          fontWeight: 900,
                                          color: isComplete ? '#111' : isPartial ? '#111' : COLORS.danger,
                                          transition: 'all 0.15s ease',
                                          cursor: 'help'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)' }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                                      >
                                        {day}
                                      </div>
                                    );
                                  })}
                                </div>
                                <span
                                  title={`Días con asistencia completa (${row.total_confirmados}/${row.total_confirmados} alumnos registrados)`}
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    color: completedDaysCount === 6 ? COLORS.success : completedDaysCount > 0 ? COLORS.warning : 'var(--foreground-3)',
                                    width: '40px',
                                    textAlign: 'left'
                                  }}
                                >
                                  {completedDaysCount} / 6
                                </span>
                              </div>
                            )
                          })}
                          {row.modulesProgress.length === 0 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--foreground-3)' }}>Sin datos de asistencia</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {filteredControlProgresoData.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: 'var(--foreground-3)' }}>
                      No se encontraron grupos para los criterios de búsqueda o filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// --- SUB-COMPONENTS (Senior Optimized) ---

function KPI({ title, value, subtitle, icon: Icon, color }: any) {
  return (
    <div className="glass card" style={{ position: 'relative', overflow: 'hidden', padding: '1.25rem 1.5rem', borderBottom: `4px solid ${color}` }}>
      <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, color: color }}>
        <Icon size={80} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--foreground-3)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
        <Icon size={14} /> {title}
      </div>
      <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--foreground)', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '0.5rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--foreground-3)', fontWeight: 500 }}>{subtitle}</div>
    </div>
  )
}

function ChartCard({ title, icon: Icon, children, span = 1, extra }: any) {
  return (
    <div className="glass card" style={{ gridColumn: `span ${span}`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '0.75rem', background: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
            <Icon size={20} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{title}</h3>
        </div>
        {extra}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.6rem 1.25rem',
        borderRadius: '0.75rem',
        border: 'none',
        background: active ? 'var(--card-solid)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--foreground-3)',
        boxShadow: active ? 'var(--shadow-md)' : 'none',
        fontWeight: active ? '800' : '600',
        fontSize: '0.85rem',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: active ? 'scale(1.05)' : 'scale(1)'
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  )
}


