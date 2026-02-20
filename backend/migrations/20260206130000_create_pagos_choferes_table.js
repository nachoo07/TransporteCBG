/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
  await knex.schema.createTable('pagos_choferes', (table) => {
    table.increments('id').primary();
    table
      .integer('viaje_id')
      .unsigned()
      .notNullable()
      .unique()
      .references('id')
      .inTable('viajes_registrados')
      .onDelete('CASCADE');

    table
      .enum('tipo', ['PORCENTAJE', 'FIJO'])
      .notNullable()
      .defaultTo('PORCENTAJE');

    table.decimal('porcentaje', 5, 2).nullable(); // 0..100
    table.decimal('precio_fijo', 18, 2).nullable(); // ARS

    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function (knex) {
  await knex.schema.dropTableIfExists('pagos_choferes');
};

