import React, { useEffect, useMemo } from 'react';
import Navbar from '../../components/navbar/Navbar';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/login/LoginContext';
import { useDriver } from '../../context/driver/DriverContext';
import { useChasis } from '../../context/chasis/ChasisContext';
import { useTravel } from '../../context/travel/TravelContext';

import './home.css';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { drivers, getDrivers } = useDriver();
  const { chasis, getChasis } = useChasis();
  const { travels, getTravels } = useTravel();

  useEffect(() => {
    getDrivers();
    getChasis();
    getTravels();
  }, []);

  // Calculamos algunos datos para "Relleno visual"
  const activeDrivers = drivers.filter(d => d.activo === '1' || d.activo === 1).length;
  const activeChassis = chasis.filter(c => c.activo === '1' || c.activo === 1).length;

  // --- LÓGICA DE VENCIMIENTOS (Alertas) ---
  const alerts = useMemo(() => {
    const today = new Date();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);
    
    let allAlerts = [];

    // 1. Revisar Choferes
    drivers.forEach(d => {
      if (d.activo !== '1') return; // Solo activos
      
      const checkDate = (dateStr, type) => {
        if (!dateStr) return;
        const date = new Date(dateStr);
        if (date <= next30Days) {
          allAlerts.push({
            type: 'driver',
            name: `${d.nombre} ${d.apellido}`,
            doc: type,
            date: dateStr,
            isExpired: date < today,
            id: d.id
          });
        }
      };

      checkDate(d.vencimiento_licencia, 'Licencia');
      checkDate(d.vencimiento_psicofisico, 'Psicofísico');
      checkDate(d.vencimiento_carga_normal, 'Cargas Generales');
      checkDate(d.vencimiento_carga_peligrosa, 'Cargas Peligrosas');
    });

    // 2. Revisar Chasis
    chasis.forEach(c => {
      if (c.activo !== '1') return;
      
      const checkDate = (dateStr, type) => {
        if (!dateStr) return;
        const date = new Date(dateStr);
        if (date <= next30Days) {
          allAlerts.push({
            type: 'chassis',
            name: `Móvil ${c.Dominio_chasis}`,
            doc: type,
            date: dateStr,
            isExpired: date < today,
            id: c.id
          });
        }
      };

      checkDate(c.vencimiento_vtv_chasis, 'VTV');
      checkDate(c.vencimiento_senasa_chasis, 'SENASA');
      checkDate(c.vencimiento_cedula_chasis, 'Cédula');
      // Agrega aquí más campos si necesitas
    });

    // Ordenar: Primero los vencidos, luego por fecha más cercana
    return allAlerts.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [drivers, chasis]);


  // --- DATOS ESTADÍSTICOS ---
  // Filtramos viajes del MES ACTUAL
  const currentMonthTravels = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return travels.filter(t => {
      // Asumiendo que t.created_at o t.fecha_salida existe. Ajusta 'fecha_salida' a tu campo real.
      const tDate = new Date(t.fecha_salida || t.created_at || Date.now()); 
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    }).length;
  }, [travels]);

  // Últimos 5 movimientos (Invertimos array original)
  const recentActivity = travels.slice().reverse().slice(0, 5);


  return (
    <div className="dashboard-wrapper">
      <Navbar />

      <div className="dashboard-container">
        
        {/* SIDEBAR FIJA */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-header">
            <h3>Panel Rápido</h3>
          </div>
          
          <nav className="sidebar-nav">
            <button onClick={() => navigate('/travels')} className="shortcut-btn active">
              <span className="icon">📍</span> Registrar Viaje
            </button>
            <button onClick={() => navigate('/panel-driver')} className="shortcut-btn">
              <span className="icon">👨‍✈️</span> Nuevo Chofer
            </button>
            <button onClick={() => navigate('/chassis')} className="shortcut-btn">
              <span className="icon">🚛</span> Nuevo Chasis
            </button>
          </nav>

          {/* Widget de Estado del Sistema (Visual) */}
          <div className="system-status">
            <h4>Estado de Flota</h4>
            <div className="status-bar">
              <div className="label">Choferes Activos</div>
              <div className="progress-bg">
                <div className="progress-fill" style={{ width: `${(activeDrivers / (drivers.length || 1)) * 100}%` }}></div>
              </div>
              <small>{activeDrivers} / {drivers.length}</small>
            </div>
            <div className="status-bar">
              <div className="label">Unidades Operativas</div>
              <div className="progress-bg">
                <div className="progress-fill orange" style={{ width: `${(activeChassis / (chasis.length || 1)) * 100}%` }}></div>
              </div>
              <small>{activeChassis} / {chasis.length}</small>
            </div>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="dashboard-main">
          
          {/* 1. TOP STATS (Más pequeños) */}
          <section className="stats-grid-compact">
            <div className="mini-stat-card">
              <div className="ms-icon bg-blue">👥</div>
              <div>
                <span className="ms-value">{drivers.length}</span>
                <span className="ms-label">Choferes Totales</span>
              </div>
            </div>
            <div className="mini-stat-card">
              <div className="ms-icon bg-orange">🚛</div>
              <div>
                <span className="ms-value">{chasis.length}</span>
                <span className="ms-label">Parque Automotor</span>
              </div>
            </div>
            <div className="mini-stat-card">
              <div className="ms-icon bg-green">📅</div>
              <div>
                {/* Mostramos viajes del mes, o totales si prefieres */}
                <span className="ms-value">{currentMonthTravels}</span>
                <span className="ms-label">Viajes este Mes</span>
              </div>
            </div>
          </section>

          <section className="dashboard-layout">
            
            {/* 2. COLUMNA IZQUIERDA: Módulos */}
            <div className="modules-section">
              <h2 className="section-title">Gestión Operativa</h2>
              <div className="modules-grid-buttons">
                <Link to="/panel-driver" className="module-btn">
                  <span className="mb-icon">👨‍✈️</span> Choferes
                </Link>
                <Link to="/chassis" className="module-btn">
                  <span className="mb-icon">🚛</span> Flota
                </Link>
                <Link to="/travels" className="module-btn">
                  <span className="mb-icon">📍</span> Viajes
                </Link>
                <Link to="/company" className="module-btn">
                  <span className="mb-icon">🏢</span> Empresas
                </Link>
                <Link to="/panel-user" className="module-btn">
                  <span className="mb-icon">🔐</span> Usuarios
                </Link>
                
                {/* NUEVOS MÓDULOS (Rutas placeholder) */}
                <Link to="/facturacion" className="module-btn">
                  <span className="mb-icon">🧾</span> Facturación
                </Link>
                <Link to="/pagos-empresas" className="module-btn">
                  <span className="mb-icon">💰</span> Pagos Empresas
                </Link>
                <Link to="/pagos-choferes" className="module-btn">
                  <span className="mb-icon">💸</span> Pagos Choferes
                </Link>
              </div>
            </div>

            {/* 3. COLUMNA DERECHA: Alertas y Feed */}
            <div className="feeds-section">
              
              {/* TARJETA DE VENCIMIENTOS */}
              <div className="feed-card alert-feed">
                <div className="feed-header">
                  <h3>🔔 Próximos Vencimientos</h3>
                  <span className="badge-count">{alerts.length}</span>
                </div>
                <div className="feed-list-scroll">
                  {alerts.length > 0 ? (
                    alerts.map((alert, idx) => (
                      <div key={idx} className={`alert-item ${alert.isExpired ? 'expired' : 'warning'}`}>
                        <div className="alert-icon">
                          {alert.type === 'driver' ? '👮' : '🚛'}
                        </div>
                        <div className="alert-info">
                          <strong>{alert.doc}</strong>
                          <span>{alert.name}</span>
                        </div>
                        <div className="alert-date">
                          {new Date(alert.date).toLocaleDateString()}
                          {alert.isExpired && <span className="tag-expired">Vencido</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <span>✅ Todo en regla</span>
                    </div>
                  )}
                </div>
              </div>

              {/* TARJETA DE ÚLTIMOS MOVIMIENTOS */}
              <div className="feed-card">
                <div className="feed-header">
                  <h3>📝 Últimos Movimientos</h3>
                </div>
                <div className="feed-list">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((travel, idx) => (
                      <div key={idx} className="activity-row">
                        <div className="act-dot"></div>
                        <div className="act-content">
                          <strong>Viaje #{travel.id}</strong>
                          <span>{travel.destino || 'Destino registrado'}</span>
                        </div>
                        <span className="act-time">
                           {/* Ajusta al campo de fecha real */}
                           {travel.fecha ? new Date(travel.fecha).toLocaleDateString() : 'Hoy'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">Sin actividad reciente</div>
                  )}
                </div>
              </div>

            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default Home;