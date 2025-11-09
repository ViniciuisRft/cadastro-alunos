const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Rotas de páginas ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// --- ROTAS DA API --- //

// Listar todos os alunos
app.get('/alunos', (req, res) => {
  try {
    const alunos = db.listarAlunos();
    res.json(alunos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao listar alunos.' });
  }
});

// Cadastrar novo aluno (aceita endereço)
app.post('/alunos', (req, res) => {
  try {
    const {
      nome, data_nascimento, turma, telefone, email,
      cep, rua, numero, complemento, bairro, cidade, estado, situacao
    } = req.body;

    if (!nome || !data_nascimento) {
      return res.status(400).json({ erro: 'Nome e Data de Nascimento são obrigatórios.' });
    }

    db.inserirAluno({ nome, data_nascimento, turma, telefone, email, cep, rua, numero, complemento, bairro, cidade, estado, situacao });
    res.status(201).json({ mensagem: 'Aluno cadastrado com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao cadastrar aluno.' });
  }
});

// Atualizar aluno existente (aceita endereço)
app.put('/alunos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome, data_nascimento, turma, telefone, email,
      cep, rua, numero, complemento, bairro, cidade, estado, situacao
    } = req.body;

    db.atualizarAluno(id, { nome, data_nascimento, turma, telefone, email, cep, rua, numero, complemento, bairro, cidade, estado, situacao });
    res.json({ mensagem: 'Aluno atualizado com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao atualizar aluno.' });
  }
});

// Excluir aluno
app.delete('/alunos/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.deletarAluno(id);
    res.json({ mensagem: 'Aluno excluído com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao excluir aluno.' });
  }
});

// Registrar ou substituir presenças
app.post('/presencas', (req, res) => {
  try {
    const { turma, data, presencas, substituir } = req.body;
    if (!turma || !data || !Array.isArray(presencas)) {
      return res.status(400).json({ erro: 'Dados inválidos.' });
    }

    const jaExiste = db.existePresenca(turma, data);

    if (jaExiste && !substituir) {
      return res.status(409).json({ aviso: 'Presenças já registradas para essa data.' });
    }

    if (jaExiste && substituir) {
      db.substituirPresencas(turma, data, presencas);
      return res.json({ mensagem: 'Presenças substituídas com sucesso!' });
    }

    db.registrarPresencas(presencas.map(p => ({ ...p, turma, data })));
    res.json({ mensagem: 'Presenças salvas com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao registrar presenças.' });
  }
});

// Consultar presenças salvas
app.get('/presencas', (req, res) => {
  try {
    const { turma, data } = req.query;
    if (!turma || !data) {
      return res.status(400).json({ erro: 'Informe turma e data.' });
    }
    const registros = db.listarPresencas(turma, data);
    res.json(registros);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar presenças salvas.' });
  }
});

// Excluir presenças salvas por turma e data
app.delete('/presencas', (req, res) => {
  try {
    const { turma, data } = req.query;
    if (!turma || !data) {
      return res.status(400).json({ erro: 'Informe turma e data.' });
    }

    db.excluirPresencas(turma, data); // ✅ chama a função do módulo
    res.json({ mensagem: 'Presenças excluídas com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir presenças.' });
  }
});

// --- Inicialização do servidor ---
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
