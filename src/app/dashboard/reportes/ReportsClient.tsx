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
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import StatusModal, { StatusType } from '../components/StatusModal'

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
                    {selectedModules.length === 0 ? '' : ''}{label}
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

async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
    const res = await fetch(imageUrl)
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.addEventListener('load', () => resolve(reader.result as string), false)
        reader.addEventListener('error', () => reject(new Error('Failed to read blob')))
        reader.readAsDataURL(blob)
    })
}

export default function ReportsClient({
    attendanceData = [],
    enrollmentData = [],
    attendanceByModulesData = [],
    gradesData = [],
    rawAttendanceData = [],
    rawGradesData = []
}: {
    attendanceData: any[],
    enrollmentData: any[],
    attendanceByModulesData?: any[],
    gradesData?: any[],
    rawAttendanceData?: any[],
    rawGradesData?: any[]
}) {
    const [mounted, setMounted] = useState(false)
    const [tab, setTab] = useState<'resumen' | 'control_progreso' | 'inscripcion' | 'analisis' | 'operativo' | 'asistencia_modulos' | 'calificaciones_modulos' | 'destacados' | 'riesgo_abandono'>('resumen')
    const [selectedDept, setSelectedDept] = useState('all')
    const [selectedGroupFilter, setSelectedGroupFilter] = useState('all')
    const [selectedDay, setSelectedDay] = useState<'all' | number>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [localCategory, setLocalCategory] = useState<'all' | 'asistencia' | 'inscripcion'>('all')
    const [selectedModules, setSelectedModules] = useState<string[]>([])
    const [notif, setNotif] = useState({ show: false, type: 'info' as StatusType, title: '', message: '' })
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


    // --- INDIVIDUAL STUDENT ANALYTICAL ENGINE ---
    const studentsAnalysis = useMemo(() => {
        const map: Record<string, {
            id: string
            nombre: string
            apellido: string
            ci: string
            groupName: string
            deptName: string
            asistioCount: number
            atrasoCount: number
            faltaCount: number
            permisoCount: number
            totalAttendanceDays: number
            attendanceRate: number
            grades: { moduloId: string; moduloName: string; total: number; fechaInicio: string; fechaFin: string }[]
            averageGrade: number | null
            zeroGradesCount: number
            failingModulesCount: number
        }> = {}

        // 1. Process attendance granularly
        rawAttendanceData?.forEach((a: any) => {
            const studentId = a.participante_id || a.participantes?.id
            if (!studentId) return

            const participante = a.participantes
            if (!participante) return

            const programaId = a.programa_modulos?.programa_id
            const inscripcion = participante.inscripciones?.find(
                (i: any) => i.programa_id === programaId
            )
            if (!inscripcion) return
            if (inscripcion.estado !== 'inscrito') return

            const group = inscripcion.grupos
            if (!group) return

            if (!map[studentId]) {
                map[studentId] = {
                    id: studentId,
                    nombre: participante.nombre || 'S/N',
                    apellido: participante.apellido || 'S/A',
                    ci: participante.ci || 'S/CI',
                    groupName: group.name || 'S/G',
                    deptName: group.departamentos?.name || 'S/D',
                    asistioCount: 0,
                    atrasoCount: 0,
                    faltaCount: 0,
                    permisoCount: 0,
                    totalAttendanceDays: 0,
                    attendanceRate: 0,
                    grades: [],
                    averageGrade: 0,
                    zeroGradesCount: 0,
                    failingModulesCount: 0
                }
            }

            const st = map[studentId]
            const estado = a.estado || 'falta'
            if (estado === 'asistio') st.asistioCount++
            else if (estado === 'atraso') st.atrasoCount++
            else if (estado === 'falta') st.faltaCount++
            else if (estado === 'permiso') st.permisoCount++
        })

        // 2. Process grades granularly
        rawGradesData?.forEach((g: any) => {
            const studentId = g.participante_id || g.participantes?.id
            if (!studentId) return

            const participante = g.participantes
            if (!participante) return

            const programaId = g.programa_modulos?.programa_id
            const inscripcion = participante.inscripciones?.find(
                (i: any) => i.programa_id === programaId
            )
            if (!inscripcion) return
            if (inscripcion.estado !== 'inscrito') return

            const group = inscripcion.grupos
            if (!group) return

            if (!map[studentId]) {
                map[studentId] = {
                    id: studentId,
                    nombre: participante.nombre || 'S/N',
                    apellido: participante.apellido || 'S/A',
                    ci: participante.ci || 'S/CI',
                    groupName: group.name || 'S/G',
                    deptName: group.departamentos?.name || 'S/D',
                    asistioCount: 0,
                    atrasoCount: 0,
                    faltaCount: 0,
                    permisoCount: 0,
                    totalAttendanceDays: 0,
                    attendanceRate: 0,
                    grades: [],
                    averageGrade: 0,
                    zeroGradesCount: 0,
                    failingModulesCount: 0
                }
            }

            const st = map[studentId]
            const totalNota = Number(g.total || 0)
            const moduloName = g.programa_modulos?.titulo_modulo || 'S/M'
            const moduloPrefix = g.programa_modulos?.grupo === 1 ? 'LENGUAJE - ' : g.programa_modulos?.grupo === 2 ? 'MATEMÁTICA - ' : ''
            const fullModuloName = `${moduloPrefix}${moduloName}`
            const fechaInicio = g.programa_modulos?.fecha_inicio || ''
            const fechaFin = g.programa_modulos?.fecha_fin || ''

            // Avoid duplicate grades for the same module
            if (!st.grades.some(x => x.moduloId === g.modulo_id)) {
                st.grades.push({
                    moduloId: g.modulo_id,
                    moduloName: fullModuloName,
                    total: totalNota,
                    fechaInicio,
                    fechaFin
                })

                if (totalNota === 0) st.zeroGradesCount++
                if (totalNota < 51) st.failingModulesCount++
            }
        })

        // 3. Final calculations for each student
        const studentList = Object.values(map)
        studentList.forEach(st => {
            const attended = st.asistioCount + st.atrasoCount
            const totalDays = st.asistioCount + st.atrasoCount + st.faltaCount + st.permisoCount
            st.totalAttendanceDays = totalDays
            st.attendanceRate = totalDays > 0 ? (attended / totalDays) * 100 : 0

            const gradesSum = st.grades.reduce((sum, item) => sum + item.total, 0)
            st.averageGrade = st.grades.length > 0 ? gradesSum / st.grades.length : null
        })

        return studentList
    }, [rawAttendanceData, rawGradesData])

    // --- FILTERED & SORTED LIST FOR DESTACADOS ---
    const destacadosFiltered = useMemo(() => {
        // Solo estudiantes con calificaciones registradas
        let list = studentsAnalysis.filter(st => st.averageGrade !== null)

        if (selectedDept !== 'all') {
            list = list.filter(st => st.deptName === selectedDept)
        }

        if (selectedGroupFilter !== 'all') {
            list = list.filter(st => st.groupName === selectedGroupFilter)
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            list = list.filter(st =>
                st.nombre.toLowerCase().includes(term) ||
                st.apellido.toLowerCase().includes(term) ||
                st.ci.toLowerCase().includes(term)
            )
        }

        const sorted = [...list].sort((a, b) => {
            const aGrade = a.averageGrade !== null ? a.averageGrade : 0
            const bGrade = b.averageGrade !== null ? b.averageGrade : 0
            const gradeComp = bGrade - aGrade
            if (gradeComp !== 0) return gradeComp
            return b.attendanceRate - a.attendanceRate
        })

        return sorted.slice(0, 40)
    }, [studentsAnalysis, selectedDept, selectedGroupFilter, searchTerm])

    // --- FILTERED & SORTED LIST FOR RIESGO DE ABANDONO ---
    const riesgoFiltered = useMemo(() => {
        let list = studentsAnalysis

        // Criterio de riesgo: reprobando (< 51) o asistencia baja (< 60) o calificaciones cero (abandono)
        list = list.filter(st => (st.averageGrade !== null && st.averageGrade < 51) || st.attendanceRate < 60 || st.zeroGradesCount > 0)

        if (selectedDept !== 'all') {
            list = list.filter(st => st.deptName === selectedDept)
        }

        if (selectedGroupFilter !== 'all') {
            list = list.filter(st => st.groupName === selectedGroupFilter)
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            list = list.filter(st =>
                st.nombre.toLowerCase().includes(term) ||
                st.apellido.toLowerCase().includes(term) ||
                st.ci.toLowerCase().includes(term)
            )
        }

        const sorted = [...list].sort((a, b) => {
            const zeroComp = b.zeroGradesCount - a.zeroGradesCount
            if (zeroComp !== 0) return zeroComp
            const aGrade = a.averageGrade !== null ? a.averageGrade : 100
            const bGrade = b.averageGrade !== null ? b.averageGrade : 100
            const gradeComp = aGrade - bGrade
            if (gradeComp !== 0) return gradeComp
            return a.attendanceRate - b.attendanceRate
        })

        return sorted.slice(0, 100)
    }, [studentsAnalysis, selectedDept, selectedGroupFilter, searchTerm])


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
        const sem = dia <= 3 ? 1 : 2
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
                        Asistieron: dayData.reduce((acc, curr) => acc + Number(curr.asistieron || 0) + Number(curr.atraso || 0), 0),
                        Faltas: dayData.reduce((acc, curr) => acc + Number(curr.falta || 0), 0),
                        Permisos: dayData.reduce((acc, curr) => acc + Number(curr.permiso || 0), 0),
                        Total: dayData.reduce((acc, curr) => acc + Number(curr.asistieron || 0) + Number(curr.atraso || 0) + Number(curr.falta || 0) + Number(curr.permiso || 0), 0)
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
                        Asistieron: comboData.reduce((acc, curr) => acc + Number(curr.asistieron || 0) + Number(curr.atraso || 0), 0),
                        Faltas: comboData.reduce((acc, curr) => acc + Number(curr.falta || 0), 0),
                        Permisos: comboData.reduce((acc, curr) => acc + Number(curr.permiso || 0), 0),
                        Total: comboData.reduce((acc, curr) => acc + Number(curr.asistieron || 0) + Number(curr.atraso || 0) + Number(curr.falta || 0) + Number(curr.permiso || 0), 0)
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
                    Asistieron: comboData.reduce((acc, curr) => acc + Number(curr.asistieron || 0) + Number(curr.atraso || 0), 0),
                    Faltas: comboData.reduce((acc, curr) => acc + Number(curr.falta || 0), 0),
                    Permisos: comboData.reduce((acc, curr) => acc + Number(curr.permiso || 0), 0),
                    Total: comboData.reduce((acc, curr) => acc + Number(curr.asistieron || 0) + Number(curr.atraso || 0) + Number(curr.falta || 0) + Number(curr.permiso || 0), 0)
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

        // Sort keys naturally (e.g. LPZ-G4 before LPZ-G34)
        uniqueKeys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

        return uniqueKeys.map(key => {
            const groupData = data.filter(g => g[groupByField] === key)
            const calificados = groupData.reduce((acc, curr) => acc + (curr.total_calificados || 0), 0)
            const aprobados = groupData.reduce((acc, curr) => acc + (curr.aprobados || 0), 0)
            const reprobados = groupData.reduce((acc, curr) => acc + (curr.reprobados || 0), 0)
            const abandonos = groupData.reduce((acc, curr) => acc + (curr.abandonos || 0), 0)
            const conNota = groupData.reduce((acc, curr) => acc + (curr.total_con_nota || 0), 0)
            const suma_total_con_nota = groupData.reduce((acc, curr) => acc + (curr.suma_total_con_nota || 0), 0)
            const promedio = conNota > 0 ? (suma_total_con_nota / conNota) : 0
            return {
                name: key,
                Aprobados: aprobados,
                Reprobados: reprobados,
                Abandonos: abandonos,
                Calificados: calificados,
                Promedio: Math.round(promedio)
            }
        })
    }, [filteredGrades, selectedModules])

    if (!mounted) return null

    const GOLD = [201, 167, 81] as [number, number, number]
    const WHITE = [255, 255, 255] as [number, number, number]
    const DARK = [30, 30, 30] as [number, number, number]
    const GRAY = [90, 90, 90] as [number, number, number]
    const LIGHT = [245, 245, 245] as [number, number, number]

    const addPDFHeader = (doc: jsPDF, title: string, subtitle: string) => {
        const pageW = doc.internal.pageSize.getWidth()
        // Gold header bar
        doc.setFillColor(...GOLD)
        doc.rect(0, 0, pageW, 22, 'F')
        doc.setTextColor(...WHITE)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('PROFE v2.1 — ' + title, 14, 14)
        // Subtitle bar
        doc.setFillColor(245, 240, 220)
        doc.rect(0, 22, pageW, 10, 'F')
        doc.setTextColor(...GRAY)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(subtitle, 14, 29)
        doc.text(`Generado: ${new Date().toLocaleDateString('es-BO')}`, pageW - 14, 29, { align: 'right' })
        // Gold accent line
        doc.setDrawColor(...GOLD)
        doc.setLineWidth(0.8)
        doc.line(0, 32, pageW, 32)
    }

    const exportPDFAsistencia = async () => {
        if (selectedModules.length !== 1) {
            setNotif({
                show: true,
                type: 'info',
                title: 'Selección Requerida',
                message: 'Debe seleccionar exactamente un (1) Módulo Temático en el panel de control antes de imprimir el PDF de Asistencia.'
            })
            return
        }

        const targetModule = selectedModules[0]
        const deptLabel = selectedDept === 'all' ? 'Nacional' : selectedDept
        const groupLabel = selectedGroupFilter === 'all' ? 'Todos los Grupos' : selectedGroupFilter

        // 1. Gather student profiles to define active population
        const activeStudentsMap: Record<string, {
            id: string
            nombre: string
            apellido: string
            ci: string
            groupName: string
            deptName: string
            formalizado: boolean
            zona: string
        }> = {}

        const STATE_PRIORITY: Record<string, number> = {
            'asistio': 4,
            'atraso': 3,
            'permiso': 2,
            'falta': 1
        }

            // Scan rawAttendanceData for enrolled students in this module
            ; (rawAttendanceData || []).forEach((a: any) => {
                const studentInfo = a.participantes
                if (!studentInfo) return
                const studentId = studentInfo.id || a.participante_id
                if (!studentId) return

                const programId = a.programa_modulos?.programa_id
                const inscripcion = studentInfo.inscripciones?.find((i: any) => i.programa_id === programId)
                if (!inscripcion || inscripcion.estado !== 'inscrito') return

                const group = inscripcion.grupos
                if (!group) return

                const deptName = group.departamentos?.name || 'S/D'
                const groupName = group.name || 'S/G'

                const modulo_titulo = a.programa_modulos?.titulo_modulo || 'S/M'
                const modulo_grupo = a.programa_modulos?.grupo
                const modulo_prefix = modulo_grupo === 1 ? 'LENGUAJE - ' : modulo_grupo === 2 ? 'MATEMÁTICA - ' : ''
                const full_modulo_name = `${modulo_prefix}${modulo_titulo}`
                if (full_modulo_name !== targetModule) return

                // Filters
                if (selectedDept !== 'all' && deptName !== selectedDept) return
                if (selectedGroupFilter !== 'all' && groupName !== selectedGroupFilter) return

                if (!activeStudentsMap[studentId]) {
                    activeStudentsMap[studentId] = {
                        id: studentId,
                        nombre: studentInfo.nombre || 'S/N',
                        apellido: studentInfo.apellido || 'S/A',
                        ci: studentInfo.ci || 'S/CI',
                        groupName,
                        deptName,
                        formalizado: studentInfo.formalizado === true,
                        zona: studentInfo.zona || 'S/Z'
                    }
                }
            })

            // Scan rawGradesData just in case
            ; (rawGradesData || []).forEach((g: any) => {
                const studentInfo = g.participantes
                if (!studentInfo) return
                const studentId = studentInfo.id || g.participante_id
                if (!studentId) return

                const programId = g.programa_modulos?.programa_id
                const inscripcion = studentInfo.inscripciones?.find((i: any) => i.programa_id === programId)
                if (!inscripcion || inscripcion.estado !== 'inscrito') return

                const group = inscripcion.grupos
                if (!group) return

                const deptName = group.departamentos?.name || 'S/D'
                const groupName = group.name || 'S/G'

                const modulo_titulo = g.programa_modulos?.titulo_modulo || 'S/M'
                const modulo_grupo = g.programa_modulos?.grupo
                const modulo_prefix = modulo_grupo === 1 ? 'LENGUAJE - ' : modulo_grupo === 2 ? 'MATEMÁTICA - ' : ''
                const full_modulo_name = `${modulo_prefix}${modulo_titulo}`
                if (full_modulo_name !== targetModule) return

                if (selectedDept !== 'all' && deptName !== selectedDept) return
                if (selectedGroupFilter !== 'all' && groupName !== selectedGroupFilter) return

                if (!activeStudentsMap[studentId]) {
                    activeStudentsMap[studentId] = {
                        id: studentId,
                        nombre: studentInfo.nombre || 'S/N',
                        apellido: studentInfo.apellido || 'S/A',
                        ci: studentInfo.ci || 'S/CI',
                        groupName,
                        deptName,
                        formalizado: studentInfo.formalizado === true,
                        zona: studentInfo.zona || 'S/Z'
                    }
                }
            })

        const allStudents = Object.values(activeStudentsMap)
        if (allStudents.length === 0) {
            setNotif({
                show: true,
                type: 'info',
                title: 'Sin Resultados',
                message: 'No se encontraron estudiantes con los filtros seleccionados para este módulo.'
            })
            return
        }

        // Gather daily status maps
        const studentDailyAttendance: Record<string, Record<number, string>> = {}
            ; (rawAttendanceData || []).forEach((a: any) => {
                const studentId = a.participante_id || a.participantes?.id
                if (!studentId || !activeStudentsMap[studentId]) return

                const modulo_titulo = a.programa_modulos?.titulo_modulo || 'S/M'
                const modulo_grupo = a.programa_modulos?.grupo
                const modulo_prefix = modulo_grupo === 1 ? 'LENGUAJE - ' : modulo_grupo === 2 ? 'MATEMÁTICA - ' : ''
                const full_modulo_name = `${modulo_prefix}${modulo_titulo}`
                if (full_modulo_name !== targetModule) return

                const currentDay = Number(a.dia)
                if (!isNaN(currentDay)) {
                    const status = a.estado || 'falta'
                    if (!studentDailyAttendance[studentId]) {
                        studentDailyAttendance[studentId] = {}
                    }
                    const existingStatus = studentDailyAttendance[studentId][currentDay]
                    if (!existingStatus || (STATE_PRIORITY[status] || 0) > (STATE_PRIORITY[existingStatus] || 0)) {
                        studentDailyAttendance[studentId][currentDay] = status
                    }
                }
            })

        // Determine aggregation row items (Groups if dept is selected, Depts if Filtro Nacional)
        let items: string[] = []
        if (selectedDept !== 'all') {
            items = [...new Set(allStudents.map(st => st.groupName))].sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
            )
        } else {
            items = [...new Set(allStudents.map(st => st.deptName))].sort((a, b) =>
                a.localeCompare(b)
            )
        }

        // Calculate rows
        const tableBody = items.map(name => {
            const studentsInItem = allStudents.filter(st => (selectedDept !== 'all' ? st.groupName : st.deptName) === name)
            const totalEnrolled = studentsInItem.length

            let rowActivos = 0
            let rowRural = 0
            let rowUrbano = 0
            let rowMujeres = 0
            let rowHombres = 0
            let rowFalta = 0

            if (selectedDept !== 'all') {
                const groupObj = (enrollmentData || []).find(e => e.group_name === name)
                if (groupObj) {
                    rowActivos = groupObj.total_confirmados || 0
                    rowRural = groupObj.total_rural || 0
                    rowUrbano = groupObj.total_urbano || 0
                    rowMujeres = groupObj.total_mujeres || 0
                    rowHombres = groupObj.total_hombres || 0
                    rowFalta = groupObj.total_falta || 0
                }
            } else {
                const deptGroups = (enrollmentData || []).filter(e => e.dept_name === name)
                rowActivos = deptGroups.reduce((sum, g) => sum + (g.total_confirmados || 0), 0)
                rowRural = deptGroups.reduce((sum, g) => sum + (g.total_rural || 0), 0)
                rowUrbano = deptGroups.reduce((sum, g) => sum + (g.total_urbano || 0), 0)
                rowMujeres = deptGroups.reduce((sum, g) => sum + (g.total_mujeres || 0), 0)
                rowHombres = deptGroups.reduce((sum, g) => sum + (g.total_hombres || 0), 0)
                rowFalta = deptGroups.reduce((sum, g) => sum + (g.total_falta || 0), 0)
            }

            const daysData: any[] = []
            let sumAsist = 0
            let sumFalta = 0
            let sumPermiso = 0

            for (let d = 1; d <= 6; d++) {
                let asist = 0
                let falta = 0
                let permiso = 0

                studentsInItem.forEach(st => {
                    const status = (studentDailyAttendance[st.id] && studentDailyAttendance[st.id][d]) || 'falta'
                    if (status === 'asistio' || status === 'atraso') asist++
                    else if (status === 'permiso') permiso++
                    else falta++
                })

                sumAsist += asist
                sumFalta += falta
                sumPermiso += permiso

                daysData.push(asist, falta, permiso, totalEnrolled)
            }

            const avgAsistVal = Math.round(sumAsist / 6)
            const avgFaltaVal = Math.round(sumFalta / 6)
            const avgPermisoVal = Math.round(sumPermiso / 6)
            const avgTotalVal = totalEnrolled

            const avgAsist = String(avgAsistVal)
            const avgFalta = String(avgFaltaVal)
            const avgPermiso = String(avgPermisoVal)
            const avgTotal = String(avgTotalVal)

            const pctAsist = totalEnrolled > 0 ? Math.round((avgAsistVal / totalEnrolled) * 100) + '%' : '0%'
            const pctFalta = totalEnrolled > 0 ? Math.round((avgFaltaVal / totalEnrolled) * 100) + '%' : '0%'
            const pctPermiso = totalEnrolled > 0 ? Math.round((avgPermisoVal / totalEnrolled) * 100) + '%' : '0%'

            return [
                name.toUpperCase(),
                String(rowActivos),
                String(rowRural),
                String(rowUrbano),
                String(rowMujeres),
                String(rowHombres),
                ...daysData.map(v => String(v)),
                avgAsist,
                avgFalta,
                avgPermiso,
                avgTotal,
                pctAsist,
                pctFalta,
                pctPermiso
            ]
        })

        // Grand Totals Row
        let grandActivos = 0
        let grandRural = 0
        let grandUrbano = 0
        let grandMujeres = 0
        let grandHombres = 0

        tableBody.forEach(row => {
            grandActivos += Number(row[1])
            grandRural += Number(row[2])
            grandUrbano += Number(row[3])
            grandMujeres += Number(row[4])
            grandHombres += Number(row[5])
        })

        const grandDaysData = Array(24).fill(0)
        tableBody.forEach(row => {
            for (let i = 0; i < 24; i++) {
                grandDaysData[i] += Number(row[i + 6])
            }
        })

        let grandSumAsist = 0
        let grandSumFalta = 0
        let grandSumPermiso = 0
        for (let i = 0; i < 24; i += 4) {
            grandSumAsist += grandDaysData[i]
            grandSumFalta += grandDaysData[i + 1]
            grandSumPermiso += grandDaysData[i + 2]
        }

        const grandAvgAsistVal = Math.round(grandSumAsist / 6)
        const grandAvgFaltaVal = Math.round(grandSumFalta / 6)
        const grandAvgPermisoVal = Math.round(grandSumPermiso / 6)
        const grandAvgTotalVal = grandActivos

        const grandAvgAsist = String(grandAvgAsistVal)
        const grandAvgFalta = String(grandAvgFaltaVal)
        const grandAvgPermiso = String(grandAvgPermisoVal)
        const grandAvgTotal = String(grandAvgTotalVal)

        const grandPctAsist = grandActivos > 0 ? Math.round((grandAvgAsistVal / grandActivos) * 100) + '%' : '0%'
        const grandPctFalta = grandActivos > 0 ? Math.round((grandAvgFaltaVal / grandActivos) * 100) + '%' : '0%'
        const grandPctPermiso = grandActivos > 0 ? Math.round((grandAvgPermisoVal / grandActivos) * 100) + '%' : '0%'

        const grandTotalRow = [
            'TOTAL GENERAL',
            String(grandActivos),
            String(grandRural),
            String(grandUrbano),
            String(grandMujeres),
            String(grandHombres),
            ...grandDaysData.map(val => String(val)),
            grandAvgAsist,
            grandAvgFalta,
            grandAvgPermiso,
            grandAvgTotal,
            grandPctAsist,
            grandPctFalta,
            grandPctPermiso
        ]
        tableBody.push(grandTotalRow)

        // Initialize PDF
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()

        // Background Image
        const backgroundImage = 'https://czdeexmxosivvpwwatsq.supabase.co/storage/v1/object/sign/logos/escudo.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85ZTAwNzJkNC00ZTNjLTQ1ZjMtYjZhNC0yZWJmZThkNGNkM2EiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvcy9lc2N1ZG8uanBnIiwiaWF0IjoxNzc5NDc1Nzg4LCJleHAiOjE4MTEwMTE3ODh9.J80uPhXdt8HjRMba6nT-7f5OIJ4vbiEEyQSiQB_CWFc'
        let bgBase64 = ''
        let imgWidth = 0
        let imgHeight = 0
        try {
            bgBase64 = await getBase64ImageFromUrl(backgroundImage)
            await new Promise<void>((resolve) => {
                const img = new Image()
                img.onload = () => {
                    imgWidth = img.naturalWidth
                    imgHeight = img.naturalHeight
                    resolve()
                }
                img.onerror = () => resolve()
                img.src = bgBase64
            })
        } catch (err) {
            console.warn("Failed to pre-load background image", err)
        }

        const addPdfBackground = (pdfDoc: any) => {
            try {
                const w = pdfDoc.internal.pageSize.getWidth()
                const h = pdfDoc.internal.pageSize.getHeight()
                let drawW = w
                let drawH = h
                let x = 0
                let y = 0
                if (imgWidth > 0 && imgHeight > 0) {
                    const imgRatio = imgWidth / imgHeight
                    const pageRatio = w / h
                    if (imgRatio > pageRatio) {
                        drawW = h * imgRatio
                        x = (w - drawW) / 2
                    } else {
                        drawH = w / imgRatio
                        y = (h - drawH) / 2
                    }
                }
                const imgData = bgBase64 || backgroundImage
                let format = 'JPEG'
                if (imgData.startsWith('data:image/png')) format = 'PNG'
                else if (imgData.startsWith('data:image/webp')) format = 'WEBP'
                pdfDoc.addImage(imgData, format, x, y, drawW, drawH)
            } catch (e) {
                console.warn(e)
            }
        }

        const addPdfFooter = (pdfDoc: any) => {
            const totalPages = pdfDoc.internal.getNumberOfPages()
            const w = pdfDoc.internal.pageSize.getWidth()
            const h = pdfDoc.internal.pageSize.getHeight()
            const now = new Date()
            const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
            const footerText = `Centro de Reportes Consolidado | Generado: ${dateStr} ${timeStr}`
            for (let i = 1; i <= totalPages; i++) {
                pdfDoc.setPage(i)
                pdfDoc.setFontSize(6)
                pdfDoc.setFont('helvetica', 'italic')
                pdfDoc.setTextColor(150, 150, 150)
                pdfDoc.text(footerText, w - 14, h - 7, { align: 'right' })
                pdfDoc.text(`Página ${i} de ${totalPages}`, 14, h - 7)
            }
        }

        addPdfBackground(doc)

        // Banner
        doc.setFillColor(201, 167, 81)
        doc.rect(14, 32, pageWidth - 28, 9, 'F')
        doc.setFontSize(11)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.text('CONSOLIDADO DE ASISTENCIA — REPORTE RESUMEN', pageWidth / 2, 38, { align: 'center' })

        // Subtitle: module name + dept/group filter
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(80, 60, 20)
        const subtitleLeft = `${targetModule.toUpperCase()}`
        const subtitleRight = `${deptLabel !== 'Nacional' ? `SEDE: ${deptLabel.toUpperCase()}` : 'FILTRO NACIONAL'}  |  GRUPO: ${groupLabel.toUpperCase()}`
        doc.text(subtitleLeft, 14, 45)
        doc.text(subtitleRight, pageWidth - 14, 45, { align: 'right' })

        // Thin separator line
        doc.setDrawColor(201, 167, 81)
        doc.setLineWidth(0.4)
        doc.line(14, 47, pageWidth - 14, 47)

        const tableStartY = 51

        // Multi-level Matrix headers — col labels 0-5 are drawn rotated via didDrawCell
        const fixedColLabels = [
            selectedDept !== 'all' ? 'GRUPO' : 'DEPARTAMENTO',
            'TOTAL ACTIVOS',
            'RURAL',
            'URBANO',
            'MUJERES',
            'HOMBRES'
        ]
        const header1: any[] = [
            { content: '', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: '', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: '', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: '', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: '', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: '', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'DIA 1', colSpan: 4, styles: { halign: 'center' as const } },
            { content: 'DIA 2', colSpan: 4, styles: { halign: 'center' as const } },
            { content: 'DIA 3', colSpan: 4, styles: { halign: 'center' as const } },
            { content: 'DIA 4', colSpan: 4, styles: { halign: 'center' as const } },
            { content: 'DIA 5', colSpan: 4, styles: { halign: 'center' as const } },
            { content: 'DIA 6 (PRESENCIAL)', colSpan: 4, styles: { halign: 'center' as const } },
            { content: 'PROMEDIOS DIARIOS', colSpan: 4, styles: { halign: 'center' as const } },
            { content: 'PORCENTAJES DE ASISTENCIA', colSpan: 3, styles: { halign: 'center' as const } }
        ]
        const subHeaderLabels = [
            'Asistencias', 'Falta', 'Permisos', 'Total',
            'Asistencias', 'Falta', 'Permisos', 'Total',
            'Asistencias', 'Falta', 'Permisos', 'Total',
            'Asistencias', 'Falta', 'Permisos', 'Total',
            'Asistencias', 'Falta', 'Permisos', 'Total',
            'Asistencias', 'Falta', 'Permisos', 'Total',
            'Asistencias', 'Falta', 'Permisos', 'Total',
            '% Asistencias', '% Falta', '% Permisos'
        ]
        const header2 = subHeaderLabels.map(() => ' ')

        autoTable(doc, {
            startY: tableStartY,
            head: [header1, header2] as any,
            body: tableBody,
            theme: 'grid',
            willDrawPage: (data) => {
                if (data.pageNumber > 1) {
                    addPdfBackground(doc)
                }
            },
            headStyles: {
                fillColor: [201, 167, 81],
                textColor: 255,
                fontSize: 6,
                halign: 'center',
                valign: 'middle',
                lineWidth: 0.05,
                lineColor: [120, 100, 40],
                fontStyle: 'bold'
            },
            alternateRowStyles: { fillColor: [253, 252, 248] },
            styles: { fontSize: 6, cellPadding: 1.2, textColor: [30, 30, 30], lineWidth: 0.05, lineColor: [200, 200, 200] },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 18 },
                1: { cellWidth: 10, halign: 'center' },
                2: { cellWidth: 10, halign: 'center' },
                3: { cellWidth: 10, halign: 'center' },
                4: { cellWidth: 10, halign: 'center' },
                5: { cellWidth: 10, halign: 'center' }
            },
            margin: { top: 25, left: 14, right: 14 },
            didParseCell: (data: any) => {
                if (data.section === 'head') {
                    // Taller rows to accommodate 90° rotated text in fixed columns
                    if (data.row.index === 0 && data.column.index < 6) {
                        data.cell.styles.minCellHeight = 28
                    }
                    if (data.row.index === 1) {
                        data.cell.styles.minCellHeight = 20
                    }
                }
                if (data.section === 'body') {
                    if (data.column.index > 0) {
                        data.cell.styles.halign = 'center'
                    }
                    // Highlight red if gender sum does not match active total
                    if (data.column.index === 4 || data.column.index === 5) {
                        const act = Number(data.row.raw[1])
                        const muj = Number(data.row.raw[4])
                        const hom = Number(data.row.raw[5])
                        if (act !== muj + hom) {
                            data.cell.styles.textColor = [220, 38, 38] // Strong red
                            data.cell.styles.fontStyle = 'bold'
                        }
                    }
                    // Differentiate Total columns visually
                    const isTotalColumn = [1, 2, 3, 4, 5, 9, 13, 17, 21, 25, 29, 33].includes(data.column.index)
                    if (isTotalColumn) {
                        data.cell.styles.fillColor = [242, 238, 224] // Soft tinted cream background for totals
                        data.cell.styles.fontStyle = 'bold' // Bold text for totals
                    }
                    // Highlight grand total row
                    if (data.row.index === tableBody.length - 1) {
                        data.cell.styles.fillColor = [225, 215, 185] // A richer gold/cream for the grand total row
                        data.cell.styles.fontStyle = 'bold'
                    }
                    // Color the average percentages columns
                    if (data.column.index >= 34) {
                        data.cell.styles.fontStyle = 'bold'
                        if (data.column.index === 34) data.cell.styles.textColor = [16, 185, 129] // Green
                        else if (data.column.index === 35) data.cell.styles.textColor = [239, 68, 68] // Red
                        else data.cell.styles.textColor = [167, 139, 250] // Purple
                    }
                }
            },
            didDrawCell: (data: any) => {
                const docPdf = data.doc
                const cell = data.cell

                // Rotate fixed column headers (cols 0-5, row 0) 90°
                if (data.section === 'head' && data.row.index === 0 && data.column.index < 6) {
                    const label = fixedColLabels[data.column.index]
                    if (label) {
                        docPdf.saveGraphicsState()
                        docPdf.setFontSize(5.5)
                        docPdf.setFont('helvetica', 'bold')
                        docPdf.setTextColor(255, 255, 255)
                        // Draw text centered in cell, rotated 90° upward
                        const cx = cell.x + cell.width / 2
                        const cy = cell.y + cell.height - 2
                        docPdf.text(label, cx, cy, { angle: 90, align: 'left' })
                        docPdf.restoreGraphicsState()
                    }
                }

                // Rotate sub-header labels (row 1, cols 6+) 90°
                if (data.section === 'head' && data.row.index === 1 && data.column.index >= 6) {
                    const textIndex = data.column.index - 6
                    const text = subHeaderLabels[textIndex]
                    if (text) {
                        docPdf.saveGraphicsState()
                        docPdf.setFontSize(5.5)
                        docPdf.setFont('helvetica', 'bold')
                        docPdf.setTextColor(255, 255, 255)
                        const x = cell.x + cell.width / 2
                        const y = cell.y + cell.height - 2
                        docPdf.text(text, x, y, { angle: 90, align: 'left' })
                        docPdf.restoreGraphicsState()
                    }
                }
            }
        })

        const mainFinalY = (doc as any).lastAutoTable.finalY || 150
        let currentY = mainFinalY + 8

        if (currentY > pageHeight - 45) {
            doc.addPage()
            addPdfBackground(doc)
            currentY = 25
        }


        addPdfFooter(doc)
        doc.save(`REPORTE_ASISTENCIA_${deptLabel.replace(/\s+/g, '_')}_${targetModule.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    const exportPDFCalificaciones = async () => {
        if (selectedModules.length !== 1) {
            setNotif({
                show: true,
                type: 'info',
                title: 'Selección Requerida',
                message: 'Debe seleccionar exactamente un (1) Módulo Temático en el panel de control antes de imprimir el PDF de Calificaciones.'
            })
            return
        }

        const targetModule = selectedModules[0]
        const deptLabel = selectedDept === 'all' ? 'Nacional' : selectedDept
        const groupLabel = selectedGroupFilter === 'all' ? 'Todos los Grupos' : selectedGroupFilter

        // 1. Gather student details
        const activeStudentsMap: Record<string, {
            id: string
            nombre: string
            apellido: string
            ci: string
            groupName: string
            deptName: string
            formalizado: boolean
            zona: string
        }> = {}

            // Scan rawGradesData
            ; (rawGradesData || []).forEach((g: any) => {
                const studentInfo = g.participantes
                if (!studentInfo) return
                const studentId = studentInfo.id || g.participante_id
                if (!studentId) return

                const programId = g.programa_modulos?.programa_id
                const inscripcion = studentInfo.inscripciones?.find((i: any) => i.programa_id === programId)
                if (!inscripcion || inscripcion.estado !== 'inscrito') return

                const group = inscripcion.grupos
                if (!group) return

                const deptName = group.departamentos?.name || 'S/D'
                const groupName = group.name || 'S/G'

                const modulo_titulo = g.programa_modulos?.titulo_modulo || 'S/M'
                const modulo_grupo = g.programa_modulos?.grupo
                const modulo_prefix = modulo_grupo === 1 ? 'LENGUAJE - ' : modulo_grupo === 2 ? 'MATEMÁTICA - ' : ''
                const full_modulo_name = `${modulo_prefix}${modulo_titulo}`
                if (full_modulo_name !== targetModule) return

                if (selectedDept !== 'all' && deptName !== selectedDept) return
                if (selectedGroupFilter !== 'all' && groupName !== selectedGroupFilter) return

                if (!activeStudentsMap[studentId]) {
                    activeStudentsMap[studentId] = {
                        id: studentId,
                        nombre: studentInfo.nombre || 'S/N',
                        apellido: studentInfo.apellido || 'S/A',
                        ci: studentInfo.ci || 'S/CI',
                        groupName,
                        deptName,
                        formalizado: studentInfo.formalizado === true,
                        zona: studentInfo.zona || 'S/Z'
                    }
                }
            })

            // Scan rawAttendanceData
            ; (rawAttendanceData || []).forEach((a: any) => {
                const studentInfo = a.participantes
                if (!studentInfo) return
                const studentId = studentInfo.id || a.participante_id
                if (!studentId) return

                const programId = a.programa_modulos?.programa_id
                const inscripcion = studentInfo.inscripciones?.find((i: any) => i.programa_id === programId)
                if (!inscripcion || inscripcion.estado !== 'inscrito') return

                const group = inscripcion.grupos
                if (!group) return

                const deptName = group.departamentos?.name || 'S/D'
                const groupName = group.name || 'S/G'

                const modulo_titulo = a.programa_modulos?.titulo_modulo || 'S/M'
                const modulo_grupo = a.programa_modulos?.grupo
                const modulo_prefix = modulo_grupo === 1 ? 'LENGUAJE - ' : modulo_grupo === 2 ? 'MATEMÁTICA - ' : ''
                const full_modulo_name = `${modulo_prefix}${modulo_titulo}`
                if (full_modulo_name !== targetModule) return

                if (selectedDept !== 'all' && deptName !== selectedDept) return
                if (selectedGroupFilter !== 'all' && groupName !== selectedGroupFilter) return

                if (!activeStudentsMap[studentId]) {
                    activeStudentsMap[studentId] = {
                        id: studentId,
                        nombre: studentInfo.nombre || 'S/N',
                        apellido: studentInfo.apellido || 'S/A',
                        ci: studentInfo.ci || 'S/CI',
                        groupName,
                        deptName,
                        formalizado: studentInfo.formalizado === true,
                        zona: studentInfo.zona || 'S/Z'
                    }
                }
            })

        const studentRows = Object.values(activeStudentsMap).map(st => {
            const studentGradeRecord = (rawGradesData || []).find((g: any) => {
                const studentId = g.participante_id || g.participantes?.id
                if (studentId !== st.id) return false

                const modulo_titulo = g.programa_modulos?.titulo_modulo || 'S/M'
                const modulo_grupo = g.programa_modulos?.grupo
                const modulo_prefix = modulo_grupo === 1 ? 'LENGUAJE - ' : modulo_grupo === 2 ? 'MATEMÁTICA - ' : ''
                const full_modulo_name = `${modulo_prefix}${modulo_titulo}`
                return full_modulo_name === targetModule
            })

            const nota = studentGradeRecord ? Number(studentGradeRecord.total || 0) : 0
            const hasGrade = !!studentGradeRecord

            let estado = 'S/R'
            if (hasGrade) {
                if (nota === 0) estado = 'ABANDONO'
                else if (nota >= 51) estado = 'APROBADO'
                else estado = 'REPROBADO'
            }

            return {
                ...st,
                nota: hasGrade ? nota : null,
                estado
            }
        })

        if (studentRows.length === 0) {
            setNotif({
                show: true,
                type: 'info',
                title: 'Sin Resultados',
                message: 'No se encontraron estudiantes con los filtros seleccionados para este módulo.'
            })
            return
        }

        // Group rows (Group or Department)
        let items: string[] = []
        if (selectedDept !== 'all') {
            items = [...new Set(studentRows.map(st => st.groupName))].sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
            )
        } else {
            items = [...new Set(studentRows.map(st => st.deptName))].sort((a, b) =>
                a.localeCompare(b)
            )
        }

        // Build attendance map for calificaciones
        const calAttDailyMap: Record<string, Record<number, string>> = {}
        const STATE_PRIORITY_CAL: Record<string, number> = { 'asistio': 4, 'atraso': 3, 'permiso': 2, 'falta': 1 }
            ; (rawAttendanceData || []).forEach((a: any) => {
                const studentId = a.participante_id || a.participantes?.id
                if (!studentId || !activeStudentsMap[studentId]) return

                const modulo_titulo = a.programa_modulos?.titulo_modulo || 'S/M'
                const modulo_grupo = a.programa_modulos?.grupo
                const modulo_prefix = modulo_grupo === 1 ? 'LENGUAJE - ' : modulo_grupo === 2 ? 'MATEMÁTICA - ' : ''
                const full_modulo_name = `${modulo_prefix}${modulo_titulo}`
                if (full_modulo_name !== targetModule) return

                const currentDay = Number(a.dia)
                if (!isNaN(currentDay)) {
                    const status = a.estado || 'falta'
                    if (!calAttDailyMap[studentId]) calAttDailyMap[studentId] = {}
                    const existing = calAttDailyMap[studentId][currentDay]
                    if (!existing || (STATE_PRIORITY_CAL[status] || 0) > (STATE_PRIORITY_CAL[existing] || 0)) {
                        calAttDailyMap[studentId][currentDay] = status
                    }
                }
            })

        const tableBody = items.map(name => {
            const studentsInItem = studentRows.filter(st => (selectedDept !== 'all' ? st.groupName : st.deptName) === name)
            const calificados = studentsInItem.length
            const aprobados = studentsInItem.filter(st => st.estado === 'APROBADO').length
            const reprobados = studentsInItem.filter(st => st.estado === 'REPROBADO').length
            const abandonos = studentsInItem.filter(st => st.estado === 'ABANDONO').length

            const scoredStudents = studentsInItem.filter(st => st.nota !== null)
            const sumGrades = scoredStudents.reduce((a, r) => a + (r.nota || 0), 0)
            const promedio = scoredStudents.length > 0 ? (sumGrades / scoredStudents.length).toFixed(1) : '0.0'
            const tasa = calificados > 0 ? ((aprobados / calificados) * 100).toFixed(0) + '%' : '0%'

            // Enrollment data (activos, rural, urbano, mujeres, hombres, falta)
            let rowActivos = 0
            let rowRural = 0
            let rowUrbano = 0
            let rowMujeres = 0
            let rowHombres = 0
            let rowFalta = 0
            if (selectedDept !== 'all') {
                const groupObj = (enrollmentData || []).find(e => e.group_name === name)
                if (groupObj) {
                    rowActivos = groupObj.total_confirmados || 0
                    rowRural = groupObj.total_rural || 0
                    rowUrbano = groupObj.total_urbano || 0
                    rowMujeres = groupObj.total_mujeres || 0
                    rowHombres = groupObj.total_hombres || 0
                    rowFalta = groupObj.total_falta || 0
                }
            } else {
                const deptGroups = (enrollmentData || []).filter(e => e.dept_name === name)
                rowActivos = deptGroups.reduce((sum, g) => sum + (g.total_confirmados || 0), 0)
                rowRural = deptGroups.reduce((sum, g) => sum + (g.total_rural || 0), 0)
                rowUrbano = deptGroups.reduce((sum, g) => sum + (g.total_urbano || 0), 0)
                rowMujeres = deptGroups.reduce((sum, g) => sum + (g.total_mujeres || 0), 0)
                rowHombres = deptGroups.reduce((sum, g) => sum + (g.total_hombres || 0), 0)
                rowFalta = deptGroups.reduce((sum, g) => sum + (g.total_falta || 0), 0)
            }

            // Attendance aggregates for the 6 days
            let sumAsist = 0, sumFalta = 0, sumPermiso = 0
            for (let d = 1; d <= 6; d++) {
                studentsInItem.forEach(st => {
                    const status = (calAttDailyMap[st.id] && calAttDailyMap[st.id][d]) || 'falta'
                    if (status === 'asistio' || status === 'atraso') sumAsist++
                    else if (status === 'permiso') sumPermiso++
                    else sumFalta++
                })
            }
            const avgAsistVal = Math.round(sumAsist / 6)
            const avgFaltaVal = Math.round(sumFalta / 6)
            const avgPermisoVal = Math.round(sumPermiso / 6)
            const pctAsist = calificados > 0 ? Math.round((avgAsistVal / calificados) * 100) + '%' : '0%'
            const pctFalta = calificados > 0 ? Math.round((avgFaltaVal / calificados) * 100) + '%' : '0%'
            const pctPermiso = calificados > 0 ? Math.round((avgPermisoVal / calificados) * 100) + '%' : '0%'

            const pctAprobados = calificados > 0 ? Math.round((aprobados / calificados) * 100) : 0
            const pctReprobados = calificados > 0 ? Math.round((reprobados / calificados) * 100) : 0
            const pctAbandonos = calificados > 0 ? Math.round((abandonos / calificados) * 100) : 0

            return [
                name.toUpperCase(),
                String(rowActivos),
                String(rowRural),
                String(rowUrbano),
                String(rowMujeres),
                String(rowHombres),
                pctAsist,
                pctFalta,
                pctPermiso,
                `${aprobados} (${pctAprobados}%)`,
                `${reprobados} (${pctReprobados}%)`,
                `${abandonos} (${pctAbandonos}%)`,
                String(calificados)
            ]
        })

        // Grand Totals row for Grades
        let totalCalificadosAll = 0
        let totalAprobadosAll = 0
        let totalReprobadosAll = 0
        let totalAbandonosAll = 0
        let grandActivos = 0
        let grandRural = 0
        let grandUrbano = 0
        let grandMujeres = 0
        let grandHombres = 0
        let grandSumAsist = 0, grandSumFalta = 0, grandSumPermiso = 0

        studentRows.forEach(st => {
            totalCalificadosAll++
            if (st.estado === 'APROBADO') totalAprobadosAll++
            else if (st.estado === 'REPROBADO') totalReprobadosAll++
            else if (st.estado === 'ABANDONO') totalAbandonosAll++

            for (let d = 1; d <= 6; d++) {
                const status = (calAttDailyMap[st.id] && calAttDailyMap[st.id][d]) || 'falta'
                if (status === 'asistio' || status === 'atraso') grandSumAsist++
                else if (status === 'permiso') grandSumPermiso++
                else grandSumFalta++
            }
        })

        if (selectedDept !== 'all') {
            items.forEach(name => {
                const groupObj = (enrollmentData || []).find(e => e.group_name === name)
                if (groupObj) {
                    grandActivos += groupObj.total_confirmados || 0
                    grandRural += groupObj.total_rural || 0
                    grandUrbano += groupObj.total_urbano || 0
                    grandMujeres += groupObj.total_mujeres || 0
                    grandHombres += groupObj.total_hombres || 0
                }
            })
        } else {
            items.forEach(name => {
                const deptGroups = (enrollmentData || []).filter(e => e.dept_name === name)
                grandActivos += deptGroups.reduce((sum, g) => sum + (g.total_confirmados || 0), 0)
                grandRural += deptGroups.reduce((sum, g) => sum + (g.total_rural || 0), 0)
                grandUrbano += deptGroups.reduce((sum, g) => sum + (g.total_urbano || 0), 0)
                grandMujeres += deptGroups.reduce((sum, g) => sum + (g.total_mujeres || 0), 0)
                grandHombres += deptGroups.reduce((sum, g) => sum + (g.total_hombres || 0), 0)
            })
        }

        const grandAvgAsist = Math.round(grandSumAsist / 6)
        const grandAvgFalta = Math.round(grandSumFalta / 6)
        const grandAvgPermiso = Math.round(grandSumPermiso / 6)
        const grandPctAsist = totalCalificadosAll > 0 ? Math.round((grandAvgAsist / totalCalificadosAll) * 100) + '%' : '0%'
        const grandPctFalta = totalCalificadosAll > 0 ? Math.round((grandAvgFalta / totalCalificadosAll) * 100) + '%' : '0%'
        const grandPctPermiso = totalCalificadosAll > 0 ? Math.round((grandAvgPermiso / totalCalificadosAll) * 100) + '%' : '0%'

        const grandPctAprobados = totalCalificadosAll > 0 ? Math.round((totalAprobadosAll / totalCalificadosAll) * 100) : 0
        const grandPctReprobados = totalCalificadosAll > 0 ? Math.round((totalReprobadosAll / totalCalificadosAll) * 100) : 0
        const grandPctAbandonos = totalCalificadosAll > 0 ? Math.round((totalAbandonosAll / totalCalificadosAll) * 100) : 0

        const grandTotalRow = [
            'TOTAL GENERAL',
            String(grandActivos),
            String(grandRural),
            String(grandUrbano),
            String(grandMujeres),
            String(grandHombres),
            grandPctAsist,
            grandPctFalta,
            grandPctPermiso,
            `${totalAprobadosAll} (${grandPctAprobados}%)`,
            `${totalReprobadosAll} (${grandPctReprobados}%)`,
            `${totalAbandonosAll} (${grandPctAbandonos}%)`,
            String(totalCalificadosAll)
        ]
        tableBody.push(grandTotalRow)

        // Initialize PDF
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()

        // Background
        const backgroundImage = 'https://czdeexmxosivvpwwatsq.supabase.co/storage/v1/object/sign/logos/escudo.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85ZTAwNzJkNC00ZTNjLTQ1ZjMtYjZhNC0yZWJmZThkNGNkM2EiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvcy9lc2N1ZG8uanBnIiwiaWF0IjoxNzc5NDc1Nzg4LCJleHAiOjE4MTEwMTE3ODh9.J80uPhXdt8HjRMba6nT-7f5OIJ4vbiEEyQSiQB_CWFc'
        let bgBase64 = ''
        let imgWidth = 0
        let imgHeight = 0
        try {
            bgBase64 = await getBase64ImageFromUrl(backgroundImage)
            await new Promise<void>((resolve) => {
                const img = new Image()
                img.onload = () => {
                    imgWidth = img.naturalWidth
                    imgHeight = img.naturalHeight
                    resolve()
                }
                img.onerror = () => resolve()
                img.src = bgBase64
            })
        } catch (err) {
            console.warn(err)
        }

        const addPdfBackground = (pdfDoc: any) => {
            try {
                const w = pdfDoc.internal.pageSize.getWidth()
                const h = pdfDoc.internal.pageSize.getHeight()
                let drawW = w
                let drawH = h
                let x = 0
                let y = 0
                if (imgWidth > 0 && imgHeight > 0) {
                    const imgRatio = imgWidth / imgHeight
                    const pageRatio = w / h
                    if (imgRatio > pageRatio) {
                        drawW = h * imgRatio
                        x = (w - drawW) / 2
                    } else {
                        drawH = w / imgRatio
                        y = (h - drawH) / 2
                    }
                }
                const imgData = bgBase64 || backgroundImage
                let format = 'JPEG'
                if (imgData.startsWith('data:image/png')) format = 'PNG'
                else if (imgData.startsWith('data:image/webp')) format = 'WEBP'
                pdfDoc.addImage(imgData, format, x, y, drawW, drawH)
            } catch (e) {
                console.warn(e)
            }
        }

        const addPdfFooter = (pdfDoc: any) => {
            const totalPages = pdfDoc.internal.getNumberOfPages()
            const w = pdfDoc.internal.pageSize.getWidth()
            const h = pdfDoc.internal.pageSize.getHeight()
            const now = new Date()
            const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
            const footerText = `Centro de Reportes Consolidado | Generado: ${dateStr} ${timeStr}`
            for (let i = 1; i <= totalPages; i++) {
                pdfDoc.setPage(i)
                pdfDoc.setFontSize(6)
                pdfDoc.setFont('helvetica', 'italic')
                pdfDoc.setTextColor(150, 150, 150)
                pdfDoc.text(footerText, w - 14, h - 7, { align: 'right' })
                pdfDoc.text(`Página ${i} de ${totalPages}`, 14, h - 7)
            }
        }

        addPdfBackground(doc)

        // Banner
        doc.setFillColor(201, 167, 81)
        doc.rect(14, 32, pageWidth - 28, 9, 'F')
        doc.setFontSize(11)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.text('CONSOLIDADO DE CALIFICACIONES — REPORTE RESUMEN', pageWidth / 2, 38, { align: 'center' })

        // Get module date
        const selectedModuleObj = (rawGradesData || []).find((g: any) => {
            const modulo_titulo = g.programa_modulos?.titulo_modulo || 'S/M'
            const modulo_grupo = g.programa_modulos?.grupo
            const modulo_prefix = modulo_grupo === 1 ? 'LENGUAJE - ' : modulo_grupo === 2 ? 'MATEMÁTICA - ' : ''
            const full_modulo_name = `${modulo_prefix}${modulo_titulo}`
            return full_modulo_name === targetModule
        })

        // Subtitle: module name + dept/group filter
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(80, 60, 20)
        const subtitleLeft = `${targetModule.toUpperCase()}`
        const subtitleRight = `${deptLabel !== 'Nacional' ? `SEDE: ${deptLabel.toUpperCase()}` : 'FILTRO NACIONAL'}  |  GRUPO: ${groupLabel.toUpperCase()}`
        doc.text(subtitleLeft, 14, 45)
        doc.text(subtitleRight, pageWidth - 14, 45, { align: 'right' })

        // Thin separator line
        doc.setDrawColor(201, 167, 81)
        doc.setLineWidth(0.4)
        doc.line(14, 47, pageWidth - 14, 47)

        const tableStartY = 51


        // Draw Grades table
        autoTable(doc, {
            startY: tableStartY,
            head: [[
                selectedDept !== 'all' ? 'GRUPO' : 'DEPARTAMENTO',
                'ACTIVOS', 'RURAL', 'URBANO',
                'MUJERES', 'HOMBRES', 'FALTA',
                '% ASISTIDOS', '% FALTAS', '% PERMISOS',
                'APROBADOS', 'REPROBADOS', 'ABANDONOS', 'OBSERVACIONES'
            ]],
            body: tableBody,
            theme: 'grid',
            willDrawPage: (data) => {
                if (data.pageNumber > 1) {
                    addPdfBackground(doc)
                }
            },
            headStyles: {
                fillColor: [201, 167, 81],
                textColor: 255,
                fontSize: 6,
                halign: 'center',
                valign: 'middle',
                lineWidth: 0.05,
                lineColor: [120, 100, 40],
                fontStyle: 'bold',
                minCellHeight: 10
            },
            alternateRowStyles: { fillColor: [253, 252, 248] },
            styles: { fontSize: 6.5, cellPadding: 1.2, textColor: [30, 30, 30], lineWidth: 0.05, lineColor: [200, 200, 200] },
            tableWidth: pageWidth - 28,
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 35, halign: 'left' },
                1: { halign: 'center', cellWidth: 14, fillColor: [242, 238, 224], fontStyle: 'bold' },
                2: { halign: 'center', cellWidth: 14 },
                3: { halign: 'center', cellWidth: 14 },
                4: { halign: 'center', cellWidth: 14 },
                5: { halign: 'center', cellWidth: 14 },
                6: { halign: 'center', cellWidth: 14 },
                7: { halign: 'center', cellWidth: 20, textColor: [16, 185, 129], fontStyle: 'bold' },
                8: { halign: 'center', cellWidth: 20, textColor: [239, 68, 68], fontStyle: 'bold' },
                9: { halign: 'center', cellWidth: 20, textColor: [167, 139, 250], fontStyle: 'bold' },
                10: { halign: 'center', cellWidth: 25, textColor: [16, 185, 129], fontStyle: 'bold' },
                11: { halign: 'center', cellWidth: 25, textColor: [239, 68, 68], fontStyle: 'bold' },
                12: { halign: 'center', cellWidth: 20, textColor: [100, 100, 100], fontStyle: 'bold' },
                13: { halign: 'center', cellWidth: 18, fillColor: [242, 238, 224], fontStyle: 'bold' }
            },
            margin: { top: 25, left: 14, right: 14 },
            didParseCell: (data: any) => {
                if (data.section === 'body') {
                    if (data.row.index === tableBody.length - 1) {
                        data.cell.styles.fillColor = [225, 215, 185]
                        data.cell.styles.fontStyle = 'bold'
                    }
                }
            }
        })

        const mainFinalY = (doc as any).lastAutoTable.finalY || 150
        let currentY = mainFinalY + 8

        if (currentY > pageHeight - 45) {
            doc.addPage()
            addPdfBackground(doc)
            currentY = 25
        }


        addPdfFooter(doc)
        doc.save(`REPORTE_CALIFICACIONES_${deptLabel.replace(/\s+/g, '_')}_${targetModule.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    const exportAll = () => {
        const ws1 = XLSX.utils.json_to_sheet(attendanceData)
        const ws2 = XLSX.utils.json_to_sheet(enrollmentData)
        const ws3 = XLSX.utils.json_to_sheet(attendanceByModulesData)
        const ws4 = XLSX.utils.json_to_sheet(gradesData)

        const destacadosExportData = destacadosFiltered.map((st, idx) => ({
            Rank: idx + 1,
            CI: st.ci,
            Nombre: st.nombre,
            Apellido: st.apellido,
            Grupo: st.groupName,
            Sede: st.deptName,
            "Calificación Promedio": st.averageGrade !== null ? Math.round(st.averageGrade) : 'S/C',
            "Asistencia %": Math.round(st.attendanceRate) + '%'
        }))

        const riesgoExportData = riesgoFiltered.map((st) => ({
            CI: st.ci,
            Nombre: st.nombre,
            Apellido: st.apellido,
            Grupo: st.groupName,
            Sede: st.deptName,
            "Faltas Totales": st.faltaCount,
            "Asistencia %": Math.round(st.attendanceRate) + '%',
            "Calificación Promedio": st.averageGrade !== null ? Math.round(st.averageGrade) : "Sin calificaciones",
            "Módulos y Fechas": st.grades.map(g => `${g.moduloName} (Nota: ${g.total}, Fechas: ${g.fechaInicio} a ${g.fechaFin})`).join(' | ')
        }))

        const ws5 = XLSX.utils.json_to_sheet(destacadosExportData)
        const ws6 = XLSX.utils.json_to_sheet(riesgoExportData)

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws1, "Asistencias")
        XLSX.utils.book_append_sheet(wb, ws2, "Inscripciones")
        XLSX.utils.book_append_sheet(wb, ws3, "Asistencias por Módulos")
        XLSX.utils.book_append_sheet(wb, ws4, "Calificaciones por Módulos")
        XLSX.utils.book_append_sheet(wb, ws5, "Estudiantes Destacados")
        XLSX.utils.book_append_sheet(wb, ws6, "Riesgo de Abandono")
        XLSX.writeFile(wb, `PROFE_Master_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    return (
        <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Dynamic Navigation Bar */}
            <div className="glass card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', padding: '1rem 1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--surface)', padding: '0.3rem', borderRadius: '0.85rem', flexWrap: 'wrap' }}>
                    <TabBtn active={tab === 'resumen'} onClick={() => setTab('resumen')} icon={LayoutDashboard} label="Dashboard" />
                    <TabBtn active={tab === 'analisis'} onClick={() => setTab('analisis')} icon={Zap} label="Análisis Estratégico" />
                    {/* <TabBtn active={tab === 'operativo'} onClick={() => setTab('operativo')} icon={Layers} label="Ficha Operativa" /> */}
                    <TabBtn active={tab === 'asistencia_modulos'} onClick={() => setTab('asistencia_modulos')} icon={CheckSquare} label="Asistencia por Módulos" />
                    <TabBtn active={tab === 'calificaciones_modulos'} onClick={() => setTab('calificaciones_modulos')} icon={TrendingUp} label="Calificaciones por Módulos" />
                    <TabBtn active={tab === 'control_progreso'} onClick={() => setTab('control_progreso')} icon={ClipboardCheck} label="Control de Progreso" />
                    <TabBtn active={tab === 'destacados'} onClick={() => setTab('destacados')} icon={UserCheck} label="Estudiantes Destacados" />
                    <TabBtn active={tab === 'riesgo_abandono'} onClick={() => setTab('riesgo_abandono')} icon={AlertTriangle} label="Riesgo de Abandono" />
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
                    <button
                        className="btn"
                        onClick={exportPDFAsistencia}
                        title="Exportar resumen de Asistencia en PDF"
                        style={{ background: 'rgba(201,167,81,0.12)', color: '#C9a751', border: '1px solid rgba(201,167,81,0.35)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '0.75rem', cursor: 'pointer', fontSize: '0.82rem' }}
                    >
                        <FileDown size={16} /> PDF Asistencia
                    </button>
                    <button
                        className="btn"
                        onClick={exportPDFCalificaciones}
                        title="Exportar resumen de Calificaciones en PDF"
                        style={{ background: 'rgba(201,167,81,0.12)', color: '#C9a751', border: '1px solid rgba(201,167,81,0.35)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '0.75rem', cursor: 'pointer', fontSize: '0.82rem' }}
                    >
                        <FileDown size={16} /> PDF Calificaciones
                    </button>
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
                                <Bar yAxisId="left" dataKey="Abandonos" name="Abandonos" stackId="g" fill={COLORS.warning} />
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
                /* Ficha Operativa — TEMPORALMENTE DESACTIVADA */
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-3)' }}>
                    Sección desactivada temporalmente.
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
            ) : tab === 'control_progreso' ? (
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
            ) : tab === 'destacados' ? (
                /* Tabla de Estudiantes Destacados (Top 40) */
                <div className="glass card animate-fade-up" style={{ padding: 0 }}>
                    <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, var(--surface), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ marginBottom: '0.5rem' }}>Estudiantes Destacados (Top 40)</h2>
                            <p style={{ color: 'var(--foreground-3)', fontSize: '0.9rem' }}>Identificados por alto porcentaje de asistencia y excelentes calificaciones</p>
                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--primary)' }}>
                                <Zap size={12} />
                                <span>Muestra de los mejores estudiantes ordenados por promedio de nota y porcentaje de asistencia.</span>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>
                            Estudiantes en ranking: {destacadosFiltered.length}
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '80px', textAlign: 'center' }}>Puesto</th>
                                    <th>Estudiante</th>
                                    <th>CI</th>
                                    <th>Grupo / Sede</th>
                                    <th style={{ textAlign: 'center' }}>Asistencia %</th>
                                    <th style={{ textAlign: 'center' }}>Clases (Asist / Tardes / Faltas)</th>
                                    <th style={{ textAlign: 'center' }}>Promedio Calificación</th>
                                    <th style={{ textAlign: 'center' }}>Estatus</th>
                                </tr>
                            </thead>
                            <tbody>
                                {destacadosFiltered.map((st, idx) => {
                                    const rankColors = [
                                        'linear-gradient(135deg, #ffd700, #b8860b)', // Oro
                                        'linear-gradient(135deg, #c0c0c0, #808080)', // Plata
                                        'linear-gradient(135deg, #cd7f32, #8b4513)', // Bronce
                                    ]

                                    return (
                                        <tr key={st.id} className="hover-row">
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '50%',
                                                    background: idx < 3 ? rankColors[idx] : 'var(--surface)',
                                                    color: idx < 3 ? 'white' : 'var(--foreground-2)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    margin: '0 auto',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 900,
                                                    boxShadow: idx < 3 ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                                                }}>
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 800, color: 'var(--foreground)' }}>
                                                    {st.apellido}, {st.nombre}
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 600, color: 'var(--foreground-2)' }}>{st.ci}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{st.groupName}</span>
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--foreground-3)' }}>📍 {st.deptName}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="badge" style={{
                                                    background: st.attendanceRate >= 90 ? 'var(--success-light)' : 'var(--primary-light)',
                                                    color: st.attendanceRate >= 90 ? COLORS.success : COLORS.primary,
                                                    fontWeight: 900,
                                                    fontSize: '0.78rem'
                                                }}>
                                                    {Math.round(st.attendanceRate)}%
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--foreground-3)' }}>
                                                <b>{st.asistioCount}</b> asis. / <b>{st.atrasoCount}</b> tard. / <span style={{ color: st.faltaCount > 0 ? COLORS.danger : 'inherit' }}>{st.faltaCount} falt.</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="badge" style={{
                                                    background: 'rgba(187, 151, 58, 0.15)',
                                                    color: 'var(--primary)',
                                                    fontWeight: 900,
                                                    fontSize: '0.82rem',
                                                    border: '1px solid rgba(187, 151, 58, 0.3)'
                                                }}>
                                                    {st.averageGrade !== null ? `${Math.round(st.averageGrade)} / 100` : 'S/C'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="badge" style={{
                                                    background: 'rgba(16, 217, 139, 0.08)',
                                                    color: COLORS.success,
                                                    fontWeight: 900
                                                }}>
                                                    EXCELENTE
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}

                                {destacadosFiltered.length === 0 && (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', padding: '4rem', color: 'var(--foreground-3)' }}>
                                            No se encontraron estudiantes destacados para los filtros o criterios seleccionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Tabla de Estudiantes en Riesgo de Abandono (Top 100) */
                <div className="glass card animate-fade-up" style={{ padding: 0 }}>
                    <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, var(--surface), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ marginBottom: '0.5rem' }}>Supervisión de Riesgo de Abandono (Top 100)</h2>
                            <p style={{ color: 'var(--foreground-3)', fontSize: '0.9rem' }}>Estudiantes en riesgo académico crítico debido a inasistencia, reprobación o calificaciones en cero (sospecha de abandono)</p>
                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}>
                                <AlertTriangle size={12} />
                                <span>Ordenados con prioridad por inactividad total (calificaciones cero), promedio reprobatorio y bajo porcentaje de asistencia.</span>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--danger)' }}>
                            Estudiantes en riesgo: {riesgoFiltered.length}
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Estudiante</th>
                                    <th>CI</th>
                                    <th>Grupo / Sede</th>
                                    <th style={{ width: '400px' }}>Programa Módulo, Fecha Inicio / Fin y Notas</th>
                                    <th style={{ textAlign: 'center' }}>Faltas / Asist. %</th>
                                    <th style={{ textAlign: 'center' }}>Promedio General</th>
                                    <th style={{ textAlign: 'center' }}>Alerta de Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {riesgoFiltered.map((st) => {
                                    const hasZeroGrades = st.zeroGradesCount > 0
                                    const isLowAttendance = st.attendanceRate < 60
                                    const isFailing = st.averageGrade !== null && st.averageGrade < 51

                                    let alertText = 'Riesgo Académico'
                                    let alertBg = 'rgba(245, 166, 35, 0.08)'
                                    let alertColor = COLORS.warning

                                    if (hasZeroGrades) {
                                        alertText = 'SOSPECHA ABANDONO (Nota 0)'
                                        alertBg = 'rgba(247, 79, 107, 0.08)'
                                        alertColor = COLORS.danger
                                    } else if (isLowAttendance && isFailing) {
                                        alertText = 'RIESGO CRÍTICO'
                                        alertBg = 'rgba(247, 79, 107, 0.08)'
                                        alertColor = COLORS.danger
                                    } else if (isLowAttendance) {
                                        alertText = 'INASISTENCIA CRÍTICA'
                                        alertBg = 'rgba(245, 166, 35, 0.08)'
                                        alertColor = COLORS.warning
                                    } else if (isFailing) {
                                        alertText = 'REPROBANDO'
                                        alertBg = 'rgba(245, 166, 35, 0.08)'
                                        alertColor = COLORS.warning
                                    }

                                    return (
                                        <tr key={st.id} className="hover-row">
                                            <td>
                                                <div style={{ fontWeight: 800, color: 'var(--foreground)' }}>
                                                    {st.apellido}, {st.nombre}
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 600, color: 'var(--foreground-2)' }}>{st.ci}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{st.groupName}</span>
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--foreground-3)' }}>📍 {st.deptName}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.2rem 0' }}>
                                                    {st.grades.map((g, idx) => {
                                                        const formattedStart = g.fechaInicio ? new Date(g.fechaInicio).toLocaleDateString('es-ES') : '-'
                                                        const formattedEnd = g.fechaFin ? new Date(g.fechaFin).toLocaleDateString('es-ES') : '-'
                                                        return (
                                                            <div key={idx} style={{
                                                                padding: '0.4rem 0.6rem',
                                                                borderRadius: '0.4rem',
                                                                background: g.total === 0 ? 'rgba(247, 79, 107, 0.06)' : 'var(--surface)',
                                                                borderLeft: `3px solid ${g.total === 0 ? COLORS.danger : g.total >= 51 ? COLORS.success : COLORS.warning}`,
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '0.15rem'
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                                                                    <span style={{ color: 'var(--foreground-2)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '220px' }} title={g.moduloName}>
                                                                        {g.moduloName}
                                                                    </span>
                                                                    <span style={{ color: g.total >= 51 ? COLORS.success : COLORS.danger, flexShrink: 0 }}>
                                                                        Nota: <b>{Math.round(g.total)}</b>
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--foreground-3)', fontWeight: 600 }}>
                                                                    <span>{formattedStart} al {formattedEnd}</span>
                                                                    {g.total === 0 && <span style={{ color: COLORS.danger, fontWeight: 800 }}>SIN ENTREGAS / 0 PTS</span>}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                    {st.grades.length === 0 && (
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--foreground-3)', fontStyle: 'italic' }}>
                                                            Sin calificaciones registradas en ningún módulo
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <span className="badge" style={{
                                                        background: st.attendanceRate < 60 ? 'var(--danger-light)' : 'var(--warning-light)',
                                                        color: st.attendanceRate < 60 ? COLORS.danger : COLORS.warning,
                                                        fontWeight: 900,
                                                        fontSize: '0.78rem'
                                                    }}>
                                                        {Math.round(st.attendanceRate)}%
                                                    </span>
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--foreground-3)', marginTop: '0.2rem', fontWeight: 600 }}>
                                                        {st.faltaCount} faltas de {st.totalAttendanceDays} días
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="badge" style={{
                                                    background: st.averageGrade === null ? 'var(--surface)' : st.averageGrade < 51 ? 'var(--danger-light)' : 'var(--warning-light)',
                                                    color: st.averageGrade === null ? 'var(--foreground-3)' : st.averageGrade < 51 ? COLORS.danger : COLORS.warning,
                                                    fontWeight: 900,
                                                    fontSize: '0.82rem'
                                                }}>
                                                    {st.averageGrade !== null ? `${Math.round(st.averageGrade)} / 100` : 'S/C'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="badge" style={{
                                                    background: alertBg,
                                                    color: alertColor,
                                                    fontWeight: 900,
                                                    border: `1px solid ${alertColor}30`,
                                                    boxShadow: `0 0 8px ${alertColor}15`
                                                }}>
                                                    {alertText}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}

                                {riesgoFiltered.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '4rem', color: 'var(--success)' }}>
                                            🎉 Excelente: No se registran estudiantes bajo criterios de abandono o riesgo crítico.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
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
