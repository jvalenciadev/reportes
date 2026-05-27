'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, X, ChevronRight } from 'lucide-react'

interface ReasonModalProps {
  show: boolean
  title: string
  onConfirm: (reason: string) => void
  onCancel: () => void
  loading?: boolean
}

export default function ReasonModal({ show, title, onConfirm, onCancel, loading }: ReasonModalProps) {
  const [reason, setReason] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (show) {
      setIsVisible(true)
      document.body.style.overflow = 'hidden' // Evitar scroll de fondo
    } else {
      setTimeout(() => setIsVisible(false), 200)
      setReason('')
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [show])

  if (!mounted || (!show && !isVisible)) return null

  const modalContent = (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999, // Valor máximo para estar sobre todo
      opacity: show ? 1 : 0,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      padding: '1.5rem'
    }}>
      <div style={{
        background: 'var(--card)',
        width: '100%',
        maxWidth: '480px',
        borderRadius: '2.5rem',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 40px 80px -12px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        transform: show ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(40px)',
        opacity: show ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        {/* Decorative Top Bar */}
        <div style={{ height: '8px', background: '#ef4444' }} />

        <div style={{ padding: '3rem 2.5rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '20px',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444'
              }}>
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--foreground)', letterSpacing: '-0.04em' }}>
                  {title}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Gestión Académica
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', color: 'var(--muted)', lineHeight: '1.6' }}>
              Estás registrando una <span style={{ color: '#ef4444', fontWeight: 700 }}>BAJA</span>. <br />
              Explica el motivo para el reporte oficial:
            </p>

            <textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: El estudiante solicita retiro por cambio de domicilio..."
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '1.5rem',
                borderRadius: '1.5rem',
                background: 'rgba(0,0,0,0.03)',
                border: '2px solid var(--border)',
                color: 'var(--foreground)',
                fontSize: '1rem',
                resize: 'none',
                outline: 'none',
                transition: 'all 0.3s ease',
                fontFamily: 'inherit',
                lineHeight: '1.5'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.boxShadow = '0 15px 30px -10px var(--primary-glow)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <button
              className="btn"
              onClick={onCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: '1.1rem',
                borderRadius: '1.25rem',
                fontWeight: 700,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Cancelar
            </button>
            <button
              className="btn"
              onClick={() => onConfirm(reason)}
              disabled={!reason.trim() || loading}
              style={{
                flex: 2,
                padding: '1.1rem',
                borderRadius: '1.25rem',
                fontWeight: 800,
                background: reason.trim() ? '#ef4444' : 'var(--border)',
                border: 'none',
                color: 'white',
                cursor: reason.trim() ? 'pointer' : 'not-allowed',
                boxShadow: reason.trim() ? '0 15px 30px -5px rgba(239, 68, 68, 0.4)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              {loading ? (
                'Procesando...'
              ) : (
                <>
                  Confirmar Baja
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
