import React, { useState, useEffect, useMemo } from 'react';
import { useTravel } from '../../context/travel/TravelContext';
import { useDriver } from '../../context/driver/DriverContext';
import { useChasis } from '../../context/chasis/ChasisContext';
import { useCoupled } from '../../context/coupled/CoupledContext';
import { useCompany } from '../../context/company/CompanyContext';
import Swal from 'sweetalert2';
import { showConfirmAlert, showErrorAlert } from '../../utils/alerts/Alerts';
import { getErrorMsg } from '../../utils/helperError/ErrorMsg';
import './travelFormModal.css';

const DECIMAL_INPUT_FIELDS = new Set([
  'quantity_loaded',
  'quantity_unloaded',
  'tariff_value',
  'net_value',
  'iva_value',
  'fixed_price',
  'advance_amount',
  'fuel_liters',
  'fuel_amount',
  'fuel_km',
  'fuel_km_end',
  'fuel_return_liters',
  'fuel_return_amount',
  'fuel_return_km',
  'fuel_return_km_end',
]);

const INTEGER_INPUT_FIELDS = new Set([]);
const NUMERIC_FIELDS = new Set([...DECIMAL_INPUT_FIELDS, ...INTEGER_INPUT_FIELDS]);
const CAMEL_CASE_FIELDS = new Set([
  'origin',
  'destination',
  'fuel_station',
  'fuel_return_station',
  'special_notes',
  'advance_responsible',
]);
const AUTO_DERIVED_STATUS_FIELDS = new Set([
  'invoice_status',
  'liquidation_status',
  'general_status',
]);

const sanitizeIntegerInput = (value) => String(value ?? '').replace(/[^\d]/g, '');

const parseLooseNumber = (value) => {
  if (value === null || value === undefined || value === '') return Number.NaN;
  if (typeof value === 'number') return value;
  let raw = String(value).trim();
  if (!raw) return Number.NaN;
  raw = raw.replace(/\s+/g, '');

  if (raw.includes(',') && raw.includes('.')) {
    if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
      raw = raw.replace(/\./g, '').replace(',', '.');
    } else {
      raw = raw.replace(/,/g, '');
    }
  } else if (raw.includes('.') && /^\d{1,3}(\.\d{3})+$/.test(raw)) {
    raw = raw.replace(/\./g, '');
  } else if (raw.includes(',')) {
    raw = raw.replace(',', '.');
  }

  const parsed = Number(raw);
  if (!Number.isNaN(parsed)) return parsed;

  const digits = raw.replace(/[^\d]/g, '');
  return digits ? Number(digits) : Number.NaN;
};

const formatIntegerInput = (value) => {
  const parsed = parseLooseNumber(value);
  if (Number.isNaN(parsed)) return '';
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(parsed));
};

const formatDecimalInput = (value, { maxDecimals = 3 } = {}) => {
  const parsed = parseLooseNumber(value);
  if (Number.isNaN(parsed)) return '';
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(parsed);
};

const formatEditableNumber = (value, { maxDecimals = 3 } = {}) => {
  const parsed = parseLooseNumber(value);
  if (Number.isNaN(parsed)) return '';
  const fixed = Number(parsed.toFixed(maxDecimals));
  return String(fixed).replace('.', ',');
};

const sanitizeDecimalInput = (value) => {
  const raw = String(value ?? '').replace(/\s+/g, '').replace(/[^\d,.-]/g, '');
  if (!raw) return '';

  const unsigned = raw.replace(/-/g, '');
  const parts = unsigned.split(/[,.]/);
  const integerPart = (parts.shift() || '').replace(/[^\d]/g, '');
  const decimalPart = parts.join('').replace(/[^\d]/g, '');
  const hasTrailingSeparator = /[,.]$/.test(unsigned);

  if (!integerPart && !decimalPart) return '';
  if (!decimalPart && !hasTrailingSeparator) return integerPart;
  if (hasTrailingSeparator && !decimalPart) return `${integerPart},`;
  return `${integerPart},${decimalPart.slice(0, 3)}`;
};

const normalizeToApiNumberString = (value) => {
  const raw = String(value ?? '').trim();
  if (raw.length === 0) return '';

  const normalized = raw.replace(/[^\d]/g, '');
  if (normalized === '') return '';
  const asNumber = Number(normalized);
  if (Number.isNaN(asNumber)) return '';
  return String(Math.round(asNumber));
};

const normalizeToApiDecimalString = (value) => {
  const parsed = parseLooseNumber(value);
  if (Number.isNaN(parsed)) return '';
  return String(parsed);
};

const parseEsNumber = (value) => {
  return parseLooseNumber(value);
};

const formatTripDate = (value) => {
  const raw = String(value || '');
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : (raw || '-');
};

const REQUIRED_FIELDS = [
  { key: 'travel_date', label: 'Fecha del viaje', tab: 'basic' },
  { key: 'company_id', label: 'Empresa', tab: 'basic' },
  { key: 'driver_id', label: 'Chofer', tab: 'basic' },
  { key: 'chassis_id', label: 'Chasis', tab: 'basic' },
  { key: 'origin', label: 'Origen', tab: 'logistics' },
  { key: 'destination', label: 'Destino', tab: 'logistics' },
];

const getRequiredTravelFields = ({ isTarifa, isFijo }) => {
  const fields = [...REQUIRED_FIELDS];
  if (isTarifa) {
    fields.push(
      { key: 'tariff_value', label: 'Valor de tarifa', tab: 'billing' },
      { key: 'net_value', label: 'Valor neto', tab: 'billing' },
    );
  }
  if (isFijo) {
    fields.push({ key: 'fixed_price', label: 'Precio fijo', tab: 'billing' });
  }
  return fields;
};

const normalizeDateYmd = (value) => String(value || '').trim().slice(0, 10);
const getTodayLocalYmd = () => {
  const today = new Date();
  return new Date(today.getTime() - (today.getTimezoneOffset() * 60000))
    .toISOString()
    .split('T')[0];
};

const createEmptyFormData = () => ({
  travel_date: getTodayLocalYmd(),
  driver_id: '',
  chassis_id: '',
  coupled_id: '',
  company_id: '',
  origin: '',
  destination: '',
  quantity_loaded: '',
  quantity_unloaded: '',
  receipt_number: '',
  route_sheet: '',
  proforma_number: '',
  special_notes: '',
  tariff_value: '',
  net_value: '',
  iva_value: '',
  fixed_price: '',
  invoice_number: '',
  invoice_date: '',
  carta_de_porte: '',
  advance_amount: '',
  advance_method: '',
  advance_responsible: '',
  fuel_station: '',
  fuel_liters: '',
  fuel_amount: '',
  fuel_km: '',
  fuel_km_end: '',
  fuel_invoice: '',
  fuel_return_station: '',
  fuel_return_liters: '',
  fuel_return_amount: '',
  fuel_return_km: '',
  fuel_return_km_end: '',
  fuel_return_invoice: '',
  liquidation_status: 'FALTA',
  invoice_status: 'FALTA',
  payment_status: 'DEBEN',
  payment_order: '',
  general_status: 'INCOMPLETO',
});

const toCamelCaseWords = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/(^\w|\s+\w)/g, (match) => match.toUpperCase());

const travelHasInvoiceData = (trip) =>
  String(trip?.estado_facturacion || '').toUpperCase() === 'FACTURADO' ||
  String(trip?.numero_factura || '').trim().length > 0 ||
  String(trip?.fecha_facturada || '').trim().length > 0 ||
  String(trip?.foto_factura || '').trim().length > 0;

const travelHasLiquidationData = (trip) =>
  String(trip?.estado_liquidacion || '').toUpperCase() === 'LIQUIDADO' ||
  String(trip?.carta_de_porte || '').trim().length > 0 ||
  String(trip?.archivo_factura_liquidado || '').trim().length > 0;

const isTripBlockedForBulk = (trip, { applyInvoice, applyLiquidation }) =>
  (applyInvoice && travelHasInvoiceData(trip)) ||
  (applyLiquidation && travelHasLiquidationData(trip));

const TravelFormModal = ({ isOpen, onClose, travel = null }) => {
  const { createTravel, updateTravel, bulkUpdateTravelDocs, travels } = useTravel();

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
  const [liquidationFile, setLiquidationFile] = useState(null);
  const [liquidationPreviewUrl, setLiquidationPreviewUrl] = useState(null);
  const [fuelInvoicePhoto, setFuelInvoicePhoto] = useState(null);
  const [fuelInvoicePhotoUrl, setFuelInvoicePhotoUrl] = useState(null);
  const [fuelReturnInvoicePhoto, setFuelReturnInvoicePhoto] = useState(null);
  const [fuelReturnInvoicePhotoUrl, setFuelReturnInvoicePhotoUrl] = useState(null);
  const [deleteInvoicePhoto, setDeleteInvoicePhoto] = useState(false);
  const [deleteLiquidationFile, setDeleteLiquidationFile] = useState(false);
  const [deleteFuelInvoicePhoto, setDeleteFuelInvoicePhoto] = useState(false);
  const [deleteFuelReturnInvoicePhoto, setDeleteFuelReturnInvoicePhoto] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [multipleModeEnabled, setMultipleModeEnabled] = useState(false);
  const [selectedRelatedIds, setSelectedRelatedIds] = useState([]);

  const [formData, setFormData] = useState(createEmptyFormData);

  // --- 1. CARGA DE DATOS AL ABRIR EL MODAL ---
  useEffect(() => {
    if (isOpen) {
      setMultipleModeEnabled(false);
      setSelectedRelatedIds([]);
      setInvoiceFile(null);
      setPreviewUrl(null);
      setLiquidationFile(null);
      setLiquidationPreviewUrl(null);
      setFuelInvoicePhoto(null);
      setFuelInvoicePhotoUrl(null);
      setFuelReturnInvoicePhoto(null);
      setFuelReturnInvoicePhotoUrl(null);
      setDeleteInvoicePhoto(false);
      setDeleteLiquidationFile(false);
      setDeleteFuelInvoicePhoto(false);
      setDeleteFuelReturnInvoicePhoto(false);
      setDataLoading(true);

      // Forzamos la recarga de datos para asegurar que estén frescos
      Promise.all([
        getDrivers(),
        getChasis(),
        getCoupled(),
        getCompanies()
      ])
        .then()
        .catch((err) => {
          const msg = getErrorMsg(err, 'No se pudieron cargar los datos auxiliares del formulario');
          showErrorAlert('Error', msg);
        })
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
          quantity_loaded: formatEditableNumber(travel.cantidad_cargada),
          quantity_unloaded: formatEditableNumber(travel.cantidad_descargada),
          receipt_number: travel.remito || '',
          route_sheet: travel.hoja_ruta || '',
          proforma_number: travel.numero_proforma || '',
          invoice_number: travel.numero_factura || '',
          invoice_date: travel.fecha_facturada || '',
          carta_de_porte: travel.carta_de_porte || '',
          tariff_value: formatEditableNumber(travel.tarifa_valor),
          net_value: formatEditableNumber(travel.valor_neto, { maxDecimals: 2 }),
          iva_value: formatEditableNumber(travel.valor_iva, { maxDecimals: 2 }),
          fixed_price: formatEditableNumber(travel.precio_fijo),
          advance_amount: formatEditableNumber(travel.adelanto_monto),
          advance_method: travel.adelanto_metodo || '',
          advance_responsible: travel.adelanto_responsable || '',
          fuel_station: travel.estacion_nombre || '',
          fuel_liters: formatEditableNumber(travel.combustible_litros),
          fuel_amount: formatEditableNumber(travel.combustible_monto),
          fuel_km: formatEditableNumber(travel.combustible_km),
          fuel_km_end: formatEditableNumber(travel.combustible_km_fin),
          fuel_invoice: travel.factura_combustible || '',
          fuel_return_station: travel.estacion_nombre_vuelta || '',
          fuel_return_liters: formatEditableNumber(travel.combustible_litros_vuelta),
          fuel_return_amount: formatEditableNumber(travel.combustible_monto_vuelta),
          fuel_return_km: formatEditableNumber(travel.combustible_km_vuelta),
          fuel_return_km_end: formatEditableNumber(travel.combustible_km_fin_vuelta),
          fuel_return_invoice: travel.factura_combustible_vuelta || '',
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
        if (travel.archivo_factura_liquidado) {
          setLiquidationPreviewUrl(travel.archivo_factura_liquidado);
        }
        if (travel.foto_factura_combustible) setFuelInvoicePhotoUrl(travel.foto_factura_combustible);
        if (travel.foto_factura_combustible_vuelta) setFuelReturnInvoicePhotoUrl(travel.foto_factura_combustible_vuelta);
      } else {
        setFormData(createEmptyFormData());
      }
    }
  }, [isOpen, travel, getDrivers, getChasis, getCoupled, getCompanies]);

  const hasPaymentSignal = useMemo(
    () => String(formData.payment_order || '').trim().length > 0,
    [formData.payment_order],
  );

  const applyInvoiceInBulk = useMemo(() => {
    if (!travel) return false;
    const currentNumber = String(formData.invoice_number || '').trim();
    const originalNumber = String(travel.numero_factura || '').trim();
    const currentDate = normalizeDateYmd(formData.invoice_date);
    const originalDate = normalizeDateYmd(travel.fecha_facturada);

    const numberChanged = currentNumber.length > 0 && currentNumber !== originalNumber;
    const dateChanged = currentDate.length > 0 && currentDate !== originalDate;
    const fileChanged = Boolean(invoiceFile);
    return numberChanged || dateChanged || fileChanged;
  }, [travel, formData.invoice_number, formData.invoice_date, invoiceFile]);

  const applyLiquidationInBulk = useMemo(() => {
    if (!travel) return false;
    const currentCarta = String(formData.carta_de_porte || '').trim();
    const originalCarta = String(travel.carta_de_porte || '').trim();
    const cartaChanged = currentCarta.length > 0 && currentCarta !== originalCarta;
    const fileChanged = Boolean(liquidationFile);
    return cartaChanged || fileChanged;
  }, [travel, formData.carta_de_porte, liquidationFile]);

  useEffect(() => {
    const nextInvoiceStatus =
      String(formData.invoice_number || '').trim().length > 0 &&
      String(formData.invoice_date || '').trim().length > 0
        ? 'FACTURADO'
        : 'FALTA';
    const nextLiquidationStatus =
      String(formData.carta_de_porte || '').trim().length > 0
        ? 'LIQUIDADO'
        : 'FALTA';
    const nextPaymentStatus = hasPaymentSignal ? 'PAGADO' : 'DEBEN';
    const nextGeneralStatus =
      nextInvoiceStatus !== 'FALTA' &&
      nextLiquidationStatus !== 'FALTA' &&
      nextPaymentStatus !== 'DEBEN'
        ? 'COMPLETO'
        : 'INCOMPLETO';

    setFormData((prev) => {
      if (
        prev.invoice_status === nextInvoiceStatus &&
        prev.liquidation_status === nextLiquidationStatus &&
        prev.payment_status === nextPaymentStatus &&
        prev.general_status === nextGeneralStatus
      ) {
        return prev;
      }
      return {
        ...prev,
        invoice_status: nextInvoiceStatus,
        liquidation_status: nextLiquidationStatus,
        payment_status: nextPaymentStatus,
        general_status: nextGeneralStatus,
      };
    });
  }, [
    formData.invoice_number,
    formData.invoice_date,
    formData.carta_de_porte,
    hasPaymentSignal,
  ]);

  const relatedTravelCandidates = useMemo(() => {
    if (!travel?.id || !formData.company_id) return [];
    const currentId = String(travel.id);
    return (Array.isArray(travels) ? travels : []).filter((item) => {
      if (!item || Boolean(item.anulado)) return false;
      if (String(item.id) === currentId) return false;
      return String(item.empresa_id) === String(formData.company_id);
    });
  }, [travel, travels, formData.company_id]);

  const companyTripsSnapshot = useMemo(() => {
    if (!travel?.id || !formData.company_id) return [];
    return [travel, ...relatedTravelCandidates];
  }, [travel, relatedTravelCandidates, formData.company_id]);

  const hasTripsWithInvoice = useMemo(
    () => companyTripsSnapshot.some((item) => travelHasInvoiceData(item)),
    [companyTripsSnapshot],
  );
  const hasTripsWithoutInvoice = useMemo(
    () => companyTripsSnapshot.some((item) => !travelHasInvoiceData(item)),
    [companyTripsSnapshot],
  );
  const hasTripsWithLiquidation = useMemo(
    () => companyTripsSnapshot.some((item) => travelHasLiquidationData(item)),
    [companyTripsSnapshot],
  );
  const hasTripsWithoutLiquidation = useMemo(
    () => companyTripsSnapshot.some((item) => !travelHasLiquidationData(item)),
    [companyTripsSnapshot],
  );

  const lockInvoiceFieldsInMultiple = multipleModeEnabled && hasTripsWithInvoice && hasTripsWithoutInvoice;
  const lockLiquidationFieldsInMultiple =
    multipleModeEnabled && hasTripsWithLiquidation && hasTripsWithoutLiquidation;

  useEffect(() => {
    if (!multipleModeEnabled || selectedRelatedIds.length === 0) return;
    const filtered = selectedRelatedIds.filter((id) => {
      const candidate = relatedTravelCandidates.find((item) => String(item.id) === String(id));
      if (!candidate) return false;
      return !isTripBlockedForBulk(candidate, {
        applyInvoice: applyInvoiceInBulk,
        applyLiquidation: applyLiquidationInBulk,
      });
    });
    if (filtered.length !== selectedRelatedIds.length) {
      setSelectedRelatedIds(filtered);
    }
  }, [
    multipleModeEnabled,
    selectedRelatedIds,
    relatedTravelCandidates,
    applyInvoiceInBulk,
    applyLiquidationInBulk,
  ]);

  // --- CÁLCULOS AUTOMÁTICOS DE TARIFA ---
  useEffect(() => {
    if (selectedCompany?.tipo_cobro === 'TARIFA') {
      const descargaRaw = parseEsNumber(formData.quantity_unloaded);
      const tarifaRaw = parseEsNumber(formData.tariff_value);
      const descarga = Number.isNaN(descargaRaw) ? 0 : descargaRaw;
      const tarifa = Number.isNaN(tarifaRaw) ? 0 : tarifaRaw;

      if (descarga > 0 && tarifa > 0) {
        const neto = descarga * tarifa;
        const iva = neto * 0.21;
        setFormData(prev => ({
          ...prev,
          net_value: formatDecimalInput(neto, { maxDecimals: 2 }),
          iva_value: formatDecimalInput(iva, { maxDecimals: 2 })
        }));
      }
    }
  }, [formData.quantity_unloaded, formData.tariff_value, selectedCompany]);

  useEffect(() => {
    if (selectedCompany?.tipo_cobro === 'FIJO') {
      const fijoRaw = parseEsNumber(formData.fixed_price);
      const fijo = Number.isNaN(fijoRaw) ? 0 : fijoRaw;
      if (fijo > 0) {
        const iva = fijo * 0.21;
        setFormData(prev => ({
          ...prev,
          net_value: formatDecimalInput(fijo, { maxDecimals: 2 }),
          iva_value: formatDecimalInput(iva, { maxDecimals: 2 }),
        }));
      }
    }
  }, [formData.fixed_price, selectedCompany]);

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
    if ((name === 'travel_date' || name === 'invoice_date') && value) {
      // Extraer solo YYYY-MM-DD del string (funciona con "2026-01-14" o "2026-01-14T00:00:00.000Z")
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        finalValue = `${match[1]}-${match[2]}-${match[3]}`;
      }
    }

    if (DECIMAL_INPUT_FIELDS.has(name)) {
      finalValue = sanitizeDecimalInput(finalValue);
    } else if (INTEGER_INPUT_FIELDS.has(name)) {
      finalValue = sanitizeIntegerInput(finalValue);
      finalValue = formatIntegerInput(finalValue);
    } else if (CAMEL_CASE_FIELDS.has(name)) {
      finalValue = toCamelCaseWords(finalValue);
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInvoiceFile(file);
      setDeleteInvoicePhoto(false);
    }
  };

  const handleLiquidationFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLiquidationFile(file);
      setDeleteLiquidationFile(false);
    }
  };

  const handleFuelInvoicePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFuelInvoicePhoto(file);
    setDeleteFuelInvoicePhoto(false);
  };

  const handleFuelReturnInvoicePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFuelReturnInvoicePhoto(file);
    setDeleteFuelReturnInvoicePhoto(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const missingFields = getRequiredTravelFields({ isTarifa, isFijo })
        .filter(({ key }) => String(formData[key] ?? '').trim().length === 0);

      if (missingFields.length > 0) {
        setActiveTab(missingFields[0].tab);
        showErrorAlert(
          'Campos obligatorios',
          `Faltan completar:\n${missingFields.map((field) => `- ${field.label}`).join('\n')}`
        );
        setLoading(false);
        return;
      }

      if (
        kmInicioNum !== null && kmFinNum !== null &&
        !Number.isNaN(kmInicioNum) && !Number.isNaN(kmFinNum) &&
        kmFinNum < kmInicioNum
      ) {
        setActiveTab('fuel');
        showErrorAlert('Kilometrajes inválidos', 'El KM al llegar debe ser mayor o igual al KM al cargar combustible.');
        setLoading(false);
        return;
      }

      if (
        kmInicioVueltaNum !== null && kmFinVueltaNum !== null &&
        !Number.isNaN(kmInicioVueltaNum) && !Number.isNaN(kmFinVueltaNum) &&
        kmFinVueltaNum < kmInicioVueltaNum
      ) {
        setActiveTab('fuel');
        showErrorAlert('Kilometrajes inválidos', 'El KM al llegar de vuelta debe ser mayor o igual al KM al cargar combustible de vuelta.');
        setLoading(false);
        return;
      }

      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '' && formData[key] !== null) {
          if (AUTO_DERIVED_STATUS_FIELDS.has(key)) {
            return;
          }
          if (NUMERIC_FIELDS.has(key)) {
            const normalized = INTEGER_INPUT_FIELDS.has(key)
              ? normalizeToApiNumberString(formData[key])
              : normalizeToApiDecimalString(formData[key]);
            if (normalized !== '') formDataToSend.append(key, normalized);
            return;
          }
          formDataToSend.append(key, formData[key]);
        }
      });
      if (invoiceFile) {
        formDataToSend.append('invoice_photo', invoiceFile);
      }
      if (liquidationFile) {
        formDataToSend.append('archivo_factura_liquidado', liquidationFile);
      }
      if (fuelInvoicePhoto) {
        formDataToSend.append('foto_factura_combustible', fuelInvoicePhoto);
      }
      if (fuelReturnInvoicePhoto) {
        formDataToSend.append('foto_factura_combustible_vuelta', fuelReturnInvoicePhoto);
      }
      if (deleteInvoicePhoto) formDataToSend.append('delete_invoice_photo', 'true');
      if (deleteLiquidationFile) formDataToSend.append('delete_liquidation_file', 'true');
      if (deleteFuelInvoicePhoto) formDataToSend.append('delete_fuel_invoice_photo', 'true');
      if (deleteFuelReturnInvoicePhoto) formDataToSend.append('delete_fuel_return_invoice_photo', 'true');

      let success;
      if (travel) {
        success = await updateTravel(travel.id, formDataToSend);
      } else {
        success = await createTravel(formDataToSend);
      }

      if (
        success &&
        travel &&
        multipleModeEnabled &&
        selectedRelatedIds.length > 0 &&
        bulkUpdateTravelDocs
      ) {
        const totalTripsToUpdate = selectedRelatedIds.length + 1;
        if (lockInvoiceFieldsInMultiple && applyInvoiceInBulk) {
          showErrorAlert(
            'Facturación múltiple bloqueada',
            'Hay viajes mezclados en la empresa: algunos ya están facturados y otros no. Completá o corregí la facturación de forma individual.',
          );
          setLoading(false);
          return;
        }
        if (lockLiquidationFieldsInMultiple && applyLiquidationInBulk) {
          showErrorAlert(
            'Liquidación múltiple bloqueada',
            'Hay viajes mezclados en la empresa: algunos ya están liquidados y otros no. Completá o corregí la liquidación de forma individual.',
          );
          setLoading(false);
          return;
        }
        if (!applyInvoiceInBulk && !applyLiquidationInBulk) {
          showErrorAlert(
            'Sin cambios para aplicar',
            'Para usar la edición múltiple, cargá al menos un dato nuevo de facturación o liquidación en el viaje actual.',
          );
          setLoading(false);
          return;
        }

        const selectedTrips = relatedTravelCandidates.filter((item) => selectedRelatedIds.includes(item.id));
        const blockedTrips = selectedTrips.filter((item) =>
          isTripBlockedForBulk(item, {
            applyInvoice: applyInvoiceInBulk,
            applyLiquidation: applyLiquidationInBulk,
          }),
        );

        if (blockedTrips.length > 0) {
          const summary = blockedTrips
            .slice(0, 5)
            .map((item) => `- ${formatTripDate(item.fecha_viaje)} | ${item.origen || '-'} → ${item.destino || '-'}`)
            .join('\n');
          const extra = blockedTrips.length > 5 ? `\n...y ${blockedTrips.length - 5} viaje(s) más` : '';
          await Swal.fire({
            icon: 'warning',
            title: 'No se puede aplicar la edición múltiple',
            html:
              '<p>Hay viajes con datos ya cargados en los campos que querés copiar.</p>' +
              '<p>Quitalos de la selección para continuar.</p>' +
              `<pre style="text-align:left;background:#f8fafc;padding:12px;border-radius:8px;max-height:220px;overflow:auto;">${summary}${extra}</pre>`,
            confirmButtonColor: '#FF9020',
            confirmButtonText: 'Entendido',
          });
          setLoading(false);
          return;
        }

        const confirmed = await showConfirmAlert(
          'Aplicar actualización múltiple',
          `Se van a actualizar ${totalTripsToUpdate} viajes, incluyendo el actual, con los datos de facturación y liquidación cargados en este formulario.`,
          {
            icon: 'question',
            confirmButtonColor: '#FF9020',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'Aplicar cambios',
            cancelButtonText: 'Cancelar',
          },
        );
        if (!confirmed) {
          setLoading(false);
          return;
        }

        const bulkForm = new FormData();
        bulkForm.append('ids', JSON.stringify(selectedRelatedIds));

        if (applyInvoiceInBulk) {
          if (formData.invoice_number) bulkForm.append('invoice_number', formData.invoice_number);
          if (formData.invoice_date) bulkForm.append('invoice_date', formData.invoice_date);
          if (invoiceFile) bulkForm.append('invoice_photo', invoiceFile);
        }
        if (applyLiquidationInBulk) {
          if (formData.carta_de_porte) bulkForm.append('carta_de_porte', formData.carta_de_porte);
          if (liquidationFile) bulkForm.append('archivo_factura_liquidado', liquidationFile);
        }

        await bulkUpdateTravelDocs(bulkForm);
      }

      if (success) handleClose();
    } catch (error) {
      const msg = getErrorMsg(error, 'No se pudo guardar el viaje');
      showErrorAlert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(createEmptyFormData());
    setInvoiceFile(null);
    setPreviewUrl(null);
    setLiquidationFile(null);
    setLiquidationPreviewUrl(null);
    setFuelInvoicePhoto(null);
    setFuelInvoicePhotoUrl(null);
    setFuelReturnInvoicePhoto(null);
    setFuelReturnInvoicePhotoUrl(null);
    setDeleteInvoicePhoto(false);
    setDeleteLiquidationFile(false);
    setDeleteFuelInvoicePhoto(false);
    setDeleteFuelReturnInvoicePhoto(false);
    setActiveTab('basic');
    setSelectedCompany(null);
    onClose();
  };

  if (!isOpen) return null;

  const isTarifa = selectedCompany?.tipo_cobro === 'TARIFA';
  const isFijo = selectedCompany?.tipo_cobro === 'FIJO';

  const kmInicioNum = formData.fuel_km === '' ? null : parseEsNumber(formData.fuel_km);
  const kmFinNum = formData.fuel_km_end === '' ? null : parseEsNumber(formData.fuel_km_end);
  const kmInicioVueltaNum = formData.fuel_return_km === '' ? null : parseEsNumber(formData.fuel_return_km);
  const kmFinVueltaNum = formData.fuel_return_km_end === '' ? null : parseEsNumber(formData.fuel_return_km_end);
  const kmViaje = (kmInicioNum !== null && kmFinNum !== null && !Number.isNaN(kmInicioNum) && !Number.isNaN(kmFinNum))
    ? Math.max(0, kmFinNum - kmInicioNum)
    : null;
  const kmViajeVuelta = (kmInicioVueltaNum !== null && kmFinVueltaNum !== null && !Number.isNaN(kmInicioVueltaNum) && !Number.isNaN(kmFinVueltaNum))
    ? Math.max(0, kmFinVueltaNum - kmInicioVueltaNum)
    : null;
  const litrosNum = formData.fuel_liters === '' ? null : parseEsNumber(formData.fuel_liters);
  const litrosVueltaNum = formData.fuel_return_liters === '' ? null : parseEsNumber(formData.fuel_return_liters);
  const litrosPorKm = (kmViaje && litrosNum !== null && !Number.isNaN(litrosNum) && kmViaje > 0)
    ? (litrosNum / kmViaje)
    : null;
  const litrosPorKmVuelta = (kmViajeVuelta && litrosVueltaNum !== null && !Number.isNaN(litrosVueltaNum) && kmViajeVuelta > 0)
    ? (litrosVueltaNum / kmViajeVuelta)
    : null;
  const esperado032 = kmViaje ? kmViaje * 0.32 : null;
  const esperado034 = kmViaje ? kmViaje * 0.34 : null;
  const diferenciaVs032 = (esperado032 !== null && litrosNum !== null && !Number.isNaN(litrosNum))
    ? (litrosNum - esperado032)
    : null;
  const esIneficiente = litrosPorKm !== null && litrosPorKm > 0.34;
  const litrosPorKmDisplay =
    litrosPorKm === null
      ? ''
      : `${new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
      }).format(litrosPorKm)}`;
  const litrosPorKmVueltaDisplay =
    litrosPorKmVuelta === null
      ? ''
      : `${new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
      }).format(litrosPorKmVuelta)}`;

  const computeTripTotal = (item) => {
    const neto = Number(item?.valor_neto ?? item?.precio_fijo ?? 0);
    const iva = Number(item?.valor_iva ?? 0);
    return (Number.isNaN(neto) ? 0 : neto) + (Number.isNaN(iva) ? 0 : iva);
  };

  const hasExistingBillingData =
    String(travel?.numero_factura || '').trim().length > 0 ||
    String(travel?.carta_de_porte || '').trim().length > 0 ||
    String(travel?.fecha_facturada || '').trim().length > 0;

  const currentTravelSummary = travel ? {
    id: travel.id,
    fecha_viaje: formData.travel_date || travel.fecha_viaje || '',
    company_name: selectedCompany?.nombre || travel.company_name || '',
    origen: formData.origin || travel.origen || '',
    destino: formData.destination || travel.destino || '',
    driver_name: drivers.find((d) => String(d.id) === String(formData.driver_id))?.name || travel.driver_name || '',
    driver_lastname: drivers.find((d) => String(d.id) === String(formData.driver_id))?.lastname || travel.driver_lastname || '',
    valor_neto: parseEsNumber(formData.net_value),
    valor_iva: parseEsNumber(formData.iva_value),
    precio_fijo: parseEsNumber(formData.fixed_price),
    estado_liquidacion: formData.liquidation_status || travel.estado_liquidacion || 'FALTA',
    estado_facturacion: formData.invoice_status || travel.estado_facturacion || 'FALTA',
    estado_pago: formData.payment_status || travel.estado_pago || 'DEBEN',
  } : null;

  const travelRowsForSelection = currentTravelSummary
    ? [currentTravelSummary, ...relatedTravelCandidates]
    : relatedTravelCandidates;

  const selectedTripsTotalArs = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(
    travelRowsForSelection.reduce((sum, item) => {
      const isCurrentRow = Boolean(travel) && String(item.id) === String(travel.id);
      if (!isCurrentRow && !selectedRelatedIds.includes(item.id)) return sum;
      return sum + computeTripTotal(item);
    }, 0),
  );

  return (
    <div className="travel-modal-overlay">
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
            className={`tab-btn ${activeTab === 'fuel' ? 'active' : ''}`}
            onClick={() => setActiveTab('fuel')}
          >
           ⛽️ Combustible
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
          
        </div>

        <form onSubmit={handleSubmit} noValidate>
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
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="travel_date">Fecha del Viaje *</label>
                          <input
                            type="date"
                            id="travel_date"
                            name="travel_date"
                            value={formData.travel_date}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="company_id">Empresa *</label>
                          <select
                            id="company_id"
                            name="company_id"
                            value={formData.company_id}
                            onChange={handleChange}
                          >
                            <option value="">Seleccione una empresa</option>
                            {companies.filter(c => c.activo).map(company => (
                              <option key={company.id} value={company.id}>
                                {company.nombre} ({company.tipo_cobro})
                              </option>
                            ))}
                          </select>

                        </div>
                      </div>
                    </div>
                    <div className="form-row-1">
                      {/* Chofer */}
                      <div className="form-group">
                        <label htmlFor="driver_id">Chofer *</label>
                        <select id="driver_id" name="driver_id" value={formData.driver_id} onChange={handleChange}>
                          <option value="">Seleccione un chofer</option>
                          {/* 🔥 OJO: He quitado el filtro de 'COMPLETO' para que puedas ver todos tus choferes de prueba */}
                          {drivers.map(driver => (
                            <option key={driver.id} value={driver.id}>
                              {driver.nombre} {driver.apellido} {driver.dni ? `- ${driver.dni}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Chasis */}
                      <div className="form-group">
                        <label htmlFor="chassis_id">Chasis *</label>
                        <select id="chassis_id" name="chassis_id" value={formData.chassis_id} onChange={handleChange}>
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
                )}
                {/* TAB: LOGÍSTICA */}
                {activeTab === 'logistics' && (
                  <div className="tab-content">
                    <div className="form-section">
                      <h3>Información de Ruta</h3>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="origin">Origen *</label>
                          <input
                            type="text"
                            id="origin"
                            name="origin"
                            value={formData.origin}
                            onChange={handleChange}
                            placeholder="Ciudad/Lugar de origen"
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="destination">Destino *</label>
                          <input
                            type="text"
                            id="destination"
                            name="destination"
                            value={formData.destination}
                            onChange={handleChange}
                            placeholder="Ciudad/Lugar de destino"
                          />
                        </div>
                      </div>

                      <h3>Carga</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="quantity_loaded">Cantidad Cargada (TN)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            id="quantity_loaded"
                            name="quantity_loaded"
                            value={formData.quantity_loaded}
                            onChange={handleChange}
                            placeholder="0"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="quantity_unloaded">Cantidad Descargada (TN)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            id="quantity_unloaded"
                            name="quantity_unloaded"
                            value={formData.quantity_unloaded}
                            onChange={handleChange}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: COMBUSTIBLE */}
                {activeTab === 'fuel' && (
                  <div className="tab-content">
                    <div className="form-section">
                      <h3>Combustible</h3>
                      <div className="alert-info">
                        ℹ️ Primero guardás el viaje de ida. Después, al editarlo, podés completar el combustible del viaje de vuelta.
                      </div>
                      <h3>Viaje de ida</h3>
                      <div className="form-row-1">
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
                        <div className="form-group">
                          <label htmlFor="fuel_invoice">Numero de Factura Combustible</label>
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
                          <label htmlFor="foto_factura_combustible">Foto Factura Combustible</label>
                          <input
                            type="file"
                            id="foto_factura_combustible"
                            name="foto_factura_combustible"
                            accept="image/*,application/pdf"
                            onChange={handleFuelInvoicePhotoChange}
                            style={{ display: 'none' }}
                          />
                          <div className="travel-file-card-existing">
                            <div className="travel-file-info">
                              <span className="travel-file-icon">📄</span>
                              <span>
                                {fuelInvoicePhoto
                                  ? `Nuevo: ${fuelInvoicePhoto.name}`
                                  : fuelInvoicePhotoUrl && !deleteFuelInvoicePhoto
                                    ? 'Archivo cargado'
                                    : 'Sin archivo'}
                              </span>
                            </div>
                            <div className="travel-file-actions">
                              <button
                                type="button"
                                className="travel-btn-mini view"
                                onClick={() => {
                                  const url = fuelInvoicePhotoUrl;
                                  if (url && !deleteFuelInvoicePhoto) window.open(url, '_blank');
                                }}
                                title="Ver"
                                disabled={!fuelInvoicePhotoUrl || deleteFuelInvoicePhoto}
                              >
                                👁️
                              </button>
                              <button
                                type="button"
                                className="travel-btn-mini replace"
                                onClick={() => document.getElementById('foto_factura_combustible')?.click()}
                                title="Editar"
                              >
                                🔄
                              </button>
                              <button
                                type="button"
                                className="travel-btn-mini delete"
                                onClick={() => {
                                  setFuelInvoicePhoto(null);
                                  if (fuelInvoicePhotoUrl) setDeleteFuelInvoicePhoto(true);
                                }}
                                title="Borrar"
                                disabled={!fuelInvoicePhoto && (!fuelInvoicePhotoUrl || deleteFuelInvoicePhoto)}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="fuel_liters">Litros de Combustible</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            id="fuel_liters"
                            name="fuel_liters"
                            value={formData.fuel_liters}
                            onChange={handleChange}
                            placeholder="0"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="fuel_amount">Monto Combustible</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            id="fuel_amount"
                            name="fuel_amount"
                            value={formData.fuel_amount}
                            onChange={handleChange}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="fuel_km">KM al Cargar Combustible</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            id="fuel_km"
                            name="fuel_km"
                            value={formData.fuel_km}
                            onChange={handleChange}
                            placeholder="Kilometraje"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="fuel_km_end">KM al Llegar</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            id="fuel_km_end"
                            name="fuel_km_end"
                            value={formData.fuel_km_end}
                            onChange={handleChange}
                            placeholder="Kilometraje al llegar"
                          />
                        </div>
                      </div>
                      {(kmViaje !== null || litrosPorKm !== null) && (
                        <>
                          <div className="form-row">
                            <div className="form-group">
                              <label>KM del viaje</label>
                              <input
                                type="text"
                                value={kmViaje === null ? '' : formatDecimalInput(kmViaje, { maxDecimals: 2 })}
                                disabled
                              />
                            </div>
                            <div className="form-group">
                              <label>Consumo</label>
                              <input type="text" value={litrosPorKmDisplay} disabled />
                            </div>
                          </div>
                          <div className="form-row-1">

                            <div className="form-group">
                              <label>Referencia eficiente (0.32 x KM)</label>
                              <input
                                type="text"
                                value={esperado032 === null ? '' : formatDecimalInput(esperado032, { maxDecimals: 2 })}
                                disabled
                              />
                            </div>
                            <div className="form-group">
                              <label>Máximo tolerado (0.34 x KM)</label>
                              <input
                                type="text"
                                value={esperado034 === null ? '' : formatDecimalInput(esperado034, { maxDecimals: 2 })}
                                disabled
                              />
                            </div>

                            <div className="form-group">
                              <label>Diferencia vs eficiente (Litros - 0.32xKM)</label>
                              <input
                                type="text"
                                value={diferenciaVs032 === null ? '' : formatDecimalInput(diferenciaVs032, { maxDecimals: 2 })}
                                disabled
                              />
                            </div>
                          </div>

                        </>
                      )}
                      {esIneficiente && (
                        <div className="alert-info" style={{ borderLeftColor: '#dc2626', background: '#fee2e2', color: '#991b1b' }}>
                          ⚠️ Consumo ineficiente: supera 0.34 (revisar combustible gastado).
                        </div>
                      )}

                      <h3>Viaje de vuelta</h3>
                      {!travel && (
                        <div className="alert-info">
                          ℹ️ El bloque de vuelta se habilita una vez que el viaje de ida ya fue guardado.
                        </div>
                      )}
                      <fieldset disabled={!travel} style={{ border: 'none', padding: 0, margin: 0, opacity: travel ? 1 : 0.6 }}>
                        <div className="form-row-1">
                          <div className="form-group">
                            <label htmlFor="fuel_return_station">Estación de Servicio Vuelta</label>
                            <input type="text" id="fuel_return_station" name="fuel_return_station" value={formData.fuel_return_station} onChange={handleChange} placeholder="Nombre de la estación" />
                          </div>
                          <div className="form-group">
                            <label htmlFor="fuel_return_invoice">Numero de Factura Combustible Vuelta</label>
                            <input type="text" id="fuel_return_invoice" name="fuel_return_invoice" value={formData.fuel_return_invoice} onChange={handleChange} placeholder="Número de factura del combustible" />
                          </div>
                          <div className="form-group">
                            <label htmlFor="foto_factura_combustible_vuelta">Foto Factura Combustible Vuelta</label>
                            <input
                              type="file"
                              id="foto_factura_combustible_vuelta"
                              name="foto_factura_combustible_vuelta"
                              accept="image/*,application/pdf"
                              onChange={handleFuelReturnInvoicePhotoChange}
                              style={{ display: 'none' }}
                            />
                            <div className="travel-file-card-existing">
                              <div className="travel-file-info">
                                <span className="travel-file-icon">📄</span>
                                <span>
                                  {fuelReturnInvoicePhoto
                                    ? `Nuevo: ${fuelReturnInvoicePhoto.name}`
                                    : fuelReturnInvoicePhotoUrl && !deleteFuelReturnInvoicePhoto
                                      ? 'Archivo cargado'
                                      : 'Sin archivo'}
                                </span>
                              </div>
                              <div className="travel-file-actions">
                                <button
                                  type="button"
                                  className="travel-btn-mini view"
                                  onClick={() => {
                                    const url = fuelReturnInvoicePhotoUrl;
                                    if (url && !deleteFuelReturnInvoicePhoto) window.open(url, '_blank');
                                  }}
                                  title="Ver"
                                  disabled={!fuelReturnInvoicePhotoUrl || deleteFuelReturnInvoicePhoto}
                                >
                                  👁️
                                </button>
                                <button
                                  type="button"
                                  className="travel-btn-mini replace"
                                  onClick={() => document.getElementById('foto_factura_combustible_vuelta')?.click()}
                                  title="Editar"
                                >
                                  🔄
                                </button>
                                <button
                                  type="button"
                                  className="travel-btn-mini delete"
                                  onClick={() => {
                                    setFuelReturnInvoicePhoto(null);
                                    if (fuelReturnInvoicePhotoUrl) setDeleteFuelReturnInvoicePhoto(true);
                                  }}
                                  title="Borrar"
                                  disabled={!fuelReturnInvoicePhoto && (!fuelReturnInvoicePhotoUrl || deleteFuelReturnInvoicePhoto)}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="fuel_return_liters">Litros de Combustible Vuelta</label>
                            <input type="text" inputMode="decimal" id="fuel_return_liters" name="fuel_return_liters" value={formData.fuel_return_liters} onChange={handleChange} placeholder="0" />
                          </div>
                          <div className="form-group">
                            <label htmlFor="fuel_return_amount">Monto Combustible Vuelta</label>
                            <input type="text" inputMode="decimal" id="fuel_return_amount" name="fuel_return_amount" value={formData.fuel_return_amount} onChange={handleChange} placeholder="0" />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="fuel_return_km">KM al Cargar Combustible Vuelta</label>
                            <input type="text" inputMode="decimal" id="fuel_return_km" name="fuel_return_km" value={formData.fuel_return_km} onChange={handleChange} placeholder="Kilometraje" />
                          </div>
                          <div className="form-group">
                            <label htmlFor="fuel_return_km_end">KM al Llegar Vuelta</label>
                            <input type="text" inputMode="decimal" id="fuel_return_km_end" name="fuel_return_km_end" value={formData.fuel_return_km_end} onChange={handleChange} placeholder="Kilometraje al llegar" />
                          </div>
                        </div>
                        {(kmViajeVuelta !== null || litrosPorKmVuelta !== null) && (
                          <div className="form-row">
                            <div className="form-group">
                              <label>KM del viaje de vuelta</label>
                              <input type="text" value={kmViajeVuelta === null ? '' : formatDecimalInput(kmViajeVuelta, { maxDecimals: 2 })} disabled />
                            </div>
                            <div className="form-group">
                              <label>Consumo vuelta</label>
                              <input type="text" value={litrosPorKmVueltaDisplay} disabled />
                            </div>
                          </div>
                        )}
                      </fieldset>

                    </div>
                  </div>
                )}


                {/* TAB: DOCUMENTACIÓN */}
                {activeTab === 'documentation' && (
                  <div className="tab-content">
                    <div className="form-section">
                      <h3>Documentos del Viaje</h3>

                      <div className="form-row-1">
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
                          <div className="form-row-1">
                            <div className="form-group">
                              <label htmlFor="tariff_value">Valor de Tarifa *</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                id="tariff_value"
                                name="tariff_value"
                                value={formData.tariff_value}
                                onChange={handleChange}
                                placeholder="0"
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="net_value">Valor Neto *</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                id="net_value"
                                name="net_value"
                                value={formData.net_value}
                                onChange={handleChange}
                                placeholder="0"
                              />
                            </div>

                            <div className="form-group">
                              <label htmlFor="iva_value">Valor IVA</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                id="iva_value"
                                name="iva_value"
                                value={formData.iva_value}
                                onChange={handleChange}
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label>Valor Total (Neto + IVA)</label>
                            <input
                              type="text"
                              value={(() => {
                                const netoRaw = parseEsNumber(formData.net_value);
                                const ivaRaw = parseEsNumber(formData.iva_value);
                                const neto = Number.isNaN(netoRaw) ? 0 : netoRaw;
                                const iva = Number.isNaN(ivaRaw) ? 0 : ivaRaw;
                                return formatIntegerInput(neto + iva);
                              })()}
                              disabled
                            />
                          </div>
                        </>
                      )}

                      {isFijo && (
                        <>
                          <div className="alert-info">
                            💵 Empresa con cobro <strong>FIJO</strong>
                          </div>
                          <div className="form-row-1">
                            <div className="form-group">
                              <label htmlFor="fixed_price">Precio Fijo *</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                id="fixed_price"
                                name="fixed_price"
                                value={formData.fixed_price}
                                onChange={handleChange}
                                placeholder="0"
                              />
                            </div>
                            <div className="form-group">
                              <label>Valor Neto</label>
                              <input type="text" value={formData.net_value || ''} disabled />
                            </div>
                            <div className="form-group">
                              <label>IVA (21%)</label>
                              <input type="text" value={formData.iva_value || ''} disabled />
                            </div>
                          </div>
                          <div className="form-group">
                            <label>Valor Total (Neto + IVA)</label>
                            <input
                              type="text"
                              value={(() => {
                                const netoRaw = parseEsNumber(formData.net_value);
                                const ivaRaw = parseEsNumber(formData.iva_value);
                                const neto = Number.isNaN(netoRaw) ? 0 : netoRaw;
                                const iva = Number.isNaN(ivaRaw) ? 0 : ivaRaw;
                                return formatIntegerInput(neto + iva);
                              })()}
                              disabled
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="form-section">
                      <h3>Adelantos</h3>
                      <div className="form-row-1">
                        <div className="form-group">
                          <label htmlFor="advance_amount">Monto del Adelanto</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            id="advance_amount"
                            name="advance_amount"
                            value={formData.advance_amount}
                            onChange={handleChange}
                            placeholder="0"
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
                          </select>
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
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: PAGOS */}
                {activeTab === 'payments' && (
                  <div className="tab-content">
                    <div className="form-section">
                      <h3>Factura y Liquidación</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="invoice_number">Número de Factura</label>
                          <input
                            type="text"
                            id="invoice_number"
                            name="invoice_number"
                            value={formData.invoice_number}
                            onChange={handleChange}
                            placeholder="0000-00000000"
                            disabled={lockInvoiceFieldsInMultiple}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="invoice_date">Fecha Facturada</label>
                          <input
                            type="date"
                            id="invoice_date"
                            name="invoice_date"
                            value={formData.invoice_date}
                            onChange={handleChange}
                            disabled={lockInvoiceFieldsInMultiple}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="invoice_status">Estado de Facturación</label>
                          <input
                            id="invoice_status"
                            name="invoice_status"
                            value={formData.invoice_status}
                            disabled
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="invoice_photo">Foto de Factura</label>
                          <input
                            type="file"
                            id="invoice_photo"
                            name="invoice_photo"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            disabled={lockInvoiceFieldsInMultiple}
                            style={{ display: 'none' }}
                          />
                          <div className="travel-file-card-existing">
                            <div className="travel-file-info">
                              <span className="travel-file-icon">📄</span>
                              <span>
                                {invoiceFile
                                  ? `Nuevo: ${invoiceFile.name}`
                                  : previewUrl && !deleteInvoicePhoto
                                    ? 'Archivo cargado'
                                    : 'Sin archivo'}
                              </span>
                            </div>
                            <div className="travel-file-actions">
                              <button
                                type="button"
                                className="travel-btn-mini view"
                                onClick={() => {
                                  if (previewUrl && !deleteInvoicePhoto) window.open(previewUrl, '_blank');
                                }}
                                title="Ver"
                                disabled={!previewUrl || deleteInvoicePhoto}
                              >
                                👁️
                              </button>
                              <button
                                type="button"
                                className="travel-btn-mini replace"
                                onClick={() => document.getElementById('invoice_photo')?.click()}
                                title="Editar"
                                disabled={lockInvoiceFieldsInMultiple}
                              >
                                🔄
                              </button>
                              <button
                                type="button"
                                className="travel-btn-mini delete"
                                onClick={() => {
                                  setInvoiceFile(null);
                                  if (previewUrl) setDeleteInvoicePhoto(true);
                                }}
                                title="Borrar"
                                disabled={lockInvoiceFieldsInMultiple || (!invoiceFile && (!previewUrl || deleteInvoicePhoto))}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>

                      <div className="form-row-1">
                        <div className="form-group">
                          <label htmlFor="carta_de_porte">Carta de Porte</label>
                          <input
                            type="text"
                            id="carta_de_porte"
                            name="carta_de_porte"
                            value={formData.carta_de_porte}
                            onChange={handleChange}
                            placeholder="Número de carta de porte"
                            disabled={lockLiquidationFieldsInMultiple}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="liquidation_status">Estado de Liquidación</label>
                          <input
                            id="liquidation_status"
                            name="liquidation_status"
                            value={formData.liquidation_status}
                            disabled
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="archivo_factura_liquidado">Archivo Factura Liquidado</label>
                          <input
                            type="file"
                            id="archivo_factura_liquidado"
                            name="archivo_factura_liquidado"
                            accept="image/*,application/pdf"
                            onChange={handleLiquidationFileChange}
                            disabled={lockLiquidationFieldsInMultiple}
                            style={{ display: 'none' }}
                          />
                          <div className="travel-file-card-existing">
                            <div className="travel-file-info">
                              <span className="travel-file-icon">📄</span>
                              <span>
                                {liquidationFile
                                  ? `Nuevo: ${liquidationFile.name}`
                                  : liquidationPreviewUrl && !deleteLiquidationFile
                                    ? 'Archivo cargado'
                                    : 'Sin archivo'}
                              </span>
                            </div>
                            <div className="travel-file-actions">
                              <button
                                type="button"
                                className="travel-btn-mini view"
                                onClick={() => {
                                  if (liquidationPreviewUrl && !deleteLiquidationFile) window.open(liquidationPreviewUrl, '_blank');
                                }}
                                title="Ver"
                                disabled={!liquidationPreviewUrl || deleteLiquidationFile}
                              >
                                👁️
                              </button>
                              <button
                                type="button"
                                className="travel-btn-mini replace"
                                onClick={() => document.getElementById('archivo_factura_liquidado')?.click()}
                                title="Editar"
                                disabled={lockLiquidationFieldsInMultiple}
                              >
                                🔄
                              </button>
                              <button
                                type="button"
                                className="travel-btn-mini delete"
                                onClick={() => {
                                  setLiquidationFile(null);
                                  if (liquidationPreviewUrl) setDeleteLiquidationFile(true);
                                }}
                                title="Borrar"
                                disabled={lockLiquidationFieldsInMultiple || (!liquidationFile && (!liquidationPreviewUrl || deleteLiquidationFile))}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>



                      <div className="form-row">
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

                        <div className="form-group">
                          <label htmlFor="payment_status">Estado de Pago</label>
                          <input
                            id="payment_status"
                            name="payment_status"
                            value={formData.payment_status}
                            disabled
                          />
                        </div>

                      </div>




                    </div>
                    <div className="alert-info">
                      ℹ️ El estado general se actualiza automáticamente según liquidación y facturación
                    </div>
                    {false && travel && (
                      <div className="form-section">
                        <h3>Facturación Múltiple</h3>
                        <div className="form-group">
                          <button
                            type="button"
                            className="btn-save"
                            onClick={() => {
                              setMultipleModeEnabled((prev) => {
                                const next = !prev;
                                if (!next) {
                                  setSelectedRelatedIds([]);
                                }
                                return next;
                              });
                            }}
                            style={{ width: 'auto', padding: '0.5rem 1rem' }}
                          >
                            {multipleModeEnabled
                              ? 'Desactivar facturación múltiple'
                              : hasExistingBillingData
                                ? 'Habilitar edición de facturación múltiple'
                                : 'Habilitar facturación múltiple'}
                          </button>
                          <small className="form-help">
                            Se van a duplicar en los viajes seleccionados los datos que cargues en este viaje (facturación y liquidación).
                          </small>
                        </div>

                        {multipleModeEnabled && (
                          <>
                            <div className="form-group">
                              <label>Viajes de la misma empresa ({travelRowsForSelection.length})</label>
                              <div className="form-row" style={{ marginBottom: '0.6rem' }}>
                                <button
                                  type="button"
                                  className="btn-cancel"
                                  style={{ width: 'auto', padding: '0.5rem 1rem' }}
                                  onClick={() =>
                                    setSelectedRelatedIds(
                                      relatedTravelCandidates
                                        .filter(
                                          (item) =>
                                            !isTripBlockedForBulk(item, {
                                              applyInvoice: applyInvoiceInBulk,
                                              applyLiquidation: applyLiquidationInBulk,
                                            }),
                                        )
                                        .map((item) => item.id),
                                    )
                                  }
                                >
                                  Seleccionar todos
                                </button>
                                <button
                                  type="button"
                                  className="btn-cancel"
                                  style={{ width: 'auto', padding: '0.5rem 1rem' }}
                                  onClick={() => setSelectedRelatedIds([])}
                                >
                                  Limpiar selección
                                </button>
                              </div>
                              <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.6rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '32px 96px 1fr 1fr 1fr 1fr 130px 110px 110px 100px', gap: '0.5rem', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                  <span></span>
                                  <span>Fecha</span>
                                  <span>Empresa</span>
                                  <span>Origen</span>
                                  <span>Destino</span>
                                  <span>Chofer</span>
                                  <span>Monto</span>
                                  <span>Liquidación</span>
                                  <span>Facturación</span>
                                  <span>Pago</span>
                                </div>
                                {travelRowsForSelection.map((item) => {
                                  const isCurrentRow = Boolean(travel) && String(item.id) === String(travel.id);
                                  const isBlocked = !isCurrentRow && isTripBlockedForBulk(item, {
                                    applyInvoice: applyInvoiceInBulk,
                                    applyLiquidation: applyLiquidationInBulk,
                                  });
                                  const checked = selectedRelatedIds.includes(item.id);
                                  const totalArs = new Intl.NumberFormat('es-AR', {
                                    style: 'currency',
                                    currency: 'ARS',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(computeTripTotal(item));
                                  const driverName = `${item.driver_name || ''} ${item.driver_lastname || ''}`.trim() || '-';
                                  return (
                                    <label key={item.id} style={{ display: 'grid', gridTemplateColumns: '32px 96px 1fr 1fr 1fr 1fr 130px 110px 110px 100px', gap: '0.5rem', marginBottom: '0.45rem', cursor: 'pointer', alignItems: 'center', opacity: isBlocked ? 0.6 : 1 }}>
                                      <input
                                        type="checkbox"
                                        checked={isCurrentRow ? true : checked}
                                        disabled={isCurrentRow || isBlocked}
                                        onChange={(e) => {
                                          const isChecked = e.target.checked;
                                          setSelectedRelatedIds((prev) =>
                                            isChecked ? [...prev, item.id] : prev.filter((id) => id !== item.id),
                                          );
                                        }}
                                        style={{ width: 'auto' }}
                                      />
                                      <span>{formatTripDate(item.fecha_viaje)}</span>
                                      <span>{item.company_name || selectedCompany?.nombre || '-'}</span>
                                      <span>{item.origen || '-'}</span>
                                      <span>{item.destino || '-'}</span>
                                      <span>{isCurrentRow ? `${driverName} (actual)` : driverName}</span>
                                      <span>{totalArs}</span>
                                      <span>{item.estado_liquidacion || 'FALTA'}</span>
                                      <span>{item.estado_facturacion || 'FALTA'}</span>
                                      <span>{item.estado_pago || 'DEBEN'}</span>
                                    </label>
                                  );
                                })}
                                {travelRowsForSelection.length === 0 && (
                                  <small className="form-help">No hay viajes para esta empresa.</small>
                                )}
                              </div>
                            </div>

                            <div className="form-group">
                              <label>Viajes que se van a actualizar</label>
                              <input type="text" value={`${selectedRelatedIds.length + 1} viajes (incluye el actual)`} disabled />
                              <small className="form-help">
                                Total seleccionado: <strong>{selectedTripsTotalArs}</strong>
                              </small>
                              <small className="form-help">
                                Al guardar, se copiarán automáticamente los datos de facturación/liquidación que cargaste en este viaje.
                              </small>
                              {(applyInvoiceInBulk || applyLiquidationInBulk) && (
                                <small className="form-help" style={{ color: '#b45309' }}>
                                  Solo se bloquean viajes que ya tienen datos en los campos que estás aplicando ahora.
                                </small>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </>
            )}

          </div>

          <div className="travel-modal-footer">
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
