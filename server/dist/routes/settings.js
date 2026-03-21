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
exports.default = settingsRoutes;
const SettingsService_1 = require("../services/SettingsService");
async function settingsRoutes(fastify) {
    const settingsService = SettingsService_1.SettingsService.getInstance();
    // Get all settings
    fastify.get('/', async () => {
        return await settingsService.getAllSettings();
    });
    // Get single setting
    fastify.get('/:key', async (request, reply) => {
        const { key } = request.params;
        const value = await settingsService.getSetting(key);
        if (value === undefined) {
            return reply.code(404).send({ error: 'Setting not found' });
        }
        return { key, value };
    });
    // Update multiple settings
    fastify.post('/bulk', async (request) => {
        const settingsMap = request.body;
        const { SettingsService } = await Promise.resolve().then(() => __importStar(require('../services/SettingsService')));
        const { db } = await Promise.resolve().then(() => __importStar(require('../db')));
        const { users } = await Promise.resolve().then(() => __importStar(require('../db/schema')));
        const { eq } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        // Extract account updates if present
        const newUsername = settingsMap.new_username;
        const newPassword = settingsMap.new_password;
        if (newUsername || newPassword) {
            const updateData = {};
            if (newUsername)
                updateData.username = newUsername;
            if (newPassword) {
                // In a real app we'd bcrypt here, but we are using plain for now or standard hash
                updateData.password = newPassword;
            }
            // Update first user (admin)
            await db.update(users).set(updateData).where(eq(users.id, 1)).run();
            // Remove from settingsMap so they don't get stored as generic settings
            delete settingsMap.new_username;
            delete settingsMap.new_password;
        }
        await SettingsService.getInstance().updateMany(settingsMap);
        return { status: 'ok' };
    });
    // Update single setting
    fastify.put('/:key', async (request) => {
        const { key } = request.params;
        const { value } = request.body;
        await settingsService.updateSetting(key, value);
        return { status: 'ok', key, value };
    });
    // Restart Xray
    fastify.post('/restart', async () => {
        const { XrayService } = await Promise.resolve().then(() => __importStar(require('../services/XrayService')));
        await XrayService.getInstance().restart();
        return { status: 'ok' };
    });
    // Get Xray logs
    fastify.get('/logs', async () => {
        const { XrayService } = await Promise.resolve().then(() => __importStar(require('../services/XrayService')));
        return XrayService.getInstance().getLogs();
    });
    // DEBUG: Return generated Xray config + process status
    fastify.get('/xray-config', async () => {
        const { XrayService } = await Promise.resolve().then(() => __importStar(require('../services/XrayService')));
        const { SettingsService: SS } = await Promise.resolve().then(() => __importStar(require('../services/SettingsService')));
        const fs = await Promise.resolve().then(() => __importStar(require('fs-extra')));
        const service = XrayService.getInstance();
        const ss = SS.getInstance();
        const configPath = await ss.getSetting('xray_config_path', require('path').join(process.cwd(), 'xray_config.json'));
        let config = null;
        try {
            config = await fs.readJSON(configPath);
        }
        catch (e) {
            config = { error: 'Config file not found', path: configPath };
        }
        return {
            isRunning: service.isRunning(),
            configPath,
            config
        };
    });
}
