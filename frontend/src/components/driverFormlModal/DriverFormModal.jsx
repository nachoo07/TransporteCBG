import React, { useState, useEffect } from 'react';
import './driverFormModal.css';

  const DriverFormModal = ({ isOpen, onClose, onSubmit, driverToEdit, isSaving }) => {

    // ... (Tu helper de fechas sigue igual) ...
    const formatDateForInput = (isoString) => isoString ? isoString.split('T')[0] : '';

    const initialFormState = {
        nombre: '', apellido: '', dni: '', activo: '1',
        fecha_de_alta: new Date().toISOString().split('T')[0], fecha_de_baja: '',
        vencimiento_licencia: '', vencimiento_psicofisico: '',
        vencimiento_carga_normal: '', vencimiento_carga_peligrosa: '',
        notas: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [files, setFiles] = useState({});

    // NUEVO: Estado para saber qué archivos viejos quiere eliminar el usuario
    const [filesToDelete, setFilesToDelete] = useState({});

    useEffect(() => {
        if (isOpen) {
            setFilesToDelete({}); // Reseteamos borrados
            setFiles({}); // Reseteamos archivos nuevos

            if (driverToEdit) {
                setFormData({
                    nombre: driverToEdit.nombre || '',
                    apellido: driverToEdit.apellido || '',
                    dni: driverToEdit.dni || '',
                    activo: driverToEdit.activo ? '1' : '0',
                    fecha_de_alta: formatDateForInput(driverToEdit.fecha_de_alta),
                    fecha_de_baja: formatDateForInput(driverToEdit.fecha_de_baja),
                    vencimiento_licencia: formatDateForInput(driverToEdit.vencimiento_licencia),
                    vencimiento_psicofisico: formatDateForInput(driverToEdit.vencimiento_psicofisico),
                    vencimiento_carga_normal: formatDateForInput(driverToEdit.vencimiento_carga_normal),
                    vencimiento_carga_peligrosa: formatDateForInput(driverToEdit.vencimiento_carga_peligrosa),
                    notas: driverToEdit.notas || ''
                });
            } else {
                setFormData(initialFormState);
            }
        }
    }, [isOpen, driverToEdit]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- MANEJO DE ARCHIVOS ---

    const handleFileSelect = (name, e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(prev => ({ ...prev, [name]: e.target.files[0] }));
            // Si subo uno nuevo, cancelo la orden de eliminar el viejo (porque lo estoy reemplazando)
            setFilesToDelete(prev => ({ ...prev, [name]: false }));
        }
    };

    const handleMarkDelete = (name) => {
        setFilesToDelete(prev => ({ ...prev, [name]: true }));
        setFiles(prev => {
            const copy = { ...prev };
            delete copy[name]; // Quitamos cualquier archivo nuevo que hubiera seleccionado
            return copy;
        });
    };

    const handleUndoDelete = (name) => {
        setFilesToDelete(prev => ({ ...prev, [name]: false }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSend = new FormData();

        // Datos texto
        Object.keys(formData).forEach(key => {
            if (!driverToEdit && key === 'fecha_de_baja') return;
            if (formData[key] !== null && formData[key] !== undefined) dataToSend.append(key, formData[key]);
        });

        // Archivos Nuevos
        Object.keys(files).forEach(key => {
            if (files[key]) dataToSend.append(key, files[key]);
        });

        // Banderas de Eliminación (Esto leerá el Backend nuevo)
        // Mapeamos los nombres internos a los nombres que espera el backend
        if (filesToDelete['archivo_dni']) dataToSend.append('eliminar_dni', 'true');
        if (filesToDelete['archivo_licencia']) dataToSend.append('eliminar_licencia', 'true');
        if (filesToDelete['archivo_psicofisico']) dataToSend.append('eliminar_psicofisico', 'true');
        if (filesToDelete['archivo_curso_carga_normal']) dataToSend.append('eliminar_carga_normal', 'true');
        if (filesToDelete['archivo_curso_carga_peligrosa']) dataToSend.append('eliminar_carga_peligrosa', 'true');

        onSubmit(dataToSend);
    };

    // --- COMPONENTE DRAG & DROP DE ARCHIVO ---
    const FileDropZone = ({ onFile, accept, inputId }) => {
        const [isActive, setIsActive] = useState(false);
        const handleDrop = (e) => {
            e.preventDefault();
            setIsActive(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                onFile(e.dataTransfer.files[0]);
            }
        };
        return (
            <div
                className={`dfm-dropzone${isActive ? ' dfm-dropzone-active' : ''}`}
                onDragOver={e => { e.preventDefault(); setIsActive(true); }}
                onDragLeave={e => { e.preventDefault(); setIsActive(false); }}
                onDrop={handleDrop}
                onClick={() => document.getElementById(inputId)?.click()}
                tabIndex={0}
            >
                <div>Arrastra un archivo aquí o haz clic</div>
                <input
                    id={inputId}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={e => e.target.files && onFile(e.target.files[0])}
                    accept={accept}
                />
            </div>
        );
    };

    // --- COMPONENTE VISUAL DE ARCHIVO (UI MEJORADA, BOTÓN GRANDE o DRAG&DROP) ---
    const FileControl = ({ label, inputName, currentUrl }) => {
        const isDeleted = filesToDelete[inputName];
        const newFile = files[inputName];
        const hasCurrent = !!currentUrl && !isDeleted;

        return (
            <div className="dfm-group">
                <label>{label}</label>

                {/* ESTADO 1: Hay un archivo actual cargado */}
                {hasCurrent && !newFile && (
                    <div className="dfm-file-card-existing">
                        <div className="dfm-file-info">
                            <span className="dfm-icon">📄</span>
                            <span>Archivo Cargado</span>
                        </div>
                        <div className="dfm-file-actions">
                            <button type="button" onClick={() => window.open(currentUrl, '_blank')} className="dfm-btn-mini view" title="Ver">👁️</button>
                            <label htmlFor={`file-${inputName}`} className="dfm-btn-mini replace" title="Cambiar">🔄</label>
                            <button type="button" onClick={() => handleMarkDelete(inputName)} className="dfm-btn-mini delete" title="Eliminar">🗑️</button>
                        </div>
                    </div>
                )}

                {/* ESTADO 2: Se marcó para eliminar */}
                {isDeleted && !newFile && (
                    <div className="dfm-file-card-deleted">
                        <span>🗑️ Se eliminará este archivo.</span>
                        <button type="button" onClick={() => handleUndoDelete(inputName)} className="dfm-link-btn">Deshacer</button>
                    </div>
                )}

                {/* ESTADO 3: Se seleccionó un archivo nuevo */}
                {newFile && (
                    <div className="dfm-file-card-new">
                        <span className="dfm-success-text">✨ Nuevo: {newFile.name}</span>
                        <button type="button" onClick={() => setFiles(prev => { const c = { ...prev }; delete c[inputName]; return c; })} className="dfm-close-btn">×</button>
                    </div>
                )}

                {/* INPUT MODERNO: Drag & Drop */}
                {!hasCurrent && !newFile && !isDeleted && (
                    <FileDropZone
                      inputId={`file-drag-${inputName}`}
                      onFile={file => handleFileSelect(inputName, { target: { files: [file] } })}
                      accept=".jpg,.jpeg,.png,.pdf"
                    />
                )}

                {/* INPUT OCULTO (Para el botón "Cambiar") */}
                <input
                    type="file"
                    id={`file-${inputName}`}
                    name={inputName}
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(inputName, e)}
                    accept=".jpg,.jpeg,.png,.pdf"
                />
            </div>
        );
    };

    return (
        <div className="dfm-overlay">
            <div className="dfm-content">
                <div className="dfm-header">
                    <h2>{driverToEdit ? 'Editar Chofer' : 'Nuevo Chofer'}</h2>
                    <button onClick={onClose} className="dfm-close">&times;</button>
                </div>
            <div className="dfm-body">
                <form onSubmit={handleSubmit}>
                    <h4 className="dfm-section-title">Datos Personales</h4>
                    <div className="dfm-row">
                        <div className="dfm-group">
                            <label>Nombre</label>
                            <input type="text" name="nombre" className="dfm-input" value={formData.nombre} onChange={handleChange} required />
                        </div>
                        <div className="dfm-group">
                            <label>Apellido</label>
                            <input type="text" name="apellido" className="dfm-input" value={formData.apellido} onChange={handleChange} required />
                        </div>
                        <div className="dfm-group">
                            <label>Dni</label>
                            <input type="text"  name="dni" className="dfm-input" value={formData.dni} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="dfm-row-f-d">
                        <div className="dfm-group">
                            <label>Fecha de Alta</label>
                            <input type="date" name="fecha_de_alta" className="dfm-input" value={formData.fecha_de_alta} onChange={handleChange} />
                        </div>
                        <FileControl label="Foto DNI" inputName="archivo_dni" currentUrl={driverToEdit?.url_dni} />
                    </div>

                    <h4 className="dfm-section-title">Documentación</h4>
                    

                    <div className="dfm-row-doc">
                        <div className="dfm-group">
                            <label>Venc. Licencia</label>
                            <input type="date" name="vencimiento_licencia" className="dfm-input" value={formData.vencimiento_licencia} onChange={handleChange} />
                        </div>
                        <FileControl label="Archivo Licencia" inputName="archivo_licencia" currentUrl={driverToEdit?.url_licencia} />
                    </div>

                    <div className="dfm-row-doc">
                        <div className="dfm-group">
                            <label>Venc. Psicofísico</label>
                            <input type="date" name="vencimiento_psicofisico" className="dfm-input" value={formData.vencimiento_psicofisico} onChange={handleChange} />
                        </div>
                        <FileControl label="Archivo Psicofísico" inputName="archivo_psicofisico" currentUrl={driverToEdit?.url_psicofisico} />
                    </div>

                    <div className="dfm-row-doc">
                        <div className="dfm-group">
                            <label>Venc. Carga Gral.</label>
                            <input type="date" name="vencimiento_carga_normal" className="dfm-input" value={formData.vencimiento_carga_normal} onChange={handleChange} />
                        </div>
                        <FileControl label="Cert. Carga Gral." inputName="archivo_curso_carga_normal" currentUrl={driverToEdit?.url_curso_carga_normal} />
                    </div>

                    <div className="dfm-row-doc">
                        <div className="dfm-group">
                            <label>Venc. Carga Peligrosa</label>
                            <input type="date" name="vencimiento_carga_peligrosa" className="dfm-input" value={formData.vencimiento_carga_peligrosa} onChange={handleChange} />
                        </div>
                        <FileControl label="Cert. Carga Peligrosa" inputName="archivo_curso_carga_peligrosa" currentUrl={driverToEdit?.url_curso_carga_peligrosa} />
                    </div>

                    <h4 className="dfm-section-title">Notas y Observaciones</h4>
                    <div className="dfm-group">
                        <label>Notas</label>
                        <textarea
                            name="notas"
                            className="dfm-textarea"
                            value={formData.notas}
                            onChange={handleChange}
                            placeholder="Ingresa notas o observaciones sobre el chofer"
                            maxLength="1000"
                            rows="4"
                        />
                    </div>

                    {isSaving && (
                      <div className="dfm-saving-indicator">
                        <div className="dfm-spinner"></div>
                        <span>
                          {driverToEdit ? 'Actualizando chofer…' : 'Creando chofer…'}
                        </span>
                      </div>
                    )}

                    <div className="dfm-actions">
                        <button type="button" onClick={onClose} className="dfm-btn-cancel" disabled={isSaving}>Cancelar</button>
                        <button
                          type="submit"
                          className="dfm-btn-save"
                          disabled={isSaving}
                        >
                          {isSaving ? 'Guardando…' : driverToEdit ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>    
            </div>
        </div>
    );
};
export default DriverFormModal;
