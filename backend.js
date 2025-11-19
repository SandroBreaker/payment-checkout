// ======================================================
// ⚙️ CONFIGURAÇÃO BACKEND (ZERO-BUG)
// ======================================================
// ID da Planilha (Mantenha o seu ID atual se for o mesmo)
const SPREADSHEET_ID = "1AbEt9yK3i6aYVUQ6RU9wbZKn24bFJOn9if3eGdX1Y8U";
const SHEET_NAME = "BD";

function doGet(e) {
  return handleRequest(e, "GET");
}

function doPost(e) {
  return handleRequest(e, "POST");
}

function handleRequest(e, method) {
  const params = e.parameter || {};
  getScriptLock(); 

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error(`Aba ${SHEET_NAME} não encontrada.`);
    }

    // ======================================================
    // Rota GET: Buscar dados
    // ======================================================
    if (method === "GET") {

      // AÇÃO 1: Buscar último link gerado (Para preenchimento automático)
      if (params.action && params.action === "lastLink") {
        const lastRow = sheet.getLastRow();

        if (lastRow <= 1) {
          return responseJson({ status: "success", result: null });
        }

        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        
        // Busca dinâmica pela coluna de Link
        const colLinkIndex = headers.findIndex(h => {
          const header = h.toString().trim().toLowerCase();
          return header === "linkpagamento" || header === "link" || header === "checkout";
        });

        if (colLinkIndex === -1) {
          // Fallback silencioso para evitar quebra se a coluna não existir
          return responseJson({ status: "success", result: null });
        }

        const lastLink = sheet.getRange(lastRow, colLinkIndex + 1).getValue();

        return responseJson({
          status: "success",
          result: lastLink
        });
      }

      // AÇÃO 2: Buscar dados do pedido pelo ID
      const id = params.id;

      if (!id) {
        throw new Error("Parâmetro 'id' ausente na URL.");
      }

      const allData = sheet.getDataRange().getValues();
      const headers = allData.shift(); // Remove cabeçalho
      
      // Procura índice do ID
      const idIndex = headers.findIndex(h => h.toString().trim().toLowerCase() === "id");

      if (idIndex === -1) {
        throw new Error("Coluna 'id' não encontrada na planilha (Verifique o cabeçalho).");
      }

      // Busca segura (converte para string para comparação exata)
      const row = allData.find(r => String(r[idIndex]) === String(id));

      if (!row) {
        throw new Error(`Pedido não encontrado.`);
      }

      const result = {};
      for (let i = 0; i < headers.length; i++) {
        result[headers[i]] = row[i];
      }

      return responseJson({
        status: "success",
        data: result 
      });
    }

    // ======================================================
    // Rota POST: Inserir novos pedidos
    // ======================================================
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
        // Geração automática de UUID se for a coluna ID
        if (key.toLowerCase() === 'id') {
           if (postData[key]) return postData[key];
           generatedId = Utilities.getUuid();
           return generatedId;
        }
        // Mapeamento dinâmico
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
    return responseJson({
      status: "error",
      message: error.message
    });
  } finally {
    releaseScriptLock();
  }
}

// Funções utilitárias
function responseJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getScriptLock() {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
}

function releaseScriptLock() {
  try { LockService.getScriptLock().releaseLock(); } catch (e) {}
}
