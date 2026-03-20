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
class XrayService {
    constructor() {
        this.process = null;
        this.configPath = path_1.default.join(process.cwd(), 'xray_config.json');
        this.xrayBinary = process.platform === 'win32' ? 'xray.exe' : 'xray';
    }
    static getInstance() {
        if (!XrayService.instance) {
            XrayService.instance = new XrayService();
        }
        return XrayService.instance;
    }
    async generateConfig() {
        const inboundsData = await db_1.db.query.inbounds.findMany({
            with: {
                clients: true
            }
        });
        const xrayInbounds = inboundsData.map(inbound => {
            const settings = JSON.parse(inbound.settings);
            // Map clients from our DB into the settings expected by Xray
            if (inbound.protocol === 'vless' || inbound.protocol === 'vmess' || inbound.protocol === 'trojan') {
                settings.clients = inbound.clients.map(client => ({
                    id: client.uuid,
                    email: client.email,
                    flow: client.flow || undefined,
                }));
            }
            return {
                tag: inbound.tag,
                port: inbound.port,
                protocol: inbound.protocol,
                settings: settings,
                streamSettings: JSON.parse(inbound.stream),
                sniffing: JSON.parse(inbound.sniffing)
            };
        });
        const config = {
            log: { loglevel: "warning" },
            stats: {}, // Enable stats
            api: {
                tag: "api",
                services: ["HandlerService", "StatsService"]
            },
            policy: {
                levels: { "0": { statsUserUplink: true, statsUserDownlink: true } },
                system: { statsInboundUplink: true, statsInboundDownlink: true }
            },
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
            outbounds: [
                { protocol: "freedom", tag: "direct" },
                { protocol: "blackhole", tag: "blocked" }
            ],
            routing: {
                rules: [
                    { type: "field", inboundTag: ["api"], outboundsTag: "api" }
                ]
            }
        };
        await fs.writeJSON(this.configPath, config, { spaces: 2 });
        return this.configPath;
    }
    async start() {
        await this.generateConfig();
        this.stop();
        if (!fs.existsSync(this.xrayBinary)) {
            console.warn(`Xray binary not found at ${this.xrayBinary}. Skipping process start.`);
            return;
        }
        this.process = (0, child_process_1.spawn)(this.xrayBinary, ['-c', this.configPath], {
            stdio: 'inherit'
        });
        this.process.on('close', (code) => {
            console.log(`Xray process exited with code ${code}`);
            this.process = null;
        });
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
