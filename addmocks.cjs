const fs = require('fs');
let code = fs.readFileSync('server/db.ts', 'utf8');

const mocks = `
// TEMPORARY MOCKS FOR MISSING EXPORTS
export async function salvarNotificacaoAtendimento(data: any): Promise<number> {
  console.log("MOCK salvarNotificacaoAtendimento called", data);
  return 1;
}

export async function salvarNotificacoesAtendimentoEmLote(data: any[]): Promise<boolean> {
  console.log("MOCK salvarNotificacoesAtendimentoEmLote called", data.length);
  return true;
}

export async function buscarNotificacoesAtendimento(numatends: string[]): Promise<Record<string, { motivo: string }>> {
  return {};
}

export async function getHistoricoNotificacoesAtendimento(numatend: string): Promise<any[]> {
  return [];
}
`;

fs.writeFileSync('server/db.ts', code + '\n' + mocks);
console.log('Injected mocks');
