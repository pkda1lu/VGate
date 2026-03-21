import axios from 'axios';
import https from 'https';
import { XrayService } from './XrayService';
import { SettingsService } from './SettingsService';

export class SlaveService {
    private static instance: SlaveService;
    private pollingInterval: NodeJS.Timeout | null = null;
    private masterUrl: string | null = null;
    private apiKey: string | null = null;
    private lastConfigHash: string = '';
    private axiosInstance = axios.create({
        httpsAgent: new https.Agent({  
            rejectUnauthorized: false
        })
    });

    private constructor() {
        this.masterUrl = (process.env.MASTER_URL || '').replace(/\/+$/, '') || null;
        this.apiKey = process.env.NODE_API_KEY || null;
    }

    public static getInstance() {
        if (!SlaveService.instance) {
            SlaveService.instance = new SlaveService();
        }
        return SlaveService.instance;
    }

    public isEnabled() {
        return !!(this.masterUrl && this.apiKey);
    }

    public async start() {
        if (!this.isEnabled()) return;

        console.log(`[SlaveService] Starting slave mode. Master: ${this.masterUrl}`);
        
        // Initial sync
        await this.sync();

        // Start polling every 30 seconds
        this.pollingInterval = setInterval(() => this.sync(), 30000);
    }

    private async sync() {
        try {
            const response = await this.axiosInstance.get(`${this.masterUrl}/api/nodes/me`, {
                params: { apiKey: this.apiKey }
            });

            const { inbounds, node } = response.data;
            const configString = JSON.stringify(inbounds);
            
            if (configString !== this.lastConfigHash) {
                console.log(`[SlaveService] Config changed, updating Xray...`);
                this.lastConfigHash = configString;
                
                const xray = XrayService.getInstance();
                // Pass the pulled inbounds directly to XrayService
                await xray.start(inbounds);
            } else {
                // Just report health
                await this.axiosInstance.post(`${this.masterUrl}/api/nodes/report`, {
                    apiKey: this.apiKey,
                    status: 'online'
                }).catch(() => {});
            }
        } catch (err: any) {
            console.error(`[SlaveService] Failed to sync with master: ${err.message}`);
        }
    }
}
