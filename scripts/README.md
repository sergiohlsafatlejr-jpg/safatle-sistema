# Script de Exportação Automática do Tasy

Este script conecta no banco de dados Oracle do Tasy via VPN, exporta os dados de materiais e honorários, e faz upload automático para o sistema Safatle Gerenciamento.

## Requisitos

- Python 3.8 ou superior
- Acesso VPN ao servidor do Tasy
- Bibliotecas Python:

```bash
pip install cx_Oracle requests python-dotenv
```

**Nota:** Para o cx_Oracle funcionar, você também precisa instalar o Oracle Instant Client. Veja: https://cx-oracle.readthedocs.io/en/latest/user_guide/installation.html

## Configuração

1. Crie um arquivo `.env` na mesma pasta do script com as seguintes variáveis:

```
# Configurações de conexão com o Tasy (Oracle)
TASY_HOST=seu_host_tasy
TASY_PORT=1521
TASY_SERVICE=nome_do_servico
TASY_USER=seu_usuario
TASY_PASSWORD=sua_senha

# Configurações do Safatle Gerenciamento
SAFATLE_API_URL=https://seu-dominio.manus.space/api
SAFATLE_API_KEY=sua_chave_api
ESTABELECIMENTO_ID=1
```

2. Certifique-se de que a VPN está conectada antes de executar o script.

## Uso

### Exportação básica (últimos 30 dias)

```bash
python exportar_tasy.py
```

### Exportação com período específico

```bash
python exportar_tasy.py --data-inicio 01/01/2025 --data-fim 31/12/2025
```

### Apenas exportar para SQLite (sem upload)

```bash
python exportar_tasy.py --apenas-exportar
```

### Especificar arquivo de saída

```bash
python exportar_tasy.py --arquivo-saida meus_dados.db
```

## Agendamento Automático

### Windows (Agendador de Tarefas)

1. Abra o Agendador de Tarefas
2. Crie uma nova tarefa básica
3. Configure para executar diariamente no horário desejado
4. Ação: Iniciar um programa
5. Programa: `python`
6. Argumentos: `C:\caminho\para\exportar_tasy.py`
7. Iniciar em: `C:\caminho\para\pasta\do\script`

### Linux (cron)

```bash
# Edite o crontab
crontab -e

# Adicione a linha (executa todo dia às 6h)
0 6 * * * cd /caminho/para/script && /usr/bin/python3 exportar_tasy.py >> /var/log/exportar_tasy.log 2>&1
```

## Estrutura dos Dados

O script exporta duas categorias de dados:

### Materiais
- Medicamentos
- Materiais médicos
- Insumos

### Honorários
- Procedimentos médicos
- Consultas
- Exames

## Logs

O script gera um arquivo `exportar_tasy.log` com o histórico de execuções.

## Solução de Problemas

### Erro de conexão com o Tasy
- Verifique se a VPN está conectada
- Confirme as credenciais no arquivo .env
- Teste a conexão com o banco usando outro cliente Oracle

### Erro de upload para o Safatle
- Verifique se a URL da API está correta
- Confirme se a chave de API é válida
- Verifique se o estabelecimento_id existe no sistema

### cx_Oracle não encontrado
- Instale o Oracle Instant Client
- Adicione o caminho do Instant Client ao PATH do sistema
