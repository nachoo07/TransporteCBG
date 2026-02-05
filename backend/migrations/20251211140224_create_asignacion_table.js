/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('asignaciones', (table) => {
    table.increments('id').primary();

    // 1. VINCULACIÓN CON CHOFER
    // Referencia a la tabla 'choferes' que hicimos antes
    table.integer('chofer_id').unsigned().notNullable();
    table.foreign('chofer_id').references('id').inTable('choferes').onDelete('CASCADE');

    // 2. VINCULACIÓN CON CHASIS
    // Referencia a tu tabla 'chasis' (singular)
    table.integer('chasis_id').unsigned().notNullable();
    table.foreign('chasis_id').references('id').inTable('chasis').onDelete('CASCADE');

    // 3. VINCULACIÓN CON ACOPLADO
    // Referencia a tu tabla 'acoplado' (singular)
    table.integer('acoplado_id').unsigned().notNullable();
    table.foreign('acoplado_id').references('id').inTable('acoplado').onDelete('CASCADE');

    // 4. CONTROL DE ESTADO (Mínimo indispensable)
    // 'activo': true significa que es la configuración actual. 
    // Cuando el chofer cambia de camión, pasas este a false y creas uno nuevo.
    table.boolean('activo').defaultTo(true);
    
    // Fecha de creación automática (para saber cuándo se armó este equipo)
    table.timestamps(true, true);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('asignaciones');
}