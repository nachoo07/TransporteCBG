/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Verificar qué columnas ya existen
  const hasActivo = await knex.schema.hasColumn('chasis', 'activo');
  const hasEstadoGeneral = await knex.schema.hasColumn('chasis', 'estado_general');
  
  return knex.schema.alterTable('chasis', (table) => {
    // Solo agregar activo si no existe
    if (!hasActivo) {
      table.boolean('activo').notNullable().defaultTo(true);
    }
    // No agregar estado_general porque ya existe desde create_chasis_table
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasActivo = await knex.schema.hasColumn('chasis', 'activo');
  
  return knex.schema.alterTable('chasis', (table) => {
    // Solo eliminar activo si existe
    if (hasActivo) {
      table.dropColumn('activo');
    }
    // No eliminar estado_general porque pertenece a create_chasis_table
  });
}
