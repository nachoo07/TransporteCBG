export const verificarInfoCompletaChasis = (chasis) => {
  const camposRequeridos = [
    chasis.Dominio_chasis,
    chasis.vencimiento_cedula_chasis,
    chasis.vencimiento_vtv_chasis,
    chasis.vencimiento_senasa_chasis,
    chasis.vencimiento_homologacion_chasis,
    chasis.vencimiento_tipificacion_carga_chasis,
    chasis.url_cedula_chasis,
    chasis.url_vtv_chasis,
    chasis.url_senasa_chasis,
    chasis.url_homologacion_chasis,
    chasis.url_tipificacion_carga_chasis,
    chasis.url_titulo_chasis
  ];
    return camposRequeridos.every(campo => campo !== null && campo !== undefined && campo !== '');
};

export default verificarInfoCompletaChasis;