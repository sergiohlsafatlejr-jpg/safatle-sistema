import { RoboBase, CredenciaisConvenio } from '../RoboBase';
import { logger } from '../../_core/logger';
import path from 'path';
import fs from 'fs';
import { getDb } from '../../db';
import { like } from 'drizzle-orm';

export class RoboIpasgo extends RoboBase {
  constructor() {
    super('Ipasgo_Bot');
  }

  async executar(credenciais: CredenciaisConvenio, parametros?: { competencia: string }) {
    let arquivosBaixados = 0;

    try {
      const isProducao = process.env.NODE_ENV === 'production';
      await this.iniciarBrowser(!isProducao);
      if (!this.page) throw new Error('Pagina nao iniciada');

      const downloadPath = path.join(process.cwd(), 'uploads', 'demonstrativos', 'ipasgo');
      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }

      const client = await this.page.target().createCDPSession();
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath
      });

      // ====== PASSO 1: Acessar o Portal do Prestador do IPASGO diretamente ======
      const urlPortal = 'https://portalos.ipasgo.go.gov.br/Portal_Dominio/Common.PrestadorLogin.aspx';
      logger.info({ message: `[${this.nome}] Acessando Portal do Prestador IPASGO: ${urlPortal}` });
      await this.page.goto(urlPortal, { waitUntil: 'networkidle2', timeout: 60000 });
      await this.delay(3000);

      // ====== PASSO 2: Login - Preencher usuario e senha ======
      logger.info({ message: `[${this.nome}] Preenchendo credenciais de login...` });

      // Tentar localizar os campos de login por diferentes seletores
      const loginSelectors = [
        'input[name*="Login"]', 'input[name*="login"]', 'input[name*="usuario"]',
        'input[name*="Usuario"]', 'input[id*="Login"]', 'input[id*="login"]',
        'input[id*="txtLogin"]', 'input[id*="txtUsuario"]',
        'input[type="text"]:not([type="hidden"])'
      ];

      let loginField = null;
      for (const sel of loginSelectors) {
        loginField = await this.page.$(sel);
        if (loginField) {
          logger.info({ message: `[${this.nome}] Campo de login encontrado: ${sel}` });
          break;
        }
      }

      const senhaSelectors = [
        'input[name*="Senha"]', 'input[name*="senha"]', 'input[name*="password"]',
        'input[name*="Password"]', 'input[id*="Senha"]', 'input[id*="senha"]',
        'input[id*="txtSenha"]', 'input[id*="txtPassword"]',
        'input[type="password"]'
      ];

      let senhaField = null;
      for (const sel of senhaSelectors) {
        senhaField = await this.page.$(sel);
        if (senhaField) {
          logger.info({ message: `[${this.nome}] Campo de senha encontrado: ${sel}` });
          break;
        }
      }

      if (!loginField || !senhaField) {
        // Salvar screenshot e HTML para debug
        const debugPath = path.join(downloadPath, `debug_login_${Date.now()}.png`);
        await this.page.screenshot({ path: debugPath, fullPage: true });
        const html = await this.page.content();
        fs.writeFileSync(path.join(downloadPath, `debug_login_html_${Date.now()}.txt`), html);
        throw new Error('Campos de login/senha nao encontrados na pagina do IPASGO');
      }

      await loginField.click({ clickCount: 3 });
      await loginField.type(credenciais.login || '', { delay: 50 });
      await senhaField.click({ clickCount: 3 });
      await senhaField.type(credenciais.senha || '', { delay: 50 });

      // Clicar no botao Entrar
      const entrarSelectors = [
        'input[value="Entrar"]', 'button:has-text("Entrar")', 'input[type="submit"]',
        'a:has-text("Entrar")', '#btnEntrar', 'input[id*="btnEntrar"]',
        'input[id*="btnLogin"]', 'button[id*="btnEntrar"]'
      ];

      let clicked = false;
      for (const sel of entrarSelectors) {
        try {
          const btn = await this.page.$(sel);
          if (btn) {
            await btn.click();
            clicked = true;
            logger.info({ message: `[${this.nome}] Botao Entrar clicado: ${sel}` });
            break;
          }
        } catch (e) {
          // Tenta proximo seletor
        }
      }

      if (!clicked) {
        // Fallback: buscar por texto "Entrar" em qualquer elemento
        await this.page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('input, button, a'));
          const btn = els.find(el => {
            const val = (el as HTMLInputElement).value || el.textContent || '';
            return val.trim().toLowerCase() === 'entrar';
          });
          if (btn) (btn as HTMLElement).click();
        });
        logger.info({ message: `[${this.nome}] Botao Entrar clicado via evaluate()` });
      }

      await this.delay(5000);
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});

      // ====== PASSO 3: Tratar modal "Senha Expirada" - Clicar em "Nao" ======
      logger.info({ message: `[${this.nome}] Verificando modal de Senha Expirada...` });
      try {
        const naoClicked = await this.page.evaluate(() => {
          // Buscar botao/link "Nao" em modals
          const els = Array.from(document.querySelectorAll('a, button, input, span'));
          const naoBtn = els.find(el => {
            const text = (el as HTMLElement).textContent || (el as HTMLInputElement).value || '';
            return text.trim().toLowerCase().includes('n\u00e3o') || text.trim().toLowerCase() === 'nao';
          });
          if (naoBtn) {
            (naoBtn as HTMLElement).click();
            return true;
          }
          return false;
        });
        if (naoClicked) {
          logger.info({ message: `[${this.nome}] Modal "Senha Expirada" fechado (clicou em Nao)` });
          await this.delay(3000);
        }
      } catch (e) {
        logger.info({ message: `[${this.nome}] Nenhum modal de senha expirada detectado` });
      }

      // ====== PASSO 4: Tratar modal "Atualizacao Cadastral" - Clicar em "Sair" ======
      logger.info({ message: `[${this.nome}] Verificando modal de Atualizacao Cadastral...` });
      await this.delay(2000);
      try {
        const sairClicked = await this.page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('a, button, input, span'));
          const sairBtn = els.find(el => {
            const text = (el as HTMLElement).textContent || (el as HTMLInputElement).value || '';
            return text.trim().toLowerCase() === 'sair';
          });
          if (sairBtn) {
            (sairBtn as HTMLElement).click();
            return true;
          }
          return false;
        });
        if (sairClicked) {
          logger.info({ message: `[${this.nome}] Modal "Atualizacao Cadastral" fechado (clicou em Sair)` });
          await this.delay(3000);
        }
      } catch (e) {
        logger.info({ message: `[${this.nome}] Nenhum modal de atualizacao cadastral detectado` });
      }

      // Salvar screenshot do dashboard
      const dashScreenshot = path.join(downloadPath, `dashboard_ipasgo_${Date.now()}.png`);
      await this.page.screenshot({ path: dashScreenshot, fullPage: true });
      logger.info({ message: `[${this.nome}] Screenshot do dashboard salva em: ${dashScreenshot}` });

      // ====== PASSO 5: Clicar em "Portal WebPlan" na secao "Faturas Eletronicas" ======
      logger.info({ message: `[${this.nome}] Navegando para Portal WebPlan...` });
      
      // O link "Portal WebPlan" fica no menu lateral esquerdo, na secao "Faturas Eletronicas"
      const webplanClicked = await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const webplanLink = links.find(a => {
          const text = a.textContent || '';
          return text.trim().toLowerCase().includes('portal webplan') || text.trim().toLowerCase().includes('webplan');
        });
        if (webplanLink) {
          webplanLink.click();
          return true;
        }
        return false;
      });

      if (!webplanClicked) {
        logger.warn({ message: `[${this.nome}] Link "Portal WebPlan" nao encontrado. Salvando debug...` });
        const html = await this.page.content();
        fs.writeFileSync(path.join(downloadPath, `debug_webplan_html_${Date.now()}.txt`), html);
        await this.page.screenshot({ path: path.join(downloadPath, `debug_webplan_${Date.now()}.png`), fullPage: true });
      } else {
        logger.info({ message: `[${this.nome}] Link "Portal WebPlan" clicado com sucesso` });
      }

      // Aguardar nova pagina ou navegacao (o WebPlan pode abrir em nova aba)
      await this.delay(5000);

      // Verificar se abriu uma nova aba/janela
      const pages = await this.page.browser().pages();
      let webplanPage = this.page;
      if (pages.length > 1) {
        webplanPage = pages[pages.length - 1]; // Pega a ultima aba aberta
        logger.info({ message: `[${this.nome}] WebPlan abriu em nova aba. Alternando...` });
        
        // Configurar download na nova aba tambem
        const newClient = await webplanPage.target().createCDPSession();
        await newClient.send('Page.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath: downloadPath
        });
      }

      await this.delay(3000);

      // ====== PASSO 6: Clicar em "Faturas" no menu do WebPlan ======
      logger.info({ message: `[${this.nome}] Buscando menu "Faturas" no WebPlan...` });
      
      const faturasClicked = await webplanPage.evaluate(() => {
        const els = Array.from(document.querySelectorAll('a, button, span, div, li'));
        const fatBtn = els.find(el => {
          const text = (el as HTMLElement).textContent || '';
          return text.trim().toLowerCase() === 'faturas';
        });
        if (fatBtn) {
          (fatBtn as HTMLElement).click();
          return true;
        }
        return false;
      });

      if (faturasClicked) {
        logger.info({ message: `[${this.nome}] Menu "Faturas" clicado com sucesso` });
      } else {
        logger.warn({ message: `[${this.nome}] Menu "Faturas" nao encontrado` });
        const html = await webplanPage.content();
        fs.writeFileSync(path.join(downloadPath, `debug_faturas_html_${Date.now()}.txt`), html);
      }
      await this.delay(3000);

      // ====== PASSO 7: Clicar em "Relatorio de Fatura" ======
      logger.info({ message: `[${this.nome}] Buscando "Relatorio de Fatura"...` });
      
      const relatorioClicked = await webplanPage.evaluate(() => {
        const els = Array.from(document.querySelectorAll('a, button, span, div, li'));
        const relBtn = els.find(el => {
          const text = (el as HTMLElement).textContent || '';
          return text.trim().toLowerCase().includes('relat\u00f3rio de fatura') ||
                 text.trim().toLowerCase().includes('relatório de fatura') ||
                 text.trim().toLowerCase().includes('relatorio de fatura');
        });
        if (relBtn) {
          (relBtn as HTMLElement).click();
          return true;
        }
        return false;
      });

      if (relatorioClicked) {
        logger.info({ message: `[${this.nome}] "Relatorio de Fatura" clicado com sucesso` });
      } else {
        logger.warn({ message: `[${this.nome}] "Relatorio de Fatura" nao encontrado` });
      }
      await this.delay(3000);

      // ====== PASSO 8: Clicar em "Pesquisar" ======
      logger.info({ message: `[${this.nome}] Clicando em "Pesquisar"...` });
      
      const pesquisarClicked = await webplanPage.evaluate(() => {
        const els = Array.from(document.querySelectorAll('a, button, input, span'));
        const pesqBtn = els.find(el => {
          const text = (el as HTMLElement).textContent || (el as HTMLInputElement).value || '';
          return text.trim().toLowerCase() === 'pesquisar';
        });
        if (pesqBtn) {
          (pesqBtn as HTMLElement).click();
          return true;
        }
        return false;
      });

      if (pesquisarClicked) {
        logger.info({ message: `[${this.nome}] Botao "Pesquisar" clicado com sucesso` });
      } else {
        logger.warn({ message: `[${this.nome}] Botao "Pesquisar" nao encontrado` });
      }
      await this.delay(5000);

      // ====== PASSO 9: Clicar no icone de download Excel ======
      logger.info({ message: `[${this.nome}] Buscando botao de download Excel...` });

      // Pode ser um icone, link ou botao com referencia a Excel/XLS
      const excelClicked = await webplanPage.evaluate(() => {
        const els = Array.from(document.querySelectorAll('a, button, img, i, span'));
        const excelBtn = els.find(el => {
          const text = (el as HTMLElement).textContent || '';
          const title = el.getAttribute('title') || '';
          const alt = el.getAttribute('alt') || '';
          const className = el.className || '';
          const href = el.getAttribute('href') || '';
          const onclick = el.getAttribute('onclick') || '';
          
          return text.toLowerCase().includes('excel') ||
                 title.toLowerCase().includes('excel') ||
                 alt.toLowerCase().includes('excel') ||
                 className.toLowerCase().includes('excel') ||
                 href.toLowerCase().includes('excel') ||
                 onclick.toLowerCase().includes('excel') ||
                 text.toLowerCase().includes('xls') ||
                 title.toLowerCase().includes('xls') ||
                 className.toLowerCase().includes('fa-file-excel');
        });
        if (excelBtn) {
          (excelBtn as HTMLElement).click();
          return true;
        }
        return false;
      });

      if (excelClicked) {
        logger.info({ message: `[${this.nome}] Botao Excel clicado! Aguardando download...` });
        arquivosBaixados++;
        await this.delay(15000); // Aguardar download
      } else {
        logger.warn({ message: `[${this.nome}] Botao Excel nao encontrado. Salvando debug...` });
        const html = await webplanPage.content();
        fs.writeFileSync(path.join(downloadPath, `debug_excel_html_${Date.now()}.txt`), html);
        await webplanPage.screenshot({ path: path.join(downloadPath, `debug_excel_${Date.now()}.png`), fullPage: true });
      }

      // ====== IMPORTACAO AUTOMATICA DOS ARQUIVOS BAIXADOS ======
      if (arquivosBaixados > 0) {
        try {
          const arquivosNaPasta = fs.readdirSync(downloadPath);
          const tempoLimite = Date.now() - (20 * 60 * 1000);
          const xlsNovos = arquivosNaPasta.filter(f => {
            if (!f.endsWith('.xls') && !f.endsWith('.xlsx')) return false;
            const stat = fs.statSync(path.join(downloadPath, f));
            return stat.mtimeMs > tempoLimite;
          });

          if (xlsNovos.length > 0) {
            logger.info({ message: `[${this.nome}] Encontrados ${xlsNovos.length} arquivos XLS/XLSX recentes. Iniciando importacao...` });

            // Descobrir convenioId do IPASGO
            let idConvenio = 1;
            const { convenios } = await import('../../../drizzle/schema');
            const drizzleDb = await getDb();
            if (drizzleDb) {
              const conveniosDb = await drizzleDb.select().from(convenios).where(like(convenios.nome, '%IPASGO%'));
              if (conveniosDb.length > 0) {
                idConvenio = conveniosDb[0].id;
              } else {
                const conveniosDb2 = await drizzleDb.select().from(convenios).where(like(convenios.nome, '%Ipasgo%'));
                if (conveniosDb2.length > 0) {
                  idConvenio = conveniosDb2[0].id;
                }
              }
            }

            const { processarArquivoRpa } = await import('../importador');

            for (const f of xlsNovos) {
              const filePath = path.join(downloadPath, f);
              await processarArquivoRpa(filePath, f, idConvenio, parametros?.competencia, credenciais.estabelecimentoId);
            }
          }
        } catch (errDb: any) {
          logger.error({ message: `[${this.nome}] Erro ao importar arquivos: ${errDb.message}` });
        }
      }

      // Screenshot final
      const screenshotPath = path.join(downloadPath, `resultado_ipasgo_${Date.now()}.png`);
      try {
        await webplanPage.screenshot({ path: screenshotPath, fullPage: true });
      } catch (e) {
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
      }

      const resultado = {
        status: 'sucesso',
        mensagem: `Robo IPASGO finalizou. ${arquivosBaixados} arquivo(s) processados.`,
        pastaDownload: downloadPath,
        arquivosBaixados,
        screenshotSalva: screenshotPath
      };

      logger.info({ message: `[${this.nome}] Finalizacao: ${JSON.stringify(resultado)}` });
      return resultado;

    } catch (error: any) {
      logger.error({ message: `[${this.nome}] Erro ao executar: ${error.message}` });
      throw error;
    } finally {
      await this.fecharBrowser();
    }
  }
}
