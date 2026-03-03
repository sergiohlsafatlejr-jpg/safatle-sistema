# Análise de Dados por Estabelecimento

## faturamento_unificado
- VAZIO (0 registros) — ainda não foi populado

## integ_faturado (Warleine)
- 1260036: 118.718 registros (APENAS este estabelecimento)

## faturamento_tiss (XML TISS)
- 1: 29.066
- 3: 35.642
- 6: 21.911
- 1170001: 727
- 1260036: 530

## recebimentos_excel
- 1: 49.456
- 3: 10.637
- 6: 71.052
- 1260036: 2.886

## Conclusão
- Todas as queries já filtram por `estabelecimentoId` corretamente
- O `integ_faturado` só tem dados do estabelecimento 1260036
- O `faturamento_tiss` tem dados de 5 estabelecimentos
- O `faturamento_unificado` está vazio — precisa rodar "Popular Dados" para cada estabelecimento
- A segregação por estabelecimento está correta no backend
- O frontend já usa `useEstabelecimento()` para pegar o ID correto
