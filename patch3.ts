import fs from "fs";

let content = fs.readFileSync("server/db.ts", "utf8");

const regex = /const sqlParts: string\[\] = \[\s*'SELECT ft\.\*, \(SELECT ccr\.competencia FROM contas_convenio_resumo ccr WHERE ccr\.estabelecimentoId = ft\.estabelecimentoId AND ccr\.numeroConta = ft\.numero_guia_prestador LIMIT 1\) as competencia_conta',[\s\S]*?return mapped;\s*\}\);/g;

const replacement = `const sqlParts: string[] = [
      'SELECT ft.* FROM staging_faturamento_xml ft',
      'WHERE ft.estabelecimentoId = ' + (estabelecimentoId || 0),
      'AND ft.numero_guia_prestador IN (' + subqueryParts.join(' ') + ')',
    ];
    
    // NÃO filtrar por ft.competencia no staging_faturamento_xml!
    // A competência real da conta já foi filtrada na subquery.
    // O campo ft.competencia representa o mês do arquivo XML, que pode ser meses depois do atendimento.
    
    const rawResult = await db.execute(sql.raw(sqlParts.join(' ')));
    
    // Buscar o mapeamento de numeroConta -> competencia em JS para evitar lentidão de subqueries SQL
    const ccrResult = await db.execute(sql.raw(\`
      SELECT numeroConta, competencia 
      FROM contas_convenio_resumo 
      WHERE estabelecimentoId = \${estabelecimentoId || 0}
      AND numeroConta IN (\${subqueryParts.join(' ')})
    \`));
    const ccrRows = (ccrResult as any)[0] || [];
    const contaCompetenciaMap = new Map<string, string>();
    for (const row of ccrRows) {
      if (row.numeroConta && row.competencia) {
        contaCompetenciaMap.set(String(row.numeroConta), row.competencia);
      }
    }

    const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const rawRows = (rawResult as any)[0] || [];
    itensFaturados = rawRows.map((row: any) => {
      const mapped: any = {};
      for (const key of Object.keys(row)) {
        mapped[snakeToCamel(key)] = row[key];
      }
      
      // SOBRESCREVER a competência do XML pela competência da CONTA
      const guiaStr = String(mapped.numeroGuiaPrestador || '');
      if (guiaStr && contaCompetenciaMap.has(guiaStr)) {
        mapped.competencia = contaCompetenciaMap.get(guiaStr);
      }
      return mapped;
    });`;

if (regex.test(content)) {
  fs.writeFileSync("server/db.ts", content.replace(regex, replacement));
  console.log("SUCCESS");
} else {
  console.log("NOT FOUND");
}
