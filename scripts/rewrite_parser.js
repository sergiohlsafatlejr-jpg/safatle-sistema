const fs = require('fs');
let code = fs.readFileSync('server/recebimentoTissParser.ts', 'utf8');
const startIdx = code.indexOf('export async function parseXmlRecebimentoTiss');
if (startIdx === -1) throw new Error('Function not found');

code = code.substring(0, startIdx);

const newCode = `export async function parseXmlRecebimentoTiss(
  content: Buffer,
  arquivoId: number,
  estabelecimentoId: number,
  convenioId?: number,
  dataReferencia?: Date,
  dataPagamento?: Date
): Promise<RecebimentoTissParseResult> {
  try {
    console.log('[RecebimentoTiss XML Parser] Starting parse with xml2js, buffer size: ' + (content.length / 1024).toFixed(1) + ' KB');
    
    // Configurar o parser do xml2js para remover prefixos 'ans:' e 'tiss:'
    const xml2js = require("xml2js");
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      tagNameProcessors: [xml2js.processors.stripPrefix],
      attrNameProcessors: [xml2js.processors.stripPrefix]
    });
    
    const xmlString = content.toString('utf-8');
    const result = await parser.parseStringPromise(xmlString);
    
    const items: Partial<InsertRecebimentoTiss>[] = [];
    
    const mensagemTISS = result.mensagemTISS;
    if (!mensagemTISS) throw new Error("Raiz <mensagemTISS> não encontrada no XML");
    
    const operadoraParaPrestador = mensagemTISS.operadoraParaPrestador;
    if (!operadoraParaPrestador) throw new Error("Elemento <operadoraParaPrestador> não encontrado no XML");
    
    const demonstrativosRetorno = operadoraParaPrestador.demonstrativosRetorno;
    if (!demonstrativosRetorno) throw new Error("Elemento <demonstrativosRetorno> não encontrado");

    const getText = (node: any): string | undefined => {
      if (node === null || node === undefined) return undefined;
      if (typeof node === 'string') return node.trim();
      if (typeof node === 'number') return String(node);
      if (typeof node === 'object') {
        if ('_' in node) return String(node['_']).trim();
      }
      return undefined;
    };

    let demosAnalise = demonstrativosRetorno.demonstrativoAnaliseConta;
    if (demosAnalise) {
      if (!Array.isArray(demosAnalise)) demosAnalise = [demosAnalise];
      
      for (const demo of demosAnalise) {
        const cabecalho = demo.cabecalhoDemonstrativo || {};
        const registroANS = getText(cabecalho.registroANS);
        const numeroDemonstrativo = getText(cabecalho.numeroDemonstrativo);
        const nomeOperadora = getText(cabecalho.nomeOperadora);
        const cnpjOperadora = getText(cabecalho.numeroCNPJ) || getText(cabecalho.CNPJ);
        const dataEmissaoStr = getText(cabecalho.dataEmissao);
        const dataEmissao = dataEmissaoStr ? parseDate(dataEmissaoStr) : null;
        
        const dadosPrestador = demo.dadosPrestador || demo.dadosContratado?.dadosPrestador || {};
        const cnes = getText(dadosPrestador.CNES) || getText(demo.dadosContratado?.CNES);
        const codigoPrestadorOperadora = getText(dadosPrestador.codigoPrestadorNaOperadora);
        const nomeContratado = getText(dadosPrestador.nomeContratado) || getText(demo.dadosContratado?.nomeContratado);

        const dadosPagamentoNode = demo.dadosPagamento || {};
        const dataPagamentoXmlStr = getText(dadosPagamentoNode.dataPagamento);
        const dataPagamentoXml = dataPagamentoXmlStr ? parseDate(dataPagamentoXmlStr) : dataPagamento;
        const formaPagamento = getText(dadosPagamentoNode.formaPagamento);
        const banco = getText(dadosPagamentoNode.banco);
        const agencia = getText(dadosPagamentoNode.agencia);

        const totaisGerais = demo.totaisDemonstrativo || demo.totais || {};
        const valorInformadoGeral = getText(totaisGerais.valorInformadoGeral) || getText(totaisGerais.valorInformadoBruto);
        const valorProcessadoGeral = getText(totaisGerais.valorProcessadoGeral) || getText(totaisGerais.valorProcessadoBruto);
        const valorLiberadoGeral = getText(totaisGerais.valorLiberadoGeral) || getText(totaisGerais.valorLiberadoBruto);
        const valorGlosaGeral = getText(totaisGerais.valorGlosaGeral) || getText(totaisGerais.valorGlosaBruto);
        const valorFinalReceber = getText(totaisGerais.valorFinalReceber);

        const dadosConta = demo.dadosConta || {};
        let protocolos = dadosConta.dadosProtocolo;
        if (protocolos) {
          if (!Array.isArray(protocolos)) protocolos = [protocolos];
          
          for (const protocolo of protocolos) {
            const numeroLotePrestador = getText(protocolo.numeroLotePrestador) || getText(protocolo.numeroLote);
            const numeroProtocolo = getText(protocolo.numeroProtocolo);
            const dataProtocoloStr = getText(protocolo.dataProtocolo);
            const dataProtocolo = dataProtocoloStr ? parseDate(dataProtocoloStr) : null;
            const valorProtocolo = getText(protocolo.valorProtocolo);
            const situacaoProtocolo = getText(protocolo.situacaoProtocolo);
            const valorInformadoProtocolo = getText(protocolo.valorInformadoProtocolo);
            const valorProcessadoProtocolo = getText(protocolo.valorProcessadoProtocolo);
            const valorLiberadoProtocolo = getText(protocolo.valorLiberadoProtocolo);
            const valorGlosaProtocoloTotal = getText(protocolo.valorGlosaProtocoloTotal);
            const valorGlosaProtocolo = getText(protocolo.valorGlosaProtocolo);

            let glosaProtocoloCodigo: string | undefined;
            let glosaProtocoloDescricao: string | undefined;
            const glosaProtNode = protocolo.GlosaProtocolo || protocolo.motivoGlosaProtocolo;
            if (glosaProtNode) {
              const node = Array.isArray(glosaProtNode) ? glosaProtNode[0] : glosaProtNode;
              glosaProtocoloCodigo = getText(node.codigoGlosa) || getText(node.tipoGlosa);
              glosaProtocoloDescricao = getText(node.descricaoGlosa);
            }

            let guias = protocolo.relacaoGuias || protocolo.dadosGuia;
            if (guias) {
              if (!Array.isArray(guias)) guias = [guias];

              for (const guia of guias) {
                const numeroGuiaPrestador = getText(guia.numeroGuiaPrestador);
                const numeroGuiaOperadora = getText(guia.numeroGuiaOperadora);
                const senha = getText(guia.senha);
                const numeroCarteira = getText(guia.numeroCarteira);
                const nomeBeneficiario = getText(guia.nomeBeneficiario);
                const situacaoGuia = getText(guia.situacaoGuia);
                
                const dataInicioFatStr = getText(guia.dataInicioFat);
                const dataInicioFat = dataInicioFatStr ? parseDate(dataInicioFatStr) : null;
                const dataFimFatStr = getText(guia.dataFimFat);
                const dataFimFat = dataFimFatStr ? parseDate(dataFimFatStr) : null;

                const valorInformadoGuia = getText(guia.valorInformadoGuia);
                const valorProcessadoGuia = getText(guia.valorProcessadoGuia);
                const valorLiberadoGuia = getText(guia.valorLiberadoGuia);
                const valorGlosaGuia = getText(guia.valorGlosaGuia);

                let motivoGlosaGuiaCodigo: string | undefined;
                let motivoGlosaGuiaDescricao: string | undefined;
                const glosaGuiaNode = guia.motivoGlosaGuia || guia.relacaoGlosa;
                if (glosaGuiaNode) {
                  const glosaNode = Array.isArray(glosaGuiaNode) ? glosaGuiaNode[0] : glosaGuiaNode;
                  motivoGlosaGuiaCodigo = getText(glosaNode.codigoGlosa) || getText(glosaNode.tipoGlosa);
                  motivoGlosaGuiaDescricao = getText(glosaNode.descricaoGlosa);
                }

                let itensGuia = guia.detalhesGuia || guia.dadosPagamento;
                if (itensGuia) {
                  if (!Array.isArray(itensGuia)) itensGuia = [itensGuia];

                  for (const item of itensGuia) {
                    const sequencialItem = getText(item.sequencialItem);
                    const dataRealizacaoStr = getText(item.dataRealizacao);
                    const dataRealizacao = dataRealizacaoStr ? parseDate(dataRealizacaoStr) : null;
                    
                    const procNode = item.procedimento || item;
                    const codigoTabela = getText(procNode.codigoTabela);
                    const codigoItem = getText(procNode.codigoProcedimento);
                    const descricaoItem = getText(procNode.descricaoProcedimento);
                    
                    const grauParticipacao = getText(item.grauParticipacao);
                    const quantidadeExecutada = getText(item.quantidadeExecutada) || getText(item.qtdExecutada);
                    const valorInformado = getText(item.valorInformado);
                    const valorProcessado = getText(item.valorProcessado);
                    const valorLiberado = getText(item.valorLiberado);

                    let codigoGlosa: string | undefined;
                    let descricaoGlosa: string | undefined;
                    
                    const relacaoGlosa = item.relacaoGlosa || item.glosaItem; 
                    if (relacaoGlosa) {
                      const glosaNode = Array.isArray(relacaoGlosa) ? relacaoGlosa[0] : relacaoGlosa;
                      codigoGlosa = getText(glosaNode.codigoGlosa) || getText(glosaNode.tipoGlosa);
                      descricaoGlosa = getText(glosaNode.descricaoGlosa);
                    }
                    
                    // Se a guia foi toda glosada, herda a glosa da guia E valorLiberado=0 E codigoGlosa nao estiver preenchido
                    if (!codigoGlosa && motivoGlosaGuiaCodigo) {
                      codigoGlosa = motivoGlosaGuiaCodigo;
                      descricaoGlosa = motivoGlosaGuiaDescricao;
                    }

                    items.push({
                      arquivoId,
                      registroANS, numeroDemonstrativo, nomeOperadora, cnpjOperadora, dataEmissao,
                      cnes, codigoPrestadorOperadora, nomeContratado,
                      numeroLotePrestador, numeroProtocolo, dataProtocolo, valorProtocolo, valorGlosaProtocolo,
                      glosaProtocoloCodigo, glosaProtocoloDescricao, situacaoProtocolo,
                      valorInformadoProtocolo, valorProcessadoProtocolo, valorLiberadoProtocolo, valorGlosaProtocoloTotal,
                      numeroGuiaPrestador, numeroGuiaOperadora, senha, numeroCarteira, nomeBeneficiario,
                      dataInicioFat, dataFimFat, situacaoGuia, motivoGlosaGuiaCodigo, motivoGlosaGuiaDescricao,
                      valorInformadoGuia, valorProcessadoGuia, valorLiberadoGuia, valorGlosaGuia,
                      sequencialItem: sequencialItem ? parseInt(sequencialItem) : undefined,
                      dataRealizacao, codigoTabela, codigoItem, descricaoItem, grauParticipacao,
                      quantidadeExecutada, valorInformado, valorProcessado, valorLiberado,
                      codigoGlosa, descricaoGlosa,
                      dataPagamento: dataPagamentoXml, formaPagamento, banco, agencia,
                      valorInformadoGeral, valorProcessadoGeral, valorLiberadoGeral, valorGlosaGeral, valorFinalReceber,
                      origemDado: 'xml', convenioId, dataReferencia, estabelecimentoId,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    let demosPagamento = demonstrativosRetorno.demonstrativoPagamento;
    if (demosPagamento) {
      if (!Array.isArray(demosPagamento)) demosPagamento = [demosPagamento];
      
      for (const demo of demosPagamento) {
        const cabecalho = demo.cabecalhoDemonstrativo || {};
        const registroANS = getText(cabecalho.registroANS);
        const numeroDemonstrativo = getText(cabecalho.numeroDemonstrativo);
        const nomeOperadora = getText(cabecalho.nomeOperadora);
        const cnpjOperadora = getText(cabecalho.numeroCNPJ) || getText(cabecalho.CNPJ);
        const dataEmissaoStr = getText(cabecalho.dataEmissao);
        const dataEmissao = dataEmissaoStr ? parseDate(dataEmissaoStr) : null;
        
        let pagamentos = demo.pagamentos;
        if (pagamentos && pagamentos.pagamentosPorData) {
          let listaPagtos = pagamentos.pagamentosPorData;
          if (!Array.isArray(listaPagtos)) listaPagtos = [listaPagtos];
          
          for (const pagto of listaPagtos) {
            const dadosPagamentoNode = pagto.dadosPagamento || {};
            const dataPagamentoXmlStr = getText(dadosPagamentoNode.dataPagamento);
            const dataPagamentoXml = dataPagamentoXmlStr ? parseDate(dataPagamentoXmlStr) : dataPagamento;
            
            const resumo = pagto.dadosResumo || {};
            let protocolos = resumo.relacaoProtocolos;
            if (protocolos) {
              if (!Array.isArray(protocolos)) protocolos = [protocolos];
              for (const protocolo of protocolos) {
                const numeroProtocolo = getText(protocolo.numeroProtocolo);
                const numeroLote = getText(protocolo.numeroLotePrestador) || getText(protocolo.numeroLote);
                const dataProtocoloStr = getText(protocolo.dataProtocolo);
                const dataProtocolo = dataProtocoloStr ? parseDate(dataProtocoloStr) : null;
                const valorInformadoProtocolo = getText(protocolo.valorInformado);
                const valorProcessadoProtocolo = getText(protocolo.valorProcessado);
                const valorLiberadoProtocolo = getText(protocolo.valorLiberado);
                const valorGlosaProtocoloTotal = getText(protocolo.valorGlosa);

                let guias = protocolo.guiasDoLote;
                if (!guias) {
                    items.push({
                      arquivoId, registroANS, numeroDemonstrativo, nomeOperadora, cnpjOperadora, dataEmissao,
                      numeroLotePrestador: numeroLote, numeroProtocolo, dataProtocolo,
                      valorInformadoProtocolo, valorProcessadoProtocolo, valorLiberadoProtocolo, valorGlosaProtocoloTotal,
                      dataPagamento: dataPagamentoXml, origemDado: 'xml', convenioId, dataReferencia, estabelecimentoId,
                    });
                } else {
                    if (!Array.isArray(guias)) guias = [guias];
                    for (const guia of guias) {
                        const numeroGuiaPrestador = getText(guia.numeroGuiaPrestador);
                        const numeroGuiaOperadora = getText(guia.numeroGuiaOperadora);
                        const tipoPagamento = getText(guia.tipoPagamento);
                        const valorProcessadoGuia = getText(guia.valorProcessadoGuia);
                        const valorLiberadoGuia = getText(guia.valorLiberadoGuia);
                        const valorGlosaGuia = getText(guia.valorGlosaGuia);

                        items.push({
                            arquivoId, registroANS, numeroDemonstrativo, nomeOperadora, cnpjOperadora, dataEmissao,
                            numeroLotePrestador: numeroLote, numeroProtocolo, dataProtocolo,
                            valorInformadoProtocolo, valorProcessadoProtocolo, valorLiberadoProtocolo, valorGlosaProtocoloTotal,
                            numeroGuiaPrestador, numeroGuiaOperadora, valorProcessadoGuia, valorLiberadoGuia, valorGlosaGuia,
                            codigoItem: numeroGuiaOperadora || numeroGuiaPrestador || 'RESUMO', 
                            valorLiberado: valorLiberadoGuia, 
                            dataPagamento: dataPagamentoXml, origemDado: 'xml', convenioId, dataReferencia, estabelecimentoId,
                        });
                    }
                }
              }
            }
          }
        }
      }
    }
    
    console.log('[RecebimentoTiss XML Parser] Parsed ' + items.length + ' items');
    
    return {
      success: true,
      items,
      totalRows: items.length,
    };
  } catch (error) {
    console.error('[RecebimentoTiss XML Parser] Error:', error);
    return {
      success: false,
      items: [],
      totalRows: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
`;

fs.writeFileSync('server/recebimentoTissParser.ts', code + newCode);
console.log('Script replaced success');
