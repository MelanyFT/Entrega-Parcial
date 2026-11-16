/** Repositorio de usuarios respaldado por SQLite. */
export function createSqliteUserRepository(db) {
  const findByUsernameStatement = db.prepare(
    `SELECT id, username, display_name, password_hash
     FROM users
     WHERE username = ? COLLATE NOCASE
     LIMIT 1`
  );

  const findByIdStatement = db.prepare(
    `SELECT id, username, display_name
     FROM users
     WHERE id = ?
     LIMIT 1`
  );

  function mapUser(row) {
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      passwordHash: row.password_hash,
    };
  }

  return {
    async findByUsername(username) {
      return mapUser(findByUsernameStatement.get(username));
    },

    async findById(id) {
      const row = findByIdStatement.get(id);
      if (!row) return null;
      return { id: row.id, username: row.username, displayName: row.display_name };
    },
  };
}
