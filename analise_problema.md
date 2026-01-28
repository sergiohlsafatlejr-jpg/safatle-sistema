# Análise do Problema - Valores diferentes entre Relatórios Tasy e Faturado Tasy

## Problema Identificado

Na tela de Faturado Tasy, vejo que existem **múltiplas competências** com o mesmo mês/ano (12/2025):
- 12/2025 (21175 itens)
- 12/2025 (288 itens)
- 12/2025 (1323 itens)
- 12/2025 (25050 itens)
- 12/2025 (58 itens)
- 12/2025 (141 itens)

Isso indica que o campo `competencia` no banco de dados não está armazenando apenas "AAAA-MM", mas sim "AAAA-MM-DD" (data completa).

## Causa Raiz

A função `getFaturadoTasyParaRelatorio` está filtrando corretamente usando `LIKE '2025-12%'`, mas a tela de Relatórios Tasy está mostrando apenas os dados de UMA das importações (provavelmente a primeira que encontra com limite de 10000).

O problema é que na tela de Faturado Tasy, quando seleciono "12/2025 (25050 itens)", estou selecionando uma competência específica (ex: "2025-12-15"), enquanto nos Relatórios Tasy o filtro é por mês/ano geral.

## Solução

1. Verificar se o campo competencia está armazenando data completa ou apenas mês/ano
2. Se estiver armazenando data completa, ajustar o filtro para usar apenas o mês/ano
3. Aumentar o limite de registros se necessário

## Valores Esperados (soma de todas as competências 12/2025)

Somando todos os registros de 12/2025:
- 21175 + 288 + 1323 + 25050 + 58 + 141 = 48035 itens

Mas o Relatórios Tasy mostra apenas 18.698 registros, o que indica que o limite de 10000 está truncando os dados.
