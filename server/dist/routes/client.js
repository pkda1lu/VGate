"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = clientRoutes;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const XrayService_1 = require("../services/XrayService");
const xray_utils_1 = require("../utils/xray-utils");
async function clientRoutes(fastify, options) {
    const xrayService = XrayService_1.XrayService.getInstance();
    fastify.get('/', async () => {
        return await db_1.db.query.clients.findMany({
            with: {
                inbound: true,
                traffic: true
            }
        });
    });
    fastify.post('/', async (request, reply) => {
        const body = request.body;
        if (!body.inboundId || !body.email) {
            return reply.code(400).send({ error: 'Missing required fields: inboundId, email' });
        }
        const uuid = body.uuid || (0, xray_utils_1.generateUuid)();
        const [client] = await db_1.db.insert(schema_1.clients).values({
            id: (0, xray_utils_1.generateUuid)(),
            inboundId: body.inboundId,
            subId: body.subId || (0, xray_utils_1.generateUuid)(), // ID for grouping in subscription
            email: body.email,
            uuid: uuid,
            flow: body.flow || null,
            limitIp: body.limitIp || 0,
            totalGb: body.totalGb || 0,
        }).returning();
        // Create traffic entry
        await db_1.db.insert(schema_1.traffic).values({
            clientId: client.id
        });
        await xrayService.restart();
        return client;
    });
    fastify.put('/:id', async (request, reply) => {
        const { id } = request.params;
        const body = request.body;
        await db_1.db.update(schema_1.clients)
            .set({
            email: body.email,
            uuid: body.uuid,
            subId: body.subId,
            flow: body.flow,
            limitIp: body.limitIp,
            totalGb: body.totalGb,
            enabled: body.enabled,
            expiry: body.expiry ? new Date(body.expiry) : null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.clients.id, id));
        await xrayService.restart();
        return { success: true };
    });
    fastify.delete('/:id', async (request, reply) => {
        const { id } = request.params;
        await db_1.db.delete(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.id, id));
        await db_1.db.delete(schema_1.traffic).where((0, drizzle_orm_1.eq)(schema_1.traffic.clientId, id));
        await xrayService.restart();
        return { success: true };
    });
}
