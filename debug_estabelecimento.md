# Debug Estabelecimento

## Problema Identificado - 20/01/2026

### Estabelecimento 90002 (Pronto Socorro Infantil) - Tela Demonstrativo

**PROBLEMA CONFIRMADO:**
- Ao selecionar o convênio "Unimed (001)" na tela de Demonstrativo, aparecem dados que pertencem ao estabelecimento 90001 (Ox Uti)
- Total Itens: 5390
- Pagos: 5365
- Glosados: 25
- Total Pago: R$ 478.315,22
- Total Glosado: R$ 3.518,96

### Causa do Problema
Os convênios (Unimed e Ipasgo) estão com `estabelecimentoId = null` no banco de dados, o que significa que são compartilhados entre TODOS os estabelecimentos.

Quando o usuário seleciona um convênio no Demonstrativo, a query está buscando todos os procedimentos daquele convênio, independente do estabelecimento.

### Solução Necessária
1. Verificar a página Demonstrativo.tsx e garantir que o filtro de estabelecimentoId está sendo passado corretamente
2. Verificar a query no backend que busca os dados do demonstrativo
3. Garantir que mesmo quando o convênio é compartilhado (estabelecimentoId = null), os dados são filtrados pelo estabelecimento atual
