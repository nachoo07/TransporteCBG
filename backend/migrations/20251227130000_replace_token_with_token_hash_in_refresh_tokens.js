/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasToken = await knex.schema.hasColumn('refreshTokens', 'token');
  const hasTokenHash = await knex.schema.hasColumn('refreshTokens', 'token_hash');

  if (!hasTokenHash) {
    await knex.schema.alterTable('refreshTokens', (table) => {
      table.string('token_hash', 512);
    });
  }

  if (hasToken) {
    // Si existe la columna original `token`, la eliminamos (no migramos valores por seguridad)
    await knex.schema.alterTable('refreshTokens', (table) => {
      table.dropColumn('token');
    });
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasToken = await knex.schema.hasColumn('refreshTokens', 'token');
  const hasTokenHash = await knex.schema.hasColumn('refreshTokens', 'token_hash');

  if (!hasToken && hasTokenHash) {
    await knex.schema.alterTable('refreshTokens', (table) => {
      table.string('token', 512);
    });
  }

  if (hasTokenHash) {
    await knex.schema.alterTable('refreshTokens', (table) => {
      table.dropColumn('token_hash');
    });
  }
}
