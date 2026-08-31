import './style.css';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

// CONEXÃO SUPABASE
const SUPABASE_URL = 'https://ktfzvlotpowhwumpjbjw.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Znp2bG90cG93aHd1d3BqYmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODAzMzAsImV4cCI6MjEwMzc1NjMzMH0.Epox8sNR_-mRRUvXyFUFnJ0Qjjo8m2S9xQZNj_PFj-Y'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ESTADOS LOCAIS
let setores = []; // Guarda objetos { id, nome }
let equipamentos = [];

// CARREGAR DADOS DO SUPABASE
async function carregarDados() {
  try {
    const { data: dataSetores, error: errSetores } = await supabase.from('setores').select('*').order('nome');
    if (!errSetores && dataSetores) {
      setores = dataSetores;
    }

    const { data: dataEquip, error: errEquip } = await supabase.from('equipamentos').select('*').order('created_at', { ascending: false });
    if (!errEquip && dataEquip) {
      equipamentos = dataEquip;
    }
  } catch (e) {
    console.error("Erro ao carregar do Supabase:", e);
  }

  renderizarSelectsSetores();
  filtrarEquipamentos();
  exibirDetalhesPorUrl();
}

// RENDERIZAR SELECTS
function renderizarSelectsSetores() {
  const filtroSetor = document.getElementById('filtroSetor');
  const cadSetor = document.getElementById('cadSetor');
  if (!filtroSetor || !cadSetor) return;

  const valorFiltroAtual = filtroSetor.value;
  
  filtroSetor.innerHTML = '<option value="">Todos os Setores</option>';
  cadSetor.innerHTML = '';

  setores.forEach(s => {
    filtroSetor.innerHTML += `<option value="${s.nome}">${s.nome}</option>`;
    cadSetor.innerHTML += `<option value="${s.nome}">${s.nome}</option>`;
  });

  filtroSetor.value = valorFiltroAtual;
}

// RENDERIZAR GERENCIADOR DE SETORES
function renderizarListaSetores() {
  const lista = document.getElementById('listaSetores');
  if (!lista) return;
  lista.innerHTML = '';

  if (setores.length === 0) {
    lista.innerHTML = '<li class="p-3 text-xs text-slate-400 text-center">Nenhum setor cadastrado.</li>';
    return;
  }

  setores.forEach(s => {
    const li = document.createElement('li');
    li.className = "flex justify-between items-center p-3 hover:bg-slate-50 border-b border-slate-100";
    li.innerHTML = `
      <span class="text-sm font-semibold text-slate-800">${s.nome}</span>
      <div class="flex gap-2">
        <button data-id="${s.id}" data-nome="${s.nome}" class="btn-editar-setor text-xs font-bold text-amber-600 hover:text-amber-800">Editar</button>
        <button data-id="${s.id}" data-nome="${s.nome}" class="btn-excluir-setor text-xs font-bold text-red-500 hover:text-red-700">Excluir</button>
      </div>
    `;
    lista.appendChild(li);
  });

  // Ação de Excluir Setor
  document.querySelectorAll('.btn-excluir-setor').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const nomeSetor = e.currentTarget.getAttribute('data-nome');

      const emUso = equipamentos.some(eq => eq.setor === nomeSetor);
      if (emUso) {
        alert(`Não é possível excluir o setor "${nomeSetor}" pois existem equipamentos vinculados a ele!`);
        return;
      }

      if (confirm(`Remover setor "${nomeSetor}"?`)) {
        const { error } = await supabase.from('setores').delete().eq('id', id);
        if (!error) {
          await carregarDados();
          renderizarListaSetores();
        } else {
          alert('Erro ao excluir setor no banco.');
        }
      }
    });
  });

  // Ação de Editar Setor
  document.querySelectorAll('.btn-editar-setor').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const nomeAntigo = e.currentTarget.getAttribute('data-nome');
      const novoNome = prompt("Digite o novo nome para o setor:", nomeAntigo);

      if (novoNome && novoNome.trim() !== "" && novoNome !== nomeAntigo) {
        const nomeFormatado = novoNome.trim();
        
        // Atualiza na tabela de setores
        const { error } = await supabase.from('setores').update({ nome: nomeFormatado }).eq('id', id);
        
        if (error) {
          alert('Erro ao atualizar setor (talvez já exista um com esse nome).');
          return;
        }

        // Atualiza em cascata os equipamentos vinculados para manter a integridade
        const eqVinculados = equipamentos.filter(eq => eq.setor === nomeAntigo);
        for (let eq of eqVinculados) {
          await supabase.from('equipamentos').update({ setor: nomeFormatado }).eq('id', eq.id);
        }

        await carregarDados();
        renderizarListaSetores();
      }
    });
  });
}

// RENDERIZAR GRID DE EQUIPAMENTOS
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

// GERAR QR CODE
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

// VER DETALHES VIA QR CODE
async function exibirDetalhesPorUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const ativoId = urlParams.get('ativo');

  if (ativoId) {
    try {
      const { data: item } = await supabase
        .from('equipamentos')
        .select('*')
        .ilike('id', ativoId)
        .single();

      if (item) {
        document.getElementById('detalheId').innerText = item.id;
        document.getElementById('detalheSetor').innerText = item.setor || 'Não definido';
        document.getElementById('detalheIp').innerText = item.ip;
        document.getElementById('detalheTipo').innerText = item.tipo;
        document.getElementById('detalheModelo').innerText = item.modelo;
        document.getElementById('detalheLocal').innerText = item.local || 'Não informado';

        document.getElementById('modalDetalhes').classList.remove('hidden');
      }
    } catch (e) {
      console.error("Erro ao carregar detalhes:", e);
    }
  }
}

// EXCLUIR ATIVO
async function excluirEquipamento(id) {
  if (confirm(`Tem certeza que deseja remover o equipamento ${id}?`)) {
    const { error } = await supabase.from('equipamentos').delete().eq('id', id);
    if (!error) {
      await carregarDados();
    } else {
      alert('Erro ao excluir equipamento.');
    }
  }
}

// EVENTOS DE SETORES
document.getElementById('btnAbrirSetores')?.addEventListener('click', () => {
  renderizarListaSetores();
  document.getElementById('modalSetores').classList.remove('hidden');
});

document.getElementById('btnFecharSetores')?.addEventListener('click', () => {
  document.getElementById('modalSetores').classList.add('hidden');
  document.getElementById('formSetor').reset();
});

document.getElementById('formSetor')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('inputSetorNome').value.trim();
  if (!nome) return;

  const { error } = await supabase.from('setores').insert([{ nome }]);
  if (error) {
    alert('Erro: setor já cadastrado ou falha na rede.');
  } else {
    document.getElementById('inputSetorNome').value = '';
    await carregarDados();
    renderizarListaSetores();
  }
});

// EVENTOS DE EQUIPAMENTOS
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

document.getElementById('formEquipamento')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const novo = {
    id: document.getElementById('cadNome').value.trim().toUpperCase(),
    setor: document.getElementById('cadSetor').value,
    tipo: document.getElementById('cadTipo').value,
    ip: document.getElementById('cadIp').value.trim(),
    modelo: document.getElementById('cadModelo').value.trim(),
    local: document.getElementById('cadLocal').value.trim()
  };

  const { error } = await supabase.from('equipamentos').insert([novo]);

  if (error) {
    alert('Erro ao cadastrar: Verifique se o ID já existe.');
  } else {
    await carregarDados();
    document.getElementById('modalCadastro').classList.add('hidden');
    document.getElementById('formEquipamento').reset();
  }
});

// INICIALIZAR
carregarDados();