import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Buscar estabelecimentos
    console.log('=== Estabelecimentos ===');
    const [estabelecimentos] = await conn.execute('SELECT id, nome FROM estabelecimentos');
    console.log(estabelecimentos);
    
    // Encontrar Instituto do Rim
    const institutoRim = estabelecimentos.find(e => 
      e.nome.toLowerCase().includes('rim') || 
      e.nome.toLowerCase().includes('instituto')
    );
    
    if (!institutoRim) {
      console.log('Instituto do Rim não encontrado!');
      console.log('Estabelecimentos disponíveis:', estabelecimentos.map(e => e.nome));
      return;
    }
    
    const estabelecimentoId = institutoRim.id;
    console.log(`\nEncontrado: ${institutoRim.nome} (ID: ${estabelecimentoId})`);
    
    // Contar registros antes da limpeza
    console.log('\n=== Registros antes da limpeza ===');
    
    const [arquivos] = await conn.execute(
      'SELECT COUNT(*) as count FROM arquivos WHERE estabelecimentoId = ?',
      [estabelecimentoId]
    );
    console.log(`Arquivos: ${arquivos[0].count}`);
    
    const [convenios] = await conn.execute(
      'SELECT COUNT(*) as count FROM convenios WHERE estabelecimentoId = ?',
      [estabelecimentoId]
    );
    console.log(`Convênios: ${convenios[0].count}`);
    
    const [tabelasPreco] = await conn.execute(
      'SELECT COUNT(*) as count FROM tabelasPreco WHERE estabelecimentoId = ?',
      [estabelecimentoId]
    );
    console.log(`Tabelas de Preço: ${tabelasPreco[0].count}`);
    
    const [regrasNegocio] = await conn.execute(
      'SELECT COUNT(*) as count FROM regrasNegocio WHERE estabelecimentoId = ?',
      [estabelecimentoId]
    );
    console.log(`Regras de Negócio: ${regrasNegocio[0].count}`);
    
    // Buscar IDs dos arquivos para limpar procedimentos, comparações, etc.
    const [arquivoIds] = await conn.execute(
      'SELECT id FROM arquivos WHERE estabelecimentoId = ?',
      [estabelecimentoId]
    );
    
    if (arquivoIds.length > 0) {
      const ids = arquivoIds.map(a => a.id);
      console.log(`\nArquivos a serem removidos: ${ids.join(', ')}`);
      
      // Contar procedimentos
      const [procedimentos] = await conn.execute(
        `SELECT COUNT(*) as count FROM procedimentos WHERE arquivo_id IN (${ids.join(',')})`
      );
      console.log(`Procedimentos: ${procedimentos[0].count}`);
      
      // Contar comparações
      const [comparacoes] = await conn.execute(
        `SELECT COUNT(*) as count FROM comparacoes WHERE arquivo_id IN (${ids.join(',')})`
      );
      console.log(`Comparações: ${comparacoes[0].count}`);
    }
    
    // Iniciar limpeza
    console.log('\n=== Iniciando limpeza ===');
    
    // 1. Remover divergências (dependem de comparações)
    if (arquivoIds.length > 0) {
      const ids = arquivoIds.map(a => a.id);
      const [compIds] = await conn.execute(
        `SELECT id FROM comparacoes WHERE arquivoId IN (${ids.join(',')})`
      );
      if (compIds.length > 0) {
        const comparacaoIds = compIds.map(c => c.id);
      await conn.execute(
        `DELETE FROM divergencias WHERE comparacaoId IN (${comparacaoIds.join(',')})`
      );
        console.log('Divergências removidas');
      }
      
      // 2. Remover comparações
      await conn.execute(
        `DELETE FROM comparacoes WHERE arquivoId IN (${ids.join(',')})`
      );
      console.log('Comparações removidas');
      
      // 3. Remover decisões de glosa (dependem de procedimentos)
      const [procIds] = await conn.execute(
        `SELECT id FROM procedimentos WHERE arquivoId IN (${ids.join(',')})`
      );
      if (procIds.length > 0) {
        const procedimentoIds = procIds.map(p => p.id);
      await conn.execute(
        `DELETE FROM decisoesGlosa WHERE procedimentoId IN (${procedimentoIds.join(',')})`
      );
        console.log('Decisões de glosa removidas');
      }
      
      // 4. Remover procedimentos
      await conn.execute(
        `DELETE FROM procedimentos WHERE arquivoId IN (${ids.join(',')})`
      );
      console.log('Procedimentos removidos');
      
      // 5. Remover itens manuais
      await conn.execute(
        `DELETE FROM itensManuals WHERE arquivoId IN (${ids.join(',')})`
      );
      console.log('Itens manuais removidos');
    }
    
    // 6. Remover arquivos
    await conn.execute(
      'DELETE FROM arquivos WHERE estabelecimentoId = ?',
      [estabelecimentoId]
    );
    console.log('Arquivos removidos');
    
    // 7. Remover recursos de glosa (dependem de convênios)
    const [convIds] = await conn.execute(
      'SELECT id FROM convenios WHERE estabelecimentoId = ?',
      [estabelecimentoId]
    );
    if (convIds.length > 0) {
      const convenioIds = convIds.map(c => c.id);
      await conn.execute(
        `DELETE FROM recursosGlosa WHERE convenioId IN (${convenioIds.join(',')})`
      );
      console.log('Recursos de glosa removidos');
      
      // Remover histórico de contestações
      await conn.execute(
        `DELETE FROM historicoContestacoes WHERE convenioId IN (${convenioIds.join(',')})`
      );
      console.log('Histórico de contestações removido');
      
      // Remover argumentos de convênio
      await conn.execute(
        `DELETE FROM argumentosConvenio WHERE convenioId IN (${convenioIds.join(',')})`
      );
      console.log('Argumentos de convênio removidos');
    }
    
    // 8. Remover convênios
    await conn.execute(
      'DELETE FROM convenios WHERE estabelecimentoId = ?',
      [estabelecimentoId]
    );
    console.log('Convênios removidos');
    
    // 9. Remover tabelas de preço
    await conn.execute(
      'DELETE FROM tabelasPreco WHERE estabelecimentoId = ?',
      [estabelecimentoId]
    );
    console.log('Tabelas de preço removidas');
    
    // 10. Remover regras de negócio
    await conn.execute(
      'DELETE FROM regrasNegocio WHERE estabelecimentoId = ?',
      [estabelecimentoId]
    );
    console.log('Regras de negócio removidas');
    
    // 11. Remover regras de conciliação (dependem de convênios)
    if (convIds.length > 0) {
      const convenioIds = convIds.map(c => c.id);
      await conn.execute(
        `DELETE FROM regrasConciliacao WHERE convenioId IN (${convenioIds.join(',')})`
      );
      console.log('Regras de conciliação removidas');
    }
    
    // 12. Remover permissões de estabelecimento
    await conn.execute(
      'DELETE FROM permissoesEstabelecimento WHERE estabelecimentoId = ?',
      [estabelecimentoId]
    );
    console.log('Permissões de estabelecimento removidas');
    
    console.log('\n=== Limpeza concluída! ===');
    console.log(`Todos os dados do estabelecimento "${institutoRim.nome}" foram removidos.`);
    console.log('O estabelecimento em si foi mantido, apenas os dados foram limpos.');
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await conn.end();
  }
}

main();
