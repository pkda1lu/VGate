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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemService = void 0;
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
class SystemService {
    constructor() { }
    static getInstance() {
        if (!SystemService.instance) {
            SystemService.instance = new SystemService();
        }
        return SystemService.instance;
    }
    async getMetrics() {
        const cpuLoad = this.getCpuLoad();
        const memory = this.getMemoryUsage();
        const disk = this.getDiskUsage();
        const uptime = Math.floor(os.uptime());
        const xrayVersion = this.getXrayVersion();
        return {
            cpu: cpuLoad,
            memory,
            disk,
            uptime,
            xrayVersion
        };
    }
    getCpuLoad() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        // Note: Simple average since boot. For real-time, we'd need two measurements.
        // However, this is a starting point for the panel.
        return Math.floor(((totalTick - totalIdle) / totalTick) * 100);
    }
    getMemoryUsage() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const percent = Math.floor((used / total) * 100);
        return { total, used, percent };
    }
    getDiskUsage() {
        try {
            if (process.platform === 'win32') {
                return { total: 0, used: 0, percent: 0 };
            }
            // df output: Filesystem 1B-blocks Used Available Use% Mounted on
            const output = (0, child_process_1.execSync)('df -B1 / --output=size,used,pcent').toString();
            const lines = output.split('\n');
            if (lines.length > 1) {
                const stats = lines[1].trim().split(/\s+/);
                const total = parseInt(stats[0]);
                const used = parseInt(stats[1]);
                const percent = parseInt(stats[2].replace('%', ''));
                return { total, used, percent };
            }
        }
        catch (err) {
            console.error('Error getting disk usage:', err);
        }
        return { total: 0, used: 0, percent: 0 };
    }
    getXrayVersion() {
        try {
            const binary = process.platform === 'win32' ? 'xray.exe' : 'xray';
            const output = (0, child_process_1.execSync)(`${binary} -version`).toString();
            const match = output.match(/Xray\s+(\d+\.\d+\.\d+)/);
            return match ? match[1] : 'unknown';
        }
        catch (err) {
            return 'not installed';
        }
    }
}
exports.SystemService = SystemService;
