import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs-extra';
import path from 'path';
import { db } from '../db';
import { SettingsService } from './SettingsService';

export class XrayService {
  private static instance: XrayService;
  private process: ChildProcess | null = null;
  private logs: string[] = [];
  private readonly maxLogs = 500;

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

      if (inbound.protocol === 'vless') {
        settings.decryption = "none";
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

    const settingsService = SettingsService.getInstance();
    
    // Load config sections from settings
    const logSection = JSON.parse(await settingsService.getSetting('xray_config_log', '{"loglevel":"warning"}') as string);
    const dnsSection = JSON.parse(await settingsService.getSetting('xray_config_dns', '{"servers":["1.1.1.1"]}') as string);
    const outboundsSection = JSON.parse(await settingsService.getSetting('xray_config_outbounds', '[{"protocol":"freedom","tag":"direct"}]') as string);
    const routingSection = JSON.parse(await settingsService.getSetting('xray_config_routing', '{"rules":[]}') as string);
    const policySection = JSON.parse(await settingsService.getSetting('xray_config_policy', '{"levels":{"0":{"statsUserUplink":true,"statsUserDownlink":true}}}') as string);

    // Protection flags
    const blockBittorrent = await settingsService.getSetting('block_bittorrent') === 'true';
    const blockPrivateIps = await settingsService.getSetting('block_private_ips') === 'true';
    const blockAds = await settingsService.getSetting('block_ads') === 'true';

    // Ensure base api rule exists
    if (!routingSection.rules.find((r: any) => r.inboundTag?.[0] === 'api')) {
        routingSection.rules.unshift({ type: "field", inboundTag: ["api"], outboundTag: "api" });
    }

    // Add protection rules if enabled
    if (blockBittorrent) {
        routingSection.rules.push({ type: "field", protocol: ["bittorrent"], outboundTag: "blocked" });
    }
    if (blockPrivateIps) {
        routingSection.rules.push({ type: "field", ip: ["geoip:private"], outboundTag: "blocked" });
    }
    if (blockAds) {
        routingSection.rules.push({ type: "field", domain: ["geosite:category-ads-all"], outboundTag: "blocked" });
    }

    const config = {
      log: logSection,
      stats: {}, 
      dns: dnsSection,
      api: {
        tag: "api",
        services: ["HandlerService", "StatsService"]
      },
      policy: policySection,
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
      outbounds: outboundsSection,
      routing: routingSection
    };

    const configPath = await settingsService.getSetting('xray_config_path', path.join(process.cwd(), 'xray_config.json'));

    await fs.writeJSON(configPath!, config, { spaces: 2 });
    return configPath!;
  }

  public async start() {
    const configPath = await this.generateConfig();
    this.stop();

    const settingsService = SettingsService.getInstance();
    const xrayBinary = await settingsService.getSetting('xray_binary', process.platform === 'win32' ? 'xray.exe' : '/usr/local/bin/xray');

    if (!fs.existsSync(xrayBinary!)) {
      this.addLog(`[Error] Xray binary not found at ${xrayBinary}`);
      console.warn(`Xray binary not found at ${xrayBinary}. Skipping process start.`);
      return;
    }

    this.addLog(`[System] Starting Xray core with binary: ${xrayBinary}`);
    this.process = spawn(xrayBinary!, ['-c', configPath], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      this.addLog(data.toString());
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      this.addLog(`[Error] ${data.toString()}`);
    });

    this.process.on('close', (code: number | null) => {
      this.addLog(`[System] Xray process exited with code ${code}`);
      console.log(`Xray process exited with code ${code}`);
      this.process = null;
    });
  }

  private addLog(message: string) {
    const lines = message.split('\n').filter(l => l.trim());
    for (const line of lines) {
        this.logs.push(`[${new Date().toLocaleTimeString()}] ${line}`);
    }
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(this.logs.length - this.maxLogs);
    }
  }

  public getLogs() {
    return this.logs;
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
