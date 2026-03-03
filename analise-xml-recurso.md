# Análise Comparativa: XML Recurso de Glosa

## Arquivo do Sistema (recurso_glosa_lote_120001.xml)
## Arquivo Validado pelo Convênio (11459-340213856156-...xml)

## Diferenças Identificadas

### 1. Declaração XML
- **Sistema**: `<?xml version="1.0" encoding="UTF-8"?>`
- **Validado**: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
- **Correção**: Adicionar `standalone="yes"`

### 2. Namespace adicional
- **Sistema**: Apenas `xmlns:ans` e `xmlns:xsi`
- **Validado**: `xmlns:ans` e `xmlns:ns2="http://www.w3.org/2000/09/xmldsig#"`
- **Correção**: Trocar `xmlns:xsi` por `xmlns:ns2` para assinatura digital

### 3. Código Prestador na Operadora (origem)
- **Sistema**: CNPJ completo `01.545.649/0001-50`
- **Validado**: Código interno do prestador `7145`
- **Correção**: Usar o código do prestador na operadora (não CNPJ)

### 4. Registro ANS
- **Sistema**: `010` (3 dígitos)
- **Validado**: `005711` (6 dígitos)
- **Correção**: Usar o registro ANS correto do convênio (6 dígitos)

### 5. Número Guia Recurso Glosa Prestador
- **Sistema**: Usa ID do lote `L202603031616457`
- **Validado**: Usa número da guia original `109645888`
- **Correção**: Usar o número da guia original, não o ID do lote

### 6. Número Guia Recurso Glosa Operadora
- **Sistema**: Vazio `<ans:numeroGuiaRecGlosaOperadora></ans:numeroGuiaRecGlosaOperadora>`
- **Validado**: Preenchido `24000000000795516737`
- **Correção**: Preencher com o número da guia da operadora

### 7. Número do Protocolo
- **Sistema**: Vazio `<ans:numeroProtocolo></ans:numeroProtocolo>`
- **Validado**: Preenchido `340213856156`
- **Correção**: Preencher com o número do protocolo do demonstrativo

### 8. Número do Lote
- **Sistema**: ID do lote `L202603031616457`
- **Validado**: Número sequencial `11459`
- **Correção**: Usar número sequencial do lote

### 9. Senha
- **Sistema**: Vazio `<ans:senha></ans:senha>`
- **Validado**: Preenchido `48Q25N6`
- **Correção**: Preencher com a senha da autorização quando disponível

### 10. Código Glosa Item (codGlosaItem)
- **Sistema**: Texto descritivo `Negado pela auditoria`
- **Validado**: Código numérico TISS `1732`
- **Correção**: CRÍTICO - Usar código numérico TISS, não texto descritivo

### 11. Data Início
- **Sistema**: Data atual `2026-03-03` (data de geração)
- **Validado**: Data real da execução `2024-09-13`
- **Correção**: Usar a data de execução do item, não a data de geração

### 12. Múltiplos itens por guia
- **Sistema**: 1 item por guia (cada guia tem apenas 1 itensGuia)
- **Validado**: Múltiplos itens na mesma guia (5 itensGuia dentro de 1 recursoGuia)
- **Correção**: Agrupar todos os itens da mesma guia dentro do mesmo recursoGuia

### 13. Campos ausentes no sistema
- **Sistema**: NÃO tem `valorTotalRecursado`
- **Validado**: Tem `<ans:valorTotalRecursado>54454.42</ans:valorTotalRecursado>`
- **Correção**: Adicionar soma total dos valores recursados

### 14. Campo ausente: dataRecurso
- **Sistema**: NÃO tem `dataRecurso`
- **Validado**: Tem `<ans:dataRecurso>2026-01-20</ans:dataRecurso>`
- **Correção**: Adicionar data do recurso

### 15. Epílogo com hash
- **Sistema**: NÃO tem epílogo
- **Validado**: Tem `<ans:epilogo><ans:hash>e427b9ad3bec0fd144194950c1753d39</ans:hash></ans:epilogo>`
- **Correção**: Calcular hash MD5 do conteúdo e adicionar epílogo

### 16. Tags vazias
- **Sistema**: Tem tags vazias como `<ans:senha></ans:senha>`, `<ans:numeroProtocolo></ans:numeroProtocolo>`
- **Validado**: Não tem tags vazias - todos os campos estão preenchidos ou ausentes
- **Correção**: Remover tags vazias ou preenchê-las com dados reais

### 17. Justificativa do item
- **Sistema**: Inclui o motivo da glosa + texto do argumento com quebras de linha
- **Validado**: Texto limpo, sem quebras de linha, apenas a justificativa
- **Correção**: Limpar formatação da justificativa, remover quebras de linha extras

## Resumo de Prioridades (Críticas)
1. codGlosaItem deve ser código numérico TISS (não texto)
2. Adicionar valorTotalRecursado e dataRecurso
3. Adicionar epílogo com hash MD5
4. Preencher campos obrigatórios (protocolo, senha, guia operadora)
5. Agrupar itens da mesma guia
6. Usar data de execução real (não data de geração)
7. Limpar justificativa (sem quebras de linha extras)
