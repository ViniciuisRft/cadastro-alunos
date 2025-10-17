const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Criar
app.post('/api/alunos', async (req, res) => {
  const { nome, data_nascimento, cep, logradouro, numero, bairro, cidade, estado, turma } = req.body;
  try {
    const stmt = await db.run(
      `INSERT INTO alunos (nome, data_nascimento, cep, logradouro, numero, bairro, cidade, estado, turma)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nome, data_nascimento, cep, logradouro, numero, bairro, cidade, estado, turma]
    );
    res.status(201).json({ id: stmt.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar aluno' });
  }
});

// Listar
app.get('/api/alunos', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM alunos ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar alunos' });
  }
});

// Consultar id
app.get('/api/alunos/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const row = await db.get('SELECT * FROM alunos WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Aluno não encontrado' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar aluno' });
  }
});

// Excluir
app.delete('/api/alunos/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await db.run('DELETE FROM alunos WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir aluno' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
