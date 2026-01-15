# Análise do PDF da Saúde Caixa - Demonstrativo de Análise de Conta

## Estrutura do Documento

### Cabeçalho (por página)
- Fornecedor: Benner
- Sistema Benner-Saúde
- Versão: 3.63.53
- Página: X

### Dados da Operadora
- 1 - Registro ANS: 31292-4
- 3 - Nome da Operadora: CAIXA ECONÔMICA FEDERAL - SAÚDE CAIXA
- 4 - CNPJ da Operadora: 00.360.305/0001-04
- 5 - Data de Emissão: 14/01/2026

### Dados do Prestador
- 6 - Código na Operadora: 01545649000150
- 7 - Nome do Contratado: PRONTO SOCORRO INFANTIL DE GOIANIA
- 8 - Código CNES: 2338130

### Dados do Lote/Protocolo
- 9 - Número do Lote: 120087047
- 10 - Número do Protocolo: 7011815
- 11 - Data do Protocolo: 17/11/2025
- 12 - Código da Glosa do Protocolo: (vazio)
- 13 - Código da situação do protocolo: 6

### Dados da Guia
- 14 - Número da Guia no Prestador: 71666590
- 15 - Número da Guia Atribuído pela Operadora: 66054097
- 16 - Senha: 716665905
- 17 - Nome do Beneficiário: ALVARO LUIS FARIA RABELO
- 18 - Número da Carteira: 0101326784020234
- 19 - Data do Início do Faturamento: 14/01/2026
- 23 - Código da Glosa da Guia: (vazio)
- 24 - Código da situação da guia: 6

### Tabela de Procedimentos (colunas)
- 25 - Data de realização
- 26 - Tabela
- 27 - Código do Procedimento (formato: X.XX.XX.XXX)
- 28 - Descrição Item assistencial
- 29 - Grau de Participação
- 30 - Valor Informado
- 31 - Quant. Executada
- 32 - Valor Processado
- 33 - Valor Liberado
- 34 - Valor Glosa
- 35 - Código da Glosa

### Totais da Guia
- 36 - Valor Informado da Guia (R$)
- 37 - Valor Processado da Guia (R$)
- 38 - Valor Liberado da Guia (R$)
- 39 - Valor Glosa da Guia (R$)

## Códigos de Glosa Identificados
- 1702 - Aparece em vários itens (precisa verificar significado)

## Exemplo de Linha de Procedimento
| Data | Tabela | Código | Descrição | Grau | Valor Inf. | Qtd | Valor Proc. | Valor Lib. | Valor Glosa | Cód. Glosa |
|------|--------|--------|-----------|------|------------|-----|-------------|------------|-------------|------------|
| 31/10/2025 | 22 | 4.03.04.370 | Hemossedimentação, (VHS) - pesquisa | | 5,02 | 1 | 5,02 | 0,00 | 5,02 | 1702 |

## Observações
- O PDF tem 46 páginas
- Cada página pode ter uma ou mais guias
- Cada guia tem múltiplos procedimentos
- Valores em formato brasileiro (vírgula como separador decimal)
- Código de procedimento no formato X.XX.XX.XXX (tabela TUSS)
