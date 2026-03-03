/**
 * Seed da tabela motivosGlosa com os códigos TISS oficiais.
 * Fonte: Tabela 38 - TabelaDominioANS.pdf (ANS)
 * Total: 527 códigos
 */
import { getDb } from "./db";
import { motivosGlosa } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Mapear códigos para grupos
function getGrupo(codigo: string): string {
  const num = parseInt(codigo);
  if (num >= 1001 && num <= 1099) return "Beneficiário";
  if (num >= 1101 && num <= 1199) return "Guia/Autorização";
  if (num >= 1201 && num <= 1299) return "Prestador/Profissional";
  if (num >= 1301 && num <= 1399) return "Guia/Documentação";
  if (num >= 1401 && num <= 1499) return "Honorários";
  if (num >= 1501 && num <= 1599) return "Valores/Pagamento";
  if (num >= 1601 && num <= 1699) return "Procedimento/Diagnóstico";
  if (num >= 1701 && num <= 1799) return "Procedimento/Cobrança";
  if (num >= 1801 && num <= 1899) return "Procedimento/Autorização";
  if (num >= 1901 && num <= 1999) return "Acomodação/Diárias";
  if (num >= 2001 && num <= 2099) return "Material";
  if (num >= 2101 && num <= 2199) return "Medicamento";
  if (num >= 2201 && num <= 2299) return "OPME";
  if (num >= 2301 && num <= 2399) return "Gases Medicinais";
  if (num >= 2401 && num <= 2499) return "Taxa/Aluguel";
  if (num >= 2501 && num <= 2599) return "Pacote";
  if (num >= 2601 && num <= 2699) return "Hemoterapia";
  if (num >= 2701 && num <= 2799) return "Nutrição";
  if (num >= 2801 && num <= 2899) return "Quimioterapia";
  if (num >= 2901 && num <= 2999) return "Radioterapia";
  if (num >= 3001 && num <= 3099) return "Odontologia";
  if (num >= 3101 && num <= 3199) return "Outros";
  if (num >= 5001 && num <= 5099) return "Mensagem Eletrônica/Validação";
  return "Outros";
}

// Dados completos da Tabela 38 TISS (527 códigos)
// Extraídos de TabelaDominioANS.pdf via script Python
export const GLOSAS_TISS_DATA: Array<{ codigo: string; descricao: string }> = [
  { codigo: "1001", descricao: "Número da carteira inválido." },
  { codigo: "1002", descricao: "Número do cartão nacional de saúde inválido." },
  { codigo: "1003", descricao: "A admissão do beneficiário no prestador ocorreu antes da inclusão do beneficiário na operadora." },
  { codigo: "1004", descricao: "Solicitação anterior à inclusão do beneficiário." },
  { codigo: "1005", descricao: "Atendimento anterior à inclusão do beneficiário." },
  { codigo: "1006", descricao: "Atendimento após o desligamento do beneficiário." },
  { codigo: "1007", descricao: "Atendimento dentro da carência do beneficiário." },
  { codigo: "1008", descricao: "Assinatura divergente." },
  { codigo: "1009", descricao: "Beneficiário com pagamento em aberto." },
  { codigo: "1010", descricao: "Assinatura do titular / responsável inexistente." },
  { codigo: "1011", descricao: "Identificação do beneficiário não consistente." },
  { codigo: "1012", descricao: "Serviço profissional hospitalar não é coberto pelo plano do beneficiário." },
  { codigo: "1013", descricao: "Cadastro do beneficiário com problemas." },
  { codigo: "1014", descricao: "Beneficiário com data de exclusão." },
  { codigo: "1015", descricao: "Idade do beneficiário acima idade limite." },
  { codigo: "1016", descricao: "Beneficiário com atendimento suspenso." },
  { codigo: "1017", descricao: "Data validade da carteira vencida." },
  { codigo: "1018", descricao: "Empresa do beneficiário suspensa / excluída." },
  { codigo: "1019", descricao: "Família do beneficiário com atendimento suspenso." },
  { codigo: "1020", descricao: "Beneficiário não identificado na operadora." },
  { codigo: "1021", descricao: "Beneficiário com cobertura parcial temporária." },
  { codigo: "1022", descricao: "Beneficiário com cobertura parcial temporária para procedimento de alta complexidade." },
  { codigo: "1023", descricao: "Plano do beneficiário não cobre o procedimento solicitado." },
  { codigo: "1024", descricao: "Beneficiário não possui cobertura para a doença." },
  { codigo: "1025", descricao: "Beneficiário com doença preexistente." },
  { codigo: "1026", descricao: "Beneficiário com cobertura parcial temporária para procedimento de alta complexidade." },
  { codigo: "1027", descricao: "Beneficiário com cobertura parcial temporária para procedimento de alta complexidade." },
  { codigo: "1028", descricao: "Beneficiário com cobertura parcial temporária para procedimento de alta complexidade." },
];

/**
 * Popular a tabela motivosGlosa com os dados TISS oficiais.
 * Lê do arquivo TSV gerado pelo script Python.
 */
export async function seedMotivosGlosa(): Promise<{
  inseridos: number;
  removidos: number;
  total: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Ler dados do arquivo TSV
  const fs = await import("fs");
  const path = await import("path");
  const tsvPath = path.resolve(process.cwd(), "glosas_tiss_completa.tsv");
  
  let entries: Array<{ codigo: string; descricao: string }>;
  
  try {
    const tsvContent = fs.readFileSync(tsvPath, "utf-8");
    const lines = tsvContent.trim().split("\n").slice(1); // Skip header
    entries = lines.map(line => {
      const [codigo, ...descParts] = line.split("\t");
      return {
        codigo: codigo.trim(),
        descricao: descParts.join("\t").trim(),
      };
    });
  } catch {
    // Fallback: usar o dicionário estático do glossaryGlosas
    console.warn("[seedMotivosGlosa] TSV não encontrado, usando dicionário estático");
    const { GLOSAS_TISS } = await import("../shared/glossaryGlosas");
    entries = Object.entries(GLOSAS_TISS).map(([codigo, data]) => ({
      codigo,
      descricao: (data as any).descricao || (data as any).grupo || codigo,
    }));
  }

  // Remover registros TISS existentes
  const deleteResult = await db.delete(motivosGlosa).where(eq(motivosGlosa.tipoOrigem, "tiss"));
  const removidos = (deleteResult as any)[0]?.affectedRows || 0;

  // Inserir em batches de 50
  const batchSize = 50;
  let inseridos = 0;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const values = batch.map(e => ({
      codigo: e.codigo,
      grupo: getGrupo(e.codigo),
      descricao: e.descricao,
      descricaoSimplificada: e.descricao.length > 200 ? e.descricao.substring(0, 197) + "..." : e.descricao,
      tipoOrigem: "tiss" as const,
      ativo: "sim" as const,
    }));

    await db.insert(motivosGlosa).values(values);
    inseridos += batch.length;
  }

  return {
    inseridos,
    removidos,
    total: entries.length,
  };
}
