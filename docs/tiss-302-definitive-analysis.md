# Análise Definitiva XSD TISS 3.02.00 - Recurso de Glosa

## Cabecalho (tissV3_02_00.xsd):
```xml
<ans:cabecalho>
  <ans:identificacaoTransacao>
    <ans:tipoTransacao>RECURSO_GLOSA</ans:tipoTransacao>
    <ans:sequencialTransacao>...</ans:sequencialTransacao>  <!-- st_texto12 -->
    <ans:dataRegistroTransacao>...</ans:dataRegistroTransacao>
    <ans:horaRegistroTransacao>...</ans:horaRegistroTransacao>
  </ans:identificacaoTransacao>
  <ans:origem>
    <ans:identificacaoPrestador>
      <!-- choice: CNPJ | CPF | codigoPrestadorNaOperadora -->
      <ans:codigoPrestadorNaOperadora>...</ans:codigoPrestadorNaOperadora>
    </ans:identificacaoPrestador>
  </ans:origem>
  <ans:destino>
    <ans:registroANS>...</ans:registroANS>
  </ans:destino>
  <ans:versaoPadrao>3.02.00</ans:versaoPadrao>  <!-- MUDOU! Era "Padrao" na v3.00 -->
</ans:cabecalho>
```

**PROBLEMA ENCONTRADO**: Nosso código usa `<ans:Padrao>3.02.00</ans:Padrao>` mas o XSD 3.02 usa `<ans:versaoPadrao>3.02.00</ans:versaoPadrao>`!

## ctm_recursoGlosa (tissGuiasV3_02_00.xsd, linha 883):
```
Ordem dos elementos:
1. registroANS (st_registroANS)
2. numeroGuiaRecGlosaPrestador (st_texto20)
3. nomeOperadora (st_texto70)
4. objetoRecurso (dm_objetoRecurso: 1=Protocolo, 2=Guia)
5. numeroGuiaRecGlosaOperadora (st_texto20, opcional)
6. dadosContratado (ct_contratadoDados)
7. numeroLote (st_texto12)
8. numeroProtocolo (st_numerico12)
9. opcaoRecurso:
   - choice: recursoProtocolo | recursoGuia[]
10. valorTotalRecursado (st_decimal10-2)
11. dataRecurso (st_data)
```

## ct_contratadoDados (tissComplexTypesV3_02_00.xsd, linha 147):
```xml
<complexType name="ct_contratadoDados">
  <sequence>
    <choice>
      <element name="codigoPrestadorNaOperadora" type="ans:st_texto14"/>
      <element name="cpfContratado" type="ans:st_CPF"/>
      <element name="cnpjContratado" type="ans:st_CNPJ"/>
    </choice>
    <element name="nomeContratado" type="ans:st_texto70"/>  <!-- OBRIGATÓRIO! -->
  </sequence>
</complexType>
```

## recursoGuia:
```
1. numeroGuiaOrigem (st_texto20)
2. numeroGuiaOperadora (st_texto20, opcional)
3. senha (st_texto20, opcional)
4. opcaoRecursoGuia:
   - choice: recursoGuiaCompleta[] | itensGuia[]
```

## itensGuia (SEM sequencialItem!):
```
1. dataInicio (st_data)
2. dataFim (st_data, opcional)
3. procRecurso (ct_procedimentoDados: codigoTabela + codigoProcedimento + descricaoProcedimento)
4. grauParticipacao (dm_grauPart, opcional)
5. codGlosaItem (dm_tipoGlosa)
6. valorRecursado (st_decimal8-2)
7. justificativaItem (st_texto150)
```

## ERROS NO CÓDIGO ATUAL:

### 1. Cabecalho: `<ans:Padrao>` deveria ser `<ans:versaoPadrao>`
- Código atual: `<ans:Padrao>3.02.00</ans:Padrao>`
- Correto v3.02: `<ans:versaoPadrao>3.02.00</ans:versaoPadrao>`

### 2. dadosContratado: Falta `nomeContratado`
- Código atual: apenas `<ans:codigoPrestadorNaOperadora>`
- Correto: `<ans:codigoPrestadorNaOperadora>` + `<ans:nomeContratado>`

### 3. itensGuia: `sequencialItem` NÃO EXISTE no XSD 3.02
- Código atual: inclui `<ans:sequencialItem>`
- Correto: remover `sequencialItem`, começar com `dataInicio`

### 4. procRecurso: Faltam tags de envolvimento
- Código atual: `<ans:codigoTabela>`, `<ans:codigoProcedimento>`, `<ans:descricaoProcedimento>` (CORRETO)
- Mas estão diretamente dentro de `<ans:procRecurso>` (CORRETO - ct_procedimentoDados)
