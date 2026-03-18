/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
  await knex.schema.alterTable('viajes_registrados', (table) => {
    table.string('estacion_nombre_vuelta').nullable();
    table.float('combustible_litros_vuelta').defaultTo(0);
    table.float('combustible_monto_vuelta').defaultTo(0);
    table.string('factura_combustible_vuelta').nullable();
    table.float('combustible_km_vuelta').nullable();
    table.float('combustible_km_fin_vuelta').nullable();
    table.string('foto_factura_combustible_vuelta').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function (knex) {
  await knex.schema.alterTable('viajes_registrados', (table) => {
    table.dropColumn('estacion_nombre_vuelta');
    table.dropColumn('combustible_litros_vuelta');
    table.dropColumn('combustible_monto_vuelta');
    table.dropColumn('factura_combustible_vuelta');
    table.dropColumn('combustible_km_vuelta');
    table.dropColumn('combustible_km_fin_vuelta');
    table.dropColumn('foto_factura_combustible_vuelta');
  });
};
