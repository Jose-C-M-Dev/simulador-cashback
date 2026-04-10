'use strict';

/* ESTADO GLOBAL */
const S = {
  hist:  [],    // transações locais da sessão
  total: 0,     // total acumulado local
};

/* NAVEGAÇÃO */

/* Troca o painel ativo e atualiza o item de nav.
   @param {string} p - 'calc' | 'hist' | 'about' */
function goTo(p) {
  ['calc', 'hist', 'about'].forEach(id => {
    document.getElementById('panel-' + id).classList.toggle('active', id === p);
    document.getElementById('nav-'   + id).classList.toggle('active', id === p);
  });

  // Carrega histórico automaticamente ao entrar no painel
  if (p === 'hist') loadHist();
}

/*TEMA (CLARO / ESCURO) */

/* Alterna entre data-theme="dark" e "light" no <html> */
function toggleTheme() {
  const html = document.documentElement;
  const dark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', dark ? 'light' : 'dark');
  document.getElementById('theme-lbl').textContent = dark ? 'Claro' : 'Escuro';
}

/* HELPERS */

/* Retorna a URL da API sem barra final */
function apiUrl() {
  return document.getElementById('api-url').value.replace(/\/$/, '');
}

/* Formata número como BRL */
function fmt(v) {
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
}

/* Formata número curto para stat cards*/
function fmtS(v) {
  return 'R$' + Number(v).toFixed(0);
}

/* REGRA */

/* @param {number} valor   - valor bruto da compra
 * @param {number} desc    - desconto em % (0–100)
 * @param {boolean} vip    - cliente VIP?
 * @returns {{ cb: number, vf: number, x2: boolean }}
 */
function calcular(valor, desc, vip) {
  const vf = valor * (1 - desc / 100);
  let cb = vf * 0.05;

  const x2 = vf > 500;
  if (x2)  cb *= 2;
  if (vip) cb += cb * 0.10;

  return {
    cb: Math.round(cb * 100) / 100,
    vf: Math.round(vf * 100) / 100,
    x2,
  };
}

/* TOAST DE NOTIFICAÇÕES */

/* Exibe um toast temporário.
 * @param {string}  msg - texto da mensagem
 * @param {boolean} err - true = estilo de erro
 */
function toast(msg, err = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (err ? ' err' : '');
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3400);
}

/* CALCULADORA — Preview em tempo real */

/* Lê os campos e atualiza hero + chips + resumo
 * Chamado em cada on input dos campos
 */
function preview() {
  const valor = parseFloat(document.getElementById('f-valor').value) || 0;
  const desc  = parseFloat(document.getElementById('f-desc').value)  || 0;
  const vip   = document.getElementById('f-vip').checked;

  const { cb, vf, x2 } = calcular(valor, desc, vip);
  const base = vf * 0.05;

  // Hero amount (com animação pop)
  const hv = document.getElementById('hero-val');
  hv.textContent = fmt(cb);
  hv.classList.remove('pop');
  void hv.offsetWidth; // force reflow para reiniciar animação
  hv.classList.add('pop');

  // Chips de bônus
  document.getElementById('chip-2x').className  = 'chip' + (x2  ? ' g' : '');
  document.getElementById('chip-vip').className = 'chip' + (vip ? ' c' : '');
  const cd = document.getElementById('chip-desc');
  cd.textContent = 'Desconto ' + Math.round(desc) + '%';
  cd.className   = 'chip' + (desc > 0 ? ' g' : '');

  // Leitura do range
  document.getElementById('range-read').textContent = Math.round(desc) + '%';

  // Resumo
  document.getElementById('s-orig').textContent = valor ? fmt(valor) : '—';
  document.getElementById('s-fin' ).textContent = valor ? fmt(vf)    : '—';
  document.getElementById('s-base').textContent = valor ? fmt(base)  : '—';
  document.getElementById('s-cash').textContent = cb    ? fmt(cb)    : '—';
}

/* Sincroniza o slider → campo numérico de desconto */
function syncRange() {
  document.getElementById('f-desc').value = document.getElementById('f-range').value;
  preview();
}

/* Sincroniza o campo numérico → slider de desconto */
function syncInput() {
  const v = Math.min(100, Math.max(0, parseFloat(document.getElementById('f-desc').value) || 0));
  document.getElementById('f-range').value = v;
  preview();
}

/* Atualiza estilo do bloco VIP ao mudar o toggle */
function toggleVip() {
  const on = document.getElementById('f-vip').checked;
  document.getElementById('vip-box').classList.toggle('on', on);
  preview();
}

/* CALCULADORA — Envio para API */

/* Valida os campos, envia POST /cashback e trata resposta
 * Em caso de falha na API, calcula localmente (modo offline)
 */
async function enviar() {
  const errEl = document.getElementById('err-line');
  errEl.textContent = '';

  const valor = parseFloat(document.getElementById('f-valor').value);
  const desc  = parseFloat(document.getElementById('f-desc').value) || 0;
  const vip   = document.getElementById('f-vip').checked;

  // Validações
  if (!valor || valor <= 0)   { errEl.textContent = '// Informe um valor válido'; return; }
  if (desc < 0 || desc > 100) { errEl.textContent = '// Desconto deve ser 0–100'; return; }

  const btn = document.getElementById('sub-btn');
  btn.disabled    = true;
  btn.textContent = 'PROCESSANDO...';

  try {
    const res = await fetch(apiUrl() + '/cashback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor, desconto: desc, vip }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const data = await res.json();
    pushTx({ valor, desconto: desc, vip, cashback: data.cashback });
    toast('// Cashback de ' + fmt(data.cashback) + ' registrado');
    resetForm();

  } catch (e) {
    // Fallback local
    const { cb } = calcular(valor, desc, vip);
    pushTx({ valor, desconto: desc, vip, cashback: cb, offline: true });
    toast('// API offline — calculado localmente: ' + fmt(cb), true);
    resetForm();

  } finally {
    btn.disabled    = false;
    btn.textContent = 'CALCULAR E SALVAR';
  }
}

/* Adiciona transação ao estado local
 * @param {{ valor, desconto, vip, cashback, offline? }} tx
 */
function pushTx(tx) {
  S.hist.unshift(tx);
  S.total = Math.round((S.total + tx.cashback) * 100) / 100;
}

/* Limpa o formulário e reseta o preview */
function resetForm() {
  ['f-valor', 'f-desc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-range').value = 0;
  document.getElementById('f-vip').checked = false;
  document.getElementById('vip-box').classList.remove('on');
  preview();
}

/* HISTÓRICO — Carregamento e renderização */

/* Busca GET /historico e renderiza a tabela
 * Fallback: usa dados locais se a API não responder
 */
async function loadHist() {
  const list = document.getElementById('hist-list');
  const bar  = document.getElementById('stats-bar');

  list.innerHTML = '<div class="hist-empty">// Carregando...</div>';
  bar.style.display = 'none';

  try {
    const res = await fetch(apiUrl() + '/historico');
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const data = await res.json();

    // Mescla dados da API com transações offline locais
    const todos = [...data, ...S.hist.filter(t => t.offline)];
    renderHist(todos);

  } catch (e) {
    if (S.hist.length) {
      renderHist(S.hist);
      toast('// API offline — exibindo dados locais', true);
    } else {
      list.innerHTML = '<div class="hist-empty">// Falha ao conectar: ' + e.message + '</div>';
    }
  }
}

/* Renderiza a lista de transações e os stat cards
 * @param {Array} lista - array de objetos de transação
 */
function renderHist(lista) {
  const list = document.getElementById('hist-list');
  const bar  = document.getElementById('stats-bar');

  if (!lista.length) {
    list.innerHTML = '<div class="hist-empty">// Nenhuma transação encontrada</div>';
    return;
  }

  // Stat cards
  const total = lista.reduce((a, c) => a + c.cashback, 0);
  bar.style.display = 'grid';
  document.getElementById('st-n').textContent = lista.length;
  document.getElementById('st-t').textContent = fmtS(total);
  document.getElementById('st-a').textContent = fmtS(total / lista.length);

  // Linhas da tabela
  list.innerHTML = lista.map(tx => buildRow(tx)).join('');
}

/**
 * Monta o HTML de uma linha da tabela
 * @param {{ valor, desconto, vip, cashback, offline? }} tx
 * @returns {string}
 */
function buildRow(tx) {
  const d   = tx.desconto || 0;
  const vf  = tx.valor * (1 - d / 100);
  const x2  = vf > 500;

  let badge = tx.vip
    ? '<span class="badge vip">VIP</span>'
    : x2
      ? '<span class="badge bonus">2×</span>'
      : '<span class="badge std">STD</span>';

  if (tx.offline) badge += ' <span class="badge off">OFFLINE</span>';

  return `
    <div class="tbl-row">
      <div class="tc">${fmt(tx.valor)}</div>
      <div class="tc dim">${d.toFixed(1)}%</div>
      <div class="tc dim">${fmt(vf)}</div>
      <div class="tc">${badge}</div>
      <div class="tc acc">${fmt(tx.cashback)}</div>
    </div>
  `;
}

/* INICIALIZAÇÃO */
preview();