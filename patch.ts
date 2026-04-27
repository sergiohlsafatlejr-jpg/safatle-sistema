import fs from "fs";

let content = fs.readFileSync("server/db.ts", "utf8");

// Regex to find everything from `const subqueryParts` to `return mapped; });`
const regex = /const subqueryParts: string\[\] = \[\s*'SELECT DISTINCT ccr\.numeroConta FROM contas_convenio_resumo ccr'[\s\S]*?return mapped;\s*\}\);/g;

const replacement = `const subqueryParts: string[] = [
      'SELECT DISTINCT ccr.numeroConta FROM contas_convenio_resumo ccr',
      'WHERE ccr.estabelecimentoId = ' + (estabelecimentoId || 0),
    ];
    if (convenioId) subqueryParts.push('AND ccr.convenioId = ' + convenioId);
    if (competenciaFiltro) subqueryParts.push(\`AND ccr.competencia = '\${competenciaFiltro}'\`);
    else if (anoReferencia) subqueryParts.push(\`AND ccr.competencia LIKE '\${anoReferencia}/%'\`);
    
    const sqlParts: string[] = [
      'SELECT ft.*, (SELECT ccr.competencia FROM contas_convenio_resumo ccr WHERE ccr.estabelecimentoId = ft.estabelecimentoId AND ccr.numeroConta = ft.numero_guia_prestador LIMIT 1) as competencia_conta',
      'FROM staging_faturamento_xml ft',
      'WHERE ft.estabelecimentoId = ' + (estabelecimentoId || 0),
      'AND ft.numero_guia_prestador IN (' + subqueryParts.join(' ') + ')',
    ];
    
    // N\u00C3O filtrar por ft.competencia no staging_faturamento_xml!
    // A compet\u00EAncia real da conta j\u00E1 foi filtrada na subquery.
    // O campo ft.competencia representa o m\u00EAs do arquivo XML, que pode ser meses depois do atendimento.
    
    const rawResult = await db.execute(sql.raw(sqlParts.join(' ')));
    const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const rawRows = (rawResult as any)[0] || [];
    itensFaturados = rawRows.map((row: any) => {
      const mapped: any = {};
      for (const key of Object.keys(row)) {
        mapped[snakeToCamel(key)] = row[key];
      }
      // SOBRESCREVER a compet\u00EAncia do XML pela compet\u00EAncia da CONTA
      if (row.competencia_conta) {
        mapped.competencia = row.competencia_conta;
      }
      return mapped;
    });`;

if (regex.test(content)) {
  fs.writeFileSync("server/db.ts", content.replace(regex, replacement));
  console.log("SUCCESS");
} else {
  console.log("NOT FOUND");
}
