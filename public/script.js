document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-cadastro');
  const tabelaBody = document.querySelector('#tabela-alunos tbody');
  const mensagem = document.getElementById('mensagem');
  const filtro = document.getElementById('filtro');
  const btnPesquisar = document.getElementById('btnPesquisar');
  const btnRelatorio = document.getElementById('btnRelatorio');
  const btnCep = document.getElementById('btnCep');
  const cepInput = document.getElementById('cep');

  async function carregarAlunos() {
    tabelaBody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
    try {
      const res = await fetch('/api/alunos');
      const data = await res.json();
      renderTabela(data);
    } catch (err) {
      tabelaBody.innerHTML = '<tr><td colspan="4">Erro ao carregar</td></tr>';
    }
  }

  function renderTabela(alunos) {
    const termo = filtro.value.trim().toLowerCase();
    const filtrados = alunos.filter(a => {
      return a.nome.toLowerCase().includes(termo) || (a.turma && a.turma.toLowerCase().includes(termo));
    });
    if (filtrados.length === 0) {
      tabelaBody.innerHTML = '<tr><td colspan="4">Nenhum registro encontrado</td></tr>';
      return;
    }
    tabelaBody.innerHTML = '';
    filtrados.forEach(a => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(a.nome)}</td>
        <td>${escapeHtml(a.turma || '')}</td>
        <td>${escapeHtml(a.cidade || '')}</td>
        <td>
          <button class="btn btn-sm btn-danger btn-excluir" data-id="${a.id}">Excluir</button>
        </td>
      `;
      tabelaBody.appendChild(tr);
    });
    document.querySelectorAll('.btn-excluir').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!confirm('Confirmar exclusão do aluno?')) return;
        await fetch('/api/alunos/' + id, { method: 'DELETE' });
        carregarAlunos();
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('nome').value.trim();
    if (!nome) {
      document.getElementById('nome').focus();
      mensagem.textContent = 'Por favor, informe o nome do aluno.';
      return;
    }
    const payload = {
      nome,
      data_nascimento: document.getElementById('data_nascimento').value || null,
      cep: document.getElementById('cep').value || null,
      logradouro: document.getElementById('logradouro').value || null,
      numero: document.getElementById('numero').value || null,
      bairro: document.getElementById('bairro').value || null,
      cidade: document.getElementById('cidade').value || null,
      estado: document.getElementById('estado').value || null,
      turma: document.getElementById('turma').value || null
    };
    try {
      const res = await fetch('/api/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        mensagem.textContent = 'Aluno cadastrado com sucesso.';
        form.reset();
        carregarAlunos();
        document.getElementById('nome').focus();
      } else {
        mensagem.textContent = 'Erro ao cadastrar aluno.';
      }
    } catch (err) {
      mensagem.textContent = 'Erro na comunicação com o servidor.';
    }
  });

  btnPesquisar.addEventListener('click', (e) => {
    carregarAlunos();
  });

  btnRelatorio.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/alunos');
      const data = await res.json();
      const csv = toCSV(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'relatorio_alunos.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erro ao gerar relatório');
    }
  });

  btnCep.addEventListener('click', async () => {
    const cep = cepInput.value.replace(/\D/g, '');
    if (cep.length !== 8) {
      alert('Informe um CEP válido (8 dígitos)');
      return;
    }
    try {
      const res = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
      const json = await res.json();
      if (json.erro) { alert('CEP não encontrado'); return; }
      document.getElementById('logradouro').value = json.logradouro || '';
      document.getElementById('bairro').value = json.bairro || '';
      document.getElementById('cidade').value = json.localidade || '';
      document.getElementById('estado').value = json.uf || '';
    } catch (err) {
      alert('Erro ao consultar ViaCEP');
    }
  });

  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]); });
  }

  function toCSV(arr) {
    if (!arr || !arr.length) return '';
    const keys = ['id','nome','data_nascimento','cep','logradouro','numero','bairro','cidade','estado','turma','criado_em'];
    const header = keys.join(',') + '\n';
    const lines = arr.map(obj => keys.map(k => '"' + (obj[k] ? String(obj[k]).replace(/"/g,'""') : '') + '"').join(',')).join('\n');
    return header + lines;
  }

  carregarAlunos();
});
