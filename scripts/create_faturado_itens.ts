import mysql from 'mysql2/promise';

async function run() {
  console.log("Criando tabela tasy_faturado_itens_bi via mysql2...");
  try {
    const connection = await mysql.createConnection("mysql://root:@localhost:3306/safatle_sistema?timezone=Z");
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`tasy_faturado_itens_bi\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`configId\` int NOT NULL,
        \`estabelecimentoId\` int NOT NULL,
        \`criadoEm\` timestamp DEFAULT CURRENT_TIMESTAMP,
        
        \`ESTABELECIMENTO\` text,
        \`SEQUENCIA\` text,
        \`CONVENIO\` text,
        \`PROD\` text,
        \`COMPETENCIA\` text,
        \`DT_REFERENCIA\` text,
        \`ENTREGA\` text,
        \`PROTOCOLO\` text,
        \`NR_PROTOCOLO\` text,
        \`NR_TITULO\` text,
        \`NM_USUARIO\` text,
        \`DT_ATUALIZACAO\` text,
        \`STATUS_PROT\` text,
        \`TIPO_PROT\` text,
        \`DOC_CONVENIO\` text,
        \`ATEND\` text,
        \`ENTRADA\` text,
        \`ST_ENTRADA\` text,
        \`CONTA\` text,
        \`AUTORIZACAO\` text,
        \`SENHA\` text,
        \`DT_INICIO\` text,
        \`DT_FIM\` text,
        \`ENCERRAMENTO\` text,
        \`MATRICULA\` text,
        \`PACIENTE\` text,
        \`CD_MOTIVO_EXC_CONTA\` text,
        \`DS_COMPL_MOTIVO_EXCON\` text,
        \`TIPO\` text,
        \`TIPO_ITEM\` text,
        \`SETOR\` text,
        \`PROF_EXEC\` text,
        \`CRM\` text,
        \`CD_ITEM\` text,
        \`CD_ITEM_TUSS\` text,
        \`DT_ITEM\` text,
        \`DESCRICAO\` text,
        \`CREDITO\` text,
        \`QTD\` text,
        \`VL_PRODUZIDO\` text,
        \`VL_MEDICO\` text,
        \`A_RECEBER\` text,
        \`VL_PAGO\` text,
        \`VL_GLOSA\` text,
        \`VL_AMAIOR\` text,
        \`T_RECEB\` text,
        \`MOTIVO_GLOSA\` text,
        \`RETORNO\` text,
        \`PGTO\` text,
        \`DT_PGTO\` text,
        CONSTRAINT \`tasy_faturado_itens_bi_id\` PRIMARY KEY (\`id\`)
      );
    `);
    console.log("Tabela recriada com sucesso!");
    await connection.end();
  } catch (err) {
    console.error("Erro ao criar tabela:", err);
  }
  process.exit(0);
}

run();
