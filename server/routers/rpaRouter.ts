import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { RoboSaudeCaixa } from "../rpa/robos/RoboSaudeCaixa";
import { RoboUnimed } from "../rpa/robos/RoboUnimed";
import { logger } from "../_core/logger";

export const rpaRouter = router({
  /**
   * Executa um robô RPA específico para buscar demonstrativos
   */
  executarRoboBuscaDemonstrativo: adminProcedure
    .input(
      z.object({
        convenioNome: z.enum(["SAUDE_CAIXA", "UNIMED"]),
        url: z.string().url(),
        login: z.string().optional(),
        senha: z.string().optional(),
        competencia: z.string().optional() // Ex: '202505'
      })
    )
    .mutation(async ({ input }) => {
      try {
        let robo;
        
        switch (input.convenioNome) {
          case "SAUDE_CAIXA":
            robo = new RoboSaudeCaixa();
            break;
          case "UNIMED":
            robo = new RoboUnimed();
            break;
          default:
            throw new Error(`Robô para o convênio ${input.convenioNome} não implementado.`);
        }

        logger.info({ message: `Iniciando execução manual do robô ${input.convenioNome}` });

        const resultado = await robo.executar({
          url: input.url,
          login: input.login,
          senha: input.senha
        }, {
          competencia: input.competencia || ""
        });

        return {
          sucesso: true,
          resultado
        };
        
      } catch (error: any) {
        logger.error({ 
          message: `Falha na execução do robô RPA ${input.convenioNome}`,
          error: error.message 
        });
        throw error;
      }
    }),
});
