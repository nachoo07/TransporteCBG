/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.createTable('refreshTokens', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('token', 512).notNullable();
    table.dateTime('expires_at').notNullable();
    table.timestamps(true, true);

    table.foreign('user_id').references('id').inTable('usuarios').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */


export function down(knex) {
  return knex.schema.dropTable('refreshTokens');
}
