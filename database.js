const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function init() {
  const db = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS alunos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      data_nascimento TEXT,
      cep TEXT,
      logradouro TEXT,
      numero TEXT,
      bairro TEXT,
      cidade TEXT,
      estado TEXT,
      turma TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}

const dbPromise = init();

module.exports = {
  run: async (sql, params=[]) => {
    const db = await dbPromise;
    return db.run(sql, params);
  },
  get: async (sql, params=[]) => {
    const db = await dbPromise;
    return db.get(sql, params);
  },
  all: async (sql, params=[]) => {
    const db = await dbPromise;
    return db.all(sql, params);
  }
};
