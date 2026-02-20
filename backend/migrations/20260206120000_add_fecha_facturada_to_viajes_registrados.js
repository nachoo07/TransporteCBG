/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
  await knex.schema.alterTable('viajes_registrados', (table) => {
    table.date('fecha_facturada').nullable().after('foto_factura');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function (knex) {
  await knex.schema.alterTable('viajes_registrados', (table) => {
    table.dropColumn('fecha_facturada');
  });
};

