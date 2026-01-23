# Script de Exportação Automática do Tasy

Este script conecta no banco de dados Oracle do Tasy via VPN, exporta os dados de materiais e honorários, e faz upload automático para o sistema Safatle Gerenciamento.

## Pré-requisitos

### 1. Python 3.8 ou superior
Verifique se o Python está instalado:
```bash
python --version
```

### 2. Oracle Instant Client
O script precisa do Oracle Instant Client para conectar ao Tasy.

**Windows:**
1. Baixe o Oracle Instant Client Basic em: https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html
2. Extraia para uma pasta (ex: `C:\oracle\instantclient_21_3`)
3. Adicione a pasta ao PATH do sistema

**Linux:**
```bash
sudo apt-get install libaio1
# Baixe e extraia o Instant Client
export LD_LIBRARY_PATH=/opt/oracle/instantclient_21_3:$LD_LIBRARY_PATH
```

### 3. Bibliotecas Python
```bash
pip install cx_Oracle requests python-dotenv
```

## Configuração

### 1. Criar arquivo .env

Crie um arquivo chamado `.env` na mesma pasta do script com as seguintes variáveis:

```env
# Configurações do Tasy (Oracle)
TASY_HOST=192.168.1.100
TASY_PORT=1521
TASY_SERVICE=TASY
TASY_USER=seu_usuario
TASY_PASSWORD=sua_senha

# Configurações do Safatle Gerenciamento
SAFATLE_API_URL=https://seu-dominio.manus.space/api
SAFATLE_API_KEY=sk_live_sua_chave_aqui

# ID do Estabelecimento no Safatle
# IMPORTANTE: Este ID deve corresponder ao estabelecimento cadastrado no sistema
ESTABELECIMENTO_ID=1
```

### 2. Obter a Chave de API

1. Acesse o Safatle Gerenciamento
2. Vá em **Configurações** > **Chaves de API**
3. Clique em **Gerar Nova Chave**
4. Dê um nome descritivo (ex: "Exportação Tasy - Hospital X")
5. Selecione os estabelecimentos permitidos
6. Copie a chave gerada (ela só será exibida uma vez!)

### 3. Identificar o ID do Estabelecimento

1. Acesse o Safatle Gerenciamento
2. Na tela inicial, passe o mouse sobre o estabelecimento desejado
3. O ID aparece na URL ao clicar (ex: `/dashboard?estabelecimento=1`)
4. Ou acesse **Configurações** > **Estabelecimentos** para ver a lista completa

## Uso

### Execução Manual

```bash
# Exporta os últimos 30 dias (padrão)
python exportar_tasy.py

# Exporta um período específico
python exportar_tasy.py --data-inicio 01/01/2025 --data-fim 31/12/2025

# Exporta para um estabelecimento específico (sobrescreve o .env)
python exportar_tasy.py --estabelecimento 2

# Apenas exporta para SQLite, sem fazer upload
python exportar_tasy.py --apenas-exportar

# Valida a configuração sem executar
python exportar_tasy.py --validar
```

### Parâmetros Disponíveis

| Parâmetro | Descrição | Padrão |
|-----------|-----------|--------|
| `--data-inicio` | Data inicial no formato DD/MM/YYYY | 30 dias atrás |
| `--data-fim` | Data final no formato DD/MM/YYYY | Hoje |
| `--estabelecimento` | ID do estabelecimento (sobrescreve .env) | Valor do .env |
| `--apenas-exportar` | Não faz upload, apenas gera o SQLite | False |
| `--arquivo-saida` | Nome do arquivo SQLite | dados_tasy.db |
| `--validar` | Apenas valida a configuração | False |

## Agendamento Automático

### Windows (Agendador de Tarefas)

1. Abra o **Agendador de Tarefas** (Task Scheduler)
2. Clique em **Criar Tarefa Básica**
3. Configure:
   - Nome: "Exportação Tasy para Safatle"
   - Disparador: Diariamente, às 06:00 (ou horário desejado)
   - Ação: Iniciar um programa
   - Programa: `python`
   - Argumentos: `C:\caminho\para\exportar_tasy.py`
   - Iniciar em: `C:\caminho\para\scripts`

### Linux (Cron)

```bash
# Editar crontab
crontab -e

# Adicionar linha para executar diariamente às 6h
0 6 * * * cd /caminho/para/scripts && /usr/bin/python3 exportar_tasy.py >> /var/log/exportar_tasy.log 2>&1
```

## Múltiplos Estabelecimentos

Se você precisa exportar dados de múltiplos estabelecimentos, há duas opções:

### Opção 1: Múltiplos arquivos .env

Crie arquivos .env separados para cada estabelecimento:
- `.env.hospital1`
- `.env.hospital2`

E execute com:
```bash
# Linux/Mac
DOTENV_PATH=.env.hospital1 python exportar_tasy.py
DOTENV_PATH=.env.hospital2 python exportar_tasy.py

# Windows (PowerShell)
$env:DOTENV_PATH=".env.hospital1"; python exportar_tasy.py
$env:DOTENV_PATH=".env.hospital2"; python exportar_tasy.py
```

### Opção 2: Parâmetro --estabelecimento

Use o mesmo .env mas especifique o estabelecimento:
```bash
python exportar_tasy.py --estabelecimento 1
python exportar_tasy.py --estabelecimento 2
```

## Logs e Monitoramento

O script gera um arquivo de log `exportar_tasy.log` na mesma pasta, contendo:
- Data/hora de cada execução
- Quantidade de registros exportados
- Erros encontrados (se houver)
- Status do upload

### Exemplo de Log
```
2025-01-23 06:00:01 - INFO - ============================================================
2025-01-23 06:00:01 - INFO - Exportação do Tasy para Safatle Gerenciamento
2025-01-23 06:00:01 - INFO - ============================================================
2025-01-23 06:00:01 - INFO - Estabelecimento ID: 1
2025-01-23 06:00:01 - INFO - Período: 24/12/2024 a 23/01/2025
2025-01-23 06:00:02 - INFO - Conectando ao Tasy em 192.168.1.100:1521
2025-01-23 06:00:03 - INFO - Conexão estabelecida com sucesso!
2025-01-23 06:00:03 - INFO - Buscando materiais...
2025-01-23 06:00:15 - INFO - Encontrados 45.230 materiais
2025-01-23 06:00:15 - INFO - Buscando honorários...
2025-01-23 06:00:28 - INFO - Encontrados 12.450 honorários
2025-01-23 06:00:30 - INFO - Total de 57.680 registros inseridos no SQLite
2025-01-23 06:00:31 - INFO - Fazendo upload para https://safatle.manus.space/api
2025-01-23 06:01:45 - INFO - Upload realizado com sucesso! ID: 123
```

## Solução de Problemas

### Erro: "cx_Oracle não instalado"
```bash
pip install cx_Oracle
```
Se continuar com erro, verifique se o Oracle Instant Client está instalado e no PATH.

### Erro: "ORA-12154: TNS:could not resolve the connect identifier"
Verifique:
- TASY_HOST está correto
- TASY_PORT está correto (geralmente 1521)
- TASY_SERVICE está correto
- A VPN está conectada

### Erro: "ORA-01017: invalid username/password"
Verifique:
- TASY_USER está correto
- TASY_PASSWORD está correto
- O usuário tem permissão de leitura nas tabelas

### Erro: "401 Unauthorized" no upload
Verifique:
- SAFATLE_API_KEY está correta
- A chave não expirou
- A chave tem permissão para o estabelecimento

### Erro: "Estabelecimento não encontrado"
Verifique:
- ESTABELECIMENTO_ID corresponde a um estabelecimento cadastrado
- A chave de API tem permissão para esse estabelecimento

## Segurança

- **Nunca compartilhe** o arquivo .env ou a chave de API
- **Não commite** o arquivo .env no Git (adicione ao .gitignore)
- **Rotacione** as chaves de API periodicamente
- **Revogue** chaves não utilizadas no painel do Safatle

## Suporte

Em caso de dúvidas ou problemas:
1. Verifique os logs em `exportar_tasy.log`
2. Execute com `--validar` para verificar a configuração
3. Entre em contato com o suporte do Safatle Gerenciamento
