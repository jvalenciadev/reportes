'use client'

import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export type StatusType = 'success' | 'error' | 'info'

interface StatusModalProps {
  show: boolean
  type: StatusType
  title: string
  message: string
  onClose: () => void
}

export default function StatusModal({ show, type, title, message, onClose }: StatusModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (show) {
      document.body.style.overflow = 'hidden'
      const timer = setTimeout(() => {
        if (type === 'success') onClose()
      }, 3500)
      return () => {
        clearTimeout(timer)
        document.body.style.overflow = 'unset'
      }
    }
  }, [show, type, onClose])

  if (!show || !mounted) return null

  const colors = {
    success: { 
      bg: 'rgba(16, 185, 129, 0.1)', 
      border: '#10b981', 
      glow: 'rgba(16, 185, 129, 0.15)',
      icon: <CheckCircle2 size={36} color="#10b981" /> 
    },
    error: { 
      bg: 'rgba(239, 68, 68, 0.1)', 
      border: '#ef4444', 
      glow: 'rgba(239, 68, 68, 0.15)',
      icon: <XCircle size={36} color="#ef4444" /> 
    },
    info: { 
      bg: 'rgba(187, 151, 58, 0.1)', 
      border: '#bb973a', 
      glow: 'rgba(187, 151, 58, 0.15)',
      icon: <AlertCircle size={36} color="#bb973a" /> 
    }
  }

  const config = colors[type]

  const modalContent = (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(3, 4, 11, 0.7)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '1.5rem'
    }} onClick={onClose}>
      <div 
        className="animate-scale-in"
        style={{
          background: 'var(--bg-2)',
          border: `1px solid ${config.border}44`,
          borderRadius: '2.5rem',
          padding: '3rem 2.5rem',
          maxWidth: '440px',
          width: '100%',
          position: 'relative',
          boxShadow: `0 30px 60px -12px rgba(0,0,0,0.9), 0 0 30px ${config.glow}`,
          textAlign: 'center',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Abstract Glow */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120%',
          height: '140px',
          background: `radial-gradient(circle, ${config.glow} 0%, transparent 70%)`,
          opacity: 0.8,
          pointerEvents: 'none'
        }} />

        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.5rem', right: '1.5rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--foreground-2)',
            cursor: 'pointer',
            padding: '0.6rem',
            borderRadius: '1rem',
            display: 'flex',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
        >
          <X size={16} />
        </button>

        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '1.75rem',
          background: config.bg,
          border: `1px solid ${config.border}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem',
          boxShadow: `0 10px 20px ${config.glow}`,
          position: 'relative',
          zIndex: 5
        }}>
          {config.icon}
        </div>

        <h3 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1rem', color: 'var(--foreground)', letterSpacing: '-0.04em', position: 'relative', zIndex: 5 }}>
          {title}
        </h3>
        <p style={{ color: 'var(--foreground-2)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2.5rem', position: 'relative', zIndex: 5 }}>
          {message}
        </p>

        <button 
          className="btn" 
          onClick={onClose}
          style={{
            width: '100%',
            padding: '1.1rem',
            background: config.border,
            border: 'none',
            color: 'white',
            borderRadius: '1.25rem',
            fontWeight: 800,
            fontSize: '1rem',
            boxShadow: `0 8px 16px ${config.glow}`,
            cursor: 'pointer',
            position: 'relative',
            zIndex: 5,
            transition: 'transform 0.2s ease'
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
