import { RoboBase, CredenciaisConvenio } from "../RoboBase";
import { logger } from "../../_core/logger";
import path from "path";
import fs from "fs";

export class RoboUnimed extends RoboBase {
  constructor() {
    super("Unimed_Bot");
  }

  async executar(credenciais: CredenciaisConvenio, parametros?: { competencia: string }) {
    try {
      // 1. Iniciar navegador (Headless = false para você ver o robô agir na tela durante o dev)
      const isProducao = process.env.NODE_ENV === "production";
      await this.iniciarBrowser(!isProducao); 
      if (!this.page) throw new Error("Página não iniciada");

      // Configurar pasta de download automático
      const downloadPath = path.join(process.cwd(), "uploads", "demonstrativos", "unimed");
      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }

      const client = await this.page.target().createCDPSession();
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath,
      });

      // 2. Acessar o Portal da Unimed Goiânia
      const urlAlvo = credenciais.url || "https://www.unimedgoiania.coop.br/wps/portal/usuariosunimed"; 
      logger.info({ message: `[${this.nome}] Acessando portal da Unimed: ${urlAlvo}` });
      
      await this.page.goto(urlAlvo, { waitUntil: "networkidle2" });

      // 3. Clicar em "Credenciado" e Fazer Login
      try {
        logger.info({ message: `[${this.nome}] Buscando botão de Credenciado...` });
        
        // A lógica do portal: ao clicar em credenciado, pode abrir um modal ou ir para outra página
        // Vamos procurar pelo texto "Credenciado" em botões ou links
        await this.page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('a, button, span, div.box, div.icone'));
          const btn = els.find(el => el.textContent?.trim().toLowerCase() === 'credenciado');
          if (btn && (btn as HTMLElement).click) {
            (btn as HTMLElement).click();
          }
        });
        
        // Aguarda 4 segundos para caso seja um redirecionamento ou modal
        await new Promise(r => setTimeout(r, 4000));
        
        // Aguarda os inputs de login aparecerem (podem ter names variados, vamos tentar os mais comuns)
        await this.page.waitForSelector("input[type='text'], input[name*='login'], input[name*='usuario'], input[id*='usuario'], input[id*='login']", { timeout: 10000, visible: true });
        
        if (credenciais.login) {
            await this.page.type("input[type='text'], input[name*='login'], input[name*='usuario'], input[id*='usuario'], input[id*='login']", credenciais.login, { delay: 50 });
        }
        if (credenciais.senha) {
            await this.page.type("input[type='password'], input[name*='senha'], input[id*='senha']", credenciais.senha, { delay: 50 });
        }
        
        // Clicar no botão de entrar
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {}),
          this.page.evaluate(() => {
             const btns = Array.from(document.querySelectorAll("button, input[type='submit'], input[type='button'], a"));
             const enterBtn = btns.find(b => {
                const text = b.textContent?.trim().toLowerCase() || '';
                const val = b.getAttribute('value')?.toLowerCase() || '';
                const id = b.id?.toLowerCase() || '';
                return text === 'entrar' || text === 'acessar' || text.includes('efetuar login') || val === 'entrar' || val.includes('efetuar login') || id.includes('login.button');
             });
             if (enterBtn && (enterBtn as HTMLElement).click) (enterBtn as HTMLElement).click();
          })
        ]);

        logger.info({ message: `[${this.nome}] Login efetuado com sucesso no portal da Unimed.` });
      } catch (loginErr: any) {
        logger.warn({ message: `[${this.nome}] Falha ao logar. Erro: ${loginErr.message}` });
        // Tiramos um print para o usuário ver onde o robô travou
        const errPath = path.join(downloadPath, `erro_login_${Date.now()}.png`);
        await this.page.screenshot({ path: errPath, fullPage: true });
        throw new Error("Não foi possível encontrar os campos de login na Unimed Goiânia. Verifique o print.");
      }

      // 4. Navegar até Demonstrativo de Pagamento
      try {
        logger.info({ message: `[${this.nome}] Navegando para Demonstrativo de Pagamento...` });
        await this.page.waitForSelector("body", { timeout: 10000 });
        
        // Clicar no link do menu
        const clicouDem = await this.page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const linkDem = links.find(el => el.textContent?.includes('Demonstrativo de Pagamento'));
          if (linkDem) {
            linkDem.click();
            return true;
          }
          return false;
        });
        
        if (clicouDem) {
           await this.page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
        } else {
           throw new Error("Link 'Demonstrativo de Pagamento' não encontrado no menu.");
        }
      } catch (navErr: any) {
        logger.warn({ message: `[${this.nome}] Erro ao buscar menu de demonstrativo: ${navErr.message}` });
      }

      // 5. Pesquisar e Clicar nos ícones XLS para baixar os extratos
      let arquivosBaixados = 0;
      try {
         logger.info({ message: `[${this.nome}] Tentando clicar no botão 'Pesquisar' (se houver)...` });
         
         // Pesquisa em todos os frames (muitos portais usam iframes)
         for (const frame of this.page.frames()) {
            try {
               await frame.evaluate(() => {
                  const botoes = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn'));
                  const btnPesquisar = botoes.find(b => 
                     b.textContent?.trim().toLowerCase() === 'pesquisar' || 
                     b.getAttribute('value')?.toLowerCase() === 'pesquisar' ||
                     b.textContent?.trim().toLowerCase() === 'buscar'
                  );
                  if (btnPesquisar && (btnPesquisar as HTMLElement).click) {
                     (btnPesquisar as HTMLElement).click();
                  }
               });
            } catch (e) {
               // Ignora erros de cross-origin frames se houver
            }
         }

         // Aguarda a tabela carregar
         logger.info({ message: `[${this.nome}] Aguardando resultados da tabela...` });
         await new Promise(r => setTimeout(r, 6000)); 

         logger.info({ message: `[${this.nome}] Buscando botões de Extrato XLSX na tabela (em todos os frames)...` });
         
         let botoesXlsClicados = 0;
         for (const frame of this.page.frames()) {
            try {
               const clicadosNoFrame = await frame.evaluate(() => {
                  let clicados = 0;
                  
                  // Encontrar o índice da coluna que contém 'XLSX' (ou 'XLS')
                  const ths = Array.from(document.querySelectorAll('th'));
                  const indexXlsx = ths.findIndex(th => 
                     th.textContent?.toUpperCase().includes('XLSX') || 
                     th.textContent?.toUpperCase().includes('XLS')
                  );
                  
                  if (indexXlsx > -1) {
                     // Para cada linha da tabela
                     const trs = Array.from(document.querySelectorAll('tbody tr'));
                     trs.forEach(tr => {
                        const tds = tr.querySelectorAll('td');
                        if (tds.length > indexXlsx) {
                           const tdXlsx = tds[indexXlsx];
                           // Procura o botão clicável dentro da célula (Angular usa span/svg com (click))
                           const btn = tdXlsx.querySelector('span, svg, a, img');
                           if (btn) {
                              // Se for SVG, o clique pode falhar se não clicarmos no pai ou dispararmos o evento corretamente
                              const target = (btn.closest('span') || btn.closest('a') || btn) as HTMLElement;
                              target.click();
                              clicados++;
                           }
                        }
                     });
                  } else {
                     // Fallback: se não achar a tabela bonitinha, tenta do jeito antigo em botões isolados
                     const links = Array.from(document.querySelectorAll('a, img'));
                     links.forEach(el => {
                        if (el.outerHTML.toLowerCase().includes('xls')) {
                           (el as HTMLElement).click();
                           clicados++;
                        }
                     });
                  }
                  
                  return clicados;
               });
               botoesXlsClicados += clicadosNoFrame;
            } catch (e) {
               // Ignora erros de cross-origin frames
            }
         }
         
         arquivosBaixados = botoesXlsClicados;
         logger.info({ message: `[${this.nome}] Clicou em ${botoesXlsClicados} links de Extrato XLSX.` });
         
         // Esperar os downloads concluírem (Até 15 minutos se for muito grande)
         if (botoesXlsClicados > 0) {
            logger.info({ message: `[${this.nome}] Aguardando o download de arquivos pesados (timeout de 15 minutos)...` });
            
            let downloadTerminou = false;
            let tentativas = 0;
            const maxTentativas = 90; // 90 * 10s = 15 minutos
            
            while (!downloadTerminou && tentativas < maxTentativas) {
               await new Promise(r => setTimeout(r, 10000)); // Checa a cada 10 segundos
               
               // Verifica se existe algum arquivo ".crdownload" (Chrome baixando) na pasta
               const arquivosNaPasta = fs.readdirSync(downloadPath);
               const baixando = arquivosNaPasta.some(f => f.endsWith('.crdownload') || f.endsWith('.tmp'));
               
               if (!baixando && arquivosNaPasta.length > 0) {
                  downloadTerminou = true;
               }
               tentativas++;
            }
            
            if (downloadTerminou) {
               logger.info({ message: `[${this.nome}] Downloads finalizados com sucesso!` });
            } else {
               logger.warn({ message: `[${this.nome}] Timeout de 15 minutos atingido e o download parece não ter terminado.` });
            }
         }
      } catch (err: any) {
         logger.warn({ message: `[${this.nome}] Erro ao tentar baixar XLS: ${err.message}` });
      }

      // NOVO: Salvar o HTML da página e dos iframes para depuração
      try {
         let fullHtml = await this.page.content();
         for (const frame of this.page.frames()) {
            try {
               fullHtml += `\n\n--- FRAME HTML ---\n` + await frame.content();
            } catch (e) {}
         }
         fs.writeFileSync(path.join(downloadPath, `debug_html_${Date.now()}.txt`), fullHtml);
      } catch (e) {}

      // 6. Capturar uma Screenshot Final
      const screenshotPath = path.join(downloadPath, `resultado_unimed_${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });

      // Retornar um sucesso para a interface
      const resultado = {
        status: "sucesso",
        mensagem: `Robô Unimed navegou até os Demonstrativos e acionou o download de ${arquivosBaixados} arquivo(s) Excel.`,
        pastaDownload: downloadPath,
        arquivosBaixados: arquivosBaixados,
        screenshotSalva: screenshotPath
      };

      // Deixa o browser aberto por mais 3 segundos para o usuário ver antes de fechar (em modo dev)
      if (!isProducao) {
        await new Promise(r => setTimeout(r, 3000));
      }

      await this.fecharBrowser();
      return resultado;

    } catch (error: any) {
      await this.capturarErro(error, "Execução Principal - Unimed");
      await this.fecharBrowser();
      throw error;
    }
  }
}
