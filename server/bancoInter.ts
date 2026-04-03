/**
 * Integração com a API do Banco Inter
 * 
 * Endpoints:
 * - OAuth2 Token: POST /oauth/v2/token
 * - Saldo: GET /banking/v2/saldo
 * - Extrato: GET /banking/v2/extrato
 * - Extrato Completo: GET /banking/v2/extrato/completo
 * - Extrato PDF: GET /banking/v2/extrato/exportar
 * 
 * Autenticação: OAuth2 Client Credentials com mTLS
 * Rate limit: 10 chamadas/minuto (banking), 5 chamadas/minuto (token)
 */

import https from "https";
import fs from "fs";
import path from "path";
import axios from "axios";

// Cache do token OAuth2
let tokenCache: { token: string; expiresAt: number } | null = null;

function getInterConfig() {
  const clientId = process.env.INTER_CLIENT_ID;
  const clientSecret = process.env.INTER_CLIENT_SECRET;
  let certPem = process.env.INTER_CERT_PEM; // Certificado .crt em PEM
  let keyPem = process.env.INTER_KEY_PEM;   // Chave .key em PEM
  const contaCorrente = process.env.INTER_CONTA_CORRENTE;
  const baseUrl = process.env.INTER_BASE_URL || "https://cdpj.partners.bancointer.com.br";

  // Tenta ler dos arquivos na raiz do projeto caso as variáveis não estejam preenchidas
  if (!certPem) {
    const certPath = path.join(process.cwd(), "Inter API_Certificado.crt");
    if (fs.existsSync(certPath)) certPem = fs.readFileSync(certPath, "utf-8");
  }
  if (!keyPem) {
    const keyPath = path.join(process.cwd(), "Inter API_Chave.key");
    if (fs.existsSync(keyPath)) keyPem = fs.readFileSync(keyPath, "utf-8");
  }

  return { clientId, clientSecret, certPem, keyPem, contaCorrente, baseUrl };
}

function isConfigured(): boolean {
  const { clientId, clientSecret, certPem, keyPem } = getInterConfig();
  return !!(clientId && clientSecret && certPem && keyPem);
}

function createHttpsAgent() {
  const { certPem, keyPem } = getInterConfig();
  if (!certPem || !keyPem) {
    throw new Error("Certificado mTLS do Banco Inter não configurado");
  }
  return new https.Agent({
    cert: certPem,
    key: keyPem,
    rejectUnauthorized: true,
  });
}

async function getAccessToken(): Promise<string> {
  // Retorna token do cache se ainda válido (com margem de 5 min)
  if (tokenCache && tokenCache.expiresAt > Date.now() + 300000) {
    return tokenCache.token;
  }

  const { clientId, clientSecret, baseUrl } = getInterConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Client ID e Client Secret do Banco Inter não configurados");
  }

  const agent = createHttpsAgent();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "extrato.read saldo.read boleto-cobranca.read boleto-cobranca.write",
  });

  const response = await axios.post(`${baseUrl}/oauth/v2/token`, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    httpsAgent: agent,
    validateStatus: () => true, // resolve promise for any status code
  });

  if (response.status !== 200) {
    const errorText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    throw new Error(`Erro ao obter token Inter: ${response.status} - ${errorText}`);
  }

  const data = response.data as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return tokenCache.token;
}

async function interRequest(
  path: string,
  options?: {
    method?: string;
    params?: Record<string, string>;
    body?: any;
  }
): Promise<any> {
  const { baseUrl, contaCorrente } = getInterConfig();
  const token = await getAccessToken();
  const agent = createHttpsAgent();
  const method = options?.method || "GET";

  const url = new URL(`${baseUrl}${path}`);
  if (options?.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (contaCorrente) {
    headers["x-conta-corrente"] = contaCorrente;
  }

  const fetchOptions: any = {
    method: method as any,
    url: url.toString(),
    headers,
    httpsAgent: agent,
    validateStatus: () => true, // resolve all status codes
  };
  if (options?.body && method !== "GET") {
    fetchOptions.data = options.body;
  }

  const response = await axios(fetchOptions);

  if (response.status < 200 || response.status >= 300) {
    const errorText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    throw new Error(`Erro API Inter (${path}): ${response.status} - ${errorText}`);
  }

  // Some endpoints return 202 with no body
  return response.data || { status: response.status };
}

// ==================== FUNÇÕES PÚBLICAS ====================

export async function consultarSaldo() {
  if (!isConfigured()) {
    return { configured: false, message: "API do Banco Inter não configurada. Configure as credenciais em Configurações." };
  }
  try {
    const data = await interRequest("/banking/v2/saldo");
    return { configured: true, ...data };
  } catch (error: any) {
    return { configured: true, error: error.message };
  }
}

export async function consultarExtrato(dataInicio: string, dataFim: string) {
  if (!isConfigured()) {
    return { configured: false, message: "API do Banco Inter não configurada." };
  }
  try {
    const data = await interRequest("/banking/v2/extrato", { params: { dataInicio, dataFim } });
    return { configured: true, ...data };
  } catch (error: any) {
    return { configured: true, error: error.message };
  }
}

export async function consultarExtratoCompleto(
  dataInicio: string,
  dataFim: string,
  pagina?: number,
  tamanhoPagina?: number
) {
  if (!isConfigured()) {
    return { configured: false, message: "API do Banco Inter não configurada." };
  }
  try {
    const params: Record<string, string> = { dataInicio, dataFim };
    if (pagina !== undefined) params.pagina = String(pagina);
    if (tamanhoPagina !== undefined) params.tamanhoPagina = String(tamanhoPagina);
    const data = await interRequest("/banking/v2/extrato/completo", { params });
    return { configured: true, ...data };
  } catch (error: any) {
    return { configured: true, error: error.message };
  }
}

export async function exportarExtratoPdf(dataInicio: string, dataFim: string) {
  if (!isConfigured()) {
    return { configured: false, message: "API do Banco Inter não configurada." };
  }
  try {
    const data = await interRequest("/banking/v2/extrato/exportar", { params: { dataInicio, dataFim } });
    return { configured: true, ...data };
  } catch (error: any) {
    return { configured: true, error: error.message };
  }
}

export function getInterStatus() {
  const config = getInterConfig();
  return {
    configured: isConfigured(),
    hasClientId: !!config.clientId,
    hasClientSecret: !!config.clientSecret,
    hasCert: !!config.certPem,
    hasKey: !!config.keyPem,
    contaCorrente: config.contaCorrente || null,
    baseUrl: config.baseUrl,
  };
}

// ==================== COBRANÇA (BOLETO COM PIX) ====================

export interface PagadorBoleto {
  cpfCnpj: string;
  tipoPessoa: "FISICA" | "JURIDICA";
  nome: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  email?: string;
  ddd?: string;
  telefone?: string;
  numero?: string;
  complemento?: string;
}

export interface EmitirBoletoInput {
  seuNumero: string;
  valorNominal: number;
  dataVencimento: string; // YYYY-MM-DD
  numDiasAgenda: number; // 0-60
  pagador: PagadorBoleto;
  desconto?: {
    taxa: number;
    codigo: "PERCENTUALDATAINFORMADA" | "VALORFIXODATAINFORMADA";
    quantidadeDias: number;
  };
  multa?: {
    taxa: number;
    codigo: "PERCENTUAL" | "VALORFIXO";
  };
  mora?: {
    taxa: number;
    codigo: "TAXAMENSAL" | "VALORFIXO";
  };
  mensagem?: {
    linha1?: string;
    linha2?: string;
    linha3?: string;
    linha4?: string;
    linha5?: string;
  };
  formasRecebimento?: ("BOLETO" | "PIX")[];
}

export async function emitirBoleto(input: EmitirBoletoInput) {
  if (!isConfigured()) {
    return { configured: false, message: "API do Banco Inter não configurada. Configure as credenciais em Configurações." };
  }
  try {
    const data = await interRequest("/cobranca/v3/cobrancas", {
      method: "POST",
      body: {
        seuNumero: input.seuNumero,
        valorNominal: input.valorNominal,
        dataVencimento: input.dataVencimento,
        numDiasAgenda: input.numDiasAgenda,
        pagador: input.pagador,
        ...(input.desconto && { desconto: input.desconto }),
        ...(input.multa && { multa: input.multa }),
        ...(input.mora && { mora: input.mora }),
        ...(input.mensagem && { mensagem: input.mensagem }),
        formasRecebimento: input.formasRecebimento || ["BOLETO", "PIX"],
      },
    });
    return { configured: true, ...data };
  } catch (error: any) {
    return { configured: true, error: error.message };
  }
}

export async function consultarBoleto(codigoSolicitacao: string) {
  if (!isConfigured()) {
    return { configured: false, message: "API do Banco Inter não configurada." };
  }
  try {
    const data = await interRequest(`/cobranca/v3/cobrancas/${codigoSolicitacao}`);
    return { configured: true, ...data };
  } catch (error: any) {
    return { configured: true, error: error.message };
  }
}

export async function listarBoletos(
  dataInicial: string,
  dataFinal: string,
  situacao?: string,
  pagina?: number,
  itensPorPagina?: number
) {
  if (!isConfigured()) {
    return { configured: false, message: "API do Banco Inter não configurada." };
  }
  try {
    const params: Record<string, string> = { dataInicial, dataFinal };
    if (situacao) params.situacao = situacao;
    if (pagina !== undefined) params["paginacao.paginaAtual"] = String(pagina);
    if (itensPorPagina !== undefined) params["paginacao.itensPorPagina"] = String(itensPorPagina);
    const data = await interRequest("/cobranca/v3/cobrancas", { params });
    return { configured: true, ...data };
  } catch (error: any) {
    return { configured: true, error: error.message };
  }
}

export async function downloadBoletoPdf(codigoSolicitacao: string) {
  if (!isConfigured()) {
    return { configured: false, message: "API do Banco Inter não configurada." };
  }
  try {
    const data = await interRequest(`/cobranca/v3/cobrancas/${codigoSolicitacao}/pdf`);
    return { configured: true, ...data };
  } catch (error: any) {
    return { configured: true, error: error.message };
  }
}

export async function cancelarBoleto(codigoSolicitacao: string, motivoCancelamento: string) {
  if (!isConfigured()) {
    return { configured: false, message: "API do Banco Inter não configurada." };
  }
  try {
    const data = await interRequest(`/cobranca/v3/cobrancas/${codigoSolicitacao}/cancelar`, {
      method: "POST",
      body: { motivoCancelamento },
    });
    return { configured: true, ...data };
  } catch (error: any) {
    return { configured: true, error: error.message };
  }
}

export async function sumarioBoletos(dataInicial: string, dataFinal: string) {
  if (!isConfigured()) {
    return { configured: false, message: "API do Banco Inter não configurada." };
  }
  try {
    const data = await interRequest("/cobranca/v3/cobrancas/sumario", {
      params: { dataInicial, dataFinal },
    });
    return { configured: true, ...data };
  } catch (error: any) {
    return { configured: true, error: error.message };
  }
}
