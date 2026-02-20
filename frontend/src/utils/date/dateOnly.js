export const parseDateOnlyLocal = (value) => {
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

