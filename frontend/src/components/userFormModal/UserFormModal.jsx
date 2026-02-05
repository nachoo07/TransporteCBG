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
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{userToEdit ? 'Editar Administrador' : 'Nuevo Administrador'}</h2>
                    <button onClick={onClose} className="btn-close-x">&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nombre:</label>
                        <input
                            type="text"
                            name="nombre"
                            className="form-input"
                            value={formData.nombre}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Apellido:</label>
                        <input
                            type="text"
                            name="apellido"
                            className="form-input"
                            value={formData.apellido}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Usuario:</label>
                        <input
                            type="text"
                            name="email"
                            className="form-input"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="ej: nachoadmin"
                            required
                        />
                        <small className="input-help">
                            Solo letras, números y guión bajo.
                        </small>
                    </div>
                    <div>
                        <label>Estado:</label>
                        <select
                            name="activo"
                            className="form-input"
                            value={formData.activo ? "true" : "false"}
                            onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.value === 'true' }))}
                        >
                            <option value="true">Activo</option>
                            <option value="false">Inactivo</option>
                        </select>
                    </div>

                    {!userToEdit && (
                        <div className="form-group">
                            <label>Contraseña:</label>
                            <input
                                type="password"
                                name="password"
                                className="form-input"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            <small id="passwordHelp" className="input-help">
                                La contraseña debe tener al menos 8 caracteres, incluir una letra mayúscula, una minúscula y un número.
                            </small>
                        </div>
                    )}

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