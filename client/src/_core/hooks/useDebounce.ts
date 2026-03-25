import { useState, useEffect } from "react";

/**
 * Hook customizado para atrasar a atualização de um valor (Debounce).
 * Ideal para inputs de busca que disparam requisições na API.
 * 
 * @param value O valor que está sendo digitado
 * @param delay O tempo de atraso em milissegundos (padrão: 500ms)
 * @returns O valor atrasado (que só atualiza quando o usuário parar de digitar)
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Define um timer para atualizar o valor debounced após o tempo especificado
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Se o valor mudar (o usuário digitou de novo) ANTES do tempo acabar,
    // o useEffect limpa o timer anterior e recomeça a contagem do zero.
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]); // Dependências do efeito

  return debouncedValue;
}
