#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Exportação Automática do Tasy para o Safatle Gerenciamento

Este script conecta no banco de dados Oracle do Tasy via VPN,
exporta os dados de materiais e honorários, e faz upload automático
para o sistema Safatle Gerenciamento.

Requisitos:
    pip install cx_Oracle requests python-dotenv

Configuração:
    1. Crie um arquivo .env na mesma pasta com as variáveis:
        TASY_HOST=seu_host_tasy
        TASY_PORT=1521
        TASY_SERVICE=nome_do_servico
        TASY_USER=seu_usuario
        TASY_PASSWORD=sua_senha
        SAFATLE_API_URL=https://seu-dominio.manus.space/api
        SAFATLE_API_KEY=sua_chave_api
        ESTABELECIMENTO_ID=1

    2. Agende a execução diária via Agendador de Tarefas (Windows) ou cron (Linux)

Uso:
    python exportar_tasy.py
    python exportar_tasy.py --data-inicio 2025-01-01 --data-fim 2025-12-31
"""

import os
import sys
import json
import sqlite3
import argparse
import logging
from datetime import datetime, timedelta
from pathlib import Path

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('exportar_tasy.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Tenta importar bibliotecas opcionais
try:
    import cx_Oracle
    HAS_ORACLE = True
except ImportError:
    HAS_ORACLE = False
    logger.warning("cx_Oracle não instalado. Instale com: pip install cx_Oracle")

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    logger.warning("requests não instalado. Instale com: pip install requests")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    logger.warning("python-dotenv não instalado. Usando variáveis de ambiente do sistema.")


# Configurações do ambiente
CONFIG = {
    'TASY_HOST': os.getenv('TASY_HOST', 'localhost'),
    'TASY_PORT': os.getenv('TASY_PORT', '1521'),
    'TASY_SERVICE': os.getenv('TASY_SERVICE', 'TASY'),
    'TASY_USER': os.getenv('TASY_USER', ''),
    'TASY_PASSWORD': os.getenv('TASY_PASSWORD', ''),
    'SAFATLE_API_URL': os.getenv('SAFATLE_API_URL', ''),
    'SAFATLE_API_KEY': os.getenv('SAFATLE_API_KEY', ''),
    'ESTABELECIMENTO_ID': int(os.getenv('ESTABELECIMENTO_ID', '1')),
}


# Query para materiais
QUERY_MATERIAIS = """
SELECT	
    D.DT_MESANO_REFERENCIA                  AS DATA_FATURADO,
    A.NR_DOC_CONVENIO 	   					AS GUIA,
    B.DS_CONVENIO                   		AS CONVENIO,
    A.NR_ATENDIMENTO 						AS ATENDIMENTO,
    C.NR_INTERNO_CONTA                      AS NR_INTERNO_CONTA,
    B.NM_PACIENTE 							AS PACIENTE,
    A.DT_CONTA 								AS DATA_CONTA,
    A.CD_MATERIAL                           AS CODIGO,
    F.DS_MATERIAL                    		AS DESCRICAO,
    A.QT_MATERIAL 							AS QUANTIDADE,
    A.CD_UNIDADE_MEDIDA 					AS UNIDADE,
    A.VL_UNITARIO                           AS VALOR_UNITARIO,
    A.VL_MATERIAL 					   		AS VALOR_TOTAL,
    L.DS_SETOR_ATENDIMENTO                  AS SETOR,
    D.NR_PROTOCOLO                          AS PROTOCOLO,
    D.IE_STATUS_PROTOCOLO                   AS STATUS_PROTOCOLO,
    A.NR_SEQUENCIA                          AS SEQUENCIA,
    'MATERIAL'                              AS TIPO
FROM 	TASY.MATERIAL_ATEND_PACIENTE A
LEFT JOIN 	TASY.CONTA_PACIENTE C
ON 			A.NR_INTERNO_CONTA=C.NR_INTERNO_CONTA
LEFT JOIN	TASY.ATENDIMENTO_PACIENTE_V B
ON 			C.NR_ATENDIMENTO=B.NR_ATENDIMENTO
LEFT JOIN 	TASY.PROTOCOLO_CONVENIO D
ON 			C.NR_SEQ_PROTOCOLO=D.NR_SEQ_PROTOCOLO
LEFT JOIN	TASY.MATERIAL F
ON 			A.CD_MATERIAL=F.CD_MATERIAL
LEFT JOIN 	TASY.SETOR_ATENDIMENTO L
ON 			A.CD_SETOR_ATENDIMENTO = L.CD_SETOR_ATENDIMENTO	
WHERE 	D.DT_MESANO_REFERENCIA BETWEEN TO_DATE(:data_inicio, 'DD/MM/YYYY') AND TO_DATE(:data_fim, 'DD/MM/YYYY')
AND A.CD_CONTA_CONTABIL IS NOT NULL 
AND A.QT_DEVOLVIDA IS NULL  
AND A.CD_MOTIVO_EXC_CONTA IS NULL
"""


# Query para honorários
QUERY_HONORARIOS = """
SELECT 
    C.DT_MESANO_REFERENCIA 			        AS DATA_FATURADO,
    A.NR_ATENDIMENTO 				        AS ATENDIMENTO,
    B.NR_INTERNO_CONTA                      AS NR_INTERNO_CONTA,
    D.NM_PACIENTE 					        AS PACIENTE,
    A.NR_DOC_CONVENIO                       AS GUIA,
    D.DS_CONVENIO                   	    AS CONVENIO, 
    A.NR_SEQ_PROTOCOLO                      AS PROTOCOLO,  
    A.QT_PROCEDIMENTO                       AS QUANTIDADE,
    A.DT_PROCEDIMENTO                       AS DATA_CONTA,
    A.NM_MEDICO                             AS MEDICO,
    A.DS_FUNCAO                             AS FUNCAO_MEDICO,
    A.NR_CRM                                AS CRM,
    A.DS_PROC_CONVENIO                      AS DESCRICAO, 
    A.CD_PROCEDIMENTO                       AS CODIGO, 
    A.DS_SETOR_ATENDIMENTO                  AS SETOR,
    A.CD_PROCEDIMENTO_CONVENIO              AS CODIGO_CONVENIO,
    A.VL_MEDICO                             AS VALOR_MEDICO,
    A.VL_PROCEDIMENTO                       AS VALOR_TOTAL,
    'HONORARIO'                             AS TIPO
FROM  TASY.PROTOCOLO_HONORARIO_V A
LEFT JOIN   TASY.CONTA_PACIENTE B
ON			A.NR_INTERNO_CONTA=B.NR_INTERNO_CONTA
LEFT JOIN   TASY.PROTOCOLO_CONVENIO C
ON			B.NR_SEQ_PROTOCOLO=C.NR_SEQ_PROTOCOLO
LEFT JOIN	TASY.ATENDIMENTO_PACIENTE_V D
ON 			B.NR_ATENDIMENTO=D.NR_ATENDIMENTO
WHERE   C.DT_MESANO_REFERENCIA BETWEEN TO_DATE(:data_inicio, 'DD/MM/YYYY') AND TO_DATE(:data_fim, 'DD/MM/YYYY')
"""


def conectar_tasy():
    """Conecta ao banco de dados Oracle do Tasy."""
    if not HAS_ORACLE:
        raise ImportError("cx_Oracle não está instalado. Execute: pip install cx_Oracle")
    
    dsn = cx_Oracle.makedsn(
        CONFIG['TASY_HOST'],
        CONFIG['TASY_PORT'],
        service_name=CONFIG['TASY_SERVICE']
    )
    
    logger.info(f"Conectando ao Tasy em {CONFIG['TASY_HOST']}:{CONFIG['TASY_PORT']}")
    
    connection = cx_Oracle.connect(
        user=CONFIG['TASY_USER'],
        password=CONFIG['TASY_PASSWORD'],
        dsn=dsn,
        encoding="UTF-8"
    )
    
    logger.info("Conexão estabelecida com sucesso!")
    return connection


def executar_query(connection, query, params):
    """Executa uma query e retorna os resultados como lista de dicionários."""
    cursor = connection.cursor()
    cursor.execute(query, params)
    
    columns = [col[0] for col in cursor.description]
    results = []
    
    for row in cursor:
        row_dict = {}
        for i, value in enumerate(row):
            # Converte datas para string
            if isinstance(value, datetime):
                value = value.strftime('%Y-%m-%d')
            # Converte Decimal para float
            elif hasattr(value, '__float__'):
                value = float(value)
            row_dict[columns[i]] = value
        results.append(row_dict)
    
    cursor.close()
    return results


def exportar_para_sqlite(materiais, honorarios, arquivo_saida):
    """Exporta os dados para um arquivo SQLite."""
    logger.info(f"Exportando {len(materiais)} materiais e {len(honorarios)} honorários para {arquivo_saida}")
    
    # Remove arquivo existente
    if os.path.exists(arquivo_saida):
        os.remove(arquivo_saida)
    
    conn = sqlite3.connect(arquivo_saida)
    cursor = conn.cursor()
    
    # Cria tabela unificada
    cursor.execute('''
        CREATE TABLE dados_tasy (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            atendimento TEXT NOT NULL,
            nr_interno_conta TEXT,
            sequencia TEXT,
            data_faturado TEXT,
            guia TEXT,
            convenio TEXT,
            paciente TEXT,
            data_conta TEXT,
            codigo TEXT,
            codigo_convenio TEXT,
            descricao TEXT,
            quantidade REAL,
            unidade TEXT,
            valor_unitario REAL,
            valor_total REAL,
            setor TEXT,
            protocolo TEXT,
            status_protocolo TEXT,
            tipo TEXT NOT NULL,
            medico TEXT,
            funcao_medico TEXT,
            crm TEXT,
            valor_medico REAL
        )
    ''')
    
    # Insere materiais
    for mat in materiais:
        cursor.execute('''
            INSERT INTO dados_tasy (
                atendimento, nr_interno_conta, sequencia, data_faturado, guia,
                convenio, paciente, data_conta, codigo, descricao,
                quantidade, unidade, valor_unitario, valor_total, setor,
                protocolo, status_protocolo, tipo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(mat.get('ATENDIMENTO', '')),
            str(mat.get('NR_INTERNO_CONTA', '')) if mat.get('NR_INTERNO_CONTA') else None,
            str(mat.get('SEQUENCIA', '')) if mat.get('SEQUENCIA') else None,
            mat.get('DATA_FATURADO'),
            str(mat.get('GUIA', '')) if mat.get('GUIA') else None,
            mat.get('CONVENIO'),
            mat.get('PACIENTE'),
            mat.get('DATA_CONTA'),
            str(mat.get('CODIGO', '')) if mat.get('CODIGO') else None,
            mat.get('DESCRICAO'),
            mat.get('QUANTIDADE'),
            mat.get('UNIDADE'),
            mat.get('VALOR_UNITARIO'),
            mat.get('VALOR_TOTAL'),
            mat.get('SETOR'),
            str(mat.get('PROTOCOLO', '')) if mat.get('PROTOCOLO') else None,
            mat.get('STATUS_PROTOCOLO'),
            'MATERIAL'
        ))
    
    # Insere honorários
    for hon in honorarios:
        cursor.execute('''
            INSERT INTO dados_tasy (
                atendimento, nr_interno_conta, data_faturado, guia,
                convenio, paciente, data_conta, codigo, codigo_convenio,
                descricao, quantidade, valor_total, setor,
                protocolo, tipo, medico, funcao_medico, crm, valor_medico
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(hon.get('ATENDIMENTO', '')),
            str(hon.get('NR_INTERNO_CONTA', '')) if hon.get('NR_INTERNO_CONTA') else None,
            hon.get('DATA_FATURADO'),
            str(hon.get('GUIA', '')) if hon.get('GUIA') else None,
            hon.get('CONVENIO'),
            hon.get('PACIENTE'),
            hon.get('DATA_CONTA'),
            str(hon.get('CODIGO', '')) if hon.get('CODIGO') else None,
            str(hon.get('CODIGO_CONVENIO', '')) if hon.get('CODIGO_CONVENIO') else None,
            hon.get('DESCRICAO'),
            hon.get('QUANTIDADE'),
            hon.get('VALOR_TOTAL'),
            hon.get('SETOR'),
            str(hon.get('PROTOCOLO', '')) if hon.get('PROTOCOLO') else None,
            'HONORARIO',
            hon.get('MEDICO'),
            hon.get('FUNCAO_MEDICO'),
            str(hon.get('CRM', '')) if hon.get('CRM') else None,
            hon.get('VALOR_MEDICO')
        ))
    
    conn.commit()
    
    # Verifica quantidade inserida
    cursor.execute('SELECT COUNT(*) FROM dados_tasy')
    total = cursor.fetchone()[0]
    logger.info(f"Total de {total} registros inseridos no SQLite")
    
    conn.close()
    return total


def fazer_upload_safatle(arquivo_sqlite):
    """Faz upload do arquivo SQLite para o Safatle Gerenciamento via API."""
    if not HAS_REQUESTS:
        raise ImportError("requests não está instalado. Execute: pip install requests")
    
    if not CONFIG['SAFATLE_API_URL'] or not CONFIG['SAFATLE_API_KEY']:
        logger.warning("API do Safatle não configurada. Upload ignorado.")
        return None
    
    logger.info(f"Fazendo upload para {CONFIG['SAFATLE_API_URL']}")
    
    # Lê o arquivo e converte para base64
    import base64
    with open(arquivo_sqlite, 'rb') as f:
        conteudo = base64.b64encode(f.read()).decode('utf-8')
    
    # Prepara o payload
    payload = {
        'estabelecimentoId': CONFIG['ESTABELECIMENTO_ID'],
        'nomeArquivo': os.path.basename(arquivo_sqlite),
        'tamanhoArquivo': os.path.getsize(arquivo_sqlite),
        'conteudoBase64': conteudo,
    }
    
    # Faz a requisição
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {CONFIG["SAFATLE_API_KEY"]}'
    }
    
    response = requests.post(
        f"{CONFIG['SAFATLE_API_URL']}/trpc/importacaoTasy.uploadAutomatico",
        json=payload,
        headers=headers,
        timeout=300
    )
    
    if response.status_code == 200:
        result = response.json()
        logger.info(f"Upload realizado com sucesso! ID: {result.get('result', {}).get('data', {}).get('id')}")
        return result
    else:
        logger.error(f"Erro no upload: {response.status_code} - {response.text}")
        raise Exception(f"Erro no upload: {response.status_code}")


def main():
    """Função principal."""
    parser = argparse.ArgumentParser(description='Exporta dados do Tasy para o Safatle Gerenciamento')
    parser.add_argument('--data-inicio', type=str, help='Data inicial (DD/MM/YYYY)', 
                        default=(datetime.now() - timedelta(days=30)).strftime('%d/%m/%Y'))
    parser.add_argument('--data-fim', type=str, help='Data final (DD/MM/YYYY)',
                        default=datetime.now().strftime('%d/%m/%Y'))
    parser.add_argument('--apenas-exportar', action='store_true', 
                        help='Apenas exporta para SQLite, sem fazer upload')
    parser.add_argument('--arquivo-saida', type=str, default='dados_tasy.db',
                        help='Nome do arquivo SQLite de saída')
    
    args = parser.parse_args()
    
    logger.info("=" * 60)
    logger.info("Iniciando exportação do Tasy")
    logger.info(f"Período: {args.data_inicio} a {args.data_fim}")
    logger.info("=" * 60)
    
    try:
        # Conecta ao Tasy
        connection = conectar_tasy()
        
        params = {
            'data_inicio': args.data_inicio,
            'data_fim': args.data_fim
        }
        
        # Busca materiais
        logger.info("Buscando materiais...")
        materiais = executar_query(connection, QUERY_MATERIAIS, params)
        logger.info(f"Encontrados {len(materiais)} materiais")
        
        # Busca honorários
        logger.info("Buscando honorários...")
        honorarios = executar_query(connection, QUERY_HONORARIOS, params)
        logger.info(f"Encontrados {len(honorarios)} honorários")
        
        # Fecha conexão
        connection.close()
        
        # Exporta para SQLite
        total = exportar_para_sqlite(materiais, honorarios, args.arquivo_saida)
        
        # Faz upload se não for apenas exportar
        if not args.apenas_exportar:
            fazer_upload_safatle(args.arquivo_saida)
        
        logger.info("=" * 60)
        logger.info(f"Exportação concluída! Total: {total} registros")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Erro durante a exportação: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
