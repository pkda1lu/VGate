"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsService = void 0;
const child_process_1 = require("child_process");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class StatsService {
    static startPolling(intervalMs = 30000) {
        if (this.interval)
            clearInterval(this.interval);
        this.interval = setInterval(async () => {
            try {
                await this.pollStats();
            }
            catch (err) {
                console.error('Error polling Xray stats:', err);
            }
        }, intervalMs);
    }
    static async pollStats() {
        try {
            // Query stats via Xray CLI API
            // Command: xray api statsquery --server=127.0.0.1:10085
            const output = (0, child_process_1.execSync)(`${this.xrayBinary} api statsquery --server=127.0.0.1:10085`).toString();
            const data = JSON.parse(output);
            if (!data.stat)
                return;
            for (const stat of data.stat) {
                // Name format: user>>>email@place.com>>>traffic>>>downlink
                const parts = stat.name.split('>>>');
                if (parts[0] === 'user' && parts[2] === 'traffic') {
                    const email = parts[1];
                    const type = parts[3]; // uplink or downlink
                    const value = parseInt(stat.value);
                    // Find client by email
                    const client = await db_1.db.query.clients.findFirst({
                        where: (0, drizzle_orm_1.eq)(schema_1.clients.email, email)
                    });
                    if (client) {
                        const currentTraffic = await db_1.db.query.traffic.findFirst({
                            where: (0, drizzle_orm_1.eq)(schema_1.traffic.clientId, client.id)
                        });
                        if (currentTraffic) {
                            const updateData = {};
                            if (type === 'downlink')
                                updateData.down = value;
                            if (type === 'uplink')
                                updateData.up = value;
                            updateData.total = (updateData.down || currentTraffic.down) + (updateData.up || currentTraffic.up);
                            await db_1.db.update(schema_1.traffic)
                                .set(updateData)
                                .where((0, drizzle_orm_1.eq)(schema_1.traffic.clientId, client.id));
                        }
                    }
                }
            }
        }
        catch (err) {
            // API might be down if Xray is starting/restarting
        }
    }
    static stopPolling() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}
exports.StatsService = StatsService;
StatsService.interval = null;
StatsService.xrayBinary = process.platform === 'win32' ? 'xray.exe' : 'xray';
