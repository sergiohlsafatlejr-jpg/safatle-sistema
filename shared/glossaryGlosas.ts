/**
 * Dicionário de Códigos de Glosa TISS (Tabela 38 - ANS)
 * Fonte: Padrão TISS - Agência Nacional de Saúde Suplementar
 * 
 * Este arquivo contém os códigos de glosa padronizados pela ANS
 * para uso no padrão TISS de troca de informações de saúde suplementar.
 */

export interface GlosaInfo {
  codigo: string;
  grupo: string;
  descricao: string;
  descricaoSimplificada: string;
}

/**
 * Mapeamento de códigos de glosa para descrições
 * Chave: código da glosa (string)
 * Valor: informações da glosa
 */
export const GLOSAS_TISS: Record<string, GlosaInfo> = {
  // ============================================
  // ELEGIBILIDADE (1001-1099)
  // ============================================
  "1001": {
    codigo: "1001",
    grupo: "Elegibilidade",
    descricao: "Número da carteira inválido",
    descricaoSimplificada: "Carteirinha inválida"
  },
  "1003": {
    codigo: "1003",
    grupo: "Elegibilidade",
    descricao: "A admissão do Beneficiário no prestador ocorreu antes da inclusão do Beneficiário na Operadora",
    descricaoSimplificada: "Atendimento antes da inclusão no plano"
  },
  "1005": {
    codigo: "1005",
    grupo: "Elegibilidade",
    descricao: "Atendimento anterior à inclusão do Beneficiário",
    descricaoSimplificada: "Atendimento antes da inclusão no plano"
  },
  "1006": {
    codigo: "1006",
    grupo: "Elegibilidade",
    descricao: "Atendimento após o desligamento do Beneficiário",
    descricaoSimplificada: "Beneficiário desligado do plano"
  },
  "1007": {
    codigo: "1007",
    grupo: "Elegibilidade",
    descricao: "Atendimento dentro da carência do Beneficiário",
    descricaoSimplificada: "Período de carência"
  },
  "1008": {
    codigo: "1008",
    grupo: "Elegibilidade",
    descricao: "Assinatura divergente",
    descricaoSimplificada: "Assinatura não confere"
  },
  "1009": {
    codigo: "1009",
    grupo: "Elegibilidade",
    descricao: "Beneficiário com pagamento em aberto",
    descricaoSimplificada: "Inadimplência do beneficiário"
  },
  "1010": {
    codigo: "1010",
    grupo: "Elegibilidade",
    descricao: "Assinatura do Titular / Responsável inexistente",
    descricaoSimplificada: "Falta assinatura do responsável"
  },
  "1011": {
    codigo: "1011",
    grupo: "Elegibilidade",
    descricao: "Identificação do beneficiário não consistente",
    descricaoSimplificada: "Dados do beneficiário inconsistentes"
  },
  "1012": {
    codigo: "1012",
    grupo: "Elegibilidade",
    descricao: "Serviço Profissional Hospitalar não é coberto pelo plano do beneficiário",
    descricaoSimplificada: "Serviço não coberto pelo plano"
  },
  "1013": {
    codigo: "1013",
    grupo: "Elegibilidade",
    descricao: "Cadastro do beneficiário com problemas",
    descricaoSimplificada: "Cadastro com problemas"
  },
  "1014": {
    codigo: "1014",
    grupo: "Elegibilidade",
    descricao: "Beneficiário com data de exclusão",
    descricaoSimplificada: "Beneficiário excluído"
  },
  "1015": {
    codigo: "1015",
    grupo: "Elegibilidade",
    descricao: "Idade do Beneficiário acima idade limite",
    descricaoSimplificada: "Idade acima do limite"
  },
  "1016": {
    codigo: "1016",
    grupo: "Elegibilidade",
    descricao: "Beneficiário com atendimento suspenso",
    descricaoSimplificada: "Atendimento suspenso"
  },
  "1017": {
    codigo: "1017",
    grupo: "Elegibilidade",
    descricao: "Data Validade Vencida",
    descricaoSimplificada: "Carteirinha vencida"
  },
  "1023": {
    codigo: "1023",
    grupo: "Elegibilidade",
    descricao: "Nome do titular inválido",
    descricaoSimplificada: "Nome do titular inválido"
  },
  "1099": {
    codigo: "1099",
    grupo: "Elegibilidade",
    descricao: "Outros motivos de elegibilidade",
    descricaoSimplificada: "Outros (elegibilidade)"
  },

  // ============================================
  // PROTOCOLO (1102-1199)
  // ============================================
  "1102": {
    codigo: "1102",
    grupo: "Protocolo",
    descricao: "Protocolo é de re-apresentação",
    descricaoSimplificada: "Reapresentação de protocolo"
  },
  "1199": {
    codigo: "1199",
    grupo: "Protocolo",
    descricao: "Outros motivos de protocolo",
    descricaoSimplificada: "Outros (protocolo)"
  },

  // ============================================
  // PRESTADOR (1201-1299)
  // ============================================
  "1201": {
    codigo: "1201",
    grupo: "Prestador",
    descricao: "Atendimento fora da vigência do contrato com o credenciado",
    descricaoSimplificada: "Fora da vigência do contrato"
  },
  "1202": {
    codigo: "1202",
    grupo: "Prestador",
    descricao: "Número do CNES inválido",
    descricaoSimplificada: "CNES inválido"
  },
  "1203": {
    codigo: "1203",
    grupo: "Prestador",
    descricao: "Código Prestador inválido",
    descricaoSimplificada: "Código do prestador inválido"
  },
  "1204": {
    codigo: "1204",
    grupo: "Prestador",
    descricao: "Admissão anterior à inclusão do credenciado na rede",
    descricaoSimplificada: "Prestador não credenciado na data"
  },
  "1205": {
    codigo: "1205",
    grupo: "Prestador",
    descricao: "Admissão após o desligamento do credenciado da rede",
    descricaoSimplificada: "Prestador descredenciado"
  },
  "1206": {
    codigo: "1206",
    grupo: "Prestador",
    descricao: "CPF / CNPJ inválido",
    descricaoSimplificada: "CPF/CNPJ inválido"
  },
  "1207": {
    codigo: "1207",
    grupo: "Prestador",
    descricao: "Credenciado não pertence à Rede Credenciada",
    descricaoSimplificada: "Prestador não credenciado"
  },
  "1208": {
    codigo: "1208",
    grupo: "Prestador",
    descricao: "Solicitação anterior à inclusão do Credenciado",
    descricaoSimplificada: "Solicitação antes do credenciamento"
  },
  "1209": {
    codigo: "1209",
    grupo: "Prestador",
    descricao: "Solicitação após o desligamento do Credenciado",
    descricaoSimplificada: "Solicitação após descredenciamento"
  },
  "1210": {
    codigo: "1210",
    grupo: "Prestador",
    descricao: "Solicitante Credenciado não cadastrado",
    descricaoSimplificada: "Solicitante não cadastrado"
  },
  "1211": {
    codigo: "1211",
    grupo: "Prestador",
    descricao: "Assinatura / Carimbo do Credenciado inexistente",
    descricaoSimplificada: "Falta assinatura/carimbo"
  },
  "1212": {
    codigo: "1212",
    grupo: "Prestador",
    descricao: "Atendimento / Referência fora da vigência do contrato",
    descricaoSimplificada: "Fora da vigência do contrato"
  },
  "1213": {
    codigo: "1213",
    grupo: "Prestador",
    descricao: "CBO-S (especialidade) inválido",
    descricaoSimplificada: "Especialidade inválida"
  },
  "1214": {
    codigo: "1214",
    grupo: "Prestador",
    descricao: "Credenciado não habilitado a realizar o procedimento",
    descricaoSimplificada: "Prestador não habilitado"
  },
  "1216": {
    codigo: "1216",
    grupo: "Prestador",
    descricao: "Especialidade não cadastrada",
    descricaoSimplificada: "Especialidade não cadastrada"
  },
  "1217": {
    codigo: "1217",
    grupo: "Prestador",
    descricao: "Especialidade não cadastrada para o prestador",
    descricaoSimplificada: "Especialidade não cadastrada"
  },
  "1299": {
    codigo: "1299",
    grupo: "Prestador",
    descricao: "Outros motivos de prestador",
    descricaoSimplificada: "Outros (prestador)"
  },

  // ============================================
  // GUIA (1301-1399)
  // ============================================
  "1301": {
    codigo: "1301",
    grupo: "Guia",
    descricao: "Tipo guia inválido",
    descricaoSimplificada: "Tipo de guia inválido"
  },
  "1302": {
    codigo: "1302",
    grupo: "Guia",
    descricao: "Código tipo Guia Principal e Número Guias Incompatíveis",
    descricaoSimplificada: "Guias incompatíveis"
  },
  "1303": {
    codigo: "1303",
    grupo: "Guia",
    descricao: "Não existe o Número Guia Principal informado",
    descricaoSimplificada: "Guia principal não encontrada"
  },
  "1304": {
    codigo: "1304",
    grupo: "Guia",
    descricao: "Cobrança em guia indevida",
    descricaoSimplificada: "Cobrança indevida na guia"
  },
  "1305": {
    codigo: "1305",
    grupo: "Guia",
    descricao: "Item pago em outra Guia",
    descricaoSimplificada: "Item já pago em outra guia"
  },
  "1306": {
    codigo: "1306",
    grupo: "Guia",
    descricao: "Não existe Número Guia Principal e/ou Código Guia Principal",
    descricaoSimplificada: "Guia principal não informada"
  },
  "1307": {
    codigo: "1307",
    grupo: "Guia",
    descricao: "Número da guia inválido",
    descricaoSimplificada: "Número da guia inválido"
  },
  "1308": {
    codigo: "1308",
    grupo: "Guia",
    descricao: "Guia já apresentada",
    descricaoSimplificada: "Guia duplicada"
  },
  "1309": {
    codigo: "1309",
    grupo: "Guia",
    descricao: "Procedimento contratado não está de acordo com o tipo de guia utilizado",
    descricaoSimplificada: "Tipo de guia incorreto"
  },
  "1310": {
    codigo: "1310",
    grupo: "Guia",
    descricao: "Serviço do tipo cirúrgico e invasivo. Equipe médica não informada na guia",
    descricaoSimplificada: "Equipe médica não informada"
  },
  "1311": {
    codigo: "1311",
    grupo: "Guia",
    descricao: "Prestador executante não informado",
    descricaoSimplificada: "Executante não informado"
  },
  "1312": {
    codigo: "1312",
    grupo: "Guia",
    descricao: "Prestador contratado não informado",
    descricaoSimplificada: "Contratado não informado"
  },
  "1313": {
    codigo: "1313",
    grupo: "Guia",
    descricao: "Guia com rasura",
    descricaoSimplificada: "Guia rasurada"
  },
  "1314": {
    codigo: "1314",
    grupo: "Guia",
    descricao: "Guia sem assinatura e/ou carimbo do credenciado",
    descricaoSimplificada: "Falta assinatura na guia"
  },
  "1315": {
    codigo: "1315",
    grupo: "Guia",
    descricao: "Guia sem data do ato cirúrgico",
    descricaoSimplificada: "Falta data da cirurgia"
  },
  "1316": {
    codigo: "1316",
    grupo: "Guia",
    descricao: "Guia com local de atendimento preenchido incorretamente",
    descricaoSimplificada: "Local de atendimento incorreto"
  },
  "1317": {
    codigo: "1317",
    grupo: "Guia",
    descricao: "Guia sem data do atendimento",
    descricaoSimplificada: "Falta data do atendimento"
  },
  "1318": {
    codigo: "1318",
    grupo: "Guia",
    descricao: "Guia com código de serviço preenchido incorretamente",
    descricaoSimplificada: "Código de serviço incorreto"
  },
  "1319": {
    codigo: "1319",
    grupo: "Guia",
    descricao: "Guia sem assinatura do assistido",
    descricaoSimplificada: "Falta assinatura do paciente"
  },
  "1320": {
    codigo: "1320",
    grupo: "Guia",
    descricao: "Identificação do assistido incompleta",
    descricaoSimplificada: "Identificação incompleta"
  },
  "1321": {
    codigo: "1321",
    grupo: "Guia",
    descricao: "Validade da guia expirada",
    descricaoSimplificada: "Guia vencida"
  },
  "1399": {
    codigo: "1399",
    grupo: "Guia",
    descricao: "Outros motivos de guia",
    descricaoSimplificada: "Outros (guia)"
  },

  // ============================================
  // AUTORIZAÇÃO/SOLICITAÇÃO (1401-1499)
  // ============================================
  "1402": {
    codigo: "1402",
    grupo: "Autorização",
    descricao: "Procedimento não autorizado",
    descricaoSimplificada: "Procedimento não autorizado"
  },
  "1403": {
    codigo: "1403",
    grupo: "Autorização",
    descricao: "Não existe informação sobre a senha de autorização do procedimento",
    descricaoSimplificada: "Senha de autorização não informada"
  },
  "1404": {
    codigo: "1404",
    grupo: "Autorização",
    descricao: "Não existe guia de autorização relacionada",
    descricaoSimplificada: "Guia de autorização não encontrada"
  },
  "1406": {
    codigo: "1406",
    grupo: "Autorização",
    descricao: "Número da Senha informado diferente do liberado",
    descricaoSimplificada: "Senha divergente"
  },
  "1407": {
    codigo: "1407",
    grupo: "Autorização",
    descricao: "Serviço solicitado não possui cobertura",
    descricaoSimplificada: "Serviço sem cobertura"
  },
  "1408": {
    codigo: "1408",
    grupo: "Autorização",
    descricao: "Quantidade Serviço solicitada acima da Autorizada",
    descricaoSimplificada: "Quantidade acima do autorizado"
  },
  "1409": {
    codigo: "1409",
    grupo: "Autorização",
    descricao: "Quantidade Serviço solicitada acima coberta",
    descricaoSimplificada: "Quantidade acima da cobertura"
  },
  "1410": {
    codigo: "1410",
    grupo: "Autorização",
    descricao: "Serviço solicitado em Carência",
    descricaoSimplificada: "Serviço em carência"
  },
  "1411": {
    codigo: "1411",
    grupo: "Autorização",
    descricao: "Solicitante não Informado",
    descricaoSimplificada: "Solicitante não informado"
  },
  "1415": {
    codigo: "1415",
    grupo: "Autorização",
    descricao: "Procedimento não autorizado para o Beneficiário",
    descricaoSimplificada: "Procedimento não autorizado"
  },
  "1416": {
    codigo: "1416",
    grupo: "Autorização",
    descricao: "Solicitante não Cadastrado",
    descricaoSimplificada: "Solicitante não cadastrado"
  },
  "1417": {
    codigo: "1417",
    grupo: "Autorização",
    descricao: "Solicitante não habilitado",
    descricaoSimplificada: "Solicitante não habilitado"
  },
  "1418": {
    codigo: "1418",
    grupo: "Autorização",
    descricao: "Solicitante suspenso",
    descricaoSimplificada: "Solicitante suspenso"
  },
  "1419": {
    codigo: "1419",
    grupo: "Autorização",
    descricao: "Serviço solicitado já autorizado",
    descricaoSimplificada: "Serviço já autorizado"
  },
  "1420": {
    codigo: "1420",
    grupo: "Autorização",
    descricao: "Serviço solicitado fora da cobertura",
    descricaoSimplificada: "Serviço fora da cobertura"
  },
  "1421": {
    codigo: "1421",
    grupo: "Autorização",
    descricao: "Serviço solicitado é de pré-existência",
    descricaoSimplificada: "Doença pré-existente"
  },
  "1422": {
    codigo: "1422",
    grupo: "Autorização",
    descricao: "Especialidade não cadastrada para o Solicitante",
    descricaoSimplificada: "Especialidade não cadastrada"
  },
  "1423": {
    codigo: "1423",
    grupo: "Autorização",
    descricao: "Quantidade solicitada acima da quantidade permitida",
    descricaoSimplificada: "Quantidade acima do permitido"
  },
  "1424": {
    codigo: "1424",
    grupo: "Autorização",
    descricao: "Quantidade autorizada acima da quantidade permitida",
    descricaoSimplificada: "Quantidade autorizada excedida"
  },
  "1425": {
    codigo: "1425",
    grupo: "Autorização",
    descricao: "Necessita pré-autorização da empresa",
    descricaoSimplificada: "Requer pré-autorização"
  },
  "1426": {
    codigo: "1426",
    grupo: "Autorização",
    descricao: "Não autorizada pela auditoria médica",
    descricaoSimplificada: "Negado pela auditoria"
  },
  "1427": {
    codigo: "1427",
    grupo: "Autorização",
    descricao: "Necessidade da auditoria médica",
    descricaoSimplificada: "Requer auditoria médica"
  },
  "1428": {
    codigo: "1428",
    grupo: "Autorização",
    descricao: "Falta de autorização da empresa de conectividade",
    descricaoSimplificada: "Falta autorização"
  },
  "1429": {
    codigo: "1429",
    grupo: "Autorização",
    descricao: "CBO-S (especialidade) não autorizado a realizar o serviço",
    descricaoSimplificada: "Especialidade não autorizada"
  },
  "1499": {
    codigo: "1499",
    grupo: "Autorização",
    descricao: "Outros motivos de autorização",
    descricaoSimplificada: "Outros (autorização)"
  },

  // ============================================
  // DIAGNÓSTICO (1502-1599)
  // ============================================
  "1502": {
    codigo: "1502",
    grupo: "Diagnóstico",
    descricao: "Tipo de doença inválido",
    descricaoSimplificada: "Tipo de doença inválido"
  },
  "1504": {
    codigo: "1504",
    grupo: "Diagnóstico",
    descricao: "Caráter de Internação Inválido",
    descricaoSimplificada: "Caráter de internação inválido"
  },
  "1505": {
    codigo: "1505",
    grupo: "Diagnóstico",
    descricao: "Regime de internação inválido",
    descricaoSimplificada: "Regime de internação inválido"
  },
  "1506": {
    codigo: "1506",
    grupo: "Diagnóstico",
    descricao: "Tipo de Internação inválido",
    descricaoSimplificada: "Tipo de internação inválido"
  },
  "1507": {
    codigo: "1507",
    grupo: "Diagnóstico",
    descricao: "Urgência não aplicável",
    descricaoSimplificada: "Urgência não aplicável"
  },
  "1508": {
    codigo: "1508",
    grupo: "Diagnóstico",
    descricao: "Código CID não Informado",
    descricaoSimplificada: "CID não informado"
  },
  "1509": {
    codigo: "1509",
    grupo: "Diagnóstico",
    descricao: "Código CID inválido",
    descricaoSimplificada: "CID inválido"
  },
  "1599": {
    codigo: "1599",
    grupo: "Diagnóstico",
    descricao: "Outros motivos de diagnóstico",
    descricaoSimplificada: "Outros (diagnóstico)"
  },

  // ============================================
  // ATENDIMENTO (1601-1699)
  // ============================================
  "1601": {
    codigo: "1601",
    grupo: "Atendimento",
    descricao: "Reincidência no atendimento",
    descricaoSimplificada: "Atendimento duplicado"
  },
  "1602": {
    codigo: "1602",
    grupo: "Atendimento",
    descricao: "Tipo de atendimento inválido ou não informado",
    descricaoSimplificada: "Tipo de atendimento inválido"
  },
  "1603": {
    codigo: "1603",
    grupo: "Atendimento",
    descricao: "Tipo de consulta inválido",
    descricaoSimplificada: "Tipo de consulta inválido"
  },
  "1604": {
    codigo: "1604",
    grupo: "Atendimento",
    descricao: "Tipo de saída inválido",
    descricaoSimplificada: "Tipo de saída inválido"
  },
  "1605": {
    codigo: "1605",
    grupo: "Atendimento",
    descricao: "Intervenção anterior a Admissão",
    descricaoSimplificada: "Intervenção antes da admissão"
  },
  "1606": {
    codigo: "1606",
    grupo: "Atendimento",
    descricao: "Final da Intervenção anterior ao Início da Intervenção",
    descricaoSimplificada: "Datas inconsistentes"
  },
  "1607": {
    codigo: "1607",
    grupo: "Atendimento",
    descricao: "Alta Hospitalar anterior ao Final da Intervenção",
    descricaoSimplificada: "Alta antes do fim do procedimento"
  },
  "1608": {
    codigo: "1608",
    grupo: "Atendimento",
    descricao: "Alta anterior à data de Internação",
    descricaoSimplificada: "Alta antes da internação"
  },
  "1609": {
    codigo: "1609",
    grupo: "Atendimento",
    descricao: "Motivo Saída Inválido",
    descricaoSimplificada: "Motivo de saída inválido"
  },
  "1610": {
    codigo: "1610",
    grupo: "Atendimento",
    descricao: "Óbito Mulher Inválido",
    descricaoSimplificada: "Óbito mulher inválido"
  },
  "1611": {
    codigo: "1611",
    grupo: "Atendimento",
    descricao: "Intervenção anterior a Internação",
    descricaoSimplificada: "Intervenção antes da internação"
  },
  "1612": {
    codigo: "1612",
    grupo: "Atendimento",
    descricao: "Serviço não pode ser realizado no local especificado",
    descricaoSimplificada: "Local de atendimento inadequado"
  },
  "1613": {
    codigo: "1613",
    grupo: "Atendimento",
    descricao: "Consulta não autorizada",
    descricaoSimplificada: "Consulta não autorizada"
  },
  "1614": {
    codigo: "1614",
    grupo: "Atendimento",
    descricao: "Serviço ambulatorial não autorizado",
    descricaoSimplificada: "Serviço ambulatorial não autorizado"
  },
  "1615": {
    codigo: "1615",
    grupo: "Atendimento",
    descricao: "Internação não autorizada",
    descricaoSimplificada: "Internação não autorizada"
  },
  "1699": {
    codigo: "1699",
    grupo: "Atendimento",
    descricao: "Outros motivos de atendimento",
    descricaoSimplificada: "Outros (atendimento)"
  },

  // ============================================
  // REGRA DE VALORIZAÇÃO (1701-1799)
  // ============================================
  "1701": {
    codigo: "1701",
    grupo: "Valorização",
    descricao: "Cobrança fora do prazo de validade",
    descricaoSimplificada: "Cobrança fora do prazo"
  },
  "1702": {
    codigo: "1702",
    grupo: "Valorização",
    descricao: "Cobrança de procedimento em duplicidade",
    descricaoSimplificada: "Cobrança duplicada"
  },
  "1703": {
    codigo: "1703",
    grupo: "Valorização",
    descricao: "Honorário do atendimento não está na faixa de urgência / atendimento",
    descricaoSimplificada: "Honorário fora da faixa"
  },
  "1704": {
    codigo: "1704",
    grupo: "Valorização",
    descricao: "Valor cobrado superior ao acordado em pacote",
    descricaoSimplificada: "Valor acima do pacote"
  },
  "1705": {
    codigo: "1705",
    grupo: "Valorização",
    descricao: "Valor apresentado a maior",
    descricaoSimplificada: "Valor cobrado a maior"
  },
  "1706": {
    codigo: "1706",
    grupo: "Valorização",
    descricao: "Valor apresentado a menor",
    descricaoSimplificada: "Valor cobrado a menor"
  },
  "1707": {
    codigo: "1707",
    grupo: "Valorização",
    descricao: "Não existe informação sobre a tabela que será utilizada na Valoração. Verifique o Contrato do Prestador",
    descricaoSimplificada: "Tabela de preços não definida"
  },
  "1708": {
    codigo: "1708",
    grupo: "Valorização",
    descricao: "Não existe valor para o procedimento realizado",
    descricaoSimplificada: "Procedimento sem valor definido"
  },
  "1709": {
    codigo: "1709",
    grupo: "Valorização",
    descricao: "Falta prescrição médica",
    descricaoSimplificada: "Falta prescrição médica"
  },
  "1710": {
    codigo: "1710",
    grupo: "Valorização",
    descricao: "Falta visto da Enfermagem",
    descricaoSimplificada: "Falta visto da enfermagem"
  },
  "1711": {
    codigo: "1711",
    grupo: "Valorização",
    descricao: "Procedimento pertence a um pacote acordado e já cobrado",
    descricaoSimplificada: "Incluso no pacote"
  },
  "1712": {
    codigo: "1712",
    grupo: "Valorização",
    descricao: "Assinatura do Médico responsável pelo exame inexistente",
    descricaoSimplificada: "Falta assinatura do médico"
  },
  "1713": {
    codigo: "1713",
    grupo: "Valorização",
    descricao: "Faturamento Inválido",
    descricaoSimplificada: "Faturamento inválido"
  },
  "1714": {
    codigo: "1714",
    grupo: "Valorização",
    descricao: "Valor do serviço superior ao valor de tabela",
    descricaoSimplificada: "Valor acima da tabela"
  },
  "1715": {
    codigo: "1715",
    grupo: "Valorização",
    descricao: "Valor do serviço inferior ao valor de tabela",
    descricaoSimplificada: "Valor abaixo da tabela"
  },
  "1716": {
    codigo: "1716",
    grupo: "Valorização",
    descricao: "Percentual de redução / acréscimo fora dos valores definidos em tabela",
    descricaoSimplificada: "Percentual fora do permitido"
  },
  "1799": {
    codigo: "1799",
    grupo: "Valorização",
    descricao: "Outros motivos de valorização",
    descricaoSimplificada: "Outros (valorização)"
  },

  // ============================================
  // PROCEDIMENTO (1801-1899)
  // ============================================
  "1801": {
    codigo: "1801",
    grupo: "Procedimento",
    descricao: "Procedimento inválido",
    descricaoSimplificada: "Procedimento inválido"
  },
  "1802": {
    codigo: "1802",
    grupo: "Procedimento",
    descricao: "Procedimento incompatível com o sexo do Beneficiário",
    descricaoSimplificada: "Incompatível com sexo"
  },
  "1803": {
    codigo: "1803",
    grupo: "Procedimento",
    descricao: "Idade do Beneficiário incompatível com o Procedimento",
    descricaoSimplificada: "Incompatível com idade"
  },
  "1804": {
    codigo: "1804",
    grupo: "Procedimento",
    descricao: "Números de dias liberados / sessões autorizadas não informadas",
    descricaoSimplificada: "Dias/sessões não informados"
  },
  "1805": {
    codigo: "1805",
    grupo: "Procedimento",
    descricao: "Valor total do procedimento diferente do valor Processado",
    descricaoSimplificada: "Valor divergente"
  },
  "1806": {
    codigo: "1806",
    grupo: "Procedimento",
    descricao: "Quantidade de procedimento deve ser maior que zero",
    descricaoSimplificada: "Quantidade zerada"
  },
  "1807": {
    codigo: "1807",
    grupo: "Procedimento",
    descricao: "Procedimentos médicos duplicados",
    descricaoSimplificada: "Procedimento duplicado"
  },
  "1808": {
    codigo: "1808",
    grupo: "Procedimento",
    descricao: "Procedimento não conforme com o CID",
    descricaoSimplificada: "Incompatível com CID"
  },
  "1809": {
    codigo: "1809",
    grupo: "Procedimento",
    descricao: "Cobrança de procedimento não executado",
    descricaoSimplificada: "Procedimento não executado"
  },
  "1810": {
    codigo: "1810",
    grupo: "Procedimento",
    descricao: "Cobrança de procedimento não solicitado pelo médico",
    descricaoSimplificada: "Procedimento não solicitado"
  },
  "1811": {
    codigo: "1811",
    grupo: "Procedimento",
    descricao: "Procedimento sem registro de execução",
    descricaoSimplificada: "Sem registro de execução"
  },
  "1812": {
    codigo: "1812",
    grupo: "Procedimento",
    descricao: "Cobrança de procedimento não correlacionado ao relatório específico",
    descricaoSimplificada: "Não correlacionado ao relatório"
  },
  "1813": {
    codigo: "1813",
    grupo: "Procedimento",
    descricao: "Cobrança de procedimento sem justificativa para realização ou com justificativa insuficiente",
    descricaoSimplificada: "Justificativa insuficiente"
  },
  "1814": {
    codigo: "1814",
    grupo: "Procedimento",
    descricao: "Cobrança de procedimento com data de autorização posterior à do atendimento",
    descricaoSimplificada: "Autorização posterior ao atendimento"
  },
  "1815": {
    codigo: "1815",
    grupo: "Procedimento",
    descricao: "Procedimento não autorizado",
    descricaoSimplificada: "Procedimento não autorizado"
  },
  "1816": {
    codigo: "1816",
    grupo: "Procedimento",
    descricao: "Cobrança de procedimento em quantidade incompatível com o procedimento / evolução clínica",
    descricaoSimplificada: "Quantidade incompatível"
  },
  "1817": {
    codigo: "1817",
    grupo: "Procedimento",
    descricao: "Cobrança de procedimento incluso no procedimento principal",
    descricaoSimplificada: "Incluso no procedimento principal"
  },
  "1818": {
    codigo: "1818",
    grupo: "Procedimento",
    descricao: "Cobrança de procedimento que exige autorização prévia",
    descricaoSimplificada: "Requer autorização prévia"
  },
  "1819": {
    codigo: "1819",
    grupo: "Procedimento",
    descricao: "Cobrança de procedimento com história clínica / hipótese diagnóstica não compatível",
    descricaoSimplificada: "Incompatível com diagnóstico"
  },
  "1820": {
    codigo: "1820",
    grupo: "Procedimento",
    descricao: "Cobrança de procedimento em quantidade acima da máxima permitida / autorizada",
    descricaoSimplificada: "Quantidade acima do permitido"
  },
  "1821": {
    codigo: "1821",
    grupo: "Procedimento",
    descricao: "Cobrança de procedimento não compatível com a idade",
    descricaoSimplificada: "Incompatível com idade"
  },
  "1822": {
    codigo: "1822",
    grupo: "Procedimento",
    descricao: "Cobrança de procedimento com ausência de resultado ou laudo técnico",
    descricaoSimplificada: "Falta laudo/resultado"
  },
  "1823": {
    codigo: "1823",
    grupo: "Procedimento",
    descricao: "Procedimento realizado pelo mesmo profissional, na mesma especialidade, no prazo inferior ao estipulado sem justificativa adequada",
    descricaoSimplificada: "Intervalo mínimo não respeitado"
  },
  "1824": {
    codigo: "1824",
    grupo: "Procedimento",
    descricao: "Procedimento cobrado não corresponde ao exame executado",
    descricaoSimplificada: "Procedimento divergente"
  },
  "1825": {
    codigo: "1825",
    grupo: "Procedimento",
    descricao: "Cobrança de procedimento ambulatorial com data de autorização posterior à do atendimento",
    descricaoSimplificada: "Autorização posterior"
  },
  "1899": {
    codigo: "1899",
    grupo: "Procedimento",
    descricao: "Outros motivos de procedimento",
    descricaoSimplificada: "Outros (procedimento)"
  },

  // ============================================
  // DIÁRIA (1901-1999)
  // ============================================
  "1901": {
    codigo: "1901",
    grupo: "Diária",
    descricao: "Acomodação informada não está de acordo com acomodação contratada",
    descricaoSimplificada: "Acomodação não contratada"
  },
  "1902": {
    codigo: "1902",
    grupo: "Diária",
    descricao: "Permanência hospitalar incompatível com a evolução clínica",
    descricaoSimplificada: "Permanência incompatível"
  },
  "1903": {
    codigo: "1903",
    grupo: "Diária",
    descricao: "Permanência hospitalar incompatível com o procedimento autorizado",
    descricaoSimplificada: "Permanência não autorizada"
  },
  "1904": {
    codigo: "1904",
    grupo: "Diária",
    descricao: "Quantidade de diárias deve ser maior que zero",
    descricaoSimplificada: "Quantidade zerada"
  },
  "1905": {
    codigo: "1905",
    grupo: "Diária",
    descricao: "Acomodação não informada",
    descricaoSimplificada: "Acomodação não informada"
  },
  "1906": {
    codigo: "1906",
    grupo: "Diária",
    descricao: "Quantidade UTI não prevista para procedimento",
    descricaoSimplificada: "UTI não prevista"
  },
  "1907": {
    codigo: "1907",
    grupo: "Diária",
    descricao: "Usuário não possui cobertura de UTI",
    descricaoSimplificada: "Sem cobertura de UTI"
  },
  "1908": {
    codigo: "1908",
    grupo: "Diária",
    descricao: "Acomodação não autorizada",
    descricaoSimplificada: "Acomodação não autorizada"
  },
  "1909": {
    codigo: "1909",
    grupo: "Diária",
    descricao: "Cobrança de diárias em locais de acomodações diferentes, no mesmo dia",
    descricaoSimplificada: "Diárias duplicadas"
  },
  "1910": {
    codigo: "1910",
    grupo: "Diária",
    descricao: "Permanência hospitalar para investigação injustificada",
    descricaoSimplificada: "Permanência injustificada"
  },
  "1911": {
    codigo: "1911",
    grupo: "Diária",
    descricao: "Evolução clínica não compatível com a permanência em UTI",
    descricaoSimplificada: "UTI incompatível com evolução"
  },
  "1912": {
    codigo: "1912",
    grupo: "Diária",
    descricao: "Código de diária incompatível com o local de atendimento",
    descricaoSimplificada: "Diária incompatível com local"
  },
  "1913": {
    codigo: "1913",
    grupo: "Diária",
    descricao: "Cobrança de diária em quantidade incompatível com a permanência hospitalar",
    descricaoSimplificada: "Quantidade incompatível"
  },
  "1914": {
    codigo: "1914",
    grupo: "Diária",
    descricao: "Mudança de acomodação sem comunicação ao paciente, familiar ou acompanhante, ou sem solicitação destes",
    descricaoSimplificada: "Mudança sem comunicação"
  },
  "1915": {
    codigo: "1915",
    grupo: "Diária",
    descricao: "Cobrança de diárias de UTI incompatível com diagnóstico e evolução clínica",
    descricaoSimplificada: "UTI incompatível"
  },
  "1999": {
    codigo: "1999",
    grupo: "Diária",
    descricao: "Outros motivos de diária",
    descricaoSimplificada: "Outros (diária)"
  },

  // ============================================
  // MATERIAL (2001-2099)
  // ============================================
  "2001": {
    codigo: "2001",
    grupo: "Material",
    descricao: "Material inválido",
    descricaoSimplificada: "Material inválido"
  },
  "2002": {
    codigo: "2002",
    grupo: "Material",
    descricao: "Material sem cobertura para atendimento ambulatorial",
    descricaoSimplificada: "Material sem cobertura ambulatorial"
  },
  "2003": {
    codigo: "2003",
    grupo: "Material",
    descricao: "Material não especificado",
    descricaoSimplificada: "Material não especificado"
  },
  "2004": {
    codigo: "2004",
    grupo: "Material",
    descricao: "Material sem nota fiscal do fornecedor",
    descricaoSimplificada: "Falta nota fiscal"
  },
  "2005": {
    codigo: "2005",
    grupo: "Material",
    descricao: "Quantidade de material deve ser maior que zero",
    descricaoSimplificada: "Quantidade zerada"
  },
  "2006": {
    codigo: "2006",
    grupo: "Material",
    descricao: "Material informado não coberto",
    descricaoSimplificada: "Material não coberto"
  },
  "2007": {
    codigo: "2007",
    grupo: "Material",
    descricao: "Cobrança de material em quantidade incompatível com a permanência",
    descricaoSimplificada: "Quantidade incompatível"
  },
  "2008": {
    codigo: "2008",
    grupo: "Material",
    descricao: "Cobrança de material em quantidades incompatíveis com o procedimento realizado",
    descricaoSimplificada: "Quantidade incompatível com procedimento"
  },
  "2009": {
    codigo: "2009",
    grupo: "Material",
    descricao: "Cobrança de material superior a quantidade coberta",
    descricaoSimplificada: "Quantidade acima da cobertura"
  },
  "2010": {
    codigo: "2010",
    grupo: "Material",
    descricao: "Cobranças de materiais inclusos nas taxas",
    descricaoSimplificada: "Material incluso nas taxas"
  },
  "2011": {
    codigo: "2011",
    grupo: "Material",
    descricao: "Cobrança de material incluso no pacote negociado",
    descricaoSimplificada: "Material incluso no pacote"
  },
  "2012": {
    codigo: "2012",
    grupo: "Material",
    descricao: "Cobrança de material incompatível com o relatório técnico",
    descricaoSimplificada: "Incompatível com relatório"
  },
  "2013": {
    codigo: "2013",
    grupo: "Material",
    descricao: "Cobrança de material em permanência hospitalar não autorizada",
    descricaoSimplificada: "Permanência não autorizada"
  },
  "2014": {
    codigo: "2014",
    grupo: "Material",
    descricao: "Cobrança de material não utilizado",
    descricaoSimplificada: "Material não utilizado"
  },
  "2099": {
    codigo: "2099",
    grupo: "Material",
    descricao: "Outros motivos de material",
    descricaoSimplificada: "Outros (material)"
  },

  // ============================================
  // MEDICAMENTO (2101-2199)
  // ============================================
  "2101": {
    codigo: "2101",
    grupo: "Medicamento",
    descricao: "Medicamento inválido",
    descricaoSimplificada: "Medicamento inválido"
  },
  "2102": {
    codigo: "2102",
    grupo: "Medicamento",
    descricao: "Medicamento sem cobertura para atendimento ambulatorial",
    descricaoSimplificada: "Medicamento sem cobertura ambulatorial"
  },
  "2103": {
    codigo: "2103",
    grupo: "Medicamento",
    descricao: "Medicamento não especificado",
    descricaoSimplificada: "Medicamento não especificado"
  },
  "2104": {
    codigo: "2104",
    grupo: "Medicamento",
    descricao: "Medicamento sem nota fiscal do fornecedor",
    descricaoSimplificada: "Falta nota fiscal"
  },
  "2105": {
    codigo: "2105",
    grupo: "Medicamento",
    descricao: "Quantidade de medicamentos deve ser maior que zero",
    descricaoSimplificada: "Quantidade zerada"
  },
  "2106": {
    codigo: "2106",
    grupo: "Medicamento",
    descricao: "Medicamento informado não coberto",
    descricaoSimplificada: "Medicamento não coberto"
  },
  "2107": {
    codigo: "2107",
    grupo: "Medicamento",
    descricao: "Cobrança de medicamento em quantidade incompatível com a permanência",
    descricaoSimplificada: "Quantidade incompatível"
  },
  "2108": {
    codigo: "2108",
    grupo: "Medicamento",
    descricao: "Cobrança de medicamento em quantidades incompatíveis com o procedimento realizado",
    descricaoSimplificada: "Quantidade incompatível com procedimento"
  },
  "2109": {
    codigo: "2109",
    grupo: "Medicamento",
    descricao: "Quantidade de medicamento superior a quantidade coberta",
    descricaoSimplificada: "Quantidade acima da cobertura"
  },
  "2110": {
    codigo: "2110",
    grupo: "Medicamento",
    descricao: "Cobrança de medicamento inclusos nas taxas",
    descricaoSimplificada: "Medicamento incluso nas taxas"
  },
  "2111": {
    codigo: "2111",
    grupo: "Medicamento",
    descricao: "Cobrança de medicamento incluso no pacote negociado",
    descricaoSimplificada: "Medicamento incluso no pacote"
  },
  "2112": {
    codigo: "2112",
    grupo: "Medicamento",
    descricao: "Cobrança de medicamento incompatível com o relatório técnico",
    descricaoSimplificada: "Incompatível com relatório"
  },
  "2113": {
    codigo: "2113",
    grupo: "Medicamento",
    descricao: "Cobrança de medicamento em permanência hospitalar não autorizada",
    descricaoSimplificada: "Permanência não autorizada"
  },
  "2114": {
    codigo: "2114",
    grupo: "Medicamento",
    descricao: "Cobrança de medicamento não autorizado",
    descricaoSimplificada: "Medicamento não autorizado"
  },
  "2199": {
    codigo: "2199",
    grupo: "Medicamento",
    descricao: "Outros motivos de medicamento",
    descricaoSimplificada: "Outros (medicamento)"
  },

  // ============================================
  // OPM - ÓRTESE, PRÓTESE E MATERIAIS ESPECIAIS (2201-2299)
  // ============================================
  "2202": {
    codigo: "2202",
    grupo: "OPM",
    descricao: "OPM sem cobertura para atendimento ambulatorial",
    descricaoSimplificada: "OPM sem cobertura ambulatorial"
  },
  "2203": {
    codigo: "2203",
    grupo: "OPM",
    descricao: "OPM sem nota fiscal do prestador",
    descricaoSimplificada: "Falta nota fiscal"
  },
  "2204": {
    codigo: "2204",
    grupo: "OPM",
    descricao: "Quantidade de OPM deve ser maior que zero",
    descricaoSimplificada: "Quantidade zerada"
  },
  "2205": {
    codigo: "2205",
    grupo: "OPM",
    descricao: "OPM informado não coberto",
    descricaoSimplificada: "OPM não coberto"
  },
  "2206": {
    codigo: "2206",
    grupo: "OPM",
    descricao: "OPM informado não autorizado",
    descricaoSimplificada: "OPM não autorizado"
  },
  "2207": {
    codigo: "2207",
    grupo: "OPM",
    descricao: "Cobrança de OPM não utilizado",
    descricaoSimplificada: "OPM não utilizado"
  },
  "2208": {
    codigo: "2208",
    grupo: "OPM",
    descricao: "Cobrança de OPM no item material e medicamentos",
    descricaoSimplificada: "OPM em campo incorreto"
  },
  "2209": {
    codigo: "2209",
    grupo: "OPM",
    descricao: "Cobrança de OPM em desacordo com relatório técnico",
    descricaoSimplificada: "Incompatível com relatório"
  },
  "2210": {
    codigo: "2210",
    grupo: "OPM",
    descricao: "Cobrança de OPM em quantidade incompatível com o procedimento realizado",
    descricaoSimplificada: "Quantidade incompatível"
  },
  "2299": {
    codigo: "2299",
    grupo: "OPM",
    descricao: "Outros motivos de OPM",
    descricaoSimplificada: "Outros (OPM)"
  },

  // ============================================
  // TAXAS E SERVIÇOS (2301-2399)
  // ============================================
  "2301": {
    codigo: "2301",
    grupo: "Taxas",
    descricao: "Taxa inválida",
    descricaoSimplificada: "Taxa inválida"
  },
  "2302": {
    codigo: "2302",
    grupo: "Taxas",
    descricao: "Taxa sem cobertura para atendimento ambulatorial",
    descricaoSimplificada: "Taxa sem cobertura ambulatorial"
  },
  "2303": {
    codigo: "2303",
    grupo: "Taxas",
    descricao: "Taxa não especificada",
    descricaoSimplificada: "Taxa não especificada"
  },
  "2304": {
    codigo: "2304",
    grupo: "Taxas",
    descricao: "Quantidade de taxa deve ser maior que zero",
    descricaoSimplificada: "Quantidade zerada"
  },
  "2305": {
    codigo: "2305",
    grupo: "Taxas",
    descricao: "Taxa informada não coberta",
    descricaoSimplificada: "Taxa não coberta"
  },
  "2306": {
    codigo: "2306",
    grupo: "Taxas",
    descricao: "Cobrança de taxa em quantidade incompatível com a permanência",
    descricaoSimplificada: "Quantidade incompatível"
  },
  "2307": {
    codigo: "2307",
    grupo: "Taxas",
    descricao: "Cobrança de taxa em quantidades incompatíveis com o procedimento realizado",
    descricaoSimplificada: "Quantidade incompatível com procedimento"
  },
  "2308": {
    codigo: "2308",
    grupo: "Taxas",
    descricao: "Cobrança de taxa superior a quantidade coberta",
    descricaoSimplificada: "Quantidade acima da cobertura"
  },
  "2309": {
    codigo: "2309",
    grupo: "Taxas",
    descricao: "Cobrança de taxa inclusa no pacote negociado",
    descricaoSimplificada: "Taxa inclusa no pacote"
  },
  "2310": {
    codigo: "2310",
    grupo: "Taxas",
    descricao: "Cobrança de taxa em permanência hospitalar não autorizada",
    descricaoSimplificada: "Permanência não autorizada"
  },
  "2311": {
    codigo: "2311",
    grupo: "Taxas",
    descricao: "Cobrança de taxa não autorizada",
    descricaoSimplificada: "Taxa não autorizada"
  },
  "2399": {
    codigo: "2399",
    grupo: "Taxas",
    descricao: "Outros motivos de taxa",
    descricaoSimplificada: "Outros (taxa)"
  },

  // ============================================
  // GASES MEDICINAIS (2401-2499)
  // ============================================
  "2401": {
    codigo: "2401",
    grupo: "Gases",
    descricao: "Gás medicinal inválido",
    descricaoSimplificada: "Gás medicinal inválido"
  },
  "2402": {
    codigo: "2402",
    grupo: "Gases",
    descricao: "Gás medicinal sem cobertura para atendimento ambulatorial",
    descricaoSimplificada: "Gás sem cobertura ambulatorial"
  },
  "2403": {
    codigo: "2403",
    grupo: "Gases",
    descricao: "Gás medicinal não especificado",
    descricaoSimplificada: "Gás não especificado"
  },
  "2404": {
    codigo: "2404",
    grupo: "Gases",
    descricao: "Gás medicinal sem nota fiscal do fornecedor",
    descricaoSimplificada: "Falta nota fiscal"
  },
  "2405": {
    codigo: "2405",
    grupo: "Gases",
    descricao: "Quantidade de gás medicinal deve ser maior que zero",
    descricaoSimplificada: "Quantidade zerada"
  },
  "2406": {
    codigo: "2406",
    grupo: "Gases",
    descricao: "Gás medicinal informado não coberto",
    descricaoSimplificada: "Gás não coberto"
  },
  "2407": {
    codigo: "2407",
    grupo: "Gases",
    descricao: "Cobrança de gás medicinal em quantidade incompatível com a permanência",
    descricaoSimplificada: "Quantidade incompatível"
  },
  "2408": {
    codigo: "2408",
    grupo: "Gases",
    descricao: "Cobrança de gás medicinal em quantidades incompatíveis com o procedimento realizado",
    descricaoSimplificada: "Quantidade incompatível com procedimento"
  },
  "2409": {
    codigo: "2409",
    grupo: "Gases",
    descricao: "Cobrança de gás medicinal superior a quantidade coberta",
    descricaoSimplificada: "Quantidade acima da cobertura"
  },
  "2410": {
    codigo: "2410",
    grupo: "Gases",
    descricao: "Cobrança de gás medicinal incluso nas taxas",
    descricaoSimplificada: "Gás incluso nas taxas"
  },
  "2411": {
    codigo: "2411",
    grupo: "Gases",
    descricao: "Cobrança de gás medicinal incluso no pacote negociado",
    descricaoSimplificada: "Gás incluso no pacote"
  },
  "2412": {
    codigo: "2412",
    grupo: "Gases",
    descricao: "Cobrança de gás medicinal incompatível com o relatório técnico",
    descricaoSimplificada: "Incompatível com relatório"
  },
  "2413": {
    codigo: "2413",
    grupo: "Gases",
    descricao: "Cobrança de gás medicinal em permanência hospitalar não autorizada",
    descricaoSimplificada: "Permanência não autorizada"
  },
  "2414": {
    codigo: "2414",
    grupo: "Gases",
    descricao: "Cobrança de gás medicinal não autorizado",
    descricaoSimplificada: "Gás não autorizado"
  },
  "2421": {
    codigo: "2421",
    grupo: "Gases",
    descricao: "Gás medicinal não compatível com o procedimento",
    descricaoSimplificada: "Gás incompatível com procedimento"
  },
  "2499": {
    codigo: "2499",
    grupo: "Gases",
    descricao: "Outros motivos de gás medicinal",
    descricaoSimplificada: "Outros (gás medicinal)"
  },

  // ============================================
  // ALUGUEIS (2501-2599)
  // ============================================
  "2501": {
    codigo: "2501",
    grupo: "Alugueis",
    descricao: "Aluguel inválido",
    descricaoSimplificada: "Aluguel inválido"
  },
  "2502": {
    codigo: "2502",
    grupo: "Alugueis",
    descricao: "Aluguel sem cobertura para atendimento ambulatorial",
    descricaoSimplificada: "Aluguel sem cobertura ambulatorial"
  },
  "2503": {
    codigo: "2503",
    grupo: "Alugueis",
    descricao: "Aluguel não especificado",
    descricaoSimplificada: "Aluguel não especificado"
  },
  "2504": {
    codigo: "2504",
    grupo: "Alugueis",
    descricao: "Quantidade de aluguel deve ser maior que zero",
    descricaoSimplificada: "Quantidade zerada"
  },
  "2505": {
    codigo: "2505",
    grupo: "Alugueis",
    descricao: "Aluguel informado não coberto",
    descricaoSimplificada: "Aluguel não coberto"
  },
  "2506": {
    codigo: "2506",
    grupo: "Alugueis",
    descricao: "Cobrança de aluguel em quantidade incompatível com a permanência",
    descricaoSimplificada: "Quantidade incompatível"
  },
  "2507": {
    codigo: "2507",
    grupo: "Alugueis",
    descricao: "Cobrança de aluguel em quantidades incompatíveis com o procedimento realizado",
    descricaoSimplificada: "Quantidade incompatível com procedimento"
  },
  "2508": {
    codigo: "2508",
    grupo: "Alugueis",
    descricao: "Cobrança de aluguel superior a quantidade coberta",
    descricaoSimplificada: "Quantidade acima da cobertura"
  },
  "2509": {
    codigo: "2509",
    grupo: "Alugueis",
    descricao: "Cobrança de aluguel incluso no pacote negociado",
    descricaoSimplificada: "Aluguel incluso no pacote"
  },
  "2510": {
    codigo: "2510",
    grupo: "Alugueis",
    descricao: "Cobrança de aluguel em permanência hospitalar não autorizada",
    descricaoSimplificada: "Permanência não autorizada"
  },
  "2511": {
    codigo: "2511",
    grupo: "Alugueis",
    descricao: "Cobrança de aluguel não autorizado",
    descricaoSimplificada: "Aluguel não autorizado"
  },
  "2599": {
    codigo: "2599",
    grupo: "Alugueis",
    descricao: "Outros motivos de aluguel",
    descricaoSimplificada: "Outros (aluguel)"
  },

  // ============================================
  // CÓDIGOS ADICIONAIS ENCONTRADOS
  // ============================================
  "1323": {
    codigo: "1323",
    grupo: "Guia",
    descricao: "Guia com informações divergentes",
    descricaoSimplificada: "Informações divergentes na guia"
  },
};

/**
 * Traduz um código de glosa para sua descrição simplificada
 * @param codigo - Código da glosa (ex: "2108")
 * @returns Descrição simplificada ou o código original se não encontrado
 */
export function traduzirCodigoGlosa(codigo: string): string {
  const glosa = GLOSAS_TISS[codigo];
  if (glosa) {
    return glosa.descricaoSimplificada;
  }
  return `Código ${codigo}`;
}

/**
 * Traduz um código de glosa para sua descrição completa
 * @param codigo - Código da glosa (ex: "2108")
 * @returns Descrição completa ou o código original se não encontrado
 */
export function traduzirCodigoGlosaCompleto(codigo: string): string {
  const glosa = GLOSAS_TISS[codigo];
  if (glosa) {
    return glosa.descricao;
  }
  return `Código ${codigo}`;
}

/**
 * Obtém informações completas de uma glosa
 * @param codigo - Código da glosa
 * @returns Objeto GlosaInfo ou undefined se não encontrado
 */
export function obterInfoGlosa(codigo: string): GlosaInfo | undefined {
  return GLOSAS_TISS[codigo];
}

/**
 * Traduz uma string de motivo de glosa que pode conter múltiplos códigos
 * Formato esperado: "Código: 2108" ou "2108: descrição" ou apenas "2108"
 * @param motivoGlosa - String com o(s) motivo(s) de glosa
 * @returns String com as descrições traduzidas
 */
export function traduzirMotivoGlosa(motivoGlosa: string): string {
  if (!motivoGlosa) return "";
  
  // Padrão para encontrar códigos de glosa (4 dígitos)
  const codigoPattern = /\b(\d{4})\b/g;
  const codigos = motivoGlosa.match(codigoPattern);
  
  if (!codigos || codigos.length === 0) {
    return motivoGlosa;
  }
  
  // Traduzir cada código encontrado
  const traducoes = codigos.map(codigo => {
    const glosa = GLOSAS_TISS[codigo];
    if (glosa) {
      return `${codigo}: ${glosa.descricaoSimplificada}`;
    }
    return `${codigo}: Código não catalogado`;
  });
  
  return traducoes.join("; ");
}

/**
 * Lista todos os grupos de glosa disponíveis
 */
export function listarGruposGlosa(): string[] {
  const grupos = new Set<string>();
  Object.values(GLOSAS_TISS).forEach(glosa => grupos.add(glosa.grupo));
  return Array.from(grupos).sort();
}

/**
 * Lista todas as glosas de um grupo específico
 */
export function listarGlosasPorGrupo(grupo: string): GlosaInfo[] {
  return Object.values(GLOSAS_TISS)
    .filter(glosa => glosa.grupo === grupo)
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}
