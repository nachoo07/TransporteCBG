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
    createDriver,
    updateDriver,
    deleteDriver,
    reactivateDriver
  } = useDriver();

  const navigate = useNavigate();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [activeTab, setActiveTab] = useState('activos');
  // Buscador y paginación
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenCreate = () => {
    setSelectedDriver(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = async (partialDriver) => {
    const res = await client.get(`/drivers/${partialDriver.id}`);
    setSelectedDriver(res.data.data || res.data);
    setIsFormOpen(true);
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
        <div className="driver-control-panel">
          <div className="driver-control-header">
            <span className="driver-control-title">Gestión de choferes</span>
          </div>

          <div className="driver-toolbar-row">
            <div className="driver-tabs-group driver-tabs-segmented">
              <button
                className={`tab-btn driver-tab-btn ${activeTab === 'activos' ? 'active' : ''}`}
                onClick={() => setActiveTab('activos')}
              >
                Activos ({drivers.length})
              </button>
              <button
                className={`tab-btn driver-tab-btn ${activeTab === 'inactivos' ? 'active' : ''}`}
                onClick={() => setActiveTab('inactivos')}
              >
                Archivados ({inactiveDrivers.length})
              </button>
            </div>

            <div className="driver-search-wrap driver-search-wrap-wide">
              <input
                type="text"
                className="driver-search-input driver-search-input-compact"
                placeholder="Buscar por nombre, apellido o DNI..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {activeTab === 'activos' && (
              <div className="driver-header-actions driver-header-actions-compact">
                <button className="btn-add-driver subtle driver-add-btn" onClick={handleOpenCreate}>
                  ➕ Nuevo Chofer
                </button>
              </div>
            )}
          </div>
        </div>
        {/* ACTIVOS */}
        {activeTab === 'activos' && (
          <>
            <div className="driver-table-wrapper">
              <table className="driver-table">
                <thead>
                  <tr>
                    <th>Chofer</th>
                    <th>Documentación</th>
                    <th style={{ textAlign: 'center' }}>Info</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="driver-empty-state">
                        No hay choferes activos para mostrar.
                      </td>
                    </tr>
                  ) : paginated(activeList).map(drv => {
                    const config = getStatusConfig(drv.estado_general);
                    return (
                      <tr key={drv.id}>
                        <td>
                          <div className="driver-name-cell">
                            <strong className="driver-full-name">{drv.nombre?.charAt(0).toUpperCase() + drv.nombre?.slice(1)} {drv.apellido?.charAt(0).toUpperCase() + drv.apellido?.slice(1)}</strong>
                            <small>Dni {drv.dni}</small>
                          </div>
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
                            <button onClick={() => navigate(`/panel-driver/${drv.id}`)} className="btn-action view-icon">👁️</button>
                            <button onClick={() => handleOpenEdit(drv)} className="btn-action edit-icon">✏️</button>
                            <button
                              onClick={async () => {
                                await deleteDriver(drv.id);
                              }}
                              className="btn-action delete-icon"
                              title="Archivar"
                            >
                              🗂️
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
                    <th>Estado</th>
                    <th>Fecha de Archivo</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveList.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="driver-empty-state">
                        No hay choferes archivados para mostrar.
                      </td>
                    </tr>
                  ) : paginated(inactiveList).map(drv => (
                    <tr key={drv.id} className="inactive-row">
                      <td><strong>{drv.nombre?.charAt(0).toUpperCase() + drv.nombre?.slice(1)} {drv.apellido?.charAt(0).toUpperCase() + drv.apellido?.slice(1)}</strong></td>
                      <td>
                        <span className="status-badge status-inactive">Archivado</span>
                      </td>
                      <td>{drv.fecha_de_baja ? new Date(drv.fecha_de_baja).toLocaleDateString('es-AR') : '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-buttons" style={{ justifyContent: 'center' }}>
                          <button onClick={() => navigate(`/panel-driver/${drv.id}`)} className="btn-icon view-icon" title="Ver">👁️</button>
                          <button
                            onClick={async () => {
                              const confirmed = await import('../../utils/alerts/Alerts')
                                .then(m => m.showConfirmAlert(
                                  '¿Reactivar chofer?',
                                  `El chofer ${drv.nombre?.charAt(0).toUpperCase() + drv.nombre?.slice(1)} ${drv.apellido?.charAt(0).toUpperCase() + drv.apellido?.slice(1)} volverá a estar activo.`,
                                  { icon: 'info', confirmButtonText: 'Sí, reactivar' }
                                ));
                              if (confirmed) {
                                await reactivateDriver(drv.id);
                              }
                            }}
                            className="btn-icon edit-icon"
                            title="Reactivar"
                          >
                            ♻️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
