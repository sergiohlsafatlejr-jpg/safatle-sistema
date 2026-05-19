import XLSX from 'xlsx';
import m from 'mysql2/promise';

async function run() {
  const c = await m.createConnection(process.env.DATABASE_URL);
  const wb = XLSX.readFile('./uploads/kp_dzTlVCcUGQig62tkFr-safatle_-_folha_pagamento_2026.xlsx.xlsx');
  const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('cargos'));
  if (!sheetName) return console.log('No cargos sheet');
  const sheet = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  let currentGroup = '';
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    let cargoStr = row[0];
    let subcargo = row[1];
    let valStr = row[2];
    if (cargoStr && typeof cargoStr === 'string' && cargoStr.trim() !== '' && !subcargo) {
      currentGroup = cargoStr.trim();
      continue;
    }
    if (!cargoStr && currentGroup) cargoStr = currentGroup;
    if (!cargoStr || !subcargo || !valStr) continue;
    let fullCargo = `${cargoStr.trim()} ${subcargo.trim()}`;
    let val = typeof valStr === 'number' ? valStr : parseFloat(valStr.toString().replace(/[^0-9,.-]/g, '').replace(',', '.'));
    if (!isNaN(val)) {
      // Find all matching in DB
      const [rows] = await c.query('SELECT cargo FROM rh_cargos_salarios WHERE cargo LIKE ? AND salarioBase IS NULL', [`%${subcargo.trim()}%`]);
      for (const dbRow of rows) {
        if (dbRow.cargo.toLowerCase().includes(cargoStr.trim().toLowerCase()) || cargoStr.trim().toLowerCase().includes('auxiliar') && dbRow.cargo.toLowerCase().includes('aux')) {
            await c.query('UPDATE rh_cargos_salarios SET salarioBase = ? WHERE cargo = ?', [val, dbRow.cargo]);
            console.log('Updated', dbRow.cargo, val);
        }
      }
    }
  }
  c.end();
  console.log('Done');
}

run().catch(console.error);
