/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
  await knex.schema.createTable('pagos_choferes_ajustes', (table) => {
    table.increments('id').primary();
    table
      .integer('pago_chofer_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('pagos_choferes')
      .onDelete('CASCADE');

    table.string('descripcion', 255).notNullable();
    table.decimal('monto', 18, 2).notNullable(); // puede ser + o -

    table.timestamps(true, true);

    table.index(['pago_chofer_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function (knex) {
  await knex.schema.dropTableIfExists('pagos_choferes_ajustes');
};

