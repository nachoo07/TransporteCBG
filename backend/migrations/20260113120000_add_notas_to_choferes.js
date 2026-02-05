/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.table('choferes', (table) => {
        table.text('notas').nullable(); // Campo para notas/observaciones
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.table('choferes', (table) => {
        table.dropColumn('notas');
    });
}
