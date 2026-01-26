import { describe, it, expect } from "vitest";
import { parseXML } from "./parsers";

describe("Parser XML - Extração de codigoPrestadorExecutante", () => {
  it("deve extrair codigoPrestadorExecutante do campo dadosExecutante.contratadoExecutante.codigoPrestadorNaOperadora", async () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>123456</ans:sequencialTransacao>
    </ans:identificacaoTransacao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>LOT001</ans:numeroLote>
      <ans:guiasTISS>
        <ans:sequencialTransacao>SEQ001</ans:sequencialTransacao>
        <ans:guiaSP-SADT>
          <ans:cabecalhoGuia>
            <ans:registroANS>123456</ans:registroANS>
            <ans:numeroGuiaPrestador>GUIA001</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>CART001</ans:numeroCarteira>
            <ans:nomeBeneficiario>PACIENTE TESTE</ans:nomeBeneficiario>
          </ans:dadosBeneficiario>
          <ans:dadosExecutante>
            <ans:contratadoExecutante>
              <ans:codigoPrestadorNaOperadora>05562645000131</ans:codigoPrestadorNaOperadora>
            </ans:contratadoExecutante>
          </ans:dadosExecutante>
          <ans:procedimentosExecutados>
            <ans:procedimentoExecutado>
              <ans:procedimento>
                <ans:codigoProcedimento>10101012</ans:codigoProcedimento>
                <ans:descricaoProcedimento>CONSULTA MEDICA</ans:descricaoProcedimento>
              </ans:procedimento>
              <ans:quantidadeExecutada>1</ans:quantidadeExecutada>
              <ans:valorUnitario>150.00</ans:valorUnitario>
              <ans:valorTotal>150.00</ans:valorTotal>
            </ans:procedimentoExecutado>
          </ans:procedimentosExecutados>
        </ans:guiaSP-SADT>
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;

    const result = await parseXML(xmlContent);
    
    expect(result.success).toBe(true);
    expect(result.procedimentos.length).toBeGreaterThan(0);
    expect(result.procedimentos[0].codigoPrestadorExecutante).toBe("05562645000131");
  });

  it("deve extrair múltiplos prestadores executantes de diferentes guias", async () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
    </ans:identificacaoTransacao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>LOT002</ans:numeroLote>
      <ans:guiasTISS>
        <ans:sequencialTransacao>SEQ001</ans:sequencialTransacao>
        <ans:guiaSP-SADT>
          <ans:cabecalhoGuia>
            <ans:numeroGuiaPrestador>GUIA001</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:dadosExecutante>
            <ans:contratadoExecutante>
              <ans:codigoPrestadorNaOperadora>05562645000131</ans:codigoPrestadorNaOperadora>
            </ans:contratadoExecutante>
          </ans:dadosExecutante>
          <ans:procedimentosExecutados>
            <ans:procedimentoExecutado>
              <ans:procedimento>
                <ans:codigoProcedimento>10101012</ans:codigoProcedimento>
              </ans:procedimento>
              <ans:valorTotal>100.00</ans:valorTotal>
            </ans:procedimentoExecutado>
          </ans:procedimentosExecutados>
        </ans:guiaSP-SADT>
      </ans:guiasTISS>
      <ans:guiasTISS>
        <ans:sequencialTransacao>SEQ002</ans:sequencialTransacao>
        <ans:guiaSP-SADT>
          <ans:cabecalhoGuia>
            <ans:numeroGuiaPrestador>GUIA002</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:dadosExecutante>
            <ans:contratadoExecutante>
              <ans:codigoPrestadorNaOperadora>01570589000126</ans:codigoPrestadorNaOperadora>
            </ans:contratadoExecutante>
          </ans:dadosExecutante>
          <ans:procedimentosExecutados>
            <ans:procedimentoExecutado>
              <ans:procedimento>
                <ans:codigoProcedimento>10101013</ans:codigoProcedimento>
              </ans:procedimento>
              <ans:valorTotal>200.00</ans:valorTotal>
            </ans:procedimentoExecutado>
          </ans:procedimentosExecutados>
        </ans:guiaSP-SADT>
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;

    const result = await parseXML(xmlContent);
    
    expect(result.success).toBe(true);
    expect(result.procedimentos.length).toBe(2);
    
    // Verificar que cada procedimento tem o prestador correto
    const prestadores = result.procedimentos.map(p => p.codigoPrestadorExecutante);
    expect(prestadores).toContain("05562645000131");
    expect(prestadores).toContain("01570589000126");
  });

  it("deve retornar undefined quando não há codigoPrestadorExecutante", async () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
    </ans:identificacaoTransacao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>LOT003</ans:numeroLote>
      <ans:guiasTISS>
        <ans:sequencialTransacao>SEQ001</ans:sequencialTransacao>
        <ans:guiaSP-SADT>
          <ans:cabecalhoGuia>
            <ans:numeroGuiaPrestador>GUIA001</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:procedimentosExecutados>
            <ans:procedimentoExecutado>
              <ans:procedimento>
                <ans:codigoProcedimento>10101012</ans:codigoProcedimento>
              </ans:procedimento>
              <ans:valorTotal>100.00</ans:valorTotal>
            </ans:procedimentoExecutado>
          </ans:procedimentosExecutados>
        </ans:guiaSP-SADT>
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;

    const result = await parseXML(xmlContent);
    
    expect(result.success).toBe(true);
    expect(result.procedimentos.length).toBeGreaterThan(0);
    expect(result.procedimentos[0].codigoPrestadorExecutante).toBeUndefined();
  });
});
