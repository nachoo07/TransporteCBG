/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

export function up(knex) {
  return knex.schema.createTable('usuarios', (table) => {
    table.increments('id').primary(); // ID autoincremental (1, 2, 3...)
    table.string('nombre', 100).notNullable(); // Nombre del administrativo
    table.string('apellido', 100).notNullable(); // Apellido del administrativo
    table.string('email', 100).unique().notNullable(); // Email único (login)
    table.string('password', 255).notNullable(); // Contraseña encriptada
    table.boolean('activo').defaultTo(true); // Para bloquear acceso sin borrar
    table.timestamps(true, true); 
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('usuarios');
}





  