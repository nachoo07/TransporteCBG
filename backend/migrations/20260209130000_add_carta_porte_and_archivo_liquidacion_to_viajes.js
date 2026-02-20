/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function (knex) {
  return knex.schema.alterTable('viajes_registrados', (table) => {
    table.string('carta_de_porte').nullable();
    table.string('archivo_factura_liquidado').nullable(); // URL Cloudinary (pdf/imagen)
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function (knex) {
  return knex.schema.alterTable('viajes_registrados', (table) => {
    table.dropColumn('carta_de_porte');
    table.dropColumn('archivo_factura_liquidado');
  });
};

