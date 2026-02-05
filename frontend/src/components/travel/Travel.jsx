import React, { useState, useEffect, useMemo } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import { Box, Button, IconButton, Tooltip, Select, MenuItem, FormControl } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon, FileDownload as FileDownloadIcon, Add as AddIcon } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MRT_Localization_ES } from 'material-react-table/locales/es'; // Idioma español

import Navbar from '../navbar/Navbar';
import { useTravel } from '../../context/travel/TravelContext';
import TravelFormModal from '../travelFormModal/TravelFormModal';
import './travel.css'; // Puedes mantenerlo para estilos generales del layout

const Travel = () => {
  const { travels, loading, getTravels, deleteTravel } = useTravel();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [monthFilter, setMonthFilter] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0')); // por defecto mes actual
  const [yearFilter, setYearFilter] = useState(() => String(new Date().getFullYear())); // por defecto año actual

  useEffect(() => {
    getTravels();
  }, [getTravels]);

  // --- HANDLERS (CRUD) ---
  const handleDelete = async (row) => {
    // MRT devuelve la fila completa, accedemos al original
    await deleteTravel(row.original.id);
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
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    // Si la fecha viene como 'YYYY-MM-DD', parseamos sin timezone
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      const [year, month, day] = date.split('-').map(n => parseInt(n, 10));
      return new Date(year, month - 1, day).toLocaleDateString('es-AR');
    }
    return new Date(date).toLocaleDateString('es-AR');
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
        id: 'chofer', // ID custom porque combinamos campos
        header: 'Chofer',
        accessorFn: (row) => `${row.driver_name || ''} ${row.driver_lastname || ''}`.trim(),
        size: 100,
      },
      {
        accessorKey: 'company_name',
        header: 'Empresa',
        size: 100,
      },
      {
        accessorKey: 'chassis_domain',
        header: 'Chasis',
        size: 100,
      },
      {
        accessorKey: 'coupled_domain',
        header: 'Acoplado',
        size: 100,
      },
      {
        accessorKey: 'origen',
        header: 'Origen',
        size: 120,
      },
      {
        accessorKey: 'destino',
        header: 'Destino',
        size: 120,
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
        size: 100, 
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
        size: 120
      },
      {
        accessorKey: 'precio_fijo',
        header: 'Precio Fijo',
        size: 120
      },
      {
        accessorKey: 'adelanto_monto',
        header: 'Adelanto',
        size: 120,
        Cell: ({ cell }) => formatCurrency(cell.getValue()),
      },
      {
        accessorKey: 'adelanto_metodo',
        header: 'Método Adelanto',
        size: 150,
      },
      {
        accessorKey: 'adelanto_responsable',
        header: 'Responsable Adelanto',
        size: 180,
      },
      {
        accessorKey: 'estacion_nombre',
        header: 'Estación Combustible',
        size: 180,
      },
      {
        accessorKey: 'combustible_litros',
        header: 'Litros Combustible',
        size: 150,
      },
      {
        accessorKey: 'combustible_monto',
        header: 'Monto Combustible',
        size: 150,
        Cell: ({ cell }) => formatCurrency(cell.getValue()),
      },
      {
        accessorKey: 'combustible_km',
        header: 'KM al Cargar',
        size: 120,
      },
      {
        accessorKey: 'foto_factura',
        header: 'Foto Factura',
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
        accessorKey: 'Combustible gastado',
        header: 'Combustible gastado',
        size: 150,
      },
      {
        header: 'Métricas',
        columns: [
            {
                accessorKey: 'cantidad_cargada',
                header: 'Cargado (TN)',
                size: 100,
            },
            {
                accessorKey: 'cantidad_descargada',
                header: 'Desc. (TN)',
                size: 100,
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
        ]
      },
      {
        accessorKey: 'numero_factura',
        header: 'N° Factura',
        size: 120,
      },
      {
        accessorKey: 'facturacion_estado',
        header: 'Factura del combustible',
        size: 150,  
      },
      // Estados con Badges
      {
        accessorKey: 'estado_liquidacion',
        header: 'Liquidación',
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
        accessorKey: 'estado_facturacion',
        header: 'Facturación',
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
        size: 120,
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
    [],
  );

  // --- EXPORTAR A PDF ---
  const handleExportRows = (rows) => {
    const doc = new jsPDF('landscape'); // Horizontal para que quepan columnas
    const tableData = rows.map((row) => {
        const r = row.original;
        // Mapeamos los datos crudos a formato legible para el PDF
        return [
            formatDate(r.fecha_viaje),
            `${r.driver_name || ''} ${r.driver_lastname || ''}`,
            r.company_name,
            r.origen,
            r.destino,
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

  // --- CONFIGURACIÓN DE LA TABLA ---
  const table = useMaterialReactTable({
    columns,
    data: filteredTravels, // Usar datos filtrados
    state: { isLoading: loading },
    localization: MRT_Localization_ES, // Español
    enableRowSelection: true, // Checkboxes para seleccionar
    columnFilterDisplayMode: 'popover',
    paginationDisplayMode: 'pages',
    positionToolbarAlertBanner: 'bottom',
    
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
        <Tooltip title="Eliminar">
          <IconButton color="error" onClick={() => handleDelete(row)}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    ),

    // Botones de la barra superior (Nuevo Viaje + Filtros Año/Mes + Exportar)
    renderTopToolbarCustomActions: ({ table }) => (
      <Box sx={{ display: 'flex', gap: '1rem', p: '4px', alignItems: 'center' }}>
        <Button
          color="primary"
          onClick={handleNew}
          variant="contained"
          startIcon={<AddIcon />}
        >
          Nuevo Viaje
        </Button>
        {/* Filtro de Año */}
        <FormControl sx={{ minWidth: 140 }}>
          <Select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            displayEmpty
            size="small"
          >
            
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Filtro de Mes */}
        <FormControl sx={{ minWidth: 160 }}>
          <Select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            displayEmpty
            size="small"
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
          disabled={table.getPrePaginationRowModel().rows.length === 0}
          onClick={() => handleExportRows(table.getPrePaginationRowModel().rows)}
          startIcon={<FileDownloadIcon />}
        >
          Exportar Todo
        </Button>
        <Button
          disabled={!table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()}
          onClick={() => handleExportRows(table.getSelectedRowModel().rows)}
          startIcon={<FileDownloadIcon />}
        >
          Exportar Selección
        </Button>
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
      <div className="travel-container" style={{ padding: '20px' }}>
        <div className="travel-header" style={{ marginBottom: '20px' }}>
            <h1>Viajes Registrados</h1>
            <p>Gestión avanzada de viajes</p>
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