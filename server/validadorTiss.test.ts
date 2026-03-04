import { describe, it, expect } from "vitest";
import { validarXmlRecursoGlosa } from "./validadorTissRecursoGlosa";

// XML válido de exemplo baseado no padrão TISS 4.01.00
const xmlValido = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:ns2="http://www.w3.org/2000/09/xmldsig#">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>RECURSO_GLOSA</ans:tipoTransacao>
      <ans:sequencialTransacao>1</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>2026-03-03</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>12:00:00</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:codigoPrestadorNaOperadora>123456</ans:codigoPrestadorNaOperadora>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>311383</ans:registroANS>
    </ans:destino>
    <ans:versaoPadrao>3.02.00</ans:versaoPadrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:recursoGlosa>
      <ans:guiaRecursoGlosa>
        <ans:registroANS>311383</ans:registroANS>
        <ans:numeroGuiaRecGlosaPrestador>REC-120001</ans:numeroGuiaRecGlosaPrestador>
        <ans:nomeOperadora>VIVACOM SAUDE</ans:nomeOperadora>
        <ans:objetoRecurso>2</ans:objetoRecurso>
        <ans:dadosContratado>
          <ans:codigoPrestadorNaOperadora>123456</ans:codigoPrestadorNaOperadora>
          <ans:nomeContratado>HOSPITAL EXEMPLO LTDA</ans:nomeContratado>
        </ans:dadosContratado>
        <ans:numeroLote>120001</ans:numeroLote>
        <ans:numeroProtocolo>PROT-001</ans:numeroProtocolo>
        <ans:opcaoRecurso>
          <ans:recursoGuia>
            <ans:numeroGuiaOrigem>2585810</ans:numeroGuiaOrigem>
            <ans:opcaoRecursoGuia>
              <ans:itensGuia>
                <ans:dataInicio>2024-12-07</ans:dataInicio>
                <ans:procRecurso>
                  <ans:codigoTabela>22</ans:codigoTabela>
                  <ans:codigoProcedimento>90094719</ans:codigoProcedimento>
                  <ans:descricaoProcedimento>CLORETO SODIO 0.9%</ans:descricaoProcedimento>
                </ans:procRecurso>
                <ans:codGlosaItem>1005</ans:codGlosaItem>
                <ans:valorRecursado>5.58</ans:valorRecursado>
                <ans:justificativaItem>Item cobrado conforme protocolo medico</ans:justificativaItem>
              </ans:itensGuia>
            </ans:opcaoRecursoGuia>
          </ans:recursoGuia>
        </ans:opcaoRecurso>
        <ans:valorTotalRecursado>5.58</ans:valorTotalRecursado>
        <ans:dataRecurso>2026-03-03</ans:dataRecurso>
      </ans:guiaRecursoGlosa>
    </ans:recursoGlosa>
  </ans:prestadorParaOperadora>
  <ans:epilogo>
    <ans:hash>a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6</ans:hash>
  </ans:epilogo>
</ans:mensagemTISS>`;

describe("validarXmlRecursoGlosa", () => {
  it("deve validar um XML válido sem erros", () => {
    const resultado = validarXmlRecursoGlosa(xmlValido);
    expect(resultado.valido).toBe(true);
    expect(resultado.erros).toHaveLength(0);
  });

  it("deve detectar XML malformado", () => {
    const resultado = validarXmlRecursoGlosa("<invalid>xml<broken");
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.tipo === "estrutura")).toBe(true);
  });

  it("deve detectar falta do elemento raiz ans:mensagemTISS", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><root></root>`;
    const resultado = validarXmlRecursoGlosa(xml);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.campo === "ans:mensagemTISS")).toBe(true);
  });

  it("deve detectar falta do cabeçalho", () => {
    const xml = xmlValido.replace(/<ans:cabecalho>[\s\S]*?<\/ans:cabecalho>/, "");
    const resultado = validarXmlRecursoGlosa(xml);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.campo === "ans:cabecalho")).toBe(true);
  });

  it("deve detectar falta do epílogo/hash", () => {
    const xml = xmlValido.replace(/<ans:epilogo>[\s\S]*?<\/ans:epilogo>/, "");
    const resultado = validarXmlRecursoGlosa(xml);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.campo === "ans:epilogo")).toBe(true);
  });

  it("deve detectar hash MD5 inválido", () => {
    const xml = xmlValido.replace(
      "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
      "invalidhash"
    );
    const resultado = validarXmlRecursoGlosa(xml);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.tipo === "hash")).toBe(true);
  });

  it("deve detectar registroANS inválido (não 6 dígitos)", () => {
    const xml = xmlValido.replace(
      /<ans:registroANS>311383<\/ans:registroANS>/g,
      "<ans:registroANS>ABC</ans:registroANS>"
    );
    const resultado = validarXmlRecursoGlosa(xml);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.tipo === "formato" && e.campo.includes("registroANS"))).toBe(true);
  });

  it("deve detectar falta do prestadorParaOperadora", () => {
    const xml = xmlValido.replace(
      /<ans:prestadorParaOperadora>[\s\S]*?<\/ans:prestadorParaOperadora>/,
      ""
    );
    const resultado = validarXmlRecursoGlosa(xml);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.campo === "ans:prestadorParaOperadora")).toBe(true);
  });

  it("deve detectar codGlosaItem não numérico", () => {
    const xml = xmlValido.replace(
      "<ans:codGlosaItem>1005</ans:codGlosaItem>",
      "<ans:codGlosaItem>GUIA VENCIDA</ans:codGlosaItem>"
    );
    const resultado = validarXmlRecursoGlosa(xml);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.campo.includes("codGlosaItem") && e.tipo === "formato")).toBe(true);
  });

  it("deve detectar valorRecursado com formato inválido", () => {
    const xml = xmlValido.replace(
      "<ans:valorRecursado>5.58</ans:valorRecursado>",
      "<ans:valorRecursado>R$ 5,58</ans:valorRecursado>"
    );
    const resultado = validarXmlRecursoGlosa(xml);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.campo.includes("valorRecursado"))).toBe(true);
  });

  it("deve detectar falta de justificativaItem", () => {
    const xml = xmlValido.replace(
      /<ans:justificativaItem>[\s\S]*?<\/ans:justificativaItem>/,
      ""
    );
    const resultado = validarXmlRecursoGlosa(xml);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.campo.includes("justificativaItem"))).toBe(true);
  });

  it("deve detectar tipoTransacao incorreto", () => {
    const xml = xmlValido.replace(
      "RECURSO_GLOSA",
      "ENVIO_LOTE_GUIAS"
    );
    const resultado = validarXmlRecursoGlosa(xml);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.campo === "ans:tipoTransacao")).toBe(true);
  });

  it("deve detectar falta de valorTotalRecursado", () => {
    const xml = xmlValido.replace(
      /<ans:valorTotalRecursado>[\s\S]*?<\/ans:valorTotalRecursado>/,
      ""
    );
    const resultado = validarXmlRecursoGlosa(xml);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.campo.includes("valorTotalRecursado"))).toBe(true);
  });

  it("deve detectar falta de dataRecurso", () => {
    const xml = xmlValido.replace(
      /<ans:dataRecurso>[\s\S]*?<\/ans:dataRecurso>/,
      ""
    );
    const resultado = validarXmlRecursoGlosa(xml);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.campo.includes("dataRecurso"))).toBe(true);
  });

  it("deve avisar sobre encoding não UTF-8", () => {
    const xml = xmlValido.replace('encoding="UTF-8"', 'encoding="ISO-8859-1"');
    const resultado = validarXmlRecursoGlosa(xml);
    expect(resultado.avisos.some(a => a.campo === "header")).toBe(true);
  });

  it("deve detectar objetoRecurso inválido", () => {
    const xml = xmlValido.replace(
      "<ans:objetoRecurso>2</ans:objetoRecurso>",
      "<ans:objetoRecurso>3</ans:objetoRecurso>"
    );
    const resultado = validarXmlRecursoGlosa(xml);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.some(e => e.campo === "ans:objetoRecurso")).toBe(true);
  });
});
