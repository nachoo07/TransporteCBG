/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const exists = await knex.schema.hasColumn('choferes', 'estado_general');
  if (!exists) {
    await knex.schema.alterTable('choferes', (table) => {
      table.enu('estado_general', ['AL_DIA', 'PROXIMO', 'VENCIDO']).defaultTo('AL_DIA');
    });
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // No-op: mantenemos la columna si ya existía desde la creación inicial
  return Promise.resolve();
}
