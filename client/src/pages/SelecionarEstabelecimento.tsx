import { Building2, MapPin, FileText, LayoutGrid } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEstabelecimento, Estabelecimento, TODOS_ESTABELECIMENTOS } from "@/contexts/EstabelecimentoContext";
import { useLocation } from "wouter";

export default function SelecionarEstabelecimento() {
  const { estabelecimentos, setEstabelecimentoAtual, isLoading } = useEstabelecimento();
  const [, setLocation] = useLocation();

  const handleSelecionar = (estabelecimento: Estabelecimento) => {
    setEstabelecimentoAtual(estabelecimento);
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando estabelecimentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <img 
            src="/safatle-logo.png" 
            alt="Safatle Logo" 
            className="w-20 h-20 mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Safatle Gerenciamento
          </h1>
          <p className="text-muted-foreground text-lg">
            Selecione o estabelecimento para continuar
          </p>
        </div>

        {/* Opção de visualizar todos os estabelecimentos */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] hover:border-destructive/50 bg-gradient-to-r from-destructive/5 to-destructive/10 border-destructive/30 mb-6"
          onClick={() => handleSelecionar(TODOS_ESTABELECIMENTOS)}
        >
          <CardContent className="flex items-center gap-4 py-6">
            <div className="p-3 rounded-lg bg-destructive/10">
              <LayoutGrid className="h-8 w-8 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">Dashboard Consolidado</h3>
              <p className="text-muted-foreground text-sm">Visualizar dados de todos os estabelecimentos em um único painel</p>
            </div>
            <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
              Acessar
            </Button>
          </CardContent>
        </Card>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-gradient-to-br from-background to-secondary px-4 text-muted-foreground">
              ou selecione um estabelecimento específico
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {estabelecimentos.map((estabelecimento) => (
            <Card
              key={estabelecimento.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 bg-card"
              onClick={() => handleSelecionar(estabelecimento)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{estabelecimento.nome}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <FileText className="h-3 w-3" />
                        {estabelecimento.cnpj || "CNPJ não informado"}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{estabelecimento.endereco || "Endereço não informado"}</span>
                </div>
                <Button className="w-full" variant="outline">
                  Selecionar este estabelecimento
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {estabelecimentos.length === 0 && (
          <Card className="bg-card">
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum estabelecimento cadastrado
              </h3>
              <p className="text-muted-foreground">
                Entre em contato com o administrador para cadastrar estabelecimentos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
