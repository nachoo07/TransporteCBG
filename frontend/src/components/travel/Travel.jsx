import React, { useState, useMemo, useCallback } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon, FileDownload as FileDownloadIcon, Add as AddIcon, Block as BlockIcon, Restore as RestoreIcon } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MRT_Localization_ES } from 'material-react-table/locales/es'; // Idioma español
import Swal from 'sweetalert2';

import Navbar from '../navbar/Navbar';
import { useTravel } from '../../context/travel/TravelContext';
import TravelFormModal from '../travelFormModal/TravelFormModal';
import './travel.css'; // Puedes mantenerlo para estilos generales del layout

const Travel = () => {
  const { travels, loading, getTravels, deleteTravel, cancelTravel, restoreTravel, includeAnnulled, setIncludeAnnulled } = useTravel();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [monthFilter, setMonthFilter] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0')); // por defecto mes actual
  const [yearFilter, setYearFilter] = useState(() => String(new Date().getFullYear())); // por defecto año actual
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState(null);
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

  const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  // --- FILTRADO POR MES/AÑO ---
  const filteredTravels = useMemo(() => {
    return travels.filter((travel) => {
      const ym = toYearMonthKey(travel.fecha_viaje);
      if (!ym) return false;
      const [y, m] = ym.split('-');
      if (yearFilter && y !== yearFilter) return false;
      if (monthFilter && m !== monthFilter) return false;
      return true;
    });
  }, [travels, monthFilter, yearFilter]);

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

  // --- OPCIONES PARA FILTROS DE COLUMNA (SELECTS) ---
  const columnFilterOptions = useMemo(() => {
    const list = Array.isArray(filteredTravels) ? filteredTravels : [];

    return {
      choferes: uniqueSorted(
        list.map((t) => formatTitleCase(`${t?.driver_name || ''} ${t?.driver_lastname || ''}`.trim())),
      ),
      empresas: uniqueSorted(list.map((t) => formatTitleCase(t?.company_name))),
      chasis: uniqueSorted(list.map((t) => formatDomain(t?.chassis_domain))),
      acoplados: uniqueSorted(list.map((t) => formatDomain(t?.coupled_domain))),
      origenes: uniqueSorted(list.map((t) => formatTitleCase(t?.origen))),
      destinos: uniqueSorted(list.map((t) => formatTitleCase(t?.destino))),
      estadosLiquidacion: uniqueSorted(list.map((t) => t?.estado_liquidacion)),
      estadosFacturacion: uniqueSorted(list.map((t) => t?.estado_facturacion)),
      estadosPago: uniqueSorted(list.map((t) => t?.estado_pago)),
      estadosGenerales: uniqueSorted(list.map((t) => t?.estado_general)),
      metodosAdelanto: uniqueSorted(list.map((t) => t?.adelanto_metodo)),
      responsablesAdelanto: uniqueSorted(list.map((t) => t?.adelanto_responsable)),
      estaciones: uniqueSorted(list.map((t) => formatTitleCase(t?.estacion_nombre))),
    };
  }, [filteredTravels, uniqueSorted, formatDomain, formatTitleCase]);

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

  // --- DEFINICIÓN DE COLUMNAS ---
  const columns = useMemo(
    () => [
      {
        accessorKey: 'fecha_viaje',
        header: 'Fecha',
        size: 100,
        Cell: ({ cell }) => formatDate(cell.getValue()),
      },
      {
        id: 'estado_viaje',
        header: 'Estado',
        accessorFn: (row) => (row?.anulado ? 'ANULADO' : 'ACTIVO'),
        size: 100,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: ['ACTIVO', 'ANULADO'],
        Cell: ({ cell }) => formatText(cell.getValue()),
      },
      {
        id: 'chofer', // ID custom porque combinamos campos
        header: 'Chofer',
        accessorFn: (row) => formatTitleCase(`${row.driver_name || ''} ${row.driver_lastname || ''}`.trim()),
        size: 100,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.choferes,
      },
      {
        id: 'company_name',
        header: 'Empresa',
        accessorFn: (row) => formatTitleCase(row?.company_name),
        size: 100,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.empresas,
      },
      {
        id: 'chassis_domain',
        header: 'Chasis',
        accessorFn: (row) => formatDomain(row?.chassis_domain),
        size: 100,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.chasis,
      },
      {
        id: 'coupled_domain',
        header: 'Acoplado',
        accessorFn: (row) => formatDomain(row?.coupled_domain),
        size: 100,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.acoplados,
      },
      {
        id: 'origen',
        header: 'Origen',
        accessorFn: (row) => formatTitleCase(row?.origen),
        size: 100,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.origenes,
      },
      {
        id: 'destino',
        header: 'Destino',
        accessorFn: (row) => formatTitleCase(row?.destino),
        size: 100,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.destinos,
      },
      //Documentacion
      {
        accessorKey: 'remito',
        header: 'Remito',
        size: 120,
      },
      {
        accessorKey: 'hoja_ruta',
        header: 'Hoja de Ruta',
        size: 120, 
      },
      {
        accessorKey: 'numero_proforma',
        header: 'Proforma',
        size: 120
      },
      {
        accessorKey: 'especiales',
        header: 'Especiales',
        size: 100
      },
      {
        accessorKey: 'tarifa_valor',
        header: 'Tarifa',
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
        size: 180,
        accessorFn: (row) => formatTitleCase(row?.adelanto_metodo),
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.metodosAdelanto,
      },
      {
        id: 'adelanto_responsable',
        header: 'Responsable Adelanto',
        size: 180,
        accessorFn: (row) => formatTitleCase(row?.adelanto_responsable),
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.responsablesAdelanto,
      },
      {
        id: 'estacion_nombre',
        header: 'Estación Combustible',
        size: 180,
        accessorFn: (row) => formatTitleCase(row?.estacion_nombre),
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.estaciones,
      },
      {
        accessorKey: 'combustible_litros',
        header: 'Litros (L)',
        size: 150,
        Cell: ({ cell }) => withUnit(formatNumberEs(cell.getValue(), { maxDecimals: 2 }), 'L'),
      },
      {
        accessorKey: 'combustible_monto',
        header: 'Monto Combustible',
        size: 100,
        Cell: ({ cell }) => formatCurrency(cell.getValue()),
      },
      {
        accessorKey: 'combustible_km',
        header: 'KM al Cargar (Km)',
        size: 120,
        Cell: ({ cell }) => withUnit(formatNumberEs(cell.getValue(), { maxDecimals: 0 }), 'Km'),
      },
      {
        accessorKey: 'combustible_km_fin',
        header: 'KM al Llegar (Km)',
        size: 120,
        Cell: ({ cell }) => withUnit(formatNumberEs(cell.getValue(), { maxDecimals: 0 }), 'Km'),
      },
      {
        id: 'km_viaje',
        header: 'KM Viaje (Km)',
        size: 110,
        accessorFn: (row) => computeKmViaje(row),
        Cell: ({ cell }) => withUnit(formatNumberEs(cell.getValue(), { maxDecimals: 1 }), 'Km'),
      },
      {
        id: 'lpk',
        header: 'L/KM (L/Km)',
        size: 90,
        accessorFn: (row) => computeLitrosPorKm(row),
        Cell: ({ cell }) => withUnit(formatNumberEs(cell.getValue(), { maxDecimals: 3 }), 'L/Km'),
      },
      {
        id: 'consumo_status',
        header: 'Consumo',
        size: 110,
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
        header: 'Foto Fact. Comb.',
        size: 130,
        Cell: ({ cell }) =>
          cell.getValue() ? (
            <a href={cell.getValue()} target="_blank" rel="noopener noreferrer">
              <ViewIcon />
            </a>
          ) : (
            '-'
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
            '-'
          ),
      },
      {
        accessorKey: 'orden_pago',
        header: 'N° Orden Pago',
        size: 120,
      },
      {
        header: 'Métricas',
        columns: [
            {
                accessorKey: 'cantidad_cargada',
                header: 'Cargado (TN)',
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
                size: 120,
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
                size: 120,
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
        size: 120,
      },
      {
        accessorKey: 'carta_de_porte',
        header: 'Carta de Porte',
        size: 140,
      },
      {
        accessorKey: 'archivo_factura_liquidado',
        header: 'Liquidación',
        size: 140,
        Cell: ({ cell }) =>
          cell.getValue() ? (
            <a href={cell.getValue()} target="_blank" rel="noopener noreferrer">
              <ViewIcon />
            </a>
          ) : (
            '-'
          ),
      },
      {
        accessorKey: 'factura_combustible',
        header: 'Factura combustible',
        size: 150,  
      },
      // Estados con Badges
      {
        accessorKey: 'estado_liquidacion',
        header: 'Liquidación',
        size: 110,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.estadosLiquidacion,
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
        size: 110,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.estadosFacturacion,
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
        size: 110,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.estadosPago,
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
        size: 120,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.estadosGenerales,
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
    [columnFilterOptions, formatCurrency, formatDomain, formatNumberEs, formatText, formatTitleCase, withUnit],
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
      Cell: ({ cell }) => formatText(cell.getValue()),
    },
    columnFilterDisplayMode: 'popover',
    paginationDisplayMode: 'pages',
    positionToolbarAlertBanner: 'bottom',
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    muiFilterTextFieldProps: {
      variant: 'outlined',
      size: 'small',
      SelectProps: { defaultOpen: true },
    },
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
      <Box sx={{ display: 'flex', gap: 2, p: 1, alignItems: 'center', flexWrap: 'wrap' }}>
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
        <FormControl sx={{ minWidth: 140 }} size="small">
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
        <FormControl sx={{ minWidth: 160 }} size="small">
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

  return (
    <div className="travel-layout">
      <Navbar />
      <div className="travel-container">
        <div className="travel-header">
          <div>
            <h1>
              <span className="travel-title-icon" aria-hidden="true">🚚</span> Viajes Registrados
            </h1>
            <p>Gestión avanzada de viajes</p>
          </div>
        </div>
        
        {/* Renderizar la Tabla de Material */}
        <MaterialReactTable table={table} />

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
