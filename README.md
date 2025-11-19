# 📦 Plataforma de Checkout Seguro (Unified Deploy + PIN Protection)

Este projeto unifica o **Painel Admin** (Gerador de Links) e a **Visão do Cliente** (Checkout) em uma única aplicação. O acesso ao Admin é protegido por um PIN numérico.

---

## 🚀 Instalação

### 1. Configuração da Planilha (Database)
Crie uma nova Planilha Google.
1.  **Nome da Aba:** Renomeie para `BD`.
2.  **Cabeçalhos (Linha 1):** Adicione exatamente estas colunas:
    * `id`, `data`, `comprador`, `linkPagamento`, `valor`, `taxa`, `prazo`, `frete`, `tarifa`, `cpf`, `cartao`, `vendas`, `atendimento`, `entrega`

### 2. Configuração do Backend (GAS)
No editor de script da planilha (Extensões > Apps Script):
1.  Cole o código do arquivo **`backend.js`** (do envio anterior, não houve mudança).
2.  Substitua `SPREADSHEET_ID` pelo ID da sua planilha.
3.  **Implantar** > **Nova Implantação** > Tipo "App da Web" > Acesso: "Qualquer pessoa" (Anyone).
4.  Copie a URL gerada.

### 3. Configuração do Frontend
No arquivo **`script.js`**:
1.  Cole a URL do Web App na variável `BACKEND_URL`.
2.  **Defina sua Senha:** Altere a variável `ADMIN_PIN = "2025"` para o código que você deseja usar (ex: "9988").

---

## 📖 Como Usar

### 🔐 Acesso Admin (Você)
Acesse a raiz do site: `https://seu-site.github.io/`
1.  Uma tela de bloqueio pedirá o PIN.
2.  Digite o código (padrão: 2025).
3.  O sistema libera o formulário e mantém você logado (salvo no navegador).
4.  Gere o link para o cliente.

### 🛒 Acesso Cliente (Checkout)
O link gerado terá o formato: `https://seu-site.github.io/?id=...`
1.  Ao clicar no link, o sistema detecta o ID.
2.  **Pula a tela de login** automaticamente.
3.  Exibe os detalhes da transação segura.

---

## ⚠️ Notas Importantes
* **Segurança:** O PIN é verificado no navegador (Client-side). Para o seu contexto de uso, isso impede o acesso de curiosos, mas não de hackers avançados.
* **Logout:** Há um botão "Sair" no topo do painel admin para bloquear o acesso novamente.
