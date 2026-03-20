"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = inboundRoutes;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const XrayService_1 = require("../services/XrayService");
const xray_utils_1 = require("../utils/xray-utils");
async function inboundRoutes(fastify, options) {
    const xrayService = XrayService_1.XrayService.getInstance();
    fastify.get('/', async () => {
        return await db_1.db.query.inbounds.findMany({
            with: {
                clients: true
            }
        });
    });
    fastify.post('/', async (request, reply) => {
        const body = request.body;
        if (!body.tag || !body.port || !body.protocol) {
            return reply.code(400).send({ error: 'Missing required fields' });
        }
        let streamSettings = body.stream || {};
        // Auto-generate Reality keys for VLESS inbounds
        if (body.protocol === 'vless' && !streamSettings.realitySettings) {
            const keys = (0, xray_utils_1.generateRealityKeys)();
            streamSettings = {
                network: "tcp",
                security: "reality",
                realitySettings: {
                    show: false,
                    dest: "google.com:443",
                    xver: 0,
                    serverNames: ["google.com", "www.google.com"],
                    privateKey: keys.privateKey,
                    minClientVer: "",
                    maxClientVer: "",
                    maxTimeDiff: 0,
                    shortIds: [(0, xray_utils_1.generateShortId)()]
                }
            };
        }
        const [inbound] = await db_1.db.insert(schema_1.inbounds).values({
            tag: body.tag,
            port: body.port,
            protocol: body.protocol,
            settings: JSON.stringify(body.settings || { clients: [], decryptions: [] }),
            sniffing: JSON.stringify(body.sniffing || { enabled: true, destOverride: ["http", "tls"] }),
            stream: JSON.stringify(streamSettings),
        }).returning();
        await xrayService.restart();
        return inbound;
    });
    fastify.delete('/:id', async (request, reply) => {
        const { id } = request.params;
        await db_1.db.delete(schema_1.inbounds).where((0, drizzle_orm_1.eq)(schema_1.inbounds.id, parseInt(id)));
        await xrayService.restart();
        return { success: true };
    });
}
