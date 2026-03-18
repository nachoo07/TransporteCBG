import React from 'react';
import './chassisDetailModal.css';

const ChassisDetailModal = ({ isOpen, onClose, chassis }) => {
    if (!isOpen || !chassis) return null;

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

    const formatNonExpiringDate = (dateString) => {
        if (!dateString) return 'No vence';
        return `${formatDate(dateString)} · No vence`;
    };
    return (
        <div className="cdm-overlay" onClick={onClose}>
            <div className="cdm-content" onClick={(e) => e.stopPropagation()}>
                {/* HEADER PERFIL */}
                <div className="cdm-profile-header">
                    <div className="cdm-profile-main">
                        <h2 className="cdm-header-title">Detalle del Chasis</h2>
                    </div>
                    <button onClick={onClose} className="cdm-close-x">
                        &times;
                    </button>
                </div>

                {/* BODY */}
                <div className="cdm-body">

                    {/* INFO */}
                    <div className="cdm-section ">
                        <h3 className="cdm-section-title">Información principal</h3>
                        <div className="cdm-grid cdm-info-grid">
                            <div className="cdm-grid-info">
                                <div className="cdm-card">
                                    <label>Dominio</label>
                                    <span>{chassis.Dominio_chasis || '-'}</span>
                                </div>
                            </div>
                            <div className="cdm-grid-info">
                                <div className="cdm-card">
                                    <label>Condición</label>
                                    <span className={`cdm-condition ${chassis.estado_general?.toLowerCase()}`}>
                                        {chassis.estado_general?.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                            <div className="cdm-card">
                                <label>Estado</label>
                                <span className={`cdm-status-text ${chassis.activo ? 'active' : 'inactive'}`}>
                                    {chassis.activo ? 'Activo' : 'Archivado'}
                                </span>
                            </div>
                            <div className="cdm-card">
                                <label>Título del automotor</label>
                                {chassis.url_titulo_chasis ? (
                                    <button
                                        className="cdm-btn-link"
                                        onClick={() => openDoc(chassis.url_titulo_chasis)}
                                    >
                                        Ver documento
                                    </button>
                                ) : (
                                    <span>No registra</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* DOCUMENTACIÓN */}
                    <div className="cdm-section">
                        <h3 className="cdm-section-title">Documentación y vencimientos</h3>

                        <div className="cdm-grid">
                            <div className={`cdm-card ${getVencimientoClass(chassis.estado_cedula_chasis)}`}>
                                <label>Cédula</label>
                                <span>{formatDate(chassis.vencimiento_cedula_chasis)}</span>
                                {chassis.url_cedula_chasis && (
                                    <button
                                        className="cdm-btn-link"
                                        onClick={() => openDoc(chassis.url_cedula_chasis)}
                                    >
                                        Ver documento
                                    </button>
                                )}
                            </div>
                            <div className={`cdm-card ${getVencimientoClass(chassis.estado_vtv_chasis)}`}>
                                <label>VTV</label>
                                <span>{formatDate(chassis.vencimiento_vtv_chasis)}</span>
                                {chassis.url_vtv_chasis && (
                                    <button
                                        className="cdm-btn-link"
                                        onClick={() => openDoc(chassis.url_vtv_chasis)}
                                    >
                                        Ver documento
                                    </button>
                                )}
                            </div>

                            <div className={`cdm-card ${getVencimientoClass(chassis.estado_senasa_chasis)}`}>
                                <label>SENASA</label>
                                <span>{formatDate(chassis.vencimiento_senasa_chasis)}</span>
                                {chassis.url_senasa_chasis && (
                                    <button
                                        className="cdm-btn-link"
                                        onClick={() => openDoc(chassis.url_senasa_chasis)}
                                    >
                                        Ver documento
                                    </button>
                                )}
                            </div>

                            <div className={`cdm-card ${getVencimientoClass(chassis.estado_tipificacion_carga_chasis)}`}>
                                <label>Tipificación</label>
                                <span>{formatNonExpiringDate(chassis.vencimiento_tipificacion_carga_chasis)}</span>
                                {chassis.url_tipificacion_carga_chasis && (
                                    <button
                                        className="cdm-btn-link"
                                        onClick={() => openDoc(chassis.url_tipificacion_carga_chasis)}
                                    >
                                        Ver documento
                                    </button>
                                )}
                            </div>

                            <div className={`cdm-card ${getVencimientoClass(chassis.estado_homologacion_chasis)}`}>
                                <label>Homologación</label>
                                <span>{formatNonExpiringDate(chassis.vencimiento_homologacion_chasis)}</span>
                                {chassis.url_homologacion_chasis && (
                                    <button
                                        className="cdm-btn-link"
                                        onClick={() => openDoc(chassis.url_homologacion_chasis)}
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

export default ChassisDetailModal;
