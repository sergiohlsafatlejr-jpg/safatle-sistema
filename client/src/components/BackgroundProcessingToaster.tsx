import React, { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useEstabelecimento } from '@/contexts/EstabelecimentoContext';

export function BackgroundProcessingToaster() {
  const { estabelecimentoAtual } = useEstabelecimento();
  const utils = trpc.useContext();
  
  // Track files that we know are processing to detect when they finish
  const [processingFiles, setProcessingFiles] = useState<Record<number, string>>({});

  // Poll every 5 seconds for files that are currently processing
  const { data } = trpc.arquivos.list.useQuery(
    { 
      estabelecimentoId: estabelecimentoAtual?.id,
    },
    {
      refetchInterval: 5000, // Poll every 5 seconds
      refetchOnWindowFocus: true,
    }
  );

  useEffect(() => {
    if (!data?.items) return;

    const currentProcessing: Record<number, string> = {};
    const newlyFinished: { id: number, name: string, status: string }[] = [];

    data.items.forEach((arquivo: any) => {
      // If it's processing or in fila, track it
      if (arquivo.status === 'processando' || arquivo.status === 'na_fila') {
        currentProcessing[arquivo.id] = arquivo.nome;
      } 
      // If it's processed or error AND we were tracking it previously
      else if ((arquivo.status === 'processado' || arquivo.status === 'erro') && processingFiles[arquivo.id]) {
        newlyFinished.push({
          id: arquivo.id,
          name: arquivo.nome,
          status: arquivo.status
        });
      }
    });

    // Notify about newly finished files
    newlyFinished.forEach(file => {
      if (file.status === 'processado') {
        toast.success(`Processamento concluído: ${file.name}`, {
          description: "Os dados já estão disponíveis na Conta Convênio ou Recebimento.",
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
          duration: 8000,
        });
        
        // Invalidate relevant queries when a file finishes
        utils.contasConvenio.listarContas.invalidate();
        utils.dashboard.resumo.invalidate();
        
      } else if (file.status === 'erro') {
        toast.error(`Erro no processamento: ${file.name}`, {
          description: "Não foi possível concluir a importação deste arquivo.",
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          duration: 10000,
        });
      }
    });

    // Update tracked files state
    setProcessingFiles(currentProcessing);

  }, [data?.items, processingFiles, utils]);

  return null; // This is a logic-only component that uses generic Toasts
}
