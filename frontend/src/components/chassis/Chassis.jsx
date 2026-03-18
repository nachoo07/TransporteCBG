import React, { useState } from 'react';
import ChassisFormModal from '../../components/chassisFormModal/ChassisFormModal';
import ChassisDetailModal from '../../components/chassisDetailModal/ChassisDetailModal';
import { useChasis } from '../../context/chasis/ChasisContext';
import './chassis.css';

const Chassis = () => {
    const { chasis, inactiveChasis, loading, createChasis, updateChasis, deleteChasis, reactivateChasis, getChasisById } = useChasis();

    // Estado para Formulario (Crear/Editar)
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedChassis, setSelectedChassis] = useState(null);

    // Estado para Vista Detallada (Solo lectura)
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [viewChassis, setViewChassis] = useState(null);

    // Estado para pestañas
    const [activeTab, setActiveTab] = useState('active');

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const [isSaving, setIsSaving] = useState(false);

    // Modal de confirmación para reactivación
    const [reactivateConfirmModal, setReactivateConfirmModal] = useState({ isOpen: false, chassis: null });

    // Estado para búsqueda
    const [search, setSearch] = useState('');

    // Handlers Formulario
    const handleOpenCreate = () => { setSelectedChassis(null); setIsFormOpen(true); };
    const handleOpenEdit = (item) => { setSelectedChassis(item); setIsFormOpen(true); };
    const handleCloseForm = () => { setIsFormOpen(false); setSelectedChassis(null); };

    // Handlers Detalle
    const handleOpenDetail = async (item) => {
        const fullChassis = await getChasisById(item.id);
        if (!fullChassis) return;

        setViewChassis(fullChassis);
        setIsDetailOpen(true);
    };

    const handleCloseDetail = () => { setIsDetailOpen(false); setViewChassis(null); };

    const handleSave = async (formData) => {
        setIsSaving(true);
        let success = selectedChassis
            ? await updateChasis(selectedChassis.id, formData)
            : await createChasis(formData);
        setIsSaving(false);
        if (success) handleCloseForm();
    };

    // Filtrado por búsqueda
    const filterChassis = (arr) => {
        const q = search.toLowerCase();
        return arr.filter(chs => chs.Dominio_chasis.toLowerCase().includes(q));
    };

    // Manejo de eliminación
    const handleDeleteClick = (chassis) => {
        deleteChasis(chassis.id);
    };

    // Manejo de reactivación
    const handleReactivateClick = (chassis) => {
        setReactivateConfirmModal({ isOpen: true, chassis });
    };

    const handleConfirmReactivate = async () => {
        if (reactivateConfirmModal.chassis) {
            await reactivateChasis(reactivateConfirmModal.chassis.id);
            setReactivateConfirmModal({ isOpen: false, chassis: null });
        }
    };

    const getStatusConfig = (status) => {
        const map = { 'VENCIDO': 'red', 'PROXIMO': 'yellow', 'AL_DIA': 'green' };
        return { color: map[status] || 'green', text: status?.replace('_', ' ') || 'Al día' };
    };

    const getInfoBadge = (isComplete) => (
        <span
            className={`fleet-info-badge ${isComplete ? 'is-complete' : 'is-missing'}`}
            title={isComplete ? 'Legajo completo' : 'Falta documentación'}
        >
            <span aria-hidden="true">{isComplete ? '✅' : '⚠️'}</span>
            <span>{isComplete ? 'Legajo completo' : 'Falta documentación'}</span>
        </span>
    );

    // Reset de búsqueda al cambiar de pestaña
    React.useEffect(() => { setCurrentPage(1); }, [activeTab, search]);

    // --- PAGINACIÓN ---
    const paginated = (arr) => {
        const start = (currentPage - 1) * itemsPerPage;
        return arr.slice(start, start + itemsPerPage);
    };

    const ChassisTable = ({ data, showReactivate = false }) => {
        const totalPages = Math.ceil(data.length / itemsPerPage);
        return (
            <div className="fleet-table-shell">
                <div className="table-responsive">
                    <table className={`fleet-table ${showReactivate ? 'fleet-table-archived' : 'fleet-table-active'}`}>
                        <thead>
                            <tr>
                                <th>Dominio (Patente)</th>
                                <th>Vencimientos</th>
                                <th style={{ width: '190px' }}>Documentacion</th>
                                {showReactivate && <th>Fecha de Archivo</th>}
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated(data).map(item => {
                                const status = getStatusConfig(item.estado_general);
                                return (
                                    <tr key={item.id} className={!item.activo ? 'inactive-row' : ''}>

                                        <td><strong>{item.Dominio_chasis}</strong></td>
                                        <td>
                                            <span className={`traffic-light light-${status.color}`}></span>
                                            {status.text}
                                        </td>
                                        <td>
                                            {getInfoBadge(item.info_completa)}
                                        </td>
                                        {showReactivate && (
                                            <td>
                                                {item.fecha_de_baja ? new Date(item.fecha_de_baja).toLocaleDateString('es-AR') : '-'}
                                            </td>
                                        )}
                                        <td>
                                            <button className="btn-action-chassis" title="Ver Detalle" onClick={() => handleOpenDetail(item)}>
                                                👁️
                                            </button>
                                            {showReactivate ? (
                                                <button className="btn-action-chassis" title="Reactivar" onClick={() => handleReactivateClick(item)}>
                                                    ♻️
                                                </button>
                                            ) : (
                                                <>
                                                    <button className="btn-action-chassis" title="Editar" onClick={() => handleOpenEdit(item)}>
                                                        ✏️
                                                    </button>
                                                    <button className="btn-action-chassis" title="Archivar" onClick={() => handleDeleteClick(item)}>
                                                        🗂️
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {data.length === 0 && <p className="empty-msg">No hay chasis en esta categoría.</p>}
                </div>
                <div className="fleet-table-footer">
                    {totalPages > 1 && (
                        <div className="chassis-pagination">
                            <button
                                className="chassis-pagination-btn"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                &lt;
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                    key={i + 1}
                                    className={`chassis-pagination-btn${currentPage === i + 1 ? ' active' : ''}`}
                                    onClick={() => setCurrentPage(i + 1)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                className="chassis-pagination-btn"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                &gt;
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="fleet-control-panel">
                <div className="fleet-control-header">
                    <span className="fleet-control-title">Gestión de chasis</span>
                </div>

                <div className="fleet-toolbar-row">
                    <div className="fleet-tabs-group fleet-tabs-segmented">
                        <button
                            className={`tab-btn fleet-tab-button ${activeTab === 'active' ? 'active' : ''}`}
                            onClick={() => setActiveTab('active')}
                        >
                            Activos ({chasis.length})
                        </button>
                        <button
                            className={`tab-btn fleet-tab-button ${activeTab === 'inactive' ? 'active' : ''}`}
                            onClick={() => setActiveTab('inactive')}
                        >
                            Archivados ({inactiveChasis.length})
                        </button>
                    </div>

                    <div className="fleet-search-wrap fleet-search-wrap-wide">
                        <input
                            type="text"
                            className="driver-search-input fleet-search-input"
                            placeholder="Buscar por dominio..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="tab-actions-header fleet-actions-header">
                        {activeTab === 'active' && (
                            <button onClick={handleOpenCreate} className="btn-add-chassis fleet-add-btn">+ Nuevo Chasis</button>
                        )}
                    </div>
                </div>
            </div>

            {!loading ? (
                activeTab === 'active' ? (
                    <ChassisTable data={filterChassis(chasis)} showReactivate={false} />
                ) : (
                    <ChassisTable data={filterChassis(inactiveChasis)} showReactivate={true} />
                )
            ) : (
                <div className="loading-msg">Cargando flota...</div>
            )}

            {/* MODAL FORMULARIO (Crear/Editar) */}
            <ChassisFormModal
                isOpen={isFormOpen}
                onClose={handleCloseForm}
                onSubmit={handleSave}
                chassisToEdit={selectedChassis}
                isSaving={isSaving}
            />

            {/* MODAL DETALLE (Lectura) */}
            <ChassisDetailModal
                isOpen={isDetailOpen}
                onClose={handleCloseDetail}
                chassis={viewChassis}
            />

            {/* MODAL CONFIRMACIÓN REACTIVACIÓN */}
            {reactivateConfirmModal.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content reactivate-modal">
                        <h2>¿Reactivar Chasis?</h2>
                        <p><strong>{reactivateConfirmModal.chassis?.Dominio_chasis}</strong></p>
                        <p style={{ marginTop: '15px', fontSize: '0.95rem', color: '#666' }}>
                            El chasis volverá a estar disponible para usar en viajes.
                        </p>
                        <div className="modal-actions">
                            <button onClick={() => setReactivateConfirmModal({ isOpen: false, chassis: null })} className="btn-cancel">
                                Cancelar
                            </button>
                            <button onClick={handleConfirmReactivate} className="btn-confirm-reactivate">
                                ✅ Reactivar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chassis;
