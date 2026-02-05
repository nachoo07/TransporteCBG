/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('acoplado', (table) => {
    table.increments('id').primary();

        table.string('Dominio_acoplado', 100).notNullable().unique();

        table.string('url_cedula_acoplado', 500).nullable(); 
        table.string('url_tipificacion_carga_acoplado', 500).nullable();
        table.string('url_senasa_acoplado', 500).nullable();
        table.string('url_titulo_acoplado', 500).nullable();
        table.string('url_vtv_acoplado', 500).nullable();
        table.string('url_homologacion_acoplado', 500).nullable();

        // --- VENCIMIENTOS (Para las Alertas) ---
        table.date('vencimiento_cedula_acoplado').nullable(); 
        table.date('vencimiento_tipificacion_carga_acoplado').nullable(); // ¡Importante!
        table.date('vencimiento_senasa_acoplado').nullable(); // ¡Importante!
        table.date('vencimiento_vtv_acoplado').nullable(); // ¡Importante!
        table.date('vencimiento_homologacion_acoplado').nullable(); // ¡Importante!
        
        // Estado y activación
        table.enu('estado_general', ['AL_DIA', 'PROXIMO', 'VENCIDO']).defaultTo('AL_DIA');
        table.boolean('activo').notNullable().defaultTo(true);
        
        // Índices de performance
        table.index('estado_general', 'idx_acoplado_estado_general');
        table.index('activo', 'idx_acoplado_activo');
        
        table.timestamps(true, true);
        });
        });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('acoplado');
}

