/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasFechaFin = await knex.schema.hasColumn('asignaciones', 'fecha_fin');
  return knex.schema.alterTable('asignaciones', (table) => {
    if (!hasFechaFin) table.datetime('fecha_fin').nullable();
    table.index('activo', 'idx_asignaciones_activo');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasFechaFin = await knex.schema.hasColumn('asignaciones', 'fecha_fin');
  return knex.schema.alterTable('asignaciones', (table) => {
    if (hasFechaFin) table.dropColumn('fecha_fin');
    table.dropIndex('activo', 'idx_asignaciones_activo');
  });
}
