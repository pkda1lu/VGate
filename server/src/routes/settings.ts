import { FastifyInstance } from 'fastify';
import { SettingsService } from '../services/SettingsService';

export default async function settingsRoutes(fastify: FastifyInstance) {
  const settingsService = SettingsService.getInstance();

  // Get all settings
  fastify.get('/', async () => {
    return await settingsService.getAllSettings();
  });

  // Get single setting
  fastify.get('/:key', async (request: any, reply) => {
    const { key } = request.params;
    const value = await settingsService.getSetting(key);
    if (value === undefined) {
      return reply.code(404).send({ error: 'Setting not found' });
    }
    return { key, value };
  });

  // Update multiple settings
  fastify.post('/bulk', async (request: any) => {
    const settingsMap = request.body as Record<string, string>;
    await settingsService.updateMany(settingsMap);
    return { status: 'ok' };
  });

  // Update single setting
  fastify.put('/:key', async (request: any) => {
    const { key } = request.params;
    const { value } = request.body;
    await settingsService.updateSetting(key, value);
    return { status: 'ok', key, value };
  });

  // Restart Xray
  fastify.post('/restart', async () => {
    const { XrayService } = await import('../services/XrayService');
    await XrayService.getInstance().restart();
    return { status: 'ok' };
  });

  // Get Xray logs
  fastify.get('/logs', async () => {
    const { XrayService } = await import('../services/XrayService');
    return XrayService.getInstance().getLogs();
  });
}
