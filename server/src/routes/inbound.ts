import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { db } from '../db';
import { inbounds as inboundTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { XrayService } from '../services/XrayService';
import { generateRealityKeys, generateShortId } from '../utils/xray-utils';

export default async function inboundRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  const xrayService = XrayService.getInstance();

  fastify.get('/', async () => {
    return await db.query.inbounds.findMany({
      with: {
        clients: true
      }
    });
  });

  fastify.post('/', async (request, reply) => {
    const body = request.body as any;
    
    if (!body.tag || !body.port || !body.protocol) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    const port = parseInt(body.port);
    if (isNaN(port) || port <= 0 || port > 65535) {
      return reply.code(400).send({ error: 'Invalid port: must be between 1 and 65535' });
    }
    body.port = port;

    let streamSettings = body.stream || {};
    
    // Auto-generate Reality keys for VLESS inbounds
    if (body.protocol === 'vless' && !streamSettings.realitySettings) {
      const keys = generateRealityKeys();
      streamSettings = {
        network: "tcp",
        security: "reality",
        realitySettings: {
          show: false,
          dest: "google.com:443",
          xver: 0,
          serverNames: ["google.com", "www.google.com"],
          privateKey: keys.privateKey,
          publicKey: keys.publicKey,
          minClientVer: "",
          maxClientVer: "",
          maxTimeDiff: 0,
          shortIds: [generateShortId()]
        }
      };
    }

    const [inbound] = await db.insert(inboundTable).values({
      tag: body.tag,
      nodeId: body.nodeId || 1,
      isGlobal: body.isGlobal || false,
      port: body.port,
      protocol: body.protocol,
      settings: JSON.stringify(body.settings || { clients: [], decryptions: [] }),
      sniffing: JSON.stringify(body.sniffing || { enabled: true, destOverride: ["http", "tls"] }),
      stream: JSON.stringify(body.stream || streamSettings),
    }).returning();

    await xrayService.restart();
    return inbound;
  });

  fastify.get('/generate-reality', async () => {
    const keys = generateRealityKeys();
    return {
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      shortId: generateShortId()
    };
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;
    
    await db.update(inboundTable)
      .set({
        tag: body.tag,
        nodeId: body.nodeId,
        isGlobal: body.isGlobal,
        port: body.port,
        protocol: body.protocol,
        settings: JSON.stringify(body.settings),
        sniffing: JSON.stringify(body.sniffing),
        stream: JSON.stringify(body.stream),
        updatedAt: new Date(),
      })
      .where(eq(inboundTable.id, parseInt(id)));

    await xrayService.restart();
    return { success: true };
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as any;
    await db.delete(inboundTable).where(eq(inboundTable.id, parseInt(id)));
    await xrayService.restart();
    return { success: true };
  });
}
