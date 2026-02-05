/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function (knex) {
  return knex.schema.createTable('empresas', (table) => {
    table.increments('id').primary();
    table.string('nombre').notNullable().unique(); // Nombre de la empresa
    
    // Configuración para el frontend: ¿Cómo paga esta empresa?
    // 'TARIFA' = Habilita inputs de Tarifa/TN. 'FIJO' = Habilita input Precio Fijo.
    table.enum('tipo_cobro', ['TARIFA', 'FIJO']).notNullable().defaultTo('TARIFA');
    
    table.boolean('activo').defaultTo(true);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function (knex) {
  return knex.schema.dropTable('empresas');
};
