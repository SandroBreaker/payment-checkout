# 📦 Plataforma de Checkout Seguro (Unified Deploy)

Este projeto unifica o **Painel Admin** (Gerador de Links) e a **Visão do Cliente** (Checkout) em uma única aplicação (SPA - Single Page Application). A interface se adapta automaticamente com base na URL acessada.

---

## 🚀 Instalação e Configuração

Siga os passos abaixo rigorosamente para garantir o funcionamento da integração entre o Frontend e o Google Sheets.

### 1. Configuração da Planilha (Banco de Dados)
Crie uma nova Planilha Google (ou utilize uma existente).

1.  **Nome da Aba:** Renomeie a aba inferior para `BD`.
    * *Nota:* Se preferir outro nome, ajuste a variável `SHEET_NAME` no arquivo `backend.js`.
2.  **Cabeçalhos (Linha 1):** Crie as colunas exatamente com os nomes abaixo (a ordem não importa, a escrita sim):
    * `id`
    * `data`
    * `comprador`
    * `linkPagamento` (ou `checkout`)
    * `valor` (ou `valor total`)
    * `taxa` (ou `taxa de serviço`)
    * `prazo`
    * `frete`
    * `tarifa`
    * `cpf`
    * `cartao`
    * `vendas`
    * `atendimento`
    * `entrega`

---

### 2. Configuração do Backend (Google Apps Script)
No editor de script da sua planilha (vá em **Extensões** > **Apps Script**):

1.  **Código:** Apague qualquer código existente e cole o conteúdo do arquivo **`backend.js`**.
2.  **ID da Planilha:**
    * Copie o ID na URL da sua planilha (a sequência de letras e números entre `/d/` e `/edit`):
        `https://docs.google.com/spreadsheets/d/`**`COLE_O_ID_AQUI`**`/edit`
    * No código `backend.js`, substitua o valor da constante:
        ```javascript
        const SPREADSHEET_ID = "SEU_ID_AQUI";
        ```
3.  **Salvar e Implantar:**
    * Clique no botão **Implantar (Deploy)** > **Nova implantação**.
    * **Tipo:** Selecione "App da Web" (Web App) na engrenagem.
    * **Descrição:** Digite `v1`.
    * **Executar como:** Selecione **"Eu"** (seu email).
    * **Quem pode acessar:** Selecione **"Qualquer pessoa"** (Anyone).
        * ⚠️ *Importante: Se não marcar "Qualquer pessoa", o site não funcionará para o cliente.*
    * Clique em **Implantar**.
4.  **URL do Script:** Copie a URL gerada (ela termina em `/exec`).

---

### 3. Configuração do Frontend
Abra o arquivo **`script.js`** do seu projeto web:

1.  Localize a constante de configuração no topo do arquivo:
2.  Substitua pela URL que você copiou no passo anterior.

```javascript
// Exemplo:
const BACKEND_URL = '[https://script.google.com/macros/s/AKfycb.../exec](https://script.google.com/macros/s/AKfycb.../exec)';
