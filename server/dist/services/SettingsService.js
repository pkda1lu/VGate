"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class SettingsService {
    constructor() { }
    static getInstance() {
        if (!SettingsService.instance) {
            SettingsService.instance = new SettingsService();
        }
        return SettingsService.instance;
    }
    async getSetting(key, defaultValue) {
        if (process.env.NODE_API_KEY)
            return defaultValue; // Slave mode: use defaults
        const result = await db_1.db.select().from(schema_1.settings).where((0, drizzle_orm_1.eq)(schema_1.settings.key, key)).get();
        return result ? result.value : defaultValue;
    }
    async getAllSettings() {
        const all = await db_1.db.select().from(schema_1.settings).all();
        const result = {};
        for (const s of all) {
            result[s.key] = s.value;
        }
        return result;
    }
    async updateSetting(key, value) {
        const exists = await db_1.db.select().from(schema_1.settings).where((0, drizzle_orm_1.eq)(schema_1.settings.key, key)).get();
        if (exists) {
            await db_1.db.update(schema_1.settings).set({ value }).where((0, drizzle_orm_1.eq)(schema_1.settings.key, key)).run();
        }
        else {
            await db_1.db.insert(schema_1.settings).values({ key, value }).run();
        }
    }
    async updateMany(settingsMap) {
        for (const [key, value] of Object.entries(settingsMap)) {
            await this.updateSetting(key, value);
        }
    }
}
exports.SettingsService = SettingsService;
