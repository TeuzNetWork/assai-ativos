import './style.css';
import QRCode from 'qrcode';

const dadosPadrao = [
  { id: "BAL-AC-01", setor: "Açougue", tipo: "Balança", ip: "192.168.1.50", modelo: "Toledo Prix 5", local: "Ponto A-12" },
  { id: "IMP-AC-01", setor: "Açougue", tipo: "Impressora Cartazista", ip: "192.168.1.51", modelo: "Zebra ZD220", local: "Ponto A-13" },
  { id: "BAL-HF-01", setor: "Hortifrúti", tipo: "Balança", ip: "192.168.1.60", modelo: "Toledo Prix 5", local: "Ilha Central" }
];

let equipamentos = JSON.parse(localStorage.getItem('ti_assai_ativos')) || dadosPadrao;

function salvarNoStorage() {
  localStorage.setItem('ti_assai_ativos', JSON.stringify(equipamentos));
}

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
          <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">${item.setor}</span>
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
    const atendeBusca = eq.id.toLowerCase().includes(busca) || 
                        eq.ip.toLowerCase().includes(busca) || 
                        eq.modelo.toLowerCase().includes(busca) || 
                        eq.setor.toLowerCase().includes(busca);
    const atendeSetor = setor === "" || eq.setor === setor;
    return atendeBusca && atendeSetor;
  });

  renderizarGrid(resultado);
}

async function gerarQrCode(id) {
  const item = equipamentos.find(e => e.id === id);
  if (!item) return;

  document.getElementById('qrNome').innerText = `${item.id} (${item.setor})`;
  document.getElementById('qrIp').innerText = `IP: ${item.ip}`;
  document.getElementById('qrModelo').innerText = item.modelo;

  const canvas = document.getElementById('canvasQrCode');
  
  // URL dinâmica que aponta para o próprio servidor com o parâmetro do ativo
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
      document.getElementById('detalheSetor').innerText = item.setor;
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
    salvarNoStorage();
    filtrarEquipamentos();
  }
}

// Eventos
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
  // Limpa a URL removendo a query string sem recarregar a página
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
  salvarNoStorage();
  filtrarEquipamentos();
  
  document.getElementById('modalCadastro').classList.add('hidden');
  document.getElementById('formEquipamento').reset();
});

// Inicialização
filtrarEquipamentos();
exibirDetalhesPorUrl();