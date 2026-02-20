/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasTokenHash = await knex.schema.hasColumn('refreshTokens', 'token_hash');
  if (!hasTokenHash) return;

  // 1) Limpieza preventiva: tokens inválidos
  await knex('refreshTokens').whereNull('token_hash').del();

  // 2) Deduplicar hash (dejamos el más reciente por id)
  const duplicates = await knex('refreshTokens')
    .select('token_hash')
    .whereNotNull('token_hash')
    .groupBy('token_hash')
    .havingRaw('COUNT(*) > 1');

  for (const row of duplicates) {
    const tokenHash = row.token_hash;
    const ids = await knex('refreshTokens')
      .where({ token_hash: tokenHash })
      .orderBy('id', 'desc')
      .pluck('id');

    const [keepId, ...deleteIds] = ids;
    if (keepId && deleteIds.length > 0) {
      await knex('refreshTokens').whereIn('id', deleteIds).del();
    }
  }

  // 3) Constraints/índices
  await knex.raw('ALTER TABLE refreshTokens MODIFY token_hash VARCHAR(512) NOT NULL');
  await knex.raw('CREATE UNIQUE INDEX uq_refresh_tokens_token_hash ON refreshTokens (token_hash)');
  await knex.raw('CREATE INDEX idx_refresh_tokens_user_id ON refreshTokens (user_id)');
  await knex.raw('CREATE INDEX idx_refresh_tokens_expires_at ON refreshTokens (expires_at)');
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasTokenHash = await knex.schema.hasColumn('refreshTokens', 'token_hash');
  if (!hasTokenHash) return;

  await knex.raw('DROP INDEX uq_refresh_tokens_token_hash ON refreshTokens');
  await knex.raw('DROP INDEX idx_refresh_tokens_user_id ON refreshTokens');
  await knex.raw('DROP INDEX idx_refresh_tokens_expires_at ON refreshTokens');
  await knex.raw('ALTER TABLE refreshTokens MODIFY token_hash VARCHAR(512) NULL');
}
