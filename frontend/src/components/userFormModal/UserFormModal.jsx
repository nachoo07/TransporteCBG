import React, { useState, useEffect } from 'react';
import '../userFormModal/userFormModal.css';
import { showErrorAlert } from '../../utils/alerts/Alerts';

const UserFormModal = ({ isOpen, onClose, onSubmit, userToEdit }) => {
    // Estado inicial del formulario
    const initialFormState = {
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        activo: true
    };

    const [formData, setFormData] = useState(initialFormState);

    // EFECTO: Detectar si estamos editando o creando
    useEffect(() => {
        if (isOpen) {
            if (userToEdit) {
                const isActive = userToEdit.activo === 1 || userToEdit.activo === true;

                setFormData({
                    nombre: userToEdit.nombre || '',
                    apellido: userToEdit.apellido || '',
                    email: userToEdit.email || '',
                    password: '', 
                    activo: isActive // Guardamos true o false puro
                });
            } else {
                setFormData(initialFormState);
            }
        }
    }, [isOpen, userToEdit]);

    // Si no está abierto, no renderizamos nada (null)
    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSend = { ...formData };
        if (userToEdit && !dataToSend.password) {
            delete dataToSend.password; 
        }
        if (!dataToSend.nombre || String(dataToSend.nombre).trim().length < 2) {
            return showErrorAlert('Error', 'El nombre debe tener al menos 2 caracteres.');
        }
        if (!dataToSend.apellido || String(dataToSend.apellido).trim().length < 2) {
            return showErrorAlert('Error', 'El apellido debe tener al menos 2 caracteres.');
        }
        if (!userToEdit) {
            const pwd = dataToSend.password || '';
            const pwValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/.test(pwd);
            if (!pwValid) {
                return showErrorAlert('Error', 'La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula y un número.');
            }
        }
        dataToSend.activo = Boolean(dataToSend.activo);

        onSubmit(dataToSend);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="user-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header user-modal-header">
                    <div className="user-modal-header-copy">
                        <h2>{userToEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                    </div>
                    <button onClick={onClose} className="btn-close-x">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="user-form-layout">
                    <div className="user-form-body">
                        <div className="user-form-section">
                            <div className="user-form-section-title">Datos personales</div>
                            <div className="user-form-row">
                                <div className="form-group-user">
                                    <label>Nombre</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        className="form-input"
                                        value={formData.nombre}
                                        onChange={handleChange}
                                        placeholder="Nombre"
                                        required
                                    />
                                </div>

                                <div className="form-group-user">
                                    <label>Apellido</label>
                                    <input
                                        type="text"
                                        name="apellido"
                                        className="form-input"
                                        value={formData.apellido}
                                        onChange={handleChange}
                                        placeholder="Apellido"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="user-form-section">
                            <div className="user-form-section-title">Acceso</div>
                            <div className={`user-form-row ${userToEdit ? 'user-form-row-edit' : 'user-form-row-create'}`}>
                                <div className="form-group-user">
                                    <label>Usuario</label>
                                    <input
                                        type="text"
                                        name="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Usuario"
                                        required
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        style={{ textTransform: 'none' }}
                                    />
                                    <small className="input-help">
                                        Solo letras, numeros y guion bajo.
                                    </small>
                                </div>

                                {!userToEdit ? (
                                    <div className="form-group-user">
                                        <label>Contraseña</label>
                                        <input
                                            type="password"
                                            name="password"
                                            className="form-input"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Contraseña"
                                            required
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                            spellCheck={false}
                                            style={{ textTransform: 'none' }}
                                        />
                                        <small id="passwordHelp" className="input-help">
                                            Debe incluir mayuscula, minuscula y numero.
                                        </small>
                                    </div>
                                ) : (
                                    <div className="form-group-user">
                                        <label>Estado</label>
                                        <select
                                            name="activo"
                                            className="form-input"
                                            value={formData.activo ? 'true' : 'false'}
                                            onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.value === 'true' }))}
                                        >
                                            <option value="true">Activo</option>
                                            <option value="false">Inactivo</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">
                            Cancelar
                        </button>
                        <button type="submit" className="btn-save">
                            {userToEdit ? 'Actualizar' : 'Guardar Admin'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserFormModal;
