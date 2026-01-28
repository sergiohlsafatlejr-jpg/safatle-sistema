# Filtro de Competência - Funcionando Corretamente

## Data: 2026-01-27

O filtro de competência agora está funcionando corretamente e mostrando as opções unificadas por mês/ano:

- Todas
- 03/2026 (20.279 itens)
- 02/2026 (44.086 itens)
- 01/2026 (39.519 itens)
- 12/2025 (48.035 itens)
- 11/2025 (46.865 itens)
- 10/2025 (60.800 itens)
- 09/2025 (74.894 itens)
- 08/2025 (74.087 itens)
- 07/2025 (68.115 itens)

## Correções Aplicadas
1. Corrigida a função `listarCompetenciasFaturadoTasy` para usar raw SQL com `db.execute()`
2. Corrigido o tipo TypeScript para processar o resultado corretamente
3. As competências agora são agrupadas por mês/ano (primeiros 7 caracteres: AAAA-MM)
