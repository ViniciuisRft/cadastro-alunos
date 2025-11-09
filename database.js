// Substitua o conteúdo de database.js por este
const Database = require('better-sqlite3');
const path = require('path');

// Caminho absoluto do banco de dados
const dbPath = path.resolve(__dirname, 'alunos.db');
const db = new Database(dbPath);

// Cria a tabela com colunas de endereço se não existir
db.prepare(`
  CREATE TABLE IF NOT EXISTS alunos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    data_nascimento TEXT NOT NULL,
    turma TEXT,
    telefone TEXT,
    email TEXT,
    cep TEXT,
    rua TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT
  )
`).run();

// Se a tabela já existia sem colunas novas, tenta adicionar colunas (seguro)
const colunasParaAdicionar = [
  { name: 'telefone' },
  { name: 'cep' },
  { name: 'rua' },
  { name: 'numero' },
  { name: 'complemento' },
  { name: 'bairro' },
  { name: 'cidade' },
  { name: 'estado' },
  { name: 'situacao' }
];

colunasParaAdicionar.forEach(col => {
  try {
    db.prepare(`ALTER TABLE alunos ADD COLUMN ${col.name} TEXT`).run();
  } catch (err) {
    // Se coluna já existe, sqlite lança erro — ignoramos
  }
});

// --- Funções do banco de dados --- //

// Listar todos os alunos
function listarAlunos() {
  try {
    return db.prepare('SELECT * FROM alunos ORDER BY id DESC').all();
  } catch (error) {
    console.error('Erro ao listar alunos:', error);
    return [];
  }
}

// Inserir novo aluno (com endereço)
function inserirAluno({ nome, data_nascimento, turma, telefone, email, cep, rua, numero, complemento, bairro, cidade, estado, situacao }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO alunos 
        (nome, data_nascimento, turma, telefone, email, cep, rua, numero, complemento, bairro, cidade, estado, situacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      nome,
      data_nascimento,
      turma || '',
      telefone || '',
      email || '',
      cep || '',
      rua || '',
      numero || '',
      complemento || '',
      bairro || '',
      cidade || '',
      estado || '',
      situacao || 'Ativo'
    );
  } catch (error) {
    console.error('Erro ao inserir aluno:', error);
  }
}

// Atualizar aluno (com endereço)
function atualizarAluno(id, { nome, data_nascimento, turma, telefone, email, cep, rua, numero, complemento, bairro, cidade, estado, situacao }) {
  try {
    const stmt = db.prepare(`
      UPDATE alunos SET
        nome = ?, data_nascimento = ?, turma = ?, telefone = ?, email = ?,
        cep = ?, rua = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, estado = ?, situacao = ?
      WHERE id = ?
    `);
    stmt.run(
      nome,
      data_nascimento,
      turma || '',
      telefone || '',
      email || '',
      cep || '',
      rua || '',
      numero || '',
      complemento || '',
      bairro || '',
      cidade || '',
      estado || '',
      situacao || 'Ativo',
      id
    );
  } catch (error) {
    console.error('Erro ao atualizar aluno:', error);
  }
}

// Deletar aluno
function deletarAluno(id) {
  try {
    const stmt = db.prepare('DELETE FROM alunos WHERE id = ?');
    stmt.run(id);
  } catch (error) {
    console.error('Erro ao deletar aluno:', error);
  }
}

// Tabela de presenças
db.prepare(`
  CREATE TABLE IF NOT EXISTS presencas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER,
    turma TEXT,
    data TEXT,
    presente INTEGER DEFAULT 0,
    FOREIGN KEY (aluno_id) REFERENCES alunos(id)
  )
`).run();

function registrarPresencas(lista) {
  const insert = db.prepare(`INSERT INTO presencas (aluno_id, turma, data, presente) VALUES (?, ?, ?, ?)`);
  const transaction = db.transaction((dados) => {
    dados.forEach(p => insert.run(p.aluno_id, p.turma, p.data, p.presente ? 1 : 0));
  });
  transaction(lista);
}

function listarPresencas(turma, data) {
  return db.prepare(`SELECT * FROM presencas WHERE turma = ? AND data = ?`).all(turma, data);
}

function excluirPresencas(turma, data) {
  const stmt = db.prepare(`DELETE FROM presencas WHERE turma = ? AND data = ?`);
  stmt.run(turma, data);
}

function existePresenca(turma, data) {
  const stmt = db.prepare('SELECT COUNT(*) as total FROM presencas WHERE turma = ? AND data = ?');
  const result = stmt.get(turma, data);
  return result.total > 0;
}

function substituirPresencas(turma, data, presencas) {
  const del = db.prepare('DELETE FROM presencas WHERE turma = ? AND data = ?');
  del.run(turma, data);
  registrarPresencas(presencas.map(p => ({ ...p, turma, data })));
}

module.exports = {
  listarAlunos,
  inserirAluno,
  atualizarAluno,
  deletarAluno,
  registrarPresencas,
  listarPresencas,
  excluirPresencas,
  existePresenca,
  substituirPresencas
};

