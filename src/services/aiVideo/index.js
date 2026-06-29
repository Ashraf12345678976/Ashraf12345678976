import config from '../../config/index.js';
import { stubProvider } from './stubProvider.js';
import { replicateProvider } from './replicateProvider.js';
import { runwayProvider } from './runwayProvider.js';

// Registry of available text-to-video providers.
const providers = new Map([
  [stubProvider.id, stubProvider],
  [replicateProvider.id, replicateProvider],
  [runwayProvider.id, runwayProvider],
]);

export function registerProvider(provider) {
  providers.set(provider.id, provider);
}

export function listProviders() {
  return [...providers.values()].map((p) => ({
    id: p.id,
    configured: typeof p.isConfigured === 'function' ? p.isConfigured() : true,
  }));
}

/**
 * Resolve the active provider. Honors AI_VIDEO_PROVIDER, but if the chosen
 * real provider is not configured (missing API key) we transparently fall
 * back to the built-in stub so the app always works.
 */
export function getProvider(id = config.ai.provider) {
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown AI video provider: "${id}"`);
  }
  if (typeof provider.isConfigured === 'function' && !provider.isConfigured()) {
    return stubProvider;
  }
  return provider;
}
