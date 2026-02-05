import React, { useState, useEffect } from 'react';
import { useTravel } from '../../context/travel/TravelContext';
import { useDriver } from '../../context/driver/DriverContext';
import { useChasis } from '../../context/chasis/ChasisContext';
import { useCoupled } from '../../context/coupled/CoupledContext';
import { useCompany } from '../../context/company/CompanyContext';
import './travelFormModal.css';

const TravelFormModal = ({ isOpen, onClose, travel = null }) => {
  const { createTravel, updateTravel } = useTravel();
  
  // Consumimos los contextos
  const { drivers, getDrivers } = useDriver();
  const { chasis, getChasis } = useChasis();
  const { coupled, getCoupled } = useCoupled();
  const { companies, getCompanies } = useCompany();

  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);

    const [formData, setFormData] = useState({
    // fecha_viaje
    travel_date: '',
    // Foreign Keys
    driver_id: '',
    chassis_id: '',
    coupled_id: '',
    company_id: '',
    // Ruta y logística (nombres esperados por backend/Joi)
    origin: '',
    destination: '',
    quantity_loaded: '',
    quantity_unloaded: '',
    // Documentación
    receipt_number: '',
    route_sheet: '',
    proforma_number: '',
    special_notes: '',
    // Tarifa y valores
    tariff_value: '',
    net_value: '',
    iva_value: '',
    fixed_price: '',
    // Facturacion del viaje
    invoice_number: '',
    // Adelantos
    advance_amount: '',
    advance_method: '',
    advance_responsible: '',
    // Combustible
    fuel_station: '',
    fuel_liters: '',
    fuel_amount: '',
    fuel_km: '',
    // Estados
    liquidation_status: 'FALTA',
    invoice_status: 'FALTA',
    payment_status: 'DEBEN',
    payment_order: '',
    general_status: 'INCOMPLETO',
    });

  // --- 1. CARGA DE DATOS AL ABRIR EL MODAL ---
  useEffect(() => {
    if (isOpen) {
      setDataLoading(true);
      
      // Forzamos la recarga de datos para asegurar que estén frescos
      Promise.all([
        getDrivers(),
        getChasis(),
        getCoupled(),
        getCompanies()
      ])
      .then()
      .catch((err) => console.error("Error cargando datos auxiliares", err))
      .finally(() => setDataLoading(false));

      // Si es edición, llenamos el formulario
      if (travel) {
        // Normalizar fecha: extraer solo YYYY-MM-DD
        const travelDate = travel.fecha_viaje 
          ? travel.fecha_viaje.match(/^(\d{4})-(\d{2})-(\d{2})/)?.[0] || travel.fecha_viaje.split('T')[0]
          : '';
        
        setFormData({
          travel_date: travelDate,
          driver_id: travel.chofer_id || '',
          company_id: travel.empresa_id || '',
          chassis_id: travel.chasis_id || '',
          coupled_id: travel.acoplado_id || '',
          origin: travel.origen || '',
          destination: travel.destino || '',
          quantity_loaded: travel.cantidad_cargada || '',
          quantity_unloaded: travel.cantidad_descargada || '',
          receipt_number: travel.remito || '',
          route_sheet: travel.hoja_ruta || '',
          proforma_number: travel.numero_proforma || '',
          invoice_number: travel.numero_factura || '',
          tariff_value: travel.tarifa_valor || '',
          net_value: travel.valor_neto || '',
          iva_value: travel.valor_iva || '',
          fixed_price: travel.precio_fijo || '',
          advance_amount: travel.adelanto_monto || '',
          advance_method: travel.adelanto_metodo || '',
          advance_responsible: travel.adelanto_responsable || '',
          fuel_station: travel.estacion_nombre || '',
          fuel_liters: travel.combustible_litros || '',
          fuel_amount: travel.combustible_monto || '',
          fuel_km: travel.combustible_km || '',
          liquidation_status: travel.estado_liquidacion || 'FALTA',
          invoice_status: travel.estado_facturacion || 'FALTA',
          payment_status: travel.estado_pago || 'DEBEN',
          payment_order: travel.orden_pago || '',
          general_status: travel.estado_general || 'INCOMPLETO',
          special_notes: travel.especiales || ''
        });
        
        if (travel.foto_factura) {
          setPreviewUrl(travel.foto_factura);
        }
      } else {
        // CORRECCIÓN: Obtener fecha local en formato YYYY-MM-DD
        const today = new Date();
        const localISODate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000))
          .toISOString()
          .split('T')[0];

        setFormData(prev => ({
            ...prev,
            travel_date: localISODate, // Usamos la fecha local corregida
            driver_id: '',
            company_id: '',
            chassis_id: '',
            coupled_id: ''
        }));
      }
    }
  }, [isOpen, travel, getDrivers, getChasis, getCoupled, getCompanies]);

  // --- CÁLCULOS AUTOMÁTICOS DE TARIFA ---
  useEffect(() => {
    if (selectedCompany?.tipo_cobro === 'TARIFA') {
      const descarga = parseFloat(formData.quantity_unloaded) || 0;
      const tarifa = parseFloat(formData.tariff_value) || 0;

      if (descarga > 0 && tarifa > 0) {
        const neto = descarga * tarifa;
        const iva = neto * 0.21;
        setFormData(prev => ({
          ...prev,
          net_value: neto.toFixed(2),
          iva_value: iva.toFixed(2)
        }));
      }
    }
  }, [formData.quantity_unloaded, formData.tariff_value, selectedCompany]);

  // Detectar empresa seleccionada para lógica de UI
  useEffect(() => {
    if (formData.company_id && companies.length > 0) {
      const company = companies.find(c => String(c.id) === String(formData.company_id));
      setSelectedCompany(company);
    } else {
      setSelectedCompany(null);
    }
  }, [formData.company_id, companies]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Normalizar fecha: si viene como ISO, extraer solo YYYY-MM-DD
    let finalValue = value;
    if (name === 'travel_date' && value) {
      // Extraer solo YYYY-MM-DD del string (funciona con "2026-01-14" o "2026-01-14T00:00:00.000Z")
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        finalValue = `${match[1]}-${match[2]}-${match[3]}`;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInvoiceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '' && formData[key] !== null) {
          formDataToSend.append(key, formData[key]);
        }
      });
      if (invoiceFile) {
        formDataToSend.append('invoice_photo', invoiceFile);
      }

      let success;
      if (travel) {
        success = await updateTravel(travel.id, formDataToSend);
      } else {
        success = await createTravel(formDataToSend);
      }

      if (success) handleClose();
    } catch (error) {
      console.error('Error al guardar viaje:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInvoiceFile(null);
    setPreviewUrl(null);
    setActiveTab('basic');
    setSelectedCompany(null);
    onClose();
  };

  if (!isOpen) return null;

  const isTarifa = selectedCompany?.tipo_cobro === 'TARIFA';
  const isFijo = selectedCompany?.tipo_cobro === 'FIJO';

  return (
    <div className="travel-modal-overlay" onClick={handleClose}>
      <div className="travel-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="travel-modal-header">
          <h2>{travel ? 'Editar Viaje' : 'Nuevo Viaje'}</h2>
          <button className="travel-modal-close" onClick={handleClose}>✕</button>
        </div>

        <div className="travel-modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            📋 Básico
          </button>
          <button 
            className={`tab-btn ${activeTab === 'logistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('logistics')}
          >
            🚛 Logística
          </button>
          <button 
            className={`tab-btn ${activeTab === 'documentation' ? 'active' : ''}`}
            onClick={() => setActiveTab('documentation')}
          >
            📄 Documentación
          </button>
          <button 
            className={`tab-btn ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            💰 Facturación
          </button>
          <button 
            className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            💵 Pagos
          </button>
          <button 
            className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            📊 Estados
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="travel-modal-body">
            
            {dataLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="modal-spinner"></div>
                <p>Cargando datos...</p>
              </div>
            ) : (
              <>
                {/* TAB: BÁSICO */}
                {activeTab === 'basic' && (
                  <div className="tab-content">
                    <div className="form-section">
                      <h3>Información General</h3>
                  
                      <div className="form-group">
                        <label htmlFor="travel_date">Fecha del Viaje *</label>
                        <input
                          type="date"
                          id="travel_date"
                          name="travel_date"
                          value={formData.travel_date}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="company_id">Empresa *</label>
                        <select
                          id="company_id"
                          name="company_id"
                          value={formData.company_id}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Seleccione una empresa</option>
                          {companies.filter(c => c.activo).map(company => (
                            <option key={company.id} value={company.id}>
                              {company.nombre} ({company.tipo_cobro})
                            </option>
                          ))}
                        </select>
                        {selectedCompany && (
                          <small className="form-help">
                            Tipo de cobro: <strong>{selectedCompany.tipo_cobro}</strong>
                          </small>
                        )}
                      </div>

                      {/* Chofer */}
                  <div className="form-group">
                    <label htmlFor="driver_id">Chofer *</label>
                    <select id="driver_id" name="driver_id" value={formData.driver_id} onChange={handleChange} required>
                      <option value="">Seleccione un chofer</option>
                      {/* 🔥 OJO: He quitado el filtro de 'COMPLETO' para que puedas ver todos tus choferes de prueba */}
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.nombre} {driver.apellido} {driver.dni ? `- ${driver.dni}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                     <div className="form-row">
                    {/* Chasis */}
                    <div className="form-group">
                      <label htmlFor="chassis_id">Chasis *</label>
                      <select id="chassis_id" name="chassis_id" value={formData.chassis_id} onChange={handleChange} required>
                        <option value="">Seleccione un chasis</option>
                        {/* 🔥 Filtro relajado, solo verificamos existencia */}
                        {chasis.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.Dominio_chasis}
                          </option>
                        ))}
                      </select>
                    </div>

                      {/* Acoplado */}
                    <div className="form-group">
                      <label htmlFor="coupled_id">Acoplado</label>
                      <select id="coupled_id" name="coupled_id" value={formData.coupled_id} onChange={handleChange}>
                        <option value="">Seleccione un acoplado</option>
                        {coupled.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.Dominio_acoplado}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

                {/* TAB: LOGÍSTICA */}
                {activeTab === 'logistics' && (
                  <div className="tab-content">
                    <div className="form-section">
                      <h3>Información de Ruta</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="origin">Origen</label>
                      <input
                        type="text"
                        id="origin"
                        name="origin"
                        value={formData.origin}
                        onChange={handleChange}
                        placeholder="Ciudad/Lugar de origen"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="destination">Destino</label>
                      <input
                        type="text"
                        id="destination"
                        name="destination"
                        value={formData.destination}
                        onChange={handleChange}
                        placeholder="Ciudad/Lugar de destino"
                        required
                      />
                    </div>
                  </div>

                  <h3>Carga</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="quantity_loaded">Cantidad Cargada (TN)</label>
                      <input
                        type="number"
                        id="quantity_loaded"
                        name="quantity_loaded"
                        value={formData.quantity_loaded}
                        onChange={handleChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="quantity_unloaded">Cantidad Descargada (TN)</label>
                      <input
                        type="number"
                        id="quantity_unloaded"
                        name="quantity_unloaded"
                        value={formData.quantity_unloaded}
                        onChange={handleChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

                {/* TAB: DOCUMENTACIÓN */}
                {activeTab === 'documentation' && (
                  <div className="tab-content">
                    <div className="form-section">
                      <h3>Documentos del Viaje</h3>
                  
                  <div className="form-group">
                    <label htmlFor="receipt_number">Remito</label>
                    <input
                      type="text"
                      id="receipt_number"
                      name="receipt_number"
                      value={formData.receipt_number}
                      onChange={handleChange}
                      placeholder="Número de remito"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="route_sheet">Hoja de Ruta</label>
                    <input
                      type="text"
                      id="route_sheet"
                      name="route_sheet"
                      value={formData.route_sheet}
                      onChange={handleChange}
                      placeholder="Número de hoja de ruta"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="proforma_number">Número de Proforma</label>
                    <input
                      type="text"
                      id="proforma_number"
                      name="proforma_number"
                      value={formData.proforma_number}
                      onChange={handleChange}
                      placeholder="Número de proforma"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="invoice_number">Número de Factura</label>
                    <input
                      type="text"
                      id="invoice_number"
                      name="invoice_number"
                      value={formData.invoice_number}
                      onChange={handleChange}
                      placeholder="0000-00000000"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="invoice_photo">Foto de Factura</label>
                    <input
                      type="file"
                      id="invoice_photo"
                      name="invoice_photo"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    {previewUrl && (
                      <div className="image-preview">
                        <img src={previewUrl} alt="Preview factura" />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="special_notes">Notas Especiales</label>
                    <textarea
                      id="special_notes"
                      name="special_notes"
                      value={formData.special_notes}
                      onChange={handleChange}
                      rows="4"
                      placeholder="Notas adicionales sobre el viaje..."
                    />
                  </div>
                </div>
              </div>
            )}

                {/* TAB: FACTURACIÓN */}
                {activeTab === 'billing' && (
                  <div className="tab-content">
                    <div className="form-section">
                      <h3>Valores de Facturación</h3>
                  
                  {!selectedCompany && (
                    <div className="alert-info">
                      ℹ️ Seleccione una empresa en la pestaña "Básico" para configurar la facturación
                    </div>
                  )}

                  {isTarifa && (
                    <>
                      <div className="alert-info">
                        📊 Empresa con cobro por <strong>TARIFA</strong>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="tariff_value">Valor de Tarifa *</label>
                        <input
                          type="number"
                          id="tariff_value"
                          name="tariff_value"
                          value={formData.tariff_value}
                          onChange={handleChange}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          required={isTarifa}
                        />
                        <small className="form-help">Tarifa por tonelada o kilómetro</small>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="net_value">Valor Neto *</label>
                          <input
                            type="number"
                            id="net_value"
                            name="net_value"
                            value={formData.net_value}
                            onChange={handleChange}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            required={isTarifa}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="iva_value">Valor IVA</label>
                          <input
                            type="number"
                            id="iva_value"
                            name="iva_value"
                            value={formData.iva_value}
                            onChange={handleChange}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {isFijo && (
                    <>
                      <div className="alert-info">
                        💵 Empresa con cobro <strong>FIJO</strong>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="fixed_price">Precio Fijo *</label>
                        <input
                          type="number"
                          id="fixed_price"
                          name="fixed_price"
                          value={formData.fixed_price}
                          onChange={handleChange}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          required={isFijo}
                        />
                        <small className="form-help">Precio acordado para el viaje completo</small>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

                {/* TAB: PAGOS */}
                {activeTab === 'payments' && (
                  <div className="tab-content">
                    <div className="form-section">
                      <h3>Adelantos</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="advance_amount">Monto del Adelanto</label>
                      <input
                        type="number"
                        id="advance_amount"
                        name="advance_amount"
                        value={formData.advance_amount}
                        onChange={handleChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="advance_method">Método de Pago</label>
                      <select
                        id="advance_method"
                        name="advance_method"
                        value={formData.advance_method}
                        onChange={handleChange}
                      >
                        <option value="">Seleccione método</option>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="advance_responsible">Responsable del Adelanto</label>
                    <input
                      type="text"
                      id="advance_responsible"
                      name="advance_responsible"
                      value={formData.advance_responsible}
                      onChange={handleChange}
                      placeholder="Nombre del responsable"
                    />
                  </div>

                  <h3>Combustible</h3>
                  
                  <div className="form-group">
                    <label htmlFor="fuel_station">Estación de Servicio</label>
                    <input
                      type="text"
                      id="fuel_station"
                      name="fuel_station"
                      value={formData.fuel_station}
                      onChange={handleChange}
                      placeholder="Nombre de la estación"
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="fuel_liters">Litros de Combustible</label>
                      <input
                        type="number"
                        id="fuel_liters"
                        name="fuel_liters"
                        value={formData.fuel_liters}
                        onChange={handleChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="fuel_amount">Monto Combustible</label>
                      <input
                        type="number"
                        id="fuel_amount"
                        name="fuel_amount"
                        value={formData.fuel_amount}
                        onChange={handleChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="fuel_km">KM al Cargar Combustible</label>
                    <input
                      type="number"
                      id="fuel_km"
                      name="fuel_km"
                      value={formData.fuel_km}
                      onChange={handleChange}
                      placeholder="Kilometraje"
                      min="0"
                      step="1"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="special_notes">Factura del combustible</label>
                    <input
                      type="text"
                      id="fuel_invoice"
                      name="fuel_invoice"
                      value={formData.fuel_invoice}
                      onChange={handleChange}
                      placeholder="Número de factura del combustible"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="special_notes">Combustible Gastado</label>
                    <input
                      type="text"
                      id="fuel_invoice"
                      name="fuel_invoice"
                      value={formData.fuel_invoice}
                      onChange={handleChange}
                      placeholder="Número de factura del combustible"
                    />
                  </div>

                </div>
              </div>
            )}

                {/* TAB: ESTADOS */}
                {activeTab === 'status' && (
                  <div className="tab-content">
                    <div className="form-section">
                      <h3>Estados del Viaje</h3>
                  
                  <div className="form-group">
                    <label htmlFor="payment_order">Orden de Pago</label>
                    <input
                      type="text"
                      id="payment_order"
                      name="payment_order"
                      value={formData.payment_order}
                      onChange={handleChange}
                      placeholder="Número de orden de pago"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="liquidation_status">Estado de Liquidación</label>
                      <select
                        id="liquidation_status"
                        name="liquidation_status"
                        value={formData.liquidation_status}
                        onChange={handleChange}
                      >
                        <option value="FALTA">Falta</option>
                        <option value="LIQUIDADO">Liquidado</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="invoice_status">Estado de Facturación</label>
                      <select
                        id="invoice_status"
                        name="invoice_status"
                        value={formData.invoice_status}
                        onChange={handleChange}
                      >
                        <option value="FALTA">Falta</option>
                        <option value="FACTURADO">Facturado</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="payment_status">Estado de Pago</label>
                      <select
                        id="payment_status"
                        name="payment_status"
                        value={formData.payment_status}
                        onChange={handleChange}
                      >
                        <option value="DEBEN">Deben</option>
                        <option value="PAGADO">Pagado</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="general_status">Estado General</label>
                      <select
                        id="general_status"
                        name="general_status"
                        value={formData.general_status}
                        onChange={handleChange}
                      >
                        <option value="INCOMPLETO">Incompleto</option>
                        <option value="COMPLETO">Completo</option>
                      </select>
                    </div>
                  </div>

                  <div className="alert-info">
                    ℹ️ El estado general se actualiza automáticamente según el progreso de liquidación, facturación y pago
                  </div>
                </div>
              </div>
            )}
              </>
            )}
            
          </div>

          <div className="travel-modal-footer">
            <button type="button" onClick={handleClose} className="btn-cancel" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Guardando...' : (travel ? 'Actualizar' : 'Crear Viaje')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TravelFormModal;
