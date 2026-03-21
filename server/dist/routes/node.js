"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = nodeRoutes;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const xray_utils_1 = require("../utils/xray-utils");
async function nodeRoutes(fastify, options) {
    // List all nodes
    fastify.get('/', async () => {
        return await db_1.db.query.nodes.findMany();
    });
    // Get specific node config (for Slave)
    fastify.get('/me', async (request, reply) => {
        const { apiKey } = request.query;
        if (!apiKey)
            return reply.code(400).send({ error: 'apiKey required' });
        const node = await db_1.db.query.nodes.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.nodes.apiKey, apiKey)
        });
        if (!node)
            return reply.code(401).send({ error: 'Invalid apiKey' });
        // Update last seen
        await db_1.db.update(schema_1.nodes).set({ lastSeen: new Date(), status: 'online' }).where((0, drizzle_orm_1.eq)(schema_1.nodes.id, node.id));
        // Get all inbounds for this node PLUS all global inbounds from Master
        const inboundsList = await db_1.db.query.inbounds.findMany({
            where: (fields, { eq, or, and }) => or(eq(fields.nodeId, node.id), and(eq(fields.nodeId, 1), eq(fields.isGlobal, true))),
            with: { clients: true }
        });
        return { node, inbounds: inboundsList };
    });
    // Create Node
    fastify.post('/', async (request, reply) => {
        const body = request.body;
        if (!body.name || !body.address)
            return reply.code(400).send({ error: 'name and address required' });
        const node = await db_1.db.insert(schema_1.nodes).values({
            name: body.name,
            address: body.address,
            apiKey: (0, xray_utils_1.generateUuid)(),
            isMaster: false,
            status: 'offline'
        }).returning();
        return node[0];
    });
    // Delete Node
    fastify.delete('/:id', async (request, reply) => {
        const { id } = request.params;
        if (parseInt(id) === 1)
            return reply.code(403).send({ error: 'Cannot delete master node' });
        await db_1.db.delete(schema_1.nodes).where((0, drizzle_orm_1.eq)(schema_1.nodes.id, parseInt(id)));
        return { success: true };
    });
    // Update Node
    fastify.put('/:id', async (request, reply) => {
        const { id } = request.params;
        const body = request.body;
        await db_1.db.update(schema_1.nodes).set({
            name: body.name,
            address: body.address
        }).where((0, drizzle_orm_1.eq)(schema_1.nodes.id, parseInt(id)));
        return { success: true };
    });
    // Report Node Traffic
    fastify.post('/report', async (request, reply) => {
        const { apiKey, trafficData } = request.body;
        if (!apiKey)
            return reply.code(401).send({ error: 'Auth required' });
        const node = await db_1.db.query.nodes.findFirst({ where: (0, drizzle_orm_1.eq)(schema_1.nodes.apiKey, apiKey) });
        if (!node)
            return reply.code(401).send({ error: 'Invalid API key' });
        // TODO: Aggregate traffic from node into main traffic table
        // For now, just update status
        await db_1.db.update(schema_1.nodes).set({ lastSeen: new Date(), status: 'online' }).where((0, drizzle_orm_1.eq)(schema_1.nodes.id, node.id));
        return { success: true };
    });
}
