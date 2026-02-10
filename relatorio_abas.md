# Relatório de Análise das Abas do Sistema

## Resumo de Dados no Banco

| Tabela | Registros | Observação |
|--------|-----------|------------|
| `faturamento_tiss` | 61.357 | Dados de envio XML TISS |
| `demonstrativo` | 37.971 | Dados consolidados de recebimento |
| `recebimento_tiss` | 720 | Dados de retorno XML TISS |
| `recebimentos_excel` | 37.251 | Dados de retorno Excel |
| `faturadoTasy` | 476.680 | Dados importados do Tasy |
| `recursosGlosa` | 61 | Recursos de glosa criados |
| `lotesRecurso` | 2 | Lotes de recurso |
| `historicoContestacoes` | 0 | Nenhum histórico registrado |
| `comparacoes` | 0 | Nenhuma comparação criada |
| `divergencias` | 0 | Nenhuma divergência registrada |
| `convenios` | 10 | Convênios cadastrados |
| `arquivos` | 625 | Arquivos importados |

---

## 1. Aba Divergentes (`Divergencias.tsx`)

### Procedures tRPC utilizadas:
- `trpc.comparacoes.list` → `db.getComparacoes()`
- `trpc.comparacoes.get` → `db.getComparacaoById()` + `db.getDivergenciasByComparacaoId()`
- `trpc.convenios.list` → `db.getConvenios()`
- `trpc.comparacoes.resolverDivergencia` → mutation para resolver divergências
- `trpc.recursos.create` → mutation para criar recurso de glosa

### Tabelas acessadas:
| Tabela | Uso |
|--------|-----|
| `comparacoes` | Lista e detalha comparações entre arquivos enviados/retornados |
| `divergencias` | Lista divergências encontradas em cada comparação |
| `convenios` | Filtro por convênio |
| `arquivos` | Referência aos arquivos comparados |
| `faturamentoTiss` | Dados do envio para comparação |
| `demonstrativo` | Dados do retorno para comparação |

### Status atual:
**0 comparações e 0 divergências** no banco. Esta aba está vazia porque nenhuma comparação entre arquivo enviado e retornado foi executada. Para popular esta aba, é necessário criar comparações na tela de Comparativo (selecionar um arquivo enviado e um retornado do mesmo convênio).

---

## 2. Aba Faturamento (`Faturamento.tsx`)

### Procedures tRPC utilizadas:
- `trpc.faturamento.porConvenio` → `db.getFaturamentoPorConvenio()`
- `trpc.faturamento.porMes` → `db.getFaturamentoPorMes()`
- `trpc.faturamento.resumoGeral` → `db.getResumoGeral()`
- `trpc.convenios.list` → `db.getConvenios()`

### Tabelas acessadas:
| Tabela | Uso |
|--------|-----|
| `faturamentoTiss` | Fonte principal - dados de envio XML TISS (procedimentos faturados) |
| `demonstrativo` | Dados de retorno para calcular valores recebidos/glosados |
| `arquivos` | Filtro por arquivo e referência de competência |
| `convenios` | Filtro por convênio e agrupamento |
| `comparacoes` | Estatísticas de comparações realizadas |

### Status atual:
**61.357 registros** em `faturamento_tiss` e **37.971** em `demonstrativo`. Esta aba deve estar funcional com dados. Os filtros disponíveis são: estabelecimento, mês/ano de referência e código do prestador executante.

---

## 3. Aba Relatório de Contas (`RelatorioContas.tsx`)

### Procedures tRPC utilizadas:
- `trpc.convenios.list` → `db.getConvenios()`
- `trpc.procedimentos.list` → `db.getProcedimentosPaginated()`

### Tabelas acessadas:
| Tabela | Uso |
|--------|-----|
| `faturamentoTiss` | Fonte principal - lista procedimentos faturados com paginação |
| `arquivos` | Join para obter dados do arquivo (convênio, direção, etc.) |
| `convenios` | Filtro por convênio |

### Status atual:
**61.357 registros** disponíveis. Esta aba lista procedimentos individuais com filtros avançados: arquivo, convênio, estabelecimento, busca textual, nome/CRM do médico, código do prestador, status de glosa (pago/glosado/parcial), direção do arquivo e mês/ano de referência. Suporta paginação.

---

## 4. Aba Histórico de Contestações (`HistoricoContestacoes.tsx`)

### Procedures tRPC utilizadas:
- `trpc.recursos.historicoContestacoes` → `db.getHistoricoContestacoes()`
- `trpc.convenios.list` → `db.getConvenios()`

### Tabelas acessadas:
| Tabela | Uso |
|--------|-----|
| `historicoContestacoes` | Fonte principal - histórico de argumentos usados em contestações |
| `convenios` | Filtro por convênio |

### Status atual:
**0 registros** na tabela `historicoContestacoes`. Esta aba está vazia. Os registros são criados quando um recurso de glosa é finalizado/enviado, registrando os argumentos utilizados para cada motivo de glosa. Para popular esta tabela, é necessário criar e finalizar recursos de glosa na aba de Análise de Glosa.

**Nota:** Existem 61 registros em `recursosGlosa`, mas nenhum gerou histórico de contestação. Isso pode indicar que os recursos foram criados mas não finalizados, ou que a funcionalidade de registro automático no histórico não está sendo acionada corretamente.

---

## 5. Aba Faturado Tasy (`FaturadoTasy.tsx`)

### Procedures tRPC utilizadas:
- `trpc.faturadoTasy.estatisticas` → `db.getEstatisticasFaturadoTasy()`
- `trpc.faturadoTasy.competencias` → `db.listarCompetenciasFaturadoTasy()`
- `trpc.faturadoTasy.convenios` → `db.listarConveniosFaturadoTasy()`
- `trpc.faturadoTasy.resumoPorTipo` → `db.getResumoPorTipoFaturadoTasy()`
- `trpc.faturadoTasy.itensGlosados` → `db.getItensGlosadosFaturadoTasy()`
- `trpc.faturadoTasy.dadosBI` → `db.getDadosBIFaturadoTasy()`
- `trpc.faturadoTasy.list` → `db.getFaturadoTasy()` (chamada 2x: todos os itens + itens paginados)
- `trpc.faturadoTasy.importar` → mutation para importar dados
- `trpc.importacaoTasy.criar` → mutation para criar registro de importação

### Tabelas acessadas:
| Tabela | Uso |
|--------|-----|
| `faturadoTasy` | Fonte principal - dados faturados importados do Tasy |
| `importacoesTasy` | Controle de importações realizadas |

### Status atual:
**476.680 registros** na tabela `faturadoTasy`. Esta é a aba com mais dados. Oferece estatísticas, filtros por competência/convênio, resumo por tipo de item (PROC/TAXA vs MAT/MED), itens glosados e dados para relatório BI. Todas as queries filtram por `estabelecimentoId`.

---

## Diagrama de Dependências entre Tabelas

```
Aba Divergentes:
  comparacoes → divergencias
  comparacoes → arquivos (enviado + retornado)
  arquivos → faturamentoTiss (envio)
  arquivos → demonstrativo (retorno)

Aba Faturamento:
  faturamentoTiss ← arquivos ← convenios
  demonstrativo ← arquivos ← convenios

Aba Relatório de Contas:
  faturamentoTiss ← arquivos ← convenios

Aba Histórico de Contestações:
  historicoContestacoes ← convenios

Aba Faturado Tasy:
  faturadoTasy ← importacoesTasy
```
