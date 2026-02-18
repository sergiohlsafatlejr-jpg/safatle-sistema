/**
 * Feature Flags para controlar refatoração gradual
 * Permite ativar/desativar features sem deploy
 * 
 * Uso:
 * if (isFeatureActive('USE_NEW_FATURAMENTO_MODULE', ctx.user.id)) {
 *   return newFaturamentoRouter.list(input);
 * } else {
 *   return legacyFaturamentoRouter.list(input);
 * }
 */

export const featureFlags = {
  // Módulos modularizados
  USE_NEW_FATURAMENTO_MODULE: process.env.USE_NEW_FATURAMENTO_MODULE === 'true',
  USE_NEW_COMPARACOES_MODULE: process.env.USE_NEW_COMPARACOES_MODULE === 'true',
  USE_NEW_GLOSAS_MODULE: process.env.USE_NEW_GLOSAS_MODULE === 'true',
  USE_NEW_TASY_MODULE: process.env.USE_NEW_TASY_MODULE === 'true',
  USE_NEW_REGRAS_MODULE: process.env.USE_NEW_REGRAS_MODULE === 'true',
  
  // Sistemas novos
  USE_NEW_RBAC: process.env.USE_NEW_RBAC === 'true',
  USE_AUDIT_LOG: process.env.USE_AUDIT_LOG === 'true',
  USE_STRUCTURED_LOGGING: process.env.USE_STRUCTURED_LOGGING === 'true',
  USE_VALIDATION: process.env.USE_VALIDATION === 'true',
  
  // Rollout gradual (0-100)
  ROLLOUT_PERCENTAGE: parseInt(process.env.ROLLOUT_PERCENTAGE || '0', 10),
};

/**
 * Verificar se feature está ativa para usuário
 * Permite rollout gradual (5% dos usuários primeiro)
 */
export function isFeatureActive(
  featureName: keyof typeof featureFlags,
  userId?: number
): boolean {
  const isEnabled = featureFlags[featureName];
  
  if (!isEnabled) return false;
  
  // Se rollout gradual, usar hash do userId
  if (featureName.includes('MODULE') || featureName.includes('RBAC')) {
    if (userId && featureFlags.ROLLOUT_PERCENTAGE < 100) {
      const hash = userId % 100;
      return hash < featureFlags.ROLLOUT_PERCENTAGE;
    }
  }
  
  return true;
}
