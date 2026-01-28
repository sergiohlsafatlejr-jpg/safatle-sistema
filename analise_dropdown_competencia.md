# Análise do Problema - Dropdown de Competência

## Situação Atual
- O dropdown de competência só mostra "Todas" quando deveria mostrar as competências agrupadas por mês/ano
- Há 476.680 registros no estabelecimentoId 2 (Maternidade Ela)
- As competências disponíveis são: 2026-03, 2026-02, 2026-01, 2025-12, 2025-11, 2025-10, 2025-09, 2025-08, 2025-07

## Problema Identificado
A query SQL está correta (agrupa por LEFT(competencia, 7)), mas o frontend não está recebendo ou exibindo as opções corretamente.

## Próximos Passos
1. Verificar se a rota do backend está retornando os dados corretamente
2. Verificar se o frontend está processando os dados corretamente
3. Verificar se há erro no console do navegador
