import React from 'react';

export default function MaintenancePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #1e1b4b 0%, #0f172a 100%)',
      color: '#f8fafc',
      fontFamily: '"Outfit", "Inter", system-ui, sans-serif',
      padding: '2rem',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Luces de fondo decorativas animadas */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'rgba(187, 151, 58, 0.15)',
        filter: 'blur(100px)',
        top: '-10%',
        left: '-10%',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'rgba(236, 72, 153, 0.1)',
        filter: 'blur(100px)',
        bottom: '-10%',
        right: '-10%',
        pointerEvents: 'none'
      }} />

      {/* Contenedor Principal (Glassmorphism) */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.4)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '1.5rem',
        padding: '3rem 2rem',
        maxWidth: '540px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        zIndex: 10,
        position: 'relative'
      }}>
        {/* Icono de Mantenimiento con animación de pulso */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(187, 151, 58, 0.1)',
          border: '2px dashed #bb973a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem',
          color: '#d5ad42',
          fontSize: '2.5rem',
          animation: 'pulse 3s infinite ease-in-out'
        }}>
          🔧
        </div>

        {/* Titular */}
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: 800,
          marginBottom: '1rem',
          letterSpacing: '-0.025em',
          background: 'linear-gradient(to right, #d5ad42, #f0c040)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Plataforma en Mantenimiento
        </h1>

        {/* Mensaje */}
        <p style={{
          color: '#94a3b8',
          fontSize: '1.05rem',
          lineHeight: '1.6',
          marginBottom: '2rem'
        }}>
          Estamos optimizando las bases de datos y actualizando el sistema para mejorar tu experiencia. Regresaremos en unos momentos. ¡Gracias por tu paciencia!
        </p>

        {/* Separador */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent)',
          marginBottom: '1.5rem'
        }} />

        {/* Indicador de Estado */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 1rem',
          borderRadius: '2rem',
          background: 'rgba(245, 158, 11, 0.1)',
          color: '#fbbf24',
          fontSize: '0.85rem',
          fontWeight: 700,
          border: '1px solid rgba(245, 158, 11, 0.2)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#fbbf24',
            display: 'inline-block',
            boxShadow: '0 0 8px #fbbf24'
          }} />
          Trabajos en Progreso
        </div>
      </div>

      {/* Estilos CSS Inyectados para las animaciones */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(187, 151, 58, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 20px 4px rgba(187, 151, 58, 0.2); }
        }
      `}} />
    </div>
  );
}
