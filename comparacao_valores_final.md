# Comparação de Valores - Competência 12/2025

## Relatórios Tasy (Fonte: Faturado Tasy Nova, Dezembro 2025)
- Total Faturado: R$ 567.480,92
- Total Pago: R$ 281.092,60
- Total Glosado: R$ 57.520,81
- Quantidade: 18.698
- Materiais: R$ 195.642,61
- Honorários: R$ 371.838,31

## Faturado Tasy (Competência 12/2025 - 25050 itens)
- Registros: 25,050
- Faturado: R$ 970.693,01
- Pago: R$ 783.558,90
- Glosa: R$ 41.355,90
- A Receber: R$ 145.778,21

## Problema Identificado
Os valores são MUITO diferentes!
- Relatórios Tasy: R$ 567.480,92 faturado
- Faturado Tasy: R$ 970.693,01 faturado

A diferença é de R$ 403.212,09 (aproximadamente 41% a menos nos Relatórios Tasy)

## Possíveis Causas
1. O filtro de competência no Relatórios Tasy usa dataInicio/dataFim (primeiro e último dia do mês)
2. O filtro de competência no Faturado Tasy usa o campo competencia diretamente (formato AAAA-MM)
3. A função getFaturadoTasyParaRelatorio pode estar usando um filtro diferente

## Solução
Verificar como a função getFaturadoTasyParaRelatorio filtra por competência e garantir que use o mesmo método que a tela de Faturado Tasy.
