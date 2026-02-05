/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.createTable('choferes', (table) => {
        table.increments('id').primary();
        
        // Datos Personales
        table.string('nombre', 100).notNullable();
        table.string('apellido', 100).notNullable();
        table.string('dni', 20).notNullable().unique(); // String de 20 por si hay guiones

        // Fechas de Estado
        table.timestamp('fecha_de_alta').defaultTo(knex.fn.now()); // <-- Cambiado a timestamp
        table.date('fecha_de_baja').nullable();
        table.boolean('activo').defaultTo(true);
        // Estado general para alertas rápidas: AL_DIA, PROXIMO o VENCIDO
        table.enu('estado_general', ['AL_DIA', 'PROXIMO', 'VENCIDO']).defaultTo('AL_DIA');

        // --- DOCUMENTACIÓN (URLs de Cloudinary) ---
        // Las pongo nullable por si falta cargar alguna foto al principio
        table.string('url_dni', 500).nullable(); 
        table.string('url_licencia', 500).nullable();
        table.string('url_psicofisico', 500).nullable();
        table.string('url_curso_carga_normal', 500).nullable();
        table.string('url_curso_carga_peligrosa', 500).nullable();

        // --- VENCIMIENTOS (Para las Alertas) ---
        table.date('vencimiento_licencia').nullable(); 
        table.date('vencimiento_psicofisico').nullable(); // ¡Importante!
        table.date('vencimiento_carga_normal').nullable(); // ¡Importante!
        table.date('vencimiento_carga_peligrosa').nullable(); // ¡Importante!

        table.timestamps(true, true);
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.dropTable('choferes');
}