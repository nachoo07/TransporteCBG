export const up = async function (knex) {
  await knex.schema.alterTable('viajes_registrados', (table) => {
    table.decimal('tarifa_valor', 15, 2).nullable().alter();
    table.decimal('valor_neto', 18, 2).nullable().alter();
    table.decimal('valor_iva', 18, 2).nullable().alter();
    table.decimal('precio_fijo', 15, 2).nullable().alter();

    table.decimal('adelanto_monto', 15, 2).defaultTo(0).alter();
    table.decimal('combustible_litros', 15, 3).defaultTo(0).alter();
    table.decimal('combustible_monto', 18, 2).defaultTo(0).alter();

    table.decimal('cantidad_cargada', 15, 3).defaultTo(0).alter();
    table.decimal('cantidad_descargada', 15, 3).defaultTo(0).alter();
  });
};

export const down = async function (knex) {
  await knex.schema.alterTable('viajes_registrados', (table) => {
    table.float('tarifa_valor').nullable().alter();
    table.float('valor_neto').nullable().alter();
    table.float('valor_iva').nullable().alter();
    table.float('precio_fijo').nullable().alter();

    table.float('adelanto_monto').defaultTo(0).alter();
    table.float('combustible_litros').defaultTo(0).alter();
    table.float('combustible_monto').defaultTo(0).alter();

    table.float('cantidad_cargada').defaultTo(0).alter();
    table.float('cantidad_descargada').defaultTo(0).alter();
  });
};
