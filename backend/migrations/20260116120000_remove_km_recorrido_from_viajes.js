/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
  await knex.schema.alterTable('viajes_registrados', (table) => {
    table.dropColumn('km_recorridos');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function (knex) {
  await knex.schema.alterTable('viajes_registrados', (table) => {
    table.decimal('km_recorridos', 15, 3).defaultTo(0);
  });
};
