export const verificarInfoCompletaCoupled = (coupled) => {
  const camposRequeridos = [
    coupled.Dominio_acoplado,
    coupled.vencimiento_cedula_acoplado,
    coupled.vencimiento_vtv_acoplado,
    coupled.vencimiento_senasa_acoplado,
    coupled.vencimiento_homologacion_acoplado,
    coupled.vencimiento_tipificacion_carga_acoplado,
    coupled.url_cedula_acoplado,
    coupled.url_vtv_acoplado,
    coupled.url_senasa_acoplado,
    coupled.url_homologacion_acoplado,
    coupled.url_tipificacion_carga_acoplado,
    coupled.url_titulo_acoplado
  ];
  return camposRequeridos.every(campo => campo !== null && campo !== undefined && campo !== '');
};

export default verificarInfoCompletaCoupled;
