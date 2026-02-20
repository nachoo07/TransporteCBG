import React, { useState, useEffect } from 'react';
import './coupledFormModal.css';

const CoupledFormModal = ({isOpen, onClose, onSubmit, coupledToEdit }) => {

      const formatDateForInput = (isoString) => isoString ? isoString.split('T')[0] : '';

            const initialFormState = {
                Dominio_acoplado: '',

                vencimiento_vtv_acoplado: '',
                vencimiento_cedula_acoplado: '',
                vencimiento_senasa_acoplado: '',
                vencimiento_homologacion_acoplado: '',
                vencimiento_tipificacion_carga_acoplado: ''
            };

      const [formData, setFormData] = useState(initialFormState);
      const [files, setFiles] = useState({});
      const [filesToDelete, setFilesToDelete] = useState({});

      useEffect(() => {
              if (isOpen) {
                  setFilesToDelete({}); 
                  setFiles({}); 
                  
                  if (coupledToEdit) {
                      setFormData({
                          Dominio_acoplado: coupledToEdit.Dominio_acoplado || '',

                          vencimiento_cedula_acoplado: formatDateForInput(coupledToEdit.vencimiento_cedula_acoplado),
                          vencimiento_vtv_acoplado: formatDateForInput(coupledToEdit.vencimiento_vtv_acoplado),
                          vencimiento_senasa_acoplado: formatDateForInput(coupledToEdit.vencimiento_senasa_acoplado),
                          vencimiento_tipificacion_carga_acoplado: formatDateForInput(coupledToEdit.vencimiento_tipificacion_carga_acoplado),
                          vencimiento_homologacion_acoplado: formatDateForInput(coupledToEdit.vencimiento_homologacion_acoplado),
                      });
                  } else {
                      setFormData(initialFormState);
                  }
              }
          }, [isOpen, coupledToEdit]);
            
          if (!isOpen) return null;

          const handleChange = (e) => {
              const { name, value } = e.target;
              setFormData(prev => ({ ...prev, [name]: value }));
    };

     // --- MANEJO DE ARCHIVOS (Igual que en Choferes) ---

    const handleFileSelect = (name, e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(prev => ({ ...prev, [name]: e.target.files[0] }));
            setFilesToDelete(prev => ({ ...prev, [name]: false }));
        }
    };

    const handleMarkDelete = (name) => {
        setFilesToDelete(prev => ({ ...prev, [name]: true }));
        setFiles(prev => {
            const copy = { ...prev };
            delete copy[name]; 
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
            if (formData[key] !== null && formData[key] !== undefined) dataToSend.append(key, formData[key]);
        });

        // Archivos Nuevos
        Object.keys(files).forEach(key => {
            if (files[key]) dataToSend.append(key, files[key]);
        });

        // Banderas de Eliminación (coinciden con los nombres _acoplado que usa el backend)
        if (filesToDelete['url_cedula_acoplado']) dataToSend.append('eliminar_cedula', 'true');
        if (filesToDelete['url_vtv_acoplado']) dataToSend.append('eliminar_vtv', 'true');
        if (filesToDelete['url_titulo_acoplado']) dataToSend.append('eliminar_titulo', 'true');
        if (filesToDelete['url_senasa_acoplado']) dataToSend.append('eliminar_senasa', 'true');
        if (filesToDelete['url_tipificacion_carga_acoplado']) dataToSend.append('eliminar_tipificacion', 'true');
        if (filesToDelete['url_homologacion_acoplado']) dataToSend.append('eliminar_homologacion', 'true');

        onSubmit(dataToSend);
    };

        // --- COMPONENTE DRAG & DROP DE ARCHIVO (igual que en DriverFormModal, pero con clases cfm-) ---
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
                    className={`cfm-dropzone${isActive ? ' cfm-dropzone-active' : ''}`}
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
            <div className="cfm-group">
                <label>{label}</label>

                {/* ESTADO 1: Hay un archivo actual cargado */}
                {hasCurrent && !newFile && (
                    <div className="cfm-file-card-existing">
                        <div className="cfm-file-info">
                            <span className="cfm-icon">📄</span>
                            <span>Archivo Cargado</span>
                        </div>
                        <div className="cfm-file-actions">
                            <button type="button" onClick={() => window.open(currentUrl, '_blank')} className="cfm-btn-mini view" title="Ver">👁️</button>
                            <label htmlFor={`file-${inputName}`} className="cfm-btn-mini replace" title="Cambiar">🔄</label>
                            <button type="button" onClick={() => handleMarkDelete(inputName)} className="cfm-btn-mini delete" title="Eliminar">🗑️</button>
                        </div>
                    </div>
                )}

                {/* ESTADO 2: Se marcó para eliminar */}
                {isDeleted && !newFile && (
                    <div className="cfm-file-card-deleted">
                        <span>🗑️ Se eliminará este archivo.</span>
                        <button type="button" onClick={() => handleUndoDelete(inputName)} className="cfm-link-btn">Deshacer</button>
                    </div>
                )}

                {/* ESTADO 3: Se seleccionó un archivo nuevo */}
                {newFile && (
                    <div className="cfm-file-card-new">
                        <span className="cfm-success-text">✨ Nuevo: {newFile.name}</span>
                        <button type="button" onClick={() => setFiles(prev => { const c = { ...prev }; delete c[inputName]; return c; })} className="cfm-close-btn">×</button>
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
        <div className="cfm-overlay">
            <div className="cfm-content">
                <div className="cfm-header">
                    <h2>{coupledToEdit ? `Editar Acoplado ${coupledToEdit.Dominio_acoplado}` : 'Nuevo Acoplado'}</h2>
                    <button onClick={onClose} className="cfm-close">&times;</button>
                </div>
                <div className="cfm-body">

                
                <form onSubmit={handleSubmit}>
                    
                    {/* DOMINIO (PATENTE) */}
                    <h4 className="cfm-section-title">Datos del Vehículo</h4>
                    <div className="cfm-row">
                        <div className="cfm-group">
                            <label>Dominio (Patente) *</label>
                            <input 
                                type="text" 
                                name="Dominio_acoplado" 
                                className="cfm-input patent-input" 
                                placeholder="AA 123 BB"
                                value={formData.Dominio_acoplado} 
                                onChange={(e) => setFormData({...formData, Dominio_acoplado: e.target.value.toUpperCase()})} 
                                required 
                            />
                        </div>
                    </div>

                    <h4 className="cfm-section-title">Documentación Obligatoria</h4>

                    {/* CÉDULA + TÍTULO */}
                    <div className="cfm-row">
                        <div className="cfm-group">
                            <label>Venc. Cédula *</label>
                            <input type="date" name="vencimiento_cedula_acoplado" className="cfm-input" value={formData.vencimiento_cedula_acoplado} onChange={handleChange} />
                        </div>
                        <FileControl label="Foto Cédula" inputName="url_cedula_acoplado" currentUrl={coupledToEdit?.url_cedula_acoplado} />
                    </div>
                    
                    {/* VTV */}
                    <div className="cfm-row">
                        <div className="cfm-group">
                            <label>Venc. VTV</label>
                            <input type="date" name="vencimiento_vtv_acoplado" className="cfm-input" value={formData.vencimiento_vtv_acoplado} onChange={handleChange} />
                        </div>
                        <FileControl label="Certificado VTV" inputName="url_vtv_acoplado" currentUrl={coupledToEdit?.url_vtv_acoplado} />
                    </div>

                       {/* TÍTULO (Solo archivo, no suele vencer) */}
                    <div className="cfm-row single-col">
                        <FileControl label="Título del Automotor" inputName="url_titulo_acoplado" currentUrl={coupledToEdit?.url_titulo_acoplado} />
                    </div>

                    <h4 className="cfm-section-title">Habilitaciones y Cargas</h4>

                    {/* RUTA / SENASA */}
                    <div className="cfm-row">
                        <div className="cfm-group">
                            <label>Venc. SENASA/Ruta</label>
                            <input type="date" name="vencimiento_senasa_acoplado" className="cfm-input" value={formData.vencimiento_senasa_acoplado} onChange={handleChange} />
                        </div>
                        <FileControl label="Certificado SENASA/Ruta" inputName="url_senasa_acoplado" currentUrl={coupledToEdit?.url_senasa_acoplado} />
                    </div>

                    {/* TIPIFICACIÓN */}
                    <div className="cfm-row">
                        <div className="cfm-group">
                            <label>Venc. Tipificación</label>
                            <input type="date" name="vencimiento_tipificacion_carga_acoplado" className="cfm-input" value={formData.vencimiento_tipificacion_carga_acoplado} onChange={handleChange} />
                        </div>
                        <FileControl label="Doc. Tipificación" inputName="url_tipificacion_carga_acoplado" currentUrl={coupledToEdit?.url_tipificacion_carga_acoplado} />
                    </div>

                    {/* HOMOLOGACIÓN */}
                    <div className="cfm-row">
                        <div className="cfm-group">
                            <label>Venc. Homologación</label>
                            <input type="date" name="vencimiento_homologacion_acoplado" className="cfm-input" value={formData.vencimiento_homologacion_acoplado} onChange={handleChange} />
                        </div>
                        <FileControl label="Doc. Homologación" inputName="url_homologacion_acoplado" currentUrl={coupledToEdit?.url_homologacion_acoplado} />
                    </div>

                    <div className="cfm-actions">
                        <button type="button" onClick={onClose} className="cfm-btn-cancel">Cancelar</button>
                        <button type="submit" className="cfm-btn-save">{coupledToEdit ? 'Actualizar Acoplado' : 'Guardar Acoplado'}</button>
                    </div>
                </form>
                </div>
            </div>
        </div>
    );
};

export default CoupledFormModal
