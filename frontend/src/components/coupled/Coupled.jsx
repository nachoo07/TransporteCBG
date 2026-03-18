import React, { useState } from 'react';
import CoupledFormModal from '../../components/coupledFormModal/CoupledFormModal';
import CoupledDetailModal from '../../components/coupledDetailModal/CoupledDetailModal';
import { useCoupled } from '../../context/coupled/CoupledContext';
import '../chassis/chassis.css';

const Coupled = () => {
    const { coupled, inactiveCoupled, loading, createCoupled, updateCoupled, deleteCoupled, reactivateCoupled, getCoupledById } = useCoupled();

    // Estado para Formulario (Crear/Editar)
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCoupled, setSelectedCoupled] = useState(null);

    // Estado para Vista Detallada (Solo lectura)
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [viewCoupled, setViewCoupled] = useState(null);

    // Estado para pestañas
    const [activeTab, setActiveTab] = useState('active');

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [isSaving, setIsSaving] = useState(false);

    // Estado de busqueda
    const [search, setSearch] = useState('');

    // Handlers Formulario
    const handleOpenCreate = () => { setSelectedCoupled(null); setIsFormOpen(true); };
    const handleOpenEdit = (item) => { setSelectedCoupled(item); setIsFormOpen(true); };
    const handleClose = () => { setIsFormOpen(false); setSelectedCoupled(null); };

    // Handlers Detalle
    const handleOpenDetail = async (item) => {
        const fullCoupled = await getCoupledById(item.id);
        if (!fullCoupled) return;

        setViewCoupled(fullCoupled);
        setIsDetailOpen(true);
    };
    const handleCloseDetail = () => { setIsDetailOpen(false); setViewCoupled(null); };

    const handleSave = async (formData) => {
        setIsSaving(true);
        let success = selectedCoupled
            ? await updateCoupled(selectedCoupled.id, formData)
            : await createCoupled(formData);
        setIsSaving(false);
        if (success) handleClose();
    };

    // Filtrado por búsqueda
    const filterCoupled = (arr) => {
        const q = search.toLowerCase();
        return arr.filter(coupled => coupled.Dominio_acoplado.toLowerCase().includes(q));
    };

    // Manejo de eliminación
    const handleDeleteClick = (coupled) => {
        deleteCoupled(coupled.id);
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


    const CoupledTable = ({ data, showReactivate = false }) => {
        const totalPages = Math.ceil(data.length / itemsPerPage);
        return (
            <div className="fleet-table-shell">
                <div className="table-responsive">
                    <table className={`fleet-table ${showReactivate ? 'fleet-table-archived' : 'fleet-table-active'}`}>
                        <thead>
                            <tr>
                                <th>Dominio (Patente)</th>
                                <th>Vencimientos</th>
                                <th style={{ width: '190px' }}>Documentación</th>
                                {showReactivate && <th>Fecha de Archivo</th>}
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated(data).map(item => {
                                const status = getStatusConfig(item.estado_general);
                                return (
                                    <tr key={item.id} className={!item.activo ? 'inactive-row' : ''}>
                                        <td><strong>{item.Dominio_acoplado}</strong></td>
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
                                                <button className="btn-action-chassis" title="Reactivar" onClick={() => reactivateCoupled(item.id)}>
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
                    {data.length === 0 && <p className="empty-msg">No hay acoplados en esta categoría.</p>}
                </div>
                {/* PAGINACIÓN */}
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
        )
    };

    return (
        <>
            <div className="fleet-control-panel">
                <div className="fleet-control-header">
                    <span className="fleet-control-title">Gestión de acoplados</span>
                </div>

                <div className="fleet-toolbar-row">
                    <div className="fleet-tabs-group fleet-tabs-segmented">
                        <button
                            className={`tab-btn fleet-tab-button ${activeTab === 'active' ? 'active' : ''}`}
                            onClick={() => setActiveTab('active')}
                        >
                            Activos ({coupled.length})
                        </button>
                        <button
                            className={`tab-btn fleet-tab-button ${activeTab === 'inactive' ? 'active' : ''}`}
                            onClick={() => setActiveTab('inactive')}
                        >
                            Archivados ({inactiveCoupled.length})
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
                            <button onClick={handleOpenCreate} className="btn-add-chassis fleet-add-btn">+ Nuevo Acoplado</button>
                        )}
                    </div>
                </div>
            </div>

            {!loading ? (
                activeTab === 'active' ? (
                    <CoupledTable data={filterCoupled(coupled)} showReactivate={false} />
                ) : (
                    <CoupledTable data={filterCoupled(inactiveCoupled)} showReactivate={true} />
                )
            ) : (
                <div className="loading-msg">Cargando flota...</div>
            )}

            <CoupledFormModal
                isOpen={isFormOpen}
                onClose={handleClose}
                onSubmit={handleSave}
                coupledToEdit={selectedCoupled}
                isSaving={isSaving}
            />

            <CoupledDetailModal
                isOpen={isDetailOpen}
                onClose={handleCloseDetail}
                coupled={viewCoupled}
            />
        </>
    );
};

export default Coupled;
