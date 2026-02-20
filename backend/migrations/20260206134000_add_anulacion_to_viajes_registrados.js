/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
  await knex.schema.alterTable('viajes_registrados', (table) => {
    table.boolean('anulado').notNullable().defaultTo(false).after('estado_general');
    table.text('anulado_motivo').nullable().after('anulado');
    table.dateTime('anulado_at').nullable().after('anulado_motivo');
    table
      .integer('anulado_by_user_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('usuarios')
      .onDelete('SET NULL')
      .after('anulado_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function (knex) {
  await knex.schema.alterTable('viajes_registrados', (table) => {
    table.dropColumn('anulado_by_user_id');
    table.dropColumn('anulado_at');
    table.dropColumn('anulado_motivo');
    table.dropColumn('anulado');
  });
};

