# Análise de Campos para Conciliação Automática

## Campos de Cruzamento

### faturamento_unificado → recebimentos_excel

| Campo Faturamento | Campo Recebimento | Tipo Cruzamento |
|---|---|---|
| codigoItem | item | Código procedimento (principal) |
| codigoItemTuss | item | Código TUSS alternativo |
| numeroGuia | numero_guia | Número da guia (principal) |
| pacienteNome | nome_beneficiario | Nome paciente (fallback) |
| competencia | (via arquivo) | Competência |
| convenioId | (via arquivo) | Convênio |
| quantidade | quantidade | Quantidade |
| valorFaturado | valor_informado | Valor cobrado |
| valorPago | valor_pagamento | Valor pago |
| valorGlosa | valor_glosa | Valor glosa |

### Algoritmo de Conciliação

1. **Match exato por guia + código**: numero_guia = numero_guia AND codigoItem = item
2. **Match por guia + código TUSS**: numero_guia = numero_guia AND codigoItemTuss = item
3. **Match com vinculacao_codigos**: usar tabela de-para para traduzir códigos divergentes
4. **Match por paciente + código**: paciente_nome LIKE nome_beneficiario AND codigoItem = item

### Status resultante
- **conciliado**: match encontrado, valores iguais
- **divergente**: match encontrado, valores diferentes
- **nao_recebido**: faturado sem match no recebimento
- **recebido_sem_faturamento**: recebido sem match no faturamento
