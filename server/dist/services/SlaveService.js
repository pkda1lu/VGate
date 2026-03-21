"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlaveService = void 0;
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
const XrayService_1 = require("./XrayService");
class SlaveService {
    constructor() {
        this.pollingInterval = null;
        this.masterUrl = null;
        this.apiKey = null;
        this.lastConfigHash = '';
        this.axiosInstance = axios_1.default.create({
            httpsAgent: new https_1.default.Agent({
                rejectUnauthorized: false
            })
        });
        this.masterUrl = (process.env.MASTER_URL || '').replace(/\/+$/, '') || null;
        this.apiKey = process.env.NODE_API_KEY || null;
    }
    static getInstance() {
        if (!SlaveService.instance) {
            SlaveService.instance = new SlaveService();
        }
        return SlaveService.instance;
    }
    isEnabled() {
        return !!(this.masterUrl && this.apiKey);
    }
    async start() {
        if (!this.isEnabled())
            return;
        console.log(`[SlaveService] Starting slave mode. Master: ${this.masterUrl}`);
        // Initial sync
        await this.sync();
        // Start polling every 30 seconds
        this.pollingInterval = setInterval(() => this.sync(), 30000);
    }
    async sync() {
        try {
            const response = await this.axiosInstance.get(`${this.masterUrl}/api/nodes/me`, {
                params: { apiKey: this.apiKey }
            });
            const { inbounds, node } = response.data;
            const configString = JSON.stringify(inbounds);
            if (configString !== this.lastConfigHash) {
                console.log(`[SlaveService] Config changed, updating Xray...`);
                this.lastConfigHash = configString;
                const xray = XrayService_1.XrayService.getInstance();
                // Pass the pulled inbounds directly to XrayService
                await xray.start(inbounds);
            }
            else {
                // Just report health
                await this.axiosInstance.post(`${this.masterUrl}/api/nodes/report`, {
                    apiKey: this.apiKey,
                    status: 'online'
                }).catch(() => { });
            }
        }
        catch (err) {
            console.error(`[SlaveService] Failed to sync with master: ${err.message}`);
        }
    }
}
exports.SlaveService = SlaveService;
