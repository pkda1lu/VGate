import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

export class SslService {
    private static instance: SslService;

    public static getInstance(): SslService {
        if (!SslService.instance) {
            SslService.instance = new SslService();
        }
        return SslService.instance;
    }

    async setupSsl(domain: string, email: string): Promise<{ success: boolean; log: string }> {
        try {
            // 1. Check if certbot is installed
            try {
                await execAsync('certbot --version');
            } catch (e) {
                // Try to install certbot if not exists (Debian/Ubuntu assumed)
                await execAsync('apt-get update && apt-get install -y certbot');
            }

            // 2. Run certbot in standalone mode
            const command = `certbot certonly --standalone --non-interactive --agree-tos -m ${email} -d ${domain}`;
            const { stdout, stderr } = await execAsync(command);

            const log = stdout + '\n' + stderr;
            const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
            const keyPath = `/etc/letsencrypt/live/${domain}/privkey.pem`;

            if (await fs.pathExists(certPath) && await fs.pathExists(keyPath)) {
                // Copy certs to a local panel-owned directory to avoid permission issues
                const localCertDir = '/etc/vgate/certs';
                await fs.ensureDir(localCertDir);
                const localCert = path.join(localCertDir, `${domain}.fullchain.pem`);
                const localKey = path.join(localCertDir, `${domain}.privkey.pem`);

                await fs.copy(certPath, localCert);
                await fs.copy(keyPath, localKey);

                // Save to settings
                const { SettingsService } = await import('./SettingsService');
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
        } catch (error: any) {
            return { success: false, log: error.message };
        }
    }

    async getCertStatus(domain: string): Promise<{ exists: boolean; expiry?: string }> {
        const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
        if (await fs.pathExists(certPath)) {
            try {
                const { stdout } = await execAsync(`openssl x509 -enddate -noout -in ${certPath}`);
                const expiry = stdout.replace('notAfter=', '').trim();
                return { exists: true, expiry };
            } catch (e) {
                return { exists: true };
            }
        }
        return { exists: false };
    }
}
