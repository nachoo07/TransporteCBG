import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import { MRT_Localization_ES } from 'material-react-table/locales/es';

import client from '../../api/axios';
import Navbar from '../navbar/Navbar';
import { useAuth } from '../../context/login/LoginContext';
import { showErrorAlert, showSuccessToast } from '../../utils/alerts/Alerts';
import { getErrorMsg } from '../../utils/helperError/ErrorMsg';
import './driverPayments.css';

const isBlank = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  return false;
};

const formatText = (value) => {
  if (isBlank(value)) return '-';
  return String(value);
};

const toCamelCaseWords = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/(^\w|\s+\w)/g, (match) => match.toUpperCase())
    .trim();

const toYearMonthKey = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const formatNumberEs = (value, { maxDecimals = 2 } = {}) => {
  if (isBlank(value)) return '-';
  const asNumber = typeof value === 'number' ? value : Number(String(value).trim().replace(/\./g, '').replace(',', '.'));
  if (Number.isNaN(asNumber)) return formatText(value);
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(asNumber);
};

const withUnit = (value, unit, options = {}) => {
  const formatted = formatNumberEs(value, options);
  if (formatted === '-') return '-';
  return `${formatted} ${unit}`;
};

const formatIntegerInput = (value) => {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  if (!digits) return '';
  const asNumber = Number(digits);
  if (Number.isNaN(asNumber)) return '';
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(asNumber);
};

const parseIntegerInput = (value) => {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  if (!digits) return null;
  const asNumber = Number(digits);
  if (Number.isNaN(asNumber)) return null;
  return asNumber;
};

const formatCurrency = (value) => {
  if (isBlank(value)) return '-';
  const asNumber = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(asNumber)) return formatText(value);
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(asNumber);
};

const formatDate = (date) => {
  if (!date) return '-';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    const [year, month, day] = date.split('-').map((n) => parseInt(n, 10));
    return new Date(year, month - 1, day).toLocaleDateString('es-AR');
  }
  return new Date(date).toLocaleDateString('es-AR');
};

const DriverPayments = () => {
  const { isAuthenticated, isOffline } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const today = useMemo(() => new Date(), []);
  const [monthFilter, setMonthFilter] = useState(String(today.getMonth() + 1).padStart(2, '0'));
  const [yearFilter, setYearFilter] = useState(String(today.getFullYear()));

  // Modal: Config (Porcentaje / Fijo)
  const [configOpen, setConfigOpen] = useState(false);
  const [configTravelId, setConfigTravelId] = useState(null);
  const [configTipo, setConfigTipo] = useState('PORCENTAJE');
  const [configPorcentaje, setConfigPorcentaje] = useState('');
  const [configPrecioFijo, setConfigPrecioFijo] = useState('');

  // Modal: Ajustes
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustTravelId, setAdjustTravelId] = useState(null);
  const [adjustItems, setAdjustItems] = useState([]);
  const [newAdjDesc, setNewAdjDesc] = useState('');
  const [newAdjAmount, setNewAdjAmount] = useState('');
  const [newAdjType, setNewAdjType] = useState('SUMA');

  const fetchData = async () => {
    if (!isAuthenticated) return;
    if (isOffline) return;
    setLoading(true);
    try {
      const res = await client.get('/driver-payments');
      const list = res.data?.data ?? [];
      const normalized = Array.isArray(list) ? list : [];
      setRows(normalized);
      return normalized;
    } catch (error) {
      if (error?.isOffline) return;
      const msg = getErrorMsg(error, 'No se pudo cargar la tabla de pagos de choferes');
      showErrorAlert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isOffline]);

  const openConfig = (row) => {
    const original = row.original;
    setConfigTravelId(original.viaje_id);
    setConfigTipo(original.pago?.tipo || 'PORCENTAJE');
    setConfigPorcentaje(original.pago?.porcentaje ?? '');
    setConfigPrecioFijo(original.pago?.precio_fijo ?? '');
    setConfigOpen(true);
  };

  const saveConfig = async () => {
    if (!configTravelId) return;
    try {
      await client.put(`/driver-payments/${configTravelId}/config`, {
        tipo: configTipo,
        porcentaje: configTipo === 'PORCENTAJE' ? configPorcentaje : null,
        precio_fijo: configTipo === 'FIJO' ? configPrecioFijo : null,
      });
      showSuccessToast('Pago chofer actualizado');
      setConfigOpen(false);
      await fetchData();
    } catch (error) {
      if (error?.isOffline) return;
      const msg = getErrorMsg(error, 'No se pudo guardar la configuración');
      showErrorAlert('Error', msg);
    }
  };

  const openAdjustments = (row) => {
    const original = row.original;
    setAdjustTravelId(original.viaje_id);
    setAdjustItems(original.pago?.ajustes || []);
    setNewAdjDesc('');
    setNewAdjAmount('');
    setNewAdjType('SUMA');
    setAdjustOpen(true);
  };

  const addAdjustment = async () => {
    if (!adjustTravelId) return;
    const amountAbs = parseIntegerInput(newAdjAmount);
    const signedAmount = newAdjType === 'RESTA' ? -Math.abs(amountAbs || 0) : Math.abs(amountAbs || 0);
    if (!newAdjDesc.trim() || !signedAmount) {
      showErrorAlert('Error', 'Completá descripción y monto válido.');
      return;
    }
    try {
      await client.post(`/driver-payments/${adjustTravelId}/adjustments`, {
        descripcion: toCamelCaseWords(newAdjDesc),
        monto: signedAmount,
      });
      showSuccessToast('Ajuste agregado');
      setNewAdjDesc('');
      setNewAdjAmount('');
      setNewAdjType('SUMA');
      const list = await fetchData();
      const updated = list?.find((r) => r.viaje_id === adjustTravelId);
      if (updated) setAdjustItems(updated.pago?.ajustes || []);
    } catch (error) {
      if (error?.isOffline) return;
      const msg = getErrorMsg(error, 'No se pudo agregar el ajuste');
      showErrorAlert('Error', msg);
    }
  };

  const deleteAdjustment = async (id) => {
    try {
      await client.delete(`/driver-payments/adjustments/${id}`);
      showSuccessToast('Ajuste eliminado');
      const list = await fetchData();
      const updated = list?.find((r) => r.viaje_id === adjustTravelId);
      if (updated) setAdjustItems(updated.pago?.ajustes || []);
    } catch (error) {
      if (error?.isOffline) return;
      const msg = getErrorMsg(error, 'No se pudo eliminar el ajuste');
      showErrorAlert('Error', msg);
    }
  };

  const periodFilteredRows = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    return list.filter((row) => {
      const ym = toYearMonthKey(row?.fecha_viaje);
      if (!ym) return false;
      const [year, month] = ym.split('-');
      if (yearFilter && year !== yearFilter) return false;
      if (monthFilter && month !== monthFilter) return false;
      return true;
    });
  }, [rows, monthFilter, yearFilter]);

  const availableYears = useMemo(() => {
    const years = new Set([String(today.getFullYear())]);
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const ym = toYearMonthKey(row?.fecha_viaje);
      if (!ym) return;
      years.add(ym.slice(0, 4));
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [rows, today]);

  const uniqueSorted = (values) =>
    Array.from(
      new Set(values.map((value) => String(value || '').trim()).filter((value) => value.length > 0 && value !== '-'))
    ).sort((a, b) => a.localeCompare(b, 'es'));

  const columnFilterOptions = useMemo(() => {
    const source = Array.isArray(periodFilteredRows) ? periodFilteredRows : [];
    return {
      choferes: uniqueSorted(source.map((row) => toCamelCaseWords(row.driver_fullname))),
      empresas: uniqueSorted(source.map((row) => toCamelCaseWords(row.company_name))),
      docs: uniqueSorted(
        source.map((row) => [row.remito, row.hoja_ruta, row.numero_proforma].filter(Boolean).join(' / '))
      ),
      origenes: uniqueSorted(source.map((row) => toCamelCaseWords(row.origen))),
      destinos: uniqueSorted(source.map((row) => toCamelCaseWords(row.destino))),
      tipoPago: uniqueSorted(source.map((row) => row.pago?.tipo || 'PORCENTAJE')),
    };
  }, [periodFilteredRows]);

  const columns = useMemo(
    () => [
      {
        id: 'driver_fullname',
        accessorFn: (row) => toCamelCaseWords(row.driver_fullname),
        header: 'Chofer',
        size: 120,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.choferes,
      },
      {
        id: 'company_name',
        accessorFn: (row) => toCamelCaseWords(row.company_name),
        header: 'Empresa',
        size: 160,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.empresas,
      },
      {
        id: 'docs',
        header: 'Remito / HR / Proforma',
        accessorFn: (r) => [r.remito, r.hoja_ruta, r.numero_proforma].filter(Boolean).join(' / '),
        size: 220,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.docs,
      },
      {
        accessorKey: 'fecha_viaje',
        header: 'Fecha de viaje',
        size: 120,
        Cell: ({ cell }) => formatDate(cell.getValue()),
      },
      {
        id: 'origen',
        accessorFn: (row) => toCamelCaseWords(row.origen),
        header: 'Desde',
        size: 140,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.origenes,
      },
      {
        id: 'destino',
        accessorFn: (row) => toCamelCaseWords(row.destino),
        header: 'Hasta',
        size: 140,
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.destinos,
      },
      {
        accessorKey: 'cantidad_cargada',
        header: 'Cargado (TN)',
        size: 100,
        Cell: ({ cell }) => withUnit(cell.getValue(), 'TN', { maxDecimals: 0 }),
      },
      {
        accessorKey: 'cantidad_descargada',
        header: 'Descargado (TN)',
        size: 120,
        Cell: ({ cell }) => withUnit(cell.getValue(), 'TN', { maxDecimals: 0 }),
      },
      {
        accessorKey: 'valor_viaje_neto',
        header: 'Valor viaje (sin IVA)',
        size: 180,
        Cell: ({ cell }) => formatCurrency(cell.getValue()),
      },
      {
        id: 'config_pago',
        header: '% / Precio fijo',
        size: 140,
        accessorFn: (r) => {
          const tipo = r.pago?.tipo;
          if (tipo === 'FIJO') return r.pago?.precio_fijo ?? null;
          return r.pago?.porcentaje ?? null;
        },
        filterVariant: 'select',
        filterFn: 'equals',
        filterSelectOptions: columnFilterOptions.tipoPago,
        Cell: ({ row }) => {
          const tipo = row.original.pago?.tipo || 'PORCENTAJE';
          const label =
            tipo === 'FIJO'
              ? row.original.pago?.precio_fijo !== null && row.original.pago?.precio_fijo !== undefined
                ? formatCurrency(row.original.pago?.precio_fijo)
                : 'Sin definir'
              : row.original.pago?.porcentaje !== null && row.original.pago?.porcentaje !== undefined
                ? `${row.original.pago?.porcentaje}%`
                : 'Sin definir';

          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{label}</span>
              <Tooltip title="Editar % / Precio fijo">
                <IconButton size="small" onClick={() => openConfig(row)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
      {
        id: 'ajustes',
        header: 'Otros importes',
        size: 150,
        accessorFn: (r) => r.pago?.ajustes_total ?? 0,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{formatCurrency(row.original.pago?.ajustes_total ?? 0)}</span>
            <Button variant="outlined" size="small" onClick={() => openAdjustments(row)}>
              Ver / Editar
            </Button>
          </Box>
        ),
      },
      {
        accessorKey: 'adelanto_monto',
        header: 'Adelanto',
        size: 120,
        accessorFn: (row) => row.adelanto_monto ?? row.pago?.adelanto_monto ?? null,
        Cell: ({ row }) => formatCurrency(row.original.adelanto_monto ?? row.original.pago?.adelanto_monto ?? null),
      },
      {
        id: 'final',
        header: 'Valor final',
        size: 120,
        accessorFn: (r) => r.pago?.pago_final ?? null,
        Cell: ({ row }) => {
          const explicitValue = row.original.pago?.pago_final;
          const base = Number(row.original.pago?.pago_base ?? 0);
          const ajustes = Number(row.original.pago?.ajustes_total ?? 0);
          const adelanto = Number(row.original.adelanto_monto ?? row.original.pago?.adelanto_monto ?? 0);
          const calculated = Number.isNaN(base) ? null : base + (Number.isNaN(ajustes) ? 0 : ajustes) - (Number.isNaN(adelanto) ? 0 : adelanto);
          const value = explicitValue === null || explicitValue === undefined ? calculated : explicitValue;
          return <strong>{value === null ? '-' : formatCurrency(value)}</strong>;
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnFilterOptions]
  );

  const table = useMaterialReactTable({
    columns,
    data: periodFilteredRows,
    localization: MRT_Localization_ES,
    state: { isLoading: loading },
    enableRowSelection: true,
    defaultColumn: {
      Cell: ({ cell }) => formatText(cell.getValue()),
    },
    columnFilterDisplayMode: 'popover',
    enableColumnFilters: true,
    enableFilters: true,
    enableGlobalFilter: true,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    initialState: { density: 'compact', showColumnFilters: true },
    muiFilterTextFieldProps: {
      variant: 'outlined',
      size: 'small',
      SelectProps: { defaultOpen: true },
    },
    muiTablePaperProps: {
      sx: {
        borderRadius: 3,
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
    positionToolbarAlertBanner: 'bottom',
    renderBottomToolbarCustomActions: ({ table }) => {
      const selectedRows = table.getSelectedRowModel().rows;
      const filteredRows = table.getFilteredRowModel().rows;

      const getPagoFinal = (row) => {
        const explicitValue = row?.original?.pago?.pago_final;
        const base = Number(row?.original?.pago?.pago_base ?? 0);
        const ajustes = Number(row?.original?.pago?.ajustes_total ?? 0);
        const adelanto = Number(row?.original?.adelanto_monto ?? row?.original?.pago?.adelanto_monto ?? 0);
        const fallback = (Number.isNaN(base) ? 0 : base) + (Number.isNaN(ajustes) ? 0 : ajustes) - (Number.isNaN(adelanto) ? 0 : adelanto);
        const value = Number(explicitValue ?? fallback);
        return Number.isNaN(value) ? 0 : value;
      };

      const selectedTotal = selectedRows.reduce((sum, row) => sum + getPagoFinal(row), 0);
      const filteredTotal = filteredRows.reduce((sum, row) => sum + getPagoFinal(row), 0);

      return (
        <Box className="driver-payments-totals">
          <Typography className="driver-payments-totals-table">
            Total tabla: {formatCurrency(filteredTotal)}
          </Typography>
          <Typography className="driver-payments-totals-selected">
            Total selección: {formatCurrency(selectedTotal)}
          </Typography>
        </Box>
      );
    },
    renderTopToolbarCustomActions: () => (
      <Box className="driver-payments-period-filters">
        <Typography className="driver-payments-period-title">Período</Typography>
        <FormControl size="big">
          <InputLabel id="driver-payments-year-label">Año</InputLabel>
          <Select
            labelId="driver-payments-year-label"
            value={yearFilter}
            label="Año"
            onChange={(event) => setYearFilter(event.target.value)}
            className="driver-payments-period-select"
          >
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="big">
          <InputLabel id="driver-payments-month-label">Mes</InputLabel>
          <Select
            labelId="driver-payments-month-label"
            value={monthFilter}
            label="Mes"
            onChange={(event) => setMonthFilter(event.target.value)}
            className="driver-payments-period-select"
          >
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
  });

  return (
    <div className="driver-payments-layout">
      <Navbar />
      <div className="driver-payments-container">
        <div className="driver-payments-header">
          <h1>👨‍✈️ Pagos de Choferes</h1>
          <p>Revisión y cálculo por viaje</p>
        </div>
        <MaterialReactTable table={table} />
      </div>

      {/* Modal Config */}
      <Dialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ className: 'driver-payments-modal-paper' }}
      >
        <DialogTitle className="driver-payments-modal-title">% / Precio fijo</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl size="small">
            <Select value={configTipo} onChange={(e) => setConfigTipo(e.target.value)}>
              <MenuItem value="PORCENTAJE">Porcentaje</MenuItem>
              <MenuItem value="FIJO">Precio fijo</MenuItem>
            </Select>
          </FormControl>
          {configTipo === 'PORCENTAJE' ? (
            <TextField
              size="small"
              label="Porcentaje (0-100)"
              value={configPorcentaje}
              onChange={(e) => setConfigPorcentaje(e.target.value)}
              inputProps={{ inputMode: 'decimal' }}
            />
          ) : (
            <TextField
              size="small"
              label="Precio fijo (ARS)"
              value={configPrecioFijo}
              onChange={(e) => setConfigPrecioFijo(e.target.value)}
              inputProps={{ inputMode: 'decimal' }}
            />
          )}
        </DialogContent>
        <DialogActions className="driver-payments-modal-actions">
          <Button onClick={() => setConfigOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={saveConfig}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Ajustes */}
      <Dialog
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ className: 'driver-payments-modal-paper' }}
      >
        <DialogTitle className="driver-payments-modal-title">Otros importes</DialogTitle>
        <DialogContent className="driver-adjust-dialog-content">
          <Box className="driver-adjust-form-row">
            <TextField
              size="small"
              label="Descripción"
              value={newAdjDesc}
              onChange={(e) => setNewAdjDesc(toCamelCaseWords(e.target.value))}
              fullWidth
              className="driver-adjust-desc-input"
            />
            <FormControl size="small" className="driver-adjust-type-input">
              <InputLabel id="adjust-type-label">Tipo</InputLabel>
              <Select
                labelId="adjust-type-label"
                label="Tipo"
                value={newAdjType}
                onChange={(e) => setNewAdjType(e.target.value)}
              >
                <MenuItem value="SUMA">Suma (+)</MenuItem>
                <MenuItem value="RESTA">Resta (-)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Monto (ARS)"
              value={newAdjAmount}
              onChange={(e) => setNewAdjAmount(formatIntegerInput(e.target.value))}
              inputProps={{ inputMode: 'numeric' }}
              className="driver-adjust-amount-input"
            />
            <Button variant="contained" onClick={addAdjustment} className="driver-adjust-add-btn">
              Agregar
            </Button>
          </Box>

          <Box className="driver-adjust-list">
            {adjustItems.length === 0 ? (
              <div className="driver-adjust-empty">Sin ajustes cargados.</div>
            ) : (
              adjustItems.map((a) => (
                <Box key={a.id} className="driver-adjust-item">
                  <div className="driver-adjust-item-left">
                    <strong>{toCamelCaseWords(a.descripcion)}</strong>
                    <div className={Number(a.monto) >= 0 ? 'driver-adjust-item-positive' : 'driver-adjust-item-negative'}>
                      {formatCurrency(a.monto)}
                    </div>
                  </div>
                  <Button
                    color="error"
                    variant="outlined"
                    size="small"
                    onClick={() => deleteAdjustment(a.id)}
                    className="driver-adjust-delete-btn"
                  >
                    Eliminar
                  </Button>
                </Box>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions className="driver-payments-modal-actions">
          <Button onClick={() => setAdjustOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default DriverPayments;
