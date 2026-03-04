# Análise de Erros Factiss - Recurso de Glosa TISS

## Erros reportados pelo Factiss:

1. **cabecalho > Padrao inválido**
   - O elemento 'cabecalho' apresenta elemento filho 'Padrao' inválido
   - Lista de possíveis elementos esperados: 'versaoPadrao'
   - **Correção**: Usar `<ans:versaoPadrao>` em vez de `<ans:padraoTISS>` / `<ans:versaoTISS>`

2. **dadosContratado incompleto**
   - O elemento 'dadosContratado' apresenta conteúdo incompleto
   - Lista de possíveis elementos esperados: 'nomeContratado'
   - **Correção**: Adicionar `<ans:nomeContratado>` dentro de `<ans:dadosContratado>`

3. **itensGuia inválido**
   - O elemento 'itensGuia' apresenta elemento filho 'sequentialItem' inválido
   - Lista de possíveis elementos esperados: 'dataInicio'
   - **Correção**: Adicionar `<ans:dataInicio>` antes de `<ans:sequencialItem>` nos itensGuia

## Schema TISS esperado (v3.01.02 ou v3.02):
- cabecalho deve ter `versaoPadrao` (não `padraoTISS/versaoTISS`)
- dadosContratado deve incluir `nomeContratado`
- itensGuia deve ter `dataInicio` antes de `sequencialItem`
