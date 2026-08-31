import './style.css';
import QRCode from 'qrcode';

// Dados Padrão
const setoresPadrao = ["Açougue", "Hortifrúti", "Frente de Caixa", "Padaria", "Depósito"];
const equipamentosPadrao = [
  { id: "BAL-AC-01", setor: "Açougue", tipo: "Balança", ip: "192.168.1.50", modelo: "Toledo Prix 5", local: "Ponto A-12" },
  { id: "IMP-AC-01", setor: "Açougue", tipo: "Impressora Cartazista", ip: "192.168.1.51", modelo: "Zebra ZD220", local: "Ponto A-13" },
  { id: "BAL-HF-01", setor: "Hortifrúti", tipo: "Balança", ip: "192.168.1.60", modelo: "Toledo Prix 5", local: "Ilha Central" }
];

// Carregamento Seguro do LocalStorage
let setores = JSON.parse(localStorage.getItem('ti_assai_setores'));
if (!Array.isArray(setores) || setores.length === 0) {
  setores = [...setoresPadrao];
}

let equipamentos = JSON.parse(localStorage.getItem('ti_assai_ativos'));
if (!Array.isArray(equipamentos)) {
  equipamentos = [...equipamentosPadrao];
}

function salvarStorage() {
  localStorage.setItem('ti_assai_setores', JSON.stringify(setores));
  localStorage.setItem('ti_assai_ativos', JSON.stringify(equipamentos));
}

// Renderizar Selects
function renderizarSelectsSetores() {
  const filtroSetor = document.getElementById('filtroSetor');
  const cadSetor = document.getElementById('cadSetor');
  if (!filtroSetor || !cadSetor) return;

  const valorFiltroAtual = filtroSetor.value;
  
  filtroSetor.innerHTML = '<option value="">Todos os Setores</option>';
  cadSetor.innerHTML = '';

  setores.forEach(setor => {
    filtroSetor.innerHTML += `<option value="${setor}">${setor}</option>`;
    cadSetor.innerHTML += `<option value="${setor}">${setor}</option>`;
  });

  filtroSetor.value = valorFiltroAtual;
}

// Renderizar Gerenciador de Setores
function renderizarListaSetores() {
  const lista = document.getElementById('listaSetores');
  if (!lista) return;
  lista.innerHTML = '';

  if (setores.length === 0) {
    lista.innerHTML = '<li class="p-3 text-xs text-slate-400 text-center">Nenhum setor cadastrado.</li>';
    return;
  }

  setores.forEach((setor, index) => {
    const li = document.createElement('li');
    li.className = "flex justify-between items-center p-3 hover:bg-slate-50";
    li.innerHTML = `
      <span class="text-sm font-semibold text-slate-800">${setor}</span>
      <div class="flex gap-2">
        <button data-index="${index}" class="btn-editar-setor text-xs font-bold text-amber-600 hover:text-amber-800">Editar</button>
        <button data-index="${index}" class="btn-excluir-setor text-xs font-bold text-red-500 hover:text-red-700">Excluir</button>
      </div>
    `;
    lista.appendChild(li);
  });

  document.querySelectorAll('.btn-editar-setor').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.getAttribute('data-index');
      document.getElementById('inputSetorNome').value = setores[idx];
      document.getElementById('setorEditIdx').value = idx;
      document.getElementById('btnSalvarSetor').innerText = 'Atualizar';
    });
  });

  document.querySelectorAll('.btn-excluir-setor').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.getAttribute('data-index');
      const nomeSetor = setores[idx];

      const emUso = equipamentos.some(eq => eq.setor === nomeSetor);
      if (emUso) {
        alert(`Não é possível excluir o setor "${nomeSetor}" pois existem equipamentos vinculados a ele!`);
        return;
      }

      if (confirm(`Remover setor "${nomeSetor}"?`)) {
        setores.splice(idx, 1);
        salvarStorage();
        renderizarSelectsSetores();
        renderizarListaSetores();
        filtrarEquipamentos();
      }
    });
  });
}

// Renderizar Grid
function renderizarGrid(lista) {
  const container = document.getElementById('gridEquipamentos');
  if (!container) return;
  container.innerHTML = '';

  if (lista.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500 font-medium">Nenhum equipamento encontrado.</div>';
    return;
  }

  lista.forEach(item => {
    const card = document.createElement('div');
    card.className = "bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition";
    let localTexto = item.local ? `<p class="text-xs text-slate-400 mt-0.5">Local: ${item.local}</p>` : '';

    card.innerHTML = `
      <div>
        <div class="flex justify-between items-start mb-2">
          <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">${item.setor || 'Sem Setor'}</span>
          <span class="text-xs text-slate-500 font-medium">${item.tipo}</span>
        </div>
        <h3 class="text-lg font-bold text-slate-900">${item.id}</h3>
        <p class="text-sm font-mono text-slate-600 mt-1">IP: <strong class="text-slate-900">${item.ip}</strong></p>
        <p class="text-xs text-slate-500 mt-1">Modelo: ${item.modelo}</p>
        ${localTexto}
      </div>
      <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
        <button data-id="${item.id}" class="btn-qr text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded transition">
          📱 QR Code / Etiqueta
        </button>
        <button data-id="${item.id}" class="btn-excluir text-xs text-red-500 hover:text-red-700 font-semibold">
          Excluir
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  document.querySelectorAll('.btn-qr').forEach(btn => {
    btn.addEventListener('click', (e) => gerarQrCode(e.currentTarget.getAttribute('data-id')));
  });

  document.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.addEventListener('click', (e) => excluirEquipamento(e.currentTarget.getAttribute('data-id')));
  });
}

function filtrarEquipamentos() {
  const campoBusca = document.getElementById('campoBusca');
  const filtroSetor = document.getElementById('filtroSetor');
  if (!campoBusca || !filtroSetor) return;

  const busca = campoBusca.value.toLowerCase();
  const setor = filtroSetor.value;

  const resultado = equipamentos.filter(eq => {
    const eqSetor = eq.setor || '';
    const atendeBusca = eq.id.toLowerCase().includes(busca) || 
                        eq.ip.toLowerCase().includes(busca) || 
                        eq.modelo.toLowerCase().includes(busca) || 
                        eqSetor.toLowerCase().includes(busca);
    const atendeSetor = setor === "" || eqSetor === setor;
    return atendeBusca && atendeSetor;
  });

  renderizarGrid(resultado);
}

async function gerarQrCode(id) {
  const item = equipamentos.find(e => e.id === id);
  if (!item) return;

  document.getElementById('qrNome').innerText = `${item.id} (${item.setor || ''})`;
  document.getElementById('qrIp').innerText = `IP: ${item.ip}`;
  document.getElementById('qrModelo').innerText = item.modelo;

  const canvas = document.getElementById('canvasQrCode');
  const urlBase = window.location.origin + window.location.pathname;
  const urlAtivo = `${urlBase}?ativo=${encodeURIComponent(item.id)}`;

  try {
    await QRCode.toCanvas(canvas, urlAtivo, {
      width: 160,
      margin: 1,
      errorCorrectionLevel: 'M'
    });
    document.getElementById('modalQrCode').classList.remove('hidden');
  } catch (err) {
    console.error("Erro ao gerar QR Code:", err);
  }
}

function exibirDetalhesPorUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const ativoId = urlParams.get('ativo');

  if (ativoId) {
    const item = equipamentos.find(e => e.id.toLowerCase() === ativoId.toLowerCase());
    if (item) {
      document.getElementById('detalheId').innerText = item.id;
      document.getElementById('detalheSetor').innerText = item.setor || 'Não definido';
      document.getElementById('detalheIp').innerText = item.ip;
      document.getElementById('detalheTipo').innerText = item.tipo;
      document.getElementById('detalheModelo').innerText = item.modelo;
      document.getElementById('detalheLocal').innerText = item.local || 'Não informado';

      document.getElementById('modalDetalhes').classList.remove('hidden');
    }
  }
}

function excluirEquipamento(id) {
  if (confirm(`Tem certeza que deseja remover o equipamento ${id}?`)) {
    equipamentos = equipamentos.filter(e => e.id !== id);
    salvarStorage();
    filtrarEquipamentos();
  }
}

// Eventos Setores
document.getElementById('btnAbrirSetores')?.addEventListener('click', () => {
  renderizarListaSetores();
  document.getElementById('modalSetores').classList.remove('hidden');
});

document.getElementById('btnFecharSetores')?.addEventListener('click', () => {
  document.getElementById('modalSetores').classList.add('hidden');
  document.getElementById('formSetor').reset();
  document.getElementById('setorEditIdx').value = "-1";
  document.getElementById('btnSalvarSetor').innerText = 'Adicionar';
});

document.getElementById('formSetor')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = document.getElementById('inputSetorNome').value.trim();
  const idx = parseInt(document.getElementById('setorEditIdx').value);

  if (!nome) return;

  if (idx >= 0) {
    const antigo = setores[idx];
    setores[idx] = nome;
    equipamentos.forEach(eq => {
      if (eq.setor === antigo) eq.setor = nome;
    });
  } else {
    if (setores.includes(nome)) {
      alert('Setor já existente!');
      return;
    }
    setores.push(nome);
  }

  document.getElementById('inputSetorNome').value = '';
  document.getElementById('setorEditIdx').value = "-1";
  document.getElementById('btnSalvarSetor').innerText = 'Adicionar';

  salvarStorage();
  renderizarSelectsSetores();
  renderizarListaSetores();
  filtrarEquipamentos();
});

// Eventos Equipamentos
document.getElementById('campoBusca')?.addEventListener('input', filtrarEquipamentos);
document.getElementById('filtroSetor')?.addEventListener('change', filtrarEquipamentos);

document.getElementById('btnAbrirModal')?.addEventListener('click', () => {
  document.getElementById('modalCadastro').classList.remove('hidden');
});

document.getElementById('btnFecharCadastro')?.addEventListener('click', () => {
  document.getElementById('modalCadastro').classList.add('hidden');
  document.getElementById('formEquipamento').reset();
});

document.getElementById('btnFecharQrCode')?.addEventListener('click', () => {
  document.getElementById('modalQrCode').classList.add('hidden');
});

document.getElementById('btnFecharDetalhes')?.addEventListener('click', () => {
  document.getElementById('modalDetalhes').classList.add('hidden');
  window.history.pushState({}, document.title, window.location.pathname);
});

document.getElementById('btnImprimir')?.addEventListener('click', () => window.print());

document.getElementById('formEquipamento')?.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const novo = {
    id: document.getElementById('cadNome').value.trim().toUpperCase(),
    setor: document.getElementById('cadSetor').value,
    tipo: document.getElementById('cadTipo').value,
    ip: document.getElementById('cadIp').value.trim(),
    modelo: document.getElementById('cadModelo').value.trim(),
    local: document.getElementById('cadLocal').value.trim()
  };

  equipamentos.push(novo);
  salvarStorage();
  filtrarEquipamentos();
  
  document.getElementById('modalCadastro').classList.add('hidden');
  document.getElementById('formEquipamento').reset();
});

// Inicialização
renderizarSelectsSetores();
filtrarEquipamentos();
exibirDetalhesPorUrl();