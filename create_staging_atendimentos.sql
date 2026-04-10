CREATE TABLE IF NOT EXISTS staging_atendimento_warleine (
  id INT AUTO_INCREMENT PRIMARY KEY,
  importacaoId INT,
  estabelecimentoId INT NOT NULL,
  numeroAtendimento VARCHAR(100),
  pacienteNome VARCHAR(255),
  convenioNome VARCHAR(255),
  dataEntrada DATETIME,
  dataSaida DATETIME,
  tipoAtendimento VARCHAR(50),
  codigoProcedimento VARCHAR(500),
  rawData JSON,
  processado BOOLEAN DEFAULT FALSE,
  criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staging_atendimento_omni (
  id INT AUTO_INCREMENT PRIMARY KEY,
  importacaoId INT,
  estabelecimentoId INT NOT NULL,
  numeroAtendimento VARCHAR(100),
  pacienteNome VARCHAR(255),
  convenioNome VARCHAR(255),
  dataEntrada DATETIME,
  dataSaida DATETIME,
  tipoAtendimento VARCHAR(50),
  codigoProcedimento VARCHAR(500),
  rawData JSON,
  processado BOOLEAN DEFAULT FALSE,
  criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staging_atendimento_promedico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  importacaoId INT,
  estabelecimentoId INT NOT NULL,
  numeroAtendimento VARCHAR(100),
  pacienteNome VARCHAR(255),
  convenioNome VARCHAR(255),
  dataEntrada DATETIME,
  dataSaida DATETIME,
  tipoAtendimento VARCHAR(50),
  codigoProcedimento VARCHAR(500),
  rawData JSON,
  processado BOOLEAN DEFAULT FALSE,
  criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staging_atendimento_easyvision (
  id INT AUTO_INCREMENT PRIMARY KEY,
  importacaoId INT,
  estabelecimentoId INT NOT NULL,
  numeroAtendimento VARCHAR(100),
  pacienteNome VARCHAR(255),
  convenioNome VARCHAR(255),
  dataEntrada DATETIME,
  dataSaida DATETIME,
  tipoAtendimento VARCHAR(50),
  codigoProcedimento VARCHAR(500),
  rawData JSON,
  processado BOOLEAN DEFAULT FALSE,
  criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staging_atendimento_tasy (
  id INT AUTO_INCREMENT PRIMARY KEY,
  importacaoId INT,
  estabelecimentoId INT NOT NULL,
  numeroAtendimento VARCHAR(100),
  pacienteNome VARCHAR(255),
  convenioNome VARCHAR(255),
  dataEntrada DATETIME,
  dataSaida DATETIME,
  tipoAtendimento VARCHAR(50),
  codigoProcedimento VARCHAR(500),
  rawData JSON,
  processado BOOLEAN DEFAULT FALSE,
  criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
