/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function (knex) {
  return knex.schema.createTable('viajes_registrados', (table) => {
    table.increments('id').primary();

    // --- A. ASIGNACIÓN (Foto del momento) ---
    table.date('fecha_viaje').notNullable();
    
    // Relaciones (Foreign Keys)
    table.integer('chofer_id').unsigned().references('id').inTable('choferes').onDelete('SET NULL');
    table.integer('chasis_id').unsigned().references('id').inTable('chasis').onDelete('SET NULL');
    table.integer('acoplado_id').unsigned().nullable().references('id').inTable('acoplado').onDelete('SET NULL');
    table.integer('empresa_id').unsigned().references('id').inTable('empresas').onDelete('RESTRICT');

    // --- B. DOCUMENTACIÓN ---
    table.string('remito').nullable();
    table.string('hoja_ruta').nullable();
    table.string('numero_proforma').nullable(); // O número de viaje interno
    table.text('especiales').nullable(); // Notas o comentario

    // --- C. LOGÍSTICA ---
    table.string('origen').nullable(); // Desde
    table.string('destino').nullable(); // Hasta
    table.float('cantidad_cargada').defaultTo(0);    // KG o TN
    table.float('cantidad_descargada').defaultTo(0); // KG o TN (Clave para cálculo)

    // --- D. TARIFAS Y VALORES ---
    // Si la empresa es 'TARIFA', se usa tarifa_valor. Si es 'FIJO', se usa precio_fijo.
    table.float('tarifa_valor').nullable(); // Valor unitario por TN/KG
    
    // Cálculos (Se guardan para consistencia histórica)
    table.float('valor_neto').nullable(); // (Descarga * Tarifa) o Precio Fijo
    table.float('valor_iva').nullable();  // Valor Neto * 0.21
    table.float('precio_fijo').nullable(); // Valor manual si aplica

    // Facturación del viaje
    table.string('numero_factura').nullable();
    table.string('foto_factura').nullable(); // URL de la imagen en Cloudinary/Server

    // --- E. ADELANTOS ---
    table.float('adelanto_monto').defaultTo(0);
    table.string('adelanto_metodo').nullable(); // 'EFECTIVO', 'TRANSFERENCIA', etc.
    table.string('adelanto_responsable').nullable(); // Quién entregó el dinero

    // --- F. COMBUSTIBLE ---
    table.string('estacion_nombre').nullable();
    table.float('combustible_litros').defaultTo(0);
    table.float('combustible_monto').defaultTo(0);
    table.float('combustible_km').nullable(); // Kilometraje al cargar (opcional)

    // --- G. ESTADOS Y CONTROL ---
    table.enum('estado_liquidacion', ['FALTA', 'LIQUIDADO']).defaultTo('FALTA');
    table.string('orden_pago').nullable(); // N° Orden de pago
    
    table.enum('estado_facturacion', ['FALTA', 'FACTURADO']).defaultTo('FALTA');
    table.enum('estado_pago', ['DEBEN', 'PAGADO']).defaultTo('DEBEN');
    
    // Estado calculado automáticamente (Completo/Incompleto)
    table.enum('estado_general', ['INCOMPLETO', 'COMPLETO']).defaultTo('INCOMPLETO');

    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function (knex) {
  return knex.schema.dropTableIfExists('viajes_registrados');
};
