// ========================================================
// ⚙️ CONFIGURAÇÃO CENTRAL
// ========================================================
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbw0tZ66QIzYiGsD2XNyX9I3dv5r5zfAqPDywPTrRXYJsNsbeJS9Mlo_GdIdynl9p8EwqQ/exec'; 
const BASE_URL = window.location.href.split('?')[0]; 
const ADMIN_PIN = "0007"; 

// Configuração da API Invictus Pay
const API_INVICTUS_TOKEN = "wsxiP0Dydmf2TWqjOn1iZk9CfqwxdZBg8w5eQVaTLDWHnTjyvuGAqPBkAiGU";
const API_INVICTUS_ENDPOINT = "https://api.invictuspay.app.br/api";
// Hash fixo ou dinâmico do produto na Invictus (Use um genérico se o valor for variável no backend deles, ou o hash real)
const OFFER_HASH_DEFAULT = "png8aj6v6p"; 

// ========================================================
// 🚦 ROTEADOR E AUTH
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const viewLogin = document.getElementById('login-view');
  const viewAdmin = document.getElementById('admin-view');
  const viewClient = document.getElementById('client-view');

  if (params.has('id')) {
    showView(viewClient);
    initClientApp(params.get('id'));
    return;
  }

  if (localStorage.getItem('admin_session_active') === 'true') {
    showView(viewAdmin);
    initAdminApp();
    return;
  }

  showView(viewLogin);
  initLoginApp(viewLogin, viewAdmin);
});

function showView(element) {
  document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
  element.style.display = 'block';
}

function logoutAdmin() {
  localStorage.removeItem('admin_session_active');
  location.reload();
}

// ========================================================
// 🔐 LOGIN & ADMIN LOGIC
// ========================================================
function initLoginApp(viewLogin, viewAdmin) {
  const loginForm = document.getElementById('loginForm');
  const pinInput = document.getElementById('adminPin');
  const errorMsg = document.getElementById('loginError');

  pinInput.focus();

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (pinInput.value === ADMIN_PIN) {
      localStorage.setItem('admin_session_active', 'true');
      errorMsg.textContent = "";
      showView(viewAdmin);
      initAdminApp();
    } else {
      errorMsg.textContent = "Senha incorreta";
      pinInput.value = "";
      pinInput.focus();
    }
  });
}

function initAdminApp() {
  const form = document.getElementById('adminForm');
  const modal = document.getElementById('modalSuccess');
  const linkDisplay = document.getElementById('finalLink');
  const btnSalvar = document.getElementById('btnSalvar');
  const btnCopy = document.getElementById('btnCopy');
  const btnView = document.getElementById('btnView');
  const toggleHeader = document.getElementById('preset-toggle');
  const fieldsContainer = document.getElementById('preset-fields-container');
  const toggleIcon = document.getElementById('toggle-icon');
  const moneyInputs = document.querySelectorAll('.money');

  toggleHeader.addEventListener('click', () => {
      const isExpanded = fieldsContainer.classList.toggle('expanded');
      toggleIcon.classList.toggle('rotated');
      fieldsContainer.style.maxHeight = isExpanded ? fieldsContainer.scrollHeight + "px" : "0";
  });

  const formatMoney = (value) => {
    value = value.replace(/\D/g, "");
    const amount = parseFloat(value) / 100;
    return isNaN(amount) ? "" : amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  moneyInputs.forEach(input => {
    input.addEventListener('input', (e) => e.target.value = formatMoney(e.target.value));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnSalvar.textContent = "Gerando...";
    btnSalvar.disabled = true;

    const data = {};
    new FormData(form).forEach((v, k) => data[k] = v);
    
    // O Link de pagamento na planilha será o próprio link da plataforma
    data.linkPagamento = BASE_URL; 

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const json = await res.json();

      if (json.status === 'success') {
        const idGerado = json.savedId || json.id; 
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
      btnSalvar.textContent = "Gerar Link de Pagamento";
      btnSalvar.disabled = false;
    }
  });

  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(linkDisplay.textContent);
    btnCopy.textContent = "Copiado!";
    setTimeout(() => btnCopy.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar', 2000);
  });
}

// ========================================================
// 🛍️ CLIENT CHECKOUT LOGIC (INVICTUS INTEGRATION)
// ========================================================
async function initClientApp(id) {
  const containerArea = document.getElementById('client-content-area');

  // Helpers
  const formatCurrency = (val) => val ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
  
  // Parser de moeda (R$ 1.000,00 -> 100000 centavos)
  const parseMoneyToCents = (valStr) => {
    if(!valStr) return 0;
    // Remove tudo que não é digito
    const clean = String(valStr).replace(/\D/g, '');
    return parseInt(clean, 10); 
  };

  try {
    // 1. Busca dados do Google Sheets
    const response = await fetch(`${BACKEND_URL}?id=${id}`);
    const json = await response.json();

    if (json.status !== 'success') {
      containerArea.innerHTML = `<div style="text-align:center; padding:40px; color:#ff5252;"><h2>Pedido não encontrado.</h2></div>`;
      return;
    }

    const dados = {};
    // Normaliza chaves para lowercase
    Object.keys(json.data).forEach(key => dados[key.toLowerCase()] = json.data[key]);
    
    // Mapeia os campos importantes da planilha
    // Nota: 'taxa' na planilha é o valor real que será cobrado no checkout
    const valorCobrancaStr = dados.taxa || dados['taxa de serviço'] || "R$ 0,00";
    const valorVisualStr = dados.valor || dados['valor total'] || "R$ 1.000,00";
    const nomeComprador = dados.comprador || "";
    
    const valorEmCentavos = parseMoneyToCents(valorCobrancaStr);
    
    // 2. Monta o HTML do Checkout
    containerArea.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'client-container';
    
    wrapper.innerHTML = `
        <div class="header-image"></div>
        <div class="header-title">
            <h2>Pagamento Seguro</h2>
        </div>
        <div class="content">
            <div class="summary-box">
                <div>
                    <div class="summary-text">Pagamento referente a taxa de serviço</div>
                    <div class="summary-text" style="font-size:11px; opacity:0.7">Produto: ${valorVisualStr} (Custódia)</div>
                </div>
                <div class="summary-price">${valorCobrancaStr}</div>
            </div>

            <form id="checkoutForm">
                <h3 class="checkout-title"><i class="fa-solid fa-user-shield"></i> Dados do Pagador</h3>
                
                <div class="checkout-grid">
                    <div class="form-group full-width">
                        <label>Nome Completo</label>
                        <input type="text" name="name" required value="${nomeComprador}">
                    </div>
                    <div class="form-group">
                        <label>E-mail</label>
                        <input type="email" name="email" required placeholder="seu@email.com">
                    </div>
                    <div class="form-group">
                        <label>CPF</label>
                        <input type="text" name="document" required placeholder="000.000.000-00" maxlength="14">
                    </div>
                    <div class="form-group full-width">
                        <label>Telefone (WhatsApp)</label>
                        <input type="text" name="phone_number" required placeholder="(00) 90000-0000">
                    </div>
                </div>

                <h3 class="checkout-title"><i class="fa-solid fa-location-dot"></i> Endereço de Faturamento</h3>
                
                <div class="checkout-grid">
                    <div class="form-group">
                        <label>CEP</label>
                        <input type="text" name="zip_code" required placeholder="00000-000">
                    </div>
                    <div class="form-group">
                        <label>Estado (UF)</label>
                        <input type="text" name="state" required maxlength="2" placeholder="SP">
                    </div>
                    <div class="form-group full-width">
                        <label>Rua</label>
                        <input type="text" name="street_name" required>
                    </div>
                    <div class="form-group">
                        <label>Número</label>
                        <input type="text" name="number" required>
                    </div>
                    <div class="form-group">
                        <label>Bairro</label>
                        <input type="text" name="neighborhood" required>
                    </div>
                    <div class="form-group full-width">
                        <label>Cidade</label>
                        <input type="text" name="city" required>
                    </div>
                </div>

                <button type="submit" id="btnPay" class="btn-pay">
                    <i class="fa-brands fa-pix"></i> PAGAR ${valorCobrancaStr}
                </button>
            </form>
        </div>
        <div class="footer" style="text-align:center; padding:15px; color:#555; font-size:12px;">
            &copy; 2025 Ambiente Seguro. Seus dados estão protegidos.
        </div>
    `;

    containerArea.appendChild(wrapper);

    // 3. Lógica do Formulário
    const form = document.getElementById('checkoutForm');
    const btnPay = document.getElementById('btnPay');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Captura dados
        const formData = new FormData(form);
        const customerData = {};
        formData.forEach((value, key) => customerData[key] = value);

        // Payload para API Invictus
        const payload = {
            "amount": valorEmCentavos, 
            "offer_hash": OFFER_HASH_DEFAULT, 
            "payment_method": "pix", 
            "customer": customerData,
            "cart": [
                {
                    "product_hash": OFFER_HASH_DEFAULT,
                    "title": "Taxa de Serviço - Plataforma Segura",
                    "price": valorEmCentavos,
                    "quantity": 1,
                    "operation_type": 1, 
                    "tangible": false
                }
            ],
            "installments": 1,
            "expire_in_days": 1,
            "transaction_origin": "api"
        };

        // Executa API
        await executeInvictusApi('POST', '/public/v1/transactions', payload, btnPay);
    });

  } catch (err) {
    console.error(err);
    containerArea.innerHTML = `<p style="color:red; text-align:center">Erro ao carregar pedido.</p>`;
  }
}

// ========================================================
// 📡 API & MODAL HANDLER
// ========================================================
async function executeInvictusApi(method, path, payload, button) {
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Processando...`;

    try {
        const response = await fetch(`${API_INVICTUS_ENDPOINT}${path}?api_token=${API_INVICTUS_TOKEN}`, {
            method: method,
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            if (data.payment_method === 'pix' && data.pix && data.pix.pix_qr_code) {
                showPixModal(data);
            } else {
                alert("Pedido criado, mas sem dados de PIX retornados.");
            }
        } else {
            // Tratamento de erro básico
            const msg = data.errors ? Object.values(data.errors).flat().join('\n') : (data.message || "Erro na transação");
            alert("Erro no pagamento:\n" + msg);
        }

    } catch (error) {
        console.error(error);
        alert("Erro de comunicação com o gateway.");
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

function showPixModal(data) {
    const modal = document.getElementById('pixModal');
    const amountEl = document.getElementById('modalAmount');
    const hashEl = document.getElementById('modalHash');
    const textarea = document.getElementById('pixCodeTextarea');
    const qrContainer = document.getElementById('qrCodeContainer');
    const qrImage = document.getElementById('qrCodeImage');
    const btnCopy = document.getElementById('copyPixButton');
    const btnClose = document.getElementById('closeModalButton');

    // Preencher dados
    const valBrl = (data.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    amountEl.textContent = valBrl;
    hashEl.textContent = `ID: ${data.hash}`;
    textarea.value = data.pix.pix_qr_code;

    if (data.pix.qr_code_base64) {
        qrImage.src = `data:image/png;base64,${data.pix.qr_code_base64}`;
        qrContainer.style.display = 'block';
    } else {
        qrContainer.style.display = 'none';
    }

    // Abrir Modal
    modal.classList.add('is-visible');

    // Eventos
    const closeModal = () => modal.classList.remove('is-visible');
    
    btnClose.onclick = closeModal;
    modal.onclick = (e) => { if(e.target === modal) closeModal(); };

    btnCopy.onclick = () => {
        textarea.select();
        document.execCommand('copy');
        const oldText = document.getElementById('copyButtonText').textContent;
        document.getElementById('copyButtonText').textContent = "COPIADO! ✅";
        btnCopy.style.background = "#00c853";
        setTimeout(() => {
            document.getElementById('copyButtonText').textContent = oldText;
            btnCopy.style.background = ""; 
        }, 2000);
    };
}
