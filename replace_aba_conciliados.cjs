const fs = require('fs');
const filepath = 'c:/Users/sergi/OneDrive/Antigravity/hospital_file_manager/client/src/pages/ConciliacaoCruzada.tsx';
let content = fs.readFileSync(filepath, 'utf8');
const lines = content.split('\n');

// The replacement text
const replacementLines = `          {/* ==================== ABA CONCILIADOS ==================== */}
          <TabsContent value="conciliados" className="space-y-4 mt-4">
            <AbaConciliados 
              guiaConciliadaSelecionada={guiaConciliadaSelecionada}
              setGuiaConciliadaSelecionada={setGuiaConciliadaSelecionada}
              itensConciliadosGuia={itensConciliadosGuia}
              isLoadingItensConciliados={isLoadingItensConciliados}
              modoGlosa={modoGlosa}
              setModoGlosa={setModoGlosa}
              setModalGlosaAberto={setModalGlosaAberto}
              itensSelecionadosGlosa={itensSelecionadosGlosa}
              setItensSelecionadosGlosa={setItensSelecionadosGlosa}
              reverterGlosaMut={reverterGlosaMut}
              resumoConciliados={resumoConciliados}
              dadosGuiasConciliadas={dadosGuiasConciliadas}
              guiasConciliadas={guiasConciliadas}
              isLoadingGuiasConciliadas={isLoadingGuiasConciliadas}
              exportarConciliadosExcel={exportarConciliadosExcel}
              paginaConciliados={paginaConciliados}
              setPaginaConciliados={setPaginaConciliados}
              totalPaginasConciliados={totalPaginasConciliados}
              estabelecimentoId={estabelecimentoId}
              formatarMoeda={formatarMoeda}
              formatarCompetencia={formatarCompetencia}
              formatDateBR={formatDateBR}
              getStatusBadge={getStatusBadge}
              getMetodoBadge={getMetodoBadge}
              isTerceiro={isTerceiro}
            />
          </TabsContent>`.split('\n');

// Array.splice(start, deleteCount, ...items)
// Line 810 is index 809.
// From 810 to 1297 is 1297 - 810 + 1 = 488 lines.
lines.splice(809, 488, ...replacementLines);

fs.writeFileSync(filepath, lines.join('\n'), 'utf8');
console.log('File updated successfully.');
