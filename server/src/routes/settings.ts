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
    const { SettingsService } = await import('../services/SettingsService');
    const { db } = await import('../db');
    const { users } = await import('../db/schema');
    const { eq } = await import('drizzle-orm');
    
    // Extract account updates if present
    const newUsername = settingsMap.new_username;
    const newPassword = settingsMap.new_password;
    
    if (newUsername || newPassword) {
      const updateData: any = {};
      if (newUsername) updateData.username = newUsername;
      if (newPassword) {
        // In a real app we'd bcrypt here, but we are using plain for now or standard hash
        updateData.password = newPassword; 
      }
      
      // Update first user (admin)
      await db.update(users).set(updateData).where(eq(users.id, 1)).run();
      
      // Remove from settingsMap so they don't get stored as generic settings
      delete settingsMap.new_username;
      delete settingsMap.new_password;
    }

    await SettingsService.getInstance().updateMany(settingsMap);
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

  // DEBUG: Return generated Xray config + process status
  fastify.get('/xray-config', async () => {
    const { XrayService } = await import('../services/XrayService');
    const { SettingsService: SS } = await import('../services/SettingsService');
    const fs = await import('fs-extra');
    const service = XrayService.getInstance();
    const ss = SS.getInstance();
    const configPath = await ss.getSetting('xray_config_path', require('path').join(process.cwd(), 'xray_config.json'));
    let config = null;
    try { config = await fs.readJSON(configPath!); } catch(e) { config = { error: 'Config file not found', path: configPath }; }
    return {
      isRunning: service.isRunning(),
      configPath,
      config
    };
  });
}
