# Guia Completo: Motor de Regras para Análise de Risco de Glosa

## Visão Geral

O **Motor de Regras** é um sistema inteligente que analisa padrões históricos de recebimento e previne glosas através de análise de risco. Ele funciona em três níveis: análise de padrões, análise de risco de conta individual e identificação de contas com risco em lotes.

---

## 1. Componentes Principais

### 1.1 AnalisadorRiscoGlosa

Classe estática que contém toda a lógica de análise. Localizada em `server/analisadorRiscoGlosa.ts`.

**Métodos Disponíveis:**
- `analisarPadroesRecebimento()` - Analisa padrões históricos
- `analisarRiscoConta()` - Analisa risco de uma conta específica
- `identificarContasComRisco()` - Identifica contas com risco em arquivo importado

### 1.2 motorRegrasRouter

Router tRPC que expõe as funcionalidades do motor. Localizado em `server/routers/motorRegrasRouter.ts`.

**Procedimentos Disponíveis:**
- `analisarPadroesRecebimento` - Query para análise de padrões
- `analisarRiscoConta` - Mutation para análise de risco
- `identificarContasComRisco` - Mutation para identificação em lote
- `listarHistorico` - Query para histórico de validações
- `obterEstatisticas` - Query para estatísticas de conformidade

---

## 2. Análise de Padrões de Recebimento

### 2.1 O Que É

Analisa os últimos 12 meses (configurável) de dados de recebimento para identificar padrões e calcular taxa de glosa por item.

### 2.2 Como Usar no Frontend

```typescript
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export function MeuComponente() {
  const [estabelecimentoId] = useState(1);
  const [convenioId, setConvenioId] = useState<number | null>(null);
  const [mesesHistorico, setMesesHistorico] = useState(12);

  // Query para buscar padrões
  const { data: resultado, isLoading } = trpc.motorRegras.analisarPadroesRecebimento.useQuery(
    {
      estabelecimentoId,
      convenioId: convenioId || undefined,
      mesesHistorico,
    },
    {
      enabled: !!convenioId, // Só executa quando convênio está selecionado
    }
  );

  if (isLoading) return <div>Carregando padrões...</div>;

  return (
    <div>
      <h2>Padrões de Recebimento</h2>
      {resultado?.padroes.map((padrao) => (
        <div key={padrao.codigoItem}>
          <h3>{padrao.descricaoItem}</h3>
          <p>Taxa de Glosa: {padrao.taxaGlosa}%</p>
          <p>Risco: <Badge>{padrao.risco}</Badge></p>
          <p>Motivos Frequentes:</p>
          <ul>
            {padrao.motivosGlosaFrequentes.map((motivo) => (
              <li key={motivo.codigo}>
                {motivo.descricao} ({motivo.frequencia}x)
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

### 2.3 Estrutura de Resposta

```typescript
interface PadraoRecebimento {
  codigoItem: string;              // Código do procedimento/item
  descricaoItem: string;           // Descrição do item
  totalFaturado: number;           // Quantas vezes foi faturado
  totalRecebido: number;           // Quantas vezes foi recebido
  totalGlosado: number;            // Quantas vezes foi glosado
  taxaGlosa: number;               // Percentual de glosa (0-100)
  taxaRecebimento: number;         // Percentual de recebimento (0-100)
  valorMedioFaturado: number;      // Valor médio faturado
  valorMedioRecebido: number;      // Valor médio recebido
  valorMedioGlosado: number;       // Valor médio glosado
  motivosGlosaFrequentes: Array<{
    codigo: string;                // Código TISS da glosa
    descricao: string;             // Descrição da glosa
    frequencia: number;            // Quantas vezes ocorreu
    percentual: number;            // Percentual entre as glosas
  }>;
  risco: "baixo" | "medio" | "alto" | "critico"; // Classificação de risco
}
```

### 2.4 Classificação de Risco

| Risco | Taxa de Glosa | Interpretação |
|-------|---------------|---------------|
| **Baixo** | < 5% | Item seguro, baixa probabilidade de glosa |
| **Médio** | 5-15% | Item com risco moderado, requer atenção |
| **Alto** | 15-30% | Item com alto risco, análise recomendada |
| **Crítico** | > 30% | Item crítico, requer revisão urgente |

---

## 3. Análise de Risco de Conta

### 3.1 O Que É

Analisa uma conta específica (guia) e calcula o risco de glosa baseado em dados históricos do convênio.

### 3.2 Como Usar no Frontend

```typescript
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export function AnalisarRiscoConta() {
  const [estabelecimentoId] = useState(1);
  const [convenioId, setConvenioId] = useState<number>(0);
  const [numeroGuia, setNumeroGuia] = useState("");
  const [itens, setItens] = useState<Array<{
    codigoItem: string;
    descricaoItem: string;
    quantidade: number;
    valorFaturado: number;
  }>>([]);

  // Mutation para analisar risco
  const riscoConta = trpc.motorRegras.analisarRiscoConta.useMutation({
    onSuccess: (data) => {
      console.log("Análise concluída:", data);
      // Exibir resultados
    },
    onError: (error) => {
      console.error("Erro na análise:", error);
    },
  });

  const handleAnalisar = () => {
    riscoConta.mutate({
      estabelecimentoId,
      convenioId,
      numeroGuia,
      itens,
      mesesHistorico: 12,
    });
  };

  return (
    <div>
      <button onClick={handleAnalisar} disabled={riscoConta.isPending}>
        {riscoConta.isPending ? "Analisando..." : "Analisar Risco"}
      </button>

      {riscoConta.data && (
        <div>
          <h3>Resultado da Análise</h3>
          <p>Score de Risco: {riscoConta.data.scoreRisco}/100</p>
          <p>Risco Geral: <Badge>{riscoConta.data.riscoConta}</Badge></p>
          
          <h4>Alertas:</h4>
          <ul>
            {riscoConta.data.motivosAlerta.map((alerta, idx) => (
              <li key={idx}>{alerta}</li>
            ))}
          </ul>

          <h4>Itens Analisados:</h4>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Risco</th>
                <th>Taxa de Glosa Esperada</th>
                <th>Motivos Prováveis</th>
              </tr>
            </thead>
            <tbody>
              {riscoConta.data.itens.map((item) => (
                <tr key={item.codigoItem}>
                  <td>{item.codigoItem}</td>
                  <td>{item.descricaoItem}</td>
                  <td><Badge>{item.riscoPrevisto}</Badge></td>
                  <td>{item.taxaGlosaEsperada}%</td>
                  <td>{item.motivosGlosaProvaveis.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### 3.3 Estrutura de Resposta

```typescript
interface AnaliseRiscoConta {
  numeroGuia: string;              // Número da guia analisada
  convenioId: number;              // ID do convênio
  valorFaturado: number;           // Valor total faturado
  itens: Array<{
    codigoItem: string;            // Código do item
    descricaoItem: string;         // Descrição do item
    quantidade: number;            // Quantidade faturada
    valorFaturado: number;         // Valor faturado
    riscoPrevisto: "baixo" | "medio" | "alto" | "critico";
    taxaGlosaEsperada: number;     // Taxa de glosa esperada (%)
    motivosGlosaProvaveis: string[]; // Motivos de glosa mais prováveis
  }>;
  riscoConta: "baixo" | "medio" | "alto" | "critico"; // Risco geral
  scoreRisco: number;              // Score de risco (0-100)
  motivosAlerta: string[];         // Alertas específicos
}
```

### 3.4 Cálculo de Score

O score de risco é calculado como:

```
scoreRisco = (Σ pontos_por_item / total_itens) × 100

Onde:
- Crítico = 75 pontos
- Alto = 50 pontos
- Médio = 25 pontos
- Baixo = 0 pontos

Classificação Final:
- scoreRisco < 25 → Baixo
- 25 ≤ scoreRisco < 50 → Médio
- 50 ≤ scoreRisco < 75 → Alto
- scoreRisco ≥ 75 → Crítico
```

---

## 4. Identificação de Contas com Risco

### 4.1 O Que É

Analisa todas as contas de um arquivo importado e retorna apenas aquelas com risco acima do limite especificado.

### 4.2 Como Usar no Frontend

```typescript
import { trpc } from "@/lib/trpc";

export function IdentificarContasComRisco() {
  const [estabelecimentoId] = useState(1);
  const [convenioId, setConvenioId] = useState<number>(0);
  const [arquivoId, setArquivoId] = useState<number>(0);
  const [limiteRisco, setLimiteRisco] = useState<"alto_critico" | "critico">("alto_critico");

  const contasComRisco = trpc.motorRegras.identificarContasComRisco.useMutation({
    onSuccess: (data) => {
      console.log(`Encontradas ${data.total} contas com risco`);
    },
  });

  const handleIdentificar = () => {
    contasComRisco.mutate({
      estabelecimentoId,
      convenioId,
      arquivoId,
      limiteRisco,
    });
  };

  return (
    <div>
      <select value={limiteRisco} onChange={(e) => setLimiteRisco(e.target.value as any)}>
        <option value="alto_critico">Alto ou Crítico</option>
        <option value="critico">Apenas Crítico</option>
      </select>

      <button onClick={handleIdentificar}>Identificar Contas com Risco</button>

      {contasComRisco.data && (
        <div>
          <p>Total de contas com risco: {contasComRisco.data.total}</p>
          <table>
            <thead>
              <tr>
                <th>Guia</th>
                <th>Score de Risco</th>
                <th>Risco</th>
                <th>Alertas</th>
              </tr>
            </thead>
            <tbody>
              {contasComRisco.data.contas.map((conta) => (
                <tr key={conta.numeroGuia}>
                  <td>{conta.numeroGuia}</td>
                  <td>{conta.scoreRisco}/100</td>
                  <td><Badge>{conta.riscoConta}</Badge></td>
                  <td>{conta.motivosAlerta.length} alertas</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### 4.3 Filtros Disponíveis

| Filtro | Descrição |
|--------|-----------|
| **alto_critico** | Retorna contas com risco Alto ou Crítico |
| **critico** | Retorna apenas contas com risco Crítico |

---

## 5. Histórico de Validações

### 5.1 Listar Histórico

```typescript
const { data: historico } = trpc.motorRegras.listarHistorico.useQuery({
  estabelecimentoId: 1,
  dataInicio: new Date("2025-01-01"),
  dataFim: new Date("2025-01-31"),
  usuarioId: undefined, // Opcional
  limit: 20,
  offset: 0,
});
```

### 5.2 Obter Estatísticas

```typescript
const { data: stats } = trpc.motorRegras.obterEstatisticas.useQuery({
  estabelecimentoId: 1,
  dataInicio: new Date("2025-01-01"),
  dataFim: new Date("2025-01-31"),
});

// Retorna:
// {
//   totalValidacoes: number,
//   totalContas: number,
//   contasValidas: number,
//   contasInvalidas: number,
//   scoreConformidadeMedia: number,
//   taxaConformidade: number
// }
```

---

## 6. Melhores Práticas

### 6.1 Performance

**1. Use Queries com Filtros Apropriados**
```typescript
// ✅ Bom: Filtra por convênio antes de buscar padrões
const { data } = trpc.motorRegras.analisarPadroesRecebimento.useQuery({
  estabelecimentoId: 1,
  convenioId: 2, // Específico
  mesesHistorico: 12,
});

// ❌ Ruim: Busca todos os padrões sem filtro
const { data } = trpc.motorRegras.analisarPadroesRecebimento.useQuery({
  estabelecimentoId: 1,
  mesesHistorico: 12,
});
```

**2. Implemente Cache**
```typescript
// O tRPC já implementa cache automático
// Mas você pode invalidar manualmente quando necessário:
const utils = trpc.useUtils();

trpc.motorRegras.analisarRiscoConta.useMutation({
  onSuccess: () => {
    utils.motorRegras.listarHistorico.invalidate();
  },
});
```

**3. Use Paginação para Listas Grandes**
```typescript
const [page, setPage] = useState(0);

const { data } = trpc.motorRegras.listarHistorico.useQuery({
  estabelecimentoId: 1,
  limit: 20,
  offset: page * 20,
});
```

### 6.2 Tratamento de Erros

```typescript
const riscoConta = trpc.motorRegras.analisarRiscoConta.useMutation({
  onError: (error) => {
    if (error.data?.code === "UNAUTHORIZED") {
      toast.error("Você não tem permissão para esta ação");
    } else if (error.data?.code === "NOT_FOUND") {
      toast.error("Convênio ou arquivo não encontrado");
    } else {
      toast.error("Erro ao analisar risco: " + error.message);
    }
  },
});
```

### 6.3 Estados de Carregamento

```typescript
const { data, isLoading, isError, error } = trpc.motorRegras.analisarPadroesRecebimento.useQuery(...);

if (isLoading) return <Skeleton />;
if (isError) return <ErrorAlert message={error.message} />;
if (!data) return <EmptyState />;

return <ResultsTable data={data.padroes} />;
```

---

## 7. Casos de Uso Comuns

### 7.1 Dashboard de Monitoramento

```typescript
export function DashboardMotorRegras() {
  const [estabelecimentoId] = useState(1);

  // Estatísticas gerais
  const { data: stats } = trpc.motorRegras.obterEstatisticas.useQuery({
    estabelecimentoId,
  });

  // Histórico recente
  const { data: historico } = trpc.motorRegras.listarHistorico.useQuery({
    estabelecimentoId,
    limit: 10,
    offset: 0,
  });

  return (
    <div>
      <Card>
        <CardHeader>Taxa de Conformidade</CardHeader>
        <CardContent>
          <p>{stats?.taxaConformidade.toFixed(1)}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>Histórico de Validações</CardHeader>
        <CardContent>
          <Table>
            {historico?.map((validacao) => (
              <TableRow key={validacao.id}>
                <TableCell>{validacao.nomeArquivo}</TableCell>
                <TableCell>{validacao.scoreConformidadeMedio}</TableCell>
              </TableRow>
            ))}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 7.2 Análise Antes de Enviar Conta

```typescript
export function ValidarContaAntesDeEnviar({ conta }) {
  const riscoConta = trpc.motorRegras.analisarRiscoConta.useMutation();

  const handleValidar = async () => {
    const resultado = await riscoConta.mutateAsync({
      estabelecimentoId: conta.estabelecimentoId,
      convenioId: conta.convenioId,
      numeroGuia: conta.numeroGuia,
      itens: conta.itens,
    });

    if (resultado.riscoConta === "critico") {
      toast.warning("Conta com risco crítico! Revisar antes de enviar.");
    } else if (resultado.riscoConta === "alto") {
      toast.info("Conta com risco alto. Recomenda-se revisão.");
    } else {
      toast.success("Conta segura para envio!");
    }
  };

  return <Button onClick={handleValidar}>Validar Risco</Button>;
}
```

---

## 8. Troubleshooting

| Problema | Solução |
|----------|---------|
| **Padrões vazios** | Verifique se há dados de recebimento nos últimos 12 meses |
| **Score de risco muito alto** | Pode indicar dados históricos ruins ou convênio com alta taxa de glosa |
| **Análise lenta** | Reduza `mesesHistorico` ou filtre por convênio específico |
| **Erro "Database not available"** | Verifique conexão com banco de dados |

---

## 9. Referências

- **Arquivo Principal:** `server/analisadorRiscoGlosa.ts`
- **Router tRPC:** `server/routers/motorRegrasRouter.ts`
- **Página de Uso:** `client/src/pages/PrevisaoGlosa.tsx`
- **Dicionário de Glosas:** `shared/glossaryGlosas.ts`

