/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable('chasis', (table) => {
    table.decimal('km_inicial', 15, 3).nullable();
    table.decimal('km_actual', 15, 3).nullable();
    table.decimal('km_ultimo_service', 15, 3).nullable();
    table.date('fecha_ultimo_service').nullable();
    table.text('observacion_ultimo_service').nullable();
    table.integer('service_intervalo_km').notNullable().defaultTo(40000);
  });

  await knex('chasis').update({
    km_inicial: knex.raw('COALESCE(km_inicial, 0)'),
    km_actual: knex.raw('COALESCE(km_actual, km_inicial, 0)'),
    km_ultimo_service: knex.raw('COALESCE(km_ultimo_service, km_actual, km_inicial, 0)'),
    service_intervalo_km: knex.raw('COALESCE(service_intervalo_km, 40000)'),
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('chasis', (table) => {
    table.dropColumn('km_inicial');
    table.dropColumn('km_actual');
    table.dropColumn('km_ultimo_service');
    table.dropColumn('fecha_ultimo_service');
    table.dropColumn('observacion_ultimo_service');
    table.dropColumn('service_intervalo_km');
  });
}
