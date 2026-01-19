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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando estabelecimentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white mb-4">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Safatle Gerenciamento
          </h1>
          <p className="text-gray-600 text-lg">
            Selecione o estabelecimento para continuar
          </p>
        </div>

        {/* Opção de visualizar todos os estabelecimentos */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] hover:border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 mb-6"
          onClick={() => handleSelecionar(TODOS_ESTABELECIMENTOS)}
        >
          <CardContent className="flex items-center gap-4 py-6">
            <div className="p-3 rounded-lg bg-purple-100">
              <LayoutGrid className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Dashboard Consolidado</h3>
              <p className="text-gray-600 text-sm">Visualizar dados de todos os estabelecimentos em um único painel</p>
            </div>
            <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100">
              Acessar
            </Button>
          </CardContent>
        </Card>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-gradient-to-br from-blue-50 to-indigo-100 px-4 text-gray-500">
              ou selecione um estabelecimento específico
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {estabelecimentos.map((estabelecimento) => (
            <Card
              key={estabelecimento.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] hover:border-blue-300 bg-white"
              onClick={() => handleSelecionar(estabelecimento)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Building2 className="h-6 w-6 text-blue-600" />
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
                <div className="flex items-start gap-2 text-sm text-gray-500 mb-4">
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
          <Card className="bg-white">
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum estabelecimento cadastrado
              </h3>
              <p className="text-gray-500">
                Entre em contato com o administrador para cadastrar estabelecimentos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
