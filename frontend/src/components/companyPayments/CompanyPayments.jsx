import React, { useEffect, useMemo } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import { Box, FormControl, MenuItem, Select, Typography } from '@mui/material';
import { MRT_Localization_ES } from 'material-react-table/locales/es';
import { useTravel } from '../../context/travel/TravelContext';
import './companyPayments.css';

const CompanyPayments = () => {
  const { travels, loading, getTravels } = useTravel();
  const today = new Date();
  const [monthFilter, setMonthFilter] = React.useState(String(today.getMonth() + 1).padStart(2, '0'));
  const [yearFilter, setYearFilter] = React.useState(String(today.getFullYear()));

  useEffect(() => {
    getTravels();
  }, [getTravels]);

  const brand = useMemo(
    () => ({
      main: '#FF9020',
      hover: '#f79a3e',
      border: '#f59e0b',
    }),
    [],
  );

  const toYmd = (date) => {
    if (!date) return '';
    if (typeof date === 'string') {
      const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatDate = (date) => {
    const ymd = toYmd(date);
    if (!ymd) return '-';
    const [year, month, day] = ymd.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (value) => {
    const asNumber = Number(value ?? 0);
    if (Number.isNaN(asNumber)) return '-';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(asNumber);
  };

  const badgeLabel = (value) => {
    if (value === 'PAGADO') return 'Pagado';
    if (value === 'DEBEN') return 'Debe';
    if (value === 'LIQUIDADO') return 'Liquidado';
    if (value === 'FACTURADO') return 'Facturado';
    return 'Falta';
  };

  const getStatusColor = (status) => {
    const map = {
      LIQUIDADO: '#d4edda',
      PAGADO: '#d4edda',
      FACTURADO: '#cce5ff',
      FALTA: '#f8d7da',
      DEBEN: '#f8d7da',
      PENDIENTE: '#fff3cd',
    };
    return map[status] || '#e5e7eb';
  };

  const availableYears = useMemo(() => {
    const years = new Set([String(today.getFullYear())]);
    (Array.isArray(travels) ? travels : []).forEach((travel) => {
      const ymd = toYmd(travel?.fecha_viaje);
      if (ymd) years.add(ymd.slice(0, 4));
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [travels, today]);

  const groupedRows = useMemo(() => {
    const list = Array.isArray(travels) ? travels : [];
    const grouped = new Map();

    list
      .filter((travel) => !travel?.anulado)
      .filter((travel) => {
        const travelYmd = toYmd(travel?.fecha_viaje);
        if (!travelYmd) return false;
        const [y, m] = travelYmd.split('-');
        return y === yearFilter && m === monthFilter;
      })
      .forEach((travel) => {
        const empresa = travel.company_name || '-';
        const hasInvoice = String(travel.numero_factura || '').trim().length > 0;
        const numeroFactura = hasInvoice ? String(travel.numero_factura).trim() : 'SIN FACTURA';
        const fechaFacturadaYmd = hasInvoice ? (toYmd(travel.fecha_facturada) || '-') : '-';
        const fechaFacturadaFmt = fechaFacturadaYmd === '-' ? '-' : formatDate(fechaFacturadaYmd);

        const groupKey = hasInvoice
          ? `${empresa}__${numeroFactura}__${fechaFacturadaYmd}`
          : `${empresa}__SIN_FACTURA__${travel.id}`;

        const neto = Number(travel?.valor_neto ?? travel?.precio_fijo ?? 0);
        const iva = Number(travel?.valor_iva ?? 0);
        const total = (Number.isNaN(neto) ? 0 : neto) + (Number.isNaN(iva) ? 0 : iva);

        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, {
            id: groupKey,
            empresa,
            numero_factura: numeroFactura,
            fecha_facturada_fmt: fechaFacturadaFmt,
            cantidad_viajes: 0,
            monto_total: 0,
            _allLiquidado: true,
            _allFacturado: true,
            _allPagado: true,
            trips: [],
          });
        }

        const group = grouped.get(groupKey);
        group.cantidad_viajes += 1;
        group.monto_total += total;
        if ((travel.estado_liquidacion || 'FALTA') !== 'LIQUIDADO') group._allLiquidado = false;
        if ((travel.estado_facturacion || 'FALTA') !== 'FACTURADO') group._allFacturado = false;
        if ((travel.estado_pago || 'DEBEN') !== 'PAGADO') group._allPagado = false;
        group.trips.push({
          id: travel.id,
          fecha_viaje: formatDate(travel.fecha_viaje),
          origen: travel.origen || '-',
          destino: travel.destino || '-',
          chofer: `${travel.driver_name || ''} ${travel.driver_lastname || ''}`.trim() || '-',
          monto_total: total,
          estado_liquidacion: travel.estado_liquidacion || 'FALTA',
          estado_facturacion: travel.estado_facturacion || 'FALTA',
          estado_pago: travel.estado_pago || 'DEBEN',
        });
      });

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        estado_liquidacion: group._allLiquidado ? 'LIQUIDADO' : 'FALTA',
        estado_facturacion: group._allFacturado ? 'FACTURADO' : 'FALTA',
        estado_pago: group._allPagado ? 'PAGADO' : 'DEBEN',
      }))
      .sort((a, b) => {
        if (a.fecha_facturada_fmt === b.fecha_facturada_fmt) {
          return a.empresa.localeCompare(b.empresa, 'es');
        }
        if (a.fecha_facturada_fmt === '-') return 1;
        if (b.fecha_facturada_fmt === '-') return -1;
        const [ad, am, ay] = a.fecha_facturada_fmt.split('/');
        const [bd, bm, by] = b.fecha_facturada_fmt.split('/');
        return new Date(`${by}-${bm}-${bd}`) - new Date(`${ay}-${am}-${ad}`);
      });
  }, [travels, monthFilter, yearFilter]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'empresa',
        header: 'Empresa',
        size: 220,
      },
      {
        accessorKey: 'numero_factura',
        header: 'N° Factura',
        size: 140,
      },
      {
        accessorKey: 'fecha_facturada_fmt',
        header: 'Fecha Facturada',
        size: 140,
      },
      {
        accessorKey: 'cantidad_viajes',
        header: 'Viajes',
        size: 100,
      },
      {
        accessorKey: 'monto_total',
        header: 'Monto Total',
        size: 140,
        Cell: ({ cell }) => formatCurrency(cell.getValue()),
      },
      {
        accessorKey: 'estado_liquidacion',
        header: 'Liquidación',
        size: 120,
        Cell: ({ cell }) => (
          <Box
            component="span"
            sx={{
              backgroundColor: getStatusColor(cell.getValue()),
              borderRadius: '0.25rem',
              color: '#000',
              p: '0.25rem 0.5rem',
              fontWeight: 'bold',
              fontSize: '0.8rem',
            }}
          >
            {badgeLabel(cell.getValue())}
          </Box>
        ),
      },
      {
        accessorKey: 'estado_facturacion',
        header: 'Facturación',
        size: 120,
        Cell: ({ cell }) => (
          <Box
            component="span"
            sx={{
              backgroundColor: getStatusColor(cell.getValue()),
              borderRadius: '0.25rem',
              color: '#000',
              p: '0.25rem 0.5rem',
              fontWeight: 'bold',
              fontSize: '0.8rem',
            }}
          >
            {badgeLabel(cell.getValue())}
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
              p: '0.25rem 0.5rem',
              fontWeight: 'bold',
              fontSize: '0.8rem',
            }}
          >
            {badgeLabel(cell.getValue())}
          </Box>
        ),
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: groupedRows,
    state: { isLoading: loading },
    localization: MRT_Localization_ES,
    enableColumnFilters: false,
    enableSorting: false,
    enableColumnOrdering: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableExpanding: true,
    enableRowActions: false,
    enableRowSelection: false,
    autoResetPageIndex: false,
    paginationDisplayMode: 'pages',
    positionToolbarAlertBanner: 'bottom',
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
    renderDetailPanel: ({ row }) => (
      <Box sx={{ p: 2, backgroundColor: '#fff7ed' }}>
        <Box
          sx={{
            border: '1px solid #fed7aa',
            borderRadius: 2,
            backgroundColor: '#fff',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '80px 120px 1fr 1fr 1fr 140px 120px 120px 120px',
              gap: 0,
              backgroundColor: '#fffbeb',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            {['ID', 'Fecha', 'Origen', 'Destino', 'Chofer', 'Monto', 'Liqu.', 'Fact.', 'Pago'].map((label) => (
              <Box
                key={label}
                sx={{
                  px: 1.5,
                  py: 1,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </Box>
            ))}
          </Box>

          {row.original.trips.map((trip, index) => (
            <Box
              key={trip.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '80px 120px 1fr 1fr 1fr 140px 120px 120px 120px',
                borderBottom: index === row.original.trips.length - 1 ? 'none' : '1px solid #f1f5f9',
              }}
            >
              <Box sx={{ px: 1.5, py: 1.1, fontSize: '0.86rem' }}>{trip.id}</Box>
              <Box sx={{ px: 1.5, py: 1.1, fontSize: '0.86rem' }}>{trip.fecha_viaje}</Box>
              <Box sx={{ px: 1.5, py: 1.1, fontSize: '0.86rem' }}>{trip.origen}</Box>
              <Box sx={{ px: 1.5, py: 1.1, fontSize: '0.86rem' }}>{trip.destino}</Box>
              <Box sx={{ px: 1.5, py: 1.1, fontSize: '0.86rem' }}>{trip.chofer}</Box>
              <Box sx={{ px: 1.5, py: 1.1, fontSize: '0.86rem' }}>{formatCurrency(trip.monto_total)}</Box>
              <Box sx={{ px: 1.5, py: 1.1, fontSize: '0.86rem' }}>{badgeLabel(trip.estado_liquidacion)}</Box>
              <Box sx={{ px: 1.5, py: 1.1, fontSize: '0.86rem' }}>{badgeLabel(trip.estado_facturacion)}</Box>
              <Box sx={{ px: 1.5, py: 1.1, fontSize: '0.86rem' }}>{badgeLabel(trip.estado_pago)}</Box>
            </Box>
          ))}
        </Box>
      </Box>
    ),
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', gap: 2, p: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 700, color: '#374151' }}>
          Periodo
        </Typography>
        <FormControl sx={{ minWidth: 90 }} size="small">
          <Select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 140 }} size="small">
          <Select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            {Array.from({ length: 12 }, (_, index) => {
              const value = String(index + 1).padStart(2, '0');
              return (
                <MenuItem key={value} value={value}>
                  {new Date(2000, index, 1).toLocaleString('es-AR', { month: 'long' })}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Box>
    ),
    renderBottomToolbarCustomActions: () => {
      const totalMonto = groupedRows.reduce((sum, row) => sum + Number(row.monto_total || 0), 0);
      return (
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', px: 2, py: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 700, color: '#374151' }}>
            Facturas agrupadas: {groupedRows.length}
          </Typography>
          <Typography sx={{ fontWeight: 700, color: brand.main }}>
            Total período: {formatCurrency(totalMonto)}
          </Typography>
        </Box>
      );
    },
  });

  return (
    <div className="company-payments-layout">
      <div className="company-payments-container">
        
        <MaterialReactTable table={table} />
      </div>
    </div>
  );
};

export default CompanyPayments;
