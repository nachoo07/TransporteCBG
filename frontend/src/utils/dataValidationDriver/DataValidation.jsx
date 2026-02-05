export const verificarInfoCompleta = (driver) => {
    // Lista de campos OBLIGATORIOS para considerar el perfil "Completo"
    const camposRequeridos = [
        driver.nombre,
        driver.apellido,
        driver.dni,
        driver.url_dni, // Foto del DNI
        driver.url_licencia,
        driver.vencimiento_licencia,
        driver.url_psicofisico,
        driver.vencimiento_psicofisico,
        driver.url_curso_carga_normal,
        driver.vencimiento_carga_normal,
        driver.url_curso_carga_peligrosa,
        driver.vencimiento_carga_peligrosa
    ];

    // Si ALGUNO de estos es null, undefined o string vacío, retorna false (Incompleto)
    return camposRequeridos.every(campo => campo !== null && campo !== undefined && campo !== '');
};

export default verificarInfoCompleta;
