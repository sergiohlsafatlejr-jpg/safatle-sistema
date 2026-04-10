CREATE TABLE IF NOT EXISTS staging_faturamento_warleine (
  id INT AUTO_INCREMENT PRIMARY KEY,
  importacaoId INT,
  estabelecimentoId INT NOT NULL,
  numeroConta VARCHAR(100),
  numeroGuia VARCHAR(100),
  convenioNome VARCHAR(255),
  pacienteNome VARCHAR(255),
  codigoItem VARCHAR(100),
  descricaoItem TEXT,
  quantidade DECIMAL(12,4),
  valorUnitario DECIMAL(12,4),
  valorTotal DECIMAL(12,4),
  dataExecucao DATETIME,
  competencia VARCHAR(20),
  rawData JSON,
  processado BOOLEAN DEFAULT FALSE,
  criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staging_faturamento_omni (
  id INT AUTO_INCREMENT PRIMARY KEY,
  importacaoId INT,
  estabelecimentoId INT NOT NULL,
  numeroConta VARCHAR(100),
  numeroGuia VARCHAR(100),
  convenioNome VARCHAR(255),
  pacienteNome VARCHAR(255),
  codigoItem VARCHAR(100),
  descricaoItem TEXT,
  quantidade DECIMAL(12,4),
  valorUnitario DECIMAL(12,4),
  valorTotal DECIMAL(12,4),
  dataExecucao DATETIME,
  competencia VARCHAR(20),
  rawData JSON,
  processado BOOLEAN DEFAULT FALSE,
  criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staging_faturamento_promedico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  importacaoId INT,
  estabelecimentoId INT NOT NULL,
  numeroConta VARCHAR(100),
  numeroGuia VARCHAR(100),
  convenioNome VARCHAR(255),
  pacienteNome VARCHAR(255),
  codigoItem VARCHAR(100),
  descricaoItem TEXT,
  quantidade DECIMAL(12,4),
  valorUnitario DECIMAL(12,4),
  valorTotal DECIMAL(12,4),
  dataExecucao DATETIME,
  competencia VARCHAR(20),
  rawData JSON,
  processado BOOLEAN DEFAULT FALSE,
  criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staging_faturamento_easyvision (
  id INT AUTO_INCREMENT PRIMARY KEY,
  importacaoId INT,
  estabelecimentoId INT NOT NULL,
  numeroConta VARCHAR(100),
  numeroGuia VARCHAR(100),
  convenioNome VARCHAR(255),
  pacienteNome VARCHAR(255),
  codigoItem VARCHAR(100),
  descricaoItem TEXT,
  quantidade DECIMAL(12,4),
  valorUnitario DECIMAL(12,4),
  valorTotal DECIMAL(12,4),
  dataExecucao DATETIME,
  competencia VARCHAR(20),
  rawData JSON,
  processado BOOLEAN DEFAULT FALSE,
  criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
