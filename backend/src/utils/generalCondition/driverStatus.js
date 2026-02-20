const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Parse robusto para "fecha-only" evitando corrimientos por timezone.
// - Si viene "YYYY-MM-DD" → se interpreta como fecha local (00:00).
// - Si viene Date → se normaliza a 00:00 local.
// - Si viene otro string → se intenta Date(...) y se normaliza.
const parseDateOnlyLocal = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    const d = new Date(value.getTime());
    d.setHours(0, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]);
      const day = Number(m[3]);
      const d = new Date(year, month - 1, day);
      d.setHours(0, 0, 0, 0);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
};

const diffDaysFromToday = (dateOnly) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((dateOnly.getTime() - today.getTime()) / MS_PER_DAY);
};

export const calcularEstadoGeneral = (objetoFechas) => {
  // Object.values extrae solo valores: sirve para Choferes/Chasis/Acoplados.
  const listaFechas = Object.values(objetoFechas);

  let estado = 'AL_DIA';
  for (const v of listaFechas) {
    const fechaVenc = parseDateOnlyLocal(v);
    if (!fechaVenc) continue;

    const diffDays = diffDaysFromToday(fechaVenc);
    if (diffDays < 0) return 'VENCIDO';
    if (diffDays <= 30) estado = 'PROXIMO';
  }

  return estado;
};

export const calcularEstadoFecha = (fechaString) => {
  const fecha = parseDateOnlyLocal(fechaString);
  if (!fecha) return null;

  const diffDays = diffDaysFromToday(fecha);
  if (diffDays < 0) return 'VENCIDO';
  if (diffDays <= 30) return 'PROXIMO';
  return 'AL_DIA';
};
