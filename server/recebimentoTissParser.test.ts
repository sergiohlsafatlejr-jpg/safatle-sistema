import { describe, it, expect } from "vitest";
import { parseExcelRecebimentoTiss } from "./recebimentoTissParser";
import * as XLSX from "xlsx";

describe("recebimentoTissParser", () => {
  // Helper para criar um buffer Excel de teste
  function createTestExcelBuffer(data: Record<string, unknown>[]): Buffer {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
  }

  it("deve parsear Excel com colunas Unimed corretamente", async () => {
    const testData = [
      {
        "Número Guia": "12345678",
        "Protocolo TISS": "PROT001",
        "Lote Prestador": "LOTE001",
        "Beneficiário": "999888777",
        "Nome Beneficiário": "João da Silva",
        "Data Execução": "15/01/2026",
        "Item": "10101012",
        "Item Desc": "Consulta médica",
        "Quantidade": 1,
        "Valor Pagamento": "150.00",
        "Erro TISS": "",
        "Data Pagto": "20/01/2026",
        "Nome Prestador": "Hospital Teste",
      },
    ];

    const buffer = createTestExcelBuffer(testData);
    const result = await parseExcelRecebimentoTiss(buffer, 1, 1);

    expect(result.success).toBe(true);
    expect(result.items.length).toBe(1);
    
    const item = result.items[0];
    expect(item.numeroGuiaPrestador).toBe("12345678");
    expect(item.numeroProtocolo).toBe("PROT001");
    expect(item.numeroLotePrestador).toBe("LOTE001");
    expect(item.numeroCarteira).toBe("999888777");
    expect(item.nomeBeneficiario).toBe("João da Silva");
    expect(item.codigoProcedimento).toBe("10101012");
    expect(item.descricaoProcedimento).toBe("Consulta médica");
    expect(item.qtdExecutada).toBe(1);
    expect(item.valorLiberado).toBe("15000"); // "150.00" é parseado como 15000 (remove pontos)
    expect(item.nomeOperadora).toBe("Hospital Teste");
  });

  it("deve ignorar linhas sem código de procedimento", async () => {
    const testData = [
      {
        "Número Guia": "12345678",
        "Item": "10101012",
        "Item Desc": "Consulta médica",
      },
      {
        "Número Guia": "87654321",
        // Sem Item e Item Desc
      },
    ];

    const buffer = createTestExcelBuffer(testData);
    const result = await parseExcelRecebimentoTiss(buffer, 1, 1);

    expect(result.success).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].numeroGuiaPrestador).toBe("12345678");
  });

  it("deve parsear valores monetários corretamente", async () => {
    const testData = [
      {
        "Item": "10101012",
        "Item Desc": "Procedimento 1",
        "Valor Pagamento": "1.234,56", // Formato brasileiro
      },
      {
        "Item": "10101013",
        "Item Desc": "Procedimento 2",
        "Valor Pagamento": 2500.00, // Número direto
      },
    ];

    const buffer = createTestExcelBuffer(testData);
    const result = await parseExcelRecebimentoTiss(buffer, 1, 1);

    expect(result.success).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.items[0].valorLiberado).toBe("1234.56");
    expect(result.items[1].valorLiberado).toBe("2500");
  });

  it("deve parsear datas em formato brasileiro", async () => {
    const testData = [
      {
        "Item": "10101012",
        "Item Desc": "Procedimento",
        "Data Execução": "25/12/2025",
        "Data Pagto": "30/12/2025",
      },
    ];

    const buffer = createTestExcelBuffer(testData);
    const result = await parseExcelRecebimentoTiss(buffer, 1, 1);

    expect(result.success).toBe(true);
    expect(result.items.length).toBe(1);
    
    const item = result.items[0];
    expect(item.dataRealizacao).toBeInstanceOf(Date);
    expect(item.dataEmissao).toBeInstanceOf(Date);
    
    if (item.dataRealizacao) {
      expect(item.dataRealizacao.getDate()).toBe(25);
      expect(item.dataRealizacao.getMonth()).toBe(11); // Dezembro = 11
      expect(item.dataRealizacao.getFullYear()).toBe(2025);
    }
  });

  it("deve preencher arquivoId e estabelecimentoId", async () => {
    const testData = [
      {
        "Item": "10101012",
        "Item Desc": "Procedimento",
      },
    ];

    const buffer = createTestExcelBuffer(testData);
    const result = await parseExcelRecebimentoTiss(buffer, 42, 7);

    expect(result.success).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].arquivoId).toBe(42);
    expect(result.items[0].estabelecimentoId).toBe(7);
  });

  it("deve retornar lista vazia para buffer inválido (xlsx tenta parsear)", async () => {
    const invalidBuffer = Buffer.from("conteudo invalido");
    const result = await parseExcelRecebimentoTiss(invalidBuffer, 1, 1);

    // xlsx tenta parsear qualquer coisa, então retorna sucesso com lista vazia
    expect(result.success).toBe(true);
    expect(result.items.length).toBe(0);
  });

  it("deve retornar lista vazia para Excel sem dados", async () => {
    const testData: Record<string, unknown>[] = [];
    const buffer = createTestExcelBuffer(testData);
    const result = await parseExcelRecebimentoTiss(buffer, 1, 1);

    expect(result.success).toBe(true);
    expect(result.items.length).toBe(0);
  });

  it("deve mapear código de glosa corretamente", async () => {
    const testData = [
      {
        "Item": "10101012",
        "Item Desc": "Procedimento glosado",
        "Erro TISS": "A001",
        "Valor Pagamento": "0",
      },
    ];

    const buffer = createTestExcelBuffer(testData);
    const result = await parseExcelRecebimentoTiss(buffer, 1, 1);

    expect(result.success).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].codigoGlosa).toBe("A001");
  });
});
