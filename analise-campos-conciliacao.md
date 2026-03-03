# Análise de Campos para Conciliação

## Problema
- conciliados_automatico tem 38185 registros, TODOS com pacienteNome=NULL e descricaoItem=NULL
- A conciliação automática não está copiando esses campos

## Fontes de dados disponíveis

### integ_faturado (Warleine - 118k registros)
- NÃO tem campo de nome do paciente (não existe coluna nomepac)
- `descricao` → descrição do procedimento (ex: "CONSULTA EM PRONTO SOCORRO")
- `tipoproc` → tipo do procedimento
- `nomeconv` → nome do convênio
- `nomeprest` → nome do prestador

### faturamento_unificado
- `pacienteNome` → NULL para registros WARLEINE (integ_faturado não tem nome paciente)
- `descricaoItem` → tem descrição para registros XML_TISS
- `tipoItem` → tem tipo (S, C, H)

### recebimentos_excel (demonstrativo)
- `nome_beneficiario` → NOME DO PACIENTE ✓
- `item_desc` → DESCRIÇÃO DO ITEM/MEDICAMENTO ✓
- `tipo_lancamento` → TIPO (MED, MAT, EXA) ✓
- `codigo_glosa` → CÓDIGO DA GLOSA ✓
- `valor_glosa` → VALOR DA GLOSA ✓

## Solução
1. Na conciliação automática, ao fazer match, copiar do recebimentos_excel:
   - nome_beneficiario → pacienteNome
   - item_desc → descricaoItem (se vazio)
2. Para itens "não recebidos" (sem match), buscar descricaoItem do faturamento_unificado
3. Adicionar colunas na conciliados_automatico:
   - tipoItem (MED, MAT, EXA, etc.)
   - codigoGlosa
   - motivoGlosa (descrição do código de glosa)
4. Na tabela de guias: substituir convênio por paciente
5. Na tela de detalhes: mostrar descrição, tipo e motivo glosa
