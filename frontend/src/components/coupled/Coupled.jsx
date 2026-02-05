import React, { useState } from 'react';
import CoupledFormModal from '../../components/coupledFormModal/CoupledFormModal';
import CoupledDetailModal from '../../components/coupledDetailModal/CoupledDetailModal';
import { useCoupled } from '../../context/coupled/CoupledContext';

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

    // Modal de confirmación para reactivación
    const [reactivateConfirmModal, setReactivateConfirmModal] = useState({ isOpen: false, coupled: null });

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
        let success = selectedCoupled
            ? await updateCoupled(selectedCoupled.id, formData)
            : await createCoupled(formData);
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

    // Manejo de reactivación
    const handleReactivateClick = (coupled) => {
        setReactivateConfirmModal({ isOpen: true, coupled });
    };

    const handleConfirmReactivate = async () => {
        if (reactivateConfirmModal.coupled) {
            await reactivateCoupled(reactivateConfirmModal.coupled.id);
            setReactivateConfirmModal({ isOpen: false, coupled: null });
        }
    };

    const getStatusConfig = (status) => {
        const map = { 'VENCIDO': 'red', 'PROXIMO': 'yellow', 'AL_DIA': 'green' };
        return { color: map[status] || 'green', text: status?.replace('_', ' ') || 'Al día' };
    };

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
            <>
                <div className="table-responsive">
                    <table className="fleet-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>Info</th>
                                <th>Dominio (Patente)</th>
                                <th>Vencimientos</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(item => {
                                const status = getStatusConfig(item.estado_general);
                                return (
                                    <tr key={item.id} className={!item.activo ? 'inactive-row' : ''}>
                                        <td style={{ textAlign: 'center', fontSize: '1.2rem' }}>
                                            {item.info_completa
                                                ? <span title="Legajo Completo">✅</span>
                                                : <span title="Falta documentación">⚠️</span>
                                            }
                                        </td>
                                        <td><strong>{item.Dominio_acoplado}</strong></td>
                                        <td>
                                            <span className={`traffic-light light-${status.color}`}></span>
                                            {status.text}
                                        </td>
                                        <td>
                                            <button className="action-btn view" title="Ver Detalle" onClick={() => handleOpenDetail(item)}>
                                                👁️
                                            </button>
                                            <button className="action-btn edit" title="Editar" onClick={() => handleOpenEdit(item)}>
                                                ✏️
                                            </button>
                                            {showReactivate ? (
                                                <button className="action-btn reactivate" title="Reactivar" onClick={() => handleReactivateClick(item)}>
                                                    ♻️
                                                </button>
                                            ) : (
                                                <button className="action-btn delete" title="Dar de baja" onClick={() => handleDeleteClick(item)}>
                                                    🗑️
                                                </button>
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
            </>
        )
    };

    return (
        <>
            {/* PESTAÑAS */}
            <div className="tabs-container">
                <div>
                    <button
                        className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
                        onClick={() => setActiveTab('active')}
                    >
                        👤  Activos ({coupled.length})
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'inactive' ? 'active' : ''}`}
                        onClick={() => setActiveTab('inactive')}
                    >
                        📦 Inactivos ({inactiveCoupled.length})
                    </button>
                </div>
                 {/* BUSCADOR */}
            <div >
                <input
                    type="text"
                    className="driver-search-input"
                    placeholder="Buscar por dominio..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>
            <div className="tab-actions-header">
                <button onClick={handleOpenCreate} className="btn-add-chassis">+ Nuevo Acoplado</button>
            </div>
            </div>
           

            {!loading ? (
                activeTab === 'active' ? (
                    <CoupledTable data={coupled} showReactivate={false} />
                ) : (
                    <CoupledTable data={inactiveCoupled} showReactivate={true} />
                )
            ) : (
                <div className="loading-msg">Cargando flota...</div>
            )}

            <CoupledFormModal
                isOpen={isFormOpen}
                onClose={handleClose}
                onSubmit={handleSave}
                coupledToEdit={selectedCoupled}
            />

            <CoupledDetailModal
                isOpen={isDetailOpen}
                onClose={handleCloseDetail}
                coupled={viewCoupled}
            />

            {/* MODAL CONFIRMACIÓN REACTIVACIÓN */}
            {reactivateConfirmModal.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content reactivate-modal">
                        <h2>¿Reactivar Acoplado?</h2>
                        <p><strong>{reactivateConfirmModal.coupled?.Dominio_acoplado}</strong></p>
                        <p style={{ marginTop: '15px', fontSize: '0.95rem', color: '#666' }}>
                            El acoplado volverá a estar disponible para usar en viajes.
                        </p>
                        <div className="modal-actions">
                            <button onClick={() => setReactivateConfirmModal({ isOpen: false, coupled: null })} className="btn-cancel">
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

export default Coupled;