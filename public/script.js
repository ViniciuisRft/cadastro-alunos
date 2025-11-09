const form = document.getElementById('formCadastro');
const tbody = document.querySelector('#tabelaAlunos tbody');
let editandoId = null;

// Função de máscara do CEP
document.getElementById('cep').addEventListener('input', (e) => {
  let v = e.target.value.replace(/\D/g, '');
  if (v.length > 5) v = v.replace(/^(\d{5})(\d)/, '$1-$2');
  e.target.value = v.slice(0, 9);
});

// Máscara do telefone
document.getElementById('telefone').addEventListener('input', (e) => {
  let v = e.target.value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);

  if (v.length <= 10) {
    // Formato fixo: (XX) XXXX-XXXX
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else {
    // Formato celular: (XX) 9XXXX-XXXX
    v = v.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
  }
  e.target.value = v;
});

// Buscar CEP (botão)
document.getElementById('btnBuscarCep').addEventListener('click', async () => {
  const cep = form.cep.value.replace(/\D/g, '');
  if (cep.length !== 8) {
    alert('CEP inválido. Deve conter 8 dígitos.');
    return;
  }
  await preencherEnderecoPorCep(cep);
});

// Preenche campos do endereço via ViaCEP
async function preencherEnderecoPorCep(cep) {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (data.erro) {
      alert('CEP não encontrado!');
      return false;
    }
    form.rua.value = data.logradouro || '';
    form.bairro.value = data.bairro || '';
    form.cidade.value = data.localidade || '';
    form.estado.value = data.uf || '';
    return true;
  } catch (err) {
    console.error(err);
    alert('Erro ao consultar o CEP.');
    return false;
  }
}

// 🧮 Função para calcular idade a partir da data de nascimento
function calcularIdade(dataNasc) {
  if (!dataNasc) return '-';
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

// Coleta dados do formulário
function montarDadosDoFormulario() {
  return {
    nome: form.nome.value.trim(),
    data_nascimento: form.data_nascimento.value,
    turma: form.turma.value.trim(),
    telefone: form.telefone.value.trim(),
    email: form.email.value.trim(),
    cep: form.cep.value.trim(),
    rua: form.rua.value.trim(),
    numero: form.numero.value.trim(),
    complemento: form.complemento.value.trim(),
    bairro: form.bairro.value.trim(),
    cidade: form.cidade.value.trim(),
    estado: form.estado.value.trim(),
    situacao: form.situacao.value
  };
}

// Validação com ViaCEP antes de salvar
async function validarCepAntesDeSalvar(cep) {
  if (!cep) return true;
  const somenteNumeros = cep.replace(/\D/g, '');
  if (somenteNumeros.length !== 8) return false;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${somenteNumeros}/json/`);
    const data = await res.json();
    return !data.erro;
  } catch {
    return false;
  }
}

// Submissão do formulário
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const dados = montarDadosDoFormulario();

  if (!dados.nome || !dados.data_nascimento) {
    alert('Nome e data de nascimento são obrigatórios.');
    return;
  }

  // Valida o CEP se informado
  if (dados.cep && !(await validarCepAntesDeSalvar(dados.cep))) {
    alert('CEP inválido ou não encontrado.');
    return;
  }

  const url = editandoId ? `/alunos/${editandoId}` : '/alunos';
  const metodo = editandoId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (!res.ok) {
      throw new Error('Erro ao salvar aluno');
    }

    alert(editandoId ? 'Aluno atualizado!' : 'Aluno cadastrado!');

    // Só depois do sucesso: resetar estado de edição e botão
    form.reset();
    editandoId = null;
    const botao = form.querySelector('button[type="submit"]');
    if (botao) botao.textContent = "Cadastrar";

    // Atualiza a lista/relatório
    carregarAlunos();
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar aluno.');
  }
});

// Carrega tabela de alunos
async function carregarAlunos() {
  const res = await fetch('/alunos');
  const alunos = await res.json();
  const tbody = document.querySelector('#tabelaAlunos tbody');
  const filtroTurma = document.getElementById('filtroTurma');
  const pesquisaAluno = document.getElementById('pesquisaAluno');
  const contador = document.getElementById('contadorAlunos');
  tbody.innerHTML = '';

  if (!alunos.length) {
    tbody.innerHTML = `<tr><td colspan="8">Nenhum aluno cadastrado.</td></tr>`;
    contador.textContent = "Total de alunos: 0";
    return;
  }

  // 🔹 Cria lista única de turmas
  const turmas = [...new Set(alunos.map(a => a.turma || 'Sem Turma'))].sort();
  filtroTurma.innerHTML = `<option value="">Todas as Turmas</option>` +
    turmas.map(t => `<option value="${t}">${t}</option>`).join('');

  // 🔹 Renderização com filtros e contador
  function renderizarTabela() {
    tbody.innerHTML = '';
    const turmaSelecionada = filtroTurma.value;
    const termo = pesquisaAluno.value.toLowerCase();

    // Agrupa por turma
    const agrupado = {};
    alunos.forEach(a => {
      const turma = a.turma || 'Sem Turma';
      if (!agrupado[turma]) agrupado[turma] = [];
      agrupado[turma].push(a);
    });

    let totalFiltrado = 0;

    Object.entries(agrupado).forEach(([turma, lista]) => {
      // Aplica filtro de turma
      if (turmaSelecionada && turma !== turmaSelecionada) return;

      // Filtro de pesquisa
      const filtrados = lista.filter(a =>
        a.nome.toLowerCase().includes(termo)
      );
      if (!filtrados.length) return;

      // Cabeçalho da turma
      const trTurma = document.createElement('tr');
      trTurma.innerHTML = `
  <td colspan="8" 
      style="background:#0052cc;color:white;font-weight:bold;text-align:center;">
    Turma: ${turma} — ${filtrados.length} aluno${filtrados.length > 1 ? 's' : ''}
  </td>`;
      tbody.appendChild(trTurma);

      filtrados.forEach(a => {
        const resumo = a.rua
          ? `${a.rua}${a.numero ? ', ' + a.numero : ''} — ${a.cidade || ''}/${a.estado || ''}`
          : '-';
        const idadeAtual = calcularIdade(a.data_nascimento);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${a.nome}</td>
          <td>${a.data_nascimento ? new Date(a.data_nascimento + 'T00:00:00').toLocaleDateString() : '-'}</td>
          <td>${idadeAtual !== '-' ? idadeAtual + ' anos' : '-'}</td>
          <td>${a.telefone || '-'}</td>
          <td>${a.email || '-'}</td>
          <td>${resumo}</td>
          <td>${a.situacao || 'Ativo'}</td>
          <td>
            <button class="btn-editar" onclick="editarAluno(${a.id})" title="Editar aluno">✏️</button>
            <button class="btn-excluir" onclick="excluirAluno(${a.id})" title="Excluir aluno">🗑️</button>
            <button class="btn-ver" onclick="verEnderecoCompleto(${a.id})" title="Ver endereço completo">👁️</button>
          </td>`;
        tbody.appendChild(tr);
      });

      totalFiltrado += filtrados.length;
    });

    // Atualiza contador
    const totalGeral = alunos.length;
    if (!tbody.innerHTML.trim()) {
      tbody.innerHTML = `<tr><td colspan="8">Nenhum aluno encontrado.</td></tr>`;
      contador.textContent = `Total de alunos: ${totalGeral} | Exibindo: 0`;
    } else {
      const turmaTexto = filtroTurma.value ? `na turma "${filtroTurma.value}"` : "no total";
      contador.textContent = `Total de alunos: ${totalGeral} | Exibindo ${totalFiltrado} ${turmaTexto}`;
    }
  }

  // Render inicial
  renderizarTabela();

  // Eventos
  filtroTurma.onchange = renderizarTabela;
  pesquisaAluno.oninput = renderizarTabela;
}

// 🏠 Ver endereço completo (abre o modal)
async function verEnderecoCompleto(id) {
  try {
    const res = await fetch('/alunos');
    const alunos = await res.json();
    const a = alunos.find(al => al.id === id);
    if (!a) return alert('Aluno não encontrado.');

    const endereco = `
Rua: ${a.rua || '-'} ${a.numero || ''}
${a.complemento ? 'Compl.: ' + a.complemento : ''}
Bairro: ${a.bairro || '-'}
Cidade: ${a.cidade || '-'} - ${a.estado || '-'}
CEP: ${a.cep || '-'}
`;
    document.getElementById('conteudoEndereco').textContent = endereco;
    document.getElementById('modalEndereco').style.display = 'flex';
  } catch (err) {
    console.error('Erro ao exibir endereço:', err);
    alert('Não foi possível carregar o endereço.');
  }
}

// Fecha o modal
const btnFechar = document.getElementById('btnFecharModal');
if (btnFechar) {
  btnFechar.onclick = () => {
    document.getElementById('modalEndereco').style.display = 'none';
  };
}

// Fecha modal ao clicar fora do conteúdo
window.addEventListener('click', (e) => {
  const modal = document.getElementById('modalEndereco');
  if (e.target === modal) modal.style.display = 'none';
});

// Editar aluno
async function editarAluno(id) {
  try {
    const res = await fetch('/alunos');
    if (!res.ok) throw new Error('Erro ao buscar alunos');
    const alunos = await res.json();
    const a = alunos.find(al => al.id === id);
    if (!a) return alert('Aluno não encontrado.');

    // Preenche os campos do formulário (somente se existir o campo)
    Object.keys(a).forEach(k => { if (form[k]) form[k].value = a[k] || ''; });

    editandoId = id;

    // MOSTRA a aba de cadastro sem disparar handlers vinculados ao click()
    document.getElementById('secCadastro').hidden = false;
    document.getElementById('secRelatorio').hidden = true;
    document.getElementById('abaCadastro').classList.add('ativo');
    document.getElementById('abaRelatorio').classList.remove('ativo');

    // Altera o texto do botão para indicar que estamos em modo edição
    const botao = form.querySelector('button[type="submit"]');
    if (botao) botao.textContent = "💾 Salvar Alterações";

    // Rola até o formulário (opcional)
    form.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error('Erro em editarAluno:', err);
    alert('Erro ao iniciar edição. Veja o console do navegador.');
  }
}

// Excluir aluno
async function excluirAluno(id) {
  if (!confirm('Excluir este aluno?')) return;
  await fetch(`/alunos/${id}`, { method: 'DELETE' });
  carregarAlunos();
}

// Geração do PDF (tabela formatada)
document.getElementById('btnPDF').addEventListener('click', async () => {
  try {
    const res = await fetch('/alunos');
    const alunos = await res.json();
    if (!alunos.length) return alert("Nenhum aluno cadastrado para gerar o PDF.");

    const filtroTurma = document.getElementById('filtroTurma');
    const pesquisaAluno = document.getElementById('pesquisaAluno');
    const turmaSelecionada = filtroTurma.value;
    const termo = pesquisaAluno.value.toLowerCase();

    // 🔹 Aplica filtros
    const alunosFiltrados = alunos.filter(a => {
      const turmaOk = !turmaSelecionada || a.turma === turmaSelecionada;
      const nomeOk = !termo || a.nome.toLowerCase().includes(termo);
      return turmaOk && nomeOk;
    });

    if (!alunosFiltrados.length) return alert("Nenhum aluno encontrado com os filtros atuais.");

    // 🔹 Agrupa por turma
    const agrupado = {};
    alunosFiltrados.forEach(a => {
      const turma = a.turma || 'Sem Turma';
      if (!agrupado[turma]) agrupado[turma] = [];
      agrupado[turma].push(a);
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // 🔹 Cabeçalho principal
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text('Relatório de Alunos', 105, 15, { align: "center" });
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Gerado em: ${new Date().toLocaleDateString()}`, 10, 22);

    let y = 30;

    for (const [turma, lista] of Object.entries(agrupado)) {
      // Cabeçalho da turma com contador
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 82, 204);
      const tituloTurma = `Turma: ${turma} — ${lista.length} aluno${lista.length > 1 ? 's' : ''}`;
      pdf.text(tituloTurma, 10, y);
      y += 4;
      pdf.setDrawColor(0, 82, 204);
      pdf.line(10, y, 200, y); // linha divisória azul
      y += 6;
      pdf.setTextColor(0, 0, 0);

      for (const a of lista) {
        if (y > 270) { // quebra automática de página
          pdf.addPage();
          y = 20;
        }

        const idade = calcularIdade(a.data_nascimento);
        const endereco = `${a.rua || ''} ${a.numero || ''}, ${a.bairro || ''}, ${a.cidade || ''}/${a.estado || ''} ${a.cep || ''}`.trim();

        // 🔸 Nome do aluno
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(a.nome || '-', 12, y);
        y += 5;

        // 🔸 Detalhes básicos
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(`Data de Nascimento: ${a.data_nascimento ? new Date(a.data_nascimento + 'T00:00:00').toLocaleDateString() : '-'}`, 15, y);
        y += 5;
        pdf.text(`Idade: ${idade !== '-' ? idade + ' anos' : '-'}`, 15, y);
        pdf.text(`Situação: ${a.situacao || 'Ativo'}`, 80, y);
        y += 5;
        pdf.text(`Telefone: ${a.telefone || '-'}`, 15, y);
        y += 5;
        pdf.text(`E-mail: ${a.email || '-'}`, 15, y);
        y += 5;

        // 🔸 Endereço
        pdf.text(`Endereço: ${endereco || '-'}`, 15, y, { maxWidth: 180 });
        y += 6;

        // 🔸 Linha divisória leve entre alunos
        pdf.setDrawColor(180);
        pdf.setLineWidth(0.1);
        pdf.line(10, y, 200, y);
        y += 6;
      }

      y += 4; // espaço extra entre turmas
    }

    // 🔹 Rodapé
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text("Projeto Integrador UNIVESP © 2025", 105, 285, { align: "center" });

    const nomeArquivo = turmaSelecionada
      ? `relatorio_${turmaSelecionada.replace(/\s+/g, '_')}.pdf`
      : 'relatorio_todas_turmas.pdf';

    pdf.save(nomeArquivo);

  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    alert('Erro ao gerar o relatório em PDF.');
  }
});

// Inicializa
carregarAlunos();

// Corrige datas para exibição (sem erro de fuso horário)
function formatarDataLocal(dataISO) {
  if (!dataISO) return '-';
  const partes = dataISO.split('-');
  if (partes.length !== 3) return dataISO;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

// === PRESENÇAS ===

async function carregarPresencas() {
  const modoSelect = document.getElementById('modoPresenca');
  const turmaSelect = document.getElementById('turmaPresenca');
  const dataInput = document.getElementById('dataPresenca');
  const tabela = document.querySelector('#tabelaPresencas tbody');
  const btnSalvar = document.getElementById('btnSalvarPresenca');
  const btnExcluir = document.getElementById('btnExcluirPresenca');

  // 🔹 Define a data atual automaticamente
  if (!dataInput.value) {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    dataInput.value = `${ano}-${mes}-${dia}`;
  }

  const res = await fetch('/alunos');
  const alunos = await res.json();
  const turmas = [...new Set(alunos.map(a => a.turma).filter(Boolean))].sort();

  turmaSelect.innerHTML = '<option value="">Selecione uma turma</option>' +
    turmas.map(t => `<option value="${t}">${t}</option>`).join('');

  // Atualiza tabela quando mudar modo, turma ou data
  modoSelect.onchange = renderTabelaPresencas;
  turmaSelect.onchange = renderTabelaPresencas;
  dataInput.onchange = renderTabelaPresencas;

  renderTabelaPresencas();

  async function renderTabelaPresencas() {
    tabela.innerHTML = '';
    const modo = modoSelect.value;
    const turma = turmaSelect.value;
    const data = dataInput.value;

    if (!turma) {
      tabela.innerHTML = `<tr><td colspan="4">Selecione uma turma.</td></tr>`;
      btnSalvar.style.display = 'none';
      btnExcluir.style.display = 'none';
      return;
    }

    if (modo === 'registrar') {
      btnSalvar.style.display = 'inline-block';
      btnExcluir.style.display = 'none';
      // Mostra alunos ativos
      const alunosTurma = alunos.filter(a => a.turma === turma && a.situacao !== 'Transferido');
      if (!alunosTurma.length) {
        tabela.innerHTML = `<tr><td colspan="4">Nenhum aluno ativo nesta turma.</td></tr>`;
        return;
      }

      alunosTurma.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="checkbox" class="chk-presenca" data-id="${a.id}"></td>
          <td>${a.nome}</td>
          <td>${a.data_nascimento ? formatarDataLocal(a.data_nascimento) : '-'}</td>
          <td>${a.situacao || '-'}</td>`;
        tabela.appendChild(tr);
      });

    } else if (modo === 'visualizar') {
      btnSalvar.style.display = 'none';
      if (!data) {
        tabela.innerHTML = `<tr><td colspan="4">Selecione uma data para visualizar.</td></tr>`;
        btnExcluir.style.display = 'none';
        return;
      }

      // Busca presenças salvas
      const resPres = await fetch(`/presencas?turma=${encodeURIComponent(turma)}&data=${encodeURIComponent(data)}`);
      if (!resPres.ok) {
        tabela.innerHTML = `<tr><td colspan="4">Erro ao buscar presenças salvas.</td></tr>`;
        btnExcluir.style.display = 'none';
        return;
      }

      const presencas = await resPres.json();
      if (!presencas.length) {
        tabela.innerHTML = `<tr><td colspan="4">Nenhuma presença registrada para ${formatarDataLocal(data)}.</td></tr>`;
        btnExcluir.style.display = 'none';
        return;
      }

      // 🔹 Mostra botão de excluir
      btnExcluir.style.display = 'inline-block';

      presencas.forEach(p => {
        const aluno = alunos.find(a => a.id === p.aluno_id);
        const nome = aluno ? aluno.nome : 'Aluno removido';
        const situacao = aluno ? aluno.situacao : '-';
        const dataNasc = aluno ? aluno.data_nascimento : null;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.presente ? '✅ Presente' : '❌ Ausente'}</td>
          <td>${nome}</td>
          <td>${dataNasc ? formatarDataLocal(dataNasc) : '-'}</td>
          <td>${situacao || '-'}</td>`;
        tabela.appendChild(tr);
      });
    }
  }

  document.getElementById('btnSalvarPresenca').addEventListener('click', async () => {
  const turma = document.getElementById('turmaPresenca').value;
  const data = document.getElementById('dataPresenca').value;
  if (!turma || !data) {
    alert('Selecione uma turma e uma data.');
    return;
  }

  const checkboxes = document.querySelectorAll('.chk-presenca');
  if (!checkboxes.length) {
    alert('Não há alunos para registrar presença nesta turma.');
    return;
  }

  const presencas = [...checkboxes].map(chk => ({
    aluno_id: chk.dataset.id,
    presente: chk.checked ? 1 : 0
  }));

  // 🔹 Se não houver presenças para salvar, também evita envio
  if (!presencas.length) {
    alert('Nenhum aluno encontrado para salvar presença.');
    return;
  }

  try {
    let res = await fetch('/presencas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turma, data, presencas })
    });

    // 🔹 Caso já exista presença salva (status 409)
    if (res.status === 409) {
      const confirmar = confirm(
        `Já existem presenças salvas para ${formatarDataLocal(data)}.\nDeseja substituí-las?`
      );
      if (!confirmar) return;

      res = await fetch('/presencas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turma, data, presencas, substituir: true })
      });
    }

    if (res.ok) {
      const resposta = await res.json();
      alert(resposta.mensagem || 'Presenças registradas com sucesso!');
    } else {
      alert('Erro ao salvar presenças.');
    }
  } catch (err) {
    console.error('Erro ao salvar presenças:', err);
    alert('Erro de conexão ao tentar salvar presenças.');
  }
});

  // 🔹 Ação do botão "Excluir Presenças"
  btnExcluir.onclick = async () => {
    const turma = turmaSelect.value;
    const data = dataInput.value;
    if (!turma || !data) return alert('Selecione uma turma e data.');

    if (!confirm(`Tem certeza que deseja excluir as presenças de ${formatarDataLocal(data)} da turma ${turma}?`))
      return;

    const res = await fetch(`/presencas?turma=${encodeURIComponent(turma)}&data=${encodeURIComponent(data)}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      alert('Presenças excluídas com sucesso!');
      renderTabelaPresencas();
    } else {
      alert('Erro ao excluir presenças.');
    }
  };
}

// Torna a função disponível globalmente para o dashboard.html
window.carregarPresencas = carregarPresencas;
