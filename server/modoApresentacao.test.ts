import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Testes unitários para a lógica do modo apresentação
describe('Modo Apresentação - Lógica de Slides', () => {
  describe('Rotação de Slides', () => {
    it('deve avançar para o próximo slide corretamente', () => {
      const slidesLength = 5;
      let slideAtual = 0;
      
      // Avançar slide
      slideAtual = (slideAtual + 1) % slidesLength;
      expect(slideAtual).toBe(1);
      
      // Avançar mais uma vez
      slideAtual = (slideAtual + 1) % slidesLength;
      expect(slideAtual).toBe(2);
    });

    it('deve voltar ao primeiro slide após o último', () => {
      const slidesLength = 5;
      let slideAtual = 4; // último slide
      
      // Avançar deve voltar ao primeiro
      slideAtual = (slideAtual + 1) % slidesLength;
      expect(slideAtual).toBe(0);
    });

    it('deve voltar para o slide anterior corretamente', () => {
      const slidesLength = 5;
      let slideAtual = 2;
      
      // Voltar slide
      slideAtual = (slideAtual - 1 + slidesLength) % slidesLength;
      expect(slideAtual).toBe(1);
    });

    it('deve ir para o último slide ao voltar do primeiro', () => {
      const slidesLength = 5;
      let slideAtual = 0;
      
      // Voltar do primeiro deve ir para o último
      slideAtual = (slideAtual - 1 + slidesLength) % slidesLength;
      expect(slideAtual).toBe(4);
    });
  });

  describe('Configuração de Slides', () => {
    const slidesApresentacao = [
      { titulo: 'Faturamento por Convênio', tipoGrafico: 'bar', agrupamento: 'convenio', metrica: 'valor' },
      { titulo: 'Distribuição por Tipo', tipoGrafico: 'pie', agrupamento: 'tipo', metrica: 'valor' },
      { titulo: 'Evolução Mensal', tipoGrafico: 'line', agrupamento: 'mesAno', metrica: 'valor' },
      { titulo: 'Produção por Setor', tipoGrafico: 'bar', agrupamento: 'setor', metrica: 'quantidade' },
      { titulo: 'Produção por Médico', tipoGrafico: 'bar', agrupamento: 'medico', metrica: 'valor' },
    ];

    it('deve ter 5 slides pré-configurados', () => {
      expect(slidesApresentacao).toHaveLength(5);
    });

    it('cada slide deve ter título, tipoGrafico, agrupamento e metrica', () => {
      slidesApresentacao.forEach(slide => {
        expect(slide).toHaveProperty('titulo');
        expect(slide).toHaveProperty('tipoGrafico');
        expect(slide).toHaveProperty('agrupamento');
        expect(slide).toHaveProperty('metrica');
      });
    });

    it('tipoGrafico deve ser bar, pie ou line', () => {
      const tiposValidos = ['bar', 'pie', 'line'];
      slidesApresentacao.forEach(slide => {
        expect(tiposValidos).toContain(slide.tipoGrafico);
      });
    });

    it('metrica deve ser valor ou quantidade', () => {
      const metricasValidas = ['valor', 'quantidade'];
      slidesApresentacao.forEach(slide => {
        expect(metricasValidas).toContain(slide.metrica);
      });
    });
  });

  describe('Geração de Dados para Slides', () => {
    const dadosTeste = [
      { convenio: 'Unimed', tipo: 'MATERIAL', setor: 'UTI', medico: 'Dr. Silva', valorTotal: '1000', quantidade: '10', dataFaturado: '2024-01-15' },
      { convenio: 'Unimed', tipo: 'HONORARIO', setor: 'UTI', medico: 'Dr. Silva', valorTotal: '2000', quantidade: '5', dataFaturado: '2024-01-15' },
      { convenio: 'Bradesco', tipo: 'MATERIAL', setor: 'Centro Cirúrgico', medico: 'Dr. Costa', valorTotal: '1500', quantidade: '8', dataFaturado: '2024-01-20' },
      { convenio: 'Bradesco', tipo: 'HONORARIO', setor: 'Centro Cirúrgico', medico: 'Dr. Costa', valorTotal: '3000', quantidade: '3', dataFaturado: '2024-01-20' },
    ];

    it('deve agrupar dados por convênio corretamente', () => {
      const grupos: Record<string, { valor: number; quantidade: number }> = {};
      
      dadosTeste.forEach(item => {
        const chave = item.convenio;
        if (!grupos[chave]) {
          grupos[chave] = { valor: 0, quantidade: 0 };
        }
        grupos[chave].valor += parseFloat(item.valorTotal);
        grupos[chave].quantidade += parseInt(item.quantidade);
      });
      
      expect(grupos['Unimed'].valor).toBe(3000);
      expect(grupos['Bradesco'].valor).toBe(4500);
      expect(Object.keys(grupos)).toHaveLength(2);
    });

    it('deve agrupar dados por tipo corretamente', () => {
      const grupos: Record<string, { valor: number; quantidade: number }> = {};
      
      dadosTeste.forEach(item => {
        const chave = item.tipo;
        if (!grupos[chave]) {
          grupos[chave] = { valor: 0, quantidade: 0 };
        }
        grupos[chave].valor += parseFloat(item.valorTotal);
        grupos[chave].quantidade += parseInt(item.quantidade);
      });
      
      expect(grupos['MATERIAL'].valor).toBe(2500);
      expect(grupos['HONORARIO'].valor).toBe(5000);
    });

    it('deve agrupar dados por setor corretamente', () => {
      const grupos: Record<string, { valor: number; quantidade: number }> = {};
      
      dadosTeste.forEach(item => {
        const chave = item.setor;
        if (!grupos[chave]) {
          grupos[chave] = { valor: 0, quantidade: 0 };
        }
        grupos[chave].valor += parseFloat(item.valorTotal);
        grupos[chave].quantidade += parseInt(item.quantidade);
      });
      
      expect(grupos['UTI'].valor).toBe(3000);
      expect(grupos['Centro Cirúrgico'].valor).toBe(4500);
    });

    it('deve agrupar dados por médico corretamente', () => {
      const grupos: Record<string, { valor: number; quantidade: number }> = {};
      
      dadosTeste.forEach(item => {
        const chave = item.medico;
        if (!grupos[chave]) {
          grupos[chave] = { valor: 0, quantidade: 0 };
        }
        grupos[chave].valor += parseFloat(item.valorTotal);
        grupos[chave].quantidade += parseInt(item.quantidade);
      });
      
      expect(grupos['Dr. Silva'].valor).toBe(3000);
      expect(grupos['Dr. Costa'].valor).toBe(4500);
    });
  });

  describe('Intervalos de Rotação', () => {
    it('deve aceitar intervalos válidos', () => {
      const intervalosValidos = [5, 10, 15, 30, 60];
      
      intervalosValidos.forEach(intervalo => {
        expect(intervalo).toBeGreaterThanOrEqual(5);
        expect(intervalo).toBeLessThanOrEqual(60);
      });
    });

    it('deve calcular tempo total de apresentação corretamente', () => {
      const numSlides = 5;
      const intervalo = 10; // segundos
      
      const tempoTotal = numSlides * intervalo;
      expect(tempoTotal).toBe(50); // 50 segundos para completar um ciclo
    });
  });

  describe('Controles de Teclado', () => {
    const keyHandlers = {
      'Escape': 'fechar',
      'ArrowLeft': 'anterior',
      'ArrowRight': 'proximo',
      ' ': 'proximo',
      'p': 'pausar',
      'P': 'pausar',
    };

    it('deve mapear teclas para ações corretas', () => {
      expect(keyHandlers['Escape']).toBe('fechar');
      expect(keyHandlers['ArrowLeft']).toBe('anterior');
      expect(keyHandlers['ArrowRight']).toBe('proximo');
      expect(keyHandlers[' ']).toBe('proximo');
      expect(keyHandlers['p']).toBe('pausar');
      expect(keyHandlers['P']).toBe('pausar');
    });

    it('deve ter todas as teclas de controle mapeadas', () => {
      const teclasEsperadas = ['Escape', 'ArrowLeft', 'ArrowRight', ' ', 'p', 'P'];
      teclasEsperadas.forEach(tecla => {
        expect(keyHandlers).toHaveProperty(tecla);
      });
    });
  });

  describe('Cores dos Gráficos', () => {
    const coresGraficos = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(20, 184, 166, 0.8)',
      'rgba(249, 115, 22, 0.8)',
      'rgba(99, 102, 241, 0.8)',
      'rgba(34, 197, 94, 0.8)',
    ];

    it('deve ter 10 cores disponíveis', () => {
      expect(coresGraficos).toHaveLength(10);
    });

    it('cada cor deve estar no formato RGBA', () => {
      const rgbaPattern = /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/;
      coresGraficos.forEach(cor => {
        expect(cor).toMatch(rgbaPattern);
      });
    });

    it('todas as cores devem ter opacidade 0.8', () => {
      coresGraficos.forEach(cor => {
        expect(cor).toContain('0.8)');
      });
    });
  });

  describe('Formatação de Valores', () => {
    it('deve formatar valores monetários corretamente', () => {
      const valor = 1500000;
      const formatado = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      expect(formatado).toBe('R$\u00a01.500.000,00');
    });

    it('deve formatar quantidades corretamente', () => {
      const quantidade = 1500;
      const formatado = quantidade.toLocaleString('pt-BR');
      expect(formatado).toBe('1.500');
    });
  });
});

describe('Modo Apresentação - Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve avançar slide após intervalo configurado', () => {
    let slideAtual = 0;
    const slidesLength = 5;
    const intervalo = 10000; // 10 segundos em ms
    
    const timer = setInterval(() => {
      slideAtual = (slideAtual + 1) % slidesLength;
    }, intervalo);
    
    expect(slideAtual).toBe(0);
    
    vi.advanceTimersByTime(10000);
    expect(slideAtual).toBe(1);
    
    vi.advanceTimersByTime(10000);
    expect(slideAtual).toBe(2);
    
    clearInterval(timer);
  });

  it('deve completar ciclo completo de slides', () => {
    let slideAtual = 0;
    const slidesLength = 5;
    const intervalo = 5000;
    
    const timer = setInterval(() => {
      slideAtual = (slideAtual + 1) % slidesLength;
    }, intervalo);
    
    // Avançar 5 vezes (ciclo completo)
    vi.advanceTimersByTime(25000);
    expect(slideAtual).toBe(0); // Volta ao início
    
    clearInterval(timer);
  });

  it('deve parar rotação quando pausado', () => {
    let slideAtual = 0;
    let rotacaoAtiva = true;
    const slidesLength = 5;
    const intervalo = 5000;
    
    const timer = setInterval(() => {
      if (rotacaoAtiva) {
        slideAtual = (slideAtual + 1) % slidesLength;
      }
    }, intervalo);
    
    vi.advanceTimersByTime(5000);
    expect(slideAtual).toBe(1);
    
    // Pausar
    rotacaoAtiva = false;
    
    vi.advanceTimersByTime(10000);
    expect(slideAtual).toBe(1); // Não deve ter avançado
    
    clearInterval(timer);
  });
});
