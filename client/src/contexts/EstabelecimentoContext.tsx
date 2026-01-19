import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';

export interface Estabelecimento {
  id: number;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  ativo: string;
}

interface EstabelecimentoContextType {
  estabelecimentos: Estabelecimento[];
  estabelecimentoAtual: Estabelecimento | null;
  setEstabelecimentoAtual: (estabelecimento: Estabelecimento | null) => void;
  isLoading: boolean;
  selecionado: boolean;
}

const EstabelecimentoContext = createContext<EstabelecimentoContextType | undefined>(undefined);

const STORAGE_KEY = 'hospital_estabelecimento_id';

export function EstabelecimentoProvider({ children }: { children: ReactNode }) {
  const [estabelecimentoAtual, setEstabelecimentoAtualState] = useState<Estabelecimento | null>(null);
  const [selecionado, setSelecionado] = useState(false);

  const { data: estabelecimentos = [], isLoading } = trpc.estabelecimentos.list.useQuery();

  // Carregar estabelecimento salvo do localStorage
  useEffect(() => {
    if (!isLoading && estabelecimentos.length > 0) {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const found = estabelecimentos.find((e: Estabelecimento) => e.id === parseInt(savedId));
        if (found) {
          setEstabelecimentoAtualState(found);
          setSelecionado(true);
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

  return (
    <EstabelecimentoContext.Provider
      value={{
        estabelecimentos,
        estabelecimentoAtual,
        setEstabelecimentoAtual,
        isLoading,
        selecionado,
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
