import { describe, expect, it } from "vitest";
import { parseXML } from "./parsers";
import * as fs from "fs";
import * as path from "path";

describe("parseXML - outrasDespesas", () => {
  it("extrai todas as despesas do XML TISS com outrasDespesas (estrutura padrão XSD)", async () => {
    const xmlPath = path.join(__dirname, "../test_files/teste_outras_despesas.xml");
    const content = fs.readFileSync(xmlPath, "utf-8");
    
    const result = await parseXML(content);
    
    expect(result.success).toBe(true);
    expect(result.procedimentos.length).toBeGreaterThan(0);
    
    // Deve ter 1 procedimento executado + 6 outras despesas = 7 total
    expect(result.procedimentos.length).toBe(7);
    
    // Verificar o procedimento executado (colecistectomia)
    const procedimento = result.procedimentos.find(p => p.codigo === "30715016");
    expect(procedimento).toBeDefined();
    expect(procedimento?.descricao).toContain("Colecistectomia");
    expect(procedimento?.valorTotal).toBe(1500.00);
    expect(procedimento?.nomeMedico).toBe("Dr. Roberto Almeida");
    
    // Verificar medicamentos (codigoDespesa = 02)
    const medicamentos = result.procedimentos.filter(p => p.codigoDespesa === "02");
    expect(medicamentos.length).toBe(2);
    
    const dipirona = medicamentos.find(p => p.codigo === "90069860");
    expect(dipirona).toBeDefined();
    expect(dipirona?.descricao).toContain("DIPIRONA");
    expect(dipirona?.quantidade).toBe(3);
    expect(dipirona?.valorUnitario).toBe(5.50);
    expect(dipirona?.valorTotal).toBe(16.50);
    expect(dipirona?.tipoDespesa).toBe("medicamento");
    
    const ondansetrona = medicamentos.find(p => p.codigo === "90070070");
    expect(ondansetrona).toBeDefined();
    expect(ondansetrona?.descricao).toContain("ONDANSETRONA");
    expect(ondansetrona?.tipoDespesa).toBe("medicamento");
    
    // Verificar material (codigoDespesa = 03)
    const materiais = result.procedimentos.filter(p => p.codigoDespesa === "03");
    expect(materiais.length).toBe(1);
    expect(materiais[0]?.codigo).toBe("90150040");
    expect(materiais[0]?.descricao).toContain("EQUIPO");
    expect(materiais[0]?.tipoDespesa).toBe("material");
    
    // Verificar taxa (codigoDespesa = 07)
    const taxas = result.procedimentos.filter(p => p.codigoDespesa === "07");
    expect(taxas.length).toBe(1);
    expect(taxas[0]?.codigo).toBe("90200020");
    expect(taxas[0]?.descricao).toContain("TAXA DE SALA");
    expect(taxas[0]?.valorTotal).toBe(350.00);
    expect(taxas[0]?.tipoDespesa).toBe("taxa");
    
    // Verificar diária (codigoDespesa = 05)
    const diarias = result.procedimentos.filter(p => p.codigoDespesa === "05");
    expect(diarias.length).toBe(1);
    expect(diarias[0]?.codigo).toBe("90100010");
    expect(diarias[0]?.descricao).toContain("DIARIA");
    expect(diarias[0]?.quantidade).toBe(2);
    expect(diarias[0]?.valorTotal).toBe(400.00);
    expect(diarias[0]?.tipoDespesa).toBe("diaria");
    
    // Verificar gás medicinal (codigoDespesa = 01)
    const gases = result.procedimentos.filter(p => p.codigoDespesa === "01");
    expect(gases.length).toBe(1);
    expect(gases[0]?.codigo).toBe("90300010");
    expect(gases[0]?.descricao).toContain("OXIGENIO");
    expect(gases[0]?.tipoDespesa).toBe("gas");
  });

  it("extrai campos de cabeçalho corretamente junto com outrasDespesas", async () => {
    const xmlPath = path.join(__dirname, "../test_files/teste_outras_despesas.xml");
    const content = fs.readFileSync(xmlPath, "utf-8");
    
    const result = await parseXML(content);
    
    expect(result.success).toBe(true);
    
    // Todos os procedimentos devem ter os dados da guia
    for (const proc of result.procedimentos) {
      expect(proc.registroANS).toBe("359017");
      expect(proc.guiaNumero).toBe("GUIA-2025-0001");
      expect(proc.senha).toBe("SENHA123456");
      expect(proc.numeroGuiaOperadora).toBe("OP-2025-5001");
      expect(proc.pacienteCarteirinha).toBe("00112233445566");
      expect(proc.numeroLote).toBe("202506001");
    }
  });

  it("retorna array vazio quando não há outrasDespesas", async () => {
    const xmlSimples = `<?xml version="1.0" encoding="UTF-8"?>
    <ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
      <ans:cabecalho>
        <ans:identificacaoTransacao>
          <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
          <ans:sequencialTransacao>1</ans:sequencialTransacao>
          <ans:dataRegistroTransacao>2025-01-14</ans:dataRegistroTransacao>
        </ans:identificacaoTransacao>
      </ans:cabecalho>
      <ans:prestadorParaOperadora>
        <ans:loteGuias>
          <ans:numeroLote>001</ans:numeroLote>
          <ans:guiasTISS>
            <ans:guiaSP-SADT>
              <ans:cabecalhoGuia>
                <ans:registroANS>123456</ans:registroANS>
                <ans:numeroGuiaPrestador>GUIA-001</ans:numeroGuiaPrestador>
              </ans:cabecalhoGuia>
              <ans:dadosBeneficiario>
                <ans:numeroCarteira>999888777</ans:numeroCarteira>
                <ans:atendimentoRN>N</ans:atendimentoRN>
                <ans:nomeBeneficiario>Teste</ans:nomeBeneficiario>
              </ans:dadosBeneficiario>
              <ans:procedimentosExecutados>
                <ans:procedimentoExecutado>
                  <ans:procedimento>
                    <ans:codigoTabela>22</ans:codigoTabela>
                    <ans:codigoProcedimento>10101012</ans:codigoProcedimento>
                    <ans:descricaoProcedimento>Consulta</ans:descricaoProcedimento>
                  </ans:procedimento>
                  <ans:quantidadeExecutada>1</ans:quantidadeExecutada>
                  <ans:valorUnitario>150.00</ans:valorUnitario>
                  <ans:valorTotal>150.00</ans:valorTotal>
                </ans:procedimentoExecutado>
              </ans:procedimentosExecutados>
              <ans:valorTotal>
                <ans:valorTotalGeral>150.00</ans:valorTotalGeral>
              </ans:valorTotal>
            </ans:guiaSP-SADT>
          </ans:guiasTISS>
        </ans:loteGuias>
      </ans:prestadorParaOperadora>
    </ans:mensagemTISS>`;
    
    const result = await parseXML(xmlSimples);
    
    expect(result.success).toBe(true);
    // Deve ter apenas 1 procedimento, sem outras despesas
    expect(result.procedimentos.length).toBe(1);
    expect(result.procedimentos[0]?.codigo).toBe("10101012");
    expect(result.procedimentos[0]?.codigoDespesa).toBeUndefined();
  });

  it("lida com despesa única (não array) corretamente", async () => {
    const xmlDespesaUnica = `<?xml version="1.0" encoding="UTF-8"?>
    <ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
      <ans:cabecalho>
        <ans:identificacaoTransacao>
          <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
          <ans:sequencialTransacao>1</ans:sequencialTransacao>
          <ans:dataRegistroTransacao>2025-01-14</ans:dataRegistroTransacao>
        </ans:identificacaoTransacao>
      </ans:cabecalho>
      <ans:prestadorParaOperadora>
        <ans:loteGuias>
          <ans:numeroLote>002</ans:numeroLote>
          <ans:guiasTISS>
            <ans:guiaSP-SADT>
              <ans:cabecalhoGuia>
                <ans:registroANS>654321</ans:registroANS>
                <ans:numeroGuiaPrestador>GUIA-002</ans:numeroGuiaPrestador>
              </ans:cabecalhoGuia>
              <ans:dadosBeneficiario>
                <ans:numeroCarteira>111222333</ans:numeroCarteira>
                <ans:atendimentoRN>N</ans:atendimentoRN>
                <ans:nomeBeneficiario>Paciente Teste</ans:nomeBeneficiario>
              </ans:dadosBeneficiario>
              <ans:outrasDespesas>
                <ans:despesa>
                  <ans:codigoDespesa>02</ans:codigoDespesa>
                  <ans:servicosExecutados>
                    <ans:dataExecucao>2025-06-15</ans:dataExecucao>
                    <ans:procedimento>
                      <ans:codigoTabela>20</ans:codigoTabela>
                      <ans:codigoProcedimento>90069860</ans:codigoProcedimento>
                      <ans:descricaoProcedimento>DIPIRONA 500MG</ans:descricaoProcedimento>
                    </ans:procedimento>
                    <ans:quantidadeExecutada>1</ans:quantidadeExecutada>
                    <ans:valorUnitario>5.00</ans:valorUnitario>
                    <ans:valorTotal>5.00</ans:valorTotal>
                  </ans:servicosExecutados>
                </ans:despesa>
              </ans:outrasDespesas>
              <ans:valorTotal>
                <ans:valorTotalGeral>5.00</ans:valorTotalGeral>
              </ans:valorTotal>
            </ans:guiaSP-SADT>
          </ans:guiasTISS>
        </ans:loteGuias>
      </ans:prestadorParaOperadora>
    </ans:mensagemTISS>`;
    
    const result = await parseXML(xmlDespesaUnica);
    
    expect(result.success).toBe(true);
    expect(result.procedimentos.length).toBe(1);
    expect(result.procedimentos[0]?.codigo).toBe("90069860");
    expect(result.procedimentos[0]?.descricao).toContain("DIPIRONA");
    expect(result.procedimentos[0]?.codigoDespesa).toBe("02");
    expect(result.procedimentos[0]?.tipoDespesa).toBe("medicamento");
  });
});
