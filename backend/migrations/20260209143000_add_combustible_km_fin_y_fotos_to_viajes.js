/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function (knex) {
  return knex.schema.alterTable('viajes_registrados', (table) => {
    // KM inicio ya existe como `combustible_km` (lo usamos como KM inicio).
    table.float('combustible_km_fin').nullable(); // KM al llegar (foto al finalizar viaje)

    // Evidencias
    table.string('foto_km_inicio').nullable(); // URL Cloudinary
    table.string('foto_km_fin').nullable(); // URL Cloudinary
    table.string('foto_factura_combustible').nullable(); // URL Cloudinary
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function (knex) {
  return knex.schema.alterTable('viajes_registrados', (table) => {
    table.dropColumn('combustible_km_fin');
    table.dropColumn('foto_km_inicio');
    table.dropColumn('foto_km_fin');
    table.dropColumn('foto_factura_combustible');
  });
};

