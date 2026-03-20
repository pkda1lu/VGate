import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs-extra';
import path from 'path';
import { db } from '../db';

export class XrayService {
  private static instance: XrayService;
  private process: ChildProcess | null = null;
  private configPath: string = path.join(process.cwd(), 'xray_config.json');
  private xrayBinary: string = process.platform === 'win32' ? 'xray.exe' : '/usr/local/bin/xray';

  private constructor() {}

  public static getInstance(): XrayService {
    if (!XrayService.instance) {
      XrayService.instance = new XrayService();
    }
    return XrayService.instance;
  }

  public async generateConfig() {
    const inboundsData = await db.query.inbounds.findMany({
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

  public async start() {
    await this.generateConfig();
    this.stop();

    if (!fs.existsSync(this.xrayBinary)) {
      console.warn(`Xray binary not found at ${this.xrayBinary}. Skipping process start.`);
      return;
    }

    this.process = spawn(this.xrayBinary, ['-c', this.configPath], {
      stdio: 'inherit'
    });

    this.process.on('close', (code) => {
      console.log(`Xray process exited with code ${code}`);
      this.process = null;
    });
  }

  public stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  public async restart() {
    await this.start();
  }
}
