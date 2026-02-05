export const up = async (knex) => {
    // Agregar columna fecha_de_baja a tabla chasis
    await knex.schema.table('chasis', (table) => {
        table.dateTime('fecha_de_baja').nullable().after('activo');
    });
};

export const down = async (knex) => {
    // Remover columna fecha_de_baja de tabla chasis
    await knex.schema.table('chasis', (table) => {
        table.dropColumn('fecha_de_baja');
    });
};
