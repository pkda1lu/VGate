import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { db } from '../db';
import { clients as clientTable, traffic as trafficTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { XrayService } from '../services/XrayService';
import { generateUuid } from '../utils/xray-utils';

export default async function clientRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  const xrayService = XrayService.getInstance();

  fastify.get('/', async () => {
    return await db.query.clients.findMany({
      with: {
        inbound: true,
        traffic: true
      }
    });
  });

  fastify.post('/', async (request, reply) => {
    const body = request.body as any;
    
    if (!body.inboundId || !body.email) {
      return reply.code(400).send({ error: 'Missing required fields: inboundId, email' });
    }

    const uuid = body.uuid || generateUuid();

    const [client] = await db.insert(clientTable).values({
      id: generateUuid(),
      inboundId: body.inboundId,
      email: body.email,
      uuid: uuid,
      flow: body.flow || null,
      limitIp: body.limitIp || 0,
      totalGb: body.totalGb || 0,
    }).returning();

    // Create traffic entry
    await db.insert(trafficTable).values({
      clientId: client.id
    });

    await xrayService.restart();
    return client;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;
    
    await db.update(clientTable)
      .set({
        email: body.email,
        uuid: body.uuid,
        flow: body.flow,
        limitIp: body.limitIp,
        totalGb: body.totalGb,
        enabled: body.enabled,
        expiry: body.expiry ? new Date(body.expiry) : null,
        updatedAt: new Date(),
      })
      .where(eq(clientTable.id, id));

    await xrayService.restart();
    return { success: true };
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as any;
    await db.delete(clientTable).where(eq(clientTable.id, id));
    await db.delete(trafficTable).where(eq(trafficTable.clientId, id));
    await xrayService.restart();
    return { success: true };
  });
}
