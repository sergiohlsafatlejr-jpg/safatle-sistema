import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

export interface Estabelecimento {
  id: number;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  ativo: string;
}

// Estabelecimento virtual para "Todos"
export const TODOS_ESTABELECIMENTOS: Estabelecimento = {
  id: 0,
  nome: 'Todos os Estabelecimentos',
  cnpj: null,
  endereco: null,
  ativo: 'sim',
};

interface EstabelecimentoContextType {
  estabelecimentos: Estabelecimento[];
  estabelecimentoAtual: Estabelecimento | null;
  setEstabelecimentoAtual: (estabelecimento: Estabelecimento | null) => void;
  isLoading: boolean;
  selecionado: boolean;
  visualizandoTodos: boolean;
  isGestor: boolean;
}

const EstabelecimentoContext = createContext<EstabelecimentoContextType | undefined>(undefined);

const STORAGE_KEY = 'hospital_estabelecimento_id';

export function EstabelecimentoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [estabelecimentoAtual, setEstabelecimentoAtualState] = useState<Estabelecimento | null>(null);
  const [selecionado, setSelecionado] = useState(false);

  // Buscar estabelecimentos permitidos para o usuário
  const { data: estabelecimentosPermitidos = [], isLoading: loadingPermitidos } = 
    trpc.permissoes.estabelecimentosPermitidos.useQuery(undefined, {
      enabled: !!user,
    });

  // Verificar se é gestor
  const { data: isGestor = false, isLoading: loadingGestor } = 
    trpc.permissoes.verificarGestor.useQuery(undefined, {
      enabled: !!user,
    });

  // Usar estabelecimentos permitidos ou todos (fallback)
  const estabelecimentos = estabelecimentosPermitidos;
  const isLoading = loadingPermitidos || loadingGestor;

  // Carregar estabelecimento salvo do localStorage
  useEffect(() => {
    if (!isLoading && estabelecimentos.length > 0) {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        if (savedId === '0') {
          // Visualizando todos
          setEstabelecimentoAtualState(TODOS_ESTABELECIMENTOS);
          setSelecionado(true);
        } else {
          const found = estabelecimentos.find((e: Estabelecimento) => e.id === parseInt(savedId));
          if (found) {
            setEstabelecimentoAtualState(found);
            setSelecionado(true);
          }
        }
      }
    }
  }, [estabelecimentos, isLoading]);

  const setEstabelecimentoAtual = (estabelecimento: Estabelecimento | null) => {
    setEstabelecimentoAtualState(estabelecimento);
    if (estabelecimento) {
      localStorage.setItem(STORAGE_KEY, estabelecimento.id.toString());
      setSelecionado(true);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setSelecionado(false);
    }
  };

  const visualizandoTodos = estabelecimentoAtual?.id === 0;

  return (
    <EstabelecimentoContext.Provider
      value={{
        estabelecimentos,
        estabelecimentoAtual,
        setEstabelecimentoAtual,
        isLoading,
        selecionado,
        visualizandoTodos,
        isGestor,
      }}
    >
      {children}
    </EstabelecimentoContext.Provider>
  );
}

export function useEstabelecimento() {
  const context = useContext(EstabelecimentoContext);
  if (context === undefined) {
    throw new Error('useEstabelecimento must be used within an EstabelecimentoProvider');
  }
  return context;
}
