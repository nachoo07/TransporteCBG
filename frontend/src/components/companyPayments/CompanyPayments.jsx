import React, { useEffect, useMemo, useRef, useState } from 'react';

import Navbar from '../navbar/Navbar';
import { useTravel } from '../../context/travel/TravelContext';
import './companyPayments.css';

const CompanyPayments = () => {
  const { travels, loading, getTravels } = useTravel();
  const today = new Date();
  const [monthFilter, setMonthFilter] = useState(String(today.getMonth() + 1).padStart(2, '0'));
  const [yearFilter, setYearFilter] = useState(String(today.getFullYear()));
  const [filters, setFilters] = useState({
    empresa: [],
    numero_factura: [],
    fecha_facturada: [],
    estado_pago: [],
  });
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [expandedRows, setExpandedRows] = useState({});
  const popoverRef = useRef(null);

  useEffect(() => {
    getTravels();
  }, [getTravels]);

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

  const availableYears = useMemo(() => {
    const years = new Set([String(today.getFullYear())]);
    (Array.isArray(travels) ? travels : []).forEach((t) => {
      const ymd = toYmd(t?.fecha_viaje);
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
        const af = a.fecha_facturada_fmt === '-' ? '' : a.fecha_facturada_fmt;
        const bf = b.fecha_facturada_fmt === '-' ? '' : b.fecha_facturada_fmt;
        if (af === bf) return a.empresa.localeCompare(b.empresa, 'es');
        return bf.localeCompare(af, 'es');
      });
  }, [travels, monthFilter, yearFilter]);

  const applyFilters = (rows, currentFilters) =>
    rows.filter((row) => {
      if (currentFilters.empresa.length && !currentFilters.empresa.includes(row.empresa)) return false;
      if (currentFilters.numero_factura.length && !currentFilters.numero_factura.includes(row.numero_factura)) return false;
      if (currentFilters.fecha_facturada.length && !currentFilters.fecha_facturada.includes(row.fecha_facturada_fmt)) return false;
      if (currentFilters.estado_pago.length && !currentFilters.estado_pago.includes(row.estado_pago)) return false;
      return true;
    });

  const filteredRows = useMemo(() => applyFilters(groupedRows, filters), [groupedRows, filters]);

  const optionsFor = useMemo(() => {
    const unique = (values) => Array.from(new Set(values)).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
    const rows = groupedRows;
    return {
      empresa: unique(rows.map((row) => row.empresa)),
      numero_factura: unique(rows.map((row) => row.numero_factura)),
      fecha_facturada: unique(rows.map((row) => row.fecha_facturada_fmt)),
      estado_pago: unique(rows.map((row) => row.estado_pago)),
    };
  }, [groupedRows]);

  useEffect(() => {
    if (!openFilterKey) return;
    const onPointerDown = (event) => {
      if (event.target?.closest?.('.cp-filter-btn')) return;
      if (!popoverRef.current) return;
      if (popoverRef.current.contains(event.target)) return;
      setOpenFilterKey(null);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [openFilterKey]);

  const togglePopover = (key, anchorEl) => {
    setOpenFilterKey((prev) => (prev === key ? null : key));
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + 8,
        left: Math.max(12, rect.left - 210),
      });
    }
  };

  const toggleFilterValue = (key, value) => {
    setFilters((prev) => {
      const selected = new Set(prev[key]);
      if (selected.has(value)) selected.delete(value);
      else selected.add(value);
      return { ...prev, [key]: Array.from(selected) };
    });
  };

  const clearColumnFilter = (key) => setFilters((prev) => ({ ...prev, [key]: [] }));

  const clearAllFilters = () =>
    setFilters({
      empresa: [],
      numero_factura: [],
      fecha_facturada: [],
      estado_pago: [],
    });

  const toggleExpand = (id) =>
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

  const badgeLabel = (value) => {
    if (value === 'PAGADO') return 'Pagado';
    if (value === 'DEBEN') return 'Debe';
    if (value === 'LIQUIDADO') return 'Liquidado';
    if (value === 'FACTURADO') return 'Facturado';
    return 'Falta';
  };

  const badgeClass = (value) => {
    if (value === 'PAGADO' || value === 'LIQUIDADO' || value === 'FACTURADO') return 'company-payments-badge--paid';
    return 'company-payments-badge--owed';
  };

  const FilterIconButton = ({ columnKey, label }) => (
    <button
      type="button"
      className={`cp-filter-btn${filters[columnKey].length ? ' is-active' : ''}`}
      title={`Filtrar por ${label}`}
      onClick={(event) => togglePopover(columnKey, event.currentTarget)}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M3 5h18l-7 8v6l-4-2v-4z" />
      </svg>
    </button>
  );

  return (
    <div className="company-payments-layout">
      <Navbar />
      <div className="company-payments-container">
        <div className="company-payments-header">
          <h1>
            <span className="company-payments-title-icon" aria-hidden="true">🏦</span> Pagos de Empresa
          </h1>
          <p>Vista agrupada por factura (solo lectura)</p>
        </div>

        <div className="company-payments-toolbar">
          <div className="company-payments-toolbar-left">
            <span className="company-payments-toolbar-title">Período</span>
            <select className="cp-period-select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select className="cp-period-select" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              {Array.from({ length: 12 }, (_, index) => {
                const value = String(index + 1).padStart(2, '0');
                return (
                  <option key={value} value={value}>
                    {new Date(2000, index, 1).toLocaleString('es-AR', { month: 'long' })}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="company-payments-toolbar-right">
            <button
              type="button"
              className="cp-clear-all-btn"
              onClick={clearAllFilters}
              disabled={!Object.values(filters).some((list) => list.length > 0)}
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <div className="company-payments-table-wrapper">
          <table className="company-payments-table">
            <thead>
              <tr>
                <th style={{ width: 44 }} />
                <th>
                  <div className="cp-th">
                    <span>Empresa</span>
                    <FilterIconButton columnKey="empresa" label="empresa" />
                    {openFilterKey === 'empresa' && (
                      <div className="cp-filter-popover" ref={popoverRef} style={{ top: popoverPosition.top, left: popoverPosition.left }}>
                        <div className="cp-filter-title">Filtrar</div>
                        <div className="cp-filter-list">
                          {optionsFor.empresa.map((opt) => (
                            <label key={opt} className="cp-filter-item">
                              <input type="checkbox" checked={filters.empresa.includes(opt)} onChange={() => toggleFilterValue('empresa', opt)} />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                        <div className="cp-filter-actions">
                          <button type="button" className="cp-filter-clear" onClick={() => clearColumnFilter('empresa')}>Limpiar</button>
                        </div>
                      </div>
                    )}
                  </div>
                </th>
                <th>
                  <div className="cp-th">
                    <span>N° Factura</span>
                    <FilterIconButton columnKey="numero_factura" label="N° factura" />
                    {openFilterKey === 'numero_factura' && (
                      <div className="cp-filter-popover" ref={popoverRef} style={{ top: popoverPosition.top, left: popoverPosition.left }}>
                        <div className="cp-filter-title">Filtrar</div>
                        <div className="cp-filter-list">
                          {optionsFor.numero_factura.map((opt) => (
                            <label key={opt} className="cp-filter-item">
                              <input type="checkbox" checked={filters.numero_factura.includes(opt)} onChange={() => toggleFilterValue('numero_factura', opt)} />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                        <div className="cp-filter-actions">
                          <button type="button" className="cp-filter-clear" onClick={() => clearColumnFilter('numero_factura')}>Limpiar</button>
                        </div>
                      </div>
                    )}
                  </div>
                </th>
                <th>
                  <div className="cp-th">
                    <span>Fecha Facturada</span>
                    <FilterIconButton columnKey="fecha_facturada" label="fecha facturada" />
                    {openFilterKey === 'fecha_facturada' && (
                      <div className="cp-filter-popover" ref={popoverRef} style={{ top: popoverPosition.top, left: popoverPosition.left }}>
                        <div className="cp-filter-title">Filtrar</div>
                        <div className="cp-filter-list">
                          {optionsFor.fecha_facturada.map((opt) => (
                            <label key={opt} className="cp-filter-item">
                              <input type="checkbox" checked={filters.fecha_facturada.includes(opt)} onChange={() => toggleFilterValue('fecha_facturada', opt)} />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                        <div className="cp-filter-actions">
                          <button type="button" className="cp-filter-clear" onClick={() => clearColumnFilter('fecha_facturada')}>Limpiar</button>
                        </div>
                      </div>
                    )}
                  </div>
                </th>
                <th style={{ textAlign: 'center' }}>Viajes</th>
                <th style={{ textAlign: 'right' }}>Monto Total</th>
                <th style={{ textAlign: 'center' }}>Liquidación</th>
                <th style={{ textAlign: 'center' }}>Facturación</th>
                <th style={{ textAlign: 'center' }}>
                  <div className="cp-th cp-th--center">
                    <span>Pago</span>
                    <FilterIconButton columnKey="estado_pago" label="pago" />
                    {openFilterKey === 'estado_pago' && (
                      <div className="cp-filter-popover" ref={popoverRef} style={{ top: popoverPosition.top, left: popoverPosition.left }}>
                        <div className="cp-filter-title">Filtrar</div>
                        <div className="cp-filter-list">
                          {optionsFor.estado_pago.map((opt) => (
                            <label key={opt} className="cp-filter-item">
                              <input type="checkbox" checked={filters.estado_pago.includes(opt)} onChange={() => toggleFilterValue('estado_pago', opt)} />
                              <span>{badgeLabel(opt)}</span>
                            </label>
                          ))}
                        </div>
                        <div className="cp-filter-actions">
                          <button type="button" className="cp-filter-clear" onClick={() => clearColumnFilter('estado_pago')}>Limpiar</button>
                        </div>
                      </div>
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: 24, color: '#6b7280' }}>Cargando...</td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 24, color: '#6b7280' }}>No hay viajes para {monthFilter}/{yearFilter}.</td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr>
                      <td style={{ textAlign: 'center' }}>
                        <button type="button" className="cp-expand-btn" onClick={() => toggleExpand(row.id)}>
                          {expandedRows[row.id] ? '▾' : '▸'}
                        </button>
                      </td>
                      <td><strong>{row.empresa}</strong></td>
                      <td>{row.numero_factura}</td>
                      <td>{row.fecha_facturada_fmt}</td>
                      <td style={{ textAlign: 'center' }}>{row.cantidad_viajes}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.monto_total)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`company-payments-badge ${badgeClass(row.estado_liquidacion)}`}>
                          {badgeLabel(row.estado_liquidacion)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`company-payments-badge ${badgeClass(row.estado_facturacion)}`}>
                          {badgeLabel(row.estado_facturacion)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`company-payments-badge ${badgeClass(row.estado_pago)}`}>
                          {badgeLabel(row.estado_pago)}
                        </span>
                      </td>
                    </tr>
                    {expandedRows[row.id] && (
                      <tr className="cp-detail-row">
                        <td colSpan={9}>
                          <div className="cp-detail-card">
                            <table className="cp-detail-table">
                              <thead>
                                <tr>
                                  <th>ID</th>
                                  <th>Fecha</th>
                                  <th>Origen</th>
                                  <th>Destino</th>
                                  <th>Chofer</th>
                                  <th style={{ textAlign: 'right' }}>Monto</th>
                                  <th>Liqu.</th>
                                  <th>Fact.</th>
                                  <th>Pago</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.trips.map((trip) => (
                                  <tr key={trip.id}>
                                    <td>{trip.id}</td>
                                    <td>{trip.fecha_viaje}</td>
                                    <td>{trip.origen}</td>
                                    <td>{trip.destino}</td>
                                    <td>{trip.chofer}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(trip.monto_total)}</td>
                                    <td>{trip.estado_liquidacion}</td>
                                    <td>{trip.estado_facturacion}</td>
                                    <td>{trip.estado_pago}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CompanyPayments;
