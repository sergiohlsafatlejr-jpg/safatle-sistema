# Análise da Estrutura XML TISS

## Estrutura identificada:

### Guia (ans:guiaSP-SADT)
- **Número da Guia**: `ans:cabecalhoGuia/ans:numeroGuiaPrestador`
- **Número Guia Operadora**: `ans:dadosAutorizacao/ans:numeroGuiaOperadora`
- **Senha**: `ans:dadosAutorizacao/ans:senha`

### Procedimentos Executados (ans:procedimentoExecutado)
- **Código**: `ans:procedimento/ans:codigoProcedimento`
- **Descrição**: `ans:procedimento/ans:descricaoProcedimento`
- **Quantidade**: `ans:quantidadeExecutada`
- **Valor Unitário**: `ans:valorUnitario`
- **Valor Total**: `ans:valorTotal`
- **Nome do Médico**: `ans:equipeSadt/ans:nomeProf`
- **CRM**: `ans:equipeSadt/ans:numeroConselhoProfissional`

### Outras Despesas (ans:outrasDespesas/ans:despesa/ans:servicosExecutados)
- **Código**: `ans:codigoProcedimento`
- **Descrição**: `ans:descricaoProcedimento`
- **Quantidade**: `ans:quantidadeExecutada`
- **Valor Unitário**: `ans:valorUnitario`
- **Valor Total**: `ans:valorTotal`

### Campos a adicionar no schema:
- numeroGuia (string)
- nomeMedico (string)
- crmMedico (string)
