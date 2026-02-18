/**
 * Feature Flags para controlar refatoração gradual com canary deployment
 * Permite ativar/desativar features sem deploy com fallback automático
 * 
 * Uso:
 * if (shouldUseModule('faturamento', ctx.user.id)) {
 *   return newFaturamentoRouter.list(input);
 * } else {
 *   return legacyFaturamentoRouter.list(input);
 * }
 */

export interface FeatureFlagConfig {
  enabled: boolean;
  trafficPercentage: number; // 0-100
  canaryDeployment: boolean;
  fallbackToMonolith: boolean;
  maxErrorRate: number; // 0-100
}

export const featureFlags = {
  // Módulos modularizados com canary deployment
  faturamento: {
    enabled: process.env.ENABLE_MODULO_FATURAMENTO === 'true',
    trafficPercentage: parseInt(process.env.FATURAMENTO_TRAFFIC_PERCENTAGE || '5'),
    canaryDeployment: true,
    fallbackToMonolith: true,
    maxErrorRate: 5,
  },
  glosa: {
    enabled: process.env.ENABLE_MODULO_GLOSA === 'true',
    trafficPercentage: parseInt(process.env.GLOSA_TRAFFIC_PERCENTAGE || '5'),
    canaryDeployment: true,
    fallbackToMonolith: true,
    maxErrorRate: 5,
  },
  comparacoes: {
    enabled: process.env.ENABLE_MODULO_COMPARACOES === 'true',
    trafficPercentage: parseInt(process.env.COMPARACOES_TRAFFIC_PERCENTAGE || '10'),
    canaryDeployment: true,
    fallbackToMonolith: true,
    maxErrorRate: 5,
  },
  tasy: {
    enabled: process.env.ENABLE_MODULO_TASY === 'true',
    trafficPercentage: parseInt(process.env.TASY_TRAFFIC_PERCENTAGE || '10'),
    canaryDeployment: true,
    fallbackToMonolith: true,
    maxErrorRate: 5,
  },
  relatorios: {
    enabled: process.env.ENABLE_MODULO_RELATORIOS === 'true',
    trafficPercentage: parseInt(process.env.RELATORIOS_TRAFFIC_PERCENTAGE || '20'),
    canaryDeployment: true,
    fallbackToMonolith: true,
    maxErrorRate: 5,
  },
  
  // Sistemas novos
  USE_NEW_RBAC: process.env.USE_NEW_RBAC === 'true',
  USE_AUDIT_LOG: process.env.USE_AUDIT_LOG === 'true',
  USE_STRUCTURED_LOGGING: process.env.USE_STRUCTURED_LOGGING === 'true',
  USE_VALIDATION: process.env.USE_VALIDATION === 'true',
  
  // Rollout gradual (0-100)
  ROLLOUT_PERCENTAGE: parseInt(process.env.ROLLOUT_PERCENTAGE || '0', 10),
} as any;

/**
 * Verificar se deve usar módulo ou fallback para monolito
 * Permite rollout gradual com canary deployment
 */
export function shouldUseModule(
  moduleName: string,
  userId?: string
): boolean {
  const config = featureFlags[moduleName] as FeatureFlagConfig | undefined;

  if (!config || !config.enabled) {
    return false;
  }

  // Verificar canary deployment
  if (config.canaryDeployment) {
    const hash = userId ? hashUserId(userId) : Math.random() * 100;
    if (hash > config.trafficPercentage) {
      return false;
    }
  }

  return true;
}

/**
 * Hash simples do userId para canary deployment
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Verificar se feature está ativa para usuário (compatibilidade)
 */
export function isFeatureActive(
  featureName: string,
  userId?: number
): boolean {
  const config = featureFlags[featureName];
  
  if (!config) return false;
  if (typeof config === 'boolean') return config;
  if (typeof config === 'object' && 'enabled' in config) {
    return shouldUseModule(featureName, userId?.toString());
  }
  
  return false;
}
