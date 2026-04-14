const fs = require('fs');
const file = 'C:/Users/sergi/OneDrive/Antigravity/safatle-sistema/client/src/components/bi/BITables.tsx';
let code = fs.readFileSync(file, 'utf8');

const newTable = `
export function TicketMedioTable({ data }: ConvenioTableProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          Ticket Médio por Convênio
        </CardTitle>
        <CardDescription>Quantidade de Diárias e Ticket Médio Faturado</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Convênio</TableHead>
                  <TableHead className="font-semibold text-right">Total Faturado</TableHead>
                  <TableHead className="font-semibold text-right">Qtd Diárias</TableHead>
                  <TableHead className="font-semibold text-right">Ticket Médio (Faturado / Diárias)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{item.chave}</TableCell>
                    <TableCell className="text-right">
                      R$ {item.valorFaturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{(item.diarias || 0).toLocaleString("pt-BR")}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      R$ {((item.ticketMedio || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}
`;

code += newTable;
fs.writeFileSync(file, code);
console.log("Append successful");
