import React, { useEffect, useMemo } from 'react';
import Navbar from '../../components/navbar/Navbar';
import { Link, useNavigate } from 'react-router-dom';
import { useDriver } from '../../context/driver/DriverContext';
import { useChasis } from '../../context/chasis/ChasisContext';
import { useCoupled } from '../../context/coupled/CoupledContext';
import { useTravel } from '../../context/travel/TravelContext';
import { parseDateOnlyLocal } from '../../utils/date/dateOnly';

import './home.css';

const Home = () => {
  const navigate = useNavigate();

  const { drivers, inactiveDrivers, getDrivers, getInactiveDrivers } = useDriver();
  const { chasis, inactiveChasis, getChasis, getInactiveChasis } = useChasis();
  const { coupled, inactiveCoupled, getCoupled, getInactiveCoupled } = useCoupled();
  const { travels, getTravels } = useTravel();

  useEffect(() => {
    getDrivers();
    getChasis();
    getCoupled();
    getTravels();
    getInactiveDrivers?.();
    getInactiveChasis?.();
    getInactiveCoupled?.();
  }, []);

  // Calculamos algunos datos para "Relleno visual"
  const isActive = (value) => value === '1' || value === 1 || value === true;
  const activeDrivers = drivers.filter(d => isActive(d.activo)).length;
  const totalDrivers = drivers.length + (inactiveDrivers?.length || 0);
  const activeChassis = chasis.filter(c => isActive(c.activo)).length;
  const totalChassis = chasis.length + (inactiveChasis?.length || 0);
  const activeCoupled = coupled.filter(a => isActive(a.activo)).length;
  const totalCoupled = coupled.length + (inactiveCoupled?.length || 0);

  // --- LÓGICA DE VENCIMIENTOS (Alertas) ---
  const alerts = useMemo(() => {
    const today = parseDateOnlyLocal(new Date()) || new Date();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);
    
    let allAlerts = [];

    // 1. Revisar Choferes
    drivers.forEach(d => {
      if (!isActive(d.activo)) return; // Solo activos
      
      const checkDate = (dateStr, type) => {
        if (!dateStr) return;
        const date = parseDateOnlyLocal(dateStr);
        if (!date) return;
        if (date <= next30Days) {
          allAlerts.push({
            type: 'driver',
            name: `${d.nombre} ${d.apellido}`,
            doc: type,
            date: date,
            dateRaw: dateStr,
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
      if (!isActive(c.activo)) return;
      
      const checkDate = (dateStr, type) => {
        if (!dateStr) return;
        const date = parseDateOnlyLocal(dateStr);
        if (!date) return;
        if (date <= next30Days) {
          allAlerts.push({
            type: 'chassis',
            name: `Móvil ${c.Dominio_chasis}`,
            doc: type,
            date: date,
            dateRaw: dateStr,
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

    // 3. Revisar Acoplados
    coupled.forEach(a => {
      if (!isActive(a.activo)) return;

      const checkDate = (dateStr, type) => {
        if (!dateStr) return;
        const date = parseDateOnlyLocal(dateStr);
        if (!date) return;
        if (date <= next30Days) {
          allAlerts.push({
            type: 'coupled',
            name: `Acoplado ${a.Dominio_acoplado}`,
            doc: type,
            date: date,
            dateRaw: dateStr,
            isExpired: date < today,
            id: a.id
          });
        }
      };

      checkDate(a.vencimiento_vtv_acoplado, 'VTV');
      checkDate(a.vencimiento_senasa_acoplado, 'SENASA');
      checkDate(a.vencimiento_cedula_acoplado, 'Cédula');
      checkDate(a.vencimiento_tipificacion_carga_acoplado, 'Tipificación de Carga');
      checkDate(a.vencimiento_homologacion_acoplado, 'Homologación');
    });

    // Ordenar: Primero los vencidos, luego por fecha más cercana
    return allAlerts.sort((a, b) => a.date - b.date);
  }, [drivers, chasis, coupled]);


  // --- DATOS ESTADÍSTICOS ---
  // Filtramos viajes del MES ACTUAL
  const currentMonthTravels = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return travels.filter(t => {
      const parsed = parseDateOnlyLocal(t.fecha_viaje) || (t.created_at ? new Date(t.created_at) : null);
      if (!parsed || Number.isNaN(parsed.getTime())) return false;
      const tDate = parsed;
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    }).length;
  }, [travels]);

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
                <div className="progress-fill" style={{ width: `${(activeDrivers / (totalDrivers || 1)) * 100}%` }}></div>
              </div>
              <small>{activeDrivers} / {totalDrivers}</small>
            </div>
            <div className="status-bar">
              <div className="label">Chasis Operativos</div>
              <div className="progress-bg">
                <div className="progress-fill orange" style={{ width: `${(activeChassis / (totalChassis || 1)) * 100}%` }}></div>
              </div>
              <small>{activeChassis} / {totalChassis}</small>
            </div>
            <div className="status-bar">
              <div className="label">Acoplados Operativos</div>
              <div className="progress-bg">
                <div className="progress-fill orange" style={{ width: `${(activeCoupled / (totalCoupled || 1)) * 100}%` }}></div>
              </div>
              <small>{activeCoupled} / {totalCoupled}</small>
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
                
                <Link to="/company-payments" className="module-btn">
                  <span className="mb-icon">🏦</span> Pagos Empresas
                </Link>
                <Link to="/pagos-choferes" className="module-btn">
                  <span className="mb-icon">👨‍✈️</span> Pagos Choferes
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
                          {alert.type === 'driver' ? '👮' : alert.type === 'coupled' ? '🛻' : '🚛'}
                        </div>
                        <div className="alert-info-home">
                          <strong>{alert.doc}</strong>
                          <span>{alert.name}</span>
                        </div>
                        <div className="alert-date">
                          {alert.date instanceof Date ? alert.date.toLocaleDateString('es-AR') : '-'}
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
              

            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default Home;
