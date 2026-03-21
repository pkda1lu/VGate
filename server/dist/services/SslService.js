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
exports.SslService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class SslService {
    static getInstance() {
        if (!SslService.instance) {
            SslService.instance = new SslService();
        }
        return SslService.instance;
    }
    async setupSsl(domain, email) {
        try {
            // 1. Check if certbot is installed
            try {
                await execAsync('certbot --version');
            }
            catch (e) {
                // Try to install certbot if not exists (Debian/Ubuntu assumed)
                await execAsync('apt-get update && apt-get install -y certbot');
            }
            // 2. Run certbot in standalone mode
            const command = `certbot certonly --standalone --non-interactive --agree-tos -m ${email} -d ${domain}`;
            const { stdout, stderr } = await execAsync(command);
            const log = stdout + '\n' + stderr;
            const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
            const keyPath = `/etc/letsencrypt/live/${domain}/privkey.pem`;
            if (await fs_extra_1.default.pathExists(certPath) && await fs_extra_1.default.pathExists(keyPath)) {
                // Copy certs to a local panel-owned directory to avoid permission issues
                const localCertDir = '/etc/vgate/certs';
                await fs_extra_1.default.ensureDir(localCertDir);
                const localCert = path_1.default.join(localCertDir, `${domain}.fullchain.pem`);
                const localKey = path_1.default.join(localCertDir, `${domain}.privkey.pem`);
                await fs_extra_1.default.copy(certPath, localCert);
                await fs_extra_1.default.copy(keyPath, localKey);
                // Save to settings
                const { SettingsService } = await Promise.resolve().then(() => __importStar(require('./SettingsService')));
                const settingsService = SettingsService.getInstance();
                await settingsService.updateSetting('ssl_cert', localCert);
                await settingsService.updateSetting('ssl_key', localKey);
                await settingsService.updateSetting('panel_domain', domain);
                // Auto-restart after 2 seconds to apply SSL
                setTimeout(() => {
                    console.log("[SSL] Restarting panel to apply HTTPS...");
                    process.exit(0);
                }, 2000);
                return { success: true, log: log + "\n\n[DONE] SSL Certificates saved and copied to /etc/vgate/certs. The panel will RESTART AUTOMATICALLY in 2 seconds to apply HTTPS. Please refresh the page after a few moments." };
            }
            return { success: false, log: "Certificates were not created. Full log:\n" + log };
        }
        catch (error) {
            return { success: false, log: error.message };
        }
    }
    async getCertStatus(domain) {
        const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
        if (await fs_extra_1.default.pathExists(certPath)) {
            try {
                const { stdout } = await execAsync(`openssl x509 -enddate -noout -in ${certPath}`);
                const expiry = stdout.replace('notAfter=', '').trim();
                return { exists: true, expiry };
            }
            catch (e) {
                return { exists: true };
            }
        }
        return { exists: false };
    }
}
exports.SslService = SslService;
