import { describe, it, expect } from 'vitest';
import {
  GLOSAS_TISS,
  traduzirCodigoGlosa,
  traduzirCodigoGlosaCompleto,
  obterInfoGlosa,
  obterArgumentoContestacao,
  obterAcoesRecomendadas,
  obterDocumentosSugeridos,
  traduzirMotivoGlosa,
  listarGruposGlosa,
  listarGlosasPorGrupo,
  buscarGlosas,
  obterEstatisticasPorGrupo
} from '../shared/glossaryGlosas';

describe('Dicionário de Glosas TISS', () => {
  describe('GLOSAS_TISS', () => {
    it('deve conter códigos de glosa', () => {
      expect(Object.keys(GLOSAS_TISS).length).toBeGreaterThan(50);
    });

    it('cada glosa deve ter campos obrigatórios', () => {
      Object.values(GLOSAS_TISS).forEach(glosa => {
        expect(glosa.codigo).toBeDefined();
        expect(glosa.grupo).toBeDefined();
        expect(glosa.descricao).toBeDefined();
        expect(glosa.descricaoSimplificada).toBeDefined();
      });
    });

    it('glosas principais devem ter argumentos de contestação', () => {
      const glosasComArgumentos = Object.values(GLOSAS_TISS).filter(g => g.argumentoContestacao);
      expect(glosasComArgumentos.length).toBeGreaterThan(30);
    });
  });

  describe('traduzirCodigoGlosa', () => {
    it('deve traduzir código conhecido', () => {
      expect(traduzirCodigoGlosa('2108')).toBe('Quantidade incompatível com procedimento');
    });

    it('deve retornar código para código desconhecido', () => {
      expect(traduzirCodigoGlosa('9999')).toBe('Código 9999');
    });
  });

  describe('traduzirCodigoGlosaCompleto', () => {
    it('deve retornar descrição completa', () => {
      const descricao = traduzirCodigoGlosaCompleto('2108');
      expect(descricao).toContain('incompatíveis');
    });
  });

  describe('obterInfoGlosa', () => {
    it('deve retornar informações completas da glosa', () => {
      const info = obterInfoGlosa('2108');
      expect(info).toBeDefined();
      expect(info?.codigo).toBe('2108');
      expect(info?.grupo).toBe('Medicamento');
      expect(info?.argumentoContestacao).toBeDefined();
      expect(info?.acoesRecomendadas).toBeDefined();
      expect(info?.documentosSugeridos).toBeDefined();
    });

    it('deve retornar undefined para código inexistente', () => {
      expect(obterInfoGlosa('9999')).toBeUndefined();
    });
  });

  describe('obterArgumentoContestacao', () => {
    it('deve retornar argumento específico para código conhecido', () => {
      const argumento = obterArgumentoContestacao('2108');
      expect(argumento).toContain('prescrição');
    });

    it('deve retornar argumento padrão para código desconhecido', () => {
      const argumento = obterArgumentoContestacao('9999');
      expect(argumento).toContain('revisão');
    });
  });

  describe('obterAcoesRecomendadas', () => {
    it('deve retornar lista de ações para código conhecido', () => {
      const acoes = obterAcoesRecomendadas('2108');
      expect(Array.isArray(acoes)).toBe(true);
      expect(acoes.length).toBeGreaterThan(0);
    });

    it('deve retornar ações padrão para código desconhecido', () => {
      const acoes = obterAcoesRecomendadas('9999');
      expect(Array.isArray(acoes)).toBe(true);
      expect(acoes.length).toBeGreaterThan(0);
    });
  });

  describe('obterDocumentosSugeridos', () => {
    it('deve retornar lista de documentos para código conhecido', () => {
      const docs = obterDocumentosSugeridos('2108');
      expect(Array.isArray(docs)).toBe(true);
      expect(docs.length).toBeGreaterThan(0);
    });
  });

  describe('traduzirMotivoGlosa', () => {
    it('deve traduzir código único', () => {
      const resultado = traduzirMotivoGlosa('2108');
      expect(resultado).toContain('2108');
      expect(resultado).toContain('Quantidade incompatível');
    });

    it('deve traduzir múltiplos códigos', () => {
      const resultado = traduzirMotivoGlosa('Códigos: 2108, 2112');
      expect(resultado).toContain('2108');
      expect(resultado).toContain('2112');
    });

    it('deve retornar string vazia para entrada vazia', () => {
      expect(traduzirMotivoGlosa('')).toBe('');
    });
  });

  describe('listarGruposGlosa', () => {
    it('deve retornar lista de grupos', () => {
      const grupos = listarGruposGlosa();
      expect(Array.isArray(grupos)).toBe(true);
      expect(grupos.length).toBeGreaterThan(5);
      expect(grupos).toContain('Medicamento');
      expect(grupos).toContain('Procedimento');
    });
  });

  describe('listarGlosasPorGrupo', () => {
    it('deve retornar glosas do grupo especificado', () => {
      const glosas = listarGlosasPorGrupo('Medicamento');
      expect(glosas.length).toBeGreaterThan(0);
      glosas.forEach(g => expect(g.grupo).toBe('Medicamento'));
    });

    it('deve retornar array vazio para grupo inexistente', () => {
      const glosas = listarGlosasPorGrupo('GrupoInexistente');
      expect(glosas).toEqual([]);
    });
  });

  describe('buscarGlosas', () => {
    it('deve buscar por código', () => {
      const resultado = buscarGlosas('2108');
      expect(resultado.length).toBeGreaterThan(0);
      expect(resultado[0].codigo).toBe('2108');
    });

    it('deve buscar por descrição', () => {
      const resultado = buscarGlosas('medicamento');
      expect(resultado.length).toBeGreaterThan(0);
    });

    it('deve retornar array vazio para termo não encontrado', () => {
      const resultado = buscarGlosas('xyzabc123');
      expect(resultado).toEqual([]);
    });
  });

  describe('obterEstatisticasPorGrupo', () => {
    it('deve retornar estatísticas por grupo', () => {
      const stats = obterEstatisticasPorGrupo();
      expect(Object.keys(stats).length).toBeGreaterThan(0);
      
      Object.values(stats).forEach(stat => {
        expect(stat.total).toBeGreaterThan(0);
        expect(typeof stat.mediaSuccesso).toBe('number');
      });
    });
  });

  describe('Campos de contestação', () => {
    it('glosas com argumentos devem ter ações recomendadas', () => {
      Object.values(GLOSAS_TISS).forEach(glosa => {
        if (glosa.argumentoContestacao) {
          expect(glosa.acoesRecomendadas).toBeDefined();
          expect(glosa.acoesRecomendadas!.length).toBeGreaterThan(0);
        }
      });
    });

    it('glosas com argumentos devem ter documentos sugeridos', () => {
      Object.values(GLOSAS_TISS).forEach(glosa => {
        if (glosa.argumentoContestacao) {
          expect(glosa.documentosSugeridos).toBeDefined();
          expect(glosa.documentosSugeridos!.length).toBeGreaterThan(0);
        }
      });
    });

    it('probabilidade de sucesso deve estar entre 0 e 100', () => {
      Object.values(GLOSAS_TISS).forEach(glosa => {
        if (glosa.probabilidadeSucesso !== undefined) {
          expect(glosa.probabilidadeSucesso).toBeGreaterThanOrEqual(0);
          expect(glosa.probabilidadeSucesso).toBeLessThanOrEqual(100);
        }
      });
    });

    it('dificuldade de reversão deve estar entre 1 e 5', () => {
      Object.values(GLOSAS_TISS).forEach(glosa => {
        if (glosa.dificuldadeReversao !== undefined) {
          expect(glosa.dificuldadeReversao).toBeGreaterThanOrEqual(1);
          expect(glosa.dificuldadeReversao).toBeLessThanOrEqual(5);
        }
      });
    });
  });
});
