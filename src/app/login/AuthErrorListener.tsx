'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function AuthErrorListener() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Supabase returns errors in the URL hash/fragment
    const hash = window.location.hash
    if (hash && hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1))
      const errorDescription = params.get('error_description')
      if (errorDescription) {
        setError(decodeURIComponent(errorDescription).replace(/\+/g, ' '))
      }
    }
  }, [])

  if (!error) return null

  return (
    <div 
      className="error-banner"
      style={{
        padding: '1rem',
        borderRadius: '1rem',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        color: '#ef4444',
        fontSize: '0.875rem',
        marginBottom: '1.5rem',
        textAlign: 'center',
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Error de Autenticación</div>
      {error}
    </div>
  )
}
