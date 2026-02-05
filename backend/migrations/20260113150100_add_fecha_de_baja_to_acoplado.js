export const up = async (knex) => {
    // Agregar columna fecha_de_baja a tabla acoplado
    await knex.schema.table('acoplado', (table) => {
        table.dateTime('fecha_de_baja').nullable().after('activo');
    });
};

export const down = async (knex) => {
    // Remover columna fecha_de_baja de tabla acoplado
    await knex.schema.table('acoplado', (table) => {
        table.dropColumn('fecha_de_baja');
    });
};
