import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/navbar/Navbar';
import DriverFormModal from '../../components/driverFormlModal/DriverFormModal';
import { useDriver } from '../../context/driver/DriverContext';
import client from '../../api/axios';
import './driver.css';

const Driver = () => {
  const {
    drivers,
    inactiveDrivers,
    loading,
    createDriver,
    updateDriver,
    deleteDriver,
    reactivateDriver
  } = useDriver();

  const navigate = useNavigate();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isLoadingDriver, setIsLoadingDriver] = useState(false);
  const [activeTab, setActiveTab] = useState('activos');
  // Buscador y paginación
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenCreate = () => {
    setSelectedDriver(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = async (partialDriver) => {
    setIsLoadingDriver(true);
    try {
      const res = await client.get(`/drivers/${partialDriver.id}`);
      setSelectedDriver(res.data.data || res.data);
      setIsFormOpen(true);
    } finally {
      setIsLoadingDriver(false);
    }
  };

  const handleSave = async (formData) => {
    setIsSaving(true);
    const success = selectedDriver
      ? await updateDriver(selectedDriver.id, formData)
      : await createDriver(formData);

    setIsSaving(false);

    if (success) {
      setIsFormOpen(false);
      setSelectedDriver(null);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'VENCIDO': return { color: 'red', text: 'Vencido' };
      case 'PROXIMO': return { color: 'yellow', text: 'Próximo' };
      default: return { color: 'green', text: 'Al día' };
    }
  };

  // --- FILTRO Y PAGINACIÓN ---
  const filterDrivers = (arr) => arr.filter(drv => {
    const q = search.toLowerCase();
    return (
      drv.nombre.toLowerCase().includes(q) ||
      drv.apellido.toLowerCase().includes(q) ||
      drv.dni.toString().includes(q)
    );
  });

  const paginated = (arr) => {
    const start = (currentPage - 1) * itemsPerPage;
    return arr.slice(start, start + itemsPerPage);
  };

  const activeList = filterDrivers(drivers);
  const inactiveList = filterDrivers(inactiveDrivers);
  const totalPages = activeTab === 'activos'
    ? Math.ceil(activeList.length / itemsPerPage)
    : Math.ceil(inactiveList.length / itemsPerPage);

  // Reset página al cambiar tab o búsqueda
  React.useEffect(() => { setCurrentPage(1); }, [activeTab, search]);

  return (
    <div className="driver-layout">
      <Navbar />
      <div className="driver-container">
        {/* HEADER */}
        <div className="driver-header">
          <div className="driver-title">
            <h1>👨‍✈️ Choferes</h1>
          </div>

        </div>
        {/* TABS */}
        <div className="driver-tabs">
          <div>
            <button
              className={`tab-btn ${activeTab === 'activos' ? 'active' : ''}`}
              onClick={() => setActiveTab('activos')}
            >
              👤 Activos {drivers.length}
            </button>
            <button
              className={`tab-btn ${activeTab === 'inactivos' ? 'active' : ''}`}
              onClick={() => setActiveTab('inactivos')}
            >
              📦 Inactivos {inactiveDrivers.length}
            </button>
          </div>
          {/* BUSCADOR */}
          <div >
            <input
              type="text"
              className="driver-search-input"
              placeholder="Buscar por nombre, apellido o Dni..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {activeTab === 'activos' && (
            <div className="driver-header-actions">
              <button className="btn-add-driver subtle" onClick={handleOpenCreate}>
                ➕ Nuevo Chofer
              </button>
            </div>
          )}

        </div>
        {/* ACTIVOS */}
        {activeTab === 'activos' && (
          <>
            <div className="driver-table-wrapper">
              <table className="driver-table">
                <thead>
                  <tr>
                    <th>Chofer</th>
                    <th>Estado</th>
                    <th>Documentación</th>
                    <th style={{ textAlign: 'center' }}>Info</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated(activeList).map(drv => {
                    const config = getStatusConfig(drv.estado_general);
                    return (
                      <tr key={drv.id}>
                        <td>
                          <div className="driver-name-cell">
                            <strong>{drv.nombre?.charAt(0).toUpperCase() + drv.nombre?.slice(1)} {drv.apellido?.charAt(0).toUpperCase() + drv.apellido?.slice(1)}</strong>
                            <small>Dni {drv.dni}</small>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${drv.activo ? 'status-active' : 'status-inactive'}`}>{drv.activo ? 'Activo' : 'Inactivo'}</span>
                        </td>
                        <td>
                          <span className={`traffic-light light-${config.color}`} />
                          <span className="status-text">{config.text}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {drv.info_completa ? (
                            <span title="Toda la información está cargada">✅</span>
                          ) : (
                            <span title="Faltan datos o documentos">⚠️</span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button onClick={() => navigate(`/panel-driver/${drv.id}`)} className="btn-icon view-icon">👁️</button>
                            <button onClick={() => handleOpenEdit(drv)} className="btn-icon edit-icon">✏️</button>
                            <button
                              onClick={async () => {
                                await deleteDriver(drv.id);
                              }}
                              className="btn-icon delete-icon"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* PAGINACIÓN */}
            {totalPages > 1 && (
              <div className="driver-pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    className={`pagination-btn${currentPage === i + 1 ? ' active' : ''}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  &gt;
                </button>
              </div>
            )}
          </>
        )}
        {/* INACTIVOS */}
        {activeTab === 'inactivos' && (
          <>
            <div className="driver-table-wrapper">
              <table className="driver-table">
                <thead>
                  <tr>
                    <th>Chofer</th>
                    <th>Fecha de Baja</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated(inactiveList).map(drv => (
                    <tr key={drv.id} className="inactive-row">
                      <td><strong>{drv.nombre?.charAt(0).toUpperCase() + drv.nombre?.slice(1)} {drv.apellido?.charAt(0).toUpperCase() + drv.apellido?.slice(1)}</strong></td>
                      <td>{drv.fecha_de_baja ? new Date(drv.fecha_de_baja).toLocaleDateString('es-AR') : '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={async () => {
                            const confirmed = await import('../../utils/alerts/Alerts')
                              .then(m => m.showConfirmAlert(
                                '¿Reactivar chofer?',
                                `El chofer ${drv.nombre?.charAt(0).toUpperCase() + drv.nombre?.slice(1)} ${drv.apellido?.charAt(0).toUpperCase() + drv.apellido?.slice(1)} volverá a estar activo.`
                              ));
                            if (confirmed) {
                              await reactivateDriver(drv.id);
                            }
                          }}
                          className="btn-icon-reset"
                        >
                          ♻️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* PAGINACIÓN */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ marginRight: 8 }}>&lt;</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    style={{
                      margin: '0 2px',
                      fontWeight: currentPage === i + 1 ? 'bold' : 'normal',
                      background: currentPage === i + 1 ? '#2563eb' : '#fff',
                      color: currentPage === i + 1 ? '#fff' : '#2563eb',
                      border: '1px solid #2563eb',
                      borderRadius: 6,
                      padding: '0.3rem 0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ marginLeft: 8 }}>&gt;</button>
              </div>
            )}
          </>
        )}
      </div>
      <DriverFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSave}
        driverToEdit={selectedDriver}
        isSaving={isSaving}
      />
    </div>
  );
};

export default Driver;