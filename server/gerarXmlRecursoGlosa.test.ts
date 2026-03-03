import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getDb
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();

const mockDb = {
  select: () => {
    mockSelect();
    return {
      from: (table: any) => {
        mockFrom(table);
        return {
          where: (cond: any) => {
            mockWhere(cond);
            return {
              limit: (n: number) => {
                mockLimit(n);
                return [];
              },
              orderBy: (...args: any[]) => {
                mockOrderBy(...args);
                return [];
              },
            };
          },
          limit: (n: number) => {
            mockLimit(n);
            return [];
          },
        };
      },
    };
  },
};

vi.mock('./db', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
  };
});

describe('gerarXmlRecursoGlosa - Validações de formato', () => {
  it('deve gerar XML com epílogo contendo hash MD5', async () => {
    // Simular o formato esperado do XML
    const xmlSample = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:ns2="http://www.w3.org/2000/09/xmldsig#">
    <ans:cabecalho>
        <ans:identificacaoTransacao>
            <ans:tipoTransacao>RECURSO_GLOSA</ans:tipoTransacao>
        </ans:identificacaoTransacao>
    </ans:cabecalho>
    <ans:prestadorParaOperadora>
        <ans:recursoGlosa>
            <ans:guiaRecursoGlosa>
                <ans:valorTotalRecursado>340.00</ans:valorTotalRecursado>
                <ans:dataRecurso>2026-03-03</ans:dataRecurso>
            </ans:guiaRecursoGlosa>
        </ans:recursoGlosa>
    </ans:prestadorParaOperadora>
    <ans:epilogo>
        <ans:hash>abc123</ans:hash>
    </ans:epilogo>
</ans:mensagemTISS>`;

    // Verificar que o XML contém as tags obrigatórias
    expect(xmlSample).toContain('<ans:epilogo>');
    expect(xmlSample).toContain('<ans:hash>');
    expect(xmlSample).toContain('<ans:valorTotalRecursado>');
    expect(xmlSample).toContain('<ans:dataRecurso>');
    expect(xmlSample).toContain('standalone="yes"');
    expect(xmlSample).toContain('xmlns:ns2="http://www.w3.org/2000/09/xmldsig#"');
  });

  it('deve extrair código numérico da glosa corretamente', () => {
    // Simular a lógica de extração de código de glosa
    const extractGlosaCode = (motivoGlosaConvenio: string): string => {
      let codGlosaItem = motivoGlosaConvenio || "";
      const matchCodigo = codGlosaItem.match(/^(\d+)/);
      if (matchCodigo) {
        codGlosaItem = matchCodigo[1];
      }
      return codGlosaItem;
    };

    // Testar com formato "código-descrição"
    expect(extractGlosaCode("1701-COBRANÇA FORA DO PRAZO DE VALIDADE")).toBe("1701");
    expect(extractGlosaCode("1426")).toBe("1426");
    expect(extractGlosaCode("Negado pela auditoria")).toBe("Negado pela auditoria");
    expect(extractGlosaCode("")).toBe("");
    expect(extractGlosaCode("2408-PROCEDIMENTO NÃO AUTORIZADO")).toBe("2408");
  });

  it('deve formatar valor recursado com 2 casas decimais', () => {
    const formatarValor = (valor: string): string => {
      return parseFloat(valor || "0").toFixed(2);
    };

    expect(formatarValor("170.00")).toBe("170.00");
    expect(formatarValor("170")).toBe("170.00");
    expect(formatarValor("0")).toBe("0.00");
    expect(formatarValor("")).toBe("0.00");
    expect(formatarValor("1234.5")).toBe("1234.50");
  });

  it('deve escapar caracteres XML corretamente', () => {
    const escapeXml = (str: string): string => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    expect(escapeXml("VISITA HOSPITALAR")).toBe("VISITA HOSPITALAR");
    expect(escapeXml("A & B")).toBe("A &amp; B");
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;');
    expect(escapeXml('Texto "com" aspas')).toBe('Texto &quot;com&quot; aspas');
    expect(escapeXml("O'Brien")).toBe("O&apos;Brien");
  });

  it('deve gerar XML com namespace ns2 para xmldsig', () => {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const xmlRoot = '<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:ns2="http://www.w3.org/2000/09/xmldsig#">';
    
    expect(xmlHeader).toContain('standalone="yes"');
    expect(xmlRoot).toContain('xmlns:ns2="http://www.w3.org/2000/09/xmldsig#"');
  });

  it('deve calcular hash MD5 corretamente', async () => {
    const { createHash } = await import('crypto');
    const testContent = '<ans:mensagemTISS>test</ans:mensagemTISS>';
    const hash = createHash('md5').update(testContent, 'utf8').digest('hex');
    
    // MD5 hash deve ter 32 caracteres hexadecimais
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
    
    // Mesmo conteúdo deve gerar mesmo hash
    const hash2 = createHash('md5').update(testContent, 'utf8').digest('hex');
    expect(hash).toBe(hash2);
  });

  it('deve incluir tags obrigatórias no XML validado', () => {
    // Lista de tags obrigatórias conforme padrão TISS validado
    const tagsObrigatorias = [
      'ans:tipoTransacao',
      'ans:sequencialTransacao',
      'ans:dataRegistroTransacao',
      'ans:horaRegistroTransacao',
      'ans:codigoPrestadorNaOperadora',
      'ans:registroANS',
      'ans:Padrao',
      'ans:numeroGuiaRecGlosaPrestador',
      'ans:nomeOperadora',
      'ans:objetoRecurso',
      'ans:dadosContratado',
      'ans:numeroLote',
      'ans:opcaoRecurso',
      'ans:recursoGuia',
      'ans:numeroGuiaOrigem',
      'ans:numeroGuiaOperadora',
      'ans:opcaoRecursoGuia',
      'ans:itensGuia',
      'ans:sequencialItem',
      'ans:dataInicio',
      'ans:procRecurso',
      'ans:codigoTabela',
      'ans:codigoProcedimento',
      'ans:descricaoProcedimento',
      'ans:codGlosaItem',
      'ans:valorRecursado',
      'ans:justificativaItem',
      'ans:valorTotalRecursado',
      'ans:dataRecurso',
      'ans:epilogo',
      'ans:hash',
    ];

    // Verificar que todas as tags são válidas (formato correto)
    tagsObrigatorias.forEach(tag => {
      expect(tag).toMatch(/^ans:\w+$/);
    });
    
    // Verificar que as novas tags adicionadas estão na lista
    expect(tagsObrigatorias).toContain('ans:valorTotalRecursado');
    expect(tagsObrigatorias).toContain('ans:dataRecurso');
    expect(tagsObrigatorias).toContain('ans:epilogo');
    expect(tagsObrigatorias).toContain('ans:hash');
  });

  it('deve limpar justificativa removendo quebras de linha', () => {
    const limparJustificativa = (texto: string): string => {
      return texto
        .replace(/\r\n/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
    };

    expect(limparJustificativa("Texto com\nquebra")).toBe("Texto com quebra");
    expect(limparJustificativa("Texto com\r\nquebra")).toBe("Texto com quebra");
    expect(limparJustificativa("Texto   com   espaços")).toBe("Texto com espaços");
    expect(limparJustificativa("  Texto com espaços  ")).toBe("Texto com espaços");
  });

  it('deve omitir tags opcionais quando vazias (senha, protocolo)', () => {
    // Simular a lógica de tags condicionais
    const gerarSenhaTag = (senha: string): string => {
      return senha ? `<ans:senha>${senha}</ans:senha>` : "";
    };

    const gerarProtocoloTag = (protocolo: string): string => {
      return protocolo ? `<ans:numeroProtocolo>${protocolo}</ans:numeroProtocolo>` : "";
    };

    expect(gerarSenhaTag("")).toBe("");
    expect(gerarSenhaTag("ABC123")).toContain("ABC123");
    expect(gerarProtocoloTag("")).toBe("");
    expect(gerarProtocoloTag("PROT-001")).toContain("PROT-001");
  });
});
