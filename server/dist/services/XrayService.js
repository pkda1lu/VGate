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
exports.XrayService = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../db");
const SettingsService_1 = require("./SettingsService");
class XrayService {
    constructor() {
        this.process = null;
        this.logs = [];
        this.maxLogs = 500;
    }
    static getInstance() {
        if (!XrayService.instance) {
            XrayService.instance = new XrayService();
        }
        return XrayService.instance;
    }
    async generateConfig(externalInbounds) {
        const inboundsData = externalInbounds || await db_1.db.query.inbounds.findMany({
            with: {
                clients: true
            }
        });
        const xrayInbounds = inboundsData
            .filter(inbound => {
            const port = Number(inbound.port);
            if (port <= 0 || port > 65535 || !Number.isInteger(port)) {
                console.warn(`[XrayService] Skipping inbound '${inbound.tag}' with invalid port: ${inbound.port}`);
                return false;
            }
            return true;
        })
            .map(inbound => {
            let settings = { clients: [] };
            try {
                const dbSettings = JSON.parse(inbound.settings);
                // We only need clients and specific fields, strip any trash
                if (dbSettings.clients)
                    settings.clients = dbSettings.clients;
            }
            catch (e) { }
            // Map clients from our DB
            settings.clients = inbound.clients.map((client) => ({
                id: client.uuid,
                email: client.email,
                flow: client.flow === 'none' || !client.flow ? undefined : client.flow,
            }));
            if (inbound.protocol === 'vless') {
                settings.decryption = "none";
                settings.fallbacks = [];
            }
            const stream = JSON.parse(inbound.stream);
            // CRITICAL: Reality SERVER must NOT have publicKey in its config.
            // It only needs privateKey. publicKey is for clients only.
            if (stream.realitySettings) {
                delete stream.realitySettings.publicKey;
                if (Array.isArray(stream.realitySettings.shortIds)) {
                    stream.realitySettings.shortIds = stream.realitySettings.shortIds.filter((s) => s && s.trim().length > 0);
                }
            }
            return {
                tag: inbound.tag,
                port: inbound.port,
                protocol: inbound.protocol,
                settings: settings,
                streamSettings: stream,
                sniffing: JSON.parse(inbound.sniffing)
            };
        });
        const settingsService = SettingsService_1.SettingsService.getInstance();
        // Load config sections from settings
        const logSection = JSON.parse(await settingsService.getSetting('xray_config_log', '{"loglevel":"warning"}'));
        const dnsSection = JSON.parse(await settingsService.getSetting('xray_config_dns', '{"servers":["1.1.1.1"]}'));
        const outboundsSection = JSON.parse(await settingsService.getSetting('xray_config_outbounds', '[{"protocol":"freedom","tag":"direct"},{"protocol":"blackhole","tag":"blocked"}]'));
        const routingSection = JSON.parse(await settingsService.getSetting('xray_config_routing', '{"rules":[]}'));
        const policySection = JSON.parse(await settingsService.getSetting('xray_config_policy', '{"levels":{"0":{"statsUserUplink":true,"statsUserDownlink":true}}}'));
        // Ensure api rule exists
        if (!routingSection.rules)
            routingSection.rules = [];
        if (!routingSection.rules.find((r) => r.inboundTag?.[0] === 'api')) {
            routingSection.rules.unshift({ type: "field", inboundTag: ["api"], outboundTag: "api" });
        }
        // Ensure blackhole outbound exists
        if (!outboundsSection.find((o) => o.tag === 'blocked')) {
            outboundsSection.push({ protocol: "blackhole", tag: "blocked" });
        }
        const config = {
            log: logSection,
            stats: {},
            dns: dnsSection,
            api: {
                tag: "api",
                services: ["HandlerService", "StatsService"]
            },
            policy: policySection,
            inbounds: [
                ...xrayInbounds,
                {
                    listen: "127.0.0.1",
                    port: 10085,
                    protocol: "dokodemo-door",
                    settings: { address: "127.0.0.1" },
                    tag: "api"
                }
            ],
            outbounds: outboundsSection,
            routing: routingSection
        };
        const configPath = await settingsService.getSetting('xray_config_path', path_1.default.join(process.cwd(), 'xray_config.json'));
        await fs.writeJSON(configPath, config, { spaces: 2 });
        return configPath;
    }
    async start(externalInbounds) {
        const configPath = await this.generateConfig(externalInbounds);
        this.stop();
        const settingsService = SettingsService_1.SettingsService.getInstance();
        const xrayBinary = await settingsService.getSetting('xray_binary', process.platform === 'win32' ? 'xray.exe' : '/usr/local/bin/xray');
        if (!fs.existsSync(xrayBinary)) {
            this.addLog(`[Error] Xray binary not found at ${xrayBinary}`);
            console.warn(`Xray binary not found at ${xrayBinary}. Skipping process start.`);
            return;
        }
        // Validate config before launching
        try {
            const testResult = (0, child_process_1.execSync)(`"${xrayBinary}" -test -config "${configPath}"`, { timeout: 10000 }).toString();
            this.addLog(`[System] Config validation OK: ${testResult.trim()}`);
        }
        catch (testErr) {
            const errMsg = (testErr.stdout?.toString() || '') + (testErr.stderr?.toString() || '') || testErr.message;
            this.addLog(`[Fatal] Xray config validation FAILED — check your inbound settings!`);
            this.addLog(`[Fatal] ${errMsg}`);
            console.error('Xray config test failed:', errMsg);
            return;
        }
        this.addLog(`[System] Starting Xray core with binary: ${xrayBinary}`);
        this.process = (0, child_process_1.spawn)(xrayBinary, ['-c', configPath], {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        this.process.stdout?.on('data', (data) => {
            this.addLog(data.toString());
        });
        this.process.stderr?.on('data', (data) => {
            this.addLog(`[Xray] ${data.toString()}`);
        });
        this.process.on('close', (code) => {
            this.addLog(`[System] Xray process exited with code ${code}`);
            console.log(`Xray process exited with code ${code}`);
            this.process = null;
        });
    }
    addLog(message) {
        const lines = message.split('\n').filter(l => l.trim());
        for (const line of lines) {
            const formatted = `[${new Date().toLocaleTimeString()}] ${line}`;
            this.logs.push(formatted);
            console.log(formatted); // Print to console for journalctl
        }
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(this.logs.length - this.maxLogs);
        }
    }
    getLogs() {
        return this.logs;
    }
    isRunning() {
        return this.process !== null;
    }
    stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }
    async restart() {
        await this.start();
    }
}
exports.XrayService = XrayService;
