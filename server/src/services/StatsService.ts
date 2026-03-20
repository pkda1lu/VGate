import { execSync } from 'child_process';
import { db } from '../db';
import { traffic as trafficTable, clients as clientTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export class StatsService {
  private static interval: NodeJS.Timeout | null = null;
  private static xrayBinary: string = process.platform === 'win32' ? 'xray.exe' : 'xray';

  public static startPolling(intervalMs = 30000) {
    if (this.interval) clearInterval(this.interval);
    
    this.interval = setInterval(async () => {
      try {
        await this.pollStats();
      } catch (err) {
        console.error('Error polling Xray stats:', err);
      }
    }, intervalMs);
  }

  private static async pollStats() {
    try {
      // Query stats via Xray CLI API
      // Command: xray api statsquery --server=127.0.0.1:10085
      const output = execSync(`${this.xrayBinary} api statsquery --server=127.0.0.1:10085`).toString();
      const data = JSON.parse(output);

      if (!data.stat) return;

      for (const stat of data.stat) {
        // Name format: user>>>email@place.com>>>traffic>>>downlink
        const parts = stat.name.split('>>>');
        if (parts[0] === 'user' && parts[2] === 'traffic') {
          const email = parts[1];
          const type = parts[3]; // uplink or downlink
          const value = parseInt(stat.value);

          // Find client by email
          const client = await db.query.clients.findFirst({
            where: eq(clientTable.email, email)
          });

          if (client) {
            const currentTraffic = await db.query.traffic.findFirst({
              where: eq(trafficTable.clientId, client.id)
            });

            if (currentTraffic) {
              const updateData: any = {};
              if (type === 'downlink') updateData.down = value;
              if (type === 'uplink') updateData.up = value;
              updateData.total = (updateData.down || currentTraffic.down) + (updateData.up || currentTraffic.up);

              await db.update(trafficTable)
                .set(updateData)
                .where(eq(trafficTable.clientId, client.id));
            }
          }
        }
      }
    } catch (err) {
      // API might be down if Xray is starting/restarting
    }
  }

  public static stopPolling() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
