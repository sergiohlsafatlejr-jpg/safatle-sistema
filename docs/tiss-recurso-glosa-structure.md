# Estrutura XML Correta - Recurso de Glosa TISS

## Estrutura do cabecalho (CAPESESP v4.01.00):
```xml
<ans:cabecalho>
  <ans:identificacaoTransacao>
    <ans:tipoTransacao>RECURSO_GLOSA</ans:tipoTransacao>
    <ans:sequencialTransacao>32603</ans:sequencialTransacao>
    <ans:dataRegistroTransacao>2022-06-01</ans:dataRegistroTransacao>
    <ans:horaRegistroTransacao>09:33:20</ans:horaRegistroTransacao>
  </ans:identificacaoTransacao>
  <ans:origem>
    <ans:identificacaoPrestador>
      <ans:CNPJ>00000000000100</ans:CNPJ>
    </ans:identificacaoPrestador>
  </ans:origem>
  <ans:destino>
    <ans:registroANS>324477</ans:registroANS>
  </ans:destino>
  <ans:Padrao>4.01.00</ans:Padrao>
</ans:cabecalho>
```

**IMPORTANTE**: O elemento é `<ans:Padrao>` (não `<ans:padraoTISS>` ou `<ans:versaoTISS>`)

## Estrutura do recursoGlosa:
```xml
<ans:prestadorParaOperadora>
  <ans:recursoGlosa>
    <ans:guiaRecursoGlosa>
      <ans:registroANS>324477</ans:registroANS>
      <ans:numeroGuiaRecGlosaPrestador>1234567</ans:numeroGuiaRecGlosaPrestador>
      <ans:nomeOperadora>NOME DA OPERADORA</ans:nomeOperadora>
      <ans:objetoRecurso>2</ans:objetoRecurso>
      <ans:numeroGuiaRecGlosaOperadora>1234567</ans:numeroGuiaRecGlosaOperadora>
      <ans:dadosContratado>
        <ans:cnpjContratado>00000000000100</ans:cnpjContratado>
        <!-- OBRIGATÓRIO: nomeContratado -->
      </ans:dadosContratado>
      <ans:numeroLote>123456</ans:numeroLote>
      <ans:numeroProtocolo>01026641</ans:numeroProtocolo>
      <ans:opcaoRecurso>
        <ans:recursoGuia>
          <ans:numeroGuiaOrigem>00000001</ans:numeroGuiaOrigem>
          <ans:opcaoRecursoGuia>
            <ans:itensGuia>
              <ans:sequencialItem>0044</ans:sequencialItem>
              <ans:dataInicio>2022-01-19</ans:dataInicio>
              <ans:procRecurso>
                <ans:codigoTabela>19</ans:codigoTabela>
                <ans:codigoProcedimento>78244960</ans:codigoProcedimento>
                <ans:descricaoProcedimento>Lanceta seg. desc.28ga 0,36X1,8mm C/100unid.</ans:descricaoProcedimento>
              </ans:procRecurso>
              <ans:codGlosaItem>1705</ans:codGlosaItem>
              <ans:valorRecursado>5.04</ans:valorRecursado>
              <ans:justificativaItem>SIMPRO 0000164731 LANCETA SF 200UNID. ABOTT.RS 4,500 + 12% 5,04</ans:justificativaItem>
            </ans:itensGuia>
          </ans:opcaoRecursoGuia>
        </ans:recursoGuia>
      </ans:opcaoRecurso>
      <ans:valorTotalRecursado>5.04</ans:valorTotalRecursado>
      <ans:dataRecurso>2022-06-01</ans:dataRecurso>
    </ans:guiaRecursoGlosa>
  </ans:recursoGlosa>
</ans:prestadorParaOperadora>
<ans:epilogo>
  <ans:hash>40024bd02634144c65b92d898361c93a</ans:hash>
</ans:epilogo>
```

## ORDEM dos elementos em itensGuia:
1. sequencialItem
2. dataInicio
3. procRecurso (codigoTabela, codigoProcedimento, descricaoProcedimento)
4. codGlosaItem
5. valorRecursado
6. justificativaItem
