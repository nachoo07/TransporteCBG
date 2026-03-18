export const DEFAULT_SERVICE_INTERVAL_KM = 40000;
export const DEFAULT_SERVICE_WARNING_KM = 5000;

export const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const buildServiceSnapshot = (chassis) => {
  const intervalKm =
    toFiniteNumberOrNull(chassis?.service_intervalo_km) ?? DEFAULT_SERVICE_INTERVAL_KM;
  const kmActual =
    toFiniteNumberOrNull(chassis?.km_actual) ??
    toFiniteNumberOrNull(chassis?.km_inicial) ??
    0;
  const kmUltimoService =
    toFiniteNumberOrNull(chassis?.km_ultimo_service) ??
    toFiniteNumberOrNull(chassis?.km_inicial) ??
    kmActual;
  const kmDesdeUltimoService = Math.max(0, kmActual - kmUltimoService);
  const kmRestantesService = Math.max(0, intervalKm - kmDesdeUltimoService);

  let serviceEstado = 'AL_DIA';
  if (kmDesdeUltimoService >= intervalKm) {
    serviceEstado = 'PENDIENTE';
  } else if (kmRestantesService <= DEFAULT_SERVICE_WARNING_KM) {
    serviceEstado = 'PROXIMO';
  }

  return {
    km_actual: kmActual,
    km_ultimo_service: kmUltimoService,
    service_intervalo_km: intervalKm,
    km_desde_ultimo_service: kmDesdeUltimoService,
    km_restantes_service: kmRestantesService,
    service_estado: serviceEstado,
    service_alerta: serviceEstado === 'PENDIENTE',
  };
};
