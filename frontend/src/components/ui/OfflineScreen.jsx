import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/login/LoginContext';

const OfflineScreen = () => {
  const { isOffline } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOffline) {
      navigate('/', { replace: true });
    }
  }, [isOffline, navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#f5f5f5',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <h2 style={{ margin: 0, marginBottom: 8 }}>Sin conexión</h2>
        <p style={{ margin: 0, marginBottom: 16, color: '#555' }}>
          No hay internet. Para evitar que el sistema quede colgado, pausamos la carga hasta que vuelva la red.
          Cuando reconectes, te redirigimos al inicio automáticamente.
        </p>
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          style={{
            border: 0,
            borderRadius: 10,
            padding: '10px 14px',
            background: '#FF9020',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Ir al inicio
        </button>
      </div>
    </div>
  );
};

export default OfflineScreen;

