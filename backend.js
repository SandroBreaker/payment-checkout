// ======================================================
// ⚙️ CONFIGURAÇÃO GERAL (ZERO-BUG)
// ======================================================
// Mantenha o ID da sua planilha atual
const SPREADSHEET_ID = "1AbEt9yK3i6aYVUQ6RU9wbZKn24bFJOn9if3eGdX1Y8U";
const SHEET_NAME = "BD";

// 🔔 COLOQUE SEU E-MAIL AQUI PARA RECEBER O AVISO
const EMAIL_NOTIFICACAO = "seu_email@gmail.com"; 

// ======================================================
// 🚦 ROTEAMENTO PRINCIPAL
// ======================================================

function doGet(e) {
  // Rota GET padrão (Buscar dados do pedido ou último link)
  return handleRequest(e, "GET");
}

function doPost(e) {
  // 1. Verifica se é um Webhook da Invictus (identificado pelo parâmetro ?type=webhook na URL)
  if (e.parameter && e.parameter.type === 'webhook') {
    return handleWebhook(e);
  }

  // 2. Se não for webhook, é o seu site criando um novo pedido (Fluxo normal)
  return handleRequest(e, "POST");
}

// ======================================================
// 🤖 MÓDULO 1: HANDLER DO WEBHOOK (NOVO)
// ======================================================
function handleWebhook(e) {
  const lock = LockService.getScriptLock();
  // Tenta travar por 10s para evitar conflitos de escrita simultânea
  if (!lock.tryLock(10000)) {
    return responseJson({ error: "Server busy" });
  }

  try {
    // O payload da Invictus vem no corpo da requisição
    const data = JSON.parse(e.postData.contents);
    
    // Verificação de segurança básica: status do pagamento
    const status = data.status ? data.status.toLowerCase() : "";
    
    // Se o pagamento foi aprovado ('paid' ou 'succeeded')
    if (status === 'paid' || status === 'succeeded') {
      
      // Extração de dados para o e-mail
      const valorReais = (data.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const clienteEmail = data.customer ? data.customer.email : "Email não informado";
      const clienteNome = data.customer ? data.customer.name : "Cliente";

      // 1. Enviar E-mail de Notificação para você
      sendEmailNotification(clienteNome, valorReais, clienteEmail);

      // 2. Atualizar o Status na Planilha para "PAGO"
      updateSheetStatus(clienteEmail, "PAGO");
    }

    // Retorna 200 OK para a Invictus não ficar tentando reenviar
    return responseJson({ received: true });

  } catch (error) {
    return responseJson({ error: error.message });
  } finally {
    lock.releaseLock();
  }
}

// Sub-função: Enviar E-mail
function sendEmailNotification(nome, valor, emailCliente) {
  if (!EMAIL_NOTIFICACAO || EMAIL_NOTIFICACAO.includes("@gmail.com") === false) return; // Evita erro se não configurado

  const assunto = `✅ PIX RECEBIDO: ${valor}`;
  const corpo = `
    🤑 VENDA APROVADA!
    
    👤 Cliente: ${nome}
    💰 Valor: ${valor}
    📧 Email: ${emailCliente}
    
    O status na planilha foi atualizado automaticamente.
  `;
  
  MailApp.sendEmail({
    to: EMAIL_NOTIFICACAO,
    subject: assunto,
    body: corpo
  });
}

// Sub-função: Atualizar Planilha
function updateSheetStatus(emailAlvo, novoStatus) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0]; // Primeira linha = Cabeçalho

  // Encontra as colunas
  const emailIndex = headers.findIndex(h => h.toString().trim().toLowerCase() === "email");
  let statusIndex = headers.findIndex(h => h.toString().trim().toLowerCase() === "status");

  if (emailIndex === -1) return; // Se não tiver coluna email, não dá pra achar o pedido

  // Se não existir coluna Status, tenta usar a última ou cria uma lógica de fallback
  // Aqui, vamos assumir que se não achar, vamos pintar a linha de verde como sinal visual
  
  // Loop reverso: Procura do último pedido para o primeiro (pega o mais recente desse email)
  for (let i = data.length - 1; i > 0; i--) {
    const linhaEmail = String(data[i][emailIndex]).trim().toLowerCase();
    const alvoEmail = String(emailAlvo).trim().toLowerCase();

    if (linhaEmail === alvoEmail) {
      const rowNumber = i + 1;
      
      if (statusIndex > -1) {
        // Atualiza o texto da coluna Status
        sheet.getRange(rowNumber, statusIndex + 1).setValue(novoStatus);
      }
      
      // Confirmação visual: Pinta a linha inteira de verde claro
      sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).setBackground('#d1e7dd');
      
      break; // Para após atualizar o mais recente
    }
  }
}

// ======================================================
// 📦 MÓDULO 2: SISTEMA DE PEDIDOS (SEU CÓDIGO ANTIGO)
// ======================================================
function handleRequest(e, method) {
  const params = e.parameter || {};
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); 

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error(`Aba ${SHEET_NAME} não encontrada.`);
    }

    // --- Rota GET (Ler dados) ---
    if (method === "GET") {
      // Ação: Buscar último link gerado
      if (params.action && params.action === "lastLink") {
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return responseJson({ status: "success", result: null });

        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const colLinkIndex = headers.findIndex(h => {
          const header = h.toString().trim().toLowerCase();
          return header === "linkpagamento" || header === "link" || header === "checkout";
        });

        if (colLinkIndex === -1) return responseJson({ status: "success", result: null });

        const lastLink = sheet.getRange(lastRow, colLinkIndex + 1).getValue();
        return responseJson({ status: "success", result: lastLink });
      }

      // Ação: Buscar pedido por ID
      const id = params.id;
      if (!id) throw new Error("Parâmetro 'id' ausente na URL.");

      const allData = sheet.getDataRange().getValues();
      const headers = allData.shift();
      const idIndex = headers.findIndex(h => h.toString().trim().toLowerCase() === "id");

      if (idIndex === -1) throw new Error("Coluna 'id' não encontrada.");

      const row = allData.find(r => String(r[idIndex]) === String(id));
      if (!row) throw new Error(`Pedido não encontrado.`);

      const result = {};
      for (let i = 0; i < headers.length; i++) {
        result[headers[i]] = row[i];
      }

      return responseJson({ status: "success", data: result });
    }

    // --- Rota POST (Salvar novo pedido) ---
    if (method === "POST") {
      let postData;
      if (e.postData && e.postData.contents) {
        try { postData = JSON.parse(e.postData.contents); } 
        catch (err) { postData = params; }
      } else {
        postData = params;
      }

      if (!postData || Object.keys(postData).length === 0) {
        return responseJson({ status: "error", message: "Nenhum dado recebido." });
      }

      const headersRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
      const headers = headersRange.getValues()[0];
      let generatedId = null;

      const newRow = headers.map(header => {
        const key = header.toString().trim();
        // Gera ID automático se necessário
        if (key.toLowerCase() === 'id') {
           if (postData[key]) return postData[key];
           generatedId = Utilities.getUuid();
           return generatedId;
        }
        // Define status inicial como 'Pendente' se a coluna existir
        if (key.toLowerCase() === 'status') {
            return 'Pendente';
        }
        return postData[key] !== undefined ? postData[key] : ""; 
      });

      sheet.appendRow(newRow);

      return responseJson({
        status: "success",
        message: "Dados salvos com sucesso.",
        savedId: generatedId || postData['id']
      });
    }

    throw new Error(`Método ${method} não suportado.`);

  } catch (error) {
    return responseJson({ status: "error", message: error.message });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// Função utilitária para responder JSON
function responseJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
