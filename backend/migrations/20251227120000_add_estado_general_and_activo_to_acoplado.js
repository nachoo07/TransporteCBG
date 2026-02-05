/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasActivo = await knex.schema.hasColumn('acoplado', 'activo');
  const hasEstadoGeneral = await knex.schema.hasColumn('acoplado', 'estado_general');
  
  return knex.schema.alterTable('acoplado', (table) => {
    if (!hasActivo) {
      table.boolean('activo').notNullable().defaultTo(true);
    }
    if (!hasEstadoGeneral) {
      table.enu('estado_general', ['AL_DIA', 'PROXIMO', 'VENCIDO']).defaultTo('AL_DIA');
    }
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasActivo = await knex.schema.hasColumn('acoplado', 'activo');
  const hasEstadoGeneral = await knex.schema.hasColumn('acoplado', 'estado_general');
  
  return knex.schema.alterTable('acoplado', (table) => {
    if (hasActivo) table.dropColumn('activo');
    if (hasEstadoGeneral) table.dropColumn('estado_general');
  });
}
