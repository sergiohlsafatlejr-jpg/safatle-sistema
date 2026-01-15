import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const indexes = [
  // Procedimentos - tabela mais consultada
  'CREATE INDEX idx_procedimentos_arquivoId ON procedimentos(arquivoId)',
  'CREATE INDEX idx_procedimentos_codigo ON procedimentos(codigo)',
  'CREATE INDEX idx_procedimentos_guiaNumero ON procedimentos(guiaNumero)',
  'CREATE INDEX idx_procedimentos_pacienteNome ON procedimentos(pacienteNome(100))',
  'CREATE INDEX idx_procedimentos_dataExecucao ON procedimentos(dataExecucao)',
  'CREATE INDEX idx_procedimentos_createdAt ON procedimentos(createdAt)',
  
  // Arquivos
  'CREATE INDEX idx_arquivos_convenioId ON arquivos(convenioId)',
  'CREATE INDEX idx_arquivos_direcao ON arquivos(direcao)',
  'CREATE INDEX idx_arquivos_status ON arquivos(status)',
  'CREATE INDEX idx_arquivos_dataReferencia ON arquivos(dataReferencia)',
  'CREATE INDEX idx_arquivos_userId ON arquivos(userId)',
  'CREATE INDEX idx_arquivos_createdAt ON arquivos(createdAt)',
  'CREATE INDEX idx_arquivos_convenio_direcao ON arquivos(convenioId, direcao)',
  
  // Divergências
  'CREATE INDEX idx_divergencias_comparacaoId ON divergencias(comparacaoId)',
  'CREATE INDEX idx_divergencias_tipo ON divergencias(tipo)',
  'CREATE INDEX idx_divergencias_resolvido ON divergencias(resolvido)',
  
  // Recursos de Glosa
  'CREATE INDEX idx_recursosGlosa_convenioId ON recursosGlosa(convenioId)',
  'CREATE INDEX idx_recursosGlosa_status ON recursosGlosa(status)',
  'CREATE INDEX idx_recursosGlosa_userId ON recursosGlosa(userId)',
  'CREATE INDEX idx_recursosGlosa_prioridade ON recursosGlosa(prioridade)',
  
  // Comparações
  'CREATE INDEX idx_comparacoes_convenioId ON comparacoes(convenioId)',
  'CREATE INDEX idx_comparacoes_status ON comparacoes(status)',
  'CREATE INDEX idx_comparacoes_userId ON comparacoes(userId)',
];

console.log('Criando índices para melhorar performance...\n');

for (const sql of indexes) {
  try {
    await connection.execute(sql);
    console.log(`✓ ${sql.split(' ON ')[0].replace('CREATE INDEX ', '')}`);
  } catch (e) {
    if (e.code === 'ER_DUP_KEYNAME') {
      console.log(`- ${sql.split(' ON ')[0].replace('CREATE INDEX ', '')} (já existe)`);
    } else {
      console.log(`✗ Erro: ${e.message}`);
    }
  }
}

console.log('\nÍndices criados com sucesso!');
await connection.end();
