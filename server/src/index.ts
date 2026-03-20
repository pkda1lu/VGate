import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { XrayService } from './services/XrayService';
import { StatsService } from './services/StatsService';
import { db } from './db';
import { eq } from 'drizzle-orm';
import inboundRoutes from './routes/inbound';
import clientRoutes from './routes/client';
import settingsRoutes from './routes/settings';

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty'
    }
  }
});

async function start() {
  try {
    await fastify.register(cors);
    
    // Serve static files (production build of the client)
    await fastify.register(fastifyStatic, {
      root: path.join(__dirname, '../public'),
      prefix: '/',
    });

    // SPA support: serve index.html for unknown routes
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api')) {
        reply.code(404).send({ error: 'Not Found' });
      } else {
        reply.sendFile('index.html');
      }
    });

    await fastify.register(inboundRoutes, { prefix: '/api/inbounds' });
    await fastify.register(clientRoutes, { prefix: '/api/clients' });
    await fastify.register(settingsRoutes, { prefix: '/api/settings' });

    fastify.get('/health', async () => {
      return { status: 'ok', time: new Date() };
    });

    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
    const ADDRESS = '0.0.0.0';

    await fastify.listen({ port: PORT, host: ADDRESS });
    
    // Start Xray
    const xray = XrayService.getInstance();
    await xray.start();

    // Start Traffic Polling
    StatsService.startPolling(5000); // 5 sec interval
    
    console.log(`VGate Server started on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
