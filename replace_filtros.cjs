const fs = require('fs');
const filepath = 'c:/Users/sergi/OneDrive/Antigravity/hospital_file_manager/client/src/pages/ConciliacaoCruzada.tsx';
let content = fs.readFileSync(filepath, 'utf8');
const lines = content.split('\n');

const replacementLines = `        <FiltrosConciliacao 
          competenciasAtivas={competenciasAtivas}
          conveniosAtivos={conveniosAtivos}
          lotesXml={lotesXml}
          lotesRetorno={lotesRetorno}
          competenciaFiltro={competenciaFiltro}
          setCompetenciaFiltro={setCompetenciaFiltro}
          convenioFiltro={convenioFiltro}
          setConvenioFiltro={setConvenioFiltro}
          statusFiltro={statusFiltro}
          setStatusFiltro={setStatusFiltro}
          loteXmlFiltro={loteXmlFiltro}
          setLoteXmlFiltro={setLoteXmlFiltro}
          loteXmlOpen={loteXmlOpen}
          setLoteXmlOpen={setLoteXmlOpen}
          loteRetornoFiltro={loteRetornoFiltro}
          setLoteRetornoFiltro={setLoteRetornoFiltro}
          loteRetornoOpen={loteRetornoOpen}
          setLoteRetornoOpen={setLoteRetornoOpen}
          buscaInput={buscaInput}
          setBuscaInput={setBuscaInput}
          filtroPrestador={filtroPrestador}
          setFiltroPrestador={setFiltroPrestador}
          setPaginaAtual={setPaginaAtual}
          setPaginaConciliados={setPaginaConciliados}
          setGuiaConciliadaSelecionada={setGuiaConciliadaSelecionada}
          abaAtiva={abaAtiva}
          formatarCompetencia={formatarCompetencia}
        />`.split('\n');

// Find the index of existing Filters block (starts at `<Card>` under `{/* Filtros */}`)
let startIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('      {/* Filtros */}')) {
    startIdx = i + 1; // Start replacing at `<Card>`
    break;
  }
}

if (startIdx !== -1) {
  let endIdx = -1;
  // Read until we match the exact end of the Card.
  let stack = 0;
  for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].includes('<Card>')) stack++;
    if (lines[i].includes('</Card>')) {
      stack--;
      if (stack === 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (endIdx !== -1) {
    const deleteCount = endIdx - startIdx + 1;
    lines.splice(startIdx, deleteCount, ...replacementLines);
    fs.writeFileSync(filepath, lines.join('\n'), 'utf8');
    console.log('Filtros replaced successfully: deleted ' + deleteCount + ' lines.');
  } else {
    console.log('Could not find end of Filtros block');
  }
} else {
  console.log('Could not find Filtros block');
}
