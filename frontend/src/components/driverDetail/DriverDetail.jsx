import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/navbar/Navbar';
import { useDriver } from '../../context/driver/DriverContext'; 
import './driverDetail.css'; 

const DriverDetail = ({ driverId = null, onClose = null }) => {
    const params = useParams();
    const navigate = useNavigate();
    const id = driverId ?? params.id;
    
    const { getDriverById } = useDriver(); 
    
    const [driver, setDriver] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDriver = async () => {
            setLoading(true);
            const data = await getDriverById(id);
            if (data) setDriver(data);
            setLoading(false);
        };

        if (id) fetchDriver();
    }, [id, getDriverById]);

    const formatDate = (dateString) => {
        if (!dateString) return 'No registra';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const getDateColor = (dateString) => {
        if (!dateString) return '#64748b';
        const days = Math.ceil((new Date(dateString) - new Date()) / (1000 * 60 * 60 * 24));
        if (days < 0) return '#ef4444'; 
        if (days < 30) return '#eab308'; 
        return '#22c55e'; 
    };

    if (loading) return <div className="dd-loading">Cargando perfil...</div>;
    if (!driver) return <div className="dd-loading">Chofer no encontrado</div>;

    // --- COMPONENTE INTERNO PARA MANEJAR IMAGEN vs PDF ---
    const FileCard = ({ title, date, url }) => {
        // Detectamos si es PDF mirando la extensión del archivo en la URL
        const isPdf = url && url.toLowerCase().includes('.pdf');

        // Ejemplo si usas la lógica de "FileCard" o renderizado directo:

        return (
            <div className="dd-card">
                <h4>{title}</h4>
                <div className="dd-row">
                    <span className="dd-label">Vencimiento:</span>
                    <span className="dd-value" style={{ color: getDateColor(date) }}>
                        {formatDate(date)}
                    </span>
                </div>
                
                {/* ÁREA DE PREVISUALIZACIÓN */}
                <div className="dd-preview-container">
                    {url ? (
                        <>
                            {isPdf ? (
                                // SI ES PDF: Mostramos ícono
                                <div className="dd-file-icon pdf-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                    <span>Documento PDF</span>
                                </div>
                            ) : (
                                // SI ES IMAGEN: Mostramos la foto
                                <img src={url} alt={title} className="dd-image-preview" />
                            )}
                            
                            {/* BOTONES DE ACCIÓN (Hover) */}
                            <div className="dd-file-actions">
                                <button onClick={() => window.open(url, '_blank')} className="dd-btn-action">
                                    👁️ Ver / Descargar
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="dd-no-file">
                            <span>Sin archivo cargado</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- CONTENIDO PRINCIPAL ---
    const ProfileContent = () => (
        <div className="dd-profile-card">
            <div className="dd-card-header">
                <div className="dd-avatar">
                    {driver.nombre?.charAt(0).toUpperCase()}{driver.apellido?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                    <h1 className="dd-name">{driver.nombre?.charAt(0).toUpperCase()}{driver.nombre?.slice(1)} {driver.apellido?.charAt(0).toUpperCase()}{driver.apellido?.slice(1)}</h1>
                    <p className="dd-dni">DNI: {driver.dni}</p>
                    <p className="dd-meta">Fecha de Alta: {formatDate(driver.fecha_de_alta)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span className={`dd-badge ${driver.activo ? 'dd-active' : 'dd-inactive'}`}>
                        {driver.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                </div>
            </div>

            <h3 className="dd-section-title">Documentación y Vencimientos</h3>

            <div className="dd-grid">
                
                {/* DNI (Caso especial, no tiene vencimiento visible en tu modelo, pero lo mostramos igual) */}
                <div className="dd-card">
                    <h4>Documento (DNI)</h4>
                    <div className="dd-row">
                        <span className="dd-label">Estado:</span>
                        <span className="dd-value">Vigente</span>
                    </div>
                    <div className="dd-preview-container">
                        {driver.url_dni ? (
                            <>
                                {driver.url_dni.toLowerCase().includes('.pdf') ? (
                                    <div className="dd-file-icon pdf-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                        <span>PDF</span>
                                    </div>
                                ) : (
                                    <img src={driver.url_dni} alt="DNI" className="dd-image-preview" />
                                )}
                                <div className="dd-file-actions">
                                    <button onClick={() => window.open(driver.url_dni, '_blank')} className="dd-btn-action">
                                        👁️ Ver / Descargar
                                    </button>
                                </div>
                            </>
                        ) : <div className="dd-no-file">Sin archivo</div>}
                    </div>
                </div>

                {/* LOS OTROS 4 DOCUMENTOS USANDO EL COMPONENTE INTELIGENTE */}
                <FileCard title="Licencia de Conducir" date={driver.vencimiento_licencia} url={driver.url_licencia} />
                <FileCard title="Psicofísico" date={driver.vencimiento_psicofisico} url={driver.url_psicofisico} />
                <FileCard title="Carga General" date={driver.vencimiento_carga_normal} url={driver.url_curso_carga_normal} />
                <FileCard title="Carga Peligrosa" date={driver.vencimiento_carga_peligrosa} url={driver.url_curso_carga_peligrosa} />

            </div>

            {/* SECCIÓN DE NOTAS */}
            {driver.notas && (
                <div className="dd-notes-section">
                    <h3 className="dd-section-title">Notas y Observaciones</h3>
                    <div className="dd-notes-box">
                        {driver.notas}
                    </div>
                </div>
            )}
        </div>
    );

    // --- RENDERIZADO MODAL vs PAGINA ---
    if (driverId) {
        return (
            <div className="dd-modal-overlay">
                <div className="dd-modal-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ margin: 0 }}>Detalle del Chofer</h2>
                        <button onClick={() => onClose ? onClose() : null} className="dd-btn-close-x">&times;</button>
                    </div>
                    <div style={{maxHeight: '80vh', overflowY: 'auto'}}>
                        <ProfileContent />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dd-layout">
            <Navbar />
            <div className="dd-container">
                <div className="dd-header">
                    <button onClick={() => navigate('/panel-driver')} className="dd-btn-back">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        Volver al listado
                    </button>
                </div>
                <ProfileContent />
            </div>
        </div>
    );
};

export default DriverDetail;