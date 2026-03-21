import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { db } from '../db';
import { nodes as nodeTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateUuid } from '../utils/xray-utils';

export default async function nodeRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // List all nodes
  fastify.get('/', async () => {
    return await db.query.nodes.findMany();
  });

  // Get specific node config (for Slave)
  fastify.get('/me', async (request, reply) => {
    const { apiKey } = request.query as any;
    if (!apiKey) return reply.code(400).send({ error: 'apiKey required' });

    const node = await db.query.nodes.findFirst({
        where: eq(nodeTable.apiKey, apiKey)
    });

    if (!node) return reply.code(401).send({ error: 'Invalid apiKey' });

    // Update last seen
    await db.update(nodeTable).set({ lastSeen: new Date(), status: 'online' }).where(eq(nodeTable.id, node.id));

    // Get all inbounds for this node
    const inboundsList = await db.query.inbounds.findMany({
        where: (fields, { eq }) => eq(fields.nodeId, node.id),
        with: { clients: true }
    });

    return { node, inbounds: inboundsList };
  });

  // Create Node
  fastify.post('/', async (request, reply) => {
    const body = request.body as any;
    if (!body.name || !body.address) return reply.code(400).send({ error: 'name and address required' });

    const node = await db.insert(nodeTable).values({
        name: body.name,
        address: body.address,
        apiKey: generateUuid(),
        isMaster: false,
        status: 'offline'
    }).returning();
    
    return node[0];
  });

  // Delete Node
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as any;
    if (parseInt(id) === 1) return reply.code(403).send({ error: 'Cannot delete master node' });
    
    await db.delete(nodeTable).where(eq(nodeTable.id, parseInt(id)));
    return { success: true };
  });

  // Report Node Traffic
  fastify.post('/report', async (request, reply) => {
    const { apiKey, trafficData } = request.body as any;
    if (!apiKey) return reply.code(401).send({ error: 'Auth required' });

    const node = await db.query.nodes.findFirst({ where: eq(nodeTable.apiKey, apiKey)});
    if (!node) return reply.code(401).send({ error: 'Invalid API key' });

    // TODO: Aggregate traffic from node into main traffic table
    // For now, just update status
    await db.update(nodeTable).set({ lastSeen: new Date(), status: 'online' }).where(eq(nodeTable.id, node.id));
    return { success: true };
  });
}
