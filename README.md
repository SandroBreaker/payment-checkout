# 📚 Documentação do Banco de Dados (Google Sheets)

Para garantir o funcionamento correto do sistema unificado (Admin + Cliente), a aba da planilha deve seguir estritamente a estrutura abaixo.

**Nome da Aba (Tab Name):** `BD`

## 📋 Cabeçalhos Obrigatórios (Linha 1)
A ordem das colunas não importa, mas os nomes devem ser respeitados (maios/minúsculas não interferem, mas evite acentos se possível).

| Coluna (Header) | Descrição / Função | Tipo de Dado |
| :--- | :--- | :--- |
| **ID** | Identificador único (UUID). Gerado automaticamente pelo sistema. | Texto (ex: `a7b4...`) |
| **Comprador** | Nome do cliente que aparecerá na interface. | Texto |
| **Link Pagamento** | O link de checkout (ex: Mercado Pago, Stripe) para onde o botão verde irá. | URL |
| **Valor Total** | Valor principal do produto. | Moeda (ex: `R$ 1.000,00`) |
| **Taxa de Serviço** | Valor da taxa que o cliente paga para liberar o reembolso. | Moeda |
| **Prazo** | Tempo para o reembolso (ex: `15 minutos`, `12 horas`). | Texto |
| **Custo Frete** | Valor do frete (use `0` para "Grátis"). | Moeda/Texto |
| **Tarifa Plataforma** | Tarifa interna (use `0` para "Inclusa"). | Moeda/Texto |
| **CPF** | CPF mascarado para exibição de segurança. | Texto (ex: `***.123.***-**`) |
| **Cartão** | Info do cartão mascarado. | Texto (ex: `Mastercard **** 1234`) |
| **Vendas** | Texto de prova social (Histórico). | Texto |
| **Atendimento** | Nota de avaliação. | Texto |
| **Entrega** | Estatística de entrega. | Texto |

> **Nota:** O sistema possui "aliases" inteligentes. Se você usar "Link" ou "Checkout" ao invés de "Link Pagamento", ele entenderá. Mas recomendo manter o padrão acima.
