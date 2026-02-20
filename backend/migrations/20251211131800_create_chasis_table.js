/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('chasis', (table) => {
    table.increments('id').primary();

        table.string('Dominio_chasis', 100).notNullable().unique();

        table.enu('estado_general', ['AL_DIA', 'PROXIMO', 'VENCIDO']).defaultTo('AL_DIA');

            // Las pongo nullable por si falta cargar alguna foto al principio
        table.string('url_cedula_chasis', 500).nullable(); 
        table.string('url_tipificacion_carga_chasis', 500).nullable();
        table.string('url_senasa_chasis', 500).nullable();
        table.string('url_titulo_chasis', 500).nullable();
        table.string('url_vtv_chasis', 500).nullable();
        table.string('url_homologacion_chasis', 500).nullable();

                // --- VENCIMIENTOS (Para las Alertas) ---
        table.date('vencimiento_cedula_chasis').nullable(); 
        table.date('vencimiento_tipificacion_carga_chasis').nullable(); // ¡Importante!
        table.date('vencimiento_senasa_chasis').nullable(); // ¡Importante!
        table.date('vencimiento_vtv_chasis').nullable(); // ¡Importante!
        table.date('vencimiento_homologacion_chasis').nullable(); // ¡Importante!
        table.boolean('activo').notNullable().defaultTo(true);

        table.timestamps(true, true);
        
        // Índices para mejorar performance
        table.index('estado_general', 'idx_chasis_estado_general');
        table.index('activo', 'idx_chasis_activo');
 })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('chasis');
}
