import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface ConvenioTableProps {
  data: Array<{
    chave: string;
    valorFaturado: number;
    valorRecebido: number;
    valorGlosado: number;
    quantidade: number;
  }>;
}

export function ConvenioTable({ data }: ConvenioTableProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          Dados por Convênio
        </CardTitle>
        <CardDescription>Listagem detalhada de valores por convênio</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Convênio</TableHead>
                  <TableHead className="font-semibold text-right">Faturado</TableHead>
                  <TableHead className="font-semibold text-right">Recebido</TableHead>
                  <TableHead className="font-semibold text-right">Glosado</TableHead>
                  <TableHead className="font-semibold text-center">Itens</TableHead>
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
                      R$ {item.valorRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      R$ {item.valorGlosado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{item.quantidade}</Badge>
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

interface GlosaTableProps {
  data: Array<{
    chave: string;
    quantidade: number;
    valor: number;
    percentual: number;
  }>;
}

export function GlosaTable({ data }: GlosaTableProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-red-600" />
          Glosas por Motivo
        </CardTitle>
        <CardDescription>Análise de motivos de glosa</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Motivo</TableHead>
                  <TableHead className="font-semibold text-right">Quantidade</TableHead>
                  <TableHead className="font-semibold text-right">Valor</TableHead>
                  <TableHead className="font-semibold text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 10).map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{item.chave}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{item.quantidade}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-amber-600 font-medium">{item.percentual}%</span>
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

interface DescricaoTableProps {
  data: Array<{
    chave: string;
    quantidade: number;
    valor: number;
  }>;
}

export function DescricaoTable({ data }: DescricaoTableProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Itens por Descrição
        </CardTitle>
        <CardDescription>Análise de itens faturados</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Descrição</TableHead>
                  <TableHead className="font-semibold text-right">Quantidade</TableHead>
                  <TableHead className="font-semibold text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 15).map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/50">
                    <TableCell className="font-medium truncate max-w-xs">{item.chave}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{item.quantidade}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
