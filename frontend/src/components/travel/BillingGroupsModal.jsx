import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const normalizeInvoiceNumber = (value) => String(value || '').trim().toUpperCase();
const normalizeInvoiceDate = (value) => String(value || '').trim().slice(0, 10);

const toDateLabel = (value) => {
  if (!value) return '-';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return value;
};

const BillingGroupsModal = ({ open, onClose, travels, onApply }) => {
  const [selectedGroupKey, setSelectedGroupKey] = useState('');
  const [saving, setSaving] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('FACTURADO');
  const [liquidationStatus, setLiquidationStatus] = useState('LIQUIDADO');
  const [cartaDePorte, setCartaDePorte] = useState('');
  const [invoicePhoto, setInvoicePhoto] = useState(null);
  const [liquidationFile, setLiquidationFile] = useState(null);

  const groups = useMemo(() => {
    const list = Array.isArray(travels) ? travels : [];
    const map = new Map();

    list.forEach((travel) => {
      if (!travel || travel.anulado) return;
      const invoiceNumberKey = normalizeInvoiceNumber(travel.numero_factura);
      const invoiceDateKey = normalizeInvoiceDate(travel.fecha_facturada);
      if (!invoiceNumberKey) return;

      const key = `${travel.empresa_id || ''}|${invoiceNumberKey}|${invoiceDateKey}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          companyName: travel.company_name || '-',
          companyId: travel.empresa_id || null,
          invoiceNumber: travel.numero_factura || '',
          invoiceDate: invoiceDateKey,
          invoiceStatus: travel.estado_facturacion || 'FALTA',
          liquidationStatus: travel.estado_liquidacion || 'FALTA',
          cartaDePorte: travel.carta_de_porte || '',
          travels: [],
        });
      }
      map.get(key).travels.push(travel);
    });

    return Array.from(map.values())
      .filter((group) => group.travels.length > 1)
      .sort((a, b) => {
        const dateA = a.invoiceDate || '';
        const dateB = b.invoiceDate || '';
        if (dateA === dateB) return a.invoiceNumber.localeCompare(b.invoiceNumber, 'es');
        return dateB.localeCompare(dateA);
      });
  }, [travels]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.key === selectedGroupKey) || null,
    [groups, selectedGroupKey],
  );

  useEffect(() => {
    if (!open) return;
    if (groups.length === 0) {
      setSelectedGroupKey('');
      return;
    }
    if (!selectedGroupKey || !groups.some((group) => group.key === selectedGroupKey)) {
      setSelectedGroupKey(groups[0].key);
    }
  }, [open, groups, selectedGroupKey]);

  useEffect(() => {
    if (!selectedGroup) return;
    setInvoiceNumber(selectedGroup.invoiceNumber || '');
    setInvoiceDate(selectedGroup.invoiceDate || '');
    setInvoiceStatus(selectedGroup.invoiceStatus || 'FALTA');
    setLiquidationStatus(selectedGroup.liquidationStatus || 'FALTA');
    setCartaDePorte(selectedGroup.cartaDePorte || '');
    setInvoicePhoto(null);
    setLiquidationFile(null);
  }, [selectedGroup]);

  const handleApply = async () => {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('ids', JSON.stringify(selectedGroup.travels.map((item) => item.id)));
      formData.append('invoice_status', invoiceStatus);
      formData.append('liquidation_status', liquidationStatus);
      if (invoiceNumber.trim()) formData.append('invoice_number', invoiceNumber.trim());
      if (invoiceDate) formData.append('invoice_date', invoiceDate);
      if (cartaDePorte.trim()) formData.append('carta_de_porte', cartaDePorte.trim());
      if (invoicePhoto) formData.append('invoice_photo', invoicePhoto);
      if (liquidationFile) formData.append('archivo_factura_liquidado', liquidationFile);

      const ok = await onApply?.(formData);
      if (ok) onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="lg">
      <DialogTitle>Editar grupos de facturación</DialogTitle>
      <DialogContent dividers>
        {groups.length === 0 ? (
          <Alert severity="info">No hay grupos de facturas detectados para editar.</Alert>
        ) : (
          <Stack gap={2}>
            <Alert severity="info">
              Se agrupan viajes activos por empresa + número de factura + fecha de factura. Solo aparecen grupos con 2 o más viajes.
            </Alert>

            <FormControl fullWidth>
              <InputLabel id="invoice-group-select">Grupo de factura</InputLabel>
              <Select
                labelId="invoice-group-select"
                value={selectedGroupKey}
                label="Grupo de factura"
                onChange={(e) => setSelectedGroupKey(e.target.value)}
              >
                {groups.map((group) => (
                  <MenuItem key={group.key} value={group.key}>
                    {group.companyName} | {group.invoiceNumber} | {toDateLabel(group.invoiceDate)} | {group.travels.length} viajes
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedGroup && (
              <>
                <Divider />
                <Typography variant="subtitle1">Datos compartidos del grupo</Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
                  <TextField
                    label="N° Factura"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Fecha Facturada"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
                  <FormControl fullWidth>
                    <InputLabel id="group-invoice-status">Estado Facturación</InputLabel>
                    <Select
                      labelId="group-invoice-status"
                      value={invoiceStatus}
                      label="Estado Facturación"
                      onChange={(e) => setInvoiceStatus(e.target.value)}
                    >
                      <MenuItem value="FALTA">FALTA</MenuItem>
                      <MenuItem value="FACTURADO">FACTURADO</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel id="group-liquidation-status">Estado Liquidación</InputLabel>
                    <Select
                      labelId="group-liquidation-status"
                      value={liquidationStatus}
                      label="Estado Liquidación"
                      onChange={(e) => setLiquidationStatus(e.target.value)}
                    >
                      <MenuItem value="FALTA">FALTA</MenuItem>
                      <MenuItem value="LIQUIDADO">LIQUIDADO</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                <TextField
                  label="Carta de Porte"
                  value={cartaDePorte}
                  onChange={(e) => setCartaDePorte(e.target.value)}
                  fullWidth
                />

                <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems="center">
                  <Button component="label" variant="outlined">
                    Subir foto factura
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e) => setInvoicePhoto(e.target.files?.[0] || null)}
                    />
                  </Button>
                  <Typography variant="body2">{invoicePhoto ? invoicePhoto.name : 'Sin cambios'}</Typography>

                  <Button component="label" variant="outlined">
                    Subir archivo liquidación
                    <input
                      hidden
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setLiquidationFile(e.target.files?.[0] || null)}
                    />
                  </Button>
                  <Typography variant="body2">{liquidationFile ? liquidationFile.name : 'Sin cambios'}</Typography>
                </Stack>

                <Divider />
                <Typography variant="subtitle1">Viajes del grupo ({selectedGroup.travels.length})</Typography>
                <Box sx={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 1, p: 1 }}>
                  {selectedGroup.travels.map((travel) => (
                    <Typography key={travel.id} variant="body2" sx={{ py: 0.4 }}>
                      {travel.fecha_viaje || '-'} | {travel.origen || '-'} {'->'} {travel.destino || '-'} | ID #{travel.id}
                    </Typography>
                  ))}
                </Box>
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={saving || !selectedGroup}
        >
          Guardar grupo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BillingGroupsModal;
