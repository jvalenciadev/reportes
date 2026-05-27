'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle, X, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  show: boolean
  title: string
  message: string
  warningNote?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmModal({ show, title, message, warningNote, onConfirm, onCancel, loading }: ConfirmModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (show) {
      setIsVisible(true)
      document.body.style.overflow = 'hidden'
    } else {
      setTimeout(() => setIsVisible(false), 200)
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
      zIndex: 99999,
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
        <div style={{ height: '8px', background: 'var(--primary)' }} />

        <div style={{ padding: '3rem 2.5rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '20px',
                background: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)'
              }}>
                <HelpCircle size={28} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--foreground)', letterSpacing: '-0.04em' }}>
                  {title}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Confirmación de Acción
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ margin: 0, fontSize: '1rem', color: 'var(--foreground)', lineHeight: '1.6', fontWeight: 500 }}>
              {message}
            </p>
            {warningNote && (
              <div style={{
                marginTop: '1.25rem',
                padding: '1rem 1.25rem',
                borderRadius: '1rem',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1.5px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start'
              }}>
                <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#f59e0b', lineHeight: '1.6', fontWeight: 700 }}>
                  {warningNote}
                </p>
              </div>
            )}
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
              onClick={onConfirm}
              disabled={loading}
              style={{
                flex: 2,
                padding: '1.1rem',
                borderRadius: '1.25rem',
                fontWeight: 800,
                background: 'var(--primary)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 15px 30px -5px var(--primary-glow)',
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
                  Confirmar Cambio
                  <CheckCircle2 size={20} />
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
