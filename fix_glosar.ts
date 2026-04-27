import fs from 'fs';

const path = 'c:\\Users\\sergi\\OneDrive\\Antigravity\\safatle-sistema\\server\\faturamentoUnificadoService.ts';
let content = fs.readFileSync(path, 'utf8');

const target1 = `    SET statusConciliacao = 'glosado',
        valorGlosa = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN valorFaturado - valorPago ELSE valorFaturado END,
        valorPago = CASE WHEN statusConciliacao = 'divergente' THEN valorPago ELSE 0 END,
        diferenca = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN valorFaturado - valorPago ELSE valorFaturado END,
        percentualDiferenca = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN ROUND(((valorFaturado - valorPago) / valorFaturado) * 100, 2) ELSE 100 END,
        motivoGlosa = \${esc(params.motivoGlosa)},
        codigoGlosa = \${esc(params.codigoGlosa)}`;

const target2 = `    SET statusConciliacao = 'glosado',
        valorGlosa = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN valorFaturado - valorPago ELSE valorFaturado END,
        valorPago = CASE WHEN statusConciliacao = 'divergente' THEN valorPago ELSE 0 END,
        diferenca = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN valorFaturado - valorPago ELSE valorFaturado END,
        percentualDiferenca = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN ROUND(((valorFaturado - valorPago) / valorFaturado) * 100, 2) ELSE 100 END,
        motivoGlosa = \${esc(params.motivoGlosa)},
        codigoGlosa = \${esc(params.codigoGlosa)}`;

const replacement1 = `    SET valorGlosa = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN valorFaturado - valorPago ELSE valorFaturado END,
        valorPago = CASE WHEN statusConciliacao = 'divergente' THEN valorPago ELSE 0 END,
        diferenca = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN valorFaturado - valorPago ELSE valorFaturado END,
        percentualDiferenca = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN ROUND(((valorFaturado - valorPago) / valorFaturado) * 100, 2) ELSE 100 END,
        motivoGlosa = \${esc(params.motivoGlosa)},
        codigoGlosa = \${esc(params.codigoGlosa)},
        statusConciliacao = 'glosado'`;

// Replace all occurrences (both glosarItens and glosarTodosNaoRecebidosPorGuia)
content = content.replace(target1, replacement1).replace(target1, replacement1);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed statusConciliacao order in glosar queries');
