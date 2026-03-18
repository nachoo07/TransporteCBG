import React, { useState } from 'react';
import './company.css';

const CompanyFormModal = ({ isOpen, onClose, onSubmit, companyToEdit }) => {
  const [formData, setFormData] = useState(
    companyToEdit || { nombre: '', tipo_cobro: '' }
  );
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (companyToEdit) {
      setFormData({
        nombre: companyToEdit.nombre ?? '',
        tipo_cobro: companyToEdit.tipo_cobro ?? ''
      });
    } else {
      setFormData({ nombre: '', tipo_cobro: '' });
    }
    setErrors({});
  }, [companyToEdit, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre || formData.nombre.trim() === '') {
      newErrors.nombre = 'El nombre es requerido';
    }
    if (!formData.tipo_cobro) {
      newErrors.tipo_cobro = 'El tipo de cobro es requerido';
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        nombre: formData.nombre,
        tipo_cobro: formData.tipo_cobro
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="company-modal-overlay" onClick={onClose}>
      <div className="company-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="company-modal-header">
          <h2>{companyToEdit ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
          <button onClick={onClose} className="company-modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="company-form">
          {/* Nombre */}
          <div className="company-form-group">
            <label htmlFor="name">Nombre de la Empresa</label>
            <input
              type="text"
              id="name"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Transportes ABC"
              className={errors.nombre ? 'company-input error' : 'company-input'}
              style={{ textTransform: 'capitalize' }}
            />
            {errors.nombre && <span className="company-error-msg">{errors.nombre}</span>}
          </div>

          {/* Tipo de Cobro */}
          <div className="company-form-group">
            <label htmlFor="tipo_cobro">Tipo de Cobro</label>
            <select
              id="tipo_cobro"
              name="tipo_cobro"
              value={formData.tipo_cobro}
              onChange={handleChange}
              className={errors.tipo_cobro ? 'company-select error' : 'company-select'}
            >
              <option value="" disabled>Seleccionar...</option>
              <option value="TARIFA">Tarifa por TN/KG</option>
              <option value="FIJO">Precio Fijo</option>
            </select>
            <p className="company-help-text">
              {formData.tipo_cobro === 'TARIFA'
                ? 'Esta empresa paga según tarifa por tonelada/kilogramo'
                : formData.tipo_cobro === 'FIJO'
                  ? 'Esta empresa paga un precio fijo por viaje'
                  : 'Selecciona un tipo de cobro'}
            </p>
            {errors.tipo_cobro && <span className="company-error-msg">{errors.tipo_cobro}</span>}
          </div>

          {/* Botones */}
          <div className="company-form-buttons">
            <button
              type="button"
              onClick={onClose}
              className="company-btn company-btn-secondary"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="company-btn company-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : companyToEdit ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyFormModal;
