"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const static_1 = __importDefault(require("@fastify/static"));
const path_1 = __importDefault(require("path"));
const XrayService_1 = require("./services/XrayService");
const StatsService_1 = require("./services/StatsService");
const inbound_1 = __importDefault(require("./routes/inbound"));
const client_1 = __importDefault(require("./routes/client"));
const fastify = (0, fastify_1.default)({
    logger: {
        transport: {
            target: 'pino-pretty'
        }
    }
});
async function start() {
    try {
        await fastify.register(cors_1.default);
        // Serve static files (production build of the client)
        await fastify.register(static_1.default, {
            root: path_1.default.join(__dirname, '../public'),
            prefix: '/',
        });
        // SPA support: serve index.html for unknown routes
        fastify.setNotFoundHandler((request, reply) => {
            if (request.url.startsWith('/api')) {
                reply.code(404).send({ error: 'Not Found' });
            }
            else {
                reply.sendFile('index.html');
            }
        });
        await fastify.register(inbound_1.default, { prefix: '/api/inbounds' });
        await fastify.register(client_1.default, { prefix: '/api/clients' });
        fastify.get('/health', async () => {
            return { status: 'ok', time: new Date() };
        });
        const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
        const ADDRESS = '0.0.0.0';
        await fastify.listen({ port: PORT, host: ADDRESS });
        // Start Xray
        const xray = XrayService_1.XrayService.getInstance();
        await xray.start();
        // Start Traffic Polling
        StatsService_1.StatsService.startPolling(5000); // 5 sec interval
        console.log(`VGate Server started on http://localhost:${PORT}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}
start();
