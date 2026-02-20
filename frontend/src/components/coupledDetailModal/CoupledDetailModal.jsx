import React from 'react'
import '../coupledFormModal/CoupledFormModal.css'

const CoupledDetailModal = ({ isOpen, onClose, coupled }) => {
    if (!isOpen || !coupled) return null;

   const formatDate = (dateString) => {
        if (!dateString) return 'No registra';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const openDoc = (url) => {
        if (url) window.open(url, '_blank');
    };

    const getVencimientoClass = (estado) => {
        switch (estado) {
            case 'VENCIDO':
                return 'cdm-card-danger';
            case 'PROXIMO':
                return 'cdm-card-warning';
            default:
                return '';
        }
    };

    return (
        <div className="cdm-overlay" onClick={onClose}>
            <div className="cdm-content" onClick={(e) => e.stopPropagation()}>
                <div className="cdm-profile-header">
                      <div className="cdm-profile-main">
                        <h2 className="cdm-header-title">Detalle del acoplado</h2>
                    </div>
                    <button onClick={onClose} className="btn-close-x">&times;</button>
                </div>

                <div className="cdm-body">
                    <div className="cdm-section">
                        <h3 className="cdm-section-title">Información principal</h3>
                        <div className="cdm-grid cdm-info-grid">
                              <div className="cdm-grid-info">
                                <div className="cdm-card">
                                    <label>Dominio</label>
                                    <span>{coupled.Dominio_acoplado || '-'}</span>
                                </div>
                            </div>
                             <div className="cdm-grid-info">
                                <div className="cdm-card">
                                    <label>Condición</label>
                                    <span className={`cdm-condition ${coupled.estado_general?.toLowerCase()}`}>
                                        {coupled.estado_general?.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                             <div className="cdm-card">
                                <label>Estado</label>
                                <span className={`cdm-status-text ${coupled.activo ? 'active' : 'inactive'}`}>
                                    {coupled.activo ? 'Activo' : 'Archivado'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="cdm-section">
                        <h3 className="cdm-section-title">Documentación y vencimientos</h3>
                        <div className="cdm-grid">
                            {/* Cédula */}
                             <div className={`cdm-card ${getVencimientoClass(coupled.estado_cedula_acoplado)}`}>
                                <label>Cédula</label>
                                <span>{formatDate(coupled.vencimiento_cedula_acoplado)}</span>
                                {coupled.url_cedula_acoplado && (
                                    <button
                                        className="cdm-btn-link"
                                        onClick={() => openDoc(coupled.url_cedula_acoplado)}
                                    >
                                        Ver documento
                                    </button>
                                )}
                            </div>

                            {/* VTV */}
                            <div className={`cdm-card ${getVencimientoClass(coupled.estado_vtv_acoplado)}`}>
                                <label>VTV</label>
                                <span>{formatDate(coupled.vencimiento_vtv_acoplado)}</span>
                                {coupled.url_vtv_acoplado && (
                                    <button
                                        className="cdm-btn-link"
                                        onClick={() => openDoc(coupled.url_vtv_acoplado)}
                                    >
                                        Ver documento
                                    </button>
                                )}
                            </div>

                            {/* SENASA */}
                            <div className={`cdm-card ${getVencimientoClass(coupled.estado_senasa_acoplado)}`}>
                                <label>SENASA</label>
                                <span>{formatDate(coupled.vencimiento_senasa_acoplado)}</span>
                                {coupled.url_senasa_acoplado && (
                                    <button
                                        className="cdm-btn-link"
                                        onClick={() => openDoc(coupled.url_senasa_acoplado)}
                                    >
                                        Ver documento
                                    </button>
                                )}
                            </div>

                            {/* Tipificación */}
                            <div className={`cdm-card ${getVencimientoClass(coupled.estado_tipificacion_carga_acoplado)}`}>
                                <label>Tipificación</label>
                                <span>{formatDate(coupled.vencimiento_tipificacion_carga_acoplado)}</span>
                                {coupled.url_tipificacion_carga_acoplado && (
                                    <button
                                        className="cdm-btn-link"
                                        onClick={() => openDoc(coupled.url_tipificacion_carga_acoplado)}
                                    >
                                        Ver documento
                                    </button>
                                )}
                            </div>

                            {/* Homologación */}
                            <div className={`cdm-card ${getVencimientoClass(coupled.estado_homologacion_acoplado)}`}>
                                <label>Homologación</label>
                                <span>{formatDate(coupled.vencimiento_homologacion_acoplado)}</span>
                                {coupled.url_homologacion_acoplado && (
                                    <button
                                        className="cdm-btn-link"
                                        onClick={() => openDoc(coupled.url_homologacion_acoplado)}
                                    >
                                        Ver documento
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="cdm-actions">
                    <button onClick={onClose} className="cdm-btn-secondary">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CoupledDetailModal;
