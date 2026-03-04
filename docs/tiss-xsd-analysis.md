# Análise XSD TISS 3.00.01 - ct_contratadoDados

## Definição de ct_contratadoDados (tissComplexTypesV3_00_01.xsd, linha 145):
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

## Conclusão:
- `nomeContratado` é **OBRIGATÓRIO** no tipo `ct_contratadoDados`
- Deve vir DEPOIS do choice (codigoPrestadorNaOperadora / cpfContratado / cnpjContratado)
- O código atual NÃO inclui `nomeContratado` no XML gerado

## Estrutura XSD ctm_recursoGlosa (tissGuiasV3_00_01.xsd, linha 863):
```
ctm_recursoGlosa:
  1. registroANS
  2. nomeOperadora
  3. numeroGuiaPrestador (= numeroGuiaRecGlosaPrestador no 3.02)
  4. numeroGuiaOperadora (opcional)
  5. objetoRecurso (1=Protocolo, 2=Guia)
  6. dadosContratado:
     - codigoPrestador (st_texto14)
     - nomePrestador (st_texto70)  ← OBRIGATÓRIO!
  7. numeroLote (st_texto12)
  8. numeroProtocolo (st_numerico12)
  9. opcaoRecurso:
     - choice: recursoProtocolo | recursoGuia[]
       - recursoGuia:
         - numeroGuiaOrigem
         - senha (opcional)
         - opcaoRecursoGuia:
           - choice: recursoGuiaCompleta | itensGuia[]
             - itensGuia:
               1. dataInicio  ← NÃO TEM sequencialItem na v3.00!
               2. dataFim (opcional)
               3. procRecurso (ct_procedimentoDados)
               4. codGlosaItem
               5. valorRecursado
               6. justificativaItem
  10. valorTotalRecursado
  11. dataRecurso
```

## DIFERENÇAS CRÍTICAS ENCONTRADAS:

### 1. dadosContratado - CAMPO DIFERENTE:
- **XSD v3.00**: `codigoPrestador` + `nomePrestador` (tipo inline)
- **Nosso código v3.02**: `codigoPrestadorNaOperadora` (sem nome!)
- **FIX**: Usar `codigoPrestador` e adicionar `nomePrestador`

### 2. itensGuia - SEM sequencialItem na v3.00:
- **XSD v3.00**: dataInicio, dataFim?, procRecurso, codGlosaItem, valorRecursado, justificativaItem
- **Nosso código v3.02**: sequencialItem, dataInicio, procRecurso, codGlosaItem, valorRecursado, justificativaItem
- **FIX**: Verificar se v3.02 tem sequencialItem. Se Factiss usa v3.02, pode ter.

### 3. dadosContratado no XSD v3.00 usa nomes diferentes:
- `codigoPrestador` (não `codigoPrestadorNaOperadora`)
- `nomePrestador` (não `nomeContratado`)

### 4. Cabecalho - versãoPadrão:
- **XSD v3.00**: Usa `<ans:Padrao>` com valor como `3.00.01`
- **Nosso código**: `<ans:Padrao>3.02.00</ans:Padrao>` - OK se Factiss aceita 3.02

## PLANO DE CORREÇÃO:
1. Adicionar `nomePrestador` (ou `nomeContratado` dependendo da versão) ao dadosContratado
2. Buscar o nome do estabelecimento do banco de dados
3. Verificar se `sequencialItem` é válido na v3.02 ou deve ser removido
4. Ajustar nome do campo de código do prestador se necessário
