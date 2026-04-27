import 'dotenv/config';
import { analisarPadroesTasyBi } from './server/padroesTasyBiService';

(async () => {
  try {
    console.log('Gerando padroes com medicos (Mat Ela: estab 2)...');
    await analisarPadroesTasyBi({ estabelecimentoId: 2, agrupamentoProfissional: true });
    console.log('Padroes Gerados!');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
