import React, { useState, useMemo, useCallback } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import {
  Box,
  Button,
  Checkbox,
  ClickAwayListener,
  IconButton,
  Paper,
  Popper,
  Tooltip,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Menu,
  ListItemIcon,
  ListItemText,
  TextField,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon, FileDownload as FileDownloadIcon, Add as AddIcon, Block as BlockIcon, Restore as RestoreIcon, FilterAltOutlined as FilterAltOutlinedIcon } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MRT_Localization_ES } from 'material-react-table/locales/es'; // Idioma español
import Swal from 'sweetalert2';

import Navbar from '../navbar/Navbar';
import { useTravel } from '../../context/travel/TravelContext';
import TravelFormModal from '../travelFormModal/TravelFormModal';
import './travel.css'; // Puedes mantenerlo para estilos generales del layout

const Travel = () => {
  const { travels, loading, getTravels, deleteTravel, cancelTravel, restoreTravel, bulkUpdateTravelDocs, includeAnnulled, setIncludeAnnulled } = useTravel();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [monthFilter, setMonthFilter] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0')); // por defecto mes actual
  const [yearFilter, setYearFilter] = useState(() => String(new Date().getFullYear())); // por defecto año actual
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState(null);
  const [headerFilters, setHeaderFilters] = useState({});
  const [filterPopover, setFilterPopover] = useState({
    anchorEl: null,
    columnId: '',
    label: '',
    search: '',
    draftValues: [],
  });
  const brand = useMemo(
    () => ({
      main: '#FF9020',
      hover: '#f79a3e',
      border: '#f59e0b',
    }),
    [],
  );

  // --- HANDLERS (CRUD) ---
  const handleDelete = async (row) => {
    // MRT devuelve la fila completa, accedemos al original
    await deleteTravel(row.original.id);
  };

  const handleCancel = async (row) => {
    const travel = row.original;
    const result = await Swal.fire({
      title: 'Anular viaje',
      text: 'El viaje quedará en historial pero no se usará para facturación/pagos. Ingresá un motivo.',
      input: 'text',
      inputPlaceholder: 'Motivo (mínimo 3 caracteres)',
      showCancelButton: true,
      confirmButtonText: 'Anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      preConfirm: (value) => {
        if (!value || value.trim().length < 3) {
          Swal.showValidationMessage('Ingresá un motivo válido (mínimo 3 caracteres).');
        }
        return value;
      },
    });

    if (result.isConfirmed) {
      await cancelTravel(travel.id, result.value);
    }
  };

  const handleRestore = async (row) => {
    const travel = row.original;
    const result = await Swal.fire({
      title: 'Restaurar viaje',
      text: 'El viaje volverá a estar activo.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Restaurar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
    });
    if (result.isConfirmed) {
      await restoreTravel(travel.id);
    }
  };

  const handleEdit = (row) => {
    setSelectedTravel(row.original);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setSelectedTravel(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTravel(null);
  };

  // --- HELPERS DE FECHA (sin problemas de zona horaria) ---
  const toYearMonthKey = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      const m = value.match(/^(\d{4})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}`; // 'YYYY-MM'
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const toDateKey = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const topLevelFilteredTravels = useMemo(() => {
    const usingDateRange = Boolean(dateFromFilter || dateToFilter);

    return travels.filter((travel) => {
      const ym = toYearMonthKey(travel.fecha_viaje);
      if (!ym) return false;
      const dateKey = toDateKey(travel.fecha_viaje);
      if (!dateKey) return false;
      const [y, m] = ym.split('-');
      if (!usingDateRange) {
        if (yearFilter && y !== yearFilter) return false;
        if (monthFilter && m !== monthFilter) return false;
      }
      if (dateFromFilter && dateKey < dateFromFilter) return false;
      if (dateToFilter && dateKey > dateToFilter) return false;
      return true;
    });
  }, [travels, monthFilter, yearFilter, dateFromFilter, dateToFilter]);

  const uniqueSorted = useCallback((values) => {
    const asStrings = values
      .filter((v) => v !== null && v !== undefined)
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0 && v !== '-');
    return Array.from(new Set(asStrings)).sort((a, b) => a.localeCompare(b, 'es'));
  }, []);

  const isBlank = useCallback((value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    return false;
  }, []);

  const formatText = useCallback((value) => {
    if (isBlank(value)) return '-';
    return String(value);
  }, [isBlank]);

  const formatTitleCase = useCallback((value) => {
    if (value === null || value === undefined) return '-';
    const text = String(value).trim();
    if (text.length === 0) return '-';

    // Si ya tiene mayúsculas, respetamos el formato (evita romper siglas).
    if (/[A-ZÁÉÍÓÚÑÜ]/.test(text)) return text;

    const lower = text.toLocaleLowerCase('es-AR');
    return lower.replace(
      /(^|[\s-])([a-záéíóúñü])/g,
      (match, prefix, chr) => `${prefix}${chr.toLocaleUpperCase('es-AR')}`,
    );
  }, []);

  const formatDomain = useCallback((value) => {
    if (!value) return '-';
    const cleaned = String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const parts = cleaned.match(/[A-Z]+|\d+/g);
    if (!parts) return cleaned || '-';
    return parts.join(' ');
  }, []);

  const formatNumberEs = useCallback(
    (value, { maxDecimals = 2 } = {}) => {
      if (isBlank(value)) return '-';
      const num = typeof value === 'number' ? value : Number(String(value).trim());
      if (Number.isNaN(num)) return formatText(value);
      return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDecimals,
      }).format(num);
    },
    [formatText, isBlank],
  );

  // --- AÑOS DISPONIBLES ---
  const availableYears = useMemo(() => {
    const years = new Set();
    travels.forEach((t) => {
      const ym = toYearMonthKey(t.fecha_viaje);
      if (ym) years.add(ym.slice(0, 4));
    });
    years.add(String(new Date().getFullYear())); // asegurar año actual en opciones
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [travels]);

  // --- FORMATTEADORES ---
  const formatCurrency = useCallback((value) => {
    if (isBlank(value)) return '-';
    const num = typeof value === 'number' ? value : Number(String(value).trim());
    if (Number.isNaN(num)) return formatText(value);
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  }, [formatText, isBlank]);

  const withUnit = useCallback((formatted, unit) => {
    if (formatted === '-') return '-';
    return `${formatted} ${unit}`;
  }, []);

  const computeValorTotal = useCallback((row) => {
    const neto = row?.valor_neto ?? row?.precio_fijo ?? 0;
    const iva = row?.valor_iva ?? 0;
    const netoNum = Number(neto);
    const ivaNum = Number(iva);
    const total = (Number.isNaN(netoNum) ? 0 : netoNum) + (Number.isNaN(ivaNum) ? 0 : ivaNum);
    return total;
  }, []);

  const computeKmViaje = useCallback((row) => {
    const start = Number(row?.combustible_km);
    const end = Number(row?.combustible_km_fin);
    if (Number.isNaN(start) || Number.isNaN(end)) return null;
    return Math.max(0, end - start);
  }, []);

  const computeLitrosPorKm = useCallback((row) => {
    const km = computeKmViaje(row);
    const litros = Number(row?.combustible_litros);
    if (!km || km <= 0 || Number.isNaN(litros)) return null;
    return litros / km;
  }, [computeKmViaje]);

  const consumoStatus = useCallback((row) => {
    const lpk = computeLitrosPorKm(row);
    if (lpk === null) return { label: '-', tone: 'default' };
    if (lpk > 0.34) return { label: 'Exceso', tone: 'danger' };
    if (lpk > 0.32) return { label: 'Alto', tone: 'warn' };
    return { label: 'OK', tone: 'ok' };
  }, [computeLitrosPorKm]);

  const formatDate = (date) => {
    if (!date) return '-';
    // Si la fecha viene como 'YYYY-MM-DD', parseamos sin timezone
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      const [year, month, day] = date.split('-').map(n => parseInt(n, 10));
      return new Date(year, month - 1, day).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    const map = {
      'LIQUIDADO': '#d4edda', // Verde claro
      'PAGADO': '#d4edda',
      'COMPLETO': '#d4edda',
      'FACTURADO': '#cce5ff', // Azul claro
      'FALTA': '#f8d7da',     // Rojo claro
      'DEBEN': '#f8d7da',
      'INCOMPLETO': '#f8d7da',
      'PENDIENTE': '#fff3cd', // Amarillo claro
    };
    return map[status] || '#e2e3e5'; // Gris default
  };

  const normalizeHeaderFilterValue = useCallback((value) => (
    String(value ?? '')
      .trim()
      .toLocaleLowerCase('es-AR')
  ), []);

  const getHeaderFilterLabel = useCallback((travel, columnId) => {
    switch (columnId) {
      case 'fecha_viaje':
        return formatDate(travel?.fecha_viaje);
      case 'estado_viaje':
        return travel?.anulado ? 'ANULADO' : 'ACTIVO';
      case 'chofer':
        return formatTitleCase(`${travel?.driver_name || ''} ${travel?.driver_lastname || ''}`.trim());
      case 'company_name':
        return formatTitleCase(travel?.company_name);
      case 'chassis_domain':
        return formatDomain(travel?.chassis_domain);
      case 'coupled_domain':
        return formatDomain(travel?.coupled_domain);
      case 'origen':
        return formatTitleCase(travel?.origen);
      case 'destino':
        return formatTitleCase(travel?.destino);
      case 'estado_liquidacion':
        return formatText(travel?.estado_liquidacion);
      case 'estado_facturacion':
        return formatText(travel?.estado_facturacion);
      case 'estado_pago':
        return formatText(travel?.estado_pago);
      default:
        return formatText(travel?.[columnId]);
    }
  }, [formatDate, formatDomain, formatText, formatTitleCase]);

  const filteredTravels = useMemo(() => {
    const activeFilters = Object.entries(headerFilters).filter(([, values]) => Array.isArray(values) && values.length > 0);
    if (activeFilters.length === 0) return topLevelFilteredTravels;

    return topLevelFilteredTravels.filter((travel) => {
      const matchesAll = activeFilters.every(([columnId, values]) => {
        const rowLabel = getHeaderFilterLabel(travel, columnId);
        const currentValue = normalizeHeaderFilterValue(rowLabel);
        return values.includes(currentValue);
      });

      return matchesAll;
    });
  }, [topLevelFilteredTravels, headerFilters, getHeaderFilterLabel, normalizeHeaderFilterValue]);

  const currentHeaderFilterOptions = useMemo(() => {
    if (!filterPopover.columnId) return [];

    return uniqueSorted(
      topLevelFilteredTravels.map((travel) => getHeaderFilterLabel(travel, filterPopover.columnId)),
    ).map((label) => ({
      label,
      value: normalizeHeaderFilterValue(label),
    }));
  }, [topLevelFilteredTravels, uniqueSorted, getHeaderFilterLabel, normalizeHeaderFilterValue, filterPopover.columnId]);

  const openHeaderFilter = useCallback((event, columnId, label) => {
    event.stopPropagation();
    setFilterPopover({
      anchorEl: event.currentTarget,
      columnId,
      label,
      search: '',
      draftValues: Array.isArray(headerFilters[columnId]) ? [...headerFilters[columnId]] : [],
    });
  }, [headerFilters]);

  const closeHeaderFilter = useCallback(() => {
    setFilterPopover({
      anchorEl: null,
      columnId: '',
      label: '',
      search: '',
      draftValues: [],
    });
  }, []);

  const handleClearHeaderFilter = useCallback(() => {
    if (!filterPopover.columnId) return;
    setHeaderFilters((prev) => {
      const next = { ...prev };
      delete next[filterPopover.columnId];
      return next;
    });
    closeHeaderFilter();
  }, [closeHeaderFilter, filterPopover.columnId]);

  const handleApplyHeaderFilter = useCallback(() => {
    if (!filterPopover.columnId) return;
    setHeaderFilters((prev) => {
      let next;
      if (filterPopover.draftValues.length === 0) {
        next = { ...prev };
        delete next[filterPopover.columnId];
      } else {
        next = {
          ...prev,
          [filterPopover.columnId]: filterPopover.draftValues,
        };
      }
      return next;
    });
    closeHeaderFilter();
  }, [closeHeaderFilter, filterPopover.columnId, filterPopover.draftValues]);

  const renderHeaderWithFilter = useCallback((label, columnId) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <span>{label}</span>
      <IconButton
        size="small"
        onClick={(event) => openHeaderFilter(event, columnId, label)}
        sx={{
          color: Array.isArray(headerFilters[columnId]) && headerFilters[columnId].length > 0 ? brand.main : '#9ca3af',
          p: '2px',
        }}
      >
        <FilterAltOutlinedIcon fontSize="inherit" />
      </IconButton>
    </Box>
  ), [brand.main, headerFilters, openHeaderFilter]);

  const renderMultilineHeader = useCallback((lines) => (
    <Box
      sx={{
        whiteSpace: 'normal',
        lineHeight: 1.05,
        textAlign: 'center',
        fontWeight: 700,
      }}
    >
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </Box>
  ), []);

  const renderCenteredDash = useCallback(() => (
    <Box
      component="span"
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'center',
      }}
    >
      -
    </Box>
  ), []);

  const visibleHeaderFilterOptions = useMemo(() => {
    const options = currentHeaderFilterOptions;
    const search = filterPopover.search.trim().toLocaleLowerCase('es-AR');
    if (!search) return options;
    return options.filter((option) => option.label.toLocaleLowerCase('es-AR').includes(search));
  }, [currentHeaderFilterOptions, filterPopover.search]);

  const travelHasInvoiceData = useCallback((travel) => (
    String(travel?.estado_facturacion || '').toUpperCase() === 'FACTURADO' ||
    String(travel?.numero_factura || '').trim().length > 0 ||
    String(travel?.fecha_facturada || '').trim().length > 0 ||
    String(travel?.foto_factura || '').trim().length > 0
  ), []);

  const travelHasLiquidationData = useCallback((travel) => (
    String(travel?.estado_liquidacion || '').toUpperCase() === 'LIQUIDADO' ||
    String(travel?.carta_de_porte || '').trim().length > 0 ||
    String(travel?.archivo_factura_liquidado || '').trim().length > 0
  ), []);

  const travelHasPaymentData = useCallback((travel) => (
    String(travel?.estado_pago || '').toUpperCase() === 'PAGADO' ||
    String(travel?.orden_pago || '').trim().length > 0
  ), []);

  const summarizeTravels = useCallback((list) => (
    list
      .slice(0, 5)
      .map((item) => `${formatDate(item.fecha_viaje)} | ${formatTitleCase(item.company_name)} | ${formatTitleCase(item.origen)} -> ${formatTitleCase(item.destino)}`)
      .join('\n')
  ), [formatDate, formatTitleCase]);

  const getSelectedTravels = useCallback((table) => (
    table.getSelectedRowModel().rows.map((row) => row.original)
  ), []);

  const validateBulkSelection = useCallback(async (table, mode) => {
    const selectedTravels = getSelectedTravels(table);

    if (selectedTravels.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Sin viajes seleccionados',
        text: 'Seleccioná al menos un viaje para continuar.',
        confirmButtonColor: brand.main,
      });
      return null;
    }

    const annulled = selectedTravels.filter((item) => Boolean(item.anulado));
    if (annulled.length > 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Selección inválida',
        text: 'La selección incluye viajes anulados. Quitalos para continuar.',
        confirmButtonColor: brand.main,
      });
      return null;
    }

    const companyIds = Array.from(new Set(selectedTravels.map((item) => String(item.empresa_id ?? ''))));
    if (companyIds.length !== 1) {
      await Swal.fire({
        icon: 'warning',
        title: 'Selección inválida',
        text: 'La facturación, liquidación y pago masivo solo se puede aplicar a viajes de una misma empresa.',
        confirmButtonColor: brand.main,
      });
      return null;
    }

    let blocked = [];
    if (mode === 'invoice') {
      blocked = selectedTravels.filter((item) => travelHasInvoiceData(item));
    } else if (mode === 'liquidation') {
      blocked = selectedTravels.filter((item) => travelHasLiquidationData(item));
    } else if (mode === 'payment') {
      blocked = selectedTravels.filter((item) => travelHasPaymentData(item));
    }

    if (blocked.length > 0) {
      await Swal.fire({
        icon: 'warning',
        title:
          mode === 'invoice'
            ? 'Hay viajes ya facturados'
            : mode === 'liquidation'
              ? 'Hay viajes ya liquidados'
              : 'Hay viajes ya pagados',
        html:
          '<p>La selección incluye viajes que ya tienen datos cargados.</p>' +
          `<pre style="text-align:left;background:#f8fafc;padding:12px;border-radius:8px;max-height:220px;overflow:auto;">${summarizeTravels(blocked)}</pre>`,
        confirmButtonColor: brand.main,
      });
      return null;
    }

    return selectedTravels;
  }, [brand.main, getSelectedTravels, summarizeTravels, travelHasInvoiceData, travelHasLiquidationData, travelHasPaymentData]);

  const handleBulkInvoice = useCallback(async (table) => {
    const selectedTravels = await validateBulkSelection(table, 'invoice');
    if (!selectedTravels) return;

    const companyName = formatTitleCase(selectedTravels[0]?.company_name);

    const result = await Swal.fire({
      title: 'Facturar selección',
      html: `
        <div style="text-align:left;display:grid;gap:12px;">
          <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:12px;">
            <strong>Empresa:</strong> ${companyName || '-'}<br />
            <strong>Viajes seleccionados:</strong> ${selectedTravels.length}
          </div>
          <div>
            <label for="bulk-invoice-number" style="display:block;margin-bottom:6px;font-weight:600;">Número de factura</label>
            <input id="bulk-invoice-number" class="swal2-input" style="margin:0;width:100%;" placeholder="0001-00000000" />
          </div>
          <div>
            <label for="bulk-invoice-date" style="display:block;margin-bottom:6px;font-weight:600;">Fecha facturada</label>
            <input id="bulk-invoice-date" type="date" class="swal2-input" style="margin:0;width:100%;" />
          </div>
          <div>
            <label for="bulk-invoice-file" style="display:block;margin-bottom:6px;font-weight:600;">Archivo de factura</label>
            <input id="bulk-invoice-file" type="file" accept="image/*,application/pdf" class="swal2-file" style="margin:0;width:100%;" />
          </div>
        </div>
      `,
      width: 640,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Aplicar factura',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: brand.main,
      preConfirm: () => {
        const invoiceNumber = document.getElementById('bulk-invoice-number')?.value?.trim() || '';
        const invoiceDate = document.getElementById('bulk-invoice-date')?.value || '';
        const invoiceFile = document.getElementById('bulk-invoice-file')?.files?.[0] || null;

        if (!invoiceNumber || !invoiceDate) {
          Swal.showValidationMessage('Completá número de factura y fecha facturada.');
          return false;
        }

        return { invoiceNumber, invoiceDate, invoiceFile };
      },
    });

    if (!result.isConfirmed) return;

    const formData = new FormData();
    formData.append('ids', JSON.stringify(selectedTravels.map((item) => item.id)));
    formData.append('invoice_number', result.value.invoiceNumber);
    formData.append('invoice_date', result.value.invoiceDate);
    if (result.value.invoiceFile) {
      formData.append('invoice_photo', result.value.invoiceFile);
    }

    const success = await bulkUpdateTravelDocs(formData);
    if (success) {
      table.setRowSelection({});
    }
  }, [brand.main, bulkUpdateTravelDocs, formatTitleCase, validateBulkSelection]);

  const handleBulkLiquidation = useCallback(async (table) => {
    const selectedTravels = await validateBulkSelection(table, 'liquidation');
    if (!selectedTravels) return;

    const companyName = formatTitleCase(selectedTravels[0]?.company_name);

    const result = await Swal.fire({
      title: 'Liquidar selección',
      html: `
        <div style="text-align:left;display:grid;gap:12px;">
          <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;padding:12px;">
            <strong>Empresa:</strong> ${companyName || '-'}<br />
            <strong>Viajes seleccionados:</strong> ${selectedTravels.length}
          </div>
          <div>
            <label for="bulk-liquidation-cdp" style="display:block;margin-bottom:6px;font-weight:600;">Carta de porte</label>
            <input id="bulk-liquidation-cdp" class="swal2-input" style="margin:0;width:100%;" placeholder="Número de carta de porte" />
          </div>
          <div>
            <label for="bulk-liquidation-file" style="display:block;margin-bottom:6px;font-weight:600;">Archivo de liquidación</label>
            <input id="bulk-liquidation-file" type="file" accept="image/*,application/pdf" class="swal2-file" style="margin:0;width:100%;" />
          </div>
        </div>
      `,
      width: 640,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Aplicar liquidación',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: brand.main,
      preConfirm: () => {
        const cartaDePorte = document.getElementById('bulk-liquidation-cdp')?.value?.trim() || '';
        const liquidationFile = document.getElementById('bulk-liquidation-file')?.files?.[0] || null;

        if (!cartaDePorte) {
          Swal.showValidationMessage('Completá la carta de porte para continuar.');
          return false;
        }

        return { cartaDePorte, liquidationFile };
      },
    });

    if (!result.isConfirmed) return;

    const formData = new FormData();
    formData.append('ids', JSON.stringify(selectedTravels.map((item) => item.id)));
    formData.append('carta_de_porte', result.value.cartaDePorte);
    if (result.value.liquidationFile) {
      formData.append('archivo_factura_liquidado', result.value.liquidationFile);
    }

    const success = await bulkUpdateTravelDocs(formData);
    if (success) {
      table.setRowSelection({});
    }
  }, [brand.main, bulkUpdateTravelDocs, formatTitleCase, validateBulkSelection]);

  const handleBulkPayment = useCallback(async (table) => {
    const selectedTravels = await validateBulkSelection(table, 'payment');
    if (!selectedTravels) return;

    const companyName = formatTitleCase(selectedTravels[0]?.company_name);

    const result = await Swal.fire({
      title: 'Registrar pago',
      html: `
        <div style="text-align:left;display:grid;gap:12px;">
          <div style="background:#ecfdf5;border:1px solid #86efac;border-radius:10px;padding:12px;">
            <strong>Empresa:</strong> ${companyName || '-'}<br />
            <strong>Viajes seleccionados:</strong> ${selectedTravels.length}
          </div>
          <div>
            <label for="bulk-payment-order" style="display:block;margin-bottom:6px;font-weight:600;">Número de orden de pago</label>
            <input id="bulk-payment-order" class="swal2-input" style="margin:0;width:100%;" placeholder="Orden de pago" />
          </div>
        </div>
      `,
      width: 640,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Aplicar pago',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
      preConfirm: () => {
        const paymentOrder = document.getElementById('bulk-payment-order')?.value?.trim() || '';

        if (!paymentOrder) {
          Swal.showValidationMessage('Completá el número de orden de pago para continuar.');
          return false;
        }

        return { paymentOrder };
      },
    });

    if (!result.isConfirmed) return;

    const formData = new FormData();
    formData.append('ids', JSON.stringify(selectedTravels.map((item) => item.id)));
    formData.append('payment_order', result.value.paymentOrder);
    formData.append('payment_status', 'PAGADO');

    const success = await bulkUpdateTravelDocs(formData);
    if (success) {
      table.setRowSelection({});
    }
  }, [bulkUpdateTravelDocs, formatTitleCase, validateBulkSelection]);

  // --- DEFINICIÓN DE COLUMNAS ---
  const columns = useMemo(
    () => [
      {
        accessorKey: 'fecha_viaje',
        header: 'Fecha',
        Header: () => renderHeaderWithFilter('Fecha', 'fecha_viaje'),
        size: 100,
        Cell: ({ cell }) => formatDate(cell.getValue()),
      },
      {
        id: 'estado_viaje',
        header: 'Estado',
        Header: () => renderHeaderWithFilter('Estado', 'estado_viaje'),
        accessorFn: (row) => (row?.anulado ? 'ANULADO' : 'ACTIVO'),
        size: 100,
        Cell: ({ cell }) => formatText(cell.getValue()),
      },
      {
        id: 'chofer', // ID custom porque combinamos campos
        header: 'Chofer',
        Header: () => renderHeaderWithFilter('Chofer', 'chofer'),
        accessorFn: (row) => formatTitleCase(`${row.driver_name || ''} ${row.driver_lastname || ''}`.trim()),
        size: 100,
      },
      {
        id: 'company_name',
        header: 'Empresa',
        Header: () => renderHeaderWithFilter('Empresa', 'company_name'),
        accessorFn: (row) => formatTitleCase(row?.company_name),
        size: 100,
      },
      {
        id: 'chassis_domain',
        header: 'Chasis',
        Header: () => renderHeaderWithFilter('Chasis', 'chassis_domain'),
        accessorFn: (row) => formatDomain(row?.chassis_domain),
        size: 100,
      },
      {
        id: 'coupled_domain',
        header: 'Acoplado',
        Header: () => renderHeaderWithFilter('Acoplado', 'coupled_domain'),
        accessorFn: (row) => formatDomain(row?.coupled_domain),
        size: 100,
      },
      {
        id: 'origen',
        header: 'Origen',
        Header: () => renderHeaderWithFilter('Origen', 'origen'),
        accessorFn: (row) => formatTitleCase(row?.origen),
        size: 100,
      },
      {
        id: 'destino',
        header: 'Destino',
        Header: () => renderHeaderWithFilter('Destino', 'destino'),
        accessorFn: (row) => formatTitleCase(row?.destino),
        size: 100,
      },
      //Documentacion
      {
        accessorKey: 'remito',
        header: 'Remito',
        Header: () => renderHeaderWithFilter('Remito', 'remito'),
        accessorFn: (row) => formatText(row?.remito),
        size: 100,
      },
      {
        accessorKey: 'hoja_ruta',
        header: 'Hoja de Ruta',
        Header: () => renderHeaderWithFilter('Hoja de Ruta', 'hoja_ruta'),
        accessorFn: (row) => formatText(row?.hoja_ruta),
        size: 100,
      },
      {
        accessorKey: 'numero_proforma',
        header: 'Proforma',
        Header: () => renderHeaderWithFilter('Proforma', 'numero_proforma'),
        accessorFn: (row) => formatText(row?.numero_proforma),
        size: 100
      },
      {
        accessorKey: 'especiales',
        header: 'Especiales',
        size: 100
      },
      {
        accessorKey: 'tarifa_valor',
        header: 'Tarifa',
        Header: () => renderHeaderWithFilter('Tarifa', 'tarifa_valor'),
        accessorFn: (row) => formatCurrency(row?.tarifa_valor),
        size: 100,
        Cell: ({ cell }) => formatCurrency(cell.getValue()),
      },
      {
        accessorKey: 'precio_fijo',
        header: 'Precio Fijo',
        size: 100,
        Cell: ({ cell }) => formatCurrency(cell.getValue()),
      },
      {
        accessorKey: 'adelanto_monto',
        header: 'Adelanto',
        size: 100,
        Cell: ({ cell }) => formatCurrency(cell.getValue()),
      },
      {
        id: 'adelanto_metodo',
        header: 'Método Adelanto',
        Header: () => renderMultilineHeader(['Método', 'Adelanto']),
        size: 100,
        accessorFn: (row) => formatTitleCase(row?.adelanto_metodo),
      },
      {
        id: 'adelanto_responsable',
        header: 'Responsable Adelanto',
        Header: () => renderMultilineHeader(['Responsable', 'Adelanto']),
        size: 100,
        accessorFn: (row) => formatTitleCase(row?.adelanto_responsable),
      },
      {
        id: 'estacion_nombre',
        header: 'Estación Combustible',
        Header: () => renderMultilineHeader(['Estación', 'Combustible']),
        size: 100,
        accessorFn: (row) => formatTitleCase(row?.estacion_nombre),
      },
      {
        accessorKey: 'combustible_litros',
        header: 'Litros',
        size: 100,
        Cell: ({ cell }) => formatNumberEs(cell.getValue(), { maxDecimals: 2 }),
      },
      {
        accessorKey: 'combustible_monto',
        header: 'Monto Combustible',
        Header: () => renderMultilineHeader(['Monto', 'Combustible']),
        size: 100,
        Cell: ({ cell }) => formatCurrency(cell.getValue()),
      },
      {
        accessorKey: 'combustible_km',
        header: 'KM al Cargar',
        size: 100,
        Cell: ({ cell }) => formatNumberEs(cell.getValue(), { maxDecimals: 2 }),
      },
      {
        accessorKey: 'combustible_km_fin',
        header: 'KM al Llegar',
        size: 100,
        Cell: ({ cell }) => formatNumberEs(cell.getValue(), { maxDecimals: 2 }),
      },
      {
        id: 'km_viaje',
        header: 'KM Viaje',
        size: 100,
        accessorFn: (row) => computeKmViaje(row),
        Cell: ({ cell }) => formatNumberEs(cell.getValue(), { maxDecimals: 2 }),
      },
      {
        id: 'lpk',
        header: 'Consumo',
        size: 90,
        accessorFn: (row) => computeLitrosPorKm(row),
        Cell: ({ cell }) => formatNumberEs(cell.getValue(), { maxDecimals: 3 }),
      },
      {
        id: 'consumo_status',
        header: 'Consumo',
        size: 100,
        accessorFn: (row) => consumoStatus(row).label,
        Cell: ({ row }) => {
          const s = consumoStatus(row.original);
          const bg = s.tone === 'danger' ? '#f8d7da' : s.tone === 'warn' ? '#fff3cd' : s.tone === 'ok' ? '#d4edda' : '#e2e3e5';
          return (
            <Box
              component="span"
              sx={{
                backgroundColor: bg,
                borderRadius: '0.25rem',
                color: '#000',
                p: '0.25rem',
                fontWeight: 'bold',
                fontSize: '0.8rem'
              }}
            >
              {s.label}
            </Box>
          );
        },
      },
      {
        accessorKey: 'foto_factura_combustible',
        header: 'Fact. Comb.',
        size: 100,
        Cell: ({ cell }) =>
          cell.getValue() ? (
            <a href={cell.getValue()} target="_blank" rel="noopener noreferrer">
              <ViewIcon />
            </a>
          ) : (
            renderCenteredDash()
          ),
      },
      {
        accessorKey: 'foto_factura',
        header: 'Factura',
        size: 100,
        Cell: ({ cell }) =>
          cell.getValue() ? (
            <a href={cell.getValue()} target="_blank" rel="noopener noreferrer">
              <ViewIcon />
            </a>
          ) : (
            renderCenteredDash()
          ),
      },
      {
        accessorKey: 'orden_pago',
        header: 'N° Orden Pago',
        size: 100,
      },
      {
        header: 'Métricas',
        columns: [
          {
            accessorKey: 'cantidad_cargada',
            header: 'Carg (TN)',
            size: 100,
            Cell: ({ cell }) => withUnit(formatNumberEs(cell.getValue(), { maxDecimals: 2 }), 'TN'),
          },
          {
            accessorKey: 'cantidad_descargada',
            header: 'Desc. (TN)',
            size: 100,
            Cell: ({ cell }) => withUnit(formatNumberEs(cell.getValue(), { maxDecimals: 2 }), 'TN'),
          },
        ]
      },
      // Agrupamos valores económicos
      {
        header: 'Economía',
        columns: [
          {
            accessorKey: 'valor_neto',
            header: 'Neto',
            size: 100,
            Cell: ({ cell }) => (
              <span style={{ fontWeight: 'bold' }}>{formatCurrency(cell.getValue())}</span>
            ),
          },
          {
            accessorKey: 'valor_iva',
            header: 'IVA',
            size: 100,
            Cell: ({ cell }) => formatCurrency(cell.getValue()),
          },
          {
            id: 'valor_total',
            header: 'Total',
            size: 100,
            accessorFn: (row) => computeValorTotal(row),
            Cell: ({ cell }) => (
              <span style={{ fontWeight: 'bold' }}>{formatCurrency(cell.getValue())}</span>
            ),
          },
        ]
      },
      {
        accessorKey: 'numero_factura',
        header: 'N° Factura',
        size: 100,
      },
      {
        accessorKey: 'carta_de_porte',
        header: 'Carta de Porte',
        Header: () => renderMultilineHeader(['Carta de', 'Porte']),
        size: 100,
      },
      {
        accessorKey: 'archivo_factura_liquidado',
        header: 'Liquidación',
        size: 100,
        Cell: ({ cell }) =>
          cell.getValue() ? (
            <a href={cell.getValue()} target="_blank" rel="noopener noreferrer">
              <ViewIcon />
            </a>
          ) : (
            renderCenteredDash()
          ),
      },
      {
        accessorKey: 'factura_combustible',
        header: 'Factura combustible',
        Header: () => renderMultilineHeader(['Factura', 'Combustible']),
        size: 100,
      },
      // Estados con Badges
      {
        accessorKey: 'estado_liquidacion',
        header: 'Liquidación',
        Header: () => renderHeaderWithFilter('Liquidación', 'estado_liquidacion'),
        size: 100,
        Cell: ({ cell }) => (
          <Box
            component="span"
            sx={{
              backgroundColor: getStatusColor(cell.getValue()),
              borderRadius: '0.25rem',
              color: '#000',
              p: '0.25rem',
              fontWeight: 'bold',
              fontSize: '0.8rem'
            }}
          >
            {cell.getValue()}
          </Box>
        ),
      },
      {
        accessorKey: 'estado_facturacion',
        header: 'Facturación',
        Header: () => renderHeaderWithFilter('Facturación', 'estado_facturacion'),
        size: 110,
        Cell: ({ cell }) => (
          <Box
            component="span"
            sx={{
              backgroundColor: getStatusColor(cell.getValue()),
              borderRadius: '0.25rem',
              color: '#000',
              p: '0.25rem',
              fontWeight: 'bold',
              fontSize: '0.8rem'
            }}
          >
            {cell.getValue()}
          </Box>
        ),
      },
      {
        accessorKey: 'estado_pago',
        header: 'Pago',
        Header: () => renderHeaderWithFilter('Pago', 'estado_pago'),
        size: 110,
        Cell: ({ cell }) => (
          <Box
            component="span"
            sx={{
              backgroundColor: getStatusColor(cell.getValue()),
              borderRadius: '0.25rem',
              color: '#000',
              p: '0.25rem',
              fontWeight: 'bold',
              fontSize: '0.8rem'
            }}
          >
            {cell.getValue()}
          </Box>
        ),
      },
      {
        accessorKey: 'estado_general',
        header: 'Estado Gral',
        size: 100,
        Cell: ({ cell }) => (
          <Box
            component="span"
            sx={{
              backgroundColor: getStatusColor(cell.getValue()),
              borderRadius: '0.25rem',
              color: '#000',
              p: '0.25rem',
              fontWeight: 'bold',
              fontSize: '0.8rem'
            }}
          >
            {cell.getValue()}
          </Box>
        ),
      },
    ],
    [formatCurrency, formatDomain, formatNumberEs, formatText, formatTitleCase, renderCenteredDash, renderHeaderWithFilter, renderMultilineHeader, withUnit],
  );

  // --- EXPORTAR A PDF ---
  const handleExportRows = (rows) => {
    const doc = new jsPDF('landscape'); // Horizontal para que quepan columnas
    const tableData = rows.map((row) => {
      const r = row.original;
      // Mapeamos los datos crudos a formato legible para el PDF
      return [
        formatDate(r.fecha_viaje),
        formatTitleCase(`${r.driver_name || ''} ${r.driver_lastname || ''}`.trim()),
        formatTitleCase(r.company_name),
        formatTitleCase(r.origen),
        formatTitleCase(r.destino),
        r.cantidad_descargada,
        formatCurrency(r.valor_neto),
        r.numero_factura,
        r.estado_pago
      ];
    });

    // Encabezados del PDF (Simplificados para que entren)
    const tableHeaders = ['Fecha', 'Chofer', 'Empresa', 'Origen', 'Destino', 'TN Desc', 'Neto', 'Factura', 'Pago'];

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
    });

    doc.save(`viajes_export_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const isExportMenuOpen = Boolean(exportMenuAnchorEl);

  // --- CONFIGURACIÓN DE LA TABLA ---
  const table = useMaterialReactTable({
    columns,
    data: filteredTravels, // Usar datos filtrados
    state: { isLoading: loading },
    localization: MRT_Localization_ES, // Español
    enableRowSelection: true, // Checkboxes para seleccionar
    defaultColumn: {
      Cell: ({ cell }) => {
        const formatted = formatText(cell.getValue());
        return formatted === '-' ? renderCenteredDash() : formatted;
      },
    },
    enableColumnFilters: false,
    autoResetPageIndex: false,
    enableSorting: false,
    enableColumnOrdering: false,
    paginationDisplayMode: 'pages',
    positionToolbarAlertBanner: 'bottom',
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    muiTablePaperProps: {
      sx: {
        borderRadius: 3,
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      },
    },
    muiTopToolbarProps: {
      sx: {
        backgroundColor: '#fff',
        borderBottom: '1px solid #e5e7eb',
      },
    },
    muiBottomToolbarProps: {
      sx: {
        backgroundColor: '#fff',
        borderTop: '1px solid #e5e7eb',
      },
    },
    renderBottomToolbarCustomActions: ({ table }) => {
      const selectedRows = table.getSelectedRowModel().rows;
      const filteredRows = table.getFilteredRowModel().rows;

      const selectedTotal = selectedRows.reduce((sum, row) => sum + computeValorTotal(row.original), 0);
      const filteredTotal = filteredRows.reduce((sum, row) => sum + computeValorTotal(row.original), 0);

      return (
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', px: 2, py: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 700, color: '#374151' }}>
            Total tabla: {formatCurrency(filteredTotal)}
          </Typography>
          <Typography sx={{ fontWeight: 700, color: '#FF9020' }}>
            Total selección: {formatCurrency(selectedTotal)}
          </Typography>
        </Box>
      );
    },
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: '#fafafa',
        fontWeight: 700,
        color: '#6b7280',
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        letterSpacing: '0.03em',
        borderBottom: '1px solid #e5e7eb',
      },
    },
    muiTableBodyRowProps: {
      sx: {
        '&:hover td': { backgroundColor: '#f6f8ff' },
      },
    },

    // Habilitar acciones por fila (Editar/Borrar)
    enableRowActions: true,
    positionActionsColumn: 'last',
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: '0.5rem' }}>
        <Tooltip title="Editar">
          <IconButton onClick={() => handleEdit(row)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        {!row.original.anulado ? (
          <Tooltip title="Anular">
            <IconButton color="warning" onClick={() => handleCancel(row)}>
              <BlockIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Restaurar">
            <IconButton color="primary" onClick={() => handleRestore(row)}>
              <RestoreIcon />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Eliminar permanente">
          <IconButton color="error" onClick={() => handleDelete(row)}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    ),

    // Botones de la barra superior (Nuevo Viaje + Filtros Año/Mes + Exportar)
    renderTopToolbarCustomActions: ({ table }) => (
      <Box sx={{ display: 'flex', gap: 2, p: 1, alignItems: 'center', flexWrap: 'wrap' }} className="no-print">
        <Button
          color="primary"
          onClick={handleNew}
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            backgroundColor: brand.main,
            '&:hover': { backgroundColor: brand.hover },
            fontWeight: 700,
          }}
        >
          Nuevo Viaje
        </Button>
        <Button
          variant="outlined"
          onClick={async () => {
            const next = !includeAnnulled;
            setIncludeAnnulled(next);
            await getTravels({ includeAnnulled: next });
          }}
          sx={{
            borderColor: brand.border,
            color: brand.main,
            fontWeight: 700,
            '&:hover': { borderColor: brand.border, backgroundColor: 'rgba(255, 144, 32, 0.08)' },
          }}
        >
          {includeAnnulled ? 'Ocultar anulados' : 'Mostrar anulados'}
        </Button>
        {/* Filtro de Año */}
        <FormControl sx={{ minWidth: 90 }} size="small">
          <Select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            displayEmpty
          >
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* Filtro de Mes */}
        <FormControl sx={{ minWidth: 120 }} size="small">
          <Select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            displayEmpty
          >
            <MenuItem value="">Mes: Todos</MenuItem>
            {monthNames.map((name, idx) => {
              const val = String(idx + 1).padStart(2, '0');
              return (
                <MenuItem key={val} value={val}>
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        <TextField
          type="date"
          size="small"
          label="Desde"
          value={dateFromFilter}
          onChange={(e) => setDateFromFilter(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 140 }}
        />

        <TextField
          type="date"
          size="small"
          label="Hasta"
          value={dateToFilter}
          onChange={(e) => setDateToFilter(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 140 }}
        />

        {(dateFromFilter || dateToFilter) && (
          <Button
            variant="text"
            onClick={() => {
              setDateFromFilter('');
              setDateToFilter('');
            }}
            sx={{
              color: '#6b7280',
              fontWeight: 700,
              '&:hover': { backgroundColor: 'rgba(107, 114, 128, 0.08)' },
            }}
          >
            Limpiar fechas
          </Button>
        )}

        <Button
          variant="outlined"
          onClick={() => handleBulkInvoice(table)}
          disabled={table.getSelectedRowModel().rows.length === 0}
          sx={{
            borderColor: brand.border,
            color: brand.main,
            fontWeight: 700,
            '&:hover': { borderColor: brand.border, backgroundColor: 'rgba(255, 144, 32, 0.08)' },
          }}
        >
          Facturar
        </Button>

        <Button
          variant="outlined"
          onClick={() => handleBulkLiquidation(table)}
          disabled={table.getSelectedRowModel().rows.length === 0}
          sx={{
            borderColor: '#60a5fa',
            color: '#2563eb',
            fontWeight: 700,
            '&:hover': { borderColor: '#60a5fa', backgroundColor: 'rgba(37, 99, 235, 0.08)' },
          }}
        >
          Liquidar
        </Button>

        <Button
          variant="outlined"
          onClick={() => handleBulkPayment(table)}
          disabled={table.getSelectedRowModel().rows.length === 0}
          sx={{
            borderColor: '#86efac',
            color: '#15803d',
            fontWeight: 700,
            '&:hover': { borderColor: '#86efac', backgroundColor: 'rgba(21, 128, 61, 0.08)' },
          }}
        >
          Pago
        </Button>

        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={(e) => setExportMenuAnchorEl(e.currentTarget)}
          disabled={table.getPrePaginationRowModel().rows.length === 0}
          sx={{
            borderColor: brand.border,
            color: brand.main,
            fontWeight: 700,
            '&:hover': { borderColor: brand.border, backgroundColor: 'rgba(255, 144, 32, 0.08)' },
          }}
        >
          Exportar
        </Button>
        <Menu
          anchorEl={exportMenuAnchorEl}
          open={isExportMenuOpen}
          onClose={() => setExportMenuAnchorEl(null)}
        >
          <MenuItem
            onClick={() => {
              setExportMenuAnchorEl(null);
              handleExportRows(table.getPrePaginationRowModel().rows);
            }}
          >
            <ListItemIcon>
              <FileDownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Todo (según filtros)</ListItemText>
          </MenuItem>
          <MenuItem
            disabled={!table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()}
            onClick={() => {
              setExportMenuAnchorEl(null);
              handleExportRows(table.getSelectedRowModel().rows);
            }}
          >
            <ListItemIcon>
              <FileDownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Selección</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    ),

    // Estilos iniciales (Ocultar columnas menos relevantes por defecto si quieres)
    initialState: {
      columnVisibility: {
        // 'coupled_domain': false, // Ejemplo: ocultar acoplado por defecto
        // 'valor_iva': false 
      },
      density: 'compact', // Tabla compacta por defecto
    }
  });

  const isHeaderFilterOpen = Boolean(filterPopover.anchorEl);

  return (
    <div className="travel-layout">
      <Navbar />
      <div className="travel-container">
        <div className="travel-header">
            <h1>
              <span className="travel-title-icon" aria-hidden="true">🚚</span> Viajes Registrados
            </h1>
        </div>

        {/* Renderizar la Tabla de Material */}
        <MaterialReactTable table={table} />

        <Popper
          open={isHeaderFilterOpen}
          anchorEl={filterPopover.anchorEl}
          placement="bottom-start"
          sx={{ zIndex: 1400 }}
        >
          <ClickAwayListener onClickAway={closeHeaderFilter}>
            <Paper
              elevation={0}
              sx={{
                mt: 1,
                width: 270,
                borderRadius: 3,
                border: '1px solid #e5e7eb',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14)',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ p: 2, display: 'grid', gap: 1.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.90rem', color: '#374151' }}>
                  FILTRO
                </Typography>

                <TextField
                  size="small"
                  placeholder="Buscar opción..."
                  value={filterPopover.search}
                  onChange={(e) =>
                    setFilterPopover((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                  sx={{
                    '& .MuiInputBase-root': {
                      height: 34,
                      fontSize: '0.9rem',
                    },
                    '& .MuiInputBase-input': {
                      py: 0.5,
                    },
                  }}
                />


                <Box
                  sx={{
                    maxHeight: 260,
                    overflowY: 'auto',
                    display: 'grid',
                    gap: 0.75,
                    pr: 0.5,
                  }}
                >
                  {visibleHeaderFilterOptions.map((option) => {
                    const checked = filterPopover.draftValues.includes(option.value);
                    const toggleOption = () =>
                      setFilterPopover((prev) => {
                        const isChecked = prev.draftValues.includes(option.value);
                        const nextDraftValues = isChecked
                          ? prev.draftValues.filter((value) => value !== option.value)
                          : [...prev.draftValues, option.value];
                        return {
                          ...prev,
                          draftValues: nextDraftValues,
                        };
                      });
                    return (
                      <Box
                        key={option.value}
                        onClick={toggleOption}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1,
                          cursor: 'pointer',
                          borderRadius: 2,
                          px: 0.5,
                          py: 0.25,
                          '&:hover': { backgroundColor: '#f8fafc' },
                        }}
                      >
                        <Checkbox
                          checked={checked}
                          size="small"
                          onClick={(event) => event.stopPropagation()}
                          onChange={toggleOption}
                          sx={{
                            p: '2px',
                            mt: '2px',
                            '& .MuiSvgIcon-root': {
                              fontSize: 18,
                            },
                          }}
                        />
                        <Typography sx={{ fontWeight: 500, color: '#4b5563', fontSize: '0.90rem' }}>
                          {option.label}
                        </Typography>
                      </Box>
                    );
                  })}

                  {visibleHeaderFilterOptions.length === 0 && (
                    <Typography sx={{ color: '#9ca3af', fontSize: '0.95rem' }}>
                      No hay opciones para mostrar.
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    variant="text"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleClearHeaderFilter();
                    }}
                    sx={{ color: '#6b7280', fontWeight: 700, fontSize: '0.80rem' }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="contained"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleApplyHeaderFilter();
                    }}
                    sx={{
                      backgroundColor: '#FF9020',
                      fontWeight: 800,
                      fontSize: '0.80rem',
                      '&:hover': { backgroundColor: '#FF9020' },
                    }}Empresa
                  >
                    Apply
                  </Button>
                </Box>
              </Box>
            </Paper>
          </ClickAwayListener>
        </Popper>

        {/* Mantener tu Modal original */}
        <TravelFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          travel={selectedTravel}
        />

      </div>
    </div>
  );
};

export default Travel;
