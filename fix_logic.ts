import fs from 'fs';

const path = 'c:\\Users\\sergi\\OneDrive\\Antigravity\\safatle-sistema\\server\\faturamentoUnificadoService.ts';
let content = fs.readFileSync(path, 'utf8');

const oldQuery = `  const query = \`
    SELECT re.id, re.numero_guia as numeroGuia, re.item as codigoItem, 
           re.item_desc as descricaoItem, re.valor_pagamento as valorPago, 
           re.valor_informado as valorInformado, re.quantidade, re.situacao_item as situacao
    FROM recebimentos_excel re
    LEFT JOIN conciliados_automatico ca ON ca.recebimentoId = re.id
    WHERE re.numero_guia = '\${params.numeroGuia.replace(/'/g, "''")}' 
      AND re.estabelecimentoId = \${params.estabelecimentoId}
      AND ca.id IS NULL
    ORDER BY CAST(re.valor_pagamento AS DECIMAL(10,2)) DESC
  \`;`;

const newQuery = `  const query = \`
    SELECT re.id, re.numero_guia as numeroGuia, re.item as codigoItem, 
           re.item_desc as descricaoItem, 
           (CAST(re.valor_pagamento AS DECIMAL(12,4)) - COALESCE(SUM(ca.valorPago), 0)) as valorPago, 
           re.valor_informado as valorInformado, re.quantidade, re.situacao_item as situacao
    FROM recebimentos_excel re
    LEFT JOIN conciliados_automatico ca ON ca.recebimentoId = re.id
    WHERE re.numero_guia = '\${params.numeroGuia.replace(/'/g, "''")}' 
      AND re.estabelecimentoId = \${params.estabelecimentoId}
    GROUP BY re.id, re.numero_guia, re.item, re.item_desc, re.valor_pagamento, re.valor_informado, re.quantidade, re.situacao_item
    HAVING (CAST(re.valor_pagamento AS DECIMAL(12,4)) - COALESCE(SUM(ca.valorPago), 0)) > 0.01
    ORDER BY CAST(re.valor_pagamento AS DECIMAL(10,2)) DESC
  \`;`;

const oldLogic = `  // 2. Calcular novos valores
  const valorFaturado = Number(conc.valorFaturado) || 0;
  const valorRecebido = Math.min(valorFaturado, Number(rec.valor_pagamento) || 0);
  const diferenca = valorFaturado - valorRecebido;
  const pctDif = valorFaturado > 0 ? (diferenca / valorFaturado) * 100 : 0;`;

const newLogic = `  // 2. Calcular novos valores
  const [somaRows] = await db.execute(sql.raw(\`SELECT SUM(valorPago) as totalUtilizado FROM conciliados_automatico WHERE recebimentoId = \${rec.id} AND estabelecimentoId = \${params.estabelecimentoId}\`));
  const totalUtilizado = Number((somaRows as any[])[0]?.totalUtilizado) || 0;
  const saldoRecebimento = Number(rec.valor_pagamento) - totalUtilizado;

  if (saldoRecebimento <= 0) throw new Error("Esta sobra não possui mais saldo disponível");

  const valorFaturado = Number(conc.valorFaturado) || 0;
  const valorRecebido = Math.min(valorFaturado, saldoRecebimento);
  const diferenca = valorFaturado - valorRecebido;
  const pctDif = valorFaturado > 0 ? (diferenca / valorFaturado) * 100 : 0;`;

content = content.replace(oldQuery, newQuery);
content = content.replace(oldLogic, newLogic);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed faturamentoUnificadoService.ts');
