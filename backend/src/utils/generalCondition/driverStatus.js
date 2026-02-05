export const calcularEstadoGeneral = (objetoFechas) => {
    // TRUCO: Object.values extrae solo los valores del objeto, ignorando las claves.
    // Así la función sirve para Choferes, Chasis y Acoplados por igual.
    const listaFechas = Object.values(objetoFechas);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let estado = 'AL_DIA'; // Optimismo por defecto

    for (let fechaString of listaFechas) {
        if (!fechaString) continue; // Si es null, lo saltamos

        const fechaVenc = new Date(fechaString);
        fechaVenc.setHours(0, 0, 0, 0);

        // Diferencia en milisegundos -> días
        const diffTime = fechaVenc - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return 'VENCIDO'; // Prioridad máxima
        } 
        
        if (diffDays <= 30) {
            estado = 'PROXIMO'; // Alerta amarilla
        }
    }

    return estado;
};

export const calcularEstadoFecha = (fechaString) => {
  if (!fechaString) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fecha = new Date(fechaString);
  fecha.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((fecha - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'VENCIDO';
  if (diffDays <= 30) return 'PROXIMO';
  return 'AL_DIA';
};