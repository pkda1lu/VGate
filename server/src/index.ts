import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { XrayService } from './services/XrayService';
import { StatsService } from './services/StatsService';
import { SlaveService } from './services/SlaveService';
import { db } from './db';
import { eq } from 'drizzle-orm';
import inboundRoutes from './routes/inbound';
import clientRoutes from './routes/client';
import settingsRoutes from './routes/settings';
import systemRoutes from './routes/system';
import authRoutes from './routes/auth';
import subRoutes from './routes/sub';
import nodeRoutes from './routes/node';

import fs from 'fs-extra';

async function start() {
  let fastify: any;
  try {
    const { SlaveService } = await import('./services/SlaveService');
    const slave = SlaveService.getInstance();
    const isSlave = slave.isEnabled();

    let settingsService: any = null;
    let httpsOptions: any = undefined;

    if (!isSlave) {
        const { SettingsService } = await import('./services/SettingsService');
        settingsService = SettingsService.getInstance();
        
        // SSL detection
        const sslCert = await settingsService.getSetting('ssl_cert');
        const sslKey = await settingsService.getSetting('ssl_key');

        if (sslCert && sslKey && fs.existsSync(sslCert) && fs.existsSync(sslKey)) {
            try {
                httpsOptions = {
                    cert: fs.readFileSync(sslCert),
                    key: fs.readFileSync(sslKey)
                };
                console.log(`[SSL] Secure transport initialized from ${path.basename(sslCert)}`);
            } catch (sslErr: any) {
                console.error(`[SSL ERROR] Failed to read certificates: ${sslErr.message}`);
                console.warn(`[SSL] Falling back to non-secure HTTP for panel access.`);
            }
        }
    }

    fastify = Fastify({
      https: httpsOptions,
      logger: { transport: { target: 'pino-pretty' } }
    });

    await fastify.register(cors);
    
    // Serve static files (production build of the client)
    await fastify.register(fastifyStatic, {
      root: path.join(__dirname, '../public'),
      prefix: '/',
    });

    // SPA support: serve index.html for unknown routes
    fastify.setNotFoundHandler((request: any, reply: any) => {
      if (request.url.startsWith('/api')) {
        reply.code(404).send({ error: 'Not Found' });
      } else {
        reply.sendFile('index.html');
      }
    });

    // --- Routes ---
    console.log(`[BOOT] Loading subscription settings...`);
    const subPathSetting = settingsService ? await settingsService.getSetting('sub_path', '/api/sub') : '/api/sub';
    // Clean subPathSetting for prefix (must not end with / unless it is just /)
    const cleanSubPrefix = subPathSetting.length > 1 && subPathSetting.endsWith('/') 
        ? subPathSetting.slice(0, -1) 
        : subPathSetting;

    console.log(`[BOOT] Registering routes (Sub path: ${cleanSubPrefix})...`);
    await fastify.register(inboundRoutes, { prefix: '/api/inbounds' });
    await fastify.register(clientRoutes, { prefix: '/api/clients' });
    await fastify.register(settingsRoutes, { prefix: '/api/settings' });
    await fastify.register(systemRoutes, { prefix: '/api/system' });
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(subRoutes, { prefix: cleanSubPrefix });
    // Also register at /api/sub for compatibility if different
    if (cleanSubPrefix !== '/api/sub' && cleanSubPrefix !== '/api/sub/') {
        await fastify.register(subRoutes, { prefix: '/api/sub' });
    }
    await fastify.register(nodeRoutes, { prefix: '/api/nodes' });

    console.log(`[BOOT] Initializing Auth Middleware...`);
    fastify.addHook('onRequest', async (request: any, reply: any) => {
        const bypass = [
            '/api/auth', 
            '/api/sub', 
            cleanSubPrefix,
            '/api/settings/xray-config', 
            '/health',
            '/api/nodes/me',
            '/api/nodes/report'
        ].filter(Boolean);

        const isBypassed = bypass.some(p => request.url.startsWith(p));
        if (request.url.startsWith('/api') && !isBypassed) {
            const token = request.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
        }
        
        // Also bypass the custom sub path even if it doesn't start with /api
        if (request.url.startsWith(cleanSubPrefix) && !isBypassed) {
             // Handled by isBypassed above
        }
    });

    fastify.get('/health', async () => {
      return { status: 'ok', time: new Date() };
    });

    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
    const ADDRESS = '0.0.0.0';

    console.log(`[BOOT] Attempting to listen on ${ADDRESS}:${PORT}...`);
    await fastify.listen({ port: PORT, host: ADDRESS });

    // --- Dedicated Subscription Listener ---
    const subPort = settingsService ? await settingsService.getSetting('sub_port') : null;
    if (subPort && parseInt(subPort) !== PORT) {
        console.log(`[BOOT] Starting dedicated subscription server on port ${subPort}...`);
        const subServer = Fastify({
            https: httpsOptions,
            logger: false // Keep logs clean
        });
        await subServer.register(cors);
        await subServer.register(subRoutes, { prefix: cleanSubPrefix });
        // Also register at root for sub if it doesn't take the whole path
        if (cleanSubPrefix !== '/') {
            await subServer.register(subRoutes, { prefix: '/' });
        }
        subServer.listen({ port: parseInt(subPort), host: ADDRESS }).catch(err => {
            console.error(`[ERROR] Failed to start sub server on ${subPort}:`, err.message);
        });
    }
    
    // Start Xray
    const xray = XrayService.getInstance();
    
    // Skip Master-only initialization if in Slave mode
    if (!isSlave) {
        console.log(`[BOOT] Master-mode: sync default settings...`);
        const defaults = {
          xray_binary: process.platform === 'win32' ? 'xray.exe' : '/usr/local/bin/xray',
          xray_config_path: path.join(process.cwd(), 'xray_config.json'),
          panel_port: '4000',
          xray_config_log: JSON.stringify({ loglevel: "warning" }),
          xray_config_dns: JSON.stringify({ servers: ["1.1.1.1", "8.8.8.8"] }),
          xray_config_outbounds: JSON.stringify([
            { protocol: "freedom", tag: "direct", settings: { domainStrategy: "AsIs" } },
            { protocol: "blackhole", tag: "blocked" }
          ]),
          xray_config_routing: JSON.stringify({
            domainStrategy: "AsIs",
            rules: [
              { type: "field", inboundTag: ["api"], outboundTag: "api" },
              { type: "field", ip: ["geoip:private"], outboundTag: "blocked" },
              { type: "field", protocol: ["bittorrent"], outboundTag: "blocked" }
            ]
          }),
          xray_config_policy: JSON.stringify({
            levels: { "0": { statsUserUplink: true, statsUserDownlink: true } },
            system: { statsInboundUplink: true, statsInboundDownlink: true }
          }),
          block_bittorrent: 'true',
          block_private_ips: 'true',
          block_ads: 'false',
        };
        for (const [key, value] of Object.entries(defaults)) {
          const existing = await settingsService.getSetting(key);
          if (!existing) await settingsService.updateSetting(key, value);
        }

        console.log(`[BOOT] Master-mode: starting core services...`);
        await xray.start();
        StatsService.startPolling(5000); // 5 sec interval
    } else {
        console.log(`[BOOT] Slave-mode: initial sync...`);
        await slave.start();
    }
    
    console.log(`[VGATE SUCCESS] Panel is live on port ${PORT}`);
  } catch (err: any) {
    console.error(`\n[FATAL CRASH] Server failed to start:`, err.message);
    if (fastify) {
      fastify.log.error(err);
    }
    process.exit(1);
  }
}

start();
