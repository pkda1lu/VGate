"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = systemRoutes;
const SystemService_1 = require("../services/SystemService");
const SslService_1 = require("../services/SslService");
async function systemRoutes(fastify) {
    const systemService = SystemService_1.SystemService.getInstance();
    const sslService = SslService_1.SslService.getInstance();
    // Get metrics
    fastify.get('/metrics', async () => {
        return await systemService.getMetrics();
    });
    // SSL Setup
    fastify.post('/setup-ssl', async (request, reply) => {
        const { domain, email } = request.body;
        if (!domain || !email) {
            return reply.code(400).send({ error: 'Domain and email are required' });
        }
        const result = await sslService.setupSsl(domain, email);
        return result;
    });
    // Cert status check
    fastify.get('/cert-status/:domain', async (request) => {
        const { domain } = request.params;
        return await sslService.getCertStatus(domain);
    });
}
