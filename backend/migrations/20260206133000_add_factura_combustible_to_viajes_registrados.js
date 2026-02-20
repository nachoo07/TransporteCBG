/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
  await knex.schema.alterTable('viajes_registrados', (table) => {
    table.string('factura_combustible').nullable().after('combustible_monto');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function (knex) {
  await knex.schema.alterTable('viajes_registrados', (table) => {
    table.dropColumn('factura_combustible');
  });
};

