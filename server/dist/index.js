"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const settings_1 = __importDefault(require("./routes/settings"));
const system_1 = __importDefault(require("./routes/system"));
const auth_1 = __importDefault(require("./routes/auth"));
const sub_1 = __importDefault(require("./routes/sub"));
const node_1 = __importDefault(require("./routes/node"));
const fs_extra_1 = __importDefault(require("fs-extra"));
async function start() {
    let fastify;
    try {
        const { SlaveService } = await Promise.resolve().then(() => __importStar(require('./services/SlaveService')));
        const slave = SlaveService.getInstance();
        const isSlave = slave.isEnabled();
        let settingsService = null;
        let httpsOptions = undefined;
        if (!isSlave) {
            const { SettingsService } = await Promise.resolve().then(() => __importStar(require('./services/SettingsService')));
            settingsService = SettingsService.getInstance();
            // SSL detection
            const sslCert = await settingsService.getSetting('ssl_cert');
            const sslKey = await settingsService.getSetting('ssl_key');
            if (sslCert && sslKey && fs_extra_1.default.existsSync(sslCert) && fs_extra_1.default.existsSync(sslKey)) {
                try {
                    httpsOptions = {
                        cert: fs_extra_1.default.readFileSync(sslCert),
                        key: fs_extra_1.default.readFileSync(sslKey)
                    };
                    console.log(`[SSL] Secure transport initialized from ${path_1.default.basename(sslCert)}`);
                }
                catch (sslErr) {
                    console.error(`[SSL ERROR] Failed to read certificates: ${sslErr.message}`);
                    console.warn(`[SSL] Falling back to non-secure HTTP for panel access.`);
                }
            }
        }
        fastify = (0, fastify_1.default)({
            https: httpsOptions,
            logger: { transport: { target: 'pino-pretty' } }
        });
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
        // --- Routes ---
        console.log(`[BOOT] Loading subscription settings...`);
        const subPathSetting = settingsService ? await settingsService.getSetting('sub_path', '/api/sub') : '/api/sub';
        // Clean subPathSetting for prefix (must not end with / unless it is just /)
        const cleanSubPrefix = subPathSetting.length > 1 && subPathSetting.endsWith('/')
            ? subPathSetting.slice(0, -1)
            : subPathSetting;
        console.log(`[BOOT] Registering routes (Sub path: ${cleanSubPrefix})...`);
        await fastify.register(inbound_1.default, { prefix: '/api/inbounds' });
        await fastify.register(client_1.default, { prefix: '/api/clients' });
        await fastify.register(settings_1.default, { prefix: '/api/settings' });
        await fastify.register(system_1.default, { prefix: '/api/system' });
        await fastify.register(auth_1.default, { prefix: '/api/auth' });
        await fastify.register(sub_1.default, { prefix: cleanSubPrefix });
        // Also register at /api/sub for compatibility if different
        if (cleanSubPrefix !== '/api/sub' && cleanSubPrefix !== '/api/sub/') {
            await fastify.register(sub_1.default, { prefix: '/api/sub' });
        }
        await fastify.register(node_1.default, { prefix: '/api/nodes' });
        console.log(`[BOOT] Initializing Auth Middleware...`);
        fastify.addHook('onRequest', async (request, reply) => {
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
            const subServer = (0, fastify_1.default)({
                https: httpsOptions,
                logger: false // Keep logs clean
            });
            await subServer.register(cors_1.default);
            await subServer.register(sub_1.default, { prefix: cleanSubPrefix });
            // Also register at root for sub if it doesn't take the whole path
            if (cleanSubPrefix !== '/') {
                await subServer.register(sub_1.default, { prefix: '/' });
            }
            subServer.listen({ port: parseInt(subPort), host: ADDRESS }).catch(err => {
                console.error(`[ERROR] Failed to start sub server on ${subPort}:`, err.message);
            });
        }
        // Start Xray
        const xray = XrayService_1.XrayService.getInstance();
        // Skip Master-only initialization if in Slave mode
        if (!isSlave) {
            console.log(`[BOOT] Master-mode: sync default settings...`);
            const defaults = {
                xray_binary: process.platform === 'win32' ? 'xray.exe' : '/usr/local/bin/xray',
                xray_config_path: path_1.default.join(process.cwd(), 'xray_config.json'),
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
                if (!existing)
                    await settingsService.updateSetting(key, value);
            }
            console.log(`[BOOT] Master-mode: starting core services...`);
            await xray.start();
            StatsService_1.StatsService.startPolling(5000); // 5 sec interval
        }
        else {
            console.log(`[BOOT] Slave-mode: initial sync...`);
            await slave.start();
        }
        console.log(`[VGATE SUCCESS] Panel is live on port ${PORT}`);
    }
    catch (err) {
        console.error(`\n[FATAL CRASH] Server failed to start:`, err.message);
        if (fastify) {
            fastify.log.error(err);
        }
        process.exit(1);
    }
}
start();
