import config from '../../config/index.js';
import { stubProvider } from './stubProvider.js';

// Registry of available text-to-video providers. Add real providers here.
const providers = new Map([[stubProvider.id, stubProvider]]);

export function registerProvider(provider) {
  providers.set(provider.id, provider);
}

export function getProvider(id = config.ai.provider) {
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown AI video provider: "${id}"`);
  }
  return provider;
}
