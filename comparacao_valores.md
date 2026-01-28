# Comparação de Valores - Competência 12/2025

## Faturado Tasy (competência 12/2025 - 25050 itens)
- Registros: 25,050
- Faturado: R$ 970.693,01
- Pago: R$ 783.558,90
- Glosa: R$ 41.355,90
- A Receber: R$ 145.778,21

## Relatórios Tasy (informado pelo usuário - mês 12/2025)
- Total Faturado: R$ 567.480,92
- Total Pago: R$ 281.092,60
- Total Glosado: R$ 57.520,81

## Problema Identificado
Os valores estão diferentes! O Faturado Tasy mostra valores muito maiores.

Possíveis causas:
1. A tela de Relatórios Tasy pode estar usando uma fonte de dados diferente (antiga vs nova)
2. O filtro de competência pode estar funcionando de forma diferente
3. O limite de registros pode estar truncando os dados

## Ação Necessária
Verificar a função getFaturadoTasyParaRelatorio e garantir que ela usa o mesmo filtro de competência que a tela de Faturado Tasy.
