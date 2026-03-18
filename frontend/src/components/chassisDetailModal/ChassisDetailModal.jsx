import React, { useEffect, useState } from 'react';
import './chassisDetailModal.css';

const formatKm = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '-';
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(numeric);
};

const ChassisDetailModal = ({ isOpen, onClose, chassis, onRegisterService, isRegisteringService = false }) => {
    const [serviceForm, setServiceForm] = useState({ fecha_service: '', observacion: '' });
    const chassisId = chassis?.id;

    useEffect(() => {
        if (!isOpen || !chassisId) return;
        const today = new Date();
        const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
            .toISOString()
            .split('T')[0];
        setServiceForm({ fecha_service: local, observacion: '' });
    }, [isOpen, chassisId]);

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

    const serviceStateCopy = {
        AL_DIA: 'Al día',
        PROXIMO: 'Próximo al service',
        PENDIENTE: 'Service pendiente',
    };
    const hasRegisteredService = Boolean(chassis.fecha_ultimo_service);
    const baseKmLabel = hasRegisteredService ? 'KM al último service' : 'KM al crear el chasis';
    const accumulatedKmLabel = hasRegisteredService ? 'KM desde último service' : 'KM acumulados desde alta';
    const remainingKmLabel = hasRegisteredService ? 'KM restantes para service' : 'KM restantes para primer service';
    const lastServiceLabel = hasRegisteredService ? 'Último service' : 'Service registrado';
    const lastServiceValue = hasRegisteredService ? formatDate(chassis.fecha_ultimo_service) : 'Aún no se registró ningún service';
    const observationLabel = hasRegisteredService ? 'Observación del último service' : 'Observación de service';

    const handleServiceSubmit = async (e) => {
        e.preventDefault();
        if (!onRegisterService || !serviceForm.fecha_service) return;
        await onRegisterService(chassis.id, serviceForm);
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

                    <div className="cdm-section">
                        <h3 className="cdm-section-title">Service y kilometraje</h3>

                        <div className="cdm-grid">
                            <div className={`cdm-card cdm-service-state cdm-service-${String(chassis.service_estado || 'AL_DIA').toLowerCase()}`}>
                                <label>Estado de service</label>
                                <span>{serviceStateCopy[chassis.service_estado] || 'Al día'}</span>
                            </div>
                            <div className="cdm-card">
                                <label>{baseKmLabel}</label>
                                <span>{formatKm(chassis.km_inicial)} km</span>
                            </div>
                            <div className="cdm-card">
                                <label>Kilometraje actual</label>
                                <span>{formatKm(chassis.km_actual)} km</span>
                            </div>
                            <div className="cdm-card">
                                <label>{accumulatedKmLabel}</label>
                                <span>{formatKm(chassis.km_desde_ultimo_service)} km</span>
                            </div>
                            <div className="cdm-card">
                                <label>{remainingKmLabel}</label>
                                <span>{formatKm(chassis.km_restantes_service)} km</span>
                            </div>
                            <div className="cdm-card">
                                <label>{lastServiceLabel}</label>
                                <span>{lastServiceValue}</span>
                            </div>
                            <div className="cdm-card cdm-card-full">
                                <label>{observationLabel}</label>
                                <span>{chassis.observacion_ultimo_service || 'Sin observaciones'}</span>
                            </div>
                        </div>

                        <form className="cdm-service-form" onSubmit={handleServiceSubmit}>
                            <div className="cdm-service-form-header">
                                <h4>Registrar service realizado</h4>
                                <span>Al guardar, el sistema toma el último KM registrado como nuevo punto de partida para el próximo service.</span>
                            </div>
                            <div className="cdm-service-form-grid">
                                <div className="cdm-form-field">
                                    <label htmlFor="fecha_service">Fecha</label>
                                    <input
                                        id="fecha_service"
                                        type="date"
                                        value={serviceForm.fecha_service}
                                        onChange={(e) => setServiceForm((prev) => ({ ...prev, fecha_service: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="cdm-form-field cdm-form-field-wide">
                                    <label htmlFor="observacion_service">Comentario</label>
                                    <textarea
                                        id="observacion_service"
                                        rows="3"
                                        placeholder="Opcional"
                                        value={serviceForm.observacion}
                                        onChange={(e) => setServiceForm((prev) => ({ ...prev, observacion: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="cdm-service-actions">
                                <button type="submit" className="cdm-btn-primary" disabled={isRegisteringService}>
                                    {isRegisteringService ? 'Guardando...' : 'Confirmar service'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* DOCUMENTACIÓN */}
                    <div className="cdm-section">
                        <h3 className="cdm-section-title">Documentación y vencimientos</h3>

                        <div className="cdm-grid">
                            <div className="cdm-card">
                                <label>Doc. Cédula</label>
                                <span>{chassis.url_cedula_chasis ? 'Documento cargado' : 'No registra'}</span>
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

                            <div className="cdm-card">
                                <label>Doc. Tipificación</label>
                                <span>{chassis.url_tipificacion_carga_chasis ? 'Documento cargado' : 'No registra'}</span>
                                {chassis.url_tipificacion_carga_chasis && (
                                    <button
                                        className="cdm-btn-link"
                                        onClick={() => openDoc(chassis.url_tipificacion_carga_chasis)}
                                    >
                                        Ver documento
                                    </button>
                                )}
                            </div>

                            <div className="cdm-card">
                                <label>Doc. Homologación</label>
                                <span>{chassis.url_homologacion_chasis ? 'Documento cargado' : 'No registra'}</span>
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
